import type { Kysely } from 'kysely';
import type { IdentityReader, MembershipReader, ProjectReader } from '@handovertrack/backend';
import type { Database } from './database';

export function createReaders(db: Kysely<Database>) {
  const identity: IdentityReader = {
    findByAuthSubject: (subject) => db.selectFrom('app_accounts').select(['id', 'name']).where('auth_user_id', '=', subject).executeTakeFirst(),
  };
  const memberships: MembershipReader = {
    listForAccount: (accountId) => db.selectFrom('memberships as m').innerJoin('organizations as o', 'o.id', 'm.organization_id')
      .select(['o.id as organizationId', 'o.name as organizationName', 'm.role']).where('m.account_id', '=', accountId).orderBy('o.name').execute(),
  };
  const authorized = (accountId: string, organizationId: string) => db.selectFrom('projects as p')
    .innerJoin('memberships as m', (join) => join.onRef('m.organization_id', '=', 'p.organization_id').on('m.account_id', '=', accountId))
    .where('p.organization_id', '=', organizationId)
    .where((eb) => eb.or([
      eb('m.role', '=', 'manager'),
      eb.exists(eb.selectFrom('assignments as a').select('a.project_id')
        .whereRef('a.organization_id', '=', 'p.organization_id').whereRef('a.project_id', '=', 'p.id').where('a.account_id', '=', accountId).where('a.active', '=', true)),
    ]))
    .select(['p.id', 'p.organization_id as organizationId', 'p.name', 'p.description', 'p.address', 'p.status', 'p.updated_at as updatedAt', 'p.version']);
  const projectReader: ProjectReader = {
    async listAuthorized(accountId, organizationId, limit) {
      const rows = await authorized(accountId, organizationId).orderBy('p.name').orderBy('p.id').limit(limit).execute();
      return rows.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() }));
    },
    async findAuthorized(accountId, organizationId, projectId) {
      const row = await authorized(accountId, organizationId).where('p.id', '=', projectId).executeTakeFirst();
      return row && { ...row, updatedAt: row.updatedAt.toISOString() };
    },
  };
  return { identity, memberships, projects: projectReader };
}
