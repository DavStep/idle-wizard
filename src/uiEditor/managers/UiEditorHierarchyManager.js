const SCENE_HIDDEN_ATTRIBUTE = 'data-ui-editor-scene-hidden';
const SCENE_SELECTED_ATTRIBUTE = 'data-ui-editor-scene-selected';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export class UiEditorHierarchyManager {
  constructor({
    onOpenComponent = null,
    onSelectComponent = null,
    panel,
    scene,
  }) {
    this.panel = panel;
    this.scene = scene;
    this.onSelectComponent =
      typeof onSelectComponent === 'function' ? onSelectComponent : null;
    this.onOpenComponent =
      typeof onOpenComponent === 'function' ? onOpenComponent : null;
    this.refs = null;
    this.observer = null;
    this.elementIds = new WeakMap();
    this.elementsById = new Map();
    this.nextElementId = 1;
    this.selectedComponentId = null;
    this.collapsedComponentIds = new Set();
    this.filterQuery = '';

    this.handleClick = (event) => this.onClick(event);
    this.handleDoubleClick = (event) => this.onDoubleClick(event);
    this.handleFilterInput = (event) => this.onFilterInput(event);
    this.handleKeyDown = (event) => this.onKeyDown(event);
    this.handleHierarchyChange = () => this.refresh();
  }

  mount() {
    if (this.refs) {
      return this.refs;
    }

    const header = this.panel.querySelector('.ui-editor-panel__header');
    const body = this.panel.querySelector('.ui-editor-panel__body');
    const hierarchy = document.createElement('div');
    const tools = document.createElement('div');
    const search = document.createElement('label');
    const searchIcon = createSearchIcon();
    const searchInput = document.createElement('input');
    const searchStatus = document.createElement('span');
    const tree = document.createElement('div');
    const emptyState = document.createElement('p');

    header.textContent = 'Hierarchy';
    this.panel.setAttribute('aria-label', 'Hierarchy');
    hierarchy.className = 'ui-editor-hierarchy';
    tools.className = 'ui-editor-hierarchy__tools';
    search.className = 'ui-editor-hierarchy__search';
    searchInput.className = 'ui-editor-hierarchy__search-input';
    searchInput.type = 'search';
    searchInput.placeholder = 'Find layers';
    searchInput.setAttribute('aria-label', 'Find hierarchy layers');
    searchInput.autocomplete = 'off';
    searchStatus.className = 'ui-editor-hierarchy__search-status';
    searchStatus.setAttribute('aria-live', 'polite');
    tree.className = 'ui-editor-hierarchy__tree';
    tree.setAttribute('role', 'tree');
    tree.setAttribute('aria-label', 'Preview component hierarchy');
    emptyState.className = 'ui-editor-hierarchy__empty';
    emptyState.textContent = 'Open a widget or dialog to inspect its components.';

    search.append(searchIcon, searchInput);
    tools.append(search, searchStatus);
    hierarchy.append(tools, emptyState, tree);
    body.replaceChildren(hierarchy);
    hierarchy.addEventListener('click', this.handleClick);
    hierarchy.addEventListener('dblclick', this.handleDoubleClick);
    hierarchy.addEventListener('keydown', this.handleKeyDown);
    searchInput.addEventListener('input', this.handleFilterInput);
    this.scene.addEventListener(
      'ui-editor-hierarchy-change',
      this.handleHierarchyChange,
    );

    this.refs = {
      body,
      emptyState,
      header,
      hierarchy,
      searchInput,
      searchStatus,
      tree,
    };

    this.observer = new window.MutationObserver(() => this.refresh());
    this.observer.observe(this.scene, {
      attributes: true,
      attributeFilter: [
        'aria-label',
        'data-ui-editor-component',
        'data-ui-editor-label',
        'data-ui-editor-type',
        SCENE_HIDDEN_ATTRIBUTE,
      ],
      childList: true,
      subtree: true,
    });

    this.refresh();
    return this.refs;
  }

  unmount() {
    if (!this.refs) {
      return;
    }

    this.observer?.disconnect();
    this.observer = null;
    this.clearPreviewSelection();
    this.refs.hierarchy.removeEventListener('click', this.handleClick);
    this.refs.hierarchy.removeEventListener('dblclick', this.handleDoubleClick);
    this.refs.hierarchy.removeEventListener('keydown', this.handleKeyDown);
    this.refs.searchInput.removeEventListener('input', this.handleFilterInput);
    this.scene.removeEventListener(
      'ui-editor-hierarchy-change',
      this.handleHierarchyChange,
    );
    this.refs.header.textContent = 'Left panel';
    this.panel.setAttribute('aria-label', 'Left panel');
    this.refs.body.replaceChildren();
    this.refs = null;
    this.elementsById.clear();
    this.collapsedComponentIds.clear();
    this.filterQuery = '';
  }

  refresh() {
    if (!this.refs) {
      return;
    }

    const hierarchyHidden =
      this.scene.firstElementChild?.dataset.uiEditorHierarchy === 'hidden';
    const roots = hierarchyHidden ? [] : [...this.scene.children];
    const fragment = document.createDocumentFragment();
    this.elementsById.clear();

    for (const element of roots) {
      fragment.append(this.createTreeItem(element, 1));
    }

    if (
      this.selectedComponentId
      && !this.elementsById.has(this.selectedComponentId)
    ) {
      this.selectedComponentId = null;
      this.clearPreviewSelection();
    } else if (this.selectedComponentId) {
      const selectedTarget = this.elementsById.get(this.selectedComponentId);
      if (selectedTarget.kind === 'atomic') {
        this.setAtomicPreviewSelection(selectedTarget.component);
      } else {
        selectedTarget.element.setAttribute(SCENE_SELECTED_ATTRIBUTE, '');
      }
    }

    this.refs.tree.replaceChildren(fragment);
    const visibleCount = this.applyFilter();
    this.refs.tree.hidden = roots.length === 0;
    this.refs.emptyState.hidden = roots.length > 0;
    this.refs.searchStatus.textContent = roots.length
      ? `${visibleCount} ${visibleCount === 1 ? 'layer' : 'layers'}`
      : '';
  }

  onClick(event) {
    const disclosure = event.target.closest('[data-editor-disclosure-toggle]');

    if (disclosure && this.refs.hierarchy.contains(disclosure)) {
      this.toggleExpanded(disclosure.dataset.editorDisclosureToggle);
      return;
    }

    const toggle = event.target.closest('[data-editor-visibility-toggle]');

    if (toggle && this.refs.hierarchy.contains(toggle)) {
      const target = this.elementsById.get(
        toggle.dataset.editorVisibilityToggle,
      );

      if (!target) {
        return;
      }

      if (target.kind === 'atomic') {
        target.component.setVisible(!target.component.isVisible());
      } else {
        target.element.toggleAttribute(
          SCENE_HIDDEN_ATTRIBUTE,
          !target.element.hasAttribute(SCENE_HIDDEN_ATTRIBUTE),
        );
      }
      this.refresh();
      return;
    }

    const row = event.target.closest('[data-editor-component-select]');

    if (row && this.refs.hierarchy.contains(row)) {
      if (
        event.detail >= 2
        && this.openComponent(row.dataset.editorComponentSelect)
      ) {
        return;
      }
      this.selectComponent(row.dataset.editorComponentSelect);
    }
  }

  onKeyDown(event) {
    const row = event.target.closest('[data-editor-component-select]');

    if (
      !row
      || !this.refs.hierarchy.contains(row)
      || event.target !== row
    ) {
      return;
    }

    const id = row.dataset.editorComponentSelect;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.setExpanded(id, true);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.setExpanded(id, false);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectComponent(id);
    }
  }

  onFilterInput(event) {
    this.filterQuery = event.target.value.trim().toLocaleLowerCase();
    const visibleCount = this.applyFilter();
    this.refs.searchStatus.textContent = `${visibleCount} ${
      visibleCount === 1 ? 'layer' : 'layers'
    }`;
  }

  toggleExpanded(id) {
    this.setExpanded(id, this.collapsedComponentIds.has(id));
  }

  setExpanded(id, expanded) {
    const item = [...this.refs.tree.querySelectorAll(
      '[data-editor-tree-id]',
    )].find(
      (candidate) => candidate.dataset.editorTreeId === id,
    );
    if (!item?.querySelector(':scope > .ui-editor-hierarchy__group')) {
      return false;
    }

    if (expanded) {
      this.collapsedComponentIds.delete(id);
    } else {
      this.collapsedComponentIds.add(id);
    }
    this.applyFilter();
    return true;
  }

  applyFilter() {
    if (!this.refs) {
      return 0;
    }

    let visibleCount = 0;
    for (const item of this.refs.tree.querySelectorAll(
      ':scope > .ui-editor-hierarchy__item',
    )) {
      visibleCount += this.updateItemVisibility(item);
    }
    return visibleCount;
  }

  updateItemVisibility(item) {
    const row = item.querySelector(':scope > .ui-editor-hierarchy__row');
    const group = item.querySelector(':scope > .ui-editor-hierarchy__group');
    let descendantMatches = 0;

    if (group) {
      for (const child of group.querySelectorAll(
        ':scope > .ui-editor-hierarchy__item',
      )) {
        descendantMatches += this.updateItemVisibility(child);
      }
    }

    const ownText = row?.textContent?.toLocaleLowerCase() ?? '';
    const ownMatches = !this.filterQuery || ownText.includes(this.filterQuery);
    const matches = ownMatches || descendantMatches > 0;
    item.hidden = !matches;

    if (group) {
      const expanded = Boolean(this.filterQuery)
        || !this.collapsedComponentIds.has(item.dataset.editorTreeId);
      group.hidden = !expanded;
      item.setAttribute('aria-expanded', String(expanded));
      const disclosure = row.querySelector('[data-editor-disclosure-toggle]');
      disclosure?.setAttribute('aria-expanded', String(expanded));
      disclosure?.setAttribute(
        'aria-label',
        `${expanded ? 'Collapse' : 'Expand'} ${disclosure.dataset.label}`,
      );
    }

    if (!matches) {
      return 0;
    }
    return (ownMatches ? 1 : 0) + descendantMatches;
  }

  onDoubleClick(event) {
    const row = event.target.closest('[data-editor-component-select]');

    if (!row || !this.refs.hierarchy.contains(row)) {
      return;
    }

    if (this.openComponent(row.dataset.editorComponentSelect)) {
      event.preventDefault();
    }
  }

  openComponent(id) {
    const target = this.elementsById.get(id);
    const libraryEntryId = target?.kind === 'atomic'
      ? target.component.libraryEntryId
      : null;

    return libraryEntryId
      ? this.onOpenComponent?.(libraryEntryId) !== false
      : false;
  }

  selectComponent(id) {
    const target = this.elementsById.get(id);

    if (!target) {
      return false;
    }

    this.clearPreviewSelection();
    this.selectedComponentId = id;
    if (target.kind === 'atomic') {
      this.setAtomicPreviewSelection(target.component);
      this.onSelectComponent?.(target.component);
    } else {
      target.element.setAttribute(SCENE_SELECTED_ATTRIBUTE, '');
      this.onSelectComponent?.(
        target.element.uiEditorGetInspectorComponent?.() ?? null,
        target.element,
      );
    }
    this.refresh();
    return true;
  }

  selectRootComponent() {
    const root = this.scene.firstElementChild;

    if (!root || root.dataset.uiEditorHierarchy === 'hidden') {
      return false;
    }

    const id = this.getElementId(root);
    if (!this.elementsById.has(id)) {
      this.refresh();
    }
    return this.selectComponent(id);
  }

  clearSelection() {
    this.clearPreviewSelection();
    this.selectedComponentId = null;
    this.refresh();
  }

  clearPreviewSelection() {
    this.setAtomicPreviewSelection(null);
    for (const element of this.scene.querySelectorAll(
      `[${SCENE_SELECTED_ATTRIBUTE}]`,
    )) {
      element.removeAttribute(SCENE_SELECTED_ATTRIBUTE);
    }
  }

  setAtomicPreviewSelection(component) {
    const preview = [...this.scene.children].find(
      (element) =>
        typeof element.uiEditorSelectAtomicComponent === 'function',
    );

    preview?.uiEditorSelectAtomicComponent(component);
  }

  getWorkspaceState() {
    const hiddenComponentPaths = [];

    for (const [rootIndex, root] of [...this.scene.children].entries()) {
      collectHiddenComponentPaths(root, [rootIndex], hiddenComponentPaths);
    }

    return { hiddenComponentPaths };
  }

  restoreWorkspaceState(state) {
    if (!Array.isArray(state?.hiddenComponentPaths)) {
      return false;
    }

    for (const element of this.scene.querySelectorAll(
      `[${SCENE_HIDDEN_ATTRIBUTE}]`,
    )) {
      element.removeAttribute(SCENE_HIDDEN_ATTRIBUTE);
    }

    for (const path of state.hiddenComponentPaths) {
      resolveElementAtPath(this.scene, path)?.setAttribute(
        SCENE_HIDDEN_ATTRIBUTE,
        '',
      );
    }

    this.refresh();
    return true;
  }

  createTreeItem(element, depth) {
    const id = this.getElementId(element);
    const label = getElementLabel(element);
    const hidden = element.hasAttribute(SCENE_HIDDEN_ATTRIBUTE);
    const sceneVisible = !element.closest(`[${SCENE_HIDDEN_ATTRIBUTE}]`);
    const item = document.createElement('div');
    const row = document.createElement('div');
    const toggle = document.createElement('button');
    const text = document.createElement('span');
    const metadata = document.createElement('span');

    this.elementsById.set(id, { element, kind: 'element' });

    item.className = 'ui-editor-hierarchy__item';
    item.dataset.editorTreeId = id;
    item.dataset.sceneVisible = String(sceneVisible);
    item.dataset.selected = String(this.selectedComponentId === id);
    item.setAttribute('role', 'treeitem');
    item.setAttribute('aria-level', String(depth));
    item.setAttribute(
      'aria-selected',
      String(this.selectedComponentId === id),
    );
    item.style.setProperty('--editor-tree-depth', String(depth));

    row.className = 'ui-editor-hierarchy__row';
    row.dataset.editorComponentSelect = id;
    row.tabIndex = 0;

    toggle.className = 'ui-editor-hierarchy__visibility';
    toggle.type = 'button';
    toggle.dataset.editorVisibilityToggle = id;
    toggle.setAttribute('aria-label', `${hidden ? 'Show' : 'Hide'} ${label}`);
    toggle.setAttribute('aria-pressed', String(!hidden));
    toggle.title = `${hidden ? 'Show' : 'Hide'} ${label}`;
    toggle.append(createEyeIcon({ hidden }));

    text.className = 'ui-editor-hierarchy__label';
    text.textContent = label;
    text.title = label;

    metadata.className = 'ui-editor-hierarchy__metadata';
    metadata.textContent =
      element.dataset.uiEditorType?.trim()
      || element.tagName.toLowerCase();

    const disclosure = createDisclosureButton({ id, label });
    row.append(disclosure, toggle, text, metadata);
    item.append(row);

    const hasSemanticHierarchy =
      typeof element.uiEditorGetAtomicComponents === 'function';
    const atomicComponents = normalizeAtomicComponents(
      hasSemanticHierarchy
        ? element.uiEditorGetAtomicComponents()
        : null,
    );
    const children = hasSemanticHierarchy
      ? atomicComponents
      : [...element.children];

    if (children.length > 0) {
      const group = document.createElement('div');
      group.className = 'ui-editor-hierarchy__group';
      group.setAttribute('role', 'group');
      item.setAttribute('aria-expanded', 'true');

      for (const child of children) {
        group.append(
          atomicComponents.length
            ? this.createAtomicTreeItem(child, depth + 1, sceneVisible)
            : this.createTreeItem(child, depth + 1),
        );
      }

      item.append(group);
      disclosure.disabled = false;
      disclosure.dataset.empty = 'false';
    }

    return item;
  }

  createAtomicTreeItem(component, depth, ancestorVisible) {
    const id = `atomic:${component.id}`;
    const visible = component.isVisible();
    const sceneVisible = ancestorVisible && visible;
    const item = document.createElement('div');
    const row = document.createElement('div');
    const toggle = document.createElement('button');
    const text = document.createElement('span');
    const metadata = document.createElement('span');

    this.elementsById.set(id, { component, kind: 'atomic' });

    item.className = 'ui-editor-hierarchy__item';
    item.dataset.editorTreeId = id;
    item.dataset.sceneVisible = String(sceneVisible);
    item.dataset.selected = String(this.selectedComponentId === id);
    item.setAttribute('role', 'treeitem');
    item.setAttribute('aria-level', String(depth));
    item.setAttribute(
      'aria-selected',
      String(this.selectedComponentId === id),
    );
    item.style.setProperty('--editor-tree-depth', String(depth));

    row.className = 'ui-editor-hierarchy__row';
    row.dataset.editorComponentSelect = id;
    row.tabIndex = 0;

    toggle.className = 'ui-editor-hierarchy__visibility';
    toggle.type = 'button';
    toggle.dataset.editorVisibilityToggle = id;
    toggle.setAttribute(
      'aria-label',
      `${visible ? 'Hide' : 'Show'} ${component.label}`,
    );
    toggle.setAttribute('aria-pressed', String(visible));
    toggle.title = `${visible ? 'Hide' : 'Show'} ${component.label}`;
    toggle.append(createEyeIcon({ hidden: !visible }));

    text.className = 'ui-editor-hierarchy__label';
    text.textContent = component.label;
    text.title = component.label;

    metadata.className = 'ui-editor-hierarchy__metadata';
    metadata.textContent = component.type;

    const disclosure = createDisclosureButton({
      id,
      label: component.label,
    });
    row.append(disclosure, toggle, text, metadata);
    item.append(row);

    const children = normalizeAtomicComponents(component.children);
    if (children.length > 0) {
      const group = document.createElement('div');
      group.className = 'ui-editor-hierarchy__group';
      group.setAttribute('role', 'group');
      item.setAttribute('aria-expanded', 'true');

      for (const child of children) {
        group.append(
          this.createAtomicTreeItem(child, depth + 1, sceneVisible),
        );
      }

      item.append(group);
      disclosure.disabled = false;
      disclosure.dataset.empty = 'false';
    }
    return item;
  }

  getElementId(element) {
    let id = this.elementIds.get(element);

    if (!id) {
      id = `component-${this.nextElementId}`;
      this.nextElementId += 1;
      this.elementIds.set(element, id);
    }

    return id;
  }
}

