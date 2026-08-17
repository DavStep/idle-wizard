import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import { getHerbIconFrameName } from '../../../../assets/items/herbs/herbIcons.js';
import {
  getPotionIconFrameName,
  getPotionLiquidColor,
} from '../../../../assets/items/potions/potionIcons.js';
import {
  getNotificationTone,
  isNotificationActive,
} from '../../../../pages/shared/notificationTone.js';
import { formatRemainingTime } from '../../../../pages/shared/timerDisplay.js';
import { PixiNotificationBadge } from '../../global/transient/PixiNotificationBadges.js';
import { PixiCostButton } from '../../primitives/PixiCostButton.js';
import {
  createTimedProgressWindow,
} from '../../primitives/PixiProgressBar.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  BaseRetainedPixiPage,
  RETAINED_PAGE_GEOMETRY,
  RETAINED_TEXT_STYLES,
  RetainedButton,
  RetainedPanel,
  RetainedTimedProgressBar,
  applyTextTheme,
  createText,
  finiteOr,
  normalizeRows,
  resolveRetainedPageBottomClearance,
  setText,
} from '../workshop/RetainedPageKit.js';
import {
  BrewingAutomationSettingsDialogPixi,
  BrewingHudPixi,
} from './BrewingHudPixi.js';
import {
  BrewingRecipeBookDialogPixi,
  BrewingRecipeChoiceDialogPixi,
} from './BrewingDialogsPixi.js';
import { RootRunInventoryChoiceDialogPixi } from '../shared/RootRunInventoryChoiceDialogPixi.js';
import {
  AMBIENT_FIREFLY_COUNT,
  AmbientFireflyLayer,
} from '../shared/AmbientFireflyLayer.js';

export const BREWING_PIXI_GEOMETRY = Object.freeze({
  worldTop: 88,
  worldBottom: RETAINED_PAGE_GEOMETRY.chatClearance,
  worldWidth: 670,
  worldHeight: 1960,
  worldEdgeExtension: 16,
  worldFitPadding: 16,
  cauldronLeft: 122,
  cauldronTop: 112,
  cauldronRowGap: 172,
  cauldronNodeWidth: 516,
  cauldronBoxWidth: 408,
  cauldronRecipeWidth: 216,
  cauldronArtWidth: 178,
  cauldronBaseHeight: 146,
  cauldronFrameHeight: 48,
  cauldronArtExtraHeight: 38,
  cauldronSideGap: 8,
  actionWidth: 100,
  actionHeight: 28,
  actionGap: 6,
  rowHeight: 20,
  inventoryButtonWidth: 45.5,
  inventoryButtonHeight: 80.25,
  inventoryOpenHeight: 68.25,
  inventoryPanelBottom: 251.25,
});
export const BREWING_FIREFLY_COUNT = AMBIENT_FIREFLY_COUNT;

const BREWING_FIREFLY_FIELD = Object.freeze({
  top: 98,
  bottomInset: 184,
  maxBottom: 620,
});

const BREWING_WORLD_MIN_ZOOM = 0.56;
const BREWING_WORLD_MAX_ZOOM = 1.16;
const BREWING_WORLD_ZOOM_RUBBER_LIMIT = 0.12;
const BREWING_WORLD_PAN_RUBBER_LIMIT = 54;
const BREWING_HERB_DRAG_THRESHOLD = 22;
const BREWING_HERB_PICK_NUDGE_MS = 260;
const BREWING_HERB_COUNT_NUDGE_MS = 140;
const BREWING_HERB_RETURN_MS = 190;
const BREWING_HERB_RETURN_NUDGE_MS = 140;
const BREWING_CAULDRON_DROP_MS = 220;
const BREWING_BREW_DROP_MS = 420;
const BREWING_BREW_DROP_STAGGER_MS = 55;
const BREWING_HUD_BREW_GHOST_SIZE = 30;
const BREWING_LIQUID_VISIBLE_CENTER_Y_RATIO = 91.5 / 486;
const BREWING_CAULDRON_RECEIVE_MS = 205;
const BREWING_RECIPE_RECEIVE_MS = 140;
const BREWING_CAULDRON_BUY_MS = 205;
const BREWING_ITEM_GHOST_SIZE = 72;
const BREWING_ITEM_GHOST_POINTER_LIFT = 60;
const BREWING_ITEM_GHOST_POOL_SIZE = 12;
const BREWING_DIALOG_IDS = Object.freeze({
  recipes: 'brewing.recipes',
  herbs: 'brewing.herbs',
  choice: 'brewing.recipe-choice',
  settings: 'brewing.automation-settings',
});
const BREWING_ASSET_IDS = Object.freeze({
  cauldron:
    'source:assets/rooms/brewing/cauldron/cauldron-empty.png',
  liquidMask:
    'source:assets/rooms/brewing/cauldron/cauldron-liquid-mask.png',
  herbs: 'source:assets/icons/icon-herb-box.png',
  potions: 'source:assets/icons/icon-potion-box.png',
});

/**
 * Retained Brewing room. Its display tree and all router handlers are created
 * once. Gameplay/backend facades remain authoritative and feed formatted view
 * models and actions through bind().
 */
