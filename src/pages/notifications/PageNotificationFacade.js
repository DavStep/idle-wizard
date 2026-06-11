import { PageNotificationStateManager } from './managers/PageNotificationStateManager.js';

export class PageNotificationFacade {
  static explain =
    'Turns available room actions into red dots, so the player can notice work waiting outside the current room.';

  constructor({ gameplayFacade, playerShopFacade, onChange } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.playerShopFacade = playerShopFacade;
    this.onChange = onChange;
    this.stateManager = new PageNotificationStateManager();
    this.unsubscribeGameplay = null;
    this.unsubscribePlayerShop = null;
    this.gameplaySnapshot = null;
    this.playerShopSnapshot = null;
    this.snapshot = this.stateManager.getSnapshot();
  }

  mount() {
    this.unsubscribeGameplay = this.gameplayFacade?.subscribe?.((snapshot) => {
      this.gameplaySnapshot = snapshot;
      this.publish();
    }) ?? null;
    this.unsubscribePlayerShop = this.playerShopFacade?.subscribe?.((snapshot) => {
      this.playerShopSnapshot = snapshot;
      this.publish();
    }) ?? null;
    this.gameplaySnapshot = this.gameplayFacade?.getSnapshot?.() ?? this.gameplaySnapshot;
    this.playerShopSnapshot = this.playerShopFacade?.getSnapshot?.() ?? this.playerShopSnapshot;
    this.publish();
  }

  unmount() {
    this.unsubscribeGameplay?.();
    this.unsubscribePlayerShop?.();
    this.unsubscribeGameplay = null;
    this.unsubscribePlayerShop = null;
  }

  getSnapshot() {
    return this.snapshot;
  }

  publish() {
    this.snapshot = this.stateManager.getSnapshot(this.gameplaySnapshot, {
      playerShop: this.playerShopSnapshot ?? {},
    });
    this.onChange?.(this.snapshot);
  }
}
