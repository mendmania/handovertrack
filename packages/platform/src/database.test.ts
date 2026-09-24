import { it, expect } from 'vitest';
import { createDatabase } from './database';
it('closes an uninitialized Kysely pool and installs a safe idle-error listener', async () => {
  const database = createDatabase('postgresql://unused@127.0.0.1:1/unused');
  expect(database.pool.listenerCount('error')).toBe(1);
  await database.close();
  expect(database.pool.ended).toBe(true);
  await database.close();
});
