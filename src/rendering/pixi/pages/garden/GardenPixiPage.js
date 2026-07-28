import {
  Container,
  Graphics,
  Point,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import { getHerbIconFrameName } from '../../../../assets/items/herbs/herbIcons.js';
import { formatRemainingTime } from '../../../../pages/shared/timerDisplay.js';
import { formatCoinPriceText } from '../../../../shared/coinPrice.js';
import { PixiCostButton } from '../../primitives/PixiCostButton.js';
import { PixiNotificationBadge } from '../../global/transient/PixiNotificationBadges.js';
import {
  bindPixiSeedPackIcon,
  layoutPixiSeedPackIcon,
} from '../../primitives/PixiSeedPackIcon.js';
import { PixiStarLevelLabel } from '../../primitives/PixiStarLevelLabel.js';
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
  RetainedPanel,
  RetainedProgressBar,
  applyTextTheme,
  createText,
  finiteOr,
  normalizeRows,
  setText,
} from '../workshop/RetainedPageKit.js';
import {
  GardenConfirmDialogPixi,
  GardenSeedDialogPixi,
} from './GardenDialogPixi.js';

export const GARDEN_PIXI_GEOMETRY = Object.freeze({
  worldTop: 120,
  worldBottom: 162,
  worldWidth: 356,
  worldMinHeight: 560,
  worldEdgeExtension: 16,
  gridPaddingTop: 24,
  gridPaddingX: 16,
  columns: 3,
  columnGap: 12,
  rowHeight: 92,
  rowGap: 20,
  plotWidth: 88,
  plotHeight: 84,
  buyButtonWidth: 80,
  buyButtonHeight: 48,
  progressWidth: 80,
  progressHeight: PIXI_UI_GEOMETRY.progressTotalHeight,
  inventoryButtonWidth: 45.5,
  inventoryButtonHeight: 80.25,
  inventoryOpenHeight: 68.25,
  inventoryPanelBottom: 261.25,
});

const GARDEN_WORLD_MIN_ZOOM = 0.62;
const GARDEN_WORLD_MAX_ZOOM = 1.16;
const GARDEN_PAN_RUBBER_LIMIT = 54;
const GARDEN_ZOOM_RUBBER_LIMIT = 0.12;
const GARDEN_SEED_DRAG_THRESHOLD = 22;
const GARDEN_GROWING_WIND_MS = 2_400;
const GARDEN_READY_LIFT_MS = 1_080;
const GARDEN_SCISSORS_SNIP_MS = 420;
const GARDEN_SEED_PICK_MS = 140;
const GARDEN_SEED_RETURN_MS = 190;
const GARDEN_SEED_DROP_MS = 220;
const GARDEN_PLOT_RECEIVE_MS = 240;
const GARDEN_SEED_GHOST_SIZE = 72;
const GARDEN_SEED_GHOST_POINTER_LIFT = 24;
const GARDEN_DIALOG_IDS = Object.freeze({
  seed: 'garden.seed',
  cancel: 'garden.cancel',
  swap: 'garden.swap',
});
const SOIL_ASSET_IDS = Object.freeze({
  1: 'source:assets/rooms/garden/plots/outpost-plot-ground.png',
  2: 'source:assets/rooms/garden/plots/outpost-plot-ground-level-2.png',
  3: 'source:assets/rooms/garden/plots/outpost-plot-ground-level-3.png',
  4: 'source:assets/rooms/garden/plots/outpost-plot-ground-level-4.png',
  5: 'source:assets/rooms/garden/plots/outpost-plot-ground-level-5.png',
});
const INVENTORY_ASSET_IDS = Object.freeze({
  herbs: 'source:assets/icons/icon-herb-box.png',
  seeds: 'source:assets/icons/icon-seed-box.png',
});

/**
 * Retained Garden room. The display tree and router registrations are built
 * once; presenters provide formatted rows and action callbacks through bind().
 */
export class GardenPixiPage extends BaseRetainedPixiPage {
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
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    super({ pageId: 'garden', semanticTargets, theme });
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.dialogRegistry = dialogRegistry;
    this.dialogLayer = dialogLayer;
    this.actions = actions;
    this.currentActions = actions;
    this.ticker = ticker;
    this.timeSource = timeSource;
    this.active = false;
    this.worldPan = { x: 0, y: 0 };
    this.worldZoom = 1;
    this.worldSize = {
      width: GARDEN_PIXI_GEOMETRY.worldWidth,
      height: GARDEN_PIXI_GEOMETRY.worldMinHeight,
    };
    this.panStart = null;
    this.pinchStart = null;
    this.dragLocalPoint = new Point();
    this.instanceSequence = 0;
    this.tickHandler = () => this.tick(this.timeSource());
    this.boundPlotState = new Map();
    this.hasBoundPlotState = false;

    this.worldViewport = new Container({ label: 'garden-world-viewport' });
    this.worldViewport.eventMode = 'static';
    this.world = new Container({ label: 'garden-world' });
    this.worldMask = new Graphics({ label: 'garden-world-mask' });
    this.worldViewport.addChild(this.world, this.worldMask);
    this.world.mask = this.worldMask;
    this.content.addChild(this.worldViewport);
    this.dragLayer = new Container({ label: 'garden-drag-layer' });
    this.dragLayer.eventMode = 'none';
    this.seedDragGhost = new GardenSeedDragGhost({
      assetManager: this.assetManager,
      parent: this.dragLayer,
    });

    this.plotPool = new WidgetPool({
      name: 'garden plot pool',
      counters,
      create: () =>
        new GardenPlotWidget({
          instanceId: ++this.instanceSequence,
          page: this,
          assetManager: this.assetManager,
          inputRouter: this.inputRouter,
          semanticTargets: this.semanticTargets,
        }),
      reset: (plot) => plot.reset(),
      dispose: (plot) => plot.destroy(),
      maxSize: 24,
    });
    this.plots = new PooledCollection({
      name: 'garden plots',
      pool: this.plotPool,
      counters,
      keyOf: (plot, index) =>
        plot.id ?? plot.tileNumber ?? `plot-${index + 1}`,
      bind: (widget, plot) => widget.bind(plot, this.currentActions),
      afterReconcile: (plots) => this.orderPlots(plots),
    });

    this.inventoryLayer = new Container({ label: 'garden-inventory-layer' });
    this.herbInventory = new GardenInventoryPanel({
      id: 'garden.inventory.herbs',
      kind: 'herb',
      title: 'herbs',
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      semanticTargets: this.semanticTargets,
      counters,
    });
    this.seedInventory = new GardenInventoryPanel({
      id: 'garden.inventory.seeds',
      kind: 'seed',
      title: 'seeds',
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      semanticTargets: this.semanticTargets,
      counters,
      draggable: true,
      motionController: this,
    });
    this.herbsButton = new GardenInventoryButton({
      id: 'garden.inventory.herbs.button',
      tabId: 'herbs',
      label: 'herbs',
      side: 'left',
      texture: getTexture(this.assetManager, INVENTORY_ASSET_IDS.herbs),
      inputRouter: this.inputRouter,
      semanticTargets: this.semanticTargets,
      action: () => this.toggleInventory('herbs'),
    });
    this.seedsButton = new GardenInventoryButton({
      id: 'garden.inventory.seeds.button',
      tabId: 'seeds',
      label: 'seeds',
      side: 'right',
      texture: getTexture(this.assetManager, INVENTORY_ASSET_IDS.seeds),
      inputRouter: this.inputRouter,
      semanticTargets: this.semanticTargets,
      action: () => this.toggleInventory('seeds'),
    });
    this.inventoryLayer.addChild(
      this.herbInventory.root,
      this.seedInventory.root,
      this.herbsButton.root,
      this.seedsButton.root,
    );
    this.content.addChild(this.inventoryLayer);
    this.content.addChild(this.dragLayer);

    this.panRegistration = this.inputRouter?.registerPanSurface?.({
      id: 'garden.world.pan',
      displayObject: this.worldViewport,
      enabled: () => this.active,
      priority: -1,
      onPanStart: () => {
        this.panStart = { ...this.worldPan };
        return true;
      },
      onPan: (context) => this.onWorldPan(context),
      onPanEnd: () => this.settleWorldViewport(),
      onPanCancel: () => this.settleWorldViewport(),
    }) ?? null;
    this.pinchRegistration = this.inputRouter?.registerPinchSurface?.({
      id: 'garden.world.pinch',
      displayObject: this.worldViewport,
      enabled: () => this.active,
      priority: 2,
      onPinchStart: (context) => this.onWorldPinchStart(context),
      onPinch: (context) => this.onWorldPinch(context),
      onPinchEnd: () => this.settleWorldViewport(),
    }) ?? null;

