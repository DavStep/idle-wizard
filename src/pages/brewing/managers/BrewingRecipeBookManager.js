import { setResourceColor } from '../../shared/resourceColor.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { getCompletedResearchIds } from '../../shared/itemResearchStatus.js';
import { automationResearchIds } from '../../../gameplay/automation/automationResearchIds.js';

export class BrewingRecipeBookManager {
  constructor({
    gameplayFacade,
    getSelectedRecipeKey,
    getCurrentCauldronIndex,
    onSelectRecipe,
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.getSelectedRecipeKey = getSelectedRecipeKey;
    this.getCurrentCauldronIndex = getCurrentCauldronIndex;
    this.onSelectRecipe = onSelectRecipe;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.previousFocus = null;
    this.renderedSignature = null;
    this.handlePopupClick = (event) => {
      if (event.target === this.refs.popup) {
        this.hide();
      }
    };
    this.handleKeydown = (event) => {
      if (!this.visible || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      this.hide();
    };
  }

  mount(parent, popupParent = parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.refs.popup) {
      return this.refs.popup;
    }

    this.refs.popup = this.createPopup();
    popupParent.append(this.refs.popup);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());
    this.applyVisibility();

    return this.refs.popup;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.popup?.removeEventListener('click', this.handlePopupClick);
    this.refs.popup?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.previousFocus = null;
    this.renderedSignature = null;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'brewing-page__recipes-popup';
    popup.addEventListener('click', this.handlePopupClick);

    const dialog = document.createElement('section');
    dialog.className = 'brewing-page__recipes-dialog style-dialog';
    dialog.setAttribute('aria-label', 'Select recipe');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'select recipe';

    const closeButton = document.createElement('button');
    closeButton.className = 'style-button brewing-page__recipes-close';
    closeButton.type = 'button';
    closeButton.dataset.tutorialId = 'brewing:recipes:close';
    closeButton.textContent = 'close';
    closeButton.addEventListener('click', () => this.hide());

    const rows = document.createElement('div');
    rows.className = 'brewing-page__recipe-list';

    const autoSummary = this.createAutoSummary();

    dialog.append(title, closeButton, autoSummary.root, rows);
    popup.append(dialog);
    this.refs.dialog = dialog;
    this.refs.title = title;
    this.refs.autoSummary = autoSummary.root;
    this.refs.autoStateButton = autoSummary.stateButton;
    this.refs.autoRecipeValue = autoSummary.recipeValue;
    this.refs.rows = rows;
    return popup;
  }

  createAutoSummary() {
    const root = document.createElement('div');
    root.className = 'brewing-page__auto-summary';
    root.hidden = true;

    const stateRow = this.createAutoRow('auto');
    const recipeRow = this.createAutoRow('recipe');

    const stateButton = document.createElement('button');
    stateButton.className = 'row_val brewing-page__auto-state-button';
    stateButton.type = 'button';
    stateButton.addEventListener('click', () => this.toggleAutoBrew());
    stateRow.value.replaceWith(stateButton);

    root.append(stateRow.row, recipeRow.row);
    return {
      root,
      stateButton,
      recipeValue: recipeRow.value,
    };
  }

  createAutoRow(labelText) {
    const row = document.createElement('div');
    row.className = 'brewing-page__auto-row';

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = labelText;

    const value = document.createElement('span');
    value.className = 'row_val';

    row.append(label, value);
    return { row, value };
  }

  show() {
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.render(this.gameplayFacade.getSnapshot());
    this.applyVisibility();
    this.refs.dialog?.focus();
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.applyVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
  }

  render(snapshot) {
    if (!this.refs.rows) {
      return;
    }

    const recipes = snapshot.brewing?.recipes ?? [];
    const unlockedRecipes = recipes.filter((recipe) => recipe.unlocked);
    this.renderTitle();
    this.renderAutoSummary(snapshot, unlockedRecipes);
    const ownedIngredientQuantities = this.getOwnedIngredientQuantities(snapshot);
    const signature = this.createRenderSignature(unlockedRecipes, ownedIngredientQuantities);

    if (signature === this.renderedSignature) {
      return;
    }

    this.renderedSignature = signature;

    this.refs.rows.replaceChildren(
      ...this.createRecipeListRows(unlockedRecipes, ownedIngredientQuantities),
    );
  }

