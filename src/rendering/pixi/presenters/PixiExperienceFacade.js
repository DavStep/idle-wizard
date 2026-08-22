import { FirstRunIntroProgressManager } from '../../../pages/intro/managers/FirstRunIntroProgressManager.js';
import { TutorialGuideDragManager } from '../../../pages/tutorial/managers/TutorialGuideDragManager.js';
import { TutorialLogicManager } from '../../../pages/tutorial/managers/TutorialLogicManager.js';
import { TutorialProgressManager } from '../../../pages/tutorial/managers/TutorialProgressManager.js';
import { TutorialSaleManager } from '../../../pages/tutorial/managers/TutorialSaleManager.js';
import {
  TUTORIAL_STEP_IDS,
  TutorialStepManager,
  getTutorialStepGraph,
  resolveTutorialStepId,
} from '../../../pages/tutorial/managers/TutorialStepManager.js';
import {
  createFirstRunIntroPixiPresenter,
  createFirstRunIntroPixiView,
} from '../global/intro/index.js';
import {
  createPixiRewardEventConsumer,
  createPixiTransientEffectsLayer,
  createRewardFlyoutPresentation,
} from '../global/transient/index.js';
import {
  createTutorialPixiOverlay,
  createTutorialPixiViewModel,
  resolveSemanticTutorialTarget,
} from '../global/tutorial/index.js';
import { isRewardEventForPage } from '../../../pages/shared/rewardEventPage.js';

export const PIXI_EXPERIENCE_SURFACE_IDS = Object.freeze({
  intro: 'experience.firstRunIntro',
  tutorial: 'experience.tutorial',
  transient: 'experience.transient',
});

const TUTORIAL_DIALOG_POLL_MS = 100;
const FIRST_RUN_INTRO_MODAL_PRIORITY = 100;
const SETTINGS_DIALOG_IDS = new Set([
  'settings',
  'global.settings',
  'top.settings',
  'player.settings',
]);
const PAGE_DIALOG_PREFIXES = Object.freeze([
  'workshop.',
  'garden.',
  'brewing.',
  'shop.',
  'research.',
  'guild.',
  'prestige.',
]);
const TARGET_DIALOG_PREFIXES = Object.freeze([
  Object.freeze(['top:username', [...SETTINGS_DIALOG_IDS]]),
  Object.freeze(['top:settings', [...SETTINGS_DIALOG_IDS]]),
  Object.freeze(['garden:seed:', ['garden.seed']]),
  Object.freeze(['brewing:recipe:', ['brewing.recipes']]),
  Object.freeze(['shop:sell:', ['shop.stall']]),
]);
const POPUP_CLASS_DIALOG_IDS = Object.freeze({
  'room-top-panel__settings': [...SETTINGS_DIALOG_IDS],
  'garden-page__seed-popup': ['garden.seed'],
  'brewing-page__recipes-popup': ['brewing.recipes'],
  'shop-page__sell-popup': ['shop.stall'],
});

const DEFAULT_FACTORIES = Object.freeze({
  createIntroView: (options) => createFirstRunIntroPixiView(options),
  createIntroPresenter: (options) =>
    createFirstRunIntroPixiPresenter(options),
  createTutorialOverlay: (options) =>
    createTutorialPixiOverlay(options),
  createTransientEffects: (options) =>
    createPixiTransientEffectsLayer(options),
  createRewardConsumer: (options) =>
    createPixiRewardEventConsumer(options),
});

/**
 * Renderer-owned coordinator for first-run, tutorial, and reward feedback.
 *
 * Gameplay snapshots and the existing tutorial managers remain authoritative.
 * This facade replaces their former DOM projection with retained Pixi views,
 * semantic targets, and runtime dialog state.
 */
export class PixiExperienceFacade {
  static explain =
    'Runs the opening story, optional Elara guidance, and reward feedback through retained Pixi surfaces.';

