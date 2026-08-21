import { Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";

import { getHerbIconFrameName } from "../../../../assets/items/herbs/herbIcons.js";
import { formatRemainingTime } from "../../../../pages/shared/timerDisplay.js";
import { formatCoinPriceText } from "../../../../shared/coinPrice.js";
import { PixiCostButton } from "../../primitives/PixiCostButton.js";
import { PixiTextButton } from "../../primitives/PixiTextButton.js";
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
import {
  PixiTextLabel,
  normalizePixiTextStroke,
} from "../../primitives/PixiTextLabel.js";
import { PooledCollection } from "../../retained/PooledCollection.js";
import { WidgetPool } from "../../retained/WidgetPool.js";
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from "../../theme/PixiThemeTokens.js";
import {
  BaseRetainedPixiPage,
  RETAINED_PAGE_GEOMETRY,
  RETAINED_SCROLLBAR_GEOMETRY,
  RETAINED_TEXT_STYLES,
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
import {
  AMBIENT_FIREFLY_COUNT,
  AmbientFireflyLayer,
} from "../shared/AmbientFireflyLayer.js";
import { PixiTooltip } from "../shared/PixiTooltip.js";
import { AutoGearMotion } from "../shared/AutoGearMotion.js";
import { MarketTitleRibbon } from "../shop/MarketTitleRibbon.js";

export const GARDEN_PIXI_GEOMETRY = Object.freeze({
  plotListTop: 140,
  titleTop: PIXI_UI_GEOMETRY.roomContentTop,
  plotListBottom: RETAINED_PAGE_GEOMETRY.chatClearance,
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
  automatedControlWidth: 32,
  automatedControlHeight: PIXI_UI_GEOMETRY.roomControlHeight,
  automatedControlGap: 6,
  automatedControlHitSize: 44,
  automatedSeedIconSize: 25,
  automatedSeedIconY: 14,
  automatedSeedLabelY: 27,
  automatedSeedLabelFontSize: 9,
  automatedAutoIconHeight: 27,
  automatedAutoLabelY: 23,
  automatedPlantSlots: 5,
  automatedPlantLift: 2,
  automatedPlantJitterY: 1,
  actionBarBottom: RETAINED_PAGE_GEOMETRY.chatClearance,
  actionButtonHeight: PIXI_UI_GEOMETRY.roomControlHeight,
  actionButtonGap: 8,
  soloSeedsButtonWidth: 220,
  seedButtonIconSize: 19 * 1.35,
  seedButtonContentGap: 4,
  seedButtonContentPadding: 10,
});
export const GARDEN_FIREFLY_COUNT = AMBIENT_FIREFLY_COUNT;

const GARDEN_FIREFLY_FIELD = Object.freeze({
  top: 106,
  bottomInset: 176,
  maxBottom: 640,
});

const GARDEN_GROWING_WIND_MS = 2_400;
const GARDEN_READY_LIFT_MS = 1_080;
const GARDEN_SCISSORS_SNIP_MS = 420;
const GARDEN_PLOT_RECEIVE_MS = 500;
const GARDEN_PLOT_RECEIVE_IMPACT_PROGRESS = 0.4;
const GARDEN_PLOT_HERB_REVEAL_START_PROGRESS = 0.42;
const GARDEN_PLOT_HERB_REVEAL_END_PROGRESS = 0.9;
const GARDEN_PLOT_TAP_FEEDBACK_MS = 560;
const GARDEN_PLOT_TAP_REDUCED_MOTION_LABEL_MS = 220;
const GARDEN_DIALOG_IDS = Object.freeze({
  seed: "garden.seed",
  cancel: "garden.cancel",
  swap: "garden.swap",
});
const SOIL_ASSET_ID =
  "source:assets/rooms/garden/plots/outpost-plot-ground-level-5.png";
const AUTOMATED_SOIL_ASSET_ID =
  "source:assets/rooms/garden/plots/outpost-plot-ground-automated.png";

function resolveAutomatedPlotWidth(rowWidth) {
  const safeRowWidth = Math.max(0, Number(rowWidth) || 0);
  const cellWidth =
    (safeRowWidth -
      GARDEN_PIXI_GEOMETRY.columnGap *
        (GARDEN_PIXI_GEOMETRY.columns - 1)) /
    GARDEN_PIXI_GEOMETRY.columns;
  const visiblePlotInset = Math.max(
    0,
    (cellWidth - GARDEN_PIXI_GEOMETRY.plotWidth) / 2,
  );
  return Math.max(
    GARDEN_PIXI_GEOMETRY.plotWidth,
    safeRowWidth - visiblePlotInset * 2,
  );
}

function resolveAutomatedPlantJitter(
  tileNumber,
  index,
  tileFactor,
  slotFactor,
  amplitude,
) {
  const hashed =
    (Math.imul(tileNumber, tileFactor) +
      Math.imul(index + 1, slotFactor)) % 101;
  const sample = (hashed + 101) % 101;
  return ((sample / 100) * 2 - 1) * amplitude;
}

function resolvePlantSlotPosition({
  automated,
  visualPlotWidth,
  tileNumber,
  index,
  visibleCount = 1,
}) {
  if (!automated) {
    return {
      x: visualPlotWidth / 2,
      y: GARDEN_PIXI_GEOMETRY.plotHeight - 20,
    };
  }

  const slotCount = GARDEN_PIXI_GEOMETRY.automatedPlantSlots;
  const safeVisibleCount = Math.min(
    slotCount,
    Math.max(1, Math.floor(Number(visibleCount) || 1)),
  );
  const inset = visualPlotWidth / 7;
  const slotGap = (visualPlotWidth - inset * 2) / Math.max(1, slotCount - 1);
  const groupStartX =
    visualPlotWidth / 2 - ((safeVisibleCount - 1) * slotGap) / 2;
  return {
    x: groupStartX + index * slotGap,
    y:
      GARDEN_PIXI_GEOMETRY.plotHeight -
      20 -
      GARDEN_PIXI_GEOMETRY.automatedPlantLift +
      resolveAutomatedPlantJitter(
        tileNumber,
        index,
        53,
        89,
        GARDEN_PIXI_GEOMETRY.automatedPlantJitterY,
      ),
  };
}

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
    ambientRequestFrame,
    ambientCancelFrame,
    ambientTimeSource,
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

    this.fireflies = new AmbientFireflyLayer({
      label: "garden",
      field: GARDEN_FIREFLY_FIELD,
      phaseOffset: 0.8,
      intensity: 0.92,
      requestFrame: ambientRequestFrame,
      cancelFrame: ambientCancelFrame,
      timeSource: ambientTimeSource,
      reducedMotion: this.reducedMotion,
    });

    this.plotScroll = new RetainedScrollArea({
      assetManager: this.assetManager,
      label: "garden-page-scroll",
      inputRouter: this.inputRouter,
    });
    this.titleRibbon = new MarketTitleRibbon({
      assetManager: this.assetManager,
      assetId: PIXI_ROOT_RUN_ASSETS.marketTitleRibbonGreen,
      label: "garden:title-ribbon",
      showStars: false,
    });
    this.titleRibbon.bind("Garden");
    this.titleRibbon.root.eventMode = "none";
    this.plotScroll.content.addChild(this.titleRibbon.root);
    this.content.addChild(this.fireflies.root, this.plotScroll.root);
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
    });
    this.plotTooltip = new GardenPlotTooltip({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      prefersReducedMotion: this.reducedMotion,
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
    const plantingPlotKeys = this.getPlantingTransitionKeys(plots);
    this.plots.reconcile(plots);
    this.actionBar.bind(garden.actionBar ?? {}, this.currentActions);
    this.syncDialogs(garden.dialogs ?? {});
    this.layoutPage(this.sourceWidth, this.sourceHeight);
    const now = finiteOr(garden.now, this.timeSource());
    for (const plotKey of plantingPlotKeys) {
      this.plots.get(plotKey)?.startSeedReceive(now);
    }
    this.captureBoundPlotState(plots);
    this.tick(now);
  }

  getPlantingTransitionKeys(plots) {
    if (!this.active || !this.hasBoundPlotState) {
      return [];
    }
    return plots.flatMap((plot, index) => {
      const key = getGardenPlotKey(plot, index);
      return isGardenPlantingTransition(this.boundPlotState.get(key), plot)
        ? [key]
        : [];
    });
  }

  captureBoundPlotState(plots) {
    this.boundPlotState = new Map(
      plots.map((plot, index) => [
        getGardenPlotKey(plot, index),
        {
          phase: plot?.phase ?? null,
          seedItemTypeId: plot?.seedItemTypeId ?? null,
          seedKey: plot?.seedKey ?? null,
        },
      ]),
    );
    this.hasBoundPlotState = true;
  }

  syncDialogs(dialogs) {
    for (const kind of Object.keys(GARDEN_DIALOG_IDS)) {
      const model = dialogs[kind];
      const dialogId = GARDEN_DIALOG_IDS[kind];
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
    const dialogId = GARDEN_DIALOG_IDS[kind];
    if (!dialogId || !this.dialogRegistry?.has?.(dialogId)) {
      return false;
    }
    const normalized = this.normalizeDialogModel(kind, model ?? {});
    this.dialogRegistry.open(dialogId, normalized);
    return true;
  }

  navigateToTarget({ targetId, indication = "boink" } = {}) {
    const target = String(targetId ?? "").trim();
    if (!target.startsWith("garden.seed.")) {
      return false;
    }
    const opened = this.currentActions?.openSeedPicker?.();
    if (opened === false || opened?.ok === false) {
      return false;
    }
    return (
      this.dialogRegistry
        ?.get?.(GARDEN_DIALOG_IDS.seed)
        ?.navigateToTarget?.({ targetId: target, indication }) ?? false
    );
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
      onConfirm,
    };
  }

  activate() {
    if (this.active) {
      return;
    }
    super.activate();
    this.active = true;
    this.fireflies?.setActive(true);
    this.tick(this.timeSource());
    this.ticker?.add?.(this.tickHandler);
  }

  deactivate() {
    if (!this.active) {
      return;
    }
    this.ticker?.remove?.(this.tickHandler);
    this.active = false;
    this.fireflies?.setActive(false);
    this.hidePlotTooltip();
    this.settleTransientMotion();
    this.boundPlotState.clear();
    this.hasBoundPlotState = false;
    super.deactivate();
  }

  tick(now = this.timeSource()) {
    this.plotTooltip?.updateTime();
    for (const plot of this.plots?.getWidgets?.() ?? []) {
      plot.updateTime(now);
    }
  }

  settleTransientMotion() {
    for (const plot of this.plots?.getWidgets?.() ?? []) {
      plot.settleTransientMotion();
    }
  }

  showPlotTooltip(copy, target) {
    if (!copy || !target) {
      this.hidePlotTooltip();
      return false;
    }

    this.plotTooltip.bind(copy);
    return this.plotTooltip.showNearTarget({
      target,
      container: this.content,
      boundaryWidth: this.sourceWidth,
      boundaryHeight: this.sourceHeight,
    });
  }

  hidePlotTooltip() {
    this.plotTooltip?.hide();
  }

  orderPlots(plots) {
    this.plotScroll.content.removeChildren();
    this.plotScroll.content.addChild(this.titleRibbon.root);
    for (const plot of plots) {
      this.plotScroll.content.addChild(plot.root);
    }
  }

  syncPlotContentHeight(contentBottom) {
    const scrollContentLead =
      GARDEN_PIXI_GEOMETRY.plotListTop - GARDEN_PIXI_GEOMETRY.titleTop;
    const minimumContentBottom =
      scrollContentLead +
      GARDEN_PIXI_GEOMETRY.gridPaddingTop +
      GARDEN_PIXI_GEOMETRY.rowHeight;
    this.plotScroll.setContentHeight(
      Math.max(minimumContentBottom, Number(contentBottom) || 0) +
        GARDEN_PIXI_GEOMETRY.gridPaddingBottom,
    );
  }

  applyThemeToChildren(theme) {
    this.fireflies?.applyTheme(theme);
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
    this.fireflies?.setBounds(sourceWidth, sourceHeight);
    this.titleRibbon.setMaxWidth(sourceWidth);
    this.titleRibbon.root.position.set(
      (sourceWidth - this.titleRibbon.width) / 2,
      0,
    );
    const plotListHeight = Math.max(
      0,
      sourceHeight -
        GARDEN_PIXI_GEOMETRY.titleTop -
        bottomClearance,
    );
    const scrollbarAllowance =
      RETAINED_SCROLLBAR_GEOMETRY.gap +
      RETAINED_SCROLLBAR_GEOMETRY.width;
    this.plotScroll.setBounds(
      0,
      GARDEN_PIXI_GEOMETRY.titleTop,
      Math.max(0, sourceWidth - scrollbarAllowance - 1),
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
    let rowY =
      GARDEN_PIXI_GEOMETRY.plotListTop -
      GARDEN_PIXI_GEOMETRY.titleTop +
      GARDEN_PIXI_GEOMETRY.gridPaddingTop;
    let column = 0;
    let contentBottom = rowY + GARDEN_PIXI_GEOMETRY.rowHeight;
    this.plots.getWidgets().forEach((plot) => {
      if (plot.isAutomated) {
        if (column > 0) {
          rowY +=
            GARDEN_PIXI_GEOMETRY.rowHeight +
            GARDEN_PIXI_GEOMETRY.rowGap;
          column = 0;
        }
        plot.setBounds(
          GARDEN_PIXI_GEOMETRY.gridPaddingX,
          rowY,
          contentWidth - GARDEN_PIXI_GEOMETRY.gridPaddingX * 2,
        );
        contentBottom = rowY + plot.getLayoutHeight();
        rowY = contentBottom + GARDEN_PIXI_GEOMETRY.rowGap;
        return;
      }
      plot.setBounds(
        GARDEN_PIXI_GEOMETRY.gridPaddingX +
          column * (cellWidth + GARDEN_PIXI_GEOMETRY.columnGap),
        rowY,
        cellWidth,
      );
      contentBottom = rowY + GARDEN_PIXI_GEOMETRY.rowHeight;
      column += 1;
      if (column >= GARDEN_PIXI_GEOMETRY.columns) {
        column = 0;
        rowY = contentBottom + GARDEN_PIXI_GEOMETRY.rowGap;
      }
    });
    this.syncPlotContentHeight(contentBottom);
  }

  destroyPage() {
    this.ticker?.remove?.(this.tickHandler);
    this.fireflies?.destroy();
    this.plots?.destroy();
    this.plotPool?.destroy();
    this.plotScroll?.destroy();
    this.actionBar?.destroy();
    this.plotTooltip?.destroy();
  }
}

/**
 * Garden-local seed picker that combines its action and current selection.
 * It keeps the shared button input/skin contract while adding seed-pack art and
 * one compact stock line below the stable Seeds label.
 */
export class GardenSeedPickerButton extends PixiTextButton {
  constructor(options = {}) {
    super({
      ...options,
      text: "Seeds",
      variant: options.variant ?? "yellow",
      label: options.label ?? "garden-open-seeds",
    });
    this.selectedSeed = null;
    this.seedPack = new Sprite(Texture.EMPTY);
    this.seedPack.anchor.set(0.5);
    this.seedPack.label = `${this.label}:seed-pack`;
    this.seedItem = new Sprite(Texture.EMPTY);
    this.seedItem.anchor.set(0.5);
    this.seedItem.label = `${this.label}:seed-item`;
    this.selectionLabel = new PixiTextLabel({
      text: "",
      fontSize: 11,
      anchor: { x: 0.5, y: 0.5 },
      color: "#ffffff",
      stroke: "outline",
      label: `${this.label}:selection`,
    });
    this.visual.addChild(this.seedPack, this.seedItem, this.selectionLabel);
    this.applyTheme(this.theme);
    this.syncSeedContent();
  }

  setSeed(seed) {
    this.selectedSeed = seed ?? null;
    if (this.selectedSeed) {
      bindPixiSeedPackIcon({
        assetManager: this.assetManager,
        base: this.seedPack,
        item: this.seedItem,
        seed: this.selectedSeed,
      });
    } else {
      this.seedPack.texture = Texture.EMPTY;
      this.seedItem.texture = Texture.EMPTY;
    }
    this.syncSeedContent();
    return this;
  }

  syncContentAppearance(visualGeometry) {
    super.syncContentAppearance(visualGeometry);
    if (!this.selectionLabel) {
      return;
    }
    this.selectionLabel
      .setFontFamily('"Lilita One", "Arial Black", Arial, sans-serif')
      .setFontSize(11)
      .setStroke("outline")
      .setColor(visualGeometry?.textColor ?? "#ffffff");
    this.syncSeedContent(visualGeometry);
  }

  layoutContent() {
    if (!this.selectionLabel) {
      super.layoutContent();
      return;
    }
    this.syncSeedContent(this.activeSkin);
  }

  applyTheme(theme) {
    super.applyTheme(theme);
    this.selectionLabel?.applyTheme(this.theme);
    this.syncSeedContent(this.activeSkin);
  }

  syncSeedContent(visualGeometry = this.activeSkin) {
    if (!this.textLabel || !this.selectionLabel) {
      return;
    }
    const selectedSeed = this.selectedSeed;
    const contentOffsetY = visualGeometry?.contentOffsetY ?? 0;
    this.setText("Seeds");
    this.seedPack.visible = Boolean(selectedSeed);
    this.seedItem.visible = Boolean(selectedSeed);
    this.selectionLabel.visible = Boolean(selectedSeed);
    if (!selectedSeed) {
      this.textLabel.position.set(
        this.buttonWidth / 2,
        this.buttonHeight / 2 + contentOffsetY,
      );
      return;
    }

    const iconSize = GARDEN_PIXI_GEOMETRY.seedButtonIconSize;
    const contentGap = GARDEN_PIXI_GEOMETRY.seedButtonContentGap;
    const contentPadding = GARDEN_PIXI_GEOMETRY.seedButtonContentPadding;
    const maxTextWidth = Math.max(
      0,
      this.buttonWidth - contentPadding * 2 - iconSize - contentGap,
    );
    const seedLabel = String(selectedSeed.label ?? "Seed").trim() || "Seed";
    const quantity = Math.max(0, Number(selectedSeed.quantity) || 0);
    setFittedSeedSummary(
      this.selectionLabel,
      seedLabel,
      quantity,
      maxTextWidth,
    );

    const textWidth = Math.max(
      this.textLabel.measuredWidth,
      this.selectionLabel.measuredWidth,
    );
    const groupWidth = iconSize + contentGap + textWidth;
    const groupLeft = (this.buttonWidth - groupWidth) / 2;
    const textCenterX = groupLeft + iconSize + contentGap + textWidth / 2;
    const centerY = this.buttonHeight / 2 + contentOffsetY;
    layoutPixiSeedPackIcon({
      base: this.seedPack,
      item: this.seedItem,
      x: groupLeft + iconSize / 2,
      y: centerY,
      width: iconSize,
      height: iconSize,
    });
    this.textLabel.position.set(textCenterX, centerY - 6);
    this.selectionLabel.position.set(textCenterX, centerY + 7);
  }
}

function setFittedSeedSummary(label, seedName, quantity, maxWidth) {
  const suffix = ` · ${quantity}`;
  const fullName = String(seedName ?? "Seed");
  label.setText(`${fullName}${suffix}`);
  if (label.measuredWidth <= maxWidth) {
    return;
  }
  const characters = Array.from(fullName);
  while (characters.length > 1 && label.measuredWidth > maxWidth) {
    characters.pop();
    label.setText(`${characters.join("")}…${suffix}`);
  }
}

function fitTextLabelToWidth(label, maxWidth, preferredFontSize, minFontSize) {
  label.setFontSize(preferredFontSize);
  for (
    let fontSize = preferredFontSize;
    label.measuredWidth > maxWidth && fontSize > minFontSize;
    fontSize -= 1
  ) {
    label.setFontSize(fontSize - 1);
  }
  if (label.measuredWidth <= maxWidth) {
    return;
  }
  const characters = Array.from(label.text);
  while (characters.length > 1 && label.measuredWidth > maxWidth) {
    characters.pop();
    label.setText(`${characters.join("")}…`);
  }
}

/**
 * Garden-local action composition that keeps seed choice separate from plots.
 * It reuses shared Root Run buttons and the combined seed-picker control.
 */
export class GardenSeedActionBar {
  constructor({
    assetManager = null,
    inputRouter = null,
    semanticTargets = null,
  } = {}) {
    this.assetManager = assetManager;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.root = new Container({ label: "garden-seed-action-bar" });
    this.plantButton = new PixiTextButton({
      assetManager,
      inputRouter,
      semanticRegistry: semanticTargets,
      semanticId: "garden.plantAll",
      text: "Plant All",
      variant: "green",
      label: "garden-plant-all",
    });
    this.harvestButton = new PixiTextButton({
      assetManager,
      inputRouter,
      semanticRegistry: semanticTargets,
      semanticId: "garden.harvestAll",
      text: "Harvest All",
      variant: "green",
      label: "garden-harvest-all",
    });
    this.seedsButton = new GardenSeedPickerButton({
      assetManager,
      inputRouter,
      semanticRegistry: semanticTargets,
      semanticId: "garden.openSeeds",
      fallbackHitTest: true,
      label: "garden-open-seeds",
    });
    this.root.addChild(
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
        return actions.plantAll?.() ?? false;
      });
    this.harvestButton.visible = canHarvestAll;
    this.harvestButton.renderable = canHarvestAll;
    this.harvestButton
      .setText("Harvest All")
      .setEnabled(canHarvestAll)
      .setNotification(Number(model.readyHarvestCount) > 0)
      .setAction(() => actions.harvestAll?.() ?? false);
    this.seedsButton
      .setSeed(selectedSeed)
      .setEnabled(model.hasSeedChoices !== false)
      .setAction(() => actions.openSeedPicker?.() ?? false);
    this.layout();
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

  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.plantButton.applyTheme(this.theme);
    this.harvestButton.applyTheme(this.theme);
    this.seedsButton.applyTheme(this.theme);
  }

  destroy() {
    this.plantButton.destroy({ children: true });
    this.harvestButton.destroy({ children: true });
    this.seedsButton.destroy({ children: true });
    this.root.destroy({ children: true });
  }
}

