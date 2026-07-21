const NUMBER_FIELDS = [
  ['offsetX', 'offset x'],
  ['offsetY', 'offset y'],
  ['width', 'width'],
  ['height', 'height'],
  ['opacity', 'opacity'],
];

export class UiEditorViewManager {
  constructor({
    onSelect = () => {},
    onSearch = () => {},
    onPatch = () => {},
    onReset = () => {},
    onSave = () => {},
    onRefresh = () => {},
    onModeChange = () => {},
    onOutlinePointerDown = () => {},
  } = {}) {
    this.onSelect = onSelect;
    this.onSearch = onSearch;
    this.onPatch = onPatch;
    this.onReset = onReset;
    this.onSave = onSave;
    this.onRefresh = onRefresh;
    this.onModeChange = onModeChange;
    this.onOutlinePointerDown = onOutlinePointerDown;
    this.root = null;
    this.refs = {};
    this.selected = null;
    this.override = {};
    this.mode = 'select';
    this.prefabOpen = false;
  }

  mount(parent = document.body) {
    if (this.root) {
      return this.root;
    }

    document.documentElement.dataset.uiEditor = 'true';
    this.root = document.createElement('div');
    this.root.className = 'idle-ui-editor';
    this.root.setAttribute('aria-label', 'Idle Wizard UI editor');
    this.root.append(
      this.createHierarchyPanel(),
      this.createInspectorPanel(),
      this.createOutline(),
      this.createPrefabWorkbench(),
    );
    parent.append(this.root);
    this.setMode(this.mode);
    this.setSelection(null, {});
    return this.root;
  }

  unmount() {
    this.root?.remove();
    delete document.documentElement.dataset.uiEditor;
    this.root = null;
    this.refs = {};
    this.selected = null;
  }

  createHierarchyPanel() {
    const panel = this.createPanel('idle-ui-editor__hierarchy', 'ui hierarchy');
    const tools = document.createElement('div');
    tools.className = 'idle-ui-editor__toolbar';

    this.refs.selectModeButton = this.createButton('select', () => this.setMode('select'));
    this.refs.interactModeButton = this.createButton('interact', () => this.setMode('interact'));
    const refreshButton = this.createButton('refresh', () => this.onRefresh());
    tools.append(this.refs.selectModeButton, this.refs.interactModeButton, refreshButton);

    this.refs.searchInput = document.createElement('input');
    this.refs.searchInput.className = 'idle-ui-editor__search';
    this.refs.searchInput.type = 'search';
    this.refs.searchInput.placeholder = 'filter elements';
    this.refs.searchInput.setAttribute('aria-label', 'Filter UI hierarchy');
    this.refs.searchInput.addEventListener('input', () => {
      this.onSearch(this.refs.searchInput.value);
    });

    this.refs.hierarchy = document.createElement('div');
    this.refs.hierarchy.className = 'idle-ui-editor__tree';
    this.refs.hierarchy.setAttribute('role', 'tree');
    panel.append(tools, this.refs.searchInput, this.refs.hierarchy);
    return panel;
  }

  createInspectorPanel() {
    const panel = this.createPanel('idle-ui-editor__inspector', 'inspector');
    this.refs.selectionTitle = document.createElement('strong');
    this.refs.selectionTitle.className = 'idle-ui-editor__selection-title';

    this.refs.selectionPath = document.createElement('code');
    this.refs.selectionPath.className = 'idle-ui-editor__selector';

    const actionRow = document.createElement('div');
    actionRow.className = 'idle-ui-editor__toolbar';
    this.refs.saveButton = this.createButton('save changes', () => this.onSave());
    this.refs.resetButton = this.createButton('reset element', () => this.onReset());
    this.refs.prefabButton = this.createButton('open prefab', () => {
      this.setPrefabOpen(!this.prefabOpen);
    });
    actionRow.append(this.refs.saveButton, this.refs.resetButton, this.refs.prefabButton);

    this.refs.status = document.createElement('p');
    this.refs.status.className = 'idle-ui-editor__status';
    this.refs.status.setAttribute('role', 'status');
    this.refs.status.setAttribute('aria-live', 'polite');

    const identitySection = this.createSection('component');
    this.refs.componentDetails = document.createElement('dl');
    this.refs.componentDetails.className = 'idle-ui-editor__details';
    identitySection.append(this.refs.componentDetails);

    const positionSection = this.createSection('layout');
    this.refs.livePosition = document.createElement('p');
    this.refs.livePosition.className = 'idle-ui-editor__metrics';
    positionSection.append(this.refs.livePosition, this.createFieldGrid());

    const assetSection = this.createSection('asset');
    const assetLabel = document.createElement('label');
    assetLabel.className = 'idle-ui-editor__field idle-ui-editor__field--wide';
    assetLabel.textContent = 'asset path';
    this.refs.assetInput = document.createElement('input');
    this.refs.assetInput.type = 'text';
    this.refs.assetInput.addEventListener('input', () => {
      this.onPatch({ asset: this.refs.assetInput.value.trim() });
    });
    assetLabel.append(this.refs.assetInput);
    assetSection.append(assetLabel);

    panel.append(
      this.refs.selectionTitle,
      this.refs.selectionPath,
      actionRow,
      this.refs.status,
      identitySection,
      positionSection,
      assetSection,
    );
    return panel;
  }

