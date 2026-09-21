import type { Project } from '../domain/project';
export interface ProjectReader {
  // Implementations must join current memberships AND assignments themselves.
  // A caller-supplied role is never sufficient authorization.
  listAuthorized(accountId: string, organizationId: string, limit: number): Promise<Project[]>;
  findAuthorized(accountId: string, organizationId: string, projectId: string): Promise<Project | undefined>;
}
