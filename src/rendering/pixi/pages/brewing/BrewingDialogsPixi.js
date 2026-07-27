import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import { getPotionIconFrameName } from '../../../../assets/items/potions/potionIcons.js';
import { PixiButton } from '../../primitives/PixiButton.js';
import { PixiOwnedDialogSurface } from '../../primitives/PixiOwnedDialogSurface.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
import {
  RETAINED_PAGE_GEOMETRY,
  RETAINED_TEXT_STYLES,
  applyTextTheme,
  createText,
  normalizeRows,
  setText,
} from '../workshop/RetainedPageKit.js';

const DIALOG_PADDING = 20;
const RECIPE_DIALOG_CONTENT_WIDTH = 260;
const RECIPE_DIALOG_CONTENT_HEIGHT = 360;
const RECIPE_DIALOG_OUTER_WIDTH = RECIPE_DIALOG_CONTENT_WIDTH + 44;
const RECIPE_DIALOG_OUTER_HEIGHT = RECIPE_DIALOG_CONTENT_HEIGHT + 44;
const RECIPE_BOOK_CONTROL_HEIGHT = 25;
const RECIPE_PAGE_GAP = 12;
const RECIPE_CARD_WIDTH =
  (RECIPE_DIALOG_CONTENT_WIDTH - RECIPE_PAGE_GAP) / 2;
