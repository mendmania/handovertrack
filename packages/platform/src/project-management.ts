import { checklistFor, requireCompletion } from './checklists';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { AccessError, SNAPSHOT_CAP, type ChecklistRun, type ChecklistTemplate, type Assignment, type Project, type ProjectInput, type ProjectManagement, type Role, type SyncChange } from '@handovertrack/backend';

interface ProjectRow { id: string; organization_id: string; name: string; description: string; address: string; status: 'active' | 'complete'; version: number; updated_at: Date }
interface AssignmentRow { organization_id: string; project_id: string; account_id: string; active: boolean; version: number; updated_at: Date }
interface MembershipRow { role: Role; created_at: Date }
interface FeedRow { revision: string; ordinal: number; entity: 'project' | 'assignment' | 'checklist' | 'template'; operation: 'upsert' | 'remove'; project_id: string; account_id: string | null; payload: Project | Assignment | ChecklistRun | ChecklistTemplate | null }
interface Cursor { v: 1; a: string; o: string; e: string; r: string; n: number; exp: number }
const END_ORDINAL = 2147483647;
export const CURSOR_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const projectDto = (p: ProjectRow): Project => ({ id: p.id, organizationId: p.organization_id, name: p.name, description: p.description, address: p.address, status: p.status, version: p.version, updatedAt: p.updated_at.toISOString() });
const assignmentDto = (a: AssignmentRow): Assignment => ({ organizationId: a.organization_id, projectId: a.project_id, accountId: a.account_id, active: a.active, version: a.version, updatedAt: a.updated_at.toISOString() });
const epoch = (m: MembershipRow) => createHash('sha256').update(`${m.role}:${m.created_at.toISOString()}`).digest('base64url');

