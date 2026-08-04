const LIBRARY_ROOT_ID = 'library';
const ASSET_ROOT_ID = 'assets';
const ASSET_FOLDER_PREFIX = 'asset-folder:';
const ENTRY_FOLDER_PREFIX = 'entry-folder:';

export const UI_EDITOR_LIBRARY_FOLDERS = [
  {
    children: ['assets', 'widgets', 'dialogs', 'scenes'],
    id: LIBRARY_ROOT_ID,
    label: 'Library',
  },
  {
    id: ASSET_ROOT_ID,
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
    this.entryFolderIds = new Map();
    this.entryFilter = '';
    this.foldersById = createBaseFolderMap();
    this.folderHistory = [LIBRARY_ROOT_ID];
    this.folderHistoryIndex = 0;
    this.unusedAssetIds = new Set();
    this.refs = null;

    this.handleBodyClick = (event) => this.onBodyClick(event);
    this.handleFilterInput = (event) => this.onFilterInput(event);
    this.handleHeaderClick = (event) => this.onHeaderClick(event);
    this.handleKeyDown = (event) => this.onKeyDown(event);
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
    header.addEventListener('input', this.handleFilterInput);
    window.addEventListener('keydown', this.handleKeyDown);

    this.refs = {
      body,
      breadcrumb,
      entryButtons: new Map(),
      folderButtons: new Map(),
      filterInput: null,
      filterStatus: null,
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

    this.disposeEntryThumbnails();
    this.refs.body.removeEventListener('click', this.handleBodyClick);
    this.refs.header.removeEventListener('click', this.handleHeaderClick);
    this.refs.header.removeEventListener('input', this.handleFilterInput);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.refs.header.textContent = 'Bottom panel';
    this.refs.body.replaceChildren();
    this.refs = null;
    this.entriesById.clear();
    this.entryFolderIds.clear();
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

  onFilterInput(event) {
    const input = event.target.closest('[data-editor-library-filter]');

    if (!input || !this.refs.header.contains(input)) {
      return;
    }

    this.entryFilter = input.value;
    this.applyEntryFilter();
  }

  onKeyDown(event) {
    const direction = resolveFolderHistoryDirection(event);

    if (!direction || shouldPreserveEditorKeyHandling(event.target)) {
      return;
    }

    event.preventDefault();

    if (direction < 0) {
      this.goBack({ focusFirst: true });
    } else {
      this.goForward({ focusFirst: true });
    }
  }

  openFolder(
    folderId,
    { focusFirst = false, recordHistory = true } = {},
  ) {
    if (!this.refs || !this.foldersById.has(folderId)) {
      return false;
    }

    if (recordHistory && folderId !== this.currentFolderId) {
      this.recordFolderVisit(folderId);
    }

    this.currentFolderId = folderId;
    this.renderCurrentFolder();

    this.focusFirstFolderControl(focusFirst);

    return true;
  }

  goBack(options) {
    return this.navigateFolderHistory(-1, options);
  }

  goForward(options) {
    return this.navigateFolderHistory(1, options);
  }

  navigateFolderHistory(direction, { focusFirst = false } = {}) {
    let targetIndex = this.folderHistoryIndex + direction;

    while (
      targetIndex >= 0
      && targetIndex < this.folderHistory.length
    ) {
      const folderId = this.folderHistory[targetIndex];

      if (
        folderId !== this.currentFolderId
        && this.openFolder(folderId, {
          focusFirst,
          recordHistory: false,
        })
      ) {
        this.folderHistoryIndex = targetIndex;
        return true;
      }

      targetIndex += direction;
    }

    return false;
  }

  recordFolderVisit(folderId) {
    this.folderHistory.splice(this.folderHistoryIndex + 1);
    this.folderHistory.push(folderId);
    this.folderHistoryIndex = this.folderHistory.length - 1;
  }

  focusFirstFolderControl(shouldFocus) {
    if (!shouldFocus) {
      return;
    }

    this.refs.viewport
      .querySelector('button:not(:disabled)')
      ?.focus();
  }

  openEntryFolder(entryId, options) {
    const folderId = this.entryFolderIds.get(entryId);

    return folderId ? this.openFolder(folderId, options) : false;
  }

  setEntries(entries) {
    this.entries = entries;

    if (this.refs) {
      this.renderEntries();
    }
  }

  setUnusedAssetIds(assetIds) {
    this.unusedAssetIds = new Set(
      Array.isArray(assetIds) ? assetIds : [],
    );
    this.updateAssetUsageBadges();
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

  getWorkspaceState() {
    return {
      currentFolderId: this.currentFolderId,
      selectedEntryId: this.selectedEntryId,
    };
  }

  restoreWorkspaceState(state) {
    if (!state || typeof state !== 'object') {
      return false;
    }

    const folderRestored = this.openFolder(state.currentFolderId, {
      recordHistory: false,
    });

    if (folderRestored) {
      this.folderHistory = [this.currentFolderId];
      this.folderHistoryIndex = 0;
    }

    const selectionRestored =
      typeof state.selectedEntryId === 'string'
        ? this.selectEntry(state.selectedEntryId)
        : false;

    return folderRestored || selectionRestored;
  }

  renderEntries() {
    this.disposeEntryThumbnails();
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

    this.rebuildFolderIndex();

    if (!this.foldersById.has(this.currentFolderId)) {
      this.currentFolderId = LIBRARY_ROOT_ID;
    }

    this.reconcileFolderHistory();

    if (!this.entriesById.has(this.selectedEntryId)) {
      this.selectedEntryId = null;
    }

    this.renderCurrentFolder();
    this.updateEntrySelection();
    this.updateAssetUsageBadges();
  }

  renderCurrentFolder() {
    const folder = this.foldersById.get(this.currentFolderId);
    const viewport = document.createElement('div');

    this.disconnectEntryThumbnails();
    viewport.className = 'ui-editor-folder-browser';
    viewport.dataset.editorLibraryFolderView = folder.id;
    this.refs.folderButtons.clear();
    this.refs.filterInput = null;
    this.refs.filterStatus = null;
    this.refs.breadcrumb.replaceChildren(
      ...createBreadcrumbItems(folder, this.foldersById),
    );
    this.refs.header.replaceChildren(this.refs.breadcrumb);

    if (folder.sectionId === 'assets') {
      const filter = createEntryFilter(this.entryFilter);

      this.refs.filterInput = filter.input;
      this.refs.filterStatus = filter.status;
      this.refs.header.append(filter.root);
    }

    if (folder.children?.length) {
      viewport.append(this.createFolderGrid(folder.children));
    }

    if (folder.sectionId || !folder.children?.length) {
      viewport.append(this.createEntryList(folder));
    }

    this.refs.body.replaceChildren(viewport);
    this.refs.viewport = viewport;
    this.applyEntryFilter();
    if (!this.refs.filterInput) {
      this.connectVisibleEntryThumbnails();
    }
  }

  applyEntryFilter() {
    if (!this.refs?.viewport || !this.refs.filterInput) {
      return;
    }

    const query = this.entryFilter.trim().toLocaleLowerCase();
    const folder = this.foldersById.get(this.currentFolderId);
    const folderGrid = this.refs.viewport.querySelector(
      '.ui-editor-folder-grid',
    );
    const oldList = this.refs.viewport.querySelector(
      '.ui-editor-library-entry-list',
    );
    const list = this.createEntryList(folder, {
      includeDescendants: Boolean(query),
    });
    const items = [
      ...list.children,
    ];
    let visibleCount = 0;

    for (const item of items) {
      const button = item.querySelector('[data-editor-library-entry]');
      const entry = this.entriesById.get(
        button?.dataset.editorLibraryEntry,
      );
      const haystack = `${entry?.label ?? ''} ${entry?.assetId ?? ''}`
        .toLocaleLowerCase();
      const visible = !query || haystack.includes(query);

      item.hidden = !visible;
      visibleCount += visible ? 1 : 0;
    }

    oldList?.replaceWith(list);

    if (folderGrid) {
      folderGrid.hidden = Boolean(query);
    }

    const assetCount = this.getEntriesForFolder(folder, {
      includeDescendants: true,
    }).length;
    this.refs.filterStatus.textContent = query
      ? `${visibleCount} of ${assetCount} assets`
      : `${assetCount} assets`;
    list.setAttribute('data-filter-empty', String(visibleCount === 0));
    this.connectVisibleEntryThumbnails();
  }

  createFolderGrid(folderIds) {
    const list = document.createElement('ul');
    list.className = 'ui-editor-folder-grid';
    list.setAttribute('aria-label', 'Folders');

    for (const folderId of folderIds) {
      const folder = this.foldersById.get(folderId);
      const item = document.createElement('li');
      const button = createFolderButton(folder);

      this.refs.folderButtons.set(folder.id, button);
      item.append(button);
      list.append(item);
    }

    return list;
  }

  createEntryList(folder, { includeDescendants = false } = {}) {
    const list = document.createElement('ul');
    const entryIds = [];
    let hasThumbnails = false;

    list.className = 'ui-editor-library-entry-list';
    list.dataset.editorLibrarySectionContent = folder.sectionId;
    list.setAttribute('aria-label', `${folder.label} contents`);

    for (const [entryId] of this.getEntriesForFolder(folder, {
      includeDescendants,
    })) {
      const item = document.createElement('li');
      const button = this.refs.entryButtons.get(entryId);

      hasThumbnails ||= button.dataset.hasThumbnail === 'true';
      item.append(button);
      list.append(item);
      entryIds.push(entryId);
    }

    list.dataset.empty = String(entryIds.length === 0);
    list.dataset.layout = hasThumbnails ? 'gallery' : 'list';
    return list;
  }

  getEntriesForFolder(folder, { includeDescendants = false } = {}) {
    const entries = [];

    for (const [entryId, entry] of this.entriesById) {
      if (entry.sectionId !== folder.sectionId) {
        continue;
      }

      const entryFolderId =
        this.entryFolderIds.get(entryId) ?? folder.id;
      const belongs = includeDescendants
        ? isFolderDescendantOf(
            entryFolderId,
            folder.id,
            this.foldersById,
          )
        : entryFolderId === folder.id;

      if (belongs) {
        entries.push([entryId, entry]);
      }
    }

    return entries;
  }

  rebuildFolderIndex() {
    this.foldersById = createBaseFolderMap();
    this.entryFolderIds.clear();

    for (const entry of this.entriesById.values()) {
      let parentId = entry.sectionId === 'assets'
        ? ASSET_ROOT_ID
        : entry.sectionId;
      const path = [];

      for (const segment of normalizeFolderPath(entry.folderPath)) {
        path.push(segment);
        const folderId = createEntryFolderId(entry.sectionId, path);

        if (!this.foldersById.has(folderId)) {
          this.foldersById.set(folderId, {
            children: [],
            id: folderId,
            label: formatAssetFolderLabel(segment),
            parentId,
            sectionId: entry.sectionId,
          });
        }

        addFolderChild(this.foldersById, parentId, folderId);
        parentId = folderId;
      }

      this.entryFolderIds.set(entry.id, parentId);
    }

    for (const folder of this.foldersById.values()) {
      if (
        folder.id !== ASSET_ROOT_ID
        && !folder.id.startsWith(ASSET_FOLDER_PREFIX)
        && !folder.id.startsWith(ENTRY_FOLDER_PREFIX)
      ) {
        continue;
      }

      folder.children?.sort((leftId, rightId) =>
        this.foldersById
          .get(leftId)
          .label.localeCompare(this.foldersById.get(rightId).label),
      );
    }
  }

  reconcileFolderHistory() {
    const previous = this.folderHistory
      .slice(0, this.folderHistoryIndex + 1)
      .filter((folderId) => this.foldersById.has(folderId));
    const forward = this.folderHistory
      .slice(this.folderHistoryIndex + 1)
      .filter((folderId) => this.foldersById.has(folderId));

    if (previous.at(-1) !== this.currentFolderId) {
      previous.push(this.currentFolderId);
      forward.length = 0;
    }

    this.folderHistory = [...previous, ...forward];
    this.folderHistoryIndex = previous.length - 1;
  }

  connectVisibleEntryThumbnails() {
    for (const thumbnail of this.refs.viewport.querySelectorAll(
      '[data-editor-library-thumbnail]',
    )) {
      thumbnail.uiEditorThumbnailConnect?.();
    }
  }

  disconnectEntryThumbnails() {
    for (const button of this.refs?.entryButtons?.values() ?? []) {
      button
        .querySelector('[data-editor-library-thumbnail]')
        ?.uiEditorThumbnailDisconnect?.();
    }
  }

  disposeEntryThumbnails() {
    this.disconnectEntryThumbnails();
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

  updateAssetUsageBadges() {
    if (!this.refs) {
      return;
    }

    for (const [entryId, button] of this.refs.entryButtons) {
      const entry = this.entriesById.get(entryId);
      const unused = this.unusedAssetIds.has(entry?.assetId);

      button
        .querySelector('[data-editor-library-thumbnail]')
        ?.uiEditorSetUnused?.(unused);
      button.toggleAttribute('data-asset-unused', unused);
      if (unused) {
        button.setAttribute('aria-label', `${entry.label}, unused asset`);
      } else {
        button.removeAttribute('aria-label');
      }
    }
  }
}

function createBreadcrumb() {
  const breadcrumb = document.createElement('nav');
  breadcrumb.className = 'ui-editor-folder-path';
  breadcrumb.setAttribute('aria-label', 'Library path');
  return breadcrumb;
}

function createEntryFilter(value) {
  const root = document.createElement('div');
  const input = document.createElement('input');
  const status = document.createElement('span');

  root.className = 'ui-editor-library-filter';
  input.className = 'ui-editor-library-filter__input';
  input.type = 'search';
  input.value = value;
  input.placeholder = 'Filter by name or path';
  input.setAttribute('aria-label', 'Filter assets');
  input.dataset.editorLibraryFilter = 'assets';
  status.className = 'ui-editor-library-filter__status';
  status.setAttribute('aria-live', 'polite');
  root.append(status, input);
  return { input, root, status };
}

function createBreadcrumbItems(folder, foldersById) {
  const path = resolveFolderPath(folder, foldersById);
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

function resolveFolderPath(folder, foldersById) {
  const path = [];
  let cursor = folder;

  while (cursor) {
    path.unshift(cursor);
    cursor = cursor.parentId ? foldersById.get(cursor.parentId) : null;
  }

  return path;
}

function createBaseFolderMap() {
  return new Map(
    UI_EDITOR_LIBRARY_FOLDERS.map((folder) => [
      folder.id,
      {
        ...folder,
        ...(folder.children ? { children: [...folder.children] } : {}),
      },
    ]),
  );
}

function addFolderChild(foldersById, parentId, childId) {
  const parent = foldersById.get(parentId);

  if (!parent.children) {
    parent.children = [];
  }

  if (!parent.children.includes(childId)) {
    parent.children.push(childId);
  }
}

function createAssetFolderId(path) {
  return `${ASSET_FOLDER_PREFIX}${path
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;
}

function createEntryFolderId(sectionId, path) {
  if (sectionId === 'assets') {
    return createAssetFolderId(path);
  }
  return `${ENTRY_FOLDER_PREFIX}${encodeURIComponent(sectionId)}:${path
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;
}

function normalizeFolderPath(folderPath) {
  return Array.isArray(folderPath)
    ? folderPath
        .map((segment) => String(segment ?? '').trim())
        .filter(Boolean)
    : [];
}

function formatAssetFolderLabel(segment) {
  const normalized = String(segment ?? '').trim().toLocaleLowerCase();

  if (normalized === 'ui') {
    return 'UI';
  }

  return normalized
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toLocaleUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function isFolderDescendantOf(folderId, ancestorId, foldersById) {
  let cursor = foldersById.get(folderId);

  while (cursor) {
    if (cursor.id === ancestorId) {
      return true;
    }
    cursor = cursor.parentId ? foldersById.get(cursor.parentId) : null;
  }

  return false;
}

function resolveFolderHistoryDirection(event) {
  if (event.defaultPrevented || event.isComposing) {
    return 0;
  }

  if (
    event.metaKey
    && !event.ctrlKey
    && !event.altKey
    && !event.shiftKey
  ) {
    if (event.key === '[') {
      return -1;
    }

    if (event.key === ']') {
      return 1;
    }
  }

  if (
    event.altKey
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
  ) {
    if (event.key === 'ArrowLeft') {
      return -1;
    }

    if (event.key === 'ArrowRight') {
      return 1;
    }
  }

  if (
    !event.metaKey
    && !event.ctrlKey
    && !event.altKey
    && !event.shiftKey
  ) {
    if (event.key === 'BrowserBack') {
      return -1;
    }

    if (event.key === 'BrowserForward') {
      return 1;
    }
  }

  return 0;
}

function shouldPreserveEditorKeyHandling(target) {
  return target?.nodeType === 1
    && Boolean(
      target.closest(
        'input, textarea, select, [contenteditable="true"], dialog[open]',
      ),
    );
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

function createLibraryEntry({
  createThumbnail,
  disabled = false,
  id,
  kind,
  label,
}) {
  const button = document.createElement('button');
  const text = document.createElement('span');

  button.className = 'ui-editor-library-entry';
  button.type = 'button';
  button.dataset.editorLibraryEntry = id;
  button.dataset.libraryKind = kind;
  button.disabled = disabled;
  button.setAttribute('aria-pressed', 'false');
  text.className = 'ui-editor-library-entry__label';
  text.textContent = label;

  if (typeof createThumbnail === 'function') {
    const thumbnail = createThumbnail();

    if (thumbnail?.nodeType === 1) {
      button.dataset.hasThumbnail = 'true';
      button.append(thumbnail);
    }
  }

  button.append(text);
  return button;
}
