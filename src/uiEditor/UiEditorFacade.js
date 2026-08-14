import { UiEditorBottomPanelManager } from './managers/UiEditorBottomPanelManager.js';
import { UiEditorHierarchyManager } from './managers/UiEditorHierarchyManager.js';
import { UiEditorPanelLayoutManager } from './managers/UiEditorPanelLayoutManager.js';
import { UiEditorUsageManager } from './managers/UiEditorUsageManager.js';
import { UiEditorViewManager } from './managers/UiEditorViewManager.js';
import { UiEditorWorkspaceManager } from './managers/UiEditorWorkspaceManager.js';
import {
  inspectUiEditorAssetUsage,
} from './widgets/UiEditorAssetDeletionDialog.js';

/**
 * Creates the editor shell and keeps its docked panels sized around the preview.
 */
export class UiEditorFacade {
  constructor({
    inspectAssetUsage = inspectUiEditorAssetUsage,
    libraryEntries = [],
    root,
    storage = resolveStorage(),
  }) {
    this.viewManager = new UiEditorViewManager({ root });
    this.libraryEntries = libraryEntries;
    this.inspectAssetUsage = inspectAssetUsage;
    this.storage = storage;
    this.layoutManager = null;
    this.bottomPanelManager = null;
    this.hierarchyManager = null;
    this.usageManager = null;
    this.workspaceManager = null;
    this.previewCleanup = null;
    this.assetUsageRequestId = 0;
    this.activeLibraryEntry = null;
  }

  mount() {
    const refs = this.viewManager.mount();

    this.hierarchyManager = new UiEditorHierarchyManager({
      onOpenComponent: (entryId) =>
        this.openLibraryComponent(entryId),
      onSelectComponent: (component, element) =>
        this.showHierarchySelection(component, element),
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
    void this.refreshAssetUsageBadges();

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

    const candidate = entry.createPreview({
        assetEntries: this.libraryEntries.filter(
          ({ kind }) => kind === 'asset',
        ),
        onAssetDeleted: (deletion) =>
          this.handleAssetDeleted(deletion),
        onInspectAtlasFrame: (frame) => {
          if (frame) {
            this.usageManager?.showAtlasFrame(entry, frame);
          } else {
            this.usageManager?.showEntry(
              entry,
              this.viewManager.refs?.preview.firstElementChild,
            );
          }
        },
      });
    const opened = this.openPreview(candidate);

    if (opened) {
      this.activeLibraryEntry = entry;
      this.usageManager?.showEntry(
        entry,
        this.viewManager.refs?.preview.firstElementChild,
      );
      if (entry.kind === 'widget') {
        this.hierarchyManager?.selectRootComponent();
      }
    }

    return opened;
  }

  openLibraryComponent(entryId) {
    const entry = this.libraryEntries.find(
      (candidate) =>
        candidate.id === entryId || candidate.integrationId === entryId,
    );

    if (!entry) {
      return false;
    }

    this.bottomPanelManager?.openEntryFolder(entry.id);
    return this.bottomPanelManager?.selectEntry(entry.id) ?? false;
  }

  handleAssetDeleted({ entry, replacementEntry }) {
    const nextEntries = this.libraryEntries.filter(
      ({ id }) => id !== entry?.id,
    );

    this.clearPreview();
    this.setLibraryEntries(nextEntries);
    void this.refreshAssetUsageBadges();

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
      this.activeLibraryEntry = selectedEntry;
      this.usageManager?.showEntry(
        selectedEntry,
        this.viewManager.refs?.preview.firstElementChild,
      );
    } else {
      this.activeLibraryEntry = null;
      this.usageManager?.clear();
    }
  }

  showHierarchySelection(component, element) {
    if (component) {
      return this.usageManager?.showComponent(component) ?? false;
    }

    if (
      element
      && element === this.viewManager.refs?.preview.firstElementChild
      && this.activeLibraryEntry
    ) {
      return this.usageManager?.showEntry(
        this.activeLibraryEntry,
        element,
      ) ?? false;
    }

    this.usageManager?.clear();
    return false;
  }

  async refreshAssetUsageBadges() {
    const requestId = ++this.assetUsageRequestId;
    const assetIds = this.libraryEntries
      .filter(
        ({ assetId, kind }) =>
          kind === 'asset'
          && assetId?.startsWith('source:assets/'),
      )
      .map(({ assetId }) => assetId);

    if (assetIds.length === 0) {
      this.bottomPanelManager?.setUnusedAssetIds([]);
      return;
    }

    try {
      const result = await this.inspectAssetUsage(assetIds);
      if (requestId !== this.assetUsageRequestId) {
        return;
      }
      this.bottomPanelManager?.setUnusedAssetIds(
        result?.unusedAssetIds,
      );
    } catch {
      // The catalogue remains usable when the local development route is absent.
    }
  }

  clearPreview() {
    this.previewCleanup?.();
    this.previewCleanup = null;
    this.activeLibraryEntry = null;
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
    this.assetUsageRequestId += 1;
    this.previewCleanup?.();
    this.previewCleanup = null;
    this.activeLibraryEntry = null;
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