  constructor({
    renderFacade,
    gameplayFacade = null,
    uiClickSoundFacade = null,
    storage,
    getCurrentPageId = () => 'workshop',
    onFirstRunIntroComplete = null,
    onNotificationVisibilityPolicyChange = null,
    presentRewardEvent = defaultRewardPresenter,
    now = () => Date.now(),
    setTimeoutFn = (callback, delay) =>
      globalThis.setTimeout(callback, delay),
    clearTimeoutFn = (handle) => globalThis.clearTimeout(handle),
    firstRunProgressManager = null,
    tutorialProgressManager = null,
    tutorialStepManager = null,
    tutorialLogicManager = null,
    tutorialSaleManager = null,
    tutorialGuideDragManager = null,
    factories = null,
  } = {}) {
    if (!renderFacade) {
      throw new Error(
        'PixiExperienceFacade requires the production RenderFacade.',
      );
    }
    if (typeof presentRewardEvent !== 'function') {
      throw new TypeError(
        'PixiExperienceFacade requires presentRewardEvent(event).',
      );
    }

    this.renderFacade = renderFacade;
    this.gameplayFacade = gameplayFacade;
    this.uiClickSoundFacade = uiClickSoundFacade;
    this.getCurrentPageId =
      typeof getCurrentPageId === 'function'
        ? getCurrentPageId
        : () => 'workshop';
    this.onFirstRunIntroComplete =
      typeof onFirstRunIntroComplete === 'function'
        ? onFirstRunIntroComplete
        : null;
    this.notificationPolicyCallback =
      typeof onNotificationVisibilityPolicyChange === 'function'
        ? onNotificationVisibilityPolicyChange
        : null;
    this.presentRewardEvent = presentRewardEvent;
    this.getNow = typeof now === 'function' ? now : () => Date.now();
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.factories = {
      ...DEFAULT_FACTORIES,
      ...(factories ?? {}),
    };

    this.firstRunProgressManager =
      firstRunProgressManager ??
      new FirstRunIntroProgressManager({ storage });
    this.tutorialProgressManager =
      tutorialProgressManager ??
      new TutorialProgressManager({ storage });
    this.tutorialStepManager =
      tutorialStepManager ??
      new TutorialStepManager({
        progressManager: this.tutorialProgressManager,
        getCurrentPageId: () => this.getCurrentPageId(),
      });
    this.tutorialLogicManager =
      tutorialLogicManager ??
      new TutorialLogicManager({
        progressManager: this.tutorialProgressManager,
        getCurrentPageId: () => this.getCurrentPageId(),
        now: this.getNow,
        stepManager: this.tutorialStepManager,
      });
    this.tutorialSaleManager =
      tutorialSaleManager ?? new TutorialSaleManager();
    this.tutorialGuideDragManager =
      tutorialGuideDragManager ??
      new TutorialGuideDragManager({ storage });

    this.runtime = null;
    this.semanticRegistry = null;
    this.introView = null;
    this.introPresenter = null;
    this.tutorialOverlay = null;
    this.transientEffects = null;
    this.rewardEventConsumer = null;
    this.tutorialRuntimeState = null;
    this.tutorialDomState = null;
    this.activeTutorialStep = null;
    this.requestedTargetGuidanceStepId = null;
    this.introInProgress = false;
    this.introModalHandle = null;
    this.introAttempted = false;
    this.mounted = false;
    this.registered = false;
    this.refreshing = false;
    this.refreshQueued = false;
    this.tutorialRefreshTimeout = null;
    this.unsubscribers = [];
    this.notificationPolicy = null;
    this.notificationPolicyKey = '';
    this.notificationPolicyListeners = new Set();

    this.tutorialActions = Object.freeze({
      advance: () => this.advanceTutorial(),
      objectivePress: (detail) =>
        this.pressTutorialObjective(detail),
      lessonPanelClose: () => this.handleLessonPanelClose(),
      guideMoved: (placement) =>
        this.tutorialGuideDragManager.setPlacement(placement),
      applyNotificationPolicy: (policy) =>
        this.publishNotificationPolicy(policy),
    });

    this.registerSurfaces();
  }

