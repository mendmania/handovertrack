import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createDatabase } from '@handovertrack/platform/database';
import { createMediaJobs, MediaFiles, sweepMediaScratch } from '@handovertrack/platform/media';
import { readServerConfig } from '@handovertrack/config/server';
const config = readServerConfig(process.env);
const { db, pool } = createDatabase(config.DATABASE_URL);
const files = new MediaFiles(config.MEDIA_ROOT, config.MEDIA_RESERVE_BYTES);
const jobs = createMediaJobs(pool, files, config.WORKER_LEASE_MS);
const owner = randomUUID();
const report = (event: string, extra = {}) => console.log(JSON.stringify({ service: 'handovertrack-worker', event, ...extra }));
await pool.query('SELECT 1');
await sweepMediaScratch(pool,new MediaFiles(config.MEDIA_ROOT,0));
report('ready', { profile: 'selfhosted-trial', handlers: ['image-v1'] });
const markHeartbeat = () => {
  if (process.env.WORKER_HEARTBEAT_FILE) writeFileSync(process.env.WORKER_HEARTBEAT_FILE, String(Date.now()), { mode: 0o600 });
};
markHeartbeat();
let closing = false; let running: Promise<void> | undefined;
async function tick() {
  if (closing || running) return;
  running = (async () => {
    const job = await jobs.claim(owner); if (!job) return;
    report('claimed', { mediaId: job.media_id, attempt: job.attempts, token: job.lease_token });
    const renewal = setInterval(() => { void jobs.renew(job).catch(() => false); }, Math.max(250, config.WORKER_LEASE_MS / 3));
    try { await jobs.process(job); report('processed', { mediaId: job.media_id }); }
    catch { await jobs.fail(job); report('processing_failed', { mediaId: job.media_id }); }
    finally { clearInterval(renewal); }
  })().catch(() => { report('database_unavailable'); }).finally(() => { running = undefined; });
  await running;
}
const timer = setInterval(() => void tick(), config.WORKER_POLL_MS);
const heartbeat = setInterval(() => { markHeartbeat(); report('heartbeat'); }, config.WORKER_HEARTBEAT_MS);
void tick();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => {
  if (closing) return;
  closing = true; clearInterval(timer); clearInterval(heartbeat);
  await running; await db.destroy(); report('stopped', { signal }); process.exit(0);
});
