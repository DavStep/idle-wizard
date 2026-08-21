import { Container } from 'pixi.js';

import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
import {
  GardenPlotTooltip,
  GardenPlotWidget,
  GardenSeedActionBar,
  GardenSeedPickerButton,
} from './GardenPixiPage.js';

const WIDGETS = [
  defineUiEditorIntegration({
    apiVersion: 1,
    childWidgetIds: ["text-button", "compound.garden-seed-picker-button"],
    createThumbnail: () =>
      createGardenThumbnail(
        "compound.garden-seed-action-bar",
        createActionBarControl,
      ),
    folderPath: ["Garden"],
    id: "compound.garden-seed-action-bar",
    kind: "widget",
    label: "Garden Seed Action Bar",
    sectionId: "composite-widgets",
    properties: productionProperties(
      "GardenSeedActionBar",
      "Selected seed indicator and bulk garden actions",
    ),
    scenarios: [
      scenario(
        "selected",
        "Seed selected",
        { selected: true, canPlantAll: true, canHarvestAll: true },
        mountActionBar,
      ),
      scenario(
        "seeds-only",
        "Seeds only",
        { selected: false, canPlantAll: false, canHarvestAll: false },
        mountActionBar,
      ),
      scenario(
        "harvest-ready",
        "Harvest ready",
        {
          selected: true,
          canPlantAll: false,
          canHarvestAll: true,
          readyHarvestCount: 3,
        },
        mountActionBar,
      ),
    ],
    usages: productionUsage("Garden room footer actions"),
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    childWidgetIds: ["text-button"],
    createThumbnail: () =>
      createGardenThumbnail(
        "compound.garden-seed-picker-button",
        createSeedPickerControl,
      ),
    folderPath: ["Garden"],
    id: "compound.garden-seed-picker-button",
    kind: "widget",
    label: "Garden Seed Picker Button",
    sectionId: "composite-widgets",
    properties: productionProperties(
      "GardenSeedPickerButton",
      "Seeds action with an optional selected seed-pack and stock line",
    ),
    scenarios: [
      scenario("selected", "Mint selected", { state: "selected" }, mountSeedPicker),
      scenario("empty", "No selection", { state: "empty" }, mountSeedPicker),
      scenario("disabled", "Unavailable", { state: "disabled" }, mountSeedPicker),
      scenario("pressed", "Pressed", { state: "pressed" }, mountSeedPicker),
      scenario("overflow", "Long seed name", { state: "overflow" }, mountSeedPicker),
    ],
    usages: productionUsage("Garden room seed inventory action"),
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    childWidgetIds: [
      "cost-button",
      "primitive.progress-bar",
      "primitive.star-level-label",
    ],
    createThumbnail: () =>
      createGardenThumbnail("compound.garden-plot", createPlotControl),
    folderPath: ["Garden"],
    id: "compound.garden-plot",
    kind: "widget",
    label: "Garden Plot",
    sectionId: "composite-widgets",
    properties: productionProperties(
      "GardenPlotWidget",
      "One purchasable, plantable, growing, harvestable, or tap-accelerating garden plot",
    ),
    scenarios: [
      scenario("empty", "Empty plot", plotFixture("empty"), mountPlot),
      scenario("growing", "Growing herb", plotFixture("growing"), mountPlot),
      scenario(
        "tap-feedback",
        "Tap feedback",
        plotFixture("tap-feedback"),
        mountPlot,
      ),
      scenario("ready", "Ready to harvest", plotFixture("ready"), mountPlot),
      scenario("locked", "Locked slot", plotFixture("locked"), mountPlot),
      scenario(
        "purchasable",
        "Purchasable slot",
        plotFixture("purchasable"),
        mountPlot,
      ),
    ],
    usages: productionUsage("Garden room plot grid"),
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    childWidgetIds: [
      "text-button",
      "primitive.progress-bar",
      "primitive.star-level-label",
    ],
    createThumbnail: () =>
      createGardenThumbnail(
        "compound.automated-garden-plot",
        createAutomatedPlotControl,
      ),
    folderPath: ["Garden"],
    id: "compound.automated-garden-plot",
    kind: "widget",
    label: "Automated Garden Plot",
    sectionId: "composite-widgets",
    properties: productionProperties(
      "GardenPlotWidget",
      "Grid-aligned five-slot automated plot with progress and a right-side seed/Auto/xN control block",
    ),
    scenarios: [
      scenario(
        "auto-on-x5",
        "Auto on · x5",
        automatedPlotFixture({ autoEnabled: true, quantity: 5 }),
        mountPlot,
      ),
      scenario(
        "auto-off-x3",
        "Auto off · x3",
        automatedPlotFixture({ autoEnabled: false, quantity: 3 }),
        mountPlot,
      ),
    ],
    usages: productionUsage("Garden room automated plot rows"),
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    createThumbnail: () =>
      createGardenThumbnail(
        "compound.garden-plot-tooltip",
        createTooltipControl,
      ),
    folderPath: ["Garden"],
    id: "compound.garden-plot-tooltip",
    kind: "widget",
    label: "Garden Plot Tooltip",
    sectionId: "composite-widgets",
    properties: productionProperties(
      "GardenPlotTooltip",
      "Compact plot action explanation anchored near a plot",
    ),
    scenarios: [
      scenario(
        "blocked",
        "Blocked action",
        { copy: "Select a seed before planting this plot." },
        mountTooltip,
      ),
      scenario(
        "locked",
        "Locked action",
        { copy: "Reach level 7 to unlock this garden plot." },
        mountTooltip,
      ),
    ],
    usages: productionUsage("Garden plot contextual feedback"),
  }),
];

