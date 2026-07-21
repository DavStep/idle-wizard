import {
  getItemDisplay,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setResourceColor, setResourceColorFromText } from '../../shared/resourceColor.js';
import { setSelectedTabState } from '../../shared/selectedTabState.js';
import { createAmountSelectionRow } from '../../shared/AmountSelectionRow.js';
import { formatCoinPriceText } from '../../../shared/coinPrice.js';

const LEDGER_TABS = [
  { kind: 'seed', label: 'seeds' },
  { kind: 'herb', label: 'herbs' },
  { kind: 'potion', label: 'potions' },
];

export class ShopMarketLedgerManager {
  constructor({ gameplayFacade, getBuyQuoteOverride, now = () => Date.now() } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.getBuyQuoteOverride =
      typeof getBuyQuoteOverride === 'function' ? getBuyQuoteOverride : null;
    this.now = now;
    this.root = null;
    this.unsubscribe = null;
    this.lastSnapshot = null;
    this.visible = false;
    this.helpVisible = false;
    this.buyMode = false;
    this.selectedTab = 'seed';
    this.selectedItemTypeId = null;
    this.buyQuantity = 1;
    this.buyingItemTypeId = null;
    this.statusText = '';
    this.previousFocus = null;
    this.refs = { tabButtons: new Map(), rows: new Map(), history: [] };
    this.handlePopupClick = (event) => {
      if (event.target === this.refs.popup) this.hide();
    };
    this.handleDocumentClick = (event) => {
      if (this.helpVisible && !this.root?.contains(event.target)) this.hideHelp();
    };
    this.handleKeydown = (event) => {
      if (event.key !== 'Escape') return;
      if (this.buyMode) {
        event.preventDefault();
        this.closeBuy();
      } else if (this.visible) {
        event.preventDefault();
        this.hide();
      } else if (this.helpVisible) {
        event.preventDefault();
        this.hideHelp();
      }
    };
  }