// Publication lock is acquired BEFORE any business mutation and held through
// COMMIT. A later revision cannot become visible while an earlier one is open.
export function createProjectManagement(pool: Pool, secret: string, now: () => number = Date.now): ProjectManagement {
  const mac = (payload: string) => createHmac('sha256', secret).update('handovertrack:sync-cursor:v1:').update(payload).digest();
  const encode = (cursor: Cursor) => { const payload = Buffer.from(JSON.stringify(cursor)).toString('base64url'); return `${payload}.${mac(payload).toString('base64url')}`; };
  function decode(value: string, actor: string, organization: string, membership: MembershipRow, floor: string, head: string): Cursor {
    try {
      const parts = value.split('.');
      if (parts.length !== 2 || value.length > 2048) throw new Error();
      const payload = parts[0]!; const signature = Buffer.from(parts[1]!, 'base64url'); const expected = mac(payload);
      if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) throw new Error();
      const c = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Cursor;
      if (c.v !== 1 || c.a !== actor || c.o !== organization || typeof c.r !== 'string' || !/^\d+$/.test(c.r) || !Number.isInteger(c.n) || c.n < 0 || c.n > END_ORDINAL || !Number.isSafeInteger(c.exp) || BigInt(c.r) > BigInt(head)) throw new Error();
      if (c.e !== epoch(membership)) throw new AccessError('ACCESS_CHANGED', 403);
      if (c.exp <= now() || BigInt(c.r) < BigInt(floor)) throw new AccessError('CURSOR_EXPIRED', 410);
      return c;
    } catch (error) { if (error instanceof AccessError) throw error; throw new AccessError('INVALID_CURSOR', 400); }
  }
  async function transaction<T>(run: (client: PoolClient) => Promise<T>, readOnly = false): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query(readOnly ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN');
      const result = await run(client); await client.query('COMMIT'); return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async function member(c: PoolClient, actor: string, org: string, manager = false): Promise<MembershipRow> {
    const m = (await c.query<MembershipRow>(manager ? 'SELECT role,created_at FROM lock_membership($1,$2)' : 'SELECT role,created_at FROM memberships WHERE organization_id=$1 AND account_id=$2', [org, actor])).rows[0];
    if (!m || (manager && m.role !== 'manager')) throw new AccessError('NOT_FOUND', 404);
    return m;
  }
  async function authorizedProjects(c: PoolClient, actor: string, org: string, limit: number): Promise<Project[]> {
    const rows = await c.query<ProjectRow>(`SELECT p.* FROM projects p JOIN memberships m ON m.organization_id=p.organization_id AND m.account_id=$2
      WHERE p.organization_id=$1 AND (m.role='manager' OR EXISTS (SELECT 1 FROM assignments a WHERE a.organization_id=p.organization_id AND a.project_id=p.id AND a.account_id=$2 AND a.active)) ORDER BY p.name,p.id LIMIT $3`, [org, actor, limit]);
    return rows.rows.map(projectDto);
  }
  async function command<T extends Project | Assignment>(actor: string, org: string, key: string, operation: string, input: unknown,
    change: (c: PoolClient) => Promise<{ result: T; before: Project | Assignment | null; projectId: string; accountId?: string; events: Omit<SyncChange, 'revision' | 'ordinal'>[] }>): Promise<T> {
    if (key.length < 8 || key.length > 128) throw new AccessError('INVALID_REQUEST', 400);
    const hash = createHash('sha256').update(JSON.stringify({ operation, input })).digest('hex');
    return transaction(async (c) => {
      // Check membership before creating the lock row, then recheck under lock.
      await member(c, actor, org, true);
      await c.query('INSERT INTO organization_sync_state(organization_id) VALUES($1) ON CONFLICT DO NOTHING', [org]);
      await c.query('SELECT revision FROM organization_sync_state WHERE organization_id=$1 FOR UPDATE', [org]);
      await member(c, actor, org, true);
      const receipt = (await c.query<{ request_hash: string; response: T }>("SELECT request_hash,response FROM command_receipts WHERE organization_id=$1 AND actor_account_id=$2 AND idempotency_key=$3 AND operation IN ($4,'legacy') ORDER BY operation=$4 DESC LIMIT 1", [org, actor, key, operation])).rows[0];
      if (receipt) { if (receipt.request_hash !== hash) throw new AccessError('IDEMPOTENCY_CONFLICT', 409); return receipt.response; }
      const { result, before, projectId, accountId, events } = await change(c);
      const revision = (await c.query<{ revision: string }>('UPDATE organization_sync_state SET revision=revision+1 WHERE organization_id=$1 RETURNING revision', [org])).rows[0]!.revision;
      for (let index = 0; index < events.length; index++) {
        const event = events[index]!;
        await c.query('INSERT INTO sync_changes(organization_id,revision,ordinal,entity,operation,project_id,account_id,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [org, revision, index + 1, event.entity, event.operation, event.projectId, event.accountId ?? null, event.project ?? event.assignment ?? event.checklist ?? event.template ?? null]);
      }
      await c.query('INSERT INTO audit_records(id,organization_id,actor_account_id,action,project_id,account_id,revision,before_state,after_state) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [randomUUID(), org, actor, operation, projectId, accountId ?? null, revision, before, result]);
      await c.query('INSERT INTO command_receipts(organization_id,actor_account_id,idempotency_key,request_hash,response,operation) VALUES($1,$2,$3,$4,$5,$6)', [org, actor, key, hash, result, operation]);
      return result;
    });
  }
  const normalized = (input: ProjectInput) => ({ name: input.name, description: input.description, address: input.address, status: input.status });
  return {
    create(actor, org, input, key) {
      return command(actor, org, key, 'project.create', normalized(input), async (c) => {
        if (input.status === 'complete') throw new AccessError('COMPLETION_REQUIRED', 422);
        const result = projectDto((await c.query<ProjectRow>('INSERT INTO projects(organization_id,id,name,description,address,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [org, randomUUID(), input.name, input.description, input.address, input.status])).rows[0]!);
        return { result, before: null, projectId: result.id, events: [{ entity: 'project', operation: 'upsert', projectId: result.id, project: result }] };
      });
    },
    update(actor, org, id, input, key) {
      return command(actor, org, key, 'project.update', { projectId: id, ...normalized(input), baseVersion: input.baseVersion }, async (c) => {
        const row = (await c.query<ProjectRow>('SELECT * FROM projects WHERE organization_id=$1 AND id=$2 FOR UPDATE', [org, id])).rows[0];
        if (!row) throw new AccessError('NOT_FOUND', 404);
        const before = projectDto(row); if (before.version !== input.baseVersion) throw new AccessError('VERSION_CONFLICT', 409, before);
        if (input.status === 'complete') await requireCompletion(c, org, id);
        const result = projectDto((await c.query<ProjectRow>('UPDATE projects SET name=$3,description=$4,address=$5,status=$6,version=version+1,updated_at=clock_timestamp() WHERE organization_id=$1 AND id=$2 RETURNING *', [org, id, input.name, input.description, input.address, input.status])).rows[0]!);
        return { result, before, projectId: id, events: [{ entity: 'project', operation: 'upsert', projectId: id, project: result }] };
      });
    },
    workers: (actor, org) => transaction(async (c) => {
      const m = await member(c, actor, org); if (m.role !== 'manager') throw new AccessError('NOT_FOUND', 404);
      return (await c.query<{ accountId: string; name: string }>('SELECT a.id AS "accountId",a.name FROM app_accounts a JOIN memberships m ON m.account_id=a.id WHERE m.organization_id=$1 AND m.role=\'field_worker\' ORDER BY a.name,a.id', [org])).rows;
    }, true),
    assignments: (actor, org, project) => transaction(async (c) => {
      const m = await member(c, actor, org); if (m.role !== 'manager') throw new AccessError('NOT_FOUND', 404);
      if (!(await c.query('SELECT 1 FROM projects WHERE organization_id=$1 AND id=$2', [org, project])).rowCount) throw new AccessError('NOT_FOUND', 404);
      return (await c.query<AssignmentRow>('SELECT * FROM assignments WHERE organization_id=$1 AND project_id=$2 ORDER BY account_id', [org, project])).rows.map(assignmentDto);
    }, true),
    setAssignment(actor, org, project, account, input, key) {
      return command(actor, org, key, 'assignment.set', { projectId: project, accountId: account, active: input.active, baseVersion: input.baseVersion }, async (c) => {
        const p = (await c.query<ProjectRow>('SELECT * FROM projects WHERE organization_id=$1 AND id=$2 FOR UPDATE', [org, project])).rows[0];
        const worker = (await c.query<{ role: Role }>('SELECT role FROM lock_membership($1,$2)', [org, account])).rows[0];
        if (!p || worker?.role !== 'field_worker') throw new AccessError('NOT_FOUND', 404);
        const old = (await c.query<AssignmentRow>('SELECT * FROM assignments WHERE organization_id=$1 AND project_id=$2 AND account_id=$3 FOR UPDATE', [org, project, account])).rows[0];
        const before = old ? assignmentDto(old) : null;
        if ((before?.version ?? 0) !== input.baseVersion) throw new AccessError('VERSION_CONFLICT', 409, before ?? undefined);
        const result = assignmentDto((await c.query<AssignmentRow>('INSERT INTO assignments(organization_id,project_id,account_id,active) VALUES($1,$2,$3,$4) ON CONFLICT(organization_id,project_id,account_id) DO UPDATE SET active=EXCLUDED.active,version=assignments.version+1,updated_at=clock_timestamp() RETURNING *', [org, project, account, input.active])).rows[0]!);
        const events: Omit<SyncChange, 'revision' | 'ordinal'>[] = input.active
          ? [{ entity: 'project', operation: 'upsert', projectId: project, accountId: account, project: projectDto(p) }, { entity: 'assignment', operation: 'upsert', projectId: project, accountId: account, assignment: result }]
          : [{ entity: 'project', operation: 'remove', projectId: project, accountId: account }, { entity: 'assignment', operation: 'remove', projectId: project, accountId: account }];
        if (input.active) { const checklist = await checklistFor(c, org, project); if (checklist) events.push({ entity: 'checklist', operation: 'upsert', projectId: project, accountId: account, checklist }); }
        return { result, before, projectId: project, accountId: account, events };
      });
    },
    bootstrap: (actor, org) => transaction(async (c) => {
      const m = await member(c, actor, org);
      const projects = await authorizedProjects(c, actor, org, SNAPSHOT_CAP + 1);
      if (projects.length > SNAPSHOT_CAP) throw new AccessError('SNAPSHOT_TOO_LARGE', 413);
      const state = (await c.query<{ revision: string }>('SELECT revision FROM organization_sync_state WHERE organization_id=$1', [org])).rows[0];
      const assignments = (await c.query<AssignmentRow>(`SELECT * FROM assignments WHERE organization_id=$1 AND active AND ($3::boolean OR account_id=$2) ORDER BY project_id,account_id LIMIT 5001`, [org, actor, m.role === 'manager'])).rows.map(assignmentDto);
      if (assignments.length > 5000) throw new AccessError('SNAPSHOT_TOO_LARGE', 413);
      const checklists: ChecklistRun[] = [];
      for (const project of projects) { const run = await checklistFor(c,org,project.id); if (run) checklists.push(run); }
      const templates = m.role === 'manager' ? (await c.query<ChecklistTemplate>('SELECT id,organization_id AS "organizationId",version,title,questions FROM checklist_templates WHERE organization_id=$1 ORDER BY id,version LIMIT 501',[org])).rows : [];
      if (templates.length > 500) throw new AccessError('SNAPSHOT_TOO_LARGE',413);
      return { checklists, templates, accountId: actor, organizationId: org, complete: true, generatedAt: new Date(now()).toISOString(), projects, assignments, cursor: encode({ v: 1, a: actor, o: org, e: epoch(m), r: state?.revision ?? '0', n: END_ORDINAL, exp: now() + CURSOR_TTL_MS }) };
    }, true),
    pull: (actor, org, fromCursor, limit) => transaction(async (c) => {
      const m = await member(c, actor, org);
      const state = (await c.query<{ revision: string; min_retained_revision: string }>('SELECT revision,min_retained_revision FROM organization_sync_state WHERE organization_id=$1', [org])).rows[0] ?? { revision: '0', min_retained_revision: '0' };
      const cursor = decode(fromCursor, actor, org, m, state.min_retained_revision, state.revision);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new AccessError('INVALID_REQUEST', 400);
      const scanned = (await c.query<FeedRow>('SELECT revision,ordinal,entity,operation,project_id,account_id,payload FROM sync_changes WHERE organization_id=$1 AND (revision,ordinal)>($2::bigint,$3::integer) ORDER BY revision,ordinal LIMIT $4', [org, cursor.r, cursor.n, limit + 1])).rows;
      const hasMore = scanned.length > limit; const rows = scanned.slice(0, limit);
      const permitted = new Set((await c.query<{ project_id: string }>('SELECT project_id FROM assignments WHERE organization_id=$1 AND account_id=$2 AND active', [org, actor])).rows.map((a) => a.project_id));
      const changes: SyncChange[] = [];
      for (const row of rows) {
        const owns = row.account_id === actor;
        const visible = row.entity === 'template' ? m.role === 'manager' : row.entity === 'checklist' ? (m.role === 'manager' || permitted.has(row.project_id)) && (!row.account_id || owns || m.role === 'manager') : row.entity === 'project'
          ? row.operation === 'remove' ? owns && m.role === 'field_worker' : (m.role === 'manager' || permitted.has(row.project_id)) && (!row.account_id || owns || m.role === 'manager')
          : (m.role === 'manager' || owns) && (row.operation === 'remove' || m.role === 'manager' || permitted.has(row.project_id));
        if (!visible) continue;
        changes.push({ revision: row.revision, ordinal: row.ordinal, entity: row.entity, operation: row.operation, projectId: row.project_id,
          ...(row.account_id ? { accountId: row.account_id } : {}),
          ...(row.operation === 'upsert' ? row.entity === 'project' ? { project: row.payload as Project } : row.entity === 'checklist' ? { checklist: row.payload as ChecklistRun } : row.entity === 'template' ? { template: row.payload as ChecklistTemplate } : { assignment: row.payload as Assignment } : {}) });
      }
      const last = rows.at(-1);
      const next = { ...cursor, r: last?.revision ?? state.revision, n: last?.ordinal ?? END_ORDINAL };
      return { accountId: actor, organizationId: org, fromCursor, cursor: encode(next), hasMore, changes };
    }, true),
  };
}