  registerSurfaces() {
    if (this.registered) {
      return false;
    }

    this.renderFacade
      .registerGlobalSurface(
        PIXI_EXPERIENCE_SURFACE_IDS.intro,
        (context) => this.createIntroSurface(context),
      )
      .registerGlobalSurface(
        PIXI_EXPERIENCE_SURFACE_IDS.tutorial,
        (context) => this.createTutorialSurface(context),
      )
      .registerGlobalSurface(
        PIXI_EXPERIENCE_SURFACE_IDS.transient,
        (context) => this.createTransientSurface(context),
      );
    this.registered = true;
    return true;
  }

  createIntroSurface(context) {
    const view = this.factories.createIntroView({
      assets: context.assets,
      inputRouter: context.inputRouter,
      application: context.application,
      theme: context.theme?.(),
    });
    view.preferredLayer = 'interactionLocks';
    this.introView = view;
    this.introPresenter = this.factories.createIntroPresenter({ view });
    return view;
  }

  createTutorialSurface(context) {
    this.semanticRegistry = context.semanticRegistry;
    const view = this.factories.createTutorialOverlay({
      assets: context.assets,
      inputRouter: context.inputRouter,
      semanticRegistry: context.semanticRegistry,
      spineRuntime: this.renderFacade.getSpineRuntime?.(),
      application: context.application,
      theme: context.theme?.(),
    });
    view.preferredLayer = 'tutorial';
    this.tutorialOverlay = view;
    return view;
  }

  createTransientSurface(context) {
    this.semanticRegistry ??= context.semanticRegistry;
    const view = this.factories.createTransientEffects({
      assets: context.assets,
      semanticRegistry: context.semanticRegistry,
      application: context.application,
      counters: context.counters,
      theme: context.theme?.(),
    });
    view.preferredLayer = 'transient';
    this.transientEffects = view;
    this.rewardEventConsumer = this.factories.createRewardConsumer({
      effects: view,
      presentRewardEvent: (event) => this.presentVisibleRewardEvent(event),
    });
    return view;
  }

  mount() {
    if (this.mounted) {
      return false;
    }

    this.runtime = this.requireRuntime();
    this.introView = this.runtime.getGlobalSurface(
      PIXI_EXPERIENCE_SURFACE_IDS.intro,
    );
    this.tutorialOverlay = this.runtime.getGlobalSurface(
      PIXI_EXPERIENCE_SURFACE_IDS.tutorial,
    );
    this.transientEffects = this.runtime.getGlobalSurface(
      PIXI_EXPERIENCE_SURFACE_IDS.transient,
    );
    this.semanticRegistry ??= this.runtime.semanticRegistry;
    this.introPresenter ??= this.factories.createIntroPresenter({
      view: this.introView,
    });
    this.rewardEventConsumer ??= this.factories.createRewardConsumer({
      effects: this.transientEffects,
      presentRewardEvent: (event) => this.presentVisibleRewardEvent(event),
    });

    this.tutorialRuntimeState = new PixiTutorialRuntimeState({
      runtime: this.runtime,
      semanticRegistry: this.semanticRegistry,
      isIntroOpen: () => this.introInProgress,
    });
    this.tutorialDomState =
      this.tutorialRuntimeState.createManagerState();
    this.tutorialOverlay.setGuidePlacement?.(
      this.tutorialGuideDragManager.getPlacement(),
    );

    this.mounted = true;
    this.trackSubscription(
      this.gameplayFacade?.subscribe?.(() => this.refresh()),
    );
    this.trackSubscription(
      this.gameplayFacade?.subscribeFrameResources?.(() =>
        this.refresh(),
      ),
    );
    this.rewardEventConsumer.mount?.(this.gameplayFacade);
    this.refresh();
    return true;
  }

  presentVisibleRewardEvent(event) {
    if (!isRewardEventForPage(event, this.getCurrentPageId())) {
      return null;
    }

    if (event?.type === 'item_sold') {
      this.runtime?.getPage?.('shop')?.playStallSaleEffect?.(
        event.slotNumber,
      );
    }

    const presentation = this.presentRewardEvent(event);
    if (
      isItemCompletionEvent(event) &&
      hasItemDrops(presentation)
    ) {
      this.uiClickSoundFacade?.playSummon?.(1);
    }
    return presentation;
  }

  onPageChanged() {
    this.transientEffects?.clear?.();
  }

