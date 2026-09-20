import { Chessboard, FEN, INPUT_EVENT_TYPE } from 'cm-chessboard/src/Chessboard.js';
import { Markers, MARKER_TYPE } from 'cm-chessboard/src/extensions/markers/Markers.js';
import pieces from 'cm-chessboard/assets/pieces/standard.svg?url';
import markerSprite from 'cm-chessboard/assets/extensions/markers/markers.svg?url&no-inline';
import './style.css';

const $ = (id) => document.getElementById(id);
const examples = {
  opening: 'cmp1 e2e4 e7e5 g1f3 b8c6 f1b5',
  castling: 'cmp1 e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1',
  'en-passant': 'cmp1 e2e4 a7a6 e4e5 d7d5 e5d6',
  promotion: 'cmp1 a2a4 h7h5 a4a5 h5h4 a5a6 h4h3 a6b7 h3g2 b7a8q',
  restart: 'cmp1 f2f3 e7e5 g2g4 d8h4 e2e4',
  invalid: 'cmp1 e2e5',
};
let data;
let cursor = 0;
let format = 'san';
let timer;
let request = 0;
let ready = false;
const board = new Chessboard($('board'), {
  position: FEN.start,
  assetsCache: false,
  style: { cssClass: 'legacy', pieces: { file: pieces }, animationDuration: 120 },
  extensions: [{ class: Markers, props: { sprite: markerSprite } }],
});

function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}

function stop() {
  clearInterval(timer);
  timer = undefined;
  $('play').textContent = 'Play';
  $('play').setAttribute('aria-label', 'Play moves');
}

function invalidate() {
  request++;
  ready = false;
  stop();
  board.disableMoveInput();
  for (const id of ['normalize', 'copy', 'download', 'first', 'previous', 'next', 'last', 'play', 'scrubber']) $(id).disabled = true;
  $('moves').replaceChildren();
  $('legal').replaceChildren();
  $('legal-count').textContent = '';
  $('output').textContent = '';
  $('copy-status').textContent = '';
  $('move-count').textContent = 'Unchecked';
  $('position').textContent = '—';
  $('turn').textContent = 'Check sequence to update';
  $('game').textContent = '';
  board.removeMarkers();
  board.setPosition(FEN.start);
}

