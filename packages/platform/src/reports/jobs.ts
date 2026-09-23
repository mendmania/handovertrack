import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { readFile, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { AccessError, type ReportSnapshot, type Project } from '@handovertrack/backend';
import { transaction, authorize } from '../media/service';
import { ReportFiles } from './files';
import { digest, reportStatus, publishProof } from './service';
export interface ReportJob {report_id:string;lease_owner:string;lease_token:number;attempts:number}
export function createReportJobs(pool:Pool,files:ReportFiles,mediaRoot:string,leaseMs=60000){
 async function claim(owner:string):Promise<ReportJob|undefined>{return transaction(pool,async c=>{
  await c.query("UPDATE report_jobs SET state='failed',error='LEASE_RETRIES_EXHAUSTED',lease_until=NULL WHERE state='running' AND lease_until<=clock_timestamp() AND attempts>=5");
  return (await c.query<ReportJob>(`WITH candidate AS (SELECT report_id FROM report_jobs WHERE attempts<5 AND ((state='pending' AND next_run_at<=clock_timestamp()) OR (state='running' AND lease_until<=clock_timestamp())) ORDER BY next_run_at,report_id FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE report_jobs j SET state='running',attempts=attempts+1,lease_owner=$1,lease_token=lease_token+1,lease_until=clock_timestamp()+$2*interval '1 millisecond',updated_at=clock_timestamp() FROM candidate WHERE j.report_id=candidate.report_id RETURNING j.*`,[owner,leaseMs])).rows[0];
 });}
 async function renew(job:ReportJob){return (await pool.query("UPDATE report_jobs SET lease_until=clock_timestamp()+$4*interval '1 millisecond' WHERE report_id=$1 AND lease_owner=$2 AND lease_token=$3 AND state='running' AND lease_until>clock_timestamp()",[job.report_id,job.lease_owner,job.lease_token,leaseMs])).rowCount===1;}
 async function processJob(job:ReportJob){
  const row=(await pool.query<{snapshot:ReportSnapshot;snapshot_hash:string}>('SELECT snapshot,snapshot_hash FROM report_snapshots WHERE id=$1',[job.report_id])).rows[0];if(!row||digest(row.snapshot)!==row.snapshot_hash)throw Error('SNAPSHOT_INTEGRITY');
  await files.capacity(100*1024*1024);const path=await files.path(job.report_id,`${randomUUID()}.part`);
  const compiled=new URL('./report-render.js',import.meta.url);const entry=existsSync(compiled)?compiled:new URL('./render-entry.ts',import.meta.url);
  let pages:number;
  try{
   pages=await new Promise<number>((resolve,reject)=>{
    const child=fork(fileURLToPath(entry),[],{execArgv:['--max-old-space-size=256',...(entry.pathname.endsWith('.ts')?['--import','tsx']:[])],stdio:['ignore','ignore','ignore','ipc'],env:{PATH:globalThis.process.env.PATH,NODE_ENV:'production'}});
    const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('RENDER_TIMEOUT'));},120000);
    let count=0;child.on('message',(m:{pages?:number})=>{count=m.pages??0;});child.on('error',reject);child.on('exit',code=>{clearTimeout(timer);if(code===0&&count>0&&count<=200)resolve(count);else reject(Error('RENDER_FAILED'));});
    child.send({snapshot:row.snapshot,snapshotHash:row.snapshot_hash,mediaRoot,output:path});
   });
   const bytes=await readFile(path);if(bytes.length>50*1024*1024)throw Error('REPORT_TOO_LARGE');const hash=createHash('sha256').update(bytes).digest('hex');
   await transaction(pool,async c=>{
    await c.query('SELECT revision FROM organization_sync_state WHERE organization_id=$1 FOR UPDATE',[row.snapshot.organizationId]);
    const project=(await c.query<Project>('SELECT id,organization_id AS "organizationId",name,description,address,status,version,updated_at AS "updatedAt" FROM projects WHERE organization_id=$1 AND id=$2 FOR UPDATE',[row.snapshot.organizationId,row.snapshot.project.id])).rows[0]!;
    if(!(await c.query("SELECT 1 FROM report_jobs WHERE report_id=$1 AND lease_owner=$2 AND lease_token=$3 AND state='running' AND lease_until>clock_timestamp() FOR UPDATE",[job.report_id,job.lease_owner,job.lease_token])).rowCount)throw new AccessError('STALE_LEASE',409);
    const final=await files.artifact(job.report_id);await files.publish(path,final);await files.verified(final,hash,bytes.length);
    await c.query('INSERT INTO report_artifacts(report_id,sha256,size,pages) VALUES($1,$2,$3,$4)',[job.report_id,hash,bytes.length,pages]);
    await publishProof(c,row.snapshot.createdBy,row.snapshot.organizationId,project,'report.ready',null,{id:job.report_id,sha256:hash,size:bytes.length,pages});
    if(!(await c.query("UPDATE report_jobs SET state='ready',error=NULL,lease_until=NULL,updated_at=clock_timestamp() WHERE report_id=$1 AND lease_owner=$2 AND lease_token=$3 AND lease_until>clock_timestamp()",[job.report_id,job.lease_owner,job.lease_token])).rowCount)throw new AccessError('STALE_LEASE',409);
   });
  }finally{await unlink(path).catch(()=>{});}
 }
 async function fail(job:ReportJob){await pool.query("UPDATE report_jobs SET state=CASE WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,error='RENDER_FAILED',next_run_at=clock_timestamp()+least(300,power(2,attempts))*interval '1 second',lease_until=NULL,updated_at=clock_timestamp() WHERE report_id=$1 AND lease_owner=$2 AND lease_token=$3 AND state='running' AND lease_until>clock_timestamp()",[job.report_id,job.lease_owner,job.lease_token]);}
 return {claim,renew,process:processJob,fail};
}
export async function downloadReport(pool:Pool,files:ReportFiles,actor:string,org:string,project:string,id:string){return transaction(pool,async c=>{await authorize(c,actor,org,project,true);const status=await reportStatus(c,org,project,id);if(status.state!=='ready'||!status.sha256||!status.size)throw new AccessError('REPORT_NOT_READY',409);return {bytes:await files.verified(await files.artifact(id),status.sha256,status.size),status};});}
