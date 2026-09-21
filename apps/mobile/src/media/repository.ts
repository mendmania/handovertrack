import type { Scope } from '@handovertrack/contracts';
import type { SnapshotStore, SqlConnection } from '../db/store';
import { assertTicket, sameTicket, CaptureOwnershipError, type CaptureRecord, type CaptureState, type CaptureTicket, type Dimensions, type OriginalInfo } from './types';

// File verification repairs only local-capture failures. Network progress and
// server receipts have independent lifetimes and must never be reset here.
function recoverableQueue(queue: { state: string; reason: string | null }): boolean {
  return queue.state === 'blocked' && (queue.reason === null || [
    'CAPTURE_INCOMPLETE','QUEUE_RECOVERED','RESERVATION_INTERRUPTED','CAPTURE_CANCELLED',
    'SAVE_INTERRUPTED','MANIFEST_UNAVAILABLE','MANIFEST_CONFLICT','UNVERIFIABLE_ORIGINAL',
    'ORIGINAL_MISSING','COPY_INCOMPLETE','ORIGINAL_CORRUPT',
  ].includes(queue.reason));
}
type Row = Omit<CaptureRecord, 'projectAvailable' | 'originalPath'> & { projectAvailable: number };
const selection = `SELECT m.id,m.account_id AS accountId,m.organization_id AS organizationId,m.project_id AS projectId,m.created_at AS createdAt,m.updated_at AS updatedAt,m.directory,m.state,m.size,m.sha256,m.width,m.height,m.reason,q.upload_id AS uploadId,q.attempts,q.next_attempt_at AS nextAttemptAt,q.bytes_sent AS bytesSent,q.accepted_at AS acceptedAt,
  CASE WHEN m.state='saved_local' AND p.id IS NOT NULL THEN coalesce(q.state,'blocked') ELSE 'blocked' END AS queueState,
  CASE WHEN q.media_id IS NULL THEN 'QUEUE_MISSING' WHEN m.state='saved_local' AND p.id IS NULL THEN 'PROJECT_UNAVAILABLE' ELSE q.reason END AS queueReason,
  CASE WHEN p.id IS NULL THEN 0 ELSE 1 END AS projectAvailable
  FROM media_local m LEFT JOIN media_queue q ON q.media_id=m.id AND q.account_id=m.account_id AND q.organization_id=m.organization_id
  LEFT JOIN cached_projects p ON p.id=m.project_id AND p.account_id=m.account_id AND p.organization_id=m.organization_id`;
