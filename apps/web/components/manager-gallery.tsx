'use client';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { Scope } from '@handovertrack/contracts';
import { scopeKey } from '@handovertrack/query';
import { api, fenced } from '../lib/browser';

export function ManagerGallery({ scope, projectId }: { scope: Scope; projectId: string }) {
  const client = useQueryClient();
  const queryKey = [...scopeKey(scope),'api','media',projectId];
  const query = useInfiniteQuery({
    queryKey, initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) => fenced((s) => api.media(scope,projectId,s,pageParam))(signal),
    getNextPageParam: (page) => page.next ?? undefined, refetchInterval: 5000, retry: false, staleTime: 0,
  });
  const rows = query.data?.pages.flatMap((page) => page.media) ?? [];
  return <section aria-label="Project photos"><div className="section-title"><div><p className="eyebrow">PHOTO EVIDENCE</p><h2>Project photos <span className="count">{rows.length}</span></h2></div><button className="secondary" onClick={() => void client.invalidateQueries({ queryKey })}>Refresh photos</button></div>
    <p className="muted">Verified originals are retained. Previews appear after processing.</p>
    {query.error ? <p role="alert">Photos unavailable. Check your project access or refresh.</p> : <>
      {query.isPending && <p role="status">Loading photos…</p>}
      {!query.isPending && rows.length === 0 && <div className="card"><h3>No uploaded photos yet</h3><p>Photos saved by your crew will appear here after the server verifies them.</p></div>}
      <div className="media-grid">{rows.map((row) => {
        const path = `/media/organizations/${scope.organizationId}/assets/${row.mediaId}`;
        return <article className="card media-card" key={row.mediaId}>
          {row.processing === 'ready' ? <a href={path + '/preview'} target="_blank" rel="noreferrer"><img src={path + '/thumb'} alt="Project evidence photo" loading="lazy" /></a> : <div className="media-placeholder">{row.processing === 'failed' ? 'Preview needs attention' : 'Preparing preview…'}</div>}
          <p><strong>Original verified</strong><br /><span className="muted">{new Date(row.capturedAt).toLocaleString()}</span></p>
          <p className="footnote">{(row.size / 1048576).toFixed(1)} MB · {row.width} × {row.height}</p>
          {row.processing === 'failed' && <p role="status">Processing failed. The original is safe; ask the operator to retry processing.</p>}
          <a href={path + '/original'} target="_blank" rel="noreferrer">Open original ↗</a>
        </article>;
      })}</div>
      {query.hasNextPage && <button onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>Load more photos</button>}
    </>}
  </section>;
}
