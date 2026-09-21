import { proxy } from '../../../../lib/proxy';
export const dynamic = 'force-dynamic';
async function handler(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const resource = path.join('/');
  if (!['sign-in/email', 'sign-out', 'get-session'].includes(resource)) return new Response(null, { status: 404 });
  return proxy(request, `/api/auth/${resource}${new URL(request.url).search}`);
}
export { handler as GET, handler as POST };
