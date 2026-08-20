import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import { getHerbIconFrameName } from '../../../../assets/items/herbs/herbIcons.js';
import { getPotionIconFrameName } from '../../../../assets/items/potions/potionIcons.js';
import { createDialogPaperSection } from '../../primitives/PixiDialogFrame.js';
import { PixiTextButton } from '../../primitives/PixiTextButton.js';
import { PixiOwnedDialogSurface } from '../../primitives/PixiOwnedDialogSurface.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  RETAINED_PAGE_GEOMETRY,
  RETAINED_TEXT_STYLES,
  applyTextTheme,
  createText,
  normalizeRows,
  setText,
} from '../workshop/RetainedPageKit.js';

const DIALOG_PADDING = 20;
const RECIPE_DIALOG_OUTER_WIDTH = 304;
const RECIPE_DIALOG_OUTER_HEIGHT = 404;
const RECIPE_BOOK_SIDE_OVERFLOW = 4;
const RECIPE_BOOK_WIDTH =
  RECIPE_DIALOG_OUTER_WIDTH + RECIPE_BOOK_SIDE_OVERFLOW * 2;
const RECIPE_BOOK_TOP = DIALOG_PADDING + 2;
const RECIPE_PAGE_GAP = 2;
const RECIPE_CARD_WIDTH =
  (RECIPE_BOOK_WIDTH - RECIPE_PAGE_GAP) / 2;
const RECIPE_CARD_CONTENT_INSET = 7;
const RECIPE_CARD_HEIGHT = 341;
const RECIPE_ICON_SIZE = 46;
const RECIPE_ICON_LEFT_NUDGE = -4;
const UNKNOWN_POTION_ICON_FRAME = 'status:lockDefault';
const UNKNOWN_POTION_ICON_ASPECT_RATIO = 53 / 60;
const RECIPE_HEADER_GAP = 5;
const RECIPE_INGREDIENT_ROW_HEIGHT = 20;
const RECIPE_INGREDIENT_SLOT_COUNT = 6;
const RECIPE_PAGER_BUTTON_WIDTH = 72;
const RECIPE_PAGER_BUTTON_HEIGHT = 28;
const RECIPE_PAGER_GAP = 4;
const RECIPE_INGREDIENT_ICON_SIZE = 14;
const RECIPE_INGREDIENT_ICON_GAP = 2;
const RECIPE_MANA_ICON_SIZE = 13;
const RECIPE_MANA_ICON_GAP = 2;
const RECIPE_MANA_ICON_FRAME = 'resource:mana';
const RECIPE_CHOICE_CONTENT_WIDTH = 210;
const RECIPE_CHOICE_OUTER_WIDTH = RECIPE_CHOICE_CONTENT_WIDTH + 44;

function capitalizeFirstLetter(value) {
  const text = String(value ?? '');
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : text;
}

