import { assertChecklistRun, assertTemplate } from '../checklists/validation';
import { assertCompleteSnapshot, type Assignment, type Scope, type SyncBootstrap, type SyncPage } from '@handovertrack/contracts';
function assertCursor(value: string) {
  if (typeof value !== 'string' || !value || value.length > 8192) throw new Error('Invalid sync cursor');
}
function assertAssignment(value: Assignment, scope: Scope) {
  if (!value || value.organizationId !== scope.organizationId || typeof value.projectId !== 'string' || !value.projectId ||
    typeof value.accountId !== 'string' || !value.accountId || value.active !== true || !Number.isSafeInteger(value.version) || value.version < 1 ||
    !Number.isFinite(Date.parse(value.updatedAt))) throw new Error('Invalid sync assignment');
}
export function assertBootstrap(value: SyncBootstrap, scope: Scope) {
  assertCompleteSnapshot(value, scope); assertCursor(value.cursor);
  if (!Array.isArray(value.assignments) || value.assignments.length > 5000) throw new Error('Invalid bootstrap assignments');
  const projects = new Set(value.projects.map((project) => project.id)); const assignments = new Set<string>();
  if ((value.checklists && (!Array.isArray(value.checklists) || value.checklists.length > 200)) || (value.templates && (!Array.isArray(value.templates) || value.templates.length > 500))) throw new Error('Invalid checklist bootstrap');
  const runs = new Set<string>();
  for (const run of value.checklists ?? []) { if (!projects.has(run.projectId) || runs.has(run.projectId)) throw new Error('Invalid checklist bootstrap scope'); assertChecklistRun(run,scope,run.projectId); runs.add(run.projectId); }
  for (const template of value.templates ?? []) assertTemplate(template,scope);
  for (const assignment of value.assignments) {
    assertAssignment(assignment, scope);
    const key = `${assignment.projectId}:${assignment.accountId}`;
    if (!projects.has(assignment.projectId) || assignments.has(key)) throw new Error('Invalid bootstrap assignment scope');
    assignments.add(key);
  }
}
export function assertPage(value: SyncPage, scope: Scope) {
  if (!value || value.accountId !== scope.accountId || value.organizationId !== scope.organizationId ||
      typeof value.hasMore !== 'boolean' || !Array.isArray(value.changes) || value.changes.length > 200) throw new Error('Invalid sync page');
  assertCursor(value.fromCursor); assertCursor(value.cursor);
  let previousRevision = -1n; let previousOrdinal = -1;
  for (const change of value.changes) {
    if (!/^\d+$/.test(change.revision) || !Number.isSafeInteger(change.ordinal) || change.ordinal < 0 ||
      !['project', 'assignment', 'checklist', 'template'].includes(change.entity) || !['upsert', 'remove'].includes(change.operation) ||
      typeof change.projectId !== 'string' || !change.projectId) throw new Error('Invalid sync change');
    const revision = BigInt(change.revision);
    if (revision < previousRevision || (revision === previousRevision && change.ordinal <= previousOrdinal)) throw new Error('Unordered sync page');
    previousRevision = revision; previousOrdinal = change.ordinal;
    if (change.entity === 'project' && change.operation === 'upsert') {
      if (!change.project || change.project.id !== change.projectId) throw new Error('Invalid project upsert');
      assertCompleteSnapshot({ ...scope, complete: true, generatedAt: change.project.updatedAt, projects: [change.project] }, scope);
    }
    if (change.entity === 'checklist' && change.operation === 'upsert') assertChecklistRun(change.checklist!,scope,change.projectId);
    if (change.entity === 'template' && change.operation === 'upsert') { assertTemplate(change.template!,scope); if (change.template!.id !== change.projectId) throw new Error('Invalid template identity'); }
    if (change.entity === 'assignment') {
      if (typeof change.accountId !== 'string' || !change.accountId) throw new Error('Invalid assignment change');
      if (change.operation === 'upsert') {
        if (!change.assignment || change.assignment.projectId !== change.projectId || change.assignment.accountId !== change.accountId) throw new Error('Invalid assignment upsert');
        assertAssignment(change.assignment, scope);
      }
    }
  }
}
