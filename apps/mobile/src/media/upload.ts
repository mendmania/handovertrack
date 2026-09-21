import { ApiError, type Api, type Scope, type Upload } from '@handovertrack/contracts';
import type { CaptureService } from './service';
import type { CaptureRecord } from './types';

export interface UploadTransport {
  api: Pick<Api, 'me' | 'createUpload' | 'uploadStatus' | 'completeUpload'>;
  content(row: CaptureRecord, uploadId: string, signal: AbortSignal, progress: (bytes: number) => void): Promise<Upload>;
}
function verifyReceipt(row: CaptureRecord, value: Upload) {
  if (value.mediaId !== row.id || value.accountId !== row.accountId || value.organizationId !== row.organizationId || value.projectId !== row.projectId
    || value.size !== row.size || value.sha256 !== row.sha256 || value.width !== row.width || value.height !== row.height
    || !['pending','staged','accepted'].includes(value.state) || (value.state === 'accepted' && !value.acceptedAt)) throw new ApiError(502, 'INVALID_UPLOAD_RECEIPT');
}
// One executor per provider. The transport captures credentials for this run;
// callbacks can never attach a new login's cookie or change the capture owner.
export class UploadExecutor {
  private running = false;
  constructor(private captures: CaptureService, private changed: (scope: Scope) => Promise<void>) {}
  async run(scope: Scope, transport: UploadTransport, signal: AbortSignal, assertScope: () => void) {
    if (this.running) return;
    this.running = true;
    const current = () => { assertScope(); if (signal.aborted) throw Object.assign(new Error('Upload cancelled'), { name: 'AbortError' }); };
    const repository = this.captures.repository;
    try {
      current(); const me = await transport.api.me(signal); current();
      if (me.accountId !== scope.accountId || !me.memberships.some((m) => m.organizationId === scope.organizationId)) throw new ApiError(401, 'IDENTITY_CHANGED');
      const rows = await this.captures.list(scope); current();
      for (const row of rows) {
        current();
        if (row.state !== 'saved_local' || !row.projectAvailable || !['pending','uploading'].includes(row.queueState) || row.nextAttemptAt > Date.now()) continue;
        // Verify again immediately before replay; sync can revoke between items.
        const fresh = await repository.get(row); current();
        if (!fresh?.projectAvailable || fresh.state !== 'saved_local') continue;
        try {
          await repository.uploadState(row, { state: 'uploading', attempts: row.attempts + 1, bytesSent: 0 }, current);
          await this.changed(scope); current();
          let result = row.uploadId ? await transport.api.uploadStatus(scope, row.uploadId, signal) : await transport.api.createUpload(scope, row.projectId, {
            accountId: row.accountId, mediaId: row.id, capturedAt: row.createdAt, mime: 'image/jpeg',
            size: row.size!, sha256: row.sha256!, width: row.width!, height: row.height!,
          }, signal);
          current(); verifyReceipt(row, result);
          await repository.uploadState(row, { state: 'uploading', uploadId: result.uploadId }, current);
          if (result.state === 'pending') {
            let last = 0; let acceptingProgress = true;
            try { result = await transport.content(row, result.uploadId, signal, (bytes) => {
              try {
                current(); if (!acceptingProgress) return; if (Date.now() - last < 500) return; last = Date.now();
                void repository.uploadState(row, { state: 'uploading', bytesSent: Math.min(bytes,row.size!) }, current).catch(() => {});
              } catch { /* Late progress belongs to a closed scope. */ }
            }); } finally { acceptingProgress = false; }
            current(); verifyReceipt(row,result);
          }
          if (result.state !== 'accepted') { current(); result = await transport.api.completeUpload(scope,result.uploadId,signal); current(); verifyReceipt(row,result); }
          if (result.state !== 'accepted') throw new ApiError(502,'INVALID_UPLOAD_RECEIPT');
          await repository.uploadState(row, { state: 'server_accepted', uploadId: result.uploadId, acceptedAt: result.acceptedAt!, bytesSent: row.size! }, current);
        } catch (error) {
          current(); // Cancellation leaves uploading intact for status reconciliation.
          const code = error instanceof ApiError ? error.code : 'NETWORK_RETRY';
          const denied = error instanceof ApiError && [401,403,404].includes(error.status);
          const terminal = error instanceof ApiError && [400,422].includes(error.status);
          const exhausted = row.attempts + 1 >= 8;
          await repository.uploadState(row, {
            state: denied ? 'blocked' : terminal || exhausted ? 'failed' : 'pending',
            reason: exhausted ? 'RETRY_EXHAUSTED' : code,
            nextAttemptAt: Date.now() + Math.min(300_000, 2000 * 2 ** row.attempts),
          }, current);
          if (error instanceof ApiError && [401,403].includes(error.status)) throw error;
        } finally { await this.changed(scope); }
      }
    } finally { this.running = false; }
  }
}