const RECIPE_ICON_SIZE = 56;
const RECIPE_HEADER_GAP = 5;
const RECIPE_RULE_WIDTH = 2;
const RECIPE_CHOICE_CONTENT_WIDTH = 210;
const RECIPE_CHOICE_OUTER_WIDTH = RECIPE_CHOICE_CONTENT_WIDTH + 44;

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
    this.sourceWidth = Number(viewportProjection?.sourceWidth) || 360;
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
      title: 'recipes',
      onClose,
      theme,
    });
    this.root = this.modal.root;
    this.book = new Container({ label: 'brewing-recipe-book' });
    this.book.eventMode = 'static';
    this.divider = new Graphics({ label: 'brewing-recipe-book-divider' });
    this.previous = new BrewingTextButton({
      id: 'brewing.recipes.previous',
      modalId: this.modal.id,
      inputRouter,
      label: 'prev',
      action: () => this.showPreviousSpread(),
    });
    this.next = new BrewingTextButton({
      id: 'brewing.recipes.next',
      modalId: this.modal.id,
      inputRouter,
      label: 'next',
      action: () => this.showNextSpread(),
    });
    this.pageLabel = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      align: 'center',
    });
    this.pageLabel.anchor.set(0.5, 0);
    this.modal.panel.content.addChild(
      this.book,
      this.previous.root,
      this.next.root,
      this.pageLabel,
    );
    this.book.addChild(this.divider);
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
      this.model.title ?? `recipes: learned ${learned}/${this.recipes.length}`,
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
    const divider = this.divider;
    this.book.removeChildren();
    this.book.addChild(divider);
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
        RECIPE_DIALOG_CONTENT_HEIGHT - RECIPE_BOOK_CONTROL_HEIGHT,
      ),
    );
  }

  applyTheme(themeSnapshot) {
    this.theme = themeSnapshot ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.modal.applyTheme(this.theme);
    const contentTheme = this.modal.getContentTheme();
    this.previous.applyTheme(contentTheme);
    this.next.applyTheme(contentTheme);
    applyTextTheme(this.pageLabel, contentTheme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: contentTheme.muted,
      align: 'center',
    });
    this.divider
      .clear()
      .moveTo(RECIPE_DIALOG_CONTENT_WIDTH / 2, 0)
      .lineTo(
        RECIPE_DIALOG_CONTENT_WIDTH / 2,
        RECIPE_DIALOG_CONTENT_HEIGHT - RECIPE_BOOK_CONTROL_HEIGHT,
      )
      .stroke({
        color: contentTheme.stroke,
        width: RECIPE_RULE_WIDTH,
      });
    for (const card of this.cards?.getWidgets?.() ?? []) {
      card.applyTheme(contentTheme);
    }
  }

  layout(viewportProjection) {
    this.sourceWidth = Number(viewportProjection?.sourceWidth) || 360;
    this.sourceHeight =
      Number(viewportProjection?.sourceHeight) || RETAINED_PAGE_GEOMETRY.height;
    this.modal.setBounds(
      (this.sourceWidth - RECIPE_DIALOG_OUTER_WIDTH) / 2,
      (this.sourceHeight - RECIPE_DIALOG_OUTER_HEIGHT) / 2,
      RECIPE_DIALOG_OUTER_WIDTH,
      RECIPE_DIALOG_OUTER_HEIGHT,
    );
    const bodyX = DIALOG_PADDING + 2;
    const bodyY = DIALOG_PADDING + 2;
    this.book.position.set(bodyX, bodyY);
    this.book.hitArea = new Rectangle(
      0,
      0,
      RECIPE_DIALOG_CONTENT_WIDTH,
      RECIPE_DIALOG_CONTENT_HEIGHT - RECIPE_BOOK_CONTROL_HEIGHT,
    );
    const controlsY =
      bodyY + RECIPE_DIALOG_CONTENT_HEIGHT - RECIPE_BOOK_CONTROL_HEIGHT;
    this.previous.setBounds(bodyX, controlsY + 5, 40, 20);
    this.next.setBounds(
      bodyX + RECIPE_DIALOG_CONTENT_WIDTH - 40,
      controlsY + 5,
      40,
      20,
    );
    this.pageLabel.position.set(
      bodyX + RECIPE_DIALOG_CONTENT_WIDTH / 2,
      controlsY + 7,
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

class BrewingRecipeCard {
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
    this.semanticId = null;
    this.root = new Container({ label: `brewing-recipe-card-${instanceId}` });
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
    this.duration = createText('', RETAINED_TEXT_STYLES.border);
    this.select = new PixiButton({
      assetManager,
      inputRouter,
      text: 'select',
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
      this.icon,
      this.name,
      this.info,
      this.ingredientsLayer,
      this.cost,
      this.duration,
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
        ingredient.id ?? ingredient.itemTypeId ?? ingredient.key ?? index,
      bind: (row, ingredient) => row.bind(ingredient, this.model),
      afterReconcile: (rows) => this.orderIngredients(rows),
    });
  }

  bind(model, actions) {
    this.unregisterSemantic();
    this.model = model ?? {};
    this.actions = actions ?? {};
    const unknown =
      this.model.unknown === true ||
      this.model.known === false ||
      this.model.discoveryType === 'unknown';
    const locked = this.model.unlocked !== true;
    setText(this.name, unknown ? 'unknown potion' : this.model.label ?? '');
    setText(
      this.info,
      this.model.infoText ??
        this.model.description ??
        (unknown ? 'a recipe not yet named in the workshop book.' : ''),
    );
    setText(
      this.cost,
      this.model.costText ??
        (unknown
          ? '? mana required'
          : Number.isFinite(this.model.manaCost)
            ? `${this.model.manaCost} mana required`
            : ''),
    );
    setText(
      this.duration,
      this.model.durationText ??
        (unknown
          ? 'time: ?s'
          : Number.isFinite(this.model.brewDurationMs)
            ? `time: ${Math.ceil(this.model.brewDurationMs / 1000)}s`
            : ''),
    );
    const frameName =
      this.model.iconFrame ??
      getPotionIconFrameName(this.model.iconKey ?? this.model.key);
    this.icon.texture = frameName
      ? this.assetManager?.getAtlasTexture?.(frameName) ?? Texture.EMPTY
      : Texture.EMPTY;
    this.icon.visible = Boolean(frameName);
    this.icon.alpha = unknown ? 0.45 : 1;
    this.ingredients.reconcile(normalizeRows(this.model.ingredients));
    const selected = this.model.selected === true;
    this.select.setText(
      selected
        ? 'selected'
        : unknown
          ? 'unknown'
          : locked
            ? 'Research'
            : this.model.actionLabel ?? 'select',
    );
    const actionEnabled =
      !unknown &&
      (locked
        ? this.model.canResearch === true
        : true);
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
    if (this.model.unlocked !== true) {
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
    this.icon.position.set(0, 0);
    this.icon.width = RECIPE_ICON_SIZE;
    this.icon.height = RECIPE_ICON_SIZE;
    this.name.position.set(RECIPE_ICON_SIZE + RECIPE_HEADER_GAP, 2);
    this.info.position.set(0, RECIPE_ICON_SIZE + 6);
    this.info.style.wordWrapWidth = width;
    const ingredientsY = Math.max(
      118,
      RECIPE_ICON_SIZE + 6 + Math.ceil(this.info.height) + 6,
    );
    this.ingredientsLayer.position.set(0, ingredientsY);
    this.ingredients.getWidgets().forEach((row, index) =>
      row.setBounds(0, index * 32, width),
    );
    const metaY = Math.min(
      height - 92,
      ingredientsY + Math.max(1, this.ingredients.getWidgets().length) * 32 + 6,
    );
    this.cost.position.set(0, metaY);
    this.duration.position.set(0, metaY + 15);
    this.select.position.set((width - 112) / 2, height - 38);
    this.select.setSize(112, 30);
    this.separator
      .clear()
      .moveTo(0, height - 1)
      .lineTo(width, height - 1)
      .stroke({
        color: this.theme.stroke,
        width: RECIPE_RULE_WIDTH,
      });
    this.applyTheme(this.theme);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    const masked =
      this.model.unknown === true ||
      this.model.known === false;
    applyTextTheme(this.name, this.theme, {
      ...RETAINED_TEXT_STYLES.bold,
      fill: masked ? this.theme.disabled : this.theme.text,
      wordWrapWidth:
        (this.width ?? RECIPE_CARD_WIDTH) -
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
      fill: masked ? this.theme.disabled : this.theme.resourceColors.mana,
    });
    applyTextTheme(this.duration, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: masked ? this.theme.disabled : this.theme.muted,
    });
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

class BrewingRecipeIngredientRow {
  constructor({ instanceId }) {
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.model = {};
    this.recipe = {};
    this.root = new Container({
      label: `brewing-recipe-ingredient-${instanceId}`,
    });
    this.required = createText('', RETAINED_TEXT_STYLES.border);
    this.owned = createText('', RETAINED_TEXT_STYLES.border);
    this.root.addChild(this.required, this.owned);
  }

  bind(model, recipe) {
    this.model = model ?? {};
    this.recipe = recipe ?? {};
    const masked =
      this.recipe.unknown === true ||
      this.recipe.known === false;
    setText(
      this.required,
      this.model.requiredText ??
        (masked
          ? `- ${this.model.quantity ?? 1} ??????`
          : `- ${this.model.quantity ?? 1} ${this.model.label ?? ''}`),
    );
    setText(
      this.owned,
      this.model.ownedText ??
        (masked ? 'owned ?' : `owned ${this.model.owned ?? 0}`),
    );
    this.root.visible = true;
    this.root.renderable = true;
    this.applyTheme(this.theme);
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    this.required.position.set(0, 0);
    this.owned.position.set(0, 15);
    this.root.hitArea = new Rectangle(0, 0, width, 32);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    const unavailable =
      this.model.available === false ||
      (Number.isFinite(this.model.owned) &&
        Number.isFinite(this.model.quantity) &&
        this.model.owned < this.model.quantity);
    const masked =
      this.recipe.unknown === true ||
      this.recipe.known === false;
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

class BrewingTextButton extends BrewingDialogButton {
  redraw() {
    this.frame.clear();
  }
}

function releaseRegistration(registration) {
  if (typeof registration === 'function') {
    registration();
    return;
  }
  registration?.unregister?.();
}
