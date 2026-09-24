import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile, statfs } from 'node:fs/promises';
import pg from 'pg';
import sharp from 'sharp';
import { createApp } from '../apps/api/src/app';
import { readServerConfig } from '../packages/config/src/server';
import { createApi } from '../packages/contracts/src/index';
if (process.env.TASK09_ISOLATED !== 'true' || new URL(process.env.DATABASE_URL!).port !== '55550') throw Error('Owned Task09 source required');
const config = readServerConfig(process.env), app = createApp(config, false), url = await app.listen({ host: '127.0.0.1', port: 0 });
const f = JSON.parse(await readFile('.local/task09/fixture.json', 'utf8')), { scope, projectId } = f;
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL }); const key = () => randomUUID();
const r = await fetch(url + '/api/auth/sign-in/email', { method: 'POST', headers: { origin: config.WEB_ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify({ email: 'manager.north@example.test', password: process.env.SEED_PASSWORD }) }); assert.equal(r.status, 200);
const cookie = r.headers.getSetCookie().map(x => x.split(';')[0]).join('; '), api = createApi({ baseUrl: url, headers: { cookie, origin: config.WEB_ORIGIN } });
const worker = spawn(process.execPath, ['apps/worker/dist/main.js'], { env: { ...process.env, WORKER_POLL_MS: '100', WORKER_HEARTBEAT_MS: '1000', WORKER_HEARTBEAT_FILE: '.local/task09/load-heartbeat' }, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '', peakWorkerTreeRssKiB = 0, busyUploads = 0; worker.stdout.on('data', b => { log += b; }); worker.stderr.on('data', b => { log += b; });
const timer = setInterval(() => { try { const rows = execFileSync('ps', ['-axo', 'pid=,ppid=,rss='], { encoding: 'utf8' }).trim().split('\n').map(l => l.trim().split(/\s+/).map(Number)); const children = rows.filter(x => x[1] === worker.pid).map(x => x[0]); const rss = rows.filter(x => x[0] === worker.pid || children.includes(x[0])).reduce((s, x) => s + x[2]!, 0); peakWorkerTreeRssKiB = Math.max(peakWorkerTreeRssKiB, rss); } catch { /* Unsupported counters reported separately. */ } }, 100);
const start = Date.now(), before = await statfs(config.MEDIA_ROOT), latencies: number[] = [];
async function measured<T>(fn: () => Promise<T>) { const t = performance.now(); const result = await fn(); latencies.push(performance.now() - t); return result; }
try {
  const p = await api.detail(scope, projectId), run = (await api.checklist(scope, projectId)).run!, comp = (await api.proof(scope, projectId)).composition;
  const reports = await Promise.all(Array.from({ length: 6 }, () => api.requestReport(scope, projectId, { projectVersion: p.version, checklistVersion: run.version, compositionVersion: comp.version, mediaIds: [...new Set([f.before, f.after, ...run.answers.flatMap(a => a.mediaIds)])] }, key())));
  // ~2 MP generated noise JPEGs exercise decoding without private photos.
  const pixels = Buffer.alloc(1600 * 1200 * 3); for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 131 + (i >> 9) * 31) & 255;
  const jpeg = await sharp(pixels, { raw: { width: 1600, height: 1200, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
  const media: string[] = [];
  const uploads = Promise.all(Array.from({ length: 3 }, async (_, lane) => { for (let i = 0; i < 3; i++) { const id = key(); media.push(id); await measured(async () => { const up = await api.createUpload(scope, projectId, { mediaId: id, accountId: scope.accountId, size: jpeg.length, sha256: createHash('sha256').update(jpeg).digest('hex'), width: 1600, height: 1200, mime: 'image/jpeg', capturedAt: new Date().toISOString() }); let delivered = false; for (let attempt = 0; attempt < 40; attempt++) { const result = await fetch(`${url}/media/organizations/${scope.organizationId}/uploads/${up.uploadId}/content`, { method: 'PUT', headers: { cookie, origin: config.WEB_ORIGIN, 'content-type': 'image/jpeg' }, body: new Uint8Array(jpeg) }); await result.arrayBuffer(); if (result.status === 200) { delivered = true; break; } assert.equal(result.status, 409, 'upload lane ' + lane); busyUploads++; await new Promise(r => setTimeout(r, 25)); } assert(delivered, 'Bounded retry exhausted'); await api.completeUpload(scope, up.uploadId); }); } }));
  const reads = Promise.all(Array.from({ length: 4 }, async () => { for (let i = 0; i < 25; i++) await measured(() => api.detail(scope, projectId)); }));
  await Promise.all([uploads, reads]);
  const until = Date.now() + 30000;
  while (true) { const n = (await db.query("SELECT (SELECT count(*) FROM media_jobs WHERE media_id=ANY($1::uuid[]) AND state='ready')+(SELECT count(*) FROM report_jobs WHERE report_id=ANY($2::uuid[]) AND state='ready') n", [media, reports.map(x => x.id)])).rows[0].n; if (Number(n) === 15) break; assert(Date.now() < until, 'bounded workload completion deadline'); await new Promise(r => setTimeout(r, 100)); }
  const share = await api.createShare(scope, projectId, reports[0]!.id, { expiresAt: new Date(Date.now() + 86400000).toISOString() }, key());
  const pdfUrl = `${url}/guest/v1/shares/${share.share.id}/pdf`;
  const results = await Promise.all(Array.from({ length: 16 }, async () => { const result = await fetch(pdfUrl, { headers: { authorization: 'Bearer ' + share.token, range: 'bytes=0-10', 'if-none-match': '"' + share.share.report.sha256 + '"' } }); const bytes = Buffer.from(await result.arrayBuffer()); if (result.status === 200) assert.equal(createHash('sha256').update(bytes).digest('hex'), share.share.report.sha256); else assert.equal(result.status, 429); assert.equal(result.headers.get('cache-control'), 'private, no-store'); return result.status; }));
  assert(results.includes(200)); assert(results.includes(429));
  await api.revokeShare(scope, projectId, reports[0]!.id, share.share.id, key());
  const revoked = await Promise.all(Array.from({ length: 8 }, async () => { const r = await fetch(pdfUrl, { headers: { authorization: 'Bearer ' + share.token, range: 'bytes=0-10' } }); await r.arrayBuffer(); return r.status; })); assert(revoked.every(x => x === 404 || x === 429));
  const after = await statfs(config.MEDIA_ROOT); latencies.sort((a, b) => a - b);
  const result = { result: 'PASS', workload: { uploads: 9, jpegBytes: jpeg.length, uploadConcurrency: 3, pdfJobs: 6, managerReads: 100, guestConcurrentDownloads: 16 }, durationMs: Date.now() - start, busyUploads, operationLatencyMs: { p50: latencies[Math.floor(latencies.length * .5)], p95: latencies[Math.floor(latencies.length * .95)], max: latencies.at(-1) }, peakWorkerAndRenderChildRssKiB: peakWorkerTreeRssKiB || null, mainMaxRssKiB: process.resourceUsage().maxRSS, availableBytesBefore: before.bavail * before.bsize, availableBytesAfter: after.bavail * after.bsize, guestResults: { ok: results.filter(x => x === 200).length, throttled: results.filter(x => x === 429).length, revokedDenied: revoked.length }, durationInterpretation: 'Small synthetic local workload, not production capacity', unavailable: ['live node pressure', 'physical radio', 'independent disk IOPS'] };
  await writeFile('.local/task09/load-validation.json', JSON.stringify(result, null, 2), { mode: 0o600 }); console.log('PASS bounded concurrent uploads/image/PDF/API workload; guest download cap, integrity and revocation');
} finally {
  clearInterval(timer); if (worker.exitCode === null && worker.signalCode === null) { const stopped = new Promise<void>(resolve => { const timeout = setTimeout(() => { worker.kill('SIGKILL'); resolve(); }, 15000); worker.once('exit', () => { clearTimeout(timeout); resolve(); }); }); worker.kill('SIGTERM'); await stopped; } assert(log.includes('"event":"stopped"')); await writeFile('.local/task09/load-worker.log', log, { mode: 0o600 }); await db.end(); await app.close();
}
