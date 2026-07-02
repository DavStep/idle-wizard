import { setResourceColor } from '../../shared/resourceColor.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { createPlayerInfoLink } from '../../shared/playerInfoLink.js';
import { MYSTERY_TEXT_LABEL } from '../../shared/mysteryText.js';
import {
  createAssetAtlasMaskedSprite,
  createAssetAtlasSprite,
} from '../../../assets/atlas/atlasSprite.js';
import { getPotionIconFrameName } from '../../../assets/items/potions/potionIcons.js';
import { formatCoinPriceText } from '../../../shared/coinPrice.js';

const DISCOVERY_TABS = [
  { id: 'seeds', label: 'seeds' },
  { id: 'herbs', label: 'herbs' },
  { id: 'potions', label: 'potions' },
];
const POTIONS_PER_PAGE = 1;
const PAGES_PER_SPREAD = 2;
const POTIONS_PER_SPREAD = POTIONS_PER_PAGE * PAGES_PER_SPREAD;
const BOOK_SWIPE_THRESHOLD = 30;
const BOOK_TURN_CLASS_MS = 220;

export class WorkshopDiscoveriesManager {
  constructor({ gameplayFacade, onOpenPlayerInfo, onRequirePlayerSurfaceAccess } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.onOpenPlayerInfo = onOpenPlayerInfo;
    this.onRequirePlayerSurfaceAccess = onRequirePlayerSurfaceAccess;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.selectedTabId = 'potions';
    this.lastSnapshot = {};
    this.renderedSignature = '';
    this.currentSpreadIndex = 0;
    this.bookPointer = null;
    this.bookTurnClassTimeout = null;
    this.bookTurnGhosts = [];
    this.previousFocus = null;
    this.handleRootClick = (event) => {
      if (event.target === this.refs.popup) {
        this.hide();
      }
    };
    this.handleKeydown = (event) => {
      if (!this.visible || event.key !== 'Escape') {
        if (!this.visible || this.selectedTabId !== 'potions') {
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

    this.root = document.createElement('div');
    this.root.className = 'workshop-page__discoveries';

    this.refs.button = this.createButton();
    this.refs.popup = this.createPopup();

    this.root.append(this.refs.button);
    parent.append(this.root);
    popupParent.append(this.refs.popup);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());
    this.applyVisibility();

    return this.root;
  }

  createButton() {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__discoveries-button';
    button.type = 'button';
    button.textContent = 'discoveries';
    button.addEventListener('click', () => this.show());
    return button;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'workshop-page__discoveries-popup';
    popup.addEventListener('click', this.handleRootClick);

    const panel = document.createElement('section');
    panel.className = 'workshop-page__discoveries-panel';
    panel.setAttribute('aria-label', 'Discoveries');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('role', 'dialog');
    panel.tabIndex = -1;

    const dialog = document.createElement('section');
    dialog.className = 'workshop-page__discoveries-dialog style-dialog';

    this.refs.dialog = panel;
    this.refs.title = this.createTitle();
    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'workshop-page__discoveries-rows';
    this.refs.detail = document.createElement('div');
    this.refs.detail.className = 'workshop-page__discovery-detail';
    const book = this.createPotionBook();
    const pagination = this.createPotionPagination();
    this.refs.tabs = this.createTabs();

    dialog.append(
      this.refs.title,
      this.refs.rows,
      book.root,
      pagination.root,
      this.refs.detail,
    );
    panel.append(dialog, this.refs.tabs);
    popup.append(panel);
    this.refs.book = book.root;
    this.refs.leftPage = book.leftPage;
    this.refs.rightPage = book.rightPage;
    this.refs.previousSpreadButton = pagination.previousButton;
    this.refs.nextSpreadButton = pagination.nextButton;
    this.refs.pageLabel = pagination.pageLabel;
    return popup;
  }

  createPotionBook() {
    const root = document.createElement('div');
    root.className = 'brewing-page__recipe-book workshop-page__discovery-recipe-book';
    root.dataset.pageSwipeBlock = 'true';
    root.addEventListener('pointerdown', (event) => this.onBookPointerDown(event));
    root.addEventListener('pointerup', (event) => this.onBookPointerUp(event));
    root.addEventListener('pointercancel', () => {
      this.bookPointer = null;
    });

    const leftPage = document.createElement('section');
    leftPage.className = [
      'brewing-page__recipe-page',
      'brewing-page__recipe-page--left',
      'workshop-page__discovery-recipe-page',
    ].join(' ');
    leftPage.setAttribute('aria-label', 'left discovery page');

    const rightPage = document.createElement('section');
    rightPage.className = [
      'brewing-page__recipe-page',
      'brewing-page__recipe-page--right',
      'workshop-page__discovery-recipe-page',
    ].join(' ');
    rightPage.setAttribute('aria-label', 'right discovery page');

    root.append(leftPage, rightPage);
    return { root, leftPage, rightPage };
  }

  createPotionPagination() {
    const root = document.createElement('div');
    root.className =
      'brewing-page__recipe-book-controls workshop-page__discovery-recipe-book-controls';

    const previousButton = document.createElement('button');
    previousButton.className =
      'brewing-page__recipe-page-button workshop-page__discovery-recipe-page-button';
    previousButton.type = 'button';
    previousButton.textContent = 'prev';
    previousButton.addEventListener('click', () => this.showPreviousSpread());

    const pageLabel = document.createElement('span');
    pageLabel.className =
      'brewing-page__recipe-page-label workshop-page__discovery-recipe-page-label';

    const nextButton = document.createElement('button');
    nextButton.className =
      'brewing-page__recipe-page-button workshop-page__discovery-recipe-page-button';
    nextButton.type = 'button';
    nextButton.textContent = 'next';
    nextButton.addEventListener('click', () => this.showNextSpread());

    root.append(previousButton, pageLabel, nextButton);
    return { root, previousButton, pageLabel, nextButton };
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'discoveries';
    return title;
  }

  createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'workshop-page__discoveries-tabs';
    tabs.setAttribute('aria-label', 'Discovery type');
    tabs.setAttribute('role', 'tablist');

    this.refs.tabButtons = new Map();

    for (const tab of DISCOVERY_TABS) {
      const button = document.createElement('button');
      button.className = 'style-button workshop-page__discoveries-tab-button';
      button.type = 'button';
      button.textContent = tab.label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.onSelectTab(tab.id));
      this.refs.tabButtons.set(tab.id, button);
      tabs.append(button);
    }

    return tabs;
  }

