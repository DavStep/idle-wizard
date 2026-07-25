// @vitest-environment jsdom

import {
  createPixiAssetManagerFake,
} from '../workshop/PixiPageTestHarness.js';
import { Container, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { PixiInputRouter } from '../../input/PixiInputRouter.js';
import { PixiDialogFrame } from '../../primitives/PixiDialogFrame.js';
import { PixiOwnedDialogSurface } from '../../primitives/PixiOwnedDialogSurface.js';
import { DialogRegistry } from '../../retained/DialogRegistry.js';
import { PageRegistry } from '../../retained/PageRegistry.js';
import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import {
  BREWING_PIXI_GEOMETRY,
  BrewingPixiPage,
} from './BrewingPixiPage.js';

describe('BrewingPixiPage', () => {
  it('builds once and keeps keyed cauldrons, rows, and inventory widgets', () => {
    const harness = createHarness();
    const pages = new PageRegistry({
      pages: [['brewing', harness.page]],
    });
    pages.bind('brewing', createBrewingViewModel());
    pages.activate('brewing');
    const root = harness.page.getDisplayObject();
    const cauldron = harness.page.cauldrons.get('cauldron-0');
    const ingredient = cauldron.rows.get('sage-slot');
    const herb = harness.page.herbInventory.rows.get('sage-herb');

    pages.bind(
      'brewing',
      createBrewingViewModel({
        ingredientQuantity: 2,
        herbQuantity: 7,
      }),
    );

    expect(harness.page.getDisplayObject()).toBe(root);
    expect(harness.page.cauldrons.get('cauldron-0')).toBe(cauldron);
    expect(cauldron.rows.get('sage-slot')).toBe(ingredient);
    expect(harness.page.herbInventory.rows.get('sage-herb')).toBe(herb);
    expect(harness.page.cauldronPool.getStats()).toMatchObject({
      allocated: 1,
      active: 1,
      highWaterMark: 1,
    });
    expect(cauldron.rowPool.getStats()).toMatchObject({
      allocated: 1,
      active: 1,
      highWaterMark: 1,
    });
    expect(ingredient.count.text).toBe('2 ');
    expect(herb.quantity.text).toBe('7');

    pages.destroy();
    harness.dispose();
  });

  it('windows collapsed inventory rows and reuses the expanded high-water pool', () => {
    const harness = createHarness();
    const createModel = (expanded) => {
      const model = createBrewingViewModel();
      model.brewing.inventory.herbs = {
        expanded,
        canToggle: true,
        countText: expanded ? '8/8' : '6/8',
        rows: Array.from({ length: 8 }, (_, index) => ({
          id: `herb-${index + 1}`,
          itemTypeId: index + 1,
          key: `herb-${index + 1}`,
          label: `herb ${index + 1}`,
          availableQuantity: index + 1,
        })),
      };
      return model;
    };

    harness.page.bind(createModel(false));
    const collapsedHeight = harness.page.herbInventory.height;
    expect(harness.page.herbInventory.rows.getWidgets()).toHaveLength(6);
    expect(harness.page.herbInventory.count.text).toBe('6/8');
    expect(harness.page.herbInventory.toggle.text).toBe('expand');

    harness.page.bind(createModel(true));
    const expandedHeight = harness.page.herbInventory.height;
    expect(harness.page.herbInventory.rows.getWidgets()).toHaveLength(8);
    expect(harness.page.herbInventory.count.text).toBe('8/8');
    expect(harness.page.herbInventory.toggle.text).toBe('collapse');
    expect(expandedHeight).toBeGreaterThan(collapsedHeight);
    expect(harness.page.herbInventory.rowPool.getStats()).toMatchObject({
      allocated: 8,
      active: 8,
      highWaterMark: 8,
    });

    harness.page.bind(createModel(false));
    expect(harness.page.herbInventory.rows.getWidgets()).toHaveLength(6);
    expect(harness.page.herbInventory.height).toBe(collapsedHeight);
    expect(harness.page.herbInventory.rowPool.getStats()).toMatchObject({
      allocated: 8,
      active: 6,
      available: 2,
      highWaterMark: 8,
    });

    harness.page.bind(createModel(true));
    expect(harness.page.herbInventory.rows.getWidgets()).toHaveLength(8);
    expect(harness.page.herbInventory.rowPool.getStats()).toMatchObject({
      allocated: 8,
      active: 8,
      highWaterMark: 8,
    });

    harness.page.destroy();
    harness.dispose();
  });

  it('routes nested cauldron actions, herb drag/drop, dialogs, and semantic targets', () => {
    const selectCauldron = vi.fn(() => true);
    const primaryAction = vi.fn(() => true);
    const dropHerb = vi.fn(() => true);
    const selectRecipe = vi.fn(() => true);
    const harness = createHarness();
    harness.page.bind(
      createBrewingViewModel({
        selectCauldron,
        primaryAction,
        dropHerb,
      }),
    );
    harness.page.activate();

    expect(
      harness.semanticTargets.activate('brewing.cauldron.0'),
    ).toBe(true);
    expect(selectCauldron).toHaveBeenCalledWith(
      0,
      expect.objectContaining({ id: 'cauldron-0' }),
    );
    expect(
      harness.semanticTargets.activate(
        'brewing.cauldron.0.primary',
      ),
    ).toBe(true);
    expect(primaryAction).toHaveBeenCalledTimes(1);
    expect(
      harness.semanticTargets.getTutorialTarget('brewing:action')
        ?.semanticId,
    ).toBe('brewing.cauldron.0.primary');
    expect(
      harness.inputRouter.store.getRegistrations('drag'),
    ).toHaveLength(1);
    expect(
      harness.inputRouter.store.getRegistrations('drop'),
    ).toHaveLength(1);
    expect(
      harness.page.cauldrons
        .get('cauldron-0')
        .root.listenerCount('pointertap'),
    ).toBe(0);

    const drop = harness.inputRouter.store.getRegistrations('drop')[0];
    expect(
      drop.onDrop({
        data: {
          kind: 'herb',
          item: { id: 'sage-herb' },
        },
      }),
    ).toBe(true);
    expect(dropHerb).toHaveBeenCalledTimes(1);

    expect(harness.dialogs.hasInstance('brewing.recipes')).toBe(
      false,
    );
    harness.page.openDialog('recipes', {
      cauldronIndex: 0,
      recipes: [
        {
          id: 'sage-tonic',
          key: 'sage-tonic',
          label: 'sage tonic',
          unlocked: true,
          ingredients: [],
        },
      ],
      actions: { selectRecipe },
    });
    const dialog = harness.dialogs.get('brewing.recipes');
    expect(dialog).not.toBeNull();
    expect(dialog.modal).toBeInstanceOf(PixiOwnedDialogSurface);
    expect(dialog.modal.panel).toBeInstanceOf(PixiDialogFrame);
    expect(dialog.modal.openMotion).toBe('center');
    expect(harness.inputRouter.getTopModal()?.id).toBe(
      'brewing.recipes',
    );
    expect(
      harness.semanticTargets.activate(
        'brewing.recipe.sage-tonic',
      ),
    ).toBe(true);
    expect(selectRecipe).toHaveBeenCalledTimes(1);

    harness.dialogs.close('brewing.recipes');
    harness.page.openDialog('recipes', { recipes: [] });
    expect(harness.dialogs.get('brewing.recipes')).toBe(dialog);
    expect(harness.dialogs.getStats().constructed).toBe(1);

    harness.page.destroy();
    harness.dispose();
    expect(
      harness.inputRouter.store.getRegistrations(),
    ).toHaveLength(0);
  });

  it('keeps frozen Brewing geometry, initial fit, and timer/ticker lifecycle', () => {
    const ticker = {
      add: vi.fn(),
      remove: vi.fn(),
    };
    const harness = createHarness({ ticker });
    harness.page.bind(
      createBrewingViewModel({ withActiveBrew: true }),
    );
    const cauldron = harness.page.cauldrons.get('cauldron-0');

    expect(harness.page.worldViewport.position).toMatchObject({
      x: 0,
      y: BREWING_PIXI_GEOMETRY.worldTop,
    });
    expect(harness.page.worldViewportHeight).toBeCloseTo(
      2170 / 3 -
        BREWING_PIXI_GEOMETRY.worldTop -
        BREWING_PIXI_GEOMETRY.worldBottom,
    );
    expect(cauldron.root.position).toMatchObject({ x: 122, y: 112 });
    expect(cauldron.buttons.primary.root.position).toMatchObject({
      x: 416,
      y: 34,
    });
    expect(harness.page.herbsButton.root.position).toMatchObject({
      x: 16,
      y: 2170 / 3 - 162 - 6 - 80.25,
    });
    expect(harness.page.potionsButton.root.position).toMatchObject({
      x: 298.5,
      y: 2170 / 3 - 162 - 6 - 80.25,
    });
    expect(harness.page.worldZoom).toBeCloseTo(328 / 516);
    expect(cauldron.progress.progress).toBeCloseTo(0.5);
    expect(cauldron.progress).toMatchObject({
      tone: 'blue',
      height: 10,
    });

    harness.page.activate();
    expect(ticker.add).toHaveBeenCalledWith(
      harness.page.tickHandler,
    );
    harness.page.deactivate();
    expect(ticker.remove).toHaveBeenCalledWith(
      harness.page.tickHandler,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('renders projected cauldron and herb notifications without rebuilding controls', () => {
    const harness = createHarness();
    const activeModel = createBrewingViewModel();
    activeModel.brewing.cauldrons[0].notification = 'orange';
    activeModel.brewing.inventory.herbs.rows[0].notification = true;
    harness.page.bind(activeModel);

    const cauldron = harness.page.cauldrons.get('cauldron-0');
    const primaryBadge = cauldron.buttons.primary.notification;
    const herb = harness.page.herbInventory.rows.get('sage-herb');
    const herbBadge = herb.notification;
    const primaryRoot = primaryBadge.root;
    const herbRoot = herbBadge.root;

    expect(primaryBadge.root.parent).toBe(
      cauldron.buttons.primary.root,
    );
    expect(primaryBadge.root.position).toMatchObject({
      x: BREWING_PIXI_GEOMETRY.actionWidth,
      y: 0,
    });
    expect(primaryBadge.root.visible).toBe(true);
    expect(primaryBadge.model.tone).toBe('orange');
    expect(herbBadge.root.parent).toBe(herb.root);
    expect(herbBadge.root.visible).toBe(true);
    expect(herbBadge.root.x).toBeGreaterThan(
      herb.label.x + herb.label.width,
    );
    expect(herbBadge.root.y).toBe(herb.label.y);

    const suppressedModel = createBrewingViewModel();
    suppressedModel.brewing.cauldrons[0].notification = false;
    suppressedModel.brewing.inventory.herbs.rows[0].notification =
      false;
    harness.page.bind(suppressedModel);

    expect(cauldron.buttons.primary.notification.root).toBe(
      primaryRoot,
    );
    expect(herb.notification.root).toBe(herbRoot);
    expect(primaryBadge.root.visible).toBe(false);
    expect(herbBadge.root.visible).toBe(false);
    expect(cauldron.buttons.primary.enabled).toBe(true);
    expect(herb.enabled).toBe(true);

    harness.page.destroy();
    harness.dispose();
  });

  it('retains separate regular and cost controls when a cauldron becomes buyable', () => {
    const buyCauldron = vi.fn(() => true);
    const harness = createHarness();
    harness.page.bind(createBrewingViewModel());

    const cauldron =
      harness.page.cauldrons.get('cauldron-0');
    const primary = cauldron.buttons.primary;
    const root = primary.root;
    const regularControl = primary.button.root;
    const costControl = primary.costButton;

    expect(regularControl.visible).toBe(true);
    expect(costControl.visible).toBe(false);
    expect(primary.button.control.variant).toBe('yellow');

    harness.page.bind(
      createBuyCauldronViewModel({
        canBuy: false,
        onActivate: buyCauldron,
      }),
    );

    expect(harness.page.cauldrons.get('cauldron-0')).toBe(
      cauldron,
    );
    expect(primary.root).toBe(root);
    expect(primary.button.root).toBe(regularControl);
    expect(primary.costButton).toBe(costControl);
    expect(regularControl.visible).toBe(false);
    expect(costControl.visible).toBe(true);
    expect(costControl.compact).toBe(true);
    expect(costControl.background.visible).toBe(false);
    expect(costControl.compactBackground.visible).toBe(true);
    expect(costControl.buttonWidth).toBe(
      BREWING_PIXI_GEOMETRY.actionWidth,
    );
    expect(costControl.buttonHeight).toBe(
      BREWING_PIXI_GEOMETRY.actionHeight,
    );
    expect(costControl.amountLabel.text).toBe('3');
    expect(costControl.resource).toBe('coin');
    expect(costControl.amountLabel.visible).toBe(true);
    expect(costControl.lockedLabel.visible).toBe(false);
    expect(costControl.enabled).toBe(false);

    harness.page.bind(
      createBuyCauldronViewModel({
        canBuy: true,
        onActivate: buyCauldron,
      }),
    );

    expect(primary.costButton).toBe(costControl);
    expect(costControl.enabled).toBe(true);
    expect(
      harness.semanticTargets.activate(
        'brewing.cauldron.0.primary',
      ),
    ).toBe(true);
    expect(buyCauldron).toHaveBeenCalledOnce();

    harness.page.bind(createBrewingViewModel());

    expect(primary.button.root).toBe(regularControl);
    expect(primary.costButton).toBe(costControl);
    expect(regularControl.visible).toBe(true);
    expect(costControl.visible).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('constructs the selected-recipe choice dialog once and routes its exact actions', () => {
    const clearRecipe = vi.fn(() => true);
    const chooseAnother = vi.fn(() => true);
    const harness = createHarness();
    harness.page.bind(createBrewingViewModel());

    harness.page.openDialog('choice', {
      cauldronIndex: 2,
      onClearRecipe: clearRecipe,
      onChooseAnother: chooseAnother,
    });
    const choice = harness.dialogs.get('brewing.recipe-choice');
    expect(choice.modal).toBeInstanceOf(PixiOwnedDialogSurface);
    expect(choice.modal.panel).toBeInstanceOf(PixiDialogFrame);
    expect(choice.modal.openMotion).toBe('center');
    expect(choice.clear.label.text).toBe('clear recipe');
    expect(choice.choose.label.text).toBe('choose another recipe');
    expect(choice.runAction('clearRecipe')).toBe(true);
    expect(clearRecipe).toHaveBeenCalledWith(2);

    harness.page.openDialog('choice', {
      cauldronIndex: 2,
      onChooseAnother: chooseAnother,
    });
    expect(harness.dialogs.get('brewing.recipe-choice')).toBe(choice);
    expect(choice.runAction('chooseAnother')).toBe(true);
    expect(chooseAnother).toHaveBeenCalledWith(2);
    expect(
      harness.dialogs.getStats().constructed,
    ).toBe(1);

    harness.page.destroy();
    harness.dispose();
  });

  it('previews picked herb counts and settles pooled drag-return motion', () => {
    let now = 0;
    const harness = createHarness({ timeSource: () => now });
    harness.page.bind(createBrewingViewModel());
    const herb = harness.page.herbInventory.rows.get('sage-herb');

    herb.setPressed(true);

    expect(herb.picked).toBe(true);
    expect(herb.quantity.text).toBe('3');
    now = 130;
    harness.page.tick(now);
    expect(herb.root.rotation).toBeGreaterThan(0);

    const dragData = harness.page.beginHerbDrag(herb, {});
    expect(dragData).toMatchObject({
      kind: 'herb',
      item: { key: 'sage' },
    });
    expect(harness.page.motionGhostPool.getStats().active).toBe(1);

    harness.page.cancelHerbDrag(herb, {});
    expect(herb.picked).toBe(false);
    expect(herb.quantity.text).toBe('4');
    expect(harness.page.activeGhostMotions.size).toBe(1);

    now = 200;
    harness.page.tick(now);
    expect(herb.root.x).toBeLessThan(herb.layoutX + herb.layoutWidth / 2);
    now = 320;
    harness.page.tick(now);
    expect(harness.page.motionGhostPool.getStats().active).toBe(0);
    expect(herb.root.position).toMatchObject({
      x: herb.layoutX,
      y: herb.layoutY,
    });
    expect(herb.root.rotation).toBe(0);

    harness.page.beginHerbDrag(herb, {});
    harness.page.cancelHerbDrag(herb, {});
    now = 510;
    harness.page.tick(now);
    expect(harness.page.motionGhostPool.getStats()).toMatchObject({
      allocated: 1,
      active: 0,
      highWaterMark: 1,
    });

    harness.page.destroy();
    harness.dispose();
  });

  it('plays code-backed cauldron, recipe, brew-drop, and purchase motion then clears on deactivate', () => {
    let now = 0;
    const ticker = {
      add: vi.fn(),
      remove: vi.fn(),
    };
    const harness = createHarness({
      ticker,
      timeSource: () => now,
    });
    const brew = vi.fn(() => ({ ok: true }));
    harness.page.bind(
      createBrewingViewModel({ primaryAction: brew }),
    );
    harness.page.activate();
    const cauldron = harness.page.cauldrons.get('cauldron-0');

    expect(cauldron.activateAction('primary')).toEqual({ ok: true });
    expect(harness.page.activeGhostMotions.size).toBe(1);
    expect(harness.page.motionGhostPool.getStats().active).toBe(1);

    now = 240;
    harness.page.tick(now);
    expect(harness.page.motionGhostPool.getStats().active).toBe(0);
    expect(cauldron.receiveMotionStart).toBe(240);

    now = 310;
    harness.page.tick(now);
    expect(cauldron.artLayer.scale.x).not.toBe(1);
    expect(cauldron.recipeLayer.y).toBeGreaterThan(0);

    harness.page.bind(
      createBuyCauldronViewModel({ canBuy: true }),
    );
    now = 320;
    harness.page.bind(createBrewingViewModel());
    const bought = harness.page.cauldrons.get('cauldron-0');
    expect(bought.purchaseMotionStart).toBe(320);
    expect(bought.root.alpha).toBeCloseTo(0.72);

    harness.page.deactivate();
    expect(ticker.remove).toHaveBeenCalledWith(
      harness.page.tickHandler,
    );
    expect(harness.page.activeGhostMotions.size).toBe(0);
    expect(bought.purchaseMotionStart).toBeNull();
    expect(bought.root.scale.x).toBe(1);
    expect(bought.root.alpha).toBe(1);

    harness.page.destroy();
    harness.dispose();
  });

  it('rejects failed herb drops without playing receive feedback', () => {
    const harness = createHarness();
    harness.page.bind(
      createBrewingViewModel({
        dropHerb: vi.fn(() => ({ ok: false })),
      }),
    );
    const cauldron = harness.page.cauldrons.get('cauldron-0');
    const drop =
      harness.inputRouter.store.getRegistrations('drop')[0];

    expect(
      drop.onDrop({
        data: {
          kind: 'herb',
          item: { id: 'sage-herb' },
        },
      }),
    ).toBe(false);
    expect(cauldron.receiveMotionStart).toBeNull();

    harness.page.destroy();
    harness.dispose();
  });

  it('renders the approved carousel HUD with six visual ingredient slots and retained feedback', () => {
    let now = 0;
    const harness = createHarness({ timeSource: () => now });
    const model = createBrewingViewModel();
    model.brewing.cauldrons[0].autoBrewEnabled = true;
    model.brewing.cauldrons[0].autoCollectEnabled = false;
    model.brewing.cauldrons.push({
      id: 'buy:2',
      cauldronIndex: 1,
      cauldronNumber: 2,
      unlocked: false,
      canBuyCauldron: true,
      nextCauldronCost: 25,
    });
    model.brewing.configuredMaxCauldrons = 5;
    harness.page.bind(model);

    expect(harness.page.hud.root.visible).toBe(true);
    expect(harness.page.worldViewport.visible).toBe(false);
    expect(harness.page.hud.ingredientSlots).toHaveLength(6);
    expect(harness.page.hud.ingredientSlots[5].decorative).toBe(true);
    expect(Object.keys(harness.page.hud.actionIcons)).toEqual([
      'recipes',
      'autoBrew',
      'brew',
      'settings',
      'cancel',
    ]);
    expect(harness.page.hud.actionIcons.recipes.parent).toBe(
      harness.page.hud.recipes.control.visual,
    );
    expect(harness.page.hud.actionIcons.brew.iconSprites).toHaveLength(3);
    expect(harness.page.hud.actionIcons.settings.label).toBe(
      'brewing-settings-action-icon',
    );
    expect(harness.page.hud.actionIcons.cancel.parent).toBe(
      harness.page.hud.cancel.control.visual,
    );
    expect(harness.page.hud.cancel.text.text).toBe('cancel');
    expect(harness.page.hud.recipes.control.textLabel.x).toBeGreaterThan(
      harness.page.hud.recipes.width / 2,
    );
    expect(harness.page.hud.actionIcons.cancel.alpha).toBe(0.5);
    expect(harness.page.hud.getCauldrons()).toHaveLength(2);
    const carouselSwipe = harness.inputRouter.store
      .getRegistrations('swipe')
      .find((registration) => registration.id === 'brewing.cauldron.carousel.swipe');
    expect(carouselSwipe.priority).toBe(10);
    expect(carouselSwipe.onSwipe({ direction: 'next' })).toBe(true);
    expect(harness.page.hud.selectedIndex).toBe(1);

    expect(harness.page.hud.lockArt.visible).toBe(true);
    expect(harness.page.selectCauldron(0)).toBe(true);

    expect(harness.page.hud.fastForward.handleTap()).toBe(true);
    expect(harness.page.toastText.text).toBe('coming soon');
    expect(harness.page.toast.visible).toBe(true);
    now = 1_601;
    harness.page.tick(now);
    expect(harness.page.toast.visible).toBe(false);

    expect(harness.page.openAutomationSettings()).toBe(true);
    const settings = harness.dialogs.get('brewing.automation-settings');
    expect(settings.toggle.text.text).toBe('auto collect off');

    harness.page.destroy();
    harness.dispose();
  });
});

function createHarness({ ticker = null, timeSource = () => 0 } = {}) {
  const dialogLayer = new Container();
  const dialogs = new DialogRegistry();
  const inputRouter = new PixiInputRouter();
  const semanticTargets = new SemanticTargetRegistry();
  const page = new BrewingPixiPage({
    assetManager: createPixiAssetManagerFake(Texture),
    dialogLayer,
    dialogRegistry: dialogs,
    inputRouter,
    semanticTargets,
    ticker,
    timeSource,
  });

  return {
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

function createBrewingViewModel({
  ingredientQuantity = 1,
  herbQuantity = 4,
  selectCauldron = vi.fn(() => true),
  primaryAction = vi.fn(() => true),
  dropHerb = vi.fn(() => true),
  withActiveBrew = false,
} = {}) {
  return {
    brewing: {
      now: 0,
      cauldrons: [
        {
          id: 'cauldron-0',
          cauldronIndex: 0,
          cauldronNumber: 1,
          unlocked: true,
          maxIngredients: 3,
          ingredients: [
            {
              id: 'sage-slot',
              key: 'sage',
              label: 'sage',
              quantity: ingredientQuantity,
              removable: true,
            },
          ],
          activeBrew: withActiveBrew
            ? {
                key: 'sage-tonic',
                label: 'sage tonic',
                durationMs: 10_000,
                endTimeMs: 5_000,
              }
            : null,
          preview: {
            key: 'sage-tonic',
            label: 'sage tonic',
          },
          canSelectRecipe: true,
          primaryAction: {
            id: 'brew',
            label: 'brew',
            enabled: true,
            onActivate: primaryAction,
          },
          quantityAction: {
            label: 'x1',
            enabled: true,
            nextQuantity: 2,
          },
          autoAction: {
            label: 'manual',
            enabled: true,
          },
          acceptsHerbDrop: true,
        },
      ],
      inventory: {
        activeTab: 'herbs',
        herbs: {
          rows: [
            {
              id: 'sage-herb',
              key: 'sage',
              label: 'sage',
              availableQuantity: herbQuantity,
            },
          ],
        },
        potions: {
          rows: [],
        },
      },
    },
    actions: {
      selectCauldron,
      dropHerb,
    },
  };
}

function createBuyCauldronViewModel({
  canBuy,
  onActivate,
} = {}) {
  return {
    brewing: {
      now: 0,
      cauldrons: [
        {
          id: 'cauldron-0',
          cauldronIndex: 0,
          cauldronNumber: 2,
          unlocked: false,
          canBuyCauldron: canBuy === true,
          nextCauldronCost: 3,
          primaryAction: {
            id: 'buy',
            label: 'buy',
            hasCost: true,
            costText: '3 coin',
            costResource: 'coin',
            enabled: canBuy === true,
            disabled: canBuy !== true,
            onActivate,
          },
        },
      ],
      inventory: {
        activeTab: 'herbs',
        herbs: { rows: [] },
        potions: { rows: [] },
      },
    },
  };
}
