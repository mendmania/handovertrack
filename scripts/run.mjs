// Load private local configuration once; child processes inherit only explicitly
// selected public values in client bundles (Next/Expo perform that selection).
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
if (existsSync('.env')) process.loadEnvFile('.env');
const [command, ...args] = process.argv.slice(2);
const child = spawn(command, args, { stdio: 'inherit', env: process.env });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', () => { console.error(`Unable to start ${command}`); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