    this.registerDialogs();
    this.applyTheme(theme);
    this.layoutPage(this.sourceWidth, this.sourceHeight);
  }

  registerDialogs() {
    if (!this.dialogRegistry || !this.dialogLayer) {
      return;
    }
    if (!this.dialogRegistry.has(GARDEN_DIALOG_IDS.seed)) {
      this.dialogRegistry.register(
        GARDEN_DIALOG_IDS.seed,
        () =>
          new GardenSeedDialogPixi({
            parent: this.dialogLayer,
            inputRouter: this.inputRouter,
            semanticTargets: this.semanticTargets,
            assetManager: this.assetManager,
            onClose: () => this.closeDialog('seed'),
            theme: this.theme,
          }),
      );
    }
    if (!this.dialogRegistry.has(GARDEN_DIALOG_IDS.cancel)) {
      this.dialogRegistry.register(
        GARDEN_DIALOG_IDS.cancel,
        () =>
          new GardenConfirmDialogPixi({
            id: GARDEN_DIALOG_IDS.cancel,
            parent: this.dialogLayer,
            inputRouter: this.inputRouter,
            assetManager: this.assetManager,
            title: 'Cancel Progress?',
            confirmLabel: 'Empty',
            variant: 'danger',
            onClose: () => this.closeDialog('cancel'),
            theme: this.theme,
          }),
      );
    }
    if (!this.dialogRegistry.has(GARDEN_DIALOG_IDS.swap)) {
      this.dialogRegistry.register(
        GARDEN_DIALOG_IDS.swap,
        () =>
          new GardenConfirmDialogPixi({
            id: GARDEN_DIALOG_IDS.swap,
            parent: this.dialogLayer,
            inputRouter: this.inputRouter,
            assetManager: this.assetManager,
            title: 'swap seed?',
            confirmLabel: 'swap',
            onClose: () => this.closeDialog('swap'),
            theme: this.theme,
          }),
      );
    }
  }

  renderViewModel(viewModel) {
    const garden = viewModel.garden ?? viewModel;
    this.currentActions = viewModel.actions ?? garden.actions ?? this.actions;
    const viewport = garden.world ?? {};
    if (viewport.controlled === true || viewport.reset === true) {
      this.worldPan = {
        x: finiteOr(viewport.panX, this.worldPan.x),
        y: finiteOr(viewport.panY, this.worldPan.y),
      };
      this.worldZoom = finiteOr(viewport.zoom, this.worldZoom);
    }

    const plots = normalizeRows(garden.plots ?? garden.plot?.tiles);
    this.plots.reconcile(plots);
    this.syncWorldSize(garden.maxPlots ?? garden.plot?.maxTiles ?? plots.length);
    this.bindInventory(garden.inventory ?? garden.inventories ?? {});
    this.syncDialogs(garden.dialogs ?? {});
    this.layoutGarden();
    this.tick(finiteOr(garden.now, this.timeSource()));
  }

  bindInventory(inventory) {
    const activeTab = inventory.activeTab ?? null;
    const herbs = inventory.herbs ?? {};
    const seeds = inventory.seeds ?? {};
    this.herbInventory.bind({
      ...herbs,
      rows: herbs.rows ?? herbs.items ?? [],
      visible: activeTab === 'herbs' || herbs.visible === true,
      actions: this.currentActions,
    });
    this.seedInventory.bind({
      ...seeds,
      rows: seeds.rows ?? seeds.items ?? [],
      visible: activeTab === 'seeds' || seeds.visible === true,
      actions: this.currentActions,
    });
    this.herbsButton.setSelected(activeTab === 'herbs' || herbs.visible === true);
    this.seedsButton.setSelected(activeTab === 'seeds' || seeds.visible === true);
  }

  syncDialogs(dialogs) {
    for (const kind of Object.keys(GARDEN_DIALOG_IDS)) {
      const model = dialogs[kind];
      if (model?.open === true) {
        this.openDialog(kind, model);
      } else if (model?.open === false && this.dialogRegistry?.isOpen?.(GARDEN_DIALOG_IDS[kind])) {
        this.dialogRegistry.close(GARDEN_DIALOG_IDS[kind]);
      }
    }
  }

  openDialog(kind, model = null) {
    const dialogId = GARDEN_DIALOG_IDS[kind];
    if (!dialogId || !this.dialogRegistry?.has?.(dialogId)) {
      return false;
    }
    const normalized = this.normalizeDialogModel(kind, model ?? {});
    this.dialogRegistry.open(dialogId, normalized);
    return true;
  }

  closeDialog(kind) {
    const dialogId = GARDEN_DIALOG_IDS[kind];
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
    if (kind === 'seed') {
      return {
        ...model,
        actions: {
          ...this.currentActions,
          ...model.actions,
          selectSeed: (seed) =>
            seed.onSelect?.(seed) ??
            model.actions?.selectSeed?.(seed, model.plot) ??
            this.currentActions?.selectSeed?.(seed, model.plot),
        },
      };
    }
    const actionName = kind === 'cancel' ? 'confirmCancel' : 'confirmSwap';
    return {
      ...model,
      onConfirm:
        model.onConfirm ??
        ((payload) => this.currentActions?.[actionName]?.(payload)),
    };
  }

  toggleInventory(tabId) {
    return this.currentActions?.toggleInventory?.(tabId) ??
      this.currentActions?.openInventory?.(tabId) ??
      true;
  }

  activate() {
    if (this.active) {
      return;
    }
    super.activate();
    this.active = true;
    this.tick(this.timeSource());
    this.ticker?.add?.(this.tickHandler);
  }

  deactivate() {
    if (!this.active) {
      return;
    }
    this.ticker?.remove?.(this.tickHandler);
    this.active = false;
    this.settleTransientMotion();
    super.deactivate();
  }

  tick(now = this.timeSource()) {
    for (const plot of this.plots?.getWidgets?.() ?? []) {
      plot.updateTime(now);
    }
    this.seedInventory?.updateMotion(now);
    this.seedDragGhost?.updateMotion(now);
  }

  startSeedDrag(row, model, context) {
    row?.startPickMotion?.(this.timeSource());
    this.seedDragGhost?.start({
      seed: model,
      point: this.toContentPoint(context?.point),
    });
  }

  moveSeedDrag(row, model, context) {
    this.seedDragGhost?.move(
      this.toContentPoint(context?.point),
      context?.movement?.stepGlobal,
    );
  }

  finishSeedDrag(row, model, context, accepted) {
    const now = this.timeSource();
    if (accepted) {
      row?.settleMotion?.();
      const target = this.findPlotByDropTargetId(context?.dropTargetId);
      this.seedDragGhost?.settle({
        now,
        target: target?.getDropPoint(this.dragLayer),
        type: 'plot',
      });
      return;
    }
    row?.startReturnMotion?.(now);
    this.seedDragGhost?.settle({
      now,
      target: row?.getMotionTarget?.(this.dragLayer),
      type: 'return',
    });
  }

  toContentPoint(globalPoint) {
    if (!globalPoint) {
      return null;
    }
    return this.dragLayer.toLocal(
      globalPoint,
      undefined,
      this.dragLocalPoint,
    );
  }

  findPlotByDropTargetId(dropTargetId) {
    if (!dropTargetId) {
      return null;
    }
    for (const plot of this.plots?.getWidgets?.() ?? []) {
      if (plot.dropTargetId === dropTargetId) {
        return plot;
      }
    }
    return null;
  }

  settleTransientMotion() {
    this.seedDragGhost?.reset();
    this.seedInventory?.settleMotion();
    for (const plot of this.plots?.getWidgets?.() ?? []) {
      plot.settleTransientMotion();
    }
  }

  orderPlots(plots) {
    this.world.removeChildren();
    for (const plot of plots) {
      this.world.addChild(plot.root);
    }
  }

  syncWorldSize(maxPlots) {
    const rows = Math.max(
      1,
      Math.ceil(Math.max(0, Number(maxPlots) || 0) / GARDEN_PIXI_GEOMETRY.columns),
    );
    this.worldSize = {
      width: GARDEN_PIXI_GEOMETRY.worldWidth,
      height: Math.max(
        GARDEN_PIXI_GEOMETRY.worldMinHeight,
        18 +
          rows * GARDEN_PIXI_GEOMETRY.rowHeight +
          Math.max(0, rows - 1) * GARDEN_PIXI_GEOMETRY.rowGap +
          GARDEN_PIXI_GEOMETRY.worldEdgeExtension * 2,
      ),
    };
    this.setWorldViewport(this.worldPan.x, this.worldPan.y, this.worldZoom);
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
    const point = this.worldViewport.toLocal(context.point);
    this.pinchStart = {
      zoom: this.worldZoom,
      worldX: (point.x - this.worldPan.x) / this.worldZoom,
      worldY: (point.y - this.worldPan.y) / this.worldZoom,
    };
    return true;
  }

  onWorldPinch(context) {
    const start = this.pinchStart;
    if (!start) {
      return;
    }
    const point = this.worldViewport.toLocal(context.point);
    const zoom = rubberClamp(
      start.zoom * context.scale,
      GARDEN_WORLD_MIN_ZOOM,
      GARDEN_WORLD_MAX_ZOOM,
      GARDEN_ZOOM_RUBBER_LIMIT,
    );
    this.setWorldViewport(
      point.x - start.worldX * zoom,
      point.y - start.worldY * zoom,
      zoom,
      { rubber: true },
    );
  }

  settleWorldViewport() {
    this.panStart = null;
    this.pinchStart = null;
    this.setWorldViewport(this.worldPan.x, this.worldPan.y, this.worldZoom);
  }

  setWorldViewport(x, y, zoom, { rubber = false, notify = true } = {}) {
    const nextZoom = rubber
      ? rubberClamp(
          zoom,
          GARDEN_WORLD_MIN_ZOOM,
          GARDEN_WORLD_MAX_ZOOM,
          GARDEN_ZOOM_RUBBER_LIMIT,
        )
      : clamp(zoom, GARDEN_WORLD_MIN_ZOOM, GARDEN_WORLD_MAX_ZOOM);
    const bounds = this.getWorldPanBounds(nextZoom);
    const nextPan = {
      x: rubber
        ? rubberClamp(x, bounds.minX, bounds.maxX, GARDEN_PAN_RUBBER_LIMIT)
        : clamp(x, bounds.minX, bounds.maxX),
      y: rubber
        ? rubberClamp(y, bounds.minY, bounds.maxY, GARDEN_PAN_RUBBER_LIMIT)
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
    const width = this.worldViewportWidth ?? this.sourceWidth ?? 360;
    const height = this.worldViewportHeight ?? 0;
    const freeX = width - this.worldSize.width * zoom;
    const freeY = height - this.worldSize.height * zoom;
    return {
      minX: Math.min(0, freeX),
      maxX: Math.max(0, freeX),
      minY: Math.min(0, freeY),
      maxY: Math.max(0, freeY),
    };
  }

  applyThemeToChildren(theme) {
    this.herbInventory?.applyTheme(theme);
    this.seedInventory?.applyTheme(theme);
    this.herbsButton?.applyTheme(theme);
    this.seedsButton?.applyTheme(theme);
    for (const plot of this.plots?.getWidgets?.() ?? []) {
      plot.applyTheme(theme);
    }
  }

  layoutPage(sourceWidth, sourceHeight) {
    if (!this.worldViewport) {
      return;
    }
    this.worldViewportWidth = sourceWidth;
    this.worldViewportHeight = Math.max(
      0,
      sourceHeight -
        GARDEN_PIXI_GEOMETRY.worldTop -
        GARDEN_PIXI_GEOMETRY.worldBottom,
    );
    this.worldViewport.position.set(0, GARDEN_PIXI_GEOMETRY.worldTop);
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
    this.herbsButton.setBounds(
      RETAINED_PAGE_GEOMETRY.contentEdge,
      sourceHeight -
        GARDEN_PIXI_GEOMETRY.worldBottom -
        GARDEN_PIXI_GEOMETRY.inventoryButtonHeight,
    );
    this.seedsButton.setBounds(
      sourceWidth -
        RETAINED_PAGE_GEOMETRY.contentEdge -
        GARDEN_PIXI_GEOMETRY.inventoryButtonWidth,
      sourceHeight -
        GARDEN_PIXI_GEOMETRY.worldBottom -
        GARDEN_PIXI_GEOMETRY.inventoryButtonHeight,
    );
    this.layoutGarden();
  }

  layoutGarden() {
    if (!this.plots) {
      return;
    }
    const contentWidth =
      this.worldSize.width - GARDEN_PIXI_GEOMETRY.worldEdgeExtension * 2;
    const cellWidth =
      (contentWidth -
        GARDEN_PIXI_GEOMETRY.gridPaddingX * 2 -
        GARDEN_PIXI_GEOMETRY.columnGap *
          (GARDEN_PIXI_GEOMETRY.columns - 1)) /
      GARDEN_PIXI_GEOMETRY.columns;
    this.plots.getWidgets().forEach((plot, index) => {
      const column = index % GARDEN_PIXI_GEOMETRY.columns;
      const row = Math.floor(index / GARDEN_PIXI_GEOMETRY.columns);
      plot.setBounds(
        GARDEN_PIXI_GEOMETRY.worldEdgeExtension +
          GARDEN_PIXI_GEOMETRY.gridPaddingX +
          column * (cellWidth + GARDEN_PIXI_GEOMETRY.columnGap),
        GARDEN_PIXI_GEOMETRY.gridPaddingTop +
          row *
            (GARDEN_PIXI_GEOMETRY.rowHeight +
              GARDEN_PIXI_GEOMETRY.rowGap),
        cellWidth,
      );
    });
    const panelWidth = this.sourceWidth - RETAINED_PAGE_GEOMETRY.contentEdge * 2;
    for (const panel of [this.herbInventory, this.seedInventory]) {
      panel.setWidth(panelWidth);
      panel.root.position.set(
        RETAINED_PAGE_GEOMETRY.contentEdge,
        this.sourceHeight -
          GARDEN_PIXI_GEOMETRY.inventoryPanelBottom -
          panel.height,
      );
    }
    this.setWorldViewport(this.worldPan.x, this.worldPan.y, this.worldZoom, {
      notify: false,
    });
  }

  destroyPage() {
    this.ticker?.remove?.(this.tickHandler);
    releaseRegistration(this.panRegistration);
    releaseRegistration(this.pinchRegistration);
    this.plots?.destroy();
    this.plotPool?.destroy();
    this.herbInventory?.destroy();
    this.seedInventory?.destroy();
    this.seedDragGhost?.destroy();
    this.herbsButton?.destroy();
    this.seedsButton?.destroy();
  }
}

