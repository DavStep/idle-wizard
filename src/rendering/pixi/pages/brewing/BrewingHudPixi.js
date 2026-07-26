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
import { PixiStarLevelLabel } from '../../primitives/PixiStarLevelLabel.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
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
  top: 96,
  carouselHeight: 218,
  detailTop: 324,
  detailHeight: 230,
  ingredientColumns: 3,
  ingredientRows: 2,
  ingredientSlots: 6,
});

const ASSETS = Object.freeze({
  cauldron: 'source:assets/rooms/brewing/cauldron/cauldron-empty.png',
  previous: 'source:assets/ui/brewing-carousel/chevron-left.png',
  next: 'source:assets/ui/brewing-carousel/chevron-right.png',
  recipes: 'source:assets/icons/icon-brewing-recipes-preview.png',
  settings: 'source:assets/icons/icon-settings-cog.png',
  cancel: 'source:assets/ui/guild-quest/close-x.png',
  herbs: 'source:assets/icons/icon-herb-box.png',
  potions: 'source:assets/icons/icon-potion-box.png',
  lock: PIXI_ROOT_RUN_ASSETS.lock,
});

const ACTION_ICON_FRAMES = Object.freeze({
  autoBrew: 'potion:unknownPotion',
  brew: Object.freeze([
    'potion:unknownPotion',
    'potion:healingPotion',
    'potion:manaTonic',
  ]),
});

