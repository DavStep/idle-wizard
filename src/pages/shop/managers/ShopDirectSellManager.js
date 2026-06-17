import {
  getItemDisplay,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import {
  setResourceColor,
  setResourceColorFromText,
} from '../../shared/resourceColor.js';
import { createAmountSelectionRow } from '../../shared/AmountSelectionRow.js';
import { formatGoldPriceText } from '../../../shared/goldPrice.js';

const DIRECT_SELL_TABS = [
  { kind: 'seed', label: 'seeds' },
  { kind: 'herb', label: 'herbs' },
  { kind: 'potion', label: 'potions' },
];

export class ShopDirectSellManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.refs = {
      tabButtons: new Map(),
      rows: new Map(),
    };
    this.unsubscribe = null;
    this.visible = false;
    this.selectedTab = 'seed';
    this.selectedItemTypeId = null;
    this.sellQuantity = 1;
    this.sellingItemTypeId = null;
    this.statusText = '';
    this.lastSnapshot = null;
    this.previousFocus = null;
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

  mount({ buttonParent, popupParent } = {}) {
    if (!buttonParent || !popupParent || !this.gameplayFacade) {
      return null;
    }

    if (this.refs.button) {
      return this.refs.button;
    }

    this.refs.button = this.createButton();
    this.refs.popup = this.createPopup();
    buttonParent.append(this.refs.button);
    popupParent.append(this.refs.popup);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => {
      this.lastSnapshot = snapshot;
      this.render();
    });
    this.lastSnapshot = this.gameplayFacade.getSnapshot();
    this.render();
    this.applyVisibility();
    return this.refs.button;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.popup?.removeEventListener('click', this.handlePopupClick);
    this.refs.button?.remove();
    this.refs.popup?.remove();
    this.refs = {
      tabButtons: new Map(),
      rows: new Map(),
    };
    this.visible = false;
    this.selectedTab = 'seed';
    this.selectedItemTypeId = null;
    this.sellQuantity = 1;
    this.sellingItemTypeId = null;
    this.statusText = '';
    this.lastSnapshot = null;
    this.previousFocus = null;
  }

  createButton() {
    const button = document.createElement('button');
    button.className = 'style-button shop-page__direct-sell-button';
    button.type = 'button';
    button.textContent = 'fast sell';
    button.dataset.tutorialId = 'shop:directSell';
    button.setAttribute('aria-label', 'fast sell to npc');
    button.addEventListener('click', () => this.show());
    return button;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'shop-page__direct-sell-popup';
    popup.addEventListener('click', this.handlePopupClick);

    const panel = document.createElement('section');
    panel.className = 'shop-page__direct-sell-panel';
    panel.setAttribute('aria-label', 'fast sell to npc');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('role', 'dialog');
    panel.tabIndex = -1;

    const dialog = document.createElement('section');
    dialog.className = 'shop-page__direct-sell-dialog style-dialog';

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'fast sell';

    const closeButton = document.createElement('button');
    closeButton.className = 'style-button shop-page__direct-sell-close';
    closeButton.type = 'button';
    closeButton.textContent = 'close';
    closeButton.addEventListener('click', () => this.hide());

    this.refs.selectedItem = this.createSelectedItemRow();
    this.refs.quantityField = createAmountSelectionRow({
      ariaLabel: 'amount',
      className: 'shop-page__direct-sell-field',
      inputClassName: 'shop-page__direct-sell-input',
      stepClassName: 'shop-page__direct-sell-step',
      onInput: () => this.onQuantityInput(),
      onStep: (delta) => this.onQuantityStep(delta),
    });
    this.refs.totalValue = this.createValueRow('total');

    const actionRow = document.createElement('div');
    actionRow.className = 'shop-page__direct-sell-action-row';
    this.refs.actionRow = actionRow;

    this.refs.confirmButton = document.createElement('button');
    this.refs.confirmButton.className = 'style-button shop-page__direct-sell-confirm';
    this.refs.confirmButton.type = 'button';
    this.refs.confirmButton.textContent = 'sell';
    this.refs.confirmButton.dataset.tutorialId = 'shop:directSell:sell';
    this.refs.confirmButton.addEventListener('click', () => this.onConfirmSell());

    this.refs.status = document.createElement('div');
    this.refs.status.className = 'shop-page__direct-sell-status';

    this.refs.divider = document.createElement('div');
    this.refs.divider.className = 'shop-page__direct-sell-divider';

    this.refs.rowsRoot = document.createElement('div');
    this.refs.rowsRoot.className = 'shop-page__direct-sell-rows';

    this.refs.tabs = this.createTabs();

    actionRow.append(this.refs.confirmButton);
    dialog.append(
      title,
      closeButton,
      this.refs.selectedItem.row,
      this.refs.quantityField.field,
      this.refs.totalValue.row,
      actionRow,
      this.refs.status,
      this.refs.divider,
      this.refs.rowsRoot,
    );
    panel.append(dialog, this.refs.tabs);
    popup.append(panel);
    this.refs.dialog = panel;
    return popup;
  }

  createSelectedItemRow() {
    const row = document.createElement('div');
    row.className = 'shop-page__direct-sell-selected-row';

    const label = document.createElement('span');
    label.className = 'row_key';

    const value = document.createElement('span');
    value.className = 'row_val';

    row.append(label, value);
    return { row, label, value };
  }

  createValueRow(labelText) {
    const row = document.createElement('div');
    row.className = 'shop-page__direct-sell-value-row';

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = labelText;

    const value = document.createElement('span');
    value.className = 'row_val';

    row.append(label, value);
    return { row, value };
  }

  createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'shop-page__direct-sell-tabs';
    tabs.setAttribute('aria-label', 'fast sell item type');
    tabs.setAttribute('role', 'tablist');

    for (const tab of DIRECT_SELL_TABS) {
      const button = document.createElement('button');
      button.className = 'style-button shop-page__direct-sell-tab-button';
      button.type = 'button';
      button.textContent = tab.label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.onSelectTab(tab.kind));
      this.refs.tabButtons.set(tab.kind, button);
      tabs.append(button);
    }

    return tabs;
  }

  show() {
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.statusText = '';
    this.applyVisibility();
    this.render();
    this.refs.dialog?.focus();
    this.refs.quantityField?.hideInput();
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.statusText = '';
    this.applyVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
  }

  onSelectTab(kind) {
    if (this.selectedTab === kind) {
      return;
    }

    this.selectedTab = kind;
    this.statusText = '';
    this.render();
  }

  onSelectItem(itemTypeId) {
    this.selectedItemTypeId = itemTypeId;
    this.sellQuantity = 1;
    this.statusText = '';
    this.render();
    this.refs.quantityField?.hideInput();
  }

  onQuantityInput() {
    this.sellQuantity = this.readPositiveInteger(this.refs.quantityField?.input.value) ?? 0;
    this.statusText = '';
    this.renderDetails();
  }

  onQuantityStep(delta) {
    const item = this.getSelectedItem();
    const quantity = this.clampSellQuantity(this.sellQuantity, item) ?? 1;
    const nextQuantity = this.clampSteppedSellQuantity(quantity + delta, item);

    if (!nextQuantity || nextQuantity === quantity) {
      return;
    }

    this.sellQuantity = nextQuantity;
    this.statusText = '';
    this.renderDetails();
  }

  async onConfirmSell() {
    if (this.sellingItemTypeId !== null) {
      return;
    }

    const item = this.getSelectedItem();
    const quantity = this.clampSellQuantity(this.sellQuantity, item);

    if (!item || !quantity) {
      this.statusText = 'bad amount';
      this.renderDetails();
      return;
    }

    const quote = this.getSellQuote(item, quantity);

    if (!quote.ok) {
      this.statusText = this.getSellFailureText(quote.reason);
      this.renderDetails();
      return;
    }

    this.sellingItemTypeId = item.itemTypeId;
    this.statusText = 'selling';
    this.render();

    const result = await this.gameplayFacade.sellNpcMarketItem(item.itemTypeId, quantity);
    this.lastSnapshot = this.gameplayFacade.getSnapshot();
    this.sellingItemTypeId = null;

    if (result.ok) {
      this.hide();
      return;
    }

    this.statusText = this.getSellFailureText(result.reason);
    this.render();
  }

  render() {
    if (!this.refs.popup || !this.lastSnapshot || !this.visible) {
      return;
    }

    for (const tab of DIRECT_SELL_TABS) {
      const selected = this.selectedTab === tab.kind;
      const button = this.refs.tabButtons.get(tab.kind);
      button?.setAttribute('aria-selected', selected ? 'true' : 'false');
      button?.setAttribute('tabindex', selected ? '0' : '-1');
    }

    const items = this.getVisibleItems();
    const visibleItemTypeIds = new Set(items.map((item) => item.itemTypeId));

    for (const [itemTypeId, refs] of this.refs.rows) {
      refs.row.hidden = !visibleItemTypeIds.has(itemTypeId);
    }

    if (this.selectedItemTypeId !== null && !this.canKeepSelectedItem()) {
      this.selectedItemTypeId = null;
      this.sellQuantity = 1;
    }

    items.forEach((item) => this.renderRow(this.ensureRow(item.itemTypeId), item));
    this.renderDetails();
  }

  renderRow(refs, item) {
    const display = getItemDisplay(this.lastSnapshot, item, item.quantity);
    const selected = this.selectedItemTypeId === item.itemTypeId;
    const selling = this.sellingItemTypeId === item.itemTypeId;
    const canSelect = item.quantity > 0 && shouldShowItemInActionList(
      this.lastSnapshot,
      item,
      item.quantity,
    );

    refs.row.classList.toggle('is-empty', display.empty);
    refs.row.classList.toggle('is-locked', display.locked);
    refs.row.classList.toggle('is-unknown', display.unknown);
    refs.button.disabled = !canSelect || selling;
    refs.button.setAttribute('aria-disabled', refs.button.disabled ? 'true' : 'false');
    refs.button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    refs.button.dataset.directSellItemKey = item.key;
    refs.button.dataset.tutorialId = `shop:directSell:${item.key}`;
    refs.label.textContent = `${display.label} (${display.quantity})`;
    setItemIconLabel(refs.label, item.kind, item.key);
    setResourceColor(refs.label, item.kind);
    setResourceIconText(refs.value, this.formatSellGold(this.getFastSellGold(item)));
    setResourceColorFromText(refs.value, refs.value.textContent);
  }

  renderDetails() {
    if (!this.refs.selectedItem) {
      return;
    }

    const item = this.getSelectedItem();
    const hasItem = Boolean(item);

    this.refs.totalValue.row.hidden = !hasItem;
    this.refs.quantityField.field.hidden = !hasItem;
    this.refs.actionRow.hidden = !hasItem;
    this.refs.confirmButton.hidden = !hasItem;

    if (!item) {
      this.refs.selectedItem.label.textContent = 'no item selected';
      setItemIconLabel(this.refs.selectedItem.label, null);
      setResourceColor(this.refs.selectedItem.label, null);
      this.refs.selectedItem.value.textContent = '';
      setResourceColor(this.refs.selectedItem.value, null);
      this.renderStatus('select item');
      return;
    }

    const maxQuantity = Math.max(1, this.getMaxSellQuantity(item));
    const quantity = this.clampSellQuantity(this.sellQuantity, item) ?? 1;
    const quote = this.getSellQuote(item, quantity);
    const selling = this.sellingItemTypeId === item.itemTypeId;
    const canSell = quote.ok && !selling;
    const display = getItemDisplay(this.lastSnapshot, item, item.quantity);

    this.sellQuantity = quantity;
    this.refs.quantityField.input.max = String(maxQuantity);
    this.refs.quantityField.setValue(quantity);

    for (const [delta, button] of this.refs.quantityField.stepButtons) {
      const nextQuantity = this.clampSteppedSellQuantity(quantity + delta, item);
      const disabled = selling || !nextQuantity || nextQuantity === quantity;
      button.disabled = disabled;
      button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    }

    this.refs.selectedItem.label.textContent = `${display.label} (${display.quantity})`;
    setItemIconLabel(this.refs.selectedItem.label, item.kind, item.key);
    setResourceColor(this.refs.selectedItem.label, item.kind);

    setResourceIconText(
      this.refs.selectedItem.value,
      this.formatSellGold(this.getFastSellGold(item)),
    );
    setResourceColor(this.refs.selectedItem.value, 'gold');

    setResourceIconText(
      this.refs.totalValue.value,
      quote.ok ? formatGoldPriceText(quote.totalPriceGold) : '?',
    );
    setResourceColor(this.refs.totalValue.value, quote.ok ? 'gold' : null);

    this.refs.confirmButton.textContent = selling ? 'selling' : 'sell';
    this.refs.confirmButton.disabled = !canSell;
    this.refs.confirmButton.setAttribute('aria-disabled', canSell ? 'false' : 'true');

    const status =
      this.statusText ||
      (!quote.ok ? this.getSellFailureText(quote.reason) : '');
    this.renderStatus(status);
  }

  renderStatus(message) {
    setResourceIconText(this.refs.status, message);
    this.refs.status.hidden = !message;
    setResourceColorFromText(this.refs.status, message);
  }

  ensureRow(itemTypeId) {
    if (!this.refs.rows.has(itemTypeId)) {
      this.refs.rows.set(itemTypeId, this.createRow(itemTypeId));
    }

    return this.refs.rows.get(itemTypeId);
  }

  createRow(itemTypeId) {
    const button = document.createElement('button');
    button.className =
      'shop-page__direct-sell-row shop-page__sell-item-row shop-page__direct-sell-item-button shop-page__sell-item-button';
    button.type = 'button';
    button.addEventListener('click', () => this.onSelectItem(itemTypeId));

    const label = document.createElement('span');
    label.className = 'row_key';

    const value = document.createElement('span');
    value.className = 'row_val';

    button.append(label, value);
    this.refs.rowsRoot.append(button);
    return {
      row: button,
      button,
      label,
      value,
    };
  }

  getVisibleItems() {
    const items = this.lastSnapshot?.shop?.shelf?.sellItems ?? [];

    return items.filter(
      (item) =>
        item.kind === this.selectedTab &&
        shouldShowItemInActionList(this.lastSnapshot, item, item.quantity),
    );
  }

  getSelectedItem() {
    if (this.selectedItemTypeId === null) {
      return null;
    }

    return (
      (this.lastSnapshot?.shop?.shelf?.sellItems ?? []).find(
        (item) => item.itemTypeId === this.selectedItemTypeId,
      ) ?? null
    );
  }

  canKeepSelectedItem() {
    const item = this.getSelectedItem();
    return Boolean(
      item && shouldShowItemInActionList(this.lastSnapshot, item, item.quantity),
    );
  }

  getSellQuote(item, quantity) {
    const quote = this.gameplayFacade.quoteNpcMarketSell?.(item.itemTypeId, quantity);

    if (quote) {
      return quote;
    }

    const fastSellGold = this.getFastSellGold(item);

    return {
      ok: Number.isFinite(fastSellGold) && fastSellGold > 0,
      quantity,
      priceGold: fastSellGold,
      totalPriceGold: fastSellGold * quantity,
    };
  }

  readPositiveInteger(value) {
    const integer = Math.floor(Number(value));

    if (!Number.isInteger(integer) || integer <= 0) {
      return null;
    }

    return integer;
  }

  clampSellQuantity(quantity, item) {
    const safeQuantity = this.readPositiveInteger(quantity);

    if (!item || !safeQuantity) {
      return null;
    }

    const maxQuantity = this.getMaxSellQuantity(item);

    if (maxQuantity <= 0) {
      return null;
    }

    return Math.min(safeQuantity, maxQuantity);
  }

  clampSteppedSellQuantity(quantity, item) {
    const integer = Math.floor(Number(quantity));
    const maxQuantity = this.getMaxSellQuantity(item);

    if (!Number.isInteger(integer) || maxQuantity <= 0) {
      return null;
    }

    return Math.min(Math.max(1, integer), maxQuantity);
  }

  getMaxSellQuantity(item) {
    const quantity = Number.isFinite(item?.quantity) ? Math.floor(item.quantity) : 0;
    return Math.min(quantity, 10_000);
  }

  getFastSellGold(item) {
    return Number.isFinite(item?.fastSellGold) ? item.fastSellGold : item?.sellGold;
  }

  formatSellGold(sellGold) {
    if (!Number.isFinite(sellGold)) {
      return 'offline';
    }

    return formatGoldPriceText(sellGold);
  }

  getSellFailureText(reason) {
    if (reason === 'not_enough_items') {
      return 'not enough items';
    }

    if (reason === 'demand_too_low') {
      return 'demand too low';
    }

    if (reason === 'invalid_quantity') {
      return 'bad amount';
    }

    if (reason === 'missing_price' || reason === 'missing_need' || reason === 'offline') {
      return 'offline';
    }

    return 'sell failed';
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