export class BrewingRecipeChoiceDialogPixi {
  constructor({
    parent,
    inputRouter = null,
    assetManager = null,
    onClose = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    this.onClose = onClose;
    this.modal = new PixiOwnedDialogSurface({
      id: 'brewing.recipe-choice',
      parent,
      inputRouter,
      assetManager,
      title: 'selected recipe',
      onClose,
      theme,
    });
    this.root = this.modal.root;
    this.clear = new BrewingDialogButton({
      id: 'brewing.recipe-choice.clear',
      modalId: this.modal.id,
      inputRouter,
      label: 'clear recipe',
      action: () => this.runAction('clearRecipe'),
    });
    this.choose = new BrewingDialogButton({
      id: 'brewing.recipe-choice.choose',
      modalId: this.modal.id,
      inputRouter,
      label: 'choose another recipe',
      action: () => this.runAction('chooseAnother'),
    });
    this.modal.panel.content.addChild(this.clear.root, this.choose.root);
    this.model = {};
    this.actions = {};
    this.applyTheme(theme);
    this.layout({
      sourceWidth: RETAINED_PAGE_GEOMETRY.width,
      sourceHeight: RETAINED_PAGE_GEOMETRY.height,
    });
  }

  bind(viewModel) {
    this.model = viewModel ?? {};
    this.actions = this.model.actions ?? {};
    this.modal.setTitle(this.model.title ?? 'selected recipe');
  }

  runAction(name) {
    const cauldronIndex = this.model.cauldronIndex ?? 0;
    const direct =
      name === 'clearRecipe'
        ? this.model.onClearRecipe
        : this.model.onChooseAnother;
    const result = direct?.(cauldronIndex) ?? this.actions[name]?.(cauldronIndex);
    if (result !== false) {
      this.onClose?.();
    }
    return result ?? true;
  }

  applyTheme(themeSnapshot) {
    this.theme = themeSnapshot ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.modal.applyTheme(this.theme);
    const contentTheme = this.modal.getContentTheme();
    this.clear.applyTheme(contentTheme);
    this.choose.applyTheme(contentTheme);
  }

  layout(viewportProjection) {
    this.sourceWidth =
      Number(viewportProjection?.sourceWidth) || PIXI_UI_GEOMETRY.sourceWidth;
    this.sourceHeight =
      Number(viewportProjection?.sourceHeight) || RETAINED_PAGE_GEOMETRY.height;
    const contentHeight = 30 * 2 + 8;
    const outerHeight = contentHeight + 44;
    this.modal.setBounds(
      (this.sourceWidth - RECIPE_CHOICE_OUTER_WIDTH) / 2,
      (this.sourceHeight - outerHeight) / 2,
      RECIPE_CHOICE_OUTER_WIDTH,
      outerHeight,
    );
    this.clear.setBounds(
      DIALOG_PADDING + 2,
      DIALOG_PADDING + 2,
      RECIPE_CHOICE_CONTENT_WIDTH,
      30,
    );
    this.choose.setBounds(
      DIALOG_PADDING + 2,
      DIALOG_PADDING + 40,
      RECIPE_CHOICE_CONTENT_WIDTH,
      30,
    );
    this.modal.layout(viewportProjection);
  }

  activate() {
    this.modal.activate();
  }

  deactivate() {
    this.modal.deactivate();
  }

  destroy() {
    this.clear.destroy();
    this.choose.destroy();
    this.modal.destroy();
  }

  getDisplayObject() {
    return this.root;
  }
}

/**
 * Two-page retained recipe book. Only the two visible recipe cards are leased;
 * changing spreads reuses their display trees.
 */
export class BrewingRecipeBookDialogPixi {
  constructor({
    parent,
    inputRouter = null,
    semanticTargets = null,
    assetManager = null,
    counters = null,
    onClose = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    this.inputRouter = inputRouter;
    this.semanticTargets = semanticTargets;
    this.assetManager = assetManager;
    this.onClose = onClose;
    this.modal = new PixiOwnedDialogSurface({
      id: 'brewing.recipes',
      parent,
      inputRouter,
      semanticRegistry: semanticTargets,
      assetManager,
      title: 'Recipes',
      onClose,
      theme,
    });
    this.root = this.modal.root;
    this.modal.panel.setPaperVisible(false);
    this.book = new Container({ label: 'brewing-recipe-book' });
    this.book.eventMode = 'static';
    this.previous = new PixiTextButton({
      assetManager,
      inputRouter,
      semanticRegistry: semanticTargets,
      semanticId: 'brewing.recipes.previous',
      text: 'Prev',
      width: RECIPE_PAGER_BUTTON_WIDTH,
      height: RECIPE_PAGER_BUTTON_HEIGHT,
      sizeTier: 30,
      variant: 'yellow',
      action: () => this.showPreviousSpread(),
      label: 'brewing.recipes.previous',
    });
    this.next = new PixiTextButton({
      assetManager,
      inputRouter,
      semanticRegistry: semanticTargets,
      semanticId: 'brewing.recipes.next',
      text: 'Next',
      width: RECIPE_PAGER_BUTTON_WIDTH,
      height: RECIPE_PAGER_BUTTON_HEIGHT,
      sizeTier: 30,
      variant: 'yellow',
      action: () => this.showNextSpread(),
      label: 'brewing.recipes.next',
    });
    this.pageLabel = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      align: 'center',
    });
    this.pageLabel.anchor.set(0.5, 0);
    this.modal.panel.content.addChild(
      this.book,
      this.previous,
      this.next,
      this.pageLabel,
    );
    this.model = {};
    this.actions = {};
    this.recipes = [];
    this.currentSpreadIndex = 0;
    this.cardSequence = 0;
    this.cardPool = new WidgetPool({
      name: 'brewing visible recipe card pool',
      counters,
      create: () =>
        new BrewingRecipeCard({
          instanceId: ++this.cardSequence,
          assetManager: this.assetManager,
          inputRouter: this.inputRouter,
          semanticTargets: this.semanticTargets,
          counters,
        }),
      reset: (card) => card.reset(),
      dispose: (card) => card.destroy(),
      maxSize: 2,
    });
    this.cards = new PooledCollection({
      name: 'brewing visible recipe cards',
      pool: this.cardPool,
      counters,
      keyOf: (recipe, index) =>
        recipe.id ?? recipe.key ?? `recipe-${index}`,
      bind: (card, recipe) => card.bind(recipe, this.actions),
      afterReconcile: (cards) => this.orderCards(cards),
    });
    this.swipeRegistration = this.inputRouter?.registerPageSwipe?.({
      id: 'brewing.recipes.book-swipe',
      displayObject: this.book,
      modalId: this.modal.id,
      threshold: 30,
      onSwipe: ({ direction }) =>
        direction === 'next'
          ? this.showNextSpread()
          : this.showPreviousSpread(),
    }) ?? null;
    this.applyTheme(theme);
    this.layout({
      sourceWidth: RETAINED_PAGE_GEOMETRY.width,
      sourceHeight: RETAINED_PAGE_GEOMETRY.height,
    });
  }

