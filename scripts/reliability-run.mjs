import { spawnSync } from 'node:child_process';
function run(program, args, log = true) { const r = spawnSync(program, args, { stdio: log ? 'inherit' : 'pipe' }); if (r.status !== 0) throw Error(program + ' failed'); }
// Setup refuses existing names/data. Failed attempts remain retained.
run('python3', ['scripts/reliability-setup.py']);
try {
  run(process.execPath, ['--env-file=.local/task09/source.env', '--import', 'tsx', 'scripts/report-integration.ts']);
  run(process.execPath, ['--env-file=.local/task09/source.env', '--import', 'tsx', 'scripts/proof-browser.ts']);
  run(process.execPath, ['--env-file=.local/task09/source.env', '--import', 'tsx', 'scripts/reliability-load.ts']);
  run(process.execPath, ['--env-file=.local/task09/source.env', '--import', 'tsx', 'scripts/reliability-recovery.ts']);
  run(process.execPath, ['scripts/storage-pressure-run.mjs']);
} finally {
  for (const name of ['handovertrack-task09-source', 'handovertrack-task09-restore']) run('docker', ['stop', name], false);
}