export default WIDGETS;

function scenario(id, label, fixture, mount) {
  return { fixture, id, label, mount };
}

function productionProperties(productionClass, contract) {
  return [
    { label: 'Production class', value: productionClass },
    { label: 'Contract', value: contract },
  ];
}

function productionUsage(label) {
  return [{ label, source: 'src/rendering/pixi/pages/garden/GardenPixiPage.js' }];
}

function createGardenThumbnail(id, createControl) {
  return createUiEditorPixiThumbnail({
    assetFilter: gardenAssetFilter,
    component: createControl.name,
    createControl: ({ assets, input }) => createControl({ assets, input }),
    id,
  });
}

async function mountActionBar(context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: gardenAssetFilter,
    component: 'GardenSeedActionBar',
    createControl: ({ assets, input }) => createActionBarControl({ assets, fixture, input, context }),
  });
}

function createActionBarControl({
  assets,
  fixture = { selected: true, canPlantAll: true, canHarvestAll: true },
  input,
  context = null,
}) {
  const root = new Container({ label: 'garden-seed-action-bar-preview' });
  const bar = new GardenSeedActionBar({ assetManager: assets, inputRouter: input, reducedMotion: true });
  bar.bind({
    canHarvestAll: fixture.canHarvestAll,
    canPlantAll: fixture.canPlantAll,
    hasSeedChoices: true,
    readyHarvestCount: fixture.readyHarvestCount ?? 0,
    selectedSeed: fixture.selected ? { key: 'mintSeed', label: 'Mint', quantity: 12 } : null,
  }, {
    harvestAll: () => context?.emit('harvestAll') ?? true,
    openSeedPicker: () => context?.emit('seedPickerOpened') ?? true,
    plantAll: () => context?.emit('plantAll') ?? true,
  });
  bar.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  bar.setBounds(0, 36, 358);
  root.addChild(bar.root);
  return { destroy: () => bar.destroy(), height: 40, root, width: 358 };
}

async function mountSeedPicker(context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: gardenAssetFilter,
    component: 'GardenSeedPickerButton',
    createControl: ({ assets, input }) =>
      createSeedPickerControl({ assets, fixture, input, context }),
  });
}

function createSeedPickerControl({
  assets,
  fixture = { state: 'selected' },
  input,
  context = null,
}) {
  const button = new GardenSeedPickerButton({
    assetManager: assets,
    inputRouter: input,
    action: () => context?.emit('seedPickerOpened') ?? true,
    label: 'garden-seed-picker-preview',
  });
  const state = fixture.state ?? 'selected';
  const selected = state !== 'empty';
  button
    .setSeed(
      selected
        ? {
            key: 'mintSeed',
            label:
              state === 'overflow'
                ? 'Twilight Moonflower'
                : 'Mint',
            quantity: 140,
          }
        : null,
    )
    .setEnabled(state !== 'disabled')
    .setSize(220, 36);
  button.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  if (state === 'pressed') {
    button.setPressed(true);
  }
  const root = new Container({ label: 'garden-seed-picker-button-preview' });
  root.addChild(button);
  return { destroy: () => button.destroy(), height: 36, root, width: 220 };
}

