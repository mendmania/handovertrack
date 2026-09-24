import { localCommitted } from '@handovertrack/query';
import { ChecklistStore, ChecklistExecutor } from './checklists/store';
import { checklistTransport } from './checklists/native-transport';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { QueryClient, QueryClientProvider, onlineManager, focusManager } from '@tanstack/react-query';
import type { Me, Scope } from '@handovertrack/contracts';
import { api, authClient, clearLocalCredentials, LOCAL_SCOPE_KEY, OFFLINE_ACCESS_MS } from './auth/client';
import { SnapshotStore } from './db/store';
import { UploadExecutor } from './media/upload';
import { nativeUploadTransport } from './capture/native-upload';
import { CaptureService } from './media/service';
import { nativeCaptureFiles } from './capture/native-files';
import { capturesCommitted } from './capture/query';
import { SnapshotCoordinator, type SnapshotState } from './snapshot/coordinator';

export type LocalIdentity = { scope: Scope; name: string; organizationName: string; validatedAt: number };
interface SessionContext {
  ready: boolean; busy: boolean; identity: LocalIdentity | null; memberships: Me['memberships']; online: boolean;
  checklists?: ChecklistStore; status: SnapshotState; error: string; coordinator?: SnapshotCoordinator; captures?: CaptureService; mediaWarning: string;
  retryUploads(): Promise<void>;
  reconcileCaptures(): Promise<void>;
  signIn(email: string, password: string): Promise<void>; logout(): Promise<void>;
  selectOrganization(id: string): Promise<void>; refresh(): Promise<void>;
}
const Context = createContext<SessionContext | null>(null);
export function useWorkspace() { const value = useContext(Context); if (!value) throw new Error('Missing workspace provider'); return value; }
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }));
  const [ready, setReady] = useState(false); const [identity, setIdentity] = useState<LocalIdentity | null>(null);
  const identityRef = useRef<LocalIdentity | null>(null); const [memberships, setMemberships] = useState<Me['memberships']>([]);
  const [status, setStatus] = useState<SnapshotState>('cached'); const [error, setError] = useState(''); const [online, setOnline] = useState(false);
  const [coordinator, setCoordinator] = useState<SnapshotCoordinator>();
  const [checklists,setChecklists] = useState<ChecklistStore>();
  const [captures, setCaptures] = useState<CaptureService>();
  const [mediaWarning, setMediaWarning] = useState('');
  const [busy, setBusy] = useState(false); const busyRef = useRef(false);
  const transition = useRef(0);
  const uploadAbort = useRef<AbortController | null>(null);
  function setLocal(value: LocalIdentity | null) { if (!value || value.scope.accountId !== identityRef.current?.scope.accountId || value.scope.organizationId !== identityRef.current?.scope.organizationId) uploadAbort.current?.abort(); identityRef.current = value; setIdentity(value); }
  useEffect(() => {
    let alive = true;
    void (async () => {
      const db = await SQLite.openDatabaseAsync('handovertrack-projects-v1.db');
      const store = new SnapshotStore(db); await store.migrate();
      if (!alive) return;
      const media = new CaptureService(store, nativeCaptureFiles);
      // Reconcile all original owners internally, without exposing account names,
      // filenames or counts to the signed-out UI. Never delete evidence here.
      try {
        const result = await media.reconcile();
        if (result.errors || result.quarantined) setMediaWarning('Local photo storage needs attention. Recovery can be retried after signing in.');
      } catch { setMediaWarning('Photo recovery could not finish. Free storage if needed and retry from Saved photos.'); }
      if (!alive) return;
      setCaptures(media); setChecklists(new ChecklistStore(store));
      const runner = new SnapshotCoordinator(store, client, api, setStatus, async (scope, me) => {
        const active = identityRef.current;
        if (!active || active.scope.accountId !== scope.accountId || active.scope.organizationId !== scope.organizationId) return;
        const updated = { ...active, validatedAt: Date.now() };
        SecureStore.setItem(LOCAL_SCOPE_KEY, JSON.stringify(updated));
        setMemberships(me.memberships);
        setLocal(updated);
      }, async () => {
        ++transition.current; setLocal(null); setMemberships([]);
        SecureStore.setItem(LOCAL_SCOPE_KEY, ''); clearLocalCredentials();
        setError('Access changed. Cached access was removed. Sign in again.');
      });
      const saved = await SecureStore.getItemAsync(LOCAL_SCOPE_KEY);
      if (saved) {
        try {
          const value = JSON.parse(saved) as LocalIdentity;
          if (!value.scope?.accountId || !value.scope.organizationId || typeof value.name !== 'string' || typeof value.organizationName !== 'string' || !Number.isFinite(value.validatedAt) || value.validatedAt > Date.now() || Date.now() - value.validatedAt > OFFLINE_ACCESS_MS) throw new Error('Offline access expired');
          if (!await store.metadata(value.scope)) throw new Error('No complete cached snapshot');
          await runner.activate(value.scope); setLocal(value);
        } catch { SecureStore.setItem(LOCAL_SCOPE_KEY, ''); setError('Sign in online to renew cached access.'); }
      }
      setCoordinator(runner); setReady(true);
    })().catch(() => { setError('Local storage could not be opened. Restart the app and try again.'); setReady(true); });
    return () => { alive = false; };
  }, [client]);
  useEffect(() => {
    if (!coordinator) return;
    let alive = true;
    const update = (state: Network.NetworkState) => {
      const connected = state.isConnected === true && state.isInternetReachable !== false;
      onlineManager.setOnline(connected); setOnline(connected);
      if (connected) void coordinator.refresh();
    };
    const network = Network.addNetworkStateListener(update);
    void Network.getNetworkStateAsync().then((state) => { if (alive) update(state); }).catch(() => { if (alive) { setOnline(false); onlineManager.setOnline(false); } });
    const app = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
      if (state === 'active') {
        void reconcileCaptures();
        const active = identityRef.current;
        if (active && Date.now() - active.validatedAt > OFFLINE_ACCESS_MS) void expire();
        else if (onlineManager.isOnline()) void coordinator.refresh();
      }
    });
    async function expire() {
      ++transition.current; setLocal(null); SecureStore.setItem(LOCAL_SCOPE_KEY, ''); await coordinator!.activate();
      setError('Cached access expired. Sign in online again.');
    }
    return () => { alive = false; network.remove(); app.remove(); };
  }, [coordinator, captures]);
  useEffect(() => {
    if (!coordinator || !identity?.validatedAt) return;
    const active = identity;
    const timer = setTimeout(() => {
      if (identityRef.current !== active) return;
      ++transition.current; setLocal(null); SecureStore.setItem(LOCAL_SCOPE_KEY, '');
      clearLocalCredentials();
      void coordinator.activate().catch(() => {});
      setError('Cached access expired. Sign in online again.');
    }, Math.max(0, OFFLINE_ACCESS_MS - (Date.now() - active.validatedAt)));
    return () => clearTimeout(timer);
  }, [coordinator, identity]);
  useEffect(() => {
    if (!captures || !coordinator || !identity || !online) return;
    const scope = identity.scope; const epoch = transition.current;
    const executor = new UploadExecutor(captures, (owner) => capturesCommitted(client,owner));
    let alive = true;
    const current = () => {
      const active = identityRef.current;
      if (!alive || epoch !== transition.current || !active || active.scope.accountId !== scope.accountId || active.scope.organizationId !== scope.organizationId) throw new Error('Scope changed');
    };
    const tick = async () => {
      if (!alive || AppState.currentState !== 'active' || uploadAbort.current) return;
      const controller = new AbortController(); uploadAbort.current = controller;
      try { current(); const transport = await nativeUploadTransport(); current(); await executor.run(scope,transport,controller.signal,current); }
      catch { if (alive && !controller.signal.aborted) void coordinator.refresh(); }
      finally { if (uploadAbort.current === controller) uploadAbort.current = null; }
    };
    const timer = setInterval(() => void tick(),5000);
    const state = AppState.addEventListener('change',(value) => { if (value !== 'active') uploadAbort.current?.abort(); else void tick(); });
    void tick();
    return () => { alive = false; clearInterval(timer); state.remove(); uploadAbort.current?.abort(); };
  }, [captures,coordinator,client,online,identity?.scope.accountId,identity?.scope.organizationId]);
  useEffect(() => {
    if (!checklists || !coordinator || !identity || !online) return;
    const scope = identity.scope; const epoch = transition.current;
    const executor = new ChecklistExecutor(checklists,s => localCommitted(client,s));
    let alive = true; let running: AbortController | undefined;
    const current = () => { const active = identityRef.current; if (!alive || epoch !== transition.current || active?.scope.accountId !== scope.accountId || active.scope.organizationId !== scope.organizationId) throw new Error('Scope changed'); };
    const tick = async () => {
      if (!alive || running || AppState.currentState !== 'active') return;
      const controller = new AbortController(); running = controller;
      const timeout = setTimeout(() => controller.abort(),15000);
      try { current(); const transport = await checklistTransport(); current(); await executor.run(scope,transport,controller.signal,current); }
      catch { /* Durable command remains pending/blocked; UI exposes state and explicit retry. */ }
      finally { clearTimeout(timeout); if (running === controller) running = undefined; }
    };
    const timer = setInterval(() => void tick(),5000);
    const listener = AppState.addEventListener('change',state => { if (state !== 'active') running?.abort(); else void tick(); });
    void tick();
    return () => { alive=false;clearInterval(timer);listener.remove();running?.abort(); };
  },[checklists,coordinator,client,online,identity?.scope.accountId,identity?.scope.organizationId]);
  async function retryUploads() {
    const active = identityRef.current;
    if (!active || !captures || !coordinator) return;
    const current = coordinator.fence.capture();
    await captures.repository.retry(active.scope,current); await capturesCommitted(client,active.scope);
  }
  async function signIn(email: string, password: string) {
    if (!coordinator) throw new Error('Local database not ready');
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
    const token = ++transition.current; const previous = identityRef.current;
    setLocal(null); setMemberships([]); setError('');
    SecureStore.setItem(LOCAL_SCOPE_KEY, ''); clearLocalCredentials(); await coordinator.activate();
    if (previous) await coordinator.store.removeAccount(previous.scope.accountId);
    const result = await authClient.signIn.email({ email, password });
    if (result.error) throw new Error(result.error.message ?? 'Sign-in failed');
    if (token !== transition.current) return;
    const me = await client.fetchQuery({ queryKey: ['auth-subject', result.data.user.id, 'api', 'me'], queryFn: ({ signal }) => api.me(signal), staleTime: 0, retry: false, networkMode: 'always' });
    if (token !== transition.current) return;
    if (!me.memberships[0]) { clearLocalCredentials(); throw new Error('No organization membership. Ask your operator.'); }
    await coordinator.store.removeAccount(me.accountId);
    if (token !== transition.current) return;
    setMemberships(me.memberships);
    const member = me.memberships[0];
    const active: LocalIdentity = { scope: { accountId: me.accountId, organizationId: member.organizationId }, name: me.name, organizationName: member.organizationName, validatedAt: 0 };
    await coordinator.activate(active.scope); if (token !== transition.current) return; setLocal(active); await coordinator.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sign-in failed');
      throw error;
    } finally { busyRef.current = false; setBusy(false); }
  }
  async function selectOrganization(id: string) {
    const active = identityRef.current; const member = memberships.find((item) => item.organizationId === id);
    if (!active || !member || !coordinator) return;
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
    const token = ++transition.current; setLocal(null); SecureStore.setItem(LOCAL_SCOPE_KEY, ''); await coordinator.activate();
    const next = { ...active, scope: { ...active.scope, organizationId: id }, organizationName: member.organizationName, validatedAt: 0 };
    await coordinator.store.removeScope(next.scope);
    await coordinator.activate(next.scope); if (token !== transition.current) return; setLocal(next); await coordinator.refresh();
    } catch { setLocal(null); setError('Could not open this organization. Sign in again.'); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function logout() {
    if (!coordinator) return;
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
    ++transition.current; const previous = identityRef.current;
    setLocal(null); setMemberships([]); SecureStore.setItem(LOCAL_SCOPE_KEY, ''); await coordinator.activate();
    // Capture/revoke the remote session if reachable, but local privacy never
    // depends on network success. Only server read models are removed below;
    // media originals, independent media tables and queue intent remain owned.
    try { await authClient.signOut(); } catch { /* Remote unavailability cannot retain local access. */ }
    finally { clearLocalCredentials(); }
    if (previous) await coordinator.store.removeAccount(previous.scope.accountId);
    } catch (error) {
      setError('Local cache cleanup failed. Access is closed; sign in online to reconcile it.');
      throw error;
    } finally { busyRef.current = false; setBusy(false); }
  }
  async function reconcileCaptures() {
    if (!captures) return;
    try {
      const result = await captures.reconcile();
      setMediaWarning(result.errors || result.quarantined ? 'Local photo storage needs attention. Existing files are retained for recovery.' : '');
      await capturesCommitted(client);
    } catch { setMediaWarning('Photo recovery could not finish. Free storage if needed and try again.'); }
  }
  return <QueryClientProvider client={client}><Context.Provider value={{ ready, busy, identity, memberships, status, error, online, coordinator, checklists, captures, mediaWarning, retryUploads, reconcileCaptures, signIn, logout, selectOrganization, refresh: () => coordinator?.refresh() ?? Promise.resolve() }}>{children}</Context.Provider></QueryClientProvider>;
}
