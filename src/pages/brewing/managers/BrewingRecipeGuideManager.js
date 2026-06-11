export class BrewingRecipeGuideManager {
  constructor({ gameplayFacade, getSelectedRecipeKey, onSelectRecipe } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.getSelectedRecipeKeyCallback = getSelectedRecipeKey;
    this.onSelectRecipe = onSelectRecipe;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.stepRows = [];
    this.emptyStep = null;
    this.selectedRecipeKey = null;
    this.latestSnapshot = null;
  }

  mount(parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'brewing-page__guide style-box';
    this.root.setAttribute('aria-label', 'Recipe guide');

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'guide';

    const recipeRow = this.createRow('recipe');

    const sequence = document.createElement('div');
    sequence.className = 'brewing-page__guide-sequence';

    this.root.append(title, recipeRow.row, sequence);
    this.refs = {
      recipeValue: recipeRow.value,
      sequence,
    };
    parent.append(this.root);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.clearGuideLayoutVariables();
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.stepRows = [];
    this.emptyStep = null;
    this.latestSnapshot = null;
  }

  createRow(labelText) {
    const row = document.createElement('div');
    row.className = 'brewing-page__guide-row';

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = labelText;

    const value = document.createElement('span');
    value.className = 'row_val';

    row.append(label, value);
    return { row, value };
  }

  selectRecipe(recipeKey) {
    const targetRecipeKey =
      typeof recipeKey === 'string' ? recipeKey : recipeKey?.key ?? null;

    if (!targetRecipeKey) {
      return;
    }

    if (this.onSelectRecipe) {
      this.onSelectRecipe(targetRecipeKey);
      this.render(this.latestSnapshot ?? this.gameplayFacade?.getSnapshot());
      return;
    }

    this.selectedRecipeKey = this.selectedRecipeKey === targetRecipeKey ? null : targetRecipeKey;
    this.render(this.latestSnapshot ?? this.gameplayFacade?.getSnapshot());
  }

  getSelectedRecipeKey() {
    return this.getSelectedRecipeKeyCallback?.() ?? this.selectedRecipeKey;
  }

  render(snapshot) {
    if (!this.root || !snapshot) {
      return;
    }

    this.latestSnapshot = snapshot;
    const recipe = this.getSelectedRecipe(snapshot.brewing?.recipes ?? []);

    if (!recipe) {
      this.renderEmpty();
      return;
    }

    const targetIngredients = this.expandIngredientSequence(recipe.ingredients);
    const ingredientGroups = this.createIngredientGroups(recipe.ingredients);
    const ingredients = snapshot.brewing?.ingredients ?? [];
    const match = this.getIngredientMatch(targetIngredients, ingredients);

    this.setText(this.refs.recipeValue, recipe.label);
    this.renderIngredientSteps(ingredientGroups, match);
  }

  renderEmpty() {
    this.setText(this.refs.recipeValue, 'none');
    this.setSequenceRowCount(1);
    this.showEmptyStep();
    this.hideExtraIngredientSteps(0);
  }

  getSelectedRecipe(recipes) {
    const selectedRecipeKey = this.getSelectedRecipeKey();

    if (!selectedRecipeKey) {
      return null;
    }

    return recipes.find((recipe) => recipe.key === selectedRecipeKey) ?? null;
  }

  expandIngredientSequence(ingredients = []) {
    return ingredients.flatMap((ingredient) => {
      const quantity = this.normalizeIngredientQuantity(ingredient);
      return Array.from({ length: quantity }, () => ingredient);
    });
  }

  createIngredientGroups(ingredients = []) {
    let startIndex = 0;

    return ingredients.map((ingredient) => {
      const quantity = this.normalizeIngredientQuantity(ingredient);
      const group = {
        ...ingredient,
        quantity,
        startIndex,
        endIndex: startIndex + quantity,
      };
      startIndex = group.endIndex;
      return group;
    });
  }

  normalizeIngredientQuantity(ingredient) {
    const quantity = Number.isFinite(ingredient?.quantity) ? Math.floor(ingredient.quantity) : 1;
    return Math.max(1, quantity);
  }

  getIngredientMatch(targetIngredients, ingredients) {
    let firstMismatchIndex = -1;

    for (let index = 0; index < ingredients.length; index += 1) {
      const target = targetIngredients[index];

      if (!target || target.itemTypeId !== ingredients[index].itemTypeId) {
        firstMismatchIndex = index;
        break;
      }
    }

    const prefixMatches = firstMismatchIndex === -1;
    const matchedCount = prefixMatches
      ? Math.min(ingredients.length, targetIngredients.length)
      : firstMismatchIndex;

    return {
      firstMismatchIndex,
      matchedCount,
      prefixMatches,
      ready: prefixMatches && ingredients.length === targetIngredients.length,
      tooLong: prefixMatches && ingredients.length > targetIngredients.length,
    };
  }

  renderIngredientSteps(ingredientGroups, match) {
    this.hideEmptyStep();
    this.setSequenceRowCount(ingredientGroups.length);

    for (const [index, ingredient] of ingredientGroups.entries()) {
      const refs = this.ensureIngredientStep(index);
      refs.row.hidden = false;
      this.setText(refs.label, this.formatIngredientGroup(ingredient));
      this.setText(refs.value, this.formatStepValue(ingredient, match));
      refs.row.classList.toggle('is-placed', ingredient.endIndex <= match.matchedCount);
      refs.row.classList.toggle(
        'is-next',
        match.prefixMatches &&
          ingredient.startIndex <= match.matchedCount &&
          match.matchedCount < ingredient.endIndex &&
          !match.ready,
      );
      refs.row.classList.toggle(
        'is-mismatch',
        ingredient.startIndex <= match.firstMismatchIndex &&
          match.firstMismatchIndex < ingredient.endIndex,
      );
    }

    this.hideExtraIngredientSteps(ingredientGroups.length);
  }

  ensureIngredientStep(index) {
    if (this.stepRows[index]) {
      return this.stepRows[index];
    }

    const row = document.createElement('div');
    row.className = 'brewing-page__guide-step';

    const label = document.createElement('span');
    label.className = 'row_key';

    const value = document.createElement('span');
    value.className = 'row_val';

    row.append(label, value);
    this.refs.sequence.append(row);

    const refs = { row, label, value };
    this.stepRows[index] = refs;
    return refs;
  }

  hideExtraIngredientSteps(visibleCount) {
    for (let index = visibleCount; index < this.stepRows.length; index += 1) {
      const refs = this.stepRows[index];
      refs.row.hidden = true;
      refs.row.classList.remove('is-placed', 'is-next', 'is-mismatch');
      this.setText(refs.label, '');
      this.setText(refs.value, '');
    }
  }

  showEmptyStep() {
    const row = this.ensureEmptyStep();
    row.hidden = false;
    this.setText(row, 'select in recipes');
  }

  hideEmptyStep() {
    if (!this.emptyStep) {
      return;
    }

    this.emptyStep.hidden = true;
    this.setText(this.emptyStep, '');
  }

  setSequenceRowCount(rowCount) {
    const visibleRowCount = Math.max(1, rowCount);
    const sequenceHeight =
      visibleRowCount === 1
        ? 'var(--style-row-min-height)'
        : `calc(var(--style-row-min-height) * ${visibleRowCount})`;
    const panelHeight = `calc(var(--style-row-min-height) + 3px + ${sequenceHeight} + 12px)`;
    const controlsBottom =
      `calc(var(--style-room-chat-clearance) + ${panelHeight} + ` +
      'var(--style-room-chat-title-overhang) + var(--brewing-page-guide-controls-gap))';
    this.root.style.setProperty('--brewing-page-guide-sequence-height', sequenceHeight);
    this.root.parentElement?.style.setProperty(
      '--brewing-page-guide-sequence-height',
      sequenceHeight,
    );
    this.root.parentElement?.style.setProperty(
      '--brewing-page-guide-panel-height',
      panelHeight,
    );
    this.root.parentElement?.style.setProperty(
      '--brewing-page-guide-controls-bottom',
      controlsBottom,
    );
  }

  clearGuideLayoutVariables() {
    this.root?.parentElement?.style.removeProperty('--brewing-page-guide-sequence-height');
    this.root?.parentElement?.style.removeProperty('--brewing-page-guide-panel-height');
    this.root?.parentElement?.style.removeProperty('--brewing-page-guide-controls-bottom');
  }

  ensureEmptyStep() {
    if (this.emptyStep) {
      return this.emptyStep;
    }

    this.emptyStep = document.createElement('div');
    this.emptyStep.className = 'brewing-page__guide-empty';
    this.refs.sequence.append(this.emptyStep);
    return this.emptyStep;
  }

  setText(element, text) {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }

  formatIngredientGroup(ingredient) {
    return `- ${ingredient.quantity} ${ingredient.label}`;
  }

  formatStepValue(ingredient, match) {
    if (ingredient.endIndex <= match.matchedCount) {
      return 'placed';
    }

    if (
      ingredient.startIndex <= match.firstMismatchIndex &&
      match.firstMismatchIndex < ingredient.endIndex
    ) {
      return 'needed';
    }

    if (
      match.prefixMatches &&
      ingredient.startIndex <= match.matchedCount &&
      match.matchedCount < ingredient.endIndex &&
      !match.ready
    ) {
      return 'next';
    }

    return '';
  }
}