async function mountPlot(context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: gardenAssetFilter,
    component: 'GardenPlotWidget',
    createControl: ({ assets, input }) => createPlotControl({ assets, fixture, input, context }),
  });
}

function createPlotControl({
  assets,
  fixture = plotFixture("growing"),
  input,
  context = null,
}) {
  const page = {
    hidePlotTooltip() {},
    showPlotTooltip(copy) { context?.emit('tooltipShown', { copy });
    },
    startSeedUsedFeedback() {},
    theme: DEFAULT_PIXI_THEME_SNAPSHOT,
    timeSource: () => context?.clock.now() ?? 2000,
  };
  const plot = new GardenPlotWidget({ instanceId: 1, page, assetManager: assets, inputRouter: input });
  plot.bind(fixture, {
    activatePlot: () =>
      context?.emit("plotActivated", { phase: fixture.phase }) ?? true,
    openPlotSeedPicker: () => context?.emit("seedPickerOpened") ?? true,
    selectPlotQuantity: (_plot, quantity) =>
      context?.emit("quantitySelected", { quantity }) ?? true,
    togglePlotAutomation: () => context?.emit("automationToggled") ?? true,
  });
  const width = fixture.automationAvailable ? 310 : 104;
  plot.setBounds(0, 0, width);
  if (fixture.tapFeedback === true) {
    const now = page.timeSource();
    plot.startTapAcceleration({ ok: true, reducedSeconds: 1, cooldownMs: 504 }, now - 336);
    plot.updateTime(now);
  }
  return {
    destroy: () => plot.destroy(),
    height: plot.getLayoutHeight(),
    root: plot.root,
    width,
  };
}

function createAutomatedPlotControl({ assets, input }) {
  return createPlotControl({
    assets,
    fixture: automatedPlotFixture({ autoEnabled: true, quantity: 5 }),
    input,
  });
}

function automatedPlotFixture({ autoEnabled, quantity }) {
  return {
    ...plotFixture("growing"),
    automationAvailable: true,
    autoEnabled,
    automationSeed: { key: "mintSeed", label: "Mint", quantity: 12 },
    level: quantity,
    maxPlantQuantity: quantity,
    plantQuantity: quantity,
    harvestQuantity: quantity,
  };
}

function plotFixture(state) {
  const common = {
    id: `editor-${state}`,
    tileNumber: 3,
    level: 2,
    action: { enabled: true },
  };
  if (state === 'growing') return { ...common, phase: 'growing', herbKey: 'mintHerb', actionText: 'Growing', process: { progress: 0.45, remainingMs: 4200, timerText: '4s' } };
  if (state === 'tap-feedback') return { ...common, phase: 'growing', herbKey: 'mintHerb', actionText: 'Growing', process: { progress: 0.45, remainingMs: 4200, timerText: '4s' }, tapFeedback: true };
  if (state === 'ready') return { ...common, phase: 'ready', herbKey: 'mintHerb', actionText: 'Harvest', notification: true };
  if (state === 'locked') return { ...common, buySlot: true, disabled: true, lockReason: 'Reach level 7', actionText: 'Level 7' };
  if (state === 'purchasable') return { ...common, buySlot: true, costCoin: 250, affordable: true, notification: true };
  return { ...common, phase: 'empty', actionText: 'Plant', toolbarSeedItemTypeId: 'mintSeed' };
}

async function mountTooltip(_context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: gardenAssetFilter,
    component: 'GardenPlotTooltip',
    createControl: ({ assets }) => createTooltipControl({ assets, fixture }),
  });
}

function createTooltipControl({
  assets,
  fixture = { copy: "Select a seed before planting this plot." },
}) {
  const tooltip = new GardenPlotTooltip({ assetManager: assets });
  tooltip.bind(fixture.copy);
  tooltip.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  tooltip.show({ x: 0, y: 0, animate: false });
  return { destroy: () => tooltip.destroy(), height: tooltip.height, root: tooltip.root, width: tooltip.width };
}

function gardenAssetFilter({ id }) {
  const assetId = String(id ?? '');
  return assetId.includes('/ui/') || assetId.includes('/items/') || assetId.includes('/rooms/garden/');
}