export class GardenPlotTooltip extends PixiTooltip {
  constructor(options = {}) {
    super({ label: 'garden-plot-tooltip', ...options });
  }
}

export class GardenPlotWidget {
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
    this.pressedPlantIndex = 0;
    this.receiveStartedAt = null;
    this.receiveOffsetY = 0;
    this.receiveScaleX = 1;
    this.receiveScaleY = 1;
    this.tapFeedbackStartedAt = null;
    this.tapFeedbackLockUntil = 0;
    this.tapFeedbackLabelUntil = 0;
    this.tapFeedbackPlantIndex = 0;
    this.tapOffsetY = 0;
    this.tapScaleX = 1;
    this.tapScaleY = 1;
    this.tapRotation = 0;
    this.semanticIds = [];
    this.isAutomated = false;
    this.automatedRowWidth = GARDEN_PIXI_GEOMETRY.plotWidth;
    this.visualPlotWidth = GARDEN_PIXI_GEOMETRY.plotWidth;
    this.visiblePlantCount = 1;
    this.frameX = 0;
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
    this.tapPlantMotion = new Container({
      label: `garden-plot-${instanceId}-tap-plant-motion`,
    });
    this.plantSlots = Array.from(
      { length: GARDEN_PIXI_GEOMETRY.automatedPlantSlots },
      (_value, index) => {
        const motion = new Container({
          label: `garden-plot-${instanceId}-plant-motion-${index + 1}`,
        });
        const tapMotion = new Container({
          label: `garden-plot-${instanceId}-plant-tap-motion-${index + 1}`,
        });
        const revealMotion = new Container({
          label: `garden-plot-${instanceId}-plant-reveal-motion-${index + 1}`,
        });
        const plant = new Sprite(Texture.EMPTY);
        plant.label = `garden-plot-${instanceId}-plant-${index + 1}`;
        plant.anchor.set(0.5, 1);
        revealMotion.addChild(plant);
        tapMotion.addChild(revealMotion);
        motion.addChild(tapMotion);
        this.tapPlantMotion.addChild(motion);
        return { motion, tapMotion, revealMotion, plant };
      },
    );
    this.plantMotion = this.plantSlots[0].motion;
    this.plant = this.plantSlots[0].plant;
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
    this.tapBurst = new Graphics({
      label: `garden-plot-${instanceId}-tap-burst`,
    });
    this.receiveBurst = new Graphics({
      label: `garden-plot-${instanceId}-receive-burst`,
    });
    this.tapFeedback = createText("-1s", {
      ...RETAINED_TEXT_STYLES.bold,
      fontSize: 13,
      lineHeight: 15,
      fill: "#fff0a6",
      align: "center",
    });
    this.tapFeedback.anchor.set(0.5);
    this.tapFeedback.visible = false;
    this.tapFeedback.renderable = false;
    this.seedButton = new PixiTextButton({
      assetManager,
      inputRouter,
      semanticRegistry: semanticTargets,
      semanticId: `garden.plot.instance.${instanceId}.seed`,
      text: "",
      variant: "yellow",
      label: `garden-plot-${instanceId}-seed-button`,
    });
    this.seedPack = new Sprite(Texture.EMPTY);
    this.seedPack.anchor.set(0.5);
    this.seedItem = new Sprite(Texture.EMPTY);
    this.seedItem.anchor.set(0.5);
    this.seedButton.visual.addChild(this.seedPack, this.seedItem);
    this.autoButton = new PixiTextButton({
      assetManager,
      inputRouter,
      semanticRegistry: semanticTargets,
      semanticId: `garden.plot.instance.${instanceId}.auto`,
      text: "Auto",
      variant: "yellow",
      label: `garden-plot-${instanceId}-auto-button`,
    });
    this.autoGear = new Sprite(
      getTexture(assetManager, PIXI_ROOT_RUN_ASSETS.settingsGear),
    );
    this.autoGear.anchor.set(0.5);
    this.autoGearMotion = new AutoGearMotion({
      setRotation: (rotation) => {
        this.autoGear.rotation = rotation;
      },
    });
    this.autoButton.visual.addChildAt(
      this.autoGear,
      this.autoButton.visual.getChildIndex(this.autoButton.textLabel),
    );
    this.quantityButton = new PixiTextButton({
      assetManager,
      inputRouter,
      semanticRegistry: semanticTargets,
      semanticId: `garden.plot.instance.${instanceId}.quantity`,
      text: "x1",
      variant: "yellow",
      label: `garden-plot-${instanceId}-quantity-button`,
    });
    this.frame.addChild(
      this.soil,
      this.buyFrame,
      this.number,
      this.level,
      this.receiveBurst,
      this.tapPlantMotion,
      this.action,
      this.buyCostButton,
      this.scissorsMotion,
      this.tapBurst,
      this.tapFeedback,
    );
    this.root.addChild(
      this.frame,
      this.progress.root,
      this.notification,
      this.seedButton,
      this.autoButton,
      this.quantityButton,
    );
    this.pressRegistration =
      this.inputRouter?.registerPressTarget?.({
        id: `garden.plot.instance.${instanceId}`,
        displayObject: this.root,
        fallbackHitTest: true,
        enabled: () =>
          this.enabled && !this.isActivationLocked(this.page.timeSource()),
        slop: 12,
        sound: false,
        onPressChange: (pressed, context) => this.setPressed(pressed, context),
        onActivate: (context) => this.activate(context),
      }) ?? null;
  }

  bind(model, actions) {
    this.unregisterSemanticTargets();
    this.model = model ?? {};
    this.progress.control.setTone(
      this.model.phase === "harvesting" ? "yellow" : "green",
    );
    const process = this.model.process ?? this.model.progress;
    if (process && typeof process === "object") {
      const snapshotProgress = getTimedProgressSnapshotProgress(process);
      if (
        Number.isFinite(this.timerSnapshotProgress) &&
        snapshotProgress + Number.EPSILON < this.timerSnapshotProgress
      ) {
        this.progress.clearTimer(0);
      }
      this.timerSnapshotProgress = snapshotProgress;
      this.progress.setTimer(
        createTimedProgressWindow(process, this.page.timeSource()),
      );
    } else {
      this.timerSnapshotProgress = Number.NaN;
      this.progress.clearTimer(typeof process === "number" ? process : 0);
    }
    this.actions = actions ?? {};
    const tileNumber =
      this.model.tileNumber ?? this.model.number ?? this.model.id;
    const visible = this.model.hidden !== true && this.model.visible !== false;
    this.isAutomated =
      this.model.automationAvailable === true &&
      this.model.buySlot !== true &&
      this.model.isBuySlot !== true;
    this.automatedRowWidth = GARDEN_PIXI_GEOMETRY.plotWidth;
    this.visualPlotWidth = GARDEN_PIXI_GEOMETRY.plotWidth;
    this.enabled =
      visible &&
      this.model.disabled !== true &&
      this.model.action?.enabled !== false;
    this.root.visible = visible;
    this.root.renderable = visible;
    this.root.eventMode = this.enabled ? "static" : "none";
    setText(
      this.number,
      this.model.showNumber === false
        ? ""
        : this.model.displayNumber ?? tileNumber,
    );
    const plotLevel = Math.max(1, Math.floor(Number(this.model.level) || 1));
    this.level.setLevel(plotLevel - 1);
    setText(this.action, resolveActionText(this.model));
    this.syncBuyCostButton();
    this.soil.texture = getTexture(
      this.assetManager,
      this.isAutomated ? AUTOMATED_SOIL_ASSET_ID : SOIL_ASSET_ID,
    );
    const herbFrame =
      this.model.plantFrame ??
      getHerbIconFrameName(this.model.herbKey ?? this.model.plant?.key ?? "");
    this.visiblePlantCount = this.isAutomated
      ? Math.min(
          GARDEN_PIXI_GEOMETRY.automatedPlantSlots,
          Math.max(
            1,
            Math.floor(
              Number(
                this.model.phase === "empty"
                  ? this.model.plantQuantity
                  : this.model.harvestQuantity,
              ) || 1,
            ),
          ),
        )
      : 1;
    this.plantSlots.forEach(({ plant }, index) => {
      plant.texture = herbFrame
        ? getAtlasTexture(this.assetManager, herbFrame)
        : Texture.EMPTY;
      plant.visible = Boolean(herbFrame) && index < this.visiblePlantCount;
      plant.renderable = plant.visible;
      plant.alpha = this.receiveStartedAt === null ? 1 : 0;
    });
    this.scissorsMotion.visible = this.model.phase === "harvesting";
    this.scissors.visible = this.scissorsMotion.visible;
    this.scissorsOpen.visible = this.scissorsMotion.visible;
    this.bindAutomationControls();
    this.syncNotificationBadges();
    this.registerSemanticTargets(tileNumber);
    this.applyTheme(this.theme);
    this.updateTime(this.page.timeSource());
  }

  bindAutomationControls() {
    const visible = this.isAutomated;
    for (const button of [
      this.seedButton,
      this.autoButton,
      this.quantityButton,
    ]) {
      button.visible = visible;
      button.renderable = visible;
    }
    if (!visible) {
      this.autoGearMotion.setEnabled(false);
      return;
    }

    bindPixiSeedPackIcon({
      assetManager: this.assetManager,
      base: this.seedPack,
      item: this.seedItem,
      seed: this.model.automationSeed,
    });
    this.seedButton
      .setText(this.model.automationSeed?.label ?? "Select Seed")
      .setEnabled(true)
      .setAction(() => this.actions.openPlotSeedPicker?.(this.model) ?? false);

    const autoEnabled = this.model.autoEnabled !== false;
    this.autoGearMotion.setEnabled(autoEnabled);
    this.autoButton.setVariant(autoEnabled ? "green" : "yellow");
    this.autoButton
      .setText("Auto")
      .setEnabled(true)
      .setAction(
        () => this.actions.togglePlotAutomation?.(this.model) ?? false,
      );

    const maxQuantity = Math.min(
      GARDEN_PIXI_GEOMETRY.automatedPlantSlots,
      Math.max(1, Math.floor(Number(this.model.maxPlantQuantity) || 1)),
    );
    const quantity = Math.min(
      maxQuantity,
      Math.max(1, Math.floor(Number(this.model.plantQuantity) || maxQuantity)),
    );
    const nextQuantity = quantity >= maxQuantity ? 1 : quantity + 1;
    this.quantityButton
      .setText(`x${quantity}`)
      .setEnabled(true)
      .setAction(
        () =>
          this.actions.selectPlotQuantity?.(this.model, nextQuantity) ?? false,
      );
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
        enabled:
          this.enabled && !this.isActivationLocked(this.page.timeSource()),
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
        interactive:
          this.enabled && !this.isActivationLocked(this.page.timeSource()),
        enabled:
          this.enabled && !this.isActivationLocked(this.page.timeSource()),
        active: !this.root.destroyed,
      }),
      activate: () =>
        this.model.onLabelActivate?.(this.model) ??
        this.actions.activatePlotLabel?.(this.model) ??
        this.activate(),
    });
    this.semanticIds.push(labelSemanticId);
    this.plantSlots.forEach(({ plant }, index) => {
      const plantSemanticId = `${semanticId}.plant.${index + 1}`;
      this.semanticTargets?.register?.({
        semanticId: plantSemanticId,
        displayObject: plant,
        bounds: () => this.resolvePlantSlotBounds(index),
        state: () => ({
          visible: this.root.visible && this.root.renderable,
          interactive: false,
          enabled: false,
          active: !this.root.destroyed,
        }),
      });
      this.semanticIds.push(plantSemanticId);
    });
  }

  resolvePlantSlotBounds(index) {
    const plant = this.plantSlots[index]?.plant ?? this.plant;
    const localBounds = plant.getLocalBounds();
    const corners = [
      { x: localBounds.x, y: localBounds.y },
      { x: localBounds.x + localBounds.width, y: localBounds.y },
      { x: localBounds.x, y: localBounds.y + localBounds.height },
      {
        x: localBounds.x + localBounds.width,
        y: localBounds.y + localBounds.height,
      },
    ].map((point) => plant.toGlobal(point));
    const xs = corners.map(({ x }) => x);
    const ys = corners.map(({ y }) => y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return {
      x,
      y,
      width: Math.max(...xs) - x,
      height: Math.max(...ys) - y,
    };
  }

  activate(context = null) {
    const now = this.page.timeSource();
    if (this.isActivationLocked(now)) {
      return {
        ok: false,
        reason: "tap_cooldown",
        retryAfterMs: Math.max(0, this.tapFeedbackLockUntil - now),
      };
    }
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
    }
    if (plotAccelerationSucceeded(result)) {
      this.startTapAcceleration(
        result,
        now,
        this.resolveTapFeedbackPlantIndex(context),
      );
    }
    return result;
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    this.width = width;
    this.automatedRowWidth = this.isAutomated
      ? resolveAutomatedPlotWidth(width)
      : GARDEN_PIXI_GEOMETRY.plotWidth;
    const automatedControlsWidth =
      GARDEN_PIXI_GEOMETRY.automatedControlWidth * 2 +
      GARDEN_PIXI_GEOMETRY.automatedControlGap;
    this.visualPlotWidth = this.isAutomated
      ? Math.max(
          GARDEN_PIXI_GEOMETRY.plotWidth,
          this.automatedRowWidth -
            automatedControlsWidth -
            GARDEN_PIXI_GEOMETRY.automatedControlGap,
        )
      : GARDEN_PIXI_GEOMETRY.plotWidth;
    this.frameX = Math.max(0, (width - this.automatedRowWidth) / 2);
    this.root.hitArea = new Rectangle(0, 0, width, this.getLayoutHeight());
    this.frame.hitArea = new Rectangle(
      0,
      0,
      this.visualPlotWidth,
      GARDEN_PIXI_GEOMETRY.plotHeight,
    );
    this.soil.width = this.visualPlotWidth;
    this.soil.height = GARDEN_PIXI_GEOMETRY.plotHeight;
    this.buyFrame.position.set(0, 0);
    this.number.position.set(10, 6);
    this.level.position.set(5, GARDEN_PIXI_GEOMETRY.plotHeight - 19);
    const tileNumber = Math.max(
      1,
      Math.floor(Number(this.model.tileNumber ?? this.model.number) || 1),
    );
    this.plantSlots.forEach(({ motion, plant }, index) => {
      const position = resolvePlantSlotPosition({
        automated: this.isAutomated,
        visualPlotWidth: this.visualPlotWidth,
        tileNumber,
        index,
        visibleCount: this.visiblePlantCount,
      });
      motion.position.set(position.x, position.y);
      plant.position.set(0, 0);
      plant.width = this.isAutomated ? 48 : 57.2;
      plant.height = this.isAutomated ? 52.4 : 62.4;
    });
    this.action.position.set(
      this.visualPlotWidth - 5,
      GARDEN_PIXI_GEOMETRY.plotHeight - 3,
    );
    this.buyCostButton.setBounds(
      (this.visualPlotWidth - GARDEN_PIXI_GEOMETRY.buyButtonWidth) / 2,
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
    this.tapFeedback.position.set(
      this.visualPlotWidth / 2,
      GARDEN_PIXI_GEOMETRY.plotHeight / 2,
    );
    this.notificationBadge.placeAtTopRight({
      x: this.frameX,
      y: 0,
      width: this.visualPlotWidth,
      height: GARDEN_PIXI_GEOMETRY.plotHeight,
    });
    if (!this.isAutomated) {
      this.progress.setBounds(
        this.frameX +
          (this.visualPlotWidth - GARDEN_PIXI_GEOMETRY.progressWidth) / 2,
        GARDEN_PIXI_GEOMETRY.plotHeight + 3,
        GARDEN_PIXI_GEOMETRY.progressWidth,
        GARDEN_PIXI_GEOMETRY.progressHeight,
      );
    }
    this.layoutAutomationControls();
    this.setPressed(this.pressed);
    this.redraw();
  }

  layoutAutomationControls() {
    if (!this.isAutomated) {
      return;
    }
    const controlWidth = GARDEN_PIXI_GEOMETRY.automatedControlWidth;
    const buttonHeight = GARDEN_PIXI_GEOMETRY.automatedControlHeight;
    const gap = GARDEN_PIXI_GEOMETRY.automatedControlGap;
    const controlsWidth = controlWidth * 2 + gap;
    const controlsHeight = buttonHeight * 2 + gap;
    const controlsX = this.frameX + this.visualPlotWidth + gap;
    const controlsY = (GARDEN_PIXI_GEOMETRY.plotHeight - controlsHeight) / 2;
    this.progress.setBounds(
      this.frameX,
      GARDEN_PIXI_GEOMETRY.plotHeight + 3,
      this.visualPlotWidth,
      GARDEN_PIXI_GEOMETRY.progressHeight,
    );
    this.seedButton.setSize(controlsWidth, buttonHeight);
    this.seedButton.position.set(controlsX, controlsY);
    const lowerControlsY = controlsY + buttonHeight + gap;
    this.autoButton.setSize(controlWidth, buttonHeight);
    this.autoButton.position.set(controlsX, lowerControlsY);
    this.quantityButton.setSize(controlWidth, buttonHeight);
    this.quantityButton.position.set(
      controlsX + controlWidth + gap,
      lowerControlsY,
    );
    const hitInset =
      (controlWidth - GARDEN_PIXI_GEOMETRY.automatedControlHitSize) / 2;
    for (const button of [this.autoButton, this.quantityButton]) {
      button.hitArea = new Rectangle(
        hitInset,
        (buttonHeight - GARDEN_PIXI_GEOMETRY.automatedControlHitSize) / 2,
        GARDEN_PIXI_GEOMETRY.automatedControlHitSize,
        GARDEN_PIXI_GEOMETRY.automatedControlHitSize,
      );
    }
    layoutPixiSeedPackIcon({
      base: this.seedPack,
      item: this.seedItem,
      x: controlsWidth / 2,
      y: GARDEN_PIXI_GEOMETRY.automatedSeedIconY,
      width: GARDEN_PIXI_GEOMETRY.automatedSeedIconSize,
      height: GARDEN_PIXI_GEOMETRY.automatedSeedIconSize,
    });
    this.seedButton.textLabel
      .setFontSize(GARDEN_PIXI_GEOMETRY.automatedSeedLabelFontSize)
      .setLineHeight(GARDEN_PIXI_GEOMETRY.automatedSeedLabelFontSize + 2);
    fitTextLabelToWidth(
      this.seedButton.textLabel,
      controlsWidth - 8,
      GARDEN_PIXI_GEOMETRY.automatedSeedLabelFontSize,
      7,
    );
    this.seedButton.textLabel.position.set(
      controlsWidth / 2,
      this.model.automationSeed
        ? GARDEN_PIXI_GEOMETRY.automatedSeedLabelY
        : buttonHeight / 2 + (this.seedButton.activeSkin?.contentOffsetY ?? 0),
    );
    this.autoGear.position.set(controlWidth / 2, buttonHeight / 2);
    this.autoGear.height = GARDEN_PIXI_GEOMETRY.automatedAutoIconHeight;
    this.autoGear.width =
      GARDEN_PIXI_GEOMETRY.automatedAutoIconHeight *
      PIXI_ROOT_RUN_GEOMETRY.settings.gearAspectRatio;
    this.autoButton.textLabel.setFontSize(10).setLineHeight(12);
    this.autoButton.textLabel.position.set(
      controlWidth / 2,
      GARDEN_PIXI_GEOMETRY.automatedAutoLabelY,
    );
    this.quantityButton.textLabel.setFontSize(13).setLineHeight(15);
    this.quantityButton.textLabel.position.set(
      controlWidth / 2,
      buttonHeight / 2 + (this.quantityButton.activeSkin?.contentOffsetY ?? 0),
    );
  }

  getLayoutHeight() {
    return this.isAutomated
      ? GARDEN_PIXI_GEOMETRY.plotHeight +
          3 +
          GARDEN_PIXI_GEOMETRY.progressHeight
      : GARDEN_PIXI_GEOMETRY.rowHeight;
  }

  setPressed(pressed, context = null) {
    this.pressed = Boolean(pressed);
    if (this.isAutomated) {
      if (this.pressed) {
        this.pressedPlantIndex = this.resolveTapFeedbackPlantIndex(context);
      }
      this.plantSlots.forEach(({ tapMotion }, index) => {
        const selected = this.pressed && index === this.pressedPlantIndex;
        tapMotion.position.set(0, selected ? 1 : 0);
        tapMotion.scale.set(selected ? 0.94 : 1);
        tapMotion.rotation = 0;
      });
    }
    this.applyFrameTransform();
  }

  applyFrameTransform() {
    const pressScale = this.pressed && !this.isAutomated ? 0.97 : 1;
    this.frame.scale.set(
      pressScale * this.receiveScaleX * this.tapScaleX,
      pressScale * this.receiveScaleY * this.tapScaleY,
    );
    this.frame.rotation = this.tapRotation;
    this.frame.pivot.set(
      this.visualPlotWidth / 2,
      GARDEN_PIXI_GEOMETRY.plotHeight / 2,
    );
    this.frame.position.set(
      this.frameX + this.visualPlotWidth / 2,
      GARDEN_PIXI_GEOMETRY.plotHeight / 2 +
        (this.pressed && !this.isAutomated ? 1 : 0) +
        this.receiveOffsetY +
        this.tapOffsetY,
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
    this.plantSlots.forEach(({ motion }, index) => {
      const position = resolvePlantSlotPosition({
        automated: this.isAutomated,
        visualPlotWidth: this.visualPlotWidth,
        tileNumber,
        index,
        visibleCount: this.visiblePlantCount,
      });
      motion.position.set(position.x, position.y);
      motion.scale.set(growthScale);
      motion.rotation = 0;

      if (phase === "growing") {
        const progress = loopProgress(
          now +
            (((tileNumber - 1) * 421 + index * 137) % GARDEN_GROWING_WIND_MS),
          GARDEN_GROWING_WIND_MS,
        );
      const sway =
        progress < 0.5
          ? lerp(-1.8, 2.1, softEase(progress / 0.5))
          : lerp(2.1, -1.8, softEase((progress - 0.5) / 0.5));
        motion.rotation = degreesToRadians(sway);
      } else if (phase === "ready" || phase === "harvesting") {
        const progress = loopProgress(
          now + (((tileNumber - 1) * 317 + index * 83) % GARDEN_READY_LIFT_MS),
          GARDEN_READY_LIFT_MS,
        );
        applyReadyPlantMotion(motion, progress, growthScale);
      }
    });

    if (phase === "harvesting") {
      const progress = loopProgress(now, GARDEN_SCISSORS_SNIP_MS);
      const open = progress >= 0.5;
      this.scissors.alpha = open ? 0 : 1;
      this.scissorsOpen.alpha = open ? 1 : 0;
      this.scissorsMotion.position.set(
        this.visualPlotWidth - 27 + 14.4 + (open ? -13 : -15),
        29 + 17.4 + (open ? -2 : 0),
      );
      this.scissorsMotion.rotation = degreesToRadians(open ? -7 : -20);
    } else {
      this.resetScissorsMotion();
    }

    this.updateSeedReceive(now);
    this.updateTapAcceleration(now);
    this.autoGearMotion.update(now, {
      active: this.page.active,
      reducedMotion: this.page.reducedMotion?.() === true,
    });
  }

  isActivationLocked(now = this.page.timeSource()) {
    return finiteOr(now, 0) < this.tapFeedbackLockUntil;
  }

  resolveTapFeedbackPlantIndex(context = null) {
    const visibleSlots = this.plantSlots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.plant.visible);
    if (visibleSlots.length <= 1) {
      return visibleSlots[0]?.index ?? 0;
    }
    if (
      Number.isFinite(context?.point?.x) &&
      Number.isFinite(context?.point?.y)
    ) {
      const localPoint = this.frame.toLocal(context.point);
      return visibleSlots.reduce((closest, candidate) =>
        Math.abs(candidate.slot.motion.x - localPoint.x) <
        Math.abs(closest.slot.motion.x - localPoint.x)
          ? candidate
          : closest,
      ).index;
    }
    return visibleSlots[Math.floor(visibleSlots.length / 2)].index;
  }

  getTapFeedbackPlantSlot() {
    return (
      this.plantSlots[this.tapFeedbackPlantIndex] ?? this.plantSlots[0]
    );
  }

  startTapAcceleration(
    result,
    now = this.page.timeSource(),
    plantIndex = 0,
  ) {
    const reducedSeconds = Math.max(0, Number(result?.reducedSeconds) || 0);
    if (reducedSeconds <= 0) {
      return false;
    }
    const cooldownMs = Math.max(
      GARDEN_PLOT_TAP_FEEDBACK_MS,
      Number(result?.cooldownMs) || 0,
    );
    const startedAt = finiteOr(now, 0);
    this.tapFeedbackPlantIndex = clamp(
      Math.floor(Number(plantIndex) || 0),
      0,
      this.plantSlots.length - 1,
    );
    this.tapFeedbackStartedAt = startedAt;
    this.tapFeedbackLockUntil = startedAt + cooldownMs;
    this.tapFeedbackLabelUntil =
      startedAt + GARDEN_PLOT_TAP_REDUCED_MOTION_LABEL_MS;
    setText(
      this.tapFeedback,
      `-${Number.isInteger(reducedSeconds) ? reducedSeconds : reducedSeconds.toFixed(1)}s`,
    );
    this.updateTapAcceleration(startedAt);
    return true;
  }

  updateTapAcceleration(now) {
    if (this.tapFeedbackStartedAt === null) {
      return false;
    }
    const currentTime = finiteOr(now, this.tapFeedbackStartedAt);
    const reducedMotion = this.page.reducedMotion?.() === true;
    if (reducedMotion) {
      const showLabel = currentTime < this.tapFeedbackLabelUntil;
      this.tapFeedback.visible = showLabel;
      this.tapFeedback.renderable = showLabel;
      this.tapFeedback.alpha = 1;
      this.tapFeedback.position.set(
        this.getTapFeedbackPlantSlot().motion.x,
        GARDEN_PIXI_GEOMETRY.plotHeight / 2 - 9,
      );
      this.tapBurst.clear();
      if (currentTime >= this.tapFeedbackLockUntil) {
        this.settleTapAcceleration();
      }
      return showLabel;
    }

    const progress = clamp(
      (currentTime - this.tapFeedbackStartedAt) /
        GARDEN_PLOT_TAP_FEEDBACK_MS,
      0,
      1,
    );
    if (progress >= 1) {
      this.settleTapAcceleration();
      return false;
    }
    applyTapAccelerationMotion(this, progress);
    this.applyFrameTransform();
    return true;
  }

  settleTapAcceleration() {
    this.tapFeedbackStartedAt = null;
    this.tapFeedbackLockUntil = 0;
    this.tapFeedbackLabelUntil = 0;
    this.tapFeedbackPlantIndex = 0;
    this.tapOffsetY = 0;
    this.tapScaleX = 1;
    this.tapScaleY = 1;
    this.tapRotation = 0;
    this.tapPlantMotion.position.set(0, 0);
    this.tapPlantMotion.scale.set(1);
    this.tapPlantMotion.rotation = 0;
    this.plantSlots.forEach(({ tapMotion }) => {
      tapMotion.position.set(0, 0);
      tapMotion.scale.set(1);
      tapMotion.rotation = 0;
    });
    this.tapFeedback.alpha = 1;
    this.tapFeedback.visible = false;
    this.tapFeedback.renderable = false;
    this.tapBurst.clear();
    this.applyFrameTransform();
  }

  startSeedReceive(now) {
    if (this.page.reducedMotion?.() === true) {
      this.settleSeedReceive();
      return false;
    }
    this.receiveStartedAt = finiteOr(now, 0);
    this.receiveOffsetY = 0;
    this.receiveScaleX = 1;
    this.receiveScaleY = 1;
    this.setPlantingRevealProgress(0);
    this.applyFrameTransform();
    return true;
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
      this.settleSeedReceive();
      return false;
    }
    applyReceiveMotion(this, progress);
    renderSeedReceiveBurst(this, progress);
    this.setPlantingRevealProgress(
      clamp(
        (progress - GARDEN_PLOT_HERB_REVEAL_START_PROGRESS) /
          (GARDEN_PLOT_HERB_REVEAL_END_PROGRESS -
            GARDEN_PLOT_HERB_REVEAL_START_PROGRESS),
        0,
        1,
      ),
    );
    this.applyFrameTransform();
    return true;
  }

  settleTransientMotion() {
    this.settleSeedReceive();
    this.settleTapAcceleration();
    this.autoGearMotion.reset();
  }

  settleSeedReceive() {
    this.receiveStartedAt = null;
    this.receiveOffsetY = 0;
    this.receiveScaleX = 1;
    this.receiveScaleY = 1;
    this.receiveBurst.clear();
    this.setPlantingRevealProgress(1);
    this.applyFrameTransform();
  }

  setPlantingRevealProgress(progress) {
    const groupProgress = clamp(Number(progress) || 0, 0, 1);
    this.plantSlots.forEach(({ revealMotion, plant }, index) => {
      const delay = index * 0.045;
      const normalized = clamp(
        (groupProgress - delay) / Math.max(0.01, 1 - delay),
        0,
        1,
      );
      const direction = index % 2 === 0 ? -1 : 1;
      let segment;
      let fromY;
      let toY;
      let fromScaleX;
      let toScaleX;
      let fromScaleY;
      let toScaleY;
      let fromRotation;
      let toRotation;
      if (normalized < 0.42) {
        segment = normalized / 0.42;
        fromY = 8;
        toY = 2;
        fromScaleX = 0.34;
        toScaleX = 0.72;
        fromScaleY = 0.06;
        toScaleY = 0.68;
        fromRotation = 6 * direction;
        toRotation = 2 * direction;
      } else if (normalized < 0.75) {
        segment = (normalized - 0.42) / 0.33;
        fromY = 2;
        toY = -1.5;
        fromScaleX = 0.72;
        toScaleX = 1.08;
        fromScaleY = 0.68;
        toScaleY = 1.05;
        fromRotation = 2 * direction;
        toRotation = -1 * direction;
      } else {
        segment = (normalized - 0.75) / 0.25;
        fromY = -1.5;
        toY = 0;
        fromScaleX = 1.08;
        toScaleX = 1;
        fromScaleY = 1.05;
        toScaleY = 1;
        fromRotation = -1 * direction;
        toRotation = 0;
      }
      const eased = softEase(segment);
      revealMotion.position.set(0, lerp(fromY, toY, eased));
      revealMotion.scale.set(
        lerp(fromScaleX, toScaleX, eased),
        lerp(fromScaleY, toScaleY, eased),
      );
      revealMotion.rotation = degreesToRadians(
        lerp(fromRotation, toRotation, eased),
      );
      plant.alpha = softEase(clamp(normalized / 0.3, 0, 1));
    });
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
    applyTextTheme(this.tapFeedback, this.theme, {
      ...RETAINED_TEXT_STYLES.bold,
      fontSize: 13,
      lineHeight: 15,
      fill: "#fff0a6",
      align: "center",
    });
    this.buyCostButton.applyTheme(this.theme);
    this.progress.applyTheme(this.theme);
    this.seedButton.applyTheme(this.theme);
    this.autoButton.applyTheme(this.theme);
    this.quantityButton.applyTheme(this.theme);
    this.layoutAutomationControls();
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
        this.visualPlotWidth / 2,
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
          this.visualPlotWidth / 2,
          GARDEN_PIXI_GEOMETRY.plotHeight / 2,
        );
      } else {
        this.action.position.set(
          this.visualPlotWidth - 5,
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
    this.isAutomated = false;
    this.autoGearMotion.setEnabled(false);
    this.automatedRowWidth = GARDEN_PIXI_GEOMETRY.plotWidth;
    this.visualPlotWidth = GARDEN_PIXI_GEOMETRY.plotWidth;
    this.visiblePlantCount = 1;
    this.frameX = 0;
    this.pressed = false;
    this.pressedPlantIndex = 0;
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
    this.tapFeedbackStartedAt = null;
    this.tapFeedbackLockUntil = 0;
    this.tapFeedbackLabelUntil = 0;
    this.tapFeedbackPlantIndex = 0;
    this.tapOffsetY = 0;
    this.tapScaleX = 1;
    this.tapScaleY = 1;
    this.tapRotation = 0;
    this.width = 0;
    setText(this.number, "");
    this.level.setLevel(0);
    setText(this.action, "");
    this.buyCostButton.reset();
    this.progress.setProgress(0);
    this.progress.root.visible = false;
    this.plantSlots.forEach(({ motion, tapMotion, revealMotion, plant }) => {
      motion.position.set(0, 0);
      motion.scale.set(1);
      motion.rotation = 0;
      tapMotion.position.set(0, 0);
      tapMotion.scale.set(1);
      tapMotion.rotation = 0;
      revealMotion.scale.set(1);
      revealMotion.position.set(0, 0);
      revealMotion.rotation = 0;
      plant.visible = false;
      plant.renderable = false;
      plant.alpha = 1;
    });
    this.tapPlantMotion.position.set(0, 0);
    this.tapPlantMotion.scale.set(1);
    this.tapPlantMotion.rotation = 0;
    for (const button of [
      this.seedButton,
      this.autoButton,
      this.quantityButton,
    ]) {
      button.visible = false;
      button.renderable = false;
      button.setEnabled(false);
    }
    this.scissors.visible = false;
    this.scissorsOpen.visible = false;
    this.scissorsMotion.visible = false;
    this.resetScissorsMotion();
    this.notificationBadge.setActive(false);
    this.tapFeedback.visible = false;
    this.tapFeedback.renderable = false;
    this.tapBurst.clear();
    this.receiveBurst.clear();
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
    this.autoGearMotion.reset();
    this.progress.destroy();
    this.seedButton.destroy({ children: true });
    this.autoButton.destroy({ children: true });
    this.quantityButton.destroy({ children: true });
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
  if (progress <= GARDEN_PLOT_RECEIVE_IMPACT_PROGRESS) {
    plot.receiveOffsetY = 0;
    plot.receiveScaleX = 1;
    plot.receiveScaleY = 1;
    return;
  }
  const impactProgress = clamp(
    (progress - GARDEN_PLOT_RECEIVE_IMPACT_PROGRESS) /
      (1 - GARDEN_PLOT_RECEIVE_IMPACT_PROGRESS),
    0,
    1,
  );
  let segment;
  let fromY;
  let toY;
  let fromScaleX;
  let toScaleX;
  let fromScaleY;
  let toScaleY;
  if (impactProgress < 0.24) {
    segment = impactProgress / 0.24;
    fromY = 0;
    toY = 2.2;
    fromScaleX = 1;
    toScaleX = 1.075;
    fromScaleY = 1;
    toScaleY = 0.9;
  } else if (impactProgress < 0.54) {
    segment = (impactProgress - 0.24) / 0.3;
    fromY = 2.2;
    toY = -1.2;
    fromScaleX = 1.075;
    toScaleX = 0.985;
    fromScaleY = 0.9;
    toScaleY = 1.035;
  } else {
    segment = (impactProgress - 0.54) / 0.46;
    fromY = -1.2;
    toY = 0;
    fromScaleX = 0.985;
    toScaleX = 1;
    fromScaleY = 1.035;
    toScaleY = 1;
  }
  const eased = softEase(segment);
  plot.receiveOffsetY = lerp(fromY, toY, eased);
  plot.receiveScaleX = lerp(fromScaleX, toScaleX, eased);
  plot.receiveScaleY = lerp(fromScaleY, toScaleY, eased);
}

function renderSeedReceiveBurst(plot, progress) {
  plot.receiveBurst.clear();
  const burstProgress = clamp(
    (progress - GARDEN_PLOT_RECEIVE_IMPACT_PROGRESS) / 0.38,
    0,
    1,
  );
  if (burstProgress <= 0 || burstProgress >= 1) {
    return;
  }

  const eased = softEase(burstProgress);
  const alpha = 1 - burstProgress;
  const centerX = plot.frameX + plot.visualPlotWidth / 2;
  const centerY = GARDEN_PIXI_GEOMETRY.plotHeight / 2 + 5;
  plot.receiveBurst
    .ellipse(
      centerX,
      centerY,
      lerp(4, Math.min(28, plot.visualPlotWidth * 0.32), eased),
      lerp(1.2, 4, eased),
    )
    .stroke({
      color: 0xd69a5b,
      width: lerp(2.2, 0.8, burstProgress),
      alpha: alpha * 0.72,
    });

  const clodCount = plot.isAutomated ? 7 : 5;
  for (let index = 0; index < clodCount; index += 1) {
    const spread = clodCount === 1 ? 0 : index / (clodCount - 1) - 0.5;
    const direction = spread < 0 ? -1 : 1;
    const distance = lerp(3, 15 + Math.abs(spread) * 14, eased);
    const lift = Math.sin(Math.PI * burstProgress) *
      (5 + (index % 3) * 1.5);
    const radius = lerp(1.9 - (index % 2) * 0.3, 0.45, burstProgress);
    plot.receiveBurst
      .circle(
        centerX + direction * distance * (0.35 + Math.abs(spread)),
        centerY - lift + Math.abs(spread) * 2,
        radius,
      )
      .fill({
        color: index % 2 === 0 ? 0x7b4828 : 0xb96f36,
        alpha: alpha * 0.9,
      });
  }
}

function getGardenPlotKey(plot, index) {
  return plot?.id ?? plot?.tileNumber ?? `plot-${index + 1}`;
}

function isGardenPlantingTransition(previous, next) {
  if (!previous || next?.phase !== "growing") {
    return false;
  }
  return (
    previous.phase !== "growing" ||
    previous.seedItemTypeId !== (next?.seedItemTypeId ?? null) ||
    previous.seedKey !== (next?.seedKey ?? null)
  );
}

function applyTapAccelerationMotion(plot, progress) {
  let segment;
  let fromY;
  let toY;
  let fromScaleX;
  let toScaleX;
  let fromScaleY;
  let toScaleY;
  let fromRotation;
  let toRotation;
  let fromPlantY;
  let toPlantY;
  let fromPlantScaleX;
  let toPlantScaleX;
  let fromPlantScaleY;
  let toPlantScaleY;
  let fromPlantRotation;
  let toPlantRotation;

  if (progress < 0.18) {
    segment = progress / 0.18;
    fromY = 0;
    toY = 2.5;
    fromScaleX = 1;
    toScaleX = 1.035;
    fromScaleY = 1;
    toScaleY = 0.955;
    fromRotation = 0;
    toRotation = -0.8;
    fromPlantY = 0;
    toPlantY = 3;
    fromPlantScaleX = 1;
    toPlantScaleX = 1.08;
    fromPlantScaleY = 1;
    toPlantScaleY = 0.86;
    fromPlantRotation = 0;
    toPlantRotation = -3;
  } else if (progress < 0.42) {
    segment = (progress - 0.18) / 0.24;
    fromY = 2.5;
    toY = -1.5;
    fromScaleX = 1.035;
    toScaleX = 0.985;
    fromScaleY = 0.955;
    toScaleY = 1.025;
    fromRotation = -0.8;
    toRotation = 0.55;
    fromPlantY = 3;
    toPlantY = -7;
    fromPlantScaleX = 1.08;
    toPlantScaleX = 0.92;
    fromPlantScaleY = 0.86;
    toPlantScaleY = 1.1;
    fromPlantRotation = -3;
    toPlantRotation = 4;
  } else if (progress < 0.7) {
    segment = (progress - 0.42) / 0.28;
    fromY = -1.5;
    toY = 0.5;
    fromScaleX = 0.985;
    toScaleX = 1.012;
    fromScaleY = 1.025;
    toScaleY = 0.992;
    fromRotation = 0.55;
    toRotation = -0.2;
    fromPlantY = -7;
    toPlantY = -1.5;
    fromPlantScaleX = 0.92;
    toPlantScaleX = 1.025;
    fromPlantScaleY = 1.1;
    toPlantScaleY = 0.98;
    fromPlantRotation = 4;
    toPlantRotation = -1;
  } else {
    segment = (progress - 0.7) / 0.3;
    fromY = 0.5;
    toY = 0;
    fromScaleX = 1.012;
    toScaleX = 1;
    fromScaleY = 0.992;
    toScaleY = 1;
    fromRotation = -0.2;
    toRotation = 0;
    fromPlantY = -1.5;
    toPlantY = 0;
    fromPlantScaleX = 1.025;
    toPlantScaleX = 1;
    fromPlantScaleY = 0.98;
    toPlantScaleY = 1;
    fromPlantRotation = -1;
    toPlantRotation = 0;
  }

  const eased = softEase(segment);
  const plantOffsetY = lerp(fromPlantY, toPlantY, eased);
  const plantScaleX = lerp(fromPlantScaleX, toPlantScaleX, eased);
  const plantScaleY = lerp(fromPlantScaleY, toPlantScaleY, eased);
  const plantRotation = degreesToRadians(
    lerp(fromPlantRotation, toPlantRotation, eased),
  );
  const tappedSlot = plot.getTapFeedbackPlantSlot();
  const feedbackCenterX = tappedSlot.motion.x;
  if (plot.isAutomated) {
    plot.tapOffsetY = 0;
    plot.tapScaleX = 1;
    plot.tapScaleY = 1;
    plot.tapRotation = 0;
    plot.tapPlantMotion.position.set(0, 0);
    plot.tapPlantMotion.scale.set(1);
    plot.tapPlantMotion.rotation = 0;
    tappedSlot.tapMotion.position.set(0, plantOffsetY);
    tappedSlot.tapMotion.scale.set(plantScaleX, plantScaleY);
    tappedSlot.tapMotion.rotation = plantRotation;
  } else {
    plot.tapOffsetY = lerp(fromY, toY, eased);
    plot.tapScaleX = lerp(fromScaleX, toScaleX, eased);
    plot.tapScaleY = lerp(fromScaleY, toScaleY, eased);
    plot.tapRotation = degreesToRadians(
      lerp(fromRotation, toRotation, eased),
    );
    plot.tapPlantMotion.position.set(0, plantOffsetY);
    plot.tapPlantMotion.scale.set(plantScaleX, plantScaleY);
    plot.tapPlantMotion.rotation = plantRotation;
  }

  const labelProgress = clamp((progress - 0.08) / 0.72, 0, 1);
  const labelAlpha =
    labelProgress < 0.16
      ? labelProgress / 0.16
      : labelProgress < 0.62
        ? 1
        : 1 - (labelProgress - 0.62) / 0.38;
  plot.tapFeedback.visible = labelProgress > 0 && labelProgress < 1;
  plot.tapFeedback.renderable = plot.tapFeedback.visible;
  plot.tapFeedback.alpha = clamp(labelAlpha, 0, 1);
  plot.tapFeedback.position.set(
    feedbackCenterX,
    lerp(48, 15, softEase(labelProgress)),
  );

  plot.tapBurst.clear();
  const burstProgress = clamp((progress - 0.12) / 0.58, 0, 1);
  if (burstProgress <= 0 || burstProgress >= 1) {
    return;
  }
  const burstEase = softEase(burstProgress);
  const burstAlpha = 1 - burstProgress;
  const centerX = feedbackCenterX;
  const centerY = GARDEN_PIXI_GEOMETRY.plotHeight / 2 + 4;
  for (let index = 0; index < 5; index += 1) {
    const angle = degreesToRadians(-150 + index * 48);
    const distance = lerp(5, 23, burstEase);
    const radius = lerp(2, 0.6, burstProgress);
    plot.tapBurst
      .circle(
        centerX + Math.cos(angle) * distance,
        centerY + Math.sin(angle) * distance,
        radius,
      )
      .fill({ color: 0xfff0a6, alpha: burstAlpha });
  }
}

function actionSucceeded(result) {
  return result !== false && result?.ok !== false;
}

function plotAccelerationSucceeded(result) {
  return (
    result?.ok === true &&
    Number.isFinite(Number(result.reducedSeconds)) &&
    Number(result.reducedSeconds) > 0
  );
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
