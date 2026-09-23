export interface ChecklistQuestion { id: string; label: string; required: boolean; minPhotos: number }
export interface ChecklistTemplate { id: string; organizationId: string; version: number; title: string; questions: ChecklistQuestion[] }
export interface TemplateInput { id: string; baseVersion: number; title: string; questions: ChecklistQuestion[] }
export interface ChecklistAnswer { questionId: string; text: string; mediaIds: string[]; version: number; updatedBy: string }
export interface ChecklistRun { id: string; organizationId: string; projectId: string; templateId: string; templateVersion: number; title: string; questions: ChecklistQuestion[]; answers: ChecklistAnswer[]; version: number }
export type ChecklistCommand = { kind: 'start'; id: string; templateId: string; templateVersion: number; baseVersion: number }
  | { kind: 'answer'; runId: string; questionId: string; text: string; mediaIds: string[]; baseVersion: number }
  | { kind: 'complete'; runId: string; baseVersion: number };
export interface ChecklistResult { outcome: 'applied' | 'conflict'; run: ChecklistRun; current?: ChecklistAnswer; projectVersion?: number }
// Validation is also used at the repository boundary: transport types are not authorization.
export function validQuestions(questions: ChecklistQuestion[]): boolean {
  return Array.isArray(questions) && questions.length > 0 && questions.length <= 30 &&
    new Set(questions.map(q => q.id)).size === questions.length && questions.every(q =>
      /^[0-9a-f-]{36}$/i.test(q.id) && typeof q.label === 'string' && q.label.trim().length > 0 && q.label.length <= 300 &&
      typeof q.required === 'boolean' && Number.isInteger(q.minPhotos) && q.minPhotos >= 0 && q.minPhotos <= 10);
}
