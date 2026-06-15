import {
  getCompletedResearchIds,
  isItemResearched,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setResourceColor } from '../../shared/resourceColor.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';

const AUTO_BREW_CAULDRON_RESEARCH_ID = 'automation:autoBrewCauldron:1';
const TOUCH_DRAG_DISTANCE = 8;
const NATIVE_HERB_DRAG_QUERY = '(hover: hover) and (pointer: fine)';

export class BrewingCauldronManager {
  constructor({
    gameplayFacade,
    getSelectedRecipeKey,
    onOpenSelectRecipe,
    onCurrentCauldronChange,
    onRewardNotice,
    rewardEventsAvailable = false,
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.getSelectedRecipeKey = getSelectedRecipeKey;
    this.onOpenSelectRecipe = onOpenSelectRecipe;
    this.onCurrentCauldronChange = onCurrentCauldronChange;
    this.onRewardNotice = onRewardNotice;
    this.rewardEventsAvailable = rewardEventsAvailable;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.herbRows = new Map();
    this.herbRowsSignature = '';
    this.cauldronRefs = new Map();
    this.cauldronRefsSignature = '';
    this.selectedCauldronIndex = 0;
    this.herbsExpanded = false;
    this.message = null;
    this.draggedItemTypeId = null;
    this.pointerDrag = null;
    this.suppressNextClick = false;
    this.handleDocumentPointerMove = (event) => this.onDocumentPointerMove(event);
    this.handleDocumentPointerUp = (event) => this.onDocumentPointerUp(event);
    this.handleDocumentPointerCancel = () => this.cancelPointerDrag();
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
    this.refs.cauldrons = document.createElement('div');
    this.refs.cauldrons.className = 'brewing-page__cauldrons';
    this.root.append(this.refs.herbs.root, this.refs.cauldrons);
    parent.append(this.root);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.removePointerDragListeners();
    this.pointerDrag?.ghost?.remove();
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.herbRows.clear();
    this.herbRowsSignature = '';
    this.cauldronRefs.clear();
    this.cauldronRefsSignature = '';
    this.selectedCauldronIndex = 0;
    this.herbsExpanded = false;
    this.message = null;
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

    const count = document.createElement('div');
    count.className = 'brewing-page__herbs-count';
    count.textContent = '0/0';

    const toggle = document.createElement('button');
    toggle.className = 'brewing-page__herbs-toggle';
    toggle.type = 'button';
    toggle.textContent = 'expand';
    toggle.addEventListener('click', () => this.toggleHerbsExpanded());

    const rows = document.createElement('div');
    rows.className = 'brewing-page__herb-rows';
    root.append(title, count, rows, toggle);

    return { root, count, rows, toggle };
  }

  createCauldronBox(cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const root = document.createElement('section');
    root.className = 'brewing-page__cauldron style-box';
    root.dataset.cauldronIndex = String(safeCauldronIndex);
    root.setAttribute('aria-label', `Cauldron ${safeCauldronIndex + 1}`);
    root.addEventListener('pointerdown', () => this.selectCauldron(safeCauldronIndex));
    root.addEventListener('dragover', (event) =>
      this.onDragOver(event, safeCauldronIndex),
    );
    root.addEventListener('dragleave', () => this.onDragLeave(safeCauldronIndex));
    root.addEventListener('drop', (event) => this.onDrop(event, safeCauldronIndex));

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = `cauldron ${safeCauldronIndex + 1}`;

    const count = document.createElement('div');
    count.className = 'brewing-page__cauldron-count';
    count.textContent = '0/0';

    const selectRecipeButton = document.createElement('button');
    selectRecipeButton.className = 'brewing-page__cauldron-select-recipe-text';
    selectRecipeButton.type = 'button';
    selectRecipeButton.textContent = 'select recipe';
    selectRecipeButton.setAttribute('aria-haspopup', 'dialog');
    selectRecipeButton.addEventListener('click', () => {
      this.selectCauldron(safeCauldronIndex);
      this.onOpenSelectRecipe?.(safeCauldronIndex);
    });

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

    const actions = this.createActions(safeCauldronIndex);

    activeProgress.append(activeProgressFill, activeProgressText);
    active.append(activeText, activeProgress);
    root.append(title, count, guide, status, items, active, actions.root, selectRecipeButton);
    return {
      cauldronIndex: safeCauldronIndex,
      root,
      count,
      guide,
      recipeRow,
      recipeLabel,
      recipeValue,
      guideSequence,
      status,
      selectRecipeButton,
      items,
      active,
      activeText,
      activeProgress,
      activeProgressFill,
      activeProgressText,
      actions,
      ingredientRows: [],
      cauldronGuideRows: [],
    };
  }

  createActions(cauldronIndex = 0) {
    const root = document.createElement('div');
    root.className = 'brewing-page__actions';
    root.setAttribute('aria-live', 'polite');

    const actionButton = document.createElement('button');
    actionButton.className = 'style-button brewing-page__action-button';
    actionButton.type = 'button';
    actionButton.addEventListener('click', () => this.onPrimaryAction(cauldronIndex));

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
      autoBrewAvailable: this.isAutoBrewAvailable(snapshot),
    };
    brewing.cauldrons = this.getCauldrons(brewing);
    this.normalizeSelectedCauldron(brewing.cauldrons);
    for (const cauldron of brewing.cauldrons) {
      cauldron.herbs = brewing.herbs;
      cauldron.autoBrewAvailable = brewing.autoBrewAvailable;
      cauldron.autoBrewEnabled = brewing.autoBrewEnabled;
      cauldron.selectedRecipe = this.getSelectedRecipe(
        brewing.recipes ?? [],
        cauldron.cauldronIndex,
      );
    }
    this.syncHerbRows(brewing.herbs);
    this.renderHerbs(snapshot, brewing);
    this.syncCauldrons(brewing.cauldrons);
    for (const cauldron of brewing.cauldrons) {
      const refs = this.cauldronRefs.get(cauldron.cauldronIndex);
      if (refs) {
        this.renderCauldron(refs, cauldron);
        this.renderActions(refs, cauldron);
      }
    }
  }

