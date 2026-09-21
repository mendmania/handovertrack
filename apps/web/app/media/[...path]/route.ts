import { proxy } from '../../../lib/proxy';
export const dynamic = 'force-dynamic';
// Local development read-only bridge. PUT uploads always go directly to API.
export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params; const resource = path.join('/');
  if (!/^organizations\/[a-f0-9-]+\/assets\/[a-f0-9-]+\/(original|thumb|preview|report)$/.test(resource)) return new Response(null,{ status:404 });
  return proxy(request,`/media/${resource}`);
}