function renderOutput() {
  $('output').textContent = ready ? data.outputs[format] : '';
  $('output').setAttribute('aria-labelledby', `tab-${format}`);
  document.querySelectorAll('[data-format]').forEach((button) => {
    const selected = button.dataset.format === format;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  $('copy-status').textContent = '';
}

function moveButton(text, action) {
  const button = document.createElement('button');
  button.textContent = text;
  button.onclick = action;
  return button;
}

function renderPosition() {
  if (!ready) return;
  const frame = data.frames[cursor];
  board.setPosition(frame.fen);
  board.removeMarkers();
  if (frame.move) {
    board.addMarker(MARKER_TYPE.frame, frame.move.slice(0, 2));
    board.addMarker(MARKER_TYPE.frame, frame.move.slice(2, 4));
  }
  $('position').textContent = `${cursor} / ${data.moves.length}`;
  $('scrubber').max = data.moves.length;
  $('scrubber').value = cursor;
  $('scrubber').disabled = !data.moves.length;
  $('turn').textContent = frame.result ? `Game ended: ${frame.result}` : `${frame.turn === 'w' ? 'White' : 'Black'} to move`;
  $('game').textContent = `Game ${frame.game}`;
  $('first').disabled = $('previous').disabled = cursor === 0;
  $('next').disabled = $('last').disabled = cursor === data.moves.length;
  $('play').disabled = !data.moves.length;
  $('moves').replaceChildren(...data.frames.slice(1).map((item, i) => {
    const button = moveButton(`${i + 1}. ${item.san}`, () => navigate(i + 1));
    button.setAttribute('aria-label', `Move ${i + 1}: ${item.san}`);
    if (cursor === i + 1) button.setAttribute('aria-current', 'step');
    return button;
  }));
  const legal = frame.result ? data.frames[0].legal : frame.legal;
  $('legal-count').textContent = `(${legal.length}${frame.result ? ', new game' : ''})`;
  $('legal').replaceChildren(...legal.map((move) => moveButton(move, () => append(move))));
  board.disableMoveInput();
  if (!frame.result && !timer) board.enableMoveInput(input, frame.turn);
}

function navigate(index) {
  stop();
  cursor = index;
  renderPosition();
}

async function inspect(text = $('mnemonic').value, atEnd = true) {
  invalidate();
  const id = request;
  status('Checking…');
  $('mnemonic').removeAttribute('aria-invalid');
  try {
    const response = await fetch('/api/inspect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mnemonic: text }),
    });
    const result = await response.json();
    if (id !== request) return;
    if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Invalid input. Use at most 256 moves and 4096 characters.');
    data = result;
    ready = true;
    cursor = atEnd ? data.moves.length : 0;
    $('version').textContent = `cmp1 / cmp ${data.version}`;
    $('move-count').textContent = `${data.moves.length} moves`;
    for (const name of ['normalize', 'copy', 'download']) $(name).disabled = !data.valid;
    status(data.valid ? `✓ Valid sequence / ${data.moves.length} legal moves` : 'Empty board. Add a legal move to begin.');
    renderOutput();
    renderPosition();
  } catch (error) {
    if (id !== request) return;
    $('mnemonic').setAttribute('aria-invalid', 'true');
    status(error instanceof TypeError || error instanceof SyntaxError ? 'Cannot reach CMP. Start the Python server, then try Check sequence.' : error.message, true);
  }
}

function append(move) {
  if (!ready) return;
  stop();
  $('mnemonic').value = `cmp1 ${[...data.moves.slice(0, cursor), move].join(' ')}`;
  inspect();
}

function input(event) {
  if (event.type === INPUT_EVENT_TYPE.moveInputStarted) return ready;
  if (event.type !== INPUT_EVENT_TYPE.validateMoveInput) return;
  const prefix = event.squareFrom + event.squareTo;
  const choices = data.frames[cursor].legal.filter((move) => move.startsWith(prefix));
  if (!choices.length) return false;
  // Let the server apply the whole position, including castling and captures.
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

$('check').onclick = () => inspect();
$('mnemonic').addEventListener('input', () => { invalidate(); status('Edited. Check sequence to update.'); $('mnemonic').removeAttribute('aria-invalid'); });
$('mnemonic').addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') inspect(); });
$('normalize').onclick = () => { $('mnemonic').value = data.normalized; status('✓ Normalized / lowercase, single spaces'); };
$('clear').onclick = () => { $('mnemonic').value = ''; inspect(); };
$('load').onclick = () => { $('mnemonic').value = examples[$('example').value]; inspect(); };
$('flip').onclick = () => board.setOrientation(board.getOrientation() === 'w' ? 'b' : 'w');
$('first').onclick = () => navigate(0);
$('previous').onclick = () => navigate(cursor - 1);
$('next').onclick = () => navigate(cursor + 1);
$('last').onclick = () => navigate(data.moves.length);
$('scrubber').oninput = () => navigate(Number($('scrubber').value));
$('play').onclick = () => {
  if (timer) { stop(); renderPosition(); return; }
  if (cursor === data.moves.length) cursor = 0;
  timer = setInterval(() => {
    cursor++;
    if (cursor >= data.moves.length) stop();
    renderPosition();
  }, 800);
  $('play').textContent = 'Pause';
  $('play').setAttribute('aria-label', 'Pause moves');
  renderPosition();
};
document.querySelectorAll('[data-format]').forEach((button) => {
  button.onclick = () => { format = button.dataset.format; renderOutput(); };
  button.onkeydown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const formats = ['uci', 'san', 'pgn'];
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (formats.indexOf(format) + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
    $(`tab-${formats[index]}`).click();
    $(`tab-${formats[index]}`).focus();
  };
});
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(data.outputs[format]); $('copy-status').textContent = 'Copied.'; }
  catch { $('copy-status').textContent = 'Copy unavailable. Select the output to copy.'; }
};
$('download').onclick = () => {
  const url = URL.createObjectURL(new Blob([data.outputs[format] + '\n'], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `cmp.${format === 'pgn' ? 'pgn' : `${format}.txt`}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
inspect(undefined, false);
