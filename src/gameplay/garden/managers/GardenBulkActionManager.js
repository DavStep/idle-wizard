import { gardenBulkResearchIds } from '../gardenBulkResearch.js';

export class GardenBulkActionManager {
  constructor({
    gardenPlantingManager,
    gardenTileEntityManager,
    researchFacade,
  }) {
    this.gardenPlantingManager = gardenPlantingManager;
    this.gardenTileEntityManager = gardenTileEntityManager;
    this.researchFacade = researchFacade;
  }

  plantAll(seedTypeId) {
    const locked = this.getLockedResult(gardenBulkResearchIds.plantAll);

    if (locked) {
      return locked;
    }

    if (!Number.isInteger(seedTypeId) || seedTypeId <= 0) {
      return {
        ok: false,
        reason: 'no_seed_selected',
        plantedTileNumbers: [],
        results: [],
      };
    }

    const emptyTiles = this.getTilesByPhase('empty');
    const results = emptyTiles.map((tile) =>
      this.gardenPlantingManager.plantSeed(tile.tileNumber, seedTypeId),
    );
    const plantedTileNumbers = results
      .filter((result) => result.ok)
      .map((result) => result.tileNumber);

    return {
      ok: plantedTileNumbers.length > 0,
      plantedTileNumbers,
      results,
      ...(plantedTileNumbers.length === 0
        ? {
            reason:
              emptyTiles.length === 0
                ? 'no_empty_tiles'
                : results[0]?.reason ?? 'plant_failed',
          }
        : {}),
    };
  }

  harvestAll() {
    const locked = this.getLockedResult(gardenBulkResearchIds.harvestAll);

    if (locked) {
      return locked;
    }

    const readyTiles = this.getTilesByPhase('ready');
    const results = readyTiles.map((tile) =>
      this.gardenPlantingManager.startHarvest(tile.tileNumber),
    );
    const harvestedTileNumbers = results
      .filter((result) => result.ok)
      .map((result) => result.tileNumber);

    return {
      ok: harvestedTileNumbers.length > 0,
      harvestedTileNumbers,
      results,
      ...(harvestedTileNumbers.length === 0
        ? { reason: 'no_ready_tiles' }
        : {}),
    };
  }

  getTilesByPhase(phase) {
    return this.gardenTileEntityManager
      .getTileSnapshots()
      .filter((tile) => tile.unlocked && tile.phase === phase);
  }

  getLockedResult(requiredResearchId) {
    if (this.researchFacade?.hasCompletedResearch?.(requiredResearchId)) {
      return null;
    }

    return {
      ok: false,
      reason: 'research_locked',
      requiredResearchId,
      plantedTileNumbers: [],
      harvestedTileNumbers: [],
      results: [],
    };
  }
}
