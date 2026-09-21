const key = 'cmp-sequences';
const $ = (id) => document.getElementById(id);
let entries = [];
try {
  const saved = JSON.parse(localStorage.getItem(key) || '[]');
  if (Array.isArray(saved)) entries = saved.filter((entry) =>
    typeof entry?.name === 'string' && typeof entry?.sequence === 'string' &&
    entry.name.length <= 120 && entry.sequence.length <= 4096);
} catch {
  // The collection still works when storage is unavailable.
}

export function bindCollection(open, current, examples) {
  function persist() {
    try {
      localStorage.setItem(key, JSON.stringify(entries));
      $('collection-status').textContent = 'Saved in this browser.';
    } catch {
      $('collection-status').textContent = 'Storage unavailable. Export to keep a copy.';
    }
    render();
  }

  function add(sequence) {
    entries.push({ name: `Sequence ${entries.length + 1}`, sequence });
    persist();
  }

  function render() {
    $('sequence-count').textContent = entries.length;
    $('list-empty').hidden = entries.length > 0;
    $('clear-collection').disabled = !entries.length;
    $('sequences').replaceChildren(...entries.map((entry, index) => {
      const row = document.createElement('div');
      row.className = 'collection-entry';
      const name = document.createElement('input');
      name.value = entry.name;
      name.maxLength = 120;
      name.setAttribute('aria-label', `Name of sequence ${index + 1}`);
      name.onchange = () => {
        entry.name = name.value.trim() || `Sequence ${index + 1}`;
        persist();
      };
      const preview = document.createElement('p');
      const moves = entry.sequence.split(/\s+/).slice(1);
      preview.textContent = `${moves.length} moves · ${moves.slice(0, 6).join(' ')}${moves.length > 6 ? ' …' : ''}`;
      const actions = document.createElement('div');
      actions.className = 'actions';
      for (const [label, action] of [
        ['Open', () => open(entry.sequence)],
        ['Duplicate', () => add(entry.sequence)],
        ['Remove', () => { entries.splice(index, 1); persist(); }],
      ]) {
        const button = document.createElement('button');
        button.textContent = label;
        button.onclick = action;
        actions.append(button);
      }
      row.append(name, preview, actions);
      return row;
    }));
  }

  $('save-sequence').onclick = () => {
    const sequence = current();
    if (sequence) add(sequence);
  };
  $('clear-collection').onclick = () => { entries = []; persist(); };
  for (const [name, sequence] of Object.entries(examples)) {
    const button = document.createElement('button');
    button.textContent = name;
    button.onclick = () => open(sequence);
    $('examples').append(button);
  }
  render();
  return add;
}
