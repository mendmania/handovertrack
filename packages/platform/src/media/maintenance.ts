import { readdir, lstat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { Pool } from 'pg';
import { transaction } from './service';
import type { MediaFiles } from './files';

// A server scratch file is disposable after 24h. This does not inspect, delete
// or modify original.jpg, staged.jpg, derivatives, or any mobile storage.
export async function sweepMediaScratch(pool: Pool, files: MediaFiles) {
  await files.capacity(0);
  let removed = 0;
  for (const entry of await readdir(files.root,{ withFileTypes:true })) {
    if (!entry.isDirectory() || !/^[0-9a-f-]{36}$/.test(entry.name)) continue;
    await transaction(pool,async (c) => {
      if (!(await c.query<{ ok: boolean }>('SELECT pg_try_advisory_xact_lock(hashtextextended($1,404)) AS ok',[entry.name])).rows[0]!.ok) return;
      // Don't clean a worker's scratch while it owns a live lease.
      const running = await c.query("SELECT 1 FROM media_jobs WHERE media_id=$1 AND state='running' AND lease_until>clock_timestamp()",[entry.name]);
      if (running.rowCount) return;
      const directory = await files.directory(entry.name);
      for (const name of await readdir(directory)) {
        if (!/^[0-9a-f-]{36}\.part$/.test(name)) continue;
        const path = join(directory,name); const info = await lstat(path);
        if (!info.isFile() || info.isSymbolicLink() || Date.now()-info.mtimeMs<86400000) continue;
        await unlink(path); removed++;
      }
      await files.syncDirectory(directory);
    });
  }
  return removed;
}
export async function redriveMediaJob(pool: Pool, mediaId: string) {
  // Explicit operator action only. Original/derivative version remains immutable.
  const result = await pool.query("UPDATE media_jobs SET state='pending',attempts=0,error=NULL,next_run_at=clock_timestamp(),lease_owner=NULL,lease_until=NULL,updated_at=clock_timestamp() WHERE media_id=$1 AND state='failed'",[mediaId]);
  return result.rowCount === 1;
}
