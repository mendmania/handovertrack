import type { ChecklistRun, ChecklistTemplate } from '../../checklists/domain/checklist';
import type { Project } from './project';
export interface ProjectInput { name: string; description: string; address: string; status: 'active' | 'complete' }
export interface ProjectUpdate extends ProjectInput { baseVersion: number }
export interface Assignment { organizationId: string; projectId: string; accountId: string; version: number; active: boolean; updatedAt: string }
export interface AssignmentInput { active: boolean; baseVersion: number }
export interface Worker { accountId: string; name: string }
export interface SyncChange {
  revision: string; ordinal: number; entity: 'project' | 'assignment' | 'checklist' | 'template'; operation: 'upsert' | 'remove';
  projectId: string; accountId?: string; project?: Project; assignment?: Assignment; checklist?: ChecklistRun; template?: ChecklistTemplate;
}
export interface SyncBootstrap { accountId: string; organizationId: string; complete: true; generatedAt: string; projects: Project[]; assignments: Assignment[]; checklists?: ChecklistRun[]; templates?: ChecklistTemplate[]; cursor: string }
export interface SyncPage { accountId: string; organizationId: string; fromCursor: string; cursor: string; hasMore: boolean; changes: SyncChange[] }
