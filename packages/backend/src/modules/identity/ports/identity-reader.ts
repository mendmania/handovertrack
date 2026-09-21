import type { Account } from '../domain/account';
export interface IdentityReader { findByAuthSubject(subject: string): Promise<Account | undefined> }
