import type { Scope } from '@handovertrack/contracts';

export type CaptureState = 'staging' | 'saved_local' | 'interrupted' | 'missing_original' | 'quarantined';
export interface CaptureTicket extends Scope {
  readonly id: string;
  readonly projectId: string;
  readonly createdAt: string;
  readonly directory: string;
}
export interface OriginalInfo { size: number; sha256: string }
export interface Dimensions { width: number; height: number }
export interface CaptureRecord extends CaptureTicket {
  updatedAt: string;
  state: CaptureState;
  size: number | null;
  sha256: string | null;
  width: number | null;
  height: number | null;
  reason: string | null;
  queueState: 'pending' | 'blocked';
  queueReason: string | null;
  projectAvailable: boolean;
  originalPath: string | null;
}
export interface CaptureManifest {
  version: 1;
  ticket: CaptureTicket;
  original?: OriginalInfo & Dimensions;
}
export interface CaptureFiles {
  randomUUID(): string;
  now(): string;
  ensureDirectory(relativeDir: string): Promise<void>;
  /** Publish once using a same-directory temp file and move without overwrite.
   * An existing byte-identical manifest is an idempotent success; otherwise fail. */
  writeManifest(relativePath: string, text: string): Promise<void>;
  readText(relativePath: string): Promise<string>;
  listCaptureDirectories(): Promise<string[]>;
  exists(relativePath: string): Promise<boolean>;
  copyFromCamera(sourceUri: string, relativePath: string): Promise<void>;
  move(relativeFrom: string, relativeTo: string): Promise<void>;
  inspect(relativePath: string): Promise<OriginalInfo>;
  inspectCamera(sourceUri: string): Promise<OriginalInfo>;
  uri(relativePath: string): string;
}
export interface RecoverySummary { saved: number; blocked: number; quarantined: number; errors: number }
export class CaptureOwnershipError extends Error {}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function captureDirectory(ticket: Pick<CaptureTicket, 'accountId' | 'organizationId' | 'id'>): string {
  if (![ticket.accountId, ticket.organizationId, ticket.id].every((value) => uuid.test(value))) throw new Error('Invalid capture owner or ID');
  return `captures/${ticket.accountId}/${ticket.organizationId}/${ticket.id}`;
}
export function assertTicket(value: CaptureTicket): void {
  if (!value || !uuid.test(value.projectId) || value.directory !== captureDirectory(value) || !Number.isFinite(Date.parse(value.createdAt))) throw new Error('Invalid capture ticket');
}
export function assertOriginal(value: OriginalInfo & Dimensions): void {
  if (!value || !Number.isSafeInteger(value.size) || value.size <= 0 || value.size > 50 * 1024 * 1024 || !/^[0-9a-f]{64}$/.test(value.sha256)
    || !Number.isSafeInteger(value.width) || value.width <= 0 || !Number.isSafeInteger(value.height) || value.height <= 0) throw new Error('Invalid or unsupported captured original');
}
export function sameTicket(a: CaptureTicket, b: CaptureTicket): boolean {
  return a.id === b.id && a.accountId === b.accountId && a.organizationId === b.organizationId && a.projectId === b.projectId && a.directory === b.directory && a.createdAt === b.createdAt;
}
