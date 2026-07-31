import { UiEditorBottomPanelManager } from './managers/UiEditorBottomPanelManager.js';
import { UiEditorHierarchyManager } from './managers/UiEditorHierarchyManager.js';
import { UiEditorPanelLayoutManager } from './managers/UiEditorPanelLayoutManager.js';
import { UiEditorUsageManager } from './managers/UiEditorUsageManager.js';
import { UiEditorViewManager } from './managers/UiEditorViewManager.js';
import { UiEditorWorkspaceManager } from './managers/UiEditorWorkspaceManager.js';

/**
 * Creates the editor shell and keeps its docked panels sized around the preview.
 */
export class UiEditorFacade {
  constructor({
    libraryEntries = [],
    root,
    storage = resolveStorage(),
  }) {
    this.viewManager = new UiEditorViewManager({ root });
    this.libraryEntries = libraryEntries;
    this.storage = storage;
    this.layoutManager = null;
    this.bottomPanelManager = null;
    this.hierarchyManager = null;
    this.usageManager = null;
    this.workspaceManager = null;
    this.previewCleanup = null;
  }

  mount() {
    const refs = this.viewManager.mount();

    this.hierarchyManager = new UiEditorHierarchyManager({
      onSelectComponent: (component) =>
        this.usageManager?.showComponent(component),
      panel: refs.panels.left,
      scene: refs.preview,
    });
    this.hierarchyManager.mount();

    this.usageManager = new UiEditorUsageManager({
      panel: refs.panels.right,
    });
    this.usageManager.mount();

    this.bottomPanelManager = new UiEditorBottomPanelManager({
      entries: this.libraryEntries,
      onSelectEntry: (entry) => this.selectLibraryEntry(entry),
      panel: refs.panels.bottom,
    });
    this.bottomPanelManager.mount();

    this.layoutManager = new UiEditorPanelLayoutManager(refs);
    this.layoutManager.mount();

    this.workspaceManager = new UiEditorWorkspaceManager({
      createWorkspaceState: () => this.createWorkspaceState(),
      restoreWorkspaceState: (state) => this.restoreWorkspaceState(state),
      storage: this.storage,
      toolbar: refs.toolbar,
    });
    this.workspaceManager.mount();
  }

  openPreview(component) {
    const preview = this.viewManager.refs?.preview;

    if (!preview || component?.nodeType !== 1) {
      return false;
    }

    const currentComponent = preview.firstElementChild;

    if (
      typeof currentComponent?.uiEditorAdoptPreview === 'function' &&
      currentComponent.uiEditorAdoptPreview(component)
    ) {
      this.syncPreviewPanels(currentComponent);
      this.hierarchyManager?.clearSelection();
      this.hierarchyManager?.refresh();
      this.usageManager?.clear();
      return true;
    }

    this.previewCleanup?.();
    this.previewCleanup =
      typeof component.uiEditorDispose === 'function'
        ? component.uiEditorDispose
        : null;
    preview.replaceChildren(component);
    this.syncPreviewPanels(component);
    this.hierarchyManager?.clearSelection();
    this.hierarchyManager?.refresh();
    this.usageManager?.clear();
    return true;
  }

  selectLibraryEntry(entry) {
    if (typeof entry?.createPreview !== 'function') {
      return false;
    }

    const opened = this.openPreview(
      entry.createPreview({
        assetEntries: this.libraryEntries.filter(
          ({ kind }) => kind === 'asset',
        ),
        onAssetDeleted: (deletion) =>
          this.handleAssetDeleted(deletion),
      }),
    );

    if (opened) {
      this.usageManager?.showEntry(entry);
    }

    return opened;
  }

  handleAssetDeleted({ entry, replacementEntry }) {
    const nextEntries = this.libraryEntries.filter(
      ({ id }) => id !== entry?.id,
    );

    this.clearPreview();
    this.setLibraryEntries(nextEntries);

    if (replacementEntry && nextEntries.includes(replacementEntry)) {
      this.bottomPanelManager?.openEntryFolder(replacementEntry.id);
      this.bottomPanelManager?.selectEntry(replacementEntry.id);
    }
  }

  setLibraryEntries(entries) {
    this.libraryEntries = entries;
    this.bottomPanelManager?.setEntries(entries);

    const selectedEntry = entries.find(
      ({ id }) => id === this.bottomPanelManager?.selectedEntryId,
    );

    if (selectedEntry) {
      this.usageManager?.showEntry(selectedEntry);
    } else {
      this.usageManager?.clear();
    }
  }

  clearPreview() {
    this.previewCleanup?.();
    this.previewCleanup = null;
    this.viewManager.refs?.preview.replaceChildren();
    this.syncPreviewPanels(null);
    this.bottomPanelManager?.clearSelection();
    this.hierarchyManager?.refresh();
    this.usageManager?.clear();
  }

  syncPreviewPanels(component) {
    const hierarchyVisible =
      component?.dataset?.uiEditorHierarchy !== 'hidden';
    this.layoutManager?.setPanelVisible('left', hierarchyVisible);
  }

  createWorkspaceState() {
    return {
      hierarchy: this.hierarchyManager?.getWorkspaceState(),
      layout: this.layoutManager?.getWorkspaceState(),
      library: this.bottomPanelManager?.getWorkspaceState(),
    };
  }

  restoreWorkspaceState(state) {
    if (!state || typeof state !== 'object') {
      return false;
    }

    this.layoutManager?.restoreWorkspaceState(state.layout);
    this.bottomPanelManager?.restoreWorkspaceState(state.library);
    this.hierarchyManager?.restoreWorkspaceState(state.hierarchy);
    return true;
  }

  unmount() {
    this.previewCleanup?.();
    this.previewCleanup = null;
    this.workspaceManager?.unmount();
    this.workspaceManager = null;
    this.layoutManager?.unmount();
    this.layoutManager = null;
    this.bottomPanelManager?.unmount();
    this.bottomPanelManager = null;
    this.hierarchyManager?.unmount();
    this.hierarchyManager = null;
    this.usageManager?.unmount();
    this.usageManager = null;
    this.viewManager.unmount();
  }
}

function resolveStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
