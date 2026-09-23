import type {FastifyInstance} from 'fastify';
import type {Pool} from 'pg';
import {AccessError,type ShareInput,type DecisionInput} from '@handovertrack/backend';
import {createSharing} from '@handovertrack/platform/sharing';
import type {ReportFiles} from '@handovertrack/platform/reports';
const uuid={type:'string',format:'uuid'};
const obj=(properties:Record<string,unknown>)=>({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
const headers={type:'object',required:['idempotency-key'],properties:{'idempotency-key':{type:'string',minLength:8,maxLength:128}}};
export function registerSharing(app:FastifyInstance,pool:Pool,files:ReportFiles,accountFor:(headers:Record<string,string|string[]|undefined>)=>Promise<{id:string}>,webOrigin:string,secret:string){
 const service=createSharing(pool,files,secret),prefix='/v1/organizations/:organizationId/projects/:projectId/reports/:reportId';
 type Params={organizationId:string;projectId:string;reportId:string;shareId:string};
 const params=obj({organizationId:uuid,projectId:uuid,reportId:uuid});
 const key=(h:Record<string,unknown>)=>{if(h.origin!==webOrigin)throw new AccessError('FORBIDDEN_ORIGIN',403);return h['idempotency-key'] as string;};
 app.get<{Params:Params}>(prefix+'/sharing',{schema:{params}},async r=>service.list((await accountFor(r.headers)).id,r.params.organizationId,r.params.projectId,r.params.reportId));
 app.post<{Params:Params;Body:ShareInput}>(prefix+'/shares',{bodyLimit:1024,schema:{params,headers,body:obj({expiresAt:{type:'string',format:'date-time'}})}},async r=>service.create((await accountFor(r.headers)).id,r.params.organizationId,r.params.projectId,r.params.reportId,r.body,key(r.headers)));
 app.post<{Params:Params}>(prefix+'/shares/:shareId/revoke',{schema:{params:obj({...params.properties,shareId:uuid}),headers}},async r=>service.revoke((await accountFor(r.headers)).id,r.params.organizationId,r.params.projectId,r.params.reportId,r.params.shareId,key(r.headers)));
 app.post<{Params:Params;Body:{decisionId:string;note:string}}>(prefix+'/review',{bodyLimit:16384,schema:{params,headers,body:obj({decisionId:uuid,note:{type:'string',maxLength:2000}})}},async r=>service.review((await accountFor(r.headers)).id,r.params.organizationId,r.params.projectId,r.params.reportId,r.body.decisionId,r.body.note,key(r.headers)));
 app.register(async guest=>{
  guest.addHook('onRequest',async(r,reply)=>{
   reply.header('referrer-policy','no-referrer').header('x-content-type-options','nosniff');
   // Never trust caller-supplied forwarding headers. The BFF shares a conservative
   // proxy-IP budget; fixed slots also bound unauthenticated random-ID traffic.
   await service.rate(r.ip,r.method==='POST');
  });
  const token=(h:Record<string,string|string[]|undefined>)=>typeof h.authorization==='string'&&h.authorization.startsWith('Bearer ')?h.authorization.slice(7):'';
  const guestParams=obj({shareId:uuid}),querystring=obj({});
  guest.get<{Params:{shareId:string}}>('/guest/v1/shares/:shareId',{schema:{params:guestParams,querystring}},r=>service.read(r.params.shareId,token(r.headers)));
  let downloads=0;
  guest.get<{Params:{shareId:string}}>('/guest/v1/shares/:shareId/pdf',{schema:{params:guestParams,querystring}},async(r,reply)=>{
   if(downloads>=2)throw new AccessError('RATE_LIMITED',429);downloads++;let released=false;const release=()=>{if(!released){released=true;downloads--;}};reply.raw.once('close',release);reply.raw.once('finish',release);
   try{const result=await service.pdf(r.params.shareId,token(r.headers));return reply.type('application/pdf').header('content-disposition',`attachment; filename="handover-r${result.report.revision}.pdf"`).send(result.bytes);}catch(e){release();throw e;}
  });
  guest.post<{Params:{shareId:string};Body:DecisionInput}>('/guest/v1/shares/:shareId/decisions',{bodyLimit:16384,schema:{params:guestParams,querystring,headers,body:obj({reportId:uuid,sha256:{type:'string',pattern:'^[0-9a-f]{64}$'},kind:{enum:['accept','correction']},claimedName:{type:'string',minLength:1,maxLength:120},message:{type:'string',maxLength:2000},confirmed:{const:true}})}},r=>service.decide(r.params.shareId,token(r.headers),r.body,key(r.headers)));
 });
}
