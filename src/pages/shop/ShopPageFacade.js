import { ShopPageNameManager } from './managers/ShopPageNameManager.js';
import { ShopPageNavigationManager } from './managers/ShopPageNavigationManager.js';
import { ShopPlayerShelfManager } from './managers/ShopPlayerShelfManager.js';
import { ShopRoomViewManager } from './managers/ShopRoomViewManager.js';
import { ShopShelfManager } from './managers/ShopShelfManager.js';

export class ShopPageFacade {
  static explain =
    'Shows the shop room, where shelf slots sell selected items and gold opens more slots.';

  constructor({ gameplayFacade, playerShopFacade, onShowResearch } = {}) {
    this.roomViewManager = new ShopRoomViewManager();
    this.shelfManager = new ShopShelfManager({ gameplayFacade });
    this.playerShelfManager = new ShopPlayerShelfManager({ gameplayFacade, playerShopFacade });
    this.navigationManager = new ShopPageNavigationManager({ onShowResearch });
    this.pageNameManager = new ShopPageNameManager();
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    this.shelfManager.mount(uiLayer);
    this.playerShelfManager.mount(uiLayer);
    this.navigationManager.mount(uiLayer);
    this.pageNameManager.mount(uiLayer);
  }

  unmount() {
    this.pageNameManager.unmount();
    this.navigationManager.unmount();
    this.playerShelfManager.unmount();
    this.shelfManager.unmount();
    this.roomViewManager.unmount();
  }
}