  onSelectTab(tabId) {
    if (this.selectedTabId === tabId) {
      return;
    }

    this.selectedTabId = tabId;
    this.renderedSignature = '';
    this.render(this.lastSnapshot);
  }

  show() {
    if (!this.isButtonAvailable()) {
      return { ok: false, reason: 'unavailable', dialogId: 'discoveries' };
    }

    return this.requirePlayerSurfaceAccess(() => this.showUnlocked(), {
      dialogId: 'discoveries',
    });
  }

  showUnlocked() {
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyVisibility();
    this.refs.dialog?.focus();
    return { ok: true, dialogId: 'discoveries', pageId: 'workshop' };
  }

  requirePlayerSurfaceAccess(open, meta) {
    if (typeof this.onRequirePlayerSurfaceAccess === 'function') {
      return this.onRequirePlayerSurfaceAccess(open, meta);
    }

    return open();
  }

  isButtonAvailable() {
    return (
      this.root &&
      !this.root.hidden &&
      this.refs.button?.disabled !== true &&
      this.refs.button?.getAttribute('aria-disabled') !== 'true'
    );
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

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.clearBookTurnClass();
    this.refs.popup?.removeEventListener('click', this.handleRootClick);
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.selectedTabId = 'potions';
    this.lastSnapshot = {};
    this.renderedSignature = '';
    this.currentSpreadIndex = 0;
    this.bookPointer = null;
    this.previousFocus = null;
  }