  renderTitle() {
    const cauldronNumber = this.getSafeCurrentCauldronIndex() + 1;
    const title = `select recipe: cauldron ${cauldronNumber}`;

    this.setText(this.refs.title, title);
    this.setAttribute(this.refs.dialog, 'aria-label', title);
  }

  renderAutoSummary(snapshot, recipes) {
    const visible = this.isAutoBrewAvailable(snapshot);
    this.setHidden(this.refs.autoSummary, !visible);

    if (!visible) {
      this.setText(this.refs.autoStateButton, '');
      this.setText(this.refs.autoRecipeValue, '');
      this.setDisabled(this.refs.autoStateButton, true);
      this.setAttribute(this.refs.autoStateButton, 'aria-hidden', 'true');
      this.setAttribute(this.refs.autoStateButton, 'aria-disabled', 'true');
      this.setAttribute(this.refs.autoStateButton, 'aria-pressed', 'false');
      return;
    }

    const cauldronIndex = this.getSafeCurrentCauldronIndex();
    const brewing = this.getCauldronSnapshot(snapshot, cauldronIndex) ?? snapshot.brewing ?? {};
    const selectedRecipeKey = this.getSelectedRecipeKey?.() ?? null;
    const selectedRecipe = recipes.find((recipe) => recipe.key === selectedRecipeKey);
    const hasSelectedRecipe = Boolean(selectedRecipe);
    const autoEnabled =
      brewing.autoBrewEnabled === true && brewing.autoBrewRecipeKey === selectedRecipeKey;
    const disabled = !autoEnabled && !hasSelectedRecipe;

    this.setText(this.refs.autoStateButton, autoEnabled ? 'enabled' : 'disabled');
    this.setText(this.refs.autoRecipeValue, selectedRecipe?.label ?? 'none');
    this.setDisabled(this.refs.autoStateButton, disabled);
    this.removeAttribute(this.refs.autoStateButton, 'aria-hidden');
    this.setAttribute(this.refs.autoStateButton, 'aria-disabled', disabled ? 'true' : 'false');
    this.setAttribute(this.refs.autoStateButton, 'aria-pressed', autoEnabled ? 'true' : 'false');
    this.setAttribute(
      this.refs.autoStateButton,
      'aria-label',
      this.formatAutoStateAriaLabel(autoEnabled, hasSelectedRecipe),
    );
  }

  createRenderSignature(recipes, ownedIngredientQuantities = new Map()) {
    const selectedRecipeKey = this.getSelectedRecipeKey?.() ?? '';
    const recipeSignature = recipes
      .map((recipe) => {
        const ingredientsSignature = (recipe.ingredients ?? [])
          .map((ingredient) => {
            const quantity = this.normalizeIngredientQuantity(ingredient);
            const ownedQuantity = this.getOwnedIngredientQuantity(
              ingredient,
              ownedIngredientQuantities,
            );
            return `${ingredient.key}:${quantity}:${ownedQuantity}`;
          })
          .join(',');
        return `${recipe.key}:${recipe.manaCost}:${recipe.brewDurationMs}:${ingredientsSignature}`;
      })
      .join('|');

    return `${selectedRecipeKey}::${recipeSignature}`;
  }

  createRecipeListRows(recipes, ownedIngredientQuantities = new Map()) {
    if (recipes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'brewing-page__recipe-empty';
      empty.textContent = 'no recipes';
      return [empty];
    }

    return recipes.map((recipe) => this.createRecipeRow(recipe, ownedIngredientQuantities));
  }

