export class GardenTilePurchaseManager {
  constructor({
    coinFacade,
    gardenBalanceManager,
    gardenTileEntityManager,
    playerLevelFacade,
    researchFacade,
  }) {
    this.coinFacade = coinFacade;
    this.gardenBalanceManager = gardenBalanceManager;
    this.gardenTileEntityManager = gardenTileEntityManager;
    this.playerLevelFacade = playerLevelFacade;
    this.researchFacade = researchFacade;
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

    if (nextTileNumber > this.getMaxTilesByProgression()) {
      const requiredResearchId = this.getRequiredCapacityResearchId(nextTileNumber);

      if (requiredResearchId) {
        return {
          ok: false,
          reason: 'research_locked',
          requiredResearchId,
          tileNumber: nextTileNumber,
        };
      }

      return {
        ok: false,
        reason: 'level_locked',
        requiredLevel: this.playerLevelFacade?.getRequiredLevelForGardenTile(nextTileNumber) ?? null,
        tileNumber: nextTileNumber,
      };
    }

    if (!this.coinFacade.spend(cost)) {
      return {
        ok: false,
        reason: 'not_enough_coin',
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

  getMaxTilesByProgression() {
    const maxTilesByLevel = this.getMaxTilesByLevel();

    return Math.min(
      this.gardenBalanceManager.getMaxTiles(),
      this.researchFacade?.getMaxGardenTilesWithCapacity?.(maxTilesByLevel) ??
        maxTilesByLevel,
    );
  }

  getRequiredCapacityResearchId(tileNumber) {
    return this.researchFacade?.getRequiredGardenCapacityResearchId?.(tileNumber) ?? null;
  }
}
