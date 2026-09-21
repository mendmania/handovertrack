import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createApi, ApiError } from '@handovertrack/contracts';
export const serverApi = cache(async () => createApi({
  baseUrl: process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3301',
  headers: { cookie: (await headers()).get('cookie') ?? '' },
}));
export const getIdentity = cache(async () => {
  try { return await (await serverApi()).me(); }
  catch (error) { if (error instanceof ApiError && error.status === 401) redirect('/sign-in'); throw error; }
});
