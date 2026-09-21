'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { clearProtectedQueries } from '@handovertrack/query';
import { fence } from './browser';
import { AUTH_CHANGE_KEY } from './auth-change';
export function makeQueryClient() { return new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } }); }
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  const [switching, setSwitching] = useState(false);
  useEffect(() => {
    const onChange = (event: StorageEvent) => {
      if (event.key !== AUTH_CHANGE_KEY) return;
      setSwitching(true);
      void clearProtectedQueries(client, fence).then(() => window.location.assign('/sign-in'));
    };
    window.addEventListener('storage', onChange);
    const onRestore = (event: PageTransitionEvent) => { if (event.persisted) { setSwitching(true); void clearProtectedQueries(client, fence).then(() => window.location.reload()); } };
    window.addEventListener('pageshow', onRestore);
    return () => { window.removeEventListener('storage', onChange); window.removeEventListener('pageshow', onRestore); };
  }, [client]);
  if (switching) return <p role="status">Account changed. Closing this session…</p>;
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
