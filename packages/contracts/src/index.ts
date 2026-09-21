import createClient from 'openapi-fetch';
import type { paths, components } from './generated';
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
export type Me = components['schemas']['Me'];
export type ApiFailure = components['schemas']['Error'];
export interface Scope { accountId: string; organizationId: string }
export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message = code, public readonly current?: Project | Assignment) { super(message); }
}
export function createApi(options: { baseUrl: string; fetch?: typeof fetch; headers?: HeadersInit; credentials?: RequestCredentials }) {
  const client = createClient<paths>({ ...options, cache: 'no-store' });
  function unwrap<T>(result: { data?: T; error?: ApiFailure; response: Response }): T {
    if (result.error || !result.response.ok) throw new ApiError(result.response.status, result.error?.code ?? 'REQUEST_FAILED', result.error?.message, result.error?.current);
    if (result.data === undefined) throw new ApiError(502, 'INVALID_RESPONSE');
    return result.data;
  }
  return {
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
