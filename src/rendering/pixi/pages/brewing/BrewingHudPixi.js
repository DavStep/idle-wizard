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
import { PixiNineSliceFrame } from '../../primitives/PixiNineSliceFrame.js';
import { PixiStarLevelLabel } from '../../primitives/PixiStarLevelLabel.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  RETAINED_PAGE_GEOMETRY,
  RETAINED_TEXT_STYLES,
  RetainedButton,
  RetainedPanel,
  RetainedProgressBar,
  applyTextTheme,
  createText,
  setText,
} from '../workshop/RetainedPageKit.js';
import { ResearchStationTitlePlaque } from '../research/ResearchPixiPage.js';

export const BREWING_HUD_GEOMETRY = Object.freeze({
  edge: 16,
  top: PIXI_UI_GEOMETRY.roomContentTop,
  carouselHeight: 455,
  previewHeight: 292,
  detailTop: 439,
  detailHeight: 120,
  detailInset: 0,
  detailContentInset: 10,
  recipeButtonWidth: 58,
  autoButtonWidth: 32,
  autoButtonHeight: 32,
  quantityButtonWidth: 32,
  configurationGap: 12,
  autoIconHeight: 21,
  autoLabelY: 21,
  autoHitSize: 44,
  autoHitTop: -4,
  quantityHitSize: 44,
  potionIconSize: 50,
  previewVerticalOffset: 22,
  navigationButtonWidth: 34,
  navigationButtonHeight: 38,
  navigationCauldronGap: 4,
  navigationIconOpticalNudge: 0.7,
  ingredientColumns: 3,
  ingredientRows: 2,
  ingredientSlots: 6,
});

