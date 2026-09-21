import type { IdentityReader } from '../ports/identity-reader';
import { AccessError } from '../../organizations/domain/access';
export async function resolveAccount(reader: IdentityReader, subject?: string) {
  if (!subject) throw new AccessError('UNAUTHENTICATED', 401);
  const account = await reader.findByAuthSubject(subject);
  if (!account) throw new AccessError('UNAUTHENTICATED', 401);
  return account;
}
