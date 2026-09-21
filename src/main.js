import {
  Chessboard,
  FEN,
  INPUT_EVENT_TYPE,
} from 'cm-chessboard/src/Chessboard.js';
import {
  Markers,
  MARKER_TYPE,
} from 'cm-chessboard/src/extensions/markers/Markers.js';
import pieces from 'cm-chessboard/assets/pieces/standard.svg?url';
import markerSprite from 'cm-chessboard/assets/extensions/markers/markers.svg?url&no-inline';
import './style.css';
import { browserMode, run } from './client.js';
import { bindShortcuts } from './shortcuts.js';
import { bindCollection } from './collection.js';

const $ = (id) => document.getElementById(id);
const examples = {
  'Ruy López': 'cmp1 e2e4 e7e5 g1f3 b8c6 f1b5',
  Castling: 'cmp1 e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1',
  'En passant': 'cmp1 e2e4 a7a6 e4e5 d7d5 e5d6',
  Promotion: 'cmp1 a2a4 h7h5 a4a5 h5h4 a5a6 h4h3 a6b7 h3g2 b7a8q',
  'New game after mate': 'cmp1 f2f3 e7e5 g2g4 d8h4 e2e4',
  'Invalid move': 'cmp1 e2e5',
};
let data;
let cursor = 0;
let format = 'cmp';
let timer;
let request = 0;
let mode = null;
let original;
let draftData;
let selectedSquare;
let selectedEntry = null;
let editTarget = null;
let exportData = [];
const board = new Chessboard($('board'), {
  position: FEN.start,
  assetsCache: false,
  style: {
    cssClass: 'legacy',
    pieces: { file: pieces },
    animationDuration: 120,
  },
  extensions: [{ class: Markers, props: { sprite: markerSprite } }],
});


function status(message, error = false, id = 'status') {
  $(id).textContent = message;
  $(id).classList.toggle('error', error);
}

function errorMessage(error) {
  return error instanceof TypeError || error instanceof SyntaxError
    ? 'Cannot reach CMP. Check your connection and try again.'
    : error.message;
}

function stop() {
  clearInterval(timer);
  timer = undefined;
  $('play').textContent = 'Play';
  $('play').setAttribute('aria-label', 'Play moves');
}

function moveButton(text, action) {
  const button = document.createElement('button');
  button.textContent = text;
  button.onclick = action;
  return button;
}

function exportText() {
  return exportData.map((result) => format === 'cmp' ? result.normalized : result.outputs[format])
    .join(format === 'pgn' ? '\n\n' : '\n');
}