const ASSETS = Object.freeze({
  cauldron: 'source:assets/rooms/brewing/cauldron/cauldron-empty.png',
  cauldronLiquidMask:
    'source:assets/rooms/brewing/cauldron/cauldron-liquid-mask.png',
  previous: 'source:assets/ui/brewing-carousel/chevron-left.png',
  next: 'source:assets/ui/brewing-carousel/chevron-right.png',
  settings: PIXI_ROOT_RUN_ASSETS.settingsGear,
  herbs: 'source:assets/icons/icon-herb-box.png',
  potions: 'source:assets/icons/icon-potion-box.png',
  lock: PIXI_ROOT_RUN_ASSETS.lock,
});
const POTION_PREVIEW_SOURCE_INSETS = Object.freeze({
  top: 49,
  right: 50,
  bottom: 50,
  left: 49,
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
const RETAINED_INGREDIENT_NAME_STYLE = Object.freeze({
  fontSize: 8,
  lineHeight: 9,
  align: 'center',
  wordWrap: true,
  wordWrapWidth: 54,
});
// Pixi can crop the terminal Lilita One glyph; this adds texture width
// without adding visible ink to the retained status labels.
const DYNAMIC_STATUS_TEXT_TEXTURE_GUTTER = '\u3000';
const AUTO_GEAR_STEP_INTERVAL_MS = 320;
const AUTO_GEAR_STEP_DURATION_MS = 70;
const AUTO_GEAR_STEP_RADIANS = Math.PI / 8;
const CAULDRON_CHANGE_MOTION_DURATION_MS = 240;
const CAULDRON_CHANGE_TRAVEL = 18;

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
    this.activeTimerState = null;
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
    this.root.addChild(this.carouselPanel.root, this.detailPanel.root);

    this.cauldronStars = new PixiStarLevelLabel({
      assetManager,
      size: 12,
      gap: 1,
      label: 'brewing-carousel-cauldron-stars',
    });
    this.cauldronTitlePlaque = new ResearchStationTitlePlaque({
      assetManager,
      trailingContent: this.cauldronStars,
      trailingGap: 6,
    });
    this.cauldronTitlePlaque.root.label =
      'brewing-carousel-cauldron-title-plaque';
    this.cauldronTitle = this.cauldronTitlePlaque.title;
    this.counter = centeredText('', RETAINED_TEXT_STYLES.bold);
    this.counter.anchor.set(1, 0);
    this.recipeOrbit = new Graphics({
      label: 'brewing-recipe-orbit',
    });
    this.cauldronArt = new Sprite(getTexture(assetManager, ASSETS.cauldron));
    this.cauldronArt.anchor.set(0.5);
    this.cauldronArt.label = 'brewing-carousel-cauldron-art';
    this.cauldronLiquid = new Sprite(
      getTexture(assetManager, ASSETS.cauldronLiquidMask),
    );
    this.cauldronLiquid.anchor.set(0.5);
    this.cauldronLiquid.alpha = 0.94;
    this.cauldronLiquid.label = 'brewing-carousel-cauldron-liquid';
    this.cauldronLiquidHighlight = new Graphics({
      label: 'brewing-carousel-cauldron-liquid-highlight',
    });
    this.lockedCauldronFilter = createLockedArtFilter();
    this.lockArt = new Sprite(getTexture(assetManager, ASSETS.lock));
    this.lockArt.anchor.set(0.5);
    this.lockArt.label = 'brewing-carousel-lock-art';
    this.lockLabel = centeredText('', RETAINED_TEXT_STYLES.bold);
    this.lockLabel.anchor.set(0.5, 0);
    this.cauldronChangeSwoosh = new Graphics({
      label: 'brewing-cauldron-change-swoosh',
    });
    this.cauldronChangeSwoosh.visible = false;
    this.cauldronChangeSwoosh.renderable = false;
    this.dots = new Graphics({ label: 'brewing-carousel-dots' });
    this.carouselPanel.body.addChild(
      this.cauldronTitlePlaque.root,
      this.counter,
      this.recipeOrbit,
      this.cauldronArt,
      this.cauldronLiquid,
      this.cauldronLiquidHighlight,
      this.lockArt,
      this.lockLabel,
      this.cauldronChangeSwoosh,
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
      () => this.actions.openRecipes?.(this.selectedIndex),
      'brewing:recipes',
    );
    this.autoBrew = this.createButton('autobrew', 'Auto', 'yellow', () =>
      this.actions.toggleAutoBrew?.(this.selectedIndex),
    );
    this.quantity = this.createButton('quantity', 'x1', 'yellow', () => {
      const cauldron = this.getSelectedCauldron();
      const quantity = cauldron?.quantityAction ?? {};
      return (
        this.actions.selectBrewQuantity?.(
          quantity.nextQuantity ?? nextBrewQuantity(cauldron),
          this.selectedIndex,
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
    this.actionIcons = {
      autoBrew: createSpriteActionIcon(
        getTexture(assetManager, ASSETS.settings),
        'brewing-autobrew-action-icon',
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
    for (const button of [
      this.previous,
      this.next,
      this.recipes,
      this.autoBrew,
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
      label: 'brewing-potion-preview-well',
    });
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
          onActivate: () =>
            this.actions.openHerbPicker?.(
              this.selectedIndex,
              index,
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
    });
    this.phaseTime = createText('', {
      ...BREWING_DETAIL_TEXT_STYLE.body,
      align: 'right',
    });
    this.phaseTime.anchor.set(1, 0);
    this.progress = new RetainedProgressBar({
      assetManager,
      label: 'brewing-batch-progress',
      tone: 'blue',
    });
    this.detailPanel.body.addChild(
      this.phaseLabel,
      this.phaseTime,
      this.progress.root,
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

  createButton(name, label, variant, action, tutorialId = null) {
    return new RetainedButton({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      semanticRegistry: this.semanticTargets,
      semanticId: `brewing.${name}`,
      tutorialId,
      buttonLabel: `brewing-${name}`,
      label,
      variant,
      onActivate: action,
    });
  }

  bind(model = {}, actions = {}) {
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
    const unlocked = cauldron?.unlocked !== false;
    const number = cauldron?.cauldronNumber ?? this.selectedIndex + 1;
    this.cauldronStars.setLevel(unlocked ? cauldron?.level ?? 1 : 0);
    this.cauldronStars.visible = unlocked;
    this.cauldronStars.renderable = unlocked;
    this.cauldronTitlePlaque.bind(
      unlocked ? `Cauldron ${number}` : 'Locked Cauldron',
      'brewing',
    );
    this.layoutCarouselHeader();
    const unlockedCount = cauldrons.filter(
      (candidate) => candidate?.unlocked !== false,
    ).length;
    setText(
      this.counter,
      `${number}/${Math.max(1, model.configuredMaxCauldrons ?? 5)}`,
    );
    this.counter.visible = unlockedCount > 1;
    this.counter.renderable = this.counter.visible;
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
    this.recipes.setModel({
      label: 'Recipes',
      enabled: unlocked && cauldron?.canSelectRecipe !== false && !active,
      action: () => this.actions.openRecipes?.(this.selectedIndex),
    });
    const autoBrewEnabled = cauldron?.autoBrewEnabled === true;
    const autoBrewVariant = autoBrewEnabled ? 'green' : 'yellow';
    this.autoBrew.variant = autoBrewVariant;
    this.autoBrew.control.setVariant(autoBrewVariant);
    this.autoBrew.setModel({
      label: 'Auto',
      enabled:
        autoBrewEnabled || cauldron?.autoBrewAvailable === true,
      selected: false,
      action: () => this.actions.toggleAutoBrew?.(this.selectedIndex),
    });
    this.layoutAutoBrewContent();
    this.setAutoBrewMotionEnabled(autoBrewEnabled);
    const quantity = cauldron?.quantityAction ?? {};
    this.quantity.setModel({
      label: quantity.label ?? `x${Math.max(1, Number(cauldron?.brewQuantity) || 1)}`,
      enabled: quantity.enabled !== false && !active,
      action: () =>
        this.actions.selectBrewQuantity?.(
          quantity.nextQuantity ?? nextBrewQuantity(cauldron),
          this.selectedIndex,
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
    this.setCauldronActionVisibility(unlocked, cauldron);
    this.detailPanel.root.visible = unlocked;
    this.detailPanel.root.renderable = unlocked;
    this.bindUnlockCostButton(cauldron, unlocked);
    this.bindDetail(cauldron, active);
    this.syncActionIcons();
    this.drawDots();
  }

  bindDetail(cauldron = {}, active = null) {
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
      cauldron.unlocked !== false && Boolean(active || recipe);
    this.cauldronLiquid.renderable = this.cauldronLiquid.visible;
    this.cauldronLiquid.tint = this.cauldronLiquidColor;
    this.cauldronLiquidHighlight.visible = this.cauldronLiquid.visible;
    this.cauldronLiquidHighlight.renderable = this.cauldronLiquid.visible;
    this.redrawCauldronLiquid();

    const requirements = normalizeRequirements(
      recipe?.ingredients ?? cauldron.guideRows ?? cauldron.ingredients,
      cauldron.herbs ?? this.model.herbs ?? [],
    );
    const ingredientSelectionEnabled =
      cauldron.unlocked !== false &&
      !active &&
      cauldron.canAddIngredient !== false &&
      cauldron.acceptsHerbDrop !== false;
    this.ingredientSlots.forEach((slot, index) =>
      slot.bind(requirements[index] ?? null, {
        enabled: ingredientSelectionEnabled,
      }),
    );

    setDynamicStatusText(
      this.phaseLabel,
      active
        ? active.phase === 'ready'
          ? 'Ready to Collect'
          : toTitleCase(active.phase)
        : recipe
          ? 'Ready to Brew'
          : '',
    );
    const now = this.getTimerNow();
    this.syncActiveTimer(active, now);
    this.updateActiveTimer(now, {
      reducedMotion: this.page?.prefersReducedMotion?.() === true,
    });
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
    if (!active) {
      this.activeTimerState = null;
      return;
    }

    const totalMs = nonNegativeFinite(
      active.durationMs ?? active.totalMs,
    );
    const remainingMs = nonNegativeFinite(active.remainingMs);
    const snapshotProgress =
      totalMs > 0
        ? clamp(1 - remainingMs / totalMs, 0, 1)
        : clamp(active.progress, 0, 1);
    const identity = [
      this.selectedIndex,
      active.phase ?? '',
      active.key ?? active.resultItemTypeId ?? '',
      totalMs,
    ].join(':');
    const inferredEndTime = now + remainingMs;
    const existing = this.activeTimerState;

    if (
      !existing ||
      existing.identity !== identity ||
      snapshotProgress + Number.EPSILON <
        existing.snapshotProgress
    ) {
      this.activeTimerState = {
        identity,
        endTime: inferredEndTime,
        remainingMs,
        snapshotProgress,
        totalMs,
      };
      return;
    }

    existing.endTime = Math.min(
      existing.endTime,
      inferredEndTime,
    );
    existing.remainingMs = Math.min(
      existing.remainingMs,
      remainingMs,
    );
    existing.snapshotProgress = Math.max(
      existing.snapshotProgress,
      snapshotProgress,
    );
    existing.totalMs = totalMs;
  }

  updateActiveTimer(
    now,
    { reducedMotion = false } = {},
  ) {
    const active = this.getSelectedCauldron()?.activeBrew ?? null;
    if (!active) {
      this.activeTimerState = null;
      this.setTimerProgress(0);
      setDynamicStatusText(this.phaseTime, '');
      return;
    }

    if (!this.activeTimerState) {
      this.syncActiveTimer(active, now);
    }
    const state = this.activeTimerState;
    const canCollect = active.canCollect === true;
    if (canCollect) {
      this.setTimerProgress(1);
      setDynamicStatusText(this.phaseTime, 'Complete');
      return;
    }

    const remainingMs = reducedMotion
      ? state.remainingMs
      : Math.max(0, state.endTime - now);
    const progress =
      state.totalMs > 0
        ? clamp(1 - remainingMs / state.totalMs, 0, 1)
        : state.snapshotProgress;
    this.setTimerProgress(progress);
    setDynamicStatusText(
      this.phaseTime,
      remainingMs > 0 ? formatTime(remainingMs) : '',
    );
  }

  setTimerProgress(progress) {
    const nextProgress = clamp(progress, 0, 1);
    if (this.progress.progress === nextProgress) {
      return;
    }
    this.progress.setProgress(nextProgress);
  }

  activatePrimaryAction() {
    const cauldron = this.getSelectedCauldron();
    const state = this.primaryState ?? resolveBrewingPrimaryState(cauldron);
    switch (state.id) {
      case 'cancel':
        if (
          cauldron?.activeBrew?.phase === 'brewing' ||
          cauldron?.activeBrew?.phase === 'bottling'
        ) {
          return this.actions.cancelBrew?.(this.selectedIndex) ?? false;
        }
        return this.actions.toggleAutoBrew?.(this.selectedIndex) ?? false;
      case 'collect':
        return this.actions.collectBrew?.(this.selectedIndex) ?? false;
      case 'bottle':
        return (
          this.actions.performCauldronAction?.(cauldron, { id: 'bottle' }) ??
          false
        );
      default:
        return (
          this.actions.performCauldronAction?.(
            cauldron,
            cauldron?.primaryAction ?? { id: 'brew' },
          ) ?? false
        );
    }
  }

  getCauldrons() {
    return Array.isArray(this.model.cauldrons) ? this.model.cauldrons : [];
  }

  getSelectedCauldron() {
    return this.getCauldrons()[this.selectedIndex] ?? {};
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

  layout(sourceWidth) {
    this.sourceWidth = sourceWidth;
    const edge = BREWING_HUD_GEOMETRY.edge;
    const width = sourceWidth - edge * 2;
    const previewVerticalOffset =
      BREWING_HUD_GEOMETRY.previewVerticalOffset;
    const cauldronCenterY = 136 + previewVerticalOffset;
    this.carouselPanel.setBounds(
      edge,
      BREWING_HUD_GEOMETRY.top,
      width,
      BREWING_HUD_GEOMETRY.carouselHeight,
    );
    this.hidePreviewPanelChrome();
    this.detailPanel.setBounds(
      edge + BREWING_HUD_GEOMETRY.detailInset,
      BREWING_HUD_GEOMETRY.detailTop,
      width - BREWING_HUD_GEOMETRY.detailInset * 2,
      BREWING_HUD_GEOMETRY.detailHeight,
    );
    this.layoutCarouselHeader();
    this.counter.position.set(width - 10, 44);
    this.cauldronArt.position.set(width / 2, cauldronCenterY);
    this.cauldronArt.width = 116;
    this.cauldronArt.height = 94;
    this.cauldronLiquid.position.set(
      this.cauldronArt.x,
      this.cauldronArt.y,
    );
    this.cauldronLiquid.alpha = 0.94;
    this.cauldronLiquid.width = this.cauldronArt.width;
    this.cauldronLiquid.height = this.cauldronArt.height;
    this.redrawCauldronLiquid();
    this.cauldronLiquidHighlight.position.set(0, 0);
    this.lockArt.position.set(width / 2, 135 + previewVerticalOffset);
    this.lockArt.alpha = 1;
    this.lockArt.width = 44;
    this.lockArt.height = 44;
    this.lockLabel.position.set(width / 2, 177 + previewVerticalOffset);
    this.dots.position.set(width / 2, 223 + previewVerticalOffset);
    this.drawRecipeOrbit(width);
    this.captureCauldronChangeRestState();
    const navigationTop =
      BREWING_HUD_GEOMETRY.top +
      cauldronCenterY -
      BREWING_HUD_GEOMETRY.navigationButtonHeight / 2;
    const cauldronHalfWidth = this.cauldronArt.width / 2;
    this.previous.setBounds(
      sourceWidth / 2 -
        cauldronHalfWidth -
        BREWING_HUD_GEOMETRY.navigationCauldronGap -
        BREWING_HUD_GEOMETRY.navigationButtonWidth,
      navigationTop,
      BREWING_HUD_GEOMETRY.navigationButtonWidth,
      BREWING_HUD_GEOMETRY.navigationButtonHeight,
    );
    this.next.setBounds(
      sourceWidth / 2 +
        cauldronHalfWidth +
        BREWING_HUD_GEOMETRY.navigationCauldronGap,
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
      BREWING_HUD_GEOMETRY.detailTop +
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
      239 + previewVerticalOffset,
    );
    this.rarity.position.set(
      width / 2,
      258 + previewVerticalOffset,
    );
    this.ownedLabel.position.set(36, 72);
    this.batchLabel.position.set(width / 2, 274 + previewVerticalOffset);
    const ingredientTileWidth = 56;
    const ingredientTileHeight = 54;
    const ingredientPositions = resolveIngredientPositions(width);
    this.ingredientSlots.forEach((slot, index) => {
      const position = ingredientPositions[index];
      slot.setBounds(
        position.x,
        position.y,
        ingredientTileWidth,
        ingredientTileHeight,
      );
    });
    const detailWidth =
      width - BREWING_HUD_GEOMETRY.detailInset * 2;
    this.phaseLabel.position.set(78, 10);
    this.phaseTime.position.set(detailWidth - 12, 12);
    this.progress.setBounds(78, 34, detailWidth - 90, 11);
    this.layoutConfigurationButtons(sourceWidth);
    this.brew.setBounds(
      edge +
        BREWING_HUD_GEOMETRY.detailInset +
        BREWING_HUD_GEOMETRY.detailContentInset,
      BREWING_HUD_GEOMETRY.detailTop + 72,
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
    for (const text of [
      this.counter,
      this.lockLabel,
    ]) {
      applyTextTheme(text, this.theme, text.style);
    }
    for (const text of [
      this.potionName,
      this.rarity,
      this.batchLabel,
    ]) {
      applyTextTheme(text, this.theme, text.style);
    }
    applyTextTheme(this.ownedLabel, this.theme, {
      ...this.ownedLabel.style,
      fill: this.theme.muted,
    });
    for (const text of [
      this.ingredientsTitle,
      this.phaseLabel,
      this.phaseTime,
    ]) {
      applyTextTheme(text, this.theme, {
        ...text.style,
        fill: this.theme.text,
      });
    }
    for (const button of [
      this.previous,
      this.next,
      this.recipes,
      this.autoBrew,
      this.quantity,
      this.brew,
    ]) {
      button.applyTheme(this.theme);
    }
    this.unlockCostButton.applyTheme(this.theme);
    this.progress.applyTheme(this.theme);
    for (const slot of this.ingredientSlots) {
      slot.applyTheme(this.theme);
    }
    this.syncActionIcons();
    this.drawRecipeOrbit(this.carouselPanel.width);
  }

  layoutCarouselHeader() {
    this.cauldronTitlePlaque.setMaxWidth(
      this.carouselPanel.width + BREWING_HUD_GEOMETRY.edge,
    );
    this.cauldronTitlePlaque.root.position.set(
      -BREWING_HUD_GEOMETRY.edge,
      0,
    );
  }

  drawRecipeOrbit(width) {
    if (!Number.isFinite(width) || width <= 0) {
      return;
    }
    const centerX = width / 2;
    const centerY =
      136 + BREWING_HUD_GEOMETRY.previewVerticalOffset;
    this.recipeOrbit.position.set(0, 0);
    this.recipeOrbit
      .clear()
      .ellipse(centerX, centerY, 128, 87)
      .stroke({ color: 0x66596f, width: 1, alpha: 0.42 });
    for (const position of resolveIngredientPositions(width)) {
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

    const controlsTop = BREWING_HUD_GEOMETRY.top + 5;
    let right =
      sourceWidth - BREWING_HUD_GEOMETRY.edge;
    const controls = [
      [this.quantity, BREWING_HUD_GEOMETRY.quantityButtonWidth],
      [this.autoBrew, BREWING_HUD_GEOMETRY.autoButtonWidth],
      [this.recipes, BREWING_HUD_GEOMETRY.recipeButtonWidth],
    ];

    for (const [button, width] of controls) {
      if (!button.root.visible) {
        continue;
      }
      const x = right - width;
      button.setBounds(
        x,
        controlsTop,
        width,
        BREWING_HUD_GEOMETRY.autoButtonHeight,
      );
      right = x - BREWING_HUD_GEOMETRY.configurationGap;
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
    });
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
    this.updateActiveTimer(now, { reducedMotion });
    this.updateCauldronChangeMotion(now, {
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
    this.lockArt.x = rest.lock.x + offset;
    this.lockArt.alpha = rest.lock.alpha * settleAlpha;
    this.cauldronLiquidHighlight.x =
      rest.highlightX + offset;
    this.recipeOrbit.x =
      rest.orbitX - offset * 0.2;
    this.drawCauldronChangeSwoosh(
      motion.direction,
      progress,
    );

    if (progress >= 1) {
      this.resetCauldronChangeMotion();
    }
  }

  captureCauldronChangeRestState() {
    this.cauldronChangeRestState = {
      art: captureDisplayState(this.cauldronArt),
      liquid: captureDisplayState(this.cauldronLiquid),
      lock: captureDisplayState(this.lockArt),
      highlightX: this.cauldronLiquidHighlight.x,
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
    restoreDisplayState(this.lockArt, rest.lock);
    this.cauldronLiquidHighlight.x = rest.highlightX;
    this.recipeOrbit.x = rest.orbitX;
  }

  resetCauldronChangeMotion() {
    this.restoreCauldronChangeVisuals();
    this.cauldronChangeMotion = null;
    this.cauldronChangeSwoosh.clear();
    this.cauldronChangeSwoosh.visible = false;
    this.cauldronChangeSwoosh.renderable = false;
  }

  drawCauldronChangeSwoosh(direction, progress) {
    const graphics = this.cauldronChangeSwoosh;
    graphics.clear();
    const sweepProgress = clamp(progress / 0.88, 0, 1);
    const head = clamp(sweepProgress * 1.28, 0, 1);
    const tail = Math.max(0, head - 0.38);
    const alpha =
      Math.sin(Math.PI * sweepProgress) * 0.9;
    if (head - tail <= 0.005 || alpha <= 0.005) {
      graphics.visible = false;
      graphics.renderable = false;
      return;
    }

    const centerX =
      this.cauldronChangeRestState?.art.x ??
      this.carouselPanel.width / 2;
    const centerY =
      this.cauldronChangeRestState?.art.y ?? 136;
    const paths = [
      {
        start: [82, -28],
        controlA: [48, -55],
        controlB: [-24, -49],
        end: [-78, -8],
        color: 0x2fa8ff,
        width: 3,
      },
      {
        start: [72, 18],
        controlA: [34, 50],
        controlB: [-30, 46],
        end: [-72, 16],
        color: 0xf5c542,
        width: 2.2,
      },
      {
        start: [66, -5],
        controlA: [28, -23],
        controlB: [-24, -19],
        end: [-64, 2],
        color: 0xbfe9ff,
        width: 1.3,
      },
    ];

    for (const path of paths) {
      drawBezierTrail(graphics, {
        ...path,
        centerX,
        centerY,
        direction,
        tail,
        head,
        alpha,
      });
    }
    const spark = pointOnDirectionalBezier({
      ...paths[0],
      centerX,
      centerY,
      direction,
      progress: head,
    });
    graphics
      .circle(spark.x, spark.y, 2.2)
      .fill({ color: 0xf5c542, alpha });
    graphics.visible = true;
    graphics.renderable = true;
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
    this.resetCauldronChangeMotion();
    releaseRegistration(this.swipeRegistration);
    for (const button of [
      this.previous,
      this.next,
      this.recipes,
      this.autoBrew,
      this.quantity,
      this.brew,
    ]) {
      button.destroy();
    }
    this.unlockCostButton.destroy({ children: true });
    this.cauldronArt.filters = null;
    this.lockedCauldronFilter?.destroy?.();
    this.lockedCauldronFilter = null;
    this.progress.destroy();
    for (const slot of this.ingredientSlots) {
      slot.destroy();
    }
    this.carouselPanel.destroy();
    this.detailPanel.destroy();
  }
}

function setDynamicStatusText(text, value) {
  const nextValue = String(value ?? '');
  setText(
    text,
    nextValue
      ? `${nextValue}${DYNAMIC_STATUS_TEXT_TEXTURE_GUTTER}`
      : '',
  );
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
      'Collect finished batches automatically\nwhile autobrew is on.',
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
      label: 'auto collect off',
      buttonLabel: 'brewing-auto-collect-toggle',
      variant: 'green',
      onActivate: () => this.toggleAutoCollect(),
    });
    this.modal.panel.content.addChild(this.copy, this.toggle.root);
    this.model = {};
    this.actions = {};
    this.applyTheme(theme);
    this.layout({
      sourceWidth: RETAINED_PAGE_GEOMETRY.width,
      sourceHeight: RETAINED_PAGE_GEOMETRY.height,
    });
  }

  bind(model = {}) {
    this.model = model;
    this.actions = model.actions ?? {};
    this.modal.setTitle(model.title ?? `cauldron ${model.cauldronNumber ?? 1} settings`);
    const available = model.autoBrewEnabled === true;
    const enabled = model.autoCollectEnabled === true;
    this.toggle.setModel({
      label: available
        ? `auto collect ${enabled ? 'on' : 'off'}`
        : 'enable autobrew first',
      enabled: available,
      selected: enabled,
      action: () => this.toggleAutoCollect(),
    });
  }

  toggleAutoCollect() {
    const result = this.actions.toggleAutoCollect?.(this.model.cauldronIndex ?? 0);
    if (result?.ok !== false) {
      this.model.autoCollectEnabled = !this.model.autoCollectEnabled;
      this.bind(this.model);
    }
    return result ?? true;
  }

  layout(projection = {}) {
    const sourceWidth = Number(projection.sourceWidth) || 360;
    const sourceHeight = Number(projection.sourceHeight) || 2170 / 3;
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

class BrewingIngredientPickerSlot {
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
    this.root = new Container({
      label: `brewing-ingredient-picker-slot-${index}`,
    });
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
    this.quantity = centeredText('', RETAINED_TEXT_STYLES.bold);
    this.quantity.anchor.set(0.5, 1);
    this.root.addChild(this.frame, this.icon, this.name, this.quantity);
    this.model = null;
    this.frameInsets = null;
    this.semanticId = `brewing.ingredient-slot.${index}`;
    this.pressRegistration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () =>
          this.enabled &&
          this.root.visible &&
          this.root.renderable,
        onActivate: () => this.onActivate?.() ?? false,
        haptic: 'light',
      }) ?? null;
    this.semanticDefinition = semanticTargets?.register?.({
      semanticId: this.semanticId,
      displayObject: this.root,
      state: () => ({
        enabled: this.enabled,
        interactive: true,
        visible: this.root.visible && this.root.renderable,
      }),
      activate: () => this.onActivate?.() ?? false,
    });
  }

  bind(model, { decorative = false, enabled = true } = {}) {
    this.model = model;
    this.enabled = enabled === true;
    this.root.eventMode = this.enabled ? 'static' : 'none';
    const key = model?.itemKey ?? model?.key ?? null;
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
    const owned = Math.max(0, Number(model?.owned ?? model?.availableQuantity) || 0);
    const required = Math.max(0, Number(model?.quantity ?? model?.required) || 0);
    setText(
      this.quantity,
      model
        ? `${owned}/${required}`
        : decorative
          ? ''
          : '—',
    );
    this.sufficient = !model || owned >= required;
    this.decorative = decorative && !model;
    this.redraw();
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    this.height = height;
    this.frame.setSize(width, height, this.frameInsets);
    this.icon.position.set(width / 2, 19);
    this.icon.width = 26;
    this.icon.height = 26;
    this.name.position.set(width / 2, 33);
    this.name.style.wordWrapWidth = width - 8;
    this.quantity.position.set(width / 2, height - 3);
    this.redraw();
  }

  redraw() {
    this.frame.alpha = this.decorative ? 0.72 : 1;
  }

  applyTheme(theme) {
    const sourceInsets = theme?.frames?.panelSourceInsets ?? null;
    this.frameInsets = theme?.frames?.panelBorder ?? null;
    this.frame.setTexture(
      getTexture(this.assetManager, theme?.frames?.panel),
      sourceInsets,
    );
    this.frame.setSize(this.width ?? 0, this.height ?? 0, this.frameInsets);
    applyTextTheme(this.name, theme, {
      ...RETAINED_INGREDIENT_NAME_STYLE,
      fill: theme?.text ?? '#d4d4d4',
    });
    applyTextTheme(this.quantity, theme, {
      ...BREWING_DETAIL_TEXT_STYLE.small,
      fontWeight: '700',
      fill: this.model
        ? this.sufficient
          ? 0x79c946
          : 0xe26859
        : theme?.muted ?? '#a6a6a6',
    });
  }

  destroy() {
    this.semanticTargets?.unregister?.(this.semanticId, {
      displayObject: this.root,
    });
    releaseRegistration(this.pressRegistration);
    this.root.destroy({ children: true });
  }
}

function normalizeRequirements(rows, herbs) {
  const herbByKey = new Map(
    (Array.isArray(herbs) ? herbs : []).map((herb) => [herb.key, herb]),
  );
  return (Array.isArray(rows) ? rows : [])
    .slice(0, BREWING_HUD_GEOMETRY.ingredientSlots)
    .map((row) => {
      const key = row.itemKey ?? row.key;
      const herb = herbByKey.get(key) ?? {};
      return {
        ...row,
        itemKey: key,
        owned:
          row.owned ??
          row.availableQuantity ??
          herb.quantity ??
          herb.availableQuantity ??
          0,
        quantity: row.quantity ?? row.required ?? 1,
      };
    });
}

function resolveIngredientPositions(width) {
  const offset = BREWING_HUD_GEOMETRY.previewVerticalOffset;
  return [
    { x: 58, y: 52 + offset },
    { x: 10, y: 112 + offset },
    { x: 50, y: 172 + offset },
    { x: width - 106, y: 172 + offset },
    { x: width - 66, y: 112 + offset },
    { x: width - 114, y: 52 + offset },
  ];
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

function drawBezierTrail(
  graphics,
  {
    centerX,
    centerY,
    direction,
    start,
    controlA,
    controlB,
    end,
    tail,
    head,
    color,
    width,
    alpha,
  },
) {
  const segmentCount = 18;
  for (let index = 0; index <= segmentCount; index += 1) {
    const progress =
      tail + ((head - tail) * index) / segmentCount;
    const point = pointOnDirectionalBezier({
      centerX,
      centerY,
      direction,
      start,
      controlA,
      controlB,
      end,
      progress,
    });
    if (index === 0) {
      graphics.moveTo(point.x, point.y);
    } else {
      graphics.lineTo(point.x, point.y);
    }
  }
  graphics.stroke({
    color,
    width,
    alpha,
    cap: 'round',
    join: 'round',
  });
}

function pointOnDirectionalBezier({
  centerX,
  centerY,
  direction,
  start,
  controlA,
  controlB,
  end,
  progress,
}) {
  const t = clamp(progress, 0, 1);
  const inverse = 1 - t;
  const x =
    inverse ** 3 * start[0] +
    3 * inverse ** 2 * t * controlA[0] +
    3 * inverse * t ** 2 * controlB[0] +
    t ** 3 * end[0];
  const y =
    inverse ** 3 * start[1] +
    3 * inverse ** 2 * t * controlA[1] +
    3 * inverse * t ** 2 * controlB[1] +
    t ** 3 * end[1];
  return {
    x: centerX + x * direction,
    y: centerY + y,
  };
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

function nonNegativeFinite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function resolveBrewingPrimaryState(cauldron = {}) {
  const active = cauldron.activeBrew ?? null;
  const auto = cauldron.autoBrewEnabled === true;

  if (auto) {
    if (active?.canCollect === true) {
      return {
        id: 'collect',
        label: 'Collect',
        enabled: true,
        variant: 'green',
      };
    }
    return {
      id: 'cancel',
      label: 'Cancel',
      enabled: true,
      variant: 'yellow',
    };
  }

  if (active?.canCollect === true) {
    return {
      id: 'collect',
      label: 'Collect',
      enabled: true,
      variant: 'green',
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

  const primary = cauldron.primaryAction ?? {};
  return {
    id: 'brew',
    label: 'Brew',
    enabled:
      primary.enabled !== false &&
      primary.disabled !== true &&
      cauldron.canBrew !== false,
    variant: 'green',
  };
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
