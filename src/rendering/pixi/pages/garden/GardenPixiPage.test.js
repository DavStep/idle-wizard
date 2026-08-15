// @vitest-environment jsdom

import { createPixiAssetManagerFake } from "../workshop/PixiPageTestHarness.js";
import { Container, Texture } from "pixi.js";
import { describe, expect, it, vi } from "vitest";

import { PixiInputRouter } from "../../input/PixiInputRouter.js";
import { PixiTextButton } from "../../primitives/PixiTextButton.js";
import { PixiCostButton } from "../../primitives/PixiCostButton.js";
import { PixiDialogFrame } from "../../primitives/PixiDialogFrame.js";
import { PixiNineSliceFrame } from "../../primitives/PixiNineSliceFrame.js";
import { PixiOwnedDialogSurface } from "../../primitives/PixiOwnedDialogSurface.js";
import { DialogRegistry } from "../../retained/DialogRegistry.js";
import { PageRegistry } from "../../retained/PageRegistry.js";
import { SemanticTargetRegistry } from "../../retained/SemanticTargetRegistry.js";
import {
  PIXI_PROGRESS_VISUALS,
  PIXI_UI_GEOMETRY,
  createPixiThemeSnapshot,
  resolvePixiTextStrokeWidth,
} from "../../theme/PixiThemeTokens.js";
import { ROOT_RUN_INVENTORY_CHOICE_DIALOG_GEOMETRY } from "../shared/RootRunInventoryChoiceDialogPixi.js";
import { RetainedScrollArea } from "../workshop/RetainedPageKit.js";
import { GARDEN_PIXI_GEOMETRY, GardenPixiPage } from "./GardenPixiPage.js";