  unmount() {
    if (!this.mounted) {
      return false;
    }

    this.mounted = false;
    this.cancelTutorialRefresh();
    for (const unsubscribe of this.unsubscribers.splice(0).reverse()) {
      unsubscribe?.();
    }
    this.rewardEventConsumer?.unmount?.();
    this.releaseIntroModal();
    this.introPresenter?.hide?.();
    this.introInProgress = false;
    this.introAttempted = false;
    this.activeTutorialStep = null;
    this.requestedTargetGuidanceStepId = null;
    this.tutorialSaleManager.cancel();
    this.tutorialOverlay?.bind?.({ kind: 'hidden' });
    this.publishNotificationPolicy(null);
    this.tutorialRuntimeState = null;
    this.tutorialDomState = null;
    this.runtime = null;
    return true;
  }

  refresh() {
    if (!this.mounted) {
      return false;
    }
    if (this.refreshing) {
      this.refreshQueued = true;
      return false;
    }

    this.refreshing = true;
    try {
      do {
        this.refreshQueued = false;
        this.refreshNow();
      } while (this.refreshQueued && this.mounted);
    } finally {
      this.refreshing = false;
    }
    return true;
  }

  refreshNow() {
    const snapshot = this.gameplayFacade?.getSnapshot?.() ?? {};
    this.syncFirstRunIntro(snapshot);
    const lessonPanelOpen =
      this.tutorialOverlay?.isLessonPanelOpen?.() ?? false;
    const viewState = this.tutorialLogicManager.getViewState({
      snapshot,
      dom: this.tutorialDomState,
      targetResolver: (targetId) => this.resolveTarget(targetId),
      lessonPanelOpen,
      requestedTargetGuidanceStepId:
        this.requestedTargetGuidanceStepId,
      now: this.getNow(),
    });
    this.syncRequestedTargetGuidance(viewState, lessonPanelOpen);
    this.activeTutorialStep = viewState.step ?? null;

    const notificationPolicy =
      this.getNotificationVisibilityPolicy(viewState);
    this.publishNotificationPolicy(notificationPolicy);

    if (viewState.kind === 'lesson') {
      this.tutorialSaleManager.update({
        step: viewState.step,
      });
    } else {
      this.tutorialSaleManager.cancel();
    }

    this.tutorialOverlay.bind(
      createTutorialPixiViewModel(
        {
          ...viewState,
          notificationPolicy,
        },
        { actions: this.tutorialActions },
      ),
    );
    this.scheduleTutorialRefresh(viewState);
  }

  syncFirstRunIntro(snapshot) {
    if (
      this.introAttempted ||
      !this.firstRunProgressManager.isPending()
    ) {
      return false;
    }
    if (!isFreshIntroSnapshot(snapshot)) {
      this.firstRunProgressManager.markComplete();
      this.introAttempted = true;
      return false;
    }

    this.introAttempted = true;
    this.introInProgress = true;
    this.installIntroModal();
    this.introPresenter.show({
      onComplete: () => this.completeFirstRunIntro(),
    });
    return true;
  }

  completeFirstRunIntro() {
    if (!this.introInProgress) {
      return false;
    }
    this.firstRunProgressManager.markComplete();
    this.introInProgress = false;
    this.releaseIntroModal();
    this.onFirstRunIntroComplete?.({ shown: true });
    this.refresh();
    return true;
  }

  installIntroModal() {
    if (this.introModalHandle) {
      return;
    }
    this.introModalHandle =
      this.renderFacade.getInputRouter?.()?.pushModal?.({
        id: PIXI_EXPERIENCE_SURFACE_IDS.intro,
        root: this.introView?.root,
        priority: FIRST_RUN_INTRO_MODAL_PRIORITY,
        onBack: () => true,
        onEscape: () => true,
        autoFocus: true,
      }) ?? null;
  }

  releaseIntroModal() {
    this.introModalHandle?.unregister?.();
    this.introModalHandle = null;
  }

  advanceTutorial() {
    const step = this.activeTutorialStep;
    if (!step || !this.tutorialLogicManager.advanceActiveStep()) {
      return false;
    }

    this.requestedTargetGuidanceStepId = null;
    this.tutorialSaleManager.cancel();
    this.refresh();
    return true;
  }

