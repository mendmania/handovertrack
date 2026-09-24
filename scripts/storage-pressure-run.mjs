import { build } from 'tsup';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
await build({ entry: ['packages/platform/src/media/capacity.ts'], format: ['esm'], outDir: '.local/task09/pressure', noExternal: ['@handovertrack/backend'], clean: false });
const r = spawnSync('docker', ['run', '--name', 'handovertrack-task09-pressure', '--label', 'handovertrack.task=09', '--network', 'none', '--memory', '128m', '--cpus', '1', '--read-only', '--tmpfs', '/pressure:rw,size=16m,nr_inodes=1080', '-v', resolve('.local/task09/pressure') + ':/code:ro', '-v', resolve('scripts/storage-pressure.mjs') + ':/probe.mjs:ro', 'node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6', 'node', '/probe.mjs'], { stdio: 'inherit' });
if (r.status !== 0) throw Error('Bounded storage pressure failed; container retained');
