import type { Membership } from '../domain/access';
export interface MembershipReader {
  listForAccount(accountId: string): Promise<Membership[]>;
}
