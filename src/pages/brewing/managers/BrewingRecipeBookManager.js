import { setResourceColor } from '../../shared/resourceColor.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { getCompletedResearchIds } from '../../shared/itemResearchStatus.js';
import { automationResearchIds } from '../../../gameplay/automation/automationResearchIds.js';
import { createAssetAtlasSprite } from '../../../assets/atlas/atlasSprite.js';
import { getPotionIconFrameName } from '../../../assets/items/potions/potionIcons.js';

const RECIPES_PER_PAGE = 2;
const PAGES_PER_SPREAD = 2;
const RECIPES_PER_SPREAD = RECIPES_PER_PAGE * PAGES_PER_SPREAD;
const BOOK_SWIPE_THRESHOLD = 30;
const BOOK_TURN_CLASS_MS = 220;

const POTION_INFO_BY_KEY = Object.freeze({
  manaTonic: 'a plain workshop tonic for waking tired tools and tired hands.',
  minorHealingPotion: 'a small healer bottle for cuts, fever, and road work.',
  nettleVigor: 'a sharp green brew that keeps a worker upright through long chores.',
  calmingDraught: 'a quiet draught for steady nerves and easier sleep.',
  simpleAntidote: 'a bitter bottle kept near stings, rot, and bad water.',
  venomDraught: 'a dangerous mixture studied in small, careful doses.',
  briarWard: 'a thorn-scented ward for travelers crossing rough hedges.',
  lanternTonic: 'a bright tonic used when paths or cellars refuse to stay visible.',
  healingPotion: 'a stronger healer brew for wounds that minor bottles cannot cover.',
  moonlitFocus: 'a pale focus brew for careful copying, sorting, and night reading.',
  sunrootStamina: 'a warm field brew for hauling, digging, and stubborn work.',
  frostmossCleanse: 'a cold cleansing draught for smoke, grime, and sour wells.',
  sleepDraught: 'a heavy bottle for forced rest when worry will not leave.',
  elixirOfLife: 'a rare restorative kept for moments too serious for ordinary care.',
  starLuckPhiltre: 'a strange philtre poured when chance needs a small nudge.',
  dragonCourage: 'a hot courage brew for shaking knees and hard doors.',
  deepDreamVision: 'a dark seeing draught for dreams that remember useful things.',
  pactWard: 'a formal ward for seals, bargains, and unsafe promises.',
  silverleafSalve: 'a soft salve for clean bandages and slow-healing skin.',
  yarrowPoultice: 'a poultice brewed thick for bruises, sprains, and travel sores.',
  hyssopClarity: 'a clear draught for careful notes and unclouded thought.',
  valerianRest: 'a rest brew for sore bodies after work runs too long.',
  comfreyBalm: 'a heavy balm for bones, joints, and patient recovery.',
  nightshadeVeil: 'a shadowed veil carried only by careful hands.',
  belladonnaSight: 'a risky sight brew for glimpses best taken briefly.',
  wormwoodPurge: 'a harsh purge for sickness that will not leave politely.',
  snowdropBreath: 'a cold breath draught for smoke, panic, and winter air.',
  pearlrootDraught: 'a pale draught saved for rare cases and exact work.',
  ashenMemory: 'a gray memory brew for old rooms and older mistakes.',
  silverleafQuiet: 'a quieting brew for noise, fear, and crowded halls.',
  emberSight: 'a hot sight brew for finding the last spark in dark places.',
  thornSleep: 'a thorned sleep brew, useful only when handled with care.',
  glassMoonElixir: 'a clear moon elixir for nights when ordinary sense feels thin.',
  rootboundResolve: 'a stubborn root brew for standing ground under pressure.',
  nightOrchardTonic: 'a dark orchard tonic, sweet first and heavy after.',
  starlessCourage: 'a courage brew made for work done without witnesses.',
  frostveinDraught: 'a cold vein draught for heat, swelling, and fevered hands.',
  bloodlightWard: 'a red ward mixed for dangerous paths and bad omens.',
});

