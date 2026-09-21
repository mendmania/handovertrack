import { UploadExecutor, type UploadTransport } from './upload';
import { ApiError } from '@handovertrack/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import type { Api, Scope, SyncBootstrap } from '@handovertrack/contracts';
import { localCommitted } from '@handovertrack/query';
import { SnapshotStore, migrationV1, migrationV2, type SqlConnection, type SqlDatabase } from '../db/store';
import { SnapshotCoordinator } from '../snapshot/coordinator';
import { captureKeys, captureListOptions, capturesCommitted } from '../capture/query';
import { CaptureService } from './service';
import { captureDirectory, type CaptureFiles, type CaptureTicket } from './types';

const a: Scope = { accountId: '11111111-1111-4111-8111-111111111111', organizationId: '22222222-2222-4222-8222-222222222222' };
const b: Scope = { accountId: '33333333-3333-4333-8333-333333333333', organizationId: '44444444-4444-4444-8444-444444444444' };
const projectId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const dimensions = { width: 1280, height: 960 };
const cleanups: (() => Promise<void>)[] = [];
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });
function bootstrap(scope = a): SyncBootstrap {
  return { ...scope, complete: true, generatedAt: '2026-09-21T12:00:00.000Z', cursor: 'durable-task02-cursor', assignments: [], projects: [{ id: projectId, organizationId: scope.organizationId, name: 'Assigned project', description: 'Local work', address: 'Site', status: 'active', version: 3, updatedAt: '2026-09-21T12:00:00.000Z' }] };
}
async function fixture(legacy = false) {
  const root = await mkdtemp(join(tmpdir(), 'handovertrack-capture-')); const dbPath = join(root, 'local.db');
  let db = new DatabaseSync(dbPath); let fault: string | undefined;
  const source = join(root, 'camera.jpg'); const originalBytes = Buffer.from('camera-original-byte-sequence'.repeat(100)); await writeFile(source, originalBytes);
  const connection = (value: DatabaseSync): SqlConnection => ({
    async execAsync(sql) { value.exec(sql); },
    async runAsync(sql, ...params) {
      if (fault === 'db_finalize' && sql.startsWith("UPDATE media_queue SET state='pending'")) throw new Error('Simulated transaction interruption');
      return value.prepare(sql).run(...params);
    },
    async getAllAsync<T>(sql: string, ...params: (string | number | null)[]) { return value.prepare(sql).all(...params) as T[]; },
    async getFirstAsync<T>(sql: string, ...params: (string | number | null)[]) { return (value.prepare(sql).get(...params) as T) ?? null; },
  });
  const adapter: SqlDatabase = {
    execAsync: async (sql) => connection(db).execAsync(sql),
    runAsync: async (sql, ...params) => connection(db).runAsync(sql, ...params),
    getAllAsync: async <T>(sql: string, ...params: (string | number | null)[]) => connection(db).getAllAsync<T>(sql, ...params),
    getFirstAsync: async <T>(sql: string, ...params: (string | number | null)[]) => connection(db).getFirstAsync<T>(sql, ...params),
    async withExclusiveTransactionAsync(run) {
      const tx = new DatabaseSync(dbPath); tx.exec('PRAGMA foreign_keys=OFF; BEGIN');
      try { await run(connection(tx)); tx.exec('COMMIT'); } catch (error) { tx.exec('ROLLBACK'); throw error; } finally { tx.close(); }
    },
  };
  if (legacy) { db.exec(migrationV1); db.exec(migrationV2); }
  const store = new SnapshotStore(adapter);
  if (legacy) await store.bootstrap(a, bootstrap(), () => {});
  await store.migrate(); await store.migrate();
  if (!legacy) await store.bootstrap(a, bootstrap(), () => {});
  const full = (relative: string) => { if (!relative.startsWith('captures/') || relative.split('/').some((part) => part === '..' || part === '.')) throw new Error('Invalid file path'); return join(root, relative); };
  const exists = async (path: string) => { try { await stat(path); return true; } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; } };
  const inspect = async (path: string) => { const bytes = await readFile(path); return { size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }; };
  const files: CaptureFiles = {
    randomUUID, now: () => new Date().toISOString(),
    async ensureDirectory(path) { await mkdir(full(path), { recursive: true }); },
    async writeManifest(path, text) {
      if (fault === 'manifest') throw new Error('ENOSPC: device full');
      const target = full(path);
      if (await exists(target)) { if (await readFile(target, 'utf8') !== text) throw new Error('Immutable manifest conflict'); return; }
      const staging = `${target}.${randomUUID()}.tmp`; await writeFile(staging, text); await rename(staging, target);
    },
    async readText(path) { return readFile(full(path), 'utf8'); },
    async listCaptureDirectories() {
      const found: string[] = [];
      async function walk(path: string, depth: number) {
        if (!await exists(join(root, path))) return;
        if (depth === 3) { found.push(path); return; }
        for (const entry of await readdir(join(root, path), { withFileTypes: true })) if (entry.isDirectory()) await walk(`${path}/${entry.name}`, depth + 1);
      }
      await walk('captures', 0); return found;
    },
    async exists(path) { return exists(full(path)); },
    async copyFromCamera(uri, path) {
      if (fault === 'copy_partial') { await writeFile(full(path), originalBytes.subarray(0, 50)); throw new Error('ENOSPC during copy'); }
      await copyFile(uri, full(path)); if (fault === 'copy_after') throw new Error('Terminated after copy');
    },
    async move(from, to) { await rename(full(from), full(to)); if (fault === 'move_after') throw new Error('Terminated after final move'); },
    async inspect(path) { return inspect(full(path)); }, inspectCamera: inspect,
    uri: full,
  };
  let service = new CaptureService(store, files);
  cleanups.push(async () => { db.close(); await rm(root, { recursive: true, force: true }); });
  return { root, source, store, files, full, bytes: originalBytes, db: () => db, get service() { return service; }, fault(value?: string) { fault = value; },
    async reopen() { db.close(); db = new DatabaseSync(dbPath); await store.migrate(); service = new CaptureService(store, files); },
    async capture(scope = a) { const ticket = await service.reserve(scope, projectId, () => {}); return { ticket, saved: await service.save(ticket, source, dimensions) }; },
  };
}
describe('durable local capture, real SQLite and filesystem boundary', () => {
  it('upgrades Task02 in place and reserves owner + blocked intent before camera use', async () => {
    const f = await fixture(true); expect(f.db().prepare('PRAGMA user_version').get()?.user_version).toBe(4);
    expect((await f.store.metadata(a))?.cursor).toBe('durable-task02-cursor'); expect((await f.store.list(a))[0]?.version).toBe(3);
    const ticket = await f.service.reserve(a, projectId, () => {});
    expect(f.db().prepare('SELECT state FROM media_local').get()?.state).toBe('staging');
    expect(f.db().prepare('SELECT state FROM media_queue').get()?.state).toBe('blocked');
    expect(JSON.parse(await f.files.readText(`${ticket.directory}/reservation.json`)).ticket).toEqual(ticket);
    expect(() => f.db().prepare('UPDATE media_queue SET account_id=? WHERE media_id=?').run(b.accountId, ticket.id)).toThrow('FOREIGN KEY');
    await f.store.migrate(); expect(f.db().prepare('SELECT COUNT(*) AS n FROM media_local').get()?.n).toBe(1);
  });
  it('rejects unavailable projects, changed scope and malformed owner IDs before camera', async () => {
    const f = await fixture();
    await expect(f.service.reserve(b, projectId, () => {})).rejects.toThrow('unavailable');
    await expect(f.service.reserve(a, projectId, () => { throw new Error('Scope changed'); })).rejects.toThrow('Scope changed');
    await expect(f.service.reserve({ ...a, accountId: '../escape' }, projectId, () => {})).rejects.toThrow('Invalid');
    let guards = 0;
    await expect(f.service.reserve(a, projectId, () => { if (++guards === 3) throw new Error('Switched during reservation'); })).rejects.toThrow('Switched during reservation');
    expect(f.db().prepare('SELECT COUNT(*) AS n FROM media_queue').get()?.n).toBe(0);
  });
  it('saves verified app-owned bytes and queue together; cold reopen and Query eviction reconstruct gallery', async () => {
    const f = await fixture(); const { ticket, saved } = await f.capture();
    expect(saved).toMatchObject({ state: 'saved_local', queueState: 'pending', projectAvailable: true, size: f.bytes.length });
    expect(await readFile(f.full(saved.originalPath!))).toEqual(f.bytes);
    const client = new QueryClient(); const query = { queryKey: ['account', a.accountId, 'org', a.organizationId, 'local', 'media'], queryFn: () => f.service.list(a) };
    const before = await client.fetchQuery(query); client.clear(); await rm(f.source); await f.reopen();
    expect(await f.service.reconcile()).toMatchObject({ saved: 1, errors: 0 });
    expect(await client.fetchQuery(query)).toEqual(before); client.clear();
    expect((await f.service.list(a))[0]?.id).toBe(ticket.id); expect(f.db().prepare('SELECT COUNT(*) AS n FROM media_queue').get()?.n).toBe(1);
    const revision = await f.service.revision(a); await f.service.list(a); await f.service.reconcile(); expect(await f.service.revision(a)).toBe(revision);
  });
  it.each(['uploading','server_accepted','completed','failed'])('verification and restart preserve %s queue state and receipt', async (state) => {
    const f = await fixture(); const { ticket } = await f.capture();
    f.db().prepare("UPDATE media_queue SET state=?,upload_id=?,bytes_sent=?,accepted_at=?,reason=? WHERE media_id=?").run(state,randomUUID(),f.bytes.length,'2026-09-21T12:00:00.000Z','NETWORK_STATE',ticket.id);
    const before = f.db().prepare('SELECT * FROM media_queue').get();
    await f.reopen(); await f.service.reconcile(); await f.service.list(a);
    expect(f.db().prepare('SELECT * FROM media_queue').get()).toEqual(before);
  });
  it('upload replay aborts after account switch and cannot publish a late accepted receipt', async () => {
    const f = await fixture(); const { saved } = await f.capture(); let current = true; let completions = 0;
    const entered = deferred<void>(); const gate = deferred<void>();
    const response = { mediaId:saved.id,uploadId:randomUUID(),accountId:a.accountId,organizationId:a.organizationId,projectId,
      size:saved.size!,sha256:saved.sha256!,width:saved.width!,height:saved.height!,state:'pending' as const,acceptedAt:null };
    const transport: UploadTransport = {
      api: {
        async me() { return { accountId:a.accountId,name:'Worker',memberships:[{ organizationId:a.organizationId,organizationName:'Org',role:'field_worker',capabilities:[] }] }; },
        async createUpload() { entered.resolve(); await gate.promise; return response; },
        async uploadStatus() { throw new Error('Unexpected status'); },
        async completeUpload() { completions++; return { ...response,state:'accepted',acceptedAt:new Date().toISOString() }; },
      },
      async content() { throw new Error('Must never upload after switch'); },
    };
    const run = new UploadExecutor(f.service,async () => {}).run(a,transport,new AbortController().signal,() => { if (!current) throw new Error('Scope changed'); });
    await entered.promise; current = false; await f.store.removeAccount(a.accountId); await f.store.bootstrap(b,bootstrap(b),() => {}); gate.resolve();
    await expect(run).rejects.toThrow('Scope changed'); expect(completions).toBe(0);
    expect(f.db().prepare('SELECT account_id,state,accepted_at FROM media_queue').get()).toMatchObject({ account_id:a.accountId,state:'uploading',accepted_at:null });
    expect(await f.service.list(b)).toEqual([]); expect(await f.files.exists(saved.originalPath!)).toBe(true);
  });
  it('expired authentication blocks only the original owner and leaves bytes/intent for reauthentication', async () => {
    const f = await fixture(); const { saved } = await f.capture();
    const denied = async (): Promise<never> => { throw new ApiError(401,'UNAUTHENTICATED'); };
    const transport: UploadTransport = {
      api: {
        async me() { return { accountId:a.accountId,name:'Worker',memberships:[{ organizationId:a.organizationId,organizationName:'Org',role:'field_worker',capabilities:[] }] }; },
        createUpload:denied,uploadStatus:denied,completeUpload:denied,
      }, content:denied,
    };
    await expect(new UploadExecutor(f.service,async () => {}).run(a,transport,new AbortController().signal,() => {})).rejects.toMatchObject({ status:401 });
    await f.reopen(); await f.service.reconcile();
    expect(f.db().prepare('SELECT account_id,state,reason FROM media_queue').get()).toMatchObject({ account_id:a.accountId,state:'blocked',reason:'UNAUTHENTICATED' });
    expect(await f.files.exists(saved.originalPath!)).toBe(true);
    await f.service.repository.retry(a,() => {}); expect((await f.service.list(a))[0]?.queueState).toBe('pending');
  });
  it('missing accepted local original cannot erase acceptance receipt or claim local saved status', async () => {
    const f = await fixture(); const { saved } = await f.capture();
    f.db().prepare("UPDATE media_queue SET state='server_accepted',accepted_at=?").run('2026-09-21T12:00:00.000Z');
    await rm(f.full(saved.originalPath!)); await f.reopen(); await f.service.reconcile();
    expect((await f.service.list(a))[0]).toMatchObject({ state:'missing_original',queueState:'blocked',originalPath:null });
    expect(f.db().prepare('SELECT state,accepted_at FROM media_queue').get()).toMatchObject({ state:'server_accepted',accepted_at:'2026-09-21T12:00:00.000Z' });
  });
  it('preserves original owner after logout during camera callback and through rebootstrap', async () => {
    const f = await fixture(); const ticket = await f.service.reserve(a, projectId, () => {});
    await f.store.removeAccount(a.accountId); await f.store.bootstrap(b, bootstrap(b), () => {});
    const saved = await f.service.save(ticket, f.source, dimensions);
    expect(saved).toMatchObject({ accountId: a.accountId, organizationId: a.organizationId, state: 'saved_local', queueState: 'blocked', queueReason: 'PROJECT_UNAVAILABLE' });
    expect(await f.service.list(b)).toEqual([]); expect(await f.service.list({ ...a, organizationId: b.organizationId })).toEqual([]);
    await f.store.bootstrap(a, { ...bootstrap(), projects: [] }, () => {}); expect((await f.service.list(a))[0]?.queueState).toBe('blocked');
    await f.store.removeScope(a); expect(await f.files.exists(saved.originalPath!)).toBe(true);
    await f.store.bootstrap(a, bootstrap(), () => {}); expect((await f.service.list(a))[0]?.queueState).toBe('pending');
    expect(f.db().prepare('SELECT account_id,organization_id FROM media_queue').get()).toMatchObject({ account_id: a.accountId, organization_id: a.organizationId });
  });
  it('camera cancellation and no-space reservation never report saved', async () => {
    const f = await fixture(); const ticket = await f.service.reserve(a, projectId, () => {}); await f.service.abandon(ticket);
    expect((await f.service.list(a))[0]).toMatchObject({ state: 'interrupted', queueState: 'blocked', originalPath: null });
    f.fault('manifest'); await expect(f.service.reserve(a, projectId, () => {})).rejects.toThrow('ENOSPC'); f.fault();
    await f.service.reconcile(); expect((await f.service.list(a)).every((row) => row.state !== 'saved_local')).toBe(true);
  });
  it('retains partial staging bytes on disk-full and repeatedly blocks false success', async () => {
    const f = await fixture(); const ticket = await f.service.reserve(a, projectId, () => {}); f.fault('copy_partial');
    await expect(f.service.save(ticket, f.source, dimensions)).rejects.toThrow('ENOSPC'); f.fault(); await f.reopen();
    await f.service.reconcile(); await f.service.reconcile();
    expect((await f.service.list(a))[0]).toMatchObject({ state: 'interrupted', queueState: 'blocked', reason: 'COPY_INCOMPLETE', originalPath: null });
    expect((await readFile(f.full(`${ticket.directory}/original.part`))).length).toBe(50); expect(await f.files.exists(`${ticket.directory}/original.jpg`)).toBe(false);
  });
  it.each(['copy_after', 'move_after', 'db_finalize'])('recovers %s crash without duplicate logical media or queue entries', async (fault) => {
    const f = await fixture(); const ticket = await f.service.reserve(a, projectId, () => {}); f.fault(fault);
    await expect(f.service.save(ticket, f.source, dimensions)).rejects.toThrow();
    expect(f.db().prepare('SELECT state FROM media_queue WHERE media_id=?').get(ticket.id)?.state).toBe('blocked');
    f.fault(); await f.reopen(); expect(await f.service.reconcile()).toMatchObject({ saved: 1, errors: 0 }); await f.service.reconcile();
    const rows = await f.service.list(a); expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ id: ticket.id, state: 'saved_local', queueState: 'pending' });
    expect(await readFile(f.full(rows[0]!.originalPath!))).toEqual(f.bytes);
    expect(f.db().prepare('SELECT COUNT(*) AS n FROM media_queue').get()?.n).toBe(1);
  });
  it('missing and corrupt originals become blocked and never claim saved or silently disappear', async () => {
    const f = await fixture(); const first = await f.capture(); const second = await f.capture();
    await rm(f.full(first.saved.originalPath!)); await writeFile(f.full(second.saved.originalPath!), 'corrupt');
    const rows = await f.service.list(a);
    expect(rows.find((row) => row.id === first.ticket.id)).toMatchObject({ state: 'missing_original', queueState: 'blocked', originalPath: null });
    expect(rows.find((row) => row.id === second.ticket.id)).toMatchObject({ state: 'quarantined', queueState: 'blocked', originalPath: null });
    expect(await readFile(f.full(second.saved.originalPath!), 'utf8')).toBe('corrupt'); expect(f.db().prepare('SELECT COUNT(*) AS n FROM media_queue').get()?.n).toBe(2);
  });
  it('recovers valid orphan manifests under original owner; unknown and conflicting owners remain quarantined', async () => {
    const f = await fixture(); const { ticket, saved } = await f.capture();
    f.db().prepare('DELETE FROM media_queue WHERE media_id=?').run(ticket.id); f.db().prepare('DELETE FROM media_local WHERE id=?').run(ticket.id);
    const unknown = `captures/${a.accountId}/${a.organizationId}/${randomUUID()}`; await f.files.ensureDirectory(unknown); await writeFile(f.full(`${unknown}/original.jpg`), 'unowned');
    const identity = { ...b, id: randomUUID() }; const wrongDir = captureDirectory({ ...identity, accountId: a.accountId }); await f.files.ensureDirectory(wrongDir);
    await f.files.writeManifest(`${wrongDir}/reservation.json`, JSON.stringify({ version: 1, ticket: { ...identity, projectId, createdAt: ticket.createdAt, directory: captureDirectory(identity) } }));
    expect(await f.service.reconcile()).toMatchObject({ saved: 1, quarantined: 2, errors: 0 });
    expect((await f.service.list(a))[0]?.id).toBe(ticket.id); expect(await f.service.list(b)).toEqual([]);
    expect(await f.files.exists(saved.originalPath!)).toBe(true); expect(await f.files.exists(`${unknown}/original.jpg`)).toBe(true);
    expect(f.db().prepare('SELECT COUNT(*) AS n FROM media_orphans').get()?.n).toBe(2);
  });
  it('rejects ticket reassignment and manifest mutation; duplicate recovery does not duplicate intent', async () => {
    const f = await fixture(); const { ticket } = await f.capture();
    const forged: CaptureTicket = { ...ticket, projectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2' };
    await expect(f.service.save(forged, f.source, dimensions)).rejects.toThrow('stored owner');
    await expect(f.service.save(ticket, f.source, { ...dimensions, width: 100 })).rejects.toThrow('manifest conflict');
    await f.service.reconcile(); expect((await f.service.list(a))[0]?.state).toBe('saved_local'); expect(f.db().prepare('SELECT COUNT(*) AS n FROM media_queue').get()?.n).toBe(1);
  });
  it('serializes capture persistence with concurrent sync writes and multiple camera callbacks', async () => {
    const f = await fixture(); const tickets = await Promise.all([f.service.reserve(a, projectId, () => {}), f.service.reserve(a, projectId, () => {})]);
    await Promise.all([f.service.save(tickets[0]!, f.source, dimensions), f.store.bootstrap(a, bootstrap(), () => {}), f.service.save(tickets[1]!, f.source, dimensions), f.service.reconcile()]);
    expect((await f.service.list(a)).every((row) => row.state === 'saved_local')).toBe(true); expect((await f.service.list(a)).length).toBe(2);
  });
  it('restores missing queue intent from the immutable owner without claiming it before verification', async () => {
    const f = await fixture(); const { ticket } = await f.capture(); f.db().prepare('DELETE FROM media_queue WHERE media_id=?').run(ticket.id);
    expect((await f.service.repository.list(a))[0]).toMatchObject({ queueState: 'blocked', queueReason: 'QUEUE_MISSING' });
    expect(await f.service.reconcile()).toMatchObject({ saved: 1, errors: 0 });
    expect((await f.service.list(a))[0]).toMatchObject({ queueState: 'pending', state: 'saved_local' });
    expect(f.db().prepare('SELECT account_id,organization_id FROM media_queue').get()).toMatchObject({ account_id: a.accountId, organization_id: a.organizationId });
  });
  it('quarantines an impossible queue-owner conflict without modifying or replaying the foreign intent', async () => {
    const f = await fixture(); const { ticket } = await f.capture();
    // Simulate damaged/legacy state, bypassing the composite FK deliberately.
    f.db().exec('PRAGMA foreign_keys=OFF'); f.db().prepare('UPDATE media_queue SET account_id=? WHERE media_id=?').run(b.accountId, ticket.id); f.db().exec('PRAGMA foreign_keys=ON');
    await expect(f.service.save(ticket, f.source, dimensions)).rejects.toThrow('Queue owner conflicts');
    expect(await f.service.reconcile()).toMatchObject({ quarantined: 1, errors: 0 });
    expect((await f.service.list(a))[0]).toMatchObject({ state: 'quarantined', queueState: 'blocked', reason: 'OWNER_CONFLICT', originalPath: null });
    expect(await f.service.list(b)).toEqual([]);
    expect(f.db().prepare('SELECT account_id,state FROM media_queue').get()).toMatchObject({ account_id: b.accountId, state: 'pending' });
    expect(await f.files.exists(`${ticket.directory}/original.jpg`)).toBe(true);
  });
  it('active capture queries reject delayed old reads after capture commit and assignment revocation', async () => {
    const f = await fixture(); await f.capture(); const client = new QueryClient();
    // This test uses only activate/read; no network method is invoked.
    const coordinator = new SnapshotCoordinator(f.store, client, {} as Api, () => {}, async () => {}, async () => {}); await coordinator.activate(a);
    const realList = f.service.list.bind(f.service); let reads = 0; let gate = deferred<void>(); let entered = deferred<void>();
    f.service.list = async (...args) => { const rows = await realList(...args); if (++reads === 1) { entered.resolve(); await gate.promise; } return rows; };
    const observer = new QueryObserver(client, captureListOptions(a, f.service, coordinator)); const unsubscribe = observer.subscribe(() => {});
    cleanups.push(async () => { unsubscribe(); client.clear(); });
    await entered.promise; await f.capture(); await capturesCommitted(client, a); gate.resolve();
    await new Promise((done) => setTimeout(done, 0));
    expect(client.getQueryData(captureKeys.list(a))).toEqual(await realList(a)); expect((client.getQueryData(captureKeys.list(a)) as unknown[]).length).toBe(2);
    reads = 0; gate = deferred<void>(); entered = deferred<void>(); const refreshing = client.refetchQueries({ queryKey: captureKeys.list(a) });
    await entered.promise; await f.store.bootstrap(a, { ...bootstrap(), projects: [] }, () => {}); await localCommitted(client, a); gate.resolve(); await refreshing;
    await new Promise((done) => setTimeout(done, 0));
    expect(client.getQueryData(captureKeys.list(a))).toEqual(await realList(a));
    expect((client.getQueryData(captureKeys.list(a)) as { queueState: string }[]).every((row) => row.queueState === 'blocked')).toBe(true);
  });
  it('a late gallery read cannot republish an old owner after scope change', async () => {
    const f = await fixture(); await f.capture(); const client = new QueryClient(); const coordinator = new SnapshotCoordinator(f.store, client, {} as Api, () => {}, async () => {}, async () => {}); await coordinator.activate(a);
    const gate = deferred<void>(); const entered = deferred<void>(); const realList = f.service.list.bind(f.service);
    f.service.list = async (...args) => { const rows = await realList(...args); entered.resolve(); await gate.promise; return rows; };
    const reading = client.fetchQuery(captureListOptions(a, f.service, coordinator)).catch(() => undefined); await entered.promise;
    await coordinator.activate(b); gate.resolve(); await reading;
    expect(client.getQueryCache().getAll()).toEqual([]); expect(await realList(b)).toEqual([]); expect((await realList(a)).length).toBe(1); client.clear();
  });
  it('rejects a fresh old-scope gallery request started after account switch or logout', async () => {
    const f = await fixture(); await f.capture(); const client = new QueryClient(); const coordinator = new SnapshotCoordinator(f.store, client, {} as Api, () => {}, async () => {}, async () => {}); await coordinator.activate(a);
    expect((await client.fetchQuery(captureListOptions(a, f.service, coordinator))).length).toBe(1);
    for (const next of [b, undefined]) {
      await coordinator.activate(next);
      await expect(client.fetchQuery(captureListOptions(a, f.service, coordinator))).rejects.toThrow('Scope changed');
      expect(client.getQueryData(captureKeys.list(a))).toBeUndefined();
    }
    expect((await f.service.list(a)).length).toBe(1); client.clear();
  });
});
