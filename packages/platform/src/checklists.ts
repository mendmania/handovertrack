import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { AccessError, validQuestions, type Checklists, type ChecklistRun, type ChecklistTemplate, type ChecklistAnswer, type ChecklistResult } from '@handovertrack/backend';

const templateColumns = 'id,organization_id AS "organizationId",version,title,questions';
const runColumns = 'id,organization_id AS "organizationId",project_id AS "projectId",template_id AS "templateId",template_version AS "templateVersion",title,questions,answers,version';
export async function checklistFor(c: PoolClient, org: string, project: string): Promise<ChecklistRun | null> {
  return (await c.query<ChecklistRun>(`SELECT ${runColumns} FROM checklist_runs WHERE organization_id=$1 AND project_id=$2`, [org,project])).rows[0] ?? null;
}
export async function requireCompletion(c: PoolClient, org: string, project: string) {
  if (!(await c.query<{ valid: boolean }>('SELECT checklist_complete($1,$2) AS valid',[org,project])).rows[0]?.valid) throw new AccessError('COMPLETION_REQUIRED',422);
}
export function createChecklists(pool: Pool): Checklists {
  async function transaction<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await pool.connect();
    try { await c.query('BEGIN'); const result = await fn(c); await c.query('COMMIT'); return result; }
    catch (error) { await c.query('ROLLBACK'); throw error; } finally { c.release(); }
  }
  async function authorize(c: PoolClient, actor: string, org: string, project?: string, manager = false) {
    const m = (await c.query<{ role: string }>('SELECT role FROM lock_membership($1,$2)',[org,actor])).rows[0];
    if (!m || (manager && m.role !== 'manager')) throw new AccessError('NOT_FOUND',404);
    if (project) {
      const p = (await c.query<{ status: string; version: number }>(`SELECT status,version FROM projects WHERE organization_id=$1 AND id=$2 FOR UPDATE`,[org,project])).rows[0];
      if (!p || (m.role !== 'manager' && !(await c.query('SELECT 1 FROM assignments WHERE organization_id=$1 AND project_id=$2 AND account_id=$3 AND active FOR SHARE',[org,project,actor])).rowCount)) throw new AccessError('NOT_FOUND',404);
      return { ...p, role: m.role };
    }
    return { role: m.role, status: '', version: 0 };
  }
  // Shared with project writes: membership -> organization publication lock -> project.
  async function lock(c: PoolClient, actor: string, org: string, manager: boolean) {
    await authorize(c,actor,org,undefined,manager);
    await c.query('INSERT INTO organization_sync_state(organization_id) VALUES($1) ON CONFLICT DO NOTHING',[org]);
    await c.query('SELECT revision FROM organization_sync_state WHERE organization_id=$1 FOR UPDATE',[org]);
  }
  async function receipt<T>(c: PoolClient, actor: string, org: string, key: string, operation: string, input: unknown): Promise<{ hash: string; response?: T }> {
    if (typeof key !== 'string' || key.length < 8 || key.length > 128) throw new AccessError('INVALID_REQUEST',400);
    const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const old = (await c.query<{ request_hash: string; response: T }>('SELECT request_hash,response FROM command_receipts WHERE organization_id=$1 AND actor_account_id=$2 AND operation=$3 AND idempotency_key=$4',[org,actor,operation,key])).rows[0];
    if (old && old.request_hash !== hash) throw new AccessError('IDEMPOTENCY_CONFLICT',409);
    return { hash, ...(old ? { response: old.response } : {}) };
  }
  async function saveReceipt(c: PoolClient, actor: string, org: string, key: string, operation: string, hash: string, response: unknown) {
    await c.query('INSERT INTO command_receipts(organization_id,actor_account_id,operation,idempotency_key,request_hash,response) VALUES($1,$2,$3,$4,$5,$6)',[org,actor,operation,key,hash,response]);
  }
  async function publish(c: PoolClient, actor: string, org: string, project: string, action: string, entity: string, before: unknown, after: unknown) {
    const revision = (await c.query<{ revision: string }>('UPDATE organization_sync_state SET revision=revision+1 WHERE organization_id=$1 RETURNING revision',[org])).rows[0]!.revision;
    await c.query('INSERT INTO sync_changes(organization_id,revision,ordinal,entity,operation,project_id,payload) VALUES($1,$2,1,$3,\'upsert\',$4,$5)',[org,revision,entity,project,after]);
    await c.query('INSERT INTO audit_records(id,organization_id,actor_account_id,action,project_id,revision,before_state,after_state) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),org,actor,action,project,revision,before,after]);
  }
  return {
    templates: (actor,org) => transaction(async c => {
      await authorize(c,actor,org,undefined,true);
      const rows = (await c.query<ChecklistTemplate>(`SELECT ${templateColumns} FROM checklist_templates WHERE organization_id=$1 ORDER BY id,version DESC LIMIT 501`,[org])).rows;
      if (rows.length > 500) throw new AccessError('SNAPSHOT_TOO_LARGE',413); return rows;
    }),
    publish: (actor,org,input,key) => transaction(async c => {
      await lock(c,actor,org,true);
      const normalized = { id: input.id, baseVersion: input.baseVersion, title: input.title, questions: input.questions.map(q => ({ id:q.id,label:q.label,required:q.required,minPhotos:q.minPhotos })) };
      if (!validQuestions(input.questions) || !input.title.trim() || input.title.length > 200 || !Number.isInteger(input.baseVersion) || input.baseVersion < 0) throw new AccessError('INVALID_REQUEST',400);
      const { hash,response } = await receipt<ChecklistTemplate>(c,actor,org,key,'checklist.template',normalized); if (response) return response;
      const old = (await c.query<ChecklistTemplate>(`SELECT ${templateColumns} FROM checklist_templates WHERE organization_id=$1 AND id=$2 ORDER BY version DESC LIMIT 1`,[org,input.id])).rows[0];
      if ((old?.version ?? 0) !== input.baseVersion) throw new AccessError('VERSION_CONFLICT',409,old);
      const result = (await c.query<ChecklistTemplate>(`INSERT INTO checklist_templates(organization_id,id,version,title,questions) VALUES($1,$2,$3,$4,$5) RETURNING ${templateColumns}`,[org,input.id,input.baseVersion+1,input.title,JSON.stringify(normalized.questions)])).rows[0]!;
      await publish(c,actor,org,input.id,'checklist.template','template',old ?? null,result);
      await saveReceipt(c,actor,org,key,'checklist.template',hash,result); return result;
    }),
    read: (actor,org,project) => transaction(async c => { await authorize(c,actor,org,project); return { run: await checklistFor(c,org,project) }; }),
    command: (actor,org,project,input,key) => transaction(async c => {
      const manager = input.kind !== 'answer';
      await lock(c,actor,org,manager);
      const access = await authorize(c,actor,org,project,manager);
      const normalized = input.kind === 'answer' ? { kind:input.kind,runId:input.runId,questionId:input.questionId,text:input.text,mediaIds:input.mediaIds,baseVersion:input.baseVersion }
        : input.kind === 'start' ? { kind:input.kind,id:input.id,templateId:input.templateId,templateVersion:input.templateVersion,baseVersion:input.baseVersion }
        : { kind:input.kind,runId:input.runId,baseVersion:input.baseVersion };
      const { hash,response } = await receipt<ChecklistResult>(c,actor,org,key,'checklist.command',{ project, ...normalized }); if (response) return response;
      let run = await checklistFor(c,org,project); const before = run;
      let result: ChecklistResult;
      if (input.kind === 'start') {
        if (run) throw new AccessError('VERSION_CONFLICT',409,run);
        if (access.status === 'complete') throw new AccessError('PROJECT_COMPLETE',409);
        if (input.baseVersion !== access.version) throw new AccessError('VERSION_CONFLICT',409);
        const t = (await c.query<ChecklistTemplate>(`SELECT ${templateColumns} FROM checklist_templates WHERE organization_id=$1 AND id=$2 AND version=$3`,[org,input.templateId,input.templateVersion])).rows[0];
        if (!t) throw new AccessError('NOT_FOUND',404);
        await c.query('INSERT INTO checklist_runs(organization_id,project_id,id,template_id,template_version,title,questions) VALUES($1,$2,$3,$4,$5,$6,$7)',[org,project,input.id,t.id,t.version,t.title,JSON.stringify(t.questions)]);
        run = (await checklistFor(c,org,project))!; result = { outcome:'applied',run };
      } else {
        if (!run || run.id !== input.runId) throw new AccessError('NOT_FOUND',404);
        if (input.kind === 'complete') {
          if (input.baseVersion !== access.version) throw new AccessError('VERSION_CONFLICT',409);
          await requireCompletion(c,org,project);
          const p = (await c.query('UPDATE projects SET status=\'complete\',version=version+1,updated_at=clock_timestamp() WHERE organization_id=$1 AND id=$2 RETURNING id,organization_id AS "organizationId",name,description,address,status,version,updated_at AS "updatedAt"',[org,project])).rows[0]!;
          await publish(c,actor,org,project,'checklist.complete','project',{ version: access.version,status:access.status },p);
          result = { outcome:'applied',run,projectVersion:p.version as number };
          await saveReceipt(c,actor,org,key,'checklist.command',hash,result); return result;
        }
        if (!run.questions.some(q => q.id === input.questionId) || typeof input.text !== 'string' || input.text.length > 4000 || !Array.isArray(input.mediaIds) || input.mediaIds.length > 10 || new Set(input.mediaIds).size !== input.mediaIds.length || !Number.isInteger(input.baseVersion) || input.baseVersion < 0) throw new AccessError('INVALID_REQUEST',400);
        const current = run.answers.find(a => a.questionId === input.questionId);
        if ((current?.version ?? 0) !== input.baseVersion) {
          // A lost conflict response is replayed exactly, even if the server subsequently changes.
          result = { outcome:'conflict',run,...(current ? { current } : {}) };
          await saveReceipt(c,actor,org,key,'checklist.command',hash,result); return result;
        }
        if (access.status === 'complete') throw new AccessError('PROJECT_COMPLETE',409);
        const evidence = await c.query(`SELECT m.id FROM media_uploads m JOIN media_events e ON e.media_id=m.id AND e.event='accepted' AND e.version=1 WHERE m.id=ANY($1::uuid[]) AND m.organization_id=$2 AND m.project_id=$3 AND m.state='accepted' AND m.accepted_at IS NOT NULL AND ($4::boolean OR m.account_id=$5 OR m.id=ANY($6::uuid[]))`,[input.mediaIds,org,project,access.role==='manager',actor,current?.mediaIds ?? []]);
        if (evidence.rowCount !== input.mediaIds.length) throw new AccessError('INVALID_REQUEST',422);
        const answer: ChecklistAnswer = { questionId:input.questionId,text:input.text,mediaIds:[...input.mediaIds],version:input.baseVersion+1,updatedBy:actor };
        const answers = [...run.answers.filter(a => a.questionId !== input.questionId),answer];
        await c.query('UPDATE checklist_runs SET answers=$3,version=version+1 WHERE organization_id=$1 AND project_id=$2',[org,project,JSON.stringify(answers)]);
        run = (await checklistFor(c,org,project))!; result = { outcome:'applied',run };
      }
      await publish(c,actor,org,project,`checklist.${input.kind}`,'checklist',before,run);
      await saveReceipt(c,actor,org,key,'checklist.command',hash,result); return result;
    }),
  };
}
