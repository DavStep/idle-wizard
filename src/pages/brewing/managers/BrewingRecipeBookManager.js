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

  mount(parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = this.createOpenButton();
    this.refs.popup = this.createPopup();
    parent.append(this.root, this.refs.popup);
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
    button.textContent = 'recipes';
    button.setAttribute('aria-label', 'open recipes');
    button.addEventListener('click', () => this.show());
    return button;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'brewing-page__recipes-popup';
    popup.addEventListener('click', this.handlePopupClick);

    const dialog = document.createElement('section');
    dialog.className = 'brewing-page__recipes-dialog style-dialog';
    dialog.setAttribute('aria-label', 'Recipes');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'recipes';

    const closeButton = document.createElement('button');
    closeButton.className = 'style-button brewing-page__recipes-close';
    closeButton.type = 'button';
    closeButton.textContent = 'close';
    closeButton.addEventListener('click', () => this.hide());

    const rows = document.createElement('div');
    rows.className = 'brewing-page__recipe-list';

    dialog.append(title, closeButton, rows);
    popup.append(dialog);
    this.refs.dialog = dialog;
    this.refs.rows = rows;
    return popup;
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
    const signature = this.createRenderSignature(unlockedRecipes);

    if (signature === this.renderedSignature) {
      return;
    }

    this.renderedSignature = signature;

    this.refs.rows.replaceChildren(...this.createRecipeListRows(unlockedRecipes));
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

    const markButton = document.createElement('button');
    const markAction = selected ? 'unmark' : 'mark';
    markButton.className = 'row_val brewing-page__recipe-mark-button';
    markButton.type = 'button';
    markButton.textContent = markAction;
    markButton.setAttribute('aria-pressed', selected ? 'true' : 'false');
    markButton.setAttribute('aria-label', `${markAction} ${recipe.label} as guide`);
    markButton.addEventListener('click', () => this.selectRecipe(recipe));

    const ingredients = this.createIngredientsList(recipe.ingredients);

    const meta = document.createElement('div');
    meta.className = 'brewing-page__recipe-meta';

    const cost = document.createElement('span');
    cost.className = 'brewing-page__recipe-cost';
    cost.textContent = `cost ${recipe.manaCost} mana`;

    const duration = document.createElement('span');
    duration.className = 'brewing-page__recipe-duration';
    duration.textContent = `time: ${this.formatDuration(recipe.brewDurationMs)}`;

    meta.append(cost, duration);

    main.append(label, markButton);
    row.append(main, ingredients, meta);
    return row;
  }

  selectRecipe(recipe) {
    this.onSelectRecipe?.(recipe);
    this.render(this.gameplayFacade.getSnapshot());
    this.hide();
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
}
