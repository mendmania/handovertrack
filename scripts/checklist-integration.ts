import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {mkdtemp,readFile,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import pg from 'pg';
import sharp from 'sharp';
import {createApp} from '../apps/api/src/app';
import {migrate} from '../packages/db/src/migrate';
import {seed} from '../packages/db/src/seed';
import {readServerConfig} from '../packages/config/src/server';
import {createApi,ApiError,type ChecklistCommand,type Scope} from '../packages/contracts/src/index';
const env:NodeJS.ProcessEnv={...process.env,NODE_ENV:'test',DATABASE_URL:process.env.TEST_DATABASE_URL,MIGRATION_DATABASE_URL:process.env.TEST_MIGRATION_DATABASE_URL};
if(!env.DATABASE_URL || !env.MIGRATION_DATABASE_URL || !new URL(env.DATABASE_URL).pathname.endsWith('/handovertrack_test'))throw Error('Dedicated test database required');
await migrate(env.MIGRATION_DATABASE_URL);await migrate(env.MIGRATION_DATABASE_URL);await seed(env);
const mediaRoot=await realpath(await mkdtemp(join(tmpdir(),'handovertrack-checklist-media-')));
const config=readServerConfig({...env,MEDIA_ROOT:mediaRoot,MEDIA_RESERVE_BYTES:'0'});const app=createApp(config,false);const address=await app.listen({host:'127.0.0.1',port:0});
const admin=new pg.Client({connectionString:env.MIGRATION_DATABASE_URL});await admin.connect();const runtime=new pg.Client({connectionString:env.DATABASE_URL});await runtime.connect();
const key=()=>randomUUID();const check=(message:string)=>console.log('PASS '+message);
const input=(name:string)=>({name,description:'Task06 isolated test',address:'Fixture',status:'active' as const});
async function login(email:string,native=false){const response=await fetch(address+'/api/auth/sign-in/email',{method:'POST',headers:{origin:config.WEB_ORIGIN,'content-type':'application/json'},body:JSON.stringify({email,password:env.SEED_PASSWORD})});assert.equal(response.status,200);const cookie=response.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');return {cookie,api:createApi({baseUrl:address,headers:{cookie,...(native ? {'expo-origin':'handovertrack://'} : {origin:config.WEB_ORIGIN})}})};}
async function failure(promise:Promise<unknown>,status:number,code?:string){await assert.rejects(promise,(e:unknown)=>e instanceof ApiError && e.status===status && (!code || e.code===code));}
try{
 const {api:manager,cookie}=await login('manager.north@example.test');const {api:worker}=await login('worker.north@example.test',true);const {api:outside}=await login('manager.south@example.test');
 const org=key();const managerId=(await manager.me()).accountId,workerId=(await worker.me()).accountId;
 await admin.query("INSERT INTO organizations(id,name) VALUES($1,'Task06 isolated checklist fixture')",[org]);await admin.query("INSERT INTO memberships(organization_id,account_id,role) VALUES($1,$2,'manager'),($1,$3,'field_worker')",[org,managerId,workerId]);
 const scope:Scope={accountId:managerId,organizationId:org},ws={...scope,accountId:workerId};
 const p=await manager.createProject(scope,input('Checklist project'),key());const other=await manager.createProject(scope,input('Other project'),key());
 await manager.setAssignment(scope,p.id,workerId,{active:true,baseVersion:0},key());
 const templateId=key(),q=key(),optional=key();const draft={id:templateId,baseVersion:0,title:'Required proof',questions:[{id:q,label:'Work checked',required:true,minPhotos:1},{id:optional,label:'Optional',required:false,minPhotos:0}]};
 const templateKey=key();const initial=await manager.bootstrap(scope);
 const [t,twin]=await Promise.all([manager.publishChecklistTemplate(scope,draft,templateKey),manager.publishChecklistTemplate(scope,draft,templateKey)]);assert.deepEqual(t,twin);
 assert.deepEqual(await manager.publishChecklistTemplate(scope,draft,templateKey),t);await failure(manager.publishChecklistTemplate(scope,{...draft,title:'altered'},templateKey),409,'IDEMPOTENCY_CONFLICT');
 const start:ChecklistCommand={kind:'start',id:key(),templateId,templateVersion:1,baseVersion:p.version};const startKey=key();const run=(await manager.checklistCommand(scope,p.id,start,startKey)).run;
 assert.deepEqual((await manager.checklistCommand(scope,p.id,start,startKey)).run,run);
 await manager.publishChecklistTemplate(scope,{...draft,baseVersion:1,title:'New requirements',questions:[{id:key(),label:'New rule',required:true,minPhotos:10}]},key());
 assert.deepEqual((await manager.checklist(scope,p.id)).run?.questions,draft.questions);check('versioned templates, frozen runs, duplicate start/publication and changed-payload rejection');
 await failure(worker.publishChecklistTemplate(ws,draft,key()),404);await failure(outside.checklist(scope,p.id),404);await failure(worker.checklist(ws,other.id),404);await failure(worker.checklistTemplates(ws),404);
 await failure(worker.checklistCommand(ws,p.id,{kind:'complete',runId:run.id,baseVersion:1},key()),404);
 const hostile=await fetch(`${address}/v1/organizations/${org}/projects/${p.id}/checklist`,{method:'POST',headers:{cookie,origin:'https://attacker.invalid','content-type':'application/json','idempotency-key':key()},body:JSON.stringify(start)});assert.equal(hostile.status,403);
 const noSession=createApi({baseUrl:address});await failure(noSession.checklist(scope,p.id),401);
 check('manager/worker boundaries, same-project assignment, tenant denial, missing session and hostile Origin');
 const complete={kind:'complete' as const,runId:run.id,baseVersion:1};
 await failure(manager.createProject(scope,{...input('Bypass create'),status:'complete'},key()),422,'COMPLETION_REQUIRED');
 await failure(manager.updateProject(scope,p.id,{...input('Bypass update'),status:'complete',baseVersion:1},key()),422,'COMPLETION_REQUIRED');
 await failure(manager.updateProject(scope,other.id,{...input('No run'),status:'complete',baseVersion:1},key()),422,'COMPLETION_REQUIRED');
 await failure(manager.checklistCommand(scope,p.id,complete,key()),422,'COMPLETION_REQUIRED');
 await assert.rejects(runtime.query("UPDATE projects SET status='complete' WHERE organization_id=$1 AND id=$2",[org,p.id]),{code:'23514'});
 const answer=(text:string,baseVersion:number,mediaIds:string[]=[]):ChecklistCommand=>({kind:'answer',runId:run.id,questionId:q,text,baseVersion,mediaIds});
 await worker.checklistCommand(ws,p.id,answer('Work done',0),key());await failure(manager.checklistCommand(scope,p.id,complete,key()),422);
 check('create/update/explicit completion and direct status write reject no-run, missing answers and missing proof');
 const answerKey=key();const response=await worker.checklistCommand(ws,p.id,answer('Offline answer',1),answerKey); // Pretend caller lost this committed HTTP result.
 const effects=async()=> (await admin.query('SELECT (SELECT count(*)::int FROM audit_records WHERE organization_id=$1) audit,(SELECT count(*)::int FROM sync_changes WHERE organization_id=$1) feed,(SELECT count(*)::int FROM command_receipts WHERE organization_id=$1) receipts',[org])).rows[0];
 const before=await effects();const duplicates=await Promise.all([worker.checklistCommand(ws,p.id,answer('Offline answer',1),answerKey),worker.checklistCommand(ws,p.id,answer('Offline answer',1),answerKey)]);assert.deepEqual(duplicates,[response,response]);assert.deepEqual(await effects(),before);
 await failure(worker.checklistCommand(ws,p.id,answer('Altered payload',1),answerKey),409,'IDEMPOTENCY_CONFLICT');
 const atomicKey=key();const atomic:ChecklistCommand={kind:'answer',runId:run.id,questionId:optional,text:'Atomic',mediaIds:[],baseVersion:0};
 const beforeAtomic=await effects();const beforeRun=(await manager.checklist(scope,p.id)).run;
 await admin.query("CREATE FUNCTION task06_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='checklist.answer' THEN RAISE EXCEPTION 'injected audit fault'; END IF; RETURN NEW; END $$");
 await admin.query('CREATE TRIGGER task06_fail_audit BEFORE INSERT ON audit_records FOR EACH ROW EXECUTE FUNCTION task06_fail_audit()');
 try{await failure(worker.checklistCommand(ws,p.id,atomic,atomicKey),500);assert.deepEqual(await effects(),beforeAtomic);assert.deepEqual((await manager.checklist(scope,p.id)).run,beforeRun);}
 finally{await admin.query('DROP TRIGGER task06_fail_audit ON audit_records');await admin.query('DROP FUNCTION task06_fail_audit()');}
 assert.equal((await worker.checklistCommand(ws,p.id,atomic,atomicKey)).outcome,'applied');check('injected audit failure rolls back answer, revision, receipt and feed; unchanged command retries successfully');
 const wk=key(),mk=key();const concurrent=await Promise.all([worker.checklistCommand(ws,p.id,answer('Field edit',2),wk),manager.checklistCommand(scope,p.id,answer('Manager edit',2),mk)]);assert.deepEqual(concurrent.map(r=>r.outcome).sort(),['applied','conflict']);
 const conflict=concurrent.find(r=>r.outcome==='conflict')!;assert.equal(conflict.current?.version,3);const resolution=await worker.checklistCommand(ws,p.id,answer('Explicit merged answer',conflict.current!.version),key());assert.equal(resolution.outcome,'applied');
 const replayConflict=concurrent[0]!.outcome==='conflict' ? await worker.checklistCommand(ws,p.id,answer('Field edit',2),wk) : await manager.checklistCommand(scope,p.id,answer('Manager edit',2),mk);assert.deepEqual(replayConflict,conflict);
 check('lost committed response and duplicate delivery create one audit/feed/receipt; concurrent edits preserve stable conflict and explicit resolution');
 await manager.setAssignment(scope,p.id,workerId,{active:false,baseVersion:1},key());await failure(worker.checklistCommand(ws,p.id,answer('Offline answer',1),answerKey),404);
 await manager.setAssignment(scope,p.id,workerId,{active:true,baseVersion:2},key());await admin.query('DELETE FROM memberships WHERE organization_id=$1 AND account_id=$2',[org,workerId]);await failure(worker.checklistCommand(ws,p.id,answer('Offline answer',1),answerKey),404);
 await admin.query("INSERT INTO memberships(organization_id,account_id,role) VALUES($1,$2,'field_worker')",[org,workerId]);await manager.setAssignment(scope,p.id,workerId,{active:true,baseVersion:0},key());
 check('current authorization rechecked even for accepted-command replay after assignment or membership removal');
 const jpeg=await sharp({create:{width:32,height:24,channels:3,background:'#285944'}}).jpeg().toBuffer();const hash=createHash('sha256').update(jpeg).digest('hex');
 async function photo(client:typeof manager,s:Scope,projectId:string,accepted=true){const mediaId=key();const upload=await client.createUpload(s,projectId,{accountId:s.accountId,mediaId,size:jpeg.length,sha256:hash,width:32,height:24,mime:'image/jpeg',capturedAt:new Date().toISOString()});if(accepted){const user=s.accountId===workerId ? await login('worker.north@example.test',true) : {cookie};const put=await fetch(`${address}/media/organizations/${org}/uploads/${upload.uploadId}/content`,{method:'PUT',headers:{cookie:user.cookie,origin:config.WEB_ORIGIN,'content-type':'image/jpeg','content-length':String(jpeg.length)},body:jpeg});assert.equal(put.status,200);await client.completeUpload(s,upload.uploadId);}return mediaId;}
 const pending=await photo(worker,ws,p.id,false);const wrong=await photo(manager,scope,other.id);const managerOwned=await photo(manager,scope,p.id);const accepted=await photo(worker,ws,p.id);
 for(const mediaId of [pending,wrong,managerOwned,key()])await failure(worker.checklistCommand(ws,p.id,answer('Invalid proof',4,[mediaId]),key()),422);
 // A worker may retain already-authorized links from the current answer when explicitly adopting it.
 const priorProof:ChecklistCommand={kind:'answer',runId:run.id,questionId:optional,text:'Manager proof',mediaIds:[managerOwned],baseVersion:1};
 await manager.checklistCommand(scope,p.id,priorProof,key());
 assert.equal((await worker.checklistCommand(ws,p.id,{...priorProof,baseVersion:2},key())).outcome,'applied');
 const forged=await fetch(`${address}/v1/organizations/${org}/projects/${p.id}/checklist`,{method:'POST',headers:{cookie,origin:config.WEB_ORIGIN,'content-type':'application/json','idempotency-key':key()},body:JSON.stringify({...answer('Forged ready',4,[pending]),ready:true})});assert.equal(forged.status,400);
 await failure(worker.checklistCommand(ws,p.id,answer('Duplicate proof',4,[accepted,accepted]),key()),400);
 await worker.checklistCommand(ws,p.id,answer('   ',4,[accepted]),key());await failure(manager.checklistCommand(scope,p.id,complete,key()),422);
 await worker.checklistCommand(ws,p.id,answer('Verified complete',5,[accepted]),key());
 const completed=await manager.checklistCommand(scope,p.id,complete,key());assert.equal(completed.projectVersion,2);assert.equal((await manager.detail(scope,p.id)).status,'complete');
 await failure(worker.checklistCommand(ws,p.id,answer('Clear proof',6),key()),409,'PROJECT_COMPLETE');
 const reopened=await manager.updateProject(scope,p.id,{...input('Reopened'),baseVersion:2},key());assert.equal(reopened.version,3);
 const patchComplete=await manager.updateProject(scope,p.id,{...input('Valid update completion'),status:'complete',baseVersion:3},key());assert.equal(patchComplete.status,'complete');
 assert.equal(createHash('sha256').update(await readFile(join(mediaRoot,accepted,'original.jpg'))).digest('hex'),hash);
 check('pending/forged/duplicate/wrong-project/foreign-owner evidence rejected; accepted original plus nonblank answer permits BOTH completion paths; complete answers locked');
 const boot=await worker.bootstrap(ws);assert.equal(boot.checklists?.[0]?.id,run.id);assert.deepEqual(boot.templates,[]);const page=await manager.pull(scope,initial.cursor,undefined,100);assert(page.changes.some(c=>c.entity==='template'));assert(page.changes.some(c=>c.entity==='checklist'));const late=await worker.bootstrap(ws);await manager.setAssignment(scope,p.id,workerId,{active:false,baseVersion:1},key());const revoked=await worker.pull(ws,late.cursor);assert(revoked.changes.some(c=>c.entity==='project' && c.operation==='remove'));assert(!revoked.changes.some(c=>c.entity==='checklist'));
 await assert.rejects(runtime.query("UPDATE checklist_templates SET title='rewrite' WHERE organization_id=$1",[org]),{code:'42501'});await assert.rejects(runtime.query("UPDATE checklist_runs SET title='rewrite' WHERE organization_id=$1",[org]),/immutable/);
 const deltas=await effects();assert(deltas.feed>=deltas.audit);assert(deltas.receipts>deltas.audit);assert.equal((await admin.query("SELECT count(*)::int n FROM audit_records a LEFT JOIN sync_changes s ON s.organization_id=a.organization_id AND s.revision=a.revision WHERE a.organization_id=$1 AND a.action LIKE 'checklist.%' AND s.revision IS NULL",[org])).rows[0].n,0); // Recorded version conflict has no business mutation/event.
 check('authorized bootstrap/pull and revocation tombstone; immutable templates/requirements; transactional audit/feed cardinality');
 console.log('Retained isolated fixture media directory: '+mediaRoot);
}finally{await runtime.end();await admin.end();await app.close();}
