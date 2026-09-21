import type { Scope } from '@handovertrack/contracts';
import type { SnapshotStore } from '../db/store';
import { CaptureRepository } from './repository';
import { assertOriginal, assertTicket, captureDirectory, sameTicket, CaptureOwnershipError, type CaptureFiles, type CaptureManifest, type CaptureRecord, type CaptureTicket, type Dimensions, type OriginalInfo, type RecoverySummary } from './types';

function matches(a: OriginalInfo, b: OriginalInfo): boolean { return a.size === b.size && a.sha256 === b.sha256; }
function manifestText(ticket: CaptureTicket, original?: OriginalInfo & Dimensions): string {
  return JSON.stringify({ version: 1, ticket, ...(original ? { original } : {}) } satisfies CaptureManifest);
}
export class CaptureService {
  readonly repository: CaptureRepository;
  private operations: Promise<unknown> = Promise.resolve();
  constructor(store: SnapshotStore, readonly files: CaptureFiles) { this.repository = new CaptureRepository(store); }
  private serial<T>(run: () => Promise<T>): Promise<T> {
    const next = this.operations.then(run); this.operations = next.catch(() => {}); return next;
  }
  async reserve(scope: Scope, projectId: string, assertCurrent: () => void): Promise<CaptureTicket> {
    return this.serial(async () => {
      assertCurrent();
      const identity = { accountId: scope.accountId, organizationId: scope.organizationId, id: this.files.randomUUID() };
      const ticket: CaptureTicket = Object.freeze({ ...identity, projectId, createdAt: this.files.now(), directory: captureDirectory(identity) });
      assertTicket(ticket);
      await this.repository.reserve(ticket, assertCurrent);
      try {
        await this.files.ensureDirectory(ticket.directory);
        await this.files.writeManifest(`${ticket.directory}/reservation.json`, manifestText(ticket));
        assertCurrent();
        return ticket;
      } catch (error) {
        await this.repository.blocked(ticket, 'interrupted', 'RESERVATION_INTERRUPTED', this.files.now()).catch(() => {});
        throw error;
      }
    });
  }
  async abandon(ticket: CaptureTicket): Promise<void> {
    await this.serial(async () => {
      assertTicket(ticket);
      const row = await this.repository.get(ticket);
      if (row?.state === 'staging') await this.repository.blocked(ticket, 'interrupted', 'CAPTURE_CANCELLED', this.files.now());
    });
  }
  async save(ticket: CaptureTicket, sourceUri: string, dimensions: Dimensions): Promise<CaptureRecord> {
    // The ticket's original owner deliberately survives a logout or switch while
    // the camera is active. Only the caller's UI publication is scope-fenced.
    return this.serial(async () => {
      assertTicket(ticket);
      if (!await this.repository.get(ticket)) throw new Error('Capture reservation is missing');
      try {
        const original = { ...await this.files.inspectCamera(sourceUri), width: dimensions.width, height: dimensions.height };
        assertOriginal(original);
        await this.files.writeManifest(`${ticket.directory}/manifest.json`, manifestText(ticket, original));
        const final = `${ticket.directory}/original.jpg`; const staging = `${ticket.directory}/original.part`;
        if (!await this.files.exists(final)) {
          if (!await this.files.exists(staging)) await this.files.copyFromCamera(sourceUri, staging);
          if (!matches(await this.files.inspect(staging), original)) throw new Error('Captured original copy could not be verified');
          await this.files.move(staging, final);
        }
        if (!matches(await this.files.inspect(final), original)) throw new Error('Captured original integrity check failed');
        await this.repository.saved(ticket, original, this.files.now());
        return (await this.repository.get(ticket))!;
      } catch (error) {
        // DB failure after the final move is safe: immutable manifest + original
        // remain for startup reconciliation, but this attempt reports no success.
        await this.repository.blocked(ticket, 'interrupted', 'SAVE_INTERRUPTED', this.files.now()).catch(() => {});
        throw error;
      }
    });
  }
  private async manifest(directory: string): Promise<CaptureManifest> {
    const path = await this.files.exists(`${directory}/manifest.json`) ? `${directory}/manifest.json` : `${directory}/reservation.json`;
    const value = JSON.parse(await this.files.readText(path)) as CaptureManifest;
    if (value.version !== 1) throw new Error('Unsupported capture manifest');
    assertTicket(value.ticket);
    if (value.ticket.directory !== directory) throw new Error('Manifest directory does not match owner');
    if (value.original) assertOriginal(value.original);
    return value;
  }
  private async recover(directory: string, known?: CaptureRecord): Promise<'saved' | 'blocked' | 'quarantined'> {
    let value: CaptureManifest;
    try { value = await this.manifest(directory); }
    catch {
      // A row proves its own identity, but an invalid/missing manifest must never
      // be assigned to whoever happens to be logged in during startup recovery.
      if (known) await this.repository.blocked(known, 'quarantined', 'MANIFEST_UNAVAILABLE', this.files.now());
      await this.repository.quarantine(directory, 'MANIFEST_UNAVAILABLE', this.files.now());
      return 'quarantined';
    }
    const { ticket, original } = value;
    if (known && (!sameTicket(known, ticket) || (known.sha256 && original && (known.sha256 !== original.sha256 || known.size !== original.size)))) {
      await this.repository.blocked(known, 'quarantined', 'MANIFEST_CONFLICT', this.files.now());
      await this.repository.quarantine(directory, 'MANIFEST_CONFLICT', this.files.now());
      return 'quarantined';
    }
    try { await this.repository.restore(ticket); }
    catch (error) {
      if (!(error instanceof CaptureOwnershipError)) throw error;
      if (known) await this.repository.blocked(known, 'quarantined', 'OWNER_CONFLICT', this.files.now());
      await this.repository.quarantine(directory, 'OWNER_CONFLICT', this.files.now());
      return 'quarantined';
    }
    const final = `${directory}/original.jpg`; const staging = `${directory}/original.part`;
    if (!original) {
      const bytesExist = await this.files.exists(final) || await this.files.exists(staging);
      await this.repository.blocked(ticket, bytesExist ? 'quarantined' : 'interrupted', bytesExist ? 'UNVERIFIABLE_ORIGINAL' : 'CAPTURE_INCOMPLETE', this.files.now());
      return bytesExist ? 'quarantined' : 'blocked';
    }
    if (!await this.files.exists(final)) {
      if (!await this.files.exists(staging)) {
        await this.repository.blocked(ticket, 'missing_original', 'ORIGINAL_MISSING', this.files.now());
        return 'blocked';
      }
      if (!matches(await this.files.inspect(staging), original)) {
        await this.repository.blocked(ticket, 'interrupted', 'COPY_INCOMPLETE', this.files.now());
        return 'blocked';
      }
      await this.files.move(staging, final);
    }
    if (!matches(await this.files.inspect(final), original)) {
      await this.repository.blocked(ticket, 'quarantined', 'ORIGINAL_CORRUPT', this.files.now());
      return 'quarantined';
    }
    await this.repository.saved(ticket, original, this.files.now());
    return 'saved';
  }
  async reconcile(): Promise<RecoverySummary> {
    return this.serial(async () => {
      const result: RecoverySummary = { saved: 0, blocked: 0, quarantined: 0, errors: 0 };
      const rows = await this.repository.all(); const known = new Map(rows.map((row) => [row.directory, row]));
      const directories = new Set([...await this.files.listCaptureDirectories(), ...known.keys()]);
      for (const directory of directories) {
        try { result[await this.recover(directory, known.get(directory))]++; }
        catch { result.errors++; }
      }
      return result;
    });
  }
  async list(scope: Scope, projectId?: string): Promise<CaptureRecord[]> {
    return this.serial(async () => {
      for (const row of await this.repository.list(scope, projectId)) {
        // Never return a previous saved status if verification itself failed.
        await this.recover(row.directory, row);
      }
      return this.repository.list(scope, projectId);
    });
  }
  revision(scope: Scope): Promise<number> { return this.repository.revision(scope); }
}
