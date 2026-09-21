import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#status')).toContainText('Valid sequence');
});

test('switches tools while keeping the position visible', async ({ page }) => {
  for (const view of ['moves', 'legal', 'sequence', 'export']) {
    await page.locator(`#view-${view}`).tap();
    await expect(page.locator(`#panel-${view}`)).toBeVisible();
    await expect(page.locator('[data-panel]:visible')).toHaveCount(1);
    await expect(page.locator('#board')).toBeInViewport({ ratio: 1 });
    await expect(page.locator('#next')).toBeInViewport({ ratio: 1 });
    await expect(page.locator('#mobile-tabs')).toBeInViewport({ ratio: 1 });
  }
  await page.getByRole('tab', { name: 'PGN', exact: true }).tap();
  await expect(page.locator('#output')).toContainText('[Event "CMP-1"]');
});

test('adds a legal move and edits a sequence', async ({ page }) => {
  await page.locator('#view-legal').tap();
  await page
    .locator('#legal')
    .getByRole('button', { name: 'e2e4', exact: true })
    .tap();
  await expect(page.locator('#position')).toHaveText('1 / 1');
  await expect(page.locator('#status')).toContainText('1 legal moves');
  await page.locator('#view-sequence').tap();
  await expect(page.locator('#mnemonic')).toHaveValue('cmp1 e2e4');
  await page.locator('#mnemonic').fill('cmp1 d2d4 d7d5');
  await page.locator('#check').tap();
  await expect(page.locator('#status')).toContainText('2 legal moves');
  await page.locator('#view-moves').tap();
  await expect(page.locator('#moves button')).toHaveCount(2);
  await expect(page.locator('#board')).toBeInViewport({ ratio: 1 });
});

test('keeps navigation available through a long move list', async ({
  page,
}) => {
  await page.locator('#view-sequence').tap();
  await page
    .locator('#mnemonic')
    .fill('cmp1 ' + Array(16).fill('g1f3 g8f6 f3g1 f6g8').join(' '));
  await page.locator('#check').tap();
  await expect(page.locator('#status')).toContainText('64 legal moves');
  await page.locator('#view-moves').tap();
  await page.locator('#moves button').last().scrollIntoViewIfNeeded();
  await expect(page.locator('#board')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('#mobile-tabs')).toBeInViewport({ ratio: 1 });
  await page.locator('#moves button').nth(62).tap();
  await expect(page.locator('#position')).toHaveText('63 / 64');
  await expect(page.locator('#board')).toBeInViewport({ ratio: 1 });
  await page.locator('#view-export').tap();
  await expect(page.locator('#panel-export')).toBeVisible();
  await expect(page.locator('#output')).toBeInViewport();
  expect(
    await page
      .locator('#moves')
      .evaluate((element) => getComputedStyle(element).overflowY),
  ).toBe('visible');
});

test('fits a small phone and supports tab keys', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.locator('#view-moves').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#view-legal')).toBeFocused();
  await expect(page.locator('#panel-legal')).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.locator('#panel-export')).toBeVisible();
  await expect(page.locator('#mobile-tabs')).toBeInViewport({ ratio: 1 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