export class BrewingPixiPage extends BaseRetainedPixiPage {
  constructor({
    assetManager = null,
    inputRouter = null,
    semanticTargets = null,
    dialogRegistry = null,
    dialogLayer = null,
    actions = {},
    counters = null,
    ticker = null,
    timeSource = () => Date.now(),
    ambientRequestFrame,
    ambientCancelFrame,
    ambientTimeSource,
    reducedMotion = prefersReducedMotion,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    super({ pageId: 'brewing', semanticTargets, theme });
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.dialogRegistry = dialogRegistry;
    this.dialogLayer = dialogLayer;
    this.actions = actions;
    this.currentActions = actions;
    this.ticker = ticker;
    this.timeSource = timeSource;
    this.reducedMotion =
      typeof reducedMotion === 'function'
        ? reducedMotion
        : () => Boolean(reducedMotion);
    this.active = false;
    this.worldPan = { x: 0, y: 0 };
    this.worldZoom = 1;
    this.worldViewportTouched = false;
    this.panStart = null;
    this.pinchStart = null;
    this.instanceSequence = 0;
    this.tickHandler = () => this.tick(this.timeSource());
    this.boundCauldronState = new Map();
    this.hasBoundCauldronState = false;
    this.activeGhostMotions = new Set();
    this.currentHerbDrag = null;
    this.motionGhostSequence = 0;
    this.selectedCauldronIndex = 0;

    this.fireflies = new AmbientFireflyLayer({
      label: 'brewing',
      field: BREWING_FIREFLY_FIELD,
      phaseOffset: 1.7,
      intensity: 0.78,
      requestFrame: ambientRequestFrame,
      cancelFrame: ambientCancelFrame,
      timeSource: ambientTimeSource,
      reducedMotion: this.reducedMotion,
    });
    this.content.addChild(this.fireflies.root);

    this.worldViewport = new Container({
      label: 'brewing-world-viewport',
    });
    this.worldViewport.eventMode = 'static';
    this.world = new Container({ label: 'brewing-world' });
    this.worldMask = new Graphics({ label: 'brewing-world-mask' });
    this.worldViewport.addChild(this.world, this.worldMask);
    this.world.mask = this.worldMask;
    this.content.addChild(this.worldViewport);

    this.cauldronPool = new WidgetPool({
      name: 'brewing cauldron pool',
      counters,
      create: () =>
        new BrewingCauldronWidget({
          instanceId: ++this.instanceSequence,
          page: this,
          assetManager: this.assetManager,
          inputRouter: this.inputRouter,
          semanticTargets: this.semanticTargets,
          counters,
        }),
      reset: (cauldron) => cauldron.reset(),
      dispose: (cauldron) => cauldron.destroy(),
      maxSize: 12,
    });
    this.cauldrons = new PooledCollection({
      name: 'brewing cauldrons',
      pool: this.cauldronPool,
      counters,
      keyOf: (cauldron, index) =>
        cauldron.id ??
        cauldron.cauldronIndex ??
        cauldron.cauldronNumber ??
        index,
      bind: (widget, cauldron) =>
        widget.bind(cauldron, this.currentActions),
      afterReconcile: (cauldrons) => this.orderCauldrons(cauldrons),
    });

    this.inventoryLayer = new Container({
      label: 'brewing-inventory-layer',
    });
    this.herbInventory = new BrewingInventoryPanel({
      id: 'brewing.inventory.herbs',
      kind: 'herb',
      title: 'herbs',
      page: this,
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      semanticTargets: this.semanticTargets,
      counters,
      draggable: true,
    });
    this.potionInventory = new BrewingInventoryPanel({
      id: 'brewing.inventory.potions',
      kind: 'potion',
      title: 'potions',
      page: this,
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      semanticTargets: this.semanticTargets,
      counters,
    });
    this.herbsButton = new BrewingInventoryButton({
      id: 'brewing.inventory.herbs.button',
      label: 'herbs',
      side: 'left',
      texture: getTexture(this.assetManager, BREWING_ASSET_IDS.herbs),
      inputRouter: this.inputRouter,
      semanticTargets: this.semanticTargets,
      tutorialId: 'brewing:inventory:herbs',
      action: () => this.toggleInventory('herbs'),
    });
    this.potionsButton = new BrewingInventoryButton({
      id: 'brewing.inventory.potions.button',
      label: 'potions',
      side: 'right',
      texture: getTexture(this.assetManager, BREWING_ASSET_IDS.potions),
      inputRouter: this.inputRouter,
      semanticTargets: this.semanticTargets,
      action: () => this.toggleInventory('potions'),
    });
    this.inventoryLayer.addChild(
      this.herbInventory.root,
      this.potionInventory.root,
      this.herbsButton.root,
      this.potionsButton.root,
    );
    this.content.addChild(this.inventoryLayer);
    this.hud = new BrewingHudPixi({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      semanticTargets: this.semanticTargets,
      page: this,
      theme,
    });
    this.content.addChild(this.hud.root);
    this.motionLayer = new Container({
      label: 'brewing-page-motion-layer',
    });
    this.motionLayer.eventMode = 'none';
    this.content.addChild(this.motionLayer);
    this.motionGhostPool = new WidgetPool({
      name: 'brewing ingredient motion ghost pool',
      counters,
      create: () =>
        new BrewingItemMotionGhost(
          ++this.motionGhostSequence,
        ),
      reset: (ghost) => ghost.reset(),
      dispose: (ghost) => ghost.destroy(),
      maxSize: BREWING_ITEM_GHOST_POOL_SIZE,
    });

    this.panRegistration =
      this.inputRouter?.registerPanSurface?.({
        id: 'brewing.world.pan',
        displayObject: this.worldViewport,
        enabled: () => this.active,
        priority: -1,
        onPanStart: () => {
          this.worldViewportTouched = true;
          this.panStart = { ...this.worldPan };
          return true;
        },
        onPan: (context) => this.onWorldPan(context),
        onPanEnd: () => this.settleWorldViewport(),
        onPanCancel: () => this.settleWorldViewport(),
      }) ?? null;
    this.pinchRegistration =
      this.inputRouter?.registerPinchSurface?.({
        id: 'brewing.world.pinch',
        displayObject: this.worldViewport,
        enabled: () => this.active,
        priority: 2,
        onPinchStart: (context) => this.onWorldPinchStart(context),
        onPinch: (context) => this.onWorldPinch(context),
        onPinchEnd: () => this.settleWorldViewport(),
      }) ?? null;

    this.registerDialogs(counters);
    this.applyTheme(theme);
    this.layoutPage(this.sourceWidth, this.sourceHeight);
  }

  registerDialogs(counters) {
    if (!this.dialogRegistry || !this.dialogLayer) {
      return;
    }
    if (!this.dialogRegistry.has(BREWING_DIALOG_IDS.recipes)) {
      this.dialogRegistry.register(
        BREWING_DIALOG_IDS.recipes,
        () =>
          new BrewingRecipeBookDialogPixi({
            parent: this.dialogLayer,
            inputRouter: this.inputRouter,
            semanticTargets: this.semanticTargets,
            assetManager: this.assetManager,
            counters,
            onClose: () => this.closeDialog('recipes'),
            theme: this.theme,
          }),
      );
    }
    if (!this.dialogRegistry.has(BREWING_DIALOG_IDS.herbs)) {
      this.dialogRegistry.register(
        BREWING_DIALOG_IDS.herbs,
        () =>
          new RootRunInventoryChoiceDialogPixi({
            id: BREWING_DIALOG_IDS.herbs,
            parent: this.dialogLayer,
            inputRouter: this.inputRouter,
            semanticTargets: this.semanticTargets,
            assetManager: this.assetManager,
            counters,
            title: 'choose herb',
            itemKind: 'herb',
            selectActionName: 'selectHerb',
            listLabel: 'brewing-herb-dialog-list',
            onClose: () => this.closeDialog('herbs'),
            theme: this.theme,
          }),
      );
    }
    if (!this.dialogRegistry.has(BREWING_DIALOG_IDS.choice)) {
      this.dialogRegistry.register(
        BREWING_DIALOG_IDS.choice,
        () =>
          new BrewingRecipeChoiceDialogPixi({
            parent: this.dialogLayer,
            inputRouter: this.inputRouter,
            assetManager: this.assetManager,
            onClose: () => this.closeDialog('choice'),
            theme: this.theme,
          }),
      );
    }
    if (!this.dialogRegistry.has(BREWING_DIALOG_IDS.settings)) {
      this.dialogRegistry.register(
        BREWING_DIALOG_IDS.settings,
        () =>
          new BrewingAutomationSettingsDialogPixi({
            parent: this.dialogLayer,
            inputRouter: this.inputRouter,
            assetManager: this.assetManager,
            onClose: () => this.closeDialog('settings'),
            theme: this.theme,
          }),
      );
    }
  }

  renderViewModel(viewModel) {
    const brewing = viewModel.brewing ?? viewModel;
    this.currentActions =
      viewModel.actions ?? brewing.actions ?? this.actions;
    const viewport = brewing.world ?? {};
    if (viewport.controlled === true || viewport.reset === true) {
      this.worldPan = {
        x: finiteOr(viewport.panX, this.worldPan.x),
        y: finiteOr(viewport.panY, this.worldPan.y),
      };
      this.worldZoom = finiteOr(viewport.zoom, this.worldZoom);
      this.worldViewportTouched = viewport.touched === true;
    }

    const cauldrons = normalizeRows(
      brewing.cauldrons ??
        (brewing.cauldron ? [brewing.cauldron] : []),
    );
    this.selectedCauldronIndex = clamp(
      Number.isInteger(brewing.selectedCauldronIndex)
        ? brewing.selectedCauldronIndex
        : this.selectedCauldronIndex,
      0,
      Math.max(0, cauldrons.length - 1),
    );
    this.cauldrons.reconcile(cauldrons);
    this.syncCauldronPurchaseMotion(cauldrons);
    this.bindInventory(brewing.inventory ?? brewing.inventories ?? brewing);
    this.syncDialogs(brewing.dialogs ?? {});
    this.hud.bind(
      {
        ...brewing,
        cauldrons,
        selectedCauldronIndex: this.selectedCauldronIndex,
      },
      this.currentActions,
    );
    this.worldViewport.visible = false;
    this.worldViewport.renderable = false;
    this.inventoryLayer.visible = false;
    this.inventoryLayer.renderable = false;
    this.layoutPage(this.sourceWidth, this.sourceHeight);
    if (!this.worldViewportTouched) {
      this.fitWorldViewportToCauldrons();
    } else {
      this.setWorldViewport(
        this.worldPan.x,
        this.worldPan.y,
        this.worldZoom,
        { notify: false },
      );
    }
    this.tick(finiteOr(brewing.now, this.timeSource()));
  }

  bindInventory(inventory) {
    const activeTab = inventory.activeTab ?? null;
    const herbs = inventory.herbs ?? {};
    const potions = inventory.potions ?? {};
    this.herbInventory.bind({
      ...(Array.isArray(herbs) ? {} : herbs),
      rows: Array.isArray(herbs)
        ? herbs
        : herbs.rows ?? herbs.items ?? [],
      visible:
        activeTab === 'herbs' ||
        (!Array.isArray(herbs) && herbs.visible === true),
      actions: this.currentActions,
    });
    this.potionInventory.bind({
      ...(Array.isArray(potions) ? {} : potions),
      rows: Array.isArray(potions)
        ? potions
        : potions.rows ?? potions.items ?? [],
      visible:
        activeTab === 'potions' ||
        (!Array.isArray(potions) && potions.visible === true),
      actions: this.currentActions,
    });
    this.herbsButton.setSelected(
      activeTab === 'herbs' ||
        (!Array.isArray(herbs) && herbs.visible === true),
    );
    this.potionsButton.setSelected(
      activeTab === 'potions' ||
        (!Array.isArray(potions) && potions.visible === true),
    );
  }

  syncDialogs(dialogs) {
    for (const kind of Object.keys(BREWING_DIALOG_IDS)) {
      const model = dialogs[kind];
      const dialogId = BREWING_DIALOG_IDS[kind];
      if (model?.open === true) {
        if (this.dialogRegistry?.isOpen?.(dialogId)) {
          this.dialogRegistry.refresh(
            dialogId,
            this.normalizeDialogModel(kind, model),
          );
        } else {
          this.openDialog(kind, model);
        }
      } else if (
        model?.open === false &&
        this.dialogRegistry?.isOpen?.(dialogId)
      ) {
        this.dialogRegistry.close(dialogId);
      }
    }
  }

  openDialog(kind, model = null) {
    const dialogId = BREWING_DIALOG_IDS[kind];
    if (!dialogId || !this.dialogRegistry?.has?.(dialogId)) {
      return false;
    }
    this.dialogRegistry.open(
      dialogId,
      this.normalizeDialogModel(kind, model ?? {}),
    );
    return true;
  }

  closeDialog(kind) {
    const dialogId = BREWING_DIALOG_IDS[kind];
    if (!dialogId) {
      return false;
    }
    const closed = this.dialogRegistry?.isOpen?.(dialogId)
      ? this.dialogRegistry.close(dialogId)
      : false;
    this.currentActions?.closeDialog?.(kind);
    return closed;
  }

  normalizeDialogModel(kind, model) {
    if (kind === 'recipes') {
      return {
        ...model,
        actions: {
          ...this.currentActions,
          ...model.actions,
          selectRecipe: (recipe) =>
            recipe.onSelect?.(recipe) ??
            model.actions?.selectRecipe?.(
              recipe,
              model.cauldronIndex,
            ) ??
            this.currentActions?.selectRecipe?.(
              recipe,
              model.cauldronIndex,
            ),
          researchRecipe: (recipe) =>
            recipe.onResearch?.(recipe) ??
            model.actions?.researchRecipe?.(
              recipe,
              model.cauldronIndex,
            ) ??
            this.currentActions?.researchRecipe?.(
              recipe,
              model.cauldronIndex,
            ),
        },
      };
    }
    if (kind === 'herbs') {
      return {
        ...model,
        actions: {
          ...this.currentActions,
          ...model.actions,
          selectHerb: (herb) =>
            herb.onSelect?.(herb) ??
            model.actions?.selectHerb?.(
              herb,
              model.cauldronIndex,
              model.slotIndex,
            ) ??
            this.currentActions?.selectHerb?.(
              herb,
              model.cauldronIndex,
              model.slotIndex,
            ),
        },
      };
    }
    return {
      ...model,
      actions: {
        ...this.currentActions,
        ...model.actions,
      },
    };
  }

  toggleInventory(tabId) {
    return (
      this.currentActions?.toggleInventory?.(tabId) ??
      this.currentActions?.openInventory?.(tabId) ??
      true
    );
  }

  selectCauldron(cauldronIndex) {
    const cauldrons = normalizeRows(
      this.viewModel?.brewing?.cauldrons ??
        this.viewModel?.cauldrons,
    );
    const nextIndex = clamp(
      Math.floor(Number(cauldronIndex) || 0),
      0,
      Math.max(0, cauldrons.length - 1),
    );
    if (nextIndex === this.selectedCauldronIndex) {
      return false;
    }
    const direction =
      nextIndex > this.selectedCauldronIndex ? 1 : -1;
    this.selectedCauldronIndex = nextIndex;
    this.currentActions?.selectCauldron?.(nextIndex);
    this.hud.bind(
      {
        ...(this.viewModel?.brewing ?? this.viewModel ?? {}),
        cauldrons,
        selectedCauldronIndex: nextIndex,
      },
      this.currentActions,
    );
    this.hud.layout(this.sourceWidth, this.sourceHeight);
    this.hud.startCauldronChangeMotion(
      direction,
      this.timeSource(),
      { reducedMotion: this.prefersReducedMotion() },
    );
    return true;
  }

  openAutomationSettings() {
    const cauldron = this.hud.getSelectedCauldron();
    if (!cauldron || cauldron.unlocked === false) {
      return false;
    }
    return this.openDialog('settings', {
      title: `cauldron ${cauldron.cauldronNumber ?? this.selectedCauldronIndex + 1} settings`,
      cauldronIndex: this.selectedCauldronIndex,
      cauldronNumber:
        cauldron.cauldronNumber ?? this.selectedCauldronIndex + 1,
      autoBrewEnabled: cauldron.autoBrewEnabled === true,
    });
  }

  activate() {
    if (this.active) {
      return;
    }
    super.activate();
    this.active = true;
    this.fireflies?.setActive(true);
    this.ticker?.add?.(this.tickHandler);
  }

  deactivate() {
    if (!this.active) {
      return;
    }
    this.ticker?.remove?.(this.tickHandler);
    this.active = false;
    this.fireflies?.setActive(false);
    this.clearPageMotion();
    super.deactivate();
  }

  tick(now = this.timeSource()) {
    this.hud?.updateMotion(now, {
      active: this.active,
      reducedMotion: this.prefersReducedMotion(),
    });
    for (const cauldron of this.cauldrons?.getWidgets?.() ?? []) {
      cauldron.updateTime(now);
      cauldron.updateMotion(now);
    }
    for (const row of this.herbInventory?.rows?.getWidgets?.() ?? []) {
      row.updateMotion(now);
    }
    this.updateGhostMotions(now);
  }

  syncCauldronPurchaseMotion(cauldrons) {
    const nextState = new Map();
    for (const model of cauldrons) {
      const cauldronIndex = normalizeCauldronIndex(
        model?.cauldronIndex,
      );
      const unlocked = model?.unlocked !== false;
      nextState.set(cauldronIndex, { unlocked });
      if (
        this.hasBoundCauldronState &&
        this.boundCauldronState.get(cauldronIndex)?.unlocked ===
          false &&
        unlocked
      ) {
        this.findCauldron(cauldronIndex)?.startPurchaseMotion(
          this.timeSource(),
        );
      }
    }
    this.boundCauldronState = nextState;
    this.hasBoundCauldronState = true;
  }

  findCauldron(cauldronIndex) {
    const safeIndex = normalizeCauldronIndex(cauldronIndex);
    return (
      this.cauldrons
        ?.getWidgets?.()
        ?.find(
          (cauldron) =>
            normalizeCauldronIndex(
              cauldron.model?.cauldronIndex,
            ) === safeIndex,
        ) ?? null
    );
  }

  beginHerbDrag(row, context) {
    this.cancelCurrentHerbDrag({ animateReturn: false });
    row.beginDrag();
    const ghost = this.motionGhostPool.acquire();
    ghost.bind({
      texture: row.icon.texture,
      itemKind: 'herb',
      itemKey: row.model.key ?? row.model.itemTypeId ?? '',
    });
    this.motionLayer.addChild(ghost.root);
    const start = this.resolvePointerGhostPosition(
      context,
      row.root,
    );
    ghost.setPosition(start.x, start.y);
    this.currentHerbDrag = {
      row,
      ghost,
      acceptedCauldron: null,
    };
    return {
      kind: 'herb',
      item: row.model,
      sourceRow: row,
    };
  }

  moveHerbDrag(row, context) {
    if (this.currentHerbDrag?.row !== row) {
      return;
    }
    const point = this.resolvePointerGhostPosition(
      context,
      row.root,
    );
    const stepX = finiteOr(context?.movement?.stepScreen?.x, 0);
    const stepY = finiteOr(context?.movement?.stepScreen?.y, 0);
    this.currentHerbDrag.ghost.setPosition(point.x, point.y);
    this.currentHerbDrag.ghost.setSway({
      x: clamp(stepX * 0.45, -12, 12),
      y: clamp(stepY * 0.2, -6, 6),
      rotation: clamp(stepX * 0.36, -14, 14),
    });
  }

  acceptHerbDrop(cauldron, item) {
    const result =
      cauldron.model.onHerbDrop?.(item, cauldron.model) ??
      cauldron.actions.dropHerb?.(item, cauldron.model) ??
      cauldron.actions.addIngredient?.(item, cauldron.model) ??
      false;
    const accepted = didActionSucceed(result);
    if (accepted) {
      if (this.currentHerbDrag) {
        this.currentHerbDrag.acceptedCauldron = cauldron;
      }
      cauldron.startIngredientReceive(this.timeSource());
    }
    return accepted;
  }

  finishHerbDrag(row, context, accepted) {
    row.actions.endHerbDrag?.(row.model, context);
    this.settleHerbDrag(row, accepted);
  }

  settleHerbDrag(row, accepted) {
    const drag = this.currentHerbDrag;
    row.endDrag();
    if (!drag || drag.row !== row) {
      return;
    }
    const targetCauldron =
      accepted === true ? drag.acceptedCauldron : null;
    if (targetCauldron) {
      this.startGhostMotion(drag.ghost, {
        target: this.getCauldronReceivePoint(targetCauldron),
        durationMs: BREWING_CAULDRON_DROP_MS,
        kind: 'cauldron',
      });
    } else {
      row.startReturnMotion(this.timeSource());
      this.startGhostMotion(drag.ghost, {
        target: this.getDisplayObjectCenter(row.root),
        durationMs: BREWING_HERB_RETURN_MS,
        kind: 'return',
      });
    }
    this.currentHerbDrag = null;
  }

  cancelHerbDrag(row, context) {
    if (this.currentHerbDrag?.row !== row) {
      row.endDrag();
      return;
    }
    row.actions.cancelHerbDrag?.(row.model, context);
    this.settleHerbDrag(row, false);
  }

  cancelCurrentHerbDrag({ animateReturn = false } = {}) {
    const drag = this.currentHerbDrag;
    if (!drag) {
      return;
    }
    drag.row.endDrag();
    if (animateReturn) {
      drag.row.startReturnMotion(this.timeSource());
      this.startGhostMotion(drag.ghost, {
        target: this.getDisplayObjectCenter(drag.row.root),
        durationMs: BREWING_HERB_RETURN_MS,
        kind: 'return',
      });
    } else {
      this.releaseMotionGhost(drag.ghost);
    }
    this.currentHerbDrag = null;
  }

  animateIngredientReturn(start, ingredient) {
    if (this.prefersReducedMotion()) {
      return;
    }
    const target =
      this.herbInventory.rows
        .getWidgets()
        .find(
          (candidate) =>
            candidate.model.itemTypeId === ingredient.itemTypeId ||
            candidate.model.key === ingredient.key,
        ) ?? null;
    const targetDisplay = target?.root ?? this.herbInventory.root;
    const texture = getAtlasTexture(
      this.assetManager,
      getHerbIconFrameName(ingredient.key),
    );
    const ghost = this.motionGhostPool.acquire();
    ghost.bind({
      texture,
      itemKind: 'herb',
      itemKey: ingredient.key ?? ingredient.itemTypeId ?? '',
    });
    this.motionLayer.addChild(ghost.root);
    ghost.setPosition(start.x, start.y);
    if (target) {
      target.startReturnMotion(this.timeSource());
    }
    this.startGhostMotion(ghost, {
      target: this.getDisplayObjectCenter(targetDisplay),
      durationMs: BREWING_HERB_RETURN_MS,
      kind: 'return',
    });
  }

  animateBrewIngredients(cauldron, sources) {
    this.animateBrewIngredientSources(sources, {
      target: this.getCauldronReceivePoint(cauldron),
      onArrival: () => {
        if (cauldron.root.visible) {
          cauldron.startIngredientReceive(this.timeSource());
        }
      },
    });
  }

  animateHudBrewIngredients(hud, sources) {
    this.animateBrewIngredientSources(sources, {
      target: this.getDisplayObjectCenter(
        hud.cauldronArt,
        BREWING_LIQUID_VISIBLE_CENTER_Y_RATIO,
      ),
      ghostSize: BREWING_HUD_BREW_GHOST_SIZE,
      onArrival: () =>
        hud.startIngredientReceiveMotion?.(this.timeSource()),
    });
  }

  animateBrewIngredientSources(
    sources,
    {
      target,
      ghostSize = BREWING_ITEM_GHOST_SIZE,
      onArrival = null,
    } = {},
  ) {
    if (this.prefersReducedMotion() || sources.length === 0) {
      return;
    }
    const startTime = this.timeSource();
    sources.forEach((source, index) => {
      const texture =
        source.texture ??
        getAtlasTexture(
          this.assetManager,
          getHerbIconFrameName(source.key),
        );
      const ghost = this.motionGhostPool.acquire();
      ghost.bind({
        texture,
        itemKind: source.kind ?? 'herb',
        itemKey: source.key ?? '',
        size: source.size ?? ghostSize,
      });
      this.motionLayer.addChild(ghost.root);
      ghost.setPosition(source.position.x, source.position.y);
      this.startGhostMotion(ghost, {
        target,
        durationMs: BREWING_BREW_DROP_MS,
        delayMs: index * BREWING_BREW_DROP_STAGGER_MS,
        kind: 'brew',
        startTime,
        onFinish: onArrival,
      });
    });
  }

  startGhostMotion(
    ghost,
    {
      target,
      durationMs,
      delayMs = 0,
      kind,
      startTime = this.timeSource(),
      onFinish = null,
    },
  ) {
    if (this.prefersReducedMotion()) {
      onFinish?.();
      this.releaseMotionGhost(ghost);
      return;
    }
    ghost.setSway({ x: 0, y: 0, rotation: 0 });
    this.activeGhostMotions.add({
      ghost,
      start: { x: ghost.root.x, y: ghost.root.y },
      target,
      path:
        kind === 'brew'
          ? createBrewIngredientArc(
              { x: ghost.root.x, y: ghost.root.y },
              target,
            )
          : null,
      durationMs,
      delayMs,
      kind,
      startTime,
      onFinish,
    });
  }

  updateGhostMotions(now) {
    for (const motion of [...this.activeGhostMotions]) {
      const elapsed = now - motion.startTime - motion.delayMs;
      motion.ghost.root.visible = elapsed >= 0;
      if (elapsed < 0) {
        continue;
      }
      const progress = clamp(
        elapsed / Math.max(1, motion.durationMs),
        0,
        1,
      );
      applyGhostMotion(motion, progress);
      if (progress >= 1) {
        this.activeGhostMotions.delete(motion);
        motion.onFinish?.();
        this.releaseMotionGhost(motion.ghost);
      }
    }
  }

  releaseMotionGhost(ghost) {
    if (!ghost || !this.motionGhostPool.owns(ghost)) {
      return;
    }
    if (this.motionGhostPool.isActive(ghost)) {
      this.motionGhostPool.release(ghost);
    }
  }

  clearPageMotion() {
    this.cancelCurrentHerbDrag({ animateReturn: false });
    for (const motion of this.activeGhostMotions) {
      this.releaseMotionGhost(motion.ghost);
    }
    this.activeGhostMotions.clear();
    for (const cauldron of this.cauldrons?.getWidgets?.() ?? []) {
      cauldron.clearMotion();
    }
    for (const row of this.herbInventory?.rows?.getWidgets?.() ?? []) {
      row.clearMotion();
    }
    this.hud?.resetCauldronChangeMotion();
    this.hud?.resetAutoBrewMotion();
    this.hud?.resetStateMotion();
  }

  resolvePointerGhostPosition(context, fallbackDisplayObject) {
    if (context?.point) {
      const local = this.content.toLocal(context.point);
      return {
        x: local.x,
        y: local.y - BREWING_ITEM_GHOST_POINTER_LIFT,
      };
    }
    return this.getDisplayObjectCenter(fallbackDisplayObject);
  }

  getDisplayObjectCenter(displayObject, yRatio = 0.5) {
    const bounds = displayObject?.getBounds?.();
    if (!bounds) {
      return { x: 0, y: 0 };
    }
    return this.content.toLocal({
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height * yRatio,
    });
  }

  getCauldronReceivePoint(cauldron) {
    return this.getDisplayObjectCenter(cauldron.artLayer, 0.62);
  }

  prefersReducedMotion() {
    return this.reducedMotion();
  }

  orderCauldrons(cauldrons) {
    this.world.removeChildren();
    for (const cauldron of cauldrons) {
      this.world.addChild(cauldron.root);
    }
  }

  onWorldPan(context) {
    const scale = finiteOr(this.viewportProjection?.sourceScale, 3);
    const movement = context.movement?.screen ?? { x: 0, y: 0 };
    const start = this.panStart ?? this.worldPan;
    this.setWorldViewport(
      start.x + movement.x / scale,
      start.y + movement.y / scale,
      this.worldZoom,
      { rubber: true },
    );
  }

  onWorldPinchStart(context) {
    this.worldViewportTouched = true;
    const point = this.worldViewport.toLocal(context.point);
    this.pinchStart = {
      zoom: this.worldZoom,
      worldX: (point.x - this.worldPan.x) / this.worldZoom,
      worldY: (point.y - this.worldPan.y) / this.worldZoom,
    };
    return true;
  }

  onWorldPinch(context) {
    if (!this.pinchStart) {
      return;
    }
    const point = this.worldViewport.toLocal(context.point);
    const zoom = rubberClamp(
      this.pinchStart.zoom * finiteOr(context.scale, 1),
      BREWING_WORLD_MIN_ZOOM,
      BREWING_WORLD_MAX_ZOOM,
      BREWING_WORLD_ZOOM_RUBBER_LIMIT,
    );
    this.setWorldViewport(
      point.x - this.pinchStart.worldX * zoom,
      point.y - this.pinchStart.worldY * zoom,
      zoom,
      { rubber: true },
    );
  }

  settleWorldViewport() {
    this.panStart = null;
    this.pinchStart = null;
    this.setWorldViewport(
      this.worldPan.x,
      this.worldPan.y,
      this.worldZoom,
    );
  }

  fitWorldViewportToCauldrons() {
    const cauldrons = this.cauldrons.getWidgets();
    if (cauldrons.length === 0 || this.worldViewportWidth <= 0) {
      return;
    }
    const bounds = cauldrons.reduce(
      (result, cauldron) => ({
        minX: Math.min(result.minX, cauldron.root.x),
        minY: Math.min(result.minY, cauldron.root.y),
        maxX: Math.max(
          result.maxX,
          cauldron.root.x + BREWING_PIXI_GEOMETRY.cauldronNodeWidth,
        ),
        maxY: Math.max(
          result.maxY,
          cauldron.root.y +
            (cauldron.height ??
              BREWING_PIXI_GEOMETRY.cauldronBaseHeight),
        ),
      }),
      {
        minX: BREWING_PIXI_GEOMETRY.worldWidth,
        minY: BREWING_PIXI_GEOMETRY.worldHeight,
        maxX: 0,
        maxY: 0,
      },
    );
    const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
    const availableWidth = Math.max(
      1,
      this.worldViewportWidth -
        BREWING_PIXI_GEOMETRY.worldFitPadding * 2,
    );
    const zoom = clamp(
      Math.min(1, availableWidth / contentWidth),
      BREWING_WORLD_MIN_ZOOM,
      BREWING_WORLD_MAX_ZOOM,
    );
    const centerX = (bounds.minX + bounds.maxX) / 2;
    this.setWorldViewport(
      this.worldViewportWidth / 2 - centerX * zoom,
      this.worldPan.y,
      zoom,
      { notify: false },
    );
  }

  setWorldViewport(x, y, zoom, { rubber = false, notify = true } = {}) {
    const nextZoom = rubber
      ? rubberClamp(
          zoom,
          BREWING_WORLD_MIN_ZOOM,
          BREWING_WORLD_MAX_ZOOM,
          BREWING_WORLD_ZOOM_RUBBER_LIMIT,
        )
      : clamp(
          zoom,
          BREWING_WORLD_MIN_ZOOM,
          BREWING_WORLD_MAX_ZOOM,
        );
    const bounds = this.getWorldPanBounds(nextZoom);
    const nextPan = {
      x: rubber
        ? rubberClamp(
            x,
            bounds.minX,
            bounds.maxX,
            BREWING_WORLD_PAN_RUBBER_LIMIT,
          )
        : clamp(x, bounds.minX, bounds.maxX),
      y: rubber
        ? rubberClamp(
            y,
            bounds.minY,
            bounds.maxY,
            BREWING_WORLD_PAN_RUBBER_LIMIT,
          )
        : clamp(y, bounds.minY, bounds.maxY),
    };
    this.worldPan = nextPan;
    this.worldZoom = nextZoom;
    this.world.position.set(nextPan.x, nextPan.y);
    this.world.scale.set(nextZoom);
    if (notify) {
      this.currentActions?.setWorldViewport?.({
        panX: nextPan.x,
        panY: nextPan.y,
        zoom: nextZoom,
      });
    }
  }

  getWorldPanBounds(zoom = this.worldZoom) {
    const freeX =
      (this.worldViewportWidth ?? 0) -
      BREWING_PIXI_GEOMETRY.worldWidth * zoom;
    const freeY =
      (this.worldViewportHeight ?? 0) -
      BREWING_PIXI_GEOMETRY.worldHeight * zoom;
    return {
      minX: Math.min(0, freeX),
      maxX: Math.max(0, freeX),
      minY: Math.min(0, freeY),
      maxY: Math.max(0, freeY),
    };
  }

  applyThemeToChildren(theme) {
    this.fireflies?.applyTheme(theme);
    this.herbInventory?.applyTheme(theme);
    this.potionInventory?.applyTheme(theme);
    this.herbsButton?.applyTheme(theme);
    this.potionsButton?.applyTheme(theme);
    this.hud?.applyTheme(theme);
    for (const cauldron of this.cauldrons?.getWidgets?.() ?? []) {
      cauldron.applyTheme(theme);
    }
  }

  layoutPage(sourceWidth, sourceHeight) {
    if (!this.worldViewport) {
      return;
    }
    const bottomClearance = resolveRetainedPageBottomClearance(
      this.viewModel,
    );
    this.fireflies?.setBounds(sourceWidth, sourceHeight);
    this.worldViewportWidth = sourceWidth;
    this.worldViewportHeight = Math.max(
      0,
      sourceHeight -
        BREWING_PIXI_GEOMETRY.worldTop -
        bottomClearance,
    );
    this.worldViewport.position.set(0, BREWING_PIXI_GEOMETRY.worldTop);
    this.worldViewport.hitArea = new Rectangle(
      0,
      0,
      this.worldViewportWidth,
      this.worldViewportHeight,
    );
    this.worldMask
      .clear()
      .rect(0, 0, this.worldViewportWidth, this.worldViewportHeight)
      .fill({ color: 0xffffff });
    const buttonY =
      sourceHeight -
      bottomClearance -
      6 -
      BREWING_PIXI_GEOMETRY.inventoryButtonHeight;
    this.herbsButton.setBounds(
      RETAINED_PAGE_GEOMETRY.contentEdge,
      buttonY,
    );
    this.potionsButton.setBounds(
      sourceWidth -
        RETAINED_PAGE_GEOMETRY.contentEdge -
        BREWING_PIXI_GEOMETRY.inventoryButtonWidth,
      buttonY,
    );
    this.layoutBrewing();
    this.hud?.layout(sourceWidth, sourceHeight, {
      worldChatVisible:
        this.viewModel?.chrome?.worldChatVisible !== false,
    });
  }

  layoutBrewing() {
    if (!this.cauldrons) {
      return;
    }
    this.cauldrons.getWidgets().forEach((cauldron, index) => {
      const cauldronIndex = normalizeCauldronIndex(
        cauldron.model.cauldronIndex ?? index,
      );
      cauldron.setBounds(
        BREWING_PIXI_GEOMETRY.cauldronLeft,
        BREWING_PIXI_GEOMETRY.cauldronTop +
          cauldronIndex * BREWING_PIXI_GEOMETRY.cauldronRowGap,
      );
    });
    const panelWidth =
      this.sourceWidth - RETAINED_PAGE_GEOMETRY.contentEdge * 2;
    const inventoryPanelBottom =
      resolveRetainedPageBottomClearance(this.viewModel) +
      BREWING_PIXI_GEOMETRY.inventoryPanelBottom -
      RETAINED_PAGE_GEOMETRY.chatClearance;
    for (const panel of [this.herbInventory, this.potionInventory]) {
      panel.setWidth(panelWidth);
      panel.root.position.set(
        RETAINED_PAGE_GEOMETRY.contentEdge,
        this.sourceHeight -
          inventoryPanelBottom -
          panel.height,
      );
    }
  }

  destroyPage() {
    this.ticker?.remove?.(this.tickHandler);
    this.fireflies?.destroy();
    this.clearPageMotion();
    releaseRegistration(this.panRegistration);
    releaseRegistration(this.pinchRegistration);
    this.cauldrons?.destroy();
    this.cauldronPool?.destroy();
    this.herbInventory?.destroy();
    this.potionInventory?.destroy();
    this.herbsButton?.destroy();
    this.potionsButton?.destroy();
    this.hud?.destroy();
    this.motionGhostPool?.destroy();
  }
}

export class BrewingCauldronWidget {
  constructor({
    instanceId,
    page,
    assetManager,
    inputRouter,
    semanticTargets,
    counters,
  }) {
    this.instanceId = instanceId;
    this.page = page;
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.semanticTargets = semanticTargets;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.model = {};
    this.actions = {};
    this.enabled = false;
    this.semanticIds = [];
    this.receiveMotionStart = null;
    this.purchaseMotionStart = null;
    this.layoutX = 0;
    this.layoutY = 0;
    this.root = new Container({
      label: `brewing-cauldron-${instanceId}`,
    });
    this.panel = new RetainedPanel({
      assetManager,
      label: '',
      panelLabel: `brewing-cauldron-${instanceId}-panel`,
    });
    this.lockedFrame = new Graphics({
      label: `brewing-cauldron-${instanceId}-locked-frame`,
    });
    this.lockedLabel = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      align: 'center',
    });
    this.lockedLabel.anchor.set(0.5);
    this.count = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
    });
    this.count.anchor.set(1, 0);
    this.artLayer = new Container({
      label: `brewing-cauldron-${instanceId}-art`,
    });
    this.cauldronImage = new Sprite(
      getTexture(assetManager, BREWING_ASSET_IDS.cauldron),
    );
    this.cauldronImage.label =
      `brewing-cauldron-${instanceId}-image`;
    this.liquid = new Graphics({
      label: `brewing-cauldron-${instanceId}-liquid`,
    });
    this.liquidMask = new Sprite(
      getTexture(assetManager, BREWING_ASSET_IDS.liquidMask),
    );
    this.liquidMask.label =
      `brewing-cauldron-${instanceId}-liquid-mask`;
    this.liquid.mask = this.liquidMask;
    this.previewIcon = new Sprite(Texture.EMPTY);
    this.previewIcon.label =
      `brewing-cauldron-${instanceId}-preview-icon`;
    this.previewLabel = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      align: 'center',
    });
    this.previewLabel.anchor.set(0.5, 0);
    this.recipeLayer = new Container({
      label: `brewing-cauldron-${instanceId}-recipe`,
    });
    this.bubble = createText('', {
      ...RETAINED_TEXT_STYLES.body,
      wordWrap: true,
      wordWrapWidth: BREWING_PIXI_GEOMETRY.cauldronRecipeWidth,
    });
    this.status = createText('', RETAINED_TEXT_STYLES.body);
    this.rowsLayer = new Container({
      label: `brewing-cauldron-${instanceId}-rows`,
    });
    this.activeText = createText('', RETAINED_TEXT_STYLES.body);
    this.progress = new RetainedTimedProgressBar({
      assetManager,
      label: `brewing-cauldron-${instanceId}-progress`,
      tone: 'blue',
    });
    this.message = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      wordWrap: true,
      wordWrapWidth: BREWING_PIXI_GEOMETRY.actionWidth,
      align: 'center',
    });
    this.message.anchor.set(0.5, 0);

    this.artLayer.addChild(
      this.cauldronImage,
      this.liquid,
      this.liquidMask,
      this.previewIcon,
      this.previewLabel,
    );
    this.recipeLayer.addChild(
      this.bubble,
      this.status,
      this.rowsLayer,
      this.activeText,
      this.progress.root,
    );
    this.panel.body.addChild(
      this.lockedFrame,
      this.lockedLabel,
      this.artLayer,
      this.recipeLayer,
    );
    this.panel.root.addChild(this.count);
    this.root.addChild(this.panel.root);

    this.buttons = {
      recipes: new BrewingCauldronButton({
        id: `brewing.cauldron.instance.${instanceId}.recipes`,
        assetManager,
        inputRouter,
        action: () => this.activateAction('recipes'),
      }),
      primary: new BrewingCauldronButton({
        id: `brewing.cauldron.instance.${instanceId}.primary`,
        assetManager,
        inputRouter,
        action: () => this.activateAction('primary'),
      }),
      quantity: new BrewingCauldronButton({
        id: `brewing.cauldron.instance.${instanceId}.quantity`,
        assetManager,
        inputRouter,
        action: () => this.activateAction('quantity'),
      }),
      auto: new BrewingCauldronButton({
        id: `brewing.cauldron.instance.${instanceId}.auto`,
        assetManager,
        inputRouter,
        action: () => this.activateAction('auto'),
      }),
    };
    for (const button of Object.values(this.buttons)) {
      this.root.addChild(button.root);
    }
    this.root.addChild(this.message);

    this.rowSequence = 0;
    this.rowPool = new WidgetPool({
      name: `brewing cauldron ${instanceId} row pool`,
      counters,
      create: () =>
        new BrewingCauldronRow({
          instanceId: `${instanceId}-${++this.rowSequence}`,
          inputRouter,
          cauldron: this,
        }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 12,
    });
    this.rows = new PooledCollection({
      name: `brewing cauldron ${instanceId} rows`,
      pool: this.rowPool,
      counters,
      keyOf: (row, index) =>
        row.id ??
        row.slotIndex ??
        row.itemTypeId ??
        row.key ??
        index,
      bind: (widget, row) =>
        widget.bind(row, this.model, this.actions),
      afterReconcile: (rows) => this.orderRows(rows),
    });

    this.pressRegistration =
      this.inputRouter?.registerPressTarget?.({
        id: `brewing.cauldron.instance.${instanceId}`,
        displayObject: this.root,
        enabled: () => this.enabled,
        slop: 12,
        onPressChange: (pressed) => this.setPressed(pressed),
        onActivate: () => this.activate(),
      }) ?? null;
    this.dropRegistration =
      this.inputRouter?.registerDropTarget?.({
        id: `brewing.cauldron.drop.instance.${instanceId}`,
        displayObject: this.root,
        enabled: () =>
          this.enabled && this.model.acceptsHerbDrop !== false,
        accepts: (payload) => payload?.kind === 'herb',
        onDrop: ({ data }) =>
          this.page.acceptHerbDrop(this, data.item),
      }) ?? null;
  }

  bind(model, actions) {
    this.unregisterSemanticTargets();
    this.model = model ?? {};
    this.actions = actions ?? {};
    const active = this.model.activeBrew ?? this.model.process;
    if (active && typeof active === 'object') {
      this.progress.setTimer(
        createTimedProgressWindow(active, this.page.timeSource()),
      );
    } else {
      this.progress.clearTimer(0);
    }
    const visible =
      this.model.hidden !== true && this.model.visible !== false;
    const unlocked = this.model.unlocked !== false;
    const buyable =
      this.model.canBuyCauldron === true ||
      this.model.buyable === true;
    this.enabled =
      visible &&
      this.model.disabled !== true &&
      (unlocked || buyable);
    this.root.visible = visible;
    this.root.renderable = visible;
    this.root.eventMode = this.enabled ? 'static' : 'passive';

    const number =
      this.model.cauldronNumber ??
      normalizeCauldronIndex(this.model.cauldronIndex) + 1;
    this.panel.setTitle(
      unlocked
        ? this.model.title ?? resolveCauldronTitle(this.model, number)
        : '',
    );
    setText(
      this.count,
      unlocked
        ? this.model.countText ??
            `${this.model.ingredientCount ?? this.model.ingredients?.length ?? 0}/${this.model.maxIngredients ?? 0}`
        : '',
    );
    setText(
      this.lockedLabel,
      unlocked ? '' : resolveLockedLabel(this.model),
    );
    setText(this.bubble, resolveBubbleText(this.model));
    setText(this.status, this.model.statusText ?? '');
    setText(this.message, this.model.message ?? this.model.messageText ?? '');

    const rows = normalizeRows(
      this.model.rows ??
        this.model.guideRows ??
        this.model.ingredients,
    );
    this.rows.reconcile(this.model.activeBrew ? [] : rows);
    const preview = this.model.preview ?? this.model.selectedRecipe ?? {};
    const previewKey =
      preview.iconKey ??
      preview.key ??
      this.model.potionKey ??
      this.model.activeBrew?.key;
    const frame =
      preview.iconFrame ??
      (previewKey ? getPotionIconFrameName(previewKey) : null);
    this.previewIcon.texture = frame
      ? getAtlasTexture(this.assetManager, frame)
      : Texture.EMPTY;
    this.previewIcon.visible = Boolean(frame);
    setText(
      this.previewLabel,
      preview.label ??
        this.model.previewLabel ??
        (this.model.emptyLabelVisible === true ? 'empty' : ''),
    );
    this.previewLabel.visible = Boolean(this.previewLabel.text);

    this.configureButtons(unlocked);
    this.registerSemanticTargets(number);
    this.applyTheme(this.theme);
    this.setBounds(this.layoutX, this.layoutY);
    this.updateTime(this.page.timeSource());
  }

  configureButtons(unlocked) {
    const recipes =
      this.model.recipeAction ?? this.model.actions?.recipes ?? {
        label:
          this.model.canSelectRecipe === false
            ? 'recipes lock'
            : 'recipes',
        enabled: this.model.canSelectRecipe !== false,
      };
    const primary =
      this.model.primaryAction ??
      (typeof this.model.action === 'object'
        ? this.model.action
        : null) ??
      resolveFallbackPrimaryAction(this.model);
    const quantity =
      this.model.quantityAction ?? {
        label: `x${Math.max(1, Number(this.model.brewQuantity) || 1)}`,
        enabled:
          this.model.batchLocked !== true &&
          !this.model.activeBrew,
        visible: unlocked,
      };
    const auto =
      this.model.autoAction ?? {
        label:
          this.model.autoBrewAvailable === false
            ? 'auto'
            : this.model.autoBrewEnabled === true
              ? 'auto'
              : 'manual',
        enabled: this.model.autoBrewAvailable === true,
        visible: unlocked,
        selected: this.model.autoBrewEnabled === true,
      };

    this.buttons.recipes.bind({
      ...recipes,
      visible: unlocked && recipes.visible !== false,
    });
    this.buttons.primary.bind({
      ...primary,
      visible: primary?.visible !== false,
      notification:
        primary?.notification ?? this.model.notification,
      notificationTone:
        primary?.notificationTone ?? this.model.notificationTone,
    });
    this.buttons.quantity.bind({
      ...quantity,
      visible: unlocked && quantity.visible !== false,
    });
    this.buttons.auto.bind({
      ...auto,
      visible: unlocked && auto.visible !== false,
    });
  }

  activateAction(kind) {
    const actionModel =
      kind === 'recipes'
        ? this.model.recipeAction
        : kind === 'primary'
          ? this.model.primaryAction ??
            this.model.action ??
            resolveFallbackPrimaryAction(this.model)
          : kind === 'quantity'
            ? this.model.quantityAction
            : this.model.autoAction;
    const brewSources =
      kind === 'primary' && actionModel?.id === 'brew'
        ? this.captureIngredientMotionSources()
        : [];
    const direct = actionModel?.activate ?? actionModel?.onActivate;
    let result;
    if (direct) {
      result = direct(this.model, actionModel) ?? true;
    } else {
      const index = normalizeCauldronIndex(
        this.model.cauldronIndex,
      );
      switch (kind) {
        case 'recipes':
          result =
          this.actions.openRecipes?.(index, this.model) ??
          this.page.openDialog('recipes', {
            ...this.model.recipesDialog,
            cauldronIndex: index,
          });
          break;
        case 'primary':
          result =
          this.actions.performCauldronAction?.(
            this.model,
            actionModel,
          ) ??
          this.actions.primaryAction?.(index, actionModel, this.model) ??
          true;
          break;
        case 'quantity':
          result =
          this.actions.selectBrewQuantity?.(
            actionModel?.nextQuantity ??
              nextBrewQuantity(this.model),
            index,
          ) ?? true;
          break;
        case 'auto':
          result = this.actions.toggleAutoBrew?.(index) ?? true;
          break;
        default:
          result = false;
      }
    }
    if (
      kind === 'primary' &&
      actionModel?.id === 'brew' &&
      didActionSucceed(result)
    ) {
      this.page.animateBrewIngredients(
        this.page.findCauldron(this.model.cauldronIndex) ?? this,
        brewSources,
      );
    }
    return result;
  }

  captureIngredientMotionSources() {
    return this.rows.getWidgets().map((row) => ({
      kind: row.model.kind ?? 'herb',
      key: row.model.key ?? row.model.itemKey ?? '',
      position: this.page.getDisplayObjectCenter(row.root),
    }));
  }

  registerSemanticTargets(number) {
    const semanticId =
      this.model.semanticId ??
      `brewing.cauldron.${normalizeCauldronIndex(this.model.cauldronIndex)}`;
    this.semanticTargets?.register?.({
      semanticId,
      tutorialId:
        this.model.tutorialId ??
        `brewing:cauldron:${normalizeCauldronIndex(this.model.cauldronIndex)}`,
      displayObject: this.root,
      state: () => ({
        visible: this.root.visible && this.root.renderable,
        interactive: this.enabled,
        enabled: this.enabled,
        selected: this.model.selected === true,
        active: !this.root.destroyed,
      }),
      activate: () => this.activate(),
    });
    this.semanticIds.push(semanticId);
    for (const [kind, button] of Object.entries(this.buttons)) {
      const actionId =
        this.model[`${kind}SemanticId`] ??
        `${semanticId}.${kind}`;
      this.semanticTargets?.register?.({
        semanticId: actionId,
        displayObject: button.root,
        state: () => ({
          visible: button.root.visible && this.root.visible,
          interactive: button.enabled,
          enabled: button.enabled,
          selected: button.selected,
          active: !button.root.destroyed,
        }),
        activate: () => button.activate(),
      });
      this.semanticIds.push(actionId);
    }
    this.number = number;
  }

  activate() {
    return (
      this.model.onActivate?.(this.model) ??
      this.actions.selectCauldron?.(
        normalizeCauldronIndex(this.model.cauldronIndex),
        this.model,
      ) ??
      (this.model.unlocked === false
        ? this.activateAction('primary')
        : true)
    );
  }

  orderRows(rows) {
    this.rowsLayer.removeChildren();
    for (const row of rows) {
      this.rowsLayer.addChild(row.root);
    }
  }

  setBounds(x, y) {
    this.layoutX = x;
    this.layoutY = y;
    this.root.position.set(x, y);
    const rowCount = Math.max(3, this.rows.getWidgets().length);
    this.height =
      BREWING_PIXI_GEOMETRY.cauldronFrameHeight +
      rowCount * BREWING_PIXI_GEOMETRY.rowHeight +
      BREWING_PIXI_GEOMETRY.cauldronArtExtraHeight;
    this.root.hitArea = new Rectangle(
      0,
      0,
      BREWING_PIXI_GEOMETRY.cauldronNodeWidth,
      this.height,
    );
    this.panel.root.pivot.set(0, 0);
    this.panel.root.position.set(0, 0);
    this.panel.setBounds(
      0,
      0,
      BREWING_PIXI_GEOMETRY.cauldronBoxWidth,
      this.height,
    );
    this.count.position.set(
      BREWING_PIXI_GEOMETRY.cauldronBoxWidth - 8,
      -7,
    );
    this.lockedFrame.position.set(0, 0);
    this.lockedLabel.position.set(
      BREWING_PIXI_GEOMETRY.cauldronBoxWidth / 2,
      this.height / 2,
    );
    this.artLayer.position.set(0, 0);
    layoutCauldronArt(this);
    this.recipeLayer.position.set(192, 0);
    this.bubble.position.set(0, 4);
    this.bubble.style.wordWrapWidth =
      BREWING_PIXI_GEOMETRY.cauldronRecipeWidth;
    this.status.position.set(0, 4);
    this.rowsLayer.position.set(0, 44);
    this.rows.getWidgets().forEach((row, index) =>
      row.setBounds(
        0,
        index * BREWING_PIXI_GEOMETRY.rowHeight,
        BREWING_PIXI_GEOMETRY.cauldronRecipeWidth,
      ),
    );
    this.activeText.position.set(0, 46);
    this.progress.setBounds(
      0,
      66,
      BREWING_PIXI_GEOMETRY.cauldronRecipeWidth,
      PIXI_UI_GEOMETRY.progressTotalHeight,
    );
    const actionsX =
      BREWING_PIXI_GEOMETRY.cauldronBoxWidth +
      BREWING_PIXI_GEOMETRY.cauldronSideGap;
    const locked = this.model.unlocked === false;
    this.buttons.recipes.setBounds(actionsX, locked ? 0 : 0);
    this.buttons.primary.setBounds(
      actionsX,
      locked
        ? (this.height - BREWING_PIXI_GEOMETRY.actionHeight) / 2
        : BREWING_PIXI_GEOMETRY.actionHeight +
            BREWING_PIXI_GEOMETRY.actionGap,
    );
    this.buttons.quantity.setBounds(
      actionsX,
      (BREWING_PIXI_GEOMETRY.actionHeight +
        BREWING_PIXI_GEOMETRY.actionGap) *
        2,
    );
    this.buttons.auto.setBounds(
      actionsX,
      (BREWING_PIXI_GEOMETRY.actionHeight +
        BREWING_PIXI_GEOMETRY.actionGap) *
        3,
    );
    this.message.position.set(
      actionsX + BREWING_PIXI_GEOMETRY.actionWidth / 2,
      (BREWING_PIXI_GEOMETRY.actionHeight +
        BREWING_PIXI_GEOMETRY.actionGap) *
        4,
    );
    this.redrawLockedFrame();
    this.updateMotion(this.page.timeSource());
  }

  setPressed(pressed) {
    const isPressed = Boolean(pressed) && this.enabled;
    this.panel.root.scale.set(isPressed ? 0.99 : 1);
    this.panel.root.pivot.set(
      BREWING_PIXI_GEOMETRY.cauldronBoxWidth / 2,
      this.height / 2,
    );
    this.panel.root.position.set(
      BREWING_PIXI_GEOMETRY.cauldronBoxWidth / 2,
      this.height / 2 + (isPressed ? 1 : 0),
    );
  }

  startIngredientReceive(now = this.page.timeSource()) {
    if (this.page.prefersReducedMotion()) {
      this.receiveMotionStart = null;
      this.applyReceiveMotion(1);
      return;
    }
    this.receiveMotionStart = finiteOr(now, this.page.timeSource());
    this.applyReceiveMotion(0);
  }

  startPurchaseMotion(now = this.page.timeSource()) {
    if (this.page.prefersReducedMotion()) {
      this.purchaseMotionStart = null;
      this.applyPurchaseMotion(1);
      return;
    }
    this.purchaseMotionStart = finiteOr(
      now,
      this.page.timeSource(),
    );
    this.applyPurchaseMotion(0);
  }

  updateMotion(now = this.page.timeSource()) {
    if (this.receiveMotionStart !== null) {
      const elapsed = now - this.receiveMotionStart;
      const progress = clamp(
        elapsed /
          BREWING_CAULDRON_RECEIVE_MS,
        0,
        1,
      );
      const recipeProgress = clamp(
        elapsed / BREWING_RECIPE_RECEIVE_MS,
        0,
        1,
      );
      this.applyReceiveMotion(progress, recipeProgress);
      if (progress >= 1) {
        this.receiveMotionStart = null;
      }
    } else {
      this.applyReceiveMotion(1);
    }
    if (this.purchaseMotionStart !== null) {
      const progress = clamp(
        (now - this.purchaseMotionStart) /
          BREWING_CAULDRON_BUY_MS,
        0,
        1,
      );
      this.applyPurchaseMotion(progress);
      if (progress >= 1) {
        this.purchaseMotionStart = null;
      }
    } else {
      this.applyPurchaseMotion(1);
    }
  }

  applyReceiveMotion(progress, recipeProgress = progress) {
    if (progress <= 0 || progress >= 1) {
      this.artLayer.pivot.set(0, 0);
      this.artLayer.position.set(0, 0);
      this.artLayer.scale.set(1);
      this.recipeLayer.y =
        recipeProgress >= 1
          ? 0
          : sampleRecipeReceive(recipeProgress);
      return;
    }
    const sample = sampleCauldronReceive(progress);
    const centerX = BREWING_PIXI_GEOMETRY.cauldronArtWidth / 2;
    const centerY = this.height / 2;
    this.artLayer.pivot.set(centerX, centerY);
    this.artLayer.position.set(
      centerX,
      centerY + sample.y,
    );
    this.artLayer.scale.set(sample.scaleX, sample.scaleY);
    this.recipeLayer.y = sampleRecipeReceive(recipeProgress);
  }

  applyPurchaseMotion(progress) {
    if (progress >= 1) {
      this.root.pivot.set(0, 0);
      this.root.position.set(this.layoutX, this.layoutY);
      this.root.scale.set(1);
      this.root.alpha = 1;
      return;
    }
    const sample = sampleCauldronPurchase(progress);
    const centerX = BREWING_PIXI_GEOMETRY.cauldronNodeWidth / 2;
    const centerY = this.height / 2;
    this.root.pivot.set(centerX, centerY);
    this.root.position.set(
      this.layoutX + centerX,
      this.layoutY + centerY,
    );
    this.root.scale.set(sample.scale);
    this.root.alpha = sample.alpha;
  }

  clearMotion() {
    this.receiveMotionStart = null;
    this.purchaseMotionStart = null;
    this.applyReceiveMotion(1);
    this.applyPurchaseMotion(1);
  }

  updateTime(now) {
    const active = this.model.activeBrew ?? this.model.process;
    const visible = Boolean(active);
    this.activeText.visible = visible;
    this.progress.root.visible = visible;
    this.rowsLayer.visible = !visible;
    this.bubble.visible =
      !visible && Boolean(this.bubble.text) && this.rows.getWidgets().length === 0;
    this.status.visible =
      !visible && Boolean(this.status.text);
    if (!visible) {
      this.progress.clearTimer(0);
      setText(this.activeText, '');
      return;
    }
    const timed = this.progress.updateTimer(now);
    const timerText =
      active.timerText ?? formatRemainingTime(timed.remainingMs);
    setText(
      this.activeText,
      active.text ??
        active.labelText ??
        [active.label, timerText].filter(Boolean).join(' '),
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.panel.applyTheme(this.theme);
    const locked = this.model.unlocked === false;
    applyTextTheme(this.lockedLabel, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: this.theme.disabled,
      align: 'center',
    });
    applyTextTheme(this.count, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: this.theme.text,
      align: 'right',
    });
    applyTextTheme(this.previewLabel, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill:
        this.model.preview?.empty === true ||
        this.model.preview?.locked === true
          ? this.theme.disabled
          : this.theme.text,
      align: 'center',
    });
    applyTextTheme(this.bubble, this.theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: this.model.ingredients?.length
        ? this.theme.text
        : this.theme.muted,
      wordWrap: true,
      wordWrapWidth: BREWING_PIXI_GEOMETRY.cauldronRecipeWidth,
    });
    applyTextTheme(this.status, this.theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: this.theme.text,
    });
    applyTextTheme(this.activeText, this.theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: this.theme.muted,
    });
    applyTextTheme(this.message, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: this.theme.text,
      wordWrap: true,
      wordWrapWidth: BREWING_PIXI_GEOMETRY.actionWidth,
      align: 'center',
    });
    this.progress.applyTheme(this.theme);
    for (const row of this.rows.getWidgets()) {
      row.applyTheme(this.theme);
    }
    for (const button of Object.values(this.buttons)) {
      button.applyTheme(this.theme);
    }
    const liquidKey =
      this.model.preview?.iconKey ??
      this.model.preview?.key ??
      this.model.activeBrew?.key ??
      'generic';
    this.liquid
      .clear()
      .rect(
        this.cauldronImage.x,
        this.cauldronImage.y,
        this.cauldronImage.width,
        this.cauldronImage.height,
      )
      .fill({
        color: colorNumber(getPotionLiquidColor(liquidKey)),
        alpha: 0.9,
      });
    this.liquid.visible = Boolean(this.model.activeBrew);
    this.liquidMask.visible = Boolean(this.model.activeBrew);
    this.redrawLockedFrame();
    this.panel.root.alpha =
      locked && !this.enabled ? 0.78 : 1;
  }

  redrawLockedFrame() {
    this.lockedFrame.clear();
    const locked = this.model.unlocked === false;
    this.lockedFrame.visible = locked;
    this.lockedLabel.visible = locked;
    this.artLayer.visible = !locked;
    this.recipeLayer.visible = !locked;
    this.count.visible = !locked;
    if (locked) {
      drawDashedRect(
        this.lockedFrame,
        1,
        1,
        BREWING_PIXI_GEOMETRY.cauldronBoxWidth - 2,
        this.height - 2,
        this.enabled ? this.theme.stroke : this.theme.disabled,
      );
    }
  }

  reset() {
    this.unregisterSemanticTargets();
    this.rows.clear();
    this.model = {};
    this.actions = {};
    this.enabled = false;
    this.root.visible = false;
    this.root.renderable = false;
    this.root.eventMode = 'none';
    this.clearMotion();
    this.panel.root.scale.set(1);
    setText(this.count, '');
    setText(this.lockedLabel, '');
    setText(this.bubble, '');
    setText(this.status, '');
    setText(this.activeText, '');
    setText(this.previewLabel, '');
    setText(this.message, '');
    this.progress.clearTimer(0);
    this.progress.root.visible = false;
    for (const button of Object.values(this.buttons)) {
      button.reset();
    }
  }

  unregisterSemanticTargets() {
    for (const semanticId of this.semanticIds) {
      this.semanticTargets?.unregister?.(semanticId);
    }
    this.semanticIds.length = 0;
  }

  destroy() {
    this.unregisterSemanticTargets();
    releaseRegistration(this.pressRegistration);
    releaseRegistration(this.dropRegistration);
    this.rows.destroy();
    this.rowPool.destroy();
    for (const button of Object.values(this.buttons)) {
      button.destroy();
    }
    this.progress.destroy();
    this.panel.destroy();
    this.root.destroy({ children: true });
  }
}

