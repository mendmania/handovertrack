import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { realpath, mkdtemp, mkdir, writeFile, readFile, stat, symlink, rm, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import pg from 'pg';
import sharp from 'sharp';
import { QueryClient } from '@tanstack/react-query';
import { createApp } from '../apps/api/src/app';
import { readServerConfig } from '../packages/config/src/server';
import { migrate } from '../packages/db/src/migrate';
import { seed, fixtures } from '../packages/db/src/seed';
import { createApi, ApiError, type Upload } from '../packages/contracts/src/index';
import { createMediaJobs, MediaFiles, sweepMediaScratch, redriveMediaJob } from '../packages/platform/src/media';
import { UploadExecutor, type UploadTransport } from '../apps/mobile/src/media/upload';
import { captureFixture } from './media-fixture';

const root = await realpath(await mkdtemp(join(tmpdir(),'handovertrack-task04-')));
const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV:'test', DATABASE_URL:process.env.TEST_DATABASE_URL, MIGRATION_DATABASE_URL:process.env.TEST_MIGRATION_DATABASE_URL, MEDIA_ROOT:join(root,'server'), MEDIA_RESERVE_BYTES:'0', WORKER_POLL_MS:'100', WORKER_LEASE_MS:'1000' };
if (!env.DATABASE_URL || !env.MIGRATION_DATABASE_URL || new URL(env.DATABASE_URL).pathname !== '/handovertrack_test') throw new Error('Dedicated test database required');
await migrate(env.MIGRATION_DATABASE_URL); await migrate(env.MIGRATION_DATABASE_URL); await seed(env);
const config = readServerConfig(env); const app = createApp(config,false); const address = await app.listen({ host:'127.0.0.1',port:0 });
const admin = new pg.Pool({ connectionString:env.MIGRATION_DATABASE_URL }); const runtime = new pg.Pool({ connectionString:env.DATABASE_URL });
const local = await captureFixture(root); const files = new MediaFiles(config.MEDIA_ROOT,0); const jobs = createMediaJobs(runtime,files,1000);
const projectId = randomUUID(); let worker: ChildProcess | undefined;
const ids: string[] = [];
const check = (name: string) => console.log('PASS '+name);
async function login(email: string) {
  const response = await fetch(address+'/api/auth/sign-in/email',{ method:'POST',headers:{ 'content-type':'application/json',origin:config.WEB_ORIGIN },body:JSON.stringify({ email,password:env.SEED_PASSWORD }) });
  assert.equal(response.status,200); return response.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
}
async function req(path: string,cookie: string,init: RequestInit = {}) {
  return fetch(address+path,{ ...init,headers:{ cookie,origin:config.WEB_ORIGIN,...init.headers } });
}
const contentPath = (uploadId: string) => `/media/organizations/${fixtures.orgA}/uploads/${uploadId}/content`;
async function waitFor(test: () => Promise<boolean>, message: string, timeout = 30000) {
  const until = Date.now()+timeout;
  while (Date.now()<until) { if (await test()) return; await new Promise((r) => setTimeout(r,50)); }
  throw new Error(message);
}
async function stopWorker(signal: NodeJS.Signals) {
  if (!worker) return; const owned = worker; worker = undefined;
  const exited = new Promise((done) => owned.once('exit',done)); owned.kill(signal); await exited;
}
function startWorker() {
  worker = spawn(process.execPath,['apps/worker/dist/main.js'],{ env,stdio:['ignore','pipe','pipe'] });
  let log = '';
  worker.stdout!.on('data',(chunk) => { log += String(chunk); });
  worker.stderr!.on('data',() => {});
  return () => log;
}
try {
  const cookie = await login('worker.north@example.test'); const managerCookie = await login('manager.north@example.test'); const other = await login('manager.south@example.test');
  const api = createApi({ baseUrl:address,headers:{ cookie,origin:config.WEB_ORIGIN } }); const me = await api.me();
  const scope = { accountId:me.accountId,organizationId:fixtures.orgA };
  await admin.query("INSERT INTO projects(organization_id,id,name,description,address) VALUES($1,$2,'Task04 isolated twenty-photo fixture','','')",[fixtures.orgA,projectId]);
  await admin.query('INSERT INTO assignments(organization_id,project_id,account_id) VALUES($1,$2,$3)',[fixtures.orgA,projectId,scope.accountId]);
  const snapshot = await api.bootstrap(scope); await local.store.bootstrap(scope,snapshot,() => {});
  // Offline capture: no network method is called while generating these fixtures.
  for (let i=0;i<20;i++) {
    const bytes = await sharp({ create:{ width:96+i,height:80,channels:3,background:{ r:i*11,g:100,b:190 } } }).jpeg().toBuffer();
    const source = join(root,`camera-fixture-${i}.jpg`); await writeFile(source,bytes);
    const ticket = await local.service.reserve(scope,projectId,() => {}); ids.push(ticket.id);
    await local.service.save(ticket,source,{ width:96+i,height:80 });
  }
  const before = await local.service.list(scope); assert.equal(before.length,20);
  const query = new QueryClient(); await query.fetchQuery({ queryKey:['fixture'],queryFn:() => local.service.list(scope) }); query.clear();
  await local.reopen(); await local.service.reconcile(); assert.deepEqual(await local.service.list(scope),before);
  check('AUTOMATED twenty generated JPEG captures survive SQLite/file reopen and Query loss (not physical camera evidence)');
  let loseCompletion = true; let interrupt = true; let contentCalls = 0;
  const transport: UploadTransport = { api:{ ...api, async completeUpload(...args) {
    const result = await api.completeUpload(...args);
    if (loseCompletion) { loseCompletion = false; throw new Error('Injected lost completion response after server commit'); }
    return result;
  } }, async content(row,uploadId,signal,progress) {
    contentCalls++; const bytes = await readFile(local.files.uri(row.originalPath!));
    if (interrupt) {
      interrupt = false;
      await new Promise<void>((resolve) => {
        const r = httpRequest(address+contentPath(uploadId),{ method:'PUT',headers:{ cookie,origin:config.WEB_ORIGIN,'content-type':'image/jpeg','content-length':bytes.length } });
        r.on('error',() => resolve()); r.write(bytes.subarray(0,20)); setTimeout(() => { r.destroy(); resolve(); },50);
      });
      throw new Error('Injected connection loss during upload');
    }
    const response = await req(contentPath(uploadId),cookie,{ method:'PUT',headers:{ 'content-type':'image/jpeg','content-length':String(bytes.length) },body:bytes,signal });
    const value = await response.json() as Upload & { code?: string };
    if (!response.ok) throw new ApiError(response.status,value.code ?? 'UPLOAD_FAILED');
    progress(bytes.length); return value;
  } };
  await new UploadExecutor(local.service,async () => {}).run(scope,transport,new AbortController().signal,() => {});
  assert.equal((await admin.query("SELECT count(*)::int AS n FROM media_uploads WHERE project_id=$1 AND state='accepted'",[projectId])).rows[0].n,19);
  await local.reopen(); await local.service.reconcile();
  local.db().exec('UPDATE media_queue SET next_attempt_at=0');
  await new UploadExecutor(local.service,async () => {}).run(scope,transport,new AbortController().signal,() => {});
  assert.equal((await local.service.list(scope)).filter((r) => r.queueState === 'server_accepted').length,20);
  const calls = contentCalls; await local.reopen(); await local.service.reconcile();
  await new UploadExecutor(local.service,async () => {}).run(scope,transport,new AbortController().signal,() => {});
  assert.equal(contentCalls,calls,'Completed work must not upload again after restart');
  check('interrupted streaming + lost committed completion reply + mobile restart yield exactly twenty accepted assets, no completed requeue');
  const first = (await local.service.list(scope))[0]!; const uploadId = first.uploadId!;
  const inode = (await stat(await files.path(first.id,'original.jpg'))).ino;
  const replay = await Promise.all(Array.from({ length:8 },() => req(`/v1/organizations/${scope.organizationId}/uploads/${uploadId}/complete`,cookie,{ method:'POST' })));
  assert(replay.every((r) => [200,409].includes(r.status)));
  assert.equal((await stat(await files.path(first.id,'original.jpg'))).ino,inode);
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM media_jobs WHERE media_id=ANY($1::uuid[])',[ids])).rows[0].n,20);
  await assert.rejects(runtime.query("UPDATE media_uploads SET sha256=repeat('0',64) WHERE id=$1",[first.id]),/immutable/);
  await assert.rejects(runtime.query('DELETE FROM media_uploads WHERE id=$1',[first.id]),{ code:'42501' });
  check('concurrent completion replays preserve inode, immutable metadata and exactly one transactional job per asset');
  const mediaPath = `/v1/organizations/${scope.organizationId}/projects/${projectId}/media`;
  for (const denied of ['',cookie,other]) assert.equal((await req(mediaPath,denied)).status,denied ? 404 : 401);
  for (const denied of ['',cookie,other]) assert.equal((await req(`/media/organizations/${scope.organizationId}/assets/${first.id}/original`,denied)).status,denied ? 404 : 401);
  assert.equal((await req(`/v1/organizations/${scope.organizationId}/uploads/${uploadId}`,other)).status,404);
  await admin.query('UPDATE assignments SET active=false WHERE organization_id=$1 AND project_id=$2 AND account_id=$3',[scope.organizationId,projectId,scope.accountId]);
  assert.equal((await req(`/v1/organizations/${scope.organizationId}/uploads/${uploadId}/complete`,cookie,{ method:'POST' })).status,404);
  await local.store.bootstrap(scope,{ ...snapshot,projects:snapshot.projects.filter((p) => p.id!==projectId),assignments:snapshot.assignments.filter((a) => a.projectId!==projectId) },() => {});
  assert((await local.service.list(scope)).every((r) => !r.projectAvailable));
  await local.store.removeAccount(scope.accountId);
  assert.equal((await local.service.list({ ...scope,accountId:randomUUID() })).length,0);
  for (const row of before) assert(await local.files.exists(row.originalPath!));
  assert.equal(local.db().prepare("SELECT count(*) AS n FROM media_queue WHERE state='server_accepted'").get()!.n,20);
  await admin.query('UPDATE assignments SET active=true WHERE organization_id=$1 AND project_id=$2 AND account_id=$3',[scope.organizationId,projectId,scope.accountId]);
  await local.store.bootstrap(scope,snapshot,() => {});
  check('current tenant/manager/read/replay authorization; assignment revocation, logout and foreign scope preserve local originals/receipts');
  // Stale worker cannot publish after another owner reclaimed its expired lease.
  const oldJob = (await jobs.claim(randomUUID()))!;
  await admin.query("UPDATE media_jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE media_id=$1",[oldJob.media_id]);
  const newJob = (await jobs.claim(randomUUID()))!; assert.equal(newJob.media_id,oldJob.media_id); assert(newJob.lease_token > oldJob.lease_token);
  assert.equal(await jobs.renew(oldJob),false);
  await assert.rejects(jobs.process(oldJob),/STALE_LEASE/);
  await jobs.process(newJob);
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM media_variants WHERE media_id=$1',[newJob.media_id])).rows[0].n,3);
  check('expired lease reclaimed with increasing fence token; stale renewal/completion cannot publish');
  const firstLog = startWorker();
  await waitFor(async () => firstLog().includes('"event":"claimed"'),'worker failed to claim');
  await stopWorker('SIGKILL'); const secondLog = startWorker();
  await waitFor(async () => (await admin.query("SELECT count(*)::int AS n FROM media_jobs WHERE media_id=ANY($1::uuid[]) AND state='ready'",[ids])).rows[0].n===20,'worker did not finish twenty assets');
  await stopWorker('SIGTERM');
  assert(secondLog().includes('"event":"stopped"'));
  const gallery = await (await req(mediaPath,managerCookie)).json();
  assert.equal(gallery.media.length,20); assert(gallery.media.every((r: { processing: string }) => r.processing==='ready'));
  for (const row of before) {
    await files.verify(await files.path(row.id,'original.jpg'),{ size:row.size!,sha256:row.sha256!,width:row.width!,height:row.height! });
    for (const variant of ['thumb','preview','report']) {
      const response = await req(`/media/organizations/${scope.organizationId}/assets/${row.id}/${variant}`,managerCookie); assert.equal(response.status,200);
      assert.equal(response.headers.get('cache-control'),'private, no-store');
      const bytes = Buffer.from(await response.arrayBuffer()); const meta = await sharp(bytes).metadata();
      assert.equal(meta.format,'webp'); assert(!meta.exif); assert(!meta.xmp);
      const expected = (await admin.query('SELECT sha256 FROM media_variants WHERE media_id=$1 AND name=$2',[row.id,variant])).rows[0];
      assert.equal(createHash('sha256').update(bytes).digest('hex'),expected.sha256);
    }
  }
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM media_events WHERE media_id=ANY($1::uuid[])',[ids])).rows[0].n,40);
  check('actual compiled worker SIGKILL/restart/SIGTERM: twenty gallery assets, twenty verified originals, sixty valid private derivatives, forty unique events');
  // Independent negative fixtures stay outside the twenty logical capture assets.
  const negativeId = randomUUID(); ids.push(negativeId);
  const good = await readFile(local.files.uri(first.originalPath!));
  const input = { accountId:scope.accountId,mediaId:negativeId,mime:'image/jpeg' as const,capturedAt:new Date().toISOString(),size:good.length,sha256:first.sha256!,width:first.width!,height:first.height! };
  const negative = await api.createUpload(scope,projectId,input);
  await assert.rejects(api.createUpload(scope,projectId,{ ...input,width:input.width+1 }),/IDEMPOTENCY_CONFLICT/);
  await assert.rejects(api.createUpload(scope,projectId,{ ...input,accountId:randomUUID() }),{ code:'NOT_FOUND' });
  const bad = Buffer.alloc(good.length,1);
  assert.equal((await req(contentPath(negative.uploadId),cookie,{ method:'PUT',headers:{ 'content-type':'image/jpeg' },body:bad })).status,422);
  await assert.rejects(api.completeUpload(scope,negative.uploadId),/UPLOAD_INCOMPLETE/);
  const oversized = await new Promise<number>((resolve,reject) => {
    const request = httpRequest(address+contentPath(negative.uploadId),{ method:'PUT',headers:{ cookie,origin:config.WEB_ORIGIN,'content-type':'image/jpeg','content-length':String(50*1024*1024+1) } },(response) => { response.resume(); resolve(response.statusCode!); request.destroy(); });
    request.on('error',reject); request.flushHeaders();
  });
  assert.equal(oversized,400);
  await assert.rejects(files.path('../escape','original.jpg'),/INVALID_REQUEST/);
  const linkRoot = join(root,'link-root'); await mkdir(linkRoot); const symlinkFiles = new MediaFiles(linkRoot,0);
  await symlink(root,join(linkRoot,negativeId)); await assert.rejects(symlinkFiles.path(negativeId,'original.jpg'),/Unsafe/);
  await assert.rejects(new MediaFiles(config.MEDIA_ROOT,Number.MAX_SAFE_INTEGER).capacity(1),/STORAGE_FULL/);
  check('immutable input conflict, forged owner, corrupt bytes, oversize/path/symlink and disk-reserve denials cannot accept an original');
  // Valid declared checksum does not excuse a wrong signature or dimensions.
  for (const kind of ['signature','dimensions']) {
    const mediaId = randomUUID(); ids.push(mediaId);
    const bytes = kind === 'signature' ? bad : good;
    const invalid = await api.createUpload(scope,projectId,{ ...input,mediaId,sha256:createHash('sha256').update(bytes).digest('hex'),width:kind === 'dimensions' ? input.width+1 : input.width });
    assert.equal((await req(contentPath(invalid.uploadId),cookie,{ method:'PUT',headers:{ 'content-type':'image/jpeg' },body:bytes })).status,422);
  }
  // Hold one real HTTP body open while a concurrent writer and completion arrive.
  let held!: ReturnType<typeof httpRequest>;
  const streaming = new Promise<number>((resolve,reject) => {
    held = httpRequest(address+contentPath(negative.uploadId),{ method:'PUT',headers:{ cookie,origin:config.WEB_ORIGIN,'content-type':'image/jpeg','content-length':String(good.length) } },(response) => { response.resume(); resolve(response.statusCode!); });
    held.on('error',reject); held.write(good.subarray(0,10));
  });
  await new Promise((r) => setTimeout(r,80));
  assert.equal((await req(contentPath(negative.uploadId),cookie,{ method:'PUT',headers:{ 'content-type':'image/jpeg' },body:good })).status,409);
  assert.equal((await req(`/v1/organizations/${scope.organizationId}/uploads/${negative.uploadId}/complete`,cookie,{ method:'POST' })).status,409);
  held.end(good.subarray(10)); assert.equal(await streaming,200);
  // Simulate an API crash after durable original publication but before acceptance
  // commit via a failing database trigger, then remove only this owned fault.
  await admin.query(`CREATE FUNCTION task04_fail_accept() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.id='${negativeId}' AND NEW.state='accepted' THEN RAISE EXCEPTION 'injected commit failure'; END IF; RETURN NEW; END $$`);
  await admin.query('CREATE TRIGGER task04_fail_accept BEFORE UPDATE ON media_uploads FOR EACH ROW EXECUTE FUNCTION task04_fail_accept()');
  try { await assert.rejects(api.completeUpload(scope,negative.uploadId),{ status:500 }); }
  finally { await admin.query('DROP TRIGGER task04_fail_accept ON media_uploads'); await admin.query('DROP FUNCTION task04_fail_accept()'); }
  assert(await files.exists(await files.path(negativeId,'original.jpg')));
  assert.equal((await api.uploadStatus(scope,negative.uploadId)).state,'staged');
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM media_jobs WHERE media_id=$1',[negativeId])).rows[0].n,0);
  await api.completeUpload(scope,negative.uploadId); await api.completeUpload(scope,negative.uploadId);
  check('concurrent real HTTP writers fenced; signature/dimension verification and fs-before-DB crash recovery pass without duplicate publication');
  const failedJob = (await jobs.claim(randomUUID()))!;
  assert.equal(failedJob.media_id,negativeId);
  await jobs.fail(failedJob);
  for (let n=1;n<5;n++) {
    await admin.query("UPDATE media_jobs SET next_run_at=clock_timestamp() WHERE media_id=$1",[negativeId]);
    const attempt = (await jobs.claim(randomUUID()))!; await jobs.fail(attempt);
  }
  assert.equal((await admin.query('SELECT state,attempts FROM media_jobs WHERE media_id=$1',[negativeId])).rows[0].state,'failed');
  assert.equal(await jobs.claim(randomUUID()),undefined);
  check('bounded processing retries reach observable terminal failure; no unbounded retry loop');
  assert.equal(await redriveMediaJob(runtime,negativeId),true);
  const recoveryJob = (await jobs.claim(randomUUID()))!;
  await admin.query(`CREATE FUNCTION task04_fail_ready() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.media_id='${negativeId}' AND NEW.event='ready' THEN RAISE EXCEPTION 'injected ready commit failure'; END IF; RETURN NEW; END $$`);
  await admin.query('CREATE TRIGGER task04_fail_ready BEFORE INSERT ON media_events FOR EACH ROW EXECUTE FUNCTION task04_fail_ready()');
  try { await assert.rejects(jobs.process(recoveryJob),/injected ready commit failure/); }
  finally { await admin.query('DROP TRIGGER task04_fail_ready ON media_events'); await admin.query('DROP FUNCTION task04_fail_ready()'); }
  assert(await files.exists(await files.path(negativeId,'v1-thumb.webp')));
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM media_variants WHERE media_id=$1',[negativeId])).rows[0].n,0);
  await jobs.process(recoveryJob); assert.equal(await redriveMediaJob(runtime,negativeId),false);
  const scratch = await files.path(negativeId,`${randomUUID()}.part`); await writeFile(scratch,'abandoned-server-scratch');
  const old = new Date(Date.now()-2*86400000); await utimes(scratch,old,old);
  assert.equal(await sweepMediaScratch(runtime,files),1); assert.equal(await files.exists(scratch),false);
  await files.verify(await files.path(negativeId,'original.jpg'),{ size:input.size,sha256:input.sha256,width:input.width,height:input.height });
  check('explicit terminal redrive and derivative-file-before-DB recovery are idempotent; old server scratch cleanup preserves originals');
  console.log('RESULT: AUTOMATED FIXTURE PASS. Physical twenty-photo camera/device scenario: NOT RUN.');
} finally {
  await stopWorker('SIGKILL');
  local.close(); await app.close(); await runtime.end();
  if (ids.length) {
    await admin.query('DELETE FROM media_events WHERE media_id=ANY($1::uuid[])',[ids]);
    await admin.query('DELETE FROM media_variants WHERE media_id=ANY($1::uuid[])',[ids]);
    await admin.query('DELETE FROM media_jobs WHERE media_id=ANY($1::uuid[])',[ids]);
    await admin.query('DELETE FROM media_uploads WHERE id=ANY($1::uuid[])',[ids]);
  }
  await admin.query('DELETE FROM assignments WHERE project_id=$1',[projectId]); await admin.query('DELETE FROM projects WHERE id=$1',[projectId]);
  await admin.end(); await rm(root,{ recursive:true,force:true });
}