  pressTutorialObjective({ source = 'lesson-panel' } = {}) {
    const step = this.activeTutorialStep;
    if (!step) {
      return false;
    }

    const target = this.resolveTarget(step.targetId);

    if (!target) {
      return false;
    }
    this.requestedTargetGuidanceStepId = step.id;
    this.tutorialLogicManager.reminderManager?.discardActivePrompt?.();
    if (source === 'show-me') {
      this.tutorialRuntimeState?.emphasizeTarget?.(target);
    }
    this.refresh();
    return true;
  }

  handleLessonPanelClose() {
    this.requestedTargetGuidanceStepId = null;
    this.refresh();
    return true;
  }

  resolveTarget(targetId) {
    return resolveSemanticTutorialTarget(
      this.semanticRegistry,
      targetId,
    );
  }

  scheduleTutorialRefresh(viewState) {
    this.cancelTutorialRefresh();
    if (!this.mounted) {
      return;
    }

    const now = this.getNow();
    const candidates = [];
    if (Number.isFinite(viewState?.nextRefreshAt)) {
      candidates.push(viewState.nextRefreshAt);
    }
    if (
      viewState?.kind === 'lesson' ||
      viewState?.kind === 'blocked'
    ) {
      candidates.push(now + TUTORIAL_DIALOG_POLL_MS);
    }
    if (candidates.length === 0) {
      return;
    }
    const refreshAt = Math.min(...candidates);
    this.tutorialRefreshTimeout = this.setTimeoutFn(() => {
      this.tutorialRefreshTimeout = null;
      this.refresh();
    }, Math.max(0, refreshAt - now));
    this.tutorialRefreshTimeout?.unref?.();
  }

  cancelTutorialRefresh() {
    if (this.tutorialRefreshTimeout === null) {
      return;
    }
    this.clearTimeoutFn(this.tutorialRefreshTimeout);
    this.tutorialRefreshTimeout = null;
  }

  getNotificationVisibilityPolicy(viewState) {
    const step = viewState?.step;
    if (
      viewState?.kind !== 'lesson' ||
      step?.cueMode === 'passive'
    ) {
      return null;
    }
    return {
      active: true,
      allowedTutorialIds: step.targetId
        ? [step.targetId]
        : [],
    };
  }

  publishNotificationPolicy(policy) {
    const normalized =
      policy?.active === true
        ? {
            active: true,
            allowedTutorialIds: [
              ...(policy.allowedTutorialIds ?? []),
            ].filter(Boolean),
          }
        : null;
    const key = normalized
      ? `active:${normalized.allowedTutorialIds.join('|')}`
      : '';
    if (key === this.notificationPolicyKey) {
      return false;
    }
    this.notificationPolicy = normalized;
    this.notificationPolicyKey = key;
    this.notificationPolicyCallback?.(normalized);
    for (const listener of this.notificationPolicyListeners) {
      listener(normalized);
    }
    return true;
  }

  subscribeNotificationPolicy(
    listener,
    { emitCurrent = true } = {},
  ) {
    if (typeof listener !== 'function') {
      throw new TypeError(
        'Notification policy subscription requires a listener.',
      );
    }
    this.notificationPolicyListeners.add(listener);
    if (emitCurrent) {
      listener(this.notificationPolicy);
    }
    return () => this.notificationPolicyListeners.delete(listener);
  }

  resetFirstRunIntroProgress() {
    this.firstRunProgressManager.reset();
    this.introPresenter?.hide?.();
    this.releaseIntroModal();
    this.introInProgress = false;
    this.introAttempted = false;
    if (this.mounted) {
      this.refresh();
    }
    return true;
  }

  showFirstRunIntroPreview({ reducedMotion = false } = {}) {
    if (!this.mounted || !this.introPresenter || !this.introView) {
      return { ok: false, reason: 'pages_not_mounted' };
    }

    this.introPresenter.hide?.();
    this.releaseIntroModal();
    this.introAttempted = true;
    this.introInProgress = true;
    this.installIntroModal();
    this.introPresenter.show({
      reducedMotion: Boolean(reducedMotion),
      onComplete: () => this.completeFirstRunIntroPreview(),
    });
    return { ok: true };
  }