export class BrewingCauldronRow {
  constructor({ instanceId, inputRouter, cauldron }) {
    this.cauldronWidget = cauldron;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.model = {};
    this.cauldron = {};
    this.actions = {};
    this.enabled = false;
    this.root = new Container({
      label: `brewing-cauldron-row-${instanceId}`,
    });
    this.count = createText('', {
      ...RETAINED_TEXT_STYLES.body,
      align: 'right',
    });
    this.count.anchor.set(1, 0);
    this.label = createText('', RETAINED_TEXT_STYLES.body);
    this.value = createText('', {
      ...RETAINED_TEXT_STYLES.body,
      align: 'right',
    });
    this.value.anchor.set(1, 0);
    this.root.addChild(this.count, this.label, this.value);
    this.registration =
      inputRouter?.registerPressTarget?.({
        id: `brewing.cauldron.row.instance.${instanceId}`,
        displayObject: this.root,
        enabled: () => this.enabled,
        onActivate: () => this.activate(),
      }) ?? null;
  }

  bind(model, cauldron, actions) {
    this.model = model ?? {};
    this.cauldron = cauldron ?? {};
    this.actions = actions ?? {};
    this.enabled =
      this.model.disabled !== true &&
      (this.model.removable === true ||
        typeof this.model.onActivate === 'function');
    setText(
      this.count,
      this.model.countText ??
        (this.model.quantity === undefined
          ? ''
          : `${this.model.quantity} `),
    );
    setText(this.label, this.model.label ?? '');
    setText(
      this.value,
      this.model.valueText ??
        (this.model.fulfilled === true ? '✓' : ''),
    );
    this.root.visible = this.model.visible !== false;
    this.root.renderable = this.root.visible;
    this.root.eventMode = this.enabled ? 'static' : 'passive';
    this.applyTheme(this.theme);
  }

