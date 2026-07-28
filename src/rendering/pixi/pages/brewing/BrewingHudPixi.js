import {
  ColorMatrixFilter,
  Container,
  Graphics,
  Sprite,
  Texture,
} from 'pixi.js';

import { getHerbIconFrameName } from '../../../../assets/items/herbs/herbIcons.js';
import { getPotionIconFrameName } from '../../../../assets/items/potions/potionIcons.js';
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

export const BREWING_HUD_GEOMETRY = Object.freeze({
  edge: 12,
  top: PIXI_UI_GEOMETRY.roomContentTop,
  carouselHeight: 174,
  detailTop: 320,
  detailHeight: 180,
  ingredientColumns: 3,
  ingredientRows: 2,
  ingredientSlots: 6,
});

const RESEARCH_ART_SOURCE_INSETS = Object.freeze({
  top: 49,
  right: 50,
  bottom: 50,
  left: 49,
});
const RESEARCH_ART_BORDER_INSETS = Object.freeze({
  top: 49 / 3,
  right: 50 / 3,
  bottom: 50 / 3,
  left: 49 / 3,
});
const BREWING_DETAIL_INK = 0x634934;

const ASSETS = Object.freeze({
  cauldron: 'source:assets/rooms/brewing/cauldron/cauldron-empty.png',
  previous: 'source:assets/ui/brewing-carousel/chevron-left.png',
  next: 'source:assets/ui/brewing-carousel/chevron-right.png',
  settings: PIXI_ROOT_RUN_ASSETS.settingsGear,
  cancel: 'source:assets/ui/guild-quest/close-x.png',
  herbs: 'source:assets/icons/icon-herb-box.png',
  potions: 'source:assets/icons/icon-potion-box.png',
  lock: PIXI_ROOT_RUN_ASSETS.lock,
});

const COMPACT_CAULDRON_ACTION_LABEL_STYLE = Object.freeze({
  fontSize: 10,
  lineHeight: 12,
});
const CAULDRON_ACTION_ROW_INSET = 6;

