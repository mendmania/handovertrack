import { QueryClient } from '@tanstack/react-query';
import { ApiError, type Api, type Scope, type Me } from '@handovertrack/contracts';
import { ScopeFence, clearProtectedQueries, localCommitted, projectKeys } from '@handovertrack/query';
import type { SnapshotStore } from '../db/store';
export type SnapshotState = 'cached' | 'refreshing' | 'current' | 'unavailable' | 'revoked';
export class SnapshotCoordinator {
  readonly fence = new ScopeFence();
  private scope?: Scope;
  private flight?: { generation: () => void; promise: Promise<void> };
  constructor(readonly store: SnapshotStore, readonly client: QueryClient, private api: Api,
    private state: (value: SnapshotState) => void,
    private validated: (scope: Scope, me: Me) => Promise<void>,
    private revoked: (scope: Scope) => Promise<void>) {}
  async activate(scope?: Scope) {
    this.scope = undefined;
    const clearing = clearProtectedQueries(this.client, this.fence);
    const current = this.fence.capture();
    await clearing; current();
    this.flight = undefined;
    this.scope = scope;
    this.state('cached');
  }
  refresh(): Promise<void> {
    if (!this.scope) return Promise.resolve();
    if (this.flight) return this.flight.promise;
    const scope = this.scope; const current = this.fence.capture();
    const promise = this.run(scope, current).finally(() => { if (this.flight?.generation === current) this.flight = undefined; });
    this.flight = { generation: current, promise };
    return promise;
  }
  private async run(scope: Scope, current: () => void) {
    this.state('refreshing');
    try {
      // Every trigger revalidates the session and membership. Connectivity is a
      // hint only; the durable cursor, not Query state, determines the next page.
      const identity = await this.client.fetchQuery({
        queryKey: projectKeys.sync(scope, 'identity'), staleTime: 0, retry: false, networkMode: 'always', gcTime: 0,
        queryFn: ({ signal }) => this.api.me(signal),
      });
      current();
      if (identity.accountId !== scope.accountId) throw new ApiError(401, 'IDENTITY_CHANGED');
      if (!identity.memberships.some((membership) => membership.organizationId === scope.organizationId)) throw new ApiError(404, 'NOT_FOUND');
      let cursor = (await this.store.metadata(scope))?.cursor;
      current();
      const bootstrap = async () => {
        const value = await this.client.fetchQuery({
          queryKey: projectKeys.sync(scope, 'bootstrap'), staleTime: 0, retry: false, networkMode: 'always', gcTime: 0,
          queryFn: ({ signal }) => this.api.bootstrap(scope, signal),
        });
        current(); await this.store.bootstrap(scope, value, current); current();
        await localCommitted(this.client, scope); current();
        return value.cursor;
      };
      if (!cursor) cursor = await bootstrap();
      let recovered = false;
      for (let pages = 0; ; pages++) {
        // Bound one foreground refresh under continuous writes. Committed pages
        // remain durable; the next trigger continues from the last saved cursor.
        if (pages === 1000) throw new Error('More changes remain; refresh to continue');
        try {
          const fromCursor: string = cursor;
          const page = await this.client.fetchQuery({
            queryKey: projectKeys.sync(scope, 'pull', fromCursor), staleTime: 0, retry: false, networkMode: 'always', gcTime: 0,
            queryFn: ({ signal }) => this.api.pull(scope, fromCursor, signal),
          });
          current(); await this.store.applyPage(scope, page, current); current();
          await localCommitted(this.client, scope); current();
          cursor = page.cursor;
          if (!page.hasMore) break;
          if (cursor === fromCursor) throw new Error('Sync page did not advance');
        } catch (error) {
          current();
          if (!recovered && error instanceof ApiError && error.status === 410) {
            recovered = true; cursor = await bootstrap();
          } else throw error;
        }
      }
      await this.validated(scope, identity);
      current(); this.state('current');
    } catch (error) {
      try { current(); } catch { return; }
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        // Only server read models are purged. Task 03 evidence and its queue
        // retain their original owner in independent tables and private files.
        this.fence.advance();
        const cleanupCurrent = this.fence.capture();
        this.scope = undefined;
        await this.client.cancelQueries();
        try { cleanupCurrent(); } catch { return; }
        this.client.clear();
        this.state('revoked'); await this.revoked(scope);
        // Authoritative denial closes offline access even if the disk is locked.
        // Purging is scoped, serialized with replacements, and cannot authorize UI.
        try { await this.store.removeScope(scope); } catch { /* Access remains closed; next login reconciles storage. */ }
      } else this.state('unavailable'); // Connectivity is only a hint; never retry-loop.
    }
  }
  async read<T>(scope: Scope, reader: () => Promise<T>, signal: AbortSignal): Promise<T> {
    const generation = this.fence.capture();
    const current = () => {
      generation();
      if (this.scope?.accountId !== scope.accountId || this.scope?.organizationId !== scope.organizationId) throw Object.assign(new Error('Scope changed'), { name: 'AbortError' });
    };
    for (;;) {
      current(); if (signal.aborted) throw Object.assign(new Error('Read cancelled'), { name: 'AbortError' });
      const before = await this.store.metadata(scope);
      const result = await reader();
      const after = await this.store.metadata(scope);
      current(); if (signal.aborted) throw Object.assign(new Error('Read cancelled'), { name: 'AbortError' });
      if (before?.revision === after?.revision) return result;
    }
  }
}