  mount({ buttonParent, popupParent } = {}) {
    if (!buttonParent || !popupParent || !this.gameplayFacade) return null;
    if (this.root) return this.root;

    this.root = this.createControls();
    this.refs.popup = this.createPopup();
    buttonParent.append(this.root);
    popupParent.append(this.refs.popup);
    document.addEventListener('click', this.handleDocumentClick);
    document.addEventListener('keydown', this.handleKeydown);
    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => {
      this.lastSnapshot = snapshot;
      this.render();
    });
    this.lastSnapshot = this.gameplayFacade.getSnapshot();
    this.render();
    this.applyVisibility();
    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    document.removeEventListener('click', this.handleDocumentClick);
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.popup?.removeEventListener('click', this.handlePopupClick);
    this.root?.remove();
    this.refs.popup?.remove();
    this.root = null;
    this.unsubscribe = null;
    this.lastSnapshot = null;
    this.visible = false;
    this.helpVisible = false;
    this.buyMode = false;
    this.selectedItemTypeId = null;
    this.refs = { tabButtons: new Map(), rows: new Map(), history: [] };
  }

  createControls() {
    const root = document.createElement('div');
    root.className = 'shop-page__ledger-controls';

    this.refs.openButton = document.createElement('button');
    this.refs.openButton.className = 'style-button shop-page__ledger-open';
    this.refs.openButton.type = 'button';
    this.refs.openButton.textContent = 'market ledger';
    this.refs.openButton.addEventListener('click', () => this.show());

    this.refs.helpButton = document.createElement('button');
    this.refs.helpButton.className = 'style-button shop-page__ledger-help-button';
    this.refs.helpButton.type = 'button';
    this.refs.helpButton.textContent = '[i]';
    this.refs.helpButton.setAttribute('aria-label', 'how the market ledger works');
    this.refs.helpButton.setAttribute('aria-expanded', 'false');
    this.refs.helpButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.helpVisible ? this.hideHelp() : this.showHelp();
    });

    this.refs.help = document.createElement('div');
    this.refs.help.className = 'style-tooltip shop-page__ledger-help';
    this.refs.help.textContent = 'compare trader prices, stock, buyers, and recent changes.';
    this.refs.help.hidden = true;
    this.refs.help.setAttribute('role', 'tooltip');

    root.append(this.refs.openButton, this.refs.helpButton, this.refs.help);
    return root;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'shop-page__ledger-popup';
    popup.addEventListener('click', this.handlePopupClick);

    const panel = document.createElement('section');
    panel.className = 'shop-page__ledger-panel';
    panel.setAttribute('aria-label', 'market ledger');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('role', 'dialog');
    panel.tabIndex = -1;

    this.refs.book = document.createElement('section');
    this.refs.book.className = 'style-dialog shop-page__ledger-book';
    this.refs.title = document.createElement('div');
    this.refs.title.className = 'style-box__title';

    const close = document.createElement('button');
    close.className = 'style-button shop-page__ledger-close';
    close.type = 'button';
    close.textContent = 'close';
    close.addEventListener('click', () => this.hide());

    this.refs.detail = this.createDetail();
    const header = document.createElement('div');
    header.className = 'shop-page__ledger-row shop-page__ledger-row--header';
    header.innerHTML = '<span>item</span><span>you sell</span><span>you buy</span><span>change</span>';
    this.refs.rowsRoot = document.createElement('div');
    this.refs.rowsRoot.className = 'shop-page__ledger-rows';
    this.refs.status = document.createElement('div');
    this.refs.status.className = 'shop-page__ledger-status';

    this.refs.book.append(
      this.refs.title,
      close,
      this.refs.detail.root,
      header,
      this.refs.rowsRoot,
      this.refs.status,
    );
    this.refs.tabs = this.createTabs();
    this.refs.buyDialog = this.createBuyDialog();
    panel.append(this.refs.book, this.refs.buyDialog, this.refs.tabs);
    popup.append(panel);
    this.refs.panel = panel;
    return popup;
  }

  createDetail() {
    const root = document.createElement('section');
    root.className = 'shop-page__ledger-detail';
    const heading = document.createElement('div');
    heading.className = 'shop-page__ledger-detail-heading';
    const label = document.createElement('span');
    label.className = 'row_key';
    const market = document.createElement('span');
    market.className = 'row_val';
    heading.append(label, market);

    const history = document.createElement('div');
    history.className = 'shop-page__ledger-history';
    for (const timeLabel of ['now', '1h', '2h', '3h']) {
      const cell = document.createElement('div');
      const time = document.createElement('span');
      const value = document.createElement('span');
      time.textContent = timeLabel;
      cell.append(time, value);
      history.append(cell);
      this.refs.history.push(value);
    }

    const facts = document.createElement('div');
    facts.className = 'shop-page__ledger-facts';
    const buyers = document.createElement('span');
    const stock = document.createElement('span');
    this.refs.detailBuy = document.createElement('button');
    this.refs.detailBuy.className = 'style-button shop-page__ledger-buy';
    this.refs.detailBuy.type = 'button';
    this.refs.detailBuy.textContent = 'buy';
    this.refs.detailBuy.addEventListener('click', () => this.openBuy());
    facts.append(buyers, stock, this.refs.detailBuy);
    root.append(heading, history, facts);
    return { root, label, market, buyers, stock };
  }

  createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'shop-page__ledger-tabs';
    tabs.setAttribute('aria-label', 'ledger catalogue');
    tabs.setAttribute('role', 'tablist');
    for (const tab of LEDGER_TABS) {
      const button = document.createElement('button');
      button.className = 'style-button shop-page__ledger-tab';
      button.type = 'button';
      button.textContent = tab.label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => {
        this.selectedTab = tab.kind;
        this.selectedItemTypeId = null;
        this.statusText = '';
        this.render();
      });
      this.refs.tabButtons.set(tab.kind, button);
      tabs.append(button);
    }
    return tabs;
  }

  createBuyDialog() {
    const dialog = document.createElement('section');
    dialog.className = 'style-dialog shop-page__ledger-buy-dialog';
    dialog.hidden = true;
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'buy from trader';
    const back = document.createElement('button');
    back.className = 'style-button shop-page__ledger-close';
    back.type = 'button';
    back.textContent = 'back';
    back.addEventListener('click', () => this.closeBuy());
    this.refs.buyItem = this.createValueRow('item');
    this.refs.buyEach = this.createValueRow('each');
    this.refs.buyQuantity = createAmountSelectionRow({
      ariaLabel: 'amount',
      className: 'shop-page__stock-buy-field',
      inputClassName: 'shop-page__stock-buy-input',
      stepClassName: 'shop-page__stock-buy-step',
      onInput: () => {
        this.buyQuantity = this.readPositiveInteger(this.refs.buyQuantity.input.value) ?? 0;
        this.statusText = '';
        this.renderBuy();
      },
      onStep: (delta) => this.stepBuyQuantity(delta),
    });
    this.refs.buyTotal = this.createValueRow('total');
    this.refs.buyConfirm = document.createElement('button');
    this.refs.buyConfirm.className = 'style-button shop-page__stock-buy-confirm';
    this.refs.buyConfirm.type = 'button';
    this.refs.buyConfirm.textContent = 'buy';
    this.refs.buyConfirm.addEventListener('click', () => this.confirmBuy());
    this.refs.buyStatus = document.createElement('div');
    this.refs.buyStatus.className = 'shop-page__stock-buy-status';
    dialog.append(
      title,
      back,
      this.refs.buyItem.row,
      this.refs.buyEach.row,
      this.refs.buyQuantity.field,
      this.refs.buyTotal.row,
      this.refs.buyConfirm,
      this.refs.buyStatus,
    );
    return dialog;
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

  show() {
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.helpVisible = false;
    this.statusText = '';
    this.applyVisibility();
    this.render();
    this.refs.panel?.focus();
  }

  hide() {
    const restore = this.previousFocus;
    this.visible = false;
    this.buyMode = false;
    this.statusText = '';
    this.applyVisibility();
    if (restore && document.contains(restore)) restore.focus();
    this.previousFocus = null;
  }

  showHelp() {
    this.helpVisible = true;
    this.applyHelpVisibility();
  }

  hideHelp() {
    this.helpVisible = false;
    this.applyHelpVisibility();
  }

  render() {
    if (!this.lastSnapshot) return;
    const market = this.lastSnapshot.shop?.market;
    this.refs.title.textContent = `${String(market?.name ?? 'market').toLowerCase()} ledger`;
    this.applyHelpVisibility();
    if (!this.visible) return;

    for (const tab of LEDGER_TABS) {
      setSelectedTabState(this.refs.tabButtons.get(tab.kind), this.selectedTab === tab.kind, {
        tabIndex: true,
      });
    }

    const items = this.getVisibleItems();
    const ids = new Set(items.map((item) => item.itemTypeId));
    for (const [id, refs] of this.refs.rows) refs.row.hidden = !ids.has(id);
    for (const item of items) this.renderRow(this.ensureRow(item), item);

    if (this.selectedItemTypeId !== null && !ids.has(this.selectedItemTypeId)) {
      this.selectedItemTypeId = null;
    }
    this.refs.status.textContent = items.length ? '' : 'no known items';
    this.refs.status.hidden = items.length > 0;
    this.renderDetail();
    this.renderBuy();
  }

  ensureRow(item) {
    if (this.refs.rows.has(item.itemTypeId)) return this.refs.rows.get(item.itemTypeId);
    const row = document.createElement('button');
    row.className = 'shop-page__ledger-row shop-page__ledger-item-row';
    row.type = 'button';
    const label = document.createElement('span');
    const sell = document.createElement('span');
    const buy = document.createElement('span');
    const trend = document.createElement('span');
    row.append(label, sell, buy, trend);
    row.addEventListener('click', () => {
      this.selectedItemTypeId = item.itemTypeId;
      this.statusText = '';
      this.renderDetail();
    });
    this.refs.rows.set(item.itemTypeId, { row, label, sell, buy, trend });
    this.refs.rowsRoot.append(row);
    return this.refs.rows.get(item.itemTypeId);
  }

  renderRow(refs, item) {
    const display = getItemDisplay(this.lastSnapshot, item, this.getDisplayQuantity(item));
    refs.row.classList.toggle('is-selected', item.itemTypeId === this.selectedItemTypeId);
    refs.row.classList.toggle('is-market-locked', item.tradedHere === false);
    refs.row.dataset.shopLedgerItemKey = item.key;
    refs.row.setAttribute(
      'aria-label',
      item.tradedHere === false
        ? `${display.label}, not traded here`
        : `${display.label}, market prices`,
    );
    refs.label.textContent = display.label;
    setItemIconLabel(refs.label, item.kind, item.key);
    setResourceColor(refs.label, item.kind);
    if (item.tradedHere === false) {
      refs.sell.textContent = 'not traded';
      refs.buy.textContent = 'not traded';
      refs.trend.textContent = this.getRequiredMarketLabel(item);
      return;
    }
    setResourceIconText(refs.sell, this.priceText(item.sellCoin));
    setResourceIconText(refs.buy, this.priceText(item.buyCoin));
    refs.trend.textContent = this.getTrendText(item);
  }

  renderDetail() {
    const item = this.getSelectedItem();
    this.refs.detail.root.hidden = !item;
    if (!item) return;
    const display = getItemDisplay(this.lastSnapshot, item, this.getDisplayQuantity(item));
    this.refs.detail.label.textContent = display.label;
    setItemIconLabel(this.refs.detail.label, item.kind, item.key);
    setResourceColor(this.refs.detail.label, item.kind);

    if (item.tradedHere === false) {
      this.refs.detail.market.textContent = `not traded here · ${this.getRequiredMarketLabel(item)}`;
      this.refs.detail.buyers.textContent = 'buyers —';
      this.refs.detail.stock.textContent = 'stock —';
      this.refs.history.forEach((value) => { value.textContent = '—'; });
      this.refs.detailBuy.hidden = true;
      return;
    }

    this.refs.detail.market.textContent = this.getTrendText(item);
    this.refs.detail.buyers.textContent = Number.isFinite(item.sellNeed)
      ? item.sellNeed > 0 ? `buyers want ${Math.floor(item.sellNeed)}` : 'no buyers'
      : 'buyers offline';
    this.refs.detail.stock.textContent = Number.isFinite(item.stock)
      ? `stock ${Math.max(0, Math.floor(item.stock))}`
      : 'stock offline';
    this.getHistoryValues(item).forEach((price, index) => {
      setResourceIconText(this.refs.history[index], this.priceText(price));
    });
    this.refs.detailBuy.hidden = false;
    this.refs.detailBuy.disabled = !this.canBuy(item);
    this.refs.detailBuy.textContent = Number.isFinite(item.stock) && item.stock <= 0 ? 'out of stock' : 'buy';
  }

  openBuy() {
    const item = this.getSelectedItem();
    if (!this.canBuy(item)) return;
    this.buyMode = true;
    this.buyQuantity = 1;
    this.statusText = '';
    this.applyBuyMode();
    this.renderBuy();
    this.refs.buyQuantity.hideInput();
  }

  closeBuy() {
    this.buyMode = false;
    this.statusText = '';
    this.applyBuyMode();
  }

  stepBuyQuantity(delta) {
    const item = this.getSelectedItem();
    const max = this.getMaxBuyQuantity(item);
    const next = Math.min(max, Math.max(1, (this.readPositiveInteger(this.buyQuantity) ?? 1) + delta));
    if (next === this.buyQuantity) return;
    this.buyQuantity = next;
    this.statusText = '';
    this.renderBuy();
  }

  async confirmBuy() {
    const item = this.getSelectedItem();
    const quantity = Math.min(this.getMaxBuyQuantity(item), this.readPositiveInteger(this.buyQuantity) ?? 0);
    if (!item || quantity <= 0 || this.buyingItemTypeId !== null) return;
    const quote = this.getBuyQuote(item, quantity);
    if (!quote.ok) {
      this.statusText = this.getBuyFailureText(quote.reason);
      this.renderBuy();
      return;
    }
    if ((this.lastSnapshot?.coin?.current ?? 0) < quote.totalPriceCoin) {
      this.statusText = 'not enough coin';
      this.renderBuy();
      return;
    }
    this.buyingItemTypeId = item.itemTypeId;
    this.renderBuy();
    const result = await this.gameplayFacade.buyNpcMarketStockItem(item.itemTypeId, quantity);
    this.lastSnapshot = this.gameplayFacade.getSnapshot();
    this.buyingItemTypeId = null;
    if (result.ok) this.closeBuy();
    else this.statusText = this.getBuyFailureText(result.reason);
    this.render();
  }

  renderBuy() {
    if (!this.buyMode) return;
    const item = this.getSelectedItem();
    if (!item) return;
    const max = Math.max(1, this.getMaxBuyQuantity(item));
    const quantity = Math.min(max, this.readPositiveInteger(this.buyQuantity) ?? 1);
    this.buyQuantity = quantity;
    const quote = this.getBuyQuote(item, quantity);
    const display = getItemDisplay(this.lastSnapshot, item, this.getDisplayQuantity(item));
    this.refs.buyItem.value.textContent = display.label;
    this.refs.buyItem.value.dataset.shopLedgerItemKey = item.key;
    setItemIconLabel(this.refs.buyItem.value, item.kind, item.key);
    setResourceColor(this.refs.buyItem.value, item.kind);
    setResourceIconText(this.refs.buyEach.value, this.priceText(item.buyCoin));
    setResourceIconText(
      this.refs.buyTotal.value,
      quote.ok ? formatCoinPriceText(quote.totalPriceCoin) : 'offline',
    );
    this.refs.buyQuantity.input.max = String(max);
    this.refs.buyQuantity.setValue(quantity);
    for (const [delta, button] of this.refs.buyQuantity.stepButtons) {
      const next = Math.min(max, Math.max(1, quantity + delta));
      button.disabled = next === quantity || this.buyingItemTypeId !== null;
    }
    const canAfford = quote.ok && (this.lastSnapshot?.coin?.current ?? 0) >= quote.totalPriceCoin;
    this.refs.buyConfirm.disabled = !quote.ok || !canAfford || this.buyingItemTypeId !== null;
    this.refs.buyConfirm.textContent = this.buyingItemTypeId !== null ? 'buying' : 'buy';
    this.refs.buyStatus.textContent = this.statusText || (!canAfford ? 'not enough coin' : '');
    this.refs.buyStatus.hidden = !this.refs.buyStatus.textContent;
    setResourceColorFromText(this.refs.buyStatus, this.refs.buyStatus.textContent);
  }

  getVisibleItems() {
    return (this.lastSnapshot?.shop?.stock?.items ?? []).filter(
      (item) => item.kind === this.selectedTab && shouldShowItemInActionList(
        this.lastSnapshot,
        item,
        this.getDisplayQuantity(item),
      ),
    );
  }

  getSelectedItem() {
    return (this.lastSnapshot?.shop?.stock?.items ?? []).find(
      (item) => item.itemTypeId === this.selectedItemTypeId,
    ) ?? null;
  }

  getDisplayQuantity(item) {
    return Math.max(
      Number.isFinite(item?.quantity) ? Math.floor(item.quantity) : 0,
      Number.isFinite(item?.stock) ? Math.floor(item.stock) : 0,
    );
  }

  getHistoryValues(item) {
    const historyByHoursAgo = this.getHistoryByHoursAgo(item);
    return [
      item?.marketPriceCoin,
      historyByHoursAgo.get(1)?.marketPriceCoin ?? null,
      historyByHoursAgo.get(2)?.marketPriceCoin ?? null,
      historyByHoursAgo.get(3)?.marketPriceCoin ?? null,
    ];
  }

  getTrendText(item) {
    const historyByHoursAgo = this.getHistoryByHoursAgo(item);
    const hours = [3, 2, 1].find((candidate) => historyByHoursAgo.has(candidate));
    if (!Number.isFinite(item?.marketPriceCoin) || !hours) return '—';
    const oldest = historyByHoursAgo.get(hours);
    const previous = Number(oldest?.marketPriceCoin);
    if (!Number.isFinite(previous)) return '—';
    const delta = item.marketPriceCoin - previous;
    if (delta === 0) return `— 0 / ${hours}h`;
    return `${delta > 0 ? '↑' : '↓'} ${delta > 0 ? '+' : '−'}${formatCoinPriceText(Math.abs(delta))} / ${hours}h`;
  }

  getHistoryByHoursAgo(item) {
    const currentHour = Math.floor(Number(this.now?.()) / 3_600_000);
    const historyByHoursAgo = new Map();

    if (!Number.isFinite(currentHour)) return historyByHoursAgo;

    for (const row of Array.isArray(item?.priceHistory) ? item.priceHistory : []) {
      const rowHour = this.getHistoryHour(row);
      const hoursAgo = currentHour - rowHour;
      if (Number.isInteger(hoursAgo) && hoursAgo >= 1 && hoursAgo <= 3) {
        historyByHoursAgo.set(hoursAgo, row);
      }
    }

    return historyByHoursAgo;
  }

  getHistoryHour(row) {
    const rawHourKey = String(row?.hourKey ?? '').trim();
    const hourKey = Number(rawHourKey);
    if (rawHourKey && Number.isInteger(hourKey)) return hourKey;
    return Math.floor(Number(row?.updatedAtMs) / 3_600_000);
  }

  getRequiredMarketLabel(item) {
    const market = item?.requiredMarket;
    return market?.name ? `${String(market.name).toLowerCase()} ${'★'.repeat(market.rank ?? 1)}` : 'higher market';
  }

  getBuyQuote(item, quantity) {
    return this.gameplayFacade.quoteNpcMarketStockPurchase?.(item.itemTypeId, quantity) ??
      this.getBuyQuoteOverride?.({ item, quantity }) ?? {
        ok: Number.isFinite(item.buyCoin) && item.buyCoin > 0,
        quantity,
        priceCoin: item.buyCoin,
        totalPriceCoin: item.buyCoin * quantity,
      };
  }

  canBuy(item) {
    return Boolean(
      item?.tradedHere !== false && Number.isFinite(item?.buyCoin) && item.buyCoin > 0 &&
      Number.isFinite(item?.stock) && item.stock > 0,
    );
  }

  getMaxBuyQuantity(item) {
    return Math.max(0, Math.min(10_000, Math.floor(Number(item?.stock) || 0)));
  }

  getBuyFailureText(reason) {
    if (reason === 'not_enough_coin') return 'not enough coin';
    if (reason === 'empty_stock') return 'out of stock';
    if (reason === 'market_locked') return 'not traded here';
    if (reason === 'offline' || reason === 'missing_price') return 'offline';
    return 'buy failed';
  }

  priceText(price) {
    return Number.isFinite(price) && price > 0 ? formatCoinPriceText(price) : '—';
  }

  readPositiveInteger(value) {
    const integer = Math.floor(Number(value));
    return Number.isInteger(integer) && integer > 0 ? integer : null;
  }

  applyVisibility() {
    if (this.refs.popup) this.refs.popup.hidden = !this.visible;
    this.applyHelpVisibility();
    this.applyBuyMode();
  }

  applyHelpVisibility() {
    if (this.refs.help) this.refs.help.hidden = !this.helpVisible;
    this.refs.helpButton?.setAttribute('aria-expanded', this.helpVisible ? 'true' : 'false');
  }

  applyBuyMode() {
    if (!this.refs.book || !this.refs.buyDialog) return;
    this.refs.book.hidden = this.buyMode;
    this.refs.buyDialog.hidden = !this.buyMode;
    this.refs.tabs.hidden = this.buyMode;
  }
}
