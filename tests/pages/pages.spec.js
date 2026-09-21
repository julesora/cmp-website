import { test, expect } from '@playwright/test';
import '../browser/workbench.spec.js';

test('runs locally after loading', async ({ page, context }) => {
  const apiCalls = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) apiCalls.push(request.url());
  });
  await page.goto('./');
  await expect(page.locator('#status')).toContainText('Select a sequence');
  await expect(page.locator('#privacy')).toContainText('Runs in your browser');
  await context.setOffline(true);
  await page.locator('#clear').click();
  await page.locator('#random-count').fill('24');
  await page.locator('#generate').click();
  await expect(page.locator('#new-dialog')).not.toBeVisible();
  await page.locator('#apply').click();
  await expect(page.locator('#position')).toHaveText('24 / 24');
  expect(apiCalls).toEqual([]);
});

test('reports a runtime download failure', async ({ page }) => {
  await page.route('**/runtime/pyodide.mjs', (route) => route.abort());
  await page.goto('./');
  await expect(page.locator('#status')).toContainText('Cannot load CMP');
  await expect(page.locator('#download')).toBeDisabled();
  await page.unroute('**/runtime/pyodide.mjs');
  await page.locator('#retry').click();
  await expect(page.locator('#status')).toContainText('Select a sequence');
});
