export class UiEditorUsageManager {
  constructor({ panel }) {
    this.panel = panel;
    this.refs = null;
  }

  mount() {
    if (this.refs) {
      return this.refs;
    }

    const header = this.panel.querySelector('.ui-editor-panel__header');
    const body = this.panel.querySelector('.ui-editor-panel__body');
    const root = document.createElement('section');
    const emptyState = document.createElement('p');
    const summary = document.createElement('div');
    const title = document.createElement('h2');
    const count = document.createElement('span');
    const list = document.createElement('ul');

    header.textContent = 'Usages';
    root.className = 'ui-editor-usages';
    root.dataset.empty = 'true';
    emptyState.className = 'ui-editor-usages__empty';
    emptyState.textContent = 'Select a widget to view its usages.';
    summary.className = 'ui-editor-usages__summary';
    summary.hidden = true;
    title.className = 'ui-editor-usages__title';
    count.className = 'ui-editor-usages__count';
    list.className = 'ui-editor-usages__list';
    summary.append(title, count);
    root.append(summary, emptyState, list);
    body.replaceChildren(root);

    this.refs = {
      body,
      count,
      emptyState,
      header,
      list,
      root,
      summary,
      title,
    };
    return this.refs;
  }

  showEntry(entry) {
    if (!this.refs || entry?.kind !== 'widget') {
      this.clear();
      return false;
    }

    const usages = normalizeUsages(entry.usages);
    this.refs.root.dataset.empty = String(usages.length === 0);
    this.refs.emptyState.hidden = usages.length > 0;
    this.refs.emptyState.textContent = usages.length
      ? ''
      : 'No usages registered for this widget.';
    this.refs.summary.hidden = false;
    this.refs.title.textContent = entry.label;
    this.refs.count.textContent = `${usages.length} ${
      usages.length === 1 ? 'usage' : 'usages'
    }`;
    this.refs.list.setAttribute('aria-label', `${entry.label} usages`);
    this.refs.list.replaceChildren(...usages.map(createUsageItem));
    return true;
  }

  clear() {
    if (!this.refs) {
      return;
    }

    this.refs.root.dataset.empty = 'true';
    this.refs.emptyState.hidden = false;
    this.refs.emptyState.textContent = 'Select a widget to view its usages.';
    this.refs.summary.hidden = true;
    this.refs.title.textContent = '';
    this.refs.count.textContent = '';
    this.refs.list.removeAttribute('aria-label');
    this.refs.list.replaceChildren();
  }

  unmount() {
    if (!this.refs) {
      return;
    }

    this.refs.header.textContent = 'Right panel';
    this.refs.body.replaceChildren();
    this.refs = null;
  }
}

function normalizeUsages(usages) {
  if (!Array.isArray(usages)) {
    return [];
  }

  return usages
    .map((usage) =>
      typeof usage === 'string'
        ? { label: usage, source: '' }
        : {
            label: String(usage?.label ?? ''),
            source: String(usage?.source ?? ''),
          },
    )
    .filter(({ label }) => label);
}

function createUsageItem({ label, source }) {
  const item = document.createElement('li');
  const name = document.createElement('span');

  item.className = 'ui-editor-usages__item';
  name.className = 'ui-editor-usages__label';
  name.textContent = label;
  item.append(name);

  if (source) {
    const location = document.createElement('code');
    location.className = 'ui-editor-usages__source';
    location.textContent = source;
    location.title = source;
    item.append(location);
  }

  return item;
}