  bind(viewModel) {
    this.model = viewModel ?? {};
    this.actions = this.model.actions ?? {};
    this.recipes = normalizeRows(this.model.recipes ?? this.model.rows);
    if (Number.isInteger(this.model.spreadIndex)) {
      this.currentSpreadIndex = this.model.spreadIndex;
    }
    this.clampSpread();
    this.renderSpread();
  }

  renderSpread() {
    const learned = this.recipes.filter((recipe) => recipe.unlocked === true).length;
    this.modal.setTitle(
      capitalizeFirstLetter(
        this.model.title ?? `Recipes: Learned ${learned}/${this.recipes.length}`,
      ),
    );
    const start = this.currentSpreadIndex * 2;
    this.cards.reconcile(this.recipes.slice(start, start + 2));
    const contentTheme = this.modal.getContentTheme();
    for (const card of this.cards.getWidgets()) {
      card.applyTheme(contentTheme);
    }
    const pageCount = Math.max(1, this.recipes.length);
    const leftPage = Math.min(pageCount, start + 1);
    const rightPage = Math.min(pageCount, start + 2);
    setText(
      this.pageLabel,
      this.recipes.length > 1
        ? `${leftPage}-${rightPage} / ${pageCount}`
        : `${leftPage} / ${pageCount}`,
    );
    this.previous.setEnabled(this.currentSpreadIndex > 0);
    this.next.setEnabled(this.currentSpreadIndex < this.spreadCount - 1);
    this.layoutCards();
  }

  showPreviousSpread() {
    if (this.currentSpreadIndex <= 0) {
      return false;
    }
    this.currentSpreadIndex -= 1;
    this.actions.turnSpread?.(this.currentSpreadIndex);
    this.renderSpread();
    return true;
  }

  showNextSpread() {
    if (this.currentSpreadIndex >= this.spreadCount - 1) {
      return false;
    }
    this.currentSpreadIndex += 1;
    this.actions.turnSpread?.(this.currentSpreadIndex);
    this.renderSpread();
    return true;
  }

  clampSpread() {
    this.currentSpreadIndex = Math.min(
      Math.max(0, Math.floor(Number(this.currentSpreadIndex)) || 0),
      this.spreadCount - 1,
    );
  }

  get spreadCount() {
    return Math.max(1, Math.ceil(this.recipes.length / 2));
  }

  orderCards(cards) {
    this.book.removeChildren();
    for (const card of cards) {
      this.book.addChild(card.root);
    }
  }

