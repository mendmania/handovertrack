// Private recovery manifest; output contains only generated relative paths and hashes.
import { readdir, lstat, open } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const root = process.env.MEDIA_ROOT;
if (root !== '/media') throw new Error('Explicit MEDIA_ROOT=/media required');
const hashes = {};
async function walk(relative = '') {
  for (const entry of await readdir(join(root, relative))) {
    const key = join(relative, entry); const path = join(root, key); const s = await lstat(path);
    if (s.isSymbolicLink()) throw new Error('Unexpected symlink in media');
    if (s.isDirectory()) await walk(key);
    else if (s.isFile()) {
      const h = createHash('sha256'); const f = await open(path, 'r');
      try { for await (const chunk of f.createReadStream()) h.update(chunk); } finally { await f.close(); }
      hashes[key] = h.digest('hex');
    } else throw new Error('Unexpected media file type');
  }
}
await walk(); console.log(JSON.stringify(hashes));
