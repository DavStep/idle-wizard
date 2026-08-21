import {
  ColorMatrixFilter,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import { getHerbIconFrameName } from '../../../../assets/items/herbs/herbIcons.js';
import {
  getPotionIconFrameName,
  getPotionLiquidColor,
} from '../../../../assets/items/potions/potionIcons.js';
import { PixiOwnedDialogSurface } from '../../primitives/PixiOwnedDialogSurface.js';
import {
  PIXI_COST_BUTTON_GEOMETRY,
  PixiCostButton,
} from '../../primitives/PixiCostButton.js';
import { PixiTextButton } from '../../primitives/PixiTextButton.js';
import { PixiNineSliceFrame } from '../../primitives/PixiNineSliceFrame.js';
import {
  createTimedProgressWindow,
} from '../../primitives/PixiProgressBar.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_STATUS_COLORS,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  RETAINED_PAGE_GEOMETRY,
  RETAINED_TEXT_STYLES,
  RetainedButton,
  RetainedPanel,
  RetainedTimedProgressBar,
  applyTextTheme,
  createText,
  setText,
} from '../workshop/RetainedPageKit.js';
import { MarketTitleRibbon } from '../shop/MarketTitleRibbon.js';

export const BREWING_HUD_GEOMETRY = Object.freeze({
  edge: 16,
  top: PIXI_UI_GEOMETRY.roomContentTop,
  carouselHeight: 583,
  detailTop: 534,
  detailHeight: 120,
  detailChatGap: 3,
  detailInset: 0,
  detailContentInset: 10,
  recipeButtonWidth: 78,
  recipeIconSize: 34,
  recipeIconY: 7,
  recipeLabelY: 25,
  recipeLabelFontSize: 9,
  recipeLabelLineHeight: 9,
  recipeLabelInset: 4,
  autoButtonWidth: 32,
  configurationButtonHeight: PIXI_UI_GEOMETRY.roomControlHeight,
  quantityButtonWidth: 32,
  configurationGap: 6,
  autoIconHeight: 27,
  autoLabelY: 23,
  autoHitSize: 44,
  autoHitTop: -4,
  emptyButtonWidth: 40,
  emptyButtonHeight: PIXI_UI_GEOMETRY.roomControlHeight,
  emptyButtonGapAboveDetail: 8,
  emptyIconWidth: 32,
  emptyIconHeight: 25,
  emptyLabelY: 24,
  emptyHitSize: 44,
  quantityHitSize: 44,
  potionIconSize: 50,
  carouselContentOffset: 0,
  titleHeight: PIXI_ROOT_RUN_GEOMETRY.marketTitleRibbon.height,
  previewTopGap: 62,
  ingredientRowGap: 60,
  ingredientOrbitRadiusY: 87,
  previewIdentityGap: 26,
  previewDotsBottomGap: 22,
  navigationButtonWidth: 34,
  navigationButtonHeight: 38,
  navigationSlotGap: 4,
  navigationPotionNameOpticalNudge: 2,
  navigationIconOpticalNudge: 0.7,
  ingredientSlotWidth: 56,
  ingredientSlotHeight: 54,
  ingredientIconSize: 38,
  ingredientIconCenterY: 21,
  ingredientNameY: 41,
  ingredientColumns: 3,
  ingredientRows: 2,
  ingredientSlots: 6,
  missingIngredientIconSize: 20,
  missingIngredientCompactIconSize: 14,
  missingIngredientRowHeight: 24,
  hearthWidth: 66,
  hearthWoodHeight: 33,
  hearthFlameWidth: 54,
  hearthFlameHeight: 36,
  hearthOuterFlameWidth: 132,
  hearthOuterFlameHeight: 52,
  hearthOffsetY: 56,
});

const ASSETS = Object.freeze({
  cauldron: 'source:assets/rooms/brewing/cauldron/cauldron-empty.png',
  cauldronLiquidMask:
    'source:assets/rooms/brewing/cauldron/cauldron-liquid-mask.png',
  hearthWood: 'source:assets/rooms/brewing/hearth/hearth-wood.png',
  hearthFlame: 'source:assets/rooms/brewing/hearth/hearth-flame.png',
  previous: 'source:assets/ui/brewing-carousel/chevron-left.png',
  next: 'source:assets/ui/brewing-carousel/chevron-right.png',
  settings: PIXI_ROOT_RUN_ASSETS.settingsGear,
  emptyCauldron: 'source:assets/rooms/brewing/cauldron/cauldron-empty.png',
  herbs: 'source:assets/icons/icon-herb-box.png',
  potions: 'source:assets/icons/icon-potion-box.png',
  lock: PIXI_ROOT_RUN_ASSETS.lock,
});
const POTION_PREVIEW_SOURCE_INSETS = Object.freeze({
  top: 41,
  right: 41,
  bottom: 41,
  left: 41,
});
const POTION_PREVIEW_BORDER_INSETS = Object.freeze({
  top: 49 / 3,
  right: 50 / 3,
  bottom: 50 / 3,
  left: 49 / 3,
});

const COMPACT_CAULDRON_ACTION_LABEL_STYLE = Object.freeze({
  fontSize: 10,
  lineHeight: 12,
});

const BREWING_DETAIL_TEXT_STYLE = Object.freeze({
  title: Object.freeze({ fontSize: 11, lineHeight: 13 }),
  body: Object.freeze({ fontSize: 10, lineHeight: 12 }),
  small: Object.freeze({ fontSize: 9, lineHeight: 11 }),
});
const POTION_PREVIEW_BACKGROUND_COLOR = 0x0e1016;
const BREWING_CAULDRON_REWARD_ANCHOR_ID =
  'brewing.cauldron.liquid';
const BREWING_STATUS_TEXTURE_PADDING = 1;
const RETAINED_INGREDIENT_NAME_STYLE = Object.freeze({
  fontSize: 10,
  lineHeight: 11,
  align: 'center',
  wordWrap: true,
  wordWrapWidth: 54,
});
const RETAINED_INGREDIENT_COUNT_STYLE = Object.freeze({
  fontSize: 8,
  lineHeight: 9,
});
const BREWING_MISSING_INGREDIENT_TITLE_STYLE = Object.freeze({
  fontSize: 12,
  lineHeight: 14,
  fontWeight: '700',
});
const BREWING_MISSING_INGREDIENT_LABEL_STYLE = Object.freeze({
  fontSize: 11,
  lineHeight: 13,
});
const BREWING_MISSING_INGREDIENT_COUNT_STYLE = Object.freeze({
  fontSize: 11,
  lineHeight: 13,
});
const INGREDIENT_SLOT_BORDER_INSETS = Object.freeze({
  top: 12,
  right: 12,
  bottom: 12,
  left: 12,
});
const AUTO_GEAR_STEP_INTERVAL_MS = 320;
const AUTO_GEAR_STEP_DURATION_MS = 70;
const AUTO_GEAR_STEP_RADIANS = Math.PI / 8;
const CAULDRON_CHANGE_MOTION_DURATION_MS = 240;
const CAULDRON_CHANGE_TRAVEL = 18;
const PRIMARY_ACTION_MOTION_DURATION_MS = 240;
const INGREDIENT_SLOT_ARRIVAL_DURATION_MS = 220;
const INGREDIENT_ORBIT_MOTION_DURATION_MS = 260;
const CAULDRON_INGREDIENT_IMPACT_DURATION_MS = 220;
const CAULDRON_COMPLETION_MOTION_DURATION_MS = 320;
const PREPARED_LIQUID_CYCLE_MS = 2_400;
const BREWING_LIQUID_CYCLE_MS = 900;
const CAULDRON_BUBBLE_RISE_SCALE = 4;
const CAULDRON_AMBIENT_TRAVEL = 0.45;
const CAULDRON_AMBIENT_SCALE_X = 0.006;
const CAULDRON_AMBIENT_SCALE_Y = 0.004;
const USED_INGREDIENT_CONTENT_ALPHA = 0.34;
const HEARTH_IGNITION_DURATION_MS = 220;
const HEARTH_EXTINGUISH_DURATION_MS = 150;
const HEARTH_FLICKER_CYCLE_MS = 760;

export class BrewingHudPixi {
  constructor({
    assetManager = null,
    inputRouter = null,
    semanticTargets = null,
    page = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.semanticTargets = semanticTargets;
    this.page = page;
    this.model = {};
    this.actions = {};
    this.selectedIndex = 0;
    this.autoBrewMotionEnabled = false;
    this.autoBrewMotionStartedAt = null;
    this.cauldronChangeMotion = null;
    this.cauldronChangeRestState = null;
    this.cauldronMotionMode = 'idle';
    this.cauldronMotionModeStartedAt = 0;
    this.cauldronImpactMotion = null;
    this.completionMotionStart = null;
    this.primaryActionMotionStart = null;
    this.ingredientOrbitMotion = null;
    this.previewOffsetY = 0;
    this.lastMotionCauldronKey = null;
    this.boundMotionStates = new Map();
    this.cauldronTapLockUntilByIndex = new Map();
    this.root = new Container({ label: 'brewing-fantasy-hud' });

    this.carouselPanel = new RetainedPanel({
      assetManager,
      label: '',
      panelLabel: 'brewing-carousel-panel',
      shadowKind: 'none',
    });
    this.hidePreviewPanelChrome();
    this.detailPanel = new RetainedPanel({
      assetManager,
      label: '',
      panelLabel: 'brewing-batch-detail-panel',
      shadowKind: 'none',
    });
    this.lockedDetailFrame = new Graphics({
      label: 'brewing-locked-batch-detail-frame',
    });
    this.lockedDetailFrame.eventMode = 'none';
    this.lockedDetailFrame.visible = false;
    this.lockedDetailFrame.renderable = false;
    this.lockedDetailFrameEnabled = false;
    this.lockedDetailWidth = 0;
    this.lockedDetailHeight = 0;
    this.root.addChild(
      this.carouselPanel.root,
      this.detailPanel.root,
      this.lockedDetailFrame,
    );

    this.cauldronTitlePlaque = new MarketTitleRibbon({
      assetManager,
      assetId: PIXI_ROOT_RUN_ASSETS.marketTitleRibbonBlue,
      label: 'brewing-carousel-cauldron-title-ribbon',
    });
    this.cauldronStars = this.cauldronTitlePlaque.stars;
    this.cauldronTitle = this.cauldronTitlePlaque.title;
    this.recipeOrbit = new Graphics({
      label: 'brewing-recipe-orbit',
    });
    this.recipeOrbitFeedback = new Graphics({
      label: 'brewing-recipe-orbit-feedback',
    });
    this.recipeOrbitFeedback.eventMode = 'none';
    this.cauldronArt = new Sprite(getTexture(assetManager, ASSETS.cauldron));
    this.cauldronArt.anchor.set(0.5);
    this.cauldronArt.label = 'brewing-carousel-cauldron-art';
    this.cauldronHearth = new BrewingCauldronHearth({ assetManager });
    this.cauldronTapRegistration =
      this.inputRouter?.registerPressTarget?.({
        id: 'brewing.cauldron.tap',
        displayObject: this.cauldronArt,
        fallbackHitTest: true,
        enabled: () =>
          this.canAccelerateSelectedCauldron() ||
          this.isSelectedCauldronResearchLocked(),
        slop: 12,
        sound: false,
        onActivate: () => this.activateSelectedCauldron(),
      }) ?? null;
    this.semanticTargets?.register?.({
      semanticId: BREWING_CAULDRON_REWARD_ANCHOR_ID,
      displayObject: this.cauldronArt,
      state: () => ({
        visible:
          this.root.visible &&
          this.root.renderable &&
          this.cauldronArt.visible &&
          this.cauldronArt.renderable,
        active: !this.root.destroyed,
      }),
    });
    this.semanticTargets?.register?.({
      semanticId: 'brewing.cauldron.tap',
      displayObject: this.cauldronArt,
      state: () => ({
        visible:
          this.root.visible &&
          this.root.renderable &&
          this.cauldronArt.visible &&
          this.cauldronArt.renderable,
        interactive:
          this.canAccelerateSelectedCauldron() ||
          this.isSelectedCauldronResearchLocked(),
        enabled:
          this.canAccelerateSelectedCauldron() ||
          this.isSelectedCauldronResearchLocked(),
        active: !this.root.destroyed,
      }),
      activate: () => this.activateSelectedCauldron(),
    });
    this.cauldronLiquid = new Sprite(
      getTexture(assetManager, ASSETS.cauldronLiquidMask),
    );
    this.cauldronLiquid.anchor.set(0.5);
    this.cauldronLiquid.alpha = 0.94;
    this.cauldronLiquid.label = 'brewing-carousel-cauldron-liquid';
    this.cauldronLiquidHighlight = new Graphics({
      label: 'brewing-carousel-cauldron-liquid-highlight',
    });
    this.cauldronStateFx = new Graphics({
      label: 'brewing-carousel-state-feedback',
    });
    this.cauldronStateFx.eventMode = 'none';
    this.lockedCauldronFilter = createLockedArtFilter();
    this.lockArt = new Sprite(getTexture(assetManager, ASSETS.lock));
    this.lockArt.anchor.set(0.5);
    this.lockArt.label = 'brewing-carousel-lock-art';
    this.lockLabel = centeredText('', RETAINED_TEXT_STYLES.bold);
    this.lockLabel.anchor.set(0.5, 0);
    this.dots = new Graphics({ label: 'brewing-carousel-dots' });
    this.carouselPanel.body.addChild(
      this.cauldronTitlePlaque.root,
      this.recipeOrbit,
      this.recipeOrbitFeedback,
      this.cauldronHearth.root,
      this.cauldronArt,
      this.cauldronLiquid,
      this.cauldronLiquidHighlight,
      this.cauldronStateFx,
      this.lockArt,
      this.lockLabel,
      this.dots,
    );

    this.previous = this.createButton('previous', '', 'gray', () =>
      this.page?.selectCauldron?.(this.selectedIndex - 1),
    );
    this.next = this.createButton('next', '', 'gray', () =>
      this.page?.selectCauldron?.(this.selectedIndex + 1),
    );
    this.recipes = this.createButton(
      'recipes',
      'Recipes',
      'yellow',
      () =>
        this.actions.openRecipes?.(this.getSelectedCauldronActionIndex()),
      'brewing:recipes',
      { fallbackHitTest: true },
    );
    this.recipePotionIcon = new Sprite(Texture.EMPTY);
    this.recipePotionIcon.anchor.set(0.5);
    this.recipePotionIcon.eventMode = 'none';
    this.recipePotionIcon.label = 'brewing-selected-recipe-icon';
    this.recipes.control.visual.addChildAt(
      this.recipePotionIcon,
      this.recipes.control.visual.getChildIndex(
        this.recipes.control.textLabel,
      ),
    );
    // The shared skin refresh recenters labels, so restore this compound layout.
    const syncRecipeAppearance =
      this.recipes.control.syncContentAppearance.bind(this.recipes.control);
    this.recipes.control.syncContentAppearance = (visualGeometry) => {
      syncRecipeAppearance(visualGeometry);
      this.layoutRecipeButtonContent();
    };
    this.autoBrew = this.createButton('autobrew', 'Auto', 'yellow', () =>
      this.actions.toggleAutoBrew?.(this.getSelectedCauldronActionIndex()),
    );
    this.emptyCauldron = this.createButton(
      'empty-cauldron',
      'Empty',
      'red',
      () =>
        this.actions.emptyCauldron?.(this.getSelectedCauldronActionIndex()) ??
        this.actions.clearRecipe?.(this.getSelectedCauldronActionIndex()) ??
        false,
    );
    this.quantity = this.createButton('quantity', 'x1', 'yellow', () => {
      const cauldron = this.getSelectedCauldron();
      const quantity = cauldron?.quantityAction ?? {};
      return (
        this.actions.selectBrewQuantity?.(
          quantity.nextQuantity ?? nextBrewQuantity(cauldron),
          this.getSelectedCauldronActionIndex(),
        ) ?? false
      );
    });
    this.brew = this.createButton(
      'brew',
      'Brew',
      'green',
      () => this.activatePrimaryAction(),
      'brewing:action',
    );
    this.unlockCostButton = new PixiCostButton({
      assetManager,
      inputRouter,
      semanticRegistry: semanticTargets,
      semanticId: 'brewing.unlock-cauldron',
      width: PIXI_COST_BUTTON_GEOMETRY.stackedWidth,
      height: PIXI_COST_BUTTON_GEOMETRY.stackedHeight,
      stacked: true,
      label: 'brewing-unlock-cauldron',
      action: () =>
        this.actions.performCauldronAction?.(
          this.getSelectedCauldron(),
          { id: 'buy' },
        ),
    });
    this.unlockCostButton.visible = false;
    this.unlockCostButton.renderable = false;
    this.unlockCostButton.setEnabled(false);
    this.autoBrew.control.textLabel
      .setFontSize(COMPACT_CAULDRON_ACTION_LABEL_STYLE.fontSize)
      .setLineHeight(COMPACT_CAULDRON_ACTION_LABEL_STYLE.lineHeight);
    this.emptyCauldron.control.textLabel
      .setFontSize(COMPACT_CAULDRON_ACTION_LABEL_STYLE.fontSize)
      .setLineHeight(COMPACT_CAULDRON_ACTION_LABEL_STYLE.lineHeight);
    this.actionIcons = {
      autoBrew: createSpriteActionIcon(
        getTexture(assetManager, ASSETS.settings),
        'brewing-autobrew-action-icon',
      ),
      emptyCauldron: createSpriteActionIcon(
        getTexture(assetManager, ASSETS.emptyCauldron),
        'brewing-empty-cauldron-action-icon',
      ),
    };
    this.navigationIcons = {
      previous: createSpriteActionIcon(
        getTexture(assetManager, ASSETS.previous),
        'brewing-previous-action-icon',
      ),
      next: createSpriteActionIcon(
        getTexture(assetManager, ASSETS.next),
        'brewing-next-action-icon',
      ),
    };
    attachActionIcon(this.previous, this.navigationIcons.previous);
    attachActionIcon(this.next, this.navigationIcons.next);
    attachActionIcon(this.autoBrew, this.actionIcons.autoBrew);
    attachActionIcon(
      this.emptyCauldron,
      this.actionIcons.emptyCauldron,
    );
    for (const button of [
      this.previous,
      this.next,
      this.recipes,
      this.autoBrew,
      this.emptyCauldron,
      this.quantity,
      this.brew,
    ]) {
      this.root.addChild(button.root);
    }
    this.root.addChild(this.unlockCostButton);

    this.potionPreviewFrame = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: POTION_PREVIEW_SOURCE_INSETS,
      borderInsets: POTION_PREVIEW_BORDER_INSETS,
      width: 58,
      height: 58,
      label: 'brewing-potion-preview-well',
    });
    this.potionPreviewFrame.tint = POTION_PREVIEW_BACKGROUND_COLOR;
    this.potionIcon = new Sprite(Texture.EMPTY);
    this.potionIcon.anchor.set(0.5);
    this.potionName = createText('', {
      ...BREWING_DETAIL_TEXT_STYLE.title,
      fontWeight: '700',
      wordWrap: true,
      wordWrapWidth: 96,
      align: 'center',
    });
    this.potionName.anchor.set(0.5, 0);
    this.rarity = centeredText('', BREWING_DETAIL_TEXT_STYLE.small);
    this.rarity.anchor.set(0.5, 0);
    this.ownedLabel = centeredText('', BREWING_DETAIL_TEXT_STYLE.body);
    this.ownedLabel.anchor.set(0.5, 0);
    this.batchLabel = centeredText('', {
      ...BREWING_DETAIL_TEXT_STYLE.body,
      fontWeight: '700',
    });
    this.batchLabel.anchor.set(0.5, 0);
    this.batchLabel.visible = false;
    this.batchLabel.renderable = false;
    this.ingredientsTitle = createText('Ingredients', {
      ...BREWING_DETAIL_TEXT_STYLE.title,
      fontWeight: '700',
    });
    this.ingredientsTitle.visible = false;
    this.ingredientsTitle.renderable = false;
    this.detailPanel.body.addChild(
      this.potionPreviewFrame,
      this.potionIcon,
      this.potionName,
      this.rarity,
      this.ownedLabel,
      this.batchLabel,
      this.ingredientsTitle,
    );

