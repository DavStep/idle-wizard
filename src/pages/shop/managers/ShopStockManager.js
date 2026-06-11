import {
  getItemDisplay,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';
import {
  setResourceColor,
  setResourceColorFromText,
} from '../../shared/resourceColor.js';
import { formatGoldPriceText } from '../../../shared/goldPrice.js';

const STOCK_TABS = [
  { kind: 'seed', label: 'seed' },
  { kind: 'herb', label: 'herb' },
  { kind: 'potion', label: 'potion' },
];

export class ShopStockManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {
      tabButtons: new Map(),
      rows: new Map(),
    };
    this.selectedTab = 'seed';
    this.lastSnapshot = null;
    this.buyingItemTypeId = null;
    this.statusText = '';
  }

  mount(parent) {
    if (!parent || !this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'shop-page__stock style-box';
    this.root.setAttribute('aria-label', 'Market stock');

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'market stock';

    this.refs.tabs = this.createTabs();
    this.refs.rowsRoot = document.createElement('div');
    this.refs.rowsRoot.className = 'shop-page__stock-rows';
    this.refs.status = document.createElement('div');
    this.refs.status.className = 'shop-page__stock-status';

    this.root.append(title, this.refs.tabs, this.refs.rowsRoot, this.refs.status);
    parent.append(this.root);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => {
      this.lastSnapshot = snapshot;
      this.render();
    });
    this.lastSnapshot = this.gameplayFacade.getSnapshot();
    this.render();

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.root?.remove();
    this.root = null;
    this.refs = {
      tabButtons: new Map(),
      rows: new Map(),
    };
    this.selectedTab = 'seed';
    this.lastSnapshot = null;
    this.buyingItemTypeId = null;
    this.statusText = '';
  }

  createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'shop-page__stock-tabs';
    tabs.setAttribute('aria-label', 'Stock item type');
    tabs.setAttribute('role', 'tablist');

    for (const tab of STOCK_TABS) {
      const button = document.createElement('button');
      button.className = 'style-button shop-page__stock-tab-button';
      button.type = 'button';
      button.textContent = tab.label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.onSelectTab(tab.kind));
      this.refs.tabButtons.set(tab.kind, button);
      tabs.append(button);
    }

    return tabs;
  }

  createRow(itemTypeId) {
    const row = document.createElement('div');
    row.className = 'shop-page__stock-row';

    const label = document.createElement('span');
    label.className = 'row_key';

    const value = document.createElement('span');
    value.className = 'row_val shop-page__stock-row-value';

    const button = document.createElement('button');
    button.className = 'style-button shop-page__stock-buy-button';
    button.type = 'button';
    button.addEventListener('click', () => this.onBuyItem(itemTypeId));

    value.append(button);
    row.append(label, value);
    this.refs.rowsRoot.append(row);

    return {
      row,
      label,
      button,
    };
  }

  onSelectTab(kind) {
    if (this.selectedTab === kind) {
      return;
    }

    this.selectedTab = kind;
    this.statusText = '';
    this.render();
  }

  async onBuyItem(itemTypeId) {
    if (this.buyingItemTypeId !== null) {
      return;
    }

    const item = this.getItem(itemTypeId);

    if (!item) {
      return;
    }

    if (!this.canBuyItem(item)) {
      this.statusText = this.getCannotBuyStatus(item);
      this.render();
      return;
    }

    this.buyingItemTypeId = itemTypeId;
    this.statusText = 'buying';
    this.render();

    const result = await this.gameplayFacade.buyNpcMarketStockItem(itemTypeId, 1);
    this.lastSnapshot = this.gameplayFacade.getSnapshot();
    this.buyingItemTypeId = null;
    this.statusText = result.ok ? '' : this.getBuyFailureText(result.reason);
    this.render();
  }

  render() {
    if (!this.root || !this.lastSnapshot) {
      return;
    }

    for (const tab of STOCK_TABS) {
      const selected = this.selectedTab === tab.kind;
      const button = this.refs.tabButtons.get(tab.kind);
      button?.setAttribute('aria-selected', selected ? 'true' : 'false');
      button?.setAttribute('tabindex', selected ? '0' : '-1');
    }

    const items = this.getVisibleStockItems();
    const visibleItemTypeIds = new Set(items.map((item) => item.itemTypeId));

    for (const [itemTypeId, refs] of this.refs.rows) {
      refs.row.hidden = !visibleItemTypeIds.has(itemTypeId);
    }

    for (const item of items) {
      const refs = this.ensureRow(item.itemTypeId);
      this.renderRow(refs, item);
    }

    this.renderStatus(items.length === 0 ? 'empty' : this.statusText);
  }

  renderRow(refs, item) {
    const display = getItemDisplay(this.lastSnapshot, item, item.quantity);
    const stock = Number.isFinite(item.stock) ? Math.floor(item.stock) : null;
    const buying = this.buyingItemTypeId === item.itemTypeId;

    refs.row.classList.toggle('is-empty', stock === 0);
    refs.row.classList.toggle('is-locked', display.locked);
    refs.row.classList.toggle('is-unknown', display.unknown);
    refs.label.textContent = `${display.label} (${stock === null ? '?' : stock})`;
    setResourceColor(refs.label, item.kind);

    refs.button.textContent = buying ? 'buying' : this.getBuyButtonText(item);
    setResourceColorFromText(refs.button, refs.button.textContent);
    refs.button.disabled = buying || !this.canBuyItem(item);
    refs.button.setAttribute('aria-disabled', refs.button.disabled ? 'true' : 'false');
  }

  renderStatus(message) {
    this.refs.status.textContent = message;
    this.refs.status.hidden = !message;
    setResourceColorFromText(this.refs.status, message);
  }

  ensureRow(itemTypeId) {
    if (!this.refs.rows.has(itemTypeId)) {
      this.refs.rows.set(itemTypeId, this.createRow(itemTypeId));
    }

    return this.refs.rows.get(itemTypeId);
  }

  getVisibleStockItems() {
    const items = this.lastSnapshot?.shop?.stock?.items ?? [];

    return items.filter(
      (item) =>
        item.kind === this.selectedTab &&
        shouldShowItemInActionList(this.lastSnapshot, item, item.quantity),
    );
  }

  getItem(itemTypeId) {
    return (
      (this.lastSnapshot?.shop?.stock?.items ?? []).find(
        (item) => item.itemTypeId === itemTypeId,
      ) ?? null
    );
  }

  canBuyItem(item) {
    return (
      Number.isFinite(item.buyGold) &&
      item.buyGold > 0 &&
      Number.isFinite(item.stock) &&
      item.stock > 0 &&
      (this.lastSnapshot?.gold?.current ?? 0) >= item.buyGold &&
      shouldShowItemInActionList(this.lastSnapshot, item, item.quantity)
    );
  }

  getBuyButtonText(item) {
    if (!Number.isFinite(item.buyGold)) {
      return 'offline';
    }

    if (!Number.isFinite(item.stock) || item.stock <= 0) {
      return 'empty';
    }

    return `buy ${formatGoldPriceText(item.buyGold)}`;
  }

  getCannotBuyStatus(item) {
    if (!Number.isFinite(item.buyGold)) {
      return 'offline';
    }

    if (!Number.isFinite(item.stock) || item.stock <= 0) {
      return 'empty';
    }

    return 'not enough gold';
  }

  getBuyFailureText(reason) {
    if (reason === 'not_enough_gold') {
      return 'not enough gold';
    }

    if (reason === 'empty_stock') {
      return 'empty';
    }

    if (reason === 'offline') {
      return 'offline';
    }

    return 'buy failed';
  }
}
