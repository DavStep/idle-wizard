import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
import { BrewingHudPixi } from './BrewingHudPixi.js';

const LAB_PANEL_BORDER = Object.freeze({
  top: 12,
  right: 12,
  bottom: 12,
  left: 12,
});
const BREWING_LAB_THEME = Object.freeze({
  ...DEFAULT_PIXI_THEME_SNAPSHOT,
  frames: Object.freeze({
    ...DEFAULT_PIXI_THEME_SNAPSHOT.frames,
    panelBorder: LAB_PANEL_BORDER,
  }),
});

export default defineUiEditorIntegration({
  apiVersion: 1,
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
    { fixture: { phase: 'ready' }, id: 'ready', label: 'Ready to brew', mount: mountBrewing },
    { fixture: { phase: 'brewing' }, id: 'brewing', label: 'Brewing', mount: mountBrewing },
    { fixture: { phase: 'complete' }, id: 'complete', label: 'Ready to collect', mount: mountBrewing },
  ],
});

async function mountBrewing(context, fixture) {
  const state = {
    active: fixture.phase === 'ready' ? null : createActiveBrew(fixture.phase),
    quantity: 1,
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
        ingredients: [
          { key: 'sageHerb', label: 'Sage', quantity: 1 },
          { key: 'mintHerb', label: 'Mint', quantity: 1 },
        ],
        level: 2,
        maxBrewQuantity: 3,
        primaryAction: state.active
          ? state.active.canCollect
            ? { enabled: true, id: 'collect', label: 'Collect' }
            : { enabled: true, id: 'cancel', label: 'Cancel' }
          : { enabled: true, id: 'brew', label: 'Brew' },
        quantityAction: {
          enabled: !state.active,
          label: `x${state.quantity}`,
          nextQuantity: state.quantity >= 3 ? 1 : state.quantity + 1,
        },
        selectedRecipe: {
          ingredients: [
            { itemKey: 'sageHerb', label: 'Sage', quantity: 1 },
            { itemKey: 'mintHerb', label: 'Mint', quantity: 1 },
          ],
          key: 'minorManaPotion',
          label: 'Minor Mana Potion',
          ownedQuantity: 2,
          rarity: 'common',
        },
        unlocked: true,
      },
    ],
    configuredMaxCauldrons: 5,
    selectedCauldronIndex: 0,
  });
  const actions = {
    collectBrew: () => {
      context.emit('brewCollected', { potion: 'minorManaPotion' });
      state.active = null;
      refresh();
      return true;
    },
    openRecipes: () => context.emit('recipesOpened'),
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
      id.includes('/rooms/brewing/'),
    component: 'BrewingHudPixi',
    createControl: ({ assets, input }) => {
      hud = new BrewingHudPixi({
        assetManager: assets,
        inputRouter: input,
        page,
        theme: BREWING_LAB_THEME,
      });
      hud.bind(createModel(), actions);
      return {
        destroy: () => hud.destroy(),
        height: 600,
        root: hud.root,
        width: 390,
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
      { id: 'advance', label: 'Advance 1s', enabled: () => Boolean(state.active), run: () => context.clock.advance(1000) },
      { id: 'complete', label: 'Complete', enabled: () => Boolean(state.active), run: () => context.clock.advance(5000) },
      { id: 'collect', label: 'Collect', enabled: () => state.active?.canCollect === true, run: actions.collectBrew },
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
