import './uiEditor.css';

import savedLayout from './ui-layout-overrides.json';
import { UiEditorInteractionManager } from './managers/UiEditorInteractionManager.js';
import { UiEditorLayoutOverrideManager } from './managers/UiEditorLayoutOverrideManager.js';
import { UiEditorNodeCatalogManager } from './managers/UiEditorNodeCatalogManager.js';
import { UiEditorSaveManager } from './managers/UiEditorSaveManager.js';
import { UiEditorSourceIndexManager } from './managers/UiEditorSourceIndexManager.js';
import { UiEditorViewManager } from './managers/UiEditorViewManager.js';

export class UiEditorFacade {
  static explain =
    'Adds a development-only hierarchy, live layout inspector, prefab preview, and safe code-owned UI overrides around the running game.';

  constructor({ app, target = globalThis, saveManager = new UiEditorSaveManager() } = {}) {
    this.app = app;
    this.target = target;
    this.saveManager = saveManager;
    this.stage = null;
    this.nodeCatalogManager = null;
    this.layoutOverrideManager = null;
    this.sourceIndexManager = null;
    this.viewManager = null;
    this.interactionManager = null;
    this.mutationObserver = null;
    this.refreshFrame = null;
    this.selectedDescriptor = null;
    this.searchQuery = '';
    this.apiName = 'uiEditor';
    this.previousApi = undefined;
    this.hadPreviousApi = false;
  }

  mount() {
    if (this.stage) {
      return;
    }

    this.stage = this.app?.viewportFacade?.getStageElement?.();

    if (!this.stage) {
      throw new Error('UiEditorFacade requires the mounted game stage.');
    }

    this.sourceIndexManager = new UiEditorSourceIndexManager();
    this.nodeCatalogManager = new UiEditorNodeCatalogManager({
      stage: this.stage,
      sourceIndexManager: this.sourceIndexManager,
    });
    this.layoutOverrideManager = new UiEditorLayoutOverrideManager({
      stage: this.stage,
      savedLayout,
    });
    this.viewManager = new UiEditorViewManager({
      onSelect: (selector) => this.select(selector),
      onSearch: (query) => this.setSearchQuery(query),
      onPatch: (patch) => this.patchSelection(patch),
      onReset: () => this.resetSelection(),
      onSave: () => void this.save(),
      onRefresh: () => this.refresh(),
      onModeChange: (mode) => this.setMode(mode),
      onOutlinePointerDown: (event) => this.interactionManager?.startDrag(event),
    });
    this.interactionManager = new UiEditorInteractionManager({
      stage: this.stage,
      getSelectedDescriptor: () => this.selectedDescriptor,
      getSelectedOverride: () => this.getSelectedOverride(),
      onSelectElement: (element) => this.selectElement(element),
      onPatch: (patch) => this.patchSelection(patch),
      onSave: () => void this.save(),
      onModeChange: (mode) => this.viewManager.setMode(mode),
      onFrame: () => this.updateOutline(),
    });

    this.viewManager.mount();
    this.layoutOverrideManager.applyAll();
    this.interactionManager.mount();
    this.observeStage();
    this.installApi();
    this.refresh();
    this.viewManager.setStatus('select an element, or press v to interact with the game');
  }

  unmount() {
    if (!this.stage) {
      return;
    }

    this.mutationObserver?.disconnect();
    this.mutationObserver = null;

    if (this.refreshFrame !== null) {
      window.cancelAnimationFrame(this.refreshFrame);
      this.refreshFrame = null;
    }

    this.interactionManager?.unmount();
    this.viewManager?.unmount();
    this.restoreApi();
    this.stage = null;
    this.nodeCatalogManager = null;
    this.layoutOverrideManager = null;
    this.sourceIndexManager = null;
    this.viewManager = null;
    this.interactionManager = null;
    this.selectedDescriptor = null;
  }

  refresh() {
    if (!this.stage) {
      return;
    }

    this.layoutOverrideManager.applyAll();
    const entries = this.nodeCatalogManager.list({ query: this.searchQuery });
    this.viewManager.renderHierarchy(entries, this.selectedDescriptor?.selector);

    if (this.selectedDescriptor) {
      const element = this.nodeCatalogManager.find(this.selectedDescriptor.selector);

      if (element) {
        this.selectedDescriptor = this.nodeCatalogManager.describe(element);
        this.viewManager.setSelection(
          this.selectedDescriptor,
          this.getSelectedOverride(),
        );
      } else {
        this.selectedDescriptor = null;
        this.viewManager.setSelection(null, {});
      }
    }
  }

