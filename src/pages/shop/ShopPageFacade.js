import { ShopDemandManager } from './managers/ShopDemandManager.js';
import { ShopMarketTabsManager } from './managers/ShopMarketTabsManager.js';
import { ShopPlayerRequestManager } from './managers/ShopPlayerRequestManager.js';
import { ShopPlayerShelfManager } from './managers/ShopPlayerShelfManager.js';
import { ShopRoomViewManager } from './managers/ShopRoomViewManager.js';
import { ShopShelfManager } from './managers/ShopShelfManager.js';
import { ShopStockManager } from './managers/ShopStockManager.js';
import { ShopTradeHistoryManager } from './managers/ShopTradeHistoryManager.js';

export class ShopPageFacade {
  static explain =
    'Shows the market room, where players sell to NPC demand, buy shared NPC stock, and list items for other players.';

  constructor({ gameplayFacade, playerShopFacade } = {}) {
    this.roomViewManager = new ShopRoomViewManager();
    this.marketTabsManager = new ShopMarketTabsManager();
    this.shelfManager = new ShopShelfManager({ gameplayFacade });
    this.demandManager = new ShopDemandManager({ gameplayFacade });
    this.stockManager = new ShopStockManager({ gameplayFacade });
    this.playerRequestManager = new ShopPlayerRequestManager();
    this.playerShelfManager = new ShopPlayerShelfManager({ gameplayFacade, playerShopFacade });
    this.tradeHistoryManager = new ShopTradeHistoryManager({ playerShopFacade });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    const popupLayer = this.roomViewManager.getPopupLayer();
    this.marketTabsManager.mount(uiLayer);
    const npmMarketPanel = this.marketTabsManager.getPanel('npm');
    const playerMarketPanel = this.marketTabsManager.getPanel('player');
    const shelfRoot = this.shelfManager.mount(npmMarketPanel, popupLayer);
    this.demandManager.mount({
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
  }

  unmount() {
    this.tradeHistoryManager.unmount();
    this.playerShelfManager.unmount();
    this.playerRequestManager.unmount();
    this.stockManager.unmount();
    this.demandManager.unmount();
    this.shelfManager.unmount();
    this.marketTabsManager.unmount();
    this.roomViewManager.unmount();
  }
}
