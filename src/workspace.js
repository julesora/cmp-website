export function bindWorkspace() {
  const workspace = document.getElementById('workbench');
  const board = workspace.querySelector('.board-column');
  const tabs = document.getElementById('workspace-tabs');
  const buttons = [...tabs.querySelectorAll('[data-view]')];
  const panels = [...workspace.querySelectorAll('[data-panel]')];

  function show(view, scroll = true) {
    for (const button of buttons) {
      const selected = button.dataset.view === view;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    for (const panel of panels) {
      panel.hidden = panel.dataset.panel !== view;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `view-${panel.dataset.panel}`);
    }
    if (scroll && window.scrollY > workspace.offsetTop) {
      window.scrollTo({ top: workspace.offsetTop, behavior: 'instant' });
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

  const resize = new ResizeObserver(() => {
    workspace.style.setProperty('--board-height', `${board.offsetHeight}px`);
  });
  resize.observe(board);
  document.addEventListener('show-sequence', () => show('sequence'));
  document
    .querySelector('.skip')
    .addEventListener('click', () => show('sequence'));
  show('moves', false);
}
