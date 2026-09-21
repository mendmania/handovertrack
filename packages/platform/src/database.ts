import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Role } from '@handovertrack/backend';
export interface Database {
  app_accounts: { id: string; auth_user_id: string; name: string };
  organizations: { id: string; name: string; created_at: Date };
  memberships: { organization_id: string; account_id: string; role: Role; created_at: Date };
  projects: { id: string; organization_id: string; name: string; description: string; address: string; status: 'active' | 'complete'; created_at: Date; updated_at: Date; version: number };
  assignments: { organization_id: string; project_id: string; account_id: string; created_at: Date; updated_at: Date; active: boolean; version: number };
}
export function createDatabase(url: string) {
  const pool = new pg.Pool({ connectionString: url, max: 8, connectionTimeoutMillis: 5000 });
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
  return { db, pool };
}
