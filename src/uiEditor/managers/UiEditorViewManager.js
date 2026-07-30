const PANEL_DEFINITIONS = [
  { dock: 'left', label: 'Left panel', tagName: 'aside' },
  { dock: 'right', label: 'Right panel', tagName: 'aside' },
  { dock: 'bottom', label: 'Bottom panel', tagName: 'section' },
];

export class UiEditorViewManager {
  constructor({ root }) {
    this.root = root;
    this.refs = null;
  }

  mount() {
    if (this.refs) {
      return this.refs;
    }

    const shell = document.createElement('div');
    shell.className = 'ui-editor-shell';

    const toolbar = document.createElement('header');
    toolbar.className = 'ui-editor-toolbar';
    toolbar.setAttribute('aria-label', 'Editor workspace');
    shell.append(toolbar);

    const panels = {};
    for (const definition of PANEL_DEFINITIONS) {
      const panel = createPanel(definition);
      panels[definition.dock] = panel;
      shell.append(panel);
    }

    const preview = document.createElement('section');
    preview.className = 'ui-editor-preview';
    preview.setAttribute('aria-label', 'Preview');
    shell.append(preview);

    const splitters = {
      left: createSplitter({
        dock: 'left',
        label: 'Resize left panel',
        orientation: 'vertical',
      }),
      right: createSplitter({
        dock: 'right',
        label: 'Resize right panel',
        orientation: 'vertical',
      }),
      bottom: createSplitter({
        dock: 'bottom',
        label: 'Resize bottom panel',
        orientation: 'horizontal',
      }),
    };

    shell.append(splitters.left, splitters.right, splitters.bottom);
    this.root.replaceChildren(shell);

    this.refs = {
      shell,
      toolbar,
      preview,
      panels,
      splitters,
    };

    return this.refs;
  }

  unmount() {
    this.root.replaceChildren();
    this.refs = null;
  }
}

function createPanel({ dock, label, tagName }) {
  const panel = document.createElement(tagName);
  panel.id = `ui-editor-${dock}-panel`;
  panel.className = `ui-editor-panel ui-editor-panel--${dock}`;
  panel.dataset.dock = dock;
  panel.setAttribute('aria-label', label);

  const header = document.createElement('header');
  header.className = 'ui-editor-panel__header';
  header.textContent = label;

  const body = document.createElement('div');
  body.className = 'ui-editor-panel__body';

  panel.append(header, body);
  return panel;
}

function createSplitter({ dock, label, orientation }) {
  const splitter = document.createElement('div');
  splitter.className = `ui-editor-splitter ui-editor-splitter--${dock}`;
  splitter.dataset.dock = dock;
  splitter.setAttribute('role', 'separator');
  splitter.setAttribute('aria-label', label);
  splitter.setAttribute('aria-controls', `ui-editor-${dock}-panel`);
  splitter.setAttribute('aria-orientation', orientation);
  splitter.setAttribute('aria-valuemin', '72');
  splitter.tabIndex = 0;
  return splitter;
}
