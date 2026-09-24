import {join} from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,stat,open} from 'node:fs/promises';
import pg from 'pg';
import sharp from 'sharp';
import {createApp} from '../apps/api/src/app';
import {migrate} from '../packages/db/src/migrate';
import {seed} from '../packages/db/src/seed';
import {readServerConfig} from '../packages/config/src/server';
import {createApi,ApiError,type Scope,type CompositionInput} from '../packages/contracts/src/index';
import {MediaFiles,createMediaJobs} from '../packages/platform/src/media';
import {createReportJobs,ReportFiles} from '../packages/platform/src/reports';
import {digest} from '../packages/platform/src/reports/service';
const env:NodeJS.ProcessEnv={...process.env,NODE_ENV:'test',DATABASE_URL:process.env.TEST_DATABASE_URL,MIGRATION_DATABASE_URL:process.env.TEST_MIGRATION_DATABASE_URL};
if(process.env.TASK07_ISOLATED!=='true'||!env.DATABASE_URL||!env.MIGRATION_DATABASE_URL||!['localhost','127.0.0.1'].includes(new URL(env.DATABASE_URL).hostname)||!new URL(env.DATABASE_URL).pathname.endsWith('/handovertrack_test'))throw Error('Explicit isolated test database required');
await migrate(env.MIGRATION_DATABASE_URL);await seed(env);
const config=readServerConfig(env),app=createApp(config,false),address=await app.listen({host:'127.0.0.1',port:0});
const admin=new pg.Pool({connectionString:env.MIGRATION_DATABASE_URL}),runtime=new pg.Pool({connectionString:env.DATABASE_URL});
const files=new MediaFiles(config.MEDIA_ROOT,0),rfiles=new ReportFiles(config.MEDIA_ROOT,0),images=createMediaJobs(runtime,files),jobs=createReportJobs(runtime,rfiles,config.MEDIA_ROOT);
const output=process.env.REPORT_TEST_OUTPUT??'.local/task07';
const key=()=>randomUUID(),pass=(text:string)=>console.log('PASS '+text);
const input=(name:string)=>({name,description:'Task07 isolated report',address:'Local fixture',status:'active' as const});
async function login(email:string){const r=await fetch(address+'/api/auth/sign-in/email',{method:'POST',headers:{origin:config.WEB_ORIGIN,'content-type':'application/json'},body:JSON.stringify({email,password:env.SEED_PASSWORD})});assert.equal(r.status,200);const cookie=r.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');return {cookie,api:createApi({baseUrl:address,headers:{cookie,origin:config.WEB_ORIGIN}})};}
async function failure(p:Promise<unknown>,status:number,code?:string){await assert.rejects(p,(e:unknown)=>e instanceof ApiError&&e.status===status&&(!code||e.code===code));}
try{
 const {api:manager,cookie}=await login('manager.north@example.test'),{api:worker}=await login('worker.north@example.test'),{api:outsider}=await login('manager.south@example.test');
 const actor=(await manager.me()).accountId,workerId=(await worker.me()).accountId,org=key();
 await admin.query("INSERT INTO organizations(id,name) VALUES($1,'Task07 proof fixture')",[org]);await admin.query("INSERT INTO memberships(organization_id,account_id,role) VALUES($1,$2,'manager'),($1,$3,'field_worker')",[org,actor,workerId]);
 const scope:Scope={accountId:actor,organizationId:org};const p=await manager.createProject(scope,input('Completion — Željko / Καλημέρα / Проверено'),key()),other=await manager.createProject(scope,input('Other project'),key());await manager.setAssignment(scope,p.id,workerId,{active:true,baseVersion:0},key());
 const ws={...scope,accountId:workerId};
 const jpeg=await sharp(Buffer.from('<svg width="900" height="600"><rect width="900" height="600" fill="#d6e9eb"/><rect x="40" y="40" width="400" height="200" fill="#1d625c"/><text x="70" y="145" font-size="48" fill="white">TOP • BEFORE</text><circle cx="700" cy="420" r="95" fill="#e14926"/></svg>')).jpeg().withMetadata({orientation:6}).toBuffer();
 const jpegAfter=await sharp({create:{width:600,height:900,channels:3,background:'#98bfc7'}}).composite([{input:Buffer.from('<svg width="600" height="900"><rect x="60" y="90" width="420" height="450" fill="#174e4b"/><text x="80" y="200" font-size="45" fill="white">AFTER</text></svg>')}]).jpeg().toBuffer();
 async function photo(project:string,data:Buffer,accepted=true){const id=key(),meta=await sharp(data).metadata(),dim=meta.autoOrient!;const up=await manager.createUpload(scope,project,{accountId:actor,mediaId:id,size:data.length,sha256:createHash('sha256').update(data).digest('hex'),width:dim.width,height:dim.height,mime:'image/jpeg',capturedAt:'2026-09-23T08:00:00.000Z'});if(accepted){const response=await fetch(`${address}/media/organizations/${org}/uploads/${up.uploadId}/content`,{method:'PUT',headers:{cookie,origin:config.WEB_ORIGIN,'content-type':'image/jpeg'},body:new Uint8Array(data)});assert.equal(response.status,200);await manager.completeUpload(scope,up.uploadId);}return id;}
 const before=await photo(p.id,jpeg),after=await photo(p.id,jpegAfter),foreign=await photo(other.id,jpeg),pending=await photo(p.id,jpeg,false);
 const long='Detailed inspection: joints checked, seal continuous, edges dry. Željko — façade, Καλημέρα, Проверено. ';
 const questions=Array.from({length:12},(_,i)=>({id:key(),label:`${i+1}. Final inspection and workmanship ${i===0?long.repeat(2):''}`,required:true,minPhotos:i===0?1:0}));
 const template=await manager.publishChecklistTemplate(scope,{id:key(),baseVersion:0,title:'Long completion checklist',questions},key());const run=(await manager.checklistCommand(scope,p.id,{kind:'start',id:key(),templateId:template.id,templateVersion:1,baseVersion:1},key())).run;
 for(const [i,q]of questions.entries())await manager.checklistCommand(scope,p.id,{kind:'answer',runId:run.id,questionId:q.id,text:long.repeat(i===0?25:5),mediaIds:i===0?[before]:[],baseVersion:0},key());
 const current=(await manager.checklist(scope,p.id)).run!;
 const composition:CompositionInput={baseVersion:0,notes:[{id:key(),text:'VISIBLE_NOTE_START\n'+long.repeat(70)+'\nVISIBLE_NOTE_END <script>alert(1)</script> http://127.0.0.1:9/private file:///etc/passwd',visibility:'report'},{id:key(),text:'INTERNAL_SECRET_NEVER_IN_REPORT',visibility:'internal'}],annotations:[{mediaId:before,marks:[{x:.1,y:.1,width:.45,height:.3,label:'Seal inspected — upper zone'},{x:.55,y:.65,width:.25,height:.2,label:'Retained detail'}]}],pairs:[{id:key(),beforeId:before,afterId:after,caption:'Before and after — corrected seal. '+long}]};
 const skey=key(),saved=await manager.saveProof(scope,p.id,composition,skey);assert.equal(saved.version,1);assert.deepEqual(await manager.saveProof(scope,p.id,composition,skey),saved);
 for(const bad of [foreign,pending,key()])await failure(manager.saveProof(scope,p.id,{...composition,baseVersion:1,pairs:[{...composition.pairs[0]!,beforeId:bad}]},key()),422);
 await failure(manager.saveProof(scope,p.id,{...composition,baseVersion:1,pairs:[{...composition.pairs[0]!,afterId:before}]},key()),400);
 await failure(manager.saveProof(scope,p.id,{...composition,baseVersion:1,annotations:[{mediaId:before,marks:[{x:.9,y:0,width:.5,height:1,label:'bad'}]}]},key()),400);
 for(const api of [worker,outsider]){await failure(api.proof(scope,p.id),404);await failure(api.saveProof(scope,p.id,composition,key()),404);}
 await failure(createApi({baseUrl:address}).proof(scope,p.id),401);
 pass('versioned composition, idempotent replay, normalized geometry, accepted same-project pair validation and manager authorization');
 const request={projectVersion:1,checklistVersion:current.version,compositionVersion:1,mediaIds:[before,after]};await failure(manager.requestReport(scope,p.id,request,key()),422,'COMPLETION_REQUIRED');
 await manager.checklistCommand(scope,p.id,{kind:'complete',runId:run.id,baseVersion:1},key());request.projectVersion=2;
 await failure(manager.requestReport(scope,p.id,request,key()),422,'MEDIA_NOT_READY');
 let imageJob;while((imageJob=await images.claim(key())))await images.process(imageJob);
 const mediaHash=createHash('sha256').update(await readFile(await files.path(before,'original.jpg'))).digest('hex');assert.equal(mediaHash,createHash('sha256').update(jpeg).digest('hex'));
 for(const ids of [[after],[before,after,foreign],[before,after,pending],[before,after,key()],[before,before]])await failure(manager.requestReport(scope,p.id,{...request,mediaIds:ids},key()),ids[1]===before?400:422);
 // Simulate a preserved pre-005 complete row without requirements; never bypass an application path.
 await admin.query('ALTER TABLE projects DISABLE TRIGGER project_completion');let legacy:string;
 try{legacy=key();await admin.query("INSERT INTO projects(id,organization_id,name,description,address,status) VALUES($1,$2,'legacy','','','complete')",[legacy,org]);}finally{await admin.query('ALTER TABLE projects ENABLE TRIGGER project_completion');}
 await failure(manager.requestReport(scope,legacy!,{...request,projectVersion:1,checklistVersion:1,compositionVersion:0,mediaIds:[]},key()),422,'COMPLETION_REQUIRED');
 // Tamper fixture answers while already-complete, proving the predicate is re-evaluated after version checks.
 await admin.query("UPDATE checklist_runs SET answers='[]' WHERE organization_id=$1 AND project_id=$2",[org,p.id]);await failure(manager.requestReport(scope,p.id,request,key()),422,'COMPLETION_REQUIRED');await admin.query('UPDATE checklist_runs SET answers=$3 WHERE organization_id=$1 AND project_id=$2',[org,p.id,JSON.stringify(current.answers)]);
 pass('active and invalid legacy/current completion rejected; pending, missing, duplicate and foreign evidence cannot enter snapshot');
 const requestKey=key();
 await admin.query("CREATE FUNCTION task07_fail_request() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='report.request' THEN RAISE EXCEPTION 'request audit fault'; END IF; RETURN NEW; END $$");await admin.query('CREATE TRIGGER task07_fail_request BEFORE INSERT ON audit_records FOR EACH ROW EXECUTE FUNCTION task07_fail_request()');
 try{await failure(manager.requestReport(scope,p.id,request,requestKey),500);assert.equal((await admin.query('SELECT count(*)::int n FROM report_snapshots WHERE organization_id=$1',[org])).rows[0].n,0);assert.equal((await admin.query("SELECT count(*)::int n FROM command_receipts WHERE organization_id=$1 AND operation='report.request'",[org])).rows[0].n,0);}finally{await admin.query('DROP TRIGGER task07_fail_request ON audit_records');await admin.query('DROP FUNCTION task07_fail_request()');}
 pass('snapshot/job/request audit/command receipt roll back together on injected audit failure');
 const [report,twin]=await Promise.all([manager.requestReport(scope,p.id,request,requestKey),manager.requestReport(scope,p.id,request,requestKey)]);assert.deepEqual(report,twin);assert.deepEqual(await manager.requestReport(scope,p.id,request,requestKey),report);
 await failure(manager.requestReport(scope,p.id,{...request,mediaIds:[after,before]},requestKey),409,'IDEMPOTENCY_CONFLICT');
 const snap=(await admin.query('SELECT snapshot,snapshot_hash FROM report_snapshots WHERE id=$1',[report.id])).rows[0];assert.equal(digest(snap.snapshot),snap.snapshot_hash);assert(!JSON.stringify(snap.snapshot).includes('INTERNAL_SECRET'));assert.equal(snap.snapshot.evidence[0].variant.version,1);
 const claim=await jobs.claim(key());assert.equal(claim?.report_id,report.id);
 // Later notes, annotations, pairs, answers and project edits must not alter rendering input.
 const changed={...composition,baseVersion:1,notes:[{...composition.notes[0]!,text:'LATER_NOTE_NOT_IN_OLD_REPORT'}],annotations:[],pairs:[]};
 const concurrent=await Promise.allSettled([manager.saveProof(scope,p.id,changed,key()),manager.saveProof(scope,p.id,changed,key())]);assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);assert.equal(concurrent.filter(r=>r.status==='rejected'&&r.reason.status===409).length,1);
 await manager.updateProject(scope,p.id,{...input('LATER_PROJECT_NAME'),baseVersion:2},key());await manager.checklistCommand(scope,p.id,{kind:'answer',runId:run.id,questionId:questions[0]!.id,text:'LATER_ANSWER_NOT_IN_REPORT',mediaIds:[before],baseVersion:1},key());
 await failure(manager.requestReport(scope,p.id,request,key()),409,'VERSION_CONFLICT');
 await jobs.process(claim!);const ready=await manager.reportStatus(scope,p.id,report.id);assert.equal(ready.state,'ready');assert(ready.pages!>=8);
 assert.deepEqual((await admin.query('SELECT snapshot,snapshot_hash FROM report_snapshots WHERE id=$1',[report.id])).rows[0],snap);
 const pdfURL=`${address}/v1/organizations/${org}/projects/${p.id}/reports/${report.id}/pdf`;const downloaded=await fetch(pdfURL,{headers:{cookie}});assert.equal(downloaded.status,200);assert.equal(downloaded.headers.get('cache-control'),'private, no-store');const pdf=Buffer.from(await downloaded.arrayBuffer());assert.equal(createHash('sha256').update(pdf).digest('hex'),ready.sha256);assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
 await mkdir(join(output,'pdfs'),{recursive:true});await writeFile(join(output,'pdfs/representative.pdf'),pdf);await writeFile(join(output,'fixture.json'),JSON.stringify({scope,projectId:p.id,reportId:report.id,report:ready,before,after,mediaRoot:config.MEDIA_ROOT},null,2));
 for(const api of [worker,outsider]){await failure(api.reportStatus(scope,p.id,report.id),404);await failure(api.requestReport(scope,p.id,request,requestKey),404);await failure(api.retryReport(scope,p.id,report.id,key()),404);}
 assert.equal((await fetch(pdfURL)).status,401);const {cookie:wc}=await login('worker.north@example.test');assert.equal((await fetch(pdfURL,{headers:{cookie:wc}})).status,404);
 await admin.query('DELETE FROM memberships WHERE organization_id=$1 AND account_id=$2',[org,actor]);await failure(manager.requestReport(scope,p.id,request,requestKey),404);assert.equal((await fetch(pdfURL,{headers:{cookie}})).status,404);await admin.query("INSERT INTO memberships(organization_id,account_id,role) VALUES($1,$2,'manager')",[org,actor]);
 for(const table of ['proof_compositions','report_snapshots','report_artifacts'])await assert.rejects(runtime.query(`UPDATE ${table} SET ${table==='proof_compositions'?'version=version':table==='report_snapshots'?'revision=revision':'pages=pages'}`),{code:'42501'});
 await assert.rejects(runtime.query("UPDATE report_jobs SET state='pending' WHERE report_id=$1",[report.id]),/immutable report publication/);
 pass('lost response and duplicate request produce one snapshot/job; concurrent edits stay out of frozen PDF; current authorization on status, replay and private download; immutable DB permissions');
 // Fence a stale worker after a persisted claim has expired.
 await manager.updateProject(scope,p.id,{...input('Second report'),status:'complete',baseVersion:3},key());const latestRun=(await manager.checklist(scope,p.id)).run!;const next={...request,projectVersion:4,checklistVersion:latestRun.version,compositionVersion:2};
 const second=await manager.requestReport(scope,p.id,next,key()),stale=await jobs.claim(key());assert.equal(stale?.report_id,second.id);
 await admin.query("UPDATE report_jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE report_id=$1",[second.id]);const currentLease=await jobs.claim(key());assert(currentLease!.lease_token>stale!.lease_token);assert.equal(await jobs.renew(stale!),false);await assert.rejects(jobs.process(stale!),/STALE_LEASE/);assert.equal(await rfiles.exists(await rfiles.artifact(second.id)),false);
 // A real transactional fault AFTER link publication, BEFORE artifact/ready commit.
 await admin.query("CREATE FUNCTION task07_fail_publication() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'publication crash injection'; END $$");await admin.query('CREATE TRIGGER task07_fail_publication BEFORE INSERT ON report_artifacts FOR EACH ROW EXECUTE FUNCTION task07_fail_publication()');
 try{await assert.rejects(jobs.process(currentLease!),/publication crash injection/);}finally{await admin.query('DROP TRIGGER task07_fail_publication ON report_artifacts');await admin.query('DROP FUNCTION task07_fail_publication()');}
 const partial=await readFile(await rfiles.artifact(second.id)),inode=(await stat(await rfiles.artifact(second.id))).ino;assert.equal((await manager.reportStatus(scope,p.id,second.id)).state,'running');
 await admin.query("UPDATE report_jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE report_id=$1",[second.id]);const recovered=await jobs.claim(key());await jobs.process(recovered!);assert.deepEqual(await readFile(await rfiles.artifact(second.id)),partial);assert.equal((await stat(await rfiles.artifact(second.id))).ino,inode);
 pass('expired lease cannot publish; crash after no-replace file link rolls back receipt/state; fresh worker reuses identical artifact and inode');
 // Asset corruption is recoverable but can never change the frozen expected hash.
 const third=await manager.requestReport(scope,p.id,next,key()),thirdJob=await jobs.claim(key());const variant=await files.path(before,'v1-report.webp'),originalVariant=await readFile(variant);const h=await open(variant,'r+');try{await h.write(Buffer.from('BAD'),0,3,0);await h.sync();}finally{await h.close();}
 try{await assert.rejects(jobs.process(thirdJob!),/RENDER_FAILED/);}finally{await writeFile(variant,originalVariant);}
 await jobs.fail(thirdJob!);assert.equal(await rfiles.exists(await rfiles.artifact(third.id)),false);
 await admin.query("UPDATE report_jobs SET state='failed',error='RENDER_FAILED',lease_until=NULL WHERE report_id=$1",[third.id]);const retryKey=key();assert.equal((await manager.retryReport(scope,p.id,third.id,retryKey)).state,'pending');await manager.retryReport(scope,p.id,third.id,retryKey);const redrive=await jobs.claim(key());await jobs.process(redrive!);
 assert.equal((await manager.reportStatus(scope,p.id,third.id)).state,'ready');assert.equal((await admin.query('SELECT count(*)::int n FROM report_artifacts WHERE report_id=$1',[third.id])).rows[0].n,1);
 pass('tampered derivative fails integrity, no substitute published; authorized idempotent redrive preserves snapshot and produces one artifact');
 const effects=(await admin.query("SELECT (SELECT count(*)::int FROM report_snapshots WHERE organization_id=$1) snapshots,(SELECT count(*)::int FROM audit_records WHERE organization_id=$1 AND action='report.request') requested,(SELECT count(*)::int FROM audit_records WHERE organization_id=$1 AND action='report.ready') ready",[org])).rows[0];assert.deepEqual(effects,{snapshots:3,requested:3,ready:3});
 const cursor=(await worker.bootstrap(ws)).cursor;await manager.saveProof(scope,p.id,{...changed,baseVersion:2},key());const page=await worker.pull(ws,cursor);assert(!JSON.stringify(page).includes('LATER_NOTE'));assert(!JSON.stringify(page).includes('INTERNAL_SECRET'));assert(page.changes.every(c=>c.entity==='project'));
 // Reproduce the native no-store cache buster uncovered interactively.
 const nativePull=await fetch(`${address}/v1/organizations/${org}/sync/pull?cursor=${encodeURIComponent(cursor)}&limit=100&_=1790160963336`,{headers:{cookie:wc}});assert.equal(nativePull.status,200);
 pass('report request/ready audit and compatible sync publication are atomic; private composition excluded from mobile feed; native cache-buster regression');
 console.log('Representative PDF: '+join(output,'pdfs/representative.pdf'));
}finally{await runtime.end();await admin.end();await app.close();}
