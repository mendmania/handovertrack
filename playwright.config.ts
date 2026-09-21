import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/web', fullyParallel: false, workers: 1,
  use: { baseURL: process.env.WEB_ORIGIN ?? 'http://localhost:3300', trace: 'off', screenshot: 'off', video: 'off' },
  webServer: [
    { command: 'pnpm dev:api', url: 'http://127.0.0.1:3301/health/ready', reuseExistingServer: true, timeout: 30_000 },
    { command: 'node scripts/run.mjs pnpm --filter @handovertrack/web start', url: 'http://localhost:3300/sign-in', reuseExistingServer: true, timeout: 60_000 },
  ],
});
