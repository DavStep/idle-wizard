const TRADE_HISTORY_TABS = [
  { id: 'own', label: 'own' },
  { id: 'global', label: 'global' },
];

const EMPTY_PLAYER_SHOP_SNAPSHOT = {
  connected: false,
  tradeHistory: [],
  ownTradeHistory: [],
};

export class ShopTradeHistoryManager {
  constructor({ playerShopFacade } = {}) {
    this.playerShopFacade = playerShopFacade;
    this.refs = {};
    this.unsubscribe = null;
    this.visible = false;
    this.selectedTabId = 'own';
    this.previousFocus = null;
    this.lastSnapshot = { ...EMPTY_PLAYER_SHOP_SNAPSHOT };
    this.handleRootClick = (event) => {
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
    if (!buttonParent || !popupParent) {
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

    if (this.playerShopFacade) {
      this.unsubscribe = this.playerShopFacade.subscribe((snapshot) => {
        this.lastSnapshot = snapshot;
        this.render();
      });
      this.lastSnapshot = this.playerShopFacade.getSnapshot();
    }

    this.render();
    this.applyVisibility();
    return this.refs.button;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.popup?.removeEventListener('click', this.handleRootClick);
    this.refs.button?.remove();
    this.refs.popup?.remove();
    this.refs = {};
    this.visible = false;
    this.selectedTabId = 'own';
    this.previousFocus = null;
    this.lastSnapshot = { ...EMPTY_PLAYER_SHOP_SNAPSHOT };
  }

  createButton() {
    const button = document.createElement('button');
    button.className = 'style-button shop-page__trade-history-button';
    button.type = 'button';
    button.textContent = 'trade history';
    button.addEventListener('click', () => this.show());
    return button;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'shop-page__trade-history-popup';
    popup.addEventListener('click', this.handleRootClick);

    const panel = document.createElement('section');
    panel.className = 'shop-page__trade-history-panel';
    panel.setAttribute('aria-label', 'Trade history');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('role', 'dialog');
    panel.tabIndex = -1;

    const dialog = document.createElement('section');
    dialog.className = 'shop-page__trade-history-dialog style-dialog';

    this.refs.dialog = panel;
    this.refs.title = this.createTitle();
    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'shop-page__trade-history-rows';
    this.refs.tabs = this.createTabs();

    dialog.append(this.refs.title, this.refs.rows);
    panel.append(dialog, this.refs.tabs);
    popup.append(panel);
    return popup;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'trade history';
    return title;
  }

  createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'shop-page__trade-history-tabs';
    tabs.setAttribute('aria-label', 'Trade history type');
    tabs.setAttribute('role', 'tablist');
    this.refs.tabButtons = new Map();

    for (const tab of TRADE_HISTORY_TABS) {
      const button = document.createElement('button');
      button.className = 'style-button shop-page__trade-history-tab-button';
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
    this.render();
  }

  show() {
    this.previousFocus = document.activeElement;
    this.visible = true;
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

  render() {
    if (!this.refs.rows) {
      return;
    }

    for (const tab of TRADE_HISTORY_TABS) {
      const selected = this.selectedTabId === tab.id;
      const button = this.refs.tabButtons.get(tab.id);
      button?.setAttribute('aria-selected', selected ? 'true' : 'false');
      button?.setAttribute('tabindex', selected ? '0' : '-1');
    }

    if (!this.lastSnapshot.connected) {
      this.renderMessage('offline');
      return;
    }

    const rows =
      this.selectedTabId === 'own'
        ? (this.lastSnapshot.ownTradeHistory ?? [])
        : (this.lastSnapshot.tradeHistory ?? []);

    if (rows.length === 0) {
      this.renderMessage('empty');
      return;
    }

    this.refs.rows.replaceChildren(
      ...rows.map((trade) => this.createTradeRow(trade)),
    );
  }

  renderMessage(message) {
    const empty = document.createElement('div');
    empty.className = 'shop-page__trade-history-empty';
    empty.textContent = message;
    this.refs.rows.replaceChildren(empty);
  }

  formatTrade(trade) {
    const { buyerUsername, sellerUsername, itemText, gold } = this.getTradeSummary(trade);

    return [
      buyerUsername,
      ' bought ',
      itemText,
      ' from ',
      sellerUsername,
      ' for ',
      String(gold),
      ' gold',
    ].join('');
  }

  createTradeRow(trade) {
    const { buyerUsername, sellerUsername, itemText, gold } = this.getTradeSummary(trade);
    const row = document.createElement('div');
    row.className = 'shop-page__trade-history-row';

    const buyer = document.createElement('span');
    buyer.className = 'shop-page__trade-history-username';
    buyer.textContent = buyerUsername;

    const seller = document.createElement('span');
    seller.className = 'shop-page__trade-history-username';
    seller.textContent = sellerUsername;

    row.append(
      buyer,
      ` bought ${itemText} from `,
      seller,
      ` for ${gold} gold`,
    );
    return row;
  }

  getTradeSummary(trade) {
    const quantity = Math.max(1, Math.floor(Number(trade.quantity) || 1));
    const itemText = quantity > 1 ? `${quantity} ${trade.itemLabel}` : trade.itemLabel;
    const gold =
      Math.floor(Number(trade.totalPriceGold) || 0) ||
      Math.floor(Number(trade.priceGold) || 0) * quantity;

    return {
      buyerUsername: trade.buyerUsername || 'wizard',
      sellerUsername: trade.sellerUsername || 'wizard',
      itemText,
      gold,
    };
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
