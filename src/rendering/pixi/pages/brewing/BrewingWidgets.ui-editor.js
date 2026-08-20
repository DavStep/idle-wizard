import { Container } from 'pixi.js';

import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
import { BrewingRecipeCard, BrewingRecipeIngredientRow } from './BrewingDialogsPixi.js';
import {
  BREWING_HUD_GEOMETRY,
  BrewingAutomationSettingsDialogPixi,
  BrewingCauldronHearth,
  BrewingHudPixi,
  BrewingIngredientPickerSlot,
} from './BrewingHudPixi.js';
import {
  BREWING_PIXI_GEOMETRY,
  BrewingCauldronButton,
  BrewingCauldronRow,
  BrewingCauldronWidget,
  BrewingInventoryButton,
  BrewingInventoryPanel,
  BrewingInventoryRow,
} from './BrewingPixiPage.js';

const SOURCE_PAGE = 'src/rendering/pixi/pages/brewing/';

export default [
  widget('compound.brewing-cauldron', 'Brewing Cauldron', ['text-button', 'cost-button', 'primitive.progress-bar'], cauldronControl, variants(['configured', 'brewing', 'ready', 'locked', 'purchasable'])),
  widget('compound.brewing-cauldron-row', 'Brewing Cauldron Row', [], cauldronRowControl, variants(['fulfilled', 'missing', 'removable'])),
  widget('compound.brewing-cauldron-button', 'Brewing Cauldron Button', ['text-button', 'cost-button'], cauldronButtonControl, variants(['action', 'selected', 'disabled', 'purchase'])),
  widget('compound.brewing-inventory-panel', 'Brewing Inventory Panel', [], inventoryPanelControl, variants(['herbs', 'potions', 'expanded'])),
  widget('compound.brewing-inventory-row', 'Brewing Inventory Row', [], inventoryRowControl, variants(['herb', 'potion', 'empty', 'locked'])),
  widget('compound.brewing-inventory-opener', 'Brewing Inventory Opener', [], inventoryButtonControl, variants(['herbs', 'potions', 'selected'])),
  widget('compound.brewing-recipe-card', 'Brewing Recipe Card', ['text-button', 'compound.brewing-recipe-ingredient-row'], recipeCardControl, variants(['available', 'selected', 'not-researched', 'researching', 'unknown'])),
  widget('compound.brewing-recipe-ingredient-row', 'Brewing Recipe Ingredient Row', [], recipeIngredientControl, variants(['available', 'missing', 'unknown'])),
  widget('compound.brewing-batch-detail', 'Brewing Batch Detail', ['compound.brewing-ingredient-picker-slot', 'primitive.progress-bar'], batchDetailControl, variants(['empty', 'missing', 'ready', 'brewing', 'complete'])),
  widget('compound.brewing-cauldron-hearth', 'Brewing Cauldron Hearth', [], cauldronHearthControl, variants(['idle', 'lit', 'reduced-motion'])),
  widget('compound.brewing-ingredient-picker-slot', 'Brewing Ingredient Picker Slot', ['text-button'], ingredientSlotControl, variants(['filled', 'used', 'missing', 'empty'])),
  widget('compound.brewing-automation-toggle', 'Brewing Automation Inclusion', ['text-button'], automationToggleControl, variants(['included', 'unavailable'])),
];

function widget(id, label, childWidgetIds, factory, scenarios) {
  const component = label.replaceAll(' ', '');
  return defineUiEditorIntegration({
    apiVersion: 1,
    childWidgetIds,
    createThumbnail: () => createUiEditorPixiThumbnail({ assetFilter: brewingAssetFilter, component, createControl: (deps) => factory({ ...deps, fixture: scenarios[0].fixture }), id }),
    folderPath: ['Brewing'],
    id,
    kind: 'widget',
    label,
    sectionId: 'composite-widgets',
    properties: [
      { label: 'Production class', value: resolveProductionClass(id) },
      { label: 'Contract', value: label },
    ],
    scenarios: scenarios.map((scenario) => ({
      ...scenario,
      mount: (context, fixture) => createUiEditorPixiSurface({
        assetFilter: brewingAssetFilter,
        component,
        createControl: (deps) => factory({ ...deps, context, fixture }),
      }),
    })),
    usages: [{ label: 'Brewing room and dialogs', source: SOURCE_PAGE }],
  });
}

function variants(ids) {
  return ids.map((id) => ({ fixture: { state: id }, id, label: title(id) }));
}

function title(value) {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll('-', ' ');
}