  render(snapshot) {
    if (!this.root) {
      return;
    }

    this.lastSnapshot = snapshot ?? {};
    this.updateTabs();
    const showingPotions = this.selectedTabId === 'potions';
    this.setHidden(this.refs.rows, showingPotions);
    this.setHidden(this.refs.book, !showingPotions);
    this.setHidden(this.refs.previousSpreadButton?.parentElement, !showingPotions);

    const signature = this.createRenderSignature(this.lastSnapshot);
    if (signature === this.renderedSignature) {
      return;
    }

    this.renderedSignature = signature;

    if (this.selectedTabId === 'potions') {
      this.renderPotionRows(this.lastSnapshot);
      return;
    }

    this.refs.rows.replaceChildren(this.createEmptyRow());
    this.refs.detail.replaceChildren();
  }

  updateTabs() {
    for (const tab of DISCOVERY_TABS) {
      const selected = this.selectedTabId === tab.id;
      const button = this.refs.tabButtons?.get(tab.id);
      button?.setAttribute('aria-selected', selected ? 'true' : 'false');
      button?.setAttribute('tabindex', selected ? '0' : '-1');
    }
  }

  renderPotionRows(snapshot) {
    const potions = this.getVisiblePotionDiscoveries(snapshot.discoveries?.potions ?? []);
    this.clampCurrentSpreadIndex(potions.length);
    this.renderPagination(potions.length);
    const ownedIngredientQuantities = this.getOwnedIngredientQuantities(snapshot);
    const pages = this.createPotionPages(potions, ownedIngredientQuantities);
    this.refs.leftPage.replaceChildren(...pages.left);
    this.refs.rightPage.replaceChildren(...pages.right);
    this.refs.rows.replaceChildren();
    this.refs.detail.replaceChildren();
  }

  getVisiblePotionDiscoveries(potions = []) {
    return potions.filter((potion) => potion && typeof potion.key === 'string');
  }

  createPotionPages(potions, ownedIngredientQuantities = new Map()) {
    if (potions.length === 0) {
      return {
        left: [this.createPotionPageEmpty('no discoveries')],
        right: [this.createPotionPageEmpty('')],
      };
    }

    const leftPageIndex = this.currentSpreadIndex * PAGES_PER_SPREAD;
    const rightPageIndex = leftPageIndex + 1;

    return {
      left: this.createPotionPageRows(potions, leftPageIndex, ownedIngredientQuantities),
      right: this.createPotionPageRows(potions, rightPageIndex, ownedIngredientQuantities),
    };
  }

  createPotionPageRows(potions, pageIndex, ownedIngredientQuantities = new Map()) {
    const startIndex = pageIndex * POTIONS_PER_PAGE;
    const pagePotions = potions.slice(startIndex, startIndex + POTIONS_PER_PAGE);

    if (pagePotions.length === 0) {
      return [this.createPotionPageEmpty('no more discoveries')];
    }

    return pagePotions.map((potion) =>
      this.createPotionDiscoveryRow(potion, ownedIngredientQuantities),
    );
  }

  createPotionPageEmpty(text) {
    const empty = document.createElement('div');
    empty.className = 'brewing-page__recipe-empty workshop-page__discoveries-empty';
    empty.textContent = text;
    return empty;
  }

