import { migrationV5 } from '../checklists/migration';
import { assertChecklistRun } from '../checklists/validation';
import { assertBootstrap, assertPage } from '../sync/protocol';
import { assertCompleteSnapshot, type Project, type ProjectSnapshot, type Scope, type ChecklistRun, type ChecklistTemplate, type Assignment, type SyncBootstrap, type SyncPage } from '@handovertrack/contracts';
type Bind = string | number | null;
export interface SqlConnection {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: Bind[]): Promise<unknown>;
  getAllAsync<T>(sql: string, ...params: Bind[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: Bind[]): Promise<T | null>;
}
export interface SqlDatabase extends SqlConnection {
  withExclusiveTransactionAsync(run: (tx: SqlConnection) => Promise<void>): Promise<void>;
}
// Export the exact migration used by Expo so Node SQLite tests exercise the
// same SQL and transaction boundary, rather than an in-memory repository mock.
export const migrationV1 = `
CREATE TABLE IF NOT EXISTS cache_scopes (
  account_id TEXT NOT NULL, organization_id TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0, validated_at TEXT,
  PRIMARY KEY(account_id, organization_id)
);
CREATE TABLE IF NOT EXISTS cached_projects (
  account_id TEXT NOT NULL, organization_id TEXT NOT NULL, id TEXT NOT NULL,
  name TEXT NOT NULL, description TEXT NOT NULL, address TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','complete')), updated_at TEXT NOT NULL,
  PRIMARY KEY(account_id, organization_id, id),
  FOREIGN KEY(account_id, organization_id) REFERENCES cache_scopes(account_id, organization_id) ON DELETE CASCADE
);
PRAGMA user_version = 1;
`;
export const migrationV2 = `
ALTER TABLE cached_projects ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE cache_scopes ADD COLUMN cursor TEXT;
ALTER TABLE cache_scopes ADD COLUMN last_page TEXT;
CREATE TABLE cached_assignments (
  account_id TEXT NOT NULL, organization_id TEXT NOT NULL, project_id TEXT NOT NULL,
  worker_id TEXT NOT NULL, version INTEGER NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(account_id,organization_id,project_id,worker_id),
  FOREIGN KEY(account_id,organization_id) REFERENCES cache_scopes(account_id,organization_id) ON DELETE CASCADE
);
PRAGMA user_version = 2;
`;
// Evidence owns its own lifetime. There are deliberately no foreign keys to
// server read models: logout, revocation and rebootstrap cannot delete it.
export const migrationV3 = `
CREATE TABLE media_local (
  id TEXT NOT NULL UNIQUE, account_id TEXT NOT NULL, organization_id TEXT NOT NULL,
  project_id TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  directory TEXT NOT NULL UNIQUE, state TEXT NOT NULL CHECK(state IN ('staging','saved_local','interrupted','missing_original','quarantined')),
  size INTEGER, sha256 TEXT, width INTEGER, height INTEGER, reason TEXT,
  PRIMARY KEY(account_id,organization_id,id)
);
CREATE INDEX media_local_owner ON media_local(account_id,organization_id,project_id,created_at);
CREATE TABLE media_queue (
  media_id TEXT NOT NULL UNIQUE,
  account_id TEXT NOT NULL, organization_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','blocked')),
  reason TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(account_id,organization_id,media_id),
  FOREIGN KEY(account_id,organization_id,media_id) REFERENCES media_local(account_id,organization_id,id)
);
CREATE TABLE media_orphans (
  directory TEXT PRIMARY KEY, reason TEXT NOT NULL, observed_at TEXT NOT NULL
);
CREATE TABLE media_scopes (
  account_id TEXT NOT NULL, organization_id TEXT NOT NULL, revision INTEGER NOT NULL,
  PRIMARY KEY(account_id,organization_id)
);
PRAGMA user_version = 3;
`;
export const migrationV4 = `
ALTER TABLE media_queue RENAME TO media_queue_v3;
CREATE TABLE media_queue (
  media_id TEXT NOT NULL UNIQUE, account_id TEXT NOT NULL, organization_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','blocked','uploading','server_accepted','completed','failed')),
  reason TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  upload_id TEXT, attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at INTEGER NOT NULL DEFAULT 0,
  bytes_sent INTEGER NOT NULL DEFAULT 0, accepted_at TEXT,
  PRIMARY KEY(account_id,organization_id,media_id),
  FOREIGN KEY(account_id,organization_id,media_id) REFERENCES media_local(account_id,organization_id,id)
);
INSERT INTO media_queue(media_id,account_id,organization_id,state,reason,created_at,updated_at)
  SELECT media_id,account_id,organization_id,state,reason,created_at,updated_at FROM media_queue_v3;
DROP TABLE media_queue_v3;
PRAGMA user_version = 4;
`;
export class SnapshotStore {
  private writes: Promise<unknown> = Promise.resolve();
  constructor(private db: SqlDatabase) {}
  private exclusive(run: (tx: SqlConnection) => Promise<void>): Promise<void> {
    const next = this.writes.then(() => this.db.withExclusiveTransactionAsync(run));
    this.writes = next.catch(() => {});
    return next;
  }
  // Media shares this writer queue with sync; independently opening an Expo
  // transaction here would race an in-flight bootstrap or cursor commit.
  async write<T>(run: (tx: SqlConnection) => Promise<T>): Promise<T> {
    let result!: T;
    await this.exclusive(async (tx) => { result = await run(tx); });
    return result;
  }
  read<T>(run: (connection: SqlConnection) => Promise<T>): Promise<T> { return run(this.db); }
  async migrate() {
    await this.db.execAsync('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    const version = await this.db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((version?.user_version ?? 0) > 5) throw new Error('Local database is newer than this app');
    if (!version?.user_version) await this.db.withExclusiveTransactionAsync((tx) => tx.execAsync(migrationV1));
    if ((version?.user_version ?? 0) < 2) await this.db.withExclusiveTransactionAsync((tx) => tx.execAsync(migrationV2));
    if ((version?.user_version ?? 0) < 3) await this.db.withExclusiveTransactionAsync((tx) => tx.execAsync(migrationV3));
    if ((version?.user_version ?? 0) < 4) await this.db.withExclusiveTransactionAsync((tx) => tx.execAsync(migrationV4));
    if ((version?.user_version ?? 0) < 5) await this.db.withExclusiveTransactionAsync((tx) => tx.execAsync(migrationV5));
  }
  async replace(scope: Scope, snapshot: ProjectSnapshot, assertCurrent: () => void) {
    assertCompleteSnapshot(snapshot, scope);
    await this.exclusive(async (tx) => {
      assertCurrent();
      await tx.runAsync('INSERT INTO cache_scopes(account_id,organization_id,revision,validated_at) VALUES(?,?,1,?) ON CONFLICT(account_id,organization_id) DO UPDATE SET revision=revision+1, validated_at=excluded.validated_at,cursor=NULL,last_page=NULL', scope.accountId, scope.organizationId, snapshot.generatedAt);
      await tx.runAsync('DELETE FROM cached_checklists WHERE account_id=? AND organization_id=?', scope.accountId, scope.organizationId);
      await tx.runAsync('DELETE FROM cached_checklist_templates WHERE account_id=? AND organization_id=?', scope.accountId, scope.organizationId);
      await tx.runAsync('DELETE FROM cached_assignments WHERE account_id=? AND organization_id=?', scope.accountId, scope.organizationId);
      await tx.runAsync('DELETE FROM cached_projects WHERE account_id=? AND organization_id=?', scope.accountId, scope.organizationId);
      for (const project of snapshot.projects) {
        assertCurrent();
        await tx.runAsync('INSERT INTO cached_projects(account_id,organization_id,id,name,description,address,status,updated_at,version) VALUES(?,?,?,?,?,?,?,?,?)', scope.accountId, scope.organizationId, project.id, project.name, project.description, project.address, project.status, project.updatedAt, project.version);
      }
      assertCurrent(); // Switching identity during SQL work rolls back the whole snapshot.
    });
  }
  // These methods own only server read models. media_local and media_queue own
  // pending evidence separately and are never deleted by bootstrap/revocation.
  async bootstrap(scope: Scope, value: SyncBootstrap, assertCurrent: () => void) {
    assertBootstrap(value, scope);
    await this.exclusive(async (tx) => {
      assertCurrent();
      await tx.runAsync('INSERT INTO cache_scopes(account_id,organization_id,revision,validated_at,cursor) VALUES(?,?,1,?,?) ON CONFLICT(account_id,organization_id) DO UPDATE SET revision=revision+1,validated_at=excluded.validated_at,cursor=excluded.cursor,last_page=NULL', scope.accountId, scope.organizationId, value.generatedAt, value.cursor);
      await tx.runAsync('DELETE FROM cached_checklists WHERE account_id=? AND organization_id=?', scope.accountId, scope.organizationId);
      await tx.runAsync('DELETE FROM cached_checklist_templates WHERE account_id=? AND organization_id=?', scope.accountId, scope.organizationId);
      await tx.runAsync('DELETE FROM cached_assignments WHERE account_id=? AND organization_id=?', scope.accountId, scope.organizationId);
      await tx.runAsync('DELETE FROM cached_projects WHERE account_id=? AND organization_id=?', scope.accountId, scope.organizationId);
      for (const project of value.projects) { assertCurrent(); await this.upsertProject(tx, scope, project); }
      for (const run of value.checklists ?? []) { assertCurrent(); await this.upsertChecklist(tx,scope,run); }
      for (const template of value.templates ?? []) { assertCurrent(); await this.upsertTemplate(tx,scope,template); }
      for (const assignment of value.assignments) { assertCurrent(); await this.upsertAssignment(tx, scope, assignment); }
      assertCurrent();
    });
  }
  async applyPage(scope: Scope, page: SyncPage, assertCurrent: () => void): Promise<boolean> {
    assertPage(page, scope);
    const serialized = JSON.stringify(page); let applied = false;
    await this.exclusive(async (tx) => {
      assertCurrent();
      const before = await tx.getFirstAsync<{ cursor: string; last_page: string | null }>('SELECT cursor,last_page FROM cache_scopes WHERE account_id=? AND organization_id=?', scope.accountId, scope.organizationId);
      if (before?.last_page === serialized && before.cursor === page.cursor) return;
      if (!before?.cursor || before.cursor !== page.fromCursor) throw new Error('Sync cursor changed; refresh from the durable cursor');
      for (const change of page.changes) {
        assertCurrent();
        if (change.entity === 'checklist') {
          if (change.operation === 'upsert') await this.upsertChecklist(tx,scope,change.checklist!);
          else await tx.runAsync('DELETE FROM cached_checklists WHERE account_id=? AND organization_id=? AND project_id=?',scope.accountId,scope.organizationId,change.projectId);
        } else if (change.entity === 'template') {
          if (change.operation === 'upsert') await this.upsertTemplate(tx,scope,change.template!);
        } else if (change.entity === 'project') {
          if (change.operation === 'upsert') await this.upsertProject(tx, scope, change.project!);
          else {
            await tx.runAsync('DELETE FROM cached_assignments WHERE account_id=? AND organization_id=? AND project_id=?', scope.accountId, scope.organizationId, change.projectId);
            await tx.runAsync('DELETE FROM cached_checklists WHERE account_id=? AND organization_id=? AND project_id=?', scope.accountId, scope.organizationId, change.projectId);
            await tx.runAsync('DELETE FROM cached_projects WHERE account_id=? AND organization_id=? AND id=?', scope.accountId, scope.organizationId, change.projectId);
          }
        } else if (change.operation === 'upsert') await this.upsertAssignment(tx, scope, change.assignment!);
        else {
          await tx.runAsync('DELETE FROM cached_assignments WHERE account_id=? AND organization_id=? AND project_id=? AND worker_id=?', scope.accountId, scope.organizationId, change.projectId, change.accountId!);
          // A raw page boundary can split an assignment and project tombstone.
          // Own assignment removal is already authoritative: hide the project
          // in THIS commit even if the next network page never arrives.
          if (change.accountId === scope.accountId) {
            await tx.runAsync('DELETE FROM cached_checklists WHERE account_id=? AND organization_id=? AND project_id=?',scope.accountId,scope.organizationId,change.projectId);
            await tx.runAsync('DELETE FROM cached_projects WHERE account_id=? AND organization_id=? AND id=?', scope.accountId, scope.organizationId, change.projectId);
          }
        }
      }
      // A crash, SQL failure or scope switch before this point rolls back rows AND
      // cursor. The local revision also fences reads overlapping this commit.
      assertCurrent();
      await tx.runAsync('UPDATE cache_scopes SET cursor=?,last_page=?,revision=revision+1 WHERE account_id=? AND organization_id=?', page.cursor, serialized, scope.accountId, scope.organizationId);
      assertCurrent(); applied = true;
    });
    return applied;
  }
  async upsertChecklist(tx: SqlConnection, scope: Scope, run: ChecklistRun) {
    assertChecklistRun(run,scope,run.projectId);
    const existing = await tx.getFirstAsync<{payload:string}>('SELECT payload FROM cached_checklists WHERE account_id=? AND organization_id=? AND project_id=?',scope.accountId,scope.organizationId,run.projectId);
    if (existing && (JSON.parse(existing.payload) as ChecklistRun).version > run.version) return;
    await tx.runAsync('INSERT INTO cached_checklists(account_id,organization_id,project_id,payload) VALUES(?,?,?,?) ON CONFLICT(account_id,organization_id,project_id) DO UPDATE SET payload=excluded.payload',scope.accountId,scope.organizationId,run.projectId,JSON.stringify(run));
  }
  private async upsertTemplate(tx: SqlConnection, scope: Scope, template: ChecklistTemplate) {
    await tx.runAsync('INSERT INTO cached_checklist_templates(account_id,organization_id,id,version,payload) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING',scope.accountId,scope.organizationId,template.id,template.version,JSON.stringify(template));
  }
  private async upsertProject(tx: SqlConnection, scope: Scope, project: Project) {
    await tx.runAsync('INSERT INTO cached_projects(account_id,organization_id,id,name,description,address,status,updated_at,version) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(account_id,organization_id,id) DO UPDATE SET name=excluded.name,description=excluded.description,address=excluded.address,status=excluded.status,updated_at=excluded.updated_at,version=excluded.version', scope.accountId, scope.organizationId, project.id, project.name, project.description, project.address, project.status, project.updatedAt, project.version);
  }
  private async upsertAssignment(tx: SqlConnection, scope: Scope, assignment: Assignment) {
    await tx.runAsync('INSERT INTO cached_assignments(account_id,organization_id,project_id,worker_id,version,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(account_id,organization_id,project_id,worker_id) DO UPDATE SET version=excluded.version,updated_at=excluded.updated_at', scope.accountId, scope.organizationId, assignment.projectId, assignment.accountId, assignment.version, assignment.updatedAt);
  }
  async assignments(scope: Scope): Promise<Assignment[]> {
    const rows = await this.db.getAllAsync<Omit<Assignment, 'active'>>('SELECT organization_id AS organizationId,project_id AS projectId,worker_id AS accountId,version,updated_at AS updatedAt FROM cached_assignments WHERE account_id=? AND organization_id=? ORDER BY project_id,worker_id', scope.accountId, scope.organizationId);
    return rows.map((row) => ({ ...row, active: true }));
  }
  async list(scope: Scope): Promise<Project[]> {
    return this.db.getAllAsync<Project>('SELECT id, organization_id AS organizationId, name, description, address, status, updated_at AS updatedAt, version FROM cached_projects WHERE account_id=? AND organization_id=? ORDER BY name,id', scope.accountId, scope.organizationId);
  }
  async detail(scope: Scope, id: string): Promise<Project> {
    const project = await this.db.getFirstAsync<Project>('SELECT id, organization_id AS organizationId, name, description, address, status, updated_at AS updatedAt, version FROM cached_projects WHERE account_id=? AND organization_id=? AND id=?', scope.accountId, scope.organizationId, id);
    if (!project) throw new Error('Project unavailable in this local snapshot');
    return project;
  }
  async metadata(scope: Scope) {
    return this.db.getFirstAsync<{ revision: number; validatedAt: string; cursor: string | null }>('SELECT revision,validated_at AS validatedAt,cursor FROM cache_scopes WHERE account_id=? AND organization_id=?', scope.accountId, scope.organizationId);
  }
  async removeScope(scope: Scope) {
    await this.exclusive(async (tx) => {
      // Expo exclusive transactions open another connection. Purge explicitly
      // as well as defining FKs; never rely on connection-local PRAGMA defaults.
      await tx.runAsync('DELETE FROM cached_checklists WHERE account_id=? AND organization_id=?', scope.accountId, scope.organizationId);
      await tx.runAsync('DELETE FROM cached_checklist_templates WHERE account_id=? AND organization_id=?', scope.accountId, scope.organizationId);
      await tx.runAsync('DELETE FROM cached_assignments WHERE account_id=? AND organization_id=?', scope.accountId, scope.organizationId);
      await tx.runAsync('DELETE FROM cached_projects WHERE account_id=? AND organization_id=?', scope.accountId, scope.organizationId);
      await tx.runAsync('DELETE FROM cache_scopes WHERE account_id=? AND organization_id=?', scope.accountId, scope.organizationId);
    });
  }
  async removeAccount(accountId: string) {
    await this.exclusive(async (tx) => {
      await tx.runAsync('DELETE FROM cached_checklists WHERE account_id=?',accountId);
      await tx.runAsync('DELETE FROM cached_checklist_templates WHERE account_id=?',accountId);
      await tx.runAsync('DELETE FROM cached_assignments WHERE account_id=?', accountId);
      await tx.runAsync('DELETE FROM cached_projects WHERE account_id=?', accountId);
      await tx.runAsync('DELETE FROM cache_scopes WHERE account_id=?', accountId);
    });
  }
}
