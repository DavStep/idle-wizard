import { PageNotificationStateManager } from './managers/PageNotificationStateManager.js';

export class PageNotificationFacade {
  static explain =
    'Turns available room actions into red dots, so the player can notice work waiting outside the current room.';

  constructor({ gameplayFacade, playerShopFacade, tradeAllianceFacade, onChange } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.playerShopFacade = playerShopFacade;
    this.tradeAllianceFacade = tradeAllianceFacade;
    this.onChange = onChange;
    this.stateManager = new PageNotificationStateManager();
    this.unsubscribeGameplay = null;
    this.unsubscribePlayerShop = null;
    this.unsubscribeTradeAlliance = null;
    this.releaseTradeAllianceQuestData = null;
    this.gameplaySnapshot = null;
    this.playerShopSnapshot = null;
    this.tradeAllianceSnapshot = null;
    this.devSnapshot = null;
    this.snapshot = this.stateManager.getSnapshot();
  }

  mount() {
    this.releaseTradeAllianceQuestData =
      this.tradeAllianceFacade?.retainQuestData?.() ?? null;
    this.unsubscribeGameplay = this.gameplayFacade?.subscribe?.((snapshot) => {
      this.gameplaySnapshot = snapshot;
      this.publish();
    }) ?? null;
    this.unsubscribePlayerShop = this.playerShopFacade?.subscribe?.((snapshot) => {
      this.playerShopSnapshot = snapshot;
      this.publish();
    }) ?? null;
    this.unsubscribeTradeAlliance = this.tradeAllianceFacade?.subscribe?.((snapshot) => {
      this.tradeAllianceSnapshot = snapshot;
      this.publish();
    }) ?? null;
    this.gameplaySnapshot = this.gameplayFacade?.getSnapshot?.() ?? this.gameplaySnapshot;
    this.playerShopSnapshot = this.playerShopFacade?.getSnapshot?.() ?? this.playerShopSnapshot;
    this.tradeAllianceSnapshot =
      this.tradeAllianceFacade?.getSnapshot?.() ?? this.tradeAllianceSnapshot;
    this.publish();
  }

  unmount() {
    this.unsubscribeGameplay?.();
    this.unsubscribePlayerShop?.();
    this.unsubscribeTradeAlliance?.();
    this.releaseTradeAllianceQuestData?.();
    this.unsubscribeGameplay = null;
    this.unsubscribePlayerShop = null;
    this.unsubscribeTradeAlliance = null;
    this.releaseTradeAllianceQuestData = null;
  }

  getSnapshot() {
    return this.snapshot;
  }

  setDevSnapshot(snapshot) {
    this.devSnapshot = snapshot && typeof snapshot === 'object' ? snapshot : null;
    this.publish();
    return {
      ok: true,
      snapshot: this.snapshot,
    };
  }

  clearDevSnapshot() {
    this.devSnapshot = null;
    this.publish();
    return {
      ok: true,
      snapshot: this.snapshot,
    };
  }

  publish() {
    if (this.devSnapshot) {
      this.snapshot = this.devSnapshot;
      this.onChange?.(this.snapshot);
      return;
    }

    this.snapshot = this.stateManager.getSnapshot(this.gameplaySnapshot, {
      playerShop: this.playerShopSnapshot ?? {},
      tradeAlliance: this.tradeAllianceSnapshot ?? {},
    });
    this.onChange?.(this.snapshot);
  }
}
