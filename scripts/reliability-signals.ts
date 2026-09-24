import pg from 'pg';
import { reliabilitySignals } from '../packages/platform/src/operations';
if (!process.env.DATABASE_URL || !process.env.MEDIA_ROOT || !process.env.WORKER_HEARTBEAT_FILE || !process.env.BACKUP_RECEIPT_FILE) throw Error('Explicit database, media, heartbeat and backup receipt paths required');
const reserveBytes = Number(process.env.MEDIA_RESERVE_BYTES ?? 268435456);
if (!Number.isSafeInteger(reserveBytes) || reserveBytes < 0) throw Error('Invalid storage reserve');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000, statement_timeout: 3000 });
try { const result = await reliabilitySignals(pool, process.env.MEDIA_ROOT, process.env.WORKER_HEARTBEAT_FILE, process.env.BACKUP_RECEIPT_FILE, Date.now(), reserveBytes); console.log(JSON.stringify(result)); if (result.status !== 'OK') process.exitCode = 2; } finally { await pool.end(); }