  activate() {
    const start =
      this.cauldronWidget.page.getDisplayObjectCenter(this.root);
    const ingredient = this.model;
    const result =
      this.model.onActivate?.(this.model, this.cauldron) ??
      this.actions.removeIngredient?.(
        this.model,
        this.cauldron,
      ) ??
      false;
    if (didActionSucceed(result)) {
      this.cauldronWidget.page.animateIngredientReturn(
        start,
        ingredient,
      );
    }
    return result;
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(
      0,
      0,
      width,
      BREWING_PIXI_GEOMETRY.rowHeight,
    );
    this.count.position.set(14, 2);
    this.label.position.set(19, 2);
    this.value.position.set(width, 2);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    const color =
      this.model.disabled === true
        ? this.theme.disabled
        : this.theme.resourceColors.herb;
    applyTextTheme(this.count, this.theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: color,
      align: 'right',
    });
    applyTextTheme(this.label, this.theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: color,
    });
    applyTextTheme(this.value, this.theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill:
        this.model.fulfilled === true
          ? this.theme.text
          : this.theme.muted,
      fontWeight: this.model.fulfilled === true ? '700' : '400',
      align: 'right',
    });
  }

  reset() {
    this.model = {};
    this.cauldron = {};
    this.actions = {};
    this.enabled = false;
    this.root.visible = false;
    this.root.renderable = false;
    this.root.eventMode = 'none';
    setText(this.count, '');
    setText(this.label, '');
    setText(this.value, '');
  }

  destroy() {
    releaseRegistration(this.registration);
    this.root.destroy({ children: true });
  }
}

