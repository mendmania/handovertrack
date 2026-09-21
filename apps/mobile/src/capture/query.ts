import { queryOptions, type QueryClient } from '@tanstack/react-query';
import type { Scope } from '@handovertrack/contracts';
import { scopeKey } from '@handovertrack/query';
import type { CaptureService } from '../media/service';
import type { SnapshotCoordinator } from '../snapshot/coordinator';
export const captureKeys = {
  all: (scope: Scope) => [...scopeKey(scope), 'local', 'captures'] as const,
  list: (scope: Scope, projectId?: string) => [...captureKeys.all(scope), 'list', { projectId }] as const,
};
export function captureListOptions(scope: Scope, service: CaptureService, coordinator: SnapshotCoordinator, projectId?: string) {
  return queryOptions({
    queryKey: captureKeys.list(scope, projectId), networkMode: 'always', staleTime: Infinity, retry: false,
    queryFn: ({ signal }) => coordinator.read(scope, async () => {
      for (;;) {
        if (signal.aborted) throw Object.assign(new Error('Read cancelled'), { name: 'AbortError' });
        const before = await service.revision(scope);
        const rows = await service.list(scope, projectId);
        const after = await service.revision(scope);
        if (before === after) return rows;
      }
    }, signal),
  });
}
export async function capturesCommitted(client: QueryClient, scope?: Scope) {
  const filters = scope ? { queryKey: captureKeys.all(scope) } : { predicate: (query: { queryKey: readonly unknown[] }) => query.queryKey.includes('local') && query.queryKey.includes('captures') };
  await client.cancelQueries(filters); await client.invalidateQueries(filters);
}
