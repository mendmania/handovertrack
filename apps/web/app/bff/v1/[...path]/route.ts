import { proxy } from '../../../../lib/proxy';
export const dynamic = 'force-dynamic';
async function handler(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const resource = path.join('/');
  const organization = 'organizations/[a-f0-9-]+';
  const routes: Record<string, RegExp> = {
    GET: new RegExp(`^(me|${organization}/checklist-templates|${organization}/workers|${organization}/projects(?:/(?:snapshot|[a-f0-9-]+(?:/(?:assignments|media|checklist|proof|reports/[a-f0-9-]+(?:/pdf)?))?))?|${organization}/sync/(?:bootstrap|pull))$`),
    POST: new RegExp(`^${organization}/(?:checklist-templates|projects(?:/[a-f0-9-]+/(?:checklist|proof|reports(?:/[a-f0-9-]+/retry)?))?)$`),
    PATCH: new RegExp(`^${organization}/projects/[a-f0-9-]+$`),
    PUT: new RegExp(`^${organization}/projects/[a-f0-9-]+/assignments/[a-f0-9-]+$`),
  };
  if (!routes[request.method]?.test(resource)) return new Response(null, { status: 404 });
  // This proxy is exclusively a same-origin browser surface. Better Auth's
  // origin checks cover its own routes, not these business commands.
  if (request.method !== 'GET' && request.headers.get('origin') !== process.env.WEB_ORIGIN) {
    return Response.json({ code: 'FORBIDDEN_ORIGIN', message: 'Request origin is not allowed', requestId: 'bff' }, { status: 403, headers: { 'cache-control': 'private, no-store' } });
  }
  return proxy(request, `/v1/${resource}${new URL(request.url).search}`);
}
export { handler as GET, handler as POST, handler as PATCH, handler as PUT };
