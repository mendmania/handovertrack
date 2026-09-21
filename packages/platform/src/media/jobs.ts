import { constants } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { open, unlink } from 'node:fs/promises';
import type { Pool } from 'pg';
import sharp from 'sharp';
import { AccessError } from '@handovertrack/backend';
import { MediaFiles, imageOptions } from './files';
import { transaction, expected, type UploadRow } from './service';

export interface MediaJob { media_id: string; lease_owner: string; lease_token: number; attempts: number }
const MAX_ATTEMPTS = 5;
export function createMediaJobs(pool: Pool, files: MediaFiles, leaseMs = 60000) {
  async function claim(owner: string): Promise<MediaJob | undefined> {
    return transaction(pool, async (c) => {
      await c.query(`UPDATE media_jobs SET state='failed',error='LEASE_RETRIES_EXHAUSTED',lease_until=NULL,updated_at=clock_timestamp()
        WHERE state='running' AND lease_until<=clock_timestamp() AND attempts>=$1`, [MAX_ATTEMPTS]);
      return (await c.query<MediaJob>(`WITH candidate AS (
        SELECT media_id FROM media_jobs WHERE attempts<$1 AND
        ((state='pending' AND next_run_at<=clock_timestamp()) OR (state='running' AND lease_until<=clock_timestamp()))
        ORDER BY next_run_at,media_id FOR UPDATE SKIP LOCKED LIMIT 1)
        UPDATE media_jobs j SET state='running',attempts=attempts+1,lease_owner=$2,lease_token=lease_token+1,
        lease_until=clock_timestamp()+$3*interval '1 millisecond',updated_at=clock_timestamp()
        FROM candidate WHERE j.media_id=candidate.media_id RETURNING j.*`, [MAX_ATTEMPTS, owner, leaseMs])).rows[0];
    });
  }
  async function renew(job: MediaJob) {
    const result = await pool.query(`UPDATE media_jobs SET lease_until=clock_timestamp()+$4*interval '1 millisecond'
      WHERE media_id=$1 AND lease_owner=$2 AND lease_token=$3 AND state='running' AND lease_until>clock_timestamp()`, [job.media_id,job.lease_owner,job.lease_token,leaseMs]);
    return result.rowCount === 1;
  }
  async function process(job: MediaJob) {
    const row = (await pool.query<UploadRow>("SELECT * FROM media_uploads WHERE id=$1 AND state='accepted'", [job.media_id])).rows[0];
    if (!row) throw new Error('ORIGINAL_UNAVAILABLE');
    const original = await files.path(row.id, 'original.jpg'); await files.verify(original, expected(row));
    await files.capacity(row.size + 16 * 1024 * 1024);
    const variants: { name: string; path: string; sha256: string; size: number; width: number; height: number }[] = [];
    try {
      for (const [name, width] of [['thumb',320],['preview',768],['report',2048]] as const) {
        const { data, info } = await sharp(original, imageOptions).rotate().resize({ width, height: width, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).timeout({ seconds: 30 }).toBuffer({ resolveWithObject: true });
        const path = await files.path(row.id, `${randomUUID()}.part`);
        const handle = await open(path, 'wx', 0o600);
        try { await handle.writeFile(data); await handle.sync(); } finally { await handle.close(); }
        variants.push({ name, path, sha256: createHash('sha256').update(data).digest('hex'), size: data.length, width: info.width, height: info.height });
      }
      await transaction(pool, async (c) => {
        const valid = await c.query(`SELECT 1 FROM media_jobs WHERE media_id=$1 AND lease_owner=$2 AND lease_token=$3 AND state='running' AND lease_until>clock_timestamp() FOR UPDATE`, [job.media_id,job.lease_owner,job.lease_token]);
        if (!valid.rowCount) throw new AccessError('STALE_LEASE', 409);
        for (const v of variants) {
          const destination = await files.path(row.id, `v1-${v.name}.webp`); await files.publish(v.path, destination);
          // Reuse an identical immutable derivative after a filesystem/DB crash.
          const file = await open(destination, constants.O_RDONLY | constants.O_NOFOLLOW);
          try {
            const hash = createHash('sha256'); for await (const chunk of file.createReadStream({ autoClose: false })) hash.update(chunk);
            if (hash.digest('hex') !== v.sha256) throw new Error('DERIVATIVE_CONFLICT');
          } finally { await file.close(); }
          await c.query('INSERT INTO media_variants(media_id,version,name,sha256,size,width,height) VALUES($1,1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [row.id,v.name,v.sha256,v.size,v.width,v.height]);
        }
        const done = await c.query(`UPDATE media_jobs SET state='ready',error=NULL,lease_until=NULL,updated_at=clock_timestamp() WHERE media_id=$1 AND lease_owner=$2 AND lease_token=$3 AND lease_until>clock_timestamp()`, [job.media_id,job.lease_owner,job.lease_token]);
        if (!done.rowCount) throw new AccessError('STALE_LEASE', 409);
        await c.query("INSERT INTO media_events(media_id,event,version) VALUES($1,'ready',1) ON CONFLICT DO NOTHING", [row.id]);
      });
    } finally { for (const v of variants) await unlink(v.path).catch(() => {}); }
  }
  async function fail(job: MediaJob) {
    // Expose safe error codes only; paths, auth and decoder messages stay private.
    await pool.query(`UPDATE media_jobs SET state=CASE WHEN attempts>=$4 THEN 'failed' ELSE 'pending' END,
      error='PROCESSING_FAILED',next_run_at=clock_timestamp()+least(300,power(2,attempts))*interval '1 second',
      lease_until=NULL,updated_at=clock_timestamp() WHERE media_id=$1 AND lease_owner=$2 AND lease_token=$3 AND state='running' AND lease_until>clock_timestamp()`, [job.media_id,job.lease_owner,job.lease_token,MAX_ATTEMPTS]);
  }
  return { claim, renew, process, fail };
}
