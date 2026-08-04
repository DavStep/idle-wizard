import { Container } from 'pixi.js';

import {
  DialogRegistry,
  PageRegistry,
  RetainedUiCounters,
  RetainedViewLifecycle,
  SemanticTargetRegistry,
} from '../retained/index.js';
import { PixiAssetManager } from '../assets/PixiAssetManager.js';
import { PixiThemeManager } from '../theme/PixiThemeManager.js';
import { QuestCompletionMotionCoordinator } from '../managers/QuestCompletionMotionCoordinator.js';

/**
 * Production retained-mode composition root. Registration happens before
 * initialize(); pages and global surfaces are then built exactly once, while
 * dialogs are wrapped in lazy factories and built at most once.
 */
export class PixiUiRuntimeFacade {
  static explain =
    'Builds and retains every Pixi page, global surface, dialog, target, and pooled widget behind one canvas.';

  constructor({
    applicationManager,
    assetManager = new PixiAssetManager(),
    themeManager = new PixiThemeManager(),
    inputRouter = null,
    textEntryService = null,
    uiClickSoundFacade = null,
    counters = new RetainedUiCounters(),
    semanticRegistry = null,
    questCompletionMotionCoordinator = new QuestCompletionMotionCoordinator(),
  } = {}) {
    if (!applicationManager) {
      throw new Error('PixiUiRuntimeFacade requires a PixiApplicationManager.');
    }
    this.applicationManager = applicationManager;
    this.assetManager = assetManager;
    this.themeManager = themeManager;
    this.inputRouter = inputRouter;
    this.textEntryService = textEntryService;
    this.uiClickSoundFacade = uiClickSoundFacade;
    this.counters = counters;
    this.semanticRegistry =
      semanticRegistry ?? new SemanticTargetRegistry({ counters });
    this.questCompletionMotionCoordinator = questCompletionMotionCoordinator;
    this.pageFactories = new Map();
    this.dialogFactories = new Map();
    this.globalFactories = new Map();
    this.pageRegistry = null;
    this.dialogRegistry = null;
    this.globalViews = new Map();
    this.viewAttachments = new Map();
    this.playerFacade = null;
    this.initialized = false;
    this.destroyed = false;
    this.initializePromise = null;
    this.themeUnsubscribe = null;
    this.projectionUnsubscribe = null;
    this.textEntryUnsubscribe = null;
    this.textEntryActiveUnsubscribe = null;
  }

  registerPage(pageId, factory) {
    this.assertRegistrationOpen('page');
    validateFactoryRegistration(this.pageFactories, pageId, factory, 'Page');
    return this;
  }

  registerDialog(dialogId, factory) {
    this.assertRegistrationOpen('dialog');
    validateFactoryRegistration(this.dialogFactories, dialogId, factory, 'Dialog');
    return this;
  }

  registerGlobalSurface(surfaceId, factory) {
    this.assertRegistrationOpen('global surface');
    validateFactoryRegistration(this.globalFactories, surfaceId, factory, 'Global surface');
    return this;
  }

  initialize({ playerFacade = null } = {}) {
    if (this.initializePromise) {
      return this.initializePromise;
    }
    this.playerFacade = playerFacade;
    this.initializePromise = this.performInitialize();
    return this.initializePromise;
  }

  async performInitialize() {
    this.assertUsable('initialize');
    await this.applicationManager.initialize();
    this.inputRouter?.mount?.({
      root: this.applicationManager.getApplication().stage,
      canvas: this.applicationManager.canvas,
    });
    await this.assetManager.loadAll();

    // The registry must exist before page construction. Page factories register
    // their owned dialogs while building their one retained display tree.
    this.dialogRegistry = new DialogRegistry({
      counters: this.counters,
      onOpen: () => this.uiClickSoundFacade?.playDialogOpen?.(),
    });
    for (const [dialogId, factory] of this.dialogFactories) {
      this.dialogRegistry.register(dialogId, () => {
        const view = factory(this.createFactoryContext());
        this.attachViewRoots(view, {
          defaultLayer: this.applicationManager.getLayers().dialogs,
          logicalDialog: true,
        });
        return view;
      });
    }

    const context = this.createFactoryContext();
    const pages = [...this.pageFactories].map(([pageId, factory]) => {
      const view = factory(context);
      this.attachViewRoots(view, {
        defaultLayer: this.applicationManager.getLayers().pageUi,
      });
      return [pageId, view];
    });
    this.pageRegistry = new PageRegistry({
      pages,
      counters: this.counters,
    });

    for (const [surfaceId, factory] of this.globalFactories) {
      const view = factory(context);
      this.attachViewRoots(view, {
        defaultLayer: this.applicationManager.getLayers().globalChrome,
      });
      this.globalViews.set(
        surfaceId,
        new RetainedViewLifecycle(view, {
          label: `global surface "${surfaceId}"`,
          counters: this.counters,
        }),
      );
    }

    this.themeManager.mount(this.playerFacade);
    this.themeUnsubscribe = this.themeManager.subscribe(
      (theme) => this.applyTheme(theme),
      { emitCurrent: true },
    );
    this.projectionUnsubscribe = this.applicationManager.subscribeProjection(
      (projection) => this.layout(projection),
      { emitCurrent: true },
    );
    this.textEntryUnsubscribe =
      this.textEntryService?.subscribeKeyboardInset?.(
        (keyboardInset) => this.setKeyboardMetrics({ keyboardInset }),
        { emitCurrent: false },
      ) ?? null;
    this.textEntryActiveUnsubscribe =
      this.textEntryService?.subscribeActiveState?.(
        (active) => this.applicationManager.setTextEntryActive(active),
        { emitCurrent: true },
      ) ?? null;

    for (const lifecycle of this.globalViews.values()) {
      lifecycle.activate();
    }
    this.initialized = true;
    return this;
  }

