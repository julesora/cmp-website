import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#status')).toContainText('Valid sequence');
});

test('keeps board and moves together without editing controls', async ({ page }) => {
  await expect(page.locator('#board')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('#moves')).toBeVisible();
  await expect(page.locator('#panel-sequence')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('generates and saves through the New dialog', async ({ page }) => {
  await page.locator('#clear').tap();
  await page.locator('#random-count').fill('8');
  await page.locator('#generate').tap();
  await expect(page.locator('#draft-status')).toHaveText('✓ 8 moves');
  await page.locator('#apply').tap();
  await expect(page.locator('#position')).toHaveText('0 / 8');
  await page.locator('#list').tap();
  await page.locator('.collection-entry').getByRole('button', { name: 'Open', exact: true }).tap();
  await expect(page.locator('#position')).toHaveText('0 / 8');
});

test('edits legal moves and restores the board on cancel', async ({ page }) => {
  await page.locator('#edit').tap();
  await page.locator('#legal').getByRole('button', { name: 'e2e4', exact: true }).tap();
  await expect(page.locator('#position')).toHaveText('1 / 1');
  await page.locator('#cancel').tap();
  await expect(page.locator('#position')).toHaveText('0 / 5');
});

test('fits import and export on small phones', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.locator('#import').tap();
  await page.locator('#mnemonic').fill('e2e4 e7e5');
  await page.locator('#apply').tap();
  await expect(page.locator('#position')).toHaveText('0 / 2');
  await page.locator('#export').tap();
  await page.locator('#tab-pgn').tap();
  await expect(page.locator('#output')).toContainText('[Event "CMP-1"]');
  expect(await page.locator('#panel-export').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
});
