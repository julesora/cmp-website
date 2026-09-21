import { test, expect } from '@playwright/test';

async function importSequence(page, text) {
  await page.locator('#import').click();
  await page.locator('#mnemonic').fill(text);
  await page.locator('#apply').click();
  await expect(page.locator('#sequence-dialog')).not.toBeVisible();
}

async function generate(page, count) {
  await page.locator('#clear').click();
  await page.locator('#random-count').fill(String(count));
  await page.locator('#generate').click();
  await expect(page.locator('#draft-status')).toHaveText(`✓ ${count} moves`);
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#status')).toContainText('Valid sequence');
});

test('shows only board and history in the main workspace', async ({ page }) => {
  await expect(page.locator('#board')).toBeVisible();
  await expect(page.locator('#moves button')).toHaveCount(5);
  for (const id of ['mnemonic', 'generator', 'legal', 'check', 'normalize']) {
    await expect(page.locator(`#${id}`)).not.toBeVisible();
  }
  await expect(page.locator('.move-row').first().locator('button')).toHaveText(['e4', 'e5']);
  await page.locator('#next').click();
  await expect(page.locator('#position')).toHaveText('1 / 5');
  await page.locator('#last').click();
  await expect(page.locator('#position')).toHaveText('5 / 5');
});

test('checks and normalizes an import without replacing the board', async ({ page }) => {
  await page.locator('#import').click();
  await expect(page.locator('#generator')).not.toBeVisible();
  await expect(page.locator('#legal')).not.toBeVisible();
  await page.locator('#mnemonic').fill('CMP1  E2E4 E7E5');
  await page.locator('#check').click();
  await expect(page.locator('#draft-status')).toHaveText('✓ 2 moves');
  await expect(page.locator('#position')).toHaveText('0 / 5');
  await page.locator('#normalize').click();
  await expect(page.locator('#mnemonic')).toHaveValue('cmp1 e2e4 e7e5');
  await page.locator('#apply').click();
  await expect(page.locator('#position')).toHaveText('0 / 2');
  await page.locator('#export').click();
  await expect(page.locator('#output')).toHaveText('cmp1 e2e4 e7e5');
});

test('highlights illegal input and keeps the previous sequence', async ({ page }) => {
  await page.locator('#import').click();
  await page.locator('#mnemonic').fill('cmp1 e2e5');
  await page.locator('#apply').click();
  await expect(page.locator('#draft-status')).toContainText('illegal move 1');
  await expect(page.locator('#mnemonic')).toHaveAttribute('aria-invalid', 'true');
  expect(await page.locator('#mnemonic').evaluate((element) =>
    element.value.slice(element.selectionStart, element.selectionEnd))).toBe('e2e5');
  await expect(page.locator('#position')).toHaveText('0 / 5');
  await page.keyboard.press('Escape');
  await expect(page.locator('#sequence-dialog')).not.toBeVisible();
  await expect(page.locator('#moves button')).toHaveCount(5);
});

test('imports files and exports CMP, UCI, SAN and PGN', async ({ page }) => {
  await page.locator('#import').click();
  await page.locator('#import-file').setInputFiles({
    name: 'moves.uci', mimeType: 'text/plain', buffer: Buffer.from('e2e4 e7e5'),
  });
  await expect(page.locator('#draft-status')).toHaveText('✓ 2 moves');
  await page.locator('#apply').click();
  await expect(page.locator('#sequence-dialog')).not.toBeVisible();
  await page.locator('#export').click();
  for (const [format, text] of [['cmp', 'cmp1 e2e4'], ['uci', 'e2e4'], ['san', '1. e4 e5'], ['pgn', '[Event "CMP-1"]']]) {
    await page.locator(`#tab-${format}`).click();
    await expect(page.locator('#output')).toContainText(text);
  }
  const download = page.waitForEvent('download');
  await page.locator('#download').click();
  expect((await download).suggestedFilename()).toBe('sequence.pgn');
});

test('generates only in New and commits only on Create', async ({ page }) => {
  await generate(page, 12);
  await expect(page.locator('#position')).toHaveText('0 / 5');
  await expect(page.locator('#legal')).toBeVisible();
  await page.locator('#cancel').click();
  await expect(page.locator('#moves button')).toHaveCount(5);
  await expect(page.locator('#sequence-count')).toHaveText('0');
  await generate(page, 8);
  await page.locator('#apply').click();
  await expect(page.locator('#position')).toHaveText('0 / 8');
  await expect(page.locator('#sequence-count')).toHaveText('1');
  await page.locator('#undo').click();
  await expect(page.locator('#position')).toHaveText('0 / 5');
});

