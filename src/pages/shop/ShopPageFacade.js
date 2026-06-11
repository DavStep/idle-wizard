import { ShopDemandManager } from './managers/ShopDemandManager.js';
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
    this.shelfManager = new ShopShelfManager({ gameplayFacade });
    this.demandManager = new ShopDemandManager({ gameplayFacade });
    this.stockManager = new ShopStockManager({ gameplayFacade });
    this.playerShelfManager = new ShopPlayerShelfManager({ gameplayFacade, playerShopFacade });
    this.tradeHistoryManager = new ShopTradeHistoryManager({ playerShopFacade });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    const popupLayer = this.roomViewManager.getPopupLayer();
    const shelfRoot = this.shelfManager.mount(uiLayer, popupLayer);
    this.demandManager.mount({
      buttonParent: shelfRoot,
      popupParent: popupLayer,
    });
    this.stockManager.mount(uiLayer);
    this.playerShelfManager.mount(uiLayer, popupLayer);
    this.tradeHistoryManager.mount({
      buttonParent: this.playerShelfManager.getActionsRoot(),
      popupParent: popupLayer,
    });
  }

  unmount() {
    this.tradeHistoryManager.unmount();
    this.playerShelfManager.unmount();
    this.stockManager.unmount();
    this.demandManager.unmount();
    this.shelfManager.unmount();
    this.roomViewManager.unmount();
  }
}
