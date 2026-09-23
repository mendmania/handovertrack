import { createHash, randomBytes, randomUUID, timingSafeEqual, createHmac } from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {AccessError,validDecision,type Project,type ShareInput,type DecisionInput,type ReportShare,type ShareMetadata,type CustomerDecision,type DecisionReview,type ShareWorkspace,type GuestReport} from '@handovertrack/backend';
import {transaction,authorize} from '../media/service';
import {ReportFiles} from '../reports/files';
import {digest,publishProof} from '../reports/service';
const projectColumns='id,organization_id AS "organizationId",name,description,address,status,version,updated_at AS "updatedAt"';
const shareColumns='id,metadata AS report,expires_at AS "expiresAt",revoked_at AS "revokedAt",created_at AS "createdAt"';
const decisionColumns='id,report_id AS "reportId",sha256,kind,claimed_name AS "claimedName",message,created_at AS "createdAt"';
const sha=(token:string)=>createHash('sha256').update(token).digest('hex');
const keyValid=(key:string)=>{if(typeof key!=='string'||key.length<8||key.length>128)throw new AccessError('INVALID_REQUEST',400);};
interface ShareRow {id:string;organization_id:string;project_id:string;report_id:string;token_hash:string}
export function createSharing(pool:Pool,files:ReportFiles,rateSecret:string){
 async function lockProject(c:PoolClient,org:string,project:string):Promise<Project>{
  await c.query('SELECT revision FROM organization_sync_state WHERE organization_id=$1 FOR UPDATE',[org]);
  const p=(await c.query<Project>(`SELECT ${projectColumns} FROM projects WHERE organization_id=$1 AND id=$2 FOR UPDATE`,[org,project])).rows[0];
  if(!p)throw new AccessError('NOT_FOUND',404);return p;
 }
 async function managerLock(c:PoolClient,actor:string,org:string,project:string){
  const m=(await c.query('SELECT role FROM lock_membership($1,$2)',[org,actor])).rows[0];
  if(m?.role!=='manager')throw new AccessError('NOT_FOUND',404);return lockProject(c,org,project);
 }
 async function share(c:PoolClient,id:string){return (await c.query<ReportShare>(`SELECT ${shareColumns} FROM report_shares WHERE id=$1`,[id])).rows[0]!;}
 async function decision(c:PoolClient,report:string){return (await c.query<CustomerDecision>(`SELECT ${decisionColumns} FROM customer_decisions WHERE report_id=$1`,[report])).rows[0]??null;}
 async function managerCommand<T>(actor:string,org:string,project:string,key:string,operation:string,input:unknown,change:(c:PoolClient)=>Promise<T>){
  keyValid(key);return transaction(pool,async c=>{
   const p=await managerLock(c,actor,org,project),hash=digest({project,input});
   const old=(await c.query('SELECT request_hash,response FROM command_receipts WHERE organization_id=$1 AND actor_account_id=$2 AND operation=$3 AND idempotency_key=$4',[org,actor,operation,key])).rows[0];
   if(old){if(old.request_hash!==hash)throw new AccessError('IDEMPOTENCY_CONFLICT',409);return old.response as T;}
   const result=await change(c);
   await publishProof(c,actor,org,p,operation,null,result);
   await c.query('INSERT INTO command_receipts(organization_id,actor_account_id,operation,idempotency_key,request_hash,response) VALUES($1,$2,$3,$4,$5,$6)',[org,actor,operation,key,hash,result]);return result;
  });
 }
 // Every guest operation rechecks the capability AFTER the shared mutation lock.
 async function guestLock(c:PoolClient,id:string,token:string){
  if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new AccessError('NOT_FOUND',404);
  const row=(await c.query<ShareRow>('SELECT id,organization_id,project_id,report_id,token_hash FROM report_shares WHERE id=$1',[id])).rows[0];
  if(!row||!timingSafeEqual(Buffer.from(row.token_hash,'hex'),Buffer.from(sha(token),'hex')))throw new AccessError('NOT_FOUND',404);
  const p=await lockProject(c,row.organization_id,row.project_id);await active(c,id);return {row,p};
 }
 async function active(c:PoolClient,id:string){if(!(await c.query('SELECT 1 FROM report_shares WHERE id=$1 AND revoked_at IS NULL AND expires_at>clock_timestamp()',[id])).rowCount)throw new AccessError('NOT_FOUND',404);}
 return {
  async rate(ip:string,write:boolean){
   const slot=createHmac('sha256',rateSecret).update(ip).digest().readUInt16BE(0)%4096+(write?4096:0);
   const row=(await pool.query(`INSERT INTO guest_rate_slots(slot,window_start,count) VALUES($1,floor(extract(epoch FROM clock_timestamp())/60)::bigint,1) ON CONFLICT(slot) DO UPDATE SET window_start=excluded.window_start,count=CASE WHEN guest_rate_slots.window_start=excluded.window_start THEN least(guest_rate_slots.count+1,10000) ELSE 1 END RETURNING count`,[slot])).rows[0];
   if(row.count>(write?60:360))throw new AccessError('RATE_LIMITED',429);
  },
  list:(actor:string,org:string,project:string,report:string):Promise<ShareWorkspace>=>transaction(pool,async c=>{
   await authorize(c,actor,org,project,true);
   if(!(await c.query('SELECT 1 FROM report_snapshots WHERE id=$1 AND organization_id=$2 AND project_id=$3',[report,org,project])).rowCount)throw new AccessError('NOT_FOUND',404);
   const shares=(await c.query<ReportShare>(`SELECT ${shareColumns} FROM report_shares WHERE report_id=$1 ORDER BY created_at DESC LIMIT 201`,[report])).rows;
   if(shares.length>200)throw new AccessError('SNAPSHOT_TOO_LARGE',413);
   const d=await decision(c,report),review=d?(await c.query<DecisionReview>('SELECT decision_id AS "decisionId",note,created_at AS "createdAt" FROM customer_decision_reviews WHERE decision_id=$1',[d.id])).rows[0]??null:null;
   return {shares,decision:d,review};
  }),
  async create(actor:string,org:string,project:string,report:string,input:ShareInput,key:string){
   // Kept ONLY in this request's memory. Receipts/audit always contain the secretless result.
   let token:string|null=null;
   const result=await managerCommand(actor,org,project,key,'share.create',{report,...input},async c=>{
    const row=(await c.query<{metadata:ShareMetadata}>(`SELECT jsonb_build_object('reportId',s.id,'revision',s.revision,'title',s.snapshot->'project'->>'name','createdAt',s.created_at,'sha256',a.sha256,'size',a.size,'pages',a.pages) metadata FROM report_snapshots s JOIN report_artifacts a ON a.report_id=s.id JOIN report_jobs j ON j.report_id=s.id AND j.state='ready' WHERE s.id=$1 AND s.organization_id=$2 AND s.project_id=$3`,[report,org,project])).rows[0];
    if(!row)throw new AccessError('REPORT_NOT_READY',409);
    if(!Number.isFinite(Date.parse(input.expiresAt))||!(await c.query("SELECT 1 WHERE $1::timestamptz>clock_timestamp()+interval '1 minute' AND $1::timestamptz<=clock_timestamp()+interval '30 days'",[input.expiresAt])).rowCount)throw new AccessError('INVALID_REQUEST',400);
    if(Number((await c.query('SELECT count(*) FROM report_shares WHERE report_id=$1',[report])).rows[0].count)>=200)throw new AccessError('SNAPSHOT_TOO_LARGE',413);
    await files.verified(await files.artifact(report),row.metadata.sha256,row.metadata.size);
    token=randomBytes(32).toString('base64url');const id=randomUUID();
    await c.query('INSERT INTO report_shares(id,organization_id,project_id,report_id,token_hash,metadata,expires_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,org,project,report,sha(token),row.metadata,input.expiresAt,actor]);return share(c,id);
   });return {share:result,token};
  },
  revoke:(actor:string,org:string,project:string,report:string,id:string,key:string)=>managerCommand(actor,org,project,key,'share.revoke',{report,id},async c=>{
   const r=await c.query('UPDATE report_shares SET revoked_at=coalesce(revoked_at,clock_timestamp()) WHERE id=$1 AND report_id=$2 AND organization_id=$3 AND project_id=$4 RETURNING id',[id,report,org,project]);
   if(!r.rowCount)throw new AccessError('NOT_FOUND',404);return share(c,id);
  }),
  review:(actor:string,org:string,project:string,report:string,id:string,note:string,key:string)=>managerCommand(actor,org,project,key,'decision.review',{report,id,note},async c=>{
   if(typeof note!=='string'||note.length>2000)throw new AccessError('INVALID_REQUEST',400);
   const d=await decision(c,report);if(!d||d.id!==id||!(await c.query('SELECT 1 FROM report_snapshots WHERE id=$1 AND organization_id=$2 AND project_id=$3',[report,org,project])).rowCount)throw new AccessError('NOT_FOUND',404);
   if((await c.query('SELECT 1 FROM customer_decision_reviews WHERE decision_id=$1',[id])).rowCount)throw new AccessError('VERSION_CONFLICT',409);
   return (await c.query<DecisionReview>('INSERT INTO customer_decision_reviews(decision_id,reviewed_by,note) VALUES($1,$2,$3) RETURNING decision_id AS "decisionId",note,created_at AS "createdAt"',[id,actor,note])).rows[0]!;
  }),
  read:(id:string,token:string):Promise<GuestReport>=>transaction(pool,async c=>{
   const {row}=await guestLock(c,id,token),d=await decision(c,row.report_id);return {share:await share(c,id),decision:d?{kind:d.kind,createdAt:d.createdAt}:null};
  }),
  pdf:(id:string,token:string)=>transaction(pool,async c=>{
   await guestLock(c,id,token);const s=await share(c,id);
   const bytes=await files.verified(await files.artifact(s.report.reportId),s.report.sha256,s.report.size);
   await active(c,id);return {bytes,report:s.report};
  }),
  decide:(id:string,token:string,input:DecisionInput,key:string)=>transaction(pool,async c=>{
   keyValid(key);if(!validDecision(input))throw new AccessError('INVALID_REQUEST',400);
   const {row,p}=await guestLock(c,id,token),s=await share(c,id),hash=digest(input);
   if(input.reportId!==s.report.reportId||input.sha256!==s.report.sha256)throw new AccessError('VERSION_CONFLICT',409);
   const old=(await c.query('SELECT request_hash,response FROM customer_command_receipts WHERE share_id=$1 AND idempotency_key=$2',[id,key])).rows[0];
   if(old){if(old.request_hash!==hash)throw new AccessError('IDEMPOTENCY_CONFLICT',409);return old.response as CustomerDecision;}
   if(await decision(c,row.report_id))throw new AccessError('DECISION_RECORDED',409);
   const d=(await c.query<CustomerDecision>(`INSERT INTO customer_decisions(id,report_id,share_id,sha256,kind,claimed_name,message) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING ${decisionColumns}`,[randomUUID(),row.report_id,id,input.sha256,input.kind,input.claimedName.trim(),input.message])).rows[0]!;
   const rev=(await c.query('UPDATE organization_sync_state SET revision=revision+1 WHERE organization_id=$1 RETURNING revision',[row.organization_id])).rows[0].revision;
   // Native feed only invalidates the project; customer names/messages stay manager-private.
   await c.query("INSERT INTO sync_changes(organization_id,revision,ordinal,entity,operation,project_id,payload) VALUES($1,$2,1,'project','upsert',$3,$4)",[row.organization_id,rev,p.id,p]);
   await c.query("INSERT INTO customer_audit_records(id,organization_id,project_id,revision,share_id,decision_id,report_id,sha256,action) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'customer.decision')",[randomUUID(),row.organization_id,p.id,rev,id,d.id,row.report_id,input.sha256]);
   await c.query('INSERT INTO customer_command_receipts(share_id,idempotency_key,request_hash,response) VALUES($1,$2,$3,$4)',[id,key,hash,d]);
   await active(c,id);return d;
  }),
 };
}