test('starts empty and builds using legal moves in New', async ({ page }) => {
  await page.locator('#clear').click();
  await expect(page.locator('#draft-status')).toHaveText('✓ 0 moves');
  await page.locator('#legal').getByRole('button', { name: 'e2e4', exact: true }).click();
  await expect(page.locator('#draft-status')).toHaveText('✓ 1 moves');
  await page.locator('#apply').click();
  await expect(page.locator('#position')).toHaveText('0 / 1');
  await page.locator('#clear').click();
  await page.locator('#apply').click();
  await expect(page.locator('#position')).toHaveText('0 / 0');
  await expect(page.locator('#legal')).not.toBeVisible();
});

test('edits a branch with Apply, Cancel and Undo', async ({ page }) => {
  await page.locator('#edit').click();
  await expect(page.locator('#check')).not.toBeVisible();
  await expect(page.locator('#normalize')).not.toBeVisible();
  await expect(page.locator('#legal')).toBeVisible();
  await page.locator('#legal').getByRole('button', { name: 'd2d4', exact: true }).click();
  await expect(page.locator('#position')).toHaveText('1 / 1');
  await page.locator('#cancel').click();
  await expect(page.locator('#position')).toHaveText('0 / 5');
  await page.locator('#edit').click();
  await page.locator('#mnemonic').fill('cmp1 d2d4 d7d5');
  await expect(page.locator('#position')).toHaveText('0 / 5');
  await page.locator('#apply').click();
  await expect(page.locator('#position')).toHaveText('2 / 2');
  await expect(page.locator('#legal')).not.toBeVisible();
  await page.locator('#undo').click();
  await expect(page.locator('#position')).toHaveText('0 / 5');
});

test('board clicks filter legal moves and build an edit', async ({ page }) => {
  await page.locator('#edit').click();
  await page.locator('#board').evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const bounds = await page.locator('#board').boundingBox();
  await page.mouse.click(bounds.x + bounds.width * 4.5 / 8, bounds.y + bounds.height * 6.5 / 8);
  await expect(page.locator('#legal button')).toHaveText(['e2e3', 'e2e4']);
  await page.mouse.click(bounds.x + bounds.width * 4.5 / 8, bounds.y + bounds.height * 6.5 / 8);
  await expect(page.locator('#legal button')).toHaveCount(20);
  await page.mouse.click(bounds.x + bounds.width * 4.5 / 8, bounds.y + bounds.height * 6.5 / 8);
  await page.mouse.click(bounds.x + bounds.width * 4.5 / 8, bounds.y + bounds.height * 4.5 / 8);
  await expect(page.locator('#position')).toHaveText('1 / 1');
  await page.locator('#apply').click();
  await expect(page.locator('#panel-sequence')).not.toBeVisible();
});

test('chooses an underpromotion on the board', async ({ page }) => {
  await importSequence(page, 'cmp1 a2a4 h7h5 a4a5 h5h4 a5a6 h4h3 a6b7 h3g2');
  await page.locator('#last').click();
  await page.locator('#edit').click();
  await page.locator('#board').evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const bounds = await page.locator('#board').boundingBox();
  await page.mouse.click(bounds.x + bounds.width * 1.5 / 8, bounds.y + bounds.height * 1.5 / 8);
  await page.mouse.click(bounds.x + bounds.width * 0.5 / 8, bounds.y + bounds.height * 0.5 / 8);
  await page.getByRole('button', { name: 'Knight', exact: true }).click();
  await expect(page.locator('#mnemonic')).toHaveValue(/b7a8n$/);
  await page.locator('#apply').click();
  await page.locator('#export').click();
  await page.locator('#tab-san').click();
  await expect(page.locator('#output')).toContainText('bxa8=N');
});

test('keeps, renames, duplicates and removes collection entries', async ({ page }) => {
  await generate(page, 4);
  await page.locator('#apply').click();
  await expect(page.locator('#sequence-count')).toHaveText('1');
  await page.reload();
  await expect(page.locator('#status')).toContainText('Valid sequence');
  await page.locator('#list').click();
  const entry = page.locator('.collection-entry').first();
  await entry.locator('input').fill('My test');
  await entry.locator('input').press('Tab');
  await entry.getByRole('button', { name: 'Duplicate' }).click();
  await expect(page.locator('.collection-entry')).toHaveCount(2);
  await entry.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(page.locator('#position')).toHaveText('0 / 4');
  await expect(page.locator('#sequence-count')).toHaveText('2');
  await page.locator('#list').click();
  await expect(entry.locator('input')).toHaveValue('My test');
  await entry.getByRole('button', { name: 'Remove' }).click();
  await expect(page.locator('.collection-entry')).toHaveCount(1);
  await page.locator('#clear-collection').click();
  await expect(page.locator('#list-empty')).toBeVisible();
});

