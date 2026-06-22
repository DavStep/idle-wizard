import { PageNotificationStateManager } from '../../notifications/managers/PageNotificationStateManager.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';

const MARKET_TABS = [
  { id: 'npm', label: 'npc market' },
  { id: 'player', label: 'player market' },
  { id: 'crystals', label: 'crystals' },
];

export class ShopMarketTabsManager {
  constructor({ gameplayFacade, playerShopFacade, onActiveTabChange } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.playerShopFacade = playerShopFacade;
    this.onActiveTabChange = onActiveTabChange;
    this.notificationStateManager = new PageNotificationStateManager();
    this.root = null;
    this.unsubscribeGameplay = null;
    this.unsubscribePlayerShop = null;
    this.lastGameplaySnapshot = null;
    this.lastPlayerShopSnapshot = null;
    this.refs = {
      buttons: new Map(),
      panels: new Map(),
    };
    this.activeTabId = 'npm';
  }

  mount(parent) {
    if (!parent) {
      throw new Error('ShopMarketTabsManager requires a parent element.');
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'shop-page__market-root';

    this.refs.tabs = document.createElement('div');
    this.refs.tabs.className = 'shop-page__market-tabs';
    this.refs.tabs.setAttribute('aria-label', 'Market type');
    this.refs.tabs.setAttribute('role', 'tablist');

    for (const tab of MARKET_TABS) {
      const button = this.createTabButton(tab);
      const panel = this.createPanel(tab);
      this.refs.buttons.set(tab.id, button);
      this.refs.panels.set(tab.id, panel);
      this.refs.tabs.append(button);
      this.root.append(panel);
    }

    this.root.prepend(this.refs.tabs);
    parent.append(this.root);
    this.render();
    this.unsubscribeGameplay = this.gameplayFacade?.subscribe?.((snapshot) => {
      this.lastGameplaySnapshot = snapshot;
      this.renderNotifications();
    }) ?? null;
    this.unsubscribePlayerShop = this.playerShopFacade?.subscribe?.((snapshot) => {
      this.lastPlayerShopSnapshot = snapshot;
      this.renderNotifications();
    }) ?? null;
    this.lastGameplaySnapshot = this.gameplayFacade?.getSnapshot?.() ?? this.lastGameplaySnapshot;
    this.lastPlayerShopSnapshot = (
      this.playerShopFacade?.getSnapshot?.() ?? this.lastPlayerShopSnapshot
    ) ?? null;
    this.renderNotifications();

    return this.root;
  }

  unmount() {
    this.unsubscribeGameplay?.();
    this.unsubscribePlayerShop?.();
    this.unsubscribeGameplay = null;
    this.unsubscribePlayerShop = null;
    this.root?.remove();
    this.root = null;
    this.lastGameplaySnapshot = null;
    this.lastPlayerShopSnapshot = null;
    this.refs = {
      buttons: new Map(),
      panels: new Map(),
    };
    this.activeTabId = 'npm';
  }

  getPanel(tabId) {
    const panel = this.refs.panels.get(tabId);

    if (!panel) {
      throw new Error(`Unknown market tab panel: ${tabId}`);
    }

    return panel;
  }

  setActiveTab(tabId) {
    if (!this.refs.panels.has(tabId) || this.activeTabId === tabId) {
      return;
    }

    this.activeTabId = tabId;
    this.render();
    this.onActiveTabChange?.(tabId);
  }

  getActiveTabId() {
    return this.activeTabId;
  }

  createTabButton(tab) {
    const button = document.createElement('button');
    button.className = 'style-button shop-page__market-tab-button';
    button.type = 'button';
    button.textContent = tab.label;
    button.setAttribute('role', 'tab');
    button.addEventListener('click', () => this.setActiveTab(tab.id));
    return button;
  }

  createPanel(tab) {
    const panel = document.createElement('section');
    panel.className = `shop-page__market-panel style-page-scroll shop-page__market-panel--${tab.id}`;
    panel.dataset.scrollCueProgress = 'inline';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-label', tab.label);
    return panel;
  }

  render() {
    for (const tab of MARKET_TABS) {
      const selected = this.activeTabId === tab.id;
      const button = this.refs.buttons.get(tab.id);
      const panel = this.refs.panels.get(tab.id);

      button?.setAttribute('aria-selected', selected ? 'true' : 'false');
      button?.setAttribute('tabindex', selected ? '0' : '-1');

      if (panel) {
        panel.hidden = !selected;
      }
    }
  }

  renderNotifications() {
    const shopNotifications = this.notificationStateManager.getSnapshot(
      this.lastGameplaySnapshot,
      { playerShop: this.lastPlayerShopSnapshot },
    ).pages.shop;
    const children = shopNotifications.children ?? {};

    setNotificationBadge(
      this.refs.buttons.get('npm'),
      this.createTabNotification(children, ['npcStand', 'npcListing']),
    );
    setNotificationBadge(
      this.refs.buttons.get('player'),
      this.createTabNotification(children, [
        'playerStand',
        'playerListing',
        'playerProceeds',
        'playerMarket',
      ]),
    );
    setNotificationBadge(this.refs.buttons.get('crystals'), children.crystals);
  }

  createTabNotification(children, keys) {
    return this.notificationStateManager.createPage(
      Object.fromEntries(keys.map((key) => [key, children[key]])),
    );
  }
}