  createPotionDiscoveryRow(potion, ownedIngredientQuantities = new Map()) {
    const display = this.getPotionDiscoveryDisplay(potion);
    const row = document.createElement('div');
    row.className = 'brewing-page__recipe-row workshop-page__discovery-potion-row';
    row.classList.toggle('is-unknown', display.unknown);
    row.classList.toggle('is-locked', display.unknown);

    const main = document.createElement('div');
    main.className = 'brewing-page__recipe-main';

    const label = document.createElement('span');
    label.className = 'row_key brewing-page__recipe-name workshop-page__discovery-potion-name';
    label.textContent = display.label;
    if (display.unknown) {
      label.setAttribute('aria-label', 'unknown');
    }

    const header = document.createElement('div');
    header.className = 'brewing-page__recipe-header';
    header.append(label);

    const info = document.createElement('div');
    info.className = 'brewing-page__recipe-info';
    info.append(header);

    const icon = this.createPotionIcon(display.iconKey, {
      silhouette: display.unknown,
    });

    const top = document.createElement('div');
    top.className = 'brewing-page__recipe-top';
    top.append(icon, info);

    const infoText = this.createPotionInfoText(display);
    const ingredients = this.createIngredientsList(potion.ingredients, ownedIngredientQuantities, {
      masked: display.unknown,
    });
    const meta = this.createPotionMeta(potion, display);

    main.append(top, infoText);
    row.append(main, ingredients, meta);
    return row;
  }

  getPotionDiscoveryDisplay(potion) {
    const unknown = potion?.discovered !== true;
    return {
      unknown,
      label: unknown ? 'unknown potion' : potion.label,
      iconKey: potion?.key,
      infoText: unknown
        ? 'a recipe not yet named in the workshop book.'
        : 'a discovered potion recipe recorded in the workshop book.',
      discoveredByUsername: this.getPotionDiscovererName(potion),
      discoveredByIdentity: this.getPotionDiscovererIdentity(potion),
    };
  }

  createPotionInfoText(display) {
    const infoText = document.createElement('p');
    infoText.className = 'brewing-page__recipe-info-text workshop-page__discovery-info-text';
    infoText.append(display.infoText);

    if (display.discoveredByUsername) {
      const row = document.createElement('span');
      row.className =
        'brewing-page__recipe-discovery-row workshop-page__discovery-byline';
      row.append(
        '- discovered by ',
        createPlayerInfoLink(
          {
            identity: display.discoveredByIdentity,
            username: display.discoveredByUsername,
          },
          {
            onOpenPlayerInfo: this.onOpenPlayerInfo,
            text: display.discoveredByUsername,
            className: 'workshop-page__discovery-player-link',
          },
        ),
      );
      infoText.append(row);
    }

    return infoText;
  }

  createPotionMeta(potion, display) {
    const meta = document.createElement('div');
    meta.className = 'brewing-page__recipe-meta workshop-page__discovery-potion-meta';

    const royalty = document.createElement('span');
    royalty.className = 'brewing-page__recipe-cost workshop-page__discovery-royalties';
    if (display.unknown) {
      royalty.textContent = 'royalties unowned';
    } else {
      const royaltyCoin = Number(potion.royaltyCoin);
      setResourceIconText(
        royalty,
        `royalties ${formatCoinPriceText(Number.isFinite(royaltyCoin) ? royaltyCoin : 0)}`,
      );
    }

    const cost = document.createElement('span');
    cost.className = 'brewing-page__recipe-cost workshop-page__discovery-mana-cost';
    setResourceColor(cost, 'mana');
    setResourceIconText(
      cost,
      display.unknown
        ? '? mana required'
        : `${this.normalizeManaCost(potion.manaCost)} mana required`,
    );

    const duration = document.createElement('span');
    duration.className = 'brewing-page__recipe-duration workshop-page__discovery-duration';
    duration.textContent = `time: ${
      display.unknown ? '?s' : this.formatDuration(potion.brewDurationMs)
    }`;

    meta.append(royalty, cost, duration);
    return meta;
  }

  createPotionIcon(iconKey, { silhouette = false } = {}) {
    const frameName = getPotionIconFrameName(iconKey);
    const icon =
      (silhouette
        ? createAssetAtlasMaskedSprite('brewing-page__recipe-potion-icon', frameName)
        : createAssetAtlasSprite('brewing-page__recipe-potion-icon', frameName)) ??
      document.createElement('span');

    icon.classList.add('brewing-page__recipe-potion-icon');
    icon.classList.toggle('is-silhouette', silhouette);
    icon.setAttribute('aria-hidden', 'true');
    return icon;
  }

