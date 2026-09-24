import type { ChecklistRun, ChecklistTemplate, Scope } from '@handovertrack/contracts';
export function assertTemplate(t: ChecklistTemplate, scope: Scope) {
  if (!t || t.organizationId !== scope.organizationId || typeof t.id !== 'string' || !t.id || !Number.isSafeInteger(t.version) || t.version < 1 || typeof t.title !== 'string' || t.title.length > 200 || !Array.isArray(t.questions) || !t.questions.length || t.questions.length > 30 || new Set(t.questions.map(q => q.id)).size !== t.questions.length || t.questions.some(q => typeof q.id !== 'string' || !q.id || typeof q.label !== 'string' || !q.label.trim() || q.label.length > 300 || typeof q.required !== 'boolean' || !Number.isInteger(q.minPhotos) || q.minPhotos < 0 || q.minPhotos > 10)) throw new Error('Invalid checklist requirements');
}
export function assertChecklistRun(run: ChecklistRun, scope: Scope, project: string) {
  if (!run || run.projectId !== project || !run.templateId || !Number.isSafeInteger(run.templateVersion) || run.templateVersion < 1) throw new Error('Invalid checklist scope');
  assertTemplate(run,scope);
  if (!Array.isArray(run.answers) || run.answers.length > 30 || new Set(run.answers.map(a => a.questionId)).size !== run.answers.length || run.answers.some(a => !run.questions.some(q => q.id === a.questionId) || typeof a.text !== 'string' || a.text.length > 4000 || !Number.isSafeInteger(a.version) || a.version < 1 || typeof a.updatedBy !== 'string' || !a.updatedBy || !Array.isArray(a.mediaIds) || a.mediaIds.length > 10 || a.mediaIds.some(id => typeof id !== 'string' || !id) || new Set(a.mediaIds).size !== a.mediaIds.length)) throw new Error('Invalid checklist answers');
}