function resolveProductionClass(id) {
  return ({
    'compound.brewing-cauldron': 'BrewingCauldronWidget',
    'compound.brewing-cauldron-row': 'BrewingCauldronRow',
    'compound.brewing-cauldron-button': 'BrewingCauldronButton',
    'compound.brewing-inventory-panel': 'BrewingInventoryPanel',
    'compound.brewing-inventory-row': 'BrewingInventoryRow',
    'compound.brewing-inventory-opener': 'BrewingInventoryButton',
    'compound.brewing-recipe-card': 'BrewingRecipeCard',
    'compound.brewing-recipe-ingredient-row': 'BrewingRecipeIngredientRow',
    'compound.brewing-batch-detail': 'BrewingHudPixi.detailPanel',
    'compound.brewing-cauldron-hearth': 'BrewingCauldronHearth',
    'compound.brewing-ingredient-picker-slot': 'BrewingIngredientPickerSlot',
    'compound.brewing-automation-toggle': 'BrewingAutomationSettingsDialogPixi.toggle',
  })[id];
}

function pageStub(input, now = () => 2000) {
  return {
    acceptHerbDrop() { return true; },
    animateBrewIngredients() {},
    animateIngredientReturn() {},
    beginHerbDrag() {},
    cancelHerbDrag() {},
    findCauldron() { return null; },
    finishHerbDrag() {},
    getDisplayObjectCenter() { return { x: 0, y: 0 }; },
    inputRouter: input,
    moveHerbDrag() {},
    openDialog() { return true; },
    prefersReducedMotion: () => true,
    root: { visible: true },
    selectCauldron() { return true; },
    theme: DEFAULT_PIXI_THEME_SNAPSHOT,
    timeSource: now,
  };
}

function cauldronControl({ assets, input, fixture = { state: 'configured' }, context }) {
  const page = pageStub(input, () => context?.clock.now() ?? 2000);
  const control = new BrewingCauldronWidget({ instanceId: 1, page, assetManager: assets, inputRouter: input });
  control.bind(cauldronFixture(fixture.state), { selectCauldron: () => context?.emit('cauldronSelected') ?? true });
  control.setBounds(0, 0);
  return wrap(control, BREWING_PIXI_GEOMETRY.cauldronNodeWidth, control.height);
}

function cauldronFixture(state) {
  const activeBrew = ['brewing', 'ready'].includes(state) ? {
    canCollect: state === 'ready', durationMs: 5000, endTimeMs: 5000, key: 'minorManaPotion', label: 'Minor Mana Potion', startedAtMs: 0,
  } : null;
  return {
    activeBrew,
    brewQuantity: 2,
    canBuyCauldron: state === 'purchasable',
    canSelectRecipe: true,
    cauldronIndex: 0,
    cauldronNumber: 1,
    ingredients: [{ key: 'mintHerb', label: 'Mint', quantity: 2, fulfilled: true }, { key: 'sageHerb', label: 'Sage', quantity: 1, fulfilled: state !== 'configured' }],
    level: 2,
    maxIngredients: 3,
    nextCauldronCost: state === 'purchasable' ? 250 : undefined,
    primaryAction: state === 'purchasable'
      ? { id: 'buy', label: 'Unlock', costText: '250', costResource: 'coin', enabled: true }
      : activeBrew
        ? state === 'ready'
          ? { id: 'complete', label: 'Bottled', enabled: false }
          : { id: 'cancel', label: 'Cancel', enabled: true }
        : { id: 'brew', label: 'Brew', enabled: true },
    selectedRecipe: { key: 'minorManaPotion', label: 'Minor Mana Potion' },
    unlocked: !['locked', 'purchasable'].includes(state),
  };
}

function cauldronRowControl({ input, fixture = { state: 'fulfilled' }, context }) {
  const cauldron = { page: pageStub(input) };
  const control = new BrewingCauldronRow({ instanceId: 1, inputRouter: input, cauldron });
  control.bind({ label: 'Mint', quantity: 2, fulfilled: fixture.state === 'fulfilled', removable: fixture.state === 'removable', valueText: fixture.state === 'missing' ? '0/2' : '2/2' }, {}, { removeIngredient: () => context?.emit('ingredientRemoved') ?? true });
  control.setBounds(0, 0, 216);
  return wrap(control, 216, BREWING_PIXI_GEOMETRY.rowHeight);
}

function cauldronButtonControl({ assets, input, fixture = { state: 'action' }, context }) {
  const control = new BrewingCauldronButton({ id: 'brewing.editor.button', assetManager: assets, inputRouter: input, action: () => context?.emit('action') ?? true });
  const state = fixture.state;
  control.bind(state === 'purchase'
    ? { id: 'buy', label: 'Unlock', costText: '250', costResource: 'coin', enabled: true }
    : { label: state === 'selected' ? 'Auto' : 'Brew', selected: state === 'selected', enabled: state !== 'disabled' });
  control.setBounds(0, 0);
  return wrap(control, BREWING_PIXI_GEOMETRY.actionWidth, BREWING_PIXI_GEOMETRY.actionHeight);
}