  getPotionDiscovererName(potion) {
    if (potion?.discovered !== true) {
      return null;
    }

    const username = String(potion?.discoveredByUsername ?? '').trim();
    return username || 'wizard';
  }

  getPotionDiscovererIdentity(potion) {
    if (potion?.discovered !== true) {
      return null;
    }

    const identity = String(potion?.discoveredByIdentity ?? '').trim();
    return identity || null;
  }

  createIngredientsList(
    ingredients = [],
    ownedIngredientQuantities = new Map(),
    { masked = false } = {},
  ) {
    const root = document.createElement('div');
    root.className = 'brewing-page__recipe-ingredients workshop-page__discovery-ingredients';

    if (!ingredients.length) {
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
        row.classList.toggle('is-unknown', masked);

        const quantity = this.normalizeIngredientQuantity(ingredient);
        const ownedQuantity = this.getOwnedIngredientQuantity(
          ingredient,
          ownedIngredientQuantities,
        );

        const required = document.createElement('span');
        required.className = 'brewing-page__recipe-ingredient-required';
        required.classList.toggle('is-unavailable', ownedQuantity < quantity);
        if (masked) {
          required.append(this.formatIngredientPrefix(quantity), MYSTERY_TEXT_LABEL);
        } else {
          setResourceColor(required, 'herb');
          required.append(
            this.formatIngredientPrefix(quantity),
            this.createIngredientIconLabel(ingredient),
          );
        }

        const owned = document.createElement('span');
        owned.className = 'brewing-page__recipe-ingredient-owned';
        owned.textContent = masked ? 'owned ?' : `owned ${ownedQuantity}`;

        row.append(required, owned);
        return row;
      }),
    );

    return root;
  }

  createIngredientIconLabel(ingredient) {
    const label = document.createElement('span');
    label.textContent = ingredient.label;
    setItemIconLabel(label, 'herb', ingredient.key);
    return label;
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

  normalizeManaCost(manaCost) {
    const cost = Math.floor(Number(manaCost));
    return Number.isInteger(cost) && cost > 0 ? cost : 0;
  }

  formatIngredientPrefix(quantity) {
    return `- ${quantity} `;
  }

  formatDuration(durationMs) {
    if (!Number.isFinite(durationMs)) {
      return '?s';
    }

    return `${Math.ceil(durationMs / 1_000)}s`;
  }

  renderPagination(potionCount) {
    const spreadCount = this.getSpreadCount(potionCount);
    const pageCount = this.getPageCount(potionCount);
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
      'previous discovery pages',
    );
    this.setAttribute(this.refs.nextSpreadButton, 'aria-label', 'next discovery pages');
  }

  showPreviousSpread() {
    this.setCurrentSpreadIndex(this.currentSpreadIndex - 1, 'back');
  }

  showNextSpread() {
    this.setCurrentSpreadIndex(this.currentSpreadIndex + 1, 'forward');
  }

  setCurrentSpreadIndex(spreadIndex, direction = 'forward') {
    const snapshot = this.gameplayFacade.getSnapshot();
    const potionCount = this.getVisiblePotionDiscoveries(
      snapshot?.discoveries?.potions ?? [],
    ).length;
    const nextSpreadIndex = this.normalizeSpreadIndex(spreadIndex, potionCount);

    if (nextSpreadIndex === this.currentSpreadIndex) {
      return;
    }

    this.prepareBookTurn();
    this.currentSpreadIndex = nextSpreadIndex;
    this.renderedSignature = '';
    this.render(snapshot);
    this.playBookTurn(direction);
  }

  clampCurrentSpreadIndex(potionCount) {
    this.currentSpreadIndex = this.normalizeSpreadIndex(
      this.currentSpreadIndex,
      potionCount,
    );
  }

  normalizeSpreadIndex(spreadIndex, potionCount) {
    const spreadCount = this.getSpreadCount(potionCount);
    const safeSpreadIndex = Math.floor(Number(spreadIndex));
    const index = Number.isInteger(safeSpreadIndex) ? safeSpreadIndex : 0;
    return Math.min(Math.max(0, index), spreadCount - 1);
  }

  getSpreadCount(potionCount) {
    return Math.max(1, Math.ceil(Math.max(0, potionCount) / POTIONS_PER_SPREAD));
  }

  getPageCount(potionCount) {
    return Math.max(1, Math.ceil(Math.max(0, potionCount) / POTIONS_PER_PAGE));
  }

  onBookPointerDown(event) {
    if (
      this.selectedTabId !== 'potions' ||
      event.button !== 0 ||
      event.target?.closest?.('button')
    ) {
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

  prepareBookTurn() {
    this.clearBookTurnClass();

    if (
      !this.visible ||
      this.prefersReducedMotion() ||
      !this.refs.book ||
      !this.refs.leftPage ||
      !this.refs.rightPage
    ) {
      return;
    }

    this.bookTurnGhosts = [
      this.createBookTurnGhost(this.refs.leftPage, 'left'),
      this.createBookTurnGhost(this.refs.rightPage, 'right'),
    ];
    this.refs.book.append(...this.bookTurnGhosts);
  }

  createBookTurnGhost(page, side) {
    const ghost = page.cloneNode(true);
    ghost.className = `brewing-page__recipe-turn-ghost brewing-page__recipe-turn-ghost--${side}`;
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;

    for (const control of ghost.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]',
    )) {
      control.setAttribute('tabindex', '-1');
    }

    return ghost;
  }

  playBookTurn(direction) {
    if (!this.refs.book) {
      return;
    }

    if (this.prefersReducedMotion()) {
      this.clearBookTurnClass();
      return;
    }

    this.refs.book.dataset.turnDirection = direction === 'back' ? 'back' : 'forward';
    // Flush after swapping page contents so the incoming and outgoing layers animate.
    void this.refs.book.offsetWidth;
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

    for (const ghost of this.bookTurnGhosts) {
      ghost.remove();
    }

    this.bookTurnGhosts = [];
  }

  prefersReducedMotion() {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  }

  createEmptyRow() {
    const row = document.createElement('div');
    row.className = 'workshop-page__discoveries-empty';
    row.textContent = 'empty';
    return row;
  }

  createRenderSignature(snapshot) {
    const potions = snapshot.discoveries?.potions ?? [];
    const potionSignature = potions
      .map(
        (potion) => {
          const ingredientsSignature = (potion.ingredients ?? [])
            .map(
              (ingredient) =>
                `${ingredient.key}:${ingredient.label}:${ingredient.quantity ?? 1}`,
            )
            .join(',');
          return [
            potion.key,
            potion.label,
            potion.discovered,
            potion.discoveredByUsername,
            potion.discoveredByIdentity,
            potion.royaltyCoin,
            potion.manaCost,
            potion.brewDurationMs,
            ingredientsSignature,
          ].join(':');
        },
      )
      .join('|');

    return `${this.selectedTabId}:spread=${this.currentSpreadIndex}:${potionSignature}`;
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }

  setHidden(element, hidden) {
    if (element && element.hidden !== hidden) {
      element.hidden = hidden;
    }
  }

  setText(element, value) {
    if (element && element.textContent !== value) {
      element.textContent = value;
    }
  }

  setDisabled(element, disabled) {
    if (element && element.disabled !== disabled) {
      element.disabled = disabled;
    }
  }

  setAttribute(element, name, value) {
    if (element && element.getAttribute(name) !== value) {
      element.setAttribute(name, value);
    }
  }
}
