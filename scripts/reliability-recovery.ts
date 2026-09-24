// Bounded synthetic-only pg_dump/archive/restore rehearsal. Never invokes kubectl,
// operator backup.py, existing containers, a phone, or public ingress.
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { readFile, mkdir, writeFile, cp, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { parseEnv } from 'node:util';
import pg from 'pg';
import { createApp } from '../apps/api/src/app';
import { readServerConfig } from '../packages/config/src/server';
import { createApi, ApiError, type CreatedShare } from '../packages/contracts/src/index';
import { createReportJobs, ReportFiles } from '../packages/platform/src/reports';
import { MediaFiles, createMediaJobs } from '../packages/platform/src/media';
import { reliabilitySignals } from '../packages/platform/src/operations';
import { ChecklistStore } from '../apps/mobile/src/checklists/store';
import { captureFixture } from './media-fixture';
import { UploadExecutor } from '../apps/mobile/src/media/upload';
import { assertPage as assertV4Page } from '../tests/compatibility/task05-v4-protocol';
import { migrate } from '../packages/db/src/migrate';
const root = resolve('.local/task09');
const sourceEnv = { ...process.env, ...parseEnv(await readFile(join(root, 'source.env'), 'utf8')) };
const restoreEnv = { ...process.env, ...parseEnv(await readFile(join(root, 'restore.env'), 'utf8')) };
for (const [label, env] of [['source', sourceEnv], ['restore', restoreEnv]] as const) {
  assert.equal(env.TASK09_ISOLATED, 'true');
  for (const k of ['DATABASE_URL', 'MIGRATION_DATABASE_URL'] as const) { const u = new URL(env[k]!); assert.equal(u.hostname, '127.0.0.1'); assert.equal(u.pathname, '/handovertrack_test'); assert.equal(u.port, label === 'source' ? '55550' : '55551'); }
  const inspected = JSON.parse(command('docker', ['inspect', 'handovertrack-task09-' + label]).toString())[0];
  assert.equal(inspected.Config.Labels['handovertrack.task'], '09');
  assert.equal(inspected.NetworkSettings.Ports['5432/tcp'][0].HostIp, '127.0.0.1');
  assert.equal(inspected.NetworkSettings.Ports['5432/tcp'][0].HostPort, label === 'source' ? '55550' : '55551');
  assert.equal(resolve(env.MEDIA_ROOT!), join(root, label + '-media'));
}
function command(program: string, args: string[], options: { input?: Buffer; stdio?: ['pipe', number, 'pipe'] | [number, 'pipe', 'pipe'] } = {}) { const r = spawnSync(program, args, { ...options, maxBuffer: 30 * 1024 * 1024 }); if (r.status !== 0) throw Error(program + ' failed: ' + r.stderr?.toString()); return r.stdout ?? Buffer.alloc(0); }
const hash = (v: Buffer | string) => createHash('sha256').update(v).digest('hex');
const config = readServerConfig(sourceEnv), source = new pg.Pool({ connectionString: sourceEnv.MIGRATION_DATABASE_URL }), runtime = new pg.Pool({ connectionString: config.DATABASE_URL });
const dest = new pg.Pool({ connectionString: restoreEnv.MIGRATION_DATABASE_URL });
const app = createApp(config, false); let address = await app.listen({ host: '127.0.0.1', port: 0 });
const files = new ReportFiles(config.MEDIA_ROOT, 0), jobs = createReportJobs(runtime, files, config.MEDIA_ROOT);
const fixture = JSON.parse(await readFile(join(root, 'fixture.json'), 'utf8')), { scope, projectId } = fixture;
const started = Date.now(); const evidence: Record<string, unknown> = { source: command('git', ['rev-parse', 'HEAD']).toString().trim(), startedAt: new Date().toISOString(), independentRecovery: 'NOT RUN: owner deferred arrangements', nativeRadio: 'NOT RUN by this harness' };
const key = () => randomUUID();
async function login() { const r = await fetch(address + '/api/auth/sign-in/email', { method: 'POST', headers: { origin: config.WEB_ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify({ email: 'manager.north@example.test', password: sourceEnv.SEED_PASSWORD }) }); assert.equal(r.status, 200); return r.headers.getSetCookie().map(s => s.split(';')[0]).join('; '); }
const cookie = await login();
const api = createApi({ baseUrl: address, headers: { cookie, origin: config.WEB_ORIGIN } });
async function requestReport() { const p = await api.detail(scope, projectId), run = (await api.checklist(scope, projectId)).run!, c = (await api.proof(scope, projectId)).composition; return api.requestReport(scope, projectId, { projectVersion: p.version, checklistVersion: run.version, compositionVersion: c.version, mediaIds: [...new Set([fixture.before, fixture.after, ...run.answers.flatMap(a => a.mediaIds)])] }, key()); }
async function readyShare() { const r = await requestReport(), job = await jobs.claim(key()); assert.equal(job?.report_id, r.id); await jobs.process(job!); return api.createShare(scope, projectId, r.id, { expiresAt: new Date(Date.now() + 86400000).toISOString() }, key()); }
const guest = (s: CreatedShare, suffix = '', body?: unknown, commandKey = key()) => fetch(`${address}/guest/v1/shares/${s.share.id}${suffix}`, { method: body ? 'POST' : 'GET', headers: { authorization: 'Bearer ' + s.token, origin: config.WEB_ORIGIN, ...(body ? { 'content-type': 'application/json', 'idempotency-key': commandKey } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const decision = (s: CreatedShare) => ({ reportId: s.share.report.reportId, sha256: s.share.report.sha256, kind: 'correction', claimedName: 'Synthetic customer', message: 'Post-backup correction must not disappear.', confirmed: true });
async function inventory(pool: pg.Pool) { const result: Record<string, { rows: number; sha256: string; owner: string }> = {}; for (const t of (await pool.query("SELECT tablename,tableowner FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows) { const rows = (await pool.query(`SELECT row_to_json(t)::text value FROM ${pg.escapeIdentifier(t.tablename)} t ORDER BY row_to_json(t)::text COLLATE "C"`)).rows.map(r => r.value); result[t.tablename] = { rows: rows.length, sha256: hash(JSON.stringify(rows)), owner: t.tableowner }; } return result; }
let restoredApp: ReturnType<typeof createApp> | undefined; let destClosed = false;
const mobileRoot = join(root, 'native-fixture-' + key()); await mkdir(mobileRoot, { mode: 0o700 }); const mobile = await captureFixture(mobileRoot); let mobileClosed = false; let runtimeClosed = false;
try {
  // One new capture through the actual authoritative SQLite service and executor.
  await mobile.store.bootstrap(scope, await api.bootstrap(scope), () => {});
  const camera = await readFile(await new MediaFiles(config.MEDIA_ROOT, 0).path(fixture.before, 'original.jpg'));
  const cameraPath = join(mobileRoot, 'camera.jpg'); await writeFile(cameraPath, camera);
  const capture = await mobile.service.reserve(scope, projectId, () => {}); await mobile.service.save(capture, cameraPath, { width: 600, height: 900 });
  await mobile.reopen();
  const pressured = createApp({ ...config, MEDIA_RESERVE_BYTES: Number.MAX_SAFE_INTEGER }, false);
  pressured.get('/task09-enospc', async () => { throw Object.assign(Error('synthetic ENOSPC'), { code: 'ENOSPC' }); });
  const pressureAddress = await pressured.listen({ host: '127.0.0.1', port: 0 });
  try {
    assert.equal((await fetch(pressureAddress + '/task09-enospc')).status, 507);
    const pressureApi = createApi({ baseUrl: pressureAddress, headers: { cookie, origin: config.WEB_ORIGIN } });
    await new UploadExecutor(mobile.service, async () => {}).run(scope, { api: pressureApi, content: async () => { throw Error('Intake must reject before content'); } }, new AbortController().signal, () => {});
    const held = (await mobile.service.list(scope))[0]!;
    assert.equal(held.queueState, 'pending'); assert.equal(held.id, capture.id);
    assert.equal(hash(await readFile(mobile.files.uri(held.originalPath!))), held.sha256);
    assert.equal((await source.query('SELECT 1 FROM media_uploads WHERE id=$1', [capture.id])).rowCount, 0);
    await assert.rejects(pressureApi.createUpload(scope, projectId, { mediaId: capture.id, accountId: scope.accountId, size: held.size!, sha256: held.sha256!, width: 600, height: 900, capturedAt: held.createdAt, mime: 'image/jpeg' }), (e: unknown) => e instanceof ApiError && e.status === 507);
  } finally { await pressured.close(); }
  await mobile.reopen(); mobile.db().exec('UPDATE media_queue SET next_attempt_at=0'); let lose = true;
  const transport = { api: { ...api, async completeUpload(...args: Parameters<typeof api.completeUpload>) { const r = await api.completeUpload(...args); if (lose) { lose = false; throw Error('response lost after commit'); } return r; } }, async content(row: { originalPath: string | null }, id: string) { const r = await fetch(`${address}/media/organizations/${scope.organizationId}/uploads/${id}/content`, { method: 'PUT', headers: { cookie, origin: config.WEB_ORIGIN, 'content-type': 'image/jpeg' }, body: new Uint8Array(await readFile(mobile.files.uri(row.originalPath!))) }); assert.equal(r.status, 200); return r.json(); } };
  await new UploadExecutor(mobile.service, async () => {}).run(scope, transport, new AbortController().signal, () => {});
  assert.equal((await source.query('SELECT state FROM media_uploads WHERE id=$1', [capture.id])).rows[0].state, 'accepted');
  assert.equal((await mobile.service.list(scope))[0]!.queueState, 'pending');
  await mobile.reopen(); mobile.db().exec('UPDATE media_queue SET next_attempt_at=0');
  await new UploadExecutor(mobile.service, async () => {}).run(scope, transport, new AbortController().signal, () => {});
  assert.equal((await mobile.service.list(scope))[0]!.queueState, 'server_accepted');
  // Keep another original pending in the independent mobile backup.
  const pendingCapture = await mobile.service.reserve(scope, projectId, () => {}); await mobile.service.save(pendingCapture, cameraPath, { width: 600, height: 900 });
  const images = createMediaJobs(runtime, new MediaFiles(config.MEDIA_ROOT, 0)); const imageJob = await images.claim(key()); assert.equal(imageJob?.media_id, capture.id); await images.process(imageJob!);
  const p = await api.detail(scope, projectId); await api.updateProject(scope, projectId, { name: p.name, description: p.description, address: p.address, status: 'active', baseVersion: p.version }, key());
  await mobile.store.bootstrap(scope, await api.bootstrap(scope), () => {});
  const run = (await api.checklist(scope, projectId)).run!; const answer = run.answers[0]!;
  const answerKey = key(), answerCommand = { kind: 'answer' as const, runId: run.id, questionId: answer.questionId, text: 'Task09 captured evidence', mediaIds: [fixture.before, capture.id], baseVersion: answer.version };
  const oldCursor = (await api.bootstrap(scope)).cursor;
  const saved = await api.checklistCommand(scope, projectId, answerCommand, answerKey); assert.deepEqual(await api.checklistCommand(scope, projectId, answerCommand, answerKey), saved);
  const newFeed = await api.pull(scope, oldCursor);
  assert(newFeed.changes.some(c => c.entity === 'checklist'));
  assert.throws(() => assertV4Page(newFeed, scope), /Invalid sync change/);
  evidence.oldClientCompatibility = 'PASS rejection confirmed: retained v4 client must not consume checklist feed';
  const active = await api.detail(scope, projectId); await api.checklistCommand(scope, projectId, { kind: 'complete', runId: run.id, baseVersion: active.version }, key());
  // Existing composition plus captured answer now become frozen report inputs.
  const full = await api.requestReport(scope, projectId, { projectVersion: active.version + 1, checklistVersion: saved.run.version, compositionVersion: (await api.proof(scope, projectId)).composition.version, mediaIds: [...new Set([fixture.before, fixture.after, capture.id, ...saved.run.answers.flatMap(a => a.mediaIds)])] }, key());
  const fullJob = await jobs.claim(key()); assert.equal(fullJob?.report_id, full.id); await jobs.process(fullJob!);
  const fullShare = await api.createShare(scope, projectId, full.id, { expiresAt: new Date(Date.now() + 86400000).toISOString() }, key());
  const dk = key(), dr = await guest(fullShare, '/decisions', decision(fullShare), dk); assert.equal(dr.status, 200); const accepted = await dr.json(); assert.equal((await (await guest(fullShare, '/decisions', decision(fullShare), dk)).json()).id, accepted.id);
  await api.reviewDecision(scope, projectId, full.id, { decisionId: accepted.id, note: 'Synthetic end-to-end review' }, key());
  assert.equal(hash(Buffer.from(await (await guest(fullShare, '/pdf')).arrayBuffer())), fullShare.share.report.sha256);
  evidence.journey = 'PASS capture / SQLite restart / lost completion reply / answer replay / completion / frozen PDF / exact share / decision replay / review';
  console.log('PASS complete capture-to-customer-review journey');
  // Restore the original answer evidence so fixture helper can select its two originals.
  const completed = await api.detail(scope, projectId); await api.updateProject(scope, projectId, { name: completed.name, description: completed.description, address: completed.address, status: 'active', baseVersion: completed.version }, key());
  const changed = (await api.checklist(scope, projectId)).run!;
  assert.equal((await api.checklistCommand(scope, projectId, { ...answerCommand, mediaIds: [fixture.before], baseVersion: changed.answers.find(a => a.questionId === answer.questionId)!.version }, key())).outcome, 'applied');
  await api.checklistCommand(scope, projectId, { kind: 'complete', runId: run.id, baseVersion: completed.version + 1 }, key());
  const expiredShare = await readyShare();
  await source.query('ALTER TABLE report_shares DISABLE TRIGGER immutable_report_share');
  try { await source.query("UPDATE report_shares SET created_at=clock_timestamp()-interval '2 days', expires_at=clock_timestamp()-interval '1 day' WHERE id=$1", [expiredShare.share.id]); } finally { await source.query('ALTER TABLE report_shares ENABLE TRIGGER immutable_report_share'); }
  assert.equal((await guest(expiredShare)).status, 404);
  const alreadyRevoked = await readyShare(); await api.revokeShare(scope, projectId, alreadyRevoked.share.report.reportId, alreadyRevoked.share.id, key());
  const laterRevoked = await readyShare(), laterDecision = await readyShare();
  const pendingReport = await requestReport(); const terminalReport = await requestReport();
  await source.query("UPDATE report_jobs SET state='failed',attempts=5,error='RENDER_FAILED' WHERE report_id=$1", [terminalReport.id]);
  // Represent a crash after an immutable output was linked but before DB commit.
  const partialReport = await requestReport();
  await source.query("UPDATE report_jobs SET next_run_at=clock_timestamp()+interval '1 hour' WHERE report_id=$1", [pendingReport.id]);
  const partialJob = await jobs.claim(key()); assert.equal(partialJob?.report_id, partialReport.id);
  await source.query("CREATE FUNCTION task09_stop_publication() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic crash boundary'; END $$");
  await source.query('CREATE TRIGGER task09_stop BEFORE INSERT ON report_artifacts FOR EACH ROW EXECUTE FUNCTION task09_stop_publication()');
  try { await assert.rejects(jobs.process(partialJob!)); } finally { await source.query('DROP TRIGGER task09_stop ON report_artifacts'); await source.query('DROP FUNCTION task09_stop_publication()'); }
  const partialHash = hash(await readFile(await files.artifact(partialReport.id)));
  await writeFile(await files.path(partialReport.id, key() + '.part'), 'synthetic interrupted scratch');
  const backup = join(root, 'backup-' + key()); await mkdir(backup, { mode: 0o700 });
  // No externally running API/workers are permitted in this source database.
  await app.close();
  await runtime.end(); runtimeClosed = true;
  const connections = (await source.query("SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type='client backend'")).rows[0].n;
  assert.equal(connections, 0, 'Stop all other Task09 source writers before backup');
  const checklistStore = new ChecklistStore(mobile.store);
  const cachedRun = (await checklistStore.run(scope, projectId))!;
  const pendingQuestion = cachedRun.questions[0]!, conflictQuestion = cachedRun.questions[1]!;
  await checklistStore.enqueue(scope, projectId, key(), { kind: 'answer', runId: cachedRun.id, questionId: pendingQuestion.id, text: 'Pending answer with unsynced photo', mediaIds: [pendingCapture.id], baseVersion: 0 }, () => {});
  await checklistStore.enqueue(scope, projectId, key(), { kind: 'answer', runId: cachedRun.id, questionId: conflictQuestion.id, text: 'Retained local conflict answer', mediaIds: [], baseVersion: 0 }, () => {});
  const conflictRow = (await checklistStore.rows(scope)).find(r => r.question_id === conflictQuestion.id)!;
  const currentAnswer = cachedRun.answers.find(a => a.questionId === conflictQuestion.id)!;
  await checklistStore.record(scope, conflictRow, { outcome: 'conflict', run: cachedRun, current: currentAnswer }, () => {});
  const nativeCommands = await checklistStore.rows(scope);
  assert.deepEqual(nativeCommands.map(r => r.state).sort(), ['conflict', 'pending']);
  mobile.close(); mobileClosed = true;
  await cp(mobileRoot, join(backup, 'native'), { recursive: true, errorOnExist: true, force: false });
  for (const { tablename } of (await source.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows) {
    const rows = JSON.stringify((await source.query(`SELECT row_to_json(t) FROM ${pg.escapeIdentifier(tablename)} t`)).rows);
    for (const share of [fullShare, expiredShare, alreadyRevoked, laterRevoked, laterDecision]) assert(!rows.includes(share.token!), 'Raw guest capability persisted');
  }
  const originalInventory = await inventory(source), backupAt = new Date().toISOString();
  const fd = openSync(join(backup, 'database.dump'), 'wx', 0o600);
  try { command('docker', ['exec', 'handovertrack-task09-source', 'pg_dump', '-U', 'postgres', '-d', 'handovertrack_test', '-Fc'], { stdio: ['pipe', fd, 'pipe'] }); } finally { closeSync(fd); }
  command('python3', ['scripts/ops/local-media-copy.py', 'backup', config.MEDIA_ROOT, backup]);
  assert.deepEqual(await inventory(source), originalInventory, 'Quiesced SQL changed during media copy');
  const manifest = { backupAt, tables: originalInventory, databaseSha256: hash(await readFile(join(backup, 'database.dump'))), mediaArchiveSha256: hash(await readFile(join(backup, 'media.tar.gz'))), inventorySha256: hash(await readFile(join(backup, 'inventory.json'))) };
  await writeFile(join(backup, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 }); const manifestSha256 = hash(await readFile(join(backup, 'manifest.json')));
  const receiptPath = join(backup, 'receipt.json'); await writeFile(receiptPath, JSON.stringify({ completedAt: new Date().toISOString(), result: 'PASS', manifestSha256 }), { flag: 'wx', mode: 0o600 });
  // True post-recovery-point commits on source, not edits to the historical dump.
  const laterApp = createApp(config, false); address = await laterApp.listen({ host: '127.0.0.1', port: 0 });
  const laterCookie = await login(), laterApi = createApi({ baseUrl: address, headers: { cookie: laterCookie, origin: config.WEB_ORIGIN } });
  await laterApi.revokeShare(scope, projectId, laterRevoked.share.report.reportId, laterRevoked.share.id, key());
  const postKey = key(), postResponse = await guest(laterDecision, '/decisions', decision(laterDecision), postKey); assert.equal(postResponse.status, 200); const postDecision = await postResponse.json();
  const missingHistory = { authorityGap: { revokedMembership: scope, sessionsInvalidatedAfterBackup: true }, decision: (await source.query('SELECT * FROM customer_decisions WHERE id=$1', [postDecision.id])).rows, receipts: (await source.query('SELECT * FROM customer_command_receipts WHERE share_id=$1', [laterDecision.share.id])).rows, audit: (await source.query('SELECT * FROM customer_audit_records WHERE decision_id=$1', [postDecision.id])).rows };
  await writeFile(join(backup, 'post-backup-gap.json'), JSON.stringify(missingHistory, null, 2), { flag: 'wx', mode: 0o600 });
  await source.query('DELETE FROM memberships WHERE organization_id=$1 AND account_id=$2', [scope.organizationId, scope.accountId]); await source.query('DELETE FROM session');
  const gapEnd = new Date().toISOString(); await laterApp.close();
  // Fresh restore target only. pg_restore keeps original ownership and grants.
  assert.equal((await dest.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='public'")).rows[0].n, 0);
  const restoredAt = Date.now(), dump = openSync(join(backup, 'database.dump'), 'r');
  try { command('docker', ['exec', '-i', 'handovertrack-task09-restore', 'pg_restore', '-U', 'postgres', '-d', 'handovertrack_test', '--exit-on-error'], { stdio: [dump, 'pipe', 'pipe'] }); } finally { closeSync(dump); }
  command('python3', ['scripts/ops/local-media-copy.py', 'restore', restoreEnv.MEDIA_ROOT!, backup]);
  assert.deepEqual(await inventory(dest), originalInventory, 'Every table, owner, checksum, receipt and pending job must survive');
  await migrate(restoreEnv.MIGRATION_DATABASE_URL!); assert.deepEqual(await inventory(dest), originalInventory);
  // Demonstrate why reopening this exact dump would be unsafe, without serving it.
  assert.equal((await dest.query('SELECT revoked_at FROM report_shares WHERE id=$1', [laterRevoked.share.id])).rows[0].revoked_at, null);
  assert.equal((await dest.query('SELECT 1 FROM customer_decisions WHERE id=$1', [postDecision.id])).rowCount, 0);
  assert.equal((await dest.query('SELECT 1 FROM memberships WHERE organization_id=$1 AND account_id=$2', [scope.organizationId, scope.accountId])).rowCount, 1);
  const hold = key(); command('docker', ['exec', '-i', 'handovertrack-task09-restore', 'psql', '-U', 'postgres', '-d', 'handovertrack_test', '-v', 'ON_ERROR_STOP=1', '-v', 'hold_id=' + hold, '-v', 'backup_at=' + backupAt, '-v', 'manifest_sha256=' + manifestSha256, '-v', 'reason=Known decision and authority gap; post-backup-gap.json SHA256 ' + hash(await readFile(join(backup, 'post-backup-gap.json')))], { input: await readFile('scripts/ops/quarantine-restore.sql') });
  assert.equal((await dest.query('SELECT 1 FROM report_shares WHERE revoked_at IS NULL')).rowCount, 0); assert.equal((await dest.query('SELECT 1 FROM session')).rowCount, 0);
  restoredApp = createApp(readServerConfig(restoreEnv), false); address = await restoredApp.listen({ host: '127.0.0.1', port: 0 });
  for (const share of [expiredShare, alreadyRevoked, laterRevoked, laterDecision]) for (const suffix of ['', '/pdf', '/decisions']) { const response = await guest(share, suffix, suffix === '/decisions' ? decision(share) : undefined, postKey); assert.equal(response.status, 503); assert.equal(response.headers.get('cache-control'), 'private, no-store'); }
  for (const path of ['/v1/me', '/api/auth/get-session', '/health/ready', `/v1/organizations/${scope.organizationId}/projects`, `/media/organizations/${scope.organizationId}/assets/${fixture.before}/original`]) assert.equal((await fetch(address + path, { headers: { cookie } })).status, 503);
  assert.equal((await fetch(address + '/api/auth/sign-in/email', { method: 'POST', headers: { origin: config.WEB_ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify({ email: 'manager.north@example.test', password: sourceEnv.SEED_PASSWORD }) })).status, 503);
  assert.equal((await fetch(address + '/health/live')).status, 200);
  const restoredRuntime = new pg.Pool({ connectionString: restoreEnv.DATABASE_URL });
  try {
    await assert.rejects(restoredRuntime.query('DELETE FROM recovery_holds'), { code: '42501' }); await assert.rejects(restoredRuntime.query('INSERT INTO recovery_reconciliations(hold_id,evidence_sha256,operator_note) VALUES($1,$2,$3)', [hold, '0'.repeat(64), 'bypass']), { code: '42501' });
    await restoredApp.close(); restoredApp = createApp(readServerConfig(restoreEnv), false); address = await restoredApp.listen({ host: '127.0.0.1', port: 0 }); assert.equal((await guest(laterDecision, '/decisions', decision(laterDecision))).status, 503);
    const restoredFiles = new ReportFiles(restoreEnv.MEDIA_ROOT!, 0), restoredJobs = createReportJobs(restoredRuntime, restoredFiles, restoreEnv.MEDIA_ROOT!);
    const beforeInode = (await stat(await restoredFiles.artifact(partialReport.id))).ino;
    await dest.query("UPDATE report_jobs SET lease_until=clock_timestamp()-interval '1 second',next_run_at=clock_timestamp() WHERE report_id=ANY($1::uuid[])", [[partialReport.id, pendingReport.id]]);
    let job; while ((job = await restoredJobs.claim(key()))) await restoredJobs.process(job);
    assert.equal(hash(await readFile(await restoredFiles.artifact(partialReport.id))), partialHash); assert.equal((await stat(await restoredFiles.artifact(partialReport.id))).ino, beforeInode);
    assert.equal((await dest.query('SELECT state FROM report_jobs WHERE report_id=$1', [pendingReport.id])).rows[0].state, 'ready'); assert.equal((await dest.query('SELECT state FROM report_jobs WHERE report_id=$1', [terminalReport.id])).rows[0].state, 'failed');
    assert.equal((await dest.query('SELECT count(*)::int n FROM report_artifacts WHERE report_id=$1', [partialReport.id])).rows[0].n, 1);
    const restoredManifest: Record<string, string> = JSON.parse(await readFile(join(backup, 'inventory.json'), 'utf8'));
    for (const [path, expected] of Object.entries(restoredManifest)) assert.equal(hash(await readFile(join(restoreEnv.MEDIA_ROOT!, path))), expected, 'Resumed jobs changed restored immutable bytes');
    const heartbeat = join(backup, 'heartbeat'); await writeFile(heartbeat, String(Date.now() - 120000)); const signals = await reliabilitySignals(restoredRuntime, restoreEnv.MEDIA_ROOT!, heartbeat, receiptPath);
    assert(signals.issues.includes('RECOVERY_REQUIRED')); assert(signals.issues.includes('WORKER_HEARTBEAT_STALE')); assert(signals.issues.includes('TERMINAL_JOBS'));
    const staleSignals = await reliabilitySignals(restoredRuntime, restoreEnv.MEDIA_ROOT!, heartbeat, receiptPath, Date.now() + 2 * 86400000); assert(staleSignals.issues.includes('BACKUP_STALE'));
    await dest.query("UPDATE report_jobs SET state='pending',attempts=0,next_run_at=clock_timestamp()-interval '10 minutes' WHERE report_id=$1", [terminalReport.id]); const queued = await reliabilitySignals(restoredRuntime, restoreEnv.MEDIA_ROOT!, heartbeat, join(backup, 'missing')); assert(queued.issues.includes('QUEUE_OVERDUE')); assert(queued.issues.includes('BACKUP_UNKNOWN'));
    // Restore fixture terminal state after exercising the read-only signal.
    await dest.query("UPDATE report_jobs SET state='failed',attempts=5 WHERE report_id=$1", [terminalReport.id]);
    evidence.signals = { result: 'PASS', detected: [...new Set([...signals.issues, ...staleSignals.issues, ...queued.issues])], disk: signals.disk };
  } finally { await restoredRuntime.end(); }
  await dest.end(); destClosed = true;
  command('docker', ['stop', 'handovertrack-task09-restore']);
  assert.equal((await fetch(address + '/health/ready')).status, 500);
  const unavailable = new pg.Pool({ connectionString: restoreEnv.DATABASE_URL, connectionTimeoutMillis: 1000, statement_timeout: 1000 });
  try { const down = await reliabilitySignals(unavailable, restoreEnv.MEDIA_ROOT!, join(backup, 'heartbeat'), receiptPath); assert(down.issues.includes('DATABASE_UNAVAILABLE')); } finally { await unavailable.end(); }
  command('docker', ['start', 'handovertrack-task09-restore']);
  for (let i = 0; i < 40; i++) { const r = spawnSync('docker', ['exec', 'handovertrack-task09-restore', 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']); if (r.status === 0) break; assert(i < 39, 'Restored DB readiness timeout'); await new Promise(r => setTimeout(r, 100)); }
  assert.equal((await guest(laterDecision, '/decisions', decision(laterDecision))).status, 503);
  evidence.databaseRestart = 'PASS unavailable signal, actual owned PostgreSQL stop/start, durable recovery hold';
  const restoredMobile = await captureFixture(join(backup, 'native')); try { assert.equal(restoredMobile.db().prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok'); assert.equal(restoredMobile.db().prepare('PRAGMA user_version').get()!.user_version, 5); const recoveredChecklists = new ChecklistStore(restoredMobile.store); assert.deepEqual(await recoveredChecklists.rows(scope), nativeCommands); assert.equal((await recoveredChecklists.rows({ ...scope, accountId: key() })).length, 0); assert.equal((await restoredMobile.service.list(scope)).filter(r => r.queueState === 'pending').length, 1); assert.equal((await restoredMobile.service.list({ ...scope, accountId: key() })).length, 0); for (const row of await restoredMobile.service.list(scope)) assert.equal(hash(await readFile(restoredMobile.files.uri(row.originalPath!))), row.sha256); } finally { restoredMobile.close(); }
  assert.equal(hash(await readFile(join(backup, 'manifest.json'))), manifestSha256); assert.equal(hash(await readFile(join(backup, 'database.dump'))), manifest.databaseSha256);
  evidence.recovery = { result: 'PASS technical restore; HOLD remains required', tables: Object.keys(originalInventory).length, files: Object.keys(JSON.parse(await readFile(join(backup, 'inventory.json'), 'utf8'))).length, backupAt, knownGapThrough: gapEnd, restoreAndVerificationMs: Date.now() - restoredAt, manifestSha256, missingDecisionRecorded: true, sourceMembershipRevocationRecorded: true, allRestoredSharesInvalidated: true, restoredSessions: 0, holdSurvivesRestart: true, privatePendingJobsResumed: true, immutablePartialPublicationReused: true, nativeSQLite: 5, nativePending: 1, nativeAnswers: ['pending', 'conflict'], automaticReopening: false };
  evidence.durationMs = Date.now() - started; evidence.peakMainProcessRssBytes = process.resourceUsage().maxRSS * 1024;
  await writeFile(join(root, 'recovery-validation.json'), JSON.stringify(evidence, null, 2), { mode: 0o600 });
  console.log('PASS current-schema dump/archive restore, every table/owner/hash; pre/post-backup authority and decision gap held closed across restart; immutable jobs and SQLite pending originals recovered');
} finally { if (!mobileClosed) mobile.close(); await app.close(); await restoredApp?.close(); await source.end(); if (!destClosed) await dest.end(); if (!runtimeClosed) await runtime.end(); }