class GardenPlotWidget {
  constructor({
    instanceId,
    page,
    assetManager,
    inputRouter,
    semanticTargets,
  }) {
    this.instanceId = instanceId;
    this.page = page;
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.semanticTargets = semanticTargets;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.model = {};
    this.timedProgress = null;
    this.actions = {};
    this.enabled = false;
    this.pressed = false;
    this.receiveStartedAt = null;
    this.receiveOffsetY = 0;
    this.receiveScaleX = 1;
    this.receiveScaleY = 1;
    this.dropLocalPoint = new Point();
    this.dropGlobalPoint = new Point();
    this.dropTargetPoint = new Point();
    this.semanticIds = [];
    this.root = new Container({ label: `garden-plot-${instanceId}` });
    this.frame = new Container({ label: `garden-plot-${instanceId}-frame` });
    this.soil = new Sprite(Texture.EMPTY);
    this.soil.label = `garden-plot-${instanceId}-soil`;
    this.buyFrame = new Graphics({ label: `garden-plot-${instanceId}-buy-frame` });
    this.number = createText('', {
      ...RETAINED_TEXT_STYLES.bold,
      fill: '#3b2416',
    });
    this.level = new PixiStarLevelLabel({
      assetManager,
      size: 12,
      gap: 1,
      label: `garden-plot-${instanceId}-stars`,
    });
    this.label = createText('', RETAINED_TEXT_STYLES.border);
    this.label.anchor.set(1, 0);
    this.plantMotion = new Container({
      label: `garden-plot-${instanceId}-plant-motion`,
    });
    this.plant = new Sprite(Texture.EMPTY);
    this.plant.label = `garden-plot-${instanceId}-plant`;
    this.plant.anchor.set(0.5, 1);
    this.plantMotion.addChild(this.plant);
    this.action = createText('', {
      fontSize: 9,
      lineHeight: 11,
      fontWeight: '700',
      align: 'right',
    });
    this.action.anchor.set(1, 1);
    this.buyCostButton = new PixiCostButton({
      assetManager,
      width: GARDEN_PIXI_GEOMETRY.buyButtonWidth,
      height: GARDEN_PIXI_GEOMETRY.buyButtonHeight,
      tone: 'yellow',
      label: `garden-plot-${instanceId}-buy-cost`,
    });
    this.buyCostButton.eventMode = 'none';
    this.buyCostButton.visible = false;
    this.buyCostButton.renderable = false;
    this.scissorsMotion = new Container({
      label: `garden-plot-${instanceId}-scissors-motion`,
    });
    this.scissors = new Sprite(
      getAtlasTexture(assetManager, 'tool:herbCuttingScissorsClosed'),
    );
    this.scissors.label = `garden-plot-${instanceId}-scissors`;
    this.scissorsOpen = new Sprite(
      getAtlasTexture(assetManager, 'tool:herbCuttingScissorsOpen'),
    );
    this.scissorsOpen.label = `garden-plot-${instanceId}-scissors-open`;
    this.scissorsMotion.addChild(this.scissors, this.scissorsOpen);
    this.progress = new RetainedProgressBar({
      label: `garden-plot-${instanceId}-progress`,
      tone: 'green',
    });
    this.notificationBadge = new PixiNotificationBadge({ assetManager });
    this.notificationBadge.root.label =
      `garden-plot-${instanceId}-notification`;
    this.notification = this.notificationBadge.root;
    this.frame.addChild(
      this.soil,
      this.buyFrame,
      this.number,
      this.level,
      this.label,
      this.plantMotion,
      this.action,
      this.buyCostButton,
      this.scissorsMotion,
    );
    this.root.addChild(this.frame, this.progress.root, this.notification);
    this.pressRegistration = this.inputRouter?.registerPressTarget?.({
      id: `garden.plot.instance.${instanceId}`,
      displayObject: this.root,
      fallbackHitTest: true,
      enabled: () => this.enabled,
      slop: 12,
      onPressChange: (pressed) => this.setPressed(pressed),
      onActivate: () => this.activate(),
    }) ?? null;
    this.dropRegistration = this.inputRouter?.registerDropTarget?.({
      id: `garden.plot.drop.instance.${instanceId}`,
      displayObject: this.root,
      enabled: () => this.enabled && this.model.acceptsSeedDrop !== false,
      accepts: (payload) => payload?.kind === 'seed',
      onDrop: ({ data }) => this.dropSeed(data.item),
    }) ?? null;
    this.dropTargetId = `garden.plot.drop.instance.${instanceId}`;
  }

