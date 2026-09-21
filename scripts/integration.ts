import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createApp } from '../apps/api/src/app';
import { migrate } from '../packages/db/src/migrate';
import { seed, fixtures as f } from '../packages/db/src/seed';
import { readServerConfig } from '../packages/config/src/server';
import { createDatabase } from '../packages/platform/src/database';
import { createReaders } from '../packages/platform/src/readers';
import { createApi } from '../packages/contracts/src/index';
const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'test', DATABASE_URL: process.env.TEST_DATABASE_URL, MIGRATION_DATABASE_URL: process.env.TEST_MIGRATION_DATABASE_URL };
if (!env.DATABASE_URL || !env.MIGRATION_DATABASE_URL || !new URL(env.DATABASE_URL).pathname.endsWith('/handovertrack_test')) throw new Error('Dedicated handovertrack_test configuration required');
await migrate(env.MIGRATION_DATABASE_URL); await migrate(env.MIGRATION_DATABASE_URL);
await seed(env); await seed(env);
const config = readServerConfig(env); const app = createApp(config, false);
const address = await app.listen({ host: '127.0.0.1', port: 0 });
const admin = new pg.Client({ connectionString: env.MIGRATION_DATABASE_URL }); await admin.connect();
const runtime = createDatabase(env.DATABASE_URL); const readers = createReaders(runtime.db);
const check = (name: string) => console.log(`PASS ${name}`);
const path = (org: string, project?: string) => `/v1/organizations/${org}/projects${project ? `/${project}` : ''}`;
async function request(url: string, cookie = '', init: RequestInit = {}) {
  return fetch(address + url, { ...init, headers: { cookie, origin: config.WEB_ORIGIN, ...init.headers } });
}
async function login(email: string, native = false) {
  const response = await fetch(address + '/api/auth/sign-in/email', { method: 'POST', headers: { 'content-type': 'application/json', ...(native ? { 'expo-origin': 'handovertrack://' } : { origin: config.WEB_ORIGIN }) }, body: JSON.stringify({ email, password: env.SEED_PASSWORD }) });
  assert.equal(response.status, 200);
  const cookies = response.headers.getSetCookie();
  assert(cookies.some((cookie) => /HttpOnly/i.test(cookie) && /SameSite=Lax/i.test(cookie)));
  assert(!cookies.some((cookie) => /; Secure/i.test(cookie)), 'Explicit local-development cookie');
  return cookies.map((cookie) => cookie.split(';')[0]).join('; ');
}
try {
  assert.equal((await admin.query('SELECT count(*)::int AS count FROM "user"')).rows[0].count, 5);
  assert.equal((await admin.query('SELECT count(*)::int AS count FROM memberships')).rows[0].count, 6);
  assert.equal((await admin.query('SELECT count(*)::int AS count FROM "user" WHERE "emailVerified"')).rows[0].count, 0);
  check('migrations repeat safely; seed rerun has 5 users / 6 memberships / no fabricated email verification');
  const role = await runtime.pool.query('SELECT rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user');
  assert.deepEqual(role.rows[0], { rolsuper: false, rolcreatedb: false, rolcreaterole: false });
  await assert.rejects(runtime.pool.query("INSERT INTO organizations(id,name) VALUES(gen_random_uuid(),'Forbidden')"), { code: '42501' });
  await assert.rejects(runtime.pool.query('DELETE FROM projects WHERE false'), { code: '42501' });
  await assert.rejects(runtime.pool.query('UPDATE memberships SET role=role WHERE false'), { code: '42501' });
  await assert.rejects(runtime.pool.query('UPDATE sync_changes SET ordinal=ordinal WHERE false'), { code: '42501' });
  await assert.rejects(runtime.pool.query('DELETE FROM audit_records WHERE false'), { code: '42501' });
  const grants = await runtime.pool.query("SELECT has_table_privilege(current_user,'projects','INSERT,UPDATE') AS projects, has_table_privilege(current_user,'assignments','INSERT,UPDATE') AS assignments, has_table_privilege(current_user,'sync_changes','SELECT,INSERT') AS feed");
  assert.deepEqual(grants.rows[0], { projects: true, assignments: true, feed: true });
  check('runtime has exact command grants; no organization/membership writes, project delete, feed rewrite or audit delete');
  for (const url of ['/v1/me', path(f.orgA), path(f.orgA, f.projectA), path(f.orgA, 'snapshot')]) assert.equal((await request(url)).status, 401);
  check('all protected API reads return 401 without session');
  assert.equal((await request('/api/auth/sign-up/email', '', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 404);
  assert.equal((await request('/api/auth/request-password-reset', '', { method: 'POST' })).status, 404);
  assert.equal((await request('/api/auth/sign-in/email', '', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await request('/api/auth/sign-in/email', '', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://attacker.invalid' }, body: JSON.stringify({ email: 'manager.north@example.test', password: env.SEED_PASSWORD }) })).status, 403);
  check('public signup/recovery disabled, malformed JSON typed 400, hostile origin rejected');
  const northManager = await login('manager.north@example.test'); const southManager = await login('manager.south@example.test');
  const northWorker = await login('worker.north@example.test', true); const southWorker = await login('worker.south@example.test', true);
  const north = createApi({ baseUrl: address, headers: { cookie: northManager } });
  const worker = createApi({ baseUrl: address, headers: { cookie: northWorker } });
  const me = await north.me(); const workerMe = await worker.me();
  assert.equal(me.memberships[0]?.organizationId, f.orgA); assert.equal(me.memberships[0]?.role, 'manager');
  const scope = { accountId: me.accountId, organizationId: f.orgA };
  assert.equal((await north.list(scope)).length, 2); assert.equal((await north.detail(scope, f.projectA)).id, f.projectA);
  const workerScope = { accountId: workerMe.accountId, organizationId: f.orgA };
  const snapshot = await worker.snapshot(workerScope); assert.equal(snapshot.complete, true); assert.deepEqual(snapshot.projects.map((item) => item.id), [f.projectA]);
  check('real Better Auth browser/native-style sign-in + generated client list/detail/complete assigned snapshot');
  for (const cookie of [southManager, southWorker]) {
    for (const url of [path(f.orgA), path(f.orgA, f.projectA), path(f.orgA, 'snapshot'), path(f.orgB, f.projectA)]) {
      const response = await request(url, cookie); assert.equal(response.status, 404); assert.equal((await response.json()).code, 'NOT_FOUND');
    }
  }
  assert.equal((await request(path(f.orgA, f.unassignedA), northWorker)).status, 404);
  assert.equal((await request(path(f.orgA, randomUUID()), northWorker)).status, 404);
  assert.deepEqual((await readers.projects.listAuthorized(workerMe.accountId, f.orgA, 201)).map((row) => row.id), [f.projectA]);
  assert.equal(await readers.projects.findAuthorized(workerMe.accountId, f.orgA, f.unassignedA), undefined);
  assert.equal(await readers.projects.findAuthorized(workerMe.accountId, f.orgB, f.projectB), undefined);
  check('cross-tenant and unassigned direct-ID denials enforced in HTTP and repositories');
  await assert.rejects(admin.query('INSERT INTO assignments(organization_id,project_id,account_id) VALUES($1,$2,$3)', [f.orgB, f.projectB, workerMe.accountId]), { code: '23503' });
  check('composite foreign key rejects cross-organization assignment');
  const extraIds = Array.from({ length: 199 }, () => randomUUID());
  try {
    await admin.query("INSERT INTO projects(organization_id,id,name,description,address) SELECT $1, id, 'Overflow','Test','Test' FROM unnest($2::uuid[]) AS id", [f.orgA, extraIds]);
    const response = await request(path(f.orgA, 'snapshot'), northManager); assert.equal(response.status, 413);
    const error = await response.json(); assert.equal(error.code, 'SNAPSHOT_TOO_LARGE'); assert.equal(error.projects, undefined); assert.equal(error.complete, undefined);
    check('snapshot cap overflow returns 413 with no truncated complete result');
  } finally { await admin.query('DELETE FROM projects WHERE organization_id=$1 AND id=ANY($2::uuid[])', [f.orgA, extraIds]); }
  try {
    await admin.query('DELETE FROM assignments WHERE organization_id=$1 AND account_id=$2', [f.orgA, workerMe.accountId]);
    assert.deepEqual((await worker.snapshot(workerScope)).projects, []);
    assert.equal((await request(path(f.orgA, f.projectA), northWorker)).status, 404);
    check('authoritative assignment removal produces empty complete snapshot and direct-ID denial');
  } finally { await admin.query('INSERT INTO assignments(organization_id,project_id,account_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [f.orgA, f.projectA, workerMe.accountId]); }
  const logout = await request('/api/auth/sign-out', northManager, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); assert.equal(logout.status, 200);
  assert.equal((await request('/v1/me', northManager)).status, 401);
  check('logout invalidates real server session');
} finally { await admin.end(); await runtime.db.destroy(); await app.close(); }