function normalizeAtomicComponents(components) {
  if (!Array.isArray(components)) {
    return [];
  }

  return components.filter(
    (component) =>
      component
      && typeof component.id === 'string'
      && typeof component.label === 'string'
      && typeof component.type === 'string'
      && typeof component.isVisible === 'function'
      && typeof component.setVisible === 'function',
  );
}

function collectHiddenComponentPaths(element, path, hiddenComponentPaths) {
  if (element.hasAttribute(SCENE_HIDDEN_ATTRIBUTE)) {
    hiddenComponentPaths.push(path);
  }

  for (const [childIndex, child] of [...element.children].entries()) {
    collectHiddenComponentPaths(
      child,
      [...path, childIndex],
      hiddenComponentPaths,
    );
  }
}

function resolveElementAtPath(scene, path) {
  if (
    !Array.isArray(path)
    || path.length === 0
    || path.some(
      (index) => !Number.isInteger(index) || index < 0,
    )
  ) {
    return null;
  }

  let element = scene.children[path[0]] ?? null;

  for (const childIndex of path.slice(1)) {
    element = element?.children[childIndex] ?? null;
  }

  return element;
}

function getElementLabel(element) {
  const explicitLabel =
    element.dataset.uiEditorComponent?.trim()
    || element.dataset.uiEditorLabel?.trim()
    || element.getAttribute('aria-label')?.trim();

  if (explicitLabel) {
    return explicitLabel;
  }

  const className = [...element.classList].find(
    (candidate) => !candidate.startsWith('is-'),
  );

  if (className) {
    return className;
  }

  if (element.matches('button, a, input, select, textarea')) {
    const controlLabel =
      element.textContent?.replace(/\s+/g, ' ').trim()
      || element.getAttribute('name')?.trim()
      || element.getAttribute('type')?.trim();

    if (controlLabel) {
      return controlLabel.slice(0, 48);
    }
  }

  return element.tagName.toLowerCase();
}