  layoutCards() {
    const cards = this.cards?.getWidgets?.() ?? [];
    cards.forEach((card, index) =>
      card.setBounds(
        index === 0 ? 0 : RECIPE_CARD_WIDTH + RECIPE_PAGE_GAP,
        0,
        RECIPE_CARD_WIDTH,
        RECIPE_CARD_HEIGHT,
      ),
    );
  }

  applyTheme(themeSnapshot) {
    this.theme = themeSnapshot ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.modal.applyTheme(this.theme);
    const contentTheme = this.modal.getContentTheme();
    this.previous.applyTheme(contentTheme);
    this.next.applyTheme(contentTheme);
    applyTextTheme(this.pageLabel, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: this.theme.text,
      align: 'center',
    });
    for (const card of this.cards?.getWidgets?.() ?? []) {
      card.applyTheme(contentTheme);
    }
  }

  layout(viewportProjection) {
    this.sourceWidth =
      Number(viewportProjection?.sourceWidth) || PIXI_UI_GEOMETRY.sourceWidth;
    this.sourceHeight =
      Number(viewportProjection?.sourceHeight) || RETAINED_PAGE_GEOMETRY.height;
    this.modal.setBounds(
      (this.sourceWidth - RECIPE_DIALOG_OUTER_WIDTH) / 2,
      (this.sourceHeight - RECIPE_DIALOG_OUTER_HEIGHT) / 2,
      RECIPE_DIALOG_OUTER_WIDTH,
      RECIPE_DIALOG_OUTER_HEIGHT,
    );
    const bodyX = -RECIPE_BOOK_SIDE_OVERFLOW;
    const bodyY = RECIPE_BOOK_TOP;
    this.book.position.set(bodyX, bodyY);
    this.book.hitArea = new Rectangle(
      0,
      0,
      RECIPE_BOOK_WIDTH,
      RECIPE_CARD_HEIGHT,
    );
    const controlsY = bodyY + RECIPE_CARD_HEIGHT + RECIPE_PAGER_GAP;
    this.previous.position.set(bodyX, controlsY);
    this.previous.setSize(
      RECIPE_PAGER_BUTTON_WIDTH,
      RECIPE_PAGER_BUTTON_HEIGHT,
    );
    this.next.position.set(
      bodyX + RECIPE_BOOK_WIDTH - RECIPE_PAGER_BUTTON_WIDTH,
      controlsY,
    );
    this.next.setSize(RECIPE_PAGER_BUTTON_WIDTH, RECIPE_PAGER_BUTTON_HEIGHT);
    this.pageLabel.position.set(
      bodyX + RECIPE_BOOK_WIDTH / 2,
      controlsY + 8,
    );
    this.layoutCards();
    this.modal.layout(viewportProjection);
  }

  activate() {
    this.modal.activate();
  }

  deactivate() {
    this.modal.deactivate();
  }

  destroy() {
    releaseRegistration(this.swipeRegistration);
    this.cards.destroy();
    this.cardPool.destroy();
    this.previous.destroy();
    this.next.destroy();
    this.modal.destroy();
  }

  getDisplayObject() {
    return this.root;
  }
}