    this.ingredientSlots = Array.from(
      { length: BREWING_HUD_GEOMETRY.ingredientSlots },
      (_unused, index) =>
        new BrewingIngredientPickerSlot({
          index,
          assetManager,
          inputRouter,
          semanticTargets,
          onActivate: (ingredient) =>
            this.actions.openHerbPicker?.(
              this.selectedIndex,
              index,
              ingredient,
            ),
        }),
    );
    for (const slot of this.ingredientSlots) {
      this.detailPanel.body.addChild(slot.root);
    }
    this.carouselPanel.body.addChild(
      this.potionName,
      this.rarity,
      this.batchLabel,
      ...this.ingredientSlots.map((slot) => slot.root),
    );

    this.phaseLabel = createText('', {
      ...BREWING_DETAIL_TEXT_STYLE.title,
      fontWeight: '700',
      padding: BREWING_STATUS_TEXTURE_PADDING,
    });
    this.phaseTime = createText('', {
      ...BREWING_DETAIL_TEXT_STYLE.body,
      align: 'right',
      padding: BREWING_STATUS_TEXTURE_PADDING,
    });
    this.phaseTime.anchor.set(1, 0);
    this.progress = new RetainedTimedProgressBar({
      assetManager,
      label: 'brewing-batch-progress',
      tone: 'root',
    });
    this.progress.root.visible = false;
    this.progress.root.renderable = false;
    this.statusMessage = createText('', {
      ...BREWING_DETAIL_TEXT_STYLE.body,
      wordWrap: true,
      wordWrapWidth: 250,
    });
    this.missingIngredients = new BrewingMissingIngredientsRow({
      assetManager,
      maxItems: BREWING_HUD_GEOMETRY.ingredientSlots,
      theme,
    });
    this.missingIngredientsRoot = this.missingIngredients.root;
    this.missingIngredientViews = this.missingIngredients.itemViews;
    this.detailPanel.body.addChild(
      this.phaseLabel,
      this.phaseTime,
      this.progress.root,
      this.statusMessage,
      this.missingIngredientsRoot,
    );
    this.swipeRegistration =
      this.inputRouter?.registerPageSwipe?.({
        id: 'brewing.cauldron.carousel.swipe',
        displayObject: this.carouselPanel.root,
        priority: 10,
        threshold: 30,
        onSwipe: ({ direction }) =>
          this.page?.selectCauldron?.(
            this.selectedIndex + (direction === 'next' ? 1 : -1),
          ),
      }) ?? null;
    this.applyTheme(theme);
  }

  createButton(
    name,
    label,
    variant,
    action,
    tutorialId = null,
    { fallbackHitTest = false } = {},
  ) {
    return new RetainedButton({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      semanticRegistry: this.semanticTargets,
      semanticId: `brewing.${name}`,
      tutorialId,
      fallbackHitTest,
      buttonLabel: `brewing-${name}`,
      label,
      variant,
      onActivate: action,
    });
  }

  bind(model = {}, actions = {}) {
    this.restoreCauldronStateVisuals();
    this.restoreCauldronChangeVisuals();
    this.model = model;
    this.actions = actions;
    const cauldrons = this.getCauldrons();
    this.selectedIndex = clamp(
      Number.isInteger(model.selectedCauldronIndex)
        ? model.selectedCauldronIndex
        : this.selectedIndex,
      0,
      Math.max(0, cauldrons.length - 1),
    );
    const cauldron = this.getSelectedCauldron();
    const motionKey = resolveCauldronMotionKey(
      cauldron,
      this.selectedIndex,
    );
    const previousMotionState =
      this.boundMotionStates.get(motionKey) ?? null;
    const animateStateChanges =
      previousMotionState !== null &&
      this.lastMotionCauldronKey === motionKey;
    const motionNow = this.getTimerNow();
    const unlocked = cauldron?.unlocked !== false;
    const number =
      cauldron?.displayNumber ??
      cauldron?.cauldronNumber ??
      this.selectedIndex + 1;
    this.cauldronStars.setLevel(unlocked ? cauldron?.level ?? 1 : 0);
    this.cauldronStars.visible = unlocked;
    this.cauldronStars.renderable = unlocked;
    this.cauldronTitlePlaque.bind(
      unlocked ? `Cauldron ${number}` : 'Locked Cauldron',
      unlocked ? cauldron?.level ?? 1 : 0,
    );
    this.layoutCarouselHeader();
    this.cauldronArt.visible = true;
    this.cauldronArt.renderable = true;
    this.cauldronArt.alpha = 1;
    this.cauldronArt.tint = 0xffffff;
    this.cauldronArt.filters =
      !unlocked && this.lockedCauldronFilter
        ? [this.lockedCauldronFilter]
        : null;
    this.lockArt.visible = !unlocked;
    this.lockArt.renderable = this.lockArt.visible;
    setText(this.lockLabel, '');
    this.lockLabel.visible = false;
    this.lockLabel.renderable = false;
    this.previous.setModel({
      label: '',
      enabled: true,
      action: () => this.page?.selectCauldron?.(this.selectedIndex - 1),
    });
    this.previous.root.visible = this.selectedIndex > 0;
    this.previous.root.renderable = this.previous.root.visible;
    this.next.setModel({
      label: '',
      enabled: true,
      action: () => this.page?.selectCauldron?.(this.selectedIndex + 1),
    });
    this.next.root.visible = this.selectedIndex < cauldrons.length - 1;
    this.next.root.renderable = this.next.root.visible;

    const active = cauldron?.activeBrew ?? null;
    const selectedRecipe = cauldron?.selectedRecipe ?? null;
    const displayedRecipe = selectedRecipe ?? active;
    const displayedRecipeKey = displayedRecipe?.key ?? null;
    this.recipePotionIcon.texture = displayedRecipeKey
      ? getAtlasTexture(
          this.assetManager,
          getPotionIconFrameName(displayedRecipeKey),
        )
      : Texture.EMPTY;
    this.recipePotionIcon.visible = Boolean(displayedRecipe);
    this.recipePotionIcon.renderable = this.recipePotionIcon.visible;
    this.recipes.setModel({
      label: displayedRecipe?.label
        ? toTitleCase(displayedRecipe.label)
        : 'Recipes',
      enabled: unlocked && cauldron?.canSelectRecipe !== false,
      action: () =>
        this.actions.openRecipes?.(this.getSelectedCauldronActionIndex()),
    });
    this.layoutRecipeButtonContent();
    const autoBrewEnabled = cauldron?.autoBrewEnabled === true;
    const autoBrewVariant = autoBrewEnabled ? 'green' : 'yellow';
    this.autoBrew.variant = autoBrewVariant;
    this.autoBrew.control.setVariant(autoBrewVariant);
    this.autoBrew.setModel({
      label: 'Auto',
      enabled:
        autoBrewEnabled || cauldron?.autoBrewAvailable === true,
      selected: false,
      action: () =>
        this.actions.toggleAutoBrew?.(this.getSelectedCauldronActionIndex()),
    });
    this.layoutAutoBrewContent();
    this.setAutoBrewMotionEnabled(autoBrewEnabled);
    this.emptyCauldron.setModel({
      label: 'Empty',
      enabled: unlocked,
      action: () =>
        this.actions.emptyCauldron?.(this.getSelectedCauldronActionIndex()) ??
        this.actions.clearRecipe?.(this.getSelectedCauldronActionIndex()) ??
        false,
    });
    this.layoutEmptyCauldronContent();
    const quantity = cauldron?.quantityAction ?? {};
    this.quantity.setModel({
      label: quantity.label ?? `x${Math.max(1, Number(cauldron?.brewQuantity) || 1)}`,
      enabled: quantity.enabled !== false && !active,
      action: () =>
        this.actions.selectBrewQuantity?.(
          quantity.nextQuantity ?? nextBrewQuantity(cauldron),
          this.getSelectedCauldronActionIndex(),
        ),
    });
    const primaryState = resolveBrewingPrimaryState(cauldron);
    this.primaryState = primaryState;
    this.brew.variant = primaryState.variant;
    this.brew.control.setVariant(primaryState.variant);
    this.brew.setModel({
      label: !unlocked
        ? cauldron?.canBuyCauldron
          ? `Unlock ${cauldron.nextCauldronCost ?? ''}`
          : 'Locked'
        : primaryState.label,
      enabled: unlocked && primaryState.enabled,
      action: () => this.activatePrimaryAction(),
    });
    const nextMotionState = createBrewingHudMotionState(
      cauldron,
      primaryState,
    );
    if (animateStateChanges) {
      if (
        previousMotionState.primaryId !== nextMotionState.primaryId ||
        (!previousMotionState.primaryEnabled &&
          nextMotionState.primaryEnabled)
      ) {
        this.startPrimaryActionMotion(motionNow);
      }
      if (
        !previousMotionState.complete &&
        nextMotionState.complete
      ) {
        this.startCompletionMotion(motionNow);
      }
    }
    this.setCauldronMotionMode(
      resolveCauldronMotionMode(cauldron, primaryState),
      motionNow,
    );
    this.cauldronHearth.bind(
      {
        lit: unlocked && isCauldronHearthLit(cauldron),
        visible: unlocked,
      },
      motionNow,
    );
    this.setCauldronActionVisibility(unlocked, cauldron);
    this.detailPanel.root.visible = unlocked;
    this.detailPanel.root.renderable = unlocked;
    this.bindUnlockCostButton(cauldron, unlocked);
    this.bindDetail(cauldron, active, {
      animateTransitions: animateStateChanges,
      now: motionNow,
    });
    this.syncActionIcons();
    this.drawDots();
    this.boundMotionStates.set(motionKey, nextMotionState);
    this.lastMotionCauldronKey = motionKey;
  }

  bindDetail(
    cauldron = {},
    active = null,
    { animateTransitions = false, now = this.getTimerNow() } = {},
  ) {
    const recipe =
      cauldron.selectedRecipe ??
      (cauldron.match
        ? {
            key: cauldron.match.key,
            label: cauldron.match.label,
          }
        : null);
    const potionKey = active?.key ?? recipe?.key ?? 'unknownPotion';
    const potionLabel =
      active?.label ??
      recipe?.label ??
      '';
    this.detailPanel.setTitle('');
    setText(this.potionName, toTitleCase(potionLabel));
    this.potionName.visible = Boolean(this.potionName.text);
    this.potionName.renderable = this.potionName.visible;
    setText(
      this.rarity,
      recipe ? toTitleCase(recipe.rarity ?? 'common') : '',
    );
    this.rarity.visible = Boolean(this.rarity.text);
    this.rarity.renderable = this.rarity.visible;
    const owned = Number(recipe?.ownedQuantity ?? cauldron.ownedPotionQuantity ?? 0);
    setText(this.ownedLabel, `You Have ${owned}`);
    this.ownedLabel.visible = false;
    this.ownedLabel.renderable = false;
    setText(this.batchLabel, '');
    const potionFrame = getPotionIconFrameName(potionKey);
    this.potionIcon.texture = getAtlasTexture(this.assetManager, potionFrame);
    this.potionIcon.visible =
      Boolean(active || recipe) &&
      this.potionIcon.texture !== Texture.EMPTY;
    this.potionIcon.renderable = this.potionIcon.visible;
    this.cauldronLiquidColor = colorFromHex(
      getPotionLiquidColor(potionKey),
      0x8740df,
    );
    this.cauldronLiquid.visible =
      cauldron.unlocked !== false && Boolean(active);
    this.cauldronLiquid.renderable = this.cauldronLiquid.visible;
    this.cauldronLiquid.tint = this.cauldronLiquidColor;
    this.cauldronLiquidHighlight.visible = this.cauldronLiquid.visible;
    this.cauldronLiquidHighlight.renderable = this.cauldronLiquid.visible;
    this.redrawCauldronLiquid();

    const requirements = normalizeRequirements(
      recipe?.ingredients ?? cauldron.guideRows ?? cauldron.ingredients,
      cauldron.herbs ?? this.model.herbs ?? [],
      cauldron.ingredients,
    );
    const ingredientSelectionEnabled =
      cauldron.unlocked !== false &&
      !active &&
      cauldron.canAddIngredient !== false &&
      cauldron.acceptsHerbDrop !== false;
    let firstArrivingSlot = null;
    this.ingredientSlots.forEach((slot, index) => {
      const startedArrival = slot.bind(requirements[index] ?? null, {
        enabled: ingredientSelectionEnabled,
        showMissing: Boolean(recipe && !active),
        used: Boolean(active),
        animate: animateTransitions,
        now,
        reducedMotion: this.page?.prefersReducedMotion?.() === true,
      });
      if (startedArrival && firstArrivingSlot === null) {
        firstArrivingSlot = index;
      }
    });
    if (firstArrivingSlot !== null) {
      this.startIngredientArrivalMotion(firstArrivingSlot, now);
    }

    const lacksIngredients =
      !active &&
      Boolean(recipe) &&
      cauldron.recipeReadiness?.hasEnoughIngredients === false;
    const missingIngredients = lacksIngredients
        ? resolveMissingRecipeIngredients(recipe)
        : [];
    this.bindMissingIngredients(missingIngredients);
    const hasMissingIngredients = lacksIngredients;
    const hasMissingMana =
      !active &&
      Boolean(recipe) &&
      !hasMissingIngredients &&
      cauldron.recipeReadiness?.hasEnoughMana === false;

    setText(
      this.phaseLabel,
      active
        ? active.phase === 'ready'
          ? 'Bottled'
          : toTitleCase(active.phase)
        : recipe
          ? hasMissingIngredients
            ? ''
            : hasMissingMana
              ? 'Not enough mana'
              : 'Ready to Brew'
          : 'No potion selected',
    );
    this.phaseLabel.visible = !hasMissingIngredients;
    this.phaseLabel.renderable = this.phaseLabel.visible;
    setText(
      this.statusMessage,
      !active && !recipe
        ? 'Choose a recipe to start brewing'
        : hasMissingIngredients && missingIngredients.length === 0
          ? 'Restock the required herbs to continue.'
        : hasMissingMana
          ? 'Restore mana to brew this potion.'
          : '',
    );
    this.statusMessage.visible = Boolean(this.statusMessage.text);
    this.statusMessage.renderable = this.statusMessage.visible;
    this.syncActiveTimer(active, now);
    this.updateActiveTimer(now);
  }

  bindMissingIngredients(ingredients = []) {
    this.missingIngredients.bind(ingredients);
  }

  layoutMissingIngredients() {
    if (!Number.isFinite(this.batchStatusWidth)) {
      return;
    }
    this.missingIngredients.setBounds(
      78,
      28,
      this.batchStatusWidth,
      BREWING_HUD_GEOMETRY.missingIngredientRowHeight,
    );
  }

  getTimerNow() {
    const modelNow = Number(this.model?.now);
    if (Number.isFinite(modelNow)) {
      return modelNow;
    }
    const pageNow = Number(this.page?.timeSource?.());
    return Number.isFinite(pageNow) ? pageNow : Date.now();
  }

  syncActiveTimer(active, now) {
    const timed =
      active?.phase === 'brewing' || active?.phase === 'bottling';
    this.progress.control.setTone(
      active?.phase === 'bottling' ? 'yellow' : 'root',
    );
    this.progress.root.visible = timed;
    this.progress.root.renderable = timed;
    if (!timed) {
      this.progress.clearTimer(0);
      return;
    }

    this.progress
      .setTimer(createTimedProgressWindow(active, now))
      .updateTimer(now);
  }

  updateActiveTimer(now) {
    const active = this.getSelectedCauldron()?.activeBrew ?? null;
    const timed =
      active?.phase === 'brewing' || active?.phase === 'bottling';
    this.progress.root.visible = timed;
    this.progress.root.renderable = timed;
    if (!timed) {
      this.progress.clearTimer(0);
      setText(this.phaseTime, '');
      return;
    }

    const { remainingMs } = this.progress.updateTimer(now);
    setText(
      this.phaseTime,
      remainingMs > 0 ? formatTime(remainingMs) : '',
    );
  }

  activatePrimaryAction() {
    const cauldron = this.getSelectedCauldron();
    const state = this.primaryState ?? resolveBrewingPrimaryState(cauldron);
    const brewSources =
      state.id === 'brew'
        ? this.captureIngredientMotionSources()
        : [];
    let result;
    switch (state.id) {
      case 'recipes':
        result =
          this.actions.openRecipes?.(this.getSelectedCauldronActionIndex()) ??
          false;
        break;
      case 'cancel':
        if (
          cauldron?.activeBrew?.phase === 'brewing' ||
          cauldron?.activeBrew?.phase === 'bottling'
        ) {
          result =
            this.actions.cancelBrew?.(this.getSelectedCauldronActionIndex()) ??
            false;
          break;
        }
        result =
          this.actions.toggleAutoBrew?.(
            this.getSelectedCauldronActionIndex(),
          ) ?? false;
        break;
      case 'bottle':
        result =
          this.actions.performCauldronAction?.(cauldron, { id: 'bottle' }) ??
          false;
        break;
      default:
        result =
          this.actions.performCauldronAction?.(
            cauldron,
            cauldron?.primaryAction ?? { id: 'brew' },
          ) ?? false;
        break;
    }
    if (
      state.id === 'brew' &&
      result !== false &&
      result?.ok !== false
    ) {
      this.page?.animateHudBrewIngredients?.(this, brewSources);
    }
    return result;
  }

  captureIngredientMotionSources() {
    if (typeof this.page?.getDisplayObjectCenter !== 'function') {
      return [];
    }
    return this.ingredientSlots
      .filter(
        (slot) =>
          Boolean(slot.model?.itemKey ?? slot.model?.key) &&
          slot.icon.visible &&
          slot.icon.texture !== Texture.EMPTY,
      )
      .map((slot) => ({
        kind: slot.model.kind ?? 'herb',
        key: slot.model.itemKey ?? slot.model.key,
        texture: slot.icon.texture,
        size: Math.max(slot.icon.width, slot.icon.height),
        position: this.page.getDisplayObjectCenter(slot.icon),
      }));
  }

  getCauldrons() {
    return Array.isArray(this.model.cauldrons) ? this.model.cauldrons : [];
  }

  getSelectedCauldron() {
    return this.getCauldrons()[this.selectedIndex] ?? {};
  }

  getSelectedCauldronActionIndex() {
    const cauldron = this.getSelectedCauldron();
    return Number.isInteger(cauldron?.cauldronIndex)
      ? cauldron.cauldronIndex
      : this.selectedIndex;
  }

  canAccelerateSelectedCauldron() {
    const cauldron = this.getSelectedCauldron();
    const active = cauldron?.activeBrew ?? null;
    const remainingMs = Number.isFinite(Number(active?.remainingMs))
      ? Number(active.remainingMs)
      : Number(active?.endTimeMs) - this.getInteractionNow();
    if (
      cauldron?.unlocked === false ||
      !active ||
      (active.phase !== 'brewing' && active.phase !== 'bottling') ||
      !Number.isFinite(remainingMs) ||
      remainingMs <= 0
    ) {
      return false;
    }
    return (
      this.getInteractionNow() >=
      (this.cauldronTapLockUntilByIndex.get(this.selectedIndex) ?? 0)
    );
  }

  isSelectedCauldronResearchLocked() {
    const cauldron = this.getSelectedCauldron();
    return (
      cauldron?.unlocked === false &&
      cauldron?.nextCauldronLockedByResearch === true &&
      Boolean(cauldron?.nextCauldronRequiresResearchId)
    );
  }

  activateSelectedCauldron() {
    if (this.isSelectedCauldronResearchLocked()) {
      return (
        this.actions.navigateLockedCauldronResearch?.(
          this.getSelectedCauldron(),
        ) ?? false
      );
    }
    return this.accelerateSelectedCauldron();
  }

  accelerateSelectedCauldron() {
    if (!this.canAccelerateSelectedCauldron()) {
      return {
        ok: false,
        reason: 'tap_cooldown',
      };
    }
    const result =
      this.actions.accelerateCauldron?.(
        this.getSelectedCauldronActionIndex(),
      ) ?? false;
    if (result?.ok === true) {
      this.cauldronTapLockUntilByIndex.set(
        this.selectedIndex,
        this.getInteractionNow() +
          Math.max(0, Number(result.cooldownMs) || 0),
      );
    }
    return result;
  }

  getInteractionNow() {
    const now = Number(this.page?.timeSource?.());
    return Number.isFinite(now) ? now : Date.now();
  }

  drawDots() {
    const cauldrons = this.getCauldrons();
    this.dots.clear();
    this.dots.visible = cauldrons.length > 1;
    this.dots.renderable = this.dots.visible;
    if (!this.dots.visible) {
      return;
    }
    const gap = 17;
    const start = -(cauldrons.length - 1) * gap * 0.5;
    cauldrons.forEach((cauldron, index) => {
      const selected = index === this.selectedIndex;
      this.dots
        .circle(start + index * gap, 0, selected ? 4.5 : 3.5)
        .fill({
          color: selected
            ? 0xf2a51f
            : cauldron.unlocked === false
              ? 0x11151e
              : 0x485262,
        })
        .stroke({ color: 0x090b10, width: 1.5 });
    });
  }

  layout(
    sourceWidth,
    sourceHeight = PIXI_UI_GEOMETRY.sourceHeight,
    { worldChatVisible = true } = {},
  ) {
    this.sourceWidth = sourceWidth;
    this.sourceHeight = sourceHeight;
    const edge = BREWING_HUD_GEOMETRY.edge;
    const width = sourceWidth - edge * 2;
    const detailTop = Math.max(
      BREWING_HUD_GEOMETRY.detailTop,
      resolveBrewingDetailTop(sourceHeight, worldChatVisible),
    );
    this.previewOffsetY = detailTop - BREWING_HUD_GEOMETRY.detailTop;
    const carouselHeight =
      detailTop +
      BREWING_HUD_GEOMETRY.detailHeight -
      BREWING_HUD_GEOMETRY.top;
    const ingredientPositions = resolveIngredientPositions(
      width,
      this.previewOffsetY,
    );
    const cauldronCenterY = resolveCauldronCenterY(ingredientPositions);
    this.carouselPanel.setBounds(
      edge,
      BREWING_HUD_GEOMETRY.top,
      width,
      carouselHeight,
    );
    this.hidePreviewPanelChrome();
    this.detailPanel.setBounds(
      edge + BREWING_HUD_GEOMETRY.detailInset,
      detailTop,
      width - BREWING_HUD_GEOMETRY.detailInset * 2,
      BREWING_HUD_GEOMETRY.detailHeight,
    );
    this.layoutCarouselHeader();
    this.cauldronArt.position.set(width / 2, cauldronCenterY);
    this.cauldronArt.width = 116;
    this.cauldronArt.height = 94;
    this.cauldronHearth.setBounds(
      width / 2,
      cauldronCenterY + BREWING_HUD_GEOMETRY.hearthOffsetY,
    );
    this.cauldronLiquid.position.set(
      this.cauldronArt.x,
      this.cauldronArt.y,
    );
    this.cauldronLiquid.alpha = 0.94;
    this.cauldronLiquid.width = this.cauldronArt.width;
    this.cauldronLiquid.height = this.cauldronArt.height;
    this.redrawCauldronLiquid();
    this.cauldronLiquidHighlight.position.set(0, 0);
    this.lockArt.position.set(
      width / 2,
      cauldronCenterY,
    );
    this.lockArt.alpha = 1;
    this.lockArt.width = 44;
    this.lockArt.height = 44;
    this.lockLabel.position.set(
      width / 2,
      cauldronCenterY + 42,
    );
    this.dots.position.set(
      width / 2,
      detailTop -
        BREWING_HUD_GEOMETRY.top -
        BREWING_HUD_GEOMETRY.previewDotsBottomGap,
    );
    this.drawRecipeOrbit(width);
    this.captureCauldronChangeRestState();
    const lowerLeftSlot = ingredientPositions[2];
    const lowerRightSlot = ingredientPositions[3];
    const potionIdentityY =
      lowerLeftSlot.y +
      BREWING_HUD_GEOMETRY.ingredientSlotHeight +
      BREWING_HUD_GEOMETRY.previewIdentityGap;
    const potionNameLineCenterY =
      potionIdentityY +
      BREWING_DETAIL_TEXT_STYLE.title.lineHeight / 2 +
      BREWING_HUD_GEOMETRY.navigationPotionNameOpticalNudge;
    const navigationTop =
      BREWING_HUD_GEOMETRY.top +
      potionNameLineCenterY -
      BREWING_HUD_GEOMETRY.navigationButtonHeight / 2;
    this.previous.setBounds(
      edge +
        lowerLeftSlot.x -
        BREWING_HUD_GEOMETRY.navigationSlotGap -
        BREWING_HUD_GEOMETRY.navigationButtonWidth,
      navigationTop,
      BREWING_HUD_GEOMETRY.navigationButtonWidth,
      BREWING_HUD_GEOMETRY.navigationButtonHeight,
    );
    this.next.setBounds(
      edge +
        lowerRightSlot.x +
        BREWING_HUD_GEOMETRY.ingredientSlotWidth +
        BREWING_HUD_GEOMETRY.navigationSlotGap,
      navigationTop,
      BREWING_HUD_GEOMETRY.navigationButtonWidth,
      BREWING_HUD_GEOMETRY.navigationButtonHeight,
    );
    layoutNavigationIcon(
      this.previous,
      this.navigationIcons.previous,
      -BREWING_HUD_GEOMETRY.navigationIconOpticalNudge,
    );
    layoutNavigationIcon(
      this.next,
      this.navigationIcons.next,
      BREWING_HUD_GEOMETRY.navigationIconOpticalNudge,
    );
    this.unlockCostButton.setBounds(
      (sourceWidth - PIXI_COST_BUTTON_GEOMETRY.stackedWidth) / 2,
      detailTop +
        (BREWING_HUD_GEOMETRY.detailHeight -
          PIXI_COST_BUTTON_GEOMETRY.stackedHeight) /
          2,
      PIXI_COST_BUTTON_GEOMETRY.stackedWidth,
      PIXI_COST_BUTTON_GEOMETRY.stackedHeight,
    );
    this.potionPreviewFrame.position.set(10, 10);
    this.potionPreviewFrame.setSize(
      58,
      58,
      POTION_PREVIEW_BORDER_INSETS,
    );
    this.potionIcon.position.set(39, 39);
    this.potionIcon.width = BREWING_HUD_GEOMETRY.potionIconSize;
    this.potionIcon.height = BREWING_HUD_GEOMETRY.potionIconSize;
    this.potionName.position.set(
      width / 2,
      potionIdentityY,
    );
    this.rarity.position.set(
      width / 2,
      this.potionName.y +
        (this.potionName.visible
          ? this.potionName.height + 1
          : 0),
    );
    this.ownedLabel.position.set(36, 72);
    this.batchLabel.position.set(
      width / 2,
      this.rarity.y +
        (this.rarity.visible
          ? this.rarity.height + 1
          : 0),
    );
    this.ingredientSlots.forEach((slot, index) => {
      const position = ingredientPositions[index];
      slot.setBounds(
        position.x,
        position.y,
        BREWING_HUD_GEOMETRY.ingredientSlotWidth,
        BREWING_HUD_GEOMETRY.ingredientSlotHeight,
      );
    });
    const detailWidth =
      width - BREWING_HUD_GEOMETRY.detailInset * 2;
    this.lockedDetailFrame.position.set(
      this.detailPanel.root.x,
      this.detailPanel.root.y,
    );
    this.lockedDetailWidth = detailWidth;
    this.lockedDetailHeight = BREWING_HUD_GEOMETRY.detailHeight;
    this.redrawLockedDetailFrame();
    this.phaseLabel.position.set(78, 10);
    this.phaseTime.position.set(detailWidth - 12, 12);
    this.progress.setBounds(78, 34, detailWidth - 90, 11);
    this.batchStatusWidth = detailWidth - 90;
    this.statusMessage.position.set(this.phaseLabel.x, 34);
    this.layoutMissingIngredients();
    this.emptyCauldron.setBounds(
      sourceWidth -
        edge -
        BREWING_HUD_GEOMETRY.emptyButtonWidth,
      detailTop -
        BREWING_HUD_GEOMETRY.emptyButtonHeight -
        BREWING_HUD_GEOMETRY.emptyButtonGapAboveDetail,
      BREWING_HUD_GEOMETRY.emptyButtonWidth,
      BREWING_HUD_GEOMETRY.emptyButtonHeight,
    );
    this.layoutEmptyCauldronContent();
    this.recipes.setBounds(
      this.emptyCauldron.root.x -
        BREWING_HUD_GEOMETRY.configurationGap -
        BREWING_HUD_GEOMETRY.recipeButtonWidth,
      this.emptyCauldron.root.y,
      BREWING_HUD_GEOMETRY.recipeButtonWidth,
      BREWING_HUD_GEOMETRY.configurationButtonHeight,
    );
    this.layoutRecipeButtonContent();
    this.layoutConfigurationButtons(sourceWidth);
    this.brew.setBounds(
      edge +
        BREWING_HUD_GEOMETRY.detailInset +
        BREWING_HUD_GEOMETRY.detailContentInset,
      detailTop + 72,
      detailWidth -
        BREWING_HUD_GEOMETRY.detailContentInset * 2,
      38,
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.carouselPanel.applyTheme(this.theme);
    this.detailPanel.applyTheme(this.theme);
    this.hidePreviewPanelChrome();
    this.potionPreviewFrame.setTexture(
      getTexture(this.assetManager, PIXI_ROOT_RUN_ASSETS.researchArt),
      POTION_PREVIEW_SOURCE_INSETS,
    );
    applyTextTheme(this.lockLabel, this.theme, this.lockLabel.style);
    for (const text of [
      this.potionName,
      this.rarity,
      this.batchLabel,
    ]) {
      applyTextTheme(text, this.theme, text.style);
    }
    applyTextTheme(this.ownedLabel, this.theme, {
      ...BREWING_DETAIL_TEXT_STYLE.body,
      fill: this.theme.muted,
    });
    applyTextTheme(this.ingredientsTitle, this.theme, {
      ...BREWING_DETAIL_TEXT_STYLE.title,
      fontWeight: '700',
      fill: this.theme.text,
    });
    applyTextTheme(this.phaseLabel, this.theme, {
      ...BREWING_DETAIL_TEXT_STYLE.title,
      fontWeight: '700',
      fill: this.theme.text,
      padding: BREWING_STATUS_TEXTURE_PADDING,
    });
    applyTextTheme(this.phaseTime, this.theme, {
      ...BREWING_DETAIL_TEXT_STYLE.body,
      align: 'right',
      fill: this.theme.text,
      padding: BREWING_STATUS_TEXTURE_PADDING,
    });
    applyTextTheme(this.statusMessage, this.theme, {
      ...BREWING_DETAIL_TEXT_STYLE.body,
      fill: this.theme.muted,
    });
    this.missingIngredients.applyTheme(this.theme);
    for (const button of [
      this.previous,
      this.next,
      this.recipes,
      this.autoBrew,
      this.emptyCauldron,
      this.quantity,
      this.brew,
    ]) {
      button.applyTheme(this.theme);
    }
    this.layoutRecipeButtonContent();
    this.unlockCostButton.applyTheme(this.theme);
    this.redrawLockedDetailFrame();
    this.progress.applyTheme(this.theme);
    for (const slot of this.ingredientSlots) {
      slot.applyTheme(this.theme);
    }
    this.syncActionIcons();
    this.drawRecipeOrbit(this.carouselPanel.width);
  }

  layoutCarouselHeader() {
    this.cauldronTitlePlaque.setMaxWidth(this.sourceWidth);
    this.cauldronTitlePlaque.root.position.set(
      (this.carouselPanel.width - this.cauldronTitlePlaque.width) / 2,
      BREWING_HUD_GEOMETRY.carouselContentOffset,
    );
  }

  drawRecipeOrbit(width) {
    if (!Number.isFinite(width) || width <= 0) {
      return;
    }
    const centerX = width / 2;
    const ingredientPositions = resolveIngredientPositions(
      width,
      this.previewOffsetY,
    );
    const centerY = resolveCauldronCenterY(ingredientPositions);
    this.recipeOrbit.position.set(0, 0);
    this.recipeOrbit
      .clear()
      .ellipse(
        centerX,
        centerY,
        128,
        BREWING_HUD_GEOMETRY.ingredientOrbitRadiusY,
      )
      .stroke({ color: 0x66596f, width: 1, alpha: 0.42 });
    for (const position of ingredientPositions) {
      this.recipeOrbit
        .moveTo(position.x + 28, position.y + 27)
        .lineTo(centerX, centerY)
        .stroke({ color: 0x66596f, width: 1, alpha: 0.28 });
    }
  }

  redrawCauldronLiquid() {
    const width = this.cauldronArt.width || 116;
    const height = this.cauldronArt.height || 94;
    const centerX = this.cauldronArt.x;
    const centerY = this.cauldronArt.y;
    const liquidCenterY = centerY - height * 0.312;
    this.cauldronLiquidHighlight
      .clear()
      .ellipse(
        centerX - width * 0.09,
        liquidCenterY - height * 0.008,
        width * 0.08,
        height * 0.018,
      )
      .fill({ color: 0xbfe9ff, alpha: 0.45 });
  }

  setCauldronActionVisibility(unlocked, cauldron = {}) {
    const autoVisible =
      unlocked &&
      (cauldron.autoAction?.visible ??
        (cauldron.autoBrewEnabled === true ||
          cauldron.autoBrewAvailable === true));
    const quantityVisible =
      unlocked && isBrewingQuantityActionVisible(cauldron);

    this.recipes.root.visible = unlocked;
    this.recipes.root.renderable = unlocked;
    this.emptyCauldron.root.visible = unlocked;
    this.emptyCauldron.root.renderable = unlocked;
    this.brew.root.visible = unlocked;
    this.brew.root.renderable = unlocked;
    this.quantity.root.visible = quantityVisible;
    this.quantity.root.renderable = quantityVisible;
    this.autoBrew.root.visible = autoVisible;
    this.autoBrew.root.renderable = autoVisible;
    this.layoutConfigurationButtons();
  }

  layoutConfigurationButtons(sourceWidth = this.sourceWidth) {
    if (!Number.isFinite(sourceWidth)) {
      return;
    }

    let left = BREWING_HUD_GEOMETRY.edge;
    const controls = [
      [this.quantity, BREWING_HUD_GEOMETRY.quantityButtonWidth],
      [this.autoBrew, BREWING_HUD_GEOMETRY.autoButtonWidth],
    ];

    for (const [button, width] of controls) {
      if (!button.root.visible) {
        continue;
      }
      button.setBounds(
        left,
        this.emptyCauldron.root.y,
        width,
        BREWING_HUD_GEOMETRY.configurationButtonHeight,
      );
      left += width + BREWING_HUD_GEOMETRY.configurationGap;
    }

    layoutCompactHitArea(
      this.quantity,
      BREWING_HUD_GEOMETRY.quantityHitSize,
    );
    this.layoutAutoBrewContent();
  }

  hidePreviewPanelChrome() {
    for (const displayObject of [
      this.carouselPanel.shadow,
      this.carouselPanel.fallback,
      this.carouselPanel.frame,
      this.carouselPanel.titleBacking,
    ]) {
      displayObject.visible = false;
      displayObject.renderable = false;
    }
  }

  bindUnlockCostButton(cauldron, unlocked) {
    const show =
      !unlocked &&
      !cauldron?.nextCauldronLockedByLevel &&
      !cauldron?.nextCauldronLockedByResearch &&
      Number.isFinite(cauldron?.nextCauldronCost);
    this.unlockCostButton.visible = show;
    this.unlockCostButton.renderable = show;
    this.lockedDetailFrame.visible = show;
    this.lockedDetailFrame.renderable = show;
    this.lockedDetailFrameEnabled =
      show && cauldron?.canBuyCauldron === true;
    this.redrawLockedDetailFrame();

    if (!show) {
      this.unlockCostButton.setEnabled(false);
      return;
    }

    const enabled = cauldron?.canBuyCauldron === true;
    this.unlockCostButton.setModel({
      actionLabel: 'Unlock',
      amountLabel: `${cauldron.nextCauldronCost} coin`,
      resource: 'coin',
      state: enabled ? 'available' : 'unaffordable',
      enabled,
      action: () =>
        this.actions.performCauldronAction?.(
          cauldron,
          { id: 'buy' },
        ),
      unaffordableAction: () =>
        this.actions.showCurrencyShortage?.({
          cost: cauldron.nextCauldronCost,
          resource: 'coin',
        }) ?? false,
    });
  }

  redrawLockedDetailFrame() {
    this.lockedDetailFrame.clear();
    if (this.lockedDetailWidth <= 0 || this.lockedDetailHeight <= 0) {
      return;
    }
    drawDashedRect(
      this.lockedDetailFrame,
      0.5,
      0.5,
      this.lockedDetailWidth - 1,
      this.lockedDetailHeight - 1,
      this.lockedDetailFrameEnabled
        ? this.theme.stroke
        : this.theme.disabled,
    );
  }

  syncActionIcons() {
    for (const [name, icon] of Object.entries(this.actionIcons)) {
      const button = this[name];
      icon.alpha = button?.enabled === false ? 0.5 : 1;
    }
  }

  layoutAutoBrewContent() {
    layoutActionIcon(this.autoBrew, this.actionIcons.autoBrew, {
      iconWidth:
        BREWING_HUD_GEOMETRY.autoIconHeight *
        PIXI_ROOT_RUN_GEOMETRY.settings.gearAspectRatio,
      iconHeight: BREWING_HUD_GEOMETRY.autoIconHeight,
      labelY: BREWING_HUD_GEOMETRY.autoLabelY,
      hitSize: BREWING_HUD_GEOMETRY.autoHitSize,
      hitTop: BREWING_HUD_GEOMETRY.autoHitTop,
    });
  }

  layoutRecipeButtonContent() {
    this.recipePotionIcon.width = BREWING_HUD_GEOMETRY.recipeIconSize;
    this.recipePotionIcon.height = BREWING_HUD_GEOMETRY.recipeIconSize;
    this.recipePotionIcon.position.set(
      this.recipes.width / 2,
      BREWING_HUD_GEOMETRY.recipeIconY,
    );
    this.recipes.control.textLabel
      .setFontSize(BREWING_HUD_GEOMETRY.recipeLabelFontSize)
      .setLineHeight(BREWING_HUD_GEOMETRY.recipeLabelLineHeight)
      .setAlign('center')
      .setWrapWidth(
        this.recipes.width - BREWING_HUD_GEOMETRY.recipeLabelInset * 2,
      );
    this.recipes.control.textLabel.position.set(
      this.recipes.width / 2,
      this.recipePotionIcon.visible
        ? BREWING_HUD_GEOMETRY.recipeLabelY
        : this.recipes.height / 2 +
            (this.recipes.control.activeSkin?.contentOffsetY ?? 0),
    );
  }

  layoutEmptyCauldronContent() {
    layoutActionIcon(
      this.emptyCauldron,
      this.actionIcons.emptyCauldron,
      {
        iconWidth: BREWING_HUD_GEOMETRY.emptyIconWidth,
        iconHeight: BREWING_HUD_GEOMETRY.emptyIconHeight,
        labelY: BREWING_HUD_GEOMETRY.emptyLabelY,
        hitSize: BREWING_HUD_GEOMETRY.emptyHitSize,
        hitTop: 0,
      },
    );
  }

  setAutoBrewMotionEnabled(enabled) {
    const nextEnabled = enabled === true;
    if (nextEnabled !== this.autoBrewMotionEnabled) {
      this.autoBrewMotionStartedAt = null;
    }
    this.autoBrewMotionEnabled = nextEnabled;
    if (!nextEnabled) {
      this.resetAutoBrewMotion();
    }
  }

  updateMotion(
    now,
    { active = true, reducedMotion = false } = {},
  ) {
    this.updateActiveTimer(now);
    this.updateCauldronChangeMotion(now, {
      active,
      reducedMotion,
    });
    this.updatePrimaryActionMotion(now, {
      active,
      reducedMotion,
    });
    this.updateIngredientOrbitMotion(now, {
      active,
      reducedMotion,
    });
    for (const slot of this.ingredientSlots) {
      slot.updateMotion(now, { active, reducedMotion });
    }
    this.updateCauldronStateMotion(now, {
      active,
      reducedMotion,
    });
    this.cauldronHearth.updateMotion(now, {
      active,
      reducedMotion,
    });
    if (
      !active ||
      reducedMotion ||
      !this.autoBrewMotionEnabled
    ) {
      this.resetAutoBrewMotion();
      return;
    }
    if (!Number.isFinite(this.autoBrewMotionStartedAt)) {
      this.autoBrewMotionStartedAt = Number(now) || 0;
    }
    const elapsed = Math.max(
      0,
      (Number(now) || 0) - this.autoBrewMotionStartedAt,
    );
    const completedSteps = Math.floor(
      elapsed / AUTO_GEAR_STEP_INTERVAL_MS,
    );
    const stepElapsed =
      elapsed % AUTO_GEAR_STEP_INTERVAL_MS;
    const stepProgress = Math.min(
      1,
      stepElapsed / AUTO_GEAR_STEP_DURATION_MS,
    );
    const easedStep =
      1 - Math.pow(1 - stepProgress, 4);
    this.setAutoBrewGearRotation(
      ((completedSteps + easedStep) *
        AUTO_GEAR_STEP_RADIANS) %
        (Math.PI * 2),
    );
  }

  startPrimaryActionMotion(now = this.getTimerNow()) {
    if (this.page?.prefersReducedMotion?.()) {
      this.resetPrimaryActionMotion();
      return;
    }
    this.primaryActionMotionStart = Number(now) || 0;
    this.updatePrimaryActionMotion(now, {
      active: true,
      reducedMotion: false,
    });
  }

  updatePrimaryActionMotion(
    now,
    { active = true, reducedMotion = false } = {},
  ) {
    if (
      this.primaryActionMotionStart === null ||
      !active ||
      reducedMotion ||
      !this.brew.root.visible
    ) {
      if (!active || reducedMotion) {
        this.resetPrimaryActionMotion();
      }
      return;
    }
    const progress = clamp(
      ((Number(now) || 0) - this.primaryActionMotionStart) /
        PRIMARY_ACTION_MOTION_DURATION_MS,
      0,
      1,
    );
    const eased = easeOutQuint(progress);
    this.brew.control.textLabel.alpha = 0.55 + eased * 0.45;
    this.brew.control.textLabel.scale.set(0.94 + eased * 0.06);
    this.brew.control.rootRunFrame.alpha = 0.84 + eased * 0.16;
    if (progress >= 1) {
      this.resetPrimaryActionMotion();
    }
  }

  resetPrimaryActionMotion() {
    this.primaryActionMotionStart = null;
    this.brew.control.textLabel.alpha = 1;
    this.brew.control.textLabel.scale.set(1);
    this.brew.control.rootRunFrame.alpha = 1;
  }

  startIngredientArrivalMotion(index, now = this.getTimerNow()) {
    if (this.page?.prefersReducedMotion?.()) {
      this.resetIngredientOrbitMotion();
      return;
    }
    this.ingredientOrbitMotion = {
      index: clamp(
        Math.floor(Number(index) || 0),
        0,
        this.ingredientSlots.length - 1,
      ),
      startedAt: Number(now) || 0,
    };
    this.startIngredientReceiveMotion(now);
    this.updateIngredientOrbitMotion(now, {
      active: true,
      reducedMotion: false,
    });
  }

  updateIngredientOrbitMotion(
    now,
    { active = true, reducedMotion = false } = {},
  ) {
    const motion = this.ingredientOrbitMotion;
    if (!motion || !active || reducedMotion) {
      if (!active || reducedMotion) {
        this.resetIngredientOrbitMotion();
      }
      return;
    }
    const progress = clamp(
      ((Number(now) || 0) - motion.startedAt) /
        INGREDIENT_ORBIT_MOTION_DURATION_MS,
      0,
      1,
    );
    this.drawIngredientOrbitFeedback(motion.index, progress);
    if (progress >= 1) {
      this.resetIngredientOrbitMotion();
    }
  }

  drawIngredientOrbitFeedback(index, progress) {
    this.recipeOrbitFeedback.clear();
    const width = this.carouselPanel.width;
    if (!Number.isFinite(width) || width <= 0) {
      return;
    }
    const position = resolveIngredientPositions(
      width,
      this.previewOffsetY,
    )[index];
    if (!position) {
      return;
    }
    const start = {
      x: position.x + BREWING_HUD_GEOMETRY.ingredientSlotWidth / 2,
      y: position.y + BREWING_HUD_GEOMETRY.ingredientSlotHeight / 2,
    };
    const center = {
      x: width / 2,
      y: resolveCauldronCenterY(
        resolveIngredientPositions(width, this.previewOffsetY),
      ),
    };
    const eased = easeOutQuint(progress);
    const end = {
      x: lerpValue(start.x, center.x, eased),
      y: lerpValue(start.y, center.y, eased),
    };
    this.recipeOrbitFeedback
      .moveTo(start.x, start.y)
      .lineTo(end.x, end.y)
      .stroke({
        color: this.cauldronLiquidColor ?? 0x2fa8ff,
        width: 2,
        alpha: 0.72 * (1 - progress),
      });
  }

  resetIngredientOrbitMotion() {
    this.ingredientOrbitMotion = null;
    this.recipeOrbitFeedback.clear();
  }

  setCauldronMotionMode(mode, now = this.getTimerNow()) {
    const nextMode = String(mode || 'idle');
    if (nextMode === this.cauldronMotionMode) {
      return;
    }
    this.cauldronMotionMode = nextMode;
    this.cauldronMotionModeStartedAt = Number(now) || 0;
  }

  startIngredientReceiveMotion(now = this.getTimerNow()) {
    if (this.page?.prefersReducedMotion?.()) {
      return;
    }
    this.cauldronImpactMotion = {
      kind: 'ingredient',
      startedAt: Number(now) || 0,
      durationMs: CAULDRON_INGREDIENT_IMPACT_DURATION_MS,
    };
  }

  startCompletionMotion(now = this.getTimerNow()) {
    if (this.page?.prefersReducedMotion?.()) {
      this.resetCompletionMotion();
      return;
    }
    const startedAt = Number(now) || 0;
    this.completionMotionStart = startedAt;
    this.cauldronImpactMotion = {
      kind: 'completion',
      startedAt,
      durationMs: CAULDRON_COMPLETION_MOTION_DURATION_MS,
    };
    this.startPrimaryActionMotion(now);
  }

  updateCauldronStateMotion(
    now,
    { active = true, reducedMotion = false } = {},
  ) {
    const rest = this.cauldronChangeRestState;
    if (!active || reducedMotion || !rest) {
      this.restoreCauldronStateVisuals();
      this.cauldronStateFx.clear();
      if (!active || reducedMotion) {
        this.cauldronImpactMotion = null;
        this.completionMotionStart = null;
      }
      return;
    }
    if (this.cauldronChangeMotion) {
      this.cauldronStateFx.clear();
      return;
    }

    this.restoreCauldronStateVisuals();
    const elapsed = Math.max(
      0,
      (Number(now) || 0) - this.cauldronMotionModeStartedAt,
    );
    const ambientCycle =
      this.cauldronMotionMode === 'brewing'
        ? BREWING_LIQUID_CYCLE_MS
        : PREPARED_LIQUID_CYCLE_MS;
    const wave = Math.sin((elapsed / ambientCycle) * Math.PI * 2);
    if (
      this.cauldronLiquid.visible &&
      (this.cauldronMotionMode === 'prepared' ||
        this.cauldronMotionMode === 'brewing' ||
        this.cauldronMotionMode === 'complete')
    ) {
      const strength =
        this.cauldronMotionMode === 'brewing' ? 1.3 : 0.45;
      const offsetY = wave * CAULDRON_AMBIENT_TRAVEL * strength;
      const scaleX = 1 + wave * CAULDRON_AMBIENT_SCALE_X * strength;
      const scaleY = 1 - wave * CAULDRON_AMBIENT_SCALE_Y * strength;
      applyContainedCauldronMotion(
        this.cauldronArt,
        this.cauldronLiquid,
        rest,
        { offsetY, scaleX, scaleY },
      );
      this.cauldronLiquidHighlight.x =
        rest.highlightX + wave * 2.2 * strength;
      this.cauldronLiquidHighlight.y = rest.highlightY + offsetY;
      this.cauldronLiquidHighlight.alpha =
        rest.highlightAlpha * (0.82 + (wave + 1) * 0.09);
    }

    let impactProgress = null;
    const impact = this.cauldronImpactMotion;
    if (impact) {
      impactProgress = clamp(
        ((Number(now) || 0) - impact.startedAt) /
          impact.durationMs,
        0,
        1,
      );
      const pulse = Math.sin(Math.PI * impactProgress);
      const strength = impact.kind === 'completion' ? 1 : 0.58;
      const offsetY = pulse * 2.2 * strength;
      applyContainedCauldronMotion(
        this.cauldronArt,
        this.cauldronLiquid,
        rest,
        {
          offsetY,
          scaleX: 1 + pulse * 0.035 * strength,
          scaleY: 1 - pulse * 0.065 * strength,
        },
      );
      this.cauldronLiquidHighlight.y = rest.highlightY + offsetY;
      if (impactProgress >= 1) {
        this.cauldronImpactMotion = null;
        if (impact.kind === 'completion') {
          this.completionMotionStart = null;
        }
      }
    }
    this.drawCauldronStateFx(elapsed, impact, impactProgress);
  }

  drawCauldronStateFx(elapsed, impact, impactProgress) {
    const graphics = this.cauldronStateFx;
    graphics.clear();
    if (!this.cauldronLiquid.visible) {
      return;
    }
    const rest = this.cauldronChangeRestState;
    const relativeLiquidScaleY = rest.liquid.scaleY
      ? this.cauldronLiquid.scale.y / rest.liquid.scaleY
      : 1;
    const centerX = this.cauldronLiquid.x;
    const liquidY =
      this.cauldronLiquid.y - 94 * 0.312 * relativeLiquidScaleY;
    if (this.cauldronMotionMode === 'prepared') {
      const phase = (elapsed % PREPARED_LIQUID_CYCLE_MS) /
        PREPARED_LIQUID_CYCLE_MS;
      if (phase < 0.42) {
        const local = phase / 0.42;
        graphics
          .ellipse(centerX, liquidY, 15 + local * 13, 3 + local * 2)
          .stroke({
            color: 0xbfe9ff,
            width: 1.2,
            alpha: 0.42 * (1 - local),
          });
      }
    }
    if (this.cauldronMotionMode === 'brewing') {
      const cycle = elapsed / BREWING_LIQUID_CYCLE_MS;
      const bubbles = [
        { offset: 0, x: -14, drift: 3, radius: 1.9, rise: 19 },
        { offset: 0.3, x: 4, drift: -2.5, radius: 1.45, rise: 23 },
        { offset: 0.63, x: 16, drift: 2, radius: 1.6, rise: 20 },
      ];
      for (const bubble of bubbles) {
        const phase = (cycle + bubble.offset) % 1;
        const alpha = Math.sin(Math.PI * phase) * 0.72;
        graphics
          .circle(
            centerX + bubble.x + Math.sin(phase * Math.PI) * bubble.drift,
            liquidY + 3 - phase * bubble.rise * CAULDRON_BUBBLE_RISE_SCALE,
            bubble.radius + phase * 0.85,
          )
          .stroke({ color: 0xdaf4ff, width: 1, alpha });
      }
    }
    if (impact && impactProgress !== null) {
      const fade = 1 - impactProgress;
      const strength = impact.kind === 'completion' ? 1 : 0.58;
      graphics
        .ellipse(
          centerX,
          liquidY,
          17 + impactProgress * 19,
          3.5 + impactProgress * 4.5,
        )
        .stroke({
          color: 0xdaf4ff,
          width: impact.kind === 'completion' ? 2 : 1.4,
          alpha: fade * 0.78 * strength,
        });
      if (impact.kind === 'completion') {
        for (const direction of [-1, 0, 1]) {
          graphics
            .circle(
              centerX + direction * (11 + impactProgress * 8),
              liquidY - 4 - impactProgress * (10 + Math.abs(direction) * 3),
              1.8 - impactProgress * 0.6,
            )
            .fill({ color: 0xe9f8ff, alpha: fade * 0.8 });
        }
      }
    }
  }

  restoreCauldronStateVisuals() {
    const rest = this.cauldronChangeRestState;
    if (!rest || this.cauldronChangeMotion) {
      return;
    }
    restoreDisplayState(this.cauldronArt, rest.art);
    restoreDisplayState(this.cauldronLiquid, rest.liquid);
    this.cauldronLiquidHighlight.position.set(
      rest.highlightX,
      rest.highlightY,
    );
    this.cauldronLiquidHighlight.alpha = rest.highlightAlpha;
  }

  resetCompletionMotion() {
    this.completionMotionStart = null;
    if (this.cauldronImpactMotion?.kind === 'completion') {
      this.cauldronImpactMotion = null;
    }
  }

  resetStateMotion() {
    this.resetPrimaryActionMotion();
    this.resetIngredientOrbitMotion();
    this.resetCompletionMotion();
    this.cauldronImpactMotion = null;
    this.cauldronStateFx.clear();
    for (const slot of this.ingredientSlots) {
      slot.resetArrivalMotion();
    }
    this.restoreCauldronStateVisuals();
  }

  startCauldronChangeMotion(
    direction,
    now,
    { reducedMotion = false } = {},
  ) {
    this.resetCauldronChangeMotion();
    if (reducedMotion) {
      return;
    }
    this.cauldronChangeMotion = {
      direction: direction < 0 ? -1 : 1,
      startedAt: Number(now) || 0,
    };
    this.updateCauldronChangeMotion(now, {
      active: true,
      reducedMotion: false,
    });
  }

  updateCauldronChangeMotion(
    now,
    { active = true, reducedMotion = false } = {},
  ) {
    const motion = this.cauldronChangeMotion;
    if (!motion) {
      return;
    }
    if (!active || reducedMotion || !this.cauldronChangeRestState) {
      this.resetCauldronChangeMotion();
      return;
    }

    const progress = clamp(
      ((Number(now) || 0) - motion.startedAt) /
        CAULDRON_CHANGE_MOTION_DURATION_MS,
      0,
      1,
    );
    const eased = 1 - Math.pow(1 - progress, 5);
    const rest = this.cauldronChangeRestState;
    const offset =
      motion.direction *
      CAULDRON_CHANGE_TRAVEL *
      (1 - eased);
    const settleAlpha = 0.7 + eased * 0.3;
    const settleScaleX = 0.965 + eased * 0.035;
    const settleScaleY = 1.035 - eased * 0.035;
    const settleRotation =
      motion.direction * 0.025 * (1 - eased);

    applyCauldronSettle(
      this.cauldronArt,
      rest.art,
      offset,
      settleAlpha,
      settleScaleX,
      settleScaleY,
      settleRotation,
    );
    applyCauldronSettle(
      this.cauldronLiquid,
      rest.liquid,
      offset,
      settleAlpha,
      settleScaleX,
      settleScaleY,
      settleRotation,
    );
    applyCauldronSettle(
      this.cauldronHearth.root,
      rest.hearth,
      offset,
      settleAlpha,
      settleScaleX,
      settleScaleY,
      settleRotation,
    );
    this.lockArt.x = rest.lock.x + offset;
    this.lockArt.alpha = rest.lock.alpha * settleAlpha;
    this.cauldronLiquidHighlight.x =
      rest.highlightX + offset;
    this.recipeOrbit.x =
      rest.orbitX - offset * 0.2;

    if (progress >= 1) {
      this.resetCauldronChangeMotion();
    }
  }

  captureCauldronChangeRestState() {
    this.cauldronChangeRestState = {
      art: captureDisplayState(this.cauldronArt),
      liquid: captureDisplayState(this.cauldronLiquid),
      hearth: captureDisplayState(this.cauldronHearth.root),
      lock: captureDisplayState(this.lockArt),
      highlightX: this.cauldronLiquidHighlight.x,
      highlightY: this.cauldronLiquidHighlight.y,
      highlightAlpha: this.cauldronLiquidHighlight.alpha,
      orbitX: this.recipeOrbit.x,
    };
  }

  restoreCauldronChangeVisuals() {
    const rest = this.cauldronChangeRestState;
    if (!rest) {
      return;
    }
    restoreDisplayState(this.cauldronArt, rest.art);
    restoreDisplayState(this.cauldronLiquid, rest.liquid);
    restoreDisplayState(this.cauldronHearth.root, rest.hearth);
    restoreDisplayState(this.lockArt, rest.lock);
    this.cauldronLiquidHighlight.position.set(
      rest.highlightX,
      rest.highlightY,
    );
    this.cauldronLiquidHighlight.alpha = rest.highlightAlpha;
    this.recipeOrbit.x = rest.orbitX;
  }

  resetCauldronChangeMotion() {
    this.restoreCauldronChangeVisuals();
    this.cauldronChangeMotion = null;
  }

  resetAutoBrewMotion() {
    this.autoBrewMotionStartedAt = null;
    this.setAutoBrewGearRotation(0);
  }

  setAutoBrewGearRotation(rotation) {
    for (const sprite of
      this.actionIcons.autoBrew?.iconSprites ?? []) {
      sprite.rotation = Number(rotation) || 0;
    }
  }

  destroy() {
    this.resetStateMotion();
    this.resetCauldronChangeMotion();
    this.semanticTargets?.unregister?.(
      BREWING_CAULDRON_REWARD_ANCHOR_ID,
      { displayObject: this.cauldronArt },
    );
    this.semanticTargets?.unregister?.(
      'brewing.cauldron.tap',
      { displayObject: this.cauldronArt },
    );
    releaseRegistration(this.cauldronTapRegistration);
    releaseRegistration(this.swipeRegistration);
    for (const button of [
      this.previous,
      this.next,
      this.recipes,
      this.autoBrew,
      this.emptyCauldron,
      this.quantity,
      this.brew,
    ]) {
      button.destroy();
    }
    this.unlockCostButton.destroy({ children: true });
    this.cauldronArt.filters = null;
    this.cauldronHearth.destroy();
    this.lockedCauldronFilter?.destroy?.();
    this.lockedCauldronFilter = null;
    this.potionPreviewFrame.filters = null;
    this.progress.destroy();
    this.missingIngredients.destroy();
    for (const slot of this.ingredientSlots) {
      slot.destroy();
    }
    this.carouselPanel.destroy();
    this.detailPanel.destroy();
  }
}