  getCauldrons(brewing) {
    const cauldrons = Array.isArray(brewing.cauldrons) ? brewing.cauldrons : [];

    if (cauldrons.length > 0) {
      return cauldrons.map((cauldron, index) => ({
        ...cauldron,
        cauldronIndex: this.normalizeCauldronIndex(cauldron.cauldronIndex ?? index),
        cauldronNumber: cauldron.cauldronNumber ?? index + 1,
      }));
    }

    return [
      {
        ...brewing,
        cauldronIndex: this.normalizeCauldronIndex(brewing.cauldronIndex ?? 0),
        cauldronNumber: brewing.cauldronNumber ?? 1,
      },
    ];
  }

  syncCauldrons(cauldrons) {
    const signature = cauldrons
      .map((cauldron) => `${cauldron.cauldronIndex}:${cauldron.cauldronNumber}`)
      .join('|');

    if (signature === this.cauldronRefsSignature) {
      return;
    }

    const visibleIndexes = new Set(cauldrons.map((cauldron) => cauldron.cauldronIndex));

    for (const [cauldronIndex, refs] of this.cauldronRefs.entries()) {
      if (visibleIndexes.has(cauldronIndex)) {
        continue;
      }

      refs.root.remove();
      this.cauldronRefs.delete(cauldronIndex);
    }

    for (const cauldron of cauldrons) {
      if (this.cauldronRefs.has(cauldron.cauldronIndex)) {
        continue;
      }

      this.cauldronRefs.set(
        cauldron.cauldronIndex,
        this.createCauldronBox(cauldron.cauldronIndex),
      );
    }

    this.refs.cauldrons.replaceChildren(
      ...cauldrons
        .map((cauldron) => this.cauldronRefs.get(cauldron.cauldronIndex)?.root)
        .filter(Boolean),
    );
    this.cauldronRefsSignature = signature;
  }

  normalizeSelectedCauldron(cauldrons) {
    if (
      cauldrons.some((cauldron) => cauldron.cauldronIndex === this.selectedCauldronIndex)
    ) {
      return;
    }

    this.selectCauldron(cauldrons[0]?.cauldronIndex ?? 0);
  }

  selectCauldron(cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);

    if (this.selectedCauldronIndex === safeCauldronIndex) {
      return;
    }