describe("GardenPixiPage", () => {
  it("builds once and keeps keyed plots and the seed action bar across binds", () => {
    const harness = createHarness();
    const pages = new PageRegistry({
      pages: [["garden", harness.page]],
    });
    pages.bind("garden", createGardenViewModel());
    pages.activate("garden");
    const root = harness.page.getDisplayObject();
    const plot = harness.page.plots.get("plot-1");
    const actionBar = harness.page.actionBar;

    pages.bind(
      "garden",
      createGardenViewModel({
        actionText: "harvest",
        seedQuantity: 8,
      }),
    );

    expect(harness.page.getDisplayObject()).toBe(root);
    expect(harness.page.plots.get("plot-1")).toBe(plot);
    expect(harness.page.actionBar).toBe(actionBar);
    expect(
      harness.inputRouter.store.get(plot.pressRegistration.id)?.sound,
    ).toBe(false);
    expect(harness.page.plotPool.getStats()).toMatchObject({
      allocated: 1,
      active: 1,
      highWaterMark: 1,
    });
    expect(plot.action.text).toContain("harvest");
    expect(actionBar.selectionLabel.text).toBe("sage selected · 8");

    pages.destroy();
    harness.dispose();
  });

  it("renders plant actions in camel case with white outlined text", () => {
    const harness = createHarness();
    const model = createGardenViewModel({ actionText: "plant" });
    model.garden.plots[0].phase = "empty";
    model.garden.plots[0].process = null;
    harness.page.bind(model);

    const action = harness.page.plots.get("plot-1").action;
    expect(action.text).toBe("Plant");
    expect(action.style.fill).toBe("#ffffff");
    expect(action.style.stroke).toMatchObject({
      color: "#0a0a0a",
      width: resolvePixiTextStrokeWidth(action.style.fontSize),
      join: "round",
    });

    harness.page.destroy();
    harness.dispose();
  });

  it("keeps unavailable empty plots visually unlabeled", () => {
    const harness = createHarness();
    const model = createGardenViewModel({ actionText: "" });
    model.garden.plots[0].phase = "empty";
    model.garden.plots[0].process = null;
    model.garden.plots[0].hasSelectedSeed = true;
    model.garden.plots[0].canPlantSelectedSeed = false;
    harness.page.bind(model);

    const action = harness.page.plots.get("plot-1").action;
    expect(action.text).toBe("");
    expect(action.visible).toBe(false);
    expect(action.renderable).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it("renders Research in title case and shows its lock tooltip on press", () => {
    const harness = createHarness();
    const activatePlot = vi.fn(() => ({
      ok: false,
      reason: "research_locked",
      tileNumber: 1,
      tooltip:
        "You need to research first to unlock buying this slot.",
    }));
    const model = createGardenViewModel({
      actionText: "Research",
      activatePlot,
    });
    model.garden.plots[0].phase = "empty";
    model.garden.plots[0].process = null;
    model.garden.plots[0].buySlot = true;
    model.garden.plots[0].disabled = false;
    model.garden.plots[0].lockReason = "research_locked";
    harness.page.bind(model);

    const plot = harness.page.plots.get("plot-1");
    expect(plot.label).toBeUndefined();
    expect(
      plot.frame.children.some((child) =>
        String(child?.label ?? "").includes("plot-label"),
      ),
    ).toBe(false);
    expect(plot.number.style.fill).toBe("#3b2416");
    expect(plot.number.style.stroke).toBeNull();
    expect(plot.action.text).toBe("Research");
    expect(plot.action.style.fill).toBe("#ffffff");
    expect(plot.action.style.stroke).toMatchObject({
      color: "#0a0a0a",
      width: resolvePixiTextStrokeWidth(plot.action.style.fontSize),
      join: "round",
    });
    expect(
      harness.semanticTargets.getTutorialTarget("garden:plot:1:label")
        ?.displayObject,
    ).toBe(plot.root);

    expect(plot.enabled).toBe(true);
    expect(plot.buyCostButton.visible).toBe(false);
    expect(plot.activate()).toMatchObject({
      ok: false,
      reason: "research_locked",
    });
    expect(activatePlot).toHaveBeenCalledWith(
      expect.objectContaining({ lockReason: "research_locked" }),
    );
    expect(harness.page.plotTooltip.copy.text).toBe(
      "You need to research first to unlock buying this slot.",
    );
    expect(harness.page.plotTooltip.root.visible).toBe(true);
    expect(harness.page.plotTooltip.copy.style.fill).toBe("#ffffff");

    harness.page.destroy();
    harness.dispose();
  });

  it("keeps the fifth soil artwork at every plot level", () => {
    const harness = createHarness();
    harness.assetManager.getTexture = vi.fn(harness.assetManager.getTexture);
    const model = createGardenViewModel();

    model.garden.plots[0].soilLevel = 1;
    harness.page.bind(model);
    model.garden.plots[0].soilLevel = 5;
    harness.page.bind(model);

    const soilAssetRequests = harness.assetManager.getTexture.mock.calls
      .map(([assetId]) => assetId)
      .filter((assetId) =>
        assetId.includes("/garden/plots/outpost-plot-ground"),
      );
    expect(soilAssetRequests).toEqual([
      "source:assets/rooms/garden/plots/outpost-plot-ground-level-5.png",
      "source:assets/rooms/garden/plots/outpost-plot-ground-level-5.png",
    ]);

    harness.page.destroy();
    harness.dispose();
  });

  it("keeps Harvest All actionable without ready plots for empty-state feedback", () => {
    const harness = createHarness();
    const harvestAll = vi.fn(() => ({
      ok: false,
      reason: "no_ready_tiles",
    }));
    const model = createGardenViewModel({ seedQuantity: 8, harvestAll });
    model.garden.actionBar.readyHarvestCount = 0;
    harness.page.bind(model);

    expect(harness.page.actionBar.selectionPanel.root.visible).toBe(true);
    expect(harness.page.actionBar.selectionLabel.text).toBe(
      "sage selected · 8",
    );
    expect(harness.page.actionBar.harvestButton.enabled).toBe(true);
    expect(harness.page.actionBar.harvestButton.notification).toBe(false);
    expect(harness.page.actionBar.harvestButton.activate()).toEqual({
      ok: false,
      reason: "no_ready_tiles",
    });
    expect(harvestAll).toHaveBeenCalledTimes(1);
    expect(harness.page.actionBar.seedsButton.enabled).toBe(true);

    model.garden.actionBar.selectedSeed = null;
    model.garden.actionBar.readyHarvestCount = 2;
    harness.page.bind(model);
    expect(harness.page.actionBar.selectionPanel.root.visible).toBe(false);
    expect(harness.page.actionBar.harvestButton.enabled).toBe(true);
    expect(harness.page.actionBar.harvestButton.notification).toBe(true);

    harness.page.destroy();
    harness.dispose();
  });

  it("reveals researched bulk actions while Seeds keeps the remaining width", () => {
    const harness = createHarness();
    const locked = createGardenViewModel();
    locked.garden.actionBar.canPlantAll = false;
    locked.garden.actionBar.canHarvestAll = false;
    harness.page.bind(locked);

    expect(harness.page.actionBar.plantButton.visible).toBe(false);
    expect(harness.page.actionBar.harvestButton.visible).toBe(false);
    expect(harness.page.actionBar.seedsButton.hitArea.width).toBeCloseTo(
      GARDEN_PIXI_GEOMETRY.soloSeedsButtonWidth,
    );
    expect(harness.page.actionBar.seedsButton.position.x).toBeCloseTo(
      (harness.page.actionBar.width -
        GARDEN_PIXI_GEOMETRY.soloSeedsButtonWidth) /
        2,
    );

    locked.garden.actionBar.canPlantAll = true;
    harness.page.bind(locked);
    expect(harness.page.actionBar.plantButton.visible).toBe(true);
    expect(harness.page.actionBar.harvestButton.visible).toBe(false);
    expect(harness.page.actionBar.plantButton.hitArea.width).toBeCloseTo(
      harness.page.actionBar.seedsButton.hitArea.width,
    );

    locked.garden.actionBar.canHarvestAll = true;
    harness.page.bind(locked);
    expect(harness.page.actionBar.harvestButton.visible).toBe(true);
    expect(harness.page.actionBar.plantButton.hitArea.width).toBeCloseTo(
      harness.page.actionBar.harvestButton.hitArea.width,
    );
    expect(harness.page.actionBar.harvestButton.hitArea.width).toBeCloseTo(
      harness.page.actionBar.seedsButton.hitArea.width,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it("routes plot, toolbar, modal, and tutorial targets without Pixi listeners", () => {
    const activatePlot = vi.fn(() => true);
    const plantAll = vi.fn(() => true);
    const harvestAll = vi.fn(() => true);
    const openSeedPicker = vi.fn(() => true);
    const selectSeed = vi.fn(() => true);
    const harness = createHarness();
    harness.page.bind(
      createGardenViewModel({
        activatePlot,
        plantAll,
        harvestAll,
        openSeedPicker,
      }),
    );
    harness.page.activate();

    expect(harness.semanticTargets.activate("garden.plot.1")).toBe(true);
    expect(activatePlot).toHaveBeenCalledWith(
      expect.objectContaining({ id: "plot-1" }),
    );
    expect(
      harness.semanticTargets.getTutorialTarget("garden:plot:1")?.semanticId,
    ).toBe("garden.plot.1");
    expect(harness.inputRouter.store.getRegistrations("drag")).toHaveLength(0);
    expect(harness.inputRouter.store.getRegistrations("drop")).toHaveLength(0);
    expect(
      harness.page.plots.get("plot-1").root.listenerCount("pointertap"),
    ).toBe(0);

    expect(harness.semanticTargets.activate("garden.plantAll")).toBe(true);
    expect(plantAll).toHaveBeenCalledTimes(1);
    expect(harness.semanticTargets.activate("garden.harvestAll")).toBe(true);
    expect(harvestAll).toHaveBeenCalledTimes(1);
    expect(harness.semanticTargets.activate("garden.openSeeds")).toBe(true);
    expect(openSeedPicker).toHaveBeenCalledTimes(1);

    expect(harness.dialogs.hasInstance("garden.seed")).toBe(false);
    harness.page.openDialog("seed", {
      rows: [
        {
          id: "sage",
          key: "sageSeed",
          label: "sage seed",
          quantity: 2,
          quantityText: "2",
          itemKind: "seed",
          selected: true,
          semanticId: "garden.seed.sage",
          onSelect: selectSeed,
        },
      ],
    });
    const dialog = harness.dialogs.get("garden.seed");
    expect(dialog).not.toBeNull();
    expect(dialog.modal).toBeInstanceOf(PixiOwnedDialogSurface);
    expect(dialog.modal.panel).toBeInstanceOf(PixiDialogFrame);
    expect(dialog.modal.openMotion).toBe("center");
    expect(harness.inputRouter.getTopModal()?.id).toBe("garden.seed");
    expect(harness.semanticTargets.activate("garden.seed.sage")).toBe(true);
    expect(selectSeed).toHaveBeenCalledTimes(1);
    const seedRow = dialog.rows.get("sage");
    expect(dialog.modal.panel.coreWidth).toBe(304);
    expect(dialog.list.rowHeight).toBe(50);
    expect(dialog.contentHeight).toBe(
      ROOT_RUN_INVENTORY_CHOICE_DIALOG_GEOMETRY.contentMinHeight,
    );
    expect(seedRow.height).toBe(50);
    expect(seedRow.root.y).toBe(
      ROOT_RUN_INVENTORY_CHOICE_DIALOG_GEOMETRY.contentPaddingTop,
    );
    expect(seedRow.background).toBeInstanceOf(PixiNineSliceFrame);
    expect(seedRow.background.sourceInsets).toEqual({
      top: 17,
      right: 25,
      bottom: 19,
      left: 13,
    });
    expect(seedRow.itemIcon.visible).toBe(true);
    expect(seedRow.itemIconOverlay.visible).toBe(true);
    expect(seedRow.itemIcon.width).toBeLessThanOrEqual(28);
    expect(seedRow.itemIconOverlay.width / seedRow.itemIcon.width).toBeCloseTo(
      0.44,
    );
    expect(
      seedRow.itemIcon.x -
        seedRow.itemIcon.width / 2 -
        seedRow.background.x,
    ).toBeCloseTo(8);
    expect(seedRow.label.text).toBe("sage seed");
    expect(seedRow.detail.text).toBe("2 Available");
    expect(seedRow.selectedIndicator.visible).toBe(true);
    expect(seedRow.selectedIndicator.width).toBeCloseTo(27);
    expect(seedRow.selectedIndicator.height).toBeCloseTo(27);
    expect(
      seedRow.selectedIndicator.x,
    ).toBeCloseTo(
      seedRow.background.x + seedRow.background.frameWidth / 2,
    );
    expect(seedRow.selectedIndicator.y).toBeCloseTo(
      seedRow.summaryHeight / 2,
    );
    expect(harness.assetManager.getAtlasTexture).toHaveBeenCalledWith(
      "seed:pack",
    );
    expect(harness.assetManager.getAtlasTexture).toHaveBeenCalledWith(
      "herb:sageHerb",
    );

    harness.dialogs.close("garden.seed");
    harness.page.openDialog("seed", { rows: [] });
    expect(harness.dialogs.get("garden.seed")).toBe(dialog);
    expect(harness.dialogs.getStats().constructed).toBe(1);

    harness.page.destroy();
    harness.dispose();
    expect(harness.inputRouter.store.getRegistrations()).toHaveLength(0);
  });

  it("keeps untargeted plots actionable when the tutorial overlay owns the wait-state event path", () => {
    const activatePlot = vi.fn(() => true);
    const harness = createHarness();
    const model = createGardenViewModel({ activatePlot });
    model.garden.plots.push({
      id: "plot-2",
      tileNumber: 2,
      soilLevel: 1,
      phase: "empty",
      label: "sage",
      actionText: "plant",
      selectedSeedItemTypeId: 1,
    });
    harness.page.bind(model);
    harness.page.activate();

    const plot = harness.page.plots.get("plot-2");
    const registration = harness.inputRouter.store
      .getRegistrations("press")
      .find((entry) => entry.displayObject === plot.root);
    const tutorialOverlay = new Container({
      label: "tutorial-overlay-wait-state-hit",
    });
    const bounds = plot.root.getBounds();
    const point = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };

    expect(registration?.fallbackHitTest).toBe(true);
    harness.inputRouter.onPointerDown(
      createPointerEvent(tutorialOverlay, "pointerdown", point),
    );
    harness.inputRouter.onPointerUp(
      createPointerEvent(tutorialOverlay, "pointerup", point),
    );

    expect(activatePlot).toHaveBeenCalledWith(
      expect.objectContaining({ id: "plot-2" }),
    );

    tutorialOverlay.destroy();
    harness.page.destroy();
    harness.dispose();
  });

  it("keeps the Seeds action available when the tutorial overlay owns the event path", () => {
    const openSeedPicker = vi.fn(() => true);
    const harness = createHarness();
    harness.page.bind(createGardenViewModel({ openSeedPicker }));
    harness.page.activate();

    const seedsButton = harness.page.actionBar.seedsButton;
    const registration = harness.inputRouter.store
      .getRegistrations("press")
      .find((entry) => entry.displayObject === seedsButton);
    const tutorialOverlay = new Container({
      label: "tutorial-overlay-garden-seeds-hit",
    });
    const bounds = seedsButton.getBounds();
    const point = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };

    expect(registration?.fallbackHitTest).toBe(true);
    harness.inputRouter.onPointerDown(
      createPointerEvent(tutorialOverlay, "pointerdown", point, "touch"),
    );
    harness.inputRouter.onPointerUp(
      createPointerEvent(tutorialOverlay, "pointerup", point, "touch"),
    );

    expect(openSeedPicker).toHaveBeenCalledTimes(1);

    tutorialOverlay.destroy();
    harness.page.destroy();
    harness.dispose();
  });

  it("keeps frozen Garden geometry and timer/ticker lifecycle in source space", () => {
    const ticker = {
      add: vi.fn(),
      remove: vi.fn(),
    };
    const harness = createHarness({ ticker });
    harness.page.bind(createGardenViewModel());
    const plot = harness.page.plots.get("plot-1");

    expect(harness.page.plotScroll).toBeInstanceOf(RetainedScrollArea);
    expect(harness.page.plotScroll.root.position).toMatchObject({
      x: 0,
      y: GARDEN_PIXI_GEOMETRY.plotListTop,
    });
    expect(harness.page.plotScroll.height).toBeCloseTo(
      PIXI_UI_GEOMETRY.sourceHeight -
        GARDEN_PIXI_GEOMETRY.plotListTop -
        GARDEN_PIXI_GEOMETRY.plotListBottom,
    );
    expect(plot.root.position).toMatchObject({ x: 32, y: 24 });
    expect(harness.page.actionBar.root.position).toMatchObject({
      x: 16,
      y:
        PIXI_UI_GEOMETRY.sourceHeight -
        GARDEN_PIXI_GEOMETRY.actionBarBottom,
    });
    expect(harness.page.actionBar.plantButton.position).toMatchObject({
      x: 0,
      y: -GARDEN_PIXI_GEOMETRY.actionButtonHeight,
    });
    expect(harness.page.actionBar.harvestButton.position).toMatchObject({
      x: 122,
      y: -GARDEN_PIXI_GEOMETRY.actionButtonHeight,
    });
    expect(harness.page.actionBar.seedsButton.position.y).toBe(
      -GARDEN_PIXI_GEOMETRY.actionButtonHeight,
    );
    expect(GARDEN_PIXI_GEOMETRY.actionButtonHeight).toBe(
      PIXI_UI_GEOMETRY.roomControlHeight,
    );
    expect(harness.page.actionBar.harvestButton.buttonHeight).toBe(
      PIXI_UI_GEOMETRY.roomControlHeight,
    );
    expect(harness.page.actionBar.seedsButton.buttonHeight).toBe(
      PIXI_UI_GEOMETRY.roomControlHeight,
    );
    expect(plot.progress.progress).toBeCloseTo(0.5);
    expect(plot.progress).toMatchObject({
      tone: "green",
      height: 10,
    });

    harness.page.activate();
    expect(ticker.add).toHaveBeenCalledWith(harness.page.tickHandler);
    harness.page.deactivate();
    expect(ticker.remove).toHaveBeenCalledWith(harness.page.tickHandler);

    harness.page.destroy();
    harness.dispose();
  });

  it("releases the hidden world-chat clearance to the plot list and action bar", () => {
    const harness = createHarness();
    const model = createGardenViewModel();
    model.chrome = { worldChatVisible: false };

    harness.page.bind(model);

    expect(harness.page.plotScroll.height).toBeCloseTo(
      PIXI_UI_GEOMETRY.sourceHeight -
        GARDEN_PIXI_GEOMETRY.plotListTop -
        PIXI_UI_GEOMETRY.roomChatBottom,
    );
    expect(harness.page.actionBar.root.position.y).toBeCloseTo(
      PIXI_UI_GEOMETRY.sourceHeight - PIXI_UI_GEOMETRY.roomChatBottom,
    );

    model.chrome.worldChatVisible = true;
    harness.page.bind(model);
    expect(harness.page.actionBar.root.position.y).toBeCloseTo(
      PIXI_UI_GEOMETRY.sourceHeight -
        GARDEN_PIXI_GEOMETRY.actionBarBottom,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it("keeps Garden timer rails green when the player selects another progress style", () => {
    const harness = createHarness();

    harness.page.bind(createGardenViewModel());
    harness.page.applyTheme(
      createPixiThemeSnapshot({ progressBar: "gradient" }),
    );

    const progress = harness.page.plots.get("plot-1").progress;
    expect(progress.control).toMatchObject({
      tone: "green",
      fillColor: PIXI_PROGRESS_VISUALS.tones.green.fill,
      fillEdgeColor: PIXI_PROGRESS_VISUALS.tones.green.edge,
      gradient: null,
    });

    harness.page.destroy();
    harness.dispose();
  });

  it("uses the shared bounded vertical scroll pane instead of world pan and pinch", () => {
    const harness = createHarness();
    const model = createGardenViewModel();
    model.garden.maxPlots = 18;
    model.garden.plots = Array.from({ length: 18 }, (_, index) => ({
      ...model.garden.plots[0],
      id: `plot-${index + 1}`,
      tileNumber: index + 1,
    }));

    harness.page.bind(model);
    harness.page.activate();

    expect(harness.page.plotScroll).toBeInstanceOf(RetainedScrollArea);
    expect(harness.inputRouter.store.getRegistrations("scroll")).toHaveLength(
      1,
    );
    expect(harness.inputRouter.store.getRegistrations("pan")).toHaveLength(0);
    expect(harness.inputRouter.store.getRegistrations("pinch")).toHaveLength(
      0,
    );
    expect(harness.page.plotScroll.contentHeight).toBe(
      GARDEN_PIXI_GEOMETRY.gridPaddingTop +
        GARDEN_PIXI_GEOMETRY.gridPaddingBottom +
        GARDEN_PIXI_GEOMETRY.rowHeight * 6 +
        GARDEN_PIXI_GEOMETRY.rowGap * 5,
    );
    expect(harness.page.plotScroll.scrollbarTrack.visible).toBe(true);

    harness.page.plotScroll.scrollBy(24);

    expect(harness.page.plotScroll.offsetY).toBe(24);
    expect(harness.page.plotScroll.content.y).toBe(-24);

    harness.page.destroy();
    harness.dispose();
  });

  it("sizes the scroll range from rendered plots instead of maximum garden capacity", () => {
    const harness = createHarness();
    const model = createGardenViewModel();
    model.garden.maxPlots = 12;
    model.garden.plots.push({
      ...model.garden.plots[0],
      id: "plot-2",
      tileNumber: 2,
    });
    model.garden.plots.push(
      ...Array.from({ length: 10 }, (_, index) => ({
        ...model.garden.plots[0],
        id: `plot-${index + 3}`,
        tileNumber: index + 3,
        hidden: true,
      })),
    );

    harness.page.bind(model);

    expect(harness.page.plots.getWidgets()).toHaveLength(2);
    expect(harness.page.plotScroll.contentHeight).toBe(
      GARDEN_PIXI_GEOMETRY.gridPaddingTop +
        GARDEN_PIXI_GEOMETRY.gridPaddingBottom +
        GARDEN_PIXI_GEOMETRY.rowHeight,
    );
    expect(harness.page.plotScroll.physics.maxOffset).toBe(0);
    expect(harness.page.plotScroll.scrollbarTrack.visible).toBe(false);
    expect(harness.page.plotScroll.beginDrag()).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it("uses the shared green stacked Unlock button and keeps its notification on the button", () => {
    const harness = createHarness();
    const model = createGardenViewModel();
    model.garden.plots.push({
      id: "plot-2",
      tileNumber: 2,
      phase: "empty",
      buySlot: true,
      costCoin: 25,
      affordable: false,
      actionText: "buy 25 coin",
      notification: true,
    });

    harness.page.bind(model);
    const plot = harness.page.plots.get("plot-2");

    expect(plot.buyCostButton).toBeInstanceOf(PixiCostButton);
    expect(plot.buyCostButton).toMatchObject({
      tone: "green",
      stacked: true,
      visible: true,
      renderable: true,
      costState: "unaffordable",
      resource: "coin",
      buttonWidth: GARDEN_PIXI_GEOMETRY.buyButtonWidth,
      buttonHeight: GARDEN_PIXI_GEOMETRY.buyButtonHeight,
    });
    expect(plot.buyCostButton.actionTextLabel.text).toBe("Unlock");
    expect(plot.buyCostButton.amountLabel.text).toBe("25");
    expect(plot.buyCostButton.amountLabel.colorToken).toBe("#c1121f");
    expect(plot.buyCostButton.notification).toBe(true);
    expect(plot.buyCostButton.notificationBadge.root.visible).toBe(false);
    expect(plot.notificationBadge.root.visible).toBe(false);
    expect(plot.buyCostButton.position).toMatchObject({
      x:
        (GARDEN_PIXI_GEOMETRY.plotWidth - GARDEN_PIXI_GEOMETRY.buyButtonWidth) /
        2,
      y:
        (GARDEN_PIXI_GEOMETRY.plotHeight -
          GARDEN_PIXI_GEOMETRY.buyButtonHeight) /
        2,
    });
    expect(plot.action.visible).toBe(false);

    model.garden.plots[1].affordable = true;
    harness.page.bind(model);

    expect(plot.buyCostButton.costState).toBe("available");
    expect(plot.buyCostButton.enabled).toBe(true);
    expect(plot.buyCostButton.amountLabel.colorToken).toBe("#ffffff");
    expect(plot.buyCostButton.notificationBadge.root.visible).toBe(true);
    expect(plot.notificationBadge.root.visible).toBe(false);
    expect(plot.action.visible).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it("renders plot upgrades with the shared three-slot star tiers", () => {
    const harness = createHarness();
    const base = createGardenViewModel();
    base.garden.plots[0].level = 1;
    harness.page.bind(base);
    const plot = harness.page.plots.get("plot-1");

    expect(plot.level).toMatchObject({
      level: 0,
      tone: "empty",
      starCount: 0,
    });
    expect(plot.level.position).toMatchObject({
      x: 5,
      y: GARDEN_PIXI_GEOMETRY.plotHeight - 19,
    });
    expect(plot.level.slots).toHaveLength(3);
    expect(plot.level.slots.map((slot) => slot.fill.visible)).toEqual([
      false,
      false,
      false,
    ]);

    const yellow = createGardenViewModel();
    yellow.garden.plots[0].level = 3;
    harness.page.bind(yellow);

    expect(plot.level).toMatchObject({
      level: 2,
      tone: "yellow",
      starCount: 2,
    });
    expect(plot.level.slots.map((slot) => slot.fill.visible)).toEqual([
      true,
      true,
      false,
    ]);

    const orange = createGardenViewModel();
    orange.garden.plots[0].level = 5;
    harness.page.bind(orange);

    expect(plot.level).toMatchObject({
      level: 4,
      tone: "orange",
      starCount: 1,
    });
    expect(plot.level.slots.map((slot) => slot.fill.visible)).toEqual([
      true,
      false,
      false,
    ]);

    harness.page.destroy();
    harness.dispose();
  });

  it("advances plot progress between gameplay snapshots", () => {
    let now = 1_000;
    const harness = createHarness({
      timeSource: () => now,
    });
    const viewModel = createGardenViewModel();
    viewModel.garden.now = now;
    viewModel.garden.plots[0].process = {
      totalMs: 10_000,
      remainingMs: 6_000,
      progress: 0.4,
    };

    harness.page.bind(viewModel);
    const plot = harness.page.plots.get("plot-1");
    expect(plot.progress.progress).toBeCloseTo(0.4);
    expect(plot.plantMotion.scale.x).toBeCloseTo(0.42 + 0.4 * 0.58);

    now = 1_500;
    harness.page.tick(now);

    expect(plot.progress.progress).toBeCloseTo(0.45);
    expect(plot.plantMotion.scale.x).toBeCloseTo(0.42 + 0.45 * 0.58);

    harness.page.destroy();
    harness.dispose();
  });

  it("does not move plot progress backward when the same timer snapshot is rebound", () => {
    let now = 1_000;
    const harness = createHarness({
      timeSource: () => now,
    });
    const viewModel = createGardenViewModel();
    viewModel.garden.now = now;
    viewModel.garden.plots[0].process = {
      totalMs: 10_000,
      remainingMs: 6_000,
      progress: 0.4,
    };

    harness.page.bind(viewModel);
    const plot = harness.page.plots.get("plot-1");

    now = 1_500;
    harness.page.tick(now);
    expect(plot.progress.progress).toBeCloseTo(0.45);

    viewModel.garden.now = now;
    harness.page.bind(viewModel);

    expect(plot.progress.progress).toBeCloseTo(0.45);

    harness.page.destroy();
    harness.dispose();
  });

  it("resets plot progress when the authoritative timer restarts", () => {
    let now = 1_000;
    const harness = createHarness({
      timeSource: () => now,
    });
    const growing = createGardenViewModel();
    growing.garden.now = now;
    growing.garden.plots[0].process = {
      totalMs: 10_000,
      remainingMs: 6_000,
      progress: 0.4,
    };

    harness.page.bind(growing);
    now = 1_500;
    harness.page.tick(now);

    const restarted = createGardenViewModel();
    restarted.garden.now = now;
    restarted.garden.plots[0].process = {
      totalMs: 10_000,
      remainingMs: 10_000,
      progress: 0,
    };
    harness.page.bind(restarted);

    expect(harness.page.plots.get("plot-1").progress.progress).toBe(0);

    harness.page.destroy();
    harness.dispose();
  });

  it("matches the retained growing, ready-lift, and harvesting motion cycles", () => {
    let now = 0;
    const harness = createHarness({
      timeSource: () => now,
    });
    harness.page.bind(createGardenViewModel());
    const plot = harness.page.plots.get("plot-1");

    harness.page.tick(now);
    expect(plot.plantMotion.rotation).toBeCloseTo((-1.8 * Math.PI) / 180);

    now = 1_200;
    harness.page.tick(now);
    expect(plot.plantMotion.rotation).toBeCloseTo((2.1 * Math.PI) / 180);

    const ready = createGardenViewModel();
    ready.garden.plots[0] = {
      ...ready.garden.plots[0],
      phase: "ready",
      process: null,
      progress: 1,
    };
    now = 0;
    harness.page.bind(ready);
    now = 1_080 * 0.26;
    harness.page.tick(now);
    expect(plot.plantMotion.y).toBeCloseTo(
      GARDEN_PIXI_GEOMETRY.plotHeight - 28,
    );

    const harvesting = createGardenViewModel();
    harvesting.garden.plots[0] = {
      ...harvesting.garden.plots[0],
      phase: "harvesting",
      process: null,
    };
    now = 0;
    harness.page.bind(harvesting);
    expect(plot.scissors.alpha).toBe(1);
    expect(plot.scissorsOpen.alpha).toBe(0);
    now = 220;
    harness.page.tick(now);
    expect(plot.scissors.alpha).toBe(0);
    expect(plot.scissorsOpen.alpha).toBe(1);
    expect(plot.scissorsMotion.rotation).toBeCloseTo((-7 * Math.PI) / 180);

    harness.page.destroy();
    harness.dispose();
  });

  it("reuses retained plot receive motion when the selected seed is planted", () => {
    let now = 0;
    const harness = createHarness({
      timeSource: () => now,
    });
    const model = createGardenViewModel({
      activatePlot: vi.fn(() => true),
    });
    model.garden.plots[0].phase = "empty";
    model.garden.plots[0].process = null;
    model.garden.plots[0].toolbarSeedItemTypeId = 1;
    harness.page.bind(model);
    const plot = harness.page.plots.get("plot-1");
    const plotChildren = plot.frame.children.length;
    now = 300;
    expect(plot.activate()).toBe(true);
    expect(plot.receiveStartedAt).toBe(300);
    expect(harness.page.actionBar.seedUsedStartedAt).toBe(300);

    now = 300 + 220 * 0.5;
    harness.page.tick(now);
    expect(harness.page.actionBar.seedIconDropY).toBeCloseTo(6);
    expect(harness.page.actionBar.seedPack.y).toBeCloseTo(18);
    expect(harness.page.actionBar.seedItem.y).toBeCloseTo(18);
    expect(harness.page.actionBar.selectionPanel.root.scale.x).toBeCloseTo(
      1.012,
    );
    expect(harness.page.actionBar.selectionPanel.root.scale.y).toBeCloseTo(
      0.97,
    );

    now = 300 + 240 * 0.52;
    harness.page.tick(now);
    expect(plot.receiveOffsetY).toBeCloseTo(2);
    expect(plot.receiveScaleX).toBeCloseTo(1.02);
    expect(plot.receiveScaleY).toBeCloseTo(0.98);
    now = 540;
    harness.page.tick(now);
    expect(plot.receiveStartedAt).toBeNull();
    expect(plot.frame.scale).toMatchObject({ x: 1, y: 1 });
    expect(harness.page.actionBar.seedUsedStartedAt).toBeNull();
    expect(harness.page.actionBar.seedIconDropY).toBe(0);
    expect(harness.page.actionBar.selectionPanel.root.scale).toMatchObject({
      x: 1,
      y: 1,
    });

    expect(plot.frame.children).toHaveLength(plotChildren);
    expect(harness.page.plotPool.getStats()).toMatchObject({
      allocated: 1,
      highWaterMark: 1,
    });

    harness.page.destroy();
    harness.dispose();
  });

  it("locks accelerated plot taps through the full local feedback sequence", () => {
    let now = 100;
    const activatePlot = vi.fn(() => ({
      ok: true,
      tileNumber: 1,
      reducedSeconds: 1,
      remainingMs: 4_000,
      cooldownMs: 800,
    }));
    const harness = createHarness({ timeSource: () => now });
    harness.page.bind(createGardenViewModel({ activatePlot }));
    const plot = harness.page.plots.get("plot-1");
    const frameChildren = plot.frame.children.length;

    expect(plot.activate()).toMatchObject({ ok: true, reducedSeconds: 1 });
    expect(plot.tapFeedbackStartedAt).toBe(100);
    expect(plot.isActivationLocked(now)).toBe(true);

    expect(plot.activate()).toMatchObject({
      ok: false,
      reason: "tap_cooldown",
      retryAfterMs: 800,
    });
    expect(activatePlot).toHaveBeenCalledTimes(1);

    now = 100 + 800 * 0.42;
    harness.page.tick(now);
    expect(plot.frame.scale.x).toBeCloseTo(0.985);
    expect(plot.frame.scale.y).toBeCloseTo(1.025);
    expect(plot.tapPlantMotion.y).toBeCloseTo(-7);
    expect(plot.tapFeedback.visible).toBe(true);
    expect(plot.tapFeedback.text).toBe("-1s");

    now = 900;
    harness.page.tick(now);
    expect(plot.isActivationLocked(now)).toBe(false);
    expect(plot.tapFeedbackStartedAt).toBeNull();
    expect(plot.tapFeedback.visible).toBe(false);
    expectPlotFrameAligned(plot);
    expect(plot.frame.children).toHaveLength(frameChildren);

    expect(plot.activate()).toMatchObject({ ok: true });
    expect(activatePlot).toHaveBeenCalledTimes(2);

    harness.page.destroy();
    harness.dispose();
  });

  it("keeps the anti-spam lock but removes plot movement under reduced motion", () => {
    let now = 0;
    const activatePlot = vi.fn(() => ({
      ok: true,
      reducedSeconds: 1,
      cooldownMs: 800,
    }));
    const harness = createHarness({
      reducedMotion: true,
      timeSource: () => now,
    });
    harness.page.bind(createGardenViewModel({ activatePlot }));
    const plot = harness.page.plots.get("plot-1");

    expect(plot.activate()).toMatchObject({ ok: true });
    expect(plot.tapFeedback.visible).toBe(true);
    expectPlotFrameAligned(plot);

    now = 300;
    harness.page.tick(now);
    expect(plot.tapFeedback.visible).toBe(false);
    expect(plot.isActivationLocked(now)).toBe(true);
    expectPlotFrameAligned(plot);

    expect(plot.activate()).toMatchObject({
      ok: false,
      reason: "tap_cooldown",
    });
    expect(activatePlot).toHaveBeenCalledTimes(1);

    harness.page.destroy();
    harness.dispose();
  });

  it("animates the selected seed indicator only after successful seed use", () => {
    let now = 40;
    const plantAll = vi
      .fn()
      .mockReturnValueOnce({ ok: false, reason: "not_enough_seed" })
      .mockReturnValueOnce({ ok: true, planted: 2 });
    const harness = createHarness({ timeSource: () => now });
    harness.page.bind(createGardenViewModel({ plantAll }));

    expect(harness.page.actionBar.plantButton.activate()).toMatchObject({
      ok: false,
    });
    expect(harness.page.actionBar.seedUsedStartedAt).toBeNull();

    now = 80;
    expect(harness.page.actionBar.plantButton.activate()).toMatchObject({
      ok: true,
    });
    expect(harness.page.actionBar.seedUsedStartedAt).toBe(80);

    harness.page.destroy();
    harness.dispose();
  });

  it("keeps selected seed use feedback still when reduced motion is requested", () => {
    const harness = createHarness({ reducedMotion: true });
    const model = createGardenViewModel({
      activatePlot: vi.fn(() => ({ ok: true })),
    });
    model.garden.plots[0].phase = "empty";
    model.garden.plots[0].process = null;
    model.garden.plots[0].toolbarSeedItemTypeId = 1;
    harness.page.bind(model);

    expect(harness.page.plots.get("plot-1").activate()).toMatchObject({
      ok: true,
    });
    expect(harness.page.actionBar.seedUsedStartedAt).toBeNull();
    expect(harness.page.actionBar.seedIconDropY).toBe(0);
    expect(harness.page.actionBar.selectionPanel.root.scale).toMatchObject({
      x: 1,
      y: 1,
    });

    harness.page.destroy();
    harness.dispose();
  });

  it("runs selected seed use feedback after a successful swap confirmation", () => {
    let now = 120;
    const confirmSwap = vi.fn(() => ({ ok: true }));
    const harness = createHarness({ timeSource: () => now });
    harness.page.bind(createGardenViewModel());
    harness.page.openDialog("swap", {
      message: "swap sage seed for thyme seed?",
      payload: { tileNumber: 1, seedTypeId: 2 },
      onConfirm: confirmSwap,
    });

    expect(harness.dialogs.get("garden.swap").confirmAction()).toMatchObject({
      ok: true,
    });
    expect(confirmSwap).toHaveBeenCalledWith({
      tileNumber: 1,
      seedTypeId: 2,
    });
    expect(harness.page.actionBar.seedUsedStartedAt).toBe(120);

    harness.page.destroy();
    harness.dispose();
  });

  it("settles transient Garden motion when the retained page deactivates", () => {
    let now = 0;
    const ticker = {
      add: vi.fn(),
      remove: vi.fn(),
    };
    const harness = createHarness({
      ticker,
      timeSource: () => now,
    });
    harness.page.bind(createGardenViewModel());
    harness.page.activate();
    const plot = harness.page.plots.get("plot-1");
    plot.startSeedReceive(0);
    harness.page.actionBar.startSeedUsedMotion(0);
    now = 60;
    harness.page.tick(now);
    harness.page.deactivate();

    expect(ticker.remove).toHaveBeenCalledWith(harness.page.tickHandler);
    expect(plot.receiveStartedAt).toBeNull();
    expect(harness.page.actionBar.seedUsedStartedAt).toBeNull();
    expect(harness.page.actionBar.selectionPanel.root.scale).toMatchObject({
      x: 1,
      y: 1,
    });

    harness.page.destroy();
    harness.dispose();
  });

  it("restores plot layout transforms after press feedback and pool reuse", () => {
    const harness = createHarness();
    harness.page.bind(createGardenViewModel());
    const plot = harness.page.plots.get("plot-1");

    plot.setPressed(true);
    plot.setPressed(false);
    plot.startSeedReceive(0);
    plot.updateSeedReceive(120);
    harness.page.bind(createGardenViewModel({ actionText: "ready" }));

    expectPlotFrameAligned(plot);

    const empty = createGardenViewModel();
    empty.garden.plots = [];
    harness.page.bind(empty);

    expect(plot.pressed).toBe(false);
    expect(plot.root.position).toMatchObject({ x: 0, y: 0 });
    expect(plot.root.hitArea).toBeNull();
    expect(plot.frame.position).toMatchObject({ x: 0, y: 0 });
    expect(plot.frame.pivot).toMatchObject({ x: 0, y: 0 });
    expect(plot.frame.scale).toMatchObject({ x: 1, y: 1 });
    expect(plot.receiveStartedAt).toBeNull();
    expect(plot.plantMotion.position).toMatchObject({ x: 0, y: 0 });
    expect(plot.plantMotion.scale).toMatchObject({ x: 1, y: 1 });
    expect(plot.plantMotion.rotation).toBe(0);
    expect(plot.scissorsMotion.visible).toBe(false);

    const replacement = createGardenViewModel();
    replacement.garden.plots = [
      {
        ...replacement.garden.plots[0],
        id: "plot-2",
        tileNumber: 2,
      },
    ];
    harness.page.bind(replacement);
    const reused = harness.page.plots.get("plot-2");

    expect(reused).toBe(plot);
    expect(reused.root.position).toMatchObject({ x: 32, y: 24 });
    expectPlotFrameAligned(reused);
    expect(harness.page.plotPool.getStats()).toMatchObject({
      allocated: 1,
      active: 1,
      available: 0,
    });

    harness.page.destroy();
    harness.dispose();
  });

  it("constructs each confirmation dialog once and preserves exact confirmation copy", () => {
    const confirmCancel = vi.fn(() => true);
    const harness = createHarness();
    harness.page.bind(createGardenViewModel());

    harness.page.openDialog("cancel", {
      message: "empty this growing plot?",
      confirmLabel: "empty",
      payload: { tileNumber: 1 },
      onConfirm: confirmCancel,
    });
    const cancel = harness.dialogs.get("garden.cancel");
    expect(cancel.modal).toBeInstanceOf(PixiOwnedDialogSurface);
    expect(cancel.modal.panel).toBeInstanceOf(PixiDialogFrame);
    expect(cancel.modal.openMotion).toBe("center");
    expect(cancel.modal.panel.titleVariant).toBe("danger");
    expect(cancel.modal.panel.titleLabel.textObject.text).toBe(
      "Cancel Progress?",
    );
    expect(cancel.message.text).toBe("Empty This Growing Plot?");
    expect(cancel.message.anchor).toMatchObject({ x: 0.5, y: 0.5 });
    expect(cancel.keep.variant).toBe("yellow");
    expect(cancel.keep.text.text).toBe("Keep");
    expect(cancel.confirm.variant).toBe("red");
    expect(cancel.confirm.text.text).toBe("Empty");
    expect(cancel.modal.panel.outerHeight).toBe(126);
    expect(cancel.confirmAction()).toBe(true);
    expect(confirmCancel).toHaveBeenCalledWith({ tileNumber: 1 });

    harness.page.openDialog("cancel", {
      message: "empty another plot?",
    });
    expect(cancel.message.text).toBe("Empty Another Plot?");
    expect(harness.dialogs.get("garden.cancel")).toBe(cancel);
    harness.dialogs.close("garden.cancel");

    harness.page.openDialog("swap", {
      message: "swap sage seed for thyme seed?",
      confirmLabel: "swap",
    });
    const swap = harness.dialogs.get("garden.swap");
    expect(swap.message.text).toBe("swap sage seed for thyme seed?");
    expect(swap.modal.panel.titleLabel.textObject.text).toBe("Swap Seed?");
    expect(swap.message.anchor).toMatchObject({ x: 0, y: 0.5 });
    expect(swap.keep.button).toBeInstanceOf(PixiTextButton);
    expect(swap.keep.variant).toBe("yellow");
    expect(swap.keep.frame.visible).toBe(true);
    expect(swap.confirm.button).toBeInstanceOf(PixiTextButton);
    expect(swap.confirm.variant).toBe("yellow");
    expect(swap.keep.text.text).toBe("Keep");
    expect(swap.confirm.text.text).toBe("Swap");
    expect(swap.keep.root.position.y).toBe(swap.confirm.root.position.y);
    expect(swap.modal.panel.outerHeight).toBe(150);
    harness.dialogs.close("garden.swap");
    harness.page.openDialog("swap", { message: "swap again?" });
    expect(harness.dialogs.get("garden.swap")).toBe(swap);

    harness.page.destroy();
    harness.dispose();
  });
});

function createHarness({
  ticker = null,
  timeSource = () => 0,
  reducedMotion = false,
} = {}) {
  const dialogLayer = new Container();
  const dialogs = new DialogRegistry();
  const inputRouter = new PixiInputRouter();
  const semanticTargets = new SemanticTargetRegistry();
  const assetManager = createPixiAssetManagerFake(Texture);
  assetManager.getAtlasTexture = vi.fn(assetManager.getAtlasTexture);
  const page = new GardenPixiPage({
    assetManager,
    dialogLayer,
    dialogRegistry: dialogs,
    inputRouter,
    semanticTargets,
    ticker,
    timeSource,
    reducedMotion,
  });

  return {
    assetManager,
    dialogLayer,
    dialogs,
    inputRouter,
    page,
    semanticTargets,
    dispose() {
      dialogs.destroy();
      dialogLayer.destroy({ children: true });
    },
  };
}

function expectPlotFrameAligned(plot) {
  expect(
    plot.frame.position.x - plot.frame.pivot.x * plot.frame.scale.x,
  ).toBeCloseTo((plot.width - GARDEN_PIXI_GEOMETRY.plotWidth) / 2);
  expect(
    plot.frame.position.y - plot.frame.pivot.y * plot.frame.scale.y,
  ).toBeCloseTo(0);
  expect(plot.frame.scale).toMatchObject({ x: 1, y: 1 });
}

function createPointerEvent(
  target,
  type,
  point = { x: 0, y: 0 },
  pointerType = "mouse",
) {
  return {
    type,
    target,
    pointerId: 1,
    pointerType,
    button: 0,
    global: point,
    clientX: point.x,
    clientY: point.y,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    stopImmediatePropagation: vi.fn(),
  };
}

function createGardenViewModel({
  actionText = "growing",
  seedQuantity = 3,
  activatePlot = vi.fn(() => true),
  plantAll = vi.fn(() => true),
  harvestAll = vi.fn(() => true),
  openSeedPicker = vi.fn(() => true),
} = {}) {
  return {
    garden: {
      now: 0,
      maxPlots: 9,
      plots: [
        {
          id: "plot-1",
          tileNumber: 1,
          soilLevel: 1,
          phase: "growing",
          label: "sage",
          herbKey: "sage",
          actionText,
          process: {
            durationMs: 10_000,
            endTimeMs: 5_000,
          },
          acceptsSeedDrop: true,
        },
      ],
      actionBar: {
        canPlantAll: true,
        canHarvestAll: true,
        selectedSeed: {
          id: "sage-seed",
          itemTypeId: 1,
          key: "sageSeed",
          label: "sage",
          quantity: seedQuantity,
          itemKind: "seed",
          icon: {
            kind: "seed",
            key: "sageSeed",
          },
        },
        readyHarvestCount: 1,
        hasSeedChoices: true,
      },
    },
    actions: {
      activatePlot,
      plantAll,
      harvestAll,
      openSeedPicker,
    },
  };
}
