import { ShopCrystalOfferManager } from './managers/ShopCrystalOfferManager.js';
import { ShopCoinOfferManager } from './managers/ShopCoinOfferManager.js';
import { ShopMarketTabsManager } from './managers/ShopMarketTabsManager.js';
import { ShopPlayerRequestManager } from './managers/ShopPlayerRequestManager.js';
import { ShopPlayerShelfManager } from './managers/ShopPlayerShelfManager.js';
import { ShopRoomViewManager } from './managers/ShopRoomViewManager.js';
import { ShopShelfManager } from './managers/ShopShelfManager.js';
import { ShopMarketLedgerManager } from './managers/ShopMarketLedgerManager.js';
import { ShopTradeHistoryManager } from './managers/ShopTradeHistoryManager.js';
import { RewardFlyoutManager } from '../shared/RewardFlyoutManager.js';

export class ShopPageFacade {
  static explain =
    'Shows the market room, where players sell to trader demand, trade with other players, and see crystal prices.';

  constructor({
    gameplayFacade,
    playerShopFacade,
    onOpenPlayerInfo,
    onRequirePlayerSurfaceAccess,
    getNpcSellPriceOverride,
    getNpcStockBuyQuoteOverride,
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.playerShopFacade = playerShopFacade;
    this.roomViewManager = new ShopRoomViewManager();
    this.flyoutManager = new RewardFlyoutManager();
    this.releasePlayerShopPublicData = null;
    this.rewardEventsUnsubscribe = null;
    this.marketTabsManager = new ShopMarketTabsManager({
      gameplayFacade,
      playerShopFacade,
      onRequirePlayerSurfaceAccess,
      onActiveTabChange: () => this.onActiveMarketTabChange(),
    });
    this.shelfManager = new ShopShelfManager({
      gameplayFacade,
      getSellPriceOverride: getNpcSellPriceOverride,
    });
    this.marketLedgerManager = new ShopMarketLedgerManager({
      gameplayFacade,
      getBuyQuoteOverride: getNpcStockBuyQuoteOverride,
    });
    this.playerRequestManager = new ShopPlayerRequestManager({
      gameplayFacade,
      playerShopFacade,
    });
    this.playerShelfManager = new ShopPlayerShelfManager({
      gameplayFacade,
      playerShopFacade,
      onOpenPlayerInfo,
    });
    this.tradeHistoryManager = new ShopTradeHistoryManager({
      playerShopFacade,
      onOpenPlayerInfo,
    });
    this.coinOfferManager = new ShopCoinOfferManager({ gameplayFacade });
    this.crystalOfferManager = new ShopCrystalOfferManager();
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    const popupLayer = this.roomViewManager.getPopupLayer();
    this.marketTabsManager.mount(uiLayer);
    this.flyoutManager.mount(uiLayer);
    this.rewardEventsUnsubscribe =
      this.gameplayFacade?.subscribeRewardEvents?.((event) =>
        this.flyoutManager.showReward(event),
      ) ?? null;
    const npmMarketPanel = this.marketTabsManager.getPanel('npm');
    const playerMarketPanel = this.marketTabsManager.getPanel('player');
    const crystalsPanel = this.marketTabsManager.getPanel('crystals');
    const shelfRoot = this.shelfManager.mount(npmMarketPanel, popupLayer);
    this.marketLedgerManager.mount({
      buttonParent: shelfRoot,
      popupParent: popupLayer,
    });
    this.playerRequestManager.mount(playerMarketPanel, popupLayer);
    this.playerShelfManager.mount(playerMarketPanel, popupLayer);
    this.tradeHistoryManager.mount({
      buttonParent: this.playerShelfManager.getActionsRoot(),
      popupParent: popupLayer,
    });
    this.coinOfferManager.mount(crystalsPanel);
    this.crystalOfferManager.mount(crystalsPanel, popupLayer);
    this.syncPlayerShopPublicDataRetention();
  }

  unmount() {
    this.releasePlayerShopPublicData?.();
    this.releasePlayerShopPublicData = null;
    this.rewardEventsUnsubscribe?.();
    this.rewardEventsUnsubscribe = null;
    this.crystalOfferManager.unmount();
    this.coinOfferManager.unmount();
    this.tradeHistoryManager.unmount();
    this.playerShelfManager.unmount();
    this.playerRequestManager.unmount();
    this.marketLedgerManager.unmount();
    this.shelfManager.unmount();
    this.flyoutManager.unmount();
    this.marketTabsManager.unmount();
    this.roomViewManager.unmount();
  }

  onActiveMarketTabChange() {
    this.syncPlayerShopPublicDataRetention();
    this.renderActiveMarketTab();
  }

  syncPlayerShopPublicDataRetention() {
    const shouldRetain = this.marketTabsManager.getActiveTabId() === 'player';

    if (shouldRetain) {
      if (!this.releasePlayerShopPublicData) {
        const release =
          this.playerShopFacade?.retainMarketData?.() ??
          this.playerShopFacade?.retainPublicData?.() ??
          null;
        this.releasePlayerShopPublicData = typeof release === 'function' ? release : null;
      }

      return;
    }

    this.releasePlayerShopPublicData?.();
    this.releasePlayerShopPublicData = null;
  }

  renderActiveMarketTab() {
    const activeTabId = this.marketTabsManager.getActiveTabId();

    if (activeTabId === 'npm') {
      const snapshot = this.gameplayFacade?.getSnapshot?.();
      this.shelfManager.render(snapshot);
      this.marketLedgerManager.render();
      return;
    }

    if (activeTabId === 'player') {
      this.playerRequestManager.render();
      this.playerShelfManager.render();
      return;
    }

    if (activeTabId === 'crystals') {
      this.coinOfferManager.render(this.gameplayFacade?.getSnapshot?.());
    }
  }
}
