import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#status')).toContainText('Select a sequence');
});

test('places the collection above the viewer and fits the phone', async ({ page }) => {
  await expect(page.locator('#collection')).toBeInViewport();
  const collection = await page.locator('#collection').boundingBox();
  const viewer = await page.locator('#viewer').boundingBox();
  expect(collection.y).toBeLessThan(viewer.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('generates, edits, saves and reopens a sequence', async ({ page }) => {
  await page.locator('#clear').tap();
  await page.locator('#random-count').fill('8');
  await page.locator('#generate').tap();
  await expect(page.locator('#new-dialog')).not.toBeVisible();
  await expect(page.locator('#position')).toHaveText('0 / 8');
  await page.locator('#sequence-name').fill('Phone test');
  await page.locator('#apply').tap();
  await page.locator('#show-collection').tap();
  await page.locator('.sequence-open').tap();
  await expect(page.locator('#panel-sequence')).not.toBeVisible();
  await expect(page.locator('#viewer-title')).toHaveText('Phone test');
  await expect(page.locator('#board')).toBeVisible();
});

test('cancels a blank draft and deletes with undo', async ({ page }) => {
  await page.locator('#clear').tap();
  await page.locator('#start-blank').tap();
  await expect(page.locator('#panel-sequence')).toBeVisible();
  await page.locator('#cancel').tap();
  await expect(page.locator('#viewer-content')).not.toBeVisible();
  await page.locator('#import').tap();
  await page.locator('#mnemonic').fill('e2e4');
  await page.locator('#apply').tap();
  await page.locator('#show-collection').tap();
  await page.locator('.collection-entry').getByRole('button', { name: 'Edit', exact: true }).tap();
  await page.locator('#delete-sequence').tap();
  await expect(page.locator('#viewer-content')).not.toBeVisible();
  await page.locator('#undo-delete').tap();
  await expect(page.locator('.collection-entry')).toHaveCount(1);
});

test('fits import and export on small phones', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.locator('#import').tap();
  await page.locator('#mnemonic').fill('e2e4 e7e5');
  await page.locator('#apply').tap();
  await expect(page.locator('#position')).toHaveText('0 / 2');
  await page.locator('#show-collection').tap();
  await page.locator('#export-collection').tap();
  await page.locator('#tab-pgn').tap();
  await expect(page.locator('#output')).toContainText('[Event "CMP-1"]');
  expect(await page.locator('#panel-export').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
});
