import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { ApiError, type Api, type ProjectSnapshot, type Scope, type SyncBootstrap, type SyncPage } from '@handovertrack/contracts';
import { projectListOptions, projectKeys, ScopeFence, clearProtectedQueries, localCommitted } from '@handovertrack/query';
import { SnapshotStore, migrationV1, type SqlDatabase, type SqlConnection } from './store';
import { SnapshotCoordinator } from '../snapshot/coordinator';
const a: Scope = { accountId: 'account-a', organizationId: 'org-a' };
const b: Scope = { accountId: 'account-b', organizationId: 'org-b' };
function snapshot(scope = a, name = 'North project'): ProjectSnapshot {
  return { ...scope, complete: true, generatedAt: new Date().toISOString(), projects: [{ id: 'project-1', organizationId: scope.organizationId, name, description: 'Work', address: 'Site', status: 'active', version: 1, updatedAt: new Date().toISOString() }] };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup(); });
async function database(legacy = false) {
  const directory = mkdtempSync(join(tmpdir(), 'handovertrack-sqlite-')); const path = join(directory, 'test.db');
  let db = new DatabaseSync(path);
  cleanups.push(() => { db.close(); rmSync(directory, { recursive: true, force: true }); });
  const connection = (get: () => DatabaseSync): SqlConnection => ({
    async execAsync(sql) { get().exec(sql); },
    async runAsync(sql, ...params) { return get().prepare(sql).run(...params); },
    async getAllAsync<T>(sql: string, ...params: (string | number | null)[]) { return get().prepare(sql).all(...params) as T[]; },
    async getFirstAsync<T>(sql: string, ...params: (string | number | null)[]) { return (get().prepare(sql).get(...params) as T) ?? null; },
  });
  const adapter: SqlDatabase = {
    ...connection(() => db),
    async withExclusiveTransactionAsync(run) {
      const tx = new DatabaseSync(path); tx.exec('PRAGMA foreign_keys=OFF; BEGIN');
      try { await run(connection(() => tx)); tx.exec('COMMIT'); }
      catch (error) { tx.exec('ROLLBACK'); throw error; }
      finally { tx.close(); }
    },
  };
  if (legacy) {
    db.exec(migrationV1);
    db.prepare('INSERT INTO cache_scopes(account_id,organization_id,revision,validated_at) VALUES(?,?,1,?)').run(a.accountId, a.organizationId, new Date().toISOString());
    db.prepare('INSERT INTO cached_projects(account_id,organization_id,id,name,description,address,status,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(a.accountId, a.organizationId, 'project-1', 'Task 01 cached project', 'Work', 'Site', 'active', new Date().toISOString());
  }
  const store = new SnapshotStore(adapter); await store.migrate(); await store.migrate();
  return { store, reopen() { db.close(); db = new DatabaseSync(path); db.exec('PRAGMA foreign_keys=ON'); }, db: () => db };
}
function queryClient() { const client = new QueryClient(); cleanups.push(() => client.clear()); return client; }
function fakeApi(scope: Scope, remote: () => Promise<ProjectSnapshot>): Api {
  const unused = async (): Promise<never> => { throw new Error('unused command'); };
  return { sharing: unused, createShare: unused, revokeShare: unused, reviewDecision: unused, proof: unused, saveProof: unused, requestReport: unused, reportStatus: unused, retryReport: unused, checklistTemplates: unused, publishChecklistTemplate: unused, checklist: unused, checklistCommand: unused, createUpload: unused, uploadStatus: unused, completeUpload: unused, media: unused, createProject: unused, updateProject: unused, workers: unused, assignments: unused, setAssignment: unused, me: async () => ({ accountId: scope.accountId, name: 'Worker', memberships: [{ organizationId: scope.organizationId, organizationName: 'Crew', role: 'field_worker', capabilities: ['project.read_assigned'] }] }), snapshot: remote, bootstrap: async () => ({ ...await remote(), assignments: [], cursor: 'bootstrap' }), pull: async (_scope: Scope, cursor: string) => ({ ...scope, fromCursor: cursor, cursor: 'next', hasMore: false, changes: [] }), list: async () => [], detail: async () => { throw new Error('unused'); } };
}
describe('durable read-only SQLite boundary', () => {
  it('migrates with WAL/FKs, persists across reopen, and reconstructs after Query cache loss', async () => {
    const { store, reopen, db } = await database(); const client = queryClient();
    expect(db().prepare('PRAGMA journal_mode').get()?.journal_mode).toBe('wal');
    expect(db().prepare('PRAGMA foreign_keys').get()?.foreign_keys).toBe(1);
    await store.replace(a, snapshot(), () => {});
    const options = projectListOptions(a, 'local', () => store.list(a));
    const first = await client.fetchQuery(options); client.clear(); reopen();
    expect(await client.fetchQuery(options)).toEqual(first);
    expect(await store.list(b)).toEqual([]);
    expect(await store.list({ ...a, organizationId: b.organizationId })).toEqual([]);
    await expect(store.detail(b, 'project-1')).rejects.toThrow('unavailable');
  });
  it('rejects partial, overflow, duplicate and wrong-identity snapshots before replacement', async () => {
    const { store } = await database(); await store.replace(a, snapshot(), () => {});
    const bad = [ { ...snapshot(), complete: false }, snapshot(b), { ...snapshot(), projects: Array(201).fill(snapshot().projects[0]) }, { ...snapshot(), projects: [snapshot().projects[0], snapshot().projects[0]] } ];
    for (const value of bad) await expect(store.replace(a, value as ProjectSnapshot, () => {})).rejects.toThrow();
    expect((await store.list(a))[0]?.name).toBe('North project');
  });
  it('rolls back SQL deletes/inserts and revision if identity changes mid-transaction', async () => {
    const { store } = await database(); await store.replace(a, snapshot(), () => {});
    let calls = 0;
    await expect(store.replace(a, snapshot(a, 'New'), () => { if (++calls === 3) throw new Error('Switched'); })).rejects.toThrow('Switched');
    expect((await store.list(a))[0]?.name).toBe('North project');
    expect((await store.metadata(a))?.revision).toBe(1);
  });
  it('atomically replaces removals and deletes only the logged-out account', async () => {
    const { store } = await database(); await store.replace(a, snapshot(), () => {}); await store.replace(b, snapshot(b, 'South'), () => {});
    await store.replace(a, { ...snapshot(), projects: [] }, () => {}); expect(await store.list(a)).toEqual([]);
    await store.removeAccount(a.accountId); expect((await store.list(b))[0]?.name).toBe('South');
  });
});
describe('scope fences and commit/read races', () => {
  it('supports the native AbortSignal surface without throwIfAborted', async () => {
    const { store } = await database(); const client = queryClient(); await store.replace(a, snapshot(), () => {});
    const coordinator = new SnapshotCoordinator(store, client, fakeApi(a, async () => snapshot()), () => {}, async () => {}, async () => {});
    await coordinator.activate(a);
    const signal = { aborted: false } as AbortSignal;
    expect((await coordinator.read(a, () => store.list(a), signal))[0]?.name).toBe('North project');
    await expect(coordinator.read(a, () => store.list(a), { aborted: true } as AbortSignal)).rejects.toThrow('cancelled');
  });
  it('coalesces snapshot triggers and prevents late old-account HTTP data from populating storage', async () => {
    const { store } = await database(); const client = queryClient(); const response = deferred<ProjectSnapshot>(); let reads = 0;
    const coordinator = new SnapshotCoordinator(store, client, fakeApi(a, () => { reads++; return response.promise; }), () => {}, async () => {}, async () => {});
    await coordinator.activate(a); const first = coordinator.refresh(); const second = coordinator.refresh(); expect(first).toBe(second);
    await new Promise((done) => setTimeout(done, 0)); expect(reads).toBe(1);
    await coordinator.activate(b); response.resolve(snapshot()); await first;
    expect(await store.list(a)).toEqual([]); expect(await store.list(b)).toEqual([]);
  });
  it('authoritative revocation purges scope and invalidates cached reads', async () => {
    const { store } = await database(); const client = queryClient(); await store.replace(a, snapshot(), () => {});
    let revoked = false;
    const coordinator = new SnapshotCoordinator(store, client, fakeApi(a, async () => { throw new ApiError(404, 'NOT_FOUND'); }), () => {}, async () => {}, async () => { revoked = true; });
    await coordinator.activate(a); await client.fetchQuery(projectListOptions(a, 'local', () => store.list(a))); await coordinator.refresh();
    expect(revoked).toBe(true); expect(await store.list(a)).toEqual([]); expect(client.getQueryCache().getAll()).toEqual([]);
  });
  it('late revocation cleanup cannot deactivate a newly selected scope', async () => {
    const { store } = await database(); const client = queryClient(); const paused = deferred<void>(); const started = deferred<void>(); let revocations = 0;
    const remove = store.removeScope.bind(store);
    store.removeScope = async (scope) => { started.resolve(); await paused.promise; await remove(scope); };
    const api = fakeApi(a, async () => { throw new ApiError(404, 'NOT_FOUND'); });
    const coordinator = new SnapshotCoordinator(store, client, api, () => {}, async () => {}, async () => { revocations++; });
    await coordinator.activate(a); const refresh = coordinator.refresh(); await started.promise; await coordinator.activate(b); paused.resolve(); await refresh;
    expect(revocations).toBe(1); // Access closed before storage cleanup; no late callbacks.
    Object.assign(api, fakeApi(b, async () => snapshot(b, 'South'))); await coordinator.refresh();
    expect((await store.list(b))[0]?.name).toBe('South');
  });
  it('closes access on revocation even if SQLite purge fails', async () => {
    const { store } = await database(); const client = queryClient(); let revoked = false;
    store.removeScope = async () => { throw new Error('database is locked'); };
    const coordinator = new SnapshotCoordinator(store, client, fakeApi(a, async () => { throw new ApiError(401, 'UNAUTHENTICATED'); }), () => {}, async () => {}, async () => { revoked = true; });
    await coordinator.activate(a); await expect(coordinator.refresh()).resolves.toBeUndefined(); expect(revoked).toBe(true);
  });
  it('invalidates an active local query after commit and rejects an overlapping older read', async () => {
    const { store } = await database(); const client = queryClient(); await store.replace(a, snapshot(), () => {});
    const stale = deferred<ReturnType<typeof snapshot>['projects']>(); let reads = 0;
    const options = projectListOptions(a, 'local', async () => { if (++reads === 1) return stale.promise; return store.list(a); });
    const observer = new QueryObserver(client, options); const unsubscribe = observer.subscribe(() => {}); cleanups.push(unsubscribe);
    await store.replace(a, snapshot(a, 'New revision'), () => {}); await localCommitted(client, a);
    stale.resolve(snapshot().projects); await new Promise((done) => setTimeout(done, 0));
    expect(client.getQueryData(projectKeys.list(a, 'local'))).toEqual(await store.list(a)); expect(reads).toBe(2);
  });
  it('web-style logout fences ignored-abort reads before clearing Query state', async () => {
    const client = queryClient(); const fence = new ScopeFence(); const stale = deferred<string>(); const current = fence.capture();
    const read = client.fetchQuery({ queryKey: ['account', 'a'], queryFn: async () => { const result = await stale.promise; current(); return result; } }).catch(() => undefined);
    await clearProtectedQueries(client, fence); stale.resolve('private-a'); await read;
    expect(client.getQueryCache().getAll()).toEqual([]); expect(() => current()).toThrow('Scope changed');
  });
});
function bootstrap(scope = a, cursor = 'cursor-0'): SyncBootstrap {
  const value = snapshot(scope);
  return { ...value, cursor, assignments: [{ organizationId: scope.organizationId, projectId: 'project-1', accountId: scope.accountId, version: 1, active: true, updatedAt: value.generatedAt }] };
}
function page(scope = a, fromCursor = 'cursor-0', cursor = 'cursor-1'): SyncPage {
  return { ...scope, fromCursor, cursor, hasMore: false, changes: [{ revision: '1', ordinal: 0, entity: 'project', operation: 'upsert', projectId: 'project-1', project: { ...snapshot(scope, 'Updated by manager').projects[0]!, version: 2 } }] };
}
describe('incremental SQLite protocol', () => {
  it('upgrades an existing Task 01 database in place without losing offline rows', async () => {
    const { store, db } = await database(true);
    expect(db().prepare('PRAGMA user_version').get()?.user_version).toBe(5);
    expect((await store.list(a))[0]).toMatchObject({ name: 'Task 01 cached project', version: 1 });
    expect((await store.metadata(a))?.cursor).toBeNull();
    await store.bootstrap(a, bootstrap(), () => {});
    expect((await store.metadata(a))?.cursor).toBe('cursor-0');
  });
  it('commits page rows and cursor together; exact replay is a no-op and older pages cannot rewind', async () => {
    const { store, reopen } = await database(); await store.bootstrap(a, bootstrap(), () => {});
    const first = page(); expect(await store.applyPage(a, first, () => {})).toBe(true);
    const revision = (await store.metadata(a))!.revision;
    expect(await store.applyPage(a, first, () => {})).toBe(false);
    expect((await store.metadata(a))!.revision).toBe(revision);
    reopen(); expect((await store.metadata(a))!.cursor).toBe('cursor-1');
    expect((await store.list(a))[0]?.version).toBe(2);
    await store.applyPage(a, { ...page(a, 'cursor-1', 'cursor-2'), changes: [] }, () => {});
    await expect(store.applyPage(a, first, () => {})).rejects.toThrow('cursor changed');
    expect((await store.metadata(a))!.cursor).toBe('cursor-2');
  });
  it('rolls back after rows AND cursor have been written when a scope change prevents commit', async () => {
    const { store } = await database(); await store.bootstrap(a, bootstrap(), () => {});
    const before = await store.metadata(a); let guards = 0;
    await expect(store.applyPage(a, page(), () => { if (++guards === 4) throw new Error('Simulated termination before commit'); })).rejects.toThrow('before commit');
    expect(await store.metadata(a)).toEqual(before); expect((await store.list(a))[0]?.version).toBe(1);
    await store.applyPage(a, page(), () => {}); expect((await store.list(a))[0]?.version).toBe(2);
  });
  it('applies grants and targeted tombstones without touching another account or organization', async () => {
    const { store } = await database(); await store.bootstrap(a, bootstrap(), () => {}); await store.bootstrap(b, bootstrap(b), () => {});
    const remove: SyncPage = { ...page(), changes: [
      { revision: '2', ordinal: 0, entity: 'assignment', operation: 'remove', projectId: 'project-1', accountId: a.accountId },
      { revision: '2', ordinal: 1, entity: 'project', operation: 'remove', projectId: 'project-1' },
    ] };
    await store.applyPage(a, remove, () => {});
    expect(await store.list(a)).toEqual([]); expect(await store.assignments(a)).toEqual([]);
    expect((await store.list(b)).length).toBe(1); expect((await store.assignments(b)).length).toBe(1);
    const grant: SyncPage = { ...page(a, 'cursor-1', 'cursor-2'), changes: [
      { revision: '3', ordinal: 0, entity: 'project', operation: 'upsert', projectId: 'project-1', project: snapshot().projects[0]! },
      { revision: '3', ordinal: 1, entity: 'assignment', operation: 'upsert', projectId: 'project-1', accountId: a.accountId, assignment: { ...bootstrap().assignments[0]!, version: 3 } },
    ] };
    await store.applyPage(a, grant, () => {}); expect((await store.assignments(a))[0]?.version).toBe(3);
    await store.removeAccount(a.accountId); expect(await store.metadata(a)).toBeNull(); expect((await store.assignments(b)).length).toBe(1);
  });
  it('hides a revoked project at an assignment tombstone even if the next page fails', async () => {
    const { store } = await database(); const client = queryClient(); await store.bootstrap(a, bootstrap(), () => {});
    const api = fakeApi(a, async () => snapshot());
    api.pull = async (_scope, cursor) => {
      if (cursor !== 'cursor-0') throw new Error('Disconnected between revocation ordinals');
      return { ...page(), hasMore: true, changes: [{ revision: '2', ordinal: 1, entity: 'assignment', operation: 'remove', projectId: 'project-1', accountId: a.accountId }] };
    };
    const coordinator = new SnapshotCoordinator(store, client, api, () => {}, async () => {}, async () => {});
    await coordinator.activate(a); await coordinator.refresh();
    expect(await store.list(a)).toEqual([]); expect(await store.assignments(a)).toEqual([]); expect((await store.metadata(a))?.cursor).toBe('cursor-1');
  });
  it('rejects malformed, unordered and wrong-scope pages before changing storage', async () => {
    const { store } = await database(); await store.bootstrap(a, bootstrap(), () => {});
    const before = await store.metadata(a);
    const values = [page(b), { ...page(), changes: [page().changes[0]!, page().changes[0]!] }, { ...page(), changes: [{ ...page().changes[0]!, project: snapshot(b).projects[0]! }] }];
    for (const value of values) await expect(store.applyPage(a, value, () => {})).rejects.toThrow();
    expect(await store.metadata(a)).toEqual(before);
  });
  it('recovers an expired durable cursor using a complete bootstrap and continues incremental pulls', async () => {
    const { store } = await database(); const client = queryClient(); await store.bootstrap(a, bootstrap(a, 'expired'), () => {});
    const api = fakeApi(a, async () => snapshot(a, 'Recovered')); let bootstraps = 0; let pulls = 0;
    api.bootstrap = async () => { bootstraps++; return { ...bootstrap(a, 'fresh'), projects: snapshot(a, 'Recovered').projects }; };
    api.pull = async (_scope, cursor) => { pulls++; if (cursor === 'expired') throw new ApiError(410, 'CURSOR_EXPIRED'); return { ...a, fromCursor: cursor, cursor: 'current', hasMore: false, changes: [] }; };
    const coordinator = new SnapshotCoordinator(store, client, api, () => {}, async () => {}, async () => {});
    await coordinator.activate(a); await coordinator.refresh();
    expect(bootstraps).toBe(1); expect(pulls).toBe(2); expect((await store.metadata(a))!.cursor).toBe('current'); expect((await store.list(a))[0]?.name).toBe('Recovered');
  });
  it('closes cached access on a role/epoch change even when a fresh bootstrap would be unavailable', async () => {
    const { store } = await database(); const client = queryClient(); await store.bootstrap(a, bootstrap(), () => {});
    const api = fakeApi(a, async () => { throw new Error('Bootstrap unavailable'); }); let revoked = false; let bootstrapCalls = 0;
    api.bootstrap = async () => { bootstrapCalls++; throw new Error('Bootstrap unavailable'); };
    api.pull = async () => { throw new ApiError(403, 'ACCESS_CHANGED'); };
    const coordinator = new SnapshotCoordinator(store, client, api, () => {}, async () => {}, async () => { revoked = true; });
    await coordinator.activate(a); await coordinator.refresh();
    expect(revoked).toBe(true); expect(bootstrapCalls).toBe(0); expect(await store.list(a)).toEqual([]); expect(await store.metadata(a)).toBeNull();
  });
  it('continues from the committed page after a later network failure, then invalidates active local reads', async () => {
    const { store } = await database(); const client = queryClient(); await store.bootstrap(a, bootstrap(), () => {});
    const api = fakeApi(a, async () => snapshot()); const cursors: string[] = []; let fail = true;
    api.pull = async (_scope, cursor) => {
      cursors.push(cursor);
      if (cursor === 'cursor-0') return { ...page(), hasMore: true };
      if (fail) throw new Error('Connection interrupted');
      return { ...page(a, cursor, 'cursor-2'), changes: [] };
    };
    const states: string[] = [];
    const coordinator = new SnapshotCoordinator(store, client, api, (state) => states.push(state), async () => {}, async () => {});
    await coordinator.activate(a);
    const observer = new QueryObserver(client, projectListOptions(a, 'local', (signal) => coordinator.read(a, () => store.list(a), signal)));
    cleanups.push(observer.subscribe(() => {}));
    await coordinator.refresh(); expect(states.at(-1)).toBe('unavailable'); expect((await store.metadata(a))!.cursor).toBe('cursor-1');
    expect(client.getQueryData(projectKeys.list(a, 'local'))).toEqual(await store.list(a));
    fail = false; await coordinator.refresh(); expect(states.at(-1)).toBe('current'); expect(cursors).toEqual(['cursor-0', 'cursor-1', 'cursor-1']);
  });
});
