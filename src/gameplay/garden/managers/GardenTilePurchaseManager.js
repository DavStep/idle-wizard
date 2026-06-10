export class GardenTilePurchaseManager {
  constructor({ goldFacade, gardenBalanceManager, gardenTileEntityManager, playerLevelFacade }) {
    this.goldFacade = goldFacade;
    this.gardenBalanceManager = gardenBalanceManager;
    this.gardenTileEntityManager = gardenTileEntityManager;
    this.playerLevelFacade = playerLevelFacade;
  }

  buyNextTile() {
    const nextTileNumber = this.gardenTileEntityManager.getUnlockedTiles() + 1;
    const cost = this.gardenBalanceManager.getTileCost(nextTileNumber);

    if (cost === null) {
      return {
        ok: false,
        reason: 'max_tiles',
      };
    }

    if (nextTileNumber > this.getMaxTilesByLevel()) {
      return {
        ok: false,
        reason: 'level_locked',
        requiredLevel: this.playerLevelFacade?.getRequiredLevelForGardenTile(nextTileNumber) ?? null,
        tileNumber: nextTileNumber,
      };
    }

    if (!this.goldFacade.spend(cost)) {
      return {
        ok: false,
        reason: 'not_enough_gold',
        cost,
        tileNumber: nextTileNumber,
      };
    }

    this.gardenTileEntityManager.unlockNextTile();

    return {
      ok: true,
      cost,
      tileNumber: nextTileNumber,
    };
  }

  getMaxTilesByLevel() {
    return this.playerLevelFacade?.getMaxGardenTiles?.() ?? this.gardenBalanceManager.getMaxTiles();
  }
}