  createRecipeRow(recipe, ownedIngredientQuantities = new Map()) {
    const row = document.createElement('button');
    row.className = 'brewing-page__recipe-row';
    row.type = 'button';
    row.dataset.tutorialId = `brewing:recipe:${recipe.key}`;
    const selected = recipe.key === this.getSelectedRecipeKey?.();
    row.classList.toggle('is-locked', !recipe.unlocked);
    row.classList.toggle('is-selected', selected);
    row.setAttribute('aria-pressed', selected ? 'true' : 'false');
    row.setAttribute(
      'aria-label',
      selected ? `unselect ${recipe.label} recipe` : `select ${recipe.label} recipe`,
    );
    row.addEventListener('click', () => this.selectRecipe(recipe));

    const main = document.createElement('div');
    main.className = 'brewing-page__recipe-main';

    const label = document.createElement('span');
    label.className = 'row_key brewing-page__recipe-name';
    label.textContent = recipe.label;
    setItemIconLabel(label, 'potion', recipe.key);

    const selectButton = document.createElement('span');
    const selectAction = selected ? 'selected' : 'select';
    selectButton.className = 'row_val brewing-page__recipe-select-button';
    selectButton.textContent = selectAction;

    const ingredients = this.createIngredientsList(
      recipe.ingredients,
      ownedIngredientQuantities,
    );

    const meta = document.createElement('div');
    meta.className = 'brewing-page__recipe-meta';

    const cost = document.createElement('span');
    cost.className = 'brewing-page__recipe-cost';
    setResourceColor(cost, 'mana');
    setResourceIconText(cost, `cost ${recipe.manaCost} mana`);

    const duration = document.createElement('span');
    duration.className = 'brewing-page__recipe-duration';
    duration.textContent = `time: ${this.formatDuration(recipe.brewDurationMs)}`;

    meta.append(cost, duration);

    main.append(label, selectButton);
    row.append(main, ingredients, meta);
    return row;
  }

  selectRecipe(recipe) {
    const selected = recipe?.key && recipe.key === this.getSelectedRecipeKey?.();
    this.onSelectRecipe?.(selected ? null : recipe);
    const snapshot = this.gameplayFacade.getSnapshot();
    this.render(snapshot);

    if (!this.isAutoBrewAvailable(snapshot)) {
      this.hide();
    }
  }

  toggleAutoBrew() {
    const snapshot = this.gameplayFacade.getSnapshot();
    const cauldronIndex = this.getSafeCurrentCauldronIndex();
    const brewing = this.getCauldronSnapshot(snapshot, cauldronIndex) ?? snapshot.brewing ?? {};
    const selectedRecipeKey = this.getSelectedRecipeKey?.() ?? null;
    const enabled =
      brewing.autoBrewEnabled === true && brewing.autoBrewRecipeKey === selectedRecipeKey;

    if (enabled) {
      this.gameplayFacade.setBrewingAutoBrewEnabled?.(false, cauldronIndex);
      this.render(this.gameplayFacade.getSnapshot());
      return;
    }

    if (!selectedRecipeKey) {
      this.render(snapshot);
      return;
    }

    const selectResult = this.gameplayFacade.setBrewingAutoBrewRecipe?.(
      selectedRecipeKey,
      cauldronIndex,
    );

    if (selectResult?.ok === false) {
      this.render(this.gameplayFacade.getSnapshot());
      return;
    }

    this.gameplayFacade.setBrewingAutoBrewEnabled?.(true, cauldronIndex);
    this.render(this.gameplayFacade.getSnapshot());
  }

  isAutoBrewAvailable(snapshot) {
    const cauldronIndex = this.getSafeCurrentCauldronIndex();
    const cauldron = this.getCauldronSnapshot(snapshot, cauldronIndex);

    if (cauldron?.autoBrewEnabled === true) {
      return true;
    }

    const completedResearchIds = getCompletedResearchIds(snapshot);

    if (completedResearchIds === null) {
      return false;
    }

    return completedResearchIds.has(automationResearchIds.autoBrewCauldron(cauldronIndex + 1));
  }

  getCauldronSnapshot(snapshot, cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    return (
      (snapshot?.brewing?.cauldrons ?? []).find(
        (cauldron) => cauldron.cauldronIndex === safeCauldronIndex,
      ) ?? (safeCauldronIndex === 0 ? snapshot?.brewing ?? null : null)
    );
  }