export class BrewingCauldronButton {
  constructor({ id, assetManager, inputRouter, action }) {
    this.id = id;
    this.assetManager = assetManager;
    this.action = action;
    this.model = {};
    this.enabled = false;
    this.selected = false;
    this.costMode = false;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.root = new Container({ label: id });
    this.root.eventMode = 'passive';
    this.button = new RetainedButton({
      assetManager,
      label: '',
      buttonLabel: `${id}.regular`,
      onActivate: () => this.activate(),
      inputRouter,
      sizeTier: 30,
      variant: 'yellow',
    });
    this.costButton = new PixiCostButton({
      assetManager,
      inputRouter,
      width: BREWING_PIXI_GEOMETRY.actionWidth,
      height: BREWING_PIXI_GEOMETRY.actionHeight,
      compact: true,
      action: () => this.activate(),
      label: `${id}.cost`,
    });
    this.costButton.visible = false;
    this.costButton.renderable = false;
    this.costButton.setEnabled(false);
    this.button.text.visible = false;
    this.label = createText('', RETAINED_TEXT_STYLES.body);
    this.label.anchor.set(0.5);
    this.cost = createText('', RETAINED_TEXT_STYLES.border);
    this.cost.anchor.set(0.5);
    this.root.addChild(
      this.button.root,
      this.costButton,
      this.label,
      this.cost,
    );
    this.notification = new PixiNotificationBadge({ assetManager });
    this.notification.root.label = `${id}.notification`;
  }