  completeFirstRunIntroPreview() {
    if (!this.introInProgress) {
      return false;
    }
    this.introInProgress = false;
    this.releaseIntroModal();
    this.refresh();
    return true;
  }

  resetTutorialProgress() {
    this.tutorialLogicManager.resetProgress();
    this.tutorialStepManager.activeStepId = null;
    this.activeTutorialStep = null;
    this.requestedTargetGuidanceStepId = null;
    this.tutorialSaleManager.cancel();
    if (this.mounted) {
      this.refresh();
    }
    return true;
  }

  listTutorialStages() {
    const graph = getTutorialStepGraph();
    return {
      ...graph,
      stages: graph.steps.map((step) => step.id),
    };
  }

  setTutorialStage(stageId) {
    const normalizedStageId = String(stageId ?? '').trim();
    if (!normalizedStageId) {
      return {
        ok: false,
        reason: 'invalid_stage_id',
        stageId,
      };
    }

    const lowerStageId = normalizedStageId.toLowerCase();
    if (lowerStageId === 'reset' || lowerStageId === 'start') {
      return this.applyTutorialStage([], 'purchase-house');
    }
    if (lowerStageId === 'complete' || lowerStageId === 'done') {
      return this.applyTutorialStage([...TUTORIAL_STEP_IDS], null);
    }

    const resolvedStageId =
      resolveTutorialStepId(normalizedStageId);
    const stageIndex = resolvedStageId
      ? TUTORIAL_STEP_IDS.indexOf(resolvedStageId)
      : -1;
    if (
      stageIndex < 0 ||
      stageIndex >= TUTORIAL_STEP_IDS.length
    ) {
      return {
        ok: false,
        reason: 'unknown_stage',
        stageId,
        stages: [...TUTORIAL_STEP_IDS],
      };
    }
    return this.applyTutorialStage(
      TUTORIAL_STEP_IDS.slice(0, stageIndex),
      resolvedStageId,
    );
  }

  applyTutorialStage(completedStepIds, activeStageId) {
    this.tutorialProgressManager.setCompletedStepIds(
      completedStepIds,
    );
    this.tutorialLogicManager.activeStep = null;
    this.tutorialLogicManager.clearAutoAdvanceTimer?.();
    this.tutorialLogicManager.reminderManager?.discardActivePrompt?.();
    this.tutorialStepManager.activeStepId = null;
    this.activeTutorialStep = null;
    this.requestedTargetGuidanceStepId = null;
    this.tutorialSaleManager.cancel();
    if (this.mounted) {
      this.refresh();
    }
    return {
      ok: true,
      stage: activeStageId,
      completedStepIds: [...completedStepIds],
    };
  }

  getNpcSellPriceOverride({ item } = {}) {
    return this.tutorialSaleManager.getNpcSellPriceOverride({
      snapshot: this.gameplayFacade?.getSnapshot?.(),
      item,
      itemKey: item?.key,
    });
  }

  getNpcStockBuyQuoteOverride({ item, quantity } = {}) {
    return this.tutorialSaleManager.getNpcStockBuyQuoteOverride({
      snapshot: this.gameplayFacade?.getSnapshot?.(),
      item,
      itemKey: item?.key,
      quantity,
    });
  }

  syncRequestedTargetGuidance(viewState, lessonPanelOpen) {
    if (!this.requestedTargetGuidanceStepId) {
      return;
    }
    if (
      viewState.kind !== 'lesson' ||
      !lessonPanelOpen ||
      viewState.step?.id !==
        this.requestedTargetGuidanceStepId
    ) {
      this.requestedTargetGuidanceStepId = null;
    }
  }

  trackSubscription(unsubscribe) {
    if (typeof unsubscribe === 'function') {
      this.unsubscribers.push(unsubscribe);
    }
  }

  requireRuntime() {
    const runtime = this.renderFacade.getUiRuntime?.();
    if (!runtime?.initialized) {
      throw new Error(
        'PixiExperienceFacade requires RenderFacade.initialize() before mounting.',
      );
    }
    return runtime;
  }
}