  createFieldGrid() {
    const grid = document.createElement('div');
    grid.className = 'idle-ui-editor__field-grid';
    this.refs.fields = {};

    for (const [name, label] of NUMBER_FIELDS) {
      const fieldLabel = document.createElement('label');
      fieldLabel.className = 'idle-ui-editor__field';
      fieldLabel.textContent = label;

      const input = document.createElement('input');
      input.type = 'number';
      input.step = name === 'opacity' ? '0.05' : '1';

      if (name === 'opacity') {
        input.min = '0';
        input.max = '1';
      }

      input.addEventListener('input', () => {
        const value = input.value === '' ? undefined : Number(input.value);
        this.onPatch({ [name]: value });
      });
      fieldLabel.append(input);
      grid.append(fieldLabel);
      this.refs.fields[name] = input;
    }

    return grid;
  }

  createOutline() {
    this.refs.outline = document.createElement('div');
    this.refs.outline.className = 'idle-ui-editor__outline';
    this.refs.outline.hidden = true;

    this.refs.outlineLabel = document.createElement('button');
    this.refs.outlineLabel.className = 'idle-ui-editor__outline-label';
    this.refs.outlineLabel.type = 'button';
    this.refs.outlineLabel.title = 'Drag to move this element';
    this.refs.outlineLabel.addEventListener('pointerdown', (event) => {
      this.onOutlinePointerDown(event);
    });
    this.refs.outline.append(this.refs.outlineLabel);
    return this.refs.outline;
  }

  createPrefabWorkbench() {
    this.refs.prefab = document.createElement('section');
    this.refs.prefab.className = 'idle-ui-editor__prefab';
    this.refs.prefab.hidden = true;
    this.refs.prefab.setAttribute('aria-label', 'Prefab preview');

    const header = document.createElement('header');
    header.className = 'idle-ui-editor__prefab-header';
    this.refs.prefabTitle = document.createElement('strong');
    const closeButton = this.createButton('close prefab', () => this.setPrefabOpen(false));
    header.append(this.refs.prefabTitle, closeButton);

    this.refs.prefabStage = document.createElement('div');
    this.refs.prefabStage.className = 'game-stage idle-ui-editor__prefab-stage';
    this.refs.prefabStage.setAttribute('aria-label', 'Isolated component preview');
    this.refs.prefab.append(header, this.refs.prefabStage);
    return this.refs.prefab;
  }

  createPanel(className, title) {
    const panel = document.createElement('aside');
    panel.className = `idle-ui-editor__panel ${className}`;
    const heading = document.createElement('h2');
    heading.textContent = title;
    panel.append(heading);
    return panel;
  }

  createSection(title) {
    const section = document.createElement('section');
    section.className = 'idle-ui-editor__section';
    const heading = document.createElement('h3');
    heading.textContent = title;
    section.append(heading);
    return section;
  }