  bind(model) {
    this.model = model ?? {};
    this.costMode = isBrewingBuyCostAction(this.model);
    this.enabled =
      this.model.enabled !== false &&
      this.model.disabled !== true;
    this.selected = this.model.selected === true;
    this.root.visible = this.model.visible !== false;
    this.root.renderable = this.root.visible;
    this.button.root.visible = !this.costMode;
    this.button.root.renderable = !this.costMode;
    this.costButton.visible = this.costMode;
    this.costButton.renderable = this.costMode;
    const baseLabel = this.model.label ?? '';
    const label =
      this.model.locked === true &&
      !String(baseLabel).endsWith(' lock')
        ? `${baseLabel} lock`
        : baseLabel;
    setText(this.label, label);
    setText(
      this.cost,
      this.model.hasCost === false
        ? ''
        : this.model.costText ?? '',
    );
    this.label.visible = !this.costMode;
    this.cost.visible = !this.costMode && Boolean(this.cost.text);

    if (this.costMode) {
      this.button.setModel({
        label: '',
        enabled: false,
        selected: false,
      });
      this.costButton.setModel({
        amountLabel: this.model.costText,
        resource: this.model.costResource ?? 'coin',
        state: 'available',
        enabled: this.enabled,
        action: () => this.activate(),
      });
    } else {
      this.costButton.setEnabled(false);
      this.costButton.setAction(null);
      this.button.setModel({
        label: '',
        enabled: this.enabled,
        selected: false,
        action: () => this.activate(),
      });
      this.button.text.visible = false;
    }
    this.notification.bind(this.id, {
      active:
        !this.costMode &&
        isNotificationActive(this.model.notification),
      tone: getNotificationTone(
        this.model.notification,
        this.model.notificationTone,
      ),
      parent: this.root,
      bounds: {
        x: 0,
        y: 0,
        width: BREWING_PIXI_GEOMETRY.actionWidth,
        height: BREWING_PIXI_GEOMETRY.actionHeight,
      },
    });
    this.applyTheme(this.theme);
  }

  activate() {
    if (!this.enabled || !this.root.visible) {
      return false;
    }
    return this.model.onActivate?.(this.model) ?? this.action?.() ?? true;
  }

  setBounds(x, y) {
    this.root.position.set(x, y);
    this.button.setBounds(
      0,
      0,
      BREWING_PIXI_GEOMETRY.actionWidth,
      BREWING_PIXI_GEOMETRY.actionHeight,
    );
    this.costButton.setBounds(
      0,
      0,
      BREWING_PIXI_GEOMETRY.actionWidth,
      BREWING_PIXI_GEOMETRY.actionHeight,
    );
    const hasCost = Boolean(this.cost.text);
    this.label.position.set(
      BREWING_PIXI_GEOMETRY.actionWidth / 2,
      hasCost ? 9 : BREWING_PIXI_GEOMETRY.actionHeight / 2,
    );
    this.cost.position.set(
      BREWING_PIXI_GEOMETRY.actionWidth / 2,
      20,
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.button.applyTheme(this.theme);
    this.costButton.applyTheme(this.theme);
    this.notification.applyTheme(this.theme);
    applyTextTheme(this.label, this.theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: this.enabled
        ? this.theme.text
        : this.theme.disabled,
      align: 'center',
    });
    applyTextTheme(this.cost, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill:
        this.theme.resourceColors[this.model.costResource ?? 'mana'] ??
        this.theme.text,
      align: 'center',
    });
  }

  reset() {
    this.model = {};
    this.enabled = false;
    this.selected = false;
    this.costMode = false;
    this.root.visible = false;
    this.root.renderable = false;
    this.button.setModel({
      label: '',
      enabled: false,
      selected: false,
    });
    this.button.root.visible = true;
    this.button.root.renderable = true;
    this.costButton.reset();
    this.notification.reset();
    setText(this.label, '');
    setText(this.cost, '');
    this.label.visible = true;
    this.cost.visible = false;
  }

  destroy() {
    this.notification.destroy();
    this.button.destroy();
    this.costButton.destroy({ children: true });
    this.root.destroy({ children: false });
  }
}

function isBrewingBuyCostAction(model = {}) {
  return (
    model.id === 'buy' &&
    model.hasCost !== false &&
    String(model.costText ?? '').trim().length > 0
  );
}

export class BrewingInventoryPanel {
  constructor({
    id,
    kind,
    title,
    page,
    assetManager,
    inputRouter,
    semanticTargets,
    counters,
    draggable = false,
  }) {
    this.id = id;
    this.kind = kind;
    this.page = page;
    this.inputRouter = inputRouter;
    this.semanticTargets = semanticTargets;
    this.draggable = draggable;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.model = {};
    this.actions = {};
    this.instanceSequence = 0;
    this.panel = new RetainedPanel({
      assetManager,
      label: title,
      panelLabel: id,
    });
    this.root = this.panel.root;
    this.count = createText('0/0', {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
    });
    this.count.anchor.set(1, 0);
    this.toggle = createText('expand', {
      ...RETAINED_TEXT_STYLES.border,
      align: 'center',
    });
    this.toggle.anchor.set(0.5, 0);
    this.toggleHit = new Container({ label: `${id}-toggle` });
    this.toggleHit.addChild(this.toggle);
    this.rowsLayer = new Container({ label: `${id}-rows` });
    this.panel.root.addChild(this.count, this.toggleHit);
    this.panel.body.addChild(this.rowsLayer);
    this.toggleRegistration =
      this.inputRouter?.registerPressTarget?.({
        id: `${id}.toggle`,
        displayObject: this.toggleHit,
        enabled: () =>
          this.root.visible && this.model.canToggle === true,
        onActivate: () =>
          this.model.onToggle?.(this.model) ??
          this.actions.toggleInventoryExpanded?.(this.kind) ??
          true,
      }) ?? null;
    this.rowPool = new WidgetPool({
      name: `${id} row pool`,
      counters,
      create: () =>
        new BrewingInventoryRow({
          id: `${id}.row.instance.${++this.instanceSequence}`,
          kind,
          assetManager,
          inputRouter,
          semanticTargets,
          draggable,
          page,
        }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 40,
    });
    this.rows = new PooledCollection({
      name: `${id} rows`,
      pool: this.rowPool,
      counters,
      keyOf: (row, index) =>
        row.id ??
        row.itemTypeId ??
        row.key ??
        `${kind}-${index}`,
      bind: (widget, row) => widget.bind(row, this.actions),
      afterReconcile: (rows) => this.orderRows(rows),
    });
    this.height = 0;
  }

  bind(model) {
    this.model = model ?? {};
    this.actions = this.model.actions ?? {};
    const allRows = normalizeRows(this.model.rows);
    const visibleLimit =
      this.model.expanded === true
        ? allRows.length
        : Math.min(allRows.length, 6);
    this.rows.reconcile(allRows.slice(0, visibleLimit));
    this.model.canToggle =
      this.model.canToggle ?? allRows.length > 6;
    this.root.visible = this.model.visible === true;
    this.root.renderable = this.root.visible;
    this.root.eventMode = this.root.visible ? 'auto' : 'none';
    setText(
      this.count,
      this.model.countText ?? `${visibleLimit}/${allRows.length}`,
    );
    setText(
      this.toggle,
      this.model.expanded === true ? 'collapse' : 'expand',
    );
    this.toggleHit.visible = this.model.canToggle === true;
    this.layoutRows();
  }

  orderRows(rows) {
    this.rowsLayer.removeChildren();
    for (const row of rows) {
      this.rowsLayer.addChild(row.root);
    }
  }

  setWidth(width) {
    this.width = width;
    this.layoutRows();
  }

  layoutRows() {
    const width = this.width ?? 328;
    const rows = this.rows?.getWidgets?.() ?? [];
    const columns = 2;
    const gap = 12;
    const innerWidth = width - 24;
    const columnWidth = (innerWidth - gap) / columns;
    rows.forEach((row, index) =>
      row.setBounds(
        (index % columns) * (columnWidth + gap),
        Math.floor(index / columns) *
          BREWING_PIXI_GEOMETRY.rowHeight,
        columnWidth,
      ),
    );
    const rowCount = Math.max(3, Math.ceil(rows.length / columns));
    this.height =
      rowCount * BREWING_PIXI_GEOMETRY.rowHeight + 10 + 14;
    this.panel.setBounds(0, 0, width, this.height);
    this.rowsLayer.position.set(10, 5);
    this.count.position.set(width - 8, -7);
    this.toggleHit.position.set(width / 2, this.height - 7);
    this.toggleHit.hitArea = new Rectangle(-32, 0, 64, 14);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.panel.applyTheme(this.theme);
    applyTextTheme(this.count, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
    });
    applyTextTheme(this.toggle, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      align: 'center',
    });
    for (const row of this.rows.getWidgets()) {
      row.applyTheme(this.theme);
    }
  }

  destroy() {
    releaseRegistration(this.toggleRegistration);
    this.rows.destroy();
    this.rowPool.destroy();
    this.panel.destroy();
  }
}

export class BrewingInventoryRow {
  constructor({
    id,
    kind,
    assetManager,
    inputRouter,
    semanticTargets,
    draggable,
    page,
  }) {
    this.id = id;
    this.kind = kind;
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.semanticTargets = semanticTargets;
    this.draggable = draggable;
    this.page = page;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.model = {};
    this.actions = {};
    this.semanticId = null;
    this.enabled = false;
    this.pressed = false;
    this.dragging = false;
    this.picked = false;
    this.pickMotionStart = null;
    this.returnMotionStart = null;
    this.quantityValue = 0;
    this.pickedPreviewQuantity = null;
    this.layoutX = 0;
    this.layoutY = 0;
    this.layoutWidth = 0;
    this.root = new Container({ label: id });
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.label = `${id}-icon`;
    this.label = createText('', RETAINED_TEXT_STYLES.body);
    this.quantity = createText('', {
      ...RETAINED_TEXT_STYLES.body,
      align: 'right',
    });
    this.quantity.anchor.set(1, 0);
    this.root.addChild(this.icon, this.label, this.quantity);
    this.notification = new PixiNotificationBadge({ assetManager });
    this.notification.root.label = `${id}.notification`;
    this.pressRegistration =
      this.inputRouter?.registerPressTarget?.({
        id,
        displayObject: this.root,
        enabled: () => this.enabled,
        onPressChange: (pressed) => this.setPressed(pressed),
        onActivate: () => this.activate(),
      }) ?? null;
    this.dragRegistration = this.draggable
      ? this.inputRouter?.registerDragSource?.({
          id: `${id}.drag`,
          displayObject: this.root,
          threshold: BREWING_HERB_DRAG_THRESHOLD,
          enabled: () => this.enabled,
          onDragStart: (context) =>
            this.page.beginHerbDrag(this, context),
          onDragMove: (context) => {
            this.page.moveHerbDrag(this, context);
            return this.actions.previewHerbDrag?.(
              this.model,
              context,
            );
          },
          onDragEnd: (context) =>
            this.page.finishHerbDrag(
              this,
              context,
              context.accepted,
            ),
          onDragCancel: (context) =>
            this.page.cancelHerbDrag(this, context),
        })
      : null;
  }