/**
 * Renderer-neutral replacement for TutorialTargetManager's DOM snapshot.
 * Every query reads retained view state, runtime dialog IDs, or semantic
 * target snapshots.
 */
export class PixiTutorialRuntimeState {
  constructor({
    runtime,
    semanticRegistry,
    isIntroOpen = () => false,
  } = {}) {
    this.runtime = runtime;
    this.semanticRegistry = semanticRegistry;
    this.isIntroOpen = isIntroOpen;
  }

  createManagerState() {
    return Object.freeze({
      isBlockingDialogOpen: () => this.isBlockingDialogOpen(),
      isNonSettingsBlockingDialogOpen: () =>
        this.isNonSettingsBlockingDialogOpen(),
      isBlockingDialogOpenForStep: (step, target) =>
        this.isBlockingDialogOpenForStep(step, target),
      isUsernameSettingsOpen: () => this.isUsernameSettingsOpen(),
      isSettingsThemeTabVisible: () =>
        this.isSettingsThemeTabVisible(),
      isThemeSettingsTabOpen: () =>
        this.isThemeSettingsTabOpen(),
      isGardenSeedPopupOpen: () =>
        this.isDialogOpen('garden.seed'),
      isBrewingRecipePopupOpen: () =>
        this.isDialogOpen('brewing.recipes'),
      isBrewingHerbInventoryOpen: () =>
        this.isBrewingHerbInventoryOpen(),
      isBrewingRecipeSelected: (recipeKey) =>
        this.isTargetSelected(`brewing:recipe:${recipeKey}`),
      isShopSellPopupOpen: () =>
        this.isDialogOpen('shop.stall'),
      hasShopSellSelection: () => this.hasShopSellSelection(),
      isShopSellQuantitySelected: (quantity) =>
        this.isShopSellQuantitySelected(quantity),
      isShopSellTabSelected: (kind) =>
        this.isTargetSelected(`shop:sell:tab:${kind}`),
      isShopTradersTabSelected: () =>
        this.isTargetSelected('shop:tab:traders'),
      getUsername: () => this.getUsername(),
      isTasksExpanded: () => this.isTasksExpanded(),
      isTasksPinned: () => this.isTasksPinned(),
    });
  }

  getOpenDialogIds() {
    return [
      ...(this.runtime?.getOpenDialogIds?.() ??
        this.runtime?.dialogRegistry?.getOpenDialogIds?.() ??
        []),
    ];
  }

  isDialogOpen(dialogId) {
    return this.getOpenDialogIds().includes(dialogId);
  }

  isBlockingDialogOpen() {
    return this.isIntroOpen() || this.getOpenDialogIds().length > 0;
  }

  isNonSettingsBlockingDialogOpen() {
    if (this.isIntroOpen()) {
      return true;
    }
    return this.getOpenDialogIds().some(
      (dialogId) =>
        !SETTINGS_DIALOG_IDS.has(dialogId) &&
        !PAGE_DIALOG_PREFIXES.some((prefix) =>
          dialogId.startsWith(prefix),
        ),
    );
  }

  isBlockingDialogOpenForStep(step, target) {
    if (this.isIntroOpen()) {
      return true;
    }
    const openDialogIds = this.getOpenDialogIds();
    if (openDialogIds.length === 0) {
      return false;
    }
    const allowed = new Set(
      getAllowedDialogIds(step?.targetId),
    );
    for (const popupClass of step?.allowedPopupClasses ?? []) {
      for (const dialogId of
        POPUP_CLASS_DIALOG_IDS[popupClass] ?? []) {
        allowed.add(dialogId);
      }
    }
    for (const dialogId of openDialogIds) {
      if (
        allowed.has(dialogId) ||
        this.isTargetInsideDialog(target, dialogId)
      ) {
        continue;
      }
      return true;
    }
    return false;
  }

  isTargetInsideDialog(target, dialogId) {
    const dialog =
      this.runtime?.dialogRegistry?.get?.(dialogId) ?? null;
    const root = dialog?.getRoot?.() ?? dialog?.root;
    return isDisplayObjectDescendant(
      target?.displayObject,
      root,
    );
  }