export class BrewingRecipeCard {
  constructor({
    instanceId,
    assetManager,
    inputRouter,
    semanticTargets,
    counters,
  }) {
    this.instanceId = instanceId;
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.semanticTargets = semanticTargets;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.model = {};
    this.actions = {};
    this.unknown = false;
    this.semanticId = null;
    this.root = new Container({ label: `brewing-recipe-card-${instanceId}` });
    this.pageFrame = createDialogPaperSection(
      this.assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.dialogPaper) ??
        Texture.EMPTY,
      `brewing-recipe-card-${instanceId}-paper`,
    );
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.label = `brewing-recipe-card-${instanceId}-icon`;
    this.name = createText('', {
      ...RETAINED_TEXT_STYLES.bold,
      wordWrapWidth:
        RECIPE_CARD_WIDTH - RECIPE_ICON_SIZE - RECIPE_HEADER_GAP,
    });
    this.info = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      wordWrapWidth: RECIPE_CARD_WIDTH,
    });
    this.ingredientsLayer = new Container({
      label: `brewing-recipe-card-${instanceId}-ingredients`,
    });
    this.cost = createText('', RETAINED_TEXT_STYLES.border);
    this.costValue = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
    });
    this.costValue.anchor.set(1, 0);
    this.costIcon = new Sprite(Texture.EMPTY);
    this.costIcon.label = `brewing-recipe-card-${instanceId}-mana-icon`;
    this.duration = createText('', RETAINED_TEXT_STYLES.border);
    this.durationValue = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
    });
    this.durationValue.anchor.set(1, 0);
    this.select = new PixiTextButton({
      assetManager,
      inputRouter,
      text: 'Select',
      width: 112,
      height: 30,
      variant: 'yellow',
      action: () => this.activateRecipeAction(),
      label: `brewing.recipe.card.instance.${instanceId}.select`,
    });
    this.separator = new Graphics({
      label: `brewing-recipe-card-${instanceId}-separator`,
    });
    this.root.addChild(
      this.pageFrame,
      this.icon,
      this.name,
      this.info,
      this.ingredientsLayer,
      this.cost,
      this.costValue,
      this.costIcon,
      this.duration,
      this.durationValue,
      this.select,
      this.separator,
    );
    this.ingredientSequence = 0;
    this.ingredientPool = new WidgetPool({
      name: `brewing recipe ${instanceId} ingredient pool`,
      counters,
      create: () =>
        new BrewingRecipeIngredientRow({
          instanceId: `${instanceId}-${++this.ingredientSequence}`,
          assetManager: this.assetManager,
        }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 8,
    });
    this.ingredients = new PooledCollection({
      name: `brewing recipe ${instanceId} ingredients`,
      pool: this.ingredientPool,
      counters,
      keyOf: (ingredient, index) =>
        ingredient.id ??
        `${ingredient.slotIndex ?? index}:${ingredient.itemTypeId ?? ingredient.key ?? 'ingredient'}`,
      bind: (row, ingredient) => row.bind(ingredient, this.model),
      afterReconcile: (rows) => this.orderIngredients(rows),
    });
  }

  bind(model, actions) {
    this.unregisterSemantic();
    this.model = model ?? {};
    this.actions = actions ?? {};
    const unknown =
      this.model.discovered !== true &&
      (this.model.unknown === true ||
        this.model.known === false ||
        this.model.discoveryType === 'unknown');
    this.unknown = unknown;
    const locked = this.model.unlocked !== true;
    setText(
      this.name,
      unknown ? 'Unknown potion' : capitalizeFirstLetter(this.model.label),
    );
    setText(
      this.info,
      capitalizeFirstLetter(
        this.model.infoText ??
          this.model.description ??
          (unknown ? 'A recipe not yet named in the workshop book.' : ''),
      ),
    );
    setText(this.cost, 'Required mana:');
    setText(
      this.costValue,
      unknown
        ? '?'
        : Number.isFinite(this.model.manaCost)
          ? String(this.model.manaCost)
          : '?',
    );
    this.costIcon.texture =
      this.assetManager?.getAtlasTexture?.(RECIPE_MANA_ICON_FRAME) ??
      Texture.EMPTY;
    this.costIcon.visible = this.costIcon.texture !== Texture.EMPTY;
    this.costIcon.renderable = this.costIcon.visible;
    setText(this.duration, 'Required Time:');
    setText(
      this.durationValue,
      unknown
        ? '?s'
        : Number.isFinite(this.model.brewDurationMs)
          ? `${Math.ceil(this.model.brewDurationMs / 1000)}s`
          : '?s',
    );
    const frameName = unknown
      ? UNKNOWN_POTION_ICON_FRAME
      : this.model.iconFrame ??
        getPotionIconFrameName(this.model.iconKey ?? this.model.key);
    this.icon.texture = frameName
      ? this.assetManager?.getAtlasTexture?.(frameName) ?? Texture.EMPTY
      : Texture.EMPTY;
    this.icon.visible = Boolean(frameName);
    this.icon.alpha = 1;
    this.syncIconBounds();
    this.ingredients.reconcile(normalizeRows(this.model.ingredients));
    const selected = this.model.selected === true;
    this.select.setText(
      unknown ? 'Unknown' : locked ? 'Research' : 'Select',
    );
    this.select.setVariant(unknown || locked ? 'yellow' : 'green');
    const actionEnabled =
      !unknown &&
      (locked
        ? this.model.canResearch === true
        : selected || this.model.canSelect !== false);
    this.select.setEnabled(actionEnabled);
    this.select.setSelected(selected);
    this.root.visible = true;
    this.root.renderable = true;
    this.root.eventMode = 'passive';
    if (!unknown) {
      this.semanticId =
        this.model.semanticId ?? `brewing.recipe.${this.model.key ?? this.model.id}`;
      this.semanticTargets?.register?.({
        semanticId: this.semanticId,
        tutorialId:
          this.model.tutorialId ??
          (this.model.key ? `brewing:recipe:${this.model.key}` : null),
        displayObject: this.root,
        state: () => ({
          visible: this.root.visible && this.root.renderable,
          interactive: actionEnabled,
          enabled: actionEnabled,
          selected,
          active: !this.root.destroyed,
        }),
        activate: () => this.activateRecipeAction(),
      });
    }
    this.applyTheme(this.theme);
  }

  activateRecipeAction() {
    if (this.model.unlocked !== true) {
      return this.researchRecipe();
    }
    return this.selectRecipe();
  }

  researchRecipe() {
    if (this.model.canResearch !== true) {
      return false;
    }
    const result =
      this.model.onResearch?.(this.model) ??
      this.actions.researchRecipe?.(this.model) ??
      false;
    const accepted = result === true || result?.ok === true;
    if (accepted && this.model.unlocked !== true) {
      this.model.canResearch = false;
      this.select.setEnabled(false);
    }
    return result;
  }

  selectRecipe() {
    if (
      this.model.unlocked !== true ||
      (this.model.selected !== true && this.model.canSelect === false)
    ) {
      return false;
    }
    return this.model.onSelect?.(this.model) ??
      this.actions.selectRecipe?.(this.model) ??
      true;
  }

  orderIngredients(rows) {
    this.ingredientsLayer.removeChildren();
    for (const row of rows) {
      this.ingredientsLayer.addChild(row.root);
    }
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    this.height = height;
    this.pageFrame.position.set(0, 0);
    this.pageFrame.setSize(width, height);
    const contentWidth = Math.max(0, width - RECIPE_CARD_CONTENT_INSET * 2);
    this.syncIconBounds();
    this.name.position.set(
      RECIPE_CARD_CONTENT_INSET + RECIPE_ICON_SIZE + RECIPE_HEADER_GAP,
      RECIPE_CARD_CONTENT_INSET + 5,
    );
    this.info.position.set(
      RECIPE_CARD_CONTENT_INSET,
      RECIPE_CARD_CONTENT_INSET + RECIPE_ICON_SIZE + 8,
    );
    this.info.style.wordWrapWidth = contentWidth;
    const ingredientsY = Math.max(
      82,
      RECIPE_CARD_CONTENT_INSET +
        RECIPE_ICON_SIZE +
        8 +
        Math.ceil(this.info.height) +
        7,
    );
    this.ingredientsLayer.position.set(RECIPE_CARD_CONTENT_INSET, ingredientsY);
    this.ingredients.getWidgets().forEach((row, index) =>
      row.setBounds(0, index * RECIPE_INGREDIENT_ROW_HEIGHT, contentWidth),
    );
    const metaY = Math.min(
      height - 86,
      ingredientsY +
        RECIPE_INGREDIENT_SLOT_COUNT * RECIPE_INGREDIENT_ROW_HEIGHT +
        6,
    );
    this.cost.position.set(RECIPE_CARD_CONTENT_INSET, metaY);
    this.costIcon.position.set(
      width - RECIPE_CARD_CONTENT_INSET - RECIPE_MANA_ICON_SIZE,
      metaY,
    );
    this.costIcon.width = RECIPE_MANA_ICON_SIZE;
    this.costIcon.height = RECIPE_MANA_ICON_SIZE;
    this.costValue.position.set(
      this.costIcon.x - RECIPE_MANA_ICON_GAP,
      metaY,
    );
    this.duration.position.set(RECIPE_CARD_CONTENT_INSET, metaY + 15);
    this.durationValue.position.set(
      width - RECIPE_CARD_CONTENT_INSET,
      metaY + 15,
    );
    this.select.position.set(RECIPE_CARD_CONTENT_INSET, height - 38);
    this.select.setSize(contentWidth, 30);
    this.separator.visible = false;
    this.separator.renderable = false;
    this.applyTheme(this.theme);
  }

  syncIconBounds() {
    const width = this.unknown
      ? RECIPE_ICON_SIZE * UNKNOWN_POTION_ICON_ASPECT_RATIO
      : RECIPE_ICON_SIZE;
    this.icon.position.set(
      RECIPE_CARD_CONTENT_INSET +
        RECIPE_ICON_LEFT_NUDGE +
        (RECIPE_ICON_SIZE - width) / 2,
      RECIPE_CARD_CONTENT_INSET + 3,
    );
    this.icon.width = width;
    this.icon.height = RECIPE_ICON_SIZE;
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    const masked =
      this.model.discovered !== true &&
      (this.model.unknown === true || this.model.known === false);
    applyTextTheme(this.name, this.theme, {
      ...RETAINED_TEXT_STYLES.bold,
      fill: masked ? this.theme.disabled : this.theme.text,
      wordWrapWidth:
        (this.width ?? RECIPE_CARD_WIDTH) -
        RECIPE_CARD_CONTENT_INSET * 2 -
        RECIPE_ICON_SIZE -
        RECIPE_HEADER_GAP,
    });
    applyTextTheme(this.info, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: masked ? this.theme.disabled : this.theme.muted,
      wordWrapWidth: this.width ?? RECIPE_CARD_WIDTH,
    });
    applyTextTheme(this.cost, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: masked ? this.theme.disabled : this.theme.text,
    });
    applyTextTheme(this.costValue, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: masked ? this.theme.disabled : this.theme.resourceColors.mana,
      align: 'right',
    });
    applyTextTheme(this.duration, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: masked ? this.theme.disabled : this.theme.text,
    });
    applyTextTheme(this.durationValue, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: masked ? this.theme.disabled : this.theme.muted,
      align: 'right',
    });
    this.costIcon.alpha = masked ? 0.45 : 1;
    this.select.applyTheme(this.theme);
    for (const row of this.ingredients.getWidgets()) {
      row.applyTheme(this.theme);
    }
  }

  reset() {
    this.unregisterSemantic();
    this.ingredients.clear();
    this.model = {};
    this.actions = {};
    this.unknown = false;
    this.root.visible = false;
    this.root.renderable = false;
    this.root.eventMode = 'none';
    this.select.setEnabled(false);
  }

  unregisterSemantic() {
    if (this.semanticId) {
      this.semanticTargets?.unregister?.(this.semanticId);
      this.semanticId = null;
    }
  }

  destroy() {
    this.unregisterSemantic();
    this.ingredients.destroy();
    this.ingredientPool.destroy();
    this.select.destroy({ children: true });
    this.root.destroy({ children: true });
  }
}

