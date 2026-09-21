import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#status')).toContainText('Valid sequence');
});

test('keeps the board, generator and editor together', async ({ page }) => {
  for (const id of ['board', 'generator', 'mnemonic', 'check']) {
    await expect(page.locator(`#${id}`)).toBeInViewport({ ratio: 1 });
  }
  await page.locator('#random-count').fill('12');
  await page.locator('#generate').tap();
  await expect(page.locator('#status')).toContainText('12 legal moves');
  await expect(page.locator('#moves button')).toHaveCount(12);
});

test('adds legal moves without switching panels', async ({ page }) => {
  await page.locator('#legal').getByRole('button', { name: 'e2e4', exact: true }).tap();
  await expect(page.locator('#mnemonic')).toHaveValue('cmp1 e2e4');
  await page.locator('#mnemonic').fill('cmp1 d2d4 d7d5');
  await page.locator('#check').tap();
  await expect(page.locator('#moves button')).toHaveCount(2);
  await page.locator('#tab-pgn').tap();
  await expect(page.locator('#output')).toContainText('[Event "CMP-1"]');
});

test('replays long histories without inner scrolling', async ({ page }) => {
  await page.locator('#mnemonic').fill(`cmp1 ${Array(16).fill('g1f3 g8f6 f3g1 f6g8').join(' ')}`);
  await page.locator('#check').tap();
  await expect(page.locator('#moves button')).toHaveCount(64);
  await page.locator('#moves button').nth(62).tap();
  await expect(page.locator('#position')).toHaveText('63 / 64');
  await expect(page.locator('#moves')).toHaveCSS('overflow-y', 'visible');
  await page.locator('#first').tap();
  await expect(page.locator('#position')).toHaveText('0 / 64');
});

test('fits small phones with every tool open', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  for (const id of ['generator', 'mnemonic', 'legal', 'moves', 'output']) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
