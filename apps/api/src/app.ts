import Fastify, { type FastifyError } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';
import { createAuth, createDatabase, createReaders, createProjectManagement } from '@handovertrack/platform';
import { resolveAccount, projectReads, projectManagement, AccessError, capabilities } from '@handovertrack/backend';
import type { ServerConfig } from '@handovertrack/config/server';
import type { Me, ProjectSnapshot, ProjectInput, ProjectUpdate, AssignmentInput } from '@handovertrack/contracts';

import { registerMedia } from './media';

const uuid = { type: 'string', format: 'uuid' };
export function createApp(config: ServerConfig, logging = true) {
  const { db, pool } = createDatabase(config.DATABASE_URL);
  const auth = createAuth(pool, config);
  const readers = createReaders(db);
  const projects = projectReads(readers.projects, readers.memberships);
  const management = projectManagement(createProjectManagement(pool, config.AUTH_SECRET));
  const app = Fastify({ logger: logging ? { redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers.set-cookie'], serializers: { req: (req) => ({ method: req.method, url: req.url?.split('?')[0], id: req.id }) } } : false, bodyLimit: 16_384 });
  app.addHook('onClose', async () => { await db.destroy(); });
  app.addHook('onSend', async (_req, reply) => { reply.header('cache-control', 'private, no-store'); });
  app.setNotFoundHandler(async () => { throw new AccessError('NOT_FOUND', 404); });
  app.setErrorHandler((error, req, reply) => {
    const transport = error as FastifyError;
    const invalid = transport.validation || (transport.statusCode !== undefined && transport.statusCode >= 400 && transport.statusCode < 500);
    const failure = error instanceof AccessError ? error : new AccessError(invalid ? 'INVALID_REQUEST' : 'INTERNAL_ERROR', invalid ? 400 : 500);
    if (failure.status === 500) req.log.error({ err: error }, 'Request failed');
    reply.status(failure.status).send({ code: failure.code, message: failure.code === 'NOT_FOUND' ? 'Resource unavailable' : failure.code, requestId: req.id, ...(failure.current !== undefined ? { current: failure.current } : {}) });
  });
  app.get('/health/live', async () => ({ status: 'ok' }));
  app.get('/health/ready', async () => { await pool.query('SELECT 1'); return { status: 'ok' }; });
  // No signup/recovery/invitation surface is exposed in Task 01. The library
  // still owns all session, password, cookie and origin/CSRF behavior.
  const allowedAuth = new Set(['/sign-in/email', '/sign-out', '/get-session']);
  app.route({ method: ['GET', 'POST'], url: '/api/auth/*', async handler(req, reply) {
    const suffix = req.url.split('?')[0]!.slice('/api/auth'.length);
    if (!allowedAuth.has(suffix)) throw new AccessError('NOT_FOUND', 404);
    const headers = fromNodeHeaders(req.headers);
    const response = await auth.handler(new Request(new URL(req.url, config.AUTH_BASE_URL), {
      method: req.method, headers, ...(req.method === 'GET' ? {} : { body: JSON.stringify(req.body ?? {}) }),
    }));
    response.headers.forEach((value, key) => { if (key !== 'set-cookie') reply.header(key, value); });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) reply.header('set-cookie', cookies);
    reply.status(response.status).send(await response.text());
  } });
  const accountFor = async (headers: Parameters<typeof fromNodeHeaders>[0]) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(headers) });
    return resolveAccount(readers.identity, session?.user.id);
  };
  app.get('/v1/me', async (req): Promise<Me> => {
    const account = await accountFor(req.headers);
    return { accountId: account.id, name: account.name, memberships: (await readers.memberships.listForAccount(account.id)).map((membership) => ({ ...membership, capabilities: capabilities(membership.role) })) };
  });
  const schema = { params: { type: 'object', required: ['organizationId'], properties: { organizationId: uuid }, additionalProperties: false } };
  app.get<{ Params: { organizationId: string } }>('/v1/organizations/:organizationId/projects', { schema }, async (req) => {
    const account = await accountFor(req.headers);
    return { projects: await projects.list(account.id, req.params.organizationId) };
  });
  app.get<{ Params: { organizationId: string } }>('/v1/organizations/:organizationId/projects/snapshot', { schema }, async (req): Promise<ProjectSnapshot> => {
    const account = await accountFor(req.headers);
    const rows = await projects.list(account.id, req.params.organizationId);
    return { accountId: account.id, organizationId: req.params.organizationId, complete: true, generatedAt: new Date().toISOString(), projects: rows };
  });
  app.get<{ Params: { organizationId: string; projectId: string } }>('/v1/organizations/:organizationId/projects/:projectId', {
    schema: { params: { ...schema.params, required: ['organizationId', 'projectId'], properties: { organizationId: uuid, projectId: uuid } } },
  }, async (req) => {
    const account = await accountFor(req.headers);
    return projects.detail(account.id, req.params.organizationId, req.params.projectId);
  });
  const commandHeaders = { type: 'object', required: ['idempotency-key'], properties: { 'idempotency-key': { type: 'string', minLength: 8, maxLength: 128 } } };
  const projectParams = { ...schema.params, required: ['organizationId', 'projectId'], properties: { organizationId: uuid, projectId: uuid } };
  const fields = { name: { type: 'string', minLength: 1, maxLength: 200 }, description: { type: 'string', maxLength: 4000 }, address: { type: 'string', maxLength: 500 }, status: { type: 'string', enum: ['active', 'complete'] } };
  const projectBody = { type: 'object', additionalProperties: false, required: Object.keys(fields), properties: fields };
  const keyFor = (headers: Record<string, unknown>) => {
    // Session cookies alone do not authorize cross-origin business writes.
    // Better Auth's origin guard only applies to its own auth routes.
    if (headers.origin !== config.WEB_ORIGIN) throw new AccessError('FORBIDDEN_ORIGIN', 403);
    return headers['idempotency-key'] as string;
  };
  app.post<{ Params: { organizationId: string }; Body: ProjectInput }>('/v1/organizations/:organizationId/projects', {
    schema: { ...schema, headers: commandHeaders, body: projectBody },
  }, async (req) => {
    const key = keyFor(req.headers); const account = await accountFor(req.headers);
    return management.create(account.id, req.params.organizationId, req.body, key);
  });
  app.patch<{ Params: { organizationId: string; projectId: string }; Body: ProjectUpdate }>('/v1/organizations/:organizationId/projects/:projectId', {
    schema: { params: projectParams, headers: commandHeaders, body: { ...projectBody, required: [...projectBody.required, 'baseVersion'], properties: { ...fields, baseVersion: { type: 'integer', minimum: 1 } } } },
  }, async (req) => {
    const key = keyFor(req.headers); const account = await accountFor(req.headers);
    return management.update(account.id, req.params.organizationId, req.params.projectId, req.body, key);
  });
  app.get<{ Params: { organizationId: string } }>('/v1/organizations/:organizationId/workers', { schema }, async (req) => {
    const account = await accountFor(req.headers); return { workers: await management.workers(account.id, req.params.organizationId) };
  });
  app.get<{ Params: { organizationId: string; projectId: string } }>('/v1/organizations/:organizationId/projects/:projectId/assignments', {
    schema: { params: projectParams },
  }, async (req) => {
    const account = await accountFor(req.headers); return { assignments: await management.assignments(account.id, req.params.organizationId, req.params.projectId) };
  });
  app.put<{ Params: { organizationId: string; projectId: string; accountId: string }; Body: AssignmentInput }>('/v1/organizations/:organizationId/projects/:projectId/assignments/:accountId', {
    schema: { headers: commandHeaders, params: { ...projectParams, required: [...projectParams.required, 'accountId'], properties: { ...projectParams.properties, accountId: uuid } }, body: { type: 'object', additionalProperties: false, required: ['active', 'baseVersion'], properties: { active: { type: 'boolean' }, baseVersion: { type: 'integer', minimum: 0 } } } },
  }, async (req) => {
    const key = keyFor(req.headers); const account = await accountFor(req.headers);
    return management.setAssignment(account.id, req.params.organizationId, req.params.projectId, req.params.accountId, req.body, key);
  });
  app.get<{ Params: { organizationId: string } }>('/v1/organizations/:organizationId/sync/bootstrap', { schema }, async (req) => {
    const account = await accountFor(req.headers); return management.bootstrap(account.id, req.params.organizationId);
  });
  app.get<{ Params: { organizationId: string }; Querystring: { cursor: string; limit?: number } }>('/v1/organizations/:organizationId/sync/pull', {
    schema: { ...schema, querystring: { type: 'object', additionalProperties: false, required: ['cursor'], properties: { cursor: { type: 'string', maxLength: 2048, minLength: 1 }, limit: { type: 'integer', minimum: 1, maximum: 100 } } } },
  }, async (req) => {
    const account = await accountFor(req.headers); return management.pull(account.id, req.params.organizationId, req.query.cursor, req.query.limit ?? 100);
  });
  app.register(async (instance) => registerMedia(instance, pool, config, accountFor));
  return app;
}
