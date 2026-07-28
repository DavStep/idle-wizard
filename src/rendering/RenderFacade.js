import { PixiAccountLinkChoiceController } from './pixi/global/gates/PixiAccountLinkChoiceController.js';
import { PixiAccountLinkChoiceView } from './pixi/global/gates/PixiAccountLinkChoiceView.js';
import { PixiDeployRefreshController } from './pixi/global/gates/PixiDeployRefreshController.js';
import { PixiDeployRefreshView } from './pixi/global/gates/PixiDeployRefreshView.js';
import { PixiFreshStartChoiceController } from './pixi/global/gates/PixiFreshStartChoiceController.js';
import { PixiFreshStartChoiceView } from './pixi/global/gates/PixiFreshStartChoiceView.js';
import { PixiOnlineGateController } from './pixi/global/gates/PixiOnlineGateController.js';
import { PixiOnlineGateView } from './pixi/global/gates/PixiOnlineGateView.js';
import { PixiBottomPanelView } from './pixi/global/chrome/PixiBottomPanelView.js';
import { PixiTopPanelView } from './pixi/global/chrome/PixiTopPanelView.js';
import { PixiWorldChatView } from './pixi/global/chrome/PixiWorldChatView.js';
import { PixiInputRouter } from './pixi/input/PixiInputRouter.js';
import { PixiApplicationManager } from './pixi/runtime/PixiApplicationManager.js';
import { PixiUiRuntimeFacade } from './pixi/runtime/PixiUiRuntimeFacade.js';
import { SpineRuntimeFacade } from './spine/SpineRuntimeFacade.js';
import { TextEntryService } from './textEntry/TextEntryService.js';
import { RenderLoopManager } from './managers/RenderLoopManager.js';

/**
 * The production rendering composition root.
 *
 * A legacy-manager compatibility path remains for isolated unit tests while
 * production always supplies the single canvas and therefore owns exactly one
 * retained Pixi application.
 */
export class RenderFacade {
  static explain =
    'Owns the one always-ready Pixi application and every retained production UI surface.';

  constructor({
    canvas = null,
    hapticsFacade = null,
    uiClickSoundFacade = null,
    beforeDeployReload = null,
    applicationManager = null,
    inputRouter = null,
    textEntryService = null,
    uiRuntime = null,
    onlineGateManager = null,
    accountLinkChoiceManager = null,
    freshStartChoiceManager = null,
    deployRefreshManager = null,
    // Compatibility-only injected managers. Production never creates these.
    canvasManager = null,
    fpsDisplayManager = null,
    renderLoopManager = new RenderLoopManager(),
    showFpsDisplay = false,
    spineRuntimeFacade = null,
    pixiProgressOverlayManager = null,
  } = {}) {
    this.canvas = canvas;
    this.production = Boolean(canvas || applicationManager || uiRuntime);
    this.renderLoopManager = renderLoopManager;
    this.showFpsDisplay = Boolean(showFpsDisplay);
    this.fpsDisplayManager = fpsDisplayManager;
    this.legacyCanvasManager = canvasManager;
    this.legacyProgressOverlayManager = pixiProgressOverlayManager;
    this.spineRuntimeFacade = spineRuntimeFacade;
    this.uiClickSoundFacade = uiClickSoundFacade;
    this.initialized = false;
    this.destroyed = false;
    this.initializePromise = null;

    if (!this.production) {
      return;
    }

    if (!this.canvas && applicationManager?.canvas) {
      this.canvas = applicationManager.canvas;
    }
    if (!this.canvas) {
      throw new Error('RenderFacade requires the one production canvas.');
    }

    this.applicationManager =
      applicationManager ?? new PixiApplicationManager({ canvas: this.canvas });
    this.inputRouter =
      inputRouter ??
      new PixiInputRouter({
        hapticsFacade,
        uiClickSoundFacade,
      });
    this.textEntryService =
      textEntryService ?? new TextEntryService({ canvas: this.canvas });
    this.uiRuntime =
      uiRuntime ??
      new PixiUiRuntimeFacade({
        applicationManager: this.applicationManager,
        inputRouter: this.inputRouter,
        textEntryService: this.textEntryService,
      });
    this.spineRuntimeFacade ??= new SpineRuntimeFacade({
      whenPixiReady: () => this.whenPixiReady(),
      getLayers: () => this.getPixiLayers(),
    });

    this.onlineGateManager =
      onlineGateManager ?? new PixiOnlineGateController();
    this.accountLinkChoiceManager =
      accountLinkChoiceManager ?? new PixiAccountLinkChoiceController();
    this.freshStartChoiceManager =
      freshStartChoiceManager ?? new PixiFreshStartChoiceController();
    this.deployRefreshManager =
      deployRefreshManager ??
      new PixiDeployRefreshController({
        beforeReload: beforeDeployReload,
      });

    this.registerCoreSurfaces();
  }