export class BrewingRecipeIngredientRow {
  constructor({ instanceId, assetManager = null }) {
    this.assetManager = assetManager;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.model = {};
    this.recipe = {};
    this.root = new Container({
      label: `brewing-recipe-ingredient-${instanceId}`,
    });
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.label = `brewing-recipe-ingredient-${instanceId}-icon`;
    this.required = createText('', RETAINED_TEXT_STYLES.border);
    this.owned = createText('', RETAINED_TEXT_STYLES.border);
    this.owned.anchor.set(1, 0);
    this.root.addChild(this.icon, this.required, this.owned);
  }

  bind(model, recipe) {
    this.model = model ?? {};
    this.recipe = recipe ?? {};
    const masked =
      this.recipe.discovered !== true &&
      (this.recipe.unknown === true || this.recipe.known === false);
    const frameName = getHerbIconFrameName(
      this.model.itemKey ?? this.model.key,
    );
    this.icon.texture = frameName
      ? this.assetManager?.getAtlasTexture?.(frameName) ?? Texture.EMPTY
      : Texture.EMPTY;
    this.icon.visible = !masked && Boolean(frameName);
    this.icon.renderable = this.icon.visible;
    setText(
      this.required,
      masked ? '??????' : capitalizeFirstLetter(this.model.label),
    );
    const owned = Number.isFinite(this.model.owned) ? this.model.owned : 0;
    const required = Number.isFinite(this.model.quantity)
      ? this.model.quantity
      : 0;
    setText(
      this.owned,
      masked ? '?/?' : `${owned}/${required}`,
    );
    this.root.visible = true;
    this.root.renderable = true;
    this.applyTheme(this.theme);
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    this.required.position.set(0, 0);
    this.icon.position.set(
      this.icon.visible
        ? this.required.width + RECIPE_INGREDIENT_ICON_GAP
        : 0,
      1,
    );
    this.icon.width = RECIPE_INGREDIENT_ICON_SIZE;
    this.icon.height = RECIPE_INGREDIENT_ICON_SIZE;
    this.owned.position.set(width, 0);
    this.root.hitArea = new Rectangle(
      0,
      0,
      width,
      RECIPE_INGREDIENT_ROW_HEIGHT,
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    const unavailable =
      this.model.available === false ||
      (Number.isFinite(this.model.owned) &&
        Number.isFinite(this.model.quantity) &&
        this.model.owned < this.model.quantity);
    const masked =
      this.recipe.discovered !== true &&
      (this.recipe.unknown === true || this.recipe.known === false);
    applyTextTheme(this.required, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: masked
        ? this.theme.disabled
        : this.theme.resourceColors.herb,
    });
    applyTextTheme(this.owned, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: unavailable || masked ? this.theme.disabled : this.theme.muted,
    });
  }

  reset() {
    this.model = {};
    this.recipe = {};
    this.root.visible = false;
    this.root.renderable = false;
    this.icon.texture = Texture.EMPTY;
    this.icon.visible = false;
    this.icon.renderable = false;
    setText(this.required, '');
    setText(this.owned, '');
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

class BrewingDialogButton {
  constructor({
    id,
    modalId,
    inputRouter,
    label,
    action,
  }) {
    this.id = id;
    this.action = action;
    this.enabled = true;
    this.selected = false;
    this.pressed = false;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.root = new Container({ label: id });
    this.frame = new Graphics({ label: `${id}-frame` });
    this.label = createText(label, {
      ...RETAINED_TEXT_STYLES.body,
      align: 'center',
    });
    this.label.anchor.set(0.5);
    this.root.addChild(this.frame, this.label);
    this.registration = inputRouter?.registerPressTarget?.({
      id,
      displayObject: this.root,
      modalId,
      focusable: true,
      enabled: () => this.enabled,
      selected: () => false,
      onPressChange: (pressed) => {
        this.pressed = pressed;
        this.root.scale.set(pressed ? 0.97 : 1);
      },
      onActivate: () => this.action?.() ?? true,
    }) ?? null;
  }

  setLabel(label) {
    setText(this.label, label);
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.root.eventMode = this.enabled ? 'static' : 'none';
    this.applyTheme(this.theme);
  }

  setSelected(selected) {
    this.selected = Boolean(selected);
    this.applyTheme(this.theme);
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    this.height = height;
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.label.position.set(width / 2, height / 2);
    this.redraw();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    applyTextTheme(this.label, this.theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: this.enabled ? this.theme.text : this.theme.disabled,
      align: 'center',
      fontWeight: this.selected ? '700' : '400',
    });
    this.redraw();
  }

  redraw() {
    const fill = this.selected ? this.theme.text : this.theme.surface;
    this.frame
      .clear()
      .rect(0, 0, this.width ?? 0, this.height ?? 0)
      .fill({ color: fill })
      .stroke({
        color: this.enabled ? this.theme.stroke : this.theme.disabled,
        width: 2,
      });
    if (this.selected) {
      applyTextTheme(this.label, this.theme, {
        ...RETAINED_TEXT_STYLES.body,
        fill: this.theme.surface,
        align: 'center',
        fontWeight: '700',
      });
    }
  }

  destroy() {
    releaseRegistration(this.registration);
    this.root.destroy({ children: true });
  }
}

function releaseRegistration(registration) {
  if (typeof registration === 'function') {
    registration();
    return;
  }
  registration?.unregister?.();
}