function renderOutput() {
  $('output').textContent = exportText();
  $('output').setAttribute('aria-labelledby', `tab-${format}`);
  document.querySelectorAll('[data-format]').forEach((button) => {
    const selected = button.dataset.format === format;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  $('copy').disabled = $('download').disabled = !exportData.length;
  $('copy-status').textContent = '';
}

function renderMode() {
  const editing = mode === 'edit' || mode === 'import';
  $('show-collection').disabled = Boolean(mode);
  $('delete-sequence').hidden = mode !== 'edit' || !editTarget;
  if (mode === 'loading') {
    for (const id of ['first', 'previous', 'next', 'last', 'play']) $(id).disabled = true;
  }
  $('import').disabled = $('clear').disabled = Boolean(mode);
  collection.lock(Boolean(mode));
  $('panel-sequence').hidden = !editing;
  $('validation-actions').hidden = mode !== 'import';
  $('viewer-content').hidden = !data;
  $('viewer-title').textContent = mode === 'edit'
    ? `Editing · ${$('sequence-name').value || 'New sequence'}`
    : selectedEntry?.name || 'Select a sequence';
}

function renderPosition() {
  renderMode();
  renderOutput();
  if (!data) {
    board.disableMoveInput();
    board.setPosition(FEN.start);
    $('moves').replaceChildren();
    return;
  }
  const frame = data.frames[cursor];
  board.setPosition(frame.fen);
  board.removeMarkers();
  if (frame.move) {
    board.addMarker(MARKER_TYPE.frame, frame.move.slice(0, 2));
    board.addMarker(MARKER_TYPE.frame, frame.move.slice(2, 4));
  }
  $('position').textContent = `${cursor} / ${data.moves.length}`;
  $('turn').textContent = frame.result ? `Game ended: ${frame.result}`
    : `${frame.turn === 'w' ? 'White' : 'Black'} to move`;
  $('game').textContent = `Game ${frame.game}`;
  $('move-count').textContent = `${data.moves.length} moves`;
  $('first').disabled = $('previous').disabled = cursor === 0;
  $('next').disabled = $('last').disabled = cursor === data.moves.length;
  $('play').disabled = !data.moves.length || Boolean(mode);
  $('version').textContent = `cmp1 / cmp ${data.version}`;
  renderHistory();
  board.disableMoveInput();
  if (mode === 'edit' && draftData && !frame.result) board.enableMoveInput(input, frame.turn);
}

function renderHistory() {
  const history = document.createDocumentFragment();
  let game = 0;
  let ply = 0;
  let row;
  const multipleGames = data.frames.at(-1).game > 1;

  data.frames.slice(1).forEach((frame, index) => {
    if (frame.game !== game) {
      game = frame.game;
      ply = 0;
      if (multipleGames) {
        const heading = document.createElement('h3');
        heading.className = 'game-label';
        heading.textContent = `Game ${game}`;
        history.append(heading);
      }
    }
    if (ply % 2 === 0) {
      row = document.createElement('div');
      row.className = 'move-row';
      const number = document.createElement('span');
      number.className = 'move-number';
      number.textContent = `${Math.floor(ply / 2) + 1}.`;
      row.append(number);
      history.append(row);
    }
    const button = moveButton(frame.san, () => navigate(index + 1));
    button.setAttribute('aria-label', `Move ${index + 1}: ${frame.san}`);
    button.title = frame.move;
    if (cursor === index + 1) button.setAttribute('aria-current', 'step');
    row.append(button);
    ply++;
  });
  $('moves').replaceChildren(history);
}


function navigate(index) {
  if (!data) return;
  stop();
  selectedSquare = null;
  cursor = Math.max(0, Math.min(index, data.moves.length));
  renderPosition();
}

function sequenceText(text) {
  const trimmed = text.trim();
  return !trimmed || /^cmp1(?:\s|$)/i.test(trimmed) ? trimmed : `cmp1 ${trimmed}`;
}

async function openEntry(entry, action = 'view') {
  const id = ++request;
  stop();
  mode = 'loading';
  renderMode();
  status('Loading sequence…');
  try {
    const result = await run({ mnemonic: entry.sequence });
    if (id !== request) return;
    mode = null;
    if (action === 'export') {
      exportData = [result];
      $('export-title').textContent = `Export · ${entry.name}`;
      renderOutput();
      $('panel-export').showModal();
    } else {
      data = result;
      cursor = 0;
      selectedEntry = entry;
      collection.select(entry.id);
      if (action === 'edit') startDraft('edit');
      else { showCollection(false); $('viewer').scrollIntoView({ block: 'start' }); }
    }
    status(`✓ Valid sequence / ${result.moves.length} moves`);
  } catch (error) {
    if (id !== request) return;
    mode = null;
    status(errorMessage(error), true);
  }
  renderPosition();
}

function startDraft(nextMode, text = '') {
  ++request;
  stop();
  original = { data, cursor, entry: selectedEntry };
  mode = nextMode;
  editTarget = nextMode === 'edit' ? selectedEntry?.id : null;
  selectedSquare = null;
  draftData = nextMode === 'edit' ? data : null;
  $('sequence-name').value = nextMode === 'edit' ? selectedEntry.name : '';
  $('mnemonic').value = nextMode === 'edit' ? data.normalized : text;
  $('mnemonic').removeAttribute('aria-invalid');
  status('', false, 'draft-status');
  const parent = nextMode === 'edit' ? 'editor-home' : 'dialog-editor';
  $(parent).append($('panel-sequence'));
  $('apply').textContent = nextMode === 'import' ? 'Import' : 'Save';
  renderPosition();
  if (nextMode === 'edit') showCollection(false);
  if (nextMode === 'import') $('sequence-dialog').showModal();
  if (nextMode === 'new') {
    status('', false, 'new-status');
    $('new-dialog').showModal();
    $('start-blank').focus();
  } else $('mnemonic').focus();
}

function cancelDraft() {
  if (!mode || mode === 'loading') return;
  ++request;
  data = original.data;
  cursor = original.cursor;
  selectedEntry = original.entry;
  mode = null;
  draftData = null;
  selectedSquare = null;
  $('sequence-dialog').close();
  $('new-dialog').close();
  renderPosition();
  status(selectedEntry ? `Viewing ${selectedEntry.name}.` : 'Select a sequence or create a new one.');
  if (!data) showCollection(true);
  $('show-collection').focus();
}

async function createDraft(generate) {
  const id = ++request;
  status(generate ? 'Generating…' : 'Starting…', false, 'new-status');
  try {
    const result = await run(generate ? { moves: Number($('random-count').value) } : { mnemonic: '' });
    if (id !== request || mode !== 'new') return;
    mode = 'edit';
    showCollection(false);
    data = draftData = result;
    cursor = 0;
    editTarget = null;
    $('mnemonic').value = result.normalized;
    $('sequence-name').value = '';
    $('apply').textContent = 'Save';
    $('editor-home').append($('panel-sequence'));
    $('new-dialog').close();
    renderPosition();
    status('New draft. Save to add it to the collection.');
    $('viewer').scrollIntoView({ block: 'start' });
    $('sequence-name').focus();
  } catch (error) {
    if (id === request) status(errorMessage(error), true, 'new-status');
  }
}

async function validateDraft({ normalize = false, apply = false } = {}) {
  if (!mode) return;
  const id = ++request;
  const currentMode = mode;
  status('Checking…', false, 'draft-status');
  $('mnemonic').removeAttribute('aria-invalid');
  try {
    const payload = { mnemonic: sequenceText($('mnemonic').value) };
    const result = await run(payload);
    if (id !== request || mode !== currentMode) return;
    draftData = result;
    if (normalize) $('mnemonic').value = result.normalized;
    status(`✓ ${result.moves.length} moves`, false, 'draft-status');
    if (mode === 'edit') {
      data = result;
      cursor = data.moves.length;
      renderPosition();
    }
    if (apply) {
      selectedEntry = collection.save(editTarget, $('sequence-name').value, result.normalized);
      data = result;
      cursor = mode === 'edit' ? data.moves.length : 0;
      mode = null;
      selectedSquare = null;
      $('sequence-dialog').close();
      collection.select(selectedEntry.id);
      showCollection(false);
      renderPosition();
      status(`Saved ${selectedEntry.name}.`);
      $('board').focus();
    }
  } catch (error) {
    if (id !== request || mode !== currentMode) return;
    draftData = null;
    $('mnemonic').setAttribute('aria-invalid', 'true');
    status(errorMessage(error), true, 'draft-status');
    board.disableMoveInput();
    const match = error.message.match(/(?:illegal )?move (\d+)/i);
    if (match) {
      const tokens = [...$('mnemonic').value.matchAll(/\S+/g)];
      const prefix = /^cmp1$/i.test(tokens[0]?.[0] || '') ? 1 : 0;
      const token = tokens[Number(match[1]) - 1 + prefix];
      if (token) {
        $('mnemonic').focus();
        $('mnemonic').setSelectionRange(token.index, token.index + token[0].length);
      }
    }
  }
}

function append(move) {
  if (!draftData || mode !== 'edit') return;
  $('mnemonic').value = `cmp1 ${[...data.moves.slice(0, cursor), move].join(' ')}`;
  selectedSquare = null;
  validateDraft();
}

function input(event) {
  if (event.type === INPUT_EVENT_TYPE.moveInputCanceled) {
    selectedSquare = null;
    board.removeMarkers();
    return;
  }
  if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
    selectedSquare = event.squareFrom;
    for (const move of data.frames[cursor].legal.filter((move) => move.startsWith(selectedSquare))) {
      board.addMarker(MARKER_TYPE.frame, move.slice(2, 4));
    }
    return mode === 'edit' && Boolean(draftData);
  }
  if (event.type !== INPUT_EVENT_TYPE.validateMoveInput) return;
  const prefix = event.squareFrom + event.squareTo;
  const choices = data.frames[cursor].legal.filter((move) => move.startsWith(prefix));
  if (!choices.length) return false;
  if (choices.length === 1) setTimeout(() => append(choices[0]), 0);
  else {
    const id = request;
    $('promotion').returnValue = '';
    $('promotion').showModal();
    $('promotion').addEventListener('close', () => {
      const move = prefix + $('promotion').returnValue;
      if (id === request && choices.includes(move)) append(move);
    }, { once: true });
  }
  return false;
}

function showCollection(visible) {
  $('collection').hidden = !visible;
  $('show-collection').setAttribute('aria-expanded', String(visible));
  $('workbench').classList.toggle('collection-open', visible);
}

async function exportEntries(entries) {
  const id = ++request;
  mode = 'loading';
  stop();
  renderMode();
  try {
    const results = await Promise.all(entries.map((entry) => run({ mnemonic: entry.sequence })));
    if (id !== request) return;
    exportData = results;
    $('export-title').textContent = entries.length === 1 ? `Export · ${entries[0].name}` : `Export · ${entries.length} sequences`;
    renderOutput();
    $('panel-export').showModal();
  } catch (error) {
    if (id === request) status(errorMessage(error), true);
  } finally {
    if (id === request) { mode = null; renderPosition(); }
  }
}

const collection = bindCollection({
  open: (entry) => openEntry(entry),
  edit: (entry) => openEntry(entry, 'edit'),
  export: exportEntries,
  delete: (entry) => {
    ++request;
    if (selectedEntry?.id === entry.id) {
      stop();
      selectedEntry = null;
      data = null;
      collection.select(null);
      renderPosition();
      showCollection(true);
      status('Sequence deleted. Choose another or undo deletion.');
    }
  },
  example: (name, sequence) => {
    startDraft('import', sequence);
    $('sequence-name').value = name;
    validateDraft();
  },
}, examples);

$('show-collection').onclick = () => showCollection($('collection').hidden);
$('delete-sequence').onclick = () => {
  const id = editTarget;
  cancelDraft();
  collection.remove(id);
};
$('import').onclick = () => startDraft('import');
$('clear').onclick = () => startDraft('new');
$('cancel').onclick = $('cancel-new').onclick = cancelDraft;
for (const id of ['sequence-dialog', 'new-dialog']) {
  $(id).addEventListener('cancel', (event) => { event.preventDefault(); cancelDraft(); });
}
$('apply').onclick = () => validateDraft({ apply: true });
$('check').onclick = () => validateDraft();
$('normalize').onclick = () => validateDraft({ normalize: true });
$('generator').onsubmit = (event) => { event.preventDefault(); createDraft(true); };
$('start-blank').onclick = () => createDraft(false);
$('sequence-name').oninput = () => renderMode();
document.addEventListener('edit-sequence', () => {
  if (!mode && selectedEntry) startDraft('edit');
});
$('mnemonic').oninput = () => {
  ++request;
  draftData = null;
  $('mnemonic').removeAttribute('aria-invalid');
  status('Unapplied changes.', false, 'draft-status');
  board.disableMoveInput();
};
$('import-file').onchange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const id = ++request;
  try {
    if (file.size > 16384) throw new Error('Import a text sequence under 16 KB.');
    const text = await file.text();
    if (id !== request || mode !== 'import') return;
    if (text.length > 4096) throw new Error('Use at most 4096 characters.');
    $('mnemonic').value = text;
    validateDraft();
  } catch (error) {
    if (id === request) status(errorMessage(error), true, 'draft-status');
  } finally { event.target.value = ''; }
};
$('flip').onclick = () => board.setOrientation(board.getOrientation() === 'w' ? 'b' : 'w');
$('first').onclick = () => navigate(0);
$('previous').onclick = () => navigate(cursor - 1);
$('next').onclick = () => navigate(cursor + 1);
$('last').onclick = () => navigate(data.moves.length);
$('play').onclick = () => {
  if (timer) { stop(); renderPosition(); return; }
  if (cursor === data.moves.length) cursor = 0;
  timer = setInterval(() => {
    cursor++;
    if (cursor >= data.moves.length) stop();
    renderPosition();
  }, Number($('speed').value));
  $('play').textContent = 'Pause';
  $('play').setAttribute('aria-label', 'Pause moves');
};
$('speed').onchange = () => { if (timer) { stop(); $('play').click(); } };

