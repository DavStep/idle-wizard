const LIBRARY_ROOT_ID = 'library';

export const UI_EDITOR_LIBRARY_FOLDERS = [
  {
    children: ['assets', 'widgets', 'dialogs', 'scenes'],
    id: LIBRARY_ROOT_ID,
    label: 'Library',
  },
  {
    id: 'assets',
    label: 'UI Assets',
    parentId: LIBRARY_ROOT_ID,
    sectionId: 'assets',
  },
  {
    children: [
      'buttons',
      'progress-bars',
      'sliders',
      'composite-widgets',
    ],
    id: 'widgets',
    label: 'UI Widgets',
    parentId: LIBRARY_ROOT_ID,
  },
  {
    id: 'dialogs',
    label: 'Dialogs',
    parentId: LIBRARY_ROOT_ID,
    sectionId: 'dialogs',
  },
  {
    id: 'scenes',
    label: 'Scenes',
    parentId: LIBRARY_ROOT_ID,
    sectionId: 'scenes',
  },
  {
    id: 'buttons',
    label: 'Buttons',
    parentId: 'widgets',
    sectionId: 'buttons',
  },
  {
    id: 'progress-bars',
    label: 'Progress bars',
    parentId: 'widgets',
    sectionId: 'progress-bars',
  },
  {
    id: 'sliders',
    label: 'Sliders',
    parentId: 'widgets',
    sectionId: 'sliders',
  },
  {
    id: 'composite-widgets',
    label: 'Composite widgets',
    parentId: 'widgets',
    sectionId: 'composite-widgets',
  },
];

const FOLDERS_BY_ID = new Map(
  UI_EDITOR_LIBRARY_FOLDERS.map((folder) => [folder.id, folder]),
);
const SECTION_IDS = new Set(
  UI_EDITOR_LIBRARY_FOLDERS.map((folder) => folder.sectionId).filter(Boolean),
);

export class UiEditorBottomPanelManager {
  constructor({ entries = [], onSelectEntry = () => true, panel }) {
    this.panel = panel;
    this.entries = entries;
    this.onSelectEntry = onSelectEntry;
    this.currentFolderId = LIBRARY_ROOT_ID;
    this.selectedEntryId = null;
    this.entriesById = new Map();
    this.refs = null;

    this.handleBodyClick = (event) => this.onBodyClick(event);
    this.handleHeaderClick = (event) => this.onHeaderClick(event);
  }

  mount() {
    if (this.refs) {
      return this.refs;
    }

    const header = this.panel.querySelector('.ui-editor-panel__header');
    const body = this.panel.querySelector('.ui-editor-panel__body');
    const breadcrumb = createBreadcrumb();

    header.replaceChildren(breadcrumb);
    body.addEventListener('click', this.handleBodyClick);
    header.addEventListener('click', this.handleHeaderClick);

    this.refs = {
      body,
      breadcrumb,
      entryButtons: new Map(),
      folderButtons: new Map(),
      header,
      viewport: null,
    };
    this.renderEntries();
    return this.refs;
  }

  unmount() {
    if (!this.refs) {
      return;
    }

    this.refs.body.removeEventListener('click', this.handleBodyClick);
    this.refs.header.removeEventListener('click', this.handleHeaderClick);
    this.refs.header.textContent = 'Bottom panel';
    this.refs.body.replaceChildren();
    this.refs = null;
    this.entriesById.clear();
  }

  onBodyClick(event) {
    const folderButton = event.target.closest('[data-editor-library-folder]');

    if (folderButton && this.refs.body.contains(folderButton)) {
      this.openFolder(folderButton.dataset.editorLibraryFolder, {
        focusFirst: event.detail === 0,
      });
      return;
    }

    const entryButton = event.target.closest('[data-editor-library-entry]');

    if (entryButton && this.refs.body.contains(entryButton)) {
      this.selectEntry(entryButton.dataset.editorLibraryEntry);
    }
  }

  onHeaderClick(event) {
    const breadcrumbButton = event.target.closest(
      '[data-editor-library-breadcrumb]',
    );

    if (!breadcrumbButton || !this.refs.header.contains(breadcrumbButton)) {
      return;
    }

    this.openFolder(breadcrumbButton.dataset.editorLibraryBreadcrumb, {
      focusFirst: event.detail === 0,
    });
  }

  openFolder(folderId, { focusFirst = false } = {}) {
    if (!this.refs || !FOLDERS_BY_ID.has(folderId)) {
      return false;
    }

    this.currentFolderId = folderId;
    this.renderCurrentFolder();

    if (focusFirst) {
      this.refs.viewport
        .querySelector('button:not(:disabled)')
        ?.focus();
    }

    return true;
  }

  setEntries(entries) {
    this.entries = entries;

    if (this.refs) {
      this.renderEntries();
    }
  }

  selectEntry(entryId) {
    const entry = this.entriesById.get(entryId);

    if (!entry || entry.disabled || this.onSelectEntry(entry) === false) {
      return false;
    }

    this.selectedEntryId = entryId;
    this.updateEntrySelection();
    return true;
  }

  clearSelection() {
    this.selectedEntryId = null;
    this.updateEntrySelection();
  }