  bind(model, actions) {
    this.unregisterSemanticTargets();
    const previousModel = this.model;
    const previousTimedProgress = this.timedProgress;
    this.model = model ?? {};
    const process = this.model.process ?? this.model.progress;
    this.timedProgress = bindTimedProgress(
      process,
      this.page.timeSource(),
      shouldContinueTimedProgress(previousModel, this.model)
        ? previousTimedProgress
        : null,
    );
    this.actions = actions ?? {};
    const tileNumber = this.model.tileNumber ?? this.model.number ?? this.model.id;
    const visible = this.model.hidden !== true && this.model.visible !== false;
    this.enabled =
      visible &&
      this.model.disabled !== true &&
      this.model.action?.enabled !== false;
    this.root.visible = visible;
    this.root.renderable = visible;
    this.root.eventMode = this.enabled ? 'static' : 'none';
    setText(this.number, this.model.showNumber === false ? '' : tileNumber);
    const plotLevel = Math.max(
      1,
      Math.floor(Number(this.model.level) || 1),
    );
    this.level.setLevel(plotLevel - 1);
    setText(this.label, resolvePlotLabel(this.model));
    setText(this.action, resolveActionText(this.model));
    this.syncBuyCostButton();
    this.soil.texture = getTexture(
      this.assetManager,
      SOIL_ASSET_IDS[clamp(Math.floor(Number(this.model.soilLevel) || 1), 1, 5)],
    );
    const herbFrame =
      this.model.plantFrame ??
      getHerbIconFrameName(
        this.model.herbKey ??
          this.model.plant?.key ??
          '',
      );
    this.plant.texture = herbFrame
      ? getAtlasTexture(this.assetManager, herbFrame)
      : Texture.EMPTY;
    this.plant.visible = Boolean(herbFrame);
    this.scissorsMotion.visible = this.model.phase === 'harvesting';
    this.scissors.visible = this.scissorsMotion.visible;
    this.scissorsOpen.visible = this.scissorsMotion.visible;
    this.notificationBadge
      .setTone(this.model.notificationTone)
      .setActive(this.model.notification === true);
    this.registerSemanticTargets(tileNumber);
    this.applyTheme(this.theme);
    this.updateTime(this.page.timeSource());
  }

  registerSemanticTargets(tileNumber) {
    const semanticId =
      this.model.semanticId ?? `garden.plot.${tileNumber}`;
    this.semanticTargets?.register?.({
      semanticId,
      tutorialId: this.model.tutorialId ?? `garden:plot:${tileNumber}`,
      displayObject: this.root,
      state: () => ({
        visible: this.root.visible && this.root.renderable,
        interactive: this.root.eventMode !== 'none',
        enabled: this.enabled,
        active: !this.root.destroyed,
      }),
      activate: () => this.activate(),
    });
    this.semanticIds.push(semanticId);
    const labelSemanticId = `${semanticId}.label`;
    this.semanticTargets?.register?.({
      semanticId: labelSemanticId,
      tutorialId:
        this.model.labelTutorialId ?? `garden:plot:${tileNumber}:label`,
      displayObject: this.label,
      state: () => ({
        visible: this.label.visible && this.root.visible,
        interactive: this.enabled,
        enabled: this.enabled,
        active: !this.root.destroyed,
      }),
      activate: () =>
        this.model.onLabelActivate?.(this.model) ??
        this.actions.activatePlotLabel?.(this.model) ??
        this.activate(),
    });
    this.semanticIds.push(labelSemanticId);
  }

  activate() {
    const receivesSeed =
      this.model.phase === 'empty' &&
      Boolean(this.model.selectedSeedItemTypeId);
    const result = this.model.onActivate?.(this.model) ??
      this.model.action?.activate?.(this.model) ??
      this.actions.activatePlot?.(this.model) ??
      true;
    if (receivesSeed && actionSucceeded(result)) {
      this.startSeedReceive(this.page.timeSource());
    }
    return result;
  }

  dropSeed(seed) {
    const result =
      this.model.onSeedDrop?.(seed, this.model) ??
      this.actions.dropSeed?.(seed, this.model) ??
      false;
    if (actionSucceeded(result)) {
      this.startSeedReceive(this.page.timeSource());
      return result;
    }
    return false;
  }

  getDropPoint(targetSpace) {
    if (!targetSpace || this.root.destroyed) {
      return null;
    }
    this.dropLocalPoint.set(0, -26.2);
    this.plantMotion.toGlobal(
      this.dropLocalPoint,
      this.dropGlobalPoint,
    );
    return targetSpace.toLocal(
      this.dropGlobalPoint,
      undefined,
      this.dropTargetPoint,
    );
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    this.width = width;
    this.root.hitArea = new Rectangle(
      0,
      0,
      width,
      GARDEN_PIXI_GEOMETRY.rowHeight,
    );
    this.soil.width = GARDEN_PIXI_GEOMETRY.plotWidth;
    this.soil.height = GARDEN_PIXI_GEOMETRY.plotHeight;
    this.buyFrame.position.set(0, 0);
    this.number.position.set(10, 6);
    this.level.position.set(5, GARDEN_PIXI_GEOMETRY.plotHeight - 16);
    this.label.position.set(GARDEN_PIXI_GEOMETRY.plotWidth - 9, 18);
    this.plantMotion.position.set(
      GARDEN_PIXI_GEOMETRY.plotWidth / 2,
      GARDEN_PIXI_GEOMETRY.plotHeight - 20,
    );
    this.plant.position.set(0, 0);
    this.plant.width = 57.2;
    this.plant.height = 62.4;
    this.action.position.set(
      GARDEN_PIXI_GEOMETRY.plotWidth - 5,
      GARDEN_PIXI_GEOMETRY.plotHeight - 3,
    );
    this.buyCostButton.setBounds(
      (GARDEN_PIXI_GEOMETRY.plotWidth -
        GARDEN_PIXI_GEOMETRY.buyButtonWidth) /
        2,
      (GARDEN_PIXI_GEOMETRY.plotHeight -
        GARDEN_PIXI_GEOMETRY.buyButtonHeight) /
        2,
      GARDEN_PIXI_GEOMETRY.buyButtonWidth,
      GARDEN_PIXI_GEOMETRY.buyButtonHeight,
    );
    this.scissors.width = 30;
    this.scissors.height = 30;
    this.scissorsOpen.width = 30;
    this.scissorsOpen.height = 30;
    this.scissorsMotion.pivot.set(14.4, 17.4);
    this.notificationBadge.placeAtTopRight({
      x: (width - GARDEN_PIXI_GEOMETRY.plotWidth) / 2,
      y: 0,
      width: GARDEN_PIXI_GEOMETRY.plotWidth,
      height: GARDEN_PIXI_GEOMETRY.plotHeight,
    });
    this.progress.setBounds(
      (width - GARDEN_PIXI_GEOMETRY.progressWidth) / 2,
      GARDEN_PIXI_GEOMETRY.plotHeight + 3,
      GARDEN_PIXI_GEOMETRY.progressWidth,
      GARDEN_PIXI_GEOMETRY.progressHeight,
    );
    this.setPressed(this.pressed);
    this.redraw();
  }

  setPressed(pressed) {
    this.pressed = Boolean(pressed);
    this.applyFrameTransform();
  }

  applyFrameTransform() {
    const pressScale = this.pressed ? 0.97 : 1;
    this.frame.scale.set(
      pressScale * this.receiveScaleX,
      pressScale * this.receiveScaleY,
    );
    this.frame.pivot.set(
      GARDEN_PIXI_GEOMETRY.plotWidth / 2,
      GARDEN_PIXI_GEOMETRY.plotHeight / 2,
    );
    this.frame.position.set(
      (this.width - GARDEN_PIXI_GEOMETRY.plotWidth) / 2 +
        GARDEN_PIXI_GEOMETRY.plotWidth / 2,
      GARDEN_PIXI_GEOMETRY.plotHeight / 2 +
        (this.pressed ? 1 : 0) +
        this.receiveOffsetY,
    );
  }

