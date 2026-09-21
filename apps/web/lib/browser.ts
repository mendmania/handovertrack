'use client';
import { createAuthClient } from 'better-auth/react';
import { createApi } from '@handovertrack/contracts';
import { ScopeFence } from '@handovertrack/query';
import { webPublicConfigSchema } from '@handovertrack/config/web-public';
const config = webPublicConfigSchema.parse({ NEXT_PUBLIC_WEB_ORIGIN: process.env.NEXT_PUBLIC_WEB_ORIGIN });
export const authClient = createAuthClient({ baseURL: config.NEXT_PUBLIC_WEB_ORIGIN, basePath: '/api/auth' });
export const api = createApi({ baseUrl: '/bff', credentials: 'same-origin' });
export const fence = new ScopeFence();
export function fenced<T>(reader: (signal: AbortSignal) => Promise<T>) {
  return async (signal: AbortSignal) => { const current = fence.capture(); current(); const value = await reader(signal); current(); return value; };
}
