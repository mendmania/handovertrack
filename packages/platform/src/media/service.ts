import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { Readable } from 'node:stream';
import { AccessError } from '@handovertrack/backend';
import { MediaFiles, type ExpectedImage } from './files';

export interface UploadInput extends ExpectedImage { accountId: string; mediaId: string; mime: 'image/jpeg'; capturedAt: string }
export interface UploadRow {
  id: string; upload_id: string; account_id: string; organization_id: string; project_id: string;
  size: number; sha256: string; width: number; height: number; mime: 'image/jpeg'; captured_at: Date;
  state: 'pending' | 'staged' | 'accepted'; accepted_at: Date | null;
}
export const expected = (row: UploadRow): ExpectedImage => ({ size: row.size, sha256: row.sha256, width: row.width, height: row.height });
export const uploadDto = (row: UploadRow) => ({
  mediaId: row.id, uploadId: row.upload_id, accountId: row.account_id, organizationId: row.organization_id, projectId: row.project_id,
  state: row.state, ...expected(row), acceptedAt: row.accepted_at?.toISOString() ?? null,
});
export async function transaction<T>(pool: Pool, run: (c: PoolClient) => Promise<T>) {
  const c = await pool.connect();
  try { await c.query('BEGIN'); const result = await run(c); await c.query('COMMIT'); return result; }
  catch (error) { await c.query('ROLLBACK'); throw error; } finally { c.release(); }
}
export async function authorize(c: PoolClient, actor: string, org: string, project: string, managerOnly = false) {
  // Locks serialize revocation against acceptance. Never hold them during network intake.
  const m = (await c.query<{ role: string }>('SELECT role FROM lock_membership($1,$2)', [org, actor])).rows[0];
  if (!m || (managerOnly && m.role !== 'manager')) throw new AccessError('NOT_FOUND', 404);
  const p = await c.query('SELECT id FROM projects WHERE organization_id=$1 AND id=$2 FOR SHARE', [org, project]);
  if (!p.rowCount) throw new AccessError('NOT_FOUND', 404);
  if (m.role !== 'manager') {
    const a = await c.query('SELECT active FROM assignments WHERE organization_id=$1 AND project_id=$2 AND account_id=$3 AND active FOR SHARE', [org, project, actor]);
    if (!a.rowCount) throw new AccessError('NOT_FOUND', 404);
  }
}
export function createMedia(pool: Pool, files: MediaFiles) {
  async function owned(c: PoolClient, actor: string, org: string, id: string) {
    const row = (await c.query<UploadRow>('SELECT * FROM media_uploads WHERE upload_id=$1 AND organization_id=$2 AND account_id=$3', [id, org, actor])).rows[0];
    if (!row) throw new AccessError('NOT_FOUND', 404);
    return row;
  }
  async function fence(c: PoolClient, id: string) {
    if (!(await c.query<{ ok: boolean }>('SELECT pg_try_advisory_xact_lock(hashtextextended($1,404)) AS ok', [id])).rows[0]!.ok) throw new AccessError('UPLOAD_BUSY', 409);
  }
  return {
    async create(actor: string, org: string, project: string, input: UploadInput) {
      return transaction(pool, async (c) => {
        await authorize(c, actor, org, project);
        if (actor !== input.accountId) throw new AccessError('NOT_FOUND', 404);
        await fence(c, input.mediaId);
        const old = (await c.query<UploadRow>('SELECT * FROM media_uploads WHERE id=$1', [input.mediaId])).rows[0];
        if (old) {
          if (old.account_id !== actor || old.organization_id !== org || old.project_id !== project) throw new AccessError('NOT_FOUND', 404);
          if (old.size !== input.size || old.sha256 !== input.sha256 || old.width !== input.width || old.height !== input.height || old.mime !== input.mime || old.captured_at.toISOString() !== new Date(input.capturedAt).toISOString()) throw new AccessError('IDEMPOTENCY_CONFLICT', 409);
          return uploadDto(old);
        }
        // Global intake reservation lock keeps the trial's disk budget bounded.
        await c.query('SELECT pg_advisory_xact_lock(404040)');
        const reservations = (await c.query<{ bytes: string }>("SELECT coalesce(sum(size),0)::text AS bytes FROM media_uploads WHERE state!='accepted'")).rows[0]!;
        await files.capacity(Number(reservations.bytes) * 2 + input.size * 2);
        const row = (await c.query<UploadRow>(`INSERT INTO media_uploads(id,upload_id,account_id,organization_id,project_id,size,sha256,width,height,mime,captured_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [input.mediaId, randomUUID(), actor, org, project, input.size, input.sha256, input.width, input.height, input.mime, input.capturedAt])).rows[0]!;
        return uploadDto(row);
      });
    },
    async status(actor: string, org: string, uploadId: string) {
      return transaction(pool, async (c) => { const row = await owned(c, actor, org, uploadId); await authorize(c, actor, org, row.project_id); return uploadDto(row); });
    },
    async content(actor: string, org: string, uploadId: string, stream: Readable, length: number) {
      // Initial authorization finishes before the streamed body; complete/replay
      // reauthorizes again. Only this transaction's advisory lock owns staging.
      const row = await transaction(pool, async (c) => { const r = await owned(c, actor, org, uploadId); await authorize(c, actor, org, r.project_id); return r; });
      if (length !== row.size) throw new AccessError('IMAGE_MISMATCH', 422);
      return transaction(pool, async (c) => {
        await fence(c, row.id);
        const current = await owned(c, actor, org, uploadId);
        if (current.state === 'accepted') { await authorize(c, actor, org, current.project_id); stream.resume(); return uploadDto(current); }
        await files.receive(row.id, stream, expected(row));
        await authorize(c, actor, org, row.project_id);
        return uploadDto((await c.query<UploadRow>("UPDATE media_uploads SET state='staged' WHERE id=$1 RETURNING *", [row.id])).rows[0]!);
      });
    },
    async complete(actor: string, org: string, uploadId: string) {
      return transaction(pool, async (c) => {
        let row = await owned(c, actor, org, uploadId);
        await fence(c, row.id); row = await owned(c, actor, org, uploadId); await authorize(c, actor, org, row.project_id);
        const final = await files.path(row.id, 'original.jpg');
        if (!await files.exists(final)) {
          const stage = await files.path(row.id, 'staged.jpg');
          if (!await files.exists(stage)) throw new AccessError('UPLOAD_INCOMPLETE', 409);
          await files.verify(stage, expected(row)); await files.publish(stage, final);
        }
        // Includes crash after link but before COMMIT, and lost accepted responses.
        await files.verify(final, expected(row));
        if (row.state === 'accepted') return uploadDto(row);
        const accepted = (await c.query<UploadRow>("UPDATE media_uploads SET state='accepted',accepted_at=clock_timestamp() WHERE id=$1 RETURNING *", [row.id])).rows[0]!;
        await c.query('INSERT INTO media_jobs(media_id) VALUES($1) ON CONFLICT DO NOTHING', [row.id]);
        await c.query("INSERT INTO media_events(media_id,event,version) VALUES($1,'accepted',1) ON CONFLICT DO NOTHING", [row.id]);
        return uploadDto(accepted);
      });
    },
    async list(actor: string, org: string, project: string, after?: string) {
      return transaction(pool, async (c) => {
        await authorize(c, actor, org, project, true);
        const rows = (await c.query<UploadRow & { processing: string; error: string | null }>(`SELECT m.*,j.state AS processing,j.error FROM media_uploads m JOIN media_jobs j ON j.media_id=m.id
          WHERE m.organization_id=$1 AND m.project_id=$2 AND m.state='accepted' AND ($3::uuid IS NULL OR m.id>$3::uuid) ORDER BY m.id LIMIT 101`, [org, project, after ?? null])).rows;
        const page = rows.slice(0,100);
        return { media: page.map((r) => ({ ...uploadDto(r), capturedAt: r.captured_at.toISOString(), processing: r.processing, processingError: r.error, processingVersion: 1 })), next: rows.length > 100 ? page.at(-1)!.id : null };
      });
    },
    async read(actor: string, org: string, mediaId: string, variant: string) {
      return transaction(pool, async (c) => {
        const row = (await c.query<UploadRow>("SELECT * FROM media_uploads WHERE id=$1 AND organization_id=$2 AND state='accepted'", [mediaId, org])).rows[0];
        if (!row) throw new AccessError('NOT_FOUND', 404);
        await authorize(c, actor, org, row.project_id, true);
        if (variant !== 'original') {
          const available = await c.query("SELECT 1 FROM media_variants v JOIN media_jobs j USING(media_id) WHERE v.media_id=$1 AND v.name=$2 AND v.version=1 AND j.state='ready'", [mediaId, variant]);
          if (!available.rowCount) throw new AccessError('NOT_FOUND', 404);
        }
        return files.openRead(mediaId, variant === 'original' ? 'original.jpg' : `v1-${variant}.webp`);
      });
    },
  };
}
