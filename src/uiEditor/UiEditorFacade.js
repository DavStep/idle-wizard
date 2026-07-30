import { UiEditorBottomPanelManager } from './managers/UiEditorBottomPanelManager.js';
import { UiEditorHierarchyManager } from './managers/UiEditorHierarchyManager.js';
import { UiEditorPanelLayoutManager } from './managers/UiEditorPanelLayoutManager.js';
import { UiEditorViewManager } from './managers/UiEditorViewManager.js';

/**
 * Creates the editor shell and keeps its docked panels sized around the preview.
 */
export class UiEditorFacade {
  constructor({ libraryEntries = [], root }) {
    this.viewManager = new UiEditorViewManager({ root });
    this.libraryEntries = libraryEntries;
    this.layoutManager = null;
    this.bottomPanelManager = null;
    this.hierarchyManager = null;
    this.previewCleanup = null;
  }

  mount() {
    const refs = this.viewManager.mount();

    this.hierarchyManager = new UiEditorHierarchyManager({
      panel: refs.panels.left,
      scene: refs.preview,
    });
    this.hierarchyManager.mount();

    this.bottomPanelManager = new UiEditorBottomPanelManager({
      entries: this.libraryEntries,
      onSelectEntry: (entry) => this.selectLibraryEntry(entry),
      panel: refs.panels.bottom,
    });
    this.bottomPanelManager.mount();

    this.layoutManager = new UiEditorPanelLayoutManager(refs);
    this.layoutManager.mount();
  }

  openPreview(component) {
    const preview = this.viewManager.refs?.preview;

    if (!preview || component?.nodeType !== 1) {
      return false;
    }

    this.previewCleanup?.();
    this.previewCleanup =
      typeof component.uiEditorDispose === 'function'
        ? component.uiEditorDispose
        : null;
    preview.replaceChildren(component);
    this.hierarchyManager?.refresh();
    return true;
  }

  selectLibraryEntry(entry) {
    if (typeof entry?.createPreview !== 'function') {
      return false;
    }

    return this.openPreview(entry.createPreview());
  }

  setLibraryEntries(entries) {
    this.libraryEntries = entries;
    this.bottomPanelManager?.setEntries(entries);
  }

  clearPreview() {
    this.previewCleanup?.();
    this.previewCleanup = null;
    this.viewManager.refs?.preview.replaceChildren();
    this.bottomPanelManager?.clearSelection();
    this.hierarchyManager?.refresh();
  }

  unmount() {
    this.previewCleanup?.();
    this.previewCleanup = null;
    this.layoutManager?.unmount();
    this.layoutManager = null;
    this.bottomPanelManager?.unmount();
    this.bottomPanelManager = null;
    this.hierarchyManager?.unmount();
    this.hierarchyManager = null;
    this.viewManager.unmount();
  }
}