  resolveTarget(targetId) {
    return resolveSemanticTutorialTarget(
      this.semanticRegistry,
      targetId,
    );
  }

  isTargetSelected(targetId) {
    const target = this.resolveTarget(targetId);
    return Boolean(
      target?.state?.selected ??
        target?.displayObject?.selected ??
        target?.displayObject?.model?.selected,
    );
  }

  isUsernameSettingsOpen() {
    return (
      [...SETTINGS_DIALOG_IDS].some((id) => this.isDialogOpen(id)) &&
      Boolean(this.resolveTarget('top:username-input'))
    );
  }

  isSettingsThemeTabVisible() {
    return Boolean(this.resolveTarget('top:settings:theme-tab'));
  }

  isThemeSettingsTabOpen() {
    return this.isTargetSelected('top:settings:theme-tab');
  }

  getUsername() {
    const target = this.resolveTarget('top:username');
    return (
      String(
        target?.displayObject?.text ??
          target?.displayObject?.label?.text ??
          '',
      ).trim() || 'Wizard'
    );
  }

  isBrewingHerbInventoryOpen() {
    const page = this.getPage('brewing');
    return (
      page?.model?.inventory?.activeTab === 'herbs' ||
      this.resolveTarget('brewing:inventory:herbs')?.state
        ?.selected === true
    );
  }

  hasShopSellSelection() {
    const target = this.resolveTarget('shop:sell:percentage');
    return Boolean(
      target?.state?.visible &&
        target?.state?.enabled !== false &&
        target?.state?.interactive !== false,
    );
  }

  isShopSellQuantitySelected(quantity) {
    const target = this.resolveTarget('shop:sell:percentage');
    const value = Number(target?.displayObject?.value);
    return (
      Number.isFinite(value) &&
      Math.round(value) === Math.round(Number(quantity))
    );
  }

  isTasksExpanded() {
    const model = this.getPage('workshop')?.tasks?.model;
    if (!model) {
      return false;
    }
    if (
      model.canToggle !== true &&
      model.showToggle !== true
    ) {
      return true;
    }
    return model.expanded !== false;
  }

  isTasksPinned() {
    const model = this.getPage('workshop')?.tasks?.model;
    if (!model) {
      return false;
    }
    if (model.showPin !== true) {
      return true;
    }
    return model.pinned === true;
  }

  getPage(pageId) {
    try {
      return this.runtime?.getPage?.(pageId) ?? null;
    } catch {
      return null;
    }
  }

  emphasizeTarget(target) {
    const displayObject = target?.displayObject;
    if (!displayObject) {
      return false;
    }
    displayObject.parent?.addChild?.(displayObject);
    return true;
  }
}

function defaultRewardPresenter(event) {
  return createRewardFlyoutPresentation(event);
}

function isItemCompletionEvent(event) {
  return (
    event?.type === 'herb_harvested' ||
    event?.type === 'potion_collected'
  );
}

function hasItemDrops(presentation) {
  const models = Array.isArray(presentation)
    ? presentation
    : presentation
      ? [presentation]
      : [];
  return models.some(
    (model) => Array.isArray(model?.itemDrops) && model.itemDrops.length > 0,
  );
}

function isFreshIntroSnapshot(snapshot = {}) {
  const level = Number(
    snapshot?.tasks?.currentLevel ??
      snapshot?.tasks?.level?.current ??
      1,
  );
  return !Number.isFinite(level) || level <= 1;
}

function getAllowedDialogIds(targetId) {
  const id = String(targetId ?? '');
  const allowed = [];
  for (const [prefix, dialogIds] of TARGET_DIALOG_PREFIXES) {
    if (id === prefix || id.startsWith(prefix)) {
      allowed.push(...dialogIds);
    }
  }
  return allowed;
}

function isDisplayObjectDescendant(displayObject, root) {
  if (!displayObject || !root) {
    return false;
  }
  for (
    let current = displayObject;
    current;
    current = current.parent
  ) {
    if (current === root) {
      return true;
    }
  }
  return false;
}
