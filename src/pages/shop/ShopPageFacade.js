import { ShopCrystalOfferManager } from './managers/ShopCrystalOfferManager.js';
import { ShopDemandManager } from './managers/ShopDemandManager.js';
import { ShopDirectSellManager } from './managers/ShopDirectSellManager.js';
import { ShopGoldOfferManager } from './managers/ShopGoldOfferManager.js';
import { ShopMarketTabsManager } from './managers/ShopMarketTabsManager.js';
import { ShopPlayerRequestManager } from './managers/ShopPlayerRequestManager.js';
import { ShopPlayerShelfManager } from './managers/ShopPlayerShelfManager.js';
import { ShopRoomViewManager } from './managers/ShopRoomViewManager.js';
import { ShopShelfManager } from './managers/ShopShelfManager.js';
import { ShopStockManager } from './managers/ShopStockManager.js';
import { ShopTradeHistoryManager } from './managers/ShopTradeHistoryManager.js';
import { RewardFlyoutManager } from '../shared/RewardFlyoutManager.js';

export class ShopPageFacade {
  static explain =
    'Shows the market room, where players sell to NPC demand, trade with other players, and see crystal prices.';

  constructor({ gameplayFacade, playerShopFacade, onOpenPlayerInfo } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.roomViewManager = new ShopRoomViewManager();
    this.flyoutManager = new RewardFlyoutManager();
    this.rewardEventsUnsubscribe = null;
    this.marketTabsManager = new ShopMarketTabsManager({
      gameplayFacade,
      onActiveTabChange: () => this.renderActiveMarketTab(),
    });
    this.shelfManager = new ShopShelfManager({ gameplayFacade });
    this.demandManager = new ShopDemandManager({ gameplayFacade });
    this.directSellManager = new ShopDirectSellManager({ gameplayFacade });
    this.stockManager = new ShopStockManager({ gameplayFacade });
    this.playerRequestManager = new ShopPlayerRequestManager({ gameplayFacade });
    this.playerShelfManager = new ShopPlayerShelfManager({
      gameplayFacade,
      playerShopFacade,
      onOpenPlayerInfo,
    });
    this.tradeHistoryManager = new ShopTradeHistoryManager({
      playerShopFacade,
      onOpenPlayerInfo,
    });
    this.goldOfferManager = new ShopGoldOfferManager({ gameplayFacade });
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
    this.demandManager.mount({
      buttonParent: shelfRoot,
      popupParent: popupLayer,
    });
    this.directSellManager.mount({
      buttonParent: shelfRoot,
      popupParent: popupLayer,
    });
    this.stockManager.mount(npmMarketPanel, popupLayer);
    this.playerRequestManager.mount(playerMarketPanel, popupLayer);
    this.playerShelfManager.mount(playerMarketPanel, popupLayer);
    this.tradeHistoryManager.mount({
      buttonParent: this.playerShelfManager.getActionsRoot(),
      popupParent: popupLayer,
    });
    this.goldOfferManager.mount(crystalsPanel);
    this.crystalOfferManager.mount(crystalsPanel, popupLayer);
  }

  unmount() {
    this.rewardEventsUnsubscribe?.();
    this.rewardEventsUnsubscribe = null;
    this.crystalOfferManager.unmount();
    this.goldOfferManager.unmount();
    this.tradeHistoryManager.unmount();
    this.playerShelfManager.unmount();
    this.playerRequestManager.unmount();
    this.stockManager.unmount();
    this.directSellManager.unmount();
    this.demandManager.unmount();
    this.shelfManager.unmount();
    this.flyoutManager.unmount();
    this.marketTabsManager.unmount();
    this.roomViewManager.unmount();
  }

  renderActiveMarketTab() {
    const activeTabId = this.marketTabsManager.getActiveTabId();

    if (activeTabId === 'npm') {
      const snapshot = this.gameplayFacade?.getSnapshot?.();
      this.shelfManager.render(snapshot);
      this.demandManager.render();
      this.stockManager.render();
      return;
    }

    if (activeTabId === 'player') {
      this.playerRequestManager.render();
      this.playerShelfManager.render();
      return;
    }

    if (activeTabId === 'crystals') {
      this.goldOfferManager.render(this.gameplayFacade?.getSnapshot?.());
    }
  }
}
