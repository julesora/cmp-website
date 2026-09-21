const key = 'cmp-sequences';
const $ = (id) => document.getElementById(id);
let entries = [];
try {
  const saved = JSON.parse(localStorage.getItem(key) || '[]');
  if (Array.isArray(saved)) entries = saved.filter((entry) =>
    typeof entry?.name === 'string' && typeof entry?.sequence === 'string' &&
    entry.name.length <= 120 && entry.sequence.length <= 4096)
    .map((entry) => ({ ...entry, id: entry.id || crypto.randomUUID() }));
} catch {
  // Keep working if browser storage is unavailable.
}

export function bindCollection(actions) {
  let selected;
  let locked = false;
  const checked = new Set();

  function persist() {
    try {
      localStorage.setItem(key, JSON.stringify(entries));
      $('collection-status').textContent = '';
    } catch {
      $('collection-status').textContent = 'Storage unavailable. Export to keep a copy.';
    }
    render();
  }

  function render() {
    $('list-empty').hidden = entries.length > 0;
    $('sequences').replaceChildren(...entries.map((entry) => {
      const row = document.createElement('article');
      row.className = 'collection-entry';
      row.dataset.id = entry.id;
      const open = document.createElement('button');
      open.className = 'sequence-open';
      open.textContent = entry.name;
      open.disabled = locked;
      if (entry.id === selected) open.setAttribute('aria-current', 'true');
      open.onclick = () => actions.open(entry);
      const heading = document.createElement('div');
      heading.className = 'entry-heading';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = checked.has(entry.id);
      checkbox.disabled = locked;
      checkbox.setAttribute('aria-label', `Export ${entry.name}`);
      checkbox.onchange = () => {
        if (checkbox.checked) checked.add(entry.id);
        else checked.delete(entry.id);
        renderExportLabel();
      };
      const edit = document.createElement('button');
      edit.textContent = 'Edit';
      edit.disabled = locked;
      edit.onclick = () => actions.edit(entry);
      heading.append(checkbox, open, edit);
      row.append(heading);
      return row;
    }));
    renderExportLabel();
  }

  function renderExportLabel() {
    $('export-collection').textContent = 'Export';
    $('export-collection').disabled = locked || !entries.length;
  }

  $('export-collection').onclick = () => {
    const selected = entries.filter((entry) => checked.has(entry.id));
    actions.export(selected.length ? selected : entries);
  };

  render();
  return {
    first() { return entries[0]; },
    remove(id) {
      const index = entries.findIndex((entry) => entry.id === id);
      if (index < 0) return;
      const [entry] = entries.splice(index, 1);
      checked.delete(id);
      actions.delete(entry);
      persist();
    },
    save(id, name, sequence) {
      let entry = entries.find((item) => item.id === id);
      if (!entry) {
        entry = { id: crypto.randomUUID() };
        entries.push(entry);
      }
      entry.name = name.trim() || `Sequence ${entries.length}`;
      entry.sequence = sequence;
      persist();
      return entry;
    },
    select(id) { selected = id; render(); },
    lock(value) { locked = value; render(); },
  };
}
