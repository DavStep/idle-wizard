import { PlayerLevelBalanceManager } from './managers/PlayerLevelBalanceManager.js';
import { PlayerLevelSnapshotManager } from './managers/PlayerLevelSnapshotManager.js';

export class PlayerLevelFacade {
  static explain =
    'Player level turns completed task levels into practical limits, so leveling up opens more room to play.';

  constructor({ tasksFacade }) {
    this.playerLevelBalanceManager = new PlayerLevelBalanceManager();
    this.playerLevelSnapshotManager = new PlayerLevelSnapshotManager({
      playerLevelBalanceManager: this.playerLevelBalanceManager,
      tasksFacade,
    });
  }

  getEffects() {
    return this.playerLevelSnapshotManager.getSnapshot().effects;
  }

  getMaxGardenTiles() {
    return this.getEffects().maxGardenTiles;
  }

  getMaxCauldrons() {
    return this.getEffects().maxCauldrons;
  }

  getMaxShopSlots() {
    return this.getMaxNpcMarketStands();
  }

  getMaxNpcMarketStands() {
    return this.getEffects().maxNpcMarketStands;
  }

  getMaxPlayerMarketStands() {
    return this.getEffects().maxPlayerMarketStands;
  }

  getManaEffects() {
    const { maxManaCap, manaPerSecond } = this.getEffects();
    return { maxManaCap, manaPerSecond };
  }

  getMaxManaCap() {
    return this.getEffects().maxManaCap;
  }

  getManaPerSecond() {
    return this.getEffects().manaPerSecond;
  }

  getRequiredLevelForGardenTile(tileNumber) {
    return this.playerLevelBalanceManager.getRequiredLevelForGardenTile(tileNumber);
  }

  getRequiredLevelForShopSlot(slotNumber) {
    return this.getRequiredLevelForNpcMarketStand(slotNumber);
  }

  getRequiredLevelForNpcMarketStand(standNumber) {
    return this.playerLevelBalanceManager.getRequiredLevelForNpcMarketStand(standNumber);
  }

  getRequiredLevelForPlayerMarketStand(standNumber) {
    return this.playerLevelBalanceManager.getRequiredLevelForPlayerMarketStand(standNumber);
  }

  getSnapshot() {
    return this.playerLevelSnapshotManager.getSnapshot();
  }
}
