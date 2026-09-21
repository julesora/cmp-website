const control = (id) => document.getElementById(id);

const navigation = {
  ArrowLeft: 'previous',
  ArrowRight: 'next',
  Home: 'first',
  End: 'last',
  ' ': 'play',
};

const labels = {
  check: ['Control+Enter Meta+Enter', 'Check sequence (Ctrl/⌘ + Enter)'],
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
    if (document.querySelector('dialog[open]')) return;

    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      if (event.altKey || event.repeat) return;
      event.preventDefault();
      control('check').click();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
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
        control('mnemonic').focus();
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
