import { test, expect, type Page } from '@playwright/test';
const orgA = '11111111-1111-4111-8111-111111111111';
const orgB = '22222222-2222-4222-8222-222222222222';
async function login(page: Page, email: string) {
  if (!process.env.SEED_PASSWORD) throw new Error('Private SEED_PASSWORD required');
  await page.goto('/sign-in');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Projects', exact: false })).toBeVisible();
}
test('real manager sign-in, SSR hydration, detail, logout and previous-page privacy', async ({ page }) => {
  let browserProjectFetches = 0;
  page.on('request', (request) => { if (request.url().includes('/bff/v1/organizations/')) browserProjectFetches++; });
  await login(page, 'manager.north@example.test');
  await expect(page.getByText('North · Riverside repair', { exact: true })).toBeVisible();
  await expect(page.getByText('North · Unassigned roof survey', { exact: true })).toBeVisible();
  await expect(page.getByText('South · Workshop refit', { exact: true })).toHaveCount(0);
  await page.waitForTimeout(500); // Settled hydration must not refetch fresh SSR data.
  expect(browserProjectFetches).toBe(0);
  await page.screenshot({ path: `${process.env.TEST_ARTIFACT_DIR ?? '.local'}/web-projects.png`, fullPage: true });
  await page.getByRole('link', { name: /North · Riverside repair/ }).click();
  await expect(page.getByRole('heading', { name: 'Project overview' })).toBeVisible();
  await expect(page.getByText('12 Riverside Lane', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await page.goto(`/org/${orgA}/projects`);
  await expect(page).toHaveURL(/sign-in/);
  expect((await page.request.get('/bff/v1/me')).status()).toBe(401);
});
test('organization switch cancels late reads and account switch never displays previous projects', async ({ page }) => {
  await login(page, 'manager.both@example.test');
  let release!: () => void; const blocked = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`**/bff/v1/organizations/${orgA}/projects`, async (route) => {
    const response = await route.fetch(); await blocked;
    await route.fulfill({ response }).catch(() => {});
  });
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByLabel('Organization', { exact: true }).selectOption(orgB);
  await expect(page.getByText('South · Workshop refit', { exact: true })).toBeVisible();
  release();
  await expect(page.getByText('North · Riverside repair', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await login(page, 'worker.south@example.test');
  await expect(page.getByText('South · Workshop refit', { exact: true })).toBeVisible();
  await expect(page.getByText('South · Unassigned inspection', { exact: true })).toHaveCount(0);
  await expect(page.getByText('North · Riverside repair', { exact: true })).toHaveCount(0);
});
test('another tab changing the shared account hides the old protected workspace', async ({ page, context }) => {
  await login(page, 'manager.north@example.test');
  const other = await context.newPage();
  await login(other, 'manager.south@example.test');
  await expect(page).toHaveURL(/sign-in/);
  await expect(page.getByText('North · Riverside repair', { exact: true })).toHaveCount(0);
  await page.goto('/');
  await expect(page.getByText('South · Workshop refit', { exact: true })).toBeVisible();
});

test('manager creates with safe retry, preserves conflict intent, and grants/removes worker access', async ({ page, context, browser }) => {
  await login(page, 'manager.north@example.test');
  const name = `Browser validation ${crypto.randomUUID().slice(0, 8)}`;
  const createKeys: string[] = [];
  let loseFirstResponse = true;
  await page.route(`**/bff/v1/organizations/${orgA}/projects`, async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    createKeys.push(route.request().headers()['idempotency-key'] ?? '');
    if (!loseFirstResponse) { await route.continue(); return; }
    loseFirstResponse = false;
    const committed = await route.fetch();
    expect(committed.ok()).toBe(true);
    // The real API commits; only its first response is lost at the browser edge.
    await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ code: 'UPSTREAM_UNAVAILABLE', message: 'Connection interrupted', requestId: 'browser-test' }) });
  });
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page.getByLabel('Project name', { exact: true }).fill(name);
  await page.getByLabel('Address', { exact: true }).fill('21 Test Lane');
  await page.getByLabel('Description', { exact: true }).fill('Created through the real manager workspace.');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Connection interrupted' })).toBeVisible();
  await expect(page.getByLabel('Project name', { exact: true })).toHaveValue(name);
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(`Project created: ${name}`);
  expect(createKeys).toHaveLength(2); expect(createKeys[0]).toBeTruthy(); expect(createKeys[1]).toBe(createKeys[0]);
  await expect(page.getByRole('link', { name: new RegExp(name) })).toHaveCount(1);
  await page.unroute(`**/bff/v1/organizations/${orgA}/projects`);
  await page.getByRole('link', { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(new RegExp(`/org/${orgA}/projects/[a-f0-9-]+$`));
  const projectUrl = page.url();
  await page.getByRole('button', { name: 'Edit project', exact: true }).click();
  await page.getByLabel('Description', { exact: true }).fill('My unsaved field instructions.');

  const second = await context.newPage();
  await second.goto(projectUrl);
  await second.getByRole('button', { name: 'Edit project', exact: true }).click();
  await second.getByLabel('Description', { exact: true }).fill('Newer instructions saved by another manager tab.');
  await second.getByRole('button', { name: 'Save project', exact: true }).click();
  await expect(second.getByRole('status')).toHaveText('Project saved.');
  await second.close();
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'This project changed while you were editing.' })).toBeVisible();
  await expect(page.getByLabel('Latest saved project')).toContainText('Newer instructions saved by another manager tab.');
  await expect(page.getByLabel('Description', { exact: true })).toHaveValue('My unsaved field instructions.');
  await page.getByRole('button', { name: 'Keep my changes on latest version' }).click();
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Project saved.');
  await expect(page.getByText('My unsaved field instructions.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Assign North Worker', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove North Worker', exact: true })).toBeVisible();

  const workerContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
  const worker = await workerContext.newPage();
  await login(worker, 'worker.north@example.test');
  await expect(worker.getByRole('link', { name: new RegExp(name) })).toBeVisible();
  await expect(worker.getByRole('button', { name: 'New project', exact: true })).toHaveCount(0);
  await worker.goto(projectUrl);
  await expect(worker.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(worker.getByRole('button', { name: 'Edit project', exact: true })).toHaveCount(0);
  await expect(worker.getByRole('heading', { name: 'Assigned workers', exact: true })).toHaveCount(0);
  const forbidden = await worker.request.post(`/bff/v1/organizations/${orgA}/projects`, { headers: { origin: new URL(projectUrl).origin, 'idempotency-key': crypto.randomUUID() }, data: { name: 'Forbidden project', address: 'No address', description: 'Must not be created', status: 'active' } });
  expect(forbidden.status()).toBe(404); // Capability denial remains non-enumerating.

  await page.getByRole('button', { name: 'Remove North Worker', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Assign North Worker', exact: true })).toBeVisible();
  await worker.goto(`/org/${orgA}/projects`);
  await expect(worker.getByRole('link', { name: new RegExp(name) })).toHaveCount(0);
  await workerContext.close();
  await page.screenshot({ path: `${process.env.TEST_ARTIFACT_DIR ?? '.local'}/web-task02-project.png`, fullPage: true });

  let release!: () => void;
  let committed!: () => void;
  const blockedResponse = new Promise<void>((resolve) => { release = resolve; });
  const serverCommitted = new Promise<void>((resolve) => { committed = resolve; });
  await page.route(`**/bff/v1/organizations/${orgA}/projects/*`, async (route) => {
    if (route.request().method() !== 'PATCH') { await route.continue(); return; }
    const response = await route.fetch(); expect(response.ok()).toBe(true); committed();
    await blockedResponse;
    await route.fulfill({ response }).catch(() => {});
  });
  await page.getByRole('button', { name: 'Edit project', exact: true }).click();
  await page.getByLabel('Description', { exact: true }).fill('Saved before logout; its late response belongs to North only.');
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  await serverCommitted;
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await login(page, 'worker.south@example.test');
  release();
  await expect(page.getByText('South · Workshop refit', { exact: true })).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  await expect(page.getByText('North · Riverside repair', { exact: true })).toHaveCount(0);
});

test('BFF rejects hostile business-write origins and forwards scoped sync cursor parameters', async ({ page }) => {
  await login(page, 'manager.north@example.test');
  const blocked = await page.request.post(`/bff/v1/organizations/${orgA}/projects`, { headers: { origin: 'https://untrusted.example', 'idempotency-key': crypto.randomUUID() }, data: { name: 'Forbidden origin', address: 'No address', description: 'Must not be created', status: 'active' } });
  expect(blocked.status()).toBe(403);
  expect((await blocked.json()).code).toBe('FORBIDDEN_ORIGIN');
  const crossTenant = await page.request.patch(`/bff/v1/organizations/${orgB}/projects/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1`, { headers: { origin: new URL(page.url()).origin, 'idempotency-key': crypto.randomUUID() }, data: { name: 'Cross tenant', address: 'No address', description: 'Must not be changed', status: 'active', baseVersion: 1 } });
  expect(crossTenant.status()).toBe(404);
  const bootstrap = await page.request.get(`/bff/v1/organizations/${orgA}/sync/bootstrap`);
  expect(bootstrap.ok()).toBe(true);
  const { cursor } = await bootstrap.json();
  expect(cursor).toBeTruthy();
  const pull = await page.request.get(`/bff/v1/organizations/${orgA}/sync/pull?cursor=${encodeURIComponent(cursor)}&limit=1`);
  expect(pull.ok()).toBe(true);
  expect((await pull.json()).organizationId).toBe(orgA);
});
