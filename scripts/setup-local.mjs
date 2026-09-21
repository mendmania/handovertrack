import { randomBytes } from 'node:crypto';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
if (existsSync('.env')) {
  console.log('Existing .env preserved. Edit it locally to change ports or credentials.');
  process.exit(0);
}
const secret = () => randomBytes(32).toString('hex');
const admin = secret(), migrate = secret(), runtime = secret();
const content = `NODE_ENV=development
COMPOSE_PROJECT_NAME=handovertrack-local
POSTGRES_PORT=55432
POSTGRES_PASSWORD=${admin}
MIGRATOR_PASSWORD=${migrate}
RUNTIME_PASSWORD=${runtime}
MIGRATION_DATABASE_URL=postgresql://htrack_migrator:${migrate}@127.0.0.1:55432/handovertrack
DATABASE_URL=postgresql://htrack_runtime:${runtime}@127.0.0.1:55432/handovertrack
TEST_MIGRATION_DATABASE_URL=postgresql://htrack_migrator:${migrate}@127.0.0.1:55432/handovertrack_test
TEST_DATABASE_URL=postgresql://htrack_runtime:${runtime}@127.0.0.1:55432/handovertrack_test
AUTH_SECRET=${secret()}
AUTH_BASE_URL=http://localhost:3300
WEB_ORIGIN=http://localhost:3300
NEXT_PUBLIC_WEB_ORIGIN=http://localhost:3300
API_INTERNAL_URL=http://127.0.0.1:3301
API_HOST=127.0.0.1
API_PORT=3301
WEB_PORT=3300
EXPO_PUBLIC_API_ORIGIN=http://localhost:3301
WORKER_HEARTBEAT_MS=30000
SEED_PASSWORD=${secret()}
ALLOW_DEV_SEED=true
`;
writeFileSync('.env', content, { mode: 0o600, flag: 'wx' });
mkdirSync('.local', { recursive: true });
console.log('Created private .env (mode 0600). Development password is SEED_PASSWORD; it is never printed by scripts.');
