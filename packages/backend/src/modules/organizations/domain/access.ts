export type Role = 'manager' | 'field_worker';
export interface Membership { organizationId: string; organizationName: string; role: Role }
export type ErrorCode = 'UNAUTHENTICATED' | 'NOT_FOUND' | 'SNAPSHOT_TOO_LARGE' | 'INVALID_REQUEST' | 'INTERNAL_ERROR' | 'VERSION_CONFLICT' | 'IDEMPOTENCY_CONFLICT' | 'CURSOR_EXPIRED' | 'INVALID_CURSOR' | 'FORBIDDEN_ORIGIN' | 'ACCESS_CHANGED' | 'UPLOAD_BUSY' | 'UPLOAD_INCOMPLETE' | 'IMAGE_MISMATCH' | 'INVALID_IMAGE' | 'STORAGE_FULL' | 'STALE_LEASE' | 'COMPLETION_REQUIRED' | 'PROJECT_COMPLETE' | 'MEDIA_NOT_READY' | 'REPORT_NOT_READY' | 'RATE_LIMITED' | 'DECISION_RECORDED';
export class AccessError extends Error {
  constructor(public readonly code: ErrorCode, public readonly status: number, public readonly current?: unknown) { super(code); }
}
export const capabilities = (role: Role) => role === 'manager' ? ['project.read_all', 'project.manage', 'assignment.manage'] : ['project.read_assigned'];
