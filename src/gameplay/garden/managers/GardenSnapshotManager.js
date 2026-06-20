export class GardenSnapshotManager {
  constructor({ gardenBalanceManager, gardenTileEntityManager, itemsFacade, playerLevelFacade }) {
    this.gardenBalanceManager = gardenBalanceManager;
    this.gardenTileEntityManager = gardenTileEntityManager;
    this.itemsFacade = itemsFacade;
    this.playerLevelFacade = playerLevelFacade;
  }

  getSnapshot() {
    const unlockedTiles = this.gardenTileEntityManager.getUnlockedTiles();
    const maxTiles = this.gardenBalanceManager.getMaxTiles();
    const maxUnlockedTilesByLevel = Math.min(maxTiles, this.getMaxTilesByLevel());
    const nextTileNumber = unlockedTiles + 1;
    const nextTileCost = this.gardenBalanceManager.getTileCost(nextTileNumber);
    const nextTileLockedByLevel =
      nextTileCost !== null && nextTileNumber > maxUnlockedTilesByLevel;

    return {
      plot: {
        unlockedTiles,
        maxTiles,
        maxUnlockedTilesByLevel,
        tilesPerRow: this.gardenBalanceManager.getTilesPerRow(),
        tileCosts: this.gardenBalanceManager.getTileCosts(),
        nextTileNumber: nextTileCost === null ? null : nextTileNumber,
        nextTileCost,
        nextTileLockedByLevel,
        nextTileRequiresLevel: nextTileLockedByLevel
          ? this.playerLevelFacade?.getRequiredLevelForGardenTile(nextTileNumber) ?? null
          : null,
        harvestSeconds: this.gardenBalanceManager.getHarvestSeconds(),
        tiles: this.getTileSnapshots(),
      },
      seeds: this.getSeedSnapshots(),
      herbs: this.getHerbSnapshots(),
    };
  }

  getMaxTilesByLevel() {
    return this.playerLevelFacade?.getMaxGardenTiles?.() ?? this.gardenBalanceManager.getMaxTiles();
  }

  getTileSnapshots() {
    return this.gardenTileEntityManager.getTileSnapshots().map((tile) => {
      const selectedSeed = tile.selectedSeedItemTypeId
        ? this.itemsFacade.getItemDefinition(tile.selectedSeedItemTypeId)
        : null;
      const selectedHerb = selectedSeed?.producesHerbTypeId
        ? this.itemsFacade.getItemDefinition(selectedSeed.producesHerbTypeId)
        : null;
      const seed = tile.seedItemTypeId
        ? this.itemsFacade.getItemDefinition(tile.seedItemTypeId)
        : null;
      const herb = tile.herbItemTypeId
        ? this.itemsFacade.getItemDefinition(tile.herbItemTypeId)
        : null;

      return {
        ...tile,
        selectedSeedKey: selectedSeed?.key ?? null,
        selectedSeedLabel: selectedSeed?.label ?? null,
        selectedHerbKey: selectedHerb?.key ?? null,
        selectedHerbLabel: selectedHerb?.label ?? null,
        seedKey: seed?.key ?? null,
        seedLabel: seed?.label ?? null,
        herbKey: herb?.key ?? null,
        herbLabel: herb?.label ?? null,
        process:
          tile.phase === 'growing' || tile.phase === 'harvesting'
            ? {
                phase: tile.phase,
                totalMs: tile.totalMs,
                remainingMs: tile.remainingMs,
                progress: tile.progress,
              }
            : null,
      };
    });
  }

  getSeedSnapshots() {
    return this.itemsFacade.getSeedDefinitions().map((seed) => ({
      itemTypeId: seed.id,
      key: seed.key,
      label: seed.label,
      kind: seed.kind,
      quantity: this.itemsFacade.getItemQuantity(seed.id),
    }));
  }

  getHerbSnapshots() {
    return this.itemsFacade.getHerbDefinitions().map((herb) => ({
      itemTypeId: herb.id,
      key: herb.key,
      label: herb.label,
      kind: herb.kind,
      quantity: this.itemsFacade.getItemQuantity(herb.id),
    }));
  }
}
