import { ShopPlayerShelfManager } from './managers/ShopPlayerShelfManager.js';
import { ShopRoomViewManager } from './managers/ShopRoomViewManager.js';
import { ShopShelfManager } from './managers/ShopShelfManager.js';
import { ShopTradeHistoryManager } from './managers/ShopTradeHistoryManager.js';

export class ShopPageFacade {
  static explain =
    'Shows the market room, where NPC market stands sell selected items and gold opens more stands.';

  constructor({ gameplayFacade, playerShopFacade } = {}) {
    this.roomViewManager = new ShopRoomViewManager();
    this.shelfManager = new ShopShelfManager({ gameplayFacade });
    this.playerShelfManager = new ShopPlayerShelfManager({ gameplayFacade, playerShopFacade });
    this.tradeHistoryManager = new ShopTradeHistoryManager({ playerShopFacade });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    const popupLayer = this.roomViewManager.getPopupLayer();
    this.shelfManager.mount(uiLayer, popupLayer);
    this.playerShelfManager.mount(uiLayer, popupLayer);
    this.tradeHistoryManager.mount({
      buttonParent: this.playerShelfManager.getActionsRoot(),
      popupParent: popupLayer,
    });
  }

  unmount() {
    this.tradeHistoryManager.unmount();
    this.playerShelfManager.unmount();
    this.shelfManager.unmount();
    this.roomViewManager.unmount();
  }
}
