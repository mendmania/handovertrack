import { ApiError, type ChecklistCommand, type ChecklistResult, type ChecklistRun, type Scope } from '@handovertrack/contracts';
import type { SnapshotStore, SqlConnection } from '../db/store';
import { assertChecklistRun } from './validation';
export type AnswerCommand = Extract<ChecklistCommand,{kind:'answer'}>;
export interface OutboxRow { sequence:number; id:string; account_id:string; organization_id:string; project_id:string; run_id:string; question_id:string; payload:string; state:'pending'|'accepted'|'conflict'|'blocked'|'resolved'; result:string|null; reason:string|null }
const owner = (scope: Scope) => [scope.accountId,scope.organizationId];
export class ChecklistStore {
  constructor(readonly store: SnapshotStore) {}
  async run(scope: Scope, project: string): Promise<ChecklistRun | null> {
    return this.store.read(async c => {
      const row = await c.getFirstAsync<{payload:string}>('SELECT c.payload FROM cached_checklists c JOIN cached_projects p ON p.account_id=c.account_id AND p.organization_id=c.organization_id AND p.id=c.project_id WHERE c.account_id=? AND c.organization_id=? AND c.project_id=?',...owner(scope),project);
      return row ? JSON.parse(row.payload) as ChecklistRun : null;
    });
  }
  rows(scope: Scope, project?: string) {
    return this.store.read(c => c.getAllAsync<OutboxRow>(`SELECT * FROM checklist_outbox WHERE account_id=? AND organization_id=? ${project ? 'AND project_id=?' : ''} ORDER BY sequence`,...owner(scope),...(project ? [project] : [])));
  }
  private async revision(c: SqlConnection, scope: Scope) { await c.runAsync('UPDATE cache_scopes SET revision=revision+1 WHERE account_id=? AND organization_id=?',...owner(scope)); }
  // ID and payload are frozen in the same transaction as the displayed local answer.
  async enqueue(scope: Scope, project: string, id: string, value: AnswerCommand, current: () => void, resolveId?: string) {
    const frozen = JSON.stringify(value);
    value = JSON.parse(frozen) as AnswerCommand; scope = { ...scope };
    await this.store.write(async c => {
      current();
      const p = await c.getFirstAsync<{status:string}>('SELECT status FROM cached_projects WHERE account_id=? AND organization_id=? AND id=?',...owner(scope),project);
      const row = await c.getFirstAsync<{payload:string}>('SELECT payload FROM cached_checklists WHERE account_id=? AND organization_id=? AND project_id=?',...owner(scope),project);
      const run = row ? JSON.parse(row.payload) as ChecklistRun : null;
      if (!p || p.status === 'complete' || !run || run.id !== value.runId || !run.questions.some(q => q.id === value.questionId)) throw new Error('Project/checklist access unavailable');
      if (value.text.length > 4000 || value.mediaIds.length > 10 || new Set(value.mediaIds).size !== value.mediaIds.length) throw new Error('Invalid answer');
      const pending = await c.getAllAsync<OutboxRow>("SELECT * FROM checklist_outbox WHERE account_id=? AND organization_id=? AND run_id=? AND question_id=? AND state IN ('pending','conflict','blocked') ORDER BY sequence",...owner(scope),value.runId,value.questionId);
      if (resolveId) {
        if (!pending.some(r => r.id === resolveId && ['conflict','blocked'].includes(r.state))) throw new Error('Conflict changed; review again');
        // Deliberate resolution supersedes the whole dependent chain, retaining every payload/result.
        await c.runAsync("UPDATE checklist_outbox SET state='resolved' WHERE account_id=? AND organization_id=? AND run_id=? AND question_id=? AND state IN ('pending','conflict','blocked')",...owner(scope),value.runId,value.questionId);
      } else {
        if (pending.some(r => r.state !== 'pending')) throw new Error('Resolve the existing conflict first');
        const last = pending.at(-1);
        const expected = last ? (JSON.parse(last.payload) as AnswerCommand).baseVersion+1 : run.answers.find(a => a.questionId === value.questionId)?.version ?? 0;
        if (!Number.isInteger(value.baseVersion) || value.baseVersion < 0 || (last ? value.baseVersion !== expected : value.baseVersion > expected)) throw new Error('Local answer changed; review again');
      }
      await c.runAsync('INSERT INTO checklist_local_answers(account_id,organization_id,project_id,run_id,question_id,payload) VALUES(?,?,?,?,?,?) ON CONFLICT(account_id,organization_id,run_id,question_id) DO UPDATE SET payload=excluded.payload',...owner(scope),project,value.runId,value.questionId,frozen);
      await c.runAsync("INSERT INTO checklist_outbox(id,account_id,organization_id,project_id,run_id,question_id,payload,state,created_at) VALUES(?,?,?,?,?,?,?,'pending',?)",id,...owner(scope),project,value.runId,value.questionId,frozen,new Date().toISOString());
      await this.revision(c,scope); current();
    });
  }
  async ready(scope: Scope): Promise<OutboxRow[]> {
    const rows = await this.rows(scope); const blocked = new Set<string>(); const result: OutboxRow[] = [];
    for (const row of rows) {
      if (row.state === 'accepted' || row.state === 'resolved') continue;
      const entity = `${row.run_id}:${row.question_id}`;
      if (blocked.has(entity)) continue; blocked.add(entity);
      if (row.state !== 'pending') continue;
      try { await this.store.detail(scope,row.project_id); } catch { continue; }
      const value = JSON.parse(row.payload) as AnswerCommand;
      const waiting = await this.store.read(async c => {
        for (const id of value.mediaIds) {
          const media = await c.getFirstAsync<{state:string}>(`SELECT q.state FROM media_local m LEFT JOIN media_queue q ON q.media_id=m.id AND q.account_id=m.account_id AND q.organization_id=m.organization_id WHERE m.id=? AND m.account_id=? AND m.organization_id=?`,id,...owner(scope));
          if (media && !['server_accepted','completed'].includes(media.state)) return true;
        }
        return false;
      });
      if (!waiting) result.push(row);
      if (result.length === 30) break;
    }
    return result;
  }
  async record(scope: Scope, row: OutboxRow, result: ChecklistResult, current: () => void) {
    assertChecklistRun(result.run,scope,row.project_id);
    const command = JSON.parse(row.payload) as AnswerCommand;
    if (row.account_id !== scope.accountId || row.organization_id !== scope.organizationId || result.run.id !== row.run_id || !['applied','conflict'].includes(result.outcome)) throw new Error('Invalid command receipt');
    if (result.outcome === 'conflict' && JSON.stringify(result.current) !== JSON.stringify(result.run.answers.find(a => a.questionId === row.question_id))) throw new Error('Mismatched conflict receipt');
    if (result.outcome === 'applied') {
      const a = result.run.answers.find(a => a.questionId === row.question_id);
      if (!a || a.version !== command.baseVersion+1 || a.text !== command.text || JSON.stringify(a.mediaIds) !== JSON.stringify(command.mediaIds) || a.updatedBy !== scope.accountId) throw new Error('Mismatched command receipt');
    }
    await this.store.write(async c => {
      current();
      await c.runAsync("UPDATE checklist_outbox SET state=?,result=?,reason=NULL WHERE id=? AND account_id=? AND organization_id=? AND state='pending'",result.outcome === 'applied' ? 'accepted' : 'conflict',JSON.stringify(result),row.id,...owner(scope));
      await this.store.upsertChecklist(c,scope,result.run); await this.revision(c,scope); current();
    });
  }
  async block(scope: Scope, row: OutboxRow, reason: string, current: () => void) {
    await this.store.write(async c => { current(); await c.runAsync("UPDATE checklist_outbox SET state='blocked',reason=? WHERE id=? AND account_id=? AND organization_id=? AND state='pending'",reason,row.id,...owner(scope)); await this.revision(c,scope); current(); });
  }
  async retry(scope: Scope, current: () => void) {
    await this.store.write(async c => { current(); await c.runAsync("UPDATE checklist_outbox SET state='pending',reason=NULL WHERE account_id=? AND organization_id=? AND state='blocked'",...owner(scope)); await this.revision(c,scope); current(); });
  }
}
export interface ChecklistTransport {
  me(signal: AbortSignal): Promise<{accountId:string;memberships:{organizationId:string}[]}>;
  checklistCommand(scope: Scope, project: string, value: ChecklistCommand, id: string, signal: AbortSignal): Promise<ChecklistResult>;
}
export class ChecklistExecutor {
  private running = false;
  constructor(private store: ChecklistStore, private committed: (scope: Scope) => Promise<void>) {}
  async run(scope: Scope, transport: ChecklistTransport, signal: AbortSignal, current: () => void) {
    if (this.running) return; this.running = true;
    const check = () => { current(); if (signal.aborted) throw new Error('Dispatch cancelled'); };
    try {
      check(); const me = await transport.me(signal); check();
      if (me.accountId !== scope.accountId || !me.memberships.some(m => m.organizationId === scope.organizationId)) throw new Error('Original owner authorization required');
      // Heads only: a dependent command is eligible on the following pass after its predecessor commits.
      for (const row of await this.store.ready(scope)) {
        check();
        try { const result = await transport.checklistCommand(scope,row.project_id,JSON.parse(row.payload) as AnswerCommand,row.id,signal); check(); await this.store.record(scope,row,result,check); }
        catch (error) {
          check();
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) await this.store.block(scope,row,error.code,check);
          else throw error; // Unknown delivery: leave the exact command pending for idempotent replay.
        }
        check(); await this.committed(scope);
      }
    } finally { this.running = false; }
  }
}