  createFactoryContext() {
    return Object.freeze({
      application: this.applicationManager.getApplication(),
      layers: this.applicationManager.getLayers(),
      assets: this.assetManager,
      inputRouter: this.inputRouter,
      textEntryService: this.textEntryService,
      semanticRegistry: this.semanticRegistry,
      questCompletionMotionCoordinator: this.questCompletionMotionCoordinator,
      counters: this.counters,
      dialogRegistry: () => this.dialogRegistry,
      theme: () => this.themeManager.getSnapshot(),
      projection: () => this.applicationManager.getProjection(),
    });
  }

  attachViewRoots(view, { defaultLayer, logicalDialog = false }) {
    const root = view?.getRoot?.() ?? view?.root;
    if (!root) {
      throw new Error('Retained Pixi views must expose root or getRoot().');
    }

    const preferredLayer =
      view?.preferredLayer &&
      this.applicationManager.getLayers()[view.preferredLayer];
    const targetLayer = preferredLayer ?? defaultLayer;

    if (logicalDialog) {
      const wrapper = new Container();
      wrapper.label = `${root.label || 'dialog'}:runtimeStack`;
      wrapper.eventMode = 'passive';
      wrapper.visible = false;
      const source = new Container();
      source.label = `${root.label || 'dialog'}:sourceProjection`;
      source.eventMode = 'passive';
      if (view.backdropRoot) {
        wrapper.addChild(view.backdropRoot);
      }
      source.addChild(root);
      wrapper.addChild(source);
      targetLayer.addChild(wrapper);
      this.viewAttachments.set(view, { wrapper, source });
      this.projectDialogAttachment({ wrapper, source });
    } else {
      targetLayer.addChild(root);
      this.viewAttachments.set(view, { wrapper: root, source: null });
    }

    if (view.worldRoot) {
      this.applicationManager.getLayers().pageWorlds.addChild(view.worldRoot);
    }
  }

  bindPage(pageId, viewModel) {
    this.assertReady('bind pages');
    return this.pageRegistry.bind(pageId, viewModel);
  }

  bindGlobalSurface(surfaceId, viewModel) {
    this.assertReady('bind global surfaces');
    const lifecycle = this.globalViews.get(surfaceId);
    if (!lifecycle) {
      throw new Error(`Unknown global surface: ${surfaceId}`);
    }
    return lifecycle.bind(viewModel);
  }

  activatePage(pageId) {
    this.assertReady('activate pages');
    return this.pageRegistry.activate(pageId);
  }

  deactivatePage() {
    this.assertReady('deactivate pages');
    return this.pageRegistry.deactivate();
  }

  getPage(pageId) {
    this.assertReady('access pages');
    return this.pageRegistry.get(pageId);
  }

  getGlobalSurface(surfaceId) {
    this.assertReady('access global surfaces');
    const lifecycle = this.globalViews.get(surfaceId);
    if (!lifecycle) {
      throw new Error(`Unknown global surface: ${surfaceId}`);
    }
    return lifecycle.getView();
  }

  openDialog(dialogId, viewModel) {
    this.assertReady('open dialogs');
    const view = this.dialogRegistry.open(dialogId, viewModel);
    const attachment = this.viewAttachments.get(view);
    if (attachment) {
      attachment.wrapper.visible = true;
      attachment.wrapper.parent?.addChild(attachment.wrapper);
    }
    return view;
  }

