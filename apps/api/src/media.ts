import type { FastifyInstance } from 'fastify';
import type { IncomingHttpHeaders } from 'node:http';
import type { Pool } from 'pg';
import type { Readable } from 'node:stream';
import { AccessError } from '@handovertrack/backend';
import { createMedia, MediaFiles, MAX_BYTES, type UploadInput } from '@handovertrack/platform/media';
import type { ServerConfig } from '@handovertrack/config/server';

export async function registerMedia(app: FastifyInstance, pool: Pool, config: ServerConfig, accountFor: (headers: IncomingHttpHeaders) => Promise<{ id: string }>) {
  const media = createMedia(pool, new MediaFiles(config.MEDIA_ROOT, config.MEDIA_RESERVE_BYTES));
  const uuid = { type: 'string', format: 'uuid' };
  const params = (keys: string[]) => ({ type: 'object', additionalProperties: false, required: keys, properties: Object.fromEntries(keys.map((k) => [k, uuid])) });
  const orgProject = params(['organizationId','projectId']); const orgUpload = params(['organizationId','uploadId']);
  const write = (headers: IncomingHttpHeaders) => {
    if (headers.origin !== config.WEB_ORIGIN && !(headers.origin === undefined && headers['expo-origin'] === 'handovertrack://')) throw new AccessError('FORBIDDEN_ORIGIN', 403);
  };
  app.post<{ Params: { organizationId: string; projectId: string }; Body: UploadInput }>('/v1/organizations/:organizationId/projects/:projectId/uploads', {
    schema: { params: orgProject, body: { type: 'object', additionalProperties: false, required: ['accountId','mediaId','size','sha256','width','height','mime','capturedAt'],
      properties: { accountId: uuid, mediaId: uuid, size: { type: 'integer', minimum: 1, maximum: MAX_BYTES }, sha256: { type: 'string', pattern: '^[0-9a-f]{64}$' },
        width: { type: 'integer', minimum: 1, maximum: 12000 }, height: { type: 'integer', minimum: 1, maximum: 12000 }, mime: { const: 'image/jpeg', type: 'string' }, capturedAt: { type: 'string', format: 'date-time' } } } },
  }, async (req) => {
    write(req.headers); const account = await accountFor(req.headers);
    if (req.body.width * req.body.height > 50_000_000) throw new AccessError('INVALID_IMAGE', 422);
    return media.create(account.id, req.params.organizationId, req.params.projectId, req.body);
  });
  app.get<{ Params: { organizationId: string; uploadId: string } }>('/v1/organizations/:organizationId/uploads/:uploadId', { schema: { params: orgUpload } }, async (req) => media.status((await accountFor(req.headers)).id, req.params.organizationId, req.params.uploadId));
  app.post<{ Params: { organizationId: string; uploadId: string } }>('/v1/organizations/:organizationId/uploads/:uploadId/complete', { schema: { params: orgUpload } }, async (req) => {
    write(req.headers); return media.complete((await accountFor(req.headers)).id, req.params.organizationId, req.params.uploadId);
  });
  // JPEG parser returns the raw stream. No JSON/multipart/BFF buffering.
  await app.register(async (uploads) => {
    uploads.addContentTypeParser('image/jpeg', (_req, payload, done) => done(null, payload));
    let active = 0;
    uploads.put<{ Params: { organizationId: string; uploadId: string }; Body: Readable }>('/media/organizations/:organizationId/uploads/:uploadId/content', {
      bodyLimit: MAX_BYTES, schema: { params: orgUpload },
    }, async (req) => {
      write(req.headers); const actor = await accountFor(req.headers);
      if (req.headers['content-type'] !== 'image/jpeg') throw new AccessError('INVALID_IMAGE', 422);
      const length = Number(req.headers['content-length']);
      if (!Number.isSafeInteger(length) || length <= 0 || length > MAX_BYTES || req.headers['transfer-encoding']) throw new AccessError('INVALID_REQUEST', 400);
      if (active >= 2) throw new AccessError('UPLOAD_BUSY', 409);
      active++;
      const timeout = setTimeout(() => req.raw.destroy(), 120_000);
      try { return await media.content(actor.id, req.params.organizationId, req.params.uploadId, req.body, length); }
      finally { clearTimeout(timeout); active--; }
    });
  });
  app.get<{ Params: { organizationId: string; projectId: string }; Querystring: { after?: string } }>('/v1/organizations/:organizationId/projects/:projectId/media', {
    schema: { params: orgProject, querystring: { type: 'object', additionalProperties: false, properties: { after: uuid, _: { type: 'string', maxLength: 64 } } } },
  }, async (req) => media.list((await accountFor(req.headers)).id, req.params.organizationId, req.params.projectId, req.query.after));
  app.get<{ Params: { organizationId: string; mediaId: string; variant: string } }>('/media/organizations/:organizationId/assets/:mediaId/:variant', {
    schema: { params: { ...params(['organizationId','mediaId']), required: ['organizationId','mediaId','variant'], properties: { organizationId: uuid, mediaId: uuid, variant: { type: 'string', enum: ['original','thumb','preview','report'] } } } },
  }, async (req, reply) => {
    const file = await media.read((await accountFor(req.headers)).id, req.params.organizationId, req.params.mediaId, req.params.variant);
    reply.header('x-content-type-options','nosniff').header('content-length',file.size).type(req.params.variant === 'original' ? 'image/jpeg' : 'image/webp');
    return reply.send(file.stream);
  });
}
