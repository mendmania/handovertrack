import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { AccessError, validComposition, type ProofReports, type Composition, type ReportStatus, type ReportSnapshot, type ReportEvidence, type Project } from '@handovertrack/backend';
import { transaction, authorize } from '../media/service';
import { checklistFor, requireCompletion } from '../checklists';
export const FONT_HASH='7da195a74c55bef988d0d48f9508bd5d849425c1770dba5d7bfc6ce9ed848954';
// Canonical JSON survives PostgreSQL jsonb key ordering and restart/replay.
export function canonical(value:unknown):string {
 if(value===null || typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 return '{'+Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
}
export const digest=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
const projectColumns='id,organization_id AS "organizationId",name,description,address,status,version,updated_at AS "updatedAt"';
async function composition(c:PoolClient,org:string,project:string):Promise<Composition>{return (await c.query<{content:Composition}>('SELECT content FROM proof_compositions WHERE organization_id=$1 AND project_id=$2 ORDER BY version DESC LIMIT 1',[org,project])).rows[0]?.content ?? {version:0,notes:[],annotations:[],pairs:[]};}
const statusColumns=`s.id,s.revision,s.created_at AS "createdAt",s.snapshot_hash AS "snapshotHash",j.state,j.error,a.sha256,a.size,a.pages`;
export async function reportStatus(c:PoolClient,org:string,project:string,id:string):Promise<ReportStatus>{const row=(await c.query<ReportStatus>(`SELECT ${statusColumns} FROM report_snapshots s JOIN report_jobs j ON j.report_id=s.id LEFT JOIN report_artifacts a ON a.report_id=s.id WHERE s.organization_id=$1 AND s.project_id=$2 AND s.id=$3`,[org,project,id])).rows[0];if(!row)throw new AccessError('NOT_FOUND',404);return row;}
export async function publishProof(c:PoolClient,actor:string,org:string,p:Project,action:string,before:unknown,after:unknown){
 const revision=(await c.query('UPDATE organization_sync_state SET revision=revision+1 WHERE organization_id=$1 RETURNING revision',[org])).rows[0].revision;
 // Compatible project invalidation only; private manager composition never enters native feeds.
 await c.query("INSERT INTO sync_changes(organization_id,revision,ordinal,entity,operation,project_id,payload) VALUES($1,$2,1,'project','upsert',$3,$4)",[org,revision,p.id,p]);
 await c.query('INSERT INTO audit_records(id,organization_id,actor_account_id,action,project_id,revision,before_state,after_state) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),org,actor,action,p.id,revision,before,after]);
}
export function createProofReports(pool:Pool):ProofReports {
 async function command<T>(actor:string,org:string,project:string,key:string,operation:string,input:unknown,change:(c:PoolClient,p:Project)=>Promise<{result:T;before?:unknown}>):Promise<T>{
  if(typeof key!=='string'||key.length<8||key.length>128)throw new AccessError('INVALID_REQUEST',400);
  return transaction(pool,async c=>{
   const m=(await c.query<{role:string}>('SELECT role FROM lock_membership($1,$2)',[org,actor])).rows[0];if(m?.role!=='manager')throw new AccessError('NOT_FOUND',404);
   await c.query('INSERT INTO organization_sync_state(organization_id) VALUES($1) ON CONFLICT DO NOTHING',[org]);
   await c.query('SELECT revision FROM organization_sync_state WHERE organization_id=$1 FOR UPDATE',[org]);
   const p=(await c.query<Project>(`SELECT ${projectColumns} FROM projects WHERE organization_id=$1 AND id=$2 FOR UPDATE`,[org,project])).rows[0];if(!p)throw new AccessError('NOT_FOUND',404);
   const hash=digest({project,input});const old=(await c.query<{request_hash:string;response:T}>('SELECT request_hash,response FROM command_receipts WHERE organization_id=$1 AND actor_account_id=$2 AND operation=$3 AND idempotency_key=$4',[org,actor,operation,key])).rows[0];
   if(old){if(old.request_hash!==hash)throw new AccessError('IDEMPOTENCY_CONFLICT',409);return old.response;}
   const {result,before}=await change(c,p);
   await publishProof(c,actor,org,p,operation,before??null,result);
   await c.query('INSERT INTO command_receipts(organization_id,actor_account_id,operation,idempotency_key,request_hash,response) VALUES($1,$2,$3,$4,$5,$6)',[org,actor,operation,key,hash,result]);return result;
  });
 }
 return {
  read:(actor,org,project)=>transaction(pool,async c=>{await authorize(c,actor,org,project,true);const reports=(await c.query<ReportStatus>(`SELECT ${statusColumns} FROM report_snapshots s JOIN report_jobs j ON j.report_id=s.id LEFT JOIN report_artifacts a ON a.report_id=s.id WHERE s.organization_id=$1 AND s.project_id=$2 ORDER BY s.revision DESC LIMIT 100`,[org,project])).rows;return {composition:await composition(c,org,project),reports};}),
  save:(actor,org,project,input,key)=>command(actor,org,project,key,'proof.save',input,async c=>{
   if(!validComposition(input))throw new AccessError('INVALID_REQUEST',400);
   const before=await composition(c,org,project);if(before.version!==input.baseVersion)throw new AccessError('VERSION_CONFLICT',409,before);
   const ids=[...new Set([...input.annotations.map(a=>a.mediaId),...input.pairs.flatMap(p=>[p.beforeId,p.afterId])])];
   const accepted=await c.query("SELECT m.id FROM media_uploads m JOIN media_events e ON e.media_id=m.id AND e.event='accepted' AND e.version=1 WHERE m.organization_id=$1 AND m.project_id=$2 AND m.id=ANY($3::uuid[]) AND m.state='accepted' AND m.accepted_at IS NOT NULL",[org,project,ids]);
   if(accepted.rowCount!==ids.length)throw new AccessError('INVALID_REQUEST',422);
   const result:Composition={version:before.version+1,notes:input.notes,annotations:input.annotations,pairs:input.pairs};
   await c.query('INSERT INTO proof_compositions(organization_id,project_id,version,content,created_by) VALUES($1,$2,$3,$4,$5)',[org,project,result.version,result,actor]);return {before,result};
  }),
  request:(actor,org,project,input,key)=>command(actor,org,project,key,'report.request',input,async(c,p)=>{
   const run=await checklistFor(c,org,project),comp=await composition(c,org,project);
   if(p.version!==input.projectVersion || comp.version!==input.compositionVersion)throw new AccessError('VERSION_CONFLICT',409);
   if(p.status!=='complete')throw new AccessError('COMPLETION_REQUIRED',422);
   await requireCompletion(c,org,project);
   if(!run || run.version!==input.checklistVersion)throw new AccessError('VERSION_CONFLICT',409); // Revalidate even legacy complete rows under the shared project write lock.
   const ids=input.mediaIds;if(ids.length>40 || new Set(ids).size!==ids.length)throw new AccessError('INVALID_REQUEST',400);
   const required=new Set([...run.answers.flatMap(a=>a.mediaIds),...comp.annotations.map(a=>a.mediaId),...comp.pairs.flatMap(p=>[p.beforeId,p.afterId])]);
   if([...required].some(id=>!ids.includes(id)))throw new AccessError('COMPLETION_REQUIRED',422);
   const media=(await c.query<{id:string;account_id:string;captured_at:Date;accepted_at:Date;sha256:string;size:number;variant_hash:string|null;variant_size:number;variant_width:number;variant_height:number;state:string}>(`SELECT m.*,v.sha256 variant_hash,v.size variant_size,v.width variant_width,v.height variant_height,j.state FROM media_uploads m JOIN media_events e ON e.media_id=m.id AND e.event='accepted' AND e.version=1 LEFT JOIN media_jobs j ON j.media_id=m.id LEFT JOIN media_variants v ON v.media_id=m.id AND v.version=1 AND v.name='report' WHERE m.organization_id=$1 AND m.project_id=$2 AND m.id=ANY($3::uuid[]) AND m.state='accepted' AND m.accepted_at IS NOT NULL`,[org,project,ids])).rows;
   if(media.length!==ids.length)throw new AccessError('INVALID_REQUEST',422);
   const unavailable=media.filter(m=>m.state!=='ready'||!m.variant_hash);if(unavailable.length)throw new AccessError('MEDIA_NOT_READY',422,{media:unavailable.map(m=>({id:m.id,state:m.state}))});
   const evidence:ReportEvidence[]=ids.map(id=>{const m=media.find(m=>m.id===id)!;return {id,accountId:m.account_id,capturedAt:m.captured_at.toISOString(),acceptedAt:m.accepted_at.toISOString(),originalSha256:m.sha256,originalSize:m.size,variant:{version:1,name:'report',sha256:m.variant_hash!,size:m.variant_size,width:m.variant_width,height:m.variant_height}};});
   const revision=(await c.query<{revision:number}>('SELECT coalesce(max(revision),0)+1 revision FROM report_snapshots WHERE organization_id=$1 AND project_id=$2',[org,project])).rows[0]!.revision;
   const snapshot:ReportSnapshot=JSON.parse(JSON.stringify({id:randomUUID(),revision,organizationId:org,createdBy:actor,createdAt:new Date().toISOString(),template:'completion-v1',renderer:'pdfkit-0.17.2/v1',font:'DejaVuSans/'+FONT_HASH,project:p,checklist:run,composition:{...comp,notes:comp.notes.filter(n=>n.visibility==='report')},evidence}));
   await c.query('INSERT INTO report_snapshots(id,organization_id,project_id,revision,snapshot,snapshot_hash,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[snapshot.id,org,project,revision,snapshot,digest(snapshot),actor,snapshot.createdAt]);
   await c.query('INSERT INTO report_jobs(report_id) VALUES($1)',[snapshot.id]);return {result:await reportStatus(c,org,project,snapshot.id)};
  }),
  status:(actor,org,project,id)=>transaction(pool,async c=>{await authorize(c,actor,org,project,true);return reportStatus(c,org,project,id);}),
  retry:(actor,org,project,id,key)=>command(actor,org,project,key,'report.retry',{id},async c=>{
   const before=await reportStatus(c,org,project,id);
   await c.query("UPDATE report_jobs SET state='pending',attempts=0,error=NULL,next_run_at=clock_timestamp(),updated_at=clock_timestamp() WHERE report_id=$1 AND state='failed'",[id]);
   return {before,result:await reportStatus(c,org,project,id)};
  }),
 };
}
