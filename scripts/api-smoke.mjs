import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
const reservation = createServer();
await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const api = spawn(process.execPath, ['apps/api/dist/main.js'], { env: { ...process.env, API_HOST: '127.0.0.1', API_PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
const timeout = setTimeout(() => api.kill('SIGKILL'), 15000);
const ready = new Promise((resolve, reject) => {
  api.stdout.on('data', (data) => {
    output += data.toString();
    const match = output.match(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/);
    if (match) resolve(match[1]);
  });
  api.stderr.on('data', (data) => { output += data.toString(); });
  api.on('exit', (code) => reject(new Error(`API exited early (${code}): ${output}`)));
});
try {
  const url = await ready;
  assert.equal((await fetch(`${url}/health/ready`)).status, 200);
  assert.equal((await fetch(`${url}/v1/me`)).status, 401);
  const exited = new Promise((resolve) => api.on('exit', resolve)); api.kill('SIGTERM');
  assert.equal(await exited, 0);
  console.log('PASS built API starts, checks PostgreSQL readiness, rejects unauthenticated reads and gracefully stops.');
} finally { clearTimeout(timeout); if (api.exitCode === null) api.kill('SIGTERM'); }
