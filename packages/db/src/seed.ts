import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { createAuth } from '@handovertrack/platform';
import { readServerConfig } from '@handovertrack/config/server';
export const fixtures = {
  orgA: '11111111-1111-4111-8111-111111111111', orgB: '22222222-2222-4222-8222-222222222222',
  projectA: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', unassignedA: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  projectB: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', unassignedB: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
};
export async function seed(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV === 'production' || env.ALLOW_DEV_SEED !== 'true' || !env.SEED_PASSWORD || env.SEED_PASSWORD.length < 16) throw new Error('Development seed requires ALLOW_DEV_SEED=true and SEED_PASSWORD (16+ chars)');
  if (!env.MIGRATION_DATABASE_URL) throw new Error('MIGRATION_DATABASE_URL required');
  const config = readServerConfig(env);
  const authPool = new pg.Pool({ connectionString: config.DATABASE_URL });
  const admin = new pg.Client({ connectionString: env.MIGRATION_DATABASE_URL });
  const auth = createAuth(authPool, config, true); // This instance is NEVER served over HTTP.
  await admin.connect();
  try {
    await admin.query('SELECT pg_advisory_lock(818102)');
    for (const [id, name] of [[fixtures.orgA, 'North Crew'], [fixtures.orgB, 'South Crew']]) {
      await admin.query('INSERT INTO organizations(id,name) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING', [id, name]);
    }
    const users = [
      ['manager.north@example.test', 'North Manager', fixtures.orgA, 'manager'],
      ['worker.north@example.test', 'North Worker', fixtures.orgA, 'field_worker'],
      ['manager.south@example.test', 'South Manager', fixtures.orgB, 'manager'],
      ['worker.south@example.test', 'South Worker', fixtures.orgB, 'field_worker'],
      ['manager.both@example.test', 'Multi-organization Manager', fixtures.orgA, 'manager'],
    ] as const;
    const ids: Record<string, string> = {};
    for (const [email, name, org, role] of users) {
      let subject = (await admin.query<{ id: string }>('SELECT id FROM "user" WHERE email=$1', [email])).rows[0]?.id;
      if (!subject) {
        const result = await auth.api.signUpEmail({ body: { email, name, password: env.SEED_PASSWORD } });
        subject = result.user.id;
      }
      const row = await admin.query<{ id: string }>('INSERT INTO app_accounts(id,auth_user_id,name) VALUES($1,$2,$3) ON CONFLICT(auth_user_id) DO UPDATE SET name=EXCLUDED.name RETURNING id', [randomUUID(), subject, name]);
      const id = row.rows[0]!.id; ids[email] = id;
      await admin.query('INSERT INTO memberships(organization_id,account_id,role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [org, id, role]);
      if (email === 'manager.both@example.test') await admin.query('INSERT INTO memberships(organization_id,account_id,role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [fixtures.orgB, id, role]);
    }
    for (const [org, id, name, address] of [
      [fixtures.orgA, fixtures.projectA, 'North · Riverside repair', '12 Riverside Lane'],
      [fixtures.orgA, fixtures.unassignedA, 'North · Unassigned roof survey', '18 Oak Street'],
      [fixtures.orgB, fixtures.projectB, 'South · Workshop refit', '7 Foundry Road'],
      [fixtures.orgB, fixtures.unassignedB, 'South · Unassigned inspection', '21 Harbor Way'],
    ]) await admin.query('INSERT INTO projects(organization_id,id,name,description,address) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [org, id, name, 'Development project for authenticated, read-only foundation validation.', address]);
    for (const [org, project, email] of [[fixtures.orgA, fixtures.projectA, 'worker.north@example.test'], [fixtures.orgB, fixtures.projectB, 'worker.south@example.test']]) {
      await admin.query('INSERT INTO assignments(organization_id,project_id,account_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [org, project, ids[email!]]);
    }
    console.log('Development seed ready: 2 organizations, 5 users, 4 projects. Existing passwords and assignments preserved.');
  } finally { await admin.query('SELECT pg_advisory_unlock(818102)'); await admin.end(); await authPool.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await seed(process.env);
