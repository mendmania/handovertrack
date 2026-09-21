import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { mobilePublicConfigSchema } from '@handovertrack/config/mobile-public';
import { createApi } from '@handovertrack/contracts';
export const config = mobilePublicConfigSchema.parse({ EXPO_PUBLIC_API_ORIGIN: process.env.EXPO_PUBLIC_API_ORIGIN });
// Track exactly the keys the auth plugin writes so local logout clears its
// credential/cache entries even when its remote sign-out request cannot finish.
const keys = new Set<string>(['handovertrack_cookie', 'handovertrack_session_data']);
let credentialEpoch = 0;
function makeAuthClient() {
  const epoch = credentialEpoch;
  const getItem = (key: string) => { keys.add(key); return epoch === credentialEpoch ? SecureStore.getItem(key) : null; };
  const setItem = (key: string, value: string) => { if (epoch === credentialEpoch) { keys.add(key); SecureStore.setItem(key, value); } };
  return createAuthClient({
    baseURL: config.EXPO_PUBLIC_API_ORIGIN, basePath: '/api/auth', fetchOptions: { timeout: 15_000, retry: 0 },
    plugins: [expoClient({ scheme: 'handovertrack', storagePrefix: 'handovertrack', cookiePrefix: 'handovertrack', disableCache: true,
      storage: { getItem, setItem, getItemAsync: async (key: string) => getItem(key), setItemAsync: async (key: string, value: string) => setItem(key, value) } })],
  });
}
export let authClient = makeAuthClient();
export function clearLocalCredentials() {
  ++credentialEpoch; // Old auth requests can no longer read or write SecureStore.
  for (const key of keys) SecureStore.setItem(key, '');
  authClient = makeAuthClient();
}
export const api = createApi({
  baseUrl: config.EXPO_PUBLIC_API_ORIGIN, credentials: 'omit',
  fetch: async (input, init) => {
    const request = new Request(input, init);
    request.headers.set('Cookie', await authClient.getCookie());
    const controller = new AbortController();
    const abort = () => controller.abort(); request.signal.addEventListener('abort', abort);
    if (request.signal.aborted) abort();
    const timeout = setTimeout(abort, 15_000);
    try { return await fetch(new Request(request, { signal: controller.signal, credentials: 'omit' })); }
    finally { clearTimeout(timeout); request.signal.removeEventListener('abort', abort); }
  },
});
export const LOCAL_SCOPE_KEY = 'handovertrack.local-scope.v1';
export const OFFLINE_ACCESS_MS = 24 * 60 * 60 * 1000;
