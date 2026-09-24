import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import pg from 'pg';
import {createApp} from '../apps/api/src/app';
import {readServerConfig} from '../packages/config/src/server';
import {createApi,ApiError,type DecisionInput,type CreatedShare} from '../packages/contracts/src/index';
import {createSharing} from '../packages/platform/src/sharing/service';
import {createReportJobs,ReportFiles} from '../packages/platform/src/reports';
if(process.env.TASK08_ISOLATED!=='true'||!process.env.TEST_DATABASE_URL||!['localhost','127.0.0.1'].includes(new URL(process.env.TEST_DATABASE_URL).hostname)||new URL(process.env.TEST_DATABASE_URL).pathname!=='/handovertrack_test')throw Error('Explicit isolated test database required');
const config=readServerConfig({...process.env,DATABASE_URL:process.env.TEST_DATABASE_URL}),app=createApp(config,true),address=await app.listen({host:'127.0.0.1',port:0});
const admin=new pg.Pool({connectionString:process.env.TEST_MIGRATION_DATABASE_URL}),runtime=new pg.Pool({connectionString:config.DATABASE_URL});
const output=process.env.REPORT_TEST_OUTPUT??'.local/task08',fixture=JSON.parse(await readFile(output+'/fixture.json','utf8'));
const {scope,projectId}=fixture;let reportId=fixture.reportId;const org=scope.organizationId,files=new ReportFiles(config.MEDIA_ROOT,0),jobs=createReportJobs(runtime,files,config.MEDIA_ROOT),sharing=createSharing(runtime,files,config.AUTH_SECRET);
const key=()=>randomUUID(),pass=(s:string)=>console.log('PASS '+s),tokens:string[]=[];
async function login(email:string){const r=await fetch(address+'/api/auth/sign-in/email',{method:'POST',headers:{origin:config.WEB_ORIGIN,'content-type':'application/json'},body:JSON.stringify({email,password:process.env.SEED_PASSWORD})});assert.equal(r.status,200);const cookie=r.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');return {cookie,api:createApi({baseUrl:address,headers:{cookie,origin:config.WEB_ORIGIN}})};}
async function failure(p:Promise<unknown>,status:number){await assert.rejects(p,(e:unknown)=>e instanceof ApiError&&e.status===status);}
const input=()=>({expiresAt:new Date(Date.now()+86400000).toISOString()});
async function guest(s:CreatedShare,suffix='',body?:DecisionInput,k=key(),extra:Record<string,string>={}){return fetch(`${address}/guest/v1/shares/${s.share.id}${suffix}`,{method:body?'POST':'GET',headers:{authorization:'Bearer '+s.token,origin:config.WEB_ORIGIN,...(body?{'content-type':'application/json','idempotency-key':k}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});}
const decision=(s:CreatedShare,kind:'accept'|'correction'='accept'):DecisionInput=>({reportId:s.share.report.reportId,sha256:s.share.report.sha256,kind,claimedName:'<script>Customer claim</script>',message:kind==='correction'?'Please correct the final seal.':'Accepted exact frozen revision.',confirmed:true});
try{
 const {api,cookie}=await login('manager.north@example.test'),{api:worker}=await login('worker.north@example.test'),{api:outside}=await login('manager.south@example.test');
 async function create(report=reportId,k=key(),body=input()){const s=await api.createShare(scope,projectId,report,body,k);if(s.token)tokens.push(s.token);return s;}
 async function newReport(){const p=await api.detail(scope,projectId),run=(await api.checklist(scope,projectId)).run!,comp=(await api.proof(scope,projectId)).composition;const r=await api.requestReport(scope,projectId,{projectVersion:p.version,checklistVersion:run.version,compositionVersion:comp.version,mediaIds:[fixture.before,fixture.after]},key());return r;}
 async function ready(){const r=await newReport(),job=await jobs.claim(key());assert.equal(job?.report_id,r.id);await jobs.process(job!);return r.id;}
 reportId=await ready();
 for(const unauthorized of [worker,outside]){await failure(unauthorized.sharing(scope,projectId,reportId),404);await failure(unauthorized.createShare(scope,projectId,reportId,input(),key()),404);}
 await failure(createApi({baseUrl:address}).sharing(scope,projectId,reportId),401);
 await failure(createApi({baseUrl:address,headers:{cookie,origin:'https://invalid.test'}}).createShare(scope,projectId,reportId,input(),key()),403);
 const pending=await newReport();await failure(create(pending.id),409);const job=await jobs.claim(key());await jobs.process(job!);
 await failure(create(reportId,key(),{expiresAt:new Date(Date.now()-1000).toISOString()}),400);
 await failure(create(reportId,key(),{expiresAt:new Date(Date.now()+31*86400000).toISOString()}),400);
 const frozen=input(),creationKey=key();const [first,duplicate]=await Promise.all([create(reportId,creationKey,frozen),create(reportId,creationKey,frozen)]);
 assert.equal(first.share.id,duplicate.share.id);assert.equal(Number(!!first.token)+Number(!!duplicate.token),1);
 const s=first.token?first:duplicate;for(const u of [worker,outside])await failure(u.revokeShare(scope,projectId,reportId,s.share.id,key()),404);assert.equal((await create(reportId,creationKey,frozen)).token,null);
 await failure(create(reportId,creationKey,input()),409);
 assert.equal((await admin.query('SELECT count(*)::int n FROM report_shares WHERE id=$1',[s.share.id])).rows[0].n,1);
 await admin.query("UPDATE memberships SET role='field_worker' WHERE organization_id=$1 AND account_id=$2",[org,scope.accountId]);
 try{await failure(create(reportId,creationKey,frozen),404);}finally{await admin.query("UPDATE memberships SET role='manager' WHERE organization_id=$1 AND account_id=$2",[org,scope.accountId]);}
 pass('manager scope/Origin, ready-only sharing, bounded expiry; concurrent/lost creation reply has one hash-only share; replay reauthorizes');
 const info=await guest(s);assert.equal(info.status,200);const dto=await info.json();assert.deepEqual(Object.keys(dto).sort(),['decision','share']);assert.deepEqual(Object.keys(dto.share.report).sort(),['createdAt','pages','reportId','revision','sha256','size','title']);assert.equal(JSON.stringify(dto).includes('INTERNAL_SECRET'),false);
 for(const path of ['', '/pdf','/decisions']){
  const r=await fetch(address+'/guest/v1/shares/'+s.share.id+path,{method:path==='/decisions'?'POST':'GET',headers:{cookie,origin:config.WEB_ORIGIN,'content-type':'application/json','idempotency-key':key()},...(path==='/decisions'?{body:JSON.stringify(decision(s))}:{})});assert.equal(r.status,404);
 }
 const wrong=await create(pending.id);assert.equal((await guest({...s,token:wrong.token})).status,404);
 const pdf=await guest(s,'/pdf',undefined,undefined,{'range':'bytes=0-9','if-none-match':'"'+s.share.report.sha256+'"'});assert.equal(pdf.status,200);assert.equal(pdf.headers.get('cache-control'),'private, no-store');assert.equal(pdf.headers.get('referrer-policy'),'no-referrer');assert.equal(createHash('sha256').update(Buffer.from(await pdf.arrayBuffer())).digest('hex'),s.share.report.sha256);
 assert.equal((await fetch(address+`/v1/organizations/${org}/projects/${projectId}`,{headers:{authorization:'Bearer '+s.token}})).status,401);
 assert.equal((await fetch(address+`/media/organizations/${org}/assets/${fixture.before}/original`,{headers:{authorization:'Bearer '+s.token}})).status,401);
 const foreignPath=`/v1/organizations/${org}/projects/${key()}/reports/${reportId}/shares`;
 assert.equal((await fetch(address+foreignPath,{method:'POST',headers:{cookie,origin:config.WEB_ORIGIN,'idempotency-key':key(),'content-type':'application/json'},body:JSON.stringify(input())})).status,404);
 for(const body of [{...decision(s),confirmed:false},{...decision(s),kind:'correction',message:' '},{...decision(s),claimedName:' '},{...decision(s),message:'x'.repeat(2001)},{...decision(s),status:'complete'}])assert.equal((await guest(s,'/decisions',body as DecisionInput)).status,400);
 assert.equal((await guest(s,'/decisions',{...decision(s),sha256:'0'.repeat(64)})).status,409);
 assert.equal((await guest(s,'/decisions',decision(s),key(),{origin:'https://invalid.test'})).status,403);
 pass('minimal guest DTO; capability cannot authorize manager/original routes; PDF hash/no-store/no-referrer; strict body and exact revision confirmation');
 // Force audit failure to prove no decision, receipt or feed partially commits.
 const beforeRev=(await admin.query('SELECT revision FROM organization_sync_state WHERE organization_id=$1',[org])).rows[0].revision;
 await admin.query("CREATE FUNCTION task08_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test audit failure'; END $$");await admin.query('CREATE TRIGGER task08_fail BEFORE INSERT ON customer_audit_records FOR EACH ROW EXECUTE FUNCTION task08_fail_audit()');
 const dk=key();try{assert.equal((await guest(s,'/decisions',decision(s),dk)).status,500);}finally{await admin.query('DROP TRIGGER task08_fail ON customer_audit_records');await admin.query('DROP FUNCTION task08_fail_audit()');}
 assert.equal((await admin.query('SELECT count(*)::int n FROM customer_decisions WHERE report_id=$1',[reportId])).rows[0].n,0);assert.equal((await admin.query('SELECT revision FROM organization_sync_state WHERE organization_id=$1',[org])).rows[0].revision,beforeRev);
 const secondLink=await create(),requests=await Promise.all([guest(s,'/decisions',decision(s),dk),guest(secondLink,'/decisions',decision(secondLink,'correction'))]);assert.deepEqual(requests.map(r=>r.status).sort(),[200,409]);
 const winner=requests[0]!.status===200?s:secondLink,kind=requests[0]!.status===200?'accept':'correction';
 // Stable lost delivery uses the winner's stored command key (separate duplicate case below).
 const d=(await api.sharing(scope,projectId,reportId)).decision!;assert.equal(d.kind,kind);
 assert.equal((await admin.query('SELECT count(*)::int n FROM customer_audit_records WHERE report_id=$1',[reportId])).rows[0].n,1);
 assert.equal(JSON.stringify((await api.bootstrap(scope))).includes(d.claimedName),false);
 if(winner===s){const replay=await guest(s,'/decisions',decision(s),dk);assert.equal(replay.status,200);assert.equal((await replay.json()).id,d.id);assert.equal((await guest(s,'/decisions',{...decision(s),message:'different'},dk)).status,409);}
 const rk=key();const reviews=await Promise.all([api.reviewDecision(scope,projectId,reportId,{decisionId:d.id,note:'Internal correction review only'},rk),api.reviewDecision(scope,projectId,reportId,{decisionId:d.id,note:'Internal correction review only'},rk)]);assert.deepEqual(reviews[0],reviews[1]);
 await failure(api.reviewDecision(scope,projectId,reportId,{decisionId:d.id,note:'replacement'},key()),409);await failure(worker.reviewDecision(scope,projectId,reportId,{decisionId:d.id,note:''},key()),404);
 assert.equal(JSON.stringify(await(await guest(secondLink)).json()).includes(d.claimedName),false);assert.equal(JSON.stringify(await(await guest(secondLink)).json()).includes('Internal correction'),false);
 pass('audit rollback; concurrent acceptance/correction across links records one terminal report decision; manager review immutable and private');
 const newId=await ready(),newShare=await create(newId),command=decision(newShare,'correction'),cmdKey=key();
 const [a,b]=await Promise.all([guest(newShare,'/decisions',command,cmdKey),guest(newShare,'/decisions',command,cmdKey)]);assert.equal(a.status,200);assert.equal(b.status,200);assert.equal((await a.json()).id,(await b.json()).id);
 assert.equal((await guest(newShare,'/decisions',command,cmdKey)).status,200);assert.equal((await api.sharing(scope,projectId,newId)).decision!.kind,'correction');
 const nextId=await ready();assert.equal((await api.sharing(scope,projectId,nextId)).decision,null);
 const beforeProject=await api.detail(scope,projectId);await api.updateProject(scope,projectId,{name:beforeProject.name,description:beforeProject.description,address:beforeProject.address,status:'active',baseVersion:beforeProject.version},key());
 const historical=await create(nextId);assert.equal((await guest(historical,'/decisions',decision(historical))).status,200);
 const afterProject=await api.detail(scope,projectId);assert.equal(afterProject.status,'active');assert.equal(afterProject.version,beforeProject.version+1);
 await api.updateProject(scope,projectId,{name:afterProject.name,description:afterProject.description,address:afterProject.address,status:'complete',baseVersion:afterProject.version},key());
 assert.equal((await api.sharing(scope,projectId,reportId)).decision!.id,d.id);
 assert.equal(createHash('sha256').update(Buffer.from(await(await guest(s,'/pdf')).arrayBuffer())).digest('hex'),s.share.report.sha256);
 pass('duplicate/lost decision delivery is idempotent; reopen/new publication/general status edits never rewrite or transfer historical decisions or PDF bytes');
 const revokeKey=key();await api.revokeShare(scope,projectId,reportId,s.share.id,revokeKey);await api.revokeShare(scope,projectId,reportId,s.share.id,revokeKey);
 for(const suffix of ['','/pdf','/decisions'])assert.equal((await guest(s,suffix,suffix==='/decisions'?decision(s):undefined,dk,{'range':'bytes=0-1','if-modified-since':new Date().toUTCString()})).status,404);
 assert.equal((await guest(secondLink)).status,200);
 const expiring=await create();await admin.query('ALTER TABLE report_shares DISABLE TRIGGER immutable_report_share');try{await admin.query("UPDATE report_shares SET created_at=clock_timestamp()-interval '2 days',expires_at=clock_timestamp()-interval '1 day' WHERE id=$1",[expiring.share.id]);}finally{await admin.query('ALTER TABLE report_shares ENABLE TRIGGER immutable_report_share');}
 for(const suffix of ['','/pdf','/decisions'])assert.equal((await guest(expiring,suffix,suffix==='/decisions'?decision(expiring):undefined)).status,404);
 const raceId=await ready(),race=await create(raceId);const [dec,revoke]=await Promise.all([guest(race,'/decisions',decision(race)),api.revokeShare(scope,projectId,raceId,race.share.id,key())]);assert([200,404].includes(dec.status));assert(revoke.revokedAt);assert.equal((await guest(race,'/pdf')).status,404);
 // A request waiting on the project lock must recheck revoked authority after the wait.
 const waiting=await create(),blocker=await admin.connect();await blocker.query('BEGIN');await blocker.query('SELECT revision FROM organization_sync_state WHERE organization_id=$1 FOR UPDATE',[org]);const waitingRequest=guest(waiting);await new Promise(r=>setTimeout(r,50));await blocker.query('UPDATE report_shares SET revoked_at=clock_timestamp() WHERE id=$1',[waiting.share.id]);await blocker.query('COMMIT');blocker.release();assert.equal((await waitingRequest).status,404);
 pass('revocation/expiry deny metadata, PDF/range/conditional and decisions including receipt replay; racing and lock-wait requests revalidate authority');
 for(const table of ['customer_decisions','customer_command_receipts','customer_decision_reviews','customer_audit_records'])await assert.rejects(runtime.query(`DELETE FROM ${table}`),{code:'42501'});
 await assert.rejects(runtime.query('UPDATE report_shares SET expires_at=clock_timestamp() WHERE id=$1',[s.share.id]),{code:'42501'});
 await assert.rejects(runtime.query('UPDATE report_shares SET revoked_at=NULL WHERE id=$1',[s.share.id]),/immutable/);
 const tables=(await admin.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows;
 for(const {tablename}of tables){const rows=JSON.stringify((await admin.query(`SELECT row_to_json(t) FROM ${pg.escapeIdentifier(tablename)} t`)).rows);assert.equal(tokens.some(t=>rows.includes(t)),false,'Bearer secret persisted in '+tablename);}
 // Deliberately corrupt a synthetic artifact, verify access fails, then restore exact bytes.
 const path=await files.artifact(pending.id),bytes=await readFile(path);try{await writeFile(path,Buffer.from('corrupt'));assert.equal((await guest(wrong,'/pdf')).status,500);await failure(create(pending.id),500);}finally{await writeFile(path,bytes);}
 assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),wrong.share.report.sha256);
 // API keeps fixed-size, durable rate slots across instances. Use a synthetic address
 // so this check cannot consume the browser fixture's shared proxy budget.
 const synthetic='task08-'+key();for(let i=0;i<60;i++)await sharing.rate(synthetic,true);await assert.rejects(createSharing(runtime,files,config.AUTH_SECRET).rate(synthetic,true),(e:unknown)=>e instanceof Error&&e.message==='RATE_LIMITED');
 assert(Number((await admin.query('SELECT count(*) n FROM guest_rate_slots')).rows[0].n)<=8192);
 const log=process.env.SHARING_LOG_PATH;if(log){await new Promise(r=>setTimeout(r,50));const text=await readFile(log,'utf8');assert.equal(tokens.some(t=>text.includes(t)),false,'Bearer in log');}
 pass('runtime append-only privileges, hash-only persistence, artifact corruption denial/restoration and durable bounded brute-force budget');
 await writeFile(output+'/sharing-validation.json',JSON.stringify({status:'PASS',scope,projectId,reportId,checks:9,secretCount:tokens.length,tokenStorage:'hash-only'},null,2));
}finally{await runtime.end();await admin.end();await app.close();}
