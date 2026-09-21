import 'server-only';
export async function proxy(request: Request, path: string) {
  const headers = new Headers();
  for (const key of ['cookie', 'content-type', 'origin', 'referer', 'user-agent', 'idempotency-key']) {
    const value = request.headers.get(key); if (value) headers.set(key, value);
  }
  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method, headers, redirect: 'manual', cache: 'no-store', signal: request.signal,
    ...(!['GET', 'HEAD'].includes(request.method) ? { body: request.body, duplex: 'half' } : {}),
  };
  try {
    const upstream = await fetch(new URL(path, process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3301'), init);
    const responseHeaders = new Headers({ 'cache-control': 'private, no-store' });
    const type = upstream.headers.get('content-type'); if (type) responseHeaders.set('content-type', type);
    for (const cookie of upstream.headers.getSetCookie()) responseHeaders.append('set-cookie', cookie);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json({ code: 'UPSTREAM_UNAVAILABLE', message: 'API unavailable', requestId: 'bff' }, { status: 502, headers: { 'cache-control': 'no-store' } });
  }
}