  renderEntries() {
    this.entriesById.clear();
    this.refs.entryButtons.clear();

    for (const entry of this.entries) {
      if (!SECTION_IDS.has(entry.sectionId)) {
        throw new Error(`Unknown UI editor library section: ${entry.sectionId}`);
      }

      if (this.entriesById.has(entry.id)) {
        throw new Error(`Duplicate UI editor library entry: ${entry.id}`);
      }

      this.entriesById.set(entry.id, entry);
      this.refs.entryButtons.set(entry.id, createLibraryEntry(entry));
    }

    if (!this.entriesById.has(this.selectedEntryId)) {
      this.selectedEntryId = null;
    }

    this.renderCurrentFolder();
    this.updateEntrySelection();
  }

  renderCurrentFolder() {
    const folder = FOLDERS_BY_ID.get(this.currentFolderId);
    const viewport = document.createElement('div');

    viewport.className = 'ui-editor-folder-browser';
    viewport.dataset.editorLibraryFolderView = folder.id;
    this.refs.folderButtons.clear();
    this.refs.breadcrumb.replaceChildren(...createBreadcrumbItems(folder));

    if (folder.children) {
      viewport.append(this.createFolderGrid(folder.children));
    } else {
      viewport.append(this.createEntryList(folder));
    }

    this.refs.body.replaceChildren(viewport);
    this.refs.viewport = viewport;
  }

  createFolderGrid(folderIds) {
    const list = document.createElement('ul');
    list.className = 'ui-editor-folder-grid';
    list.setAttribute('aria-label', 'Folders');

    for (const folderId of folderIds) {
      const folder = FOLDERS_BY_ID.get(folderId);
      const item = document.createElement('li');
      const button = createFolderButton(folder);

      this.refs.folderButtons.set(folder.id, button);
      item.append(button);
      list.append(item);
    }

    return list;
  }

  createEntryList(folder) {
    const list = document.createElement('ul');
    const entryIds = [];

    list.className = 'ui-editor-library-entry-list';
    list.dataset.editorLibrarySectionContent = folder.sectionId;
    list.setAttribute('aria-label', `${folder.label} contents`);

    for (const [entryId, entry] of this.entriesById) {
      if (entry.sectionId !== folder.sectionId) {
        continue;
      }

      const item = document.createElement('li');
      item.append(this.refs.entryButtons.get(entryId));
      list.append(item);
      entryIds.push(entryId);
    }

    list.dataset.empty = String(entryIds.length === 0);
    return list;
  }

  updateEntrySelection() {
    if (!this.refs) {
      return;
    }

    for (const [entryId, button] of this.refs.entryButtons) {
      button.setAttribute(
        'aria-pressed',
        String(entryId === this.selectedEntryId),
      );
    }
  }
}

function createBreadcrumb() {
  const breadcrumb = document.createElement('nav');
  breadcrumb.className = 'ui-editor-folder-path';
  breadcrumb.setAttribute('aria-label', 'Library path');
  return breadcrumb;
}

function createBreadcrumbItems(folder) {
  const path = resolveFolderPath(folder);
  const items = [];

  for (const [index, pathFolder] of path.entries()) {
    if (index > 0) {
      const separator = document.createElement('span');
      separator.className = 'ui-editor-folder-path__separator';
      separator.setAttribute('aria-hidden', 'true');
      separator.textContent = '/';
      items.push(separator);
    }

    if (index === path.length - 1) {
      const current = document.createElement('span');
      current.className = 'ui-editor-folder-path__current';
      current.setAttribute('aria-current', 'page');
      current.textContent = pathFolder.label;
      items.push(current);
      continue;
    }

    const button = document.createElement('button');
    button.className = 'ui-editor-folder-path__button';
    button.type = 'button';
    button.dataset.editorLibraryBreadcrumb = pathFolder.id;
    button.textContent = pathFolder.label;
    items.push(button);
  }

  return items;
}

function resolveFolderPath(folder) {
  const path = [];
  let cursor = folder;

  while (cursor) {
    path.unshift(cursor);
    cursor = cursor.parentId ? FOLDERS_BY_ID.get(cursor.parentId) : null;
  }

  return path;
}

function createFolderButton({ id, label }) {
  const button = document.createElement('button');
  const icon = createFolderIcon();
  const text = document.createElement('span');

  button.className = 'ui-editor-folder';
  button.type = 'button';
  button.dataset.editorLibraryFolder = id;
  button.setAttribute('aria-label', `Open ${label} folder`);
  text.className = 'ui-editor-folder__label';
  text.textContent = label;
  button.append(icon, text);
  return button;
}

function createFolderIcon() {
  const namespace = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(namespace, 'svg');
  const path = document.createElementNS(namespace, 'path');

  icon.classList.add('ui-editor-folder__icon');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('viewBox', '0 0 16 16');
  path.setAttribute(
    'd',
    'M1.5 3.5h4.75l1.5 1.75h6.75v7.25h-13z',
  );
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('stroke-width', '1.25');
  icon.append(path);
  return icon;
}

function createLibraryEntry({ disabled = false, id, kind, label }) {
  const button = document.createElement('button');
  button.className = 'ui-editor-library-entry';
  button.type = 'button';
  button.dataset.editorLibraryEntry = id;
  button.dataset.libraryKind = kind;
  button.disabled = disabled;
  button.setAttribute('aria-pressed', 'false');
  button.textContent = label;
  return button;
}
