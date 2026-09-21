const paths = {
  first: 'M6 5v14M18 5l-9 7 9 7Z',
  previous: 'm15 5-8 7 8 7',
  play: 'm8 5 11 7-11 7Z',
  pause: 'M8 5v14M16 5v14',
  next: 'm9 5 8 7-8 7',
  last: 'M18 5v14M6 5l9 7-9 7Z',
  flip: 'M4 8h15l-4-4M20 16H5l4 4',
  edit: 'm4 16-1 5 5-1L20 8l-4-4ZM13 7l4 4',
  close: 'm6 6 12 12M6 18 18 6',
  keys: 'M3 6h18v12H3ZM7 10h1m3 0h1m3 0h1M7 14h10',
};

export function buttonIcon(button, label, icon, always = false) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('action-icon');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', paths[icon]);
  svg.append(path);
  const text = document.createElement('span');
  text.className = 'action-label';
  text.textContent = label;
  button.replaceChildren(svg, text);
  button.classList.add(always ? 'icon-button' : 'phone-icon-button');
  if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', label);
  if (!button.title) button.title = label;
}
