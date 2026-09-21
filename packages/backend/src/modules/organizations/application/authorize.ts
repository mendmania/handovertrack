import { AccessError } from '../domain/access';
import type { MembershipReader } from '../ports/membership-reader';
export async function authorizeOrganization(reader: MembershipReader, accountId: string, organizationId: string) {
  const membership = (await reader.listForAccount(accountId)).find((item) => item.organizationId === organizationId);
  if (!membership) throw new AccessError('NOT_FOUND', 404);
  return membership;
}