  select(selector) {
    const element = this.nodeCatalogManager.find(selector);

    if (element) {
      this.selectElement(element);
    }
  }

  selectElement(element) {
    if (!element || !this.stage.contains(element)) {
      return;
    }

    this.selectedDescriptor = this.nodeCatalogManager.describe(element);
    this.viewManager.setSelection(this.selectedDescriptor, this.getSelectedOverride());
    this.viewManager.renderHierarchy(
      this.nodeCatalogManager.list({ query: this.searchQuery }),
      this.selectedDescriptor.selector,
    );
  }

  patchSelection(patch) {
    const selector = this.selectedDescriptor?.selector;

    if (!selector || selector === ':scope') {
      return;
    }

    const override = this.layoutOverrideManager.update(selector, patch) ?? {};
    const element = this.nodeCatalogManager.find(selector);

    if (element) {
      this.selectedDescriptor = this.nodeCatalogManager.describe(element);
      this.viewManager.setSelection(this.selectedDescriptor, override);
    }

    this.viewManager.setDirty(true);
    this.viewManager.setStatus('unsaved layout changes');
  }

  resetSelection() {
    const selector = this.selectedDescriptor?.selector;

    if (!selector || selector === ':scope') {
      return;
    }

    this.layoutOverrideManager.reset(selector);
    const element = this.nodeCatalogManager.find(selector);

    if (element) {
      this.selectedDescriptor = this.nodeCatalogManager.describe(element);
      this.viewManager.setSelection(this.selectedDescriptor, {});
    }

    this.viewManager.setDirty(true);
    this.viewManager.setStatus('element reset, save to keep the change');
  }

  async save() {
    this.viewManager.setStatus('saving layout…');

    try {
      const result = await this.saveManager.save(this.layoutOverrideManager.serialize());
      this.layoutOverrideManager.markSaved();
      this.viewManager.setDirty(false);
      this.viewManager.setStatus(result.message || 'layout saved to code', 'success');
      return result;
    } catch (error) {
      this.viewManager.setStatus(error.message, 'error');
      return { ok: false, error: error.message };
    }
  }

  setSearchQuery(query) {
    this.searchQuery = String(query ?? '');
    this.viewManager.renderHierarchy(
      this.nodeCatalogManager.list({ query: this.searchQuery }),
      this.selectedDescriptor?.selector,
    );
  }

  setMode(mode) {
    this.interactionManager?.setMode(mode);
    this.stage.dataset.uiEditorMode = mode;
    this.viewManager?.setStatus(
      mode === 'select'
        ? 'select mode: game input is paused'
        : 'interact mode: game controls are active',
    );
  }

  updateOutline() {
    const selector = this.selectedDescriptor?.selector;

    if (!selector) {
      return;
    }

    const element = this.nodeCatalogManager.find(selector);

    if (!element) {
      this.selectedDescriptor = null;
      this.viewManager.setSelection(null, {});
      return;
    }

    this.selectedDescriptor = this.nodeCatalogManager.describe(element);
    this.viewManager.updateOutline(this.selectedDescriptor);
  }

  getSelectedOverride() {
    return this.selectedDescriptor
      ? this.layoutOverrideManager.get(this.selectedDescriptor.selector)
      : {};
  }

  observeStage() {
    this.mutationObserver = new globalThis.MutationObserver(() => this.scheduleRefresh());
    this.mutationObserver.observe(this.stage, {
      childList: true,
      subtree: true,
    });
  }

  scheduleRefresh() {
    if (this.refreshFrame !== null) {
      return;
    }

    this.refreshFrame = window.requestAnimationFrame(() => {
      this.refreshFrame = null;
      this.refresh();
    });
  }

  installApi() {
    if (!this.target) {
      return;
    }

    this.hadPreviousApi = Object.prototype.hasOwnProperty.call(this.target, this.apiName);
    this.previousApi = this.target[this.apiName];
    this.target[this.apiName] = Object.freeze({
      getLayout: () => this.layoutOverrideManager.serialize(),
      refresh: () => this.refresh(),
      save: () => this.save(),
      select: (selector) => this.select(selector),
      setMode: (mode) => this.viewManager.setMode(mode),
    });
  }

  restoreApi() {
    if (!this.target) {
      return;
    }

    if (this.hadPreviousApi) {
      this.target[this.apiName] = this.previousApi;
    } else {
      delete this.target[this.apiName];
    }
  }
}