  bind(model, actions) {
    this.unregisterSemantic();
    this.model = model ?? {};
    this.actions = actions ?? {};
    const quantity = finiteOr(
      this.model.availableQuantity,
      finiteOr(this.model.quantity, 0),
    );
    this.quantityValue = quantity;
    this.enabled =
      quantity > 0 &&
      this.model.locked !== true &&
      this.model.unknown !== true &&
      this.model.disabled !== true;
    const key = this.model.iconKey ?? this.model.key;
    const frame =
      this.model.iconFrame ??
      (this.kind === 'herb'
        ? getHerbIconFrameName(key)
        : getPotionIconFrameName(key));
    this.icon.texture = frame
      ? getAtlasTexture(this.assetManager, frame)
      : Texture.EMPTY;
    setText(
      this.label,
      this.model.displayLabel ?? this.model.label ?? '',
    );
    this.updateQuantityText();
    this.root.visible = true;
    this.root.renderable = true;
    this.root.eventMode = this.enabled ? 'static' : 'passive';
    this.semanticId =
      this.model.semanticId ??
      `brewing.inventory.${this.kind}.${this.model.key ?? this.model.itemTypeId ?? this.model.id}`;
    this.semanticTargets?.register?.({
      semanticId: this.semanticId,
      tutorialId:
        this.model.tutorialId ??
        (this.kind === 'herb' && this.model.key
          ? `brewing:herb:${this.model.key}`
          : null),
      displayObject: this.root,
      state: () => ({
        visible: this.root.visible && this.root.renderable,
        interactive: this.enabled,
        enabled: this.enabled,
        active: !this.root.destroyed,
      }),
      activate: () => this.activate(),
    });
    this.bindNotification();
    this.applyTheme(this.theme);
    this.updateMotion(this.page.timeSource());
  }

  activate() {
    return (
      this.model.onActivate?.(this.model) ??
      (this.kind === 'herb'
        ? this.actions.addHerb?.(this.model)
        : this.actions.inspectPotion?.(this.model)) ??
      true
    );
  }

  setPressed(pressed) {
    this.pressed = Boolean(pressed) && this.enabled;
    this.setPicked(this.pressed || this.dragging);
  }

  beginDrag() {
    this.dragging = true;
    this.setPicked(true);
  }

  endDrag() {
    this.dragging = false;
    this.pressed = false;
    this.setPicked(false);
  }

  setPicked(picked) {
    const next = Boolean(picked) && this.enabled;
    if (this.picked === next) {
      return;
    }
    this.picked = next;
    if (next) {
      this.pickMotionStart = this.page.timeSource();
      this.returnMotionStart = null;
      this.pickedPreviewQuantity = this.quantityValue;
    } else {
      this.pickMotionStart = null;
      this.pickedPreviewQuantity = null;
    }
    this.updateQuantityText();
    this.applyTheme(this.theme);
    this.updateMotion(this.page.timeSource());
  }

  updateQuantityText() {
    const previewValue =
      this.picked && this.pickedPreviewQuantity !== null
        ? Math.max(0, this.pickedPreviewQuantity - 1)
        : this.quantityValue;
    setText(
      this.quantity,
      this.model.quantityText !== undefined && !this.picked
        ? this.model.quantityText
        : String(previewValue),
    );
  }

  startReturnMotion(now = this.page.timeSource()) {
    if (this.page.prefersReducedMotion()) {
      this.returnMotionStart = null;
      this.applyVisualMotion({ x: 0, rotation: 0, countY: 0 });
      return;
    }
    this.returnMotionStart = finiteOr(now, this.page.timeSource());
    this.updateMotion(now);
  }

  updateMotion(now = this.page.timeSource()) {
    if (this.page.prefersReducedMotion()) {
      this.applyVisualMotion({ x: 0, rotation: 0, countY: 0 });
      return;
    }
    if (this.picked && this.pickMotionStart !== null) {
      const elapsed = Math.max(0, now - this.pickMotionStart);
      const phase =
        (elapsed % BREWING_HERB_PICK_NUDGE_MS) /
        BREWING_HERB_PICK_NUDGE_MS;
      const easedPhase = cubicBezierProgress(
        phase,
        0.39,
        0.575,
        0.565,
        1,
      );
      const wave =
        easedPhase <= 0.5
          ? easedPhase * 2
          : (1 - easedPhase) * 2;
      const countProgress = clamp(
        elapsed / BREWING_HERB_COUNT_NUDGE_MS,
        0,
        1,
      );
      this.applyVisualMotion({
        x: wave,
        rotation: degreesToRadians(wave * 0.5),
        countY:
          1 -
          cubicBezierProgress(
            countProgress,
            0.39,
            0.575,
            0.565,
            1,
          ),
      });
      return;
    }
    if (this.returnMotionStart !== null) {
      const progress = clamp(
        (now - this.returnMotionStart) /
          BREWING_HERB_RETURN_NUDGE_MS,
        0,
        1,
      );
      const eased = cubicBezierProgress(
        progress,
        0.39,
        0.575,
        0.565,
        1,
      );
      const x =
        eased <= 0.58
          ? lerp(0, -1, eased / 0.58)
          : lerp(-1, 0, (eased - 0.58) / 0.42);
      this.applyVisualMotion({ x, rotation: 0, countY: 0 });
      if (progress >= 1) {
        this.returnMotionStart = null;
        this.applyVisualMotion({
          x: 0,
          rotation: 0,
          countY: 0,
        });
      }
      return;
    }
    this.applyVisualMotion({ x: 0, rotation: 0, countY: 0 });
  }

  applyVisualMotion({ x, rotation, countY }) {
    if (Math.abs(x) < 0.0001 && Math.abs(rotation) < 0.0001) {
      this.root.pivot.set(0, 0);
      this.root.position.set(this.layoutX, this.layoutY);
      this.root.rotation = 0;
    } else {
      const centerX = this.layoutWidth / 2;
      const centerY = BREWING_PIXI_GEOMETRY.rowHeight / 2;
      this.root.pivot.set(centerX, centerY);
      this.root.position.set(
        this.layoutX + centerX + x,
        this.layoutY + centerY,
      );
      this.root.rotation = rotation;
    }
    this.quantity.y = 2 + countY;
  }

  clearMotion() {
    this.pressed = false;
    this.dragging = false;
    this.picked = false;
    this.pickMotionStart = null;
    this.returnMotionStart = null;
    this.pickedPreviewQuantity = null;
    this.updateQuantityText();
    this.applyVisualMotion({ x: 0, rotation: 0, countY: 0 });
  }

  setBounds(x, y, width) {
    this.layoutX = x;
    this.layoutY = y;
    this.layoutWidth = width;
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(
      0,
      0,
      width,
      BREWING_PIXI_GEOMETRY.rowHeight,
    );
    this.icon.position.set(0, 3);
    this.icon.width = 12;
    this.icon.height = 12;
    this.icon.visible = this.icon.texture !== Texture.EMPTY;
    this.label.position.set(this.icon.visible ? 15 : 0, 2);
    this.quantity.position.set(width, 2);
    this.bindNotification();
    this.updateMotion(this.page.timeSource());
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.notification.applyTheme(this.theme);
    const color = this.enabled
      ? this.theme.resourceColors[this.kind] ?? this.theme.text
      : this.theme.disabled;
    applyTextTheme(this.label, this.theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: color,
    });
    applyTextTheme(this.quantity, this.theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: color,
      fontWeight: this.picked ? '700' : '400',
      align: 'right',
    });
    this.bindNotification();
  }

  bindNotification() {
    const active =
      this.kind === 'herb' &&
      isNotificationActive(this.model.notification);
    const labelWidth =
      Number(this.label.width) ||
      Number(this.label.getLocalBounds?.().width) ||
      0;
    this.notification.bind(this.semanticId ?? this.id, {
      active,
      tone: getNotificationTone(
        this.model.notification,
        this.model.notificationTone,
      ),
      parent: this.root,
      bounds: {
        x: this.label.x,
        y: this.label.y,
        width:
          labelWidth + PIXI_UI_GEOMETRY.notificationSize / 2,
        height: this.label.height,
      },
    });
  }

  reset() {
    this.unregisterSemantic();
    this.clearMotion();
    this.model = {};
    this.actions = {};
    this.enabled = false;
    this.root.visible = false;
    this.root.renderable = false;
    this.root.eventMode = 'none';
    this.icon.texture = Texture.EMPTY;
    this.quantityValue = 0;
    this.notification.reset();
    setText(this.label, '');
    setText(this.quantity, '');
  }

  unregisterSemantic() {
    if (this.semanticId) {
      this.semanticTargets?.unregister?.(this.semanticId);
      this.semanticId = null;
    }
  }

  destroy() {
    this.unregisterSemantic();
    releaseRegistration(this.pressRegistration);
    releaseRegistration(this.dragRegistration);
    this.notification.destroy();
    this.root.destroy({ children: true });
  }
}

class BrewingItemMotionGhost {
  constructor(instanceId) {
    this.root = new Container({
      label: `brewing-item-motion-ghost-${instanceId}`,
    });
    this.root.eventMode = 'none';
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.anchor.set(0.5);
    this.icon.width = BREWING_ITEM_GHOST_SIZE;
    this.icon.height = BREWING_ITEM_GHOST_SIZE;
    this.root.addChild(this.icon);
    this.reset();
  }

  bind({
    texture = Texture.EMPTY,
    itemKind = '',
    itemKey = '',
    size = BREWING_ITEM_GHOST_SIZE,
  } = {}) {
    this.itemKind = itemKind;
    this.itemKey = itemKey;
    this.icon.texture = texture;
    this.icon.width = size;
    this.icon.height = size;
    this.root.visible = true;
    this.root.renderable = true;
    this.root.alpha = 1;
    this.root.scale.set(1);
    this.root.rotation = 0;
    this.setSway({ x: 0, y: 0, rotation: 0 });
  }

  setPosition(x, y) {
    this.root.position.set(x, y);
  }

  setSway({ x = 0, y = 0, rotation = 0 } = {}) {
    this.icon.position.set(x, y);
    this.icon.rotation = degreesToRadians(rotation);
  }

