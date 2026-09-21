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
  await page.locator('#export').click();
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
  await page
    .locator('#legal')
    .getByRole('button', { name: 'e2e4', exact: true })
    .click();
  await expect(page.locator('#mnemonic')).toHaveValue('cmp1 e2e4');
  await expect(page.locator('#status')).toContainText('Valid sequence');
});

test('branches from a prior position and plays', async ({ page }) => {
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
  await page.locator('#board').evaluate((element) => element.scrollIntoView({ block: 'center' }));
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

test('navigates and plays with keyboard shortcuts', async ({ page }) => {
  await page.locator('h1').click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#position')).toHaveText('1 / 5');
  await page.keyboard.press('End');
  await expect(page.locator('#position')).toHaveText('5 / 5');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#position')).toHaveText('5 / 5');
  await page.keyboard.press('Home');
  await page.keyboard.press('Space');
  await expect(page.locator('#play')).toHaveText('Pause');
  await page.keyboard.press('Space');
  await expect(page.locator('#play')).toHaveText('Play');
  await page.keyboard.press('/');
  await expect(page.locator('#mnemonic')).toBeFocused();
  await page.locator('#mnemonic').fill('cmp1 d2d4');
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('#status')).toContainText('1 legal moves');
});

test('preserves native controls and offers shortcut settings', async ({
  page,
}) => {
  await page.locator('#random-count').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#position')).toHaveText('0 / 5');
  await page.locator('#export').click();
  await page.locator('#tab-san').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tab-pgn')).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('#position')).toHaveText('0 / 5');
  await page.keyboard.press('Escape');
  await page.locator('h1').click();
  await page.keyboard.press('?');
  await expect(page.locator('#shortcuts')).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.locator('#position')).toHaveText('0 / 5');
  await page.locator('#letter-shortcuts').uncheck();
  await page.keyboard.press('Escape');
  await expect(page.locator('#shortcuts')).not.toBeVisible();
  await page.locator('h1').click();
  await page.keyboard.press('/');
  await expect(page.locator('#mnemonic')).not.toBeFocused();
  await page.keyboard.press('?');
  await expect(page.locator('#shortcuts')).not.toBeVisible();
  await page.locator('#show-shortcuts').click();
  await expect(page.locator('#shortcuts')).toBeVisible();
});

test('flips the board with F without changing the sequence', async ({
  page,
}) => {
  const before = await page
    .locator('#board [data-square="a1"]')
    .first()
    .boundingBox();
  await page.locator('h1').click();
  await page.keyboard.press('f');
  await expect
    .poll(async () => {
      const after = await page
        .locator('#board [data-square="a1"]')
        .first()
        .boundingBox();
      return after.x > before.x;
    })
    .toBe(true);
  await expect(page.locator('#mnemonic')).toHaveValue(
    'cmp1 e2e4 e7e5 g1f3 b8c6 f1b5',
  );
});

test('keeps the board and shortcut dialog within a resized viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#show-shortcuts').click();
  await expect(page.locator('#shortcuts')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        return document.documentElement.scrollWidth <= innerWidth;
      }),
    )
    .toBe(true);
});

test('shows long move lists without inner scrolling', async ({ page }) => {
  const moves = Array(16).fill('g1f3 g8f6 f3g1 f6g8').join(' ');
  await page.locator('#mnemonic').fill(`cmp1 ${moves}`);
  await page.locator('#check').click();
  await expect(page.locator('#status')).toContainText('64 legal moves');
  await expect(page.locator('#moves button')).toHaveCount(64);
  for (const id of ['moves', 'legal']) {
    expect(
      await page.locator(`#${id}`).evaluate((element) => {
        return element.scrollHeight <= element.clientHeight;
      }),
    ).toBe(true);
  }
  await expect(page.locator('#legal')).toHaveCSS('display', 'grid');
  await expect(page.locator('input[type="range"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Move 1: Nf3', exact: true }).click();
  await expect(page.locator('#position')).toHaveText('1 / 64');
  await expect(page.locator('#turn')).toHaveText('Black to move');
});

test('keeps all tools open across screen sizes', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    for (const id of ['board', 'generator', 'mnemonic', 'legal', 'moves']) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    await expect(page.getByRole('tablist', { name: 'Workspace', exact: true })).toHaveCount(0);
  }
});

test('pairs White and Black moves and resets numbering for new games', async ({
  page,
}) => {
  await expect(page.locator('.move-row')).toHaveCount(3);
  await expect(page.locator('.move-row').first().locator('button')).toHaveText([
    'e4',
    'e5',
  ]);
  await page.locator('#example').selectOption('restart');
  await page.locator('#load').click();
  await expect(page.locator('#status')).toContainText('Valid sequence');
  await expect(page.locator('.game-label')).toHaveText(['Game 1', 'Game 2']);
  await expect(page.locator('.move-number')).toHaveText(['1.', '2.', '1.']);
});

test('imports text and starts a new board from the toolbar', async ({ page }) => {
  await page.locator('#import-file').setInputFiles({
    name: 'moves.uci', mimeType: 'text/plain', buffer: Buffer.from('e2e4 e7e5'),
  });
  await expect(page.locator('#mnemonic')).toHaveValue('cmp1 e2e4 e7e5');
  await expect(page.locator('#position')).toHaveText('2 / 2');
  await page.locator('#edit').click();
  await expect(page.locator('#mnemonic')).toBeFocused();
  await page.locator('#clear').click();
  await expect(page.locator('#position')).toHaveText('0 / 0');
  await expect(page.locator('#legal button')).toHaveCount(20);
});

test('reopens generated sequences from the collection', async ({ page }) => {
  await page.locator('#list').click();
  await expect(page.locator('#list-empty')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('#random-count').fill('4');
  await page.locator('#generate').click();
  await expect(page.locator('#sequence-count')).toHaveText('1');
  const first = await page.locator('#mnemonic').inputValue();
  await page.locator('#random-count').fill('8');
  await page.locator('#generate').click();
  await expect(page.locator('#sequence-count')).toHaveText('2');
  await page.locator('#clear').click();
  await page.locator('#list').click();
  await page.getByRole('button', { name: 'Sequence 1 · 4 moves' }).click();
  await expect(page.locator('#mnemonic')).toHaveValue(first);
  await expect(page.locator('#position')).toHaveText('0 / 4');
  await page.reload();
  await expect(page.locator('#sequence-count')).toHaveText('0');
});