  closeDialog(dialogId) {
    this.assertReady('close dialogs');
    const view = this.dialogRegistry.get(dialogId);
    const closed = this.dialogRegistry.close(dialogId);
    if (closed) {
      const attachment = this.viewAttachments.get(view);
      if (attachment) {
        attachment.wrapper.visible = false;
      }
    }
    return closed;
  }

  closeTopDialog() {
    this.assertReady('close dialogs');
    const dialogId = this.dialogRegistry.getTopDialogId();
    return dialogId === null ? false : this.closeDialog(dialogId);
  }

  closeAllDialogs() {
    this.assertReady('close dialogs');
    return this.dialogRegistry.closeAll();
  }

  getOpenDialogIds() {
    this.assertReady('access dialogs');
    return this.dialogRegistry.getOpenDialogIds();
  }

  getDialogIds() {
    if (this.dialogRegistry) {
      return this.dialogRegistry.getDialogIds();
    }

    return Object.freeze([...this.dialogFactories.keys()]);
  }

  applyTheme(theme) {
    this.applicationManager.applyTheme(theme);
    this.pageRegistry?.applyTheme(theme);
    this.dialogRegistry?.applyTheme(theme);
    for (const lifecycle of this.globalViews.values()) {
      lifecycle.applyTheme(theme);
    }
  }

  layout(projection) {
    this.pageRegistry?.layout(projection);
    this.dialogRegistry?.layout(projection);
    for (const lifecycle of this.globalViews.values()) {
      lifecycle.layout(projection);
    }
    for (const attachment of this.viewAttachments.values()) {
      this.projectDialogAttachment(attachment, projection);
    }
  }

  projectDialogAttachment(
    attachment,
    projection = this.applicationManager.getProjection(),
  ) {
    if (!attachment?.source || !projection) {
      return;
    }
    attachment.source.position.set(projection.authoredOffsetX, 0);
    attachment.source.scale.set(projection.sourceScale);
  }

  setKeyboardMetrics(metrics) {
    return this.applicationManager.setKeyboardMetrics(metrics);
  }

  getStats() {
    return Object.freeze({
      initialized: this.initialized,
      pages: this.pageRegistry?.getStats() ?? null,
      dialogs: this.dialogRegistry?.getStats() ?? null,
      globalSurfaces: this.globalViews.size,
      semanticTargets: this.semanticRegistry.getStats(),
      counters: this.counters.snapshot(),
    });
  }

  destroy() {
    if (this.destroyed) {
      return false;
    }
    this.destroyed = true;
    const errors = [];
    this.themeUnsubscribe?.();
    this.themeUnsubscribe = null;
    this.projectionUnsubscribe?.();
    this.projectionUnsubscribe = null;
    this.textEntryUnsubscribe?.();
    this.textEntryUnsubscribe = null;
    this.textEntryActiveUnsubscribe?.();
    this.textEntryActiveUnsubscribe = null;

    for (const lifecycle of this.globalViews.values()) {
      try {
        lifecycle.destroy();
      } catch (error) {
        errors.push(error);
      }
    }
    this.globalViews.clear();
    this.viewAttachments.clear();
    for (const destroyable of [
      this.dialogRegistry,
      this.pageRegistry,
      this.questCompletionMotionCoordinator,
      this.semanticRegistry,
      this.inputRouter,
      this.textEntryService,
      this.themeManager,
      this.assetManager,
      this.applicationManager,
    ]) {
      try {
        destroyable?.destroy?.();
      } catch (error) {
        errors.push(error);
      }
    }
    this.dialogRegistry = null;
    this.pageRegistry = null;
    this.questCompletionMotionCoordinator = null;
    this.initialized = false;
    if (errors.length === 1) {
      throw errors[0];
    }
    if (errors.length > 1) {
      throw new AggregateError(errors, 'Pixi runtime shutdown failed.');
    }
    return true;
  }

  assertRegistrationOpen(kind) {
    this.assertUsable(`register ${kind}s`);
    if (this.initializePromise) {
      throw new Error(`Cannot register ${kind}s after Pixi initialization starts.`);
    }
  }

  assertReady(action) {
    this.assertUsable(action);
    if (!this.initialized) {
      throw new Error(`Cannot ${action} before Pixi initialization completes.`);
    }
  }

  assertUsable(action) {
    if (this.destroyed) {
      throw new Error(`Cannot ${action} after the Pixi runtime is destroyed.`);
    }
  }
}

function validateFactoryRegistration(registry, id, factory, label) {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new TypeError(`${label} ids must be non-empty strings.`);
  }
  if (typeof factory !== 'function') {
    throw new TypeError(`${label} "${id}" requires a factory.`);
  }
  if (registry.has(id)) {
    throw new Error(`${label} "${id}" is already registered.`);
  }
  registry.set(id, factory);
}
