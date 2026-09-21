import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { ApiError, type Scope, type Project } from '@handovertrack/contracts';
export const scopeKey = (scope: Scope) => ['account', scope.accountId, 'org', scope.organizationId] as const;
export const projectKeys = {
  all: (scope: Scope, source: 'api' | 'local') => [...scopeKey(scope), source, 'projects'] as const,
  list: (scope: Scope, source: 'api' | 'local') => [...projectKeys.all(scope, source), 'list', {}] as const,
  detail: (scope: Scope, source: 'api' | 'local', id: string) => [...projectKeys.all(scope, source), 'detail', id] as const,
  sync: (scope: Scope, operation: 'identity' | 'bootstrap' | 'pull', cursor?: string) => [...scopeKey(scope), 'api', 'sync', operation, { cursor }] as const,
  snapshot: (scope: Scope) => [...scopeKey(scope), 'api', 'snapshot', { cap: 200 }] as const,
};
export function projectListOptions(scope: Scope, source: 'api' | 'local', reader: (signal: AbortSignal) => Promise<Project[]>) {
  return queryOptions({ queryKey: projectKeys.list(scope, source), queryFn: ({ signal }) => reader(signal), ...policy(source) });
}
export function projectDetailOptions(scope: Scope, source: 'api' | 'local', id: string, reader: (signal: AbortSignal) => Promise<Project>) {
  return queryOptions({ queryKey: projectKeys.detail(scope, source, id), queryFn: ({ signal }) => reader(signal), ...policy(source) });
}
function policy(source: 'api' | 'local') {
  return {
    staleTime: source === 'local' ? Infinity : 30_000,
    gcTime: 5 * 60_000,
    networkMode: source === 'local' ? 'always' as const : 'online' as const,
    retry: (count: number, error: Error) => source === 'api' && count < 1 && !(error instanceof ApiError && error.status < 500),
  };
}
// Invalidate local reads only after the durable commit. Cancel reads that began
// before commit so their stale result cannot win a race with the new revision.
export async function localCommitted(client: QueryClient, scope: Scope) {
  // Project access changes also affect whether retained local evidence is blocked.
  const queryKey = [...scopeKey(scope), 'local'];
  await client.cancelQueries({ queryKey });
  await client.invalidateQueries({ queryKey });
}
export class ScopeFence {
  private generation = 0;
  capture() { const generation = this.generation; return () => { if (generation !== this.generation) throw Object.assign(new Error('Scope changed'), { name: 'AbortError' }); }; }
  advance() { this.generation += 1; }
}
export async function clearProtectedQueries(client: QueryClient, fence: ScopeFence) {
  fence.advance();
  await client.cancelQueries();
  client.clear();
}
