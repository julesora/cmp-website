const control = (id) => document.getElementById(id);

const navigation = {
  ArrowLeft: 'previous',
  ArrowRight: 'next',
  Home: 'first',
  End: 'last',
  ' ': 'play',
};

const labels = {
  apply: ['Control+Enter Meta+Enter', 'Apply sequence (Ctrl/⌘ + Enter)'],
  first: ['Home', 'First position (Home)'],
  previous: ['ArrowLeft', 'Previous move (←)'],
  play: ['Space', 'Play / pause (Space)'],
  next: ['ArrowRight', 'Next move (→)'],
  last: ['End', 'Last position (End)'],
};

export function bindShortcuts() {
  const dialog = control('shortcuts');
  control('show-shortcuts').onclick = () => dialog.showModal();

  for (const [id, [key, title]] of Object.entries(labels)) {
    control(id).setAttribute('aria-keyshortcuts', key);
    control(id).title = title;
  }

  function updateLetters() {
    const enabled = control('letter-shortcuts').checked;
    for (const [id, key, title] of [
      ['flip', 'F', 'Flip board'],
      ['mnemonic', '/', 'CMP sequence'],
      ['show-shortcuts', '?', 'Keyboard shortcuts'],
    ]) {
      control(id).title = enabled ? `${title} (${key})` : title;
      if (enabled) control(id).setAttribute('aria-keyshortcuts', key);
      else control(id).removeAttribute('aria-keyshortcuts');
    }
  }
  control('letter-shortcuts').onchange = updateLetters;
  updateLetters();

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.isComposing) return;
    const editing = !control('panel-sequence').hidden;
    const dialog = document.querySelector('dialog[open]');
    if (event.key === 'Escape' && editing && !dialog) {
      event.preventDefault();
      control('cancel').click();
      return;
    }
    if (dialog && dialog.id !== 'sequence-dialog') return;

    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      if (event.altKey || event.repeat) return;
      event.preventDefault();
      if (editing) control('apply').click();
      return;
    }
    if (dialog || event.ctrlKey || event.metaKey || event.altKey) return;
    if (
      event.target.closest(
        'input, textarea, select, button, a, summary, [contenteditable], [role="tab"]',
      )
    )
      return;

    let action = navigation[event.key];
    if (event.shiftKey && event.key !== '?') return;
    if (control('letter-shortcuts').checked) {
      if (event.key.toLowerCase() === 'f') action = 'flip';
      if (event.key === '?') action = 'show-shortcuts';
      if (event.key === '/') {
        event.preventDefault();
        if (!editing) document.dispatchEvent(new CustomEvent('edit-sequence'));
        else control('mnemonic').focus();
        return;
      }
    }
    if (!action || control(action).disabled) return;
    if (event.repeat && ['play', 'flip', 'show-shortcuts'].includes(action))
      return;
    event.preventDefault();
    control(action).click();
  });
}
