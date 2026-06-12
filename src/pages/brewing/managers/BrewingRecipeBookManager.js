import { setResourceColor } from '../../shared/resourceColor.js';
import { getCompletedResearchIds } from '../../shared/itemResearchStatus.js';

const AUTO_BREW_CAULDRON_RESEARCH_ID = 'automation:autoBrewCauldron:1';

export class BrewingRecipeBookManager {
  constructor({ gameplayFacade, getSelectedRecipeKey, onSelectRecipe } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.getSelectedRecipeKey = getSelectedRecipeKey;
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

    if (this.root) {
      return this.root;
    }

    this.root = this.createOpenButton();
    this.refs.popup = this.createPopup();
    parent.append(this.root);
    popupParent.append(this.refs.popup);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());
    this.applyVisibility();

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.popup?.removeEventListener('click', this.handlePopupClick);
    this.root?.remove();
    this.refs.popup?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.previousFocus = null;
    this.renderedSignature = null;
  }

  createOpenButton() {
    const button = document.createElement('button');
    button.className = 'style-button brewing-page__recipes-button';
    button.type = 'button';
    button.textContent = 'select recipe';
    button.setAttribute('aria-label', 'open select recipe');
    button.addEventListener('click', () => this.show());
    return button;
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
    closeButton.textContent = 'close';
    closeButton.addEventListener('click', () => this.hide());

    const rows = document.createElement('div');
    rows.className = 'brewing-page__recipe-list';

    const autoSummary = this.createAutoSummary();

    dialog.append(title, closeButton, autoSummary.root, rows);
    popup.append(dialog);
    this.refs.dialog = dialog;
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
    if (!this.root) {
      return;
    }

    const recipes = snapshot.brewing?.recipes ?? [];
    const unlockedRecipes = recipes.filter((recipe) => recipe.unlocked);
    this.renderAutoSummary(snapshot, unlockedRecipes);
    const signature = this.createRenderSignature(unlockedRecipes);

    if (signature === this.renderedSignature) {
      return;
    }

    this.renderedSignature = signature;

    this.refs.rows.replaceChildren(...this.createRecipeListRows(unlockedRecipes));
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

    const brewing = snapshot.brewing ?? {};
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

  createRenderSignature(recipes) {
    const selectedRecipeKey = this.getSelectedRecipeKey?.() ?? '';
    const recipeSignature = recipes
      .map((recipe) => {
        const ingredientsSignature = (recipe.ingredients ?? [])
          .map((ingredient) => `${ingredient.key}:${ingredient.quantity ?? 1}`)
          .join(',');
        return `${recipe.key}:${recipe.manaCost}:${recipe.brewDurationMs}:${ingredientsSignature}`;
      })
      .join('|');

    return `${selectedRecipeKey}::${recipeSignature}`;
  }

  createRecipeListRows(recipes) {
    if (recipes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'brewing-page__recipe-empty';
      empty.textContent = 'no recipes';
      return [empty];
    }

    return recipes.map((recipe) => this.createRecipeRow(recipe));
  }

  createRecipeRow(recipe) {
    const row = document.createElement('div');
    row.className = 'brewing-page__recipe-row';
    const selected = recipe.key === this.getSelectedRecipeKey?.();
    row.classList.toggle('is-locked', !recipe.unlocked);
    row.classList.toggle('is-selected', selected);

    const main = document.createElement('div');
    main.className = 'brewing-page__recipe-main';

    const label = document.createElement('span');
    label.className = 'row_key brewing-page__recipe-name';
    label.textContent = recipe.label;

    const selectButton = document.createElement('button');
    const selectAction = selected ? 'selected' : 'select';
    selectButton.className = 'row_val brewing-page__recipe-select-button';
    selectButton.type = 'button';
    selectButton.textContent = selectAction;
    selectButton.setAttribute('aria-pressed', selected ? 'true' : 'false');
    selectButton.setAttribute(
      'aria-label',
      selected ? `${recipe.label} selected recipe` : `select ${recipe.label} recipe`,
    );
    selectButton.addEventListener('click', () => this.selectRecipe(recipe));

    const ingredients = this.createIngredientsList(recipe.ingredients);

    const meta = document.createElement('div');
    meta.className = 'brewing-page__recipe-meta';

    const cost = document.createElement('span');
    cost.className = 'brewing-page__recipe-cost';
    setResourceColor(cost, 'mana');
    cost.textContent = `cost ${recipe.manaCost} mana`;

    const duration = document.createElement('span');
    duration.className = 'brewing-page__recipe-duration';
    duration.textContent = `time: ${this.formatDuration(recipe.brewDurationMs)}`;

    meta.append(cost, duration);

    main.append(label, selectButton);
    row.append(main, ingredients, meta);
    return row;
  }

  selectRecipe(recipe) {
    this.onSelectRecipe?.(recipe);
    const snapshot = this.gameplayFacade.getSnapshot();
    this.render(snapshot);

    if (!this.isAutoBrewAvailable(snapshot)) {
      this.hide();
    }
  }

  toggleAutoBrew() {
    const snapshot = this.gameplayFacade.getSnapshot();
    const brewing = snapshot.brewing ?? {};
    const selectedRecipeKey = this.getSelectedRecipeKey?.() ?? null;
    const enabled =
      brewing.autoBrewEnabled === true && brewing.autoBrewRecipeKey === selectedRecipeKey;

    if (enabled) {
      this.gameplayFacade.setBrewingAutoBrewEnabled?.(false);
      this.render(this.gameplayFacade.getSnapshot());
      return;
    }

    if (!selectedRecipeKey) {
      this.render(snapshot);
      return;
    }

    const selectResult = this.gameplayFacade.setBrewingAutoBrewRecipe?.(selectedRecipeKey);

    if (selectResult?.ok === false) {
      this.render(this.gameplayFacade.getSnapshot());
      return;
    }

    this.gameplayFacade.setBrewingAutoBrewEnabled?.(true);
    this.render(this.gameplayFacade.getSnapshot());
  }

  isAutoBrewAvailable(snapshot) {
    if (snapshot?.brewing?.autoBrewEnabled === true) {
      return true;
    }

    const completedResearchIds = getCompletedResearchIds(snapshot);

    if (completedResearchIds === null) {
      return false;
    }

    return completedResearchIds.has(AUTO_BREW_CAULDRON_RESEARCH_ID);
  }

  formatAutoStateAriaLabel(enabled, hasSelectedRecipe) {
    if (enabled) {
      return 'disable auto';
    }

    return hasSelectedRecipe ? 'enable auto' : 'select recipe before enabling auto';
  }

  createIngredientsList(ingredients = []) {
    const root = document.createElement('div');
    root.className = 'brewing-page__recipe-ingredients';

    const title = document.createElement('div');
    title.className = 'brewing-page__recipe-ingredients-title';
    title.textContent = 'ingredients:';
    root.append(title);

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
        setResourceColor(row, 'herb');
        const quantity = Number.isFinite(ingredient.quantity) ? ingredient.quantity : 1;
        row.textContent = `- ${Math.max(1, quantity)} ${ingredient.label}`;
        return row;
      }),
    );

    return root;
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
