import { getItemDisplay, isItemResearched } from '../../shared/itemResearchStatus.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { applyMysteryText } from '../../shared/mysteryText.js';
import { setResourceColor } from '../../shared/resourceColor.js';
import { createResourceIconLabel } from '../../shared/resourceIconLabel.js';
import { updateScrollCueState } from '../../managers/ScrollCueManager.js';

const BAG_TABS = [
  { id: 'currencies', label: 'currencies' },
  { id: 'seeds', label: 'seeds' },
  { id: 'herbs', label: 'herbs' },
  { id: 'potions', label: 'potions' },
];

const CURRENCY_ROWS = [
  { id: 'mana', label: 'mana' },
  { id: 'coin', label: 'coin' },
  { id: 'crystal', label: 'crystal' },
  { id: 'ruby', label: 'ruby' },
];

export class WorkshopBagManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.selectedTabId = 'currencies';
    this.lastSnapshot = {};
    this.renderedSignature = '';
    this.previousFocus = null;
    this.handleRowsScroll = () => this.updateScrollProgress();
    this.handleRootClick = (event) => {
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

    this.root = document.createElement('section');
    this.root.className = 'workshop-page__bag-popup';
    this.root.addEventListener('click', this.handleRootClick);

    this.refs.panel = document.createElement('section');
    this.refs.panel.className = 'workshop-page__bag-panel';
    this.refs.panel.setAttribute('aria-label', 'Bag');
    this.refs.panel.setAttribute('aria-modal', 'true');
    this.refs.panel.setAttribute('role', 'dialog');
    this.refs.panel.tabIndex = -1;

    this.refs.dialog = document.createElement('section');
    this.refs.dialog.className = 'workshop-page__bag-dialog style-dialog';

    this.refs.title = this.createTitle();
    this.refs.closeButton = this.createCloseButton();
    this.refs.frame = document.createElement('div');
    this.refs.frame.className = 'workshop-page__bag-frame';
    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'workshop-page__bag-rows';
    this.refs.rows.addEventListener('scroll', this.handleRowsScroll);
    this.refs.progress = document.createElement('div');
    this.refs.progress.className =
      'style-progress style-scroll-cue-progress workshop-page__bag-progress';
    this.refs.progress.setAttribute('aria-hidden', 'true');
    this.refs.progressFill = document.createElement('div');
    this.refs.progressFill.className =
      'style-progress__fill style-scroll-cue-progress-fill workshop-page__bag-progress-fill';
    this.refs.progress.append(this.refs.progressFill);
    this.refs.tabs = this.createTabs();

    this.refs.frame.append(this.refs.rows);
    this.refs.dialog.append(
      this.refs.title,
      this.refs.closeButton,
      this.refs.frame,
      this.refs.progress,
    );
    this.refs.panel.append(this.refs.dialog, this.refs.tabs);
    this.root.append(this.refs.panel);
    parent.append(this.root);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());
    this.applyVisibility();

    return this.root;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'bag';
    return title;
  }

  createCloseButton() {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__bag-close';
    button.type = 'button';
    button.textContent = 'close';
    button.addEventListener('click', () => this.hide());
    return button;
  }

  createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'workshop-page__bag-tabs';
    tabs.setAttribute('aria-label', 'Bag category');
    tabs.setAttribute('role', 'tablist');
    this.refs.tabButtons = new Map();

    for (const tab of BAG_TABS) {
      const button = document.createElement('button');
      button.className = 'style-button workshop-page__bag-tab-button';
      button.type = 'button';
      button.textContent = tab.label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.onSelectTab(tab.id));
      this.refs.tabButtons.set(tab.id, button);
      tabs.append(button);
    }

    return tabs;
  }

  toggle() {
    if (this.visible) {
      this.hide();
      return;
    }

    this.show();
  }

  show() {
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyVisibility();
    this.refs.panel?.focus();
    this.updateScrollProgress();
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
    this.refs.rows?.removeEventListener('scroll', this.handleRowsScroll);
    this.root?.removeEventListener('click', this.handleRootClick);
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.selectedTabId = 'currencies';
    this.lastSnapshot = {};
    this.renderedSignature = '';
    this.previousFocus = null;
  }

  onSelectTab(tabId) {
    if (this.selectedTabId === tabId) {
      return;
    }

    this.selectedTabId = tabId;
    this.renderedSignature = '';
    this.render(this.lastSnapshot);
  }

  render(snapshot) {
    if (!this.root) {
      return;
    }

    this.lastSnapshot = snapshot ?? {};
    this.updateTabs();

    const signature = this.createRenderSignature(this.lastSnapshot);
    if (signature === this.renderedSignature) {
      this.updateScrollProgress();
      return;
    }

    this.renderedSignature = signature;

    if (this.selectedTabId === 'currencies') {
      this.renderCurrencyRows(this.lastSnapshot);
      this.updateScrollProgress();
      return;
    }

    this.renderItemRows(this.lastSnapshot, this.selectedTabId.slice(0, -1));
    this.updateScrollProgress();
  }

  updateTabs() {
    for (const tab of BAG_TABS) {
      const selected = this.selectedTabId === tab.id;
      const button = this.refs.tabButtons?.get(tab.id);
      button?.setAttribute('aria-selected', selected ? 'true' : 'false');
      button?.setAttribute('tabindex', selected ? '0' : '-1');
    }
  }

  renderCurrencyRows(snapshot) {
    this.refs.rows.replaceChildren(
      ...this.getCurrencyRows(snapshot).map((currency) => this.createCurrencyRow(currency)),
    );
  }

  getCurrencyRows(snapshot) {
    return CURRENCY_ROWS.filter((currency) => snapshot[currency.id]).map((currency) => {
      const value = this.getCurrencyValue(snapshot, currency.id);
      const amount = Math.floor(Number(snapshot[currency.id]?.current ?? 0));

      return {
        ...currency,
        value,
        amount,
      };
    });
  }

  getCurrencyValue(snapshot, currencyId) {
    if (currencyId === 'mana') {
      const mana = snapshot.mana ?? {};
      return `${Math.floor(Number(mana.current ?? 0))}/${Math.floor(Number(mana.cap ?? 0))}`;
    }

    return String(Math.floor(Number(snapshot[currencyId]?.current ?? 0)));
  }

  createCurrencyRow(currency) {
    const row = document.createElement('div');
    row.className = 'workshop-page__row workshop-page__bag-row workshop-page__bag-currency-row';
    row.classList.toggle('is-empty', currency.amount <= 0);
    setResourceColor(row, currency.id);

    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = currency.label;

    const val = document.createElement('span');
    val.className = 'row_val workshop-page__bag-value';
    val.textContent = currency.value;
    this.appendCurrencyIcon(val, currency.id);

    row.append(key, val);
    return row;
  }

  appendCurrencyIcon(element, currencyId) {
    const icon = createResourceIconLabel(currencyId, '');

    if (icon.nodeType !== 1) {
      return;
    }

    icon.classList.add('workshop-page__bag-value-icon');
    icon.setAttribute('aria-hidden', 'true');
    element.append(icon);
  }

  renderItemRows(snapshot, kind) {
    const { unlocked, locked } = this.getGroupedItemRows(snapshot, kind);
    const rows = [
      ...unlocked.map((item) => this.createItemRow(snapshot, item)),
      ...(unlocked.length > 0 && locked.length > 0 ? [this.createDivider()] : []),
      ...locked.map((item) => this.createItemRow(snapshot, item)),
    ];

    this.refs.rows.replaceChildren(...(rows.length ? rows : [this.createEmptyRow(kind)]));
  }

  getGroupedItemRows(snapshot, kind) {
    const rows = this.getItemRows(snapshot, kind).map((item) => ({
      ...item,
      display: getItemDisplay(snapshot, item, item.quantity),
    }));

    return {
      unlocked: rows.filter((item) => !item.display.locked),
      locked: rows.filter((item) => item.display.locked),
    };
  }

  getItemRows(snapshot, kind) {
    if (kind === 'seed') {
      return this.getSeedRows(snapshot);
    }

    if (kind === 'herb') {
      return this.getHerbRows(snapshot);
    }

    if (kind === 'potion') {
      return this.getPotionRows(snapshot);
    }

    return [];
  }

  getSeedRows(snapshot) {
    if (snapshot.seedInventory?.length) {
      return snapshot.seedInventory;
    }

    return (snapshot.inventory ?? []).filter((item) => item.kind === 'seed');
  }

  getHerbRows(snapshot) {
    if (snapshot.garden?.herbs?.length) {
      return snapshot.garden.herbs;
    }

    if (snapshot.brewing?.herbs?.length) {
      return snapshot.brewing.herbs;
    }

    return (snapshot.inventory ?? []).filter((item) => item.kind === 'herb');
  }

  getPotionRows(snapshot) {
    const ownedPotions = (snapshot.inventory ?? []).filter((item) => item.kind === 'potion');
    const ownedByKey = new Map(ownedPotions.map((potion) => [potion.key, potion]));
    const rowsByKey = new Map();

    for (const recipe of snapshot.brewing?.recipes ?? []) {
      const owned = ownedByKey.get(recipe.key);
      rowsByKey.set(recipe.key, {
        itemTypeId: recipe.potionTypeId ?? recipe.itemTypeId,
        key: recipe.key,
        label: recipe.label,
        kind: 'potion',
        quantity: owned?.quantity ?? 0,
        discoveryType: recipe.discoveryType,
        type: recipe.type,
        unknown: recipe.unknown,
        known: recipe.known,
        researchable: recipe.researchable,
        discovered: recipe.discovered,
        researched: Boolean(recipe.unlocked),
        unlocked: Boolean(recipe.unlocked),
      });
    }

    for (const potion of snapshot.discoveries?.potions ?? []) {
      if (!rowsByKey.has(potion.key)) {
        rowsByKey.set(potion.key, {
          ...potion,
          quantity: ownedByKey.get(potion.key)?.quantity ?? potion.quantity ?? 0,
        });
      }
    }

    for (const potion of ownedPotions) {
      if (!rowsByKey.has(potion.key)) {
        rowsByKey.set(potion.key, {
          ...potion,
          researched: isItemResearched(snapshot, potion),
        });
      }
    }

    return [...rowsByKey.values()];
  }

  createDivider() {
    const divider = document.createElement('div');
    divider.className = 'workshop-page__bag-divider';
    divider.setAttribute('role', 'separator');
    return divider;
  }

  createItemRow(snapshot, item) {
    const display = getItemDisplay(snapshot, item, item.quantity);
    const row = document.createElement('div');
    row.className = `workshop-page__row workshop-page__bag-row workshop-page__bag-item-row workshop-page__bag-item-row--${item.kind}`;
    row.classList.toggle('is-empty', item.quantity <= 0);
    row.classList.toggle('is-locked', display.locked);
    row.classList.toggle('is-unknown', display.unknown);
    setResourceColor(row, item.kind);

    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = display.label;
    applyMysteryText(key, item, display.unknown);
    if (display.unknown && item.kind === 'potion') {
      setItemIconLabel(key, 'potion', 'unknownPotion');
    }

    const val = document.createElement('span');
    val.className = 'row_val workshop-page__bag-value';
    val.textContent = display.quantity;
    this.appendItemIcon(val, item, display);

    row.append(key, val);
    return row;
  }

  appendItemIcon(element, item, display) {
    if (display.unknown || display.locked) {
      return;
    }

    const icon = document.createElement('span');
    icon.className = 'workshop-page__bag-value-icon';
    icon.setAttribute('aria-hidden', 'true');
    setItemIconLabel(icon, item.kind, item.key);
    element.append(icon);
  }

  createEmptyRow(kind) {
    const row = document.createElement('div');
    row.className = 'workshop-page__bag-empty';
    row.textContent = `no ${kind}s`;
    return row;
  }

  createRenderSignature(snapshot) {
    if (this.selectedTabId === 'currencies') {
      return `${this.selectedTabId}:${this.getCurrencyRows(snapshot)
        .map((row) => `${row.id}:${row.value}:${row.amount}`)
        .join('|')}`;
    }

    const kind = this.selectedTabId.slice(0, -1);
    return `${this.selectedTabId}:${this.getCompletedResearchSignature(snapshot)}:${this.getItemRows(snapshot, kind)
      .map((item) =>
        [
          item.itemTypeId,
          item.key,
          item.label,
          item.kind,
          item.quantity,
          item.researched,
          item.unlocked,
          item.discovered,
          item.known,
          item.unknown,
          item.discoveryType,
        ].join(':'),
      )
      .join('|')}`;
  }

  getCompletedResearchSignature(snapshot) {
    const ids = new Set(snapshot.research?.completedResearchIds ?? []);

    for (const box of snapshot.research?.boxes ?? []) {
      for (const research of box.researches ?? []) {
        if (research.completed) {
          ids.add(research.id);
        }
      }
    }

    return [...ids].sort().join(',');
  }

  updateScrollProgress() {
    updateScrollCueState({
      scrollElement: this.refs.rows,
      cueElement: this.refs.frame,
      progressFill: this.refs.progressFill,
      progressElement: this.refs.progress,
      inlineCue: false,
    });
  }

  applyVisibility() {
    if (!this.root) {
      return;
    }

    this.root.hidden = !this.visible;
    this.root.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
