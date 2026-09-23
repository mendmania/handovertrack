import assert from 'node:assert/strict';
import {spawn,type ChildProcess} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {createApp} from '../apps/api/src/app';
import {readServerConfig} from '../packages/config/src/server';
import {createApi} from '../packages/contracts/src/index';
if(process.env.TASK07_ISOLATED!=='true')throw Error('Explicit isolated test required');
const config=readServerConfig(process.env),app=createApp(config,false),address=await app.listen({host:'127.0.0.1',port:0});
const admin=new pg.Pool({connectionString:process.env.MIGRATION_DATABASE_URL}),children:ChildProcess[]=[];
async function waitFor<T>(fn:()=>Promise<T|undefined>,ms=20000){const end=Date.now()+ms;while(Date.now()<end){const result=await fn();if(result)return result;await new Promise(r=>setTimeout(r,10));}throw Error('Wait timed out');}
function start(){const child=spawn(process.execPath,['apps/worker/dist/main.js'],{env:{...process.env,WORKER_POLL_MS:'100',WORKER_LEASE_MS:'5000'},stdio:['ignore','pipe','pipe']});children.push(child);let output='';child.stdout!.on('data',b=>{output+=b.toString();});child.stderr!.on('data',b=>{output+=b.toString();});return {child,output:()=>output};}
try{
 const fixture=JSON.parse(await readFile('.local/task07/fixture.json','utf8'));const {scope,projectId}=fixture;
 const response=await fetch(address+'/api/auth/sign-in/email',{method:'POST',headers:{origin:config.WEB_ORIGIN,'content-type':'application/json'},body:JSON.stringify({email:'manager.north@example.test',password:process.env.SEED_PASSWORD})});assert.equal(response.status,200);
 const api=createApi({baseUrl:address,headers:{origin:config.WEB_ORIGIN,cookie:response.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ')}});
 const p=await api.detail(scope,projectId),run=(await api.checklist(scope,projectId)).run!,comp=(await api.proof(scope,projectId)).composition;
 const report=await api.requestReport(scope,projectId,{projectVersion:p.version,checklistVersion:run.version,compositionVersion:comp.version,mediaIds:[fixture.before,fixture.after]},randomUUID());
 const first=start();await waitFor(async()=>{const row=(await admin.query('SELECT state,lease_token FROM report_jobs WHERE report_id=$1',[report.id])).rows[0];return row?.state==='running'?row:undefined;});
 const dead=new Promise(resolve=>first.child.once('exit',(code,signal)=>resolve({code,signal})));first.child.kill('SIGKILL');assert.deepEqual(await dead,{code:null,signal:'SIGKILL'});
 assert.equal((await api.reportStatus(scope,projectId,report.id)).state,'running');
 await admin.query("UPDATE report_jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE report_id=$1",[report.id]);
 const second=start();await waitFor(async()=>{const r=await api.reportStatus(scope,projectId,report.id);return r.state==='ready'?r:undefined;});
 const stopped=new Promise(resolve=>second.child.once('exit',code=>resolve(code)));second.child.kill('SIGTERM');assert.equal(await stopped,0);assert(second.output().includes('completion-v1'));assert(second.output().includes('"event":"stopped"'));
 const row=(await admin.query('SELECT attempts,lease_token FROM report_jobs WHERE report_id=$1',[report.id])).rows[0];assert.equal(row.attempts,2);assert.equal(row.lease_token,2);assert.equal((await admin.query('SELECT count(*)::int n FROM report_artifacts WHERE report_id=$1',[report.id])).rows[0].n,1);
 await writeFile('.local/task07/worker-crash.json',JSON.stringify({status:'PASS',reportId:report.id,...row},null,2));
 console.log('PASS actual built worker SIGKILL after claim; replacement claims expired lease and publishes once; SIGTERM drains safely');
}finally{for(const c of children)if(c.exitCode===null&&c.signalCode===null)c.kill('SIGKILL');await admin.end();await app.close();}