  getSafeCurrentCauldronIndex() {
    return this.normalizeCauldronIndex(this.getCurrentCauldronIndex?.() ?? 0);
  }

  normalizeCauldronIndex(cauldronIndex) {
    const safeCauldronIndex = Math.floor(Number(cauldronIndex));
    return Number.isInteger(safeCauldronIndex) && safeCauldronIndex >= 0
      ? safeCauldronIndex
      : 0;
  }

  formatAutoStateAriaLabel(enabled, hasSelectedRecipe) {
    if (enabled) {
      return 'disable auto';
    }

    return hasSelectedRecipe ? 'enable auto' : 'select recipe before enabling auto';
  }

  createIngredientsList(ingredients = [], ownedIngredientQuantities = new Map()) {
    const root = document.createElement('div');
    root.className = 'brewing-page__recipe-ingredients';

    if (ingredients.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'brewing-page__recipe-ingredient-row';
      empty.textContent = 'none';
      root.append(empty);
      return root;
    }

    root.append(
      ...ingredients.map((ingredient) => {
        const row = document.createElement('div');
        row.className = 'brewing-page__recipe-ingredient-row';
        const quantity = this.normalizeIngredientQuantity(ingredient);
        const ownedQuantity = this.getOwnedIngredientQuantity(
          ingredient,
          ownedIngredientQuantities,
        );

        const required = document.createElement('span');
        required.className = 'brewing-page__recipe-ingredient-required';
        setResourceColor(required, 'herb');
        required.append(`- ${quantity} `, this.createIngredientIconLabel(ingredient));

        const owned = document.createElement('span');
        owned.className = 'brewing-page__recipe-ingredient-owned';
        owned.textContent = `owned ${ownedQuantity}`;

        row.append(required, owned);
        return row;
      }),
    );

    return root;
  }

  getOwnedIngredientQuantities(snapshot) {
    const quantities = new Map();

    for (const item of snapshot?.inventory ?? []) {
      if (!Number.isInteger(item?.itemTypeId)) {
        continue;
      }

      quantities.set(item.itemTypeId, this.normalizeOwnedQuantity(item.quantity));
    }

    for (const herb of snapshot?.brewing?.herbs ?? []) {
      if (!Number.isInteger(herb?.itemTypeId)) {
        continue;
      }

      quantities.set(herb.itemTypeId, this.normalizeOwnedQuantity(herb.quantity));
    }

    return quantities;
  }

  createIngredientIconLabel(ingredient) {
    const label = document.createElement('span');
    label.textContent = ingredient.label;
    setItemIconLabel(label, 'herb', ingredient.key);
    return label;
  }

  getOwnedIngredientQuantity(ingredient, ownedIngredientQuantities) {
    return ownedIngredientQuantities.get(ingredient?.itemTypeId) ?? 0;
  }

  normalizeIngredientQuantity(ingredient) {
    const quantity = Number.isFinite(ingredient?.quantity) ? Math.floor(ingredient.quantity) : 1;
    return Math.max(1, quantity);
  }

  normalizeOwnedQuantity(quantity) {
    if (!Number.isFinite(quantity)) {
      return 0;
    }

    return Math.max(0, Math.floor(quantity));
  }

  formatDuration(durationMs) {
    if (!Number.isFinite(durationMs)) {
      return '?s';
    }

    return `${Math.ceil(durationMs / 1_000)}s`;
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }

  setHidden(element, hidden) {
    if (element.hidden !== hidden) {
      element.hidden = hidden;
    }
  }

  setText(element, value) {
    if (element.textContent !== value) {
      element.textContent = value;
    }
  }

  setDisabled(element, disabled) {
    if (element.disabled !== disabled) {
      element.disabled = disabled;
    }
  }

  setAttribute(element, name, value) {
    if (element.getAttribute(name) !== value) {
      element.setAttribute(name, value);
    }
  }

  removeAttribute(element, name) {
    if (element.hasAttribute(name)) {
      element.removeAttribute(name);
    }
  }
}
