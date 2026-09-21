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
let saveOnApply = true;
const undo = [];
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
  if (!data) return '';
  return format === 'cmp' ? data.normalized : data.outputs[format];
}

function renderOutput() {
  $('output').textContent = exportText();
  $('output').setAttribute('aria-labelledby', `tab-${format}`);
  document.querySelectorAll('[data-format]').forEach((button) => {
    const selected = button.dataset.format === format;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  $('copy').disabled = $('download').disabled = !data?.valid;
  $('copy-status').textContent = '';
}

function renderMode() {
  for (const id of ['import', 'clear', 'export', 'list', 'edit']) {
    $(id).disabled = Boolean(mode) || (!data && !['import', 'clear'].includes(id));
  }
  $('undo').disabled = Boolean(mode) || !undo.length;
  $('panel-sequence').hidden = !mode;
  $('panel-legal').hidden = !['new', 'edit'].includes(mode);
  $('validation-actions').hidden = mode === 'edit';
  $('generator').hidden = mode !== 'new';
  $('file-row').hidden = mode !== 'import';
  $('save-sequence').disabled = !data?.valid;
}

function renderLegal() {
  const source = mode === 'new' ? draftData : data;
  const frame = mode === 'new' ? source?.frames.at(-1) : source?.frames[cursor];
  let legal = frame ? (frame.result ? source.frames[0].legal : frame.legal) : [];
  if (selectedSquare) legal = legal.filter((move) => move.startsWith(selectedSquare));
  $('legal-count').textContent = `(${legal.length})`;
  $('legal').replaceChildren(...legal.map((move) => {
    const button = moveButton(move, () => append(move));
    button.title = 'Add here and replace the continuation';
    button.disabled = !draftData;
    return button;
  }));
}

function renderPosition() {
  renderMode();
  renderOutput();
  if (!data) return;
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
  renderLegal();
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

function remember(snapshot) {
  if (!snapshot?.data) return;
  undo.push(snapshot);
  if (undo.length > 50) undo.shift();
}

function commit(result, atEnd = false, snapshot = { data, cursor }) {
  remember(snapshot);
  data = result;
  cursor = atEnd ? data.moves.length : 0;
  status(data.valid ? `✓ Valid sequence / ${data.moves.length} moves` : 'Empty sequence.');
  renderPosition();
}

async function load(sequence) {
  const id = ++request;
  stop();
  status(browserMode && !data ? 'Loading CMP…' : 'Checking…');
  try {
    const result = await run({ mnemonic: sequenceText(sequence) });
    if (id !== request) return;
    commit(result);
    $('retry').hidden = true;
  } catch (error) {
    if (id !== request) return;
    status(errorMessage(error), true);
    $('retry').hidden = false;
    renderMode();
  }
}

function startDraft(nextMode, text, save = true) {
  saveOnApply = save;
  ++request;
  stop();
  original = { data, cursor };
  mode = nextMode;
  selectedSquare = null;
  draftData = nextMode === 'edit' ? data : null;
  $('mnemonic').value = text ?? (nextMode === 'edit' ? data.normalized : '');
  $('mnemonic').removeAttribute('aria-invalid');
  status('', false, 'draft-status');
  const parent = nextMode === 'edit' ? 'editor-home' : 'dialog-editor';
  $(parent).append($('panel-sequence'));
  $('apply').textContent = nextMode === 'new' ? 'Create' : nextMode === 'import' ? 'Import' : 'Apply';
  $('sequence-title').textContent = nextMode === 'new' ? 'New sequence' : 'Import sequence';
  renderPosition();
  if (nextMode !== 'edit') $('sequence-dialog').showModal();
  $('mnemonic').focus();
  if (nextMode === 'new') validateDraft();
  if (nextMode === 'edit') status('Editing. Apply to keep changes.', false);
}

function cancelDraft() {
  if (!mode) return;
  ++request;
  data = original.data;
  cursor = original.cursor;
  mode = null;
  draftData = null;
  selectedSquare = null;
  if ($('sequence-dialog').open) $('sequence-dialog').close();
  renderPosition();
  status(data?.valid ? `✓ Valid sequence / ${data.moves.length} moves` : 'Empty sequence.');
  $('edit').focus();
}

async function validateDraft({ normalize = false, generate = false, apply = false } = {}) {
  if (!mode) return;
  const id = ++request;
  const currentMode = mode;
  status(generate ? 'Generating…' : 'Checking…', false, 'draft-status');
  $('mnemonic').removeAttribute('aria-invalid');
  try {
    const payload = generate ? { moves: Number($('random-count').value) }
      : { mnemonic: sequenceText($('mnemonic').value) };
    const result = await run(payload);
    if (id !== request || mode !== currentMode) return;
    draftData = result;
    if (normalize || generate) $('mnemonic').value = result.normalized;
    status(`✓ ${result.moves.length} moves`, false, 'draft-status');
    if (mode === 'edit') {
      data = result;
      cursor = data.moves.length;
      renderPosition();
    }
    renderLegal();
    if (apply) {
      const savedMode = mode;
      const snapshot = original;
      mode = null;
      selectedSquare = null;
      $('sequence-dialog').close();
      commit(result, savedMode === 'edit', snapshot);
      if (saveOnApply && savedMode !== 'edit' && result.valid) saveSequence(result.normalized);
      $('board').focus();
    }
  } catch (error) {
    if (id !== request || mode !== currentMode) return;
    draftData = null;
    $('mnemonic').setAttribute('aria-invalid', 'true');
    status(errorMessage(error), true, 'draft-status');
    renderLegal();
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
  if (!draftData || !['new', 'edit'].includes(mode)) return;
  const source = mode === 'new' ? draftData : data;
  const index = mode === 'new' ? source.moves.length : cursor;
  $('mnemonic').value = `cmp1 ${[...source.moves.slice(0, index), move].join(' ')}`;
  selectedSquare = null;
  validateDraft();
}

function input(event) {
  if (event.type === INPUT_EVENT_TYPE.moveInputCanceled) {
    selectedSquare = null;
    renderLegal();
    board.removeMarkers();
    return;
  }
  if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
    selectedSquare = event.squareFrom;
    renderLegal();
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

function openDialog(id) {
  stop();
  renderPosition();
  $(id).showModal();
}

const saveSequence = bindCollection((sequence) => {
  $('sequence-list').close();
  startDraft('import', sequence, false);
  validateDraft({ apply: true });
}, () => data?.normalized, examples);

$('import').onclick = () => startDraft('import');
$('clear').onclick = () => startDraft('new');
$('edit').onclick = () => startDraft('edit');
$('cancel').onclick = cancelDraft;
$('sequence-dialog').addEventListener('cancel', (event) => { event.preventDefault(); cancelDraft(); });
$('sequence-dialog').addEventListener('close', () => { if (mode && mode !== 'edit') cancelDraft(); });
$('apply').onclick = () => validateDraft({ apply: true });
$('check').onclick = () => validateDraft();
$('normalize').onclick = () => validateDraft({ normalize: true });
$('generator').onsubmit = (event) => { event.preventDefault(); validateDraft({ generate: true }); };
$('mnemonic').oninput = () => {
  ++request;
  draftData = null;
  $('mnemonic').removeAttribute('aria-invalid');
  status('Unapplied changes.', false, 'draft-status');
  board.disableMoveInput();
  renderLegal();
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
$('undo').onclick = () => {
  const previous = undo.pop();
  if (!previous) return;
  ++request;
  stop();
  data = previous.data;
  cursor = previous.cursor;
  renderPosition();
  status('Undone.');
};
$('export').onclick = () => openDialog('panel-export');
$('list').onclick = () => openDialog('sequence-list');
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
  link.download = format === 'cmp' ? 'sequence.cmp' : `sequence.${format === 'pgn' ? 'pgn' : `${format}.txt`}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('privacy').textContent = browserMode ? 'Runs in your browser. Collection saved locally.'
  : 'Processed by your server. Collection saved locally.';
$('retry').onclick = () => load(examples['Ruy López']);
bindShortcuts();
renderMode();
load(examples['Ruy López']);
