const SCENE_HIDDEN_ATTRIBUTE = 'data-ui-editor-scene-hidden';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export class UiEditorHierarchyManager {
  constructor({ panel, scene }) {
    this.panel = panel;
    this.scene = scene;
    this.refs = null;
    this.observer = null;
    this.elementIds = new WeakMap();
    this.elementsById = new Map();
    this.nextElementId = 1;

    this.handleClick = (event) => this.onClick(event);
  }

  mount() {
    if (this.refs) {
      return this.refs;
    }

    const header = this.panel.querySelector('.ui-editor-panel__header');
    const body = this.panel.querySelector('.ui-editor-panel__body');
    const hierarchy = document.createElement('div');
    const tree = document.createElement('div');
    const emptyState = document.createElement('p');

    header.textContent = 'Hierarchy';
    this.panel.setAttribute('aria-label', 'Hierarchy');
    hierarchy.className = 'ui-editor-hierarchy';
    tree.className = 'ui-editor-hierarchy__tree';
    tree.setAttribute('role', 'tree');
    tree.setAttribute('aria-label', 'Preview component hierarchy');
    emptyState.className = 'ui-editor-hierarchy__empty';
    emptyState.textContent = 'Open a widget or dialog to inspect its components.';

    hierarchy.append(emptyState, tree);
    body.replaceChildren(hierarchy);
    hierarchy.addEventListener('click', this.handleClick);

    this.refs = {
      body,
      emptyState,
      header,
      hierarchy,
      tree,
    };

    this.observer = new window.MutationObserver(() => this.refresh());
    this.observer.observe(this.scene, {
      attributes: true,
      attributeFilter: [
        'aria-label',
        'data-ui-editor-component',
        'data-ui-editor-label',
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
    this.refs.hierarchy.removeEventListener('click', this.handleClick);
    this.refs.header.textContent = 'Left panel';
    this.panel.setAttribute('aria-label', 'Left panel');
    this.refs.body.replaceChildren();
    this.refs = null;
    this.elementsById.clear();
  }

  refresh() {
    if (!this.refs) {
      return;
    }

    const roots = [...this.scene.children];
    const fragment = document.createDocumentFragment();
    this.elementsById.clear();

    for (const element of roots) {
      fragment.append(this.createTreeItem(element, 1));
    }

    this.refs.tree.replaceChildren(fragment);
    this.refs.tree.hidden = roots.length === 0;
    this.refs.emptyState.hidden = roots.length > 0;
  }

  onClick(event) {
    const toggle = event.target.closest('[data-editor-visibility-toggle]');

    if (!toggle || !this.refs.hierarchy.contains(toggle)) {
      return;
    }

    const element = this.elementsById.get(toggle.dataset.editorVisibilityToggle);

    if (!element) {
      return;
    }

    element.toggleAttribute(
      SCENE_HIDDEN_ATTRIBUTE,
      !element.hasAttribute(SCENE_HIDDEN_ATTRIBUTE),
    );
    this.refresh();
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

    this.elementsById.set(id, element);

    item.className = 'ui-editor-hierarchy__item';
    item.dataset.sceneVisible = String(sceneVisible);
    item.setAttribute('role', 'treeitem');
    item.setAttribute('aria-level', String(depth));
    item.style.setProperty('--editor-tree-depth', String(depth));

    row.className = 'ui-editor-hierarchy__row';

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
    metadata.textContent = element.tagName.toLowerCase();

    row.append(toggle, text, metadata);
    item.append(row);

    if (element.children.length > 0) {
      const group = document.createElement('div');
      group.className = 'ui-editor-hierarchy__group';
      group.setAttribute('role', 'group');
      item.setAttribute('aria-expanded', 'true');

      for (const child of element.children) {
        group.append(this.createTreeItem(child, depth + 1));
      }

      item.append(group);
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
