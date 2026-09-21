import { createDatabase } from '@handovertrack/platform/database';
import { readServerConfig } from '@handovertrack/config/server';
import { sql } from 'kysely';
const config = readServerConfig(process.env);
const { db } = createDatabase(config.DATABASE_URL);
const report = (event: string, extra = {}) => console.log(JSON.stringify({ service: 'handovertrack-worker', event, ...extra }));
await sql`select 1`.execute(db);
report('ready', { profile: 'selfhosted-trial', handlers: [], note: 'Database connected. Leased jobs and media processing are not implemented.' });
let checking = false;
const timer = setInterval(async () => {
  if (checking) return;
  checking = true;
  try { await sql`select 1`.execute(db); report('heartbeat'); }
  catch { report('database_unavailable'); }
  finally { checking = false; }
}, config.WORKER_HEARTBEAT_MS);
let closing = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => {
  if (closing) return;
  closing = true; clearInterval(timer); await db.destroy(); report('stopped', { signal }); process.exit(0);
});