export class BrewingRecipeBookManager {
  constructor({
    gameplayFacade,
    getSelectedRecipeKey,
    getCurrentCauldronIndex,
    onSelectRecipe,
    onSelectBrewQuantity,
    onPrimaryAction,
    onRemoveIngredient,
    getPrimaryAction,
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.getSelectedRecipeKey = getSelectedRecipeKey;
    this.getCurrentCauldronIndex = getCurrentCauldronIndex;
    this.onSelectRecipe = onSelectRecipe;
    this.onSelectBrewQuantity = onSelectBrewQuantity;
    this.onPrimaryAction = onPrimaryAction;
    this.onRemoveIngredient = onRemoveIngredient;
    this.getPrimaryAction = getPrimaryAction;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.previousFocus = null;
    this.renderedSignature = null;
    this.currentSpreadIndex = 0;
    this.bookPointer = null;
    this.bookTurnClassTimeout = null;
    this.handlePopupClick = (event) => {
      if (event.target === this.refs.popup) {
        this.hide();
      }
    };
    this.handleKeydown = (event) => {
      if (!this.visible) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        this.hide();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.showPreviousSpread();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.showNextSpread();
      }
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
    this.currentSpreadIndex = 0;
    this.bookPointer = null;
    this.clearBookTurnClass();
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'brewing-page__recipes-popup';
    popup.addEventListener('click', this.handlePopupClick);

    const dialog = document.createElement('section');
    dialog.className = 'brewing-page__recipes-dialog style-dialog';
    dialog.setAttribute('aria-label', 'Cauldron');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'cauldron';

    const closeButton = document.createElement('button');
    closeButton.className = 'style-button brewing-page__recipes-close';
    closeButton.type = 'button';
    closeButton.dataset.tutorialId = 'brewing:recipes:close';
    closeButton.textContent = 'close';
    closeButton.addEventListener('click', () => this.hide());

    const book = this.createRecipeBook();
    const pagination = this.createRecipePagination();

    const currentSummary = this.createCurrentSummary();
    const actionSummary = this.createActionSummary();
    const quantitySummary = this.createQuantitySummary();
    const autoSummary = this.createAutoSummary();

    dialog.append(
      title,
      closeButton,
      currentSummary.root,
      actionSummary.root,
      quantitySummary.root,
      autoSummary.root,
      book.root,
      pagination.root,
    );
    popup.append(dialog);
    this.refs.dialog = dialog;
    this.refs.title = title;
    this.refs.currentSummary = currentSummary.root;
    this.refs.currentRows = currentSummary.rows;
    this.refs.actionSummary = actionSummary.root;
    this.refs.actionButton = actionSummary.button;
    this.refs.actionButtonLabel = actionSummary.label;
    this.refs.actionButtonCost = actionSummary.cost;
    this.refs.quantitySummary = quantitySummary.root;
    this.refs.quantityOptions = quantitySummary.options;
    this.refs.autoSummary = autoSummary.root;
    this.refs.autoStateButton = autoSummary.stateButton;
    this.refs.autoRecipeValue = autoSummary.recipeValue;
    this.refs.book = book.root;
    this.refs.leftPage = book.leftPage;
    this.refs.rightPage = book.rightPage;
    this.refs.previousSpreadButton = pagination.previousButton;
    this.refs.nextSpreadButton = pagination.nextButton;
    this.refs.pageLabel = pagination.pageLabel;
    return popup;
  }

  createRecipeBook() {
    const root = document.createElement('div');
    root.className = 'brewing-page__recipe-book';
    root.dataset.pageSwipeBlock = 'true';
    root.addEventListener('pointerdown', (event) => this.onBookPointerDown(event));
    root.addEventListener('pointerup', (event) => this.onBookPointerUp(event));
    root.addEventListener('pointercancel', () => {
      this.bookPointer = null;
    });

    const leftPage = document.createElement('section');
    leftPage.className = 'brewing-page__recipe-page brewing-page__recipe-page--left';
    leftPage.setAttribute('aria-label', 'left recipe page');

    const rightPage = document.createElement('section');
    rightPage.className = 'brewing-page__recipe-page brewing-page__recipe-page--right';
    rightPage.setAttribute('aria-label', 'right recipe page');

    root.append(leftPage, rightPage);
    return { root, leftPage, rightPage };
  }

  createRecipePagination() {
    const root = document.createElement('div');
    root.className = 'brewing-page__recipe-book-controls';

    const previousButton = document.createElement('button');
    previousButton.className = 'brewing-page__recipe-page-button';
    previousButton.type = 'button';
    previousButton.textContent = 'prev';
    previousButton.addEventListener('click', () => this.showPreviousSpread());

    const pageLabel = document.createElement('span');
    pageLabel.className = 'brewing-page__recipe-page-label';

    const nextButton = document.createElement('button');
    nextButton.className = 'brewing-page__recipe-page-button';
    nextButton.type = 'button';
    nextButton.textContent = 'next';
    nextButton.addEventListener('click', () => this.showNextSpread());

    root.append(previousButton, pageLabel, nextButton);
    return { root, previousButton, pageLabel, nextButton };
  }

  createCurrentSummary() {
    const root = document.createElement('div');
    root.className = 'brewing-page__cauldron-dialog-current';

    const title = document.createElement('div');
    title.className = 'brewing-page__cauldron-dialog-section-title';
    title.textContent = 'inside';

    const rows = document.createElement('div');
    rows.className = 'brewing-page__cauldron-dialog-current-rows';

    root.append(title, rows);
    return { root, rows };
  }

  createActionSummary() {
    const root = document.createElement('div');
    root.className = 'brewing-page__cauldron-dialog-action';

    const button = document.createElement('button');
    button.className = 'style-button brewing-page__dialog-action-button';
    button.type = 'button';
    button.addEventListener('click', () => {
      this.onPrimaryAction?.(this.getSafeCurrentCauldronIndex());
      this.render(this.gameplayFacade.getSnapshot());
    });

    const label = document.createElement('span');
    label.className = 'brewing-page__dialog-action-label';

    const cost = document.createElement('span');
    cost.className = 'brewing-page__dialog-action-cost';

    button.append(label, cost);
    root.append(button);
    return { root, button, label, cost };
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

  createQuantitySummary() {
    const root = document.createElement('div');
    root.className = 'brewing-page__quantity-summary';
    root.hidden = true;

    const row = document.createElement('div');
    row.className = 'brewing-page__quantity-row';

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = 'brew';

    const options = document.createElement('span');
    options.className = 'row_val brewing-page__quantity-options';

    row.append(label, options);
    root.append(row);

    return { root, options };
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
    if (!this.refs.book) {
      return;
    }

    const recipes = snapshot.brewing?.recipes ?? [];
    const unlockedRecipes = recipes.filter((recipe) => recipe.unlocked);
    this.clampCurrentSpreadIndex(unlockedRecipes.length);
    this.renderTitle();
    this.renderCurrentSummary(snapshot);
    this.renderActionSummary(snapshot);
    this.renderQuantitySummary(snapshot);
    this.renderAutoSummary(snapshot, unlockedRecipes);
    this.renderPagination(unlockedRecipes.length);
    const ownedIngredientQuantities = this.getOwnedIngredientQuantities(snapshot);
    const brewQuantity = this.getBrewQuantity(snapshot);
    const signature = this.createRenderSignature(
      unlockedRecipes,
      ownedIngredientQuantities,
      brewQuantity,
    );

    if (signature === this.renderedSignature) {
      return;
    }

    this.renderedSignature = signature;

    const pages = this.createRecipePages(
      unlockedRecipes,
      ownedIngredientQuantities,
      brewQuantity,
    );
    this.refs.leftPage.replaceChildren(...pages.left);
    this.refs.rightPage.replaceChildren(...pages.right);
  }

  renderTitle() {
    const cauldronNumber = this.getSafeCurrentCauldronIndex() + 1;
    const title = `recipes: cauldron ${cauldronNumber}`;

    this.setText(this.refs.title, title);
    this.setAttribute(this.refs.dialog, 'aria-label', title);
  }

  renderCurrentSummary(snapshot) {
    if (!this.refs.currentRows) {
      return;
    }

    const cauldron = this.getDialogCauldronSnapshot(snapshot);

    if (!cauldron) {
      this.refs.currentRows.replaceChildren(this.createReadonlyCurrentRow('inside', 'empty'));
      return;
    }

    const rows = [];
    const status = this.formatCauldronStatus(cauldron);

    if (cauldron.activeBrew) {
      rows.push(this.createReadonlyCurrentRow('inside', this.formatActiveBrew(cauldron.activeBrew)));
    } else {
      const groups = this.groupAdjacentIngredients(cauldron.ingredients ?? []);

      if (groups.length === 0) {
        rows.push(this.createReadonlyCurrentRow('inside', 'empty'));
      } else {
        rows.push(
          ...groups.map((ingredient) =>
            this.createRemovableIngredientRow(
              ingredient,
              this.getSafeCurrentCauldronIndex(),
            ),
          ),
        );
      }
    }

    if (status) {
      rows.push(this.createReadonlyCurrentRow('status', status));
    }

    this.refs.currentRows.replaceChildren(...rows);
  }

  renderActionSummary(snapshot) {
    if (!this.refs.actionButton) {
      return;
    }

    const cauldron = this.getDialogCauldronSnapshot(snapshot);
    const action = cauldron ? this.getPrimaryAction?.(cauldron) : null;
    const hidden = !action;

    this.setHidden(this.refs.actionSummary, hidden);

    if (hidden) {
      this.setText(this.refs.actionButtonLabel, '');
      this.setText(this.refs.actionButtonCost, '');
      this.setDisabled(this.refs.actionButton, true);
      return;
    }

    this.setText(
      this.refs.actionButtonLabel,
      action.hasCost ? `${action.label} ` : action.label,
    );
    this.setHidden(this.refs.actionButtonCost, !action.hasCost);
    setResourceColor(this.refs.actionButtonCost, action.costResource ?? 'mana');
    this.setResourceText(
      this.refs.actionButtonCost,
      action.hasCost ? action.costText ?? '' : '',
    );
    this.setDisabled(this.refs.actionButton, action.disabled);
    this.setAttribute(this.refs.actionButton, 'data-action', action.id);
    this.setAttribute(this.refs.actionButton, 'aria-disabled', action.disabled ? 'true' : 'false');
    this.setAttribute(this.refs.actionButton, 'aria-label', action.ariaLabel);
  }

  createReadonlyCurrentRow(labelText, valueText) {
    const row = document.createElement('div');
    row.className = 'brewing-page__cauldron-dialog-current-row';

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = labelText;

    const value = document.createElement('span');
    value.className = 'row_val';
    value.textContent = valueText;

    row.append(label, value);
    return row;
  }

  createRemovableIngredientRow(ingredient, cauldronIndex) {
    const row = document.createElement('button');
    row.className = 'brewing-page__cauldron-dialog-current-row is-removable';
    row.type = 'button';
    row.setAttribute('aria-label', `remove one ${ingredient.label} from cauldron`);
    row.addEventListener('click', () => {
      this.onRemoveIngredient?.(ingredient.slotIndex + ingredient.quantity - 1, cauldronIndex);
      this.render(this.gameplayFacade.getSnapshot());
    });

    const label = document.createElement('span');
    label.className = 'row_key';
    label.append(`- ${ingredient.quantity} `, this.createIngredientIconLabel(ingredient));

    const value = document.createElement('span');
    value.className = 'row_val';
    value.textContent = 'remove';

    row.append(label, value);
    return row;
  }

  getDialogCauldronSnapshot(snapshot) {
    const cauldronIndex = this.getSafeCurrentCauldronIndex();
    const cauldron = this.getCauldronSnapshot(snapshot, cauldronIndex);

    if (!cauldron) {
      return null;
    }

    const recipes = snapshot?.brewing?.recipes ?? [];
    const selectedRecipeKey = this.getSelectedRecipeKey?.() ?? null;
    const selectedRecipe =
      recipes.find((recipe) => recipe.key === selectedRecipeKey && recipe.unlocked) ?? null;

    return {
      ...cauldron,
      herbs: snapshot?.brewing?.herbs ?? [],
      selectedRecipe,
    };
  }

  groupAdjacentIngredients(ingredients = []) {
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
        key: ingredient.key,
        label: ingredient.label,
        kind: ingredient.kind,
        quantity: 1,
      });
    }

