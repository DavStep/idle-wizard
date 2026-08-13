import { Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";

import { getHerbIconFrameName } from "../../../../assets/items/herbs/herbIcons.js";
import { formatRemainingTime } from "../../../../pages/shared/timerDisplay.js";
import { formatCoinPriceText } from "../../../../shared/coinPrice.js";
import { PixiCostButton } from "../../primitives/PixiCostButton.js";
import { PixiButton } from "../../primitives/PixiButton.js";
import { PixiNotificationBadge } from "../../global/transient/PixiNotificationBadges.js";
import {
  createTimedProgressWindow,
  getTimedProgressSnapshotProgress,
} from "../../primitives/PixiProgressBar.js";
import {
  bindPixiSeedPackIcon,
  layoutPixiSeedPackIcon,
} from "../../primitives/PixiSeedPackIcon.js";
import { PixiStarLevelLabel } from "../../primitives/PixiStarLevelLabel.js";
import { normalizePixiTextStroke } from "../../primitives/PixiTextLabel.js";
import { PooledCollection } from "../../retained/PooledCollection.js";
import { WidgetPool } from "../../retained/WidgetPool.js";
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from "../../theme/PixiThemeTokens.js";
import {
  BaseRetainedPixiPage,
  RETAINED_PAGE_GEOMETRY,
  RETAINED_TEXT_STYLES,
  RetainedPanel,
  RetainedScrollArea,
  RetainedTimedProgressBar,
  applyTextTheme,
  createText,
  finiteOr,
  normalizeRows,
  resolveRetainedPageBottomClearance,
  setText,
} from "../workshop/RetainedPageKit.js";
import {
  GardenConfirmDialogPixi,
  GardenSeedDialogPixi,
} from "./GardenDialogPixi.js";

export const GARDEN_PIXI_GEOMETRY = Object.freeze({
  plotListTop: 120,
  plotListBottom: 162,
  gridPaddingTop: 24,
  gridPaddingBottom: 24,
  gridPaddingX: 32,
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
  actionBarBottom: 162,
  actionButtonHeight: PIXI_UI_GEOMETRY.roomControlHeight,
  actionButtonGap: 8,
  soloSeedsButtonWidth: 220,
  selectedSeedHeight: 24,
  selectedSeedGap: 5,
});

const GARDEN_GROWING_WIND_MS = 2_400;
const GARDEN_READY_LIFT_MS = 1_080;
const GARDEN_SCISSORS_SNIP_MS = 420;
const GARDEN_PLOT_RECEIVE_MS = 240;
const GARDEN_SEED_USED_FEEDBACK_MS = 220;
const GARDEN_DIALOG_IDS = Object.freeze({
  seed: "garden.seed",
  cancel: "garden.cancel",
  swap: "garden.swap",
});
const SOIL_ASSET_ID =
  "source:assets/rooms/garden/plots/outpost-plot-ground-level-5.png";
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
    reducedMotion = prefersReducedMotion,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    super({ pageId: "garden", semanticTargets, theme });
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.dialogRegistry = dialogRegistry;
    this.dialogLayer = dialogLayer;
    this.actions = actions;
    this.currentActions = actions;
    this.ticker = ticker;
    this.timeSource = timeSource;
    this.reducedMotion =
      typeof reducedMotion === "function"
        ? reducedMotion
        : () => Boolean(reducedMotion);
    this.active = false;
    this.instanceSequence = 0;
    this.tickHandler = () => this.tick(this.timeSource());
    this.boundPlotState = new Map();
    this.hasBoundPlotState = false;

    this.plotScroll = new RetainedScrollArea({
      assetManager: this.assetManager,
      label: "garden-page-scroll",
      inputRouter: this.inputRouter,
    });
    this.content.addChild(this.plotScroll.root);
    this.plotPool = new WidgetPool({
      name: "garden plot pool",
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
      name: "garden plots",
      pool: this.plotPool,
      counters,
      keyOf: (plot, index) => plot.id ?? plot.tileNumber ?? `plot-${index + 1}`,
      bind: (widget, plot) => widget.bind(plot, this.currentActions),
      afterReconcile: (plots) => this.orderPlots(plots),
    });

    this.actionBar = new GardenSeedActionBar({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      semanticTargets: this.semanticTargets,
      reducedMotion: this.reducedMotion,
      onSeedUsed: (result) => this.startSeedUsedFeedback(result),
    });
    this.plotTooltip = new GardenPlotTooltip({
      assetManager: this.assetManager,
    });
    this.content.addChild(this.actionBar.root, this.plotTooltip.root);

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
            onClose: () => this.closeDialog("seed"),
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
            title: "Cancel Progress?",
            confirmLabel: "Empty",
            variant: "danger",
            onClose: () => this.closeDialog("cancel"),
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
            title: "Swap Seed?",
            confirmLabel: "Swap",
            onClose: () => this.closeDialog("swap"),
            theme: this.theme,
          }),
      );
    }
  }

  renderViewModel(viewModel) {
    const garden = viewModel.garden ?? viewModel;
    this.currentActions = viewModel.actions ?? garden.actions ?? this.actions;

    const plots = normalizeRows(garden.plots ?? garden.plot?.tiles).filter(
      (plot) => plot?.hidden !== true && plot?.visible !== false,
    );
    this.plots.reconcile(plots);
    this.syncPlotContentHeight(plots.length);
    this.actionBar.bind(garden.actionBar ?? {}, this.currentActions);
    this.syncDialogs(garden.dialogs ?? {});
    this.layoutPage(this.sourceWidth, this.sourceHeight);
    this.tick(finiteOr(garden.now, this.timeSource()));
  }

  syncDialogs(dialogs) {
    for (const kind of Object.keys(GARDEN_DIALOG_IDS)) {
      const model = dialogs[kind];
      if (model?.open === true) {
        this.openDialog(kind, model);
      } else if (
        model?.open === false &&
        this.dialogRegistry?.isOpen?.(GARDEN_DIALOG_IDS[kind])
      ) {
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
    if (kind === "seed") {
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
    const actionName = kind === "cancel" ? "confirmCancel" : "confirmSwap";
    const onConfirm =
      model.onConfirm ??
      ((payload) => this.currentActions?.[actionName]?.(payload));
    return {
      ...model,
      onConfirm: (payload) => {
        const result = onConfirm(payload);
        if (kind === "swap") {
          this.startSeedUsedFeedback(result);
        }
        return result;
      },
    };
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
    this.hidePlotTooltip();
    this.settleTransientMotion();
    super.deactivate();
  }

  tick(now = this.timeSource()) {
    this.actionBar?.updateTime(now);
    for (const plot of this.plots?.getWidgets?.() ?? []) {
      plot.updateTime(now);
    }
  }

  settleTransientMotion() {
    this.actionBar?.settleSeedUsedMotion();
    for (const plot of this.plots?.getWidgets?.() ?? []) {
      plot.settleTransientMotion();
    }
  }

  startSeedUsedFeedback(result) {
    if (!seedUseSucceeded(result)) {
      return false;
    }
    return this.actionBar?.startSeedUsedMotion(this.timeSource()) ?? false;
  }

  showPlotTooltip(copy, target) {
    if (!copy || !target) {
      this.hidePlotTooltip();
      return false;
    }

    this.plotTooltip.bind(copy);
    const targetBounds = target.getBounds();
    const targetRight = Number.isFinite(targetBounds.maxX)
      ? targetBounds.maxX
      : targetBounds.x + targetBounds.width;
    const targetTop = Number.isFinite(targetBounds.minY)
      ? targetBounds.minY
      : targetBounds.y;
    const targetBottom = Number.isFinite(targetBounds.maxY)
      ? targetBounds.maxY
      : targetBounds.y + targetBounds.height;
    const topRight = this.content.toLocal({
      x: targetRight,
      y: targetTop,
    });
    const bottomRight = this.content.toLocal({
      x: targetRight,
      y: targetBottom,
    });
    const x = Math.min(
      this.sourceWidth - this.plotTooltip.width - 8,
      Math.max(8, topRight.x - this.plotTooltip.width),
    );
    const aboveY = topRight.y - this.plotTooltip.height - 6;
    const y = aboveY >= 8 ? aboveY : bottomRight.y + 6;
    this.plotTooltip.show({ x, y });
    return true;
  }

  hidePlotTooltip() {
    this.plotTooltip?.hide();
  }

  orderPlots(plots) {
    this.plotScroll.content.removeChildren();
    for (const plot of plots) {
      this.plotScroll.content.addChild(plot.root);
    }
  }

  syncPlotContentHeight(plotCount) {
    const rows = Math.max(
      1,
      Math.ceil(
        Math.max(0, Number(plotCount) || 0) / GARDEN_PIXI_GEOMETRY.columns,
      ),
    );
    this.plotScroll.setContentHeight(
      GARDEN_PIXI_GEOMETRY.gridPaddingTop +
        rows * GARDEN_PIXI_GEOMETRY.rowHeight +
        Math.max(0, rows - 1) * GARDEN_PIXI_GEOMETRY.rowGap +
        GARDEN_PIXI_GEOMETRY.gridPaddingBottom,
    );
  }

  applyThemeToChildren(theme) {
    this.actionBar?.applyTheme(theme);
    this.plotTooltip?.applyTheme(theme);
    for (const plot of this.plots?.getWidgets?.() ?? []) {
      plot.applyTheme(theme);
    }
  }

  layoutPage(sourceWidth, sourceHeight) {
    if (!this.plotScroll) {
      return;
    }
    const bottomClearance = resolveRetainedPageBottomClearance(
      this.viewModel,
    );
    const plotListHeight = Math.max(
      0,
      sourceHeight -
        GARDEN_PIXI_GEOMETRY.plotListTop -
        bottomClearance,
    );
    this.plotScroll.setBounds(
      0,
      GARDEN_PIXI_GEOMETRY.plotListTop,
      sourceWidth - RETAINED_PAGE_GEOMETRY.contentEdge,
      plotListHeight,
    );
    this.actionBar.setBounds(
      RETAINED_PAGE_GEOMETRY.contentEdge,
      sourceHeight - bottomClearance,
      sourceWidth - RETAINED_PAGE_GEOMETRY.contentEdge * 2,
    );
    this.layoutGarden();
  }

  layoutGarden() {
    if (!this.plots) {
      return;
    }
    const contentWidth = this.sourceWidth - RETAINED_PAGE_GEOMETRY.contentEdge;
    const cellWidth =
      (contentWidth -
        GARDEN_PIXI_GEOMETRY.gridPaddingX * 2 -
        GARDEN_PIXI_GEOMETRY.columnGap * (GARDEN_PIXI_GEOMETRY.columns - 1)) /
      GARDEN_PIXI_GEOMETRY.columns;
    this.plots.getWidgets().forEach((plot, index) => {
      const column = index % GARDEN_PIXI_GEOMETRY.columns;
      const row = Math.floor(index / GARDEN_PIXI_GEOMETRY.columns);
      plot.setBounds(
        GARDEN_PIXI_GEOMETRY.gridPaddingX +
          column * (cellWidth + GARDEN_PIXI_GEOMETRY.columnGap),
        GARDEN_PIXI_GEOMETRY.gridPaddingTop +
          row * (GARDEN_PIXI_GEOMETRY.rowHeight + GARDEN_PIXI_GEOMETRY.rowGap),
        cellWidth,
      );
    });
  }

  destroyPage() {
    this.ticker?.remove?.(this.tickHandler);
    this.plots?.destroy();
    this.plotPool?.destroy();
    this.plotScroll?.destroy();
    this.actionBar?.destroy();
    this.plotTooltip?.destroy();
  }
}

/**
 * Garden-local action composition that keeps seed choice separate from plots.
 * It reuses shared Root Run buttons, panel chrome, and seed-pack iconography.
 */
export class GardenSeedActionBar {
  constructor({
    assetManager = null,
    inputRouter = null,
    semanticTargets = null,
    reducedMotion = prefersReducedMotion,
    onSeedUsed = null,
  } = {}) {
    this.assetManager = assetManager;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.reducedMotion =
      typeof reducedMotion === "function"
        ? reducedMotion
        : () => Boolean(reducedMotion);
    this.onSeedUsed = typeof onSeedUsed === "function" ? onSeedUsed : null;
    this.seedUsedStartedAt = null;
    this.seedIconDropY = 0;
    this.indicatorOffsetY = 0;
    this.indicatorScaleX = 1;
    this.indicatorScaleY = 1;
    this.root = new Container({ label: "garden-seed-action-bar" });
    this.plantButton = new PixiButton({
      assetManager,
      inputRouter,
      semanticRegistry: semanticTargets,
      semanticId: "garden.plantAll",
      text: "Plant All",
      variant: "green",
      label: "garden-plant-all",
    });
    this.harvestButton = new PixiButton({
      assetManager,
      inputRouter,
      semanticRegistry: semanticTargets,
      semanticId: "garden.harvestAll",
      text: "Harvest All",
      variant: "green",
      label: "garden-harvest-all",
    });
    this.seedsButton = new PixiButton({
      assetManager,
      inputRouter,
      semanticRegistry: semanticTargets,
      semanticId: "garden.openSeeds",
      text: "Seeds",
      variant: "yellow",
      label: "garden-open-seeds",
    });
    this.selectionPanel = new RetainedPanel({
      assetManager,
      panelLabel: "garden-selected-seed",
    });
    this.selectionPanel.setTitle("");
    this.selectionLabel = createText("", {
      ...RETAINED_TEXT_STYLES.border,
      align: "center",
    });
    this.selectionLabel.anchor.set(0.5);
    this.seedPack = new Sprite(Texture.EMPTY);
    this.seedPack.anchor.set(0.5);
    this.seedItem = new Sprite(Texture.EMPTY);
    this.seedItem.anchor.set(0.5);
    this.selectionPanel.body.addChild(
      this.seedPack,
      this.seedItem,
      this.selectionLabel,
    );
    this.root.addChild(
      this.selectionPanel.root,
      this.plantButton,
      this.harvestButton,
      this.seedsButton,
    );
  }

  bind(model = {}, actions = {}) {
    const selectedSeed = model.selectedSeed ?? null;
    const canPlantAll = model.canPlantAll === true;
    const canHarvestAll = model.canHarvestAll === true;
    this.plantButton.visible = canPlantAll;
    this.plantButton.renderable = canPlantAll;
    this.plantButton
      .setText("Plant All")
      .setEnabled(canPlantAll)
      .setAction(() => {
        const result = actions.plantAll?.() ?? false;
        this.onSeedUsed?.(result);
        return result;
      });
    this.harvestButton.visible = canHarvestAll;
    this.harvestButton.renderable = canHarvestAll;
    this.harvestButton
      .setText("Harvest All")
      .setEnabled(canHarvestAll)
      .setNotification(Number(model.readyHarvestCount) > 0)
      .setAction(() => actions.harvestAll?.() ?? false);
    this.seedsButton
      .setText("Seeds")
      .setEnabled(model.hasSeedChoices !== false)
      .setAction(() => actions.openSeedPicker?.() ?? false);

    this.selectionPanel.root.visible = Boolean(selectedSeed);
    this.selectionPanel.root.renderable = Boolean(selectedSeed);
    if (selectedSeed) {
      bindPixiSeedPackIcon({
        assetManager: this.assetManager,
        base: this.seedPack,
        item: this.seedItem,
        seed: selectedSeed,
      });
      setText(
        this.selectionLabel,
        `${selectedSeed.label ?? "Seed"} selected · ${selectedSeed.quantity ?? 0}`,
      );
    } else {
      this.settleSeedUsedMotion();
    }
    this.layout();
  }

  startSeedUsedMotion(now) {
    if (
      !this.selectionPanel.root.visible ||
      this.reducedMotion()
    ) {
      this.settleSeedUsedMotion();
      return false;
    }
    this.seedUsedStartedAt = finiteOr(now, 0);
    this.seedIconDropY = 0;
    this.indicatorOffsetY = 0;
    this.indicatorScaleX = 1;
    this.indicatorScaleY = 1;
    this.applySeedUsedTransform();
    return true;
  }

  updateTime(now) {
    if (this.seedUsedStartedAt === null) {
      return false;
    }
    const progress = clamp(
      (finiteOr(now, this.seedUsedStartedAt) - this.seedUsedStartedAt) /
        GARDEN_SEED_USED_FEEDBACK_MS,
      0,
      1,
    );
    if (progress >= 1) {
      this.settleSeedUsedMotion();
      return false;
    }
    applySeedUsedMotion(this, progress);
    this.applySeedUsedTransform();
    return true;
  }

  settleSeedUsedMotion() {
    this.seedUsedStartedAt = null;
    this.seedIconDropY = 0;
    this.indicatorOffsetY = 0;
    this.indicatorScaleX = 1;
    this.indicatorScaleY = 1;
    this.applySeedUsedTransform();
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    this.width = Math.max(0, Number(width) || 0);
    this.layout();
  }

  layout() {
    const width = this.width ?? 0;
    const buttonY = -GARDEN_PIXI_GEOMETRY.actionButtonHeight;
    const visibleButtons = [
      this.plantButton,
      this.harvestButton,
      this.seedsButton,
    ].filter((button) => button.visible);
    const seedsOnly =
      visibleButtons.length === 1 && visibleButtons[0] === this.seedsButton;
    const buttonWidth =
      seedsOnly
        ? Math.min(width, GARDEN_PIXI_GEOMETRY.soloSeedsButtonWidth)
        : (width -
            GARDEN_PIXI_GEOMETRY.actionButtonGap *
              Math.max(0, visibleButtons.length - 1)) /
          Math.max(1, visibleButtons.length);
    const buttonRowX = seedsOnly ? (width - buttonWidth) / 2 : 0;
    visibleButtons.forEach((button, index) => {
      button.position.set(
        buttonRowX +
          index * (buttonWidth + GARDEN_PIXI_GEOMETRY.actionButtonGap),
        buttonY,
      );
      button.setSize(buttonWidth, GARDEN_PIXI_GEOMETRY.actionButtonHeight);
    });

    const indicatorWidth = Math.min(176, width);
    const indicatorX = (width - indicatorWidth) / 2;
    const indicatorY =
      buttonY -
      GARDEN_PIXI_GEOMETRY.selectedSeedGap -
      GARDEN_PIXI_GEOMETRY.selectedSeedHeight;
    this.selectionPanel.setBounds(
      indicatorX,
      indicatorY,
      indicatorWidth,
      GARDEN_PIXI_GEOMETRY.selectedSeedHeight,
    );
    layoutPixiSeedPackIcon({
      base: this.seedPack,
      item: this.seedItem,
      x: 14,
      y: GARDEN_PIXI_GEOMETRY.selectedSeedHeight / 2,
      width: 18,
      height: 18,
    });
    this.selectionLabel.position.set(
      indicatorWidth / 2 + 5,
      GARDEN_PIXI_GEOMETRY.selectedSeedHeight / 2,
    );
    this.applySeedUsedTransform();
  }

  applySeedUsedTransform() {
    const indicatorWidth = Math.min(176, this.width ?? 0);
    const indicatorX = ((this.width ?? 0) - indicatorWidth) / 2;
    const indicatorY =
      -GARDEN_PIXI_GEOMETRY.actionButtonHeight -
      GARDEN_PIXI_GEOMETRY.selectedSeedGap -
      GARDEN_PIXI_GEOMETRY.selectedSeedHeight;
    this.selectionPanel.root.pivot.set(
      indicatorWidth / 2,
      GARDEN_PIXI_GEOMETRY.selectedSeedHeight / 2,
    );
    this.selectionPanel.root.position.set(
      indicatorX + indicatorWidth / 2,
      indicatorY +
        GARDEN_PIXI_GEOMETRY.selectedSeedHeight / 2 +
        this.indicatorOffsetY,
    );
    this.selectionPanel.root.scale.set(
      this.indicatorScaleX,
      this.indicatorScaleY,
    );
    const iconY =
      GARDEN_PIXI_GEOMETRY.selectedSeedHeight / 2 + this.seedIconDropY;
    this.seedPack.y = iconY;
    this.seedItem.y = iconY;
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.plantButton.applyTheme(this.theme);
    this.harvestButton.applyTheme(this.theme);
    this.seedsButton.applyTheme(this.theme);
    this.selectionPanel.applyTheme(this.theme);
    applyTextTheme(this.selectionLabel, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: this.theme.resourceColors.seed,
      align: "center",
    });
  }

  destroy() {
    this.plantButton.destroy({ children: true });
    this.harvestButton.destroy({ children: true });
    this.seedsButton.destroy({ children: true });
    this.selectionPanel.destroy();
    this.root.destroy({ children: true });
  }
}

class GardenPlotTooltip {
  constructor({ assetManager }) {
    this.width = 180;
    this.height = 0;
    this.panel = new RetainedPanel({
      assetManager,
      panelLabel: "garden-plot-tooltip",
      strong: true,
      shadowKind: "tooltip",
    });
    this.root = this.panel.root;
    this.copy = createText("", {
      ...RETAINED_TEXT_STYLES.border,
      fill: "#ffffff",
      wordWrapWidth: this.width - 20,
    });
    this.panel.body.addChild(this.copy);
    this.root.visible = false;
    this.root.renderable = false;
  }

  bind(copy) {
    setText(this.copy, copy);
    this.copy.position.set(10, 8);
    this.height = Math.ceil(this.copy.height + 16);
    this.panel.setBounds(0, 0, this.width, this.height);
  }

  show({ x, y }) {
    this.root.position.set(x, y);
    this.root.visible = true;
    this.root.renderable = true;
  }

  hide() {
    this.root.visible = false;
    this.root.renderable = false;
  }

  applyTheme(theme) {
    this.panel.applyTheme(theme);
    applyTextTheme(this.copy, theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: "#ffffff",
      wordWrapWidth: this.width - 20,
    });
  }

  destroy() {
    this.panel.destroy();
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
    this.timerSnapshotProgress = Number.NaN;
    this.actions = {};
    this.enabled = false;
    this.pressed = false;
    this.receiveStartedAt = null;
    this.receiveOffsetY = 0;
    this.receiveScaleX = 1;
    this.receiveScaleY = 1;
    this.semanticIds = [];
    this.root = new Container({ label: `garden-plot-${instanceId}` });
    this.frame = new Container({ label: `garden-plot-${instanceId}-frame` });
    this.soil = new Sprite(Texture.EMPTY);
    this.soil.label = `garden-plot-${instanceId}-soil`;
    this.buyFrame = new Graphics({
      label: `garden-plot-${instanceId}-buy-frame`,
    });
    this.number = createText("", {
      ...RETAINED_TEXT_STYLES.bold,
      fill: "#3b2416",
    });
    this.level = new PixiStarLevelLabel({
      assetManager,
      size: 12,
      gap: 1,
      label: `garden-plot-${instanceId}-stars`,
    });
    this.plantMotion = new Container({
      label: `garden-plot-${instanceId}-plant-motion`,
    });
    this.plant = new Sprite(Texture.EMPTY);
    this.plant.label = `garden-plot-${instanceId}-plant`;
    this.plant.anchor.set(0.5, 1);
    this.plantMotion.addChild(this.plant);
    this.action = createText("", {
      fontSize: 9,
      lineHeight: 11,
      fontWeight: "700",
      align: "right",
    });
    this.action.anchor.set(1, 1);
    this.buyCostButton = new PixiCostButton({
      assetManager,
      width: GARDEN_PIXI_GEOMETRY.buyButtonWidth,
      height: GARDEN_PIXI_GEOMETRY.buyButtonHeight,
      stacked: true,
      tone: "green",
      label: `garden-plot-${instanceId}-buy-cost`,
    });
    this.buyCostButton.eventMode = "none";
    this.buyCostButton.visible = false;
    this.buyCostButton.renderable = false;
    this.scissorsMotion = new Container({
      label: `garden-plot-${instanceId}-scissors-motion`,
    });
    this.scissors = new Sprite(
      getAtlasTexture(assetManager, "tool:herbCuttingScissorsClosed"),
    );
    this.scissors.label = `garden-plot-${instanceId}-scissors`;
    this.scissorsOpen = new Sprite(
      getAtlasTexture(assetManager, "tool:herbCuttingScissorsOpen"),
    );
    this.scissorsOpen.label = `garden-plot-${instanceId}-scissors-open`;
    this.scissorsMotion.addChild(this.scissors, this.scissorsOpen);
    this.progress = new RetainedTimedProgressBar({
      assetManager,
      label: `garden-plot-${instanceId}-progress`,
      tone: "green",
      usePlayerStyle: false,
    });
    this.notificationBadge = new PixiNotificationBadge({ assetManager });
    this.notificationBadge.root.label = `garden-plot-${instanceId}-notification`;
    this.notification = this.notificationBadge.root;
    this.frame.addChild(
      this.soil,
      this.buyFrame,
      this.number,
      this.level,
      this.plantMotion,
      this.action,
      this.buyCostButton,
      this.scissorsMotion,
    );
    this.root.addChild(this.frame, this.progress.root, this.notification);
    this.pressRegistration =
      this.inputRouter?.registerPressTarget?.({
        id: `garden.plot.instance.${instanceId}`,
        displayObject: this.root,
        fallbackHitTest: true,
        enabled: () => this.enabled,
        slop: 12,
        onPressChange: (pressed) => this.setPressed(pressed),
        onActivate: () => this.activate(),
      }) ?? null;
  }

  bind(model, actions) {
    this.unregisterSemanticTargets();
    this.model = model ?? {};
    const process = this.model.process ?? this.model.progress;
    if (process && typeof process === "object") {
      const snapshotProgress =
        getTimedProgressSnapshotProgress(process);
      if (
        Number.isFinite(this.timerSnapshotProgress) &&
        snapshotProgress + Number.EPSILON <
          this.timerSnapshotProgress
      ) {
        this.progress.clearTimer(0);
      }
      this.timerSnapshotProgress = snapshotProgress;
      this.progress.setTimer(
        createTimedProgressWindow(process, this.page.timeSource()),
      );
    } else {
      this.timerSnapshotProgress = Number.NaN;
      this.progress.clearTimer(
        typeof process === "number" ? process : 0,
      );
    }
    this.actions = actions ?? {};
    const tileNumber =
      this.model.tileNumber ?? this.model.number ?? this.model.id;
    const visible = this.model.hidden !== true && this.model.visible !== false;
    this.enabled =
      visible &&
      this.model.disabled !== true &&
      this.model.action?.enabled !== false;
    this.root.visible = visible;
    this.root.renderable = visible;
    this.root.eventMode = this.enabled ? "static" : "none";
    setText(this.number, this.model.showNumber === false ? "" : tileNumber);
    const plotLevel = Math.max(1, Math.floor(Number(this.model.level) || 1));
    this.level.setLevel(plotLevel - 1);
    setText(this.action, resolveActionText(this.model));
    this.syncBuyCostButton();
    this.soil.texture = getTexture(this.assetManager, SOIL_ASSET_ID);
    const herbFrame =
      this.model.plantFrame ??
      getHerbIconFrameName(this.model.herbKey ?? this.model.plant?.key ?? "");
    this.plant.texture = herbFrame
      ? getAtlasTexture(this.assetManager, herbFrame)
      : Texture.EMPTY;
    this.plant.visible = Boolean(herbFrame);
    this.scissorsMotion.visible = this.model.phase === "harvesting";
    this.scissors.visible = this.scissorsMotion.visible;
    this.scissorsOpen.visible = this.scissorsMotion.visible;
    this.syncNotificationBadges();
    this.registerSemanticTargets(tileNumber);
    this.applyTheme(this.theme);
    this.updateTime(this.page.timeSource());
  }

  registerSemanticTargets(tileNumber) {
    const semanticId = this.model.semanticId ?? `garden.plot.${tileNumber}`;
    this.semanticTargets?.register?.({
      semanticId,
      tutorialId: this.model.tutorialId ?? `garden:plot:${tileNumber}`,
      displayObject: this.root,
      state: () => ({
        visible: this.root.visible && this.root.renderable,
        interactive: this.root.eventMode !== "none",
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
      displayObject: this.root,
      state: () => ({
        visible: this.root.visible && this.root.renderable,
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
      this.model.phase === "empty" && Boolean(this.model.toolbarSeedItemTypeId);
    const result =
      this.model.onActivate?.(this.model) ??
      this.model.action?.activate?.(this.model) ??
      this.actions.activatePlot?.(this.model) ??
      true;
    if (result?.tooltip) {
      this.page.showPlotTooltip(result.tooltip, this.root);
    } else {
      this.page.hidePlotTooltip();
    }
    if (receivesSeed && actionSucceeded(result)) {
      this.startSeedReceive(this.page.timeSource());
      this.page.startSeedUsedFeedback(result);
    }
    return result;
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
    this.level.position.set(5, GARDEN_PIXI_GEOMETRY.plotHeight - 19);
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
      (GARDEN_PIXI_GEOMETRY.plotWidth - GARDEN_PIXI_GEOMETRY.buyButtonWidth) /
        2,
      (GARDEN_PIXI_GEOMETRY.plotHeight - GARDEN_PIXI_GEOMETRY.buyButtonHeight) /
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
    const process = this.model.process ?? this.model.progress;
    const timed =
      process && typeof process === "object"
        ? this.progress.updateTimer(now)
        : {
            progress:
              typeof process === "number"
                ? clamp(process, 0, 1)
                : 0,
            remainingMs: 0,
          };
    const visible =
      this.model.phase === "ready" ||
      Boolean(this.model.process) ||
      this.model.progressVisible === true;
    this.progress.root.visible = visible;
    if (this.model.phase === "ready") {
      this.progress.clearTimer(1);
      timed.progress = 1;
    }
    const timerText =
      process && typeof process === "object"
        ? process.timerText ?? formatRemainingTime(timed.remainingMs)
        : "";
    if (timerText && this.model.actionTextIncludesTimer !== false) {
      const base = resolveActionText(this.model);
      setText(this.action, [base, timerText].filter(Boolean).join(" "));
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
      phase === "growing"
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
    const growthScale = phase === "growing" ? 0.42 + growingProgress * 0.58 : 1;
    this.plantMotion.position.set(
      GARDEN_PIXI_GEOMETRY.plotWidth / 2,
      GARDEN_PIXI_GEOMETRY.plotHeight - 20,
    );
    this.plantMotion.scale.set(growthScale);
    this.plantMotion.rotation = 0;

    if (phase === "growing") {
      const progress = loopProgress(
        now + (((tileNumber - 1) * 421) % GARDEN_GROWING_WIND_MS),
        GARDEN_GROWING_WIND_MS,
      );
      const sway =
        progress < 0.5
          ? lerp(-1.8, 2.1, softEase(progress / 0.5))
          : lerp(2.1, -1.8, softEase((progress - 0.5) / 0.5));
      this.plantMotion.rotation = degreesToRadians(sway);
    } else if (phase === "ready" || phase === "harvesting") {
      const progress = loopProgress(
        now + (((tileNumber - 1) * 317) % GARDEN_READY_LIFT_MS),
        GARDEN_READY_LIFT_MS,
      );
      applyReadyPlantMotion(this.plantMotion, progress, growthScale);
    }

    if (phase === "harvesting") {
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
    applyTextTheme(this.number, this.theme, {
      ...RETAINED_TEXT_STYLES.bold,
      fill: "#3b2416",
    });
    this.number.style.stroke = null;
    applyTextTheme(this.action, this.theme, {
      fontSize: this.model.phase === "empty" || this.model.buySlot ? 11 : 9,
      lineHeight: this.model.phase === "empty" || this.model.buySlot ? 14 : 11,
      fontWeight: "700",
      fill: "#ffffff",
      align: "right",
    });
    this.action.style.stroke = normalizePixiTextStroke({
      color: "#0a0a0a",
    }, this.action.style.fontSize);
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
      actionLabel: "Unlock",
      amountLabel: costCoin === 0 ? "Free" : formatCoinPriceText(costCoin),
      resource: costCoin === 0 ? "none" : "coin",
      state: this.model.affordable === false ? "unaffordable" : "available",
      enabled: this.enabled,
    });
  }

  syncNotificationBadges() {
    const buttonOwnsNotification = this.buyCostButton.visible;
    this.buyCostButton.setNotification(
      buttonOwnsNotification && this.model.notification === true,
      this.model.notificationTone,
    );
    this.notificationBadge
      .setTone(this.model.notificationTone)
      .setActive(
        !buttonOwnsNotification && this.model.notification === true,
      );
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
      this.action.anchor.set(0.5);
      this.action.position.set(
        GARDEN_PIXI_GEOMETRY.plotWidth / 2,
        GARDEN_PIXI_GEOMETRY.plotHeight / 2,
      );
    } else {
      this.soil.visible = true;
      this.number.visible = this.model.showNumber !== false;
      this.level.visible = this.model.showLevel !== false;
      this.action.anchor.set(1, 1);
      if (this.model.phase === "empty") {
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
    this.syncNotificationBadges();
  }

  reset() {
    this.unregisterSemanticTargets();
    this.model = {};
    this.timerSnapshotProgress = Number.NaN;
    this.progress.clearTimer(0);
    this.actions = {};
    this.enabled = false;
    this.pressed = false;
    this.root.visible = false;
    this.root.renderable = false;
    this.root.eventMode = "none";
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
    setText(this.number, "");
    this.level.setLevel(0);
    setText(this.action, "");
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
    this.progress.destroy();
    this.root.destroy({ children: true });
  }
}

function resolveActionText(model) {
  let actionText = "";
  if (model.actionText !== undefined) {
    actionText = String(model.actionText ?? "");
  } else if (typeof model.action === "string") {
    actionText = model.action;
  } else {
    actionText = model.action?.label ?? "";
  }
  return isPlantActionText(actionText)
    ? `${actionText.charAt(0).toUpperCase()}${actionText.slice(1)}`
    : actionText;
}

function isPlantActionText(value) {
  return /^plant(?:\s|$)/i.test(String(value ?? "").trim());
}

function applyReadyPlantMotion(motion, progress, growthScale) {
  const first = progress < 0.26;
  const second = !first && progress < 0.42;
  const third = !first && !second && progress < 0.5;
  const fourth = !first && !second && !third && progress < 0.58;
  const fifth = !first && !second && !third && !fourth && progress < 0.72;
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
  motion.y = GARDEN_PIXI_GEOMETRY.plotHeight - 20 + lerp(fromY, toY, eased);
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

function applySeedUsedMotion(actionBar, progress) {
  let segment;
  let fromIconY;
  let toIconY;
  let fromScaleX;
  let toScaleX;
  let fromScaleY;
  let toScaleY;
  let fromRowY;
  let toRowY;
  if (progress < 0.5) {
    segment = progress / 0.5;
    fromIconY = 0;
    toIconY = 6;
    fromScaleX = 1;
    toScaleX = 1.012;
    fromScaleY = 1;
    toScaleY = 0.97;
    fromRowY = 0;
    toRowY = 1;
  } else if (progress < 0.74) {
    segment = (progress - 0.5) / 0.24;
    fromIconY = 6;
    toIconY = -1;
    fromScaleX = 1.012;
    toScaleX = 0.995;
    fromScaleY = 0.97;
    toScaleY = 1.015;
    fromRowY = 1;
    toRowY = -0.5;
  } else {
    segment = (progress - 0.74) / 0.26;
    fromIconY = -1;
    toIconY = 0;
    fromScaleX = 0.995;
    toScaleX = 1;
    fromScaleY = 1.015;
    toScaleY = 1;
    fromRowY = -0.5;
    toRowY = 0;
  }
  const eased = softEase(segment);
  actionBar.seedIconDropY = lerp(fromIconY, toIconY, eased);
  actionBar.indicatorScaleX = lerp(fromScaleX, toScaleX, eased);
  actionBar.indicatorScaleY = lerp(fromScaleY, toScaleY, eased);
  actionBar.indicatorOffsetY = lerp(fromRowY, toRowY, eased);
}

function actionSucceeded(result) {
  return result !== false && result?.ok !== false;
}

function seedUseSucceeded(result) {
  return result === true || result?.ok === true;
}

function prefersReducedMotion() {
  return Boolean(
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
  );
}

function loopProgress(now, duration) {
  const value = finiteOr(now, 0) % duration;
  return (value < 0 ? value + duration : value) / duration;
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
    parameter = clamp(parameter - (current - target) / slope, 0, 1);
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
    ? (assetManager?.getAtlasTexture?.(frameName) ?? Texture.EMPTY)
    : Texture.EMPTY;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, finiteOr(value, minimum)));
}

function releaseRegistration(registration) {
  if (typeof registration === "function") {
    registration();
    return;
  }
  registration?.unregister?.();
}