function record(row: Row): CaptureRecord {
  return { ...row, projectAvailable: Boolean(row.projectAvailable), originalPath: row.state === 'saved_local' ? `${row.directory}/original.jpg` : null };
}
export class CaptureRepository {
  constructor(private store: SnapshotStore) {}
  private async changed(tx: SqlConnection, scope: Scope) {
    await tx.runAsync('INSERT INTO media_scopes(account_id,organization_id,revision) VALUES(?,?,1) ON CONFLICT(account_id,organization_id) DO UPDATE SET revision=revision+1', scope.accountId, scope.organizationId);
  }
  async reserve(ticket: CaptureTicket, assertCurrent: () => void): Promise<void> {
    assertTicket(ticket);
    await this.store.write(async (tx) => {
      assertCurrent();
      const project = await tx.getFirstAsync('SELECT id FROM cached_projects WHERE account_id=? AND organization_id=? AND id=?', ticket.accountId, ticket.organizationId, ticket.projectId);
      if (!project) throw new Error('Project unavailable for capture');
      await this.insert(tx, ticket);
      assertCurrent();
    });
  }
  private async insert(tx: SqlConnection, ticket: CaptureTicket) {
    await tx.runAsync("INSERT INTO media_local(id,account_id,organization_id,project_id,created_at,updated_at,directory,state,reason) VALUES(?,?,?,?,?,?,?,'staging','CAPTURE_INCOMPLETE')", ticket.id, ticket.accountId, ticket.organizationId, ticket.projectId, ticket.createdAt, ticket.createdAt, ticket.directory);
    await tx.runAsync("INSERT INTO media_queue(media_id,account_id,organization_id,state,reason,created_at,updated_at) VALUES(?,?,?,'blocked','CAPTURE_INCOMPLETE',?,?)", ticket.id, ticket.accountId, ticket.organizationId, ticket.createdAt, ticket.createdAt);
    await this.changed(tx, ticket);
  }
  // Recovery may restore a valid app-owned manifest after a DB write failure.
  // It never borrows the currently signed-in account or a new project ID.
  async restore(ticket: CaptureTicket): Promise<void> {
    assertTicket(ticket);
    await this.store.write(async (tx) => {
      const existing = await tx.getFirstAsync<CaptureTicket>('SELECT id,account_id AS accountId,organization_id AS organizationId,project_id AS projectId,created_at AS createdAt,directory FROM media_local WHERE id=?', ticket.id);
      if (existing) {
        if (!sameTicket(existing, ticket)) throw new CaptureOwnershipError('Manifest owner conflicts with existing capture');
        const queue = await tx.getFirstAsync<{ accountId: string; organizationId: string }>('SELECT account_id AS accountId,organization_id AS organizationId FROM media_queue WHERE media_id=?', ticket.id);
        if (queue && (queue.accountId !== ticket.accountId || queue.organizationId !== ticket.organizationId)) throw new CaptureOwnershipError('Queue owner conflicts with existing capture');
        if (!queue) {
          await tx.runAsync("INSERT INTO media_queue(media_id,account_id,organization_id,state,reason,created_at,updated_at) VALUES(?,?,?,'blocked','QUEUE_RECOVERED',?,?)", ticket.id, ticket.accountId, ticket.organizationId, ticket.createdAt, ticket.createdAt);
          await this.changed(tx, ticket);
        }
        return;
      }
      await this.insert(tx, ticket);
    });
  }
  async saved(ticket: CaptureTicket, original: OriginalInfo & Dimensions, now: string): Promise<void> {
    await this.store.write(async (tx) => {
      const existing = await tx.getFirstAsync<CaptureTicket & { state: CaptureState; size: number | null; sha256: string | null; width: number | null; height: number | null; reason: string | null }>('SELECT id,account_id AS accountId,organization_id AS organizationId,project_id AS projectId,created_at AS createdAt,directory,state,size,sha256,width,height,reason FROM media_local WHERE id=?', ticket.id);
      if (!existing || !sameTicket(existing, ticket)) throw new CaptureOwnershipError('Capture owner changed');
      const queue = await tx.getFirstAsync<{ accountId: string; organizationId: string; state: string; reason: string | null }>('SELECT account_id AS accountId,organization_id AS organizationId,state,reason FROM media_queue WHERE media_id=?', ticket.id);
      if (queue && (queue.accountId !== ticket.accountId || queue.organizationId !== ticket.organizationId)) throw new CaptureOwnershipError('Queue owner conflicts with existing capture');
      if (existing.state === 'saved_local' && existing.size === original.size && existing.sha256 === original.sha256 && existing.width === original.width && existing.height === original.height && existing.reason === null && queue && !recoverableQueue(queue)) return;
      await tx.runAsync("UPDATE media_local SET state='saved_local',size=?,sha256=?,width=?,height=?,reason=NULL,updated_at=? WHERE id=? AND account_id=? AND organization_id=?", original.size, original.sha256, original.width, original.height, now, ticket.id, ticket.accountId, ticket.organizationId);
      if (queue && recoverableQueue(queue)) await tx.runAsync("UPDATE media_queue SET state='pending',reason=NULL,updated_at=? WHERE media_id=? AND account_id=? AND organization_id=?", now, ticket.id, ticket.accountId, ticket.organizationId);
      else if (!queue) await tx.runAsync("INSERT INTO media_queue(media_id,account_id,organization_id,state,reason,created_at,updated_at) VALUES(?,?,?,'pending',NULL,?,?)", ticket.id, ticket.accountId, ticket.organizationId, ticket.createdAt, now);
      await this.changed(tx, ticket);
    });
  }
  async blocked(ticket: CaptureTicket, state: Exclude<CaptureState, 'saved_local' | 'staging'>, reason: string, now: string): Promise<void> {
    await this.store.write(async (tx) => {
      const existing = await tx.getFirstAsync<{ state: string; reason: string | null }>('SELECT state,reason FROM media_local WHERE id=? AND account_id=? AND organization_id=?', ticket.id, ticket.accountId, ticket.organizationId);
      if (!existing || (existing.state === state && existing.reason === reason)) return;
      await tx.runAsync('UPDATE media_local SET state=?,reason=?,updated_at=? WHERE id=? AND account_id=? AND organization_id=?', state, reason, now, ticket.id, ticket.accountId, ticket.organizationId);
      await tx.runAsync("UPDATE media_queue SET state='blocked',reason=?,updated_at=? WHERE media_id=? AND account_id=? AND organization_id=? AND state IN ('pending','blocked')", reason, now, ticket.id, ticket.accountId, ticket.organizationId);
      await this.changed(tx, ticket);
    });
  }
  async uploadState(ticket: CaptureTicket, patch: { state: import('./types').QueueState; reason?: string; uploadId?: string; bytesSent?: number; acceptedAt?: string; attempts?: number; nextAttemptAt?: number }, assertCurrent: () => void) {
    await this.store.write(async (tx) => {
      assertCurrent();
      await tx.runAsync(`UPDATE media_queue SET state=?,reason=?,upload_id=coalesce(?,upload_id),bytes_sent=coalesce(?,bytes_sent),
        accepted_at=coalesce(?,accepted_at),attempts=coalesce(?,attempts),next_attempt_at=coalesce(?,next_attempt_at),updated_at=?
        WHERE media_id=? AND account_id=? AND organization_id=? AND state NOT IN ('server_accepted','completed')`,
        patch.state,patch.reason ?? null,patch.uploadId ?? null,patch.bytesSent ?? null,patch.acceptedAt ?? null,patch.attempts ?? null,patch.nextAttemptAt ?? null,new Date().toISOString(),ticket.id,ticket.accountId,ticket.organizationId);
      await this.changed(tx,ticket); assertCurrent();
    });
  }
  async retry(scope: Scope, assertCurrent: () => void) {
    await this.store.write(async (tx) => {
      assertCurrent();
      await tx.runAsync("UPDATE media_queue SET state='pending',reason=NULL,next_attempt_at=0,attempts=0 WHERE account_id=? AND organization_id=? AND state IN ('failed','blocked') AND reason IN ('RETRY_EXHAUSTED','UNAUTHENTICATED','NOT_FOUND','ACCESS_CHANGED','NETWORK_RETRY')", scope.accountId,scope.organizationId);
      await this.changed(tx,scope); assertCurrent();
    });
  }
  async quarantine(directory: string, reason: string, now: string): Promise<void> {
    await this.store.write((tx) => tx.runAsync('INSERT INTO media_orphans(directory,reason,observed_at) VALUES(?,?,?) ON CONFLICT(directory) DO UPDATE SET reason=excluded.reason,observed_at=excluded.observed_at', directory, reason, now));
  }
  async list(scope: Scope, projectId?: string): Promise<CaptureRecord[]> {
    return this.store.read(async (db) => (await db.getAllAsync<Row>(`${selection} WHERE m.account_id=? AND m.organization_id=?${projectId ? ' AND m.project_id=?' : ''} ORDER BY m.created_at DESC,m.id DESC`, scope.accountId, scope.organizationId, ...(projectId ? [projectId] : []))).map(record));
  }
  async get(ticket: CaptureTicket): Promise<CaptureRecord | null> {
    return this.store.read(async (db) => {
      const row = await db.getFirstAsync<Row>(`${selection} WHERE m.id=? AND m.account_id=? AND m.organization_id=?`, ticket.id, ticket.accountId, ticket.organizationId);
      if (!row) return null;
      if (!sameTicket(row, ticket)) throw new Error('Capture ticket does not match its stored owner');
      return record(row);
    });
  }
  async all(): Promise<CaptureRecord[]> { return this.store.read(async (db) => (await db.getAllAsync<Row>(selection)).map(record)); }
  async revision(scope: Scope): Promise<number> {
    return this.store.read(async (db) => (await db.getFirstAsync<{ revision: number }>('SELECT revision FROM media_scopes WHERE account_id=? AND organization_id=?', scope.accountId, scope.organizationId))?.revision ?? 0);
  }
}
