import { it, expect } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Pool } from 'pg';
import { reliabilitySignals } from './operations';
it('live heartbeat cannot mask DB failure or claim a missing/invalid backup is current', async () => {
  const root = await mkdtemp(join(tmpdir(), 'task09-signals-')), now = Date.now();
  const pool = { query: async () => { throw Error('unavailable'); } } as unknown as Pool;
  try {
    const heartbeat = join(root, 'heartbeat'), backup = join(root, 'backup');
    await writeFile(heartbeat, String(now));
    let r = await reliabilitySignals(pool, root, heartbeat, backup, now);
    expect(r.heartbeatAgeMs).toBe(0); expect(r.status).toBe('ATTENTION'); expect(r.issues).toContain('DATABASE_UNAVAILABLE'); expect(r.issues).toContain('BACKUP_UNKNOWN');
    await writeFile(backup, JSON.stringify({ result: 'PASS', completedAt: new Date(now + 1000).toISOString(), manifestSha256: 'a'.repeat(64) }));
    r = await reliabilitySignals(pool, root, heartbeat, backup, now); expect(r.issues).toContain('BACKUP_UNKNOWN');
    await writeFile(backup, JSON.stringify({ result: 'PASS', completedAt: new Date(now).toISOString(), manifestSha256: 'a'.repeat(64) }));
    r = await reliabilitySignals(pool, root, heartbeat, backup, now); expect(r.issues).not.toContain('BACKUP_UNKNOWN'); expect(r.status).toBe('ATTENTION'); expect(r.independentRecovery).toBe('NOT_VERIFIED');
  } finally { await rm(root, { recursive: true }); }
});
