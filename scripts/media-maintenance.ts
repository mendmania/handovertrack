import { createDatabase } from '../packages/platform/src/database';
import { readServerConfig } from '../packages/config/src/server';
import { MediaFiles, sweepMediaScratch, redriveMediaJob } from '../packages/platform/src/media';
const config = readServerConfig(process.env);
const { db,pool } = createDatabase(config.DATABASE_URL);
try {
  if (process.argv[2] === 'status') {
    console.log(JSON.stringify({ jobs:(await pool.query("SELECT state,count(*)::int AS count,min(updated_at) AS oldest_update FROM media_jobs GROUP BY state ORDER BY state")).rows,
      failures:(await pool.query("SELECT media_id,attempts,error,updated_at FROM media_jobs WHERE state='failed' ORDER BY updated_at LIMIT 100")).rows,
      reservations:(await pool.query("SELECT count(*)::int AS count,coalesce(sum(size),0)::text AS bytes FROM media_uploads WHERE state!='accepted'")).rows[0] }));
  }
  else if (process.argv[2] === 'sweep-scratch') console.log(JSON.stringify({ removedServerScratchFiles:await sweepMediaScratch(pool,new MediaFiles(config.MEDIA_ROOT,0)) }));
  else if (process.argv[2] === 'redrive' && /^[0-9a-f-]{36}$/.test(process.argv[3] ?? '')) console.log(JSON.stringify({ redriven:await redriveMediaJob(pool,process.argv[3]!) }));
  else throw new Error('Usage: media-maintenance.ts status | sweep-scratch | redrive <media UUID>');
} finally { await db.destroy(); }
