import { automationResearchIds } from '../automationResearchIds.js';

export class GardenAutomationManager {
  constructor({ gardenFacade, gameplayLogFacade, researchFacade } = {}) {
    this.gardenFacade = gardenFacade;
    this.gameplayLogFacade = gameplayLogFacade;
    this.researchFacade = researchFacade;
  }

  update() {
    this.autoHarvestReadyPlants();
    this.autoPlantEmptyTiles();
  }

  autoHarvestReadyPlants() {
    const tiles = this.gardenFacade.getSnapshot().plot?.tiles ?? [];

    for (const tile of tiles) {
      if (!tile.unlocked || tile.phase !== 'ready') {
        continue;
      }

      if (!this.hasResearch(automationResearchIds.autoHarvestPlant(tile.tileNumber))) {
        continue;
      }

      this.gardenFacade.startHarvest(tile.tileNumber);
    }
  }

  autoPlantEmptyTiles() {
    const tiles = this.gardenFacade.getSnapshot().plot?.tiles ?? [];

    for (const tile of tiles) {
      if (!tile.unlocked || tile.phase !== 'empty' || !tile.selectedSeedItemTypeId) {
        continue;
      }

      if (!this.hasResearch(automationResearchIds.autoPlantTile(tile.tileNumber))) {
        continue;
      }

      const result = this.gardenFacade.plantSelectedSeed(tile.tileNumber);

      if (result.ok) {
        this.gameplayLogFacade?.logGardenSeedPlanted(result);
      }
    }
  }

  hasResearch(researchId) {
    return this.researchFacade?.hasCompletedResearch(researchId) === true;
  }
}
