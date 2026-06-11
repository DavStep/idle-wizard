import {
  isItemResearched,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';
import { setResourceColor } from '../../shared/resourceColor.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';

const TOUCH_DRAG_DISTANCE = 8;

export class BrewingCauldronManager {
  constructor({ gameplayFacade, getSelectedRecipeKey, onOpenAutoBrew } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.getSelectedRecipeKey = getSelectedRecipeKey;
    this.onOpenAutoBrew = onOpenAutoBrew;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.herbRows = new Map();
    this.herbRowsSignature = '';
    this.ingredientRows = [];
    this.cauldronGuideRows = [];
    this.message = '';
    this.draggedItemTypeId = null;
    this.pointerDrag = null;
    this.suppressNextClick = false;
    this.handleDocumentPointerMove = (event) => this.onDocumentPointerMove(event);
    this.handleDocumentPointerUp = (event) => this.onDocumentPointerUp(event);
  }

  mount(parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'brewing-page__workbench';
    this.root.setAttribute('aria-label', 'Brewing workbench');

    this.refs.herbs = this.createHerbsBox();
    this.refs.cauldron = this.createCauldronBox();
    this.refs.actions = this.createActions();
    this.root.append(this.refs.herbs.root, this.refs.cauldron.root, this.refs.actions.root);
    parent.append(this.root);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('pointermove', this.handleDocumentPointerMove);
    document.removeEventListener('pointerup', this.handleDocumentPointerUp);
    this.pointerDrag?.ghost?.remove();
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.herbRows.clear();
    this.herbRowsSignature = '';
    this.ingredientRows = [];
    this.cauldronGuideRows = [];
    this.message = '';
    this.draggedItemTypeId = null;
    this.pointerDrag = null;
    this.suppressNextClick = false;
  }

  createHerbsBox() {
    const root = document.createElement('section');
    root.className = 'brewing-page__herbs style-box';
    root.setAttribute('aria-label', 'Herbs');

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'herbs';

    const rows = document.createElement('div');
    rows.className = 'brewing-page__herb-rows';
    root.append(title, rows);

    return { root, rows };
  }

  createCauldronBox() {
    const root = document.createElement('section');
    root.className = 'brewing-page__cauldron style-box';
    root.setAttribute('aria-label', 'Cauldron');
    root.addEventListener('dragover', (event) => this.onDragOver(event));
    root.addEventListener('dragleave', () => this.onDragLeave());
    root.addEventListener('drop', (event) => this.onDrop(event));

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'cauldron';

    const count = document.createElement('div');
    count.className = 'brewing-page__cauldron-count';
    count.textContent = '0/0';

    const autoBrewButton = document.createElement('button');
    autoBrewButton.className = 'brewing-page__cauldron-auto-brew-text';
    autoBrewButton.type = 'button';
    autoBrewButton.textContent = 'auto brewing';
    autoBrewButton.setAttribute('aria-haspopup', 'dialog');
    autoBrewButton.addEventListener('click', () => this.onOpenAutoBrew?.());

    const guide = document.createElement('div');
    guide.className = 'brewing-page__cauldron-guide';
    guide.hidden = true;

    const recipeRow = document.createElement('div');
    recipeRow.className = 'brewing-page__cauldron-recipe-row';

    const recipeLabel = document.createElement('span');
    recipeLabel.className = 'row_key';
    recipeLabel.textContent = 'recipe';

    const recipeValue = document.createElement('span');
    recipeValue.className = 'row_val';

    const guideSequence = document.createElement('div');
    guideSequence.className = 'brewing-page__cauldron-guide-sequence';

    recipeRow.append(recipeLabel, recipeValue);
    guide.append(recipeRow, guideSequence);

    const items = document.createElement('div');
    items.className = 'brewing-page__cauldron-items';

    const status = document.createElement('div');
    status.className = 'brewing-page__cauldron-status';

    const active = document.createElement('div');
    active.className = 'brewing-page__active-brew';

    const activeText = document.createElement('div');
    activeText.className = 'brewing-page__active-brew-text';

    const activeProgress = document.createElement('div');
    activeProgress.className = 'style-progress style-progress--timer brewing-page__active-progress';
    activeProgress.setAttribute('role', 'progressbar');
    activeProgress.setAttribute('aria-label', 'Brewing progress');
    activeProgress.setAttribute('aria-valuemin', '0');
    activeProgress.setAttribute('aria-valuemax', '100');

    const activeProgressFill = document.createElement('div');
    activeProgressFill.className =
      'style-progress__fill brewing-page__active-progress-fill';

    const activeProgressText = document.createElement('div');
    activeProgressText.className =
      'style-progress__text brewing-page__active-progress-text';

    activeProgress.append(activeProgressFill, activeProgressText);
    active.append(activeText, activeProgress);
    root.append(title, count, guide, status, items, active, autoBrewButton);
    return {
      root,
      count,
      guide,
      recipeRow,
      recipeLabel,
      recipeValue,
      guideSequence,
      status,
      autoBrewButton,
      items,
      active,
      activeText,
      activeProgress,
      activeProgressFill,
      activeProgressText,
    };
  }

  createActions() {
    const root = document.createElement('div');
    root.className = 'brewing-page__actions';
    root.setAttribute('aria-live', 'polite');

    const actionButton = document.createElement('button');
    actionButton.className = 'style-button brewing-page__action-button';
    actionButton.type = 'button';
    actionButton.addEventListener('click', () => this.onPrimaryAction());

    const actionButtonLabel = document.createElement('span');
    actionButtonLabel.className = 'brewing-page__action-button-label';

    const actionButtonCost = document.createElement('span');
    actionButtonCost.className = 'brewing-page__action-button-cost';
    setResourceColor(actionButtonCost, 'mana');

    const actionRow = document.createElement('div');
    actionRow.className = 'brewing-page__action-row';

    actionButton.append(actionButtonLabel, actionButtonCost);
    actionRow.append(actionButton);

    const message = document.createElement('div');
    message.className = 'brewing-page__message';

    root.append(actionRow, message);
    return {
      root,
      actionRow,
      actionButton,
      actionButtonLabel,
      actionButtonCost,
      message,
    };
  }

  render(snapshot) {
    if (!snapshot) {
      return;
    }

    const brewing = {
      ...snapshot.brewing,
      herbs: this.getHerbRows(snapshot),
    };
    brewing.selectedRecipe = this.getSelectedRecipe(brewing.recipes ?? []);
    this.syncHerbRows(brewing.herbs);
    this.renderHerbs(snapshot, brewing);
    this.renderCauldron(brewing);
    this.renderActions(brewing);
  }

  getHerbRows(snapshot) {
    return (snapshot.brewing?.herbs ?? [])
      .map((herb) => ({
        ...herb,
        researched: isItemResearched(snapshot, herb),
      }))
      .filter((herb) => shouldShowItemInActionList(snapshot, herb, herb.quantity));
  }

  syncHerbRows(herbs) {
    const signature = herbs.map((herb) => herb.itemTypeId).join('|');

    if (signature === this.herbRowsSignature) {
      return;
    }

    const visibleIds = new Set(herbs.map((herb) => herb.itemTypeId));

    for (const [itemTypeId, refs] of this.herbRows.entries()) {
      if (visibleIds.has(itemTypeId)) {
        continue;
      }

      refs.row.remove();
      this.herbRows.delete(itemTypeId);
    }

    this.ensureHerbRows(herbs);
    this.refs.herbs.rows.replaceChildren(
      ...herbs.map((herb) => this.herbRows.get(herb.itemTypeId)?.row).filter(Boolean),
    );
    this.herbRowsSignature = signature;
  }

  ensureHerbRows(herbs) {
    for (const herb of herbs) {
      if (this.herbRows.has(herb.itemTypeId)) {
        continue;
      }

      const row = document.createElement('div');
      row.className = 'brewing-page__herb-row';
      setResourceColor(row, 'herb');

      const button = document.createElement('button');
      button.className = 'brewing-page__herb-button';
      button.type = 'button';
      button.draggable = true;
      setResourceColor(button, 'herb');
      button.addEventListener('click', (event) => this.onHerbButtonClick(event, herb.itemTypeId));
      button.addEventListener('dragstart', (event) =>
        this.onDragStart(event, herb.itemTypeId),
      );
      button.addEventListener('dragend', () => this.onDragEnd());
      button.addEventListener('pointerdown', (event) =>
        this.onPointerDown(event, herb.itemTypeId),
      );

      const label = document.createElement('span');
      label.className = 'row_key';

      const quantity = document.createElement('span');
      quantity.className = 'row_val';

      button.append(label, quantity);
      row.append(button);
      this.herbRows.set(herb.itemTypeId, { row, button, label, quantity });
      this.refs.herbs.rows.append(row);
    }
  }

  renderHerbs(snapshot, brewing) {
    for (const herb of brewing.herbs) {
      const refs = this.herbRows.get(herb.itemTypeId);
      const disabled =
        herb.availableQuantity <= 0 || !brewing.canAddIngredient || Boolean(brewing.activeBrew);

      refs.row.classList.toggle('is-empty', herb.availableQuantity <= 0);
      refs.row.classList.toggle('is-locked', false);
      this.setText(refs.label, herb.label);
      this.setText(refs.quantity, String(herb.availableQuantity));
      this.setDisabled(refs.button, disabled);
      this.setDraggable(refs.button, !disabled);
      this.setAttribute(refs.button, 'aria-disabled', disabled ? 'true' : 'false');
      this.setAttribute(refs.button, 'aria-label', `add ${herb.label} to cauldron`);
      setNotificationBadge(refs.button, !disabled);
    }
  }

  renderCauldron(brewing) {
    this.setText(this.refs.cauldron.count, this.formatCauldronCount(brewing));
    const statusText = this.formatCauldronStatus(brewing);
    this.setHidden(this.refs.cauldron.status, statusText === '');
    this.setText(this.refs.cauldron.status, statusText);
    this.renderCauldronGuide(brewing);
    this.renderCauldronItems(brewing);

    if (brewing.activeBrew) {
      this.setHidden(this.refs.cauldron.active, false);
      this.setText(
        this.refs.cauldron.activeText,
        this.formatActiveBrewText(brewing.activeBrew),
      );
      const progress = Number.isFinite(brewing.activeBrew.progress)
        ? brewing.activeBrew.progress
        : 0;
      const percent = Math.round(Math.max(0, Math.min(100, progress * 100)));
      this.setStyleWidth(this.refs.cauldron.activeProgressFill, `${percent}%`);
      this.setText(this.refs.cauldron.activeProgressText, '');
      this.setAttribute(
        this.refs.cauldron.activeProgress,
        'aria-label',
        this.formatActiveProgressAriaLabel(brewing.activeBrew),
      );
      this.setAttribute(this.refs.cauldron.activeProgress, 'aria-valuenow', String(percent));
    } else {
      this.setHidden(this.refs.cauldron.active, true);
      this.setText(this.refs.cauldron.activeText, '');
      this.setStyleWidth(this.refs.cauldron.activeProgressFill, '0%');
      this.setText(this.refs.cauldron.activeProgressText, '');
      this.setAttribute(this.refs.cauldron.activeProgress, 'aria-valuenow', '0');
    }
  }

  renderCauldronItems(brewing) {
    this.ensureCauldronEmptyRow();

    const hasIngredients = brewing.ingredients.length > 0;
    const showGuideContents = Boolean(brewing.selectedRecipe && !brewing.activeBrew);
    const showEmpty = !hasIngredients && !brewing.activeBrew && !showGuideContents;
    this.refs.cauldron.items.classList.toggle('is-empty', showEmpty);
    this.setHidden(this.refs.cauldron.empty, !showEmpty);
    this.setText(this.refs.cauldron.empty, showEmpty ? 'empty' : '');

    if (showGuideContents) {
      this.hideExtraIngredientRows(0);
      return;
    }

    const ingredientGroups = this.groupAdjacentIngredients(brewing.ingredients);

    for (const [index, ingredient] of ingredientGroups.entries()) {
      const refs = this.ensureIngredientRow(index);
      this.setHidden(refs.row, false);
      this.setAttribute(refs.row, 'data-slot-index', String(ingredient.slotIndex));
      this.setAttribute(refs.row, 'aria-label', `remove one ${ingredient.label} from cauldron`);
      setResourceColor(refs.row, 'herb');
      this.setText(refs.label, `- ${ingredient.quantity} ${ingredient.label}`);
      this.setText(refs.action, 'remove');
    }

    this.hideExtraIngredientRows(ingredientGroups.length);
  }

  hideExtraIngredientRows(visibleCount) {
    for (let index = visibleCount; index < this.ingredientRows.length; index += 1) {
      const refs = this.ingredientRows[index];
      this.setHidden(refs.row, true);
      this.removeAttribute(refs.row, 'aria-label');
      this.removeAttribute(refs.row, 'data-slot-index');
      setResourceColor(refs.row, null);
      this.setText(refs.label, '');
      this.setText(refs.action, '');
    }
  }

  renderCauldronGuide(brewing) {
    const recipe = brewing.selectedRecipe;
    const showGuide = Boolean(recipe && !brewing.activeBrew);
    this.setHidden(this.refs.cauldron.guide, !showGuide);

    if (!showGuide) {
      this.setText(this.refs.cauldron.recipeValue, '');
      this.hideExtraCauldronGuideRows(0);
      return;
    }

    this.setText(this.refs.cauldron.recipeValue, recipe.label);
    const targetIngredients = this.expandIngredientSequence(recipe.ingredients);
    const ingredientGroups = this.createIngredientGroups(recipe.ingredients);
    const match = this.getIngredientMatch(targetIngredients, brewing.ingredients);
    let renderedRows = 0;

    for (const ingredient of ingredientGroups) {
      const refs = this.ensureCauldronGuideRow(renderedRows);
      const rowState = this.getCauldronGuideRowState(ingredient, brewing.ingredients, match);
      this.renderCauldronGuideRow(refs, rowState);
      renderedRows += 1;
    }

    const extraGroups = this.groupAdjacentIngredients(
      brewing.ingredients.slice(targetIngredients.length),
    ).map((ingredient) => ({
      ...ingredient,
      slotIndex: ingredient.slotIndex + targetIngredients.length,
    }));

    for (const ingredient of extraGroups) {
      const refs = this.ensureCauldronGuideRow(renderedRows);
      this.renderCauldronGuideRow(refs, {
        label: this.formatIngredientGroup(ingredient),
        value: 'remove',
        removeSlotIndex: ingredient.slotIndex + ingredient.quantity - 1,
        isPlaced: false,
        isNext: false,
        isMismatch: true,
      });
      renderedRows += 1;
    }

    this.hideExtraCauldronGuideRows(renderedRows);
  }

  ensureCauldronGuideRow(index) {
    if (this.cauldronGuideRows[index]) {
      return this.cauldronGuideRows[index];
    }

    const row = document.createElement('button');
    row.className = 'brewing-page__cauldron-guide-step';
    row.type = 'button';
    row.addEventListener('click', (event) => {
      const slotIndex = Number(event.currentTarget.dataset.slotIndex);

      if (Number.isInteger(slotIndex)) {
        this.onRemoveIngredient(slotIndex);
      }
    });

    const label = document.createElement('span');
    label.className = 'row_key';

    const value = document.createElement('span');
    value.className = 'row_val';

    row.append(label, value);
    this.refs.cauldron.guideSequence.append(row);

    const refs = { row, label, value };
    this.cauldronGuideRows[index] = refs;
    return refs;
  }

  renderCauldronGuideRow(refs, rowState) {
    this.setHidden(refs.row, false);
    this.setText(refs.label, rowState.label);
    this.setText(refs.value, rowState.value);
    refs.row.classList.toggle('is-placed', rowState.isPlaced);
    refs.row.classList.toggle('is-next', rowState.isNext);
    refs.row.classList.toggle('is-mismatch', rowState.isMismatch);

    if (Number.isInteger(rowState.removeSlotIndex)) {
      this.setDisabled(refs.row, false);
      this.setAttribute(refs.row, 'data-slot-index', String(rowState.removeSlotIndex));
      this.setAttribute(refs.row, 'aria-disabled', 'false');
      this.setAttribute(refs.row, 'aria-label', `remove ${rowState.label} from cauldron`);
      return;
    }

    this.setDisabled(refs.row, true);
    this.removeAttribute(refs.row, 'data-slot-index');
    this.setAttribute(refs.row, 'aria-disabled', 'true');
    this.removeAttribute(refs.row, 'aria-label');
  }

  hideExtraCauldronGuideRows(visibleCount) {
    for (let index = visibleCount; index < this.cauldronGuideRows.length; index += 1) {
      const refs = this.cauldronGuideRows[index];
      this.setHidden(refs.row, true);
      this.setDisabled(refs.row, true);
      this.removeAttribute(refs.row, 'data-slot-index');
      this.removeAttribute(refs.row, 'aria-label');
      this.setAttribute(refs.row, 'aria-disabled', 'true');
      refs.row.classList.remove('is-placed', 'is-next', 'is-mismatch');
      this.setText(refs.label, '');
      this.setText(refs.value, '');
    }
  }

  getCauldronGuideRowState(ingredient, ingredients, match) {
    const actualSlots = ingredients.slice(ingredient.startIndex, ingredient.endIndex);
    const mismatchOffset = actualSlots.findIndex(
      (actual) => actual.itemTypeId !== ingredient.itemTypeId,
    );
    const hasMismatch = mismatchOffset >= 0;
    const matchedQuantity = hasMismatch ? mismatchOffset : actualSlots.length;
    const hasIngredient = actualSlots.length > 0;
    const removeSlotIndex = hasIngredient
      ? ingredient.startIndex + actualSlots.length - 1
      : null;

    if (hasMismatch) {
      const wrongIngredient = actualSlots[mismatchOffset];
      return {
        label: this.formatIngredientGroup({
          label: wrongIngredient?.label ?? 'unknown',
          quantity: 1,
        }),
        value: 'remove',
        removeSlotIndex,
        isPlaced: false,
        isNext: false,
        isMismatch: true,
      };
    }

    if (matchedQuantity > 0 && matchedQuantity < ingredient.quantity) {
      return {
        label: `- ${matchedQuantity}/${ingredient.quantity} ${ingredient.label}`,
        value: 'remove',
        removeSlotIndex,
        isPlaced: false,
        isNext: true,
        isMismatch: false,
      };
    }

    if (hasIngredient) {
      return {
        label: this.formatIngredientGroup(ingredient),
        value: 'remove',
        removeSlotIndex,
        isPlaced: ingredient.endIndex <= match.matchedCount,
        isNext: false,
        isMismatch: false,
      };
    }

    return {
      label: this.formatIngredientGroup(ingredient),
      value: this.formatGuideStepValue(ingredient, match),
      removeSlotIndex: null,
      isPlaced: false,
      isNext:
        match.prefixMatches &&
        ingredient.startIndex <= match.matchedCount &&
        match.matchedCount < ingredient.endIndex &&
        !match.ready,
      isMismatch:
        ingredient.startIndex <= match.firstMismatchIndex &&
        match.firstMismatchIndex < ingredient.endIndex,
    };
  }

  getSelectedRecipe(recipes) {
    const selectedRecipeKey = this.getSelectedRecipeKey?.();

    if (!selectedRecipeKey) {
      return null;
    }

    return recipes.find((recipe) => recipe.key === selectedRecipeKey && recipe.unlocked) ?? null;
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
    };
  }

  formatIngredientGroup(ingredient) {
    return `- ${ingredient.quantity} ${ingredient.label}`;
  }

  formatGuideStepValue(ingredient, match) {
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

  groupAdjacentIngredients(ingredients) {
    const groups = [];

    for (const [index, ingredient] of ingredients.entries()) {
      const group = groups.at(-1);

      if (group?.itemTypeId === ingredient.itemTypeId) {
        group.quantity += 1;
        continue;
      }

      groups.push({
        slotIndex: index,
        itemTypeId: ingredient.itemTypeId,
        label: ingredient.label,
        quantity: 1,
      });
    }

    return groups;
  }

  ensureCauldronEmptyRow() {
    if (this.refs.cauldron.empty) {
      return this.refs.cauldron.empty;
    }

    const empty = document.createElement('div');
    empty.className = 'brewing-page__cauldron-empty';
    empty.textContent = 'empty';
    this.refs.cauldron.items.append(empty);
    this.refs.cauldron.empty = empty;
    return empty;
  }

  ensureIngredientRow(index) {
    if (this.ingredientRows[index]) {
      return this.ingredientRows[index];
    }

    const row = document.createElement('button');
    row.className = 'brewing-page__ingredient-row';
    row.type = 'button';
    row.addEventListener('click', (event) => {
      const slotIndex = Number(event.currentTarget.dataset.slotIndex);

      if (Number.isInteger(slotIndex)) {
        this.onRemoveIngredient(slotIndex);
      }
    });

    const label = document.createElement('span');
    label.className = 'row_key';

    const action = document.createElement('span');
    action.className = 'row_val';

    row.append(label, action);
    this.refs.cauldron.items.append(row);

    const refs = { row, label, action };
    this.ingredientRows[index] = refs;
    return refs;
  }

  renderActions(brewing) {
    const action = this.getPrimaryAction(brewing);

    this.setText(
      this.refs.actions.actionButtonLabel,
      action.hasCost ? `${action.label} ` : action.label,
    );
    this.setHidden(this.refs.actions.actionButtonCost, !action.hasCost);
    this.setText(
      this.refs.actions.actionButtonCost,
      action.hasCost ? `(${brewing.manaCost} mana)` : '',
    );
    this.setDisabled(this.refs.actions.actionButton, action.disabled);
    this.setAttribute(this.refs.actions.actionButton, 'data-action', action.id);
    this.setAttribute(
      this.refs.actions.actionButton,
      'aria-disabled',
      action.disabled ? 'true' : 'false',
    );
    this.setAttribute(
      this.refs.actions.actionButton,
      'aria-label',
      action.ariaLabel,
    );
    setNotificationBadge(this.refs.actions.actionButton, !action.disabled);
    this.setHidden(this.refs.actions.message, true);
    this.setText(this.refs.actions.message, '');
    this.renderAutoBrewButton(brewing);
  }

  renderAutoBrewButton(brewing) {
    const autoBrewButton = this.refs.cauldron?.autoBrewButton;

    if (!autoBrewButton) {
      return;
    }

    this.setText(autoBrewButton, 'auto brewing');
    this.setDisabled(autoBrewButton, false);
    this.setAttribute(
      autoBrewButton,
      'aria-label',
      'open auto brewing',
    );
    this.setAttribute(autoBrewButton, 'data-state', brewing.autoBrewEnabled ? 'on' : 'off');
    this.setAttribute(
      autoBrewButton,
      'aria-pressed',
      brewing.autoBrewEnabled ? 'true' : 'false',
    );
  }

  getPrimaryAction(brewing) {
    if (brewing.activeBrew) {
      if (brewing.activeBrew.canCollect || brewing.activeBrew.phase === 'ready') {
        const canCollect = Boolean(brewing.activeBrew.canCollect);
        return {
          id: 'collect',
          label: 'collect',
          hasCost: false,
          disabled: !canCollect,
          ariaLabel: canCollect
            ? `collect ${brewing.activeBrew.label}`
            : 'collect potion',
        };
      }

      if (
        brewing.activeBrew.canStartBottling ||
        brewing.activeBrew.phase === 'brewed' ||
        brewing.activeBrew.phase === 'bottling'
      ) {
        const canStartBottling = Boolean(brewing.activeBrew.canStartBottling);
        return {
          id: 'bottle',
          label: 'bottle',
          hasCost: false,
          disabled: !canStartBottling,
          ariaLabel: canStartBottling
            ? `start bottling ${brewing.activeBrew.label}`
            : 'start bottling',
        };
      }
    }

    const recipeLocked = Boolean(
      brewing.match && !brewing.match.unlocked && !brewing.match.discoverable,
    );
    const canBrew = brewing.canBrew && !recipeLocked;

    return {
      id: 'brew',
      label: 'brew',
      hasCost: !brewing.activeBrew && Number.isFinite(brewing.manaCost),
      disabled: !canBrew,
      ariaLabel: this.formatBrewAriaLabel(brewing),
    };
  }

  onHerbButtonClick(event, itemTypeId) {
    if (this.suppressNextClick) {
      event.preventDefault();
      event.stopPropagation();
      this.suppressNextClick = false;
      return;
    }

    this.onAddIngredient(itemTypeId);
  }

  onAddIngredient(itemTypeId) {
    const result = this.gameplayFacade.addBrewingIngredient(itemTypeId);

    if (!result.ok) {
      this.message = this.formatResultMessage(result);
      this.render(this.gameplayFacade.getSnapshot());
      this.flashMessage();
      return;
    }

    this.message = '';
    this.render(this.gameplayFacade.getSnapshot());
  }

  onRemoveIngredient(slotIndex) {
    const result = this.gameplayFacade.removeBrewingIngredientAt(slotIndex);

    if (!result.ok) {
      this.message = this.formatResultMessage(result);
      this.render(this.gameplayFacade.getSnapshot());
      this.flashMessage();
    } else {
      this.message = '';
      this.render(this.gameplayFacade.getSnapshot());
    }
  }

  onPrimaryAction() {
    if (this.refs.actions.actionButton.disabled) {
      return;
    }

    const action = this.refs.actions.actionButton.dataset.action;

    if (action === 'collect') {
      this.onCollect();
      return;
    }

    if (action === 'bottle') {
      this.onBottle();
      return;
    }

    this.onBrew();
  }

  onBrew() {
    const result = this.gameplayFacade.brewCauldron();

    if (result.ok) {
      this.message = `brewing ${result.potion.label}`;
    } else {
      this.message = this.formatResultMessage(result);
    }

    this.render(this.gameplayFacade.getSnapshot());
    this.flashMessage();
  }

  onBottle() {
    const result = this.gameplayFacade.startBrewingBottling();

    if (result.ok) {
      this.message = `bottling ${result.potion.label}`;
    } else {
      this.message = this.formatResultMessage(result);
    }

    this.render(this.gameplayFacade.getSnapshot());
    this.flashMessage();
  }

  onCollect() {
    const result = this.gameplayFacade.collectBrewingPotion();

    if (result.ok) {
      this.message = `collected ${result.potion.label}`;
    } else {
      this.message = this.formatResultMessage(result);
    }

    this.render(this.gameplayFacade.getSnapshot());
    this.flashMessage();
  }

  onDragStart(event, itemTypeId) {
    this.draggedItemTypeId = itemTypeId;
    event.dataTransfer?.setData('text/plain', String(itemTypeId));
    event.dataTransfer?.setDragImage?.(event.currentTarget, 8, 8);
  }

  onDragEnd() {
    this.draggedItemTypeId = null;
    this.refs.cauldron?.root.classList.remove('is-drag-over');
  }

  onDragOver(event) {
    event.preventDefault();
    this.refs.cauldron.root.classList.add('is-drag-over');
  }

  onDragLeave() {
    this.refs.cauldron.root.classList.remove('is-drag-over');
  }

  onDrop(event) {
    event.preventDefault();
    const itemTypeId = Number(event.dataTransfer?.getData('text/plain') || this.draggedItemTypeId);
    this.refs.cauldron.root.classList.remove('is-drag-over');

    if (Number.isInteger(itemTypeId) && itemTypeId > 0) {
      this.onAddIngredient(itemTypeId);
    }

    this.draggedItemTypeId = null;
  }

  onPointerDown(event, itemTypeId) {
    if (event.pointerType === 'mouse' || event.currentTarget.disabled) {
      return;
    }

    this.pointerDrag = {
      itemTypeId,
      source: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      ghost: null,
    };
    document.addEventListener('pointermove', this.handleDocumentPointerMove);
    document.addEventListener('pointerup', this.handleDocumentPointerUp);
  }

  onDocumentPointerMove(event) {
    if (!this.pointerDrag) {
      return;
    }

    if (!this.pointerDrag.dragging) {
      const deltaX = event.clientX - this.pointerDrag.startX;
      const deltaY = event.clientY - this.pointerDrag.startY;
      const distance = Math.hypot(deltaX, deltaY);

      if (distance < TOUCH_DRAG_DISTANCE) {
        return;
      }

      this.startPointerDrag(event);
    }

    event.preventDefault();
    this.moveGhost(event.clientX, event.clientY);
    this.refs.cauldron.root.classList.toggle(
      'is-drag-over',
      this.isPointInCauldron(event.clientX, event.clientY),
    );
  }

  onDocumentPointerUp(event) {
    if (!this.pointerDrag) {
      return;
    }

    const { itemTypeId, dragging, ghost } = this.pointerDrag;
    const droppedInCauldron = dragging && this.isPointInCauldron(event.clientX, event.clientY);
    ghost?.remove();
    this.refs.cauldron.root.classList.remove('is-drag-over');
    this.pointerDrag = null;
    document.removeEventListener('pointermove', this.handleDocumentPointerMove);
    document.removeEventListener('pointerup', this.handleDocumentPointerUp);

    if (dragging) {
      event.preventDefault();
      this.suppressNextClick = true;
      window.setTimeout(() => {
        this.suppressNextClick = false;
      }, 0);
    }

    if (droppedInCauldron) {
      this.onAddIngredient(itemTypeId);
    }
  }

  startPointerDrag(event) {
    const ghost = this.pointerDrag.source.cloneNode(true);
    ghost.className = 'brewing-page__drag-ghost';
    document.body.append(ghost);
    this.pointerDrag.dragging = true;
    this.pointerDrag.ghost = ghost;
    this.moveGhost(event.clientX, event.clientY);
  }

  moveGhost(clientX, clientY) {
    if (!this.pointerDrag?.ghost) {
      return;
    }

    this.pointerDrag.ghost.style.left = `${clientX + 6}px`;
    this.pointerDrag.ghost.style.top = `${clientY + 6}px`;
  }

  isPointInCauldron(clientX, clientY) {
    const rect = this.refs.cauldron.root.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  formatResultMessage(result) {
    if (result.reason === 'research_not_unlocked') {
      return 'research not yet unlocked';
    }

    if (result.reason === 'not_enough_mana') {
      return 'not enough mana';
    }

    if (result.reason === 'not_enough_item' || result.reason === 'not_enough_ingredients') {
      return 'missing herbs';
    }

    if (result.reason === 'cauldron_full') {
      return 'cauldron full';
    }

    if (result.reason === 'cauldron_empty') {
      return 'cauldron empty';
    }

    if (result.reason === 'brew_in_progress') {
      return 'brewing';
    }

    if (result.reason === 'brew_not_done') {
      return 'wait for brew';
    }

    if (result.reason === 'auto_brew_recipe_required') {
      return 'select recipe for auto brew';
    }

    if (result.reason === 'bottling_in_progress') {
      return 'bottling';
    }

    if (result.reason === 'bottling_done') {
      return 'collect potion';
    }

    if (result.reason === 'bottling_not_done') {
      return 'bottling';
    }

    if (result.reason === 'no_brew') {
      return 'nothing to collect';
    }

    return 'cannot brew';
  }

  formatCauldronCount(brewing) {
    const count = brewing.ingredients.length;
    const max = Number.isFinite(brewing.maxIngredients) ? brewing.maxIngredients : '?';
    return `${count}/${max}`;
  }

  formatCauldronStatus(brewing) {
    const count = brewing.ingredients.length;
    if (brewing.activeBrew) {
      return '';
    }

    if (count === 0) {
      return '';
    }

    if (brewing.match) {
      if (brewing.match.unlocked) {
        return `matches ${brewing.match.label}`;
      }

      return brewing.match.discoverable
        ? 'unknown recipe'
        : `${brewing.match.label} locked`;
    }

    return 'unknown mix';
  }

  formatActionHint(brewing) {
    if (brewing.activeBrew) {
      if (brewing.activeBrew.canCollect) {
        return '';
      }

      if (brewing.activeBrew.canStartBottling) {
        return '';
      }

      return brewing.activeBrew.phase === 'bottling'
        ? 'wait for bottling'
        : 'wait for brew';
    }

    if (brewing.ingredients.length === 0) {
      return 'need herbs';
    }

    if (brewing.match && !brewing.match.unlocked && !brewing.match.discoverable) {
      return 'recipe locked';
    }

    if (!brewing.hasEnoughIngredients) {
      return 'missing herbs';
    }

    if (!brewing.hasEnoughMana) {
      return `need ${brewing.manaCost} mana`;
    }

    if (brewing.match?.unlocked || brewing.match?.discoverable) {
      return '';
    }

    if (brewing.canBrew) {
      return 'no recipe found';
    }

    return 'cannot brew';
  }

  formatActiveBrewText(activeBrew) {
    if (activeBrew.canCollect) {
      return `bottled ${activeBrew.label}`;
    }

    if (activeBrew.canStartBottling) {
      return `brewed ${activeBrew.label}`;
    }

    const seconds = Math.ceil(activeBrew.remainingMs / 1_000);
    return `${this.getActivePhaseLabel(activeBrew)} ${activeBrew.label} ${seconds}s`;
  }

  formatActiveProgressAriaLabel(activeBrew) {
    if (activeBrew.canCollect) {
      return 'Bottling complete';
    }

    if (activeBrew.canStartBottling) {
      return 'Brewing complete';
    }

    return activeBrew.phase === 'bottling' ? 'Bottling progress' : 'Brewing progress';
  }

  getActivePhaseLabel(activeBrew) {
    return activeBrew.phase === 'bottling' ? 'bottling' : 'brewing';
  }

  formatBrewAriaLabel(brewing) {
    const costLabel = Number.isFinite(brewing.manaCost)
      ? `, costs ${brewing.manaCost} mana`
      : '';

    if (brewing.match?.unlocked) {
      return `brew ${brewing.match.label}${costLabel}`;
    }

    if (brewing.match?.discoverable) {
      return `brew unknown recipe${costLabel}`;
    }

    if (brewing.match && !brewing.match.unlocked) {
      return `recipe locked${costLabel}`;
    }

    if (brewing.ingredients.length > 0) {
      return `brew Wasted Potion${costLabel}`;
    }

    return `brew${costLabel}`;
  }

  flashMessage() {
    if (!this.refs.actions?.message.textContent) {
      return;
    }

    this.refs.actions.message.classList.remove('is-updated');
    void this.refs.actions.message.offsetWidth;
    this.refs.actions.message.classList.add('is-updated');
  }

  setText(element, text) {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }

  setHidden(element, hidden) {
    if (element.hidden !== hidden) {
      element.hidden = hidden;
    }
  }

  setDisabled(element, disabled) {
    if (element.disabled !== disabled) {
      element.disabled = disabled;
    }
  }

  setDraggable(element, draggable) {
    if (element.draggable !== draggable) {
      element.draggable = draggable;
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

  setStyleWidth(element, value) {
    if (element.style.width !== value) {
      element.style.width = value;
    }
  }
}