const BREWING_DETAIL_TEXT_STYLE = Object.freeze({
  title: Object.freeze({ fontSize: 11, lineHeight: 13 }),
  body: Object.freeze({ fontSize: 10, lineHeight: 12 }),
  small: Object.freeze({ fontSize: 9, lineHeight: 11 }),
});

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
    this.root = new Container({ label: 'brewing-fantasy-hud' });

    this.carouselPanel = new RetainedPanel({
      assetManager,
      label: '',
      panelLabel: 'brewing-carousel-panel',
      shadowKind: 'dialog',
    });
    this.detailPanel = new RetainedPanel({
      assetManager,
      label: '',
      panelLabel: 'brewing-batch-detail-panel',
      shadowKind: 'none',
    });
    this.detailBacking = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.researchCard.sourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets,
      label: 'brewing-batch-research-card',
    });
    this.detailPanel.root.addChildAt(this.detailBacking, 3);
    this.root.addChild(this.carouselPanel.root, this.detailPanel.root);

    this.cauldronTitle = createText('', RETAINED_TEXT_STYLES.bold);
    this.cauldronStars = new PixiStarLevelLabel({
      assetManager,
      size: 12,
      gap: 1,
      label: 'brewing-carousel-cauldron-stars',
    });
    this.counter = centeredText('', RETAINED_TEXT_STYLES.bold);
    this.counter.anchor.set(1, 0);
    this.cauldronArt = new Sprite(getTexture(assetManager, ASSETS.cauldron));
    this.cauldronArt.anchor.set(0.5);
    this.cauldronArt.label = 'brewing-carousel-cauldron-art';
    this.lockedCauldronFilter = createLockedArtFilter();
    this.lockArt = new Sprite(getTexture(assetManager, ASSETS.lock));
    this.lockArt.anchor.set(0.5);
    this.lockArt.label = 'brewing-carousel-lock-art';
    this.lockLabel = centeredText('', RETAINED_TEXT_STYLES.bold);
    this.lockLabel.anchor.set(0.5, 0);
    this.dots = new Graphics({ label: 'brewing-carousel-dots' });
    this.carouselPanel.body.addChild(
      this.cauldronTitle,
      this.cauldronStars,
      this.counter,
      this.cauldronArt,
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
    this.recipes = this.createButton('recipes', 'Recipes', 'yellow', () =>
      this.actions.openRecipes?.(this.selectedIndex),
    );
    this.autoBrew = this.createButton('autobrew', 'Auto Brew', 'yellow', () =>
      this.actions.toggleAutoBrew?.(this.selectedIndex),
    );
    this.brew = this.createButton('brew', 'Brew', 'green', () =>
      this.actions.performCauldronAction?.(
        this.getSelectedCauldron(),
        this.getSelectedCauldron()?.primaryAction,
      ),
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
      cancel: createSpriteActionIcon(
        getTexture(assetManager, ASSETS.cancel),
        'brewing-cancel-action-icon',
        { tint: 0xd85743 },
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
      this.brew,
    ]) {
      this.root.addChild(button.root);
    }
    this.root.addChild(this.unlockCostButton);

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
    this.ingredientsTitle = createText('Ingredients', {
      ...BREWING_DETAIL_TEXT_STYLE.title,
      fontWeight: '700',
    });
    this.detailPanel.body.addChild(
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
        new BrewingIngredientRequirementTile({
          index,
          assetManager,
        }),
    );
    for (const slot of this.ingredientSlots) {
      this.detailPanel.body.addChild(slot.root);
    }

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
      tone: 'green',
    });
    this.detailPanel.body.addChild(
      this.phaseLabel,
      this.phaseTime,
      this.progress.root,
    );
    this.cancel = this.createButton('cancel', 'Cancel', 'red', () => {
      const result = this.actions.cancelBrew?.(this.selectedIndex);
      return result ?? false;
    });
    attachActionIcon(this.cancel, this.actionIcons.cancel);
    this.collect = this.createButton('collect', 'Collect All', 'green', () => {
      const result = this.actions.collectBrew?.(this.selectedIndex);
      return result ?? false;
    });
    this.root.addChild(this.cancel.root, this.collect.root);

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

  createButton(name, label, variant, action) {
    return new RetainedButton({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      semanticRegistry: this.semanticTargets,
      semanticId: `brewing.${name}`,
      buttonLabel: `brewing-${name}`,
      label,
      variant,
      onActivate: action,
    });
  }

  bind(model = {}, actions = {}) {
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
    setText(
      this.cauldronTitle,
      unlocked ? `Cauldron ${number}` : 'Locked Cauldron',
    );
    this.cauldronStars.setLevel(unlocked ? cauldron?.level ?? 1 : 0);
    this.cauldronStars.visible = unlocked;
    this.cauldronStars.renderable = unlocked;
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
    const primary = cauldron?.primaryAction ?? {};
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
      label: autoBrewEnabled ? 'Auto On' : 'Auto Off',
      enabled: true,
      selected: false,
      action: () => this.actions.toggleAutoBrew?.(this.selectedIndex),
    });
    const maxBrewQuantity = Math.max(
      1,
      Number(cauldron?.maxBrewQuantity ?? cauldron?.level) || 1,
    );
    const primaryLabel =
      primary.id === 'brew' && maxBrewQuantity <= 1
        ? 'Brew'
        : capitalizeActionLabel(
            primary.label ?? (active?.canStartBottling ? 'bottle' : 'brew'),
          );
    this.brew.setModel({
      label: !unlocked
        ? cauldron?.canBuyCauldron
          ? `Unlock ${cauldron.nextCauldronCost ?? ''}`
          : 'Locked'
        : primaryLabel,
      enabled: true,
      action: () =>
        this.actions.performCauldronAction?.(
          cauldron,
          !unlocked ? { id: 'buy' } : primary,
        ),
    });
    this.setCauldronActionVisibility(unlocked, {
      autoBrewAvailable: cauldron?.autoBrewAvailable === true,
    });
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
      active?.label ?? recipe?.label ?? (cauldron.unlocked === false ? 'locked' : 'choose recipe');
    this.detailPanel.setTitle('');
    setText(this.potionName, toTitleCase(potionLabel));
    setText(this.rarity, toTitleCase(recipe?.rarity ?? 'common'));
    const owned = Number(recipe?.ownedQuantity ?? cauldron.ownedPotionQuantity ?? 0);
    setText(this.ownedLabel, `You Have ${owned}`);
    setText(
      this.batchLabel,
      active
        ? `Batch x${active.resultQuantity ?? 1}`
        : `Brewing x${cauldron.brewQuantity ?? 1}`,
    );
    const potionFrame = getPotionIconFrameName(potionKey);
    this.potionIcon.texture = getAtlasTexture(this.assetManager, potionFrame);
    this.potionIcon.visible = this.potionIcon.texture !== Texture.EMPTY;

    const requirements = normalizeRequirements(
      recipe?.ingredients ?? cauldron.guideRows ?? cauldron.ingredients,
      cauldron.herbs ?? this.model.herbs ?? [],
    );
    this.ingredientSlots.forEach((slot, index) =>
      slot.bind(requirements[index] ?? null, {
        decorative: index === 5,
      }),
    );

    const progress = active?.progress ?? 0;
    const canCollect = active?.canCollect === true;
    setText(
      this.phaseLabel,
      active
        ? active.phase === 'ready'
          ? 'Ready to Collect'
          : toTitleCase(active.phase)
        : recipe
          ? 'Ready to Brew'
          : '',
    );
    setText(
      this.phaseTime,
      active && active.remainingMs > 0
        ? formatTime(active.remainingMs)
        : canCollect
          ? 'Complete'
          : '',
    );
    this.progress.setProgress(canCollect ? 1 : progress);
    this.cancel.setModel({
      label: 'Cancel',
      enabled: true,
      action: () => this.actions.cancelBrew?.(this.selectedIndex),
    });
    this.collect.setModel({
      label: `Collect All${active?.resultQuantity ? ` x${active.resultQuantity}` : ''}`,
      enabled: true,
      action: () => this.actions.collectBrew?.(this.selectedIndex),
    });
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
    const edge = BREWING_HUD_GEOMETRY.edge;
    const width = sourceWidth - edge * 2;
    this.carouselPanel.setBounds(
      edge,
      BREWING_HUD_GEOMETRY.top,
      width,
      BREWING_HUD_GEOMETRY.carouselHeight,
    );
    this.detailPanel.setBounds(
      edge,
      BREWING_HUD_GEOMETRY.detailTop,
      width,
      BREWING_HUD_GEOMETRY.detailHeight,
    );
    this.layoutCarouselHeader();
    this.counter.position.set(width - 10, 8);
    this.cauldronArt.position.set(width / 2, 68);
    this.cauldronArt.width = 100;
    this.cauldronArt.height = 84;
    this.lockArt.position.set(width / 2, 67);
    this.lockArt.width = 44;
    this.lockArt.height = 44;
    this.lockLabel.position.set(width / 2, 94);
    this.dots.position.set(width / 2, 112);
    const navigationTop = BREWING_HUD_GEOMETRY.top + 48;
    this.previous.setBounds(edge + 12, navigationTop, 34, 38);
    this.next.setBounds(
      sourceWidth - edge - 46,
      navigationTop,
      34,
      38,
    );
    layoutNavigationIcon(this.previous, this.navigationIcons.previous);
    layoutNavigationIcon(this.next, this.navigationIcons.next);
    this.unlockCostButton.setBounds(
      (sourceWidth - PIXI_COST_BUTTON_GEOMETRY.stackedWidth) / 2,
      BREWING_HUD_GEOMETRY.top + 116,
      PIXI_COST_BUTTON_GEOMETRY.stackedWidth,
      PIXI_COST_BUTTON_GEOMETRY.stackedHeight,
    );
    const visibleActionButtons = [
      this.recipes,
      this.autoBrew,
      this.brew,
    ].filter((button) => button.root.visible);
    const actionGap = 6;
    const actionWidth = Math.min(
      100,
      (width -
          CAULDRON_ACTION_ROW_INSET * 2 -
          actionGap * 2) /
        3,
    );
    const actionRowWidth =
      actionWidth * visibleActionButtons.length +
      actionGap * Math.max(0, visibleActionButtons.length - 1);
    const actionRowX = edge + (width - actionRowWidth) / 2;
    visibleActionButtons.forEach((button, index) =>
      button.setBounds(
        actionRowX + index * (actionWidth + actionGap),
        BREWING_HUD_GEOMETRY.top + 134,
        actionWidth,
        34,
      ),
    );
    layoutActionIcon(this.autoBrew, this.actionIcons.autoBrew, {
      iconWidth:
        25 * PIXI_ROOT_RUN_GEOMETRY.settings.gearAspectRatio,
      iconHeight: 25,
      iconX: 17,
      labelShiftX: 10,
    });
    this.detailBacking.position.set(0, 0);
    this.detailBacking.setSize(
      width,
      BREWING_HUD_GEOMETRY.detailHeight,
      PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets,
    );
    this.potionIcon.position.set(55, 60);
    this.potionIcon.width = 46;
    this.potionIcon.height = 46;
    this.potionName.position.set(55, 8);
    this.rarity.position.set(55, 27);
    this.ownedLabel.position.set(55, 90);
    this.batchLabel.position.set(55, 106);
    this.ingredientsTitle.position.set(122, 8);
    const tileWidth = 54;
    const tileHeight = 40;
    const tileGap = 4;
    const ingredientGridWidth =
      tileWidth * BREWING_HUD_GEOMETRY.ingredientColumns +
      tileGap * (BREWING_HUD_GEOMETRY.ingredientColumns - 1);
    this.ingredientSlots.forEach((slot, index) => {
      slot.setBounds(
        122 + (index % 3) * (tileWidth + tileGap),
        25 + Math.floor(index / 3) * (tileHeight + tileGap),
        tileWidth,
        tileHeight,
      );
    });
    this.phaseLabel.position.set(122, 116);
    this.phaseTime.position.set(122 + ingredientGridWidth, 116);
    this.progress.setBounds(122, 132, ingredientGridWidth, 10);
    const footerButtonWidth = 118;
    const footerButtonGap = 8;
    const footerRowX =
      (sourceWidth - footerButtonWidth * 2 - footerButtonGap) / 2;
    const footerTop = BREWING_HUD_GEOMETRY.detailTop + 142;
    this.cancel.setBounds(
      footerRowX,
      footerTop,
      footerButtonWidth,
      30,
    );
    layoutActionIcon(this.cancel, this.actionIcons.cancel, {
      iconWidth: 18,
      iconHeight: 18,
      iconX: 33,
      labelShiftX: 8,
    });
    this.collect.setBounds(
      footerRowX + footerButtonWidth + footerButtonGap,
      footerTop,
      footerButtonWidth,
      30,
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.carouselPanel.applyTheme(this.theme);
    this.detailPanel.applyTheme(this.theme);
    this.detailPanel.frame.visible = false;
    this.detailPanel.fallback.visible = false;
    this.detailBacking.setTexture(
      getTexture(this.assetManager, PIXI_ROOT_RUN_ASSETS.researchCard),
      PIXI_ROOT_RUN_GEOMETRY.researchCard.sourceInsets,
    );
    for (const text of [
      this.counter,
      this.cauldronTitle,
      this.lockLabel,
    ]) {
      applyTextTheme(text, this.theme, text.style);
    }
    for (const text of [
      this.potionName,
      this.rarity,
      this.ownedLabel,
      this.batchLabel,
      this.ingredientsTitle,
      this.phaseLabel,
      this.phaseTime,
    ]) {
      applyTextTheme(text, this.theme, {
        ...text.style,
        fill: BREWING_DETAIL_INK,
      });
    }
    for (const button of [
      this.previous,
      this.next,
      this.recipes,
      this.autoBrew,
      this.brew,
      this.cancel,
      this.collect,
    ]) {
      button.applyTheme(this.theme);
    }
    this.unlockCostButton.applyTheme(this.theme);
    this.progress.applyTheme(this.theme);
    for (const slot of this.ingredientSlots) {
      slot.applyTheme(this.theme);
    }
    this.syncActionIcons();
  }

  layoutCarouselHeader() {
    this.cauldronTitle.position.set(10, 8);
    this.cauldronStars.position.set(
      this.cauldronTitle.x + Math.ceil(this.cauldronTitle.width) + 6,
      10,
    );
  }

  setCauldronActionVisibility(visible, { autoBrewAvailable = false } = {}) {
    this.recipes.root.visible = visible;
    this.recipes.root.renderable = visible;
    this.brew.root.visible = visible;
    this.brew.root.renderable = visible;
    this.autoBrew.root.visible = visible && autoBrewAvailable;
    this.autoBrew.root.renderable = this.autoBrew.root.visible;
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

  destroy() {
    releaseRegistration(this.swipeRegistration);
    for (const button of [
      this.previous,
      this.next,
      this.recipes,
      this.autoBrew,
      this.brew,
      this.cancel,
      this.collect,
    ]) {
      button.destroy();
    }
    this.unlockCostButton.destroy({ children: true });
    this.cauldronArt.filters = null;
    this.lockedCauldronFilter?.destroy?.();
    this.lockedCauldronFilter = null;
    this.progress.destroy();
    this.detailBacking.destroy({ children: true });
    for (const slot of this.ingredientSlots) {
      slot.destroy();
    }
    this.carouselPanel.destroy();
    this.detailPanel.destroy();
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

class BrewingIngredientRequirementTile {
  constructor({ index, assetManager }) {
    this.index = index;
    this.assetManager = assetManager;
    this.root = new Container({
      label: `brewing-ingredient-requirement-${index}`,
    });
    this.frame = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: RESEARCH_ART_SOURCE_INSETS,
      borderInsets: RESEARCH_ART_BORDER_INSETS,
      label: `brewing-ingredient-requirement-${index}-frame`,
    });
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.anchor.set(0.5);
    this.quantity = centeredText('', RETAINED_TEXT_STYLES.bold);
    this.quantity.anchor.set(0.5, 1);
    this.root.addChild(this.frame, this.icon, this.quantity);
    this.model = null;
  }

  bind(model, { decorative = false } = {}) {
    this.model = model;
    const key = model?.itemKey ?? model?.key ?? null;
    this.icon.texture = getAtlasTexture(
      this.assetManager,
      key ? getHerbIconFrameName(key) : null,
    );
    this.icon.visible = Boolean(model) && this.icon.texture !== Texture.EMPTY;
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
    this.frame.setSize(width, height, RESEARCH_ART_BORDER_INSETS);
    this.icon.position.set(width / 2, height / 2 - 3);
    this.icon.width = 24;
    this.icon.height = 24;
    this.quantity.position.set(width / 2, height - 2);
    this.redraw();
  }

  redraw() {
    this.frame.alpha = this.decorative ? 0.72 : 1;
  }

  applyTheme(theme) {
    this.frame.setTexture(
      getTexture(this.assetManager, PIXI_ROOT_RUN_ASSETS.researchArt),
      RESEARCH_ART_SOURCE_INSETS,
    );
    applyTextTheme(this.quantity, theme, {
      ...BREWING_DETAIL_TEXT_STYLE.body,
      fontWeight: '700',
      fill: this.model
        ? this.sufficient
          ? 0x256b25
          : 0x912f2b
        : BREWING_DETAIL_INK,
    });
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

function normalizeRequirements(rows, herbs) {
  const herbByKey = new Map(
    (Array.isArray(herbs) ? herbs : []).map((herb) => [herb.key, herb]),
  );
  return (Array.isArray(rows) ? rows : []).slice(0, 5).map((row) => {
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
    iconX,
    labelShiftX = 0,
  },
) {
  icon.position.set(iconX, button.height / 2);
  const [sprite] = icon.iconSprites;
  sprite.width = iconWidth;
  sprite.height = iconHeight;
  button.control.textLabel.position.set(
    button.width / 2 + labelShiftX,
    button.height / 2,
  );
}

function layoutNavigationIcon(button, icon) {
  icon.position.set(button.width / 2, button.height / 2);
  const [sprite] = icon.iconSprites;
  sprite.width = 22;
  sprite.height = 22;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

function capitalizeActionLabel(label) {
  const value = String(label ?? '');
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function releaseRegistration(registration) {
  registration?.release?.();
  registration?.unregister?.();
  registration?.destroy?.();
}