  updateTime(now) {
    const timed = resolveTimedProgress(this.timedProgress, now);
    const visible =
      this.model.phase === 'ready' ||
      Boolean(this.model.process) ||
      this.model.progressVisible === true;
    this.progress.root.visible = visible;
    this.progress.setProgress(this.model.phase === 'ready' ? 1 : timed.progress);
    if (timed.timerText && this.model.actionTextIncludesTimer !== false) {
      const base = resolveActionText(this.model);
      setText(this.action, [base, timed.timerText].filter(Boolean).join(' '));
    }
    this.updateMotion(now, timed.progress);
  }

  updateMotion(now, timedProgress = Number.NaN) {
    const tileNumber = Math.max(
      1,
      Math.floor(Number(this.model.tileNumber ?? this.model.number) || 1),
    );
    const phase = this.model.phase;
    const growingProgress =
      phase === 'growing'
        ? clamp(
            finiteOr(
              timedProgress,
              finiteOr(
                this.model.process?.progress,
                finiteOr(this.model.progress?.progress, 0),
              ),
            ),
            0,
            1,
          )
        : 1;
    const growthScale =
      phase === 'growing' ? 0.42 + growingProgress * 0.58 : 1;
    this.plantMotion.position.set(
      GARDEN_PIXI_GEOMETRY.plotWidth / 2,
      GARDEN_PIXI_GEOMETRY.plotHeight - 20,
    );
    this.plantMotion.scale.set(growthScale);
    this.plantMotion.rotation = 0;

    if (phase === 'growing') {
      const progress = loopProgress(
        now + ((tileNumber - 1) * 421) % GARDEN_GROWING_WIND_MS,
        GARDEN_GROWING_WIND_MS,
      );
      const sway =
        progress < 0.5
          ? lerp(-1.8, 2.1, softEase(progress / 0.5))
          : lerp(2.1, -1.8, softEase((progress - 0.5) / 0.5));
      this.plantMotion.rotation = degreesToRadians(sway);
    } else if (phase === 'ready' || phase === 'harvesting') {
      const progress = loopProgress(
        now + ((tileNumber - 1) * 317) % GARDEN_READY_LIFT_MS,
        GARDEN_READY_LIFT_MS,
      );
      applyReadyPlantMotion(this.plantMotion, progress, growthScale);
    }

    if (phase === 'harvesting') {
      const progress = loopProgress(now, GARDEN_SCISSORS_SNIP_MS);
      const open = progress >= 0.5;
      this.scissors.alpha = open ? 0 : 1;
      this.scissorsOpen.alpha = open ? 1 : 0;
      this.scissorsMotion.position.set(
        61 + 14.4 + (open ? -13 : -15),
        29 + 17.4 + (open ? -2 : 0),
      );
      this.scissorsMotion.rotation = degreesToRadians(open ? -7 : -20);
    } else {
      this.resetScissorsMotion();
    }

    this.updateSeedReceive(now);
  }

  startSeedReceive(now) {
    this.receiveStartedAt = finiteOr(now, 0);
    this.receiveOffsetY = 0;
    this.receiveScaleX = 1;
    this.receiveScaleY = 1;
    this.applyFrameTransform();
  }

  updateSeedReceive(now) {
    if (this.receiveStartedAt === null) {
      return false;
    }
    const progress = clamp(
      (finiteOr(now, this.receiveStartedAt) - this.receiveStartedAt) /
        GARDEN_PLOT_RECEIVE_MS,
      0,
      1,
    );
    if (progress >= 1) {
      this.settleTransientMotion();
      return false;
    }
    applyReceiveMotion(this, progress);
    this.applyFrameTransform();
    return true;
  }

  settleTransientMotion() {
    this.receiveStartedAt = null;
    this.receiveOffsetY = 0;
    this.receiveScaleX = 1;
    this.receiveScaleY = 1;
    this.applyFrameTransform();
  }

  resetScissorsMotion() {
    this.scissors.alpha = 1;
    this.scissorsOpen.alpha = 0;
    this.scissorsMotion.position.set(61 + 14.4 - 15, 29 + 17.4);
    this.scissorsMotion.rotation = degreesToRadians(-16);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    const disabled = !this.enabled;
    const plantAction = isPlantActionText(resolveActionText(this.model));
    const labelColor =
      this.model.labelResource === 'seed'
        ? this.theme.resourceColors.seed
        : this.model.labelResource === 'herb'
          ? this.theme.resourceColors.herb
          : disabled
            ? this.theme.disabled
            : this.theme.text;
    applyTextTheme(this.number, this.theme, {
      ...RETAINED_TEXT_STYLES.bold,
      fill: '#3b2416',
    });
    applyTextTheme(this.label, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: labelColor,
    });
    applyTextTheme(this.action, this.theme, {
      fontSize:
        this.model.phase === 'empty' || this.model.buySlot
          ? 11
          : 9,
      lineHeight:
        this.model.phase === 'empty' || this.model.buySlot
          ? 14
          : 11,
      fontWeight: '700',
      fill:
        disabled
          ? this.theme.disabled
          : plantAction
            ? '#ffffff'
            : this.theme.text,
      align: 'right',
    });
    this.action.style.stroke =
      !disabled && plantAction
        ? { color: '#0a0a0a', width: 2, join: 'round' }
        : null;
    this.buyCostButton.applyTheme(this.theme);
    this.progress.applyTheme(this.theme);
    this.redraw();
  }

  syncBuyCostButton() {
    const costCoin = Number(this.model.costCoin);
    const visible =
      (this.model.buySlot === true || this.model.isBuySlot === true) &&
      !this.model.lockReason &&
      Number.isFinite(costCoin);

    this.buyCostButton.visible = visible;
    this.buyCostButton.renderable = visible;
    if (!visible) {
      return;
    }

    this.buyCostButton.setModel({
      amountLabel:
        costCoin === 0 ? 'Free' : formatCoinPriceText(costCoin),
      resource: costCoin === 0 ? 'none' : 'coin',
      state:
        this.model.affordable === false ? 'unaffordable' : 'available',
      enabled: this.enabled,
    });
  }

  redraw() {
    this.buyFrame.clear();
    const showBuyCostButton = this.buyCostButton.visible;
    this.action.visible = !showBuyCostButton && Boolean(this.action.text);
    this.action.renderable = this.action.visible;
    if (this.model.buySlot === true || this.model.isBuySlot === true) {
      drawDashedRect(
        this.buyFrame,
        0,
        0,
        GARDEN_PIXI_GEOMETRY.plotWidth,
        GARDEN_PIXI_GEOMETRY.plotHeight,
        this.enabled ? this.theme.stroke : this.theme.disabled,
      );
      this.soil.visible = false;
      this.number.visible = false;
      this.level.visible = false;
      this.label.visible = false;
      this.action.anchor.set(0.5);
      this.action.position.set(
        GARDEN_PIXI_GEOMETRY.plotWidth / 2,
        GARDEN_PIXI_GEOMETRY.plotHeight / 2,
      );
    } else {
      this.soil.visible = true;
      this.number.visible = this.model.showNumber !== false;
      this.level.visible = this.model.showLevel !== false;
      this.label.visible = Boolean(this.label.text);
      this.action.anchor.set(1, 1);
      if (this.model.phase === 'empty') {
        this.action.anchor.set(0.5);
        this.action.position.set(
          GARDEN_PIXI_GEOMETRY.plotWidth / 2,
          GARDEN_PIXI_GEOMETRY.plotHeight / 2,
        );
      } else {
        this.action.position.set(
          GARDEN_PIXI_GEOMETRY.plotWidth - 5,
          GARDEN_PIXI_GEOMETRY.plotHeight - 3,
        );
      }
    }
    this.notificationBadge
      .setTone(this.model.notificationTone)
      .setActive(this.model.notification === true);
  }

  reset() {
    this.unregisterSemanticTargets();
    this.model = {};
    this.timedProgress = null;
    this.actions = {};
    this.enabled = false;
    this.pressed = false;
    this.root.visible = false;
    this.root.renderable = false;
    this.root.eventMode = 'none';
    this.root.position.set(0, 0);
    this.root.pivot.set(0, 0);
    this.root.scale.set(1);
    this.root.hitArea = null;
    this.frame.position.set(0, 0);
    this.frame.pivot.set(0, 0);
    this.frame.scale.set(1);
    this.receiveStartedAt = null;
    this.receiveOffsetY = 0;
    this.receiveScaleX = 1;
    this.receiveScaleY = 1;
    this.width = 0;
    setText(this.number, '');
    this.level.setLevel(0);
    setText(this.label, '');
    setText(this.action, '');
    this.buyCostButton.reset();
    this.progress.setProgress(0);
    this.progress.root.visible = false;
    this.plantMotion.position.set(0, 0);
    this.plantMotion.scale.set(1);
    this.plantMotion.rotation = 0;
    this.plant.visible = false;
    this.scissors.visible = false;
    this.scissorsOpen.visible = false;
    this.scissorsMotion.visible = false;
    this.resetScissorsMotion();
    this.notificationBadge.setActive(false);
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
    this.progress.destroy();
    this.root.destroy({ children: true });
  }
}

