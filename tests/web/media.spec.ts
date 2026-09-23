import { test, expect } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
const organizationId = '11111111-1111-4111-8111-111111111111';
const projectId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
test('manager gallery polls committed media, serves private derivatives and closes access on logout', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel('Email',{ exact:true }).fill('manager.north@example.test');
  await page.getByLabel('Password',{ exact:true }).fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button',{ name:'Sign in',exact:true }).click();
  await expect(page.getByRole('heading',{ name:'Projects',exact:false })).toBeVisible();
  const me = await (await page.request.get('/bff/v1/me')).json();
  const mediaId = randomUUID();
  const bytes = await sharp({ create:{ width:960,height:720,channels:3,background:'#447564' } }).jpeg().toBuffer();
  const endpoint = new URL(process.env.API_INTERNAL_URL ?? 'http://localhost:3301');
  endpoint.hostname = new URL(page.url()).hostname; // Same host-only session cookie across local ports.
  const apiOrigin = endpoint.origin;
  const origin = new URL(page.url()).origin;
  const created = await page.request.post(`${apiOrigin}/v1/organizations/${organizationId}/projects/${projectId}/uploads`, {
    headers:{ origin }, data:{ accountId:me.accountId,mediaId,mime:'image/jpeg',capturedAt:new Date().toISOString(),size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),width:960,height:720 },
  });
  expect(created.status()).toBe(200); const upload = await created.json();
  const contentPath = `/media/organizations/${organizationId}/uploads/${upload.uploadId}/content`;
  expect((await page.request.put(contentPath,{ headers:{ origin,'content-type':'image/jpeg' },data:bytes })).status()).toBe(405);
  expect((await page.request.put(apiOrigin+contentPath,{ headers:{ origin,'content-type':'image/jpeg' },data:bytes })).status()).toBe(200);
  expect((await page.request.post(`${apiOrigin}/v1/organizations/${organizationId}/uploads/${upload.uploadId}/complete`,{ headers:{ origin } })).status()).toBe(200);
  await page.goto(`/org/${organizationId}/projects/${projectId}`);
  const gallery = page.getByRole('region',{ name:'Project photos' });
  await expect(gallery.getByText('Original verified').first()).toBeVisible();
  const worker = spawn(process.execPath,['apps/worker/dist/main.js'],{ env:{ ...process.env,WORKER_POLL_MS:'100' },stdio:'ignore' });
  try {
    const original = gallery.locator(`a[href$="/${mediaId}/original"]`);
    await expect(original).toBeVisible();
    await expect(gallery.locator(`img[src$="/${mediaId}/thumb"]`)).toBeVisible({ timeout:20000 });
    const image = gallery.locator(`img[src$="/${mediaId}/thumb"]`);
    expect(await image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const url = await original.getAttribute('href');
    const response = await page.request.get(url!); expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('private, no-store');
    expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(createHash('sha256').update(bytes).digest('hex'));
    await page.screenshot({ path:`${process.env.TEST_ARTIFACT_DIR ?? '.local'}/task04-manager-gallery.png`,fullPage:true });
    await page.getByRole('button',{ name:'Sign out',exact:true }).click();
    await expect(page).toHaveURL(/sign-in/);
    expect((await page.request.get(url!)).status()).toBe(401);
    await expect(page.getByText('Original verified')).toHaveCount(0);
  } finally {
    const stopped = new Promise((resolve) => worker.once('exit',resolve)); worker.kill('SIGTERM'); await stopped;
  }
});