function inventoryPanelControl({ assets, input, fixture = { state: 'herbs' }, context }) {
  const kind = fixture.state === 'potions' ? 'potion' : 'herb';
  const control = new BrewingInventoryPanel({ id: 'brewing.editor.inventory', kind, title: kind === 'herb' ? 'Herbs' : 'Potions', page: pageStub(input), assetManager: assets, inputRouter: input, draggable: false });
  const rows = Array.from({ length: fixture.state === 'expanded' ? 8 : 5 }, (_, index) => ({ key: index % 2 ? 'sageHerb' : 'mintHerb', label: index % 2 ? 'Sage' : 'Mint', quantity: 4 + index }));
  control.bind({ visible: true, expanded: fixture.state === 'expanded', rows, actions: { addHerb: () => context?.emit('herbAdded') ?? true } });
  control.setWidth(328);
  control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  return wrap(control, 328, control.height);
}

function inventoryRowControl({ assets, input, fixture = { state: 'herb' }, context }) {
  const kind = fixture.state === 'potion' ? 'potion' : 'herb';
  const control = new BrewingInventoryRow({ id: 'brewing.editor.inventory-row', kind, assetManager: assets, inputRouter: input, draggable: false, page: pageStub(input) });
  control.bind({ key: kind === 'herb' ? 'mintHerb' : 'minorManaPotion', label: kind === 'herb' ? 'Mint' : 'Minor Mana', quantity: fixture.state === 'empty' ? 0 : 7, locked: fixture.state === 'locked' }, { addHerb: () => context?.emit('inventoryActivated') ?? true });
  control.setBounds(0, 0, 150);
  return wrap(control, 150, BREWING_PIXI_GEOMETRY.rowHeight);
}

function inventoryButtonControl({ assets, input, fixture = { state: 'herbs' }, context }) {
  const right = fixture.state === 'potions';
  const texture = assets.getTexture?.(right ? 'source:assets/icons/icon-potion-box.png' : 'source:assets/icons/icon-herb-box.png');
  const control = new BrewingInventoryButton({ id: 'brewing.editor.inventory-opener', label: right ? 'Potions' : 'Herbs', side: right ? 'right' : 'left', texture, inputRouter: input, action: () => context?.emit('inventoryOpened') ?? true });
  control.setSelected(fixture.state === 'selected');
  control.setBounds(0, 0);
  control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  return wrap(control, BREWING_PIXI_GEOMETRY.inventoryButtonWidth, BREWING_PIXI_GEOMETRY.inventoryButtonHeight);
}

function recipeCardControl({ assets, input, fixture = { state: 'available' }, context }) {
  const control = new BrewingRecipeCard({ instanceId: 1, assetManager: assets, inputRouter: input, timeSource: () => context?.clock.now() ?? 2000 });
  const state = fixture.state;
  control.bind({
    key: 'minorManaPotion', label: 'Minor Mana Potion', description: 'Restores a small amount of mana.', manaCost: 12, brewDurationMs: 5000,
    ingredients: [{ label: 'Mint', quantity: 2, owned: ['not-researched', 'researching'].includes(state) ? 0 : 5 }, { label: 'Sage', quantity: 1, owned: 3 }],
    known: state !== 'unknown', unknown: state === 'unknown', unlocked: !['not-researched', 'researching', 'unknown'].includes(state), selected: state === 'selected',
    researchInProgress: state === 'researching', researchRemainingMs: 125_000,
  }, { selectRecipe: () => context?.emit('recipeSelected') ?? true });
  control.setBounds(0, 0, 155, 341);
  return wrap(control, 155, 341);
}

function recipeIngredientControl({ assets, fixture = { state: 'available' } }) {
  const control = new BrewingRecipeIngredientRow({ instanceId: 1, assetManager: assets });
  const unknown = fixture.state === 'unknown';
  control.bind({ label: 'Mint', quantity: 2, owned: fixture.state === 'missing' ? 0 : 5, available: fixture.state !== 'missing' }, { unknown });
  control.setBounds(0, 0, 180);
  return wrap(control, 180, 20);
}

