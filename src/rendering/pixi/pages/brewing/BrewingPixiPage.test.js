// @vitest-environment jsdom

import {
  createPixiAssetManagerFake,
} from '../workshop/PixiPageTestHarness.js';
import { Container, Sprite, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { PixiInputRouter } from '../../input/PixiInputRouter.js';
import { PixiDialogFrame } from '../../primitives/PixiDialogFrame.js';
import { PixiTextButton } from '../../primitives/PixiTextButton.js';
import { PixiOwnedDialogSurface } from '../../primitives/PixiOwnedDialogSurface.js';
import { DialogRegistry } from '../../retained/DialogRegistry.js';
import { PageRegistry } from '../../retained/PageRegistry.js';
import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import {
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
  resolvePixiTextStrokeWidth,
} from '../../theme/PixiThemeTokens.js';
import { RootRunInventoryChoiceDialogPixi } from '../shared/RootRunInventoryChoiceDialogPixi.js';
import {
  BREWING_PIXI_GEOMETRY,
  BrewingPixiPage,
} from './BrewingPixiPage.js';
import {
  BREWING_HUD_GEOMETRY,
  resolveBrewingPrimaryState,
} from './BrewingHudPixi.js';

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

  it('gives ingredient slots the shared button press animation and tap haptic', () => {
    const harness = createHarness();
    harness.page.bind(createBrewingViewModel());
    harness.page.activate();

    const slot = harness.page.hud.ingredientSlots[0];
    const registration = harness.inputRouter.store
      .getRegistrations('press')
      .find((candidate) => candidate.displayObject === slot.root);

    expect(slot.control).toBeInstanceOf(PixiTextButton);
    expect(registration).toMatchObject({
      excludePageSwipe: true,
      onPressChange: expect.any(Function),
    });
    expect(registration.haptic()).toBe('light');
    expect(slot.icon.position).toMatchObject({
      x: BREWING_HUD_GEOMETRY.ingredientSlotWidth / 2,
      y: BREWING_HUD_GEOMETRY.ingredientIconCenterY,
    });
    expect(slot.icon.width).toBe(BREWING_HUD_GEOMETRY.ingredientIconSize);
    expect(slot.icon.height).toBe(BREWING_HUD_GEOMETRY.ingredientIconSize);
    expect(slot.name.position).toMatchObject({
      x: BREWING_HUD_GEOMETRY.ingredientSlotWidth / 2,
      y: BREWING_HUD_GEOMETRY.ingredientNameY,
    });
    expect(slot.name.style.fontSize).toBe(10);
    expect(slot.name.style.lineHeight).toBe(11);

    registration.onPressChange(true, { confirmed: false });
    expect(slot.control.visual.scale.x).toBe(0.94);
    expect(slot.control.visual.scale.y).toBe(0.94);
    expect(slot.frame.alpha).toBe(1);

    registration.onPressChange(false, {
      confirmed: false,
      cancelled: true,
    });
    expect(slot.control.visual.scale.x).toBe(1);
    expect(slot.control.visual.scale.y).toBe(1);
    expect(slot.frame.alpha).toBe(1);

    harness.page.destroy();
    harness.dispose();
  });

  it('empties the selected cauldron from the compact release-only action', () => {
    const emptyCauldron = vi.fn(() => ({ ok: true }));
    const harness = createHarness();
    const model = createBrewingViewModel();
    model.actions.emptyCauldron = emptyCauldron;
    harness.page.bind(model);
    harness.page.activate();

    const button = harness.page.hud.emptyCauldron;
    const registration = harness.inputRouter.store
      .getRegistrations('press')
      .find((candidate) => candidate.displayObject === button.root);

    expect(button.control).toBeInstanceOf(PixiTextButton);
    expect(button.text.text).toBe('Empty');
    expect(button.variant).toBe('icon');
    expect(button.control.rootRunFrame.visible).toBe(false);
    expect(button.control.inlineBacking.visible).toBe(false);
    expect(button.enabled).toBe(true);
    expect(button.root.visible).toBe(true);
    expect(button.root.position).toMatchObject({
      x:
        PIXI_UI_GEOMETRY.sourceWidth -
        BREWING_HUD_GEOMETRY.edge -
        BREWING_HUD_GEOMETRY.emptyButtonWidth,
      y:
        BREWING_HUD_GEOMETRY.detailTop -
        BREWING_HUD_GEOMETRY.emptyButtonHeight -
        BREWING_HUD_GEOMETRY.emptyButtonGapAboveDetail,
    });
    expect(
      harness.page.hud.actionIcons.emptyCauldron.iconSprites[0],
    ).toMatchObject({
      width: BREWING_HUD_GEOMETRY.emptyIconWidth,
      height: BREWING_HUD_GEOMETRY.emptyIconHeight,
    });
    expect(registration).toMatchObject({
      excludePageSwipe: true,
      onActivate: expect.any(Function),
      onPressChange: expect.any(Function),
    });

    registration.onPressChange(true, { confirmed: false });
    expect(emptyCauldron).not.toHaveBeenCalled();
    expect(registration.onActivate({ source: 'pointer' })).toEqual({
      ok: true,
    });
    expect(emptyCauldron).toHaveBeenCalledWith(0);

    model.brewing.cauldrons[0].ingredients = [];
    model.brewing.cauldrons[0].selectedRecipe = null;
    harness.page.bind(model);
    expect(button.enabled).toBe(false);
    expect(button.root.visible).toBe(true);

    model.brewing.cauldrons[0].ingredients = [
      { key: 'sageHerb', label: 'Sage', quantity: 1 },
    ];
    model.brewing.cauldrons[0].activeBrew = {
      key: 'manaTonic',
      label: 'Mana Tonic',
      phase: 'brewing',
    };
    harness.page.bind(model);
    expect(button.enabled).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('shows a red zero for a missing selected-recipe ingredient slot', () => {
    const harness = createHarness();
    const model = createBrewingViewModel();
    model.brewing.cauldrons[0].ingredients = [];
    model.brewing.cauldrons[0].selectedRecipe = {
      key: 'sage-tonic',
      label: 'sage tonic',
      ingredients: [
        {
          key: 'sage',
          label: 'sage',
          owned: 0,
          quantity: 1,
        },
      ],
    };

    harness.page.bind(model);

    const slot = harness.page.hud.ingredientSlots[0];
    expect(slot.missingCount.text).toBe('0');
    expect(slot.missingCount.style.fill).toBe('#c1121f');
    expect(slot.requiredCount.text).toBe('/1');
    expect(slot.requiredCount.style.fill).toBe('#d4d4d4');
    expect(slot.missingCount.visible).toBe(true);
    expect(slot.requiredCount.visible).toBe(true);

    model.brewing.cauldrons[0].ingredients = [
      {
        key: 'sage',
        label: 'sage',
        quantity: 1,
      },
    ];
    harness.page.bind(model);

    expect(slot.missingCount.visible).toBe(false);
    expect(slot.requiredCount.visible).toBe(false);

    harness.page.destroy();
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
    const performCauldronAction = vi.fn(() => true);
    const dropHerb = vi.fn(() => true);
    const openHerbPicker = vi.fn(() => true);
    const selectHerb = vi.fn((herb) => ({
      ok: true,
      item: herb,
      quantity: 1,
      maxQuantity: 4,
    }));
    const selectRecipe = vi.fn(() => true);
    const harness = createHarness();
    const viewModel = createBrewingViewModel({
      selectCauldron,
      primaryAction,
      dropHerb,
    });
    viewModel.actions.performCauldronAction = performCauldronAction;
    viewModel.actions.openHerbPicker = openHerbPicker;
    harness.page.bind(viewModel);
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
    const brewingActionTarget =
      harness.semanticTargets.getTutorialTarget('brewing:action');
    expect(brewingActionTarget?.semanticId).toBe('brewing.brew');
    expect(brewingActionTarget?.displayObject).toBe(
      harness.page.hud.brew.root,
    );
    expect(
      harness.semanticTargets
        .getTutorialTargets('brewing:action')
        .map(({ semanticId }) => semanticId),
    ).toEqual(['brewing.brew']);
    expect(
      harness.semanticTargets.activate(brewingActionTarget.semanticId),
    ).toBe(true);
    expect(performCauldronAction).toHaveBeenCalledWith(
      viewModel.brewing.cauldrons[0],
      viewModel.brewing.cauldrons[0].primaryAction,
    );
    expect(
      harness.semanticTargets.getTutorialTarget('brewing:recipes')
        ?.semanticId,
    ).toBe('brewing.recipes');
    expect(
      harness.semanticTargets.activate('brewing.ingredient-slot.0'),
    ).toBe(true);
    expect(openHerbPicker).toHaveBeenCalledWith(0, 0);
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

    harness.page.openDialog('herbs', {
      cauldronIndex: 0,
      slotIndex: 0,
      rows: [
        {
          id: 'sage-herb',
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          quantity: 4,
          itemKind: 'herb',
          semanticId: 'brewing.herb.sage',
        },
      ],
      actions: { selectHerb },
    });
    const herbDialog = harness.dialogs.get('brewing.herbs');
    expect(herbDialog).toBeInstanceOf(
      RootRunInventoryChoiceDialogPixi,
    );
    expect(herbDialog.modal.title).toBe('choose herb');
    expect(herbDialog.modal.panel.paperFrame.visible).toBe(true);
    expect('selectionPaper' in herbDialog).toBe(false);
    expect('listPaper' in herbDialog).toBe(false);
    expect('amountSelection' in herbDialog).toBe(false);
    expect(
      harness.semanticTargets.activate('brewing.herb.sage'),
    ).toMatchObject({ ok: true, quantity: 1 });
    expect(selectHerb).toHaveBeenCalledWith(
      expect.objectContaining({ itemTypeId: 1001 }),
      0,
      0,
    );

    harness.page.destroy();
    harness.dispose();
    expect(
      harness.inputRouter.store.getRegistrations(),
    ).toHaveLength(0);
  });

  it('keeps the recipe book inside the retained dialog cap with readable paper styling', () => {
    const harness = createHarness();
    const researchRecipe = vi.fn(() => true);

    harness.page.openDialog('recipes', {
      recipes: [
        {
          id: 'mana-tonic',
          key: 'manaTonic',
          label: 'mana tonic',
          unlocked: false,
          canResearch: true,
          manaCost: 12,
          brewDurationMs: 30_000,
          ingredients: [
            {
              id: 'sage',
              key: 'sageHerb',
              label: 'sage',
              quantity: 3,
              owned: 0,
            },
          ],
        },
        {
          id: 'minor-healing-potion',
          key: 'minorHealingPotion',
          label: 'minor healing potion',
          unlocked: false,
          canResearch: false,
          manaCost: 14,
          brewDurationMs: 35_000,
          ingredients: [],
        },
      ],
      actions: { researchRecipe },
    });

    const dialog = harness.dialogs.get('brewing.recipes');
    const card = dialog.cards.getWidgets()[0];
    const unavailableCard = dialog.cards.getWidgets()[1];
    const ingredient = card.ingredients.getWidgets()[0];
    const contentTheme = dialog.modal.getContentTheme();

    expect(dialog.modal.panel.coreWidth).toBe(304);
    expect(dialog.modal.panel.outerFrame.frameWidth).toBe(324);
    expect(dialog.modal.panel.paperFrame.visible).toBe(false);
    expect(dialog.book.x).toBe(-4);
    expect(dialog.book.hitArea.width).toBe(312);
    expect(card.icon.width).toBe(46);
    expect(card.icon.x).toBe(3);
    expect(card.pageFrame.frameWidth).toBe(155);
    expect(card.pageFrame.frameHeight).toBe(341);
    expect(unavailableCard.root.x - (card.root.x + card.pageFrame.frameWidth)).toBe(2);
    expect(card.name.style.fill).toBe(contentTheme.text);
    expect(card.cost.text).toBe('Required mana:');
    expect(card.cost.style.fill).toBe(contentTheme.text);
    expect(card.costValue.text).toBe('12');
    expect(card.costValue.style.fill).toBe(contentTheme.resourceColors.mana);
    expect(card.costIcon.x).toBeGreaterThan(card.costValue.x);
    expect(card.duration.text).toBe('Required Time:');
    expect(card.durationValue.text).toBe('30s');
    expect(card.cost.y).toBe(unavailableCard.cost.y);
    expect(card.duration.y).toBe(unavailableCard.duration.y);
    expect(ingredient.required.style.fill).toBe(
      contentTheme.resourceColors.herb,
    );
    expect(ingredient.required.text).toBe('sage');
    expect(ingredient.owned.text).toBe('0/3');
    expect(ingredient.icon.visible).toBe(true);
    expect(ingredient.icon.width).toBe(14);
    expect(ingredient.icon.x).toBe(
      ingredient.required.x + ingredient.required.width + 2,
    );
    expect(card.separator.renderable).toBe(false);
    expect(dialog.previous).toBeInstanceOf(PixiTextButton);
    expect(dialog.previous.variant).toBe('yellow');
    expect(dialog.previous.textLabel.text).toBe('Prev');
    expect(dialog.next.textLabel.text).toBe('Next');
    expect(dialog.previous.buttonWidth).toBe(72);
    expect(dialog.next.buttonWidth).toBe(72);
    expect(dialog.previous.x).toBe(dialog.book.x + card.root.x);
    expect(dialog.next.x + dialog.next.buttonWidth).toBe(
      dialog.book.x +
        unavailableCard.root.x +
        unavailableCard.pageFrame.frameWidth,
    );
    expect(card.select).toBeInstanceOf(PixiTextButton);
    expect(card.select.variant).toBe('yellow');
    expect(card.select.textLabel.text).toBe('Research');
    expect(card.select.enabled).toBe(true);
    expect(card.select.activate()).toBe(true);
    expect(researchRecipe.mock.calls[0][0]).toEqual(
      expect.objectContaining({ key: 'manaTonic' }),
    );
    expect(unavailableCard.select.variant).toBe('yellow');
    expect(unavailableCard.select.textLabel.text).toBe('Research');
    expect(unavailableCard.select.enabled).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('disables an unlocked recipe action when its materials are unavailable', () => {
    const harness = createHarness();
    const selectRecipe = vi.fn();

    harness.page.openDialog('recipes', {
      recipes: [
        {
          id: 'mana-tonic',
          key: 'manaTonic',
          label: 'mana tonic',
          unlocked: true,
          canSelect: false,
          ingredients: [],
        },
      ],
      actions: { selectRecipe },
    });

    const card = harness.dialogs
      .get('brewing.recipes')
      .cards.getWidgets()[0];

    expect(card.select.variant).toBe('green');
    expect(card.select.textLabel.text).toBe('Select');
    expect(card.select.enabled).toBe(false);
    expect(card.select.activate()).toBe(false);
    expect(selectRecipe).not.toHaveBeenCalled();

    harness.page.destroy();
    harness.dispose();
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
      PIXI_UI_GEOMETRY.sourceHeight -
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
      y: PIXI_UI_GEOMETRY.sourceHeight - 162 - 6 - 80.25,
    });
    expect(harness.page.potionsButton.root.position).toMatchObject({
      x: 328.5,
      y: PIXI_UI_GEOMETRY.sourceHeight - 162 - 6 - 80.25,
    });
    expect(harness.page.worldZoom).toBeCloseTo(358 / 516);
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

  it('advances the visible batch timer smoothly between gameplay snapshots', () => {
    let now = 1_000;
    const harness = createHarness({ timeSource: () => now });
    const model = createBrewingViewModel({ withActiveBrew: true });
    model.brewing.now = now;
    model.brewing.cauldrons[0].activeBrew = {
      key: 'sage-tonic',
      label: 'sage tonic',
      phase: 'brewing',
      totalMs: 10_000,
      remainingMs: 10_000,
      progress: 0,
    };

    harness.page.bind(model);
    harness.page.activate();
    harness.page.hud.applyTheme(harness.page.theme);
    harness.page.hud.applyTheme(harness.page.theme);
    expect(harness.page.hud.progress.progress).toBe(0);
    expect(harness.page.hud.progress.tone).toBe('root');
    expect(harness.page.hud.phaseLabel.text).toBe('Brewing');
    expect(harness.page.hud.phaseLabel.style.fontSize).toBe(11);
    expect(harness.page.hud.phaseLabel.style.lineHeight).toBe(13);
    expect(harness.page.hud.phaseLabel.style.padding).toBe(1);
    expect(harness.page.hud.phaseLabel.scale).toMatchObject({
      x: 1,
      y: 1,
    });
    expect(harness.page.hud.phaseTime.text).toBe('0:10');
    expect(harness.page.hud.phaseTime.style.padding).toBe(1);
    expect(harness.page.hud.potionPreviewFrame.tint).toBe(0x0e1016);
    expect(harness.page.hud.potionPreviewFrame.filters).toBeUndefined();

    now = 3_500;
    harness.page.hud.updateMotion(now, {
      active: true,
      reducedMotion: true,
    });
    expect(harness.page.hud.progress.progress).toBeCloseTo(0.25);
    expect(harness.page.hud.phaseTime.text).toBe('0:08');

    harness.page.tick(now);

    expect(harness.page.hud.progress.progress).toBeCloseTo(0.25);
    expect(harness.page.hud.phaseTime.text).toBe('0:08');

    model.brewing.now = now;
    harness.page.bind(model);

    expect(harness.page.hud.progress.progress).toBeCloseTo(0.25);
    expect(harness.page.hud.phaseTime.text).toBe('0:08');

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
    expect(primaryBadge.root.position.x).toBeCloseTo(
      BREWING_PIXI_GEOMETRY.actionWidth
        + PIXI_UI_GEOMETRY.notificationOutset
        - PIXI_UI_GEOMETRY.notificationSize / 2,
      6,
    );
    expect(primaryBadge.root.position.y).toBeCloseTo(
      -PIXI_UI_GEOMETRY.notificationOutset
        + PIXI_UI_GEOMETRY.notificationSize / 2,
      6,
    );
    expect(primaryBadge.root.visible).toBe(true);
    expect(primaryBadge.model.tone).toBe('orange');
    expect(herbBadge.root.parent).toBe(herb.root);
    expect(herbBadge.root.visible).toBe(true);
    expect(herbBadge.root.x).toBeCloseTo(
      herb.label.x
        + herb.label.width
        + PIXI_UI_GEOMETRY.notificationOutset,
      6,
    );
    expect(herbBadge.root.y).toBeCloseTo(
      herb.label.y
        - PIXI_UI_GEOMETRY.notificationOutset
        + PIXI_UI_GEOMETRY.notificationSize / 2,
      6,
    );

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
    expect(costControl.background.visible).toBe(true);
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

    now = 420;
    harness.page.tick(now);
    expect(harness.page.motionGhostPool.getStats().active).toBe(0);
    expect(cauldron.receiveMotionStart).toBe(420);

    now = 490;
    harness.page.tick(now);
    expect(cauldron.artLayer.scale.x).not.toBe(1);
    expect(cauldron.recipeLayer.y).toBeGreaterThan(0);

    harness.page.bind(
      createBuyCauldronViewModel({ canBuy: true }),
    );
    now = 500;
    harness.page.bind(createBrewingViewModel());
    const bought = harness.page.cauldrons.get('cauldron-0');
    expect(bought.purchaseMotionStart).toBe(500);
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

  it('flies live HUD ingredients upward into the visible cauldron liquid on Brew', () => {
    let now = 0;
    const harness = createHarness({
      timeSource: () => now,
    });
    const brew = vi.fn(() => ({ ok: true }));
    const model = createBrewingViewModel();
    model.actions.performCauldronAction = brew;
    harness.page.bind(model);
    harness.page.activate();
    const sourceSlot = harness.page.hud.ingredientSlots[0];
    sourceSlot.icon.texture = Texture.WHITE;
    sourceSlot.icon.width = 26;
    sourceSlot.icon.height = 26;
    sourceSlot.icon.visible = true;
    sourceSlot.icon.renderable = true;
    harness.page.hud.cauldronArt.texture = Texture.WHITE;
    harness.page.hud.cauldronArt.width = 116;
    harness.page.hud.cauldronArt.height = 94;

    expect(harness.page.hud.activatePrimaryAction()).toEqual({
      ok: true,
    });
    expect(brew).toHaveBeenCalledWith(
      model.brewing.cauldrons[0],
      model.brewing.cauldrons[0].primaryAction,
    );
    expect(harness.page.activeGhostMotions.size).toBe(1);

    const [motion] = harness.page.activeGhostMotions;
    const liquidBounds = harness.page.hud.cauldronArt.getBounds();
    const liquidCenter = harness.page.content.toLocal({
      x: liquidBounds.x + liquidBounds.width / 2,
      y: liquidBounds.y + liquidBounds.height * (91.5 / 486),
    });
    expect(motion.target.x).toBeCloseTo(liquidCenter.x);
    expect(motion.target.y).toBeCloseTo(liquidCenter.y);
    expect(motion.path.burst.y).toBeLessThan(0);
    expect(motion.path.control.y).toBeLessThan(
      Math.min(motion.path.burst.y, motion.path.delta.y),
    );
    expect(motion.ghost.icon.width).toBe(26);

    now = 12;
    harness.page.tick(now);
    expect(motion.ghost.root.y).toBeLessThan(
      Math.min(motion.start.y, motion.target.y),
    );
    expect(
      Math.sign(motion.ghost.root.x - motion.start.x),
    ).toBe(motion.path.side);

    now = 420;
    harness.page.tick(now);
    expect(harness.page.activeGhostMotions.size).toBe(0);
    expect(harness.page.motionGhostPool.getStats().active).toBe(0);

    harness.page.destroy();
    harness.dispose();
  });

  it('lands newly staged HUD ingredients with a bounded slot and orbit pulse', () => {
    let now = 0;
    const harness = createHarness({ timeSource: () => now });
    const model = createBrewingViewModel();
    const cauldron = model.brewing.cauldrons[0];
    cauldron.selectedRecipe = {
      key: 'sage-tonic',
      label: 'sage tonic',
      ingredients: [
        { itemKey: 'sage', label: 'sage', quantity: 1 },
      ],
    };
    cauldron.ingredients = [];
    harness.page.bind(model);
    harness.page.activate();

    cauldron.ingredients = [
      {
        id: 'sage-slot',
        key: 'sage',
        label: 'sage',
        quantity: 1,
        removable: true,
      },
    ];
    harness.page.bind(model);

    const slot = harness.page.hud.ingredientSlots[0];
    expect(slot.arrivalMotionStart).toBe(0);
    expect(harness.page.hud.ingredientOrbitMotion).toMatchObject({
      index: 0,
      startedAt: 0,
    });
    expect(slot.contentMotion.scale.x).toBeLessThan(1);

    now = 90;
    harness.page.tick(now);
    expect(slot.contentMotion.scale.x).toBeGreaterThan(0.78);
    expect(slot.contentMotion.scale.x).toBeLessThan(1);
    expect(
      harness.page.hud.recipeOrbitFeedback.getLocalBounds().width,
    ).toBeGreaterThan(0);

    now = 280;
    harness.page.tick(now);
    expect(slot.arrivalMotionStart).toBeNull();
    expect(slot.contentMotion.scale.x).toBe(1);
    expect(slot.contentMotion.rotation).toBeCloseTo(0);
    expect(harness.page.hud.ingredientOrbitMotion).toBeNull();

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps prepared and active liquid stateful without moving the cauldron at rest', () => {
    let now = 0;
    const harness = createHarness({ timeSource: () => now });
    const model = createBrewingViewModel();
    const cauldron = model.brewing.cauldrons[0];
    cauldron.selectedRecipe = {
      key: 'sage-tonic',
      label: 'sage tonic',
      ingredients: [{ itemKey: 'sage', label: 'sage', quantity: 1 }],
    };
    harness.page.bind(model);
    harness.page.activate();
    const restArt = {
      x: harness.page.hud.cauldronArt.x,
      y: harness.page.hud.cauldronArt.y,
    };

    now = 360;
    harness.page.tick(now);
    expect(harness.page.hud.cauldronMotionMode).toBe('prepared');
    expect(harness.page.hud.cauldronArt.position).toMatchObject(restArt);
    expect(
      harness.page.hud.cauldronStateFx.getLocalBounds().width,
    ).toBeGreaterThan(0);

    cauldron.activeBrew = {
      key: 'sage-tonic',
      label: 'sage tonic',
      phase: 'brewing',
      durationMs: 10_000,
      endTimeMs: 11_000,
    };
    now = 1_000;
    model.brewing.now = now;
    harness.page.bind(model);
    now = 1_240;
    harness.page.tick(now);
    expect(harness.page.hud.cauldronMotionMode).toBe('brewing');
    expect(
      harness.page.hud.cauldronStateFx.getLocalBounds().height,
    ).toBeGreaterThan(0);
    expect(harness.page.hud.cauldronLiquid.y).not.toBe(
      harness.page.hud.cauldronChangeRestState.liquid.y,
    );

    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    harness.page.tick(1_300);
    expect(harness.page.hud.cauldronStateFx.getLocalBounds().width).toBe(0);
    expect(harness.page.hud.cauldronLiquid.position).toMatchObject({
      x: harness.page.hud.cauldronChangeRestState.liquid.x,
      y: harness.page.hud.cauldronChangeRestState.liquid.y,
    });
    vi.unstubAllGlobals();

    harness.page.destroy();
    harness.dispose();
  });

  it('punctuates brew completion and lifts collected potion art from the liquid', () => {
    let now = 0;
    const harness = createHarness({ timeSource: () => now });
    const model = createBrewingViewModel();
    const cauldron = model.brewing.cauldrons[0];
    cauldron.selectedRecipe = {
      key: 'sage-tonic',
      label: 'sage tonic',
      ingredients: [{ itemKey: 'sage', label: 'sage', quantity: 1 }],
    };
    cauldron.activeBrew = {
      key: 'sage-tonic',
      label: 'sage tonic',
      phase: 'brewing',
      durationMs: 10_000,
      endTimeMs: 10_000,
    };
    const collectBrew = vi.fn(() => ({ ok: true }));
    model.actions.collectBrew = collectBrew;
    harness.page.bind(model);
    harness.page.activate();

    now = 500;
    model.brewing.now = now;
    cauldron.activeBrew = {
      ...cauldron.activeBrew,
      phase: 'ready',
      canCollect: true,
      remainingMs: 0,
    };
    harness.page.bind(model);
    expect(harness.page.hud.completionMotionStart).toBe(500);
    expect(harness.page.hud.primaryActionMotionStart).toBe(500);

    now = 620;
    harness.page.tick(now);
    expect(harness.page.hud.cauldronArt.scale.y).toBeLessThan(
      harness.page.hud.cauldronChangeRestState.art.scaleY,
    );
    expect(
      harness.page.hud.cauldronStateFx.getLocalBounds().width,
    ).toBeGreaterThan(0);

    harness.page.hud.potionIcon.texture = Texture.WHITE;
    harness.page.hud.potionIcon.visible = true;
    harness.page.hud.potionIcon.renderable = true;
    expect(harness.page.hud.activatePrimaryAction()).toEqual({ ok: true });
    expect(collectBrew).toHaveBeenCalledWith(0);
    const collectMotion = [...harness.page.activeGhostMotions].find(
      (motion) => motion.kind === 'collect',
    );
    expect(collectMotion).toBeDefined();
    expect(collectMotion.target.y).toBeLessThan(collectMotion.start.y);

    now = 1_100;
    harness.page.tick(now);
    expect(harness.page.activeGhostMotions.size).toBe(0);
    expect(harness.page.hud.completionMotionStart).toBeNull();
    expect(harness.page.hud.cauldronArt.scale.x).toBe(
      harness.page.hud.cauldronChangeRestState.art.scaleX,
    );
    expect(harness.page.hud.cauldronArt.scale.y).toBe(
      harness.page.hud.cauldronChangeRestState.art.scaleY,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('starts the brew without ingredient travel when reduced motion is requested', () => {
    const harness = createHarness();
    const brew = vi.fn(() => ({ ok: true }));
    const model = createBrewingViewModel();
    model.actions.performCauldronAction = brew;
    harness.page.bind(model);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );

    expect(harness.page.hud.activatePrimaryAction()).toEqual({
      ok: true,
    });
    expect(brew).toHaveBeenCalledOnce();
    expect(harness.page.activeGhostMotions.size).toBe(0);
    expect(harness.page.motionGhostPool.getStats().active).toBe(0);

    vi.unstubAllGlobals();
    harness.page.destroy();
    harness.dispose();
  });

  it('starts the brew when the HUD has no page motion owner', () => {
    const harness = createHarness();
    const brew = vi.fn(() => ({ ok: true }));
    const model = createBrewingViewModel();
    model.actions.performCauldronAction = brew;
    harness.page.bind(model);
    harness.page.hud.page = null;

    expect(harness.page.hud.activatePrimaryAction()).toEqual({ ok: true });
    expect(brew).toHaveBeenCalledOnce();
    expect(harness.page.activeGhostMotions.size).toBe(0);

    harness.page.hud.page = harness.page;
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
    model.brewing.cauldrons[0].level = 1;
    model.brewing.cauldrons[0].autoBrewAvailable = true;
    model.brewing.cauldrons[0].autoBrewEnabled = true;
    model.brewing.cauldrons[0].autoCollectEnabled = false;
    model.brewing.cauldrons[0].primaryAction.label = 'brew x1';
    model.brewing.cauldrons[0].ingredients = Array.from(
      { length: 6 },
      (_unused, index) => ({
        id: `sage-slot-${index}`,
        key: 'sage',
        label: 'sage',
        quantity: 1,
      }),
    );
    model.brewing.cauldrons.push({
      id: 'buy:2',
      cauldronIndex: 1,
      cauldronNumber: 2,
      unlocked: false,
      canBuyCauldron: true,
      nextCauldronCost: 25,
    });
    model.actions.performCauldronAction = vi.fn(() => true);
    model.actions.toggleAutoBrew = vi.fn(() => true);
    model.brewing.configuredMaxCauldrons = 5;
    harness.page.bind(model);

    const chatTop =
      harness.page.sourceHeight -
      PIXI_UI_GEOMETRY.roomChatBottom -
      PIXI_UI_GEOMETRY.roomChatHeight;
    expect(BREWING_HUD_GEOMETRY.top).toBe(
      PIXI_UI_GEOMETRY.roomContentTop,
    );
    expect(
      BREWING_HUD_GEOMETRY.detailTop,
    ).toBeGreaterThan(BREWING_HUD_GEOMETRY.top);
    expect(
      BREWING_HUD_GEOMETRY.detailTop +
        BREWING_HUD_GEOMETRY.detailHeight,
    ).toBe(
      BREWING_HUD_GEOMETRY.top +
        BREWING_HUD_GEOMETRY.carouselHeight,
    );
    expect(
      chatTop -
        PIXI_UI_GEOMETRY.roomChatTitleOverhang -
        (BREWING_HUD_GEOMETRY.top +
          BREWING_HUD_GEOMETRY.carouselHeight),
    ).toBe(BREWING_HUD_GEOMETRY.detailChatGap);
    expect(harness.page.hud.root.visible).toBe(true);
    expect(harness.page.worldViewport.visible).toBe(false);
    expect(harness.page.hud.carouselPanel.title.visible).toBe(false);
    expect(harness.page.hud.cauldronTitlePlaque.root.parent).toBe(
      harness.page.hud.carouselPanel.body,
    );
    expect(harness.page.hud.cauldronTitle.parent).toBe(
      harness.page.hud.cauldronTitlePlaque.root,
    );
    expect(harness.page.hud.cauldronTitle.text).toBe('Cauldron 1');
    expect(harness.page.hud.cauldronTitle.style.stroke).toMatchObject({
      color: '#0a0a0a',
      width: resolvePixiTextStrokeWidth(
        harness.page.hud.cauldronTitle.style.fontSize,
      ),
      join: 'round',
    });
    expect(
      harness.page.hud.brew.control.textLabel.textObject.style.stroke,
    ).toMatchObject({
      color: '#0a0a0a',
      width: resolvePixiTextStrokeWidth(
        harness.page.hud.brew.control.textLabel.fontSize,
      ),
      join: 'round',
    });
    expect(harness.page.hud.cauldronTitlePlaque).toMatchObject({
      variant: 'brewing',
      assetId:
        'source:assets/ui/banners/banner-blue-right.9.png',
    });
    expect(
      harness.page.hud.cauldronTitlePlaque.root.position,
    ).toMatchObject({
      x: -BREWING_HUD_GEOMETRY.edge,
      y: BREWING_HUD_GEOMETRY.carouselContentOffset,
    });
    expect(harness.page.hud.cauldronStars.parent).toBe(
      harness.page.hud.cauldronTitlePlaque.root,
    );
    expect(harness.page.hud.cauldronStars.level).toBe(1);
    expect(harness.page.hud.cauldronStars.tone).toBe('yellow');
    expect(harness.page.hud.cauldronStars.starCount).toBe(1);
    expect(harness.page.hud.cauldronStars.slots).toHaveLength(3);
    expect(harness.page.hud.cauldronStars.visible).toBe(true);
    expect(harness.page.hud.cauldronTitle.position).toMatchObject({
      x: 12,
      y: 21,
    });
    expect(harness.page.hud.cauldronStars.position).toMatchObject({
      x:
        harness.page.hud.cauldronTitle.x +
        Math.ceil(harness.page.hud.cauldronTitle.width) +
        6,
      y: 15,
    });
    expect(harness.page.hud.cauldronTitlePlaque.frame).toMatchObject({
      frameHeight: 42,
      frameWidth: Math.ceil(
        harness.page.hud.cauldronTitle.width +
          6 +
          harness.page.hud.cauldronStars.measuredWidth +
          60,
      ),
    });
    expect(harness.page.hud.cauldronTitlePlaque.root.scale).toMatchObject({
      x: 0.75,
      y: 0.75,
    });
    expect(harness.page.hud.ingredientSlots).toHaveLength(6);
    expect(harness.page.hud.ingredientSlots[0].root.parent).toBe(
      harness.page.hud.carouselPanel.body,
    );
    expect(harness.page.hud.ingredientSlots[5].decorative).toBe(false);
    expect(harness.page.hud.ingredientSlots[5].quantity).toBeUndefined();
    expect(Object.keys(harness.page.hud.actionIcons)).toEqual([
      'autoBrew',
      'emptyCauldron',
    ]);
    expect(harness.page.hud.actionIcons.autoBrew.label).toBe(
      'brewing-autobrew-action-icon',
    );
    expect(harness.page.hud.actionIcons.autoBrew.iconSprites[0].label).toBe(
      'brewing-autobrew-action-icon:sprite',
    );
    expect(
      harness.page.hud.actionIcons.autoBrew.iconSprites[0].width,
    ).toBe(
      BREWING_HUD_GEOMETRY.autoIconHeight *
        PIXI_ROOT_RUN_GEOMETRY.settings.gearAspectRatio,
    );
    expect(
      harness.page.hud.actionIcons.autoBrew.iconSprites[0].height,
    ).toBe(BREWING_HUD_GEOMETRY.autoIconHeight);
    expect(Object.keys(harness.page.hud.navigationIcons)).toEqual([
      'previous',
      'next',
    ]);
    expect(harness.page.hud.navigationIcons.previous.parent).toBe(
      harness.page.hud.previous.control.visual,
    );
    expect(harness.page.hud.navigationIcons.next.parent).toBe(
      harness.page.hud.next.control.visual,
    );
    expect(harness.page.hud.previous.text.text).toBe('');
    expect(harness.page.hud.next.text.text).toBe('');
    expect(harness.page.hud.navigationIcons.previous.alpha).toBe(1);
    expect(harness.page.hud.navigationIcons.next.alpha).toBe(1);
    expect(
      harness.page.hud.navigationIcons.previous.iconSprites[0],
    ).toMatchObject({
      width: 22,
      height: 22,
    });
    expect(harness.page.hud.navigationIcons.next.iconSprites[0]).toMatchObject({
      width: 22,
      height: 22,
    });
    const lowerLeftSlot = harness.page.hud.ingredientSlots[2];
    const lowerRightSlot = harness.page.hud.ingredientSlots[3];
    const upperLeftSlot = harness.page.hud.ingredientSlots[0];
    expect(
      harness.page.hud.carouselPanel.root.y +
        upperLeftSlot.root.y -
        (harness.page.hud.recipes.root.y +
          harness.page.hud.recipes.height),
    ).toBe(BREWING_HUD_GEOMETRY.previewTopGap);
    expect(BREWING_HUD_GEOMETRY.previewTopGap).toBeGreaterThanOrEqual(
      BREWING_HUD_GEOMETRY.ingredientSlotHeight,
    );
    const orbitBounds = harness.page.hud.recipeOrbit.getLocalBounds();
    expect(orbitBounds.width / orbitBounds.height).toBeGreaterThan(1.4);
    const navigationCenterY =
      harness.page.hud.carouselPanel.root.y +
      lowerLeftSlot.root.y +
      lowerLeftSlot.height / 2 +
      BREWING_HUD_GEOMETRY.navigationVerticalOffset;
    expect(
      harness.page.hud.previous.root.y +
        harness.page.hud.previous.height / 2,
    ).toBe(navigationCenterY);
    expect(
      harness.page.hud.next.root.y +
        harness.page.hud.next.height / 2,
    ).toBe(navigationCenterY);
    expect(
      harness.page.hud.potionName.y -
        (lowerLeftSlot.root.y + lowerLeftSlot.height),
    ).toBe(BREWING_HUD_GEOMETRY.previewIdentityGap);
    expect(
      harness.page.hud.previous.root.x +
        harness.page.hud.previous.width,
    ).toBe(
      harness.page.hud.carouselPanel.root.x +
        lowerLeftSlot.root.x -
        BREWING_HUD_GEOMETRY.navigationSlotGap,
    );
    expect(harness.page.hud.next.root.x).toBe(
      harness.page.hud.carouselPanel.root.x +
        lowerRightSlot.root.x +
        lowerRightSlot.width +
        BREWING_HUD_GEOMETRY.navigationSlotGap,
    );
    expect(harness.page.hud.navigationIcons.previous.x).toBe(
      harness.page.hud.previous.width / 2 -
        BREWING_HUD_GEOMETRY.navigationIconOpticalNudge,
    );
    expect(harness.page.hud.navigationIcons.next.x).toBe(
      harness.page.hud.next.width / 2 +
        BREWING_HUD_GEOMETRY.navigationIconOpticalNudge,
    );
    expect(harness.page.hud.recipes.text.text).toBe('Recipes');
    expect(harness.page.hud.autoBrew.text.text).toBe('Auto');
    expect(harness.page.hud.autoBrew.variant).toBe('green');
    expect(harness.page.hud.autoBrew.control.variant).toBe('green');
    expect(harness.page.hud.autoBrew.selected).toBe(false);
    expect(harness.page.hud.quantity.text.text).toBe('x1');
    expect(harness.page.hud.brew.text.text).toBe('Cancel');
    expect(harness.page.hud.brew.variant).toBe('yellow');
    expect(harness.page.hud.brew.control.variant).toBe('yellow');
    expect(harness.page.hud.settings).toBeUndefined();
    expect(harness.page.hud.potionName.text).toBe('');
    expect(harness.page.hud.potionName.visible).toBe(false);
    expect(harness.page.hud.batchLabel.text).toBe('');
    expect(harness.page.hud.batchLabel.visible).toBe(false);
    expect(harness.page.hud.recipes.control.textLabel.fontSize).toBe(13);
    expect(harness.page.hud.recipes.control.textLabel.x).toBe(
      harness.page.hud.recipes.width / 2,
    );
    expect(harness.page.hud.brew.control.textLabel.fontSize).toBe(13);
    expect(harness.page.hud.brew.control.textLabel.x).toBe(
      harness.page.hud.brew.width / 2,
    );
    expect(harness.page.hud.autoBrew.control.textLabel.fontSize).toBe(10);
    expect(harness.page.hud.autoBrew.control.textLabel.lineHeight).toBe(12);
    expect(harness.page.hud.detailPanel.width).toBe(358);
    expect(harness.page.hud.detailPanel.root.x).toBe(16);
    expect(harness.page.hud.potionIcon.width).toBe(50);
    expect(harness.page.hud.potionIcon.height).toBe(50);
    expect(harness.page.hud.recipes.width).toBe(58);
    expect(harness.page.hud.autoBrew.width).toBe(32);
    expect(harness.page.hud.autoBrew.height).toBe(
      PIXI_UI_GEOMETRY.roomControlHeight,
    );
    expect(harness.page.hud.quantity.width).toBe(32);
    expect(harness.page.hud.brew.width).toBe(338);
    expect(harness.page.hud.recipes.root.x).toBe(228);
    expect(harness.page.hud.autoBrew.root.x).toBe(298);
    expect(harness.page.hud.quantity.root.x).toBe(342);
    expect(harness.page.hud.recipes.root.y).toBe(
      BREWING_HUD_GEOMETRY.top +
        BREWING_HUD_GEOMETRY.carouselContentOffset +
        BREWING_HUD_GEOMETRY.configurationTopOffset,
    );
    expect(
      harness.page.hud.cauldronTitlePlaque.frame.frameWidth,
    ).toBeLessThanOrEqual(
      harness.page.hud.recipes.root.x -
        BREWING_HUD_GEOMETRY.configurationGap,
    );
    expect(harness.page.hud.brew.root.y).toBe(
      BREWING_HUD_GEOMETRY.detailTop + 72,
    );
    const autoIcon = harness.page.hud.actionIcons.autoBrew;
    const autoLabel = harness.page.hud.autoBrew.control.textLabel;
    expect(autoIcon.position).toMatchObject({
      x: harness.page.hud.autoBrew.width / 2,
      y: harness.page.hud.autoBrew.height / 2,
    });
    expect(autoLabel.position).toMatchObject({
      x: harness.page.hud.autoBrew.width / 2,
      y: BREWING_HUD_GEOMETRY.autoLabelY,
    });
    expect(harness.page.hud.autoBrew.control.hitArea).toMatchObject({
      x:
        (harness.page.hud.autoBrew.width -
          BREWING_HUD_GEOMETRY.autoHitSize) /
        2,
      y: BREWING_HUD_GEOMETRY.autoHitTop,
      width: BREWING_HUD_GEOMETRY.autoHitSize,
      height: BREWING_HUD_GEOMETRY.autoHitSize,
    });
    expect(harness.page.hud.quantity.control.hitArea).toMatchObject({
      x:
        (harness.page.hud.quantity.width -
          BREWING_HUD_GEOMETRY.quantityHitSize) /
        2,
      y:
        (harness.page.hud.quantity.height -
          BREWING_HUD_GEOMETRY.quantityHitSize) /
        2,
      width: BREWING_HUD_GEOMETRY.quantityHitSize,
      height: BREWING_HUD_GEOMETRY.quantityHitSize,
    });
    expect(harness.page.hud.autoBrew.handleTap()).toBe(true);
    expect(model.actions.toggleAutoBrew).toHaveBeenCalledWith(0);
    model.brewing.cauldrons[0].autoBrewEnabled = false;
    harness.page.bind(model);
    expect(harness.page.hud.autoBrew.text.text).toBe('Auto');
    expect(harness.page.hud.autoBrew.variant).toBe('yellow');
    expect(harness.page.hud.autoBrew.control.variant).toBe('yellow');
    expect(harness.page.hud.brew.text.text).toBe('Brew');
    expect(harness.page.hud.brew.variant).toBe('green');
    expect(harness.page.hud.autoBrew.handleTap()).toBe(true);
    model.brewing.cauldrons[0].autoBrewEnabled = true;
    harness.page.bind(model);
    expect(harness.page.hud.previous.root.visible).toBe(false);
    expect(harness.page.hud.getCauldrons()).toHaveLength(2);
    expect(harness.page.hud.dots.visible).toBe(true);
    expect(harness.page.hud.dots.renderable).toBe(true);
    const carouselSwipe = harness.inputRouter.store
      .getRegistrations('swipe')
      .find((registration) => registration.id === 'brewing.cauldron.carousel.swipe');
    expect(carouselSwipe.priority).toBe(10);
    expect(carouselSwipe.onSwipe({ direction: 'next' })).toBe(true);
    expect(harness.page.hud.selectedIndex).toBe(1);
    expect(harness.page.hud.previous.root.visible).toBe(true);
    expect(harness.page.hud.next.root.visible).toBe(false);

    expect(harness.page.hud.lockArt.visible).toBe(true);
    expect(harness.page.hud.cauldronArt.visible).toBe(true);
    expect(harness.page.hud.cauldronArt.filters).toHaveLength(1);
    expect(harness.page.hud.cauldronArt.filters[0].matrix).toEqual([
      0.2125, 0.7154, 0.0721, 0, 0,
      0.2125, 0.7154, 0.0721, 0, 0,
      0.2125, 0.7154, 0.0721, 0, 0,
      0, 0, 0, 1, 0,
    ]);
    expect(harness.page.hud.lockLabel.visible).toBe(false);
    expect(harness.page.hud.lockLabel.text).toBe('');
    expect(harness.page.hud.cauldronTitle.text).toBe('Locked Cauldron');
    expect(harness.page.hud.cauldronStars.visible).toBe(false);
    for (const button of [
      harness.page.hud.recipes,
      harness.page.hud.autoBrew,
      harness.page.hud.emptyCauldron,
      harness.page.hud.quantity,
      harness.page.hud.brew,
    ]) {
      expect(button.root.visible).toBe(false);
      expect(button.root.renderable).toBe(false);
    }
    expect(harness.page.hud.unlockCostButton.visible).toBe(true);
    expect(harness.page.hud.unlockCostButton.renderable).toBe(true);
    expect(harness.page.hud.unlockCostButton.actionTextLabel.text).toBe('Unlock');
    expect(harness.page.hud.unlockCostButton.amountLabel.text).toBe('25');
    expect(harness.page.hud.unlockCostButton.resource).toBe('coin');
    expect(harness.page.hud.detailPanel.root.visible).toBe(false);
    expect(harness.page.hud.detailPanel.root.renderable).toBe(false);
    expect(harness.page.hud.unlockCostButton.position).toMatchObject({
      x: 149,
      y:
        BREWING_HUD_GEOMETRY.detailTop +
        (BREWING_HUD_GEOMETRY.detailHeight -
          harness.page.hud.unlockCostButton.buttonHeight) /
          2,
    });
    expect(harness.page.hud.unlockCostButton.activate()).toBe(true);
    expect(model.actions.performCauldronAction).toHaveBeenCalledWith(
      model.brewing.cauldrons[1],
      { id: 'buy' },
    );
    expect(harness.page.selectCauldron(0)).toBe(true);
    expect(harness.page.hud.cauldronArt.filters).toBeNull();
    expect(harness.page.hud.lockArt.visible).toBe(false);
    expect(harness.page.hud.unlockCostButton.visible).toBe(false);
    expect(harness.page.hud.recipes.root.visible).toBe(true);
    expect(harness.page.hud.detailPanel.root.visible).toBe(true);
    expect(harness.page.hud.detailPanel.root.renderable).toBe(true);

    expect(harness.page.hud.fastForward).toBeUndefined();
    expect(harness.page.hud.carouselPanel.shadow.visible).toBe(false);
    expect(harness.page.hud.carouselPanel.fallback.visible).toBe(false);
    expect(harness.page.hud.carouselPanel.frame.visible).toBe(false);
    expect(harness.page.hud.detailPanel.title.visible).toBe(false);
    expect(
      harness.page.hud.detailPanel.fallback.visible ||
        harness.page.hud.detailPanel.frame.visible,
    ).toBe(true);
    expect(
      harness.page.hud.detailPanel.fallback.visible &&
        harness.page.hud.detailPanel.frame.visible,
    ).toBe(false);
    expect(harness.page.hud.detailBacking).toBeUndefined();
    expect(harness.page.hud.potionPreviewFrame.sourceInsets).toMatchObject({
      top: 41,
      right: 41,
      bottom: 41,
      left: 41,
    });
    expect(harness.page.hud.potionPreviewFrame).toMatchObject({
      frameWidth: 58,
      frameHeight: 58,
      tint: 0x0e1016,
    });
    expect(harness.page.hud.ingredientSlots[0].frame.sourceInsets).toMatchObject({
      top: 91,
      right: 73,
      bottom: 90,
      left: 83,
    });
    expect(harness.page.hud.ingredientSlots[0].frame.borderInsets).toEqual({
      top: 12,
      right: 12,
      bottom: 12,
      left: 12,
    });
    expect(harness.page.hud.progress.width).toBe(268);
    expect(harness.page.hud.phaseLabel.text).toBe('');
    expect(harness.page.hud.phaseTime.text).toBe('');
    expect(harness.page.hud.cancel).toBeUndefined();
    expect(harness.page.hud.collect).toBeUndefined();
    expect(
      harness.page.cauldrons.get('cauldron-0').buttons.recipes.button.control,
    ).toMatchObject({
      buttonHeight: 28,
      sizeTier: 30,
    });

    expect(harness.page.openAutomationSettings()).toBe(true);
    const settings = harness.dialogs.get('brewing.automation-settings');
    expect(settings.toggle.text.text).toBe('auto collect off');

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps the short portrait HUD above World Chat and separates wrapped potion labels', () => {
    const harness = createHarness();
    const model = createBrewingViewModel();
    model.brewing.cauldrons[0].selectedRecipe = {
      key: 'minorHealingPotion',
      label: 'minor healing potion',
      rarity: 'common',
      ingredients: model.brewing.cauldrons[0].ingredients,
    };
    harness.page.bind(model);
    harness.page.layout({ sourceWidth: 390, sourceHeight: 802 });

    const hud = harness.page.hud;
    const chatTitleTop =
      harness.page.sourceHeight -
      PIXI_UI_GEOMETRY.roomChatBottom -
      PIXI_UI_GEOMETRY.roomChatHeight -
      PIXI_UI_GEOMETRY.roomChatTitleOverhang;
    const detailBottom =
      hud.detailPanel.root.y + hud.detailPanel.height;

    expect(chatTitleTop - detailBottom).toBe(
      BREWING_HUD_GEOMETRY.detailChatGap,
    );
    expect(hud.ingredientSlots[0].root.y).toBeLessThan(
      BREWING_HUD_GEOMETRY.carouselContentOffset +
        BREWING_HUD_GEOMETRY.configurationTopOffset +
        BREWING_HUD_GEOMETRY.configurationButtonHeight +
        BREWING_HUD_GEOMETRY.previewTopGap,
    );
    expect(
      hud.potionName.y + hud.potionName.height,
    ).toBeLessThanOrEqual(hud.rarity.y);
    expect(
      hud.rarity.y + hud.rarity.height,
    ).toBeLessThanOrEqual(hud.batchLabel.y);

    harness.page.destroy();
    harness.dispose();
  });

  it('ticks the Auto gear only while Auto motion is active', () => {
    let now = 0;
    const harness = createHarness({ timeSource: () => now });
    const model = createBrewingViewModel();
    const cauldron = model.brewing.cauldrons[0];
    cauldron.autoBrewAvailable = true;
    cauldron.autoBrewEnabled = true;
    harness.page.bind(model);
    harness.page.activate();
    const gear =
      harness.page.hud.actionIcons.autoBrew.iconSprites[0];

    harness.page.tick(now);
    expect(gear.rotation).toBe(0);
    now = 70;
    harness.page.tick(now);
    expect(gear.rotation).toBeCloseTo(Math.PI / 8);
    now = 200;
    harness.page.tick(now);
    expect(gear.rotation).toBeCloseTo(Math.PI / 8);

    cauldron.autoBrewEnabled = false;
    harness.page.bind(model);
    expect(harness.page.hud.autoBrew.variant).toBe('yellow');
    expect(gear.rotation).toBe(0);

    cauldron.autoBrewEnabled = true;
    harness.page.bind(model);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    now = 400;
    harness.page.tick(now);
    expect(gear.rotation).toBe(0);
    vi.unstubAllGlobals();

    now = 470;
    harness.page.tick(now);
    now = 540;
    harness.page.tick(now);
    expect(gear.rotation).toBeGreaterThan(0);
    harness.page.deactivate();
    expect(gear.rotation).toBe(0);

    harness.page.destroy();
    harness.dispose();
  });

  it('settles the selected cauldron in the navigation direction without decorative particles', () => {
    let now = 0;
    const harness = createHarness({ timeSource: () => now });
    const model = createBrewingViewModel();
    model.brewing.cauldrons.push({
      ...model.brewing.cauldrons[0],
      id: 'cauldron-1',
      cauldronIndex: 1,
      cauldronNumber: 2,
    });
    harness.page.bind(model);
    harness.page.activate();
    const restX = harness.page.hud.cauldronArt.x;

    expect(harness.page.selectCauldron(1)).toBe(true);
    expect(harness.page.hud.cauldronChangeMotion).toMatchObject({
      direction: 1,
      startedAt: 0,
    });
    expect(harness.page.hud.cauldronArt.x).toBeGreaterThan(restX);
    expect(harness.page.hud.cauldronArt.alpha).toBeLessThan(1);

    now = 120;
    harness.page.tick(now);
    expect(harness.page.hud.cauldronChangeSwoosh).toBeUndefined();
    expect(harness.page.hud.cauldronArt.x).toBeGreaterThan(restX);
    expect(harness.page.hud.cauldronArt.x).toBeLessThan(
      restX + 2,
    );

    now = 240;
    harness.page.tick(now);
    expect(harness.page.hud.cauldronChangeMotion).toBeNull();
    expect(harness.page.hud.cauldronArt.x).toBe(restX);
    expect(harness.page.hud.cauldronArt.alpha).toBe(1);
    expect(harness.page.hud.cauldronArt.rotation).toBe(0);

    now = 300;
    expect(harness.page.selectCauldron(0)).toBe(true);
    expect(harness.page.hud.cauldronChangeMotion).toMatchObject({
      direction: -1,
      startedAt: 300,
    });
    expect(harness.page.hud.cauldronArt.x).toBeLessThan(restX);

    harness.page.destroy();
    harness.dispose();
  });

  it('switches cauldrons without settle motion when reduced motion is requested', () => {
    const harness = createHarness();
    const model = createBrewingViewModel();
    model.brewing.cauldrons.push({
      ...model.brewing.cauldrons[0],
      id: 'cauldron-1',
      cauldronIndex: 1,
      cauldronNumber: 2,
    });
    harness.page.bind(model);
    const restX = harness.page.hud.cauldronArt.x;
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );

    expect(harness.page.selectCauldron(1)).toBe(true);
    expect(harness.page.hud.cauldronChangeMotion).toBeNull();
    expect(harness.page.hud.cauldronArt.x).toBe(restX);

    vi.unstubAllGlobals();
    harness.page.destroy();
    harness.dispose();
  });

  it('maps manual and automatic brewing phases to one primary action', () => {
    const states = [
      [{}, 'recipes', 'Choose Recipe', 'yellow', true],
      [
        {
          selectedRecipe: { key: 'mana-tonic' },
          primaryAction: { enabled: true },
        },
        'brew',
        'Brew',
        'green',
        true,
      ],
      [
        { activeBrew: { phase: 'brewing' } },
        'cancel',
        'Cancel',
        'yellow',
        true,
      ],
      [
        {
          activeBrew: {
            phase: 'brewed',
            canStartBottling: true,
          },
        },
        'bottle',
        'Bottle',
        'green',
        true,
      ],
      [
        { activeBrew: { phase: 'bottling' } },
        'cancel',
        'Cancel',
        'yellow',
        true,
      ],
      [
        { activeBrew: { phase: 'ready', canCollect: true } },
        'collect',
        'Collect',
        'green',
        true,
      ],
      [
        { autoBrewEnabled: true },
        'cancel',
        'Cancel',
        'yellow',
        true,
      ],
      [
        {
          autoBrewEnabled: true,
          activeBrew: { phase: 'ready', canCollect: true },
        },
        'collect',
        'Collect',
        'green',
        true,
      ],
    ];

    for (const [cauldron, id, label, variant, enabled] of states) {
      expect(resolveBrewingPrimaryState(cauldron)).toMatchObject({
        id,
        label,
        variant,
        enabled,
      });
    }
  });

  it('opens Recipes from the primary action when the cauldron is empty', () => {
    const harness = createHarness();
    const model = createBrewingViewModel();
    const cauldron = model.brewing.cauldrons[0];
    cauldron.ingredients = [];
    cauldron.selectedRecipe = null;
    const openRecipes = vi.fn(() => true);
    const performCauldronAction = vi.fn(() => true);
    model.actions.openRecipes = openRecipes;
    model.actions.performCauldronAction = performCauldronAction;

    harness.page.bind(model);

    expect(harness.page.hud.recipes.text.text).toBe('Recipes');
    expect(harness.page.hud.recipes.root.visible).toBe(true);
    expect(harness.page.hud.brew.text.text).toBe('Choose Recipe');
    expect(harness.page.hud.brew.variant).toBe('yellow');
    expect(harness.page.hud.brew.enabled).toBe(true);
    expect(harness.page.hud.brew.handleTap()).toBe(true);
    expect(openRecipes).toHaveBeenCalledWith(0);
    expect(performCauldronAction).not.toHaveBeenCalled();

    harness.page.destroy();
    harness.dispose();
  });

  it('routes the single primary button through cancel, bottle, and collect actions', () => {
    const harness = createHarness();
    const model = createBrewingViewModel();
    const cauldron = model.brewing.cauldrons[0];
    model.actions.toggleAutoBrew = vi.fn(() => true);
    model.actions.cancelBrew = vi.fn(() => true);
    model.actions.collectBrew = vi.fn(() => true);
    model.actions.performCauldronAction = vi.fn(() => true);

    cauldron.autoBrewEnabled = true;
    harness.page.bind(model);
    expect(harness.page.hud.brew.text.text).toBe('Cancel');
    expect(harness.page.hud.brew.handleTap()).toBe(true);
    expect(model.actions.toggleAutoBrew).toHaveBeenCalledWith(0);

    cauldron.autoBrewEnabled = false;
    cauldron.activeBrew = { phase: 'brewing' };
    harness.page.bind(model);
    expect(harness.page.hud.brew.text.text).toBe('Cancel');
    expect(harness.page.hud.brew.handleTap()).toBe(true);
    expect(model.actions.cancelBrew).toHaveBeenCalledWith(0);

    cauldron.activeBrew = {
      phase: 'brewed',
      canStartBottling: true,
    };
    harness.page.bind(model);
    expect(harness.page.hud.brew.text.text).toBe('Bottle');
    expect(harness.page.hud.phaseLabel.text).toBe('Brewed');
    expect(harness.page.hud.brew.handleTap()).toBe(true);
    expect(model.actions.performCauldronAction).toHaveBeenCalledWith(
      cauldron,
      { id: 'bottle' },
    );

    cauldron.activeBrew = {
      phase: 'ready',
      canCollect: true,
    };
    harness.page.bind(model);
    expect(harness.page.hud.brew.text.text).toBe('Collect');
    expect(harness.page.hud.brew.handleTap()).toBe(true);
    expect(model.actions.collectBrew).toHaveBeenCalledWith(0);

    harness.page.destroy();
    harness.dispose();
  });

  it('hides carousel dots when there is only one cauldron', () => {
    const harness = createHarness();

    harness.page.bind(createBrewingViewModel());

    expect(harness.page.hud.getCauldrons()).toHaveLength(1);
    expect(harness.page.hud.dots.visible).toBe(false);
    expect(harness.page.hud.dots.renderable).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('renders selected potion liquid inside the cauldron landmark', () => {
    const harness = createHarness();

    harness.page.bind(
      createBrewingViewModel({ withActiveBrew: true }),
    );

    expect(harness.page.hud.cauldronLiquid.visible).toBe(true);
    expect(harness.page.hud.cauldronLiquid.renderable).toBe(true);
    expect(harness.page.hud.cauldronLiquid).toBeInstanceOf(Sprite);
    expect(harness.page.hud.cauldronLiquidColor).toBe(0x0a95f5);
    expect(harness.page.hud.cauldronLiquid).toMatchObject({
      x: harness.page.hud.cauldronArt.x,
      y: harness.page.hud.cauldronArt.y,
      width: harness.page.hud.cauldronArt.width,
      height: harness.page.hud.cauldronArt.height,
      tint: 0x0a95f5,
      alpha: 0.94,
    });
    expect(
      harness.page.hud.carouselPanel.body.getChildIndex(
        harness.page.hud.cauldronArt,
      ),
    ).toBeLessThan(
      harness.page.hud.carouselPanel.body.getChildIndex(
        harness.page.hud.cauldronLiquid,
      ),
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('hides locked configuration actions and packs the visible buttons from the right edge', () => {
    const harness = createHarness();
    const model = createBrewingViewModel();
    const cauldron = model.brewing.cauldrons[0];
    const rightEdge =
      harness.page.sourceWidth - BREWING_HUD_GEOMETRY.edge;

    cauldron.autoBrewAvailable = false;
    cauldron.autoBrewEnabled = false;
    cauldron.maxBrewQuantity = 1;
    harness.page.bind(model);

    expect(harness.page.hud.recipes.root.visible).toBe(true);
    expect(harness.page.hud.autoBrew.root.visible).toBe(false);
    expect(harness.page.hud.quantity.root.visible).toBe(false);
    expect(harness.page.hud.recipes.root.x).toBe(
      rightEdge - BREWING_HUD_GEOMETRY.recipeButtonWidth,
    );

    cauldron.autoBrewAvailable = true;
    harness.page.bind(model);

    expect(harness.page.hud.autoBrew.root.visible).toBe(true);
    expect(harness.page.hud.quantity.root.visible).toBe(false);
    expect(harness.page.hud.autoBrew.root.x).toBe(
      rightEdge - BREWING_HUD_GEOMETRY.autoButtonWidth,
    );
    expect(harness.page.hud.recipes.root.x).toBe(
      harness.page.hud.autoBrew.root.x -
        BREWING_HUD_GEOMETRY.configurationGap -
        BREWING_HUD_GEOMETRY.recipeButtonWidth,
    );

    cauldron.autoBrewAvailable = false;
    cauldron.maxBrewQuantity = 2;
    harness.page.bind(model);

    expect(harness.page.hud.autoBrew.root.visible).toBe(false);
    expect(harness.page.hud.quantity.root.visible).toBe(true);
    expect(harness.page.hud.quantity.root.x).toBe(
      rightEdge - BREWING_HUD_GEOMETRY.quantityButtonWidth,
    );
    expect(harness.page.hud.recipes.root.x).toBe(
      harness.page.hud.quantity.root.x -
        BREWING_HUD_GEOMETRY.configurationGap -
        BREWING_HUD_GEOMETRY.recipeButtonWidth,
    );
    expect([
      harness.page.hud.recipes.height,
      harness.page.hud.autoBrew.height,
      harness.page.hud.quantity.height,
    ]).toEqual([
      PIXI_UI_GEOMETRY.roomControlHeight,
      PIXI_UI_GEOMETRY.roomControlHeight,
      PIXI_UI_GEOMETRY.roomControlHeight,
    ]);

    harness.page.destroy();
    harness.dispose();
  });

  it('shows no cauldron action button while the locked slot is progression-gated', () => {
    const harness = createHarness();
    const model = createBrewingViewModel();
    model.brewing.cauldrons.push({
      id: 'buy:2',
      cauldronIndex: 1,
      cauldronNumber: 2,
      unlocked: false,
      canBuyCauldron: false,
      nextCauldronCost: 25,
      nextCauldronLockedByResearch: true,
    });
    model.brewing.selectedCauldronIndex = 1;

    harness.page.bind(model);

    expect(harness.page.hud.cauldronArt.visible).toBe(true);
    expect(harness.page.hud.lockArt.visible).toBe(true);
    expect(harness.page.hud.unlockCostButton.visible).toBe(false);
    expect(harness.page.hud.detailPanel.root.visible).toBe(false);
    expect(harness.page.hud.detailPanel.root.renderable).toBe(false);
    for (const button of [
      harness.page.hud.recipes,
      harness.page.hud.autoBrew,
      harness.page.hud.brew,
    ]) {
      expect(button.root.visible).toBe(false);
    }

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
          maxBrewQuantity: 2,
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