const formats = ['cmp', 'uci', 'san', 'pgn'];
document.querySelectorAll('[data-format]').forEach((button) => {
  button.onclick = () => { format = button.dataset.format; renderOutput(); };
  button.onkeydown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let index = formats.indexOf(format);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = formats.length - 1;
    else index = (index + (event.key === 'ArrowRight' ? 1 : -1) + formats.length) % formats.length;
    $(`tab-${formats[index]}`).click();
    $(`tab-${formats[index]}`).focus();
  };
});
$('copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText(exportText());
    $('copy-status').textContent = 'Copied.';
  } catch { $('copy-status').textContent = 'Select the output to copy.'; }
};
$('download').onclick = () => {
  const url = URL.createObjectURL(new Blob([exportText() + '\n'], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  const name = exportData.length > 1 ? 'sequences' : 'sequence';
  link.download = `${name}.${format === 'cmp' || format === 'pgn' ? format : `${format}.txt`}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('privacy').textContent = browserMode ? 'Runs in your browser. Collection saved locally.'
  : 'Processed by your server. Collection saved locally.';
async function initialize() {
  mode = 'loading';
  renderMode();
  status('Loading CMP…');
  try {
    const result = await run({ mnemonic: '' });
    $('version').textContent = `cmp1 / cmp ${result.version}`;
    $('retry').hidden = true;
    mode = null;
    renderPosition();
    if (!mode && !selectedEntry) status('Select a sequence or create a new one.');
  } catch (error) {
    status(errorMessage(error), true);
    $('retry').hidden = false;
    mode = null;
    renderPosition();
  }
}
$('retry').onclick = initialize;
bindShortcuts();
showCollection(!collection.first());
renderPosition();
initialize().then(() => {
  if (!mode && !selectedEntry && collection.first()) openEntry(collection.first());
});
