import { test, expect } from '@playwright/test';

const entry = (page, name) => page.locator('.collection-entry').filter({ has: page.getByRole('button', { name, exact: true, includeHidden: true }) });

async function showCollection(page) {
  if (await page.locator('#collection').isHidden()) await page.locator('#show-collection').click();
}

async function importSequence(page, name, text) {
  await showCollection(page);
  await page.locator('#import').click();
  await page.locator('#sequence-name').fill(name);
  await page.locator('#mnemonic').fill(text);
  await page.locator('#apply').click();
  await expect(page.locator('#sequence-dialog')).not.toBeVisible();
}

async function newDraft(page, count = null) {
  await showCollection(page);
  await page.locator('#clear').click();
  if (count === null) await page.locator('#start-blank').click();
  else {
    await page.locator('#random-count').fill(String(count));
    await page.locator('#generate').click();
  }
  await expect(page.locator('#new-dialog')).not.toBeVisible();
  await expect(page.locator('#panel-sequence')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#status')).toContainText('Select a sequence');
});

test('starts with a collection and no selected sequence', async ({ page }) => {
  await expect(page.locator('#collection')).toBeVisible();
  await expect(page.locator('#viewer-content')).not.toBeVisible();
  await expect(page.locator('#list-empty')).toBeVisible();
  await expect(page.locator('#legal')).toHaveCount(0);
});

test('imports then selects a read-only sequence', async ({ page }) => {
  await importSequence(page, 'Opening', 'e2e4 e7e5');
  await showCollection(page);
  await entry(page, 'Opening').locator('.sequence-open').click();
  await expect(page.locator('#viewer-title')).toHaveText('Opening');
  await expect(page.locator('#panel-sequence')).not.toBeVisible();
  const bounds = await page.locator('#board').boundingBox();
  await page.mouse.click(bounds.x + bounds.width * 4.5 / 8, bounds.y + bounds.height * 6.5 / 8);
  await page.mouse.click(bounds.x + bounds.width * 4.5 / 8, bounds.y + bounds.height * 4.5 / 8);
  await expect(page.locator('#moves button')).toHaveCount(2);
  await page.locator('#next').click();
  await expect(page.locator('#position')).toHaveText('1 / 2');
});

test('New leads to an unsaved edit for generated or blank sequences', async ({ page }) => {
  await newDraft(page, 8);
  await expect(page.locator('#position')).toHaveText('0 / 8');
  await expect(page.locator('.collection-entry')).toHaveCount(0);
  await page.locator('#cancel').click();
  await expect(page.locator('#viewer-content')).not.toBeVisible();
  await newDraft(page);
  await expect(page.locator('#position')).toHaveText('0 / 0');
  await page.locator('#sequence-name').fill('Blank');
  await page.locator('#apply').click();
  await showCollection(page);
  await expect(entry(page, 'Blank')).toBeVisible();
  await expect(page.locator('#panel-sequence')).not.toBeVisible();
});

test('edits and renames a specific entry without duplicating it', async ({ page }) => {
  await importSequence(page, 'One', 'e2e4');
  await importSequence(page, 'Two', 'd2d4');
  await showCollection(page);
  await entry(page, 'One').getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.locator('#mnemonic')).toHaveValue('cmp1 e2e4');
  await page.locator('#sequence-name').fill('Revised');
  await page.locator('#mnemonic').fill('e2e4 e7e5');
  await page.locator('#apply').click();
  await expect(page.locator('.collection-entry')).toHaveCount(2);
  await expect(page.locator('#moves button')).toHaveCount(2);
  await showCollection(page);
  await entry(page, 'Two').locator('.sequence-open').click();
  await expect(page.locator('#moves button')).toHaveText(['d4']);
  await page.reload();
  await expect(page.locator('#viewer-title')).toHaveText('Revised');
  await showCollection(page);
  await expect(entry(page, 'Revised')).toBeVisible();
});

test('cancels edits without changing the saved entry', async ({ page }) => {
  await importSequence(page, 'Opening', 'e2e4 e7e5');
  await showCollection(page);
  await entry(page, 'Opening').getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('#mnemonic').fill('d2d4');
  await page.locator('#sequence-name').fill('Changed');
  await page.keyboard.press('Escape');
  await expect(page.locator('#viewer-title')).toHaveText('Opening');
  await expect(page.locator('#moves button')).toHaveCount(2);
  await showCollection(page);
  await expect(entry(page, 'Opening')).toBeVisible();
});

test('deletes selected entries and clears the viewer', async ({ page }) => {
  await importSequence(page, 'Opening', 'e2e4');
  await showCollection(page);
  await entry(page, 'Opening').getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('#delete-sequence').click();
  await expect(page.locator('#viewer-content')).not.toBeVisible();
  await expect(page.locator('#list-empty')).toBeVisible();
  await page.reload();
  await expect(page.locator('.collection-entry')).toHaveCount(0);
});