/**
 * Passive horizontal shortage summary for compact action areas.
 * Consumers provide already-computed missing quantities; this widget only
 * renders the left-anchored label and icon/name/count sequence.
 */
export class BrewingMissingIngredientsRow {
  constructor({
    assetManager = null,
    maxItems = BREWING_HUD_GEOMETRY.ingredientSlots,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    this.assetManager = assetManager;
    this.maxItems = Math.max(1, Math.floor(Number(maxItems) || 1));
    this.width = 0;
    this.height = BREWING_HUD_GEOMETRY.missingIngredientRowHeight;
    this.root = new Container({ label: 'brewing-missing-ingredients-row' });
    this.root.eventMode = 'none';
    this.title = createText('Missing', BREWING_MISSING_INGREDIENT_TITLE_STYLE);
    this.title.anchor.set(0, 0.5);
    this.itemViews = Array.from(
      { length: this.maxItems },
      (_unused, index) => createMissingIngredientRowItem(index),
    );
    this.root.addChild(
      this.title,
      ...this.itemViews.map((view) => view.root),
    );
    this.bind([]);
    this.applyTheme(theme);
  }

  bind(ingredients = []) {
    const visibleIngredients = ingredients.slice(0, this.maxItems);
    this.itemViews.forEach((view, index) => {
      const ingredient = visibleIngredients[index] ?? null;
      const key = ingredient?.itemKey ?? ingredient?.key ?? null;
      view.fullLabel = ingredient
        ? toTitleCase(ingredient.label ?? ingredient.name ?? key ?? '')
        : '';
      view.icon.texture = getAtlasTexture(
        this.assetManager,
        key ? getHerbIconFrameName(key) : null,
      );
      view.icon.visible =
        Boolean(ingredient) && view.icon.texture !== Texture.EMPTY;
      view.icon.renderable = view.icon.visible;
      setText(view.label, view.fullLabel);
      setText(view.count, ingredient ? `x${ingredient.missingQuantity}` : '');
      view.root.visible = Boolean(ingredient);
      view.root.renderable = view.root.visible;
    });
    const visible = visibleIngredients.length > 0;
    this.root.visible = visible;
    this.root.renderable = visible;
    this.layout();
  }

  setBounds(x, y, width, height = this.height) {
    this.root.position.set(x, y);
    this.width = Math.max(0, Number(width) || 0);
    this.height = Math.max(0, Number(height) || 0);
    this.layout();
  }

  layout() {
    const views = this.itemViews.filter((view) => view.root.visible);
    if (views.length === 0 || this.width <= 0) {
      return;
    }

    const compact = views.length > 3;
    const centerY = this.height / 2;
    const iconSize = compact
      ? BREWING_HUD_GEOMETRY.missingIngredientCompactIconSize
      : BREWING_HUD_GEOMETRY.missingIngredientIconSize;
    const titleGap = compact ? 4 : 8;
    const contentGap = compact ? 1 : 2;
    const itemGap = compact ? 2 : 6;
    const separatorWidth = compact ? 2 : 3;
    const titleRight = this.title.width + titleGap;
    const fixedItemWidth = views.reduce(
      (width, view, index) =>
        width +
        iconSize +
        contentGap * 2 +
        view.count.width +
        (index < views.length - 1 ? separatorWidth + itemGap : 0),
      0,
    );
    const availableLabelWidth = Math.max(
      1,
      this.width - titleRight - fixedItemWidth,
    );
    const maximumLabelWidth = Math.max(1, availableLabelWidth / views.length);

    this.title.position.set(0, centerY);
    let cursor = titleRight;
    views.forEach((view, index) => {
      setFittedMissingIngredientLabel(
        view.label,
        view.fullLabel,
        maximumLabelWidth,
      );
      view.root.position.set(cursor, 0);
      view.icon.width = iconSize;
      view.icon.height = iconSize;
      view.icon.position.set(iconSize / 2, centerY);
      view.label.position.set(iconSize + contentGap, centerY);
      view.count.position.set(
        view.label.x + view.label.width + contentGap,
        centerY,
      );
      const itemRight = view.count.x + view.count.width;
      view.separator.position.set(itemRight, centerY);
      view.separator.visible = index < views.length - 1;
      view.separator.renderable = view.separator.visible;
      cursor +=
        itemRight +
        (view.separator.visible ? separatorWidth + itemGap : 0);
    });
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    applyTextTheme(this.title, this.theme, {
      ...BREWING_MISSING_INGREDIENT_TITLE_STYLE,
      fill: this.theme.text,
    });
    for (const view of this.itemViews) {
      applyTextTheme(view.label, this.theme, {
        ...BREWING_MISSING_INGREDIENT_LABEL_STYLE,
        fill: this.theme.text,
      });
      applyTextTheme(view.count, this.theme, {
        ...BREWING_MISSING_INGREDIENT_COUNT_STYLE,
        fill: this.theme.insufficient ?? PIXI_STATUS_COLORS.insufficient,
      });
      applyTextTheme(view.separator, this.theme, {
        ...BREWING_MISSING_INGREDIENT_LABEL_STYLE,
        fill: this.theme.text,
      });
    }
    this.layout();
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

export class BrewingCauldronHearth {
  constructor({ assetManager = null } = {}) {
    this.root = new Container({ label: 'brewing-cauldron-hearth' });
    this.root.eventMode = 'none';
    this.glow = new Graphics({ label: 'brewing-cauldron-hearth-glow' });
    this.wood = new Sprite(getTexture(assetManager, ASSETS.hearthWood));
    this.wood.anchor.set(0.5, 1);
    this.wood.tint = 0x745044;
    this.wood.label = 'brewing-cauldron-hearth-wood';
    this.flameBack = new Sprite(
      getTexture(assetManager, ASSETS.hearthFlame),
    );
    this.flameBack.anchor.set(0.5, 1);
    this.flameBack.label = 'brewing-cauldron-hearth-flame-back';
    this.flameFront = new Sprite(
      getTexture(assetManager, ASSETS.hearthFlame),
    );
    this.flameFront.anchor.set(0.5, 1);
    this.flameFront.label = 'brewing-cauldron-hearth-flame-front';
    this.sparks = new Graphics({ label: 'brewing-cauldron-hearth-sparks' });
    this.root.addChild(
      this.glow,
      this.wood,
      this.flameBack,
      this.flameFront,
      this.sparks,
    );
    this.visible = true;
    this.litTarget = false;
    this.litMix = 0;
    this.litTransition = null;
    this.motionStartedAt = 0;
    this.baseFlameScale = {
      backX: 1,
      backY: 1,
      frontX: 1,
      frontY: 1,
    };
    this.drawGlow();
    this.setBounds(0, 0);
    this.applyStaticFlame(0);
  }

  bind({ lit = false, visible = true } = {}, now = 0) {
    this.visible = visible !== false;
    this.root.visible = this.visible;
    this.root.renderable = this.visible;
    const nextLit = lit === true && this.visible;
    if (nextLit === this.litTarget) {
      return;
    }
    this.litTarget = nextLit;
    this.litTransition = {
      from: this.litMix,
      startedAt: Number(now) || 0,
      to: nextLit ? 1 : 0,
      durationMs: nextLit
        ? HEARTH_IGNITION_DURATION_MS
        : HEARTH_EXTINGUISH_DURATION_MS,
    };
    if (nextLit) {
      this.motionStartedAt = Number(now) || 0;
    }
  }

  setBounds(x, y) {
    this.root.position.set(x, y);
    this.wood.position.set(0, 0);
    this.wood.width = BREWING_HUD_GEOMETRY.hearthWidth;
    this.wood.height = BREWING_HUD_GEOMETRY.hearthWoodHeight;
    this.flameBack.position.set(0, -1);
    this.flameBack.width = BREWING_HUD_GEOMETRY.hearthOuterFlameWidth;
    this.flameBack.height = BREWING_HUD_GEOMETRY.hearthOuterFlameHeight;
    this.flameFront.position.set(0, 0);
    this.flameFront.width = BREWING_HUD_GEOMETRY.hearthFlameWidth;
    this.flameFront.height = BREWING_HUD_GEOMETRY.hearthFlameHeight;
    this.baseFlameScale = {
      backX: this.flameBack.scale.x,
      backY: this.flameBack.scale.y,
      frontX: this.flameFront.scale.x,
      frontY: this.flameFront.scale.y,
    };
    this.drawGlow();
    this.applyStaticFlame(this.litMix);
  }

  updateMotion(
    now,
    { active = true, reducedMotion = false } = {},
  ) {
    const time = Number(now) || 0;
    this.updateLitTransition(time, reducedMotion);
    const mix = this.litMix;
    this.flameBack.visible = mix > 0.001;
    this.flameBack.renderable = this.flameBack.visible;
    this.flameFront.visible = mix > 0.001;
    this.flameFront.renderable = this.flameFront.visible;
    this.glow.visible = mix > 0.001;
    this.glow.renderable = this.glow.visible;
    if (!this.visible || mix <= 0.001) {
      this.applyStaticFlame(0);
      this.sparks.clear();
      return;
    }
    if (!active || reducedMotion) {
      this.applyStaticFlame(mix);
      this.sparks.clear();
      return;
    }

    const elapsed = Math.max(0, time - this.motionStartedAt);
    const primaryWave = Math.sin(
      (elapsed / HEARTH_FLICKER_CYCLE_MS) * Math.PI * 2,
    );
    const secondaryWave = Math.sin(
      (elapsed / (HEARTH_FLICKER_CYCLE_MS * 0.63)) * Math.PI * 2 + 1.1,
    );
    const { backX, backY, frontX, frontY } = this.baseFlameScale;
    this.flameBack.scale.set(
      backX * (0.96 - secondaryWave * 0.035),
      backY * (0.98 + primaryWave * 0.045),
    );
    this.flameBack.rotation = -0.012 + secondaryWave * 0.01;
    this.flameBack.x = -primaryWave * 0.9;
    this.flameBack.alpha = mix * (0.56 + (secondaryWave + 1) * 0.08);
    this.flameFront.scale.set(
      frontX * (0.97 + primaryWave * 0.035),
      frontY * (0.985 - secondaryWave * 0.04),
    );
    this.flameFront.rotation = 0.008 + primaryWave * 0.009;
    this.flameFront.x = secondaryWave * 0.8;
    this.flameFront.alpha = mix * (0.78 + (primaryWave + 1) * 0.08);
    this.glow.alpha = mix * (0.82 + (primaryWave + 1) * 0.07);
    this.sparks.clear();
  }

  updateLitTransition(now, reducedMotion) {
    if (reducedMotion) {
      this.litMix = this.litTarget ? 1 : 0;
      this.litTransition = null;
      return;
    }
    const transition = this.litTransition;
    if (!transition) {
      return;
    }
    const progress = clamp(
      (now - transition.startedAt) / transition.durationMs,
      0,
      1,
    );
    this.litMix = lerpValue(
      transition.from,
      transition.to,
      easeOutQuint(progress),
    );
    if (progress >= 1) {
      this.litMix = transition.to;
      this.litTransition = null;
    }
  }

  applyStaticFlame(mix) {
    const { backX, backY, frontX, frontY } = this.baseFlameScale;
    this.flameBack.position.set(0, -1);
    this.flameBack.scale.set(backX * 0.97, backY);
    this.flameBack.rotation = -0.01;
    this.flameBack.alpha = mix * 0.66;
    this.flameFront.position.set(0, 0);
    this.flameFront.scale.set(frontX, frontY);
    this.flameFront.rotation = 0.006;
    this.flameFront.alpha = mix * 0.9;
    this.glow.alpha = mix * 0.9;
  }

  drawGlow() {
    this.glow
      .clear()
      .ellipse(0, -15, 46, 22)
      .fill({ color: 0xff6b16, alpha: 0.08 })
      .ellipse(0, -10, 32, 16)
      .fill({ color: 0xffc12b, alpha: 0.07 });
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

export class BrewingAutomationSettingsDialogPixi {
  constructor({
    parent,
    inputRouter = null,
    assetManager = null,
    onClose = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    this.onClose = onClose;
    this.modal = new PixiOwnedDialogSurface({
      id: 'brewing.automation-settings',
      parent,
      inputRouter,
      assetManager,
      title: 'cauldron settings',
      onClose,
      theme,
    });
    this.root = this.modal.root;
    this.copy = createText(
      'Auto Brew collects finished batches\nand starts the next batch.',
      {
        ...RETAINED_TEXT_STYLES.body,
        wordWrap: true,
        wordWrapWidth: 218,
        align: 'center',
      },
    );
    this.toggle = new RetainedButton({
      assetManager,
      inputRouter,
      label: 'included with autobrew',
      buttonLabel: 'brewing-auto-collect-toggle',
      variant: 'green',
    });
    this.modal.panel.content.addChild(this.copy, this.toggle.root);
    this.model = {};
    this.applyTheme(theme);
    this.layout({
      sourceWidth: RETAINED_PAGE_GEOMETRY.width,
      sourceHeight: RETAINED_PAGE_GEOMETRY.height,
    });
  }

  bind(model = {}) {
    this.model = model;
    this.modal.setTitle(model.title ?? `cauldron ${model.cauldronNumber ?? 1} settings`);
    const available = model.autoBrewEnabled === true;
    this.toggle.setModel({
      label: available ? 'included with autobrew' : 'enable autobrew first',
      enabled: false,
      selected: available,
    });
  }

  layout(projection = {}) {
    const sourceWidth =
      Number(projection.sourceWidth) || PIXI_UI_GEOMETRY.sourceWidth;
    const sourceHeight =
      Number(projection.sourceHeight) || PIXI_UI_GEOMETRY.sourceHeight;
    const width = 270;
    const height = 150;
    this.modal.setBounds(
      (sourceWidth - width) / 2,
      (sourceHeight - height) / 2,
      width,
      height,
    );
    this.copy.position.set(24, 28);
    this.copy.anchor.set(0.5, 0);
    this.copy.x = 135;
    this.toggle.setBounds(24, 83, 222, 36);
    this.modal.layout(projection);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.modal.applyTheme(this.theme);
    applyTextTheme(this.copy, this.modal.getContentTheme(), RETAINED_TEXT_STYLES.body);
    this.toggle.applyTheme(this.modal.getContentTheme());
  }

  activate() {
    this.modal.activate();
  }

  deactivate() {
    this.modal.deactivate();
  }

  getDisplayObject() {
    return this.root;
  }

  destroy() {
    this.toggle.destroy();
    this.modal.destroy();
  }
}

export class BrewingIngredientPickerSlot {
  constructor({
    index,
    assetManager,
    inputRouter,
    semanticTargets,
    onActivate,
  }) {
    this.index = index;
    this.assetManager = assetManager;
    this.semanticTargets = semanticTargets;
    this.onActivate = onActivate;
    this.enabled = false;
    this.control = new PixiTextButton({
      assetManager,
      inputRouter,
      semanticRegistry: semanticTargets,
      semanticId: `brewing.ingredient-slot.${index}`,
      text: '',
      action: () => this.onActivate?.(this.model) ?? false,
      haptic: 'light',
      variant: 'inline',
      label: `brewing-ingredient-picker-slot-${index}`,
    });
    this.root = this.control;
    this.frame = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: null,
      borderInsets: null,
      label: `brewing-ingredient-requirement-${index}-frame`,
    });
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.anchor.set(0.5);
    this.name = centeredText('', RETAINED_INGREDIENT_NAME_STYLE);
    this.name.anchor.set(0.5, 0);
    this.contentMotion = new Container({
      label: `brewing-ingredient-picker-slot-${index}-content-motion`,
    });
    this.countGroup = new Container();
    this.missingCount = centeredText('', RETAINED_INGREDIENT_COUNT_STYLE);
    this.requiredCount = centeredText('', RETAINED_INGREDIENT_COUNT_STYLE);
    this.missingCount.anchor.set(0, 0);
    this.requiredCount.anchor.set(0, 0);
    this.countGroup.addChild(this.missingCount, this.requiredCount);
    this.contentMotion.addChild(
      this.icon,
      this.name,
      this.countGroup,
    );
    this.control.visual.addChild(this.frame, this.contentMotion);
    this.model = null;
    this.theme = null;
    this.countMissing = false;
    this.hasBoundModel = false;
    this.stagedSignature = '';
    this.arrivalMotionStart = null;
    this.used = false;
    this.contentRestAlpha = 1;
    this.frameInsets = null;
    this.width = BREWING_HUD_GEOMETRY.ingredientSlotWidth;
    this.height = BREWING_HUD_GEOMETRY.ingredientSlotHeight;
    this.semanticId = `brewing.ingredient-slot.${index}`;
    this.control.setEnabled(false);
  }

  bind(
    model,
    {
      decorative = false,
      enabled = true,
      showMissing = false,
      used = false,
      animate = false,
      now = 0,
      reducedMotion = false,
    } = {},
  ) {
    const key = model?.itemKey ?? model?.key ?? null;
    const nextStagedSignature =
      model?.staged === true && key ? String(key) : '';
    const shouldAnimateArrival =
      animate === true &&
      this.hasBoundModel &&
      Boolean(nextStagedSignature) &&
      nextStagedSignature !== this.stagedSignature;
    this.model = model;
    this.enabled = enabled === true;
    this.used = Boolean(model) && used === true;
    this.contentRestAlpha = this.used
      ? USED_INGREDIENT_CONTENT_ALPHA
      : 1;
    this.contentMotion.alpha = this.contentRestAlpha;
    this.control.setEnabled(this.enabled);
    this.icon.texture = getAtlasTexture(
      this.assetManager,
      key ? getHerbIconFrameName(key) : null,
    );
    this.icon.visible = Boolean(model) && this.icon.texture !== Texture.EMPTY;
    setText(
      this.name,
      model
        ? toTitleCase(model.label ?? model.name ?? key ?? '')
        : '',
    );
    const required = Math.max(1, Math.floor(Number(model?.quantity) || 1));
    const owned = Math.max(0, Math.floor(Number(model?.owned) || 0));
    const missing = Boolean(model) && showMissing && owned < required;
    const showCount = Boolean(model) && showMissing;
    this.countMissing = missing;
    setText(
      this.missingCount,
      showCount ? String(Math.min(owned, required)) : '',
    );
    setText(this.requiredCount, showCount ? `/${required}` : '');
    this.countGroup.visible = showCount;
    this.countGroup.renderable = showCount;
    this.missingCount.visible = showCount;
    this.missingCount.renderable = showCount;
    this.requiredCount.visible = showCount;
    this.requiredCount.renderable = showCount;
    this.decorative = decorative && !model;
    this.hasBoundModel = true;
    this.stagedSignature = nextStagedSignature;
    this.applyCountTheme();
    this.layoutCount();
    this.redraw();
    if (shouldAnimateArrival) {
      this.startArrivalMotion(now, { reducedMotion });
    }
    return shouldAnimateArrival && !reducedMotion;
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    this.height = height;
    this.control.setSize(width, height);
    this.frame.setSize(width, height, this.frameInsets);
    this.contentMotion.pivot.set(width / 2, height / 2);
    this.contentMotion.position.set(width / 2, height / 2);
    this.icon.position.set(
      width / 2,
      BREWING_HUD_GEOMETRY.ingredientIconCenterY,
    );
    this.icon.width = BREWING_HUD_GEOMETRY.ingredientIconSize;
    this.icon.height = BREWING_HUD_GEOMETRY.ingredientIconSize;
    this.name.position.set(
      width / 2,
      BREWING_HUD_GEOMETRY.ingredientNameY,
    );
    this.name.style.wordWrapWidth = width - 8;
    this.layoutCount();
    this.redraw();
  }

  layoutCount() {
    this.missingCount.position.set(0, 0);
    this.requiredCount.position.set(this.missingCount.width, 0);
    this.countGroup.position.set(
      Math.max(3, (this.width ?? 0) - this.countGroup.width - 4),
      2,
    );
  }

  redraw() {
    this.frame.alpha = this.decorative ? 0.72 : 1;
  }

  startArrivalMotion(now = 0, { reducedMotion = false } = {}) {
    if (reducedMotion) {
      this.resetArrivalMotion();
      return;
    }
    this.arrivalMotionStart = Number(now) || 0;
    this.updateMotion(now, { active: true, reducedMotion: false });
  }

  updateMotion(
    now,
    { active = true, reducedMotion = false } = {},
  ) {
    if (
      this.arrivalMotionStart === null ||
      !active ||
      reducedMotion
    ) {
      if (!active || reducedMotion) {
        this.resetArrivalMotion();
      }
      return;
    }
    const progress = clamp(
      ((Number(now) || 0) - this.arrivalMotionStart) /
        INGREDIENT_SLOT_ARRIVAL_DURATION_MS,
      0,
      1,
    );
    const eased = easeOutQuint(progress);
    const direction = this.index % 2 === 0 ? -1 : 1;
    this.contentMotion.alpha =
      this.contentRestAlpha * (0.58 + eased * 0.42);
    this.contentMotion.scale.set(0.78 + eased * 0.22);
    this.contentMotion.rotation =
      direction * 0.075 * (1 - eased);
    this.frame.alpha =
      (this.decorative ? 0.72 : 1) * (0.78 + eased * 0.22);
    if (progress >= 1) {
      this.resetArrivalMotion();
    }
  }

  resetArrivalMotion() {
    this.arrivalMotionStart = null;
    this.contentMotion.alpha = this.contentRestAlpha;
    this.contentMotion.scale.set(1);
    this.contentMotion.rotation = 0;
    this.frame.alpha = this.decorative ? 0.72 : 1;
  }

  applyTheme(theme) {
    this.theme = theme;
    this.control.applyTheme(theme);
    const sourceInsets = theme?.frames?.panelSourceInsets ?? null;
    this.frameInsets = INGREDIENT_SLOT_BORDER_INSETS;
    this.frame.setTexture(
      getTexture(this.assetManager, theme?.frames?.panel),
      sourceInsets,
    );
    this.frame.setSize(this.width ?? 0, this.height ?? 0, this.frameInsets);
    applyTextTheme(this.name, theme, {
      ...RETAINED_INGREDIENT_NAME_STYLE,
      fill: theme?.text ?? '#d4d4d4',
    });
    this.applyCountTheme();
    applyTextTheme(this.requiredCount, theme, {
      ...RETAINED_INGREDIENT_COUNT_STYLE,
      fill: theme?.text ?? '#d4d4d4',
    });
    this.layoutCount();
  }

  applyCountTheme() {
    applyTextTheme(this.missingCount, this.theme, {
      ...RETAINED_INGREDIENT_COUNT_STYLE,
      fill: this.countMissing
        ? this.theme?.insufficient ?? PIXI_STATUS_COLORS.insufficient
        : this.theme?.text ?? '#d4d4d4',
    });
  }

  destroy() {
    this.resetArrivalMotion();
    this.control.destroy({ children: true });
    this.control = null;
  }
}

function normalizeRequirements(rows, herbs, stagedIngredients = []) {
  const herbByKey = new Map(
    (Array.isArray(herbs) ? herbs : []).map((herb) => [herb.key, herb]),
  );
  const stagedRows = Array.isArray(stagedIngredients) ? stagedIngredients : [];
  return (Array.isArray(rows) ? rows : [])
    .slice(0, BREWING_HUD_GEOMETRY.ingredientSlots)
    .map((row, index) => {
      const key = row.itemKey ?? row.key;
      const herb = herbByKey.get(key) ?? {};
      const staged = stagedRows[index];
      const required = row.quantity ?? row.required ?? 1;
      const stagedMatches =
        (staged?.itemKey ?? staged?.key) === key;
      return {
        ...row,
        itemKey: key,
        staged: stagedMatches,
        owned:
          stagedMatches
            ? required
            : row.owned ??
              row.availableQuantity ??
              herb.quantity ??
              herb.availableQuantity ??
              0,
        quantity: required,
      };
    });
}

function resolveMissingRecipeIngredients(recipe = {}) {
  const missingByKey = new Map();
  for (const ingredient of recipe.ingredients ?? []) {
    const key = ingredient?.itemKey ?? ingredient?.key;
    if (!key) {
      continue;
    }
    const required = Math.max(
      1,
      Math.floor(Number(ingredient?.quantity) || 1),
    );
    const owned = Math.max(
      0,
      Math.floor(Number(ingredient?.owned) || 0),
    );
    const missingQuantity = Math.max(0, required - owned);
    if (missingQuantity === 0) {
      continue;
    }
    const existing = missingByKey.get(key);
    if (existing) {
      existing.missingQuantity += missingQuantity;
      continue;
    }
    missingByKey.set(key, {
      itemKey: key,
      key,
      label: ingredient.label ?? ingredient.name ?? key,
      missingQuantity,
    });
  }
  return [...missingByKey.values()].slice(
    0,
    BREWING_HUD_GEOMETRY.ingredientSlots,
  );
}

function resolveIngredientPositions(width, offsetY = 0) {
  const top =
    BREWING_HUD_GEOMETRY.carouselContentOffset +
    BREWING_HUD_GEOMETRY.titleHeight +
    BREWING_HUD_GEOMETRY.previewTopGap +
    offsetY;
  const middle = top + BREWING_HUD_GEOMETRY.ingredientRowGap;
  const bottom = middle + BREWING_HUD_GEOMETRY.ingredientRowGap;
  const halfSlotWidth = BREWING_HUD_GEOMETRY.ingredientSlotWidth / 2;
  return [
    { x: 86 - halfSlotWidth, y: top },
    { x: 38 - halfSlotWidth, y: middle },
    { x: 78 - halfSlotWidth, y: bottom },
    { x: width - 78 - halfSlotWidth, y: bottom },
    { x: width - 38 - halfSlotWidth, y: middle },
    { x: width - 86 - halfSlotWidth, y: top },
  ];
}

export function resolveBrewingHudViewportBottom(
  sourceHeight,
  worldChatVisible,
) {
  const chatHeight = worldChatVisible
    ? PIXI_UI_GEOMETRY.roomChatHeight +
      PIXI_UI_GEOMETRY.roomChatTitleOverhang
    : 0;
  return (
    sourceHeight -
    PIXI_UI_GEOMETRY.roomChatBottom -
    chatHeight -
    BREWING_HUD_GEOMETRY.detailChatGap
  );
}

function resolveBrewingDetailTop(sourceHeight, worldChatVisible) {
  return (
    resolveBrewingHudViewportBottom(sourceHeight, worldChatVisible) -
    BREWING_HUD_GEOMETRY.detailHeight
  );
}

function resolveCauldronCenterY(ingredientPositions) {
  return (
    ingredientPositions[1].y +
    BREWING_HUD_GEOMETRY.ingredientSlotHeight / 2
  );
}

function colorFromHex(value, fallback) {
  const normalized = String(value ?? '').trim().replace(/^#/, '');
  const parsed = Number.parseInt(normalized, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createLockedArtFilter() {
  try {
    const filter = new ColorMatrixFilter();
    filter.matrix = [
      0.2125, 0.7154, 0.0721, 0, 0,
      0.2125, 0.7154, 0.0721, 0, 0,
      0.2125, 0.7154, 0.0721, 0, 0,
      0, 0, 0, 1, 0,
    ];
    return filter;
  } catch {
    return null;
  }
}

function formatTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(Number(milliseconds) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function toTitleCase(value) {
  return String(value ?? '').replace(/\b[a-z]/g, (character) =>
    character.toUpperCase(),
  );
}

function centeredText(text, style) {
  return createText(text, { ...style, align: 'center' });
}

function createMissingIngredientRowItem(index) {
  const root = new Container({
    label: `brewing-missing-ingredient-row-item-${index}`,
  });
  const icon = new Sprite(Texture.EMPTY);
  icon.anchor.set(0.5);
  const label = createText('', BREWING_MISSING_INGREDIENT_LABEL_STYLE);
  label.anchor.set(0, 0.5);
  const count = createText('', BREWING_MISSING_INGREDIENT_COUNT_STYLE);
  count.anchor.set(0, 0.5);
  const separator = createText(',', BREWING_MISSING_INGREDIENT_LABEL_STYLE);
  separator.anchor.set(0, 0.5);
  root.addChild(icon, label, count, separator);
  root.visible = false;
  root.renderable = false;
  return { root, icon, label, count, separator, fullLabel: '' };
}

function setFittedMissingIngredientLabel(label, value, maximumWidth) {
  const fullText = String(value ?? '');
  setText(label, fullText);
  label.scale.set(1);
  if (label.width <= maximumWidth) {
    return;
  }
  const characters = Array.from(fullText);
  while (characters.length > 1 && label.width > maximumWidth) {
    characters.pop();
    setText(label, `${characters.join('')}…`);
  }
  if (label.width > maximumWidth && label.width > 0) {
    label.scale.set(maximumWidth / label.width, 1);
  }
}

function getTexture(assetManager, id) {
  return assetManager?.getTexture?.(id) ?? Texture.EMPTY;
}

function getAtlasTexture(assetManager, frameName) {
  return frameName
    ? assetManager?.getAtlasTexture?.(frameName) ?? Texture.EMPTY
    : Texture.EMPTY;
}

function createSpriteActionIcon(
  texture,
  label,
  { tint = 0xffffff } = {},
) {
  const root = new Container({ label });
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  sprite.tint = tint;
  sprite.label = `${label}:sprite`;
  root.addChild(sprite);
  root.iconSprites = [sprite];
  return root;
}

function attachActionIcon(button, icon) {
  const visual = button.control.visual;
  const labelIndex = visual.getChildIndex(button.control.textLabel);
  visual.addChildAt(icon, Math.max(0, labelIndex));
}

function layoutActionIcon(
  button,
  icon,
  {
    iconWidth,
    iconHeight,
    labelY,
    hitSize,
    hitTop,
  },
) {
  const [sprite] = icon.iconSprites;
  sprite.width = iconWidth;
  sprite.height = iconHeight;
  const label = button.control.textLabel;
  icon.position.set(button.width / 2, button.height / 2);
  label.position.set(button.width / 2, labelY);
  button.control.hitArea = new Rectangle(
    (button.width - hitSize) / 2,
    hitTop,
    hitSize,
    hitSize,
  );
}

function layoutCompactHitArea(button, hitSize) {
  button.control.hitArea = new Rectangle(
    (button.width - hitSize) / 2,
    (button.height - hitSize) / 2,
    hitSize,
    hitSize,
  );
}

function layoutNavigationIcon(button, icon, opticalShiftX = 0) {
  icon.position.set(
    button.width / 2 + opticalShiftX,
    button.height / 2,
  );
  const [sprite] = icon.iconSprites;
  sprite.width = 22;
  sprite.height = 22;
}

function captureDisplayState(displayObject) {
  return {
    x: displayObject.x,
    y: displayObject.y,
    alpha: displayObject.alpha,
    scaleX: displayObject.scale.x,
    scaleY: displayObject.scale.y,
    rotation: displayObject.rotation,
  };
}

function restoreDisplayState(displayObject, state) {
  displayObject.position.set(state.x, state.y);
  displayObject.alpha = state.alpha;
  displayObject.scale.set(state.scaleX, state.scaleY);
  displayObject.rotation = state.rotation;
}

function applyCauldronSettle(
  displayObject,
  rest,
  offset,
  alpha,
  scaleX,
  scaleY,
  rotation,
) {
  displayObject.x = rest.x + offset;
  displayObject.alpha = rest.alpha * alpha;
  displayObject.scale.set(
    rest.scaleX * scaleX,
    rest.scaleY * scaleY,
  );
  displayObject.rotation = rest.rotation + rotation;
}

function applyContainedCauldronMotion(
  art,
  liquid,
  rest,
  { offsetY = 0, scaleX = 1, scaleY = 1 } = {},
) {
  art.y = rest.art.y + offsetY;
  art.scale.set(
    rest.art.scaleX * scaleX,
    rest.art.scaleY * scaleY,
  );
  liquid.y = rest.liquid.y + offsetY;
  liquid.scale.set(
    rest.liquid.scaleX * scaleX,
    rest.liquid.scaleY * scaleY,
  );
}

function isBrewingQuantityActionVisible(cauldron = {}) {
  if (typeof cauldron.quantityAction?.visible === 'boolean') {
    return cauldron.quantityAction.visible;
  }

  const maxQuantity = Math.floor(
    Number(cauldron.maxBrewQuantity ?? cauldron.level),
  );
  return Number.isFinite(maxQuantity) && maxQuantity > 1;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

function lerpValue(start, end, progress) {
  return start + (end - start) * progress;
}

function easeOutQuint(progress) {
  const value = clamp(progress, 0, 1);
  return 1 - (1 - value) ** 5;
}

function resolveCauldronMotionKey(cauldron = {}, index = 0) {
  return String(
    cauldron.id ??
      cauldron.cauldronIndex ??
      cauldron.cauldronNumber ??
      index,
  );
}

function createBrewingHudMotionState(cauldron = {}, primaryState = {}) {
  const active = cauldron.activeBrew ?? null;
  return {
    primaryId: primaryState.id ?? 'idle',
    primaryEnabled: primaryState.enabled === true,
    complete: Boolean(
      active?.canCollect === true ||
        active?.canStartBottling === true ||
        active?.phase === 'brewed' ||
        active?.phase === 'ready',
    ),
  };
}

function resolveCauldronMotionMode(cauldron = {}, primaryState = {}) {
  const active = cauldron.activeBrew ?? null;
  if (
    active?.canCollect === true ||
    active?.canStartBottling === true ||
    active?.phase === 'brewed' ||
    active?.phase === 'ready'
  ) {
    return 'complete';
  }
  if (active) {
    return 'brewing';
  }
  if (
    cauldron.selectedRecipe ||
    cauldron.match ||
    primaryState.id === 'brew'
  ) {
    return 'prepared';
  }
  return 'idle';
}

function isCauldronHearthLit(cauldron = {}) {
  const active = cauldron.activeBrew ?? null;
  if (!active) {
    return false;
  }
  if (
    active.canCollect === true ||
    active.canStartBottling === true ||
    active.phase === 'brewed' ||
    active.phase === 'ready'
  ) {
    return false;
  }
  return (
    active.phase === undefined ||
    active.phase === 'brewing' ||
    active.phase === 'bottling'
  );
}

export function resolveBrewingPrimaryState(cauldron = {}) {
  const active = cauldron.activeBrew ?? null;
  const auto =
    cauldron.autoBrewEnabled === true &&
    cauldron.autoBrewArmed === true;

  if (active?.canCollect === true) {
    return {
      id: 'complete',
      label: 'Bottled',
      enabled: false,
      variant: 'green',
    };
  }

  if (auto) {
    if (!active) {
      return {
        id: 'cancel',
        label: 'Stop Auto',
        enabled: true,
        variant: 'yellow',
      };
    }
    return {
      id: 'cancel',
      label: 'Cancel',
      enabled: true,
      variant: 'yellow',
    };
  }

  if (
    active?.canStartBottling === true ||
    active?.phase === 'brewed'
  ) {
    return {
      id: 'bottle',
      label: 'Bottle',
      enabled: active?.canStartBottling !== false,
      variant: 'green',
    };
  }
  if (
    active?.phase === 'brewing' ||
    active?.phase === 'bottling' ||
    active
  ) {
    return {
      id: 'cancel',
      label: 'Cancel',
      enabled:
        active?.phase === 'brewing' ||
        active?.phase === 'bottling',
      variant: 'yellow',
    };
  }

  const isEmpty =
    !cauldron.selectedRecipe &&
    (cauldron.ingredients?.length ?? 0) === 0;
  if (isEmpty) {
    return {
      id: 'recipes',
      label: 'Choose Recipe',
      enabled: cauldron.canSelectRecipe !== false,
      variant: 'green',
    };
  }

  const primary = cauldron.primaryAction ?? {};
  return {
    id: 'brew',
    label: 'Brew',
    enabled:
      primary.disabled !== true &&
      (primary.enabled === true ||
        (primary.enabled !== false && cauldron.canBrew !== false)),
    variant: 'green',
  };
}

function drawDashedRect(graphics, x, y, width, height, color) {
  const dash = 5;
  const gap = 3;
  const drawLine = (x1, y1, x2, y2) => {
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length <= 0) {
      return;
    }
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

function nextBrewQuantity(cauldron = {}) {
  const current = Math.max(1, Number(cauldron.brewQuantity) || 1);
  const maximum = Math.max(
    1,
    Number(cauldron.maxBrewQuantity ?? cauldron.level) || 1,
  );
  return current >= maximum ? 1 : current + 1;
}

function releaseRegistration(registration) {
  registration?.release?.();
  registration?.unregister?.();
  registration?.destroy?.();
}
