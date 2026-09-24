import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
function run(program, args, log = true, extraEnv = {}) { const r = spawnSync(program, args, { stdio: log ? 'inherit' : 'pipe', env: { ...process.env, ...extraEnv } }); if (r.status !== 0) throw Error(program + ' failed'); }
// Setup refuses existing names/data. Failed attempts remain retained.
run('python3', ['scripts/reliability-setup.py']);
try {
  run(process.execPath, ['--env-file=.local/task09/source.env', '--import', 'tsx', 'scripts/report-integration.ts']);
  // NEXT_PUBLIC_WEB_ORIGIN is compiled into the browser bundle. A prior build
  // for another test port cannot authenticate against this isolated fixture.
  // Pass configuration through env: Next forwards execArgv to build workers,
  // where Node rejects --env-file. Never expose the private values in argv/logs.
  run(process.execPath, ['apps/web/node_modules/next/dist/bin/next', 'build', 'apps/web'], true, { ...parseEnv(readFileSync('.local/task09/source.env', 'utf8')), NODE_ENV: 'production' });
  run(process.execPath, ['--env-file=.local/task09/source.env', '--import', 'tsx', 'scripts/proof-browser.ts']);
  run(process.execPath, ['--env-file=.local/task09/source.env', '--import', 'tsx', 'scripts/reliability-load.ts']);
  run(process.execPath, ['--env-file=.local/task09/source.env', '--import', 'tsx', 'scripts/reliability-recovery.ts']);
  run(process.execPath, ['scripts/storage-pressure-run.mjs']);
} finally {
  for (const name of ['handovertrack-task09-source', 'handovertrack-task09-restore']) run('docker', ['stop', name], false);
}