  reset() {
    this.root.parent?.removeChild(this.root);
    this.root.visible = false;
    this.root.renderable = false;
    this.root.position.set(0, 0);
    this.root.scale.set(1);
    this.root.rotation = 0;
    this.root.alpha = 1;
    this.icon.texture = Texture.EMPTY;
    this.icon.position.set(0, 0);
    this.icon.rotation = 0;
    this.itemKind = '';
    this.itemKey = '';
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

export class BrewingInventoryButton {
  constructor({
    id,
    label,
    side,
    texture,
    inputRouter,
    semanticTargets,
    tutorialId = null,
    action,
  }) {
    this.id = id;
    this.side = side;
    this.action = action;
    this.selected = false;
    this.pressed = false;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.root = new Container({ label: id });
    this.icon = new Sprite(texture);
    this.icon.label = `${id}-icon`;
    this.label = createText(label, {
      fontSize: 7.15,
      lineHeight: 9.1,
      align: side === 'right' ? 'right' : 'left',
    });
    if (side === 'right') {
      this.label.anchor.set(1, 0);
    }
    this.selection = new Graphics({ label: `${id}-selection` });
    this.root.addChild(this.selection, this.icon, this.label);
    this.registration =
      inputRouter?.registerPressTarget?.({
        id,
        displayObject: this.root,
        focusable: true,
        onPressChange: (pressed) => this.setPressed(pressed),
        onActivate: () => this.action?.() ?? true,
      }) ?? null;
    this.semanticTargets = semanticTargets;
    semanticTargets?.register?.({
      semanticId: id,
      tutorialId,
      displayObject: this.root,
      state: () => ({
        visible: this.root.visible && this.root.renderable,
        interactive: true,
        enabled: true,
        selected: this.selected,
        active: !this.root.destroyed,
      }),
      activate: () => this.action?.() ?? true,
    });
  }

  setBounds(x, y) {
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(
      0,
      BREWING_PIXI_GEOMETRY.inventoryButtonHeight -
        BREWING_PIXI_GEOMETRY.inventoryOpenHeight,
      BREWING_PIXI_GEOMETRY.inventoryButtonWidth,
      BREWING_PIXI_GEOMETRY.inventoryOpenHeight,
    );
    this.icon.position.set(1.75, 12);
    this.icon.width = 42;
    this.icon.height = 42;
    this.label.position.set(
      this.side === 'right'
        ? BREWING_PIXI_GEOMETRY.inventoryButtonWidth
        : 0,
      BREWING_PIXI_GEOMETRY.inventoryButtonHeight - 13,
    );
    this.redraw();
  }

  setSelected(selected) {
    this.selected = Boolean(selected);
    this.redraw();
  }

  setPressed(pressed) {
    this.pressed = Boolean(pressed);
    this.icon.scale.set(this.pressed ? 0.965 : 1);
    this.icon.y = 12 + (this.pressed ? 1 : 0);
    this.label.y =
      BREWING_PIXI_GEOMETRY.inventoryButtonHeight -
      13 +
      (this.pressed ? 1 : 0);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    applyTextTheme(this.label, this.theme, {
      fontSize: 7.15,
      lineHeight: 9.1,
      align: this.side === 'right' ? 'right' : 'left',
    });
    this.redraw();
  }

  redraw() {
    this.selection.clear();
    if (this.selected) {
      this.selection
        .rect(
          0,
          10,
          BREWING_PIXI_GEOMETRY.inventoryButtonWidth,
          58,
        )
        .stroke({
          color: this.theme.stroke,
          width: 1,
          alpha: 0.5,
        });
    }
  }

  destroy() {
    this.semanticTargets?.unregister?.(this.id);
    releaseRegistration(this.registration);
    this.root.destroy({ children: true });
  }
}

function layoutCauldronArt(widget) {
  const artWidth = BREWING_PIXI_GEOMETRY.cauldronArtWidth - 20;
  const artHeight = widget.height - 35;
  const sourceWidth = 600;
  const sourceHeight = 486;
  const fit = Math.min(
    artWidth / sourceWidth,
    artHeight / sourceHeight,
  );
  const width = sourceWidth * fit * 0.9;
  const height = sourceHeight * fit * 0.9;
  const x = (BREWING_PIXI_GEOMETRY.cauldronArtWidth - width) / 2;
  const y = (artHeight - height) / 2;
  for (const sprite of [widget.cauldronImage, widget.liquidMask]) {
    sprite.position.set(x, y);
    sprite.width = width;
    sprite.height = height;
  }
  widget.previewIcon.position.set(67, widget.height - 27);
  widget.previewIcon.width = 22;
  widget.previewIcon.height = 22;
  widget.previewLabel.position.set(
    BREWING_PIXI_GEOMETRY.cauldronArtWidth / 2,
    widget.height - 25,
  );
}

function resolveCauldronTitle(model, number) {
  const level = Math.max(1, Math.floor(Number(model.level) || 1));
  const star = level > 1 ? ` ★${level - 1}` : '';
  return `cauldron ${number}${star}`;
}

function resolveLockedLabel(model) {
  if (model.lockedLabel !== undefined) {
    return String(model.lockedLabel ?? '');
  }
  if (model.nextCauldronLockedByLevel) {
    return `level ${model.nextCauldronRequiresLevel ?? '?'}`;
  }
  if (model.nextCauldronLockedByResearch) {
    return 'research';
  }
  if (
    model.canBuyCauldron === true ||
    Number.isFinite(model.nextCauldronCost)
  ) {
    return 'buy';
  }
  return 'locked';
}

function resolveBubbleText(model) {
  if (model.bubbleText !== undefined) {
    return String(model.bubbleText ?? '');
  }
  if (model.unlocked === false) {
    return resolveLockedLabel(model);
  }
  if (model.activeBrew) {
    return model.activeBrew.text ?? model.activeBrew.label ?? '';
  }
  const ingredients = normalizeRows(model.ingredients);
  if (ingredients.length === 0) {
    return model.emptyText ?? '';
  }
  return ingredients
    .slice(0, 2)
    .map(
      (ingredient) =>
        `${ingredient.quantity ?? 1} ${ingredient.label ?? ''}`,
    )
    .join(', ');
}

function resolveFallbackPrimaryAction(model) {
  if (model.unlocked === false) {
    const levelLocked = model.nextCauldronLockedByLevel === true;
    const researchLocked =
      model.nextCauldronLockedByResearch === true;
    const hasCost =
      !levelLocked &&
      !researchLocked &&
      Number.isFinite(model.nextCauldronCost);
    const label = resolveLockedLabel(model);
    return {
      id: 'buy',
      label,
      hasCost,
      enabled: model.canBuyCauldron === true,
      disabled: model.canBuyCauldron !== true,
      locked: levelLocked || researchLocked,
      costText: Number.isFinite(model.nextCauldronCost)
        ? `${model.nextCauldronCost} coin`
        : '',
      costResource: 'coin',
    };
  }
  if (model.activeBrew?.canStartBottling === true) {
    return { id: 'bottle', label: 'bottle', enabled: true };
  }
  if (
    model.selectedRecipe &&
    normalizeRows(model.ingredients).length === 0
  ) {
    return {
      id: 'fill',
      label: 'fill recipe',
      enabled: model.canFillRecipe === true,
    };
  }
  return {
    id: 'brew',
    label: 'brew',
    enabled: model.canBrew === true,
    costText: Number.isFinite(model.manaCost)
      ? `${model.manaCost} mana`
      : '',
    costResource: 'mana',
  };
}

function nextBrewQuantity(model) {
  const current = Math.max(
    1,
    Math.floor(Number(model.brewQuantity) || 1),
  );
  const maximum = Math.max(
    1,
    Math.floor(Number(model.maxBrewQuantity) || 1),
  );
  return current >= maximum ? 1 : current + 1;
}

function drawDashedRect(graphics, x, y, width, height, color) {
  const dash = 5;
  const gap = 3;
  const drawLine = (x1, y1, x2, y2) => {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const dx = (x2 - x1) / length;
    const dy = (y2 - y1) / length;
    for (
      let distance = 0;
      distance < length;
      distance += dash + gap
    ) {
      const end = Math.min(length, distance + dash);
      graphics
        .moveTo(x1 + dx * distance, y1 + dy * distance)
        .lineTo(x1 + dx * end, y1 + dy * end);
    }
  };
  drawLine(x, y, x + width, y);
  drawLine(x + width, y, x + width, y + height);
  drawLine(x + width, y + height, x, y + height);
  drawLine(x, y + height, x, y);
  graphics.stroke({ color, width: 1, alpha: 0.45 });
}

function getTexture(assetManager, id) {
  return assetManager?.getTexture?.(id) ?? Texture.EMPTY;
}

function getAtlasTexture(assetManager, frameName) {
  return frameName
    ? assetManager?.getAtlasTexture?.(frameName) ?? Texture.EMPTY
    : Texture.EMPTY;
}

function normalizeCauldronIndex(value) {
  const index = Math.floor(Number(value));
  return Number.isInteger(index) && index >= 0 ? index : 0;
}

function colorNumber(value) {
  if (typeof value === 'number') {
    return value;
  }
  const normalized = String(value ?? '').replace(/^#/, '');
  const parsed = Number.parseInt(normalized, 16);
  return Number.isFinite(parsed) ? parsed : 0x0a95f5;
}

function didActionSucceed(result) {
  return result !== false && result?.ok !== false;
}

function applyGhostMotion(motion, progress) {
  if (motion.kind === 'brew' && motion.path) {
    applyBrewIngredientArcMotion(motion, progress);
    return;
  }
  const eased = cubicBezierProgress(progress, 0.25, 1, 0.5, 1);
  const midpoint = 0.58;
  const cauldronDrop =
    motion.kind === 'cauldron' || motion.kind === 'brew';
  const midLift = cauldronDrop
    ? motion.kind === 'brew'
      ? -22
      : -18
    : -8;
  const midScale = cauldronDrop ? 0.92 : 0.96;
  const endScale = cauldronDrop ? 0.58 : 0.72;
  const endAlpha = cauldronDrop ? 0 : 0.35;
  const midRotation = cauldronDrop ? 4 : -3;
  const mid = {
    x: lerp(motion.start.x, motion.target.x, midpoint),
    y:
      lerp(motion.start.y, motion.target.y, midpoint) +
      midLift,
    scale: midScale,
    alpha: 1,
    rotation: midRotation,
  };
  const sample =
    eased <= midpoint
      ? interpolateMotionSample(
          {
            ...motion.start,
            scale: 1,
            alpha: 1,
            rotation: 0,
          },
          mid,
          eased / midpoint,
        )
      : interpolateMotionSample(
          mid,
          {
            ...motion.target,
            scale: endScale,
            alpha: endAlpha,
            rotation: 0,
          },
          (eased - midpoint) / (1 - midpoint),
        );
  motion.ghost.root.position.set(sample.x, sample.y);
  motion.ghost.root.scale.set(sample.scale);
  motion.ghost.root.alpha = sample.alpha;
  motion.ghost.root.rotation = degreesToRadians(sample.rotation);
}

function createBrewIngredientArc(start, target) {
  const deltaX = target.x - start.x;
  const deltaY = target.y - start.y;
  const side = Math.sign(start.x - target.x) || 1;
  const burst = {
    x: side * (12 + Math.min(10, Math.abs(deltaX) * 0.08)),
    y: -18 - Math.min(10, Math.abs(deltaY) * 0.05),
  };
  const lift =
    38 +
    Math.min(24, Math.abs(deltaX) * 0.08) +
    Math.max(0, deltaY) * 0.1;
  return {
    burst,
    control: {
      x:
        (burst.x + deltaX) * 0.5 +
        side * (18 + Math.min(18, Math.abs(deltaX) * 0.06)),
      y: Math.min(burst.y, deltaY) - lift,
    },
    delta: { x: deltaX, y: deltaY },
    side,
  };
}

function applyBrewIngredientArcMotion(motion, progress) {
  const burstEnd = 0.18;
  const eased = clamp(progress, 0, 1);
  let x;
  let y;
  let travelProgress;
  if (eased <= burstEnd) {
    const local = eased / burstEnd;
    x = lerp(0, motion.path.burst.x, local);
    y = lerp(0, motion.path.burst.y, local);
    travelProgress = local * 0.12;
  } else {
    const local = (eased - burstEnd) / (1 - burstEnd);
    const inverse = 1 - local;
    x =
      inverse * inverse * motion.path.burst.x +
      2 * inverse * local * motion.path.control.x +
      local * local * motion.path.delta.x;
    y =
      inverse * inverse * motion.path.burst.y +
      2 * inverse * local * motion.path.control.y +
      local * local * motion.path.delta.y;
    travelProgress = 0.12 + local * 0.88;
  }
  const shrinkProgress = clamp(
    (travelProgress - 0.66) / 0.34,
    0,
    1,
  );
  const fadeProgress = clamp(
    (travelProgress - 0.8) / 0.2,
    0,
    1,
  );
  motion.ghost.root.position.set(
    motion.start.x + x,
    motion.start.y + y,
  );
  motion.ghost.root.scale.set(lerp(1, 0.42, shrinkProgress));
  motion.ghost.root.alpha = 1 - fadeProgress;
  motion.ghost.root.rotation =
    motion.path.side *
    degreesToRadians(8 + travelProgress * 34);
}

function sampleCauldronReceive(progress) {
  const eased = cubicBezierProgress(
    clamp(progress, 0, 1),
    0.39,
    0.575,
    0.565,
    1,
  );
  const frames = [
    { offset: 0, y: 0, scaleX: 1, scaleY: 1 },
    { offset: 0.52, y: 2, scaleX: 1.02, scaleY: 0.98 },
    { offset: 0.76, y: -1, scaleX: 0.99, scaleY: 1.01 },
    { offset: 1, y: 0, scaleX: 1, scaleY: 1 },
  ];
  return sampleKeyframes(frames, eased);
}

function sampleRecipeReceive(progress) {
  const eased = cubicBezierProgress(
    clamp(progress, 0, 1),
    0.39,
    0.575,
    0.565,
    1,
  );
  return eased <= 0.55
    ? lerp(0, 1, eased / 0.55)
    : lerp(1, 0, (eased - 0.55) / 0.45);
}

function sampleCauldronPurchase(progress) {
  const eased = cubicBezierProgress(
    clamp(progress, 0, 1),
    0.39,
    0.575,
    0.565,
    1,
  );
  return sampleKeyframes(
    [
      { offset: 0, alpha: 0.72, scale: 0.985 },
      { offset: 0.68, alpha: 1, scale: 1.018 },
      { offset: 1, alpha: 1, scale: 1 },
    ],
    eased,
  );
}

function sampleKeyframes(frames, progress) {
  let rightIndex = frames.findIndex(
    (frame) => frame.offset >= progress,
  );
  if (rightIndex <= 0) {
    return { ...frames[Math.max(0, rightIndex)] };
  }
  if (rightIndex < 0) {
    return { ...frames.at(-1) };
  }
  const left = frames[rightIndex - 1];
  const right = frames[rightIndex];
  const range = right.offset - left.offset;
  return interpolateMotionSample(
    left,
    right,
    range <= 0 ? 1 : (progress - left.offset) / range,
  );
}

function interpolateMotionSample(left, right, progress) {
  const result = {};
  for (const key of new Set([
    ...Object.keys(left),
    ...Object.keys(right),
  ])) {
    if (key === 'offset') {
      continue;
    }
    result[key] = lerp(
      finiteOr(left[key], finiteOr(right[key], 0)),
      finiteOr(right[key], finiteOr(left[key], 0)),
      progress,
    );
  }
  return result;
}

function cubicBezierProgress(progress, x1, y1, x2, y2) {
  const target = clamp(progress, 0, 1);
  let parameter = target;
  for (let index = 0; index < 5; index += 1) {
    const x = cubicBezierCoordinate(parameter, x1, x2);
    const derivative = cubicBezierDerivative(
      parameter,
      x1,
      x2,
    );
    if (Math.abs(derivative) < 0.0001) {
      break;
    }
    parameter = clamp(
      parameter - (x - target) / derivative,
      0,
      1,
    );
  }
  return cubicBezierCoordinate(parameter, y1, y2);
}

function cubicBezierCoordinate(parameter, point1, point2) {
  const inverse = 1 - parameter;
  return (
    3 * inverse * inverse * parameter * point1 +
    3 * inverse * parameter * parameter * point2 +
    parameter * parameter * parameter
  );
}

function cubicBezierDerivative(parameter, point1, point2) {
  const inverse = 1 - parameter;
  return (
    3 * inverse * inverse * point1 +
    6 * inverse * parameter * (point2 - point1) +
    3 * parameter * parameter * (1 - point2)
  );
}

function degreesToRadians(value) {
  return (finiteOr(value, 0) * Math.PI) / 180;
}

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function rubberClamp(value, minimum, maximum, limit) {
  if (value < minimum) {
    return Math.max(
      minimum - limit,
      minimum - rubberDistance(minimum - value, limit),
    );
  }
  if (value > maximum) {
    return Math.min(
      maximum + limit,
      maximum + rubberDistance(value - maximum, limit),
    );
  }
  return value;
}

function rubberDistance(distance, limit) {
  return limit <= 0
    ? 0
    : limit * (1 - 1 / (distance / limit + 1));
}

function clamp(value, minimum, maximum) {
  return Math.min(
    maximum,
    Math.max(minimum, finiteOr(value, minimum)),
  );
}

function releaseRegistration(registration) {
  if (typeof registration === 'function') {
    registration();
    return;
  }
  registration?.unregister?.();
}

function prefersReducedMotion() {
  return Boolean(
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  );
}