class GardenSeedDragGhost {
  constructor({ assetManager, parent }) {
    this.assetManager = assetManager;
    this.root = new Container({ label: 'garden-seed-drag-ghost' });
    this.root.eventMode = 'none';
    this.root.visible = false;
    this.root.renderable = false;
    this.pack = new Sprite(Texture.EMPTY);
    this.pack.label = 'garden-seed-drag-ghost-pack';
    this.item = new Sprite(Texture.EMPTY);
    this.item.label = 'garden-seed-drag-ghost-item';
    this.item.anchor.set(0.5);
    this.item.rotation = degreesToRadians(6);
    this.root.addChild(this.pack, this.item);
    parent.addChild(this.root);
    this.motionType = null;
    this.motionStartedAt = null;
    this.motionDuration = 0;
    this.startX = 0;
    this.startY = 0;
    this.endX = 0;
    this.endY = 0;
    this.centerLocal = new Point(
      GARDEN_SEED_GHOST_SIZE / 2,
      GARDEN_SEED_GHOST_SIZE / 2,
    );
    this.centerGlobal = new Point();
    this.centerInParent = new Point();
    this.layout();
  }

  layout() {
    const layout = layoutPixiSeedPackIcon({
      base: this.pack,
      item: this.item,
      x: 0,
      y: 0,
      width: GARDEN_SEED_GHOST_SIZE,
      height: GARDEN_SEED_GHOST_SIZE,
      anchorX: 0,
      anchorY: 0,
    });
    this.itemBaseX = layout.item.centerX;
    this.itemBaseY = layout.item.centerY;
    this.itemBaseRotation = degreesToRadians(
      layout.item.rotationDegrees,
    );
  }

  start({ seed, point }) {
    if (!point) {
      this.reset();
      return false;
    }
    bindPixiSeedPackIcon({
      assetManager: this.assetManager,
      base: this.pack,
      item: this.item,
      seed,
    });
    this.motionType = 'drag';
    this.motionStartedAt = null;
    this.root.visible = true;
    this.root.renderable = true;
    this.root.alpha = 1;
    this.root.scale.set(1);
    this.root.rotation = 0;
    this.root.pivot.set(
      GARDEN_SEED_GHOST_SIZE / 2,
      GARDEN_SEED_GHOST_SIZE + GARDEN_SEED_GHOST_POINTER_LIFT,
    );
    this.root.position.copyFrom(point);
    return true;
  }

  move(point, step = null) {
    if (this.motionType !== 'drag' || !point) {
      return false;
    }
    this.root.position.copyFrom(point);
    const horizontal = clamp(finiteOr(step?.x, 0), -8, 8);
    this.item.rotation =
      this.itemBaseRotation + degreesToRadians(horizontal * 0.7);
    this.item.x =
      this.itemBaseX + clamp(horizontal * 0.24, -2, 2);
    return true;
  }

  settle({ now, target, type }) {
    if (!this.root.visible || !target) {
      this.reset();
      return false;
    }
    this.root.toGlobal(
      this.centerLocal,
      this.centerGlobal,
    );
    this.root.parent.toLocal(
      this.centerGlobal,
      undefined,
      this.centerInParent,
    );
    this.root.pivot.set(
      GARDEN_SEED_GHOST_SIZE / 2,
      GARDEN_SEED_GHOST_SIZE / 2,
    );
    this.root.position.copyFrom(this.centerInParent);
    this.startX = this.centerInParent.x;
    this.startY = this.centerInParent.y;
    this.endX = target.x;
    this.endY = target.y;
    this.motionType = type === 'plot' ? 'plot' : 'return';
    this.motionStartedAt = finiteOr(now, 0);
    this.motionDuration =
      this.motionType === 'plot'
        ? GARDEN_SEED_DROP_MS
        : GARDEN_SEED_RETURN_MS;
    this.item.position.set(this.itemBaseX, this.itemBaseY);
    this.item.rotation = this.itemBaseRotation;
    this.updateMotion(this.motionStartedAt);
    return true;
  }

  updateMotion(now) {
    if (
      this.motionType !== 'plot' &&
      this.motionType !== 'return'
    ) {
      return false;
    }
    const progress = clamp(
      (finiteOr(now, this.motionStartedAt) - this.motionStartedAt) /
        this.motionDuration,
      0,
      1,
    );
    if (progress >= 1) {
      this.reset();
      return false;
    }
    const isPlot = this.motionType === 'plot';
    const eased = softEase(progress);
    const arc = Math.sin(progress * Math.PI) * (isPlot ? -14 : -8);
    this.root.position.set(
      lerp(this.startX, this.endX, eased),
      lerp(this.startY, this.endY, eased) + arc,
    );
    const midProgress = clamp(progress / 0.58, 0, 1);
    const endProgress = clamp((progress - 0.58) / 0.42, 0, 1);
    const middleScale = isPlot ? 0.92 : 0.96;
    const endScale = isPlot ? 0.58 : 0.72;
    const scale =
      progress <= 0.58
        ? lerp(1, middleScale, softEase(midProgress))
        : lerp(middleScale, endScale, softEase(endProgress));
    this.root.scale.set(scale);
    const middleRotation = degreesToRadians(isPlot ? 4 : -3);
    this.root.rotation =
      progress <= 0.58
        ? lerp(0, middleRotation, softEase(midProgress))
        : lerp(middleRotation, 0, softEase(endProgress));
    this.root.alpha =
      progress <= 0.58
        ? 1
        : lerp(1, isPlot ? 0 : 0.35, softEase(endProgress));
    return true;
  }