  createButton(label, onClick) {
    const button = document.createElement('button');
    button.className = 'idle-ui-editor__button';
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  renderHierarchy(entries, selectedSelector = this.selected?.selector ?? '') {
    if (!this.refs.hierarchy) {
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const entry of entries) {
      const button = document.createElement('button');
      button.className = 'idle-ui-editor__tree-item';
      button.type = 'button';
      button.dataset.selector = entry.selector;
      button.dataset.hidden = String(entry.hidden);
      button.setAttribute('role', 'treeitem');
      button.setAttribute('aria-selected', String(entry.selector === selectedSelector));
      button.style.setProperty('--tree-depth', String(entry.depth));

      const caret = document.createElement('span');
      caret.className = 'idle-ui-editor__tree-caret';
      caret.textContent = entry.element.childElementCount > 0 ? '›' : '·';
      const label = document.createElement('span');
      label.textContent = entry.label;
      const tag = document.createElement('small');
      tag.textContent = entry.tag;
      button.append(caret, label, tag);
      button.addEventListener('click', () => this.onSelect(entry.selector));
      fragment.append(button);
    }

    this.refs.hierarchy.replaceChildren(fragment);
  }

  setSelection(descriptor, override = {}) {
    this.selected = descriptor;
    this.override = override;
    const hasSelection = Boolean(descriptor && descriptor.selector !== ':scope');

    this.refs.selectionTitle.textContent = descriptor?.label ?? 'nothing selected';
    this.refs.selectionPath.textContent = descriptor?.selector ?? 'click the game or hierarchy';
    this.refs.resetButton.disabled = !hasSelection;
    this.refs.prefabButton.disabled = !hasSelection;
    this.refs.assetInput.disabled = !hasSelection;

    for (const input of Object.values(this.refs.fields ?? {})) {
      input.disabled = !hasSelection;
    }

    if (!descriptor) {
      this.refs.componentDetails.replaceChildren();
      this.refs.livePosition.textContent = '';
      this.refs.assetInput.value = '';
      this.updateOutline(null);
      this.setPrefabOpen(false);
      return;
    }

    this.renderComponentDetails(descriptor);
    this.updateMetrics(descriptor);
    this.refs.fields.offsetX.value = String(override.offsetX ?? 0);
    this.refs.fields.offsetY.value = String(override.offsetY ?? 0);
    this.refs.fields.width.value = override.width ?? '';
    this.refs.fields.width.placeholder = String(descriptor.layout.width);
    this.refs.fields.height.value = override.height ?? '';
    this.refs.fields.height.placeholder = String(descriptor.layout.height);
    this.refs.fields.opacity.value = override.opacity ?? '';
    this.refs.fields.opacity.placeholder = '1';
    this.refs.assetInput.value = override.asset ?? descriptor.asset ?? '';
    this.updateOutline(descriptor);
    this.syncPrefab();
  }

  renderComponentDetails(descriptor) {
    const values = [
      ['widget', descriptor.widget],
      ['source', descriptor.source || 'not indexed'],
      ['tag', descriptor.tag],
      ['role', descriptor.role || 'none'],
      ['display', descriptor.layout.display],
      ['position', descriptor.layout.position],
      ['z-index', descriptor.layout.zIndex],
    ];
    const fragment = document.createDocumentFragment();

    for (const [label, value] of values) {
      const term = document.createElement('dt');
      term.textContent = label;
      const detail = document.createElement('dd');
      detail.textContent = value;
      fragment.append(term, detail);
    }

    this.refs.componentDetails.replaceChildren(fragment);
  }

  updateMetrics(descriptor) {
    if (!descriptor || !this.refs.livePosition) {
      return;
    }

    const { x, y, width, height, scale } = descriptor.layout;
    this.refs.livePosition.textContent = `x ${x}  y ${y}  w ${width}  h ${height}  scale ${scale}`;
  }

  updateOutline(descriptor) {
    if (!this.refs.outline || !descriptor || descriptor.hidden) {
      if (this.refs.outline) {
        this.refs.outline.hidden = true;
      }
      return;
    }

    const rect = descriptor.element.getBoundingClientRect();

    if (!(rect.width > 0) || !(rect.height > 0)) {
      this.refs.outline.hidden = true;
      return;
    }

    this.refs.outline.hidden = false;
    this.refs.outline.style.left = `${rect.left}px`;
    this.refs.outline.style.top = `${rect.top}px`;
    this.refs.outline.style.width = `${rect.width}px`;
    this.refs.outline.style.height = `${rect.height}px`;
    this.refs.outlineLabel.textContent = descriptor.label;
    this.updateMetrics(descriptor);
  }

  setMode(mode) {
    this.mode = mode === 'interact' ? 'interact' : 'select';
    this.refs.selectModeButton?.setAttribute(
      'aria-pressed',
      String(this.mode === 'select'),
    );
    this.refs.interactModeButton?.setAttribute(
      'aria-pressed',
      String(this.mode === 'interact'),
    );
    this.onModeChange(this.mode);
  }

  setDirty(dirty) {
    if (this.refs.saveButton) {
      this.refs.saveButton.dataset.dirty = String(Boolean(dirty));
    }
  }

  setStatus(message, tone = 'normal') {
    if (!this.refs.status) {
      return;
    }

    this.refs.status.textContent = message;
    this.refs.status.dataset.tone = tone;
  }

  setPrefabOpen(open) {
    this.prefabOpen = Boolean(open && this.selected);

    if (!this.refs.prefab) {
      return;
    }

    this.refs.prefab.hidden = !this.prefabOpen;
    this.refs.prefabButton.textContent = this.prefabOpen ? 'close prefab' : 'open prefab';

    if (this.prefabOpen) {
      this.syncPrefab();
    }
  }

  syncPrefab() {
    if (!this.prefabOpen || !this.selected?.element || !this.refs.prefabStage) {
      return;
    }

    const clone = this.selected.element.cloneNode(true);
    clone.hidden = false;
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    clone.querySelectorAll('button, input, select, textarea, a').forEach((element) => {
      element.tabIndex = -1;
    });
    clone.style.position = 'relative';
    clone.style.inset = 'auto';
    clone.style.margin = '0';
    clone.style.translate = 'none';
    clone.style.transform = 'none';
    clone.style.pointerEvents = 'none';
    this.refs.prefabTitle.textContent = `${this.selected.widget} prefab`;
    this.refs.prefabStage.replaceChildren(clone);
  }
}
