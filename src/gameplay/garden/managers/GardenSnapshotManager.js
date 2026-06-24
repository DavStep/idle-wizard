export class GardenSnapshotManager {
  constructor({
    gardenBalanceManager,
    gardenTileEntityManager,
    itemsFacade,
    playerLevelFacade,
    researchFacade,
  }) {
    this.gardenBalanceManager = gardenBalanceManager;
    this.gardenTileEntityManager = gardenTileEntityManager;
    this.itemsFacade = itemsFacade;
    this.playerLevelFacade = playerLevelFacade;
    this.researchFacade = researchFacade;
  }

  getSnapshot() {
    const unlockedTiles = this.gardenTileEntityManager.getUnlockedTiles();
    const maxTiles = this.gardenBalanceManager.getMaxTiles();
    const maxUnlockedTilesByLevel = Math.min(maxTiles, this.getMaxTilesByLevel());
    const maxUnlockedTilesByProgression = Math.min(
      maxTiles,
      this.getMaxTilesByProgression(maxUnlockedTilesByLevel),
    );
    const nextTileNumber = unlockedTiles + 1;
    const nextTileCost = this.gardenBalanceManager.getTileCost(nextTileNumber);
    const nextTileLockedByLevel =
      nextTileCost !== null &&
      nextTileNumber > maxUnlockedTilesByProgression &&
      nextTileNumber <= maxUnlockedTilesByLevel + 1 &&
      !this.getRequiredCapacityResearchId(nextTileNumber);
    const nextTileLockedByResearch =
      nextTileCost !== null &&
      nextTileNumber > maxUnlockedTilesByProgression &&
      Boolean(this.getRequiredCapacityResearchId(nextTileNumber));

    return {
      plot: {
        unlockedTiles,
        maxTiles,
        maxUnlockedTilesByLevel,
        maxUnlockedTilesByProgression,
        tilesPerRow: this.gardenBalanceManager.getTilesPerRow(),
        tileCosts: this.gardenBalanceManager.getTileCosts(),
        nextTileNumber: nextTileCost === null ? null : nextTileNumber,
        nextTileCost,
        nextTileLockedByLevel,
        nextTileLockedByResearch,
        nextTileRequiresLevel: nextTileLockedByLevel
          ? this.playerLevelFacade?.getRequiredLevelForGardenTile(nextTileNumber) ?? null
          : null,
        nextTileRequiresResearchId: nextTileLockedByResearch
          ? this.getRequiredCapacityResearchId(nextTileNumber)
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

  getMaxTilesByProgression(maxTilesByLevel = this.getMaxTilesByLevel()) {
    return (
      this.researchFacade?.getMaxGardenTilesWithCapacity?.(maxTilesByLevel) ??
      maxTilesByLevel
    );
  }

  getRequiredCapacityResearchId(tileNumber) {
    return this.researchFacade?.getRequiredGardenCapacityResearchId?.(tileNumber) ?? null;
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
        level: this.getPlotLevel(tile.tileNumber),
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

  getPlotLevel(tileNumber) {
    const level = this.researchFacade?.getPlotPlantingMultiplier?.(tileNumber) ?? 1;
    const safeLevel = Math.floor(Number(level));
    return Number.isInteger(safeLevel) && safeLevel > 0 ? safeLevel : 1;
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
