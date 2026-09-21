import { AccessError } from '../../organizations/domain/access';
import type { ProjectInput } from '../domain/management';
import type { ProjectManagement } from '../ports/project-management';
export function projectManagement(port: ProjectManagement): ProjectManagement {
  function fields(input: ProjectInput) {
    if (!input.name.trim() || input.name.length > 200 || input.description.length > 4000 || input.address.length > 500 || !['active', 'complete'].includes(input.status)) throw new AccessError('INVALID_REQUEST', 400);
  }
  return {
    ...port,
    create(actor, organization, input, key) { fields(input); return port.create(actor, organization, input, key); },
    update(actor, organization, project, input, key) { fields(input); return port.update(actor, organization, project, input, key); },
  };
}
