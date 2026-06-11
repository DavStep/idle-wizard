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
    this.buyPopupVisible = false;
    this.buyItemTypeId = null;
    this.buyQuantity = 1;
    this.buyStatusText = '';
    this.previousFocus = null;
    this.handleBuyPopupClick = (event) => {
      if (event.target === this.refs.buyPopup) {
        this.hideBuyPopup();
      }
    };
    this.handleKeydown = (event) => {
      if (!this.buyPopupVisible || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      this.hideBuyPopup();
    };
  }

  mount(parent, popupParent = parent) {
    if (!parent || !this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'shop-page__stock style-box';
    this.root.setAttribute('aria-label', 'NPC stock market');

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'npc stock market';

    this.refs.tabs = this.createTabs();
    this.refs.rowsRoot = document.createElement('div');
    this.refs.rowsRoot.className = 'shop-page__stock-rows';
    this.refs.status = document.createElement('div');
    this.refs.status.className = 'shop-page__stock-status';
    this.refs.buyPopup = this.createBuyPopup();

    this.root.append(title, this.refs.rowsRoot, this.refs.status, this.refs.tabs);
    parent.append(this.root);
    popupParent.append(this.refs.buyPopup);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => {
      this.lastSnapshot = snapshot;
      this.render();
    });
    this.lastSnapshot = this.gameplayFacade.getSnapshot();
    this.render();
    this.applyBuyPopupVisibility();

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.buyPopup?.removeEventListener('click', this.handleBuyPopupClick);
    this.root?.remove();
    this.refs.buyPopup?.remove();
    this.root = null;
    this.refs = {
      tabButtons: new Map(),
      rows: new Map(),
    };
    this.selectedTab = 'seed';
    this.lastSnapshot = null;
    this.buyingItemTypeId = null;
    this.statusText = '';
    this.buyPopupVisible = false;
    this.buyItemTypeId = null;
    this.buyQuantity = 1;
    this.buyStatusText = '';
    this.previousFocus = null;
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

  createBuyPopup() {
    const popup = document.createElement('section');
    popup.className = 'shop-page__stock-buy-popup';
    popup.addEventListener('click', this.handleBuyPopupClick);

    const dialog = document.createElement('section');
    dialog.className = 'shop-page__stock-buy-dialog style-dialog';
    dialog.setAttribute('aria-label', 'Buy market stock');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'buy stock';

    const closeButton = document.createElement('button');
    closeButton.className = 'style-button shop-page__stock-buy-close';
    closeButton.type = 'button';
    closeButton.textContent = 'close';
    closeButton.addEventListener('click', () => this.hideBuyPopup());

    this.refs.buyItemValue = this.createValueRow('item');
    this.refs.buyEachValue = this.createValueRow('each');
    this.refs.buyQuantityField = this.createQuantityField();
    this.refs.buyTotalValue = this.createValueRow('total');

    const actionRow = document.createElement('div');
    actionRow.className = 'shop-page__stock-buy-action-row';

    this.refs.buyConfirmButton = document.createElement('button');
    this.refs.buyConfirmButton.className = 'style-button shop-page__stock-buy-confirm';
    this.refs.buyConfirmButton.type = 'button';
    this.refs.buyConfirmButton.textContent = 'buy';
    this.refs.buyConfirmButton.addEventListener('click', () => this.onConfirmBuy());

    this.refs.buyDialogStatus = document.createElement('div');
    this.refs.buyDialogStatus.className = 'shop-page__stock-buy-status';

    actionRow.append(this.refs.buyConfirmButton);
    dialog.append(
      title,
      closeButton,
      this.refs.buyItemValue.row,
      this.refs.buyEachValue.row,
      this.refs.buyQuantityField.field,
      this.refs.buyTotalValue.row,
      actionRow,
      this.refs.buyDialogStatus,
    );
    popup.append(dialog);
    this.refs.buyDialog = dialog;
    return popup;
  }

  createValueRow(labelText) {
    const row = document.createElement('div');
    row.className = 'shop-page__stock-buy-row';

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = labelText;

    const value = document.createElement('span');
    value.className = 'row_val';

    row.append(label, value);
    return { row, value };
  }

  createQuantityField() {
    const field = document.createElement('label');
    field.className = 'shop-page__stock-buy-field';

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = 'amount';

    const input = document.createElement('input');
    input.className = 'style-input shop-page__stock-buy-input';
    input.type = 'number';
    input.inputMode = 'numeric';
    input.min = '1';
    input.step = '1';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Buy quantity');
    input.addEventListener('input', () => this.onBuyQuantityInput());

    field.append(label, input);
    return { field, input };
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

    this.showBuyPopup(itemTypeId);
  }

  onBuyQuantityInput() {
    this.buyQuantity = this.readPositiveInteger(this.refs.buyQuantityField?.input.value) ?? 0;
    this.buyStatusText = '';
    this.renderBuyDialog();
  }

  async onConfirmBuy() {
    if (this.buyingItemTypeId !== null) {
      return;
    }

    const item = this.getItem(this.buyItemTypeId);
    const quantity = this.clampBuyQuantity(this.buyQuantity, item);

    if (!item || !quantity) {
      this.buyStatusText = 'bad amount';
      this.renderBuyDialog();
      return;
    }

    const quote = this.getBuyQuote(item, quantity);

    if (!quote.ok) {
      this.buyStatusText = this.getBuyFailureText(quote.reason);
      this.renderBuyDialog();
      return;
    }

    if ((this.lastSnapshot?.gold?.current ?? 0) < quote.totalPriceGold) {
      this.buyStatusText = 'not enough gold';
      this.renderBuyDialog();
      return;
    }

    this.buyingItemTypeId = item.itemTypeId;
    this.buyStatusText = 'buying';
    this.render();

    const result = await this.gameplayFacade.buyNpcMarketStockItem(
      item.itemTypeId,
      quantity,
    );
    this.lastSnapshot = this.gameplayFacade.getSnapshot();
    this.buyingItemTypeId = null;

    if (result.ok) {
      this.hideBuyPopup();
      this.statusText = '';
    } else {
      this.buyStatusText = this.getBuyFailureText(result.reason);
    }

    this.render();
  }

  showBuyPopup(itemTypeId) {
    this.previousFocus = document.activeElement;
    this.buyItemTypeId = itemTypeId;
    this.buyQuantity = 1;
    this.buyStatusText = '';
    this.buyPopupVisible = true;
    this.applyBuyPopupVisibility();
    this.renderBuyDialog();
    this.refs.buyQuantityField?.input.focus({ preventScroll: true });
    this.refs.buyQuantityField?.input.select();
  }

  hideBuyPopup() {
    const wasVisible = this.buyPopupVisible;
    this.buyPopupVisible = false;
    this.buyItemTypeId = null;
    this.buyQuantity = 1;
    this.buyStatusText = '';
    this.applyBuyPopupVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
  }

  applyBuyPopupVisibility() {
    if (!this.refs.buyPopup) {
      return;
    }

    this.refs.buyPopup.hidden = !this.buyPopupVisible;

    if (this.buyPopupVisible) {
      this.refs.buyDialog?.setAttribute('aria-modal', 'true');
    }
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
    this.renderBuyDialog();
  }

  renderRow(refs, item) {
    const display = getItemDisplay(this.lastSnapshot, item, item.quantity);
    const stock = Number.isFinite(item.stock) ? Math.floor(item.stock) : null;
    const buying = this.buyingItemTypeId === item.itemTypeId;
    const canBuy = this.canBuyItem(item);

    refs.row.classList.toggle('is-empty', stock === 0);
    refs.row.classList.toggle('is-locked', display.locked);
    refs.row.classList.toggle('is-unknown', display.unknown);
    refs.label.textContent = `${display.label} (${stock === null ? '?' : stock})`;
    setResourceColor(refs.label, item.kind);

    refs.button.textContent = buying ? 'buying' : this.getBuyButtonText(item);
    refs.button.disabled = buying || !canBuy;
    refs.button.setAttribute('aria-disabled', refs.button.disabled ? 'true' : 'false');
    setResourceColor(refs.button, refs.button.disabled ? null : 'gold');
  }

  renderStatus(message) {
    this.refs.status.textContent = message;
    this.refs.status.hidden = !message;
    setResourceColorFromText(this.refs.status, message);
  }

  renderBuyDialog() {
    if (!this.refs.buyPopup || !this.buyPopupVisible) {
      return;
    }

    const item = this.getItem(this.buyItemTypeId);

    if (!item) {
      this.buyStatusText = 'buy failed';
      return;
    }

    const display = getItemDisplay(this.lastSnapshot, item, item.quantity);
    const stock = Number.isFinite(item.stock) ? Math.floor(item.stock) : 0;
    const maxQuantity = Math.max(1, Math.min(stock, 10000));
    const quantity = this.clampBuyQuantity(this.buyQuantity, item) ?? 1;
    const quote = this.getBuyQuote(item, quantity);
    const buying = this.buyingItemTypeId === item.itemTypeId;
    const canAfford =
      quote.ok && (this.lastSnapshot?.gold?.current ?? 0) >= quote.totalPriceGold;
    const canBuy = quote.ok && canAfford && !buying;

    this.buyQuantity = quantity;
    this.refs.buyQuantityField.input.max = String(maxQuantity);

    if (this.refs.buyQuantityField.input.value !== String(quantity)) {
      this.refs.buyQuantityField.input.value = String(quantity);
    }

    this.refs.buyItemValue.value.textContent = `${display.label} (${stock})`;
    setResourceColor(this.refs.buyItemValue.value, item.kind);

    this.refs.buyEachValue.value.textContent = formatGoldPriceText(item.buyGold);
    setResourceColor(this.refs.buyEachValue.value, 'gold');

    this.refs.buyTotalValue.value.textContent = quote.ok
      ? formatGoldPriceText(quote.totalPriceGold)
      : '?';
    setResourceColor(this.refs.buyTotalValue.value, quote.ok ? 'gold' : null);

    this.refs.buyConfirmButton.textContent = buying ? 'buying' : 'buy';
    this.refs.buyConfirmButton.disabled = !canBuy;
    this.refs.buyConfirmButton.setAttribute('aria-disabled', canBuy ? 'false' : 'true');

    const status =
      this.buyStatusText ||
      (!quote.ok ? this.getBuyFailureText(quote.reason) : '') ||
      (!canAfford ? 'not enough gold' : '');
    this.refs.buyDialogStatus.textContent = status;
    this.refs.buyDialogStatus.hidden = !status;
    setResourceColorFromText(this.refs.buyDialogStatus, status);
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

  getBuyQuote(item, quantity) {
    const quote = this.gameplayFacade.quoteNpcMarketStockPurchase?.(
      item.itemTypeId,
      quantity,
    );

    if (quote) {
      return quote;
    }

    return {
      ok: Number.isFinite(item.buyGold) && item.buyGold > 0,
      quantity,
      priceGold: item.buyGold,
      totalPriceGold: item.buyGold * quantity,
    };
  }

  readPositiveInteger(value) {
    const integer = Math.floor(Number(value));

    if (!Number.isInteger(integer) || integer <= 0) {
      return null;
    }

    return integer;
  }

  clampBuyQuantity(quantity, item) {
    const safeQuantity = this.readPositiveInteger(quantity);

    if (!item || !safeQuantity) {
      return null;
    }

    const stock = Number.isFinite(item.stock) ? Math.floor(item.stock) : 0;
    const maxQuantity = Math.min(stock, 10000);

    if (maxQuantity <= 0) {
      return null;
    }

    return Math.min(safeQuantity, maxQuantity);
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

    return formatGoldPriceText(item.buyGold);
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
