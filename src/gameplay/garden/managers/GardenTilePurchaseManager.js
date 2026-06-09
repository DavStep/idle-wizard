export class GardenTilePurchaseManager {
  constructor({ goldFacade, gardenBalanceManager, gardenTileEntityManager }) {
    this.goldFacade = goldFacade;
    this.gardenBalanceManager = gardenBalanceManager;
    this.gardenTileEntityManager = gardenTileEntityManager;
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
}
