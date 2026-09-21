export function bindWorkspace() {
  const mobile = window.matchMedia('(max-width: 780px)');
  const tabs = document.getElementById('mobile-tabs');
  const buttons = [...tabs.querySelectorAll('[data-view]')];
  const panels = [...document.querySelectorAll('[data-panel]')];
  let selected = 'moves';

  function render() {
    tabs.hidden = !mobile.matches;
    for (const button of buttons) {
      const active = button.dataset.view === selected;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    }
    for (const panel of panels) {
      panel.hidden = mobile.matches && panel.dataset.panel !== selected;
      if (mobile.matches) {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', `view-${panel.dataset.panel}`);
      } else {
        panel.removeAttribute('role');
        if (panel.id === 'panel-moves') {
          panel.setAttribute('aria-labelledby', 'history-title');
        } else {
          panel.removeAttribute('aria-labelledby');
        }
      }
    }
  }

  function show(view) {
    selected = view;
    render();
    if (mobile.matches) {
      const top = document.getElementById('workbench').offsetTop;
      window.scrollTo({ top, behavior: 'instant' });
    }
  }

  for (const [index, button] of buttons.entries()) {
    button.onclick = () => show(button.dataset.view);
    button.onkeydown = (event) => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
      else if (event.key === 'ArrowLeft')
        next = (index + buttons.length - 1) % buttons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else return;
      event.preventDefault();
      buttons[next].click();
      buttons[next].focus({ preventScroll: true });
    };
  }

  document.addEventListener('show-sequence', () => show('sequence'));
  document
    .querySelector('.skip')
    .addEventListener('click', () => show('sequence'));
  mobile.addEventListener('change', () => {
    const activePanel = document.activeElement.closest('[data-panel]');
    if (activePanel) selected = activePanel.dataset.panel;
    render();
  });
  render();
}
