import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { projectListOptions, projectDetailOptions } from '@handovertrack/query';
import { getIdentity, serverApi } from './server';
import { ProjectScreen } from '../components/project-screen';
export async function renderProjectPage(organizationId: string, projectId?: string) {
  const me = await getIdentity();
  if (!me.memberships.some((item) => item.organizationId === organizationId)) notFound();
  const scope = { accountId: me.accountId, organizationId };
  const api = await serverApi();
  const queryClient = new QueryClient(); // One request; never a server singleton.
  if (projectId) await queryClient.prefetchQuery(projectDetailOptions(scope, 'api', projectId, (signal) => api.detail(scope, projectId, signal)));
  else await queryClient.prefetchQuery(projectListOptions(scope, 'api', (signal) => api.list(scope, signal)));
  return <HydrationBoundary state={dehydrate(queryClient)}><ProjectScreen key={`${me.accountId}:${organizationId}`} me={me} scope={scope} projectId={projectId} /></HydrationBoundary>;
}
