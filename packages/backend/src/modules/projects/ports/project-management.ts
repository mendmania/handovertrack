import type { Assignment, AssignmentInput, ProjectInput, ProjectUpdate, SyncBootstrap, SyncPage, Worker } from '../domain/management';
import type { Project } from '../domain/project';
export interface ProjectManagement {
  create(actor: string, organization: string, input: ProjectInput, key: string): Promise<Project>;
  update(actor: string, organization: string, project: string, input: ProjectUpdate, key: string): Promise<Project>;
  workers(actor: string, organization: string): Promise<Worker[]>;
  assignments(actor: string, organization: string, project: string): Promise<Assignment[]>;
  setAssignment(actor: string, organization: string, project: string, account: string, input: AssignmentInput, key: string): Promise<Assignment>;
  bootstrap(actor: string, organization: string): Promise<SyncBootstrap>;
  pull(actor: string, organization: string, cursor: string, limit: number): Promise<SyncPage>;
}
