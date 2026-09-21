// Run in an owned helper using the same PVC/UID/node as API and worker.
// Synthetic probe files only. Never reads, rewrites or removes evidence paths.
import { mkdtemp, open, link, stat, statfs, readFile, unlink, rmdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import sharp from 'sharp';
const root = process.env.MEDIA_ROOT;
if (root !== '/media') throw new Error('Explicit trial MEDIA_ROOT=/media required');
const directory = await mkdtemp(join(root, '.probe-'));
const source = join(directory, 'synthetic.jpg'); const target = join(directory, 'linked.jpg');
try {
  const bytes = await sharp({ create: { width: 8000, height: 6250, channels: 3, background: 'green' } }).jpeg().toBuffer();
  const f = await open(source, 'wx', 0o600); await f.writeFile(bytes); await f.sync(); await f.close();
  await link(source, target);
  let refused = false; try { await link(source, target); } catch (e) { if (e.code === 'EEXIST') refused = true; else throw e; }
  if (!refused || (await stat(source)).ino !== (await stat(target)).ino) throw new Error('No-replace hard-link semantics failed');
  const dir = await open(directory, 'r'); await dir.sync(); await dir.close();
  const began = Date.now();
  await Promise.all([0, 1].map(() => sharp(source, { limitInputPixels: 50_000_000, limitInputChannels: 4, failOn: 'warning' }).resize(1, 1).timeout({ seconds: 30 }).raw().toBuffer()));
  const fs = await statfs(root);
  console.log(JSON.stringify({ check: 'synthetic-storage-and-two-decodes', sha256: createHash('sha256').update(await readFile(target)).digest('hex'), bytes: bytes.length, hardlink: true, directoryFsync: true, decodeMs: Date.now() - began, maxRssKiB: process.resourceUsage().maxRSS, freeBytes: fs.bavail * fs.bsize, freeInodes: fs.ffree }));
} finally {
  await unlink(target).catch(() => {}); await unlink(source).catch(() => {}); await rmdir(directory);
}
