import { assertStorageCapacity } from './capacity';
import { constants } from 'node:fs';
import { mkdir, lstat, open, link, unlink, statfs } from 'node:fs/promises';
import { dirname, resolve, parse, join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import sharp from 'sharp';
import { AccessError } from '@handovertrack/backend';

export const MAX_BYTES = 50 * 1024 * 1024;
export const imageOptions = { failOn: 'warning', limitInputPixels: 50_000_000, limitInputChannels: 4 } as const;
export interface ExpectedImage { size: number; sha256: string; width: number; height: number }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class MediaFiles {
  readonly root: string;
  constructor(root: string, readonly reserveBytes = 256 * 1024 * 1024) { this.root = resolve(root); }
  async directory(id: string): Promise<string> {
    if (!uuid.test(id)) throw new AccessError('INVALID_REQUEST', 400);
    const path = join(this.root, id);
    // Check every ancestor rather than trusting a client path or a symlinked root.
    let current = parse(path).root;
    for (const part of path.slice(current.length).split('/')) {
      current = join(current, part);
      try { await mkdir(current, { mode: 0o700 }); await this.syncDirectory(dirname(current)); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
      const info = await lstat(current);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Unsafe media storage directory');
    }
    return path;
  }
  async path(id: string, name: string) {
    if (!/^(original\.jpg|staged\.jpg|v1-(thumb|preview|report)\.webp|[0-9a-f-]+\.part)$/.test(name)) throw new AccessError('INVALID_REQUEST', 400);
    return join(await this.directory(id), name);
  }
  async syncDirectory(path: string) { const handle = await open(path, constants.O_RDONLY); try { await handle.sync(); } finally { await handle.close(); } }
  async capacity(bytes: number) {
    await this.directory('00000000-0000-4000-8000-000000000000');
    const info = await statfs(this.root);
    assertStorageCapacity(info, bytes, this.reserveBytes);
  }
  async inspect(path: string): Promise<ExpectedImage> {
    const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size < 1 || stat.size > MAX_BYTES) throw new AccessError('INVALID_IMAGE', 422);
      const signature = Buffer.alloc(3); await file.read(signature, 0, 3, 0);
      if (!signature.equals(Buffer.from([255,216,255]))) throw new AccessError('INVALID_IMAGE', 422);
      const hash = createHash('sha256');
      for await (const chunk of file.createReadStream({ start: 0, autoClose: false })) hash.update(chunk);
      const meta = await sharp(path, imageOptions).metadata();
      if (meta.format !== 'jpeg' || !meta.width || !meta.height || meta.width > 12000 || meta.height > 12000 || (meta.pages ?? 1) !== 1) throw new AccessError('INVALID_IMAGE', 422);
      // Force a full decode: metadata alone cannot detect truncated pixel data.
      await sharp(path, imageOptions).resize(1,1).timeout({ seconds:30 }).raw().toBuffer();
      const dimensions = meta.autoOrient ?? meta;
      return { size: stat.size, sha256: hash.digest('hex'), width: dimensions.width!, height: dimensions.height! };
    } finally { await file.close(); }
  }
  async verify(path: string, expected: ExpectedImage) {
    let actual: ExpectedImage;
    try { actual = await this.inspect(path); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw error; throw new AccessError('INVALID_IMAGE', 422); }
    if (Object.keys(expected).some((key) => actual[key as keyof ExpectedImage] !== expected[key as keyof ExpectedImage])) throw new AccessError('IMAGE_MISMATCH', 422);
    return actual;
  }
  async exists(path: string) {
    try { const info = await lstat(path); if (!info.isFile() || info.isSymbolicLink()) throw new Error('Unsafe media file'); return true; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
  }
  async publish(source: string, destination: string) {
    // link(2) is atomic and fails on an existing destination; never rename over it.
    try { await link(source, destination); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    await this.syncDirectory(dirname(destination));
  }
  async receive(id: string, input: Readable, expected: ExpectedImage) {
    await this.capacity(expected.size * 2);
    const path = await this.path(id, `${randomUUID()}.part`);
    const handle = await open(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    let size = 0; const hash = createHash('sha256');
    try {
      for await (const chunk of input) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += bytes.length;
        if (size > expected.size || size > MAX_BYTES) throw new AccessError('IMAGE_MISMATCH', 422);
        hash.update(bytes); await handle.writeFile(bytes);
      }
      if (size !== expected.size || hash.digest('hex') !== expected.sha256) throw new AccessError('IMAGE_MISMATCH', 422);
      await handle.sync();
    } catch (error) { await unlink(path).catch(() => {}); throw error; }
    finally { await handle.close(); }
    try {
      await this.verify(path, expected);
      const target = await this.path(id, 'staged.jpg');
      await this.publish(path, target); await this.verify(target, expected);
      return target;
    } finally {
      // Only a request-owned temporary copy; never an accepted/local original.
      await unlink(path).catch(() => {});
    }
  }
  async openRead(id: string, name: string) {
    const handle = await open(await this.path(id, name), constants.O_RDONLY | constants.O_NOFOLLOW);
    const info = await handle.stat();
    if (!info.isFile()) { await handle.close(); throw new Error('Unsafe media file'); }
    return { stream: handle.createReadStream(), size: info.size };
  }
}