    this.selectedCauldronIndex = safeCauldronIndex;
    this.syncCurrentCauldronState();
    this.onCurrentCauldronChange?.(safeCauldronIndex);
  }

  syncCurrentCauldronState() {
    for (const [cauldronIndex, refs] of this.cauldronRefs.entries()) {
      refs.root.classList.toggle('is-current', cauldronIndex === this.selectedCauldronIndex);
    }
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
      button.draggable = false;
      button.dataset.tutorialId = `brewing:herb:${herb.key}`;
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
    const targetCauldron = this.getAddTargetCauldron(brewing.cauldrons);
    const canAddToAnyCauldron = Boolean(targetCauldron);
    const hiddenStartIndex = this.herbsExpanded ? brewing.herbs.length : 5;

    for (const herb of brewing.herbs) {
      const refs = this.herbRows.get(herb.itemTypeId);
      const disabled =
        herb.availableQuantity <= 0 || !canAddToAnyCauldron;
      const rowIndex = brewing.herbs.indexOf(herb);

      refs.row.classList.toggle('is-empty', herb.availableQuantity <= 0);
      refs.row.classList.toggle('is-locked', false);
      this.setHidden(refs.row, rowIndex >= hiddenStartIndex);
      this.setText(refs.label, herb.label);
      setItemIconLabel(refs.label, 'herb', herb.key);
      this.setText(refs.quantity, String(herb.availableQuantity));
      this.setDisabled(refs.button, disabled);
      this.setDraggable(refs.button, !disabled && this.canUseNativeHerbDrag());
      this.setAttribute(refs.button, 'aria-disabled', disabled ? 'true' : 'false');
      this.setAttribute(refs.button, 'aria-label', `add ${herb.label} to cauldron`);
      setNotificationBadge(refs.button, !disabled);
    }

    this.renderHerbsToggle(brewing.herbs.length);
  }

  getAddTargetCauldron(cauldrons = []) {
    const selected = cauldrons.find(
      (cauldron) => cauldron.cauldronIndex === this.selectedCauldronIndex,
    );

    if (selected?.canAddIngredient && !selected.activeBrew) {
      return selected;
    }

    return (
      cauldrons.find((cauldron) => cauldron.canAddIngredient && !cauldron.activeBrew) ??
      null
    );
  }

  renderHerbsToggle(herbCount) {
    const collapsedCount = Math.min(herbCount, 5);
    const visibleCount = this.herbsExpanded ? herbCount : collapsedCount;
    const canToggle = herbCount > 5;

    this.refs.herbs.root.classList.toggle('is-expanded', this.herbsExpanded);
    this.setText(this.refs.herbs.count, `${visibleCount}/${herbCount}`);
    this.setHidden(this.refs.herbs.toggle, !canToggle);
    this.setText(this.refs.herbs.toggle, this.herbsExpanded ? 'collapse' : 'expand');
    this.setAttribute(
      this.refs.herbs.toggle,
      'aria-expanded',
      this.herbsExpanded ? 'true' : 'false',
    );
  }

  toggleHerbsExpanded() {
    this.herbsExpanded = !this.herbsExpanded;
    this.render(this.gameplayFacade.getSnapshot());
  }

  renderCauldron(refs, brewing) {
    refs.root.classList.toggle('is-current', brewing.cauldronIndex === this.selectedCauldronIndex);
    this.setText(refs.count, this.formatCauldronCount(brewing));
    const statusText = this.formatCauldronStatus(brewing);
    this.setHidden(refs.status, statusText === '');
    this.setText(refs.status, statusText);
    this.renderCauldronGuide(refs, brewing);
    this.renderCauldronItems(refs, brewing);

    if (brewing.activeBrew) {
      this.setHidden(refs.active, false);
      this.setText(
        refs.activeText,
        this.formatActiveBrewText(brewing.activeBrew),
      );
      const progress = Number.isFinite(brewing.activeBrew.progress)
        ? brewing.activeBrew.progress
        : 0;
      const percent = Math.round(Math.max(0, Math.min(100, progress * 100)));
      this.setStyleWidth(refs.activeProgressFill, `${percent}%`);
      this.setText(refs.activeProgressText, '');
      this.setAttribute(
        refs.activeProgress,
        'aria-label',
        this.formatActiveProgressAriaLabel(brewing.activeBrew),
      );
      this.setAttribute(refs.activeProgress, 'aria-valuenow', String(percent));
    } else {
      this.setHidden(refs.active, true);
      this.setText(refs.activeText, '');
      this.setStyleWidth(refs.activeProgressFill, '0%');
      this.setText(refs.activeProgressText, '');
      this.setAttribute(refs.activeProgress, 'aria-valuenow', '0');
    }
  }

  renderCauldronItems(refs, brewing) {
    this.ensureCauldronEmptyRow(refs);

    const hasIngredients = brewing.ingredients.length > 0;
    const showGuideContents = Boolean(brewing.selectedRecipe && !brewing.activeBrew);
    const showEmpty = !hasIngredients && !brewing.activeBrew && !showGuideContents;
    refs.items.classList.toggle('is-empty', showEmpty);
    this.setHidden(refs.empty, !showEmpty);
    this.setText(refs.empty, showEmpty ? 'empty' : '');

    if (showGuideContents) {
      this.hideExtraIngredientRows(refs, 0);
      return;
    }

    const ingredientGroups = this.groupAdjacentIngredients(brewing.ingredients);

    for (const [index, ingredient] of ingredientGroups.entries()) {
      const rowRefs = this.ensureIngredientRow(refs, index);
      this.setHidden(rowRefs.row, false);
      this.setAttribute(rowRefs.row, 'data-slot-index', String(ingredient.slotIndex));
      this.setAttribute(rowRefs.row, 'aria-label', `remove one ${ingredient.label} from cauldron`);
      setResourceColor(rowRefs.row, 'herb');
      this.setText(rowRefs.label, `- ${ingredient.quantity} ${ingredient.label}`);
      this.setText(rowRefs.action, 'remove');
    }

    this.hideExtraIngredientRows(refs, ingredientGroups.length);
  }

  hideExtraIngredientRows(cauldronRefs, visibleCount) {
    for (let index = visibleCount; index < cauldronRefs.ingredientRows.length; index += 1) {
      const rowRefs = cauldronRefs.ingredientRows[index];
      this.setHidden(rowRefs.row, true);
      this.removeAttribute(rowRefs.row, 'aria-label');
      this.removeAttribute(rowRefs.row, 'data-slot-index');
      setResourceColor(rowRefs.row, null);
      this.setText(rowRefs.label, '');
      this.setText(rowRefs.action, '');
    }
  }

  renderCauldronGuide(refs, brewing) {
    const recipe = brewing.selectedRecipe;
    const showGuide = Boolean(recipe && !brewing.activeBrew);
    this.setHidden(refs.guide, !showGuide);

    if (!showGuide) {
      this.setText(refs.recipeValue, '');
      this.hideExtraCauldronGuideRows(refs, 0);
      return;
    }

    this.setText(refs.recipeValue, recipe.label);
    const targetIngredients = this.expandIngredientSequence(recipe.ingredients);
    const ingredientGroups = this.createIngredientGroups(recipe.ingredients);
    const match = this.getIngredientMatch(targetIngredients, brewing.ingredients);
    const missingQuantities = this.getMissingIngredientQuantities(recipe, brewing);
    let renderedRows = 0;

    for (const ingredient of ingredientGroups) {
      const rowRefs = this.ensureCauldronGuideRow(refs, renderedRows);
      const rowState = this.getCauldronGuideRowState(
        ingredient,
        brewing.ingredients,
        match,
        missingQuantities,
      );
      this.renderCauldronGuideRow(rowRefs, rowState);
      renderedRows += 1;
    }

    const extraGroups = this.groupAdjacentIngredients(
      brewing.ingredients.slice(targetIngredients.length),
    ).map((ingredient) => ({
      ...ingredient,
      slotIndex: ingredient.slotIndex + targetIngredients.length,
    }));

    for (const ingredient of extraGroups) {
      const rowRefs = this.ensureCauldronGuideRow(refs, renderedRows);
      this.renderCauldronGuideRow(rowRefs, {
        label: this.formatIngredientGroup(ingredient),
        value: 'remove',
        removeSlotIndex: ingredient.slotIndex + ingredient.quantity - 1,
        isPlaced: false,
        isNext: false,
        isMismatch: true,
      });
      renderedRows += 1;
    }

    this.hideExtraCauldronGuideRows(refs, renderedRows);
  }

  ensureCauldronGuideRow(cauldronRefs, index) {
    if (cauldronRefs.cauldronGuideRows[index]) {
      return cauldronRefs.cauldronGuideRows[index];
    }

    const row = document.createElement('button');
    row.className = 'brewing-page__cauldron-guide-step';
    row.type = 'button';
    row.addEventListener('click', (event) => {
      const slotIndex = Number(event.currentTarget.dataset.slotIndex);
      const cauldronIndex = Number(event.currentTarget.dataset.cauldronIndex);

      if (Number.isInteger(slotIndex)) {
        this.onRemoveIngredient(slotIndex, cauldronIndex);
      }
    });

    const label = document.createElement('span');
    label.className = 'row_key';

    const value = document.createElement('span');
    value.className = 'row_val';

    row.append(label, value);
    this.setAttribute(row, 'data-cauldron-index', String(cauldronRefs.cauldronIndex));
    cauldronRefs.guideSequence.append(row);

    const rowRefs = { row, label, value };
    cauldronRefs.cauldronGuideRows[index] = rowRefs;
    return rowRefs;
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

  hideExtraCauldronGuideRows(cauldronRefs, visibleCount) {
    for (let index = visibleCount; index < cauldronRefs.cauldronGuideRows.length; index += 1) {
      const rowRefs = cauldronRefs.cauldronGuideRows[index];
      this.setHidden(rowRefs.row, true);
      this.setDisabled(rowRefs.row, true);
      this.removeAttribute(rowRefs.row, 'data-slot-index');
      this.removeAttribute(rowRefs.row, 'aria-label');
      this.setAttribute(rowRefs.row, 'aria-disabled', 'true');
      rowRefs.row.classList.remove('is-placed', 'is-next', 'is-mismatch');
      this.setText(rowRefs.label, '');
      this.setText(rowRefs.value, '');
    }
  }

  getCauldronGuideRowState(ingredient, ingredients, match, missingQuantities = new Map()) {
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
    const missingQuantity = missingQuantities.get(ingredient.itemTypeId) ?? 0;

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

    if (!hasIngredient && missingQuantity > 0) {
      return {
        label: this.formatIngredientGroup(ingredient),
        value: `missing ${missingQuantity}`,
        removeSlotIndex: null,
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

  getSelectedRecipe(recipes, cauldronIndex = this.selectedCauldronIndex) {
    const selectedRecipeKey = this.getSelectedRecipeKey?.(cauldronIndex);

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

  getMissingIngredientQuantities(recipe, brewing) {
    const requiredQuantities = new Map();

    for (const ingredient of recipe.ingredients ?? []) {
      const quantity = this.normalizeIngredientQuantity(ingredient);
      requiredQuantities.set(
        ingredient.itemTypeId,
        (requiredQuantities.get(ingredient.itemTypeId) ?? 0) + quantity,
      );
    }

    const ownedQuantities = new Map(
      (brewing.herbs ?? []).map((herb) => [herb.itemTypeId, herb.quantity ?? 0]),
    );
    const missingQuantities = new Map();

    for (const [itemTypeId, requiredQuantity] of requiredQuantities) {
      const ownedQuantity = ownedQuantities.get(itemTypeId) ?? 0;
      const missingQuantity = requiredQuantity - ownedQuantity;

      if (missingQuantity > 0) {
        missingQuantities.set(itemTypeId, missingQuantity);
      }
    }

    return missingQuantities;
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

  ensureCauldronEmptyRow(cauldronRefs) {
    if (cauldronRefs.empty) {
      return cauldronRefs.empty;
    }

    const empty = document.createElement('div');
    empty.className = 'brewing-page__cauldron-empty';
    empty.textContent = 'empty';
    cauldronRefs.items.append(empty);
    cauldronRefs.empty = empty;
    return empty;
  }

  ensureIngredientRow(cauldronRefs, index) {
    if (cauldronRefs.ingredientRows[index]) {
      return cauldronRefs.ingredientRows[index];
    }

    const row = document.createElement('button');
    row.className = 'brewing-page__ingredient-row';
    row.type = 'button';
    row.addEventListener('click', (event) => {
      const slotIndex = Number(event.currentTarget.dataset.slotIndex);
      const cauldronIndex = Number(event.currentTarget.dataset.cauldronIndex);

      if (Number.isInteger(slotIndex)) {
        this.onRemoveIngredient(slotIndex, cauldronIndex);
      }
    });

    const label = document.createElement('span');
    label.className = 'row_key';

    const action = document.createElement('span');
    action.className = 'row_val';

    row.append(label, action);
    this.setAttribute(row, 'data-cauldron-index', String(cauldronRefs.cauldronIndex));
    cauldronRefs.items.append(row);

    const refs = { row, label, action };
    cauldronRefs.ingredientRows[index] = refs;
    return refs;
  }

  renderActions(refs, brewing) {
    const action = this.getPrimaryAction(brewing);

    this.setText(
      refs.actions.actionButtonLabel,
      action.hasCost ? `${action.label} ` : action.label,
    );
    this.setHidden(refs.actions.actionButtonCost, !action.hasCost);
    this.setResourceText(
      refs.actions.actionButtonCost,
      action.hasCost ? `(${brewing.manaCost} mana)` : '',
    );
    this.setDisabled(refs.actions.actionButton, action.disabled);
    this.setAttribute(refs.actions.actionButton, 'data-action', action.id);
    this.setAttribute(refs.actions.actionButton, 'data-tutorial-id', 'brewing:action');
    this.setAttribute(
      refs.actions.actionButton,
      'aria-disabled',
      action.disabled ? 'true' : 'false',
    );
    this.setAttribute(
      refs.actions.actionButton,
      'aria-label',
      action.ariaLabel,
    );
    setNotificationBadge(refs.actions.actionButton, !action.disabled);
    this.setHidden(refs.actions.message, true);
    this.setText(refs.actions.message, '');
    this.renderSelectRecipeButton(refs, brewing);
  }

  renderSelectRecipeButton(refs, brewing) {
    const selectRecipeButton = refs?.selectRecipeButton;

    if (!selectRecipeButton) {
      return;
    }

    const visible = brewing.autoBrewAvailable === true;
    this.setHidden(selectRecipeButton, !visible);
    refs.actions.root.classList.toggle('is-centered', !visible);

    if (!visible) {
      this.setDisabled(selectRecipeButton, true);
      this.setAttribute(selectRecipeButton, 'aria-hidden', 'true');
      this.removeAttribute(selectRecipeButton, 'aria-label');
      this.removeAttribute(selectRecipeButton, 'data-state');
      this.removeAttribute(selectRecipeButton, 'aria-pressed');
      return;
    }

    this.setText(selectRecipeButton, 'select recipe');
    this.setDisabled(selectRecipeButton, false);
    this.removeAttribute(selectRecipeButton, 'aria-hidden');
    this.setAttribute(
      selectRecipeButton,
      'aria-label',
      'open select recipe',
    );
    this.setAttribute(selectRecipeButton, 'data-state', brewing.autoBrewEnabled ? 'on' : 'off');
    this.setAttribute(
      selectRecipeButton,
      'aria-pressed',
      brewing.autoBrewEnabled ? 'true' : 'false',
    );
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

  onAddIngredient(itemTypeId, cauldronIndex = this.selectedCauldronIndex) {
    const snapshot = this.gameplayFacade.getSnapshot();
    const brewing = {
      ...snapshot?.brewing,
      cauldrons: this.getCauldrons(snapshot?.brewing ?? {}),
    };
    const requestedCauldron = brewing.cauldrons.find(
      (cauldron) => cauldron.cauldronIndex === cauldronIndex,
    );
    const targetCauldron =
      requestedCauldron?.canAddIngredient && !requestedCauldron.activeBrew
        ? requestedCauldron
        : this.getAddTargetCauldron(brewing.cauldrons);
    const targetCauldronIndex = targetCauldron?.cauldronIndex ?? cauldronIndex;
    const result = this.gameplayFacade.addBrewingIngredient(
      itemTypeId,
      targetCauldronIndex,
    );

    if (!result.ok) {
      this.message = {
        cauldronIndex: targetCauldronIndex,
        text: this.formatResultMessage(result),
      };
      this.render(this.gameplayFacade.getSnapshot());
      this.flashMessage(targetCauldronIndex);
      return;
    }

    this.selectCauldron(targetCauldronIndex);
    this.message = null;
    this.render(this.gameplayFacade.getSnapshot());
  }

  onRemoveIngredient(slotIndex, cauldronIndex = this.selectedCauldronIndex) {
    const targetCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const result = this.gameplayFacade.removeBrewingIngredientAt(
      slotIndex,
      targetCauldronIndex,
    );

    if (!result.ok) {
      this.message = {
        cauldronIndex: targetCauldronIndex,
        text: this.formatResultMessage(result),
      };
      this.render(this.gameplayFacade.getSnapshot());
      this.flashMessage(targetCauldronIndex);
    } else {
      this.message = null;
      this.render(this.gameplayFacade.getSnapshot());
    }
  }

  onPrimaryAction(cauldronIndex = this.selectedCauldronIndex) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const refs = this.cauldronRefs.get(safeCauldronIndex);

    if (!refs || refs.actions.actionButton.disabled) {
      return;
    }

    this.selectCauldron(safeCauldronIndex);
    const action = refs.actions.actionButton.dataset.action;

    if (action === 'collect') {
      this.onCollect(safeCauldronIndex);
      return;
    }

    if (action === 'bottle') {
      this.onBottle(safeCauldronIndex);
      return;
    }

    this.onBrew(safeCauldronIndex);
  }

  onBrew(cauldronIndex = this.selectedCauldronIndex) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const result = this.gameplayFacade.brewCauldron(safeCauldronIndex);

    if (result.ok) {
      this.message = {
        cauldronIndex: safeCauldronIndex,
        text: `brewing ${result.potion.label}`,
      };
    } else {
      this.message = {
        cauldronIndex: safeCauldronIndex,
        text: this.formatResultMessage(result),
      };
    }

    this.render(this.gameplayFacade.getSnapshot());
    this.flashMessage(safeCauldronIndex);
  }

  onBottle(cauldronIndex = this.selectedCauldronIndex) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const result = this.gameplayFacade.startBrewingBottling(safeCauldronIndex);

    if (result.ok) {
      this.message = {
        cauldronIndex: safeCauldronIndex,
        text: `bottling ${result.potion.label}`,
      };
    } else {
      this.message = {
        cauldronIndex: safeCauldronIndex,
        text: this.formatResultMessage(result),
      };
    }

    this.render(this.gameplayFacade.getSnapshot());
    this.flashMessage(safeCauldronIndex);
  }

  onCollect(cauldronIndex = this.selectedCauldronIndex) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const result = this.gameplayFacade.collectBrewingPotion(safeCauldronIndex);

    if (result.ok) {
      this.message = {
        cauldronIndex: safeCauldronIndex,
        text: `collected ${result.potion.label}`,
      };
      if (!this.rewardEventsAvailable) {
        this.onRewardNotice?.({
          type: 'potion_collected',
          potion: result.potion,
          quantity: result.quantity,
        });
      }
    } else {
      this.message = {
        cauldronIndex: safeCauldronIndex,
        text: this.formatResultMessage(result),
      };
    }

    this.render(this.gameplayFacade.getSnapshot());
    this.flashMessage(safeCauldronIndex);
  }

  onDragStart(event, itemTypeId) {
    this.draggedItemTypeId = itemTypeId;
    event.dataTransfer?.setData('text/plain', String(itemTypeId));
    event.dataTransfer?.setDragImage?.(event.currentTarget, 8, 8);
  }

  onDragEnd() {
    this.draggedItemTypeId = null;
    this.clearCauldronDragState();
  }

  onDragOver(event, cauldronIndex = this.selectedCauldronIndex) {
    event.preventDefault();
    this.cauldronRefs.get(cauldronIndex)?.root.classList.add('is-drag-over');
  }

  onDragLeave(cauldronIndex = this.selectedCauldronIndex) {
    this.cauldronRefs.get(cauldronIndex)?.root.classList.remove('is-drag-over');
  }

  onDrop(event, cauldronIndex = this.selectedCauldronIndex) {
    event.preventDefault();
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const itemTypeId = Number(event.dataTransfer?.getData('text/plain') || this.draggedItemTypeId);
    this.cauldronRefs.get(safeCauldronIndex)?.root.classList.remove('is-drag-over');

    if (Number.isInteger(itemTypeId) && itemTypeId > 0) {
      this.selectCauldron(safeCauldronIndex);
      this.onAddIngredient(itemTypeId, safeCauldronIndex);
    }

    this.draggedItemTypeId = null;
  }

  onPointerDown(event, itemTypeId) {
    if (
      event.pointerType === 'mouse' ||
      event.currentTarget.disabled ||
      this.shouldKeepHerbListScrollNative(event.currentTarget)
    ) {
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
    document.addEventListener('pointercancel', this.handleDocumentPointerCancel);
  }

  shouldKeepHerbListScrollNative(target) {
    const rows = target?.closest?.('.brewing-page__herb-rows');
    return Boolean(rows && rows.scrollHeight > rows.clientHeight + 1);
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

      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        this.cancelPointerDrag();
        return;
      }

      this.startPointerDrag(event);
    }

    event.preventDefault();
    this.moveGhost(event.clientX, event.clientY);
    this.syncPointerDragTarget(event.clientX, event.clientY);
  }

  onDocumentPointerUp(event) {
    if (!this.pointerDrag) {
      return;
    }

    const { itemTypeId, dragging, ghost } = this.pointerDrag;
    const targetCauldronIndex = dragging
      ? this.getCauldronIndexAtPoint(event.clientX, event.clientY)
      : null;
    const droppedInCauldron = targetCauldronIndex !== null;
    ghost?.remove();
    this.clearCauldronDragState();
    this.pointerDrag = null;
    this.removePointerDragListeners();

    if (dragging) {
      event.preventDefault();
      this.suppressNextClick = true;
      window.setTimeout(() => {
        this.suppressNextClick = false;
      }, 0);
    }

    if (droppedInCauldron) {
      this.selectCauldron(targetCauldronIndex);
      this.onAddIngredient(itemTypeId, targetCauldronIndex);
    }
  }

  cancelPointerDrag() {
    this.pointerDrag?.ghost?.remove();
    this.clearCauldronDragState();
    this.pointerDrag = null;
    this.removePointerDragListeners();
  }

  removePointerDragListeners() {
    document.removeEventListener('pointermove', this.handleDocumentPointerMove);
    document.removeEventListener('pointerup', this.handleDocumentPointerUp);
    document.removeEventListener('pointercancel', this.handleDocumentPointerCancel);
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

  canUseNativeHerbDrag() {
    const view = this.root?.ownerDocument?.defaultView ?? globalThis.window;

    if (typeof view?.matchMedia !== 'function') {
      return true;
    }

    return view.matchMedia(NATIVE_HERB_DRAG_QUERY).matches;
  }

  syncPointerDragTarget(clientX, clientY) {
    const targetCauldronIndex = this.getCauldronIndexAtPoint(clientX, clientY);

    for (const [cauldronIndex, refs] of this.cauldronRefs.entries()) {
      refs.root.classList.toggle('is-drag-over', cauldronIndex === targetCauldronIndex);
    }
  }

  clearCauldronDragState() {
    for (const refs of this.cauldronRefs.values()) {
      refs.root.classList.remove('is-drag-over');
    }
  }

  getCauldronIndexAtPoint(clientX, clientY) {
    for (const [cauldronIndex, refs] of this.cauldronRefs.entries()) {
      const rect = refs.root.getBoundingClientRect();

      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return cauldronIndex;
      }
    }

    return null;
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
      return 'select recipe';
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
      return 'bottling complete';
    }

    if (activeBrew.canStartBottling) {
      return 'brewing complete';
    }

    return activeBrew.phase === 'bottling' ? 'bottling progress' : 'brewing progress';
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
      return `brew wasted potion${costLabel}`;
    }

    return `brew${costLabel}`;
  }

  flashMessage(cauldronIndex = this.selectedCauldronIndex) {
    const message = this.cauldronRefs.get(cauldronIndex)?.actions?.message;

    if (!message?.textContent) {
      return;
    }

    message.classList.remove('is-updated');
    void message.offsetWidth;
    message.classList.add('is-updated');
  }

  setText(element, text) {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }

  setResourceText(element, text) {
    if (element.textContent !== text) {
      setResourceIconText(element, text);
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

  normalizeCauldronIndex(cauldronIndex) {
    const safeCauldronIndex = Math.floor(Number(cauldronIndex));
    return Number.isInteger(safeCauldronIndex) && safeCauldronIndex >= 0
      ? safeCauldronIndex
      : 0;
  }
}
