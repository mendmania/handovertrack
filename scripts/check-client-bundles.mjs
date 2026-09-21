import { readdirSync, readFileSync } from 'node:fs';
const secrets = ['DATABASE_URL', 'MIGRATION_DATABASE_URL', 'AUTH_SECRET', 'POSTGRES_PASSWORD', 'MIGRATOR_PASSWORD', 'RUNTIME_PASSWORD', 'SEED_PASSWORD']
  .map((key) => [key, process.env[key]]).filter(([, value]) => value?.length >= 16);
if (!secrets.length) throw new Error('Load local configuration before checking bundles');
let checked = 0;
function scan(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const file = `${path}/${entry.name}`;
    if (entry.isDirectory()) { scan(file); continue; }
    const content = readFileSync(file); checked++;
    for (const [key, value] of secrets) if (content.includes(value)) throw new Error(`Server secret ${key} found in client artifact ${file}`);
  }
}
scan('apps/web/.next/static'); scan('apps/mobile/dist');
console.log(`PASS ${checked} browser/native export artifacts contain none of the configured server or seed secrets.`);