function createEyeIcon({ hidden }) {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  const eye = document.createElementNS(SVG_NAMESPACE, 'path');

  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('viewBox', '0 0 20 20');

  eye.setAttribute(
    'd',
    'M2.25 10s2.75-4.5 7.75-4.5 7.75 4.5 7.75 4.5-2.75 4.5-7.75 4.5S2.25 10 2.25 10Z',
  );
  svg.append(eye);

  const pupil = document.createElementNS(SVG_NAMESPACE, 'circle');
  pupil.setAttribute('cx', '10');
  pupil.setAttribute('cy', '10');
  pupil.setAttribute('r', '2.25');
  svg.append(pupil);

  if (hidden) {
    const slash = document.createElementNS(SVG_NAMESPACE, 'path');
    slash.setAttribute('d', 'm3.25 3.25 13.5 13.5');
    slash.classList.add('ui-editor-hierarchy__eye-slash');
    svg.append(slash);
  }

  return svg;
}

function createDisclosureButton({ id, label }) {
  const button = document.createElement('button');
  const icon = document.createElementNS(SVG_NAMESPACE, 'svg');
  const path = document.createElementNS(SVG_NAMESPACE, 'path');

  button.className = 'ui-editor-hierarchy__disclosure';
  button.type = 'button';
  button.disabled = true;
  button.dataset.empty = 'true';
  button.dataset.editorDisclosureToggle = id;
  button.dataset.label = label;
  button.setAttribute('aria-label', `Collapse ${label}`);
  button.setAttribute('aria-expanded', 'true');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');
  icon.setAttribute('viewBox', '0 0 16 16');
  path.setAttribute('d', 'm5.5 3.5 4.5 4.5-4.5 4.5');
  icon.append(path);
  button.append(icon);
  return button;
}

function createSearchIcon() {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  const circle = document.createElementNS(SVG_NAMESPACE, 'circle');
  const handle = document.createElementNS(SVG_NAMESPACE, 'path');

  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('viewBox', '0 0 16 16');
  circle.setAttribute('cx', '7');
  circle.setAttribute('cy', '7');
  circle.setAttribute('r', '4');
  handle.setAttribute('d', 'm10 10 3 3');
  svg.append(circle, handle);
  return svg;
}
