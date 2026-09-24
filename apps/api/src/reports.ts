import type {FastifyInstance} from 'fastify';
import type {Pool} from 'pg';
import {AccessError,type CompositionInput,type ReportInput} from '@handovertrack/backend';
import {createProofReports,ReportFiles,downloadReport} from '@handovertrack/platform/reports';
const uuid={type:'string',format:'uuid'},version={type:'integer',minimum:0};
const text=(maxLength:number)=>({type:'string',maxLength});
const obj=(properties:Record<string,unknown>)=>({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
const array=(items:unknown,maxItems:number)=>({type:'array',items,maxItems});
const composition=obj({baseVersion:version,notes:array(obj({id:uuid,text:text(8000),visibility:{enum:['report','internal']}}),20),annotations:array(obj({mediaId:uuid,marks:array(obj({x:{type:'number',minimum:0,maximum:1},y:{type:'number',minimum:0,maximum:1},width:{type:'number',exclusiveMinimum:0,maximum:1},height:{type:'number',exclusiveMinimum:0,maximum:1},label:text(200)}),10)}),40),pairs:array(obj({id:uuid,beforeId:uuid,afterId:uuid,caption:text(1000)}),20)});
export function registerReports(app:FastifyInstance,pool:Pool,files:ReportFiles,accountFor:(headers:Record<string,string|string[]|undefined>)=>Promise<{id:string}>,webOrigin:string){
 const service=createProofReports(pool),prefix='/v1/organizations/:organizationId/projects/:projectId',params=obj({organizationId:uuid,projectId:uuid}),reportParams=obj({organizationId:uuid,projectId:uuid,reportId:uuid});
 type Params={organizationId:string;projectId:string;reportId:string};
 const headers={type:'object',required:['idempotency-key'],properties:{'idempotency-key':{type:'string',minLength:8,maxLength:128}}};
 const key=(h:Record<string,unknown>)=>{if(h.origin!==webOrigin)throw new AccessError('FORBIDDEN_ORIGIN',403);return h['idempotency-key'] as string;};
 app.get<{Params:Params}>(prefix+'/proof',{schema:{params}},async r=>service.read((await accountFor(r.headers)).id,r.params.organizationId,r.params.projectId));
 app.post<{Params:Params;Body:CompositionInput}>(prefix+'/proof',{bodyLimit:524288,schema:{params,headers,body:composition}},async r=>service.save((await accountFor(r.headers)).id,r.params.organizationId,r.params.projectId,r.body,key(r.headers)));
 app.post<{Params:Params;Body:ReportInput}>(prefix+'/reports',{schema:{params,headers,body:obj({projectVersion:{type:'integer',minimum:1},checklistVersion:{type:'integer',minimum:1},compositionVersion:version,mediaIds:{...array(uuid,40),uniqueItems:true}})}},async r=>service.request((await accountFor(r.headers)).id,r.params.organizationId,r.params.projectId,r.body,key(r.headers)));
 app.get<{Params:Params}>(prefix+'/reports/:reportId',{schema:{params:reportParams}},async r=>service.status((await accountFor(r.headers)).id,r.params.organizationId,r.params.projectId,r.params.reportId));
 app.post<{Params:Params}>(prefix+'/reports/:reportId/retry',{schema:{params:reportParams,headers}},async r=>service.retry((await accountFor(r.headers)).id,r.params.organizationId,r.params.projectId,r.params.reportId,key(r.headers)));
 app.get<{Params:Params}>(prefix+'/reports/:reportId/pdf',{schema:{params:reportParams}},async(r,reply)=>{
  const result=await downloadReport(pool,files,(await accountFor(r.headers)).id,r.params.organizationId,r.params.projectId,r.params.reportId);
  return reply.type('application/pdf').header('content-disposition',`attachment; filename="handover-${r.params.reportId}.pdf"`).header('x-content-type-options','nosniff').header('etag','"'+result.status.sha256+'"').send(result.bytes);
 });
}
