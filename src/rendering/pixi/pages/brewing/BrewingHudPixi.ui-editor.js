import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import { BrewingHudPixi } from './BrewingHudPixi.js';

export default defineUiEditorIntegration({
  apiVersion: 1,
  childWidgetIds: [
    'text-button',
    'cost-button',
    'compound.market-title-ribbon',
    'compound.brewing-batch-detail',
    'compound.brewing-missing-ingredients-row',
    'compound.brewing-cauldron-hearth',
    'compound.brewing-ingredient-picker-slot',
    'primitive.progress-bar',
  ],
  folderPath: ['Brewing'],
  id: 'feature.brewing-hud',
  kind: 'widget',
  label: 'Brewing HUD',
  sectionId: 'composite-widgets',
  properties: [
    { label: 'Production class', value: 'BrewingHudPixi' },
    { label: 'State source', value: 'Isolated scenario model' },
  ],
  usages: [
    {
      label: 'Brewing room cauldron and batch controls',
      source: 'src/rendering/pixi/pages/brewing/BrewingHudPixi.js',
    },
  ],
  scenarios: [
    {
      fixture: { phase: 'empty' },
      id: 'empty',
      label: 'No potion selected',
      mount: mountBrewing,
    },
    {
      fixture: { phase: 'missing' },
      id: 'missing',
      label: 'Missing ingredients',
      mount: mountBrewing,
    },
    {
      fixture: { phase: 'ready' },
      id: 'ready',
      label: 'Ready to brew',
      mount: mountBrewing,
    },
    {
      fixture: { phase: 'brewing' },
      id: 'brewing',
      label: 'Brewing',
      mount: mountBrewing,
    },
    {
      fixture: { phase: 'complete' },
      id: 'complete',
      label: 'Bottled fallback',
      mount: mountBrewing,
    },
  ],
});

