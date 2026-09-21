const $ = (id) => document.getElementById(id);

export function bindWorkspace() {
  const phone = matchMedia('(max-width: 780px)');
  const collection = $('collection');
  const actions = $('collection-actions');
  const dialog = $('switch-dialog');

  function layout() {
    dialog.close();
    if (phone.matches) {
      $('mobile-toolbar').append(actions);
      dialog.append(collection);
    } else {
      $('workbench').prepend(collection);
      collection.querySelector('.history-title').after(actions);
    }
  }

  $('switch').onclick = () => dialog.showModal();
  phone.addEventListener('change', layout);
  layout();
  return { close: () => dialog.close() };
}
