// Run ONLY inside the owned bounded tmpfs container, not on host evidence paths.
import assert from 'node:assert/strict';
import { writeFile, unlink, statfs } from 'node:fs/promises';
import { assertStorageCapacity } from '/code/capacity.js';
const root = '/pressure';
const initial = await statfs(root);
assert.equal(initial.type, 0x01021994); // TMPFS_MAGIC
assert(initial.blocks * initial.bsize <= 16 * 1024 * 1024);
assert(initial.files > 1024 && initial.files <= 1100);
await writeFile(root + '/bytes', Buffer.alloc(15 * 1024 * 1024));
const full = await statfs(root);
assert.throws(() => assertStorageCapacity(full, 2 * 1024 * 1024, 0), /STORAGE_FULL/);
await unlink(root + '/bytes');
for (let i = 0; i < 70; i++) await writeFile(root + '/inode-' + i, '');
const inodePressure = await statfs(root);
assert.throws(() => assertStorageCapacity(inodePressure, 0, 0), /STORAGE_FULL/);
for (let i = 0; i < 70; i++) await unlink(root + '/inode-' + i);
assertStorageCapacity(await statfs(root), 1024, 0);
console.log(JSON.stringify({ result: 'PASS', initial, bytePressure: full, inodePressure, recovered: await statfs(root) }));
