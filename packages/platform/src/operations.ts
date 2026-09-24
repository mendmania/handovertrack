import type { Pool } from 'pg';
import { readFile, statfs } from 'node:fs/promises';

// Read-only local/operator signal, deliberately separate from process liveness.
// Missing custody evidence is not a successful backup and no notifications send.
export async function reliabilitySignals(pool: Pool, mediaRoot: string, heartbeatPath: string, backupReceiptPath: string, now = Date.now(), reserveBytes = 268435456) {
  const issues: string[] = [];
  let queues: { kind: string; pending: number; failed: number; oldestSeconds: number }[] = [];
  try {
    queues = (await pool.query(`SELECT 'media' AS kind, count(*) FILTER (WHERE state IN ('pending','running'))::int AS pending, count(*) FILTER (WHERE state='failed')::int AS failed, greatest(0, coalesce(max(extract(epoch FROM clock_timestamp()-next_run_at)) FILTER (WHERE state IN ('pending','running')),0))::float AS "oldestSeconds" FROM media_jobs UNION ALL SELECT 'report', count(*) FILTER (WHERE state IN ('pending','running'))::int, count(*) FILTER (WHERE state='failed')::int, greatest(0, coalesce(max(extract(epoch FROM clock_timestamp()-next_run_at)) FILTER (WHERE state IN ('pending','running')),0))::float FROM report_jobs`)).rows;
    if (queues.some(q => q.failed > 0)) issues.push('TERMINAL_JOBS');
    if (queues.some(q => q.oldestSeconds > 300)) issues.push('QUEUE_OVERDUE');
    if ((await pool.query('SELECT 1 FROM recovery_holds h WHERE NOT EXISTS (SELECT 1 FROM recovery_reconciliations r WHERE r.hold_id=h.id) LIMIT 1')).rowCount) issues.push('RECOVERY_REQUIRED');
  } catch { issues.push('DATABASE_UNAVAILABLE'); }
  let heartbeatAgeMs: number | null = null;
  try { const value = Number(await readFile(heartbeatPath, 'utf8')); if (!Number.isFinite(value) || value <= 0 || value > now) throw Error(); heartbeatAgeMs = now - value; if (heartbeatAgeMs > 90000) issues.push('WORKER_HEARTBEAT_STALE'); } catch { issues.push('WORKER_HEARTBEAT_UNKNOWN'); }
  let backupAgeMs: number | null = null;
  try { const value = JSON.parse(await readFile(backupReceiptPath, 'utf8')); const at = Date.parse(value.completedAt); if (value.result !== 'PASS' || !Number.isFinite(at) || at > now || !/^[a-f0-9]{64}$/.test(value.manifestSha256)) throw Error(); backupAgeMs = now - at; if (backupAgeMs > 86400000) issues.push('BACKUP_STALE'); } catch { issues.push('BACKUP_UNKNOWN'); }
  let disk: { availableBytes: number; freeInodes: number | null } | null = null;
  try { const s = await statfs(mediaRoot); disk = { availableBytes: s.bavail * s.bsize, freeInodes: s.files > 0 ? s.ffree : null }; if (disk.availableBytes < reserveBytes || (disk.freeInodes !== null && disk.freeInodes < 1024)) issues.push('STORAGE_PRESSURE'); } catch { issues.push('STORAGE_UNKNOWN'); }
  return { status: issues.length ? 'ATTENTION' : 'OK', issues, queues, heartbeatAgeMs, backupAgeMs, disk, thresholds: { queueSeconds: 300, heartbeatSeconds: 90, backupHours: 24, storageReserveBytes: reserveBytes }, independentRecovery: 'NOT_VERIFIED' };
}
