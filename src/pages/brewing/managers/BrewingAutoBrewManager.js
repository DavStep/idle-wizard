import { setResourceColor } from '../../shared/resourceColor.js';

export class BrewingAutoBrewManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.previousFocus = null;
    this.renderedSignature = null;
    this.handlePopupClick = (event) => {
      if (event.target === this.root) {
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

  mount(parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = this.createPopup();
    parent.append(this.root);
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
    this.root?.removeEventListener('click', this.handlePopupClick);
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.previousFocus = null;
    this.renderedSignature = null;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'brewing-page__auto-popup';
    popup.addEventListener('click', this.handlePopupClick);

    const dialog = document.createElement('section');
    dialog.className = 'brewing-page__auto-dialog style-dialog';
    dialog.setAttribute('aria-label', 'Auto brewing');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'auto brewing';

    const closeButton = document.createElement('button');
    closeButton.className = 'style-button brewing-page__auto-close';
    closeButton.type = 'button';
    closeButton.textContent = 'close';
    closeButton.addEventListener('click', () => this.hide());

    const summary = document.createElement('div');
    summary.className = 'brewing-page__auto-summary';

    const stateRow = this.createStateRow();
    const recipeRow = this.createStaticRow('recipe');

    summary.append(stateRow.row, recipeRow.row);

    const list = document.createElement('div');
    list.className = 'brewing-page__auto-list';

    dialog.append(title, closeButton, summary, list);
    popup.append(dialog);

    this.refs = {
      dialog,
      list,
      stateButton: stateRow.button,
      recipeValue: recipeRow.value,
    };

    return popup;
  }

  createStateRow() {
    const row = document.createElement('div');
    row.className = 'brewing-page__auto-row';

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = 'state';

    const button = document.createElement('button');
    button.className = 'row_val brewing-page__auto-state-button';
    button.type = 'button';
    button.addEventListener('click', () => this.toggleAutoBrew());

    row.append(label, button);
    return { row, button };
  }

  createStaticRow(labelText) {
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
    if (!this.root || !snapshot) {
      return;
    }

    const brewing = snapshot.brewing ?? {};
    const recipes = (brewing.recipes ?? []).filter((recipe) => recipe.unlocked);
    const selectedRecipe = recipes.find((recipe) => recipe.key === brewing.autoBrewRecipeKey);
    const hasSelectedRecipe = Boolean(selectedRecipe);

    const stateDisabled = !brewing.autoBrewEnabled && !hasSelectedRecipe;
    this.setText(this.refs.stateButton, brewing.autoBrewEnabled ? 'enabled' : 'disabled');
    this.setText(this.refs.recipeValue, selectedRecipe?.label ?? 'none');
    this.setDisabled(this.refs.stateButton, stateDisabled);
    this.setAttribute(
      this.refs.stateButton,
      'aria-disabled',
      stateDisabled ? 'true' : 'false',
    );
    this.setAttribute(
      this.refs.stateButton,
      'aria-label',
      this.formatStateAriaLabel(brewing.autoBrewEnabled, hasSelectedRecipe),
    );
    this.setAttribute(
      this.refs.stateButton,
      'aria-pressed',
      brewing.autoBrewEnabled ? 'true' : 'false',
    );

    const signature = this.createRenderSignature(recipes, brewing);

    if (signature === this.renderedSignature) {
      return;
    }

    this.renderedSignature = signature;
    this.refs.list.replaceChildren(...this.createRecipeListRows(recipes, brewing.autoBrewRecipeKey));
  }

  createRenderSignature(recipes, brewing) {
    const recipeSignature = recipes
      .map((recipe) => {
        const ingredientsSignature = (recipe.ingredients ?? [])
          .map((ingredient) => `${ingredient.key}:${ingredient.quantity ?? 1}`)
          .join(',');
        return `${recipe.key}:${recipe.manaCost}:${recipe.brewDurationMs}:${ingredientsSignature}`;
      })
      .join('|');

    return `${brewing.autoBrewRecipeKey ?? ''}:${brewing.autoBrewEnabled ? '1' : '0'}::${recipeSignature}`;
  }

  createRecipeListRows(recipes, selectedRecipeKey) {
    if (recipes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'brewing-page__recipe-empty';
      empty.textContent = 'no recipes';
      return [empty];
    }

    return recipes.map((recipe) => this.createRecipeRow(recipe, selectedRecipeKey));
  }

  createRecipeRow(recipe, selectedRecipeKey) {
    const row = document.createElement('div');
    row.className = 'brewing-page__recipe-row';
    const selected = recipe.key === selectedRecipeKey;
    row.classList.toggle('is-selected', selected);

    const main = document.createElement('div');
    main.className = 'brewing-page__recipe-main';

    const label = document.createElement('span');
    label.className = 'row_key brewing-page__recipe-name';
    label.textContent = recipe.label;

    const selectButton = document.createElement('button');
    selectButton.className = 'row_val brewing-page__auto-recipe-button';
    selectButton.type = 'button';
    selectButton.textContent = selected ? 'selected' : 'select';
    selectButton.setAttribute('aria-pressed', selected ? 'true' : 'false');
    selectButton.setAttribute(
      'aria-label',
      selected ? `${recipe.label} selected for auto brewing` : `select ${recipe.label} for auto brewing`,
    );
    selectButton.addEventListener('click', () => this.selectRecipe(recipe.key));

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

  selectRecipe(recipeKey) {
    this.gameplayFacade.setBrewingAutoBrewRecipe?.(recipeKey);
    this.render(this.gameplayFacade.getSnapshot());
  }

  formatStateAriaLabel(enabled, hasSelectedRecipe) {
    if (enabled) {
      return 'disable auto brewing';
    }

    return hasSelectedRecipe ? 'enable auto brewing' : 'select recipe before enabling auto brewing';
  }

  toggleAutoBrew() {
    const snapshot = this.gameplayFacade.getSnapshot();
    const enabled = snapshot.brewing?.autoBrewEnabled === true;
    this.gameplayFacade.setBrewingAutoBrewEnabled?.(!enabled);
    this.render(this.gameplayFacade.getSnapshot());
  }

  formatDuration(durationMs) {
    if (!Number.isFinite(durationMs)) {
      return '?s';
    }

    return `${Math.ceil(durationMs / 1_000)}s`;
  }

  applyVisibility() {
    if (!this.root) {
      return;
    }

    this.root.hidden = !this.visible;
    this.root.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
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
}