    return groups;
  }

  formatCauldronStatus(cauldron) {
    if (!cauldron || cauldron.activeBrew || (cauldron.ingredients?.length ?? 0) === 0) {
      return '';
    }

    if (cauldron.match) {
      if (cauldron.match.unlocked) {
        return `matches ${cauldron.match.label}`;
      }

      return cauldron.match.discoverable
        ? 'unknown recipe'
        : `${cauldron.match.label} locked`;
    }

    return '';
  }

  formatActiveBrew(activeBrew) {
    if (activeBrew.canCollect) {
      return `bottled ${activeBrew.label}`;
    }

    if (activeBrew.canStartBottling) {
      return `brewed ${activeBrew.label}`;
    }

    return `${activeBrew.phase === 'bottling' ? 'bottling' : 'brewing'} ${activeBrew.label}`;
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

  renderQuantitySummary(snapshot) {
    if (!this.refs.quantitySummary || !this.refs.quantityOptions) {
      return;
    }

    const maxBrewQuantity = this.getMaxBrewQuantity(snapshot);
    const brewQuantity = this.getBrewQuantity(snapshot);
    const visible = maxBrewQuantity > 1;

    this.setHidden(this.refs.quantitySummary, !visible);

    if (!visible) {
      this.refs.quantityOptions.replaceChildren();
      return;
    }

    const existingButtons = new Map(
      [...this.refs.quantityOptions.querySelectorAll('.brewing-page__quantity-button')]
        .map((button) => [Number(button.dataset.brewQuantity), button]),
    );
    const buttons = [];

    for (let quantity = 1; quantity <= maxBrewQuantity; quantity += 1) {
      const button = existingButtons.get(quantity) ?? this.createQuantityButton(quantity);
      const selected = quantity === brewQuantity;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      button.setAttribute(
        'aria-label',
        selected ? `brewing x${quantity}` : `set brewing x${quantity}`,
      );
      buttons.push(button);
    }

    this.refs.quantityOptions.replaceChildren(...buttons);
  }

  createQuantityButton(quantity) {
    const button = document.createElement('button');
    button.className = 'brewing-page__quantity-button';
    button.type = 'button';
    button.dataset.brewQuantity = String(quantity);
    button.textContent = `x${quantity}`;
    button.addEventListener('click', () => this.selectBrewQuantity(quantity));
    return button;
  }

  selectBrewQuantity(quantity) {
    const cauldronIndex = this.getSafeCurrentCauldronIndex();
    this.onSelectBrewQuantity?.(quantity, cauldronIndex);
    this.render(this.gameplayFacade.getSnapshot());
  }

  createRenderSignature(recipes, ownedIngredientQuantities = new Map(), brewQuantity = 1) {
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

    return `${selectedRecipeKey}:x${brewQuantity}:spread=${this.currentSpreadIndex}::${recipeSignature}`;
  }

  createRecipePages(
    recipes,
    ownedIngredientQuantities = new Map(),
    brewQuantity = 1,
  ) {
    if (recipes.length === 0) {
      return {
        left: [this.createRecipePageEmpty('no recipes')],
        right: [this.createRecipePageEmpty('')],
      };
    }

    const leftPageIndex = this.currentSpreadIndex * PAGES_PER_SPREAD;
    const rightPageIndex = leftPageIndex + 1;

    return {
      left: this.createRecipePageRows(
        recipes,
        leftPageIndex,
        ownedIngredientQuantities,
        brewQuantity,
      ),
      right: this.createRecipePageRows(
        recipes,
        rightPageIndex,
        ownedIngredientQuantities,
        brewQuantity,
      ),
    };
  }

  createRecipePageRows(
    recipes,
    pageIndex,
    ownedIngredientQuantities = new Map(),
    brewQuantity = 1,
  ) {
    const startIndex = pageIndex * RECIPES_PER_PAGE;
    const pageRecipes = recipes.slice(startIndex, startIndex + RECIPES_PER_PAGE);
    const rows = [this.createRecipePageNumber(pageIndex, recipes.length)];

    if (pageRecipes.length === 0) {
      rows.push(this.createRecipePageEmpty('no more recipes'));
      return rows;
    }

    rows.push(
      ...pageRecipes.map((recipe) =>
        this.createRecipeRow(recipe, ownedIngredientQuantities, brewQuantity),
      ),
    );

    return rows;
  }

  createRecipePageNumber(pageIndex, recipeCount) {
    const page = document.createElement('div');
    page.className = 'brewing-page__recipe-page-number';
    page.textContent = `page ${pageIndex + 1}/${this.getPageCount(recipeCount)}`;
    return page;
  }

  createRecipePageEmpty(text) {
    const empty = document.createElement('div');
    empty.className = 'brewing-page__recipe-empty';
    empty.textContent = text;
    return empty;
  }

  createRecipeRow(recipe, ownedIngredientQuantities = new Map(), brewQuantity = 1) {
    const row = document.createElement('div');
    row.className = 'brewing-page__recipe-row';
    row.dataset.tutorialId = `brewing:recipe:${recipe.key}`;
    const selected = recipe.key === this.getSelectedRecipeKey?.();
    row.classList.toggle('is-locked', !recipe.unlocked);
    row.classList.toggle('is-selected', selected);
    row.setAttribute('aria-pressed', selected ? 'true' : 'false');

    const main = document.createElement('div');
    main.className = 'brewing-page__recipe-main';

    const selectButton = document.createElement('button');
    selectButton.className = 'brewing-page__recipe-select-button';
    selectButton.type = 'button';
    selectButton.textContent = selected ? '[x]' : '[ ]';
    selectButton.setAttribute('aria-pressed', selected ? 'true' : 'false');
    selectButton.setAttribute(
      'aria-label',
      selected ? `unselect ${recipe.label} recipe` : `select ${recipe.label} recipe`,
    );
    selectButton.addEventListener('click', () => this.selectRecipe(recipe));

    const label = document.createElement('span');
    label.className = 'row_key brewing-page__recipe-name';
    label.textContent = recipe.label;
    setItemIconLabel(label, 'potion', recipe.key);

    const infoText = document.createElement('p');
    infoText.className = 'brewing-page__recipe-info-text';
    infoText.textContent = this.getPotionInfo(recipe);

    const info = document.createElement('div');
    info.className = 'brewing-page__recipe-info';

    const header = document.createElement('div');
    header.className = 'brewing-page__recipe-header';
    header.append(selectButton, label);

    info.append(header, infoText);

    const icon = this.createPotionIcon(recipe);

    const top = document.createElement('div');
    top.className = 'brewing-page__recipe-top';
    top.append(icon, info);

    const ingredients = this.createIngredientsList(
      recipe.ingredients,
      ownedIngredientQuantities,
      brewQuantity,
    );

    const meta = document.createElement('div');
    meta.className = 'brewing-page__recipe-meta';

    const cost = document.createElement('span');
    cost.className = 'brewing-page__recipe-cost';
    setResourceColor(cost, 'mana');
    setResourceIconText(cost, `${recipe.manaCost * brewQuantity} mana required`);

    const duration = document.createElement('span');
    duration.className = 'brewing-page__recipe-duration';
    duration.textContent = `time: ${this.formatDuration(recipe.brewDurationMs)}`;

    meta.append(cost, duration);

    main.append(top);
    row.append(main, ingredients, meta);

    return row;
  }

  selectRecipe(recipe) {
    const selected = recipe?.key && recipe.key === this.getSelectedRecipeKey?.();
    this.onSelectRecipe?.(selected ? null : recipe);
    const snapshot = this.gameplayFacade.getSnapshot();
    this.render(snapshot);
  }

  createPotionIcon(recipe) {
    const icon =
      createAssetAtlasSprite(
        'brewing-page__recipe-potion-icon',
        getPotionIconFrameName(recipe?.key),
      ) ?? document.createElement('span');

    icon.classList.add('brewing-page__recipe-potion-icon');
    icon.setAttribute('aria-hidden', 'true');
    return icon;
  }

  getPotionInfo(recipe) {
    const copy = POTION_INFO_BY_KEY[recipe?.key];

    if (copy) {
      return copy;
    }

    const label = String(recipe?.label ?? 'potion').trim() || 'potion';
    return `a recorded ${label} recipe from the workshop shelves.`;
  }

  renderPagination(recipeCount) {
    const spreadCount = this.getSpreadCount(recipeCount);
    const pageCount = this.getPageCount(recipeCount);
    const leftPageNumber = this.currentSpreadIndex * PAGES_PER_SPREAD + 1;
    const rightPageNumber = Math.min(leftPageNumber + 1, pageCount);
    const label =
      leftPageNumber === rightPageNumber
        ? `page ${leftPageNumber}/${pageCount}`
        : `pages ${leftPageNumber}-${rightPageNumber}/${pageCount}`;

    this.setText(this.refs.pageLabel, label);
    this.setDisabled(this.refs.previousSpreadButton, this.currentSpreadIndex <= 0);
    this.setDisabled(
      this.refs.nextSpreadButton,
      this.currentSpreadIndex >= spreadCount - 1,
    );
    this.setAttribute(
      this.refs.previousSpreadButton,
      'aria-label',
      'previous recipe pages',
    );
    this.setAttribute(this.refs.nextSpreadButton, 'aria-label', 'next recipe pages');
  }

  showPreviousSpread() {
    this.setCurrentSpreadIndex(this.currentSpreadIndex - 1, 'back');
  }

  showNextSpread() {
    this.setCurrentSpreadIndex(this.currentSpreadIndex + 1, 'forward');
  }

  setCurrentSpreadIndex(spreadIndex, direction = 'forward') {
    const snapshot = this.gameplayFacade.getSnapshot();
    const recipeCount = (snapshot?.brewing?.recipes ?? []).filter(
      (recipe) => recipe.unlocked,
    ).length;
    const nextSpreadIndex = this.normalizeSpreadIndex(spreadIndex, recipeCount);

    if (nextSpreadIndex === this.currentSpreadIndex) {
      return;
    }

    this.currentSpreadIndex = nextSpreadIndex;
    this.renderedSignature = null;
    this.playBookTurn(direction);
    this.render(snapshot);
  }

  clampCurrentSpreadIndex(recipeCount) {
    this.currentSpreadIndex = this.normalizeSpreadIndex(
      this.currentSpreadIndex,
      recipeCount,
    );
  }

  normalizeSpreadIndex(spreadIndex, recipeCount) {
    const spreadCount = this.getSpreadCount(recipeCount);
    const safeSpreadIndex = Math.floor(Number(spreadIndex));
    const index = Number.isInteger(safeSpreadIndex) ? safeSpreadIndex : 0;
    return Math.min(Math.max(0, index), spreadCount - 1);
  }

  getSpreadCount(recipeCount) {
    return Math.max(1, Math.ceil(Math.max(0, recipeCount) / RECIPES_PER_SPREAD));
  }

  getPageCount(recipeCount) {
    return Math.max(1, Math.ceil(Math.max(0, recipeCount) / RECIPES_PER_PAGE));
  }

  onBookPointerDown(event) {
    if (event.button !== 0 || event.target?.closest?.('button')) {
      return;
    }

    this.bookPointer = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  onBookPointerUp(event) {
    if (!this.bookPointer || this.bookPointer.pointerId !== event.pointerId) {
      this.bookPointer = null;
      return;
    }

    const deltaX = event.clientX - this.bookPointer.startX;
    const deltaY = event.clientY - this.bookPointer.startY;
    this.bookPointer = null;

    if (
      Math.abs(deltaX) < BOOK_SWIPE_THRESHOLD ||
      Math.abs(deltaX) < Math.abs(deltaY) * 1.2
    ) {
      return;
    }

    event.preventDefault();

    if (deltaX < 0) {
      this.showNextSpread();
      return;
    }

    this.showPreviousSpread();
  }

  playBookTurn(direction) {
    if (!this.refs.book) {
      return;
    }

    this.clearBookTurnClass();
    this.refs.book.dataset.turnDirection = direction;
    this.refs.book.classList.add('is-turning');
    this.bookTurnClassTimeout = globalThis.setTimeout(() => {
      this.clearBookTurnClass();
    }, BOOK_TURN_CLASS_MS);
    this.bookTurnClassTimeout?.unref?.();
  }

  clearBookTurnClass() {
    if (this.bookTurnClassTimeout) {
      globalThis.clearTimeout(this.bookTurnClassTimeout);
      this.bookTurnClassTimeout = null;
    }

    if (this.refs.book) {
      this.refs.book.classList.remove('is-turning');
      delete this.refs.book.dataset.turnDirection;
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

  createIngredientsList(
    ingredients = [],
    ownedIngredientQuantities = new Map(),
    brewQuantity = 1,
  ) {
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
        const totalQuantity = quantity * brewQuantity;
        const ownedQuantity = this.getOwnedIngredientQuantity(
          ingredient,
          ownedIngredientQuantities,
        );

        const required = document.createElement('span');
        required.className = 'brewing-page__recipe-ingredient-required';
        required.classList.toggle('is-unavailable', ownedQuantity < totalQuantity);
        setResourceColor(required, 'herb');
        required.append(
          this.formatIngredientPrefix(quantity, brewQuantity),
          this.createIngredientIconLabel(ingredient),
        );

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

  getBrewQuantity(snapshot) {
    const cauldron = this.getCauldronSnapshot(snapshot, this.getSafeCurrentCauldronIndex());
    const maxBrewQuantity = this.getMaxBrewQuantity(snapshot);
    const quantity = Math.floor(Number(cauldron?.brewQuantity));

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return maxBrewQuantity;
    }

    return Math.min(quantity, maxBrewQuantity);
  }

  getMaxBrewQuantity(snapshot) {
    const cauldron = this.getCauldronSnapshot(snapshot, this.getSafeCurrentCauldronIndex());
    const maxBrewQuantity = Math.floor(
      Number(cauldron?.maxBrewQuantity ?? cauldron?.level),
    );
    return Number.isInteger(maxBrewQuantity) && maxBrewQuantity > 0 ? maxBrewQuantity : 1;
  }

  formatIngredientPrefix(quantity, brewQuantity = 1) {
    const safeBrewQuantity = Math.max(1, Math.floor(Number(brewQuantity) || 1));
    return safeBrewQuantity > 1
      ? `- ${safeBrewQuantity} x ${quantity} `
      : `- ${quantity} `;
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

  setResourceText(element, value) {
    if (element.textContent !== value) {
      setResourceIconText(element, value);
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
