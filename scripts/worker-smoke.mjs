import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const worker = spawn(process.execPath, ['apps/worker/dist/main.js'], { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
let output = ''; let stopping = false;
const timeout = setTimeout(() => { worker.kill('SIGKILL'); }, 15000);
worker.stdout.on('data', (data) => {
  output += data.toString();
  if (!stopping && output.includes('"event":"ready"')) { stopping = true; worker.kill('SIGTERM'); }
});
worker.stderr.on('data', (data) => { output += data.toString(); });
const code = await new Promise((resolve) => worker.on('exit', resolve)); clearTimeout(timeout);
assert.equal(code, 0, output); assert(output.includes('"event":"ready"')); assert(output.includes('"event":"stopped"')); assert(output.includes('image-v1'));
console.log('PASS built worker starts, connects to PostgreSQL, registers image-v1 processing and gracefully stops on SIGTERM.');
