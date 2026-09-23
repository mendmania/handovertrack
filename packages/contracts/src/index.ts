import createClient from 'openapi-fetch';
import type { paths, components } from './generated';
export type ProofNote = components['schemas']['ProofNote'];
export type ProofMark = components['schemas']['ProofMark'];
export type ProofAnnotation = components['schemas']['ProofAnnotation'];
export type ProofPair = components['schemas']['ProofPair'];
export type Composition = components['schemas']['Composition'];
export type CompositionInput = components['schemas']['CompositionInput'];
export type ReportInput = components['schemas']['ReportInput'];
export type ReportStatus = components['schemas']['ReportStatus'];
export type ChecklistQuestion = components['schemas']['ChecklistQuestion'];
export type ChecklistTemplate = components['schemas']['ChecklistTemplate'];
export type TemplateInput = components['schemas']['TemplateInput'];
export type ChecklistAnswer = components['schemas']['ChecklistAnswer'];
export type ChecklistRun = components['schemas']['ChecklistRun'];
export type ChecklistCommand = components['schemas']['ChecklistCommand'];
export type ChecklistResult = components['schemas']['ChecklistResult'];
export type Project = components['schemas']['Project'];
export type ProjectSnapshot = components['schemas']['ProjectSnapshot'];
export type ProjectInput = components['schemas']['ProjectInput'];
export type ProjectUpdate = components['schemas']['ProjectUpdate'];
export type Assignment = components['schemas']['Assignment'];
export type AssignmentInput = components['schemas']['AssignmentInput'];
export type Worker = components['schemas']['Worker'];
export type SyncBootstrap = components['schemas']['SyncBootstrap'];
export type SyncPage = components['schemas']['SyncPage'];
export type SyncChange = components['schemas']['SyncChange'];
export type Upload = components['schemas']['Upload'];
export type UploadInput = components['schemas']['UploadInput'];
export type Media = components['schemas']['Media'];
export type Me = components['schemas']['Me'];
export type ApiFailure = components['schemas']['Error'];
export interface Scope { accountId: string; organizationId: string }
export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message = code, public readonly current?: components['schemas']['Error']['current']) { super(message); }
}
export function createApi(options: { baseUrl: string; fetch?: typeof fetch; headers?: HeadersInit; credentials?: RequestCredentials }) {
  const client = createClient<paths>({ ...options, cache: 'no-store' });
  function unwrap<T>(result: { data?: T; error?: ApiFailure; response: Response }): T {
    if (result.error || !result.response.ok) throw new ApiError(result.response.status, result.error?.code ?? 'REQUEST_FAILED', result.error?.message, result.error?.current);
    if (result.data === undefined) throw new ApiError(502, 'INVALID_RESPONSE');
    return result.data;
  }
  return {
    async proof(scope: Scope, projectId: string, signal?: AbortSignal) {
      return unwrap(await client.GET('/v1/organizations/{organizationId}/projects/{projectId}/proof', { params: { path: { ...scope, projectId } }, signal }));
    },
    async saveProof(scope: Scope, projectId: string, input: CompositionInput, key: string) {
      return unwrap(await client.POST('/v1/organizations/{organizationId}/projects/{projectId}/proof', { params: { path: { ...scope, projectId }, header: { 'Idempotency-Key': key } }, body: input }));
    },
    async requestReport(scope: Scope, projectId: string, input: ReportInput, key: string) {
      return unwrap(await client.POST('/v1/organizations/{organizationId}/projects/{projectId}/reports', { params: { path: { ...scope, projectId }, header: { 'Idempotency-Key': key } }, body: input }));
    },
    async reportStatus(scope: Scope, projectId: string, reportId: string, signal?: AbortSignal) {
      return unwrap(await client.GET('/v1/organizations/{organizationId}/projects/{projectId}/reports/{reportId}', { params: { path: { ...scope, projectId, reportId } }, signal }));
    },
    async retryReport(scope: Scope, projectId: string, reportId: string, key: string) {
      return unwrap(await client.POST('/v1/organizations/{organizationId}/projects/{projectId}/reports/{reportId}/retry', { params: { path: { ...scope, projectId, reportId }, header: { 'Idempotency-Key': key } } }));
    },
    async checklistTemplates(scope: Scope, signal?: AbortSignal) {
      return unwrap(await client.GET('/v1/organizations/{organizationId}/checklist-templates', { params: { path: scope }, signal })).templates;
    },
    async publishChecklistTemplate(scope: Scope, input: TemplateInput, key: string, signal?: AbortSignal) {
      return unwrap(await client.POST('/v1/organizations/{organizationId}/checklist-templates', { params: { path: scope, header: { 'Idempotency-Key': key } }, body: input, signal }));
    },
    async checklist(scope: Scope, projectId: string, signal?: AbortSignal) {
      return unwrap(await client.GET('/v1/organizations/{organizationId}/projects/{projectId}/checklist', { params: { path: { ...scope, projectId } }, signal }));
    },
    async checklistCommand(scope: Scope, projectId: string, input: ChecklistCommand, key: string, signal?: AbortSignal) {
      return unwrap(await client.POST('/v1/organizations/{organizationId}/projects/{projectId}/checklist', { params: { path: { ...scope, projectId }, header: { 'Idempotency-Key': key } }, body: input, signal }));
    },
    async createUpload(scope: Scope, projectId: string, input: UploadInput, signal?: AbortSignal) {
      return unwrap(await client.POST('/v1/organizations/{organizationId}/projects/{projectId}/uploads', { params: { path: { ...scope, projectId } }, body: input, signal }));
    },
    async uploadStatus(scope: Scope, uploadId: string, signal?: AbortSignal) {
      return unwrap(await client.GET('/v1/organizations/{organizationId}/uploads/{uploadId}', { params: { path: { ...scope, uploadId } }, signal }));
    },
    async completeUpload(scope: Scope, uploadId: string, signal?: AbortSignal) {
      return unwrap(await client.POST('/v1/organizations/{organizationId}/uploads/{uploadId}/complete', { params: { path: { ...scope, uploadId } }, signal }));
    },
    async media(scope: Scope, projectId: string, signal?: AbortSignal, after?: string) {
      return unwrap(await client.GET('/v1/organizations/{organizationId}/projects/{projectId}/media', { params: { path: { ...scope, projectId }, query: after ? { after } : {} }, signal }));
    },
    async createProject(scope: Scope, input: ProjectInput, key: string) {
      return unwrap(await client.POST('/v1/organizations/{organizationId}/projects', { params: { path: scope, header: { 'Idempotency-Key': key } }, body: input }));
    },
    async updateProject(scope: Scope, projectId: string, input: ProjectUpdate, key: string) {
      return unwrap(await client.PATCH('/v1/organizations/{organizationId}/projects/{projectId}', { params: { path: { ...scope, projectId }, header: { 'Idempotency-Key': key } }, body: input }));
    },
    async workers(scope: Scope, signal?: AbortSignal) {
      return unwrap(await client.GET('/v1/organizations/{organizationId}/workers', { params: { path: scope }, signal })).workers;
    },
    async assignments(scope: Scope, projectId: string, signal?: AbortSignal) {
      return unwrap(await client.GET('/v1/organizations/{organizationId}/projects/{projectId}/assignments', { params: { path: { ...scope, projectId } }, signal })).assignments;
    },
    async setAssignment(scope: Scope, projectId: string, accountId: string, input: AssignmentInput, key: string) {
      return unwrap(await client.PUT('/v1/organizations/{organizationId}/projects/{projectId}/assignments/{accountId}', { params: { path: { ...scope, projectId, accountId }, header: { 'Idempotency-Key': key } }, body: input }));
    },
    async bootstrap(scope: Scope, signal?: AbortSignal) {
      return unwrap(await client.GET('/v1/organizations/{organizationId}/sync/bootstrap', { params: { path: scope }, signal }));
    },
    async pull(scope: Scope, cursor: string, signal?: AbortSignal, limit = 100) {
      return unwrap(await client.GET('/v1/organizations/{organizationId}/sync/pull', { params: { path: scope, query: { cursor, limit } }, signal }));
    },
    async me(signal?: AbortSignal) { return unwrap(await client.GET('/v1/me', { signal })); },
    async list(scope: Scope, signal?: AbortSignal) {
      return unwrap(await client.GET('/v1/organizations/{organizationId}/projects', { params: { path: scope }, signal })).projects;
    },
    async detail(scope: Scope, projectId: string, signal?: AbortSignal) {
      return unwrap(await client.GET('/v1/organizations/{organizationId}/projects/{projectId}', { params: { path: { ...scope, projectId } }, signal }));
    },
    async snapshot(scope: Scope, signal?: AbortSignal) {
      const snapshot = unwrap(await client.GET('/v1/organizations/{organizationId}/projects/snapshot', { params: { path: scope }, signal }));
      assertCompleteSnapshot(snapshot, scope);
      return snapshot;
    },
  };
}
export type Api = ReturnType<typeof createApi>;
// Runtime guard at the destructive snapshot-replacement boundary. Generated
// TypeScript alone cannot validate untrusted HTTP payloads.
export function assertCompleteSnapshot(value: ProjectSnapshot, scope: Scope): void {
  if (!value || value.complete !== true || value.accountId !== scope.accountId || value.organizationId !== scope.organizationId ||
      !Array.isArray(value.projects) || value.projects.length > 200 || !Number.isFinite(Date.parse(value.generatedAt))) throw new Error('Invalid or incomplete project snapshot');
  const seen = new Set<string>();
  for (const project of value.projects) {
    if (!project || project.organizationId !== scope.organizationId || typeof project.id !== 'string' || !project.id || seen.has(project.id) ||
        !Number.isInteger(project.version) || project.version < 1 || typeof project.name !== 'string' || project.name.length > 200 || typeof project.description !== 'string' || project.description.length > 4000 ||
        typeof project.address !== 'string' || project.address.length > 500 || !['active', 'complete'].includes(project.status) || !Number.isFinite(Date.parse(project.updatedAt))) throw new Error('Invalid snapshot project');
    seen.add(project.id);
  }
}
