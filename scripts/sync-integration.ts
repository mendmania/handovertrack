import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { createApp } from '../apps/api/src/app';
import { migrate } from '../packages/db/src/migrate';
import { seed, fixtures } from '../packages/db/src/seed';
import { readServerConfig } from '../packages/config/src/server';
import { createApi, ApiError, type Project, type Scope, type SyncChange } from '../packages/contracts/src/index';
import { createProjectManagement, CURSOR_TTL_MS } from '../packages/platform/src/project-management';

const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'test', DATABASE_URL: process.env.TEST_DATABASE_URL, MIGRATION_DATABASE_URL: process.env.TEST_MIGRATION_DATABASE_URL };
if (!env.DATABASE_URL || !env.MIGRATION_DATABASE_URL || !new URL(env.DATABASE_URL).pathname.endsWith('/handovertrack_test')) throw new Error('Dedicated handovertrack_test configuration required');
await migrate(env.MIGRATION_DATABASE_URL); await migrate(env.MIGRATION_DATABASE_URL); await seed(env);
const config = readServerConfig(env); const app = createApp(config, false);
const address = await app.listen({ host: '127.0.0.1', port: 0 });
const admin = new pg.Client({ connectionString: env.MIGRATION_DATABASE_URL }); await admin.connect();
await admin.query('SELECT pg_advisory_lock(818103)');
// Remove only abandoned fixtures from this script in the dedicated test DB.
await admin.query("DELETE FROM organizations WHERE name='Isolated sync acceptance'");
const runtime = new pg.Pool({ connectionString: env.DATABASE_URL });
const org = randomUUID(); const check = (label: string) => console.log(`PASS ${label}`);
const input = (name: string) => ({ name, description: 'Sync integration fixture', address: 'Test site', status: 'active' as const });
const key = () => randomUUID();
async function login(email: string) {
  const response = await fetch(address + '/api/auth/sign-in/email', { method: 'POST', headers: { origin: config.WEB_ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify({ email, password: env.SEED_PASSWORD }) });
  assert.equal(response.status, 200); const cookie = response.headers.getSetCookie().map((v) => v.split(';')[0]).join('; ');
  return { cookie, api: createApi({ baseUrl: address, headers: { cookie, origin: config.WEB_ORIGIN } }) };
}
async function failure(work: Promise<unknown>, status: number, code: string) {
  await assert.rejects(work, (error: unknown) => error instanceof ApiError && error.status === status && error.code === code);
}
async function waitForLock(blocker: number): Promise<number> {
  for (let i = 0; i < 100; i++) {
    const found = (await admin.query<{ pid: number }>('SELECT pid FROM pg_stat_activity WHERE $1::int=ANY(pg_blocking_pids(pid))', [blocker])).rows[0];
    if (found) return found.pid;
    await delay(10);
  }
  throw new Error('Expected transaction did not block');
}
try {
  const { api: manager, cookie } = await login('manager.north@example.test');
  const { api: worker } = await login('worker.north@example.test');
  const { api: outsider } = await login('manager.south@example.test');
  const managerId = (await manager.me()).accountId; const workerId = (await worker.me()).accountId;
  const scope: Scope = { accountId: managerId, organizationId: org }; const workerScope = { accountId: workerId, organizationId: org };
  await admin.query("INSERT INTO organizations(id,name) VALUES($1,'Isolated sync acceptance')", [org]);
  await admin.query("INSERT INTO memberships(organization_id,account_id,role) VALUES($1,$2,'manager'),($1,$3,'field_worker')", [org, managerId, workerId]);
  const empty = await worker.bootstrap(workerScope); assert.deepEqual(empty.projects, []); assert.deepEqual(empty.assignments, []);
  const initial = await manager.bootstrap(scope);
  const createKey = key();
  const [p, simultaneous] = await Promise.all([manager.createProject(scope, input('Create exactly once'), createKey), manager.createProject(scope, input('Create exactly once'), createKey)]);
  assert.deepEqual(simultaneous, p);
  assert.equal(p.version, 1);
  const copies = await Promise.all([manager.createProject(scope, input('Create exactly once'), createKey), manager.createProject(scope, input('Create exactly once'), createKey)]);
  assert.deepEqual(copies, [p, p]);
  const effects = (await admin.query('SELECT (SELECT count(*)::int FROM audit_records WHERE organization_id=$1) AS audit,(SELECT count(*)::int FROM sync_changes WHERE organization_id=$1) AS feed,(SELECT count(*)::int FROM command_receipts WHERE organization_id=$1) AS receipts', [org])).rows[0];
  assert.deepEqual(effects, { audit: 1, feed: 1, receipts: 1 });
  await failure(manager.createProject(scope, input('Different intent'), createKey), 409, 'IDEMPOTENCY_CONFLICT');
  check('concurrent same-key command retries return original result with one project, audit, receipt and publication');

  const outsiderId = (await outsider.me()).accountId;
  const deniedOps = [
    worker.createProject(workerScope, input('Forbidden'), key()),
    worker.updateProject(workerScope, p.id, { ...input('Forbidden'), baseVersion: 1 }, key()),
    worker.setAssignment(workerScope, p.id, workerId, { active: true, baseVersion: 0 }, key()),
    outsider.updateProject(scope, p.id, { ...input('Forbidden'), baseVersion: 1 }, key()),
    manager.updateProject({ ...scope, organizationId: fixtures.orgB }, p.id, { ...input('Forbidden'), baseVersion: 1 }, key()),
    manager.setAssignment(scope, p.id, outsiderId, { active: true, baseVersion: 0 }, key()),
  ];
  await Promise.all(deniedOps.map((work) => failure(work, 404, 'NOT_FOUND')));
  await failure(worker.workers(workerScope), 404, 'NOT_FOUND');
  await failure(worker.assignments(workerScope, p.id), 404, 'NOT_FOUND');
  const malicious = await fetch(`${address}/v1/organizations/${org}/projects`, { method: 'POST', headers: { cookie, origin: 'https://attacker.invalid', 'content-type': 'application/json', 'idempotency-key': key() }, body: JSON.stringify(input('CSRF')) });
  assert.equal(malicious.status, 403); assert.equal((await malicious.json()).code, 'FORBIDDEN_ORIGIN');
  const missingOrigin = await fetch(`${address}/v1/organizations/${org}/projects`, { method: 'POST', headers: { cookie, 'content-type': 'application/json', 'idempotency-key': key() }, body: JSON.stringify(input('No origin')) });
  assert.equal(missingOrigin.status, 403);
  check('manager capability, same-organization worker and exact mutation Origin enforced; workers/cross-tenant IDs cannot mutate or enumerate workers');

  const updateKey = key(); const edited = await manager.updateProject(scope, p.id, { ...input('Updated project'), baseVersion: 1 }, updateKey);
  assert.equal(edited.version, 2);
  assert.deepEqual(await manager.updateProject(scope, p.id, { ...input('Updated project'), baseVersion: 1 }, updateKey), edited);
  await assert.rejects(manager.updateProject(scope, p.id, { ...input('Retain my submitted intent'), baseVersion: 1 }, key()), (error: unknown) => error instanceof ApiError && error.code === 'VERSION_CONFLICT' && error.status === 409 && error.current?.version === 2);
  const grant = await manager.setAssignment(scope, p.id, workerId, { active: true, baseVersion: 0 }, key()); assert.equal(grant.version, 1);
  assert.deepEqual((await manager.workers(scope)).map((w) => w.accountId), [workerId]);
  assert.equal((await manager.assignments(scope, p.id))[0]?.version, 1);
  const grantEvents: SyncChange[] = []; let workerCursor = empty.cursor;
  for (let count = 0; count < 10; count++) {
    const page = await worker.pull(workerScope, workerCursor, undefined, 1);
    assert.deepEqual(await worker.pull(workerScope, workerCursor, undefined, 1), page, 'Duplicate pages must preserve cursor and immutable payload');
    grantEvents.push(...page.changes); workerCursor = page.cursor;
    if (!page.hasMore) break;
  }
  assert(grantEvents.some((event) => event.entity === 'project' && event.project?.id === p.id && event.project.version === 2));
  assert(grantEvents.some((event) => event.entity === 'assignment' && event.assignment?.accountId === workerId));
  assert.equal((await worker.detail(workerScope, p.id)).version, 2);
  const revoke = await manager.setAssignment(scope, p.id, workerId, { active: false, baseVersion: grant.version }, key()); assert.equal(revoke.version, 2);
  const firstRemoval = await worker.pull(workerScope, workerCursor, undefined, 1);
  assert.equal(firstRemoval.hasMore, true); assert.equal(firstRemoval.changes[0]?.entity, 'project'); assert.equal(firstRemoval.changes[0]?.operation, 'remove');
  const secondRemoval = await worker.pull(workerScope, firstRemoval.cursor, undefined, 1);
  assert.equal(secondRemoval.changes[0]?.entity, 'assignment'); assert.equal(secondRemoval.changes[0]?.operation, 'remove');
  await failure(worker.detail(workerScope, p.id), 404, 'NOT_FOUND');
  assert.deepEqual((await worker.snapshot(workerScope)).projects, []);
  const afterRevocation = await worker.pull(workerScope, empty.cursor);
  assert(!afterRevocation.changes.some((change) => change.operation === 'upsert'), 'Historical rows must obey current revoked authorization');
  const regrant = await manager.setAssignment(scope, p.id, workerId, { active: true, baseVersion: revoke.version }, key()); assert.equal(regrant.version, 3);
  const recovery = await worker.pull(workerScope, secondRemoval.cursor);
  assert.equal(recovery.changes.find((event) => event.entity === 'assignment')?.assignment?.version, 3);
  check('optimistic conflicts include current version; replay precedes version check; grant/revoke/regrant keeps stable versions and delivers both tombstone ordinals');

  const unrelated = await manager.createProject(scope, input('Manager only'), key());
  const workerBeforeHidden = await worker.bootstrap(workerScope);
  await manager.updateProject(scope, unrelated.id, { ...input('Still manager only'), baseVersion: 1 }, key());
  const hidden = await worker.pull(workerScope, workerBeforeHidden.cursor, undefined, 1);
  assert.deepEqual(hidden.changes, []); assert.notEqual(hidden.cursor, workerBeforeHidden.cursor);
  assert.equal((await worker.pull(workerScope, hidden.cursor)).changes.length, 0);
  await failure(worker.pull(workerScope, initial.cursor), 400, 'INVALID_CURSOR');
  await failure(manager.pull({ ...scope, organizationId: fixtures.orgA }, initial.cursor), 400, 'INVALID_CURSOR');
  await failure(manager.pull(scope, initial.cursor + 'x'), 400, 'INVALID_CURSOR');
  const future = createProjectManagement(runtime, config.AUTH_SECRET, () => Date.now() + CURSOR_TTL_MS + 1000);
  await assert.rejects(future.pull(managerId, org, initial.cursor, 100), { code: 'CURSOR_EXPIRED', status: 410 });
  const fresh = await manager.bootstrap(scope); assert((await manager.pull(scope, fresh.cursor)).changes.length === 0);
  await admin.query('UPDATE organization_sync_state SET min_retained_revision=revision WHERE organization_id=$1', [org]);
  await failure(manager.pull(scope, initial.cursor), 410, 'CURSOR_EXPIRED');
  await admin.query('UPDATE organization_sync_state SET min_retained_revision=0 WHERE organization_id=$1', [org]);
  await admin.query("UPDATE memberships SET role='manager' WHERE organization_id=$1 AND account_id=$2", [org, workerId]);
  await failure(worker.pull(workerScope, workerCursor), 403, 'ACCESS_CHANGED');
  await admin.query("UPDATE memberships SET role='field_worker' WHERE organization_id=$1 AND account_id=$2", [org, workerId]);
  const beforeDemotion = await manager.bootstrap(scope);
  await admin.query("UPDATE memberships SET role='field_worker' WHERE organization_id=$1 AND account_id=$2", [org, managerId]);
  await failure(manager.pull(scope, beforeDemotion.cursor), 403, 'ACCESS_CHANGED');
  await failure(manager.createProject(scope, input('Create exactly once'), createKey), 404, 'NOT_FOUND');
  assert.deepEqual((await manager.bootstrap(scope)).projects, []);
  await admin.query("UPDATE memberships SET role='manager' WHERE organization_id=$1 AND account_id=$2", [org, managerId]);
  check('invisible raw pages advance cursor; account/org/tamper validation, TTL and retention recover; role change/demotion closes access and blocks receipt replay');

  // Deliberately hold the earlier writer on its project row AFTER it has taken
  // the publication row. A later independent project create must wait behind it.
  const blocker = new pg.Client({ connectionString: env.MIGRATION_DATABASE_URL }); await blocker.connect();
  try {
    await blocker.query('BEGIN'); await blocker.query('SELECT 1 FROM projects WHERE organization_id=$1 AND id=$2 FOR UPDATE', [org, p.id]);
    const blockerPid = (await blocker.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
    const slow = manager.updateProject(scope, p.id, { ...input('Slow earlier commit'), baseVersion: edited.version }, key());
    const slowPid = await waitForLock(blockerPid);
    let laterDone = false;
    const later = manager.createProject(scope, input('Fast later commit'), key()).then((result) => { laterDone = true; return result; });
    await waitForLock(slowPid); assert.equal(laterDone, false);
    const racingBootstrap = await manager.bootstrap(scope);
    assert.equal(racingBootstrap.projects.find((item) => item.id === p.id)?.version, edited.version);
    assert(!racingBootstrap.projects.some((item) => item.name === 'Fast later commit'));
    await blocker.query('COMMIT');
    const [earlyProject, lateProject] = await Promise.all([slow, later]);
    const pageA = await manager.pull(scope, racingBootstrap.cursor, undefined, 1);
    const pageB = await manager.pull(scope, pageA.cursor, undefined, 1);
    assert.equal(pageA.changes[0]?.project?.id, earlyProject.id); assert.equal(pageB.changes[0]?.project?.id, lateProject.id);
    assert(BigInt(pageA.changes[0]!.revision) < BigInt(pageB.changes[0]!.revision));
    assert.equal(pageB.hasMore, false);
    check('actual slow earlier HTTP writer blocks faster later writer; concurrent bootstrap sees old snapshot and paginated pull includes both commits in order');
  } finally { await blocker.query('ROLLBACK'); await blocker.end(); }

  // Force the audit write to fail after business and publication SQL. The entire
  // transaction must roll back, including its revision allocation and receipt.
  const rejectionKey = key();
  const beforeFailure = await manager.bootstrap(scope);
  await admin.query(`CREATE FUNCTION task02_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.organization_id='${org}'::uuid AND NEW.after_state->>'name'='Force audit rollback' THEN RAISE EXCEPTION 'intentional audit rollback'; END IF; RETURN NEW; END $$`);
  await admin.query('CREATE TRIGGER task02_reject_audit BEFORE INSERT ON audit_records FOR EACH ROW EXECUTE FUNCTION task02_reject_audit()');
  try {
    await failure(manager.createProject(scope, input('Force audit rollback'), rejectionKey), 500, 'INTERNAL_ERROR');
    assert(!(await manager.list(scope)).some((item) => item.name === 'Force audit rollback'));
    assert.equal((await manager.pull(scope, beforeFailure.cursor)).changes.length, 0);
    assert.equal((await admin.query('SELECT count(*)::int AS count FROM command_receipts WHERE organization_id=$1 AND idempotency_key=$2', [org, rejectionKey])).rows[0].count, 0);
  } finally { await admin.query('DROP TRIGGER task02_reject_audit ON audit_records'); await admin.query('DROP FUNCTION task02_reject_audit()'); }
  const retried = await manager.createProject(scope, input('Force audit rollback'), rejectionKey); assert.equal(retried.version, 1);
  check('audit failure rolls back business, revision, feed and receipt; same command key retries safely');

  const finalBootstrap = await worker.bootstrap(workerScope);
  assert.deepEqual(finalBootstrap.projects.map((item: Project) => item.id), [p.id]);
  assert.equal(finalBootstrap.assignments[0]?.version, 3);
  await admin.query('DELETE FROM memberships WHERE organization_id=$1 AND account_id=$2', [org, workerId]);
  await failure(worker.pull(workerScope, finalBootstrap.cursor), 404, 'NOT_FOUND');
  await failure(worker.bootstrap(workerScope), 404, 'NOT_FOUND');
  await admin.query("INSERT INTO memberships(organization_id,account_id,role) VALUES($1,$2,'field_worker')", [org, workerId]);
  await failure(worker.pull(workerScope, finalBootstrap.cursor), 403, 'ACCESS_CHANGED');
  assert.deepEqual((await worker.bootstrap(workerScope)).projects, []);
  check('membership revocation denies bootstrap/pull; rejoin closes the old cursor scope and requires clean authentication/bootstrap');
} finally {
  await admin.query('DROP TRIGGER IF EXISTS task02_reject_audit ON audit_records');
  await admin.query('DROP FUNCTION IF EXISTS task02_reject_audit()');
  await admin.query('DELETE FROM organizations WHERE id=$1', [org]);
  await admin.end(); await runtime.end(); await app.close();
}