const CAULDRON_ACTION_LABEL_STYLE = Object.freeze({
  fontSize: 10,
  lineHeight: 12,
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
      label: 'brew batch',
      panelLabel: 'brewing-batch-detail-panel',
      shadowKind: 'dialog',
    });
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
    this.recipes = this.createButton('recipes', 'Recipes', 'brown-light', () =>
      this.actions.openRecipes?.(this.selectedIndex),
    );
    this.autoBrew = this.createButton('autobrew', 'AutoBrew', 'brown-light', () =>
      this.actions.toggleAutoBrew?.(this.selectedIndex),
    );
    this.brew = this.createButton('brew', 'Brew', 'yellow', () =>
      this.actions.performCauldronAction?.(
        this.getSelectedCauldron(),
        this.getSelectedCauldron()?.primaryAction,
      ),
    );
    this.settings = this.createButton('settings', 'Settings', 'brown-light', () =>
      this.page?.openAutomationSettings?.(),
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
    for (const button of [
      this.recipes,
      this.autoBrew,
      this.brew,
      this.settings,
    ]) {
      button.control.textLabel
        .setFontSize(CAULDRON_ACTION_LABEL_STYLE.fontSize)
        .setLineHeight(CAULDRON_ACTION_LABEL_STYLE.lineHeight);
    }
    this.actionIcons = {
      recipes: createSpriteActionIcon(
        getTexture(assetManager, ASSETS.recipes),
        'brewing-recipes-action-icon',
      ),
      autoBrew: createSpriteActionIcon(
        getAtlasTexture(assetManager, ACTION_ICON_FRAMES.autoBrew),
        'brewing-autobrew-action-icon',
      ),
      brew: createPotionClusterActionIcon(assetManager),
      settings: createSpriteActionIcon(
        getTexture(assetManager, ASSETS.settings),
        'brewing-settings-action-icon',
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
    attachActionIcon(this.recipes, this.actionIcons.recipes);
    attachActionIcon(this.autoBrew, this.actionIcons.autoBrew);
    attachActionIcon(this.brew, this.actionIcons.brew);
    attachActionIcon(this.settings, this.actionIcons.settings);
    for (const button of [
      this.previous,
      this.next,
      this.recipes,
      this.autoBrew,
      this.brew,
      this.settings,
    ]) {
      this.root.addChild(button.root);
    }
    this.root.addChild(this.unlockCostButton);

    this.potionIcon = new Sprite(Texture.EMPTY);
    this.potionIcon.anchor.set(0.5);
    this.potionName = createText('', {
      ...RETAINED_TEXT_STYLES.bold,
      wordWrap: true,
      wordWrapWidth: 106,
      align: 'center',
    });
    this.potionName.anchor.set(0.5, 0);
    this.rarity = centeredText('', RETAINED_TEXT_STYLES.tiny);
    this.rarity.anchor.set(0.5, 0);
    this.ownedLabel = centeredText('', RETAINED_TEXT_STYLES.border);
    this.ownedLabel.anchor.set(0.5, 0);
    this.batchLabel = centeredText('', RETAINED_TEXT_STYLES.bold);
    this.batchLabel.anchor.set(0.5, 0);
    this.ingredientsTitle = createText('ingredients', RETAINED_TEXT_STYLES.bold);
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

    this.phaseLabel = createText('', RETAINED_TEXT_STYLES.bold);
    this.phaseTime = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
    });
    this.phaseTime.anchor.set(1, 0);
    this.progress = new RetainedProgressBar({
      label: 'brewing-batch-progress',
      tone: 'green',
    });
    this.detailPanel.body.addChild(
      this.phaseLabel,
      this.phaseTime,
      this.progress.root,
    );
    this.fastForward = this.createButton(
      'fast-forward',
      '»',
      'yellow',
      () => this.page?.showToast?.('coming soon'),
    );
    this.cancel = this.createButton('cancel', 'cancel', 'brown-dark', () =>
      this.actions.cancelBrew?.(this.selectedIndex),
    );
    attachActionIcon(this.cancel, this.actionIcons.cancel);
    this.collect = this.createButton('collect', 'collect all', 'green', () =>
      this.actions.collectBrew?.(this.selectedIndex),
    );
    this.root.addChild(
      this.fastForward.root,
      this.cancel.root,
      this.collect.root,
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
      unlocked ? `cauldron ${number}` : 'locked cauldron',
    );
    this.cauldronStars.setLevel(unlocked ? cauldron?.level ?? 1 : 0);
    this.cauldronStars.visible = unlocked;
    this.cauldronStars.renderable = unlocked;
    this.layoutCarouselHeader();
    setText(this.counter, `${number}/${Math.max(1, model.configuredMaxCauldrons ?? 5)}`);
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
      enabled: this.selectedIndex > 0,
      action: () => this.page?.selectCauldron?.(this.selectedIndex - 1),
    });
    this.next.setModel({
      label: '',
      enabled: this.selectedIndex < cauldrons.length - 1,
      action: () => this.page?.selectCauldron?.(this.selectedIndex + 1),
    });

    const active = cauldron?.activeBrew ?? null;
    const primary = cauldron?.primaryAction ?? {};
    this.recipes.setModel({
      label: 'Recipes',
      enabled: unlocked && cauldron?.canSelectRecipe !== false && !active,
      action: () => this.actions.openRecipes?.(this.selectedIndex),
    });
    this.autoBrew.setModel({
      label: cauldron?.autoBrewEnabled ? 'AutoBrew\nOn' : 'AutoBrew\nOff',
      enabled: unlocked && cauldron?.autoBrewAvailable !== false,
      selected: cauldron?.autoBrewEnabled === true,
      action: () => this.actions.toggleAutoBrew?.(this.selectedIndex),
    });
    this.brew.setModel({
      label: !unlocked
        ? cauldron?.canBuyCauldron
          ? `Unlock ${cauldron.nextCauldronCost ?? ''}`
          : 'Locked'
        : capitalizeActionLabel(
            primary.label ?? (active?.canStartBottling ? 'bottle' : 'brew'),
          ),
      enabled:
        !unlocked
          ? cauldron?.canBuyCauldron === true
          : primary.enabled !== false && (!active || active.canStartBottling),
      action: () =>
        this.actions.performCauldronAction?.(
          cauldron,
          !unlocked ? { id: 'buy' } : primary,
        ),
    });
    this.settings.setModel({
      label: 'Settings',
      enabled: unlocked,
      action: () => this.page?.openAutomationSettings?.(),
    });
    this.setCauldronActionVisibility(unlocked);
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
    this.detailPanel.setTitle(active ? active.phase ?? 'brew batch' : 'brew batch');
    setText(this.potionName, potionLabel);
    setText(this.rarity, recipe?.rarity ?? 'common');
    const owned = Number(recipe?.ownedQuantity ?? cauldron.ownedPotionQuantity ?? 0);
    setText(this.ownedLabel, `you have  ${owned}`);
    setText(
      this.batchLabel,
      active
        ? `batch  x${active.resultQuantity ?? 1}`
        : `brewing  x${cauldron.brewQuantity ?? 1}`,
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
    const canCancel =
      active?.phase === 'brewing' || active?.phase === 'bottling';
    const canCollect = active?.canCollect === true;
    setText(
      this.phaseLabel,
      active
        ? active.phase === 'ready'
          ? 'ready to collect'
          : active.phase
        : recipe
          ? 'ready to brew'
          : 'select a recipe',
    );
    setText(
      this.phaseTime,
      active && active.remainingMs > 0
        ? formatTime(active.remainingMs)
        : canCollect
          ? 'complete'
          : '',
    );
    this.progress.setProgress(canCollect ? 1 : progress);
    this.fastForward.setModel({
      label: '»',
      enabled: true,
      action: () => this.page?.showToast?.('coming soon'),
    });
    this.cancel.setModel({
      label: 'cancel',
      enabled: canCancel,
      action: () => this.actions.cancelBrew?.(this.selectedIndex),
    });
    this.collect.setModel({
      label: `collect all${active?.resultQuantity ? `  x${active.resultQuantity}` : ''}`,
      enabled: canCollect,
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
    const gap = 17;
    const start = -(Math.max(1, cauldrons.length) - 1) * gap * 0.5;
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
    this.cauldronArt.position.set(width / 2, 88);
    this.cauldronArt.width = 132;
    this.cauldronArt.height = 112;
    this.lockArt.position.set(width / 2, 86);
    this.lockArt.width = 58;
    this.lockArt.height = 58;
    this.lockLabel.position.set(width / 2, 121);
    this.dots.position.set(width / 2, 151);
    this.previous.setBounds(edge + 12, 139, 38, 42);
    this.next.setBounds(sourceWidth - edge - 50, 139, 38, 42);
    layoutNavigationIcon(this.previous, this.navigationIcons.previous);
    layoutNavigationIcon(this.next, this.navigationIcons.next);
    this.unlockCostButton.setBounds(
      (sourceWidth - PIXI_COST_BUTTON_GEOMETRY.stackedWidth) / 2,
      258,
      PIXI_COST_BUTTON_GEOMETRY.stackedWidth,
      PIXI_COST_BUTTON_GEOMETRY.stackedHeight,
    );
    const actionWidth = (width - 18) / 4;
    [this.recipes, this.autoBrew, this.brew, this.settings].forEach(
      (button, index) =>
        button.setBounds(edge + index * (actionWidth + 6), 267, actionWidth, 39),
    );
    layoutActionIcon(this.recipes, this.actionIcons.recipes, {
      iconWidth: 25,
      iconHeight: 25,
      iconX: 17,
      labelShiftX: 10,
    });
    layoutActionIcon(this.autoBrew, this.actionIcons.autoBrew, {
      iconWidth: 25,
      iconHeight: 25,
      iconX: 17,
      labelShiftX: 10,
    });
    layoutActionIcon(this.brew, this.actionIcons.brew, {
      iconWidth: 29,
      iconHeight: 27,
      iconX: 18,
      labelShiftX: 10,
    });
    layoutActionIcon(this.settings, this.actionIcons.settings, {
      iconWidth: 23,
      iconHeight: 23,
      iconX: 17,
      labelShiftX: 10,
    });

    const detailX = edge;
    this.potionIcon.position.set(60, 83);
    this.potionIcon.width = 68;
    this.potionIcon.height = 68;
    this.potionName.position.set(60, 12);
    this.rarity.position.set(60, 38);
    this.ownedLabel.position.set(60, 121);
    this.batchLabel.position.set(60, 139);
    this.ingredientsTitle.position.set(126, 10);
    const tileWidth = 59;
    const tileHeight = 57;
    this.ingredientSlots.forEach((slot, index) => {
      slot.setBounds(
        126 + (index % 3) * (tileWidth + 5),
        31 + Math.floor(index / 3) * (tileHeight + 5),
        tileWidth,
        tileHeight,
      );
    });
    this.phaseLabel.position.set(126, 158);
    this.phaseTime.position.set(width - 10, 158);
    this.progress.setBounds(126, 178, width - 178, 10);
    this.fastForward.setBounds(sourceWidth - edge - 45, 488, 33, 32);
    this.cancel.setBounds(detailX + 10, 520, (width - 26) / 2, 37);
    layoutActionIcon(this.cancel, this.actionIcons.cancel, {
      iconWidth: 21,
      iconHeight: 21,
      iconX: 54,
      labelShiftX: 8,
    });
    this.collect.setBounds(
      detailX + 16 + (width - 26) / 2,
      520,
      (width - 26) / 2,
      37,
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.carouselPanel.applyTheme(this.theme);
    this.detailPanel.applyTheme(this.theme);
    for (const text of [
      this.counter,
      this.cauldronTitle,
      this.lockLabel,
      this.potionName,
      this.rarity,
      this.ownedLabel,
      this.batchLabel,
      this.ingredientsTitle,
      this.phaseLabel,
      this.phaseTime,
    ]) {
      applyTextTheme(text, this.theme, text.style);
    }
    for (const button of [
      this.previous,
      this.next,
      this.recipes,
      this.autoBrew,
      this.brew,
      this.settings,
      this.fastForward,
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

  setCauldronActionVisibility(visible) {
    for (const button of [
      this.recipes,
      this.autoBrew,
      this.brew,
      this.settings,
    ]) {
      button.root.visible = visible;
      button.root.renderable = visible;
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

  destroy() {
    releaseRegistration(this.swipeRegistration);
    for (const button of [
      this.previous,
      this.next,
      this.recipes,
      this.autoBrew,
      this.brew,
      this.settings,
      this.fastForward,
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
    this.frame = new Graphics();
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
          ? 'extra'
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
    this.icon.position.set(width / 2, height / 2 - 5);
    this.icon.width = 35;
    this.icon.height = 35;
    this.quantity.position.set(width / 2, height - 3);
    this.redraw();
  }

  redraw() {
    this.frame
      .clear()
      .roundRect(0, 0, this.width ?? 0, this.height ?? 0, 8)
      .fill({
        color: this.decorative ? 0x161921 : 0x242733,
        alpha: this.model ? 0.95 : 0.65,
      })
      .stroke({
        color: this.model
          ? this.sufficient
            ? 0x59634a
            : 0x864038
          : 0x11141c,
        width: 2,
      });
  }

  applyTheme(theme) {
    applyTextTheme(this.quantity, theme, {
      ...RETAINED_TEXT_STYLES.bold,
      fill: this.model
        ? this.sufficient
          ? 0x8bdc69
          : 0xfe8b83
        : theme.muted,
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

function createPotionClusterActionIcon(assetManager) {
  const root = new Container({ label: 'brewing-brew-action-icon' });
  root.iconSprites = ACTION_ICON_FRAMES.brew.map((frameName, index) => {
    const sprite = new Sprite(getAtlasTexture(assetManager, frameName));
    sprite.anchor.set(0.5);
    sprite.label = `brewing-brew-action-icon:potion-${index + 1}`;
    root.addChild(sprite);
    return sprite;
  });
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
  if (icon.label === 'brewing-brew-action-icon') {
    const sprites = icon.iconSprites;
    sprites[0].position.set(-5, 1);
    sprites[1].position.set(5, 2);
    sprites[2].position.set(0, -2);
    sprites.forEach((sprite, index) => {
      sprite.width = iconWidth * (index === 2 ? 0.72 : 0.68);
      sprite.height = iconHeight * (index === 2 ? 0.72 : 0.68);
    });
  } else {
    const [sprite] = icon.iconSprites;
    sprite.width = iconWidth;
    sprite.height = iconHeight;
  }
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