async function mountBrewing(context, fixture) {
  const state = {
    active: ['empty', 'missing', 'ready'].includes(fixture.phase)
      ? null
      : createActiveBrew(fixture.phase),
    ingredients:
      fixture.phase === 'empty'
        ? []
        : [
            { key: 'sageHerb', label: 'Sage', quantity: 1 },
            { key: 'mintHerb', label: 'Mint', quantity: 1 },
          ],
    quantity: 1,
    selectedRecipe:
      fixture.phase === 'empty'
        ? null
        : {
            ingredients: [
              {
                itemKey: 'sageHerb',
                label: 'Sage',
                quantity: 2,
                owned: fixture.phase === 'missing' ? 0 : 2,
              },
              { itemKey: 'mintHerb', label: 'Mint', quantity: 1 },
            ],
            key: 'minorManaPotion',
            label: 'Minor Mana Potion',
            ownedQuantity: 2,
            rarity: 'common',
          },
  };
  let hud = null;
  const createModel = () => ({
    cauldrons: [
      {
        activeBrew: state.active,
        brewQuantity: state.quantity,
        canAddIngredient: true,
        canSelectRecipe: true,
        cauldronNumber: 1,
        id: 'cauldron-0',
        ingredients: state.ingredients,
        level: 2,
        maxBrewQuantity: 3,
        recipeReadiness: state.selectedRecipe
          ? {
              hasEnoughIngredients: fixture.phase !== 'missing',
              hasEnoughMana: true,
            }
          : null,
        primaryAction: state.active
          ? state.active.canCollect
            ? { enabled: false, id: 'complete', label: 'Bottled' }
            : { enabled: true, id: 'cancel', label: 'Cancel' }
          : state.selectedRecipe
            ? {
                enabled: fixture.phase !== 'missing',
                id: 'brew',
                label: 'Brew',
              }
            : { enabled: true, id: 'recipes', label: 'Choose Recipe' },
        quantityAction: {
          enabled: !state.active,
          label: `x${state.quantity}`,
          nextQuantity: state.quantity >= 3 ? 1 : state.quantity + 1,
        },
        selectedRecipe: state.selectedRecipe,
        unlocked: true,
      },
    ],
    configuredMaxCauldrons: 5,
    selectedCauldronIndex: 0,
  });
  const actions = {
    accelerateCauldron: () => {
      const previousRemainingMs = Math.max(
        0,
        Number(state.active?.endTimeMs) - context.clock.now(),
      );
      const reducedMs = Math.min(1_000, previousRemainingMs);
      context.clock.advance(reducedMs);
      context.emit('cauldronAccelerated', {
        reducedSeconds: reducedMs / 1_000,
      });
      refresh();
      return {
        ok: reducedMs > 0,
        reducedSeconds: reducedMs / 1_000,
        remainingMs: Math.max(0, previousRemainingMs - reducedMs),
        cooldownMs: 504,
      };
    },
    openRecipes: () => context.emit('recipesOpened'),
    emptyCauldron: () => {
      context.emit('cauldronEmptied');
      state.ingredients = [];
      state.selectedRecipe = null;
      refresh();
      return true;
    },
    performCauldronAction: () => {
      context.emit('brewStarted', { quantity: state.quantity });
      state.active = createActiveBrew('brewing');
      context.clock.reset(0);
      context.clock.play();
      refresh();
      return true;
    },
    selectBrewQuantity: (quantity) => {
      state.quantity = quantity;
      context.emit('brewQuantityChanged', { quantity });
      refresh();
      return true;
    },
    toggleAutoBrew: () => {
      context.emit('autoBrewToggled');
      return true;
    },
  };
  const page = {
    animateHudBrewIngredients() {},
    getDisplayObjectCenter(displayObject) {
      const bounds = displayObject.getBounds();
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    },
    selectCauldron() { return false; },
    timeSource: () => context.clock.now(),
  };
  const surface = await createUiEditorPixiSurface({
    assetFilter: ({ id }) =>
      id.includes('/ui/') ||
      id.includes('/icons/') ||
      id.includes('/items/') ||
      id.includes('/rooms/brewing/'),
    component: 'BrewingHudPixi',
    createControl: ({ assets, input }) => {
      hud = new BrewingHudPixi({
        assetManager: assets,
        inputRouter: input,
        page,
        theme: DEFAULT_PIXI_THEME_SNAPSHOT,
      });
      hud.bind(createModel(), actions);
      hud.layout(PIXI_UI_GEOMETRY.sourceWidth);
      return {
        destroy: () => hud.destroy(),
        height: 600,
        root: hud.root,
        width: PIXI_UI_GEOMETRY.sourceWidth,
      };
    },
  });

  function refresh() {
    if (!hud) return;
    if (state.active && !state.active.canCollect && context.clock.now() >= 5000) {
      state.active = createActiveBrew('complete');
    }
    hud.bind(createModel(), actions);
    hud.updateActiveTimer(context.clock.now());
    context.invalidate();
  }

  context.registerCleanup(context.clock.subscribe(refresh));
  refresh();
  return {
    ...surface,
    controls: [
      {
        getValue: () => state.quantity,
        id: 'quantity',
        label: 'Batch quantity',
        max: 3,
        min: 1,
        setValue: (value) => {
          state.quantity = Math.max(1, Math.min(3, Number(value) || 1));
          refresh();
        },
        step: 1,
        type: 'range',
      },
    ],
    actions: [
      { id: 'start', label: 'Start brew', enabled: () => !state.active, run: actions.performCauldronAction },
      { id: 'empty', label: 'Empty cauldron', enabled: () => !state.active && Boolean(state.selectedRecipe || state.ingredients.length), run: actions.emptyCauldron },
      { id: 'advance', label: 'Advance 1s', enabled: () => Boolean(state.active), run: () => context.clock.advance(1000) },
      { id: 'complete', label: 'Complete', enabled: () => Boolean(state.active), run: () => context.clock.advance(5000) },
    ],
  };
}

function createActiveBrew(phase) {
  const complete = phase === 'complete';
  return {
    canCollect: complete,
    durationMs: 5000,
    endTimeMs: 5000,
    key: 'minorManaPotion',
    label: 'Minor Mana Potion',
    phase: complete ? 'ready' : 'brewing',
    startedAtMs: 0,
  };
}