test('loads examples and resets numbering after mate', async ({ page }) => {
  for (const [name, output] of [['Castling', 'O-O'], ['En passant', 'exd6'], ['Promotion', 'bxa8=Q'], ['New game after mate', 'Qh4#']]) {
    await page.locator('#list').click();
    await page.locator('#examples').getByRole('button', { name, exact: true }).click();
    await expect(page.locator('#sequence-dialog')).not.toBeVisible();
    await page.locator('#export').click();
    await page.locator('#tab-san').click();
    await expect(page.locator('#output')).toContainText(output);
    await page.keyboard.press('Escape');
  }
  await expect(page.locator('.game-label')).toHaveText(['Game 1', 'Game 2']);
  await expect(page.locator('.move-number')).toHaveText(['1.', '2.', '1.']);
});

test('navigates, plays, edits and cancels with keys', async ({ page }) => {
  await page.locator('h1').click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#position')).toHaveText('1 / 5');
  await page.keyboard.press('End');
  await expect(page.locator('#position')).toHaveText('5 / 5');
  await page.keyboard.press('Home');
  await page.keyboard.press('Space');
  await expect(page.locator('#play')).toHaveText('Pause');
  await page.keyboard.press('Space');
  await expect(page.locator('#play')).toHaveText('Play');
  await page.keyboard.press('/');
  await expect(page.locator('#mnemonic')).toBeFocused();
  await page.locator('#mnemonic').fill('cmp1 d2d4');
  await page.keyboard.press('Escape');
  await expect(page.locator('#position')).toHaveText('0 / 5');
  await page.locator('#import').click();
  await page.locator('#mnemonic').fill('d2d4');
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('#position')).toHaveText('0 / 1');
});

test('preserves native keys and shortcut settings', async ({ page }) => {
  await page.locator('#export').click();
  await page.locator('#tab-cmp').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tab-uci')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#position')).toHaveText('0 / 5');
  await page.keyboard.press('Escape');
  await page.locator('#show-shortcuts').click();
  await page.locator('#letter-shortcuts').uncheck();
  await page.keyboard.press('Escape');
  await page.locator('h1').click();
  await page.keyboard.press('/');
  await expect(page.locator('#panel-sequence')).not.toBeVisible();
});

test('keeps long histories without inner scrolling', async ({ page }) => {
  await importSequence(page, `cmp1 ${Array(16).fill('g1f3 g8f6 f3g1 f6g8').join(' ')}`);
  await expect(page.locator('#moves button')).toHaveCount(64);
  expect(await page.locator('#moves').evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);
  await page.locator('#moves button').nth(62).click();
  await expect(page.locator('#position')).toHaveText('63 / 64');
});

test('keeps the board after a request failure', async ({ page }) => {
  test.skip(Boolean(process.env.CMP_PAGES), 'Server transport only.');
  await page.route('**/api/inspect', (route) => route.abort());
  await page.locator('#import').click();
  await page.locator('#mnemonic').fill('e2e4');
  await page.locator('#apply').click();
  await expect(page.locator('#draft-status')).toContainText('Cannot reach CMP');
  await page.locator('#cancel').click();
  await expect(page.locator('#position')).toHaveText('0 / 5');
});

test('ignores generation completed after cancellation', async ({ page }) => {
  test.skip(Boolean(process.env.CMP_PAGES), 'Server transport only.');
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route('**/api/generate', async (route) => {
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  await page.locator('#clear').click();
  await page.locator('#generate').click();
  await expect(page.locator('#draft-status')).toHaveText('Generating…');
  await page.locator('#cancel').click();
  release();
  await page.waitForResponse('**/api/generate');
  await expect(page.locator('#position')).toHaveText('0 / 5');
  await expect(page.locator('#sequence-count')).toHaveText('0');
});

test('keeps newer draft text when generation finishes late', async ({ page }) => {
  test.skip(Boolean(process.env.CMP_PAGES), 'Server transport only.');
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route('**/api/generate', async (route) => {
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  await page.locator('#clear').click();
  await page.locator('#generate').click();
  await expect(page.locator('#draft-status')).toHaveText('Generating…');
  await page.locator('#mnemonic').fill('cmp1 d2d4');
  release();
  await page.waitForResponse('**/api/generate');
  await expect(page.locator('#mnemonic')).toHaveValue('cmp1 d2d4');
  await page.locator('#apply').click();
  await expect(page.locator('#position')).toHaveText('0 / 1');
});

test('still saves a session collection when browser storage is unavailable', async ({ page }) => {
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
  });
  await page.locator('#list').click();
  await page.locator('#save-sequence').click();
  await expect(page.locator('.collection-entry')).toHaveCount(1);
  await expect(page.locator('#collection-status')).toContainText('Storage unavailable');
});