test('exports the chosen entry without changing the selection', async ({ page }) => {
  await importSequence(page, 'One', 'e2e4');
  await importSequence(page, 'Two', 'd2d4');
  await showCollection(page);
  await page.getByRole('checkbox', { name: 'Export One', exact: true }).check();
  await page.locator('#export-collection').click();
  await expect(page.locator('#output')).toHaveText('cmp1 e2e4');
  await expect(page.locator('#viewer-title')).toHaveText('Two');
  await page.locator('#tab-pgn').click();
  await expect(page.locator('#output')).toContainText('1. e4');
  const download = page.waitForEvent('download');
  await page.locator('#download').click();
  expect((await download).suggestedFilename()).toBe('sequence.pgn');
});

test('checks and normalizes imported files without replacing the viewer', async ({ page }) => {
  await importSequence(page, 'Original', 'd2d4');
  await showCollection(page);
  await page.locator('#import').click();
  await page.locator('#import-file').setInputFiles({ name: 'moves.uci', mimeType: 'text/plain', buffer: Buffer.from('CMP1  E2E4 E7E5') });
  await expect(page.locator('#draft-status')).toHaveText('Checked.');
  await expect(page.locator('#viewer-title')).toHaveText('Original');
  await page.locator('#normalize').click();
  await expect(page.locator('#mnemonic')).toHaveValue('cmp1 e2e4 e7e5');
  await page.locator('#cancel').click();
  await expect(page.locator('#moves button')).toHaveCount(1);
});

test('highlights invalid moves and does not save them', async ({ page }) => {
  await page.locator('#import').click();
  await page.locator('#mnemonic').fill('cmp1 e2e5');
  await page.locator('#apply').click();
  await expect(page.locator('#draft-status')).toContainText('illegal move 1');
  expect(await page.locator('#mnemonic').evaluate((element) => element.value.slice(element.selectionStart, element.selectionEnd))).toBe('e2e5');
  await expect(page.locator('.collection-entry')).toHaveCount(0);
});

test('builds moves on the board only while editing', async ({ page }) => {
  await newDraft(page);
  await page.locator('#board').evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await page.locator('#board [data-square="e2"]').first().click({ force: true });
  await expect(page.locator('#board .markers').first()).toBeVisible();
  await page.locator('#board [data-square="e4"]').first().click({ force: true });
  await expect(page.locator('#position')).toHaveText('1 / 1');
  await page.locator('#sequence-name').fill('Board moves');
  await page.locator('#apply').click();
  await expect(page.locator('#moves button')).toHaveCount(1);
});

test('preserves promotion choices', async ({ page }) => {
  await importSequence(page, 'Promotion', 'a2a4 h7h5 a4a5 h5h4 a5a6 h4h3 a6b7 h3g2');
  await showCollection(page);
  await entry(page, 'Promotion').getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.locator('#panel-sequence')).toBeVisible();
  await page.locator('#last').click();
  await page.locator('#board').evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const bounds = await page.locator('#board').boundingBox();
  await page.mouse.click(bounds.x + bounds.width * 1.5 / 8, bounds.y + bounds.height * 1.5 / 8);
  await page.mouse.click(bounds.x + bounds.width * 0.5 / 8, bounds.y + bounds.height * 0.5 / 8);
  await page.getByRole('button', { name: 'Knight', exact: true }).click();
  await expect(page.locator('#mnemonic')).toHaveValue(/b7a8n$/);
});

test('supports navigation and explicit edit shortcuts', async ({ page }) => {
  await importSequence(page, 'Opening', 'e2e4 e7e5');
  await page.locator('h1').click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#position')).toHaveText('1 / 2');
  await page.keyboard.press('/');
  await expect(page.locator('#mnemonic')).toBeFocused();
  await page.locator('#mnemonic').fill('d2d4');
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('#moves button')).toHaveCount(1);
});

test('ignores generation after New is cancelled', async ({ page }) => {
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
  await expect(page.locator('#new-status')).toHaveText('Generating…');
  await page.locator('#cancel-new').click();
  release();
  await page.waitForResponse('**/api/generate');
  await expect(page.locator('#viewer-content')).not.toBeVisible();
  await expect(page.locator('.collection-entry')).toHaveCount(0);
});

test('exports a batch and keeps moves below the board', async ({ page }) => {
  await importSequence(page, 'One', 'e2e4');
  await importSequence(page, 'Two', 'd2d4');
  await expect(page.locator('#collection')).not.toBeVisible();
  const board = await page.locator('#board').boundingBox();
  const moves = await page.locator('#moves').boundingBox();
  expect(moves.y).toBeGreaterThan(board.y + board.height);
  await showCollection(page);
  await page.locator('#export-collection').click();
  await expect(page.locator('#output')).toHaveText('cmp1 e2e4\ncmp1 d2d4');
  const download = page.waitForEvent('download');
  await page.locator('#download').click();
  expect((await download).suggestedFilename()).toBe('sequences.cmp');
});
