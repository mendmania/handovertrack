// Runs only the Task 07/08 browser journeys against the dedicated test DB.
// Never reuses services: a bind failure is a failure, not permission to use another DB.
import {spawn,type ChildProcess} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
const env:NodeJS.ProcessEnv={...process.env,DATABASE_URL:process.env.TEST_DATABASE_URL,MIGRATION_DATABASE_URL:process.env.TEST_MIGRATION_DATABASE_URL};
if(env.TASK08_ISOLATED!=='true'||!env.DATABASE_URL||new URL(env.DATABASE_URL).pathname!=='/handovertrack_test'||!['localhost','127.0.0.1'].includes(new URL(env.DATABASE_URL).hostname))throw Error('Explicit isolated test DB required');
const output=env.REPORT_TEST_OUTPUT??'.local/task08';await mkdir(output,{recursive:true});const children:ChildProcess[]=[];
function start(name:string,args:string[],extra:NodeJS.ProcessEnv={}){const stream=createWriteStream(output+'/ci-'+name+'.log',{flags:'a',mode:0o600});const c=spawn(process.execPath,args,{env:{...env,...extra},stdio:['ignore','pipe','pipe']});c.stdout!.pipe(stream);c.stderr!.pipe(stream);children.push(c);c.on('exit',()=>stream.end());return c;}
async function ready(url:string,c:ChildProcess){const end=Date.now()+30000;while(Date.now()<end){if(c.exitCode!==null||c.signalCode!==null)throw Error('Isolated service exited before ready');try{if((await fetch(url)).ok)return;}catch{/* Startup. */}await new Promise(r=>setTimeout(r,100));}throw Error('Isolated service readiness timeout');}
try{
 const api=start('api',['apps/api/dist/main.js']);await ready(env.API_INTERNAL_URL!+'/health/ready',api);
 const web=start('web',['apps/web/node_modules/next/dist/bin/next','start','apps/web','--hostname','127.0.0.1','--port',new URL(env.WEB_ORIGIN!).port||'3300'],{NODE_ENV:'production'});await ready(env.WEB_ORIGIN!+'/sign-in',web);
 start('worker',['apps/worker/dist/main.js']);
 const test=start('browser',['node_modules/@playwright/test/cli.js','test','--config','scripts/playwright-task08.config.ts',...(env.TASK09_ISOLATED==='true'?[]:['tests/web/reports.spec.ts','tests/web/sharing.spec.ts'])]);
 let pending='';test.stdout!.on('data',chunk=>{pending+=chunk.toString();const lines=pending.split('\n');pending=lines.pop()!;for(const line of lines)if(line.startsWith('HTRACK_TEST_RESULT '))console.log(line);});
 const code=await new Promise(r=>test.once('exit',r));if(code!==0)throw Error('Proof/sharing browser checks failed; inspect private ci-browser.log');console.log('PASS isolated report + sharing browser journeys');
}finally{
 for(const c of children)if(c.exitCode===null&&c.signalCode===null)c.kill('SIGTERM');
 await Promise.all(children.map(c=>c.exitCode!==null||c.signalCode!==null?Promise.resolve():new Promise<void>(resolve=>{const t=setTimeout(()=>{c.kill('SIGKILL');resolve();},15000);c.once('exit',()=>{clearTimeout(t);resolve();});})));
}
