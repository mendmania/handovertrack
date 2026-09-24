import type { FastifyInstance } from 'fastify';
import type { Checklists, ChecklistCommand, TemplateInput } from '@handovertrack/backend';
import { AccessError } from '@handovertrack/backend';
const uuid = { type:'string',format:'uuid' };
const integer = { type:'integer',minimum:0 };
const question = { type:'object',additionalProperties:false,required:['id','label','required','minPhotos'],properties:{ id:uuid,label:{ type:'string',minLength:1,maxLength:300 },required:{ type:'boolean' },minPhotos:{ type:'integer',minimum:0,maximum:10 } } };
const obj = (properties: Record<string,unknown>) => ({ type:'object',additionalProperties:false,required:Object.keys(properties),properties });
export function registerChecklists(app: FastifyInstance, service: Checklists, accountFor: (headers: Record<string, string | string[] | undefined>) => Promise<{ id: string }>, webOrigin: string) {
  const org = '/v1/organizations/:organizationId';
  const params = obj({ organizationId:uuid }); const projectParams = obj({ organizationId:uuid,projectId:uuid });
  const headers = { type:'object',required:['idempotency-key'],properties:{ 'idempotency-key':{ type:'string',minLength:8,maxLength:128 } } };
  const key = (h: Record<string,unknown>) => {
    // Same native Origin policy as authenticated media commands.
    if (h.origin !== webOrigin && !(h.origin === undefined && h['expo-origin'] === 'handovertrack://')) throw new AccessError('FORBIDDEN_ORIGIN',403);
    return h['idempotency-key'] as string;
  };
  app.get<{ Params:{ organizationId:string } }>(`${org}/checklist-templates`,{ schema:{ params } },async req => ({ templates:await service.templates((await accountFor(req.headers)).id,req.params.organizationId) }));
  app.post<{ Params:{ organizationId:string }; Body:TemplateInput }>(`${org}/checklist-templates`,{ bodyLimit:65536,schema:{ params,headers,body:obj({ id:uuid,baseVersion:integer,title:{ type:'string',minLength:1,maxLength:200 },questions:{ type:'array',minItems:1,maxItems:30,items:question } }) } },async req => { const k=key(req.headers); return service.publish((await accountFor(req.headers)).id,req.params.organizationId,req.body,k); });
  app.get<{ Params:{ organizationId:string;projectId:string } }>(`${org}/projects/:projectId/checklist`,{ schema:{ params:projectParams } },async req => service.read((await accountFor(req.headers)).id,req.params.organizationId,req.params.projectId));
  app.post<{ Params:{ organizationId:string;projectId:string }; Body:ChecklistCommand }>(`${org}/projects/:projectId/checklist`,{ bodyLimit:65536,schema:{ params:projectParams,headers,body:{ oneOf:[
    obj({ kind:{ const:'start' },id:uuid,templateId:uuid,templateVersion:{ type:'integer',minimum:1 },baseVersion:integer }),
    obj({ kind:{ const:'answer' },runId:uuid,questionId:uuid,text:{ type:'string',maxLength:4000 },mediaIds:{ type:'array',maxItems:10,uniqueItems:true,items:uuid },baseVersion:integer }),
    obj({ kind:{ const:'complete' },runId:uuid,baseVersion:integer }),
  ] } } },async req => { const k=key(req.headers); return service.command((await accountFor(req.headers)).id,req.params.organizationId,req.params.projectId,req.body,k); });
}