  registerCoreSurfaces() {
    this.uiRuntime
      .registerGlobalSurface('gate.online', (context) =>
        this.onlineGateManager.attach(
          new PixiOnlineGateView({
            assets: context.assets,
            inputRouter: context.inputRouter,
            application: context.application,
          }),
        ),
      )
      .registerGlobalSurface('gate.accountLinkChoice', (context) =>
        this.accountLinkChoiceManager.attach(
          new PixiAccountLinkChoiceView({
            assets: context.assets,
            inputRouter: context.inputRouter,
          }),
        ),
      )
      .registerGlobalSurface('gate.freshStartChoice', (context) =>
        this.freshStartChoiceManager.attach(
          new PixiFreshStartChoiceView({
            assets: context.assets,
            inputRouter: context.inputRouter,
            playOpenSound: () =>
              this.uiClickSoundFacade?.playClick?.(),
          }),
        ),
      )
      .registerGlobalSurface('gate.deployRefresh', (context) =>
        this.deployRefreshManager.attach(
          new PixiDeployRefreshView({
            assets: context.assets,
            inputRouter: context.inputRouter,
          }),
        ),
      )
      .registerGlobalSurface('chrome.top', (context) =>
        new PixiTopPanelView({
          assets: context.assets,
          inputRouter: context.inputRouter,
          semanticRegistry: context.semanticRegistry,
        }),
      )
      .registerGlobalSurface('chrome.bottom', (context) =>
        new PixiBottomPanelView({
          assets: context.assets,
          inputRouter: context.inputRouter,
          semanticRegistry: context.semanticRegistry,
          counters: context.counters,
          isUnlockAnimationBlocked: () =>
            context
              .dialogRegistry()
              ?.isOpen?.('global.announcement') === true,
        }),
      )
      .registerGlobalSurface('chrome.chat', (context) =>
        new PixiWorldChatView({
          assets: context.assets,
          inputRouter: context.inputRouter,
        }),
      );
  }

  registerPage(pageId, factory) {
    this.requireProductionRuntime();
    this.uiRuntime.registerPage(pageId, factory);
    return this;
  }

  registerDialog(dialogId, factory) {
    this.requireProductionRuntime();
    this.uiRuntime.registerDialog(dialogId, factory);
    return this;
  }

  registerGlobalSurface(surfaceId, factory) {
    this.requireProductionRuntime();
    this.uiRuntime.registerGlobalSurface(surfaceId, factory);
    return this;
  }

  initialize({ playerFacade = null } = {}) {
    if (!this.production) {
      return Promise.resolve(this);
    }
    if (this.initializePromise) {
      return this.initializePromise;
    }
    this.initializePromise = this.uiRuntime
      .initialize({ playerFacade })
      .then(() => {
        this.initialized = true;
        return this;
      });
    return this.initializePromise;
  }

  mount(stage = null) {
    if (this.production) {
      return this.canvas;
    }

    this.legacyCanvasManager?.mount?.(stage);
    this.legacyProgressOverlayManager?.mount?.(stage);
    if (this.showFpsDisplay) {
      this.fpsDisplayManager?.mount?.(stage);
    }
    return this.legacyCanvasManager?.getCanvas?.() ?? null;
  }

  unmount() {
    if (this.production) {
      return false;
    }

    if (this.showFpsDisplay) {
      this.fpsDisplayManager?.unmount?.();
    }
    this.legacyProgressOverlayManager?.unmount?.();
    this.legacyCanvasManager?.unmount?.();
    return true;
  }

  destroy() {
    if (this.destroyed) {
      return false;
    }
    this.destroyed = true;
    this.stopFrameLoop();
    if (this.production) {
      this.uiRuntime.destroy();
      this.initialized = false;
      return true;
    }
    return this.unmount();
  }

  startFrameLoop(onFrame) {
    if (this.showFpsDisplay) {
      this.fpsDisplayManager?.reset?.();
    }
    this.renderLoopManager?.start?.((frame) => {
      if (this.showFpsDisplay) {
        this.fpsDisplayManager?.update?.(frame);
      }
      onFrame?.(frame);
    });
  }

  stopFrameLoop() {
    this.renderLoopManager?.stop?.();
    if (this.showFpsDisplay) {
      this.fpsDisplayManager?.reset?.();
    }
  }

  getCanvas() {
    return this.production
      ? this.canvas
      : this.legacyCanvasManager?.getCanvas?.() ?? null;
  }

  getPixiApp() {
    return this.production
      ? this.applicationManager.getApplication()
      : this.legacyCanvasManager?.getPixiApp?.() ?? null;
  }

  getPixiLayers() {
    return this.production
      ? this.applicationManager.getLayers()
      : this.legacyCanvasManager?.getPixiLayers?.() ?? null;
  }

  getPixiProgressOverlayManager() {
    return this.production ? null : this.legacyProgressOverlayManager;
  }

  whenPixiReady() {
    return this.production
      ? this.initializePromise ?? this.initialize()
      : this.legacyCanvasManager?.whenReady?.() ?? Promise.resolve(null);
  }

  getSpineRuntime() {
    return this.spineRuntimeFacade ?? null;
  }

  getUiRuntime() {
    return this.uiRuntime ?? null;
  }

  getInputRouter() {
    return this.inputRouter ?? null;
  }

  getTextEntryService() {
    return this.textEntryService ?? null;
  }

  getOnlineGateManager() {
    return this.onlineGateManager ?? null;
  }

  getAccountLinkChoiceManager() {
    return this.accountLinkChoiceManager ?? null;
  }

  getFreshStartChoiceManager() {
    return this.freshStartChoiceManager ?? null;
  }

  getDeployRefreshManager() {
    return this.deployRefreshManager ?? null;
  }

  isAlwaysReady() {
    return this.production;
  }

  requireProductionRuntime() {
    if (!this.production || !this.uiRuntime) {
      throw new Error('Retained Pixi surfaces require the production runtime.');
    }
  }
}
