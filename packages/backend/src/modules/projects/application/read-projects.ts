import { SNAPSHOT_CAP } from '../domain/project';
import type { ProjectReader } from '../ports/project-reader';
import type { MembershipReader } from '../../organizations/ports/membership-reader';
import { authorizeOrganization } from '../../organizations/application/authorize';
import { AccessError } from '../../organizations/domain/access';
export function projectReads(projects: ProjectReader, memberships: MembershipReader) {
  return {
    async list(accountId: string, organizationId: string) {
      await authorizeOrganization(memberships, accountId, organizationId);
      const rows = await projects.listAuthorized(accountId, organizationId, SNAPSHOT_CAP + 1);
      if (rows.length > SNAPSHOT_CAP) throw new AccessError('SNAPSHOT_TOO_LARGE', 413);
      return rows;
    },
    async detail(accountId: string, organizationId: string, projectId: string) {
      await authorizeOrganization(memberships, accountId, organizationId);
      const project = await projects.findAuthorized(accountId, organizationId, projectId);
      if (!project) throw new AccessError('NOT_FOUND', 404);
      return project;
    },
  };
}