  reset() {
    this.motionType = null;
    this.motionStartedAt = null;
    this.motionDuration = 0;
    this.root.visible = false;
    this.root.renderable = false;
    this.root.alpha = 1;
    this.root.position.set(0, 0);
    this.root.pivot.set(0, 0);
    this.root.scale.set(1);
    this.root.rotation = 0;
    this.item.position.set(this.itemBaseX, this.itemBaseY);
    this.item.rotation = this.itemBaseRotation;
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

class GardenInventoryPanel {
  constructor({
    id,
    kind,
    title,
    assetManager,
    inputRouter,
    semanticTargets,
    counters,
    draggable = false,
    motionController = null,
  }) {
    this.id = id;
    this.kind = kind;
    this.title = title;
    this.inputRouter = inputRouter;
    this.semanticTargets = semanticTargets;
    this.draggable = draggable;
    this.motionController = motionController;
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
    this.toggleRegistration = this.inputRouter?.registerPressTarget?.({
      id: `${id}.toggle`,
      displayObject: this.toggleHit,
      enabled: () => this.root.visible && this.model.canToggle === true,
      onActivate: () =>
        this.model.onToggle?.(this.model) ??
        this.actions.toggleInventoryExpanded?.(this.kind) ??
        true,
    }) ?? null;
    this.rowPool = new WidgetPool({
      name: `${id} row pool`,
      counters,
      create: () =>
        new GardenInventoryRow({
          id: `${id}.row.instance.${++this.instanceSequence}`,
          kind,
          inputRouter,
          semanticTargets,
          draggable,
          motionController,
        }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 32,
    });
    this.rows = new PooledCollection({
      name: `${id} rows`,
      pool: this.rowPool,
      counters,
      keyOf: (row, index) =>
        row.id ?? row.itemTypeId ?? row.key ?? `${kind}-${index}`,
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
    setText(this.toggle, this.model.expanded === true ? 'collapse' : 'expand');
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
    rows.forEach((row, index) => {
      const column = index % columns;
      const rowIndex = Math.floor(index / columns);
      row.setBounds(
        column * (columnWidth + gap),
        rowIndex * 20,
        columnWidth,
      );
    });
    const visibleRowCount = Math.max(3, Math.ceil(rows.length / columns));
    this.height = visibleRowCount * 20 + 10 + 14;
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

  updateMotion(now) {
    for (const row of this.rows.getWidgets()) {
      row.updateMotion(now);
    }
  }

  settleMotion() {
    for (const row of this.rows.getWidgets()) {
      row.settleMotion();
    }
  }

  destroy() {
    releaseRegistration(this.toggleRegistration);
    this.rows.destroy();
    this.rowPool.destroy();
    this.panel.destroy();
  }
}

class GardenInventoryRow {
  constructor({
    id,
    kind,
    inputRouter,
    semanticTargets,
    draggable,
    motionController,
  }) {
    this.id = id;
    this.kind = kind;
    this.inputRouter = inputRouter;
    this.semanticTargets = semanticTargets;
    this.draggable = draggable;
    this.motionController = motionController;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.model = {};
    this.actions = {};
    this.semanticId = null;
    this.enabled = false;
    this.pickStartedAt = null;
    this.returnStartedAt = null;
    this.motionLocalPoint = new Point();
    this.motionGlobalPoint = new Point();
    this.motionTargetPoint = new Point();
    this.root = new Container({ label: id });
    this.motionRoot = new Container({ label: `${id}-motion` });
    this.label = createText('', RETAINED_TEXT_STYLES.body);
    this.quantity = createText('', {
      ...RETAINED_TEXT_STYLES.body,
      align: 'right',
    });
    this.quantity.anchor.set(1, 0);
    this.motionRoot.addChild(this.label, this.quantity);
    this.root.addChild(this.motionRoot);
    this.dragRegistration = this.draggable
      ? this.inputRouter?.registerDragSource?.({
          id: `${id}.drag`,
          displayObject: this.root,
          threshold: GARDEN_SEED_DRAG_THRESHOLD,
          enabled: () => this.enabled,
          onDragStart: (context) => this.startDrag(context),
          onDragMove: (context) => this.moveDrag(context),
          onDragEnd: (context) => this.endDrag(context, true),
          onDragCancel: (context) => this.endDrag(context, false),
        })
      : null;
  }

  bind(model, actions) {
    this.unregisterSemantic();
    this.model = model ?? {};
    this.actions = actions ?? {};
    this.enabled =
      this.draggable &&
      this.model.quantity > 0 &&
      this.model.locked !== true &&
      this.model.unknown !== true &&
      this.model.disabled !== true;
    setText(this.label, this.model.displayLabel ?? this.model.label ?? '');
    setText(
      this.quantity,
      this.model.quantityText ?? String(this.model.quantity ?? 0),
    );
    this.root.visible = true;
    this.root.renderable = true;
    this.root.eventMode = this.enabled ? 'static' : 'passive';
    this.semanticId =
      this.model.semanticId ??
      `garden.inventory.${this.kind}.${this.model.key ?? this.model.itemTypeId ?? this.model.id}`;
    this.semanticTargets?.register?.({
      semanticId: this.semanticId,
      tutorialId: this.model.tutorialId ?? null,
      displayObject: this.root,
      state: () => ({
        visible: this.root.visible && this.root.renderable,
        interactive: this.enabled,
        enabled: this.enabled,
        active: !this.root.destroyed,
      }),
      activate: () => this.model.onActivate?.(this.model) ?? false,
    });
    this.applyTheme(this.theme);
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    this.width = width;
    this.root.hitArea = new Rectangle(0, 0, width, 20);
    this.label.position.set(0, 2);
    this.quantity.position.set(width, 2);
  }

  startDrag(context) {
    const externalResult = this.actions.startSeedDrag?.(
      this.model,
      context,
    );
    if (externalResult === false) {
      this.settleMotion();
      return false;
    }
    this.motionController?.startSeedDrag?.(this, this.model, context);
    return {
      kind: 'seed',
      item: this.model,
    };
  }

  moveDrag(context) {
    this.motionController?.moveSeedDrag?.(this, this.model, context);
    return this.actions.previewSeedDrag?.(this.model, context);
  }

  endDrag(context, accepted) {
    this.motionController?.finishSeedDrag?.(
      this,
      this.model,
      context,
      accepted,
    );
    return accepted
      ? this.actions.endSeedDrag?.(this.model, context)
      : this.actions.cancelSeedDrag?.(this.model, context);
  }

  startPickMotion(now) {
    this.pickStartedAt = finiteOr(now, 0);
    this.returnStartedAt = null;
    this.updateMotion(this.pickStartedAt);
  }

  startReturnMotion(now) {
    this.pickStartedAt = null;
    this.returnStartedAt = finiteOr(now, 0);
    this.updateMotion(this.returnStartedAt);
  }

  updateMotion(now) {
    this.motionRoot.position.set(0, 0);
    this.motionRoot.rotation = 0;
    if (this.pickStartedAt !== null) {
      const progress = clamp(
        (finiteOr(now, this.pickStartedAt) - this.pickStartedAt) /
          GARDEN_SEED_PICK_MS,
        0,
        1,
      );
      if (progress >= 1) {
        this.pickStartedAt = null;
        return false;
      }
      const nudge = Math.sin(progress * Math.PI);
      this.motionRoot.x = nudge;
      this.motionRoot.rotation = degreesToRadians(nudge * 0.5);
      return true;
    }
    if (this.returnStartedAt !== null) {
      const progress = clamp(
        (finiteOr(now, this.returnStartedAt) - this.returnStartedAt) /
          GARDEN_SEED_RETURN_MS,
        0,
        1,
      );
      if (progress >= 1) {
        this.returnStartedAt = null;
        return false;
      }
      this.motionRoot.x = -piecewisePeak(progress, 0.58);
      return true;
    }
    return false;
  }

  settleMotion() {
    this.pickStartedAt = null;
    this.returnStartedAt = null;
    this.motionRoot.position.set(0, 0);
    this.motionRoot.rotation = 0;
  }

  getMotionTarget(targetSpace) {
    if (!targetSpace || this.root.destroyed) {
      return null;
    }
    this.motionLocalPoint.set((this.width ?? 0) / 2, 10);
    this.root.toGlobal(
      this.motionLocalPoint,
      this.motionGlobalPoint,
    );
    return targetSpace.toLocal(
      this.motionGlobalPoint,
      undefined,
      this.motionTargetPoint,
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    const disabled =
      this.model.quantity <= 0 ||
      this.model.locked === true ||
      this.model.unknown === true;
    const color = disabled
      ? this.theme.disabled
      : this.theme.resourceColors[this.kind] ?? this.theme.text;
    applyTextTheme(this.label, this.theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: color,
    });
    applyTextTheme(this.quantity, this.theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: color,
      align: 'right',
    });
  }

  reset() {
    this.unregisterSemantic();
    this.model = {};
    this.actions = {};
    this.enabled = false;
    this.root.eventMode = 'none';
    this.root.renderable = false;
    this.root.visible = false;
    this.root.position.set(0, 0);
    this.root.hitArea = null;
    this.width = 0;
    this.settleMotion();
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
    releaseRegistration(this.dragRegistration);
    this.root.destroy({ children: true });
  }
}

class GardenInventoryButton {
  constructor({
    id,
    tabId,
    label,
    side,
    texture,
    inputRouter,
    semanticTargets,
    action,
  }) {
    this.id = id;
    this.tabId = tabId;
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
    this.registration = inputRouter?.registerPressTarget?.({
      id,
      displayObject: this.root,
      focusable: true,
      selected: () => false,
      onPressChange: (pressed) => this.setPressed(pressed),
      onActivate: () => this.action?.() ?? true,
    }) ?? null;
    this.semanticTargets = semanticTargets;
    semanticTargets?.register?.({
      semanticId: id,
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
      GARDEN_PIXI_GEOMETRY.inventoryButtonHeight -
        GARDEN_PIXI_GEOMETRY.inventoryOpenHeight,
      GARDEN_PIXI_GEOMETRY.inventoryButtonWidth,
      GARDEN_PIXI_GEOMETRY.inventoryOpenHeight,
    );
    this.icon.position.set(1.75, 12);
    this.icon.width = 42;
    this.icon.height = 42;
    this.label.position.set(
      this.side === 'right'
        ? GARDEN_PIXI_GEOMETRY.inventoryButtonWidth
        : 0,
      GARDEN_PIXI_GEOMETRY.inventoryButtonHeight - 13,
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
      GARDEN_PIXI_GEOMETRY.inventoryButtonHeight - 13 + (this.pressed ? 1 : 0);
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
          GARDEN_PIXI_GEOMETRY.inventoryButtonWidth,
          58,
        )
        .stroke({ color: this.theme.stroke, width: 1, alpha: 0.5 });
    }
  }

  destroy() {
    this.semanticTargets?.unregister?.(this.id);
    releaseRegistration(this.registration);
    this.root.destroy({ children: true });
  }
}

function resolvePlotLabel(model) {
  if (model.label !== undefined) {
    return String(model.label ?? '');
  }
  if (model.phase === 'empty') {
    return model.selectedSeedLabel
      ? String(model.selectedHerbLabel ?? model.selectedSeedLabel).replace(/\s+seed$/i, '')
      : 'choose';
  }
  return model.herbLabel ?? model.seedLabel ?? '';
}

function resolveActionText(model) {
  let actionText = '';
  if (model.actionText !== undefined) {
    actionText = String(model.actionText ?? '');
  } else if (typeof model.action === 'string') {
    actionText = model.action;
  } else {
    actionText = model.action?.label ?? '';
  }
  return isPlantActionText(actionText)
    ? `${actionText.charAt(0).toUpperCase()}${actionText.slice(1)}`
    : actionText;
}

function isPlantActionText(value) {
  return /^plant(?:\s|$)/i.test(String(value ?? '').trim());
}

function resolveTimedProgress(progress, now) {
  if (typeof progress === 'number') {
    return { progress: clamp(progress, 0, 1), timerText: '' };
  }
  if (!progress || typeof progress !== 'object') {
    return { progress: 0, timerText: '' };
  }
  let remainingMs = finiteOr(progress.remainingMs, Number.NaN);
  const durationMs = finiteOr(
    progress.durationMs,
    finiteOr(progress.totalMs, Number.NaN),
  );
  const endTimeMs = finiteOr(
    progress.endTimeMs,
    finiteOr(progress.endsAt, Number.NaN),
  );
  if (Number.isFinite(endTimeMs)) {
    remainingMs = Math.max(0, endTimeMs - now);
  }
  const ratio = Number.isFinite(durationMs) && durationMs > 0 && Number.isFinite(remainingMs)
    ? 1 - remainingMs / durationMs
    : finiteOr(progress.progress, 0);
  return {
    progress: clamp(ratio, 0, 1),
    timerText:
      progress.timerText ??
      (Number.isFinite(remainingMs) ? formatRemainingTime(remainingMs) : ''),
  };
}

function bindTimedProgress(progress, now, previousProgress = null) {
  if (!progress || typeof progress !== 'object') {
    return progress;
  }

  const endTimeMs = finiteOr(
    progress.endTimeMs,
    finiteOr(progress.endsAt, Number.NaN),
  );
  const remainingMs = finiteOr(progress.remainingMs, Number.NaN);

  if (Number.isFinite(endTimeMs) || !Number.isFinite(remainingMs)) {
    return progress;
  }

  const inferredEndTimeMs =
    finiteOr(now, Date.now()) + Math.max(0, remainingMs);
  const previousEndTimeMs = finiteOr(
    previousProgress?.endTimeMs,
    finiteOr(previousProgress?.endsAt, Number.NaN),
  );

  return {
    ...progress,
    endTimeMs: Number.isFinite(previousEndTimeMs)
      ? Math.min(previousEndTimeMs, inferredEndTimeMs)
      : inferredEndTimeMs,
  };
}

function shouldContinueTimedProgress(previousModel, nextModel) {
  const previousProcess = previousModel?.process ?? previousModel?.progress;
  const nextProcess = nextModel?.process ?? nextModel?.progress;

  if (
    !previousProcess ||
    typeof previousProcess !== 'object' ||
    !nextProcess ||
    typeof nextProcess !== 'object' ||
    previousModel?.phase !== nextModel?.phase
  ) {
    return false;
  }

  for (const key of [
    'seedItemTypeId',
    'herbItemTypeId',
    'herbKey',
    'plantFrame',
  ]) {
    if ((previousModel?.[key] ?? null) !== (nextModel?.[key] ?? null)) {
      return false;
    }
  }

  const previousDurationMs = resolveTimerDurationMs(previousProcess);
  const nextDurationMs = resolveTimerDurationMs(nextProcess);
  if (
    Number.isFinite(previousDurationMs) &&
    Number.isFinite(nextDurationMs) &&
    previousDurationMs !== nextDurationMs
  ) {
    return false;
  }

  const previousSnapshotProgress = resolveTimerSnapshotProgress(previousProcess);
  const nextSnapshotProgress = resolveTimerSnapshotProgress(nextProcess);

  return (
    Number.isFinite(previousSnapshotProgress) &&
    Number.isFinite(nextSnapshotProgress) &&
    nextSnapshotProgress + Number.EPSILON >= previousSnapshotProgress
  );
}

function resolveTimerDurationMs(progress) {
  return finiteOr(
    progress?.durationMs,
    finiteOr(progress?.totalMs, Number.NaN),
  );
}

function resolveTimerSnapshotProgress(progress) {
  const durationMs = resolveTimerDurationMs(progress);
  const remainingMs = finiteOr(progress?.remainingMs, Number.NaN);

  if (
    Number.isFinite(durationMs) &&
    durationMs > 0 &&
    Number.isFinite(remainingMs)
  ) {
    return clamp(1 - remainingMs / durationMs, 0, 1);
  }

  return finiteOr(progress?.progress, Number.NaN);
}

function applyReadyPlantMotion(motion, progress, growthScale) {
  const first = progress < 0.26;
  const second = !first && progress < 0.42;
  const third = !first && !second && progress < 0.5;
  const fourth =
    !first && !second && !third && progress < 0.58;
  const fifth =
    !first && !second && !third && !fourth && progress < 0.72;
  let fromY = 0;
  let toY = 0;
  let fromScaleX = 1;
  let toScaleX = 1;
  let fromScaleY = 1;
  let toScaleY = 1;
  let segment = 1;

  if (first) {
    segment = progress / 0.26;
    toY = -8;
  } else if (second) {
    segment = (progress - 0.26) / 0.16;
    fromY = -8;
  } else if (third) {
    segment = (progress - 0.42) / 0.08;
    toScaleX = 1.1;
    toScaleY = 0.88;
  } else if (fourth) {
    segment = (progress - 0.5) / 0.08;
    fromScaleX = 1.1;
    fromScaleY = 0.88;
    toY = -3.5;
  } else if (fifth) {
    segment = (progress - 0.58) / 0.14;
    fromY = -3.5;
  }

  const eased = softEase(segment);
  motion.y =
    GARDEN_PIXI_GEOMETRY.plotHeight -
    20 +
    lerp(fromY, toY, eased);
  motion.scale.set(
    growthScale * lerp(fromScaleX, toScaleX, eased),
    growthScale * lerp(fromScaleY, toScaleY, eased),
  );
}

function applyReceiveMotion(plot, progress) {
  let segment;
  let fromY;
  let toY;
  let fromScaleX;
  let toScaleX;
  let fromScaleY;
  let toScaleY;
  if (progress < 0.52) {
    segment = progress / 0.52;
    fromY = 0;
    toY = 2;
    fromScaleX = 1;
    toScaleX = 1.02;
    fromScaleY = 1;
    toScaleY = 0.98;
  } else if (progress < 0.76) {
    segment = (progress - 0.52) / 0.24;
    fromY = 2;
    toY = -1;
    fromScaleX = 1.02;
    toScaleX = 0.99;
    fromScaleY = 0.98;
    toScaleY = 1.01;
  } else {
    segment = (progress - 0.76) / 0.24;
    fromY = -1;
    toY = 0;
    fromScaleX = 0.99;
    toScaleX = 1;
    fromScaleY = 1.01;
    toScaleY = 1;
  }
  const eased = softEase(segment);
  plot.receiveOffsetY = lerp(fromY, toY, eased);
  plot.receiveScaleX = lerp(fromScaleX, toScaleX, eased);
  plot.receiveScaleY = lerp(fromScaleY, toScaleY, eased);
}

function actionSucceeded(result) {
  return result !== false && result?.ok !== false;
}

function loopProgress(now, duration) {
  const value = finiteOr(now, 0) % duration;
  return (value < 0 ? value + duration : value) / duration;
}

function piecewisePeak(progress, peakAt) {
  if (progress <= peakAt) {
    return softEase(progress / peakAt);
  }
  return 1 - softEase((progress - peakAt) / (1 - peakAt));
}

function softEase(progress) {
  const target = clamp(progress, 0, 1);
  let parameter = target;
  for (let iteration = 0; iteration < 5; iteration += 1) {
    const current = cubicBezierCoordinate(parameter, 0.39, 0.565);
    const slope = cubicBezierSlope(parameter, 0.39, 0.565);
    if (Math.abs(slope) < 0.000001) {
      break;
    }
    parameter = clamp(
      parameter - (current - target) / slope,
      0,
      1,
    );
  }
  return cubicBezierCoordinate(parameter, 0.575, 1);
}

function cubicBezierCoordinate(progress, first, second) {
  const inverse = 1 - progress;
  return (
    3 * inverse * inverse * progress * first +
    3 * inverse * progress * progress * second +
    progress * progress * progress
  );
}

function cubicBezierSlope(progress, first, second) {
  const inverse = 1 - progress;
  return (
    3 * inverse * inverse * first +
    6 * inverse * progress * (second - first) +
    3 * progress * progress * (1 - second)
  );
}

function lerp(from, to, progress) {
  return from + (to - from) * progress;
}

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function drawDashedRect(graphics, x, y, width, height, color) {
  const dash = 5;
  const gap = 3;
  const drawLine = (x1, y1, x2, y2) => {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const dx = (x2 - x1) / length;
    const dy = (y2 - y1) / length;
    for (let distance = 0; distance < length; distance += dash + gap) {
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
  return limit <= 0 ? 0 : limit * (1 - 1 / (distance / limit + 1));
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, finiteOr(value, minimum)));
}

function releaseRegistration(registration) {
  if (typeof registration === 'function') {
    registration();
    return;
  }
  registration?.unregister?.();
}
