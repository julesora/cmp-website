import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#status')).toContainText('Valid sequence');
});

test('replays, normalizes and exports a sequence', async ({ page }) => {
  await expect(page.locator('#output')).toHaveText(
    '1. e4 e5 2. Nf3 Nc6 3. Bb5',
  );
  await page.getByRole('button', { name: 'Next move', exact: true }).click();
  await expect(page.locator('#position')).toHaveText('1 / 5');
  await page.getByRole('button', { name: 'Last position' }).click();
  await expect(page.locator('#position')).toHaveText('5 / 5');
  await page.locator('#mnemonic').fill('CMP1  E2E4 E7E5');
  await expect(page.locator('#download')).toBeDisabled();
  await page.locator('#check').click();
  await expect(page.locator('#status')).toContainText('Valid sequence');
  await page.locator('#normalize').click();
  await expect(page.locator('#mnemonic')).toHaveValue('cmp1 e2e4 e7e5');
  await page.getByRole('tab', { name: 'PGN' }).click();
  await expect(page.locator('#output')).toContainText('[Event "CMP-1"]');
  const download = page.waitForEvent('download');
  await page.locator('#download').click();
  expect((await download).suggestedFilename()).toBe('cmp.pgn');
});

test('rejects invalid moves and recovers', async ({ page }) => {
  await page.locator('#example').selectOption('invalid');
  await page.locator('#load').click();
  await expect(page.locator('#status')).toContainText('illegal move 1');
  await expect(page.locator('#mnemonic')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.locator('#output')).toBeEmpty();
  await page.locator('#clear').click();
  await expect(page.locator('#status')).toContainText('Empty board');
  await page.locator('summary').click();
  await page
    .locator('#legal')
    .getByRole('button', { name: 'e2e4', exact: true })
    .click();
  await expect(page.locator('#mnemonic')).toHaveValue('cmp1 e2e4');
  await expect(page.locator('#status')).toContainText('Valid sequence');
});

test('branches from a prior position and plays', async ({ page }) => {
  await page.locator('summary').click();
  await page
    .locator('#legal')
    .getByRole('button', { name: 'd2d4', exact: true })
    .click();
  await expect(page.locator('#mnemonic')).toHaveValue('cmp1 d2d4');
  await expect(page.locator('#status')).toContainText('1 legal moves');
  await page.locator('#play').click();
  await expect(page.locator('#position')).toHaveText('1 / 1');
  await expect(page.locator('#play')).toHaveText('Play');
});

test('shows restarted games and special moves', async ({ page }) => {
  for (const [example, text] of [
    ['castling', 'O-O'],
    ['en-passant', 'exd6'],
    ['promotion', 'bxa8=Q'],
    ['restart', 'Qh4#'],
  ]) {
    await page.locator('#example').selectOption(example);
    await page.locator('#load').click();
    await expect(page.locator('#output')).toContainText(text);
  }
  await expect(page.locator('#game')).toHaveText('Game 2');
});

test('board clicks add a legal move', async ({ page }) => {
  const board = page.locator('#board');
  const bounds = await board.boundingBox();
  await page.mouse.click(
    bounds.x + (bounds.width * 4.5) / 8,
    bounds.y + (bounds.height * 6.5) / 8,
  );
  await page.mouse.click(
    bounds.x + (bounds.width * 4.5) / 8,
    bounds.y + (bounds.height * 4.5) / 8,
  );
  await expect(page.locator('#mnemonic')).toHaveValue('cmp1 e2e4');
  await expect(page.locator('#status')).toContainText('Valid sequence');
});

test('handles server failure', async ({ page }) => {
  test.skip(Boolean(process.env.CMP_PAGES), 'Server transport only.');
  await page.route('**/api/inspect', (route) => route.abort());
  await page.locator('#check').click();
  await expect(page.locator('#status')).toContainText('Cannot reach CMP');
  await expect(page.locator('#copy')).toBeDisabled();
});

test('fits mobile and loads SVG assets', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const failed = [];
  page.on('response', (response) => {
    if (response.status() >= 400) failed.push(response.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('#status')).toContainText('Valid sequence');
  await page.locator('#last').click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test('chooses an underpromotion on the board', async ({ page }) => {
  await page
    .locator('#mnemonic')
    .fill('cmp1 a2a4 h7h5 a4a5 h5h4 a5a6 h4h3 a6b7 h3g2');
  await page.locator('#check').click();
  await expect(page.locator('#status')).toContainText('8 legal moves');
  const bounds = await page.locator('#board').boundingBox();
  await page.mouse.click(
    bounds.x + (bounds.width * 1.5) / 8,
    bounds.y + (bounds.height * 1.5) / 8,
  );
  await page.mouse.click(
    bounds.x + (bounds.width * 0.5) / 8,
    bounds.y + (bounds.height * 0.5) / 8,
  );
  await page.getByRole('button', { name: 'Knight', exact: true }).click();
  await expect(page.locator('#output')).toContainText('bxa8=N');
});

test('adds a new game after mate', async ({ page }) => {
  await page.locator('#mnemonic').fill('cmp1 f2f3 e7e5 g2g4 d8h4');
  await page.locator('#check').click();
  await expect(page.locator('#turn')).toContainText('Game ended: 0-1');
  await page.locator('summary').click();
  await page
    .locator('#legal')
    .getByRole('button', { name: 'e2e4', exact: true })
    .click();
  await expect(page.locator('#game')).toHaveText('Game 2');
});

test('generates a sequence for playback and export', async ({ page }) => {
  await page.locator('#random-count').fill('12');
  await page.getByRole('button', { name: 'Generate random' }).click();
  await expect(page.locator('#status')).toContainText('12 legal moves');
  await expect(page.locator('#position')).toHaveText('0 / 12');
  expect(
    (await page.locator('#mnemonic').inputValue()).split(' '),
  ).toHaveLength(13);
  await page.locator('#last').click();
  await expect(page.locator('#position')).toHaveText('12 / 12');
  await expect(page.locator('#download')).toBeEnabled();
});

test('does not overwrite edits with a late generated response', async ({
  page,
}) => {
  test.skip(Boolean(process.env.CMP_PAGES), 'Server transport only.');
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/api/generate', async (route) => {
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Generate random' }).click();
  await expect(page.locator('#status')).toHaveText('Generating…');
  await page.locator('#mnemonic').fill('cmp1 d2d4');
  release();
  await page.waitForResponse('**/api/generate');
  await expect(page.locator('#mnemonic')).toHaveValue('cmp1 d2d4');
  await expect(page.locator('#status')).toContainText('Edited.');
});