function createHudModel(state) {
  const active = ['empty', 'missing', 'ready'].includes(state)
    ? null
    : {
        canCollect: state === 'complete',
        durationMs: 5000,
        endTimeMs: 5000,
        key: 'minorManaPotion',
        label: 'Minor Mana Potion',
        phase: state === 'complete' ? 'ready' : 'brewing',
        startedAtMs: 0,
      };
  const selectedRecipe =
    state === 'empty'
      ? null
      : {
          key: 'minorManaPotion',
          label: 'Minor Mana Potion',
          ingredients: [
            {
              itemKey: 'mintHerb',
              label: 'Mint',
              quantity: 2,
              owned: state === 'missing' ? 0 : 2,
            },
          ],
        };
  const primaryId = active
    ? active.canCollect
      ? 'complete'
      : 'cancel'
    : selectedRecipe
      ? 'brew'
      : 'recipes';
  const primaryLabel = active
    ? active.canCollect
      ? 'Bottled'
      : 'Cancel'
    : selectedRecipe
      ? 'Brew'
      : 'Choose Recipe';
  return {
    cauldrons: [
      {
        activeBrew: active,
        brewQuantity: 2,
        canAddIngredient: true,
        canSelectRecipe: true,
        cauldronNumber: 1,
        id: 'cauldron-0',
        ingredients:
          state === 'empty'
            ? []
            : [{ key: 'mintHerb', label: 'Mint', quantity: 2 }],
        level: 2,
        maxBrewQuantity: 3,
        primaryAction: {
          enabled: state !== 'missing' && active?.canCollect !== true,
          id: primaryId,
          label: primaryLabel,
        },
        recipeReadiness: selectedRecipe
          ? {
              hasEnoughIngredients: state !== 'missing',
              hasEnoughMana: true,
            }
          : null,
        selectedRecipe,
        unlocked: true,
      },
    ],
    selectedCauldronIndex: 0,
  };
}

function batchDetailControl({ assets, input, fixture = { state: 'ready' }, context }) {
  const hud = new BrewingHudPixi({ assetManager: assets, inputRouter: input, page: pageStub(input, () => context?.clock.now() ?? 2000), theme: DEFAULT_PIXI_THEME_SNAPSHOT });
  hud.bind(createHudModel(fixture.state), {});
  hud.layout(390);
  const root = new Container({ label: 'brewing-batch-detail-preview' });
  hud.detailPanel.root.position.set(0, 0);
  root.addChild(hud.detailPanel.root);
  return { control: hud, destroy: () => hud.destroy(), height: BREWING_HUD_GEOMETRY.detailHeight, root, width: 358 };
}

function cauldronHearthControl({ assets, fixture = { state: 'idle' }, context }) {
  const control = new BrewingCauldronHearth({ assetManager: assets });
  const reducedMotion = fixture.state === 'reduced-motion';
  const lit = fixture.state !== 'idle';
  const now = context?.clock.now() ?? 1_000;
  control.bind({ lit, visible: true }, now - HEARTH_EDITOR_SETTLE_MS);
  control.setBounds(55, 88);
  control.updateMotion(now, { active: true, reducedMotion });
  if (context?.clock) {
    context.registerCleanup(
      context.clock.subscribe((nextNow) => {
        control.updateMotion(nextNow, { active: true, reducedMotion });
        context.invalidate();
      }),
    );
  }
  return wrap(control, 110, 92);
}

function ingredientSlotControl({ assets, input, fixture = { state: 'filled' }, context }) {
  const control = new BrewingIngredientPickerSlot({ index: 0, assetManager: assets, inputRouter: input, onActivate: () => context?.emit('ingredientSlotActivated') ?? true });
  const empty = fixture.state === 'empty';
  control.bind(empty ? null : { itemKey: 'mintHerb', label: 'Mint', quantity: 2, owned: fixture.state === 'missing' ? 0 : 5 }, { decorative: empty, enabled: fixture.state !== 'used', showMissing: !empty && fixture.state !== 'used', used: fixture.state === 'used' });
  control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  control.setBounds(0, 0, BREWING_HUD_GEOMETRY.ingredientSlotWidth, BREWING_HUD_GEOMETRY.ingredientSlotHeight);
  return wrap(control, BREWING_HUD_GEOMETRY.ingredientSlotWidth, BREWING_HUD_GEOMETRY.ingredientSlotHeight);
}

function automationToggleControl({ assets, input, fixture = { state: 'included' } }) {
  const parent = new Container();
  const dialog = new BrewingAutomationSettingsDialogPixi({ parent, inputRouter: input, assetManager: assets });
  dialog.bind({ cauldronNumber: 1, autoBrewEnabled: fixture.state !== 'unavailable' });
  dialog.toggle.root.position.set(0, 0);
  const root = new Container({ label: 'brewing-automation-toggle-preview' });
  root.addChild(dialog.toggle.root);
  return { control: dialog, destroy: () => dialog.destroy(), height: 36, root, width: 222 };
}

function wrap(control, width, height) {
  return { control, destroy: () => control.destroy(), height, root: control.root, width };
}

function brewingAssetFilter({ id }) {
  const assetId = String(id ?? '');
  return assetId.includes('/ui/') || assetId.includes('/icons/') || assetId.includes('/items/') || assetId.includes('/rooms/brewing/');
}

const HEARTH_EDITOR_SETTLE_MS = 220;
