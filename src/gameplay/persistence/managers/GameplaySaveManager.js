import { GAMEPLAY_SAVE_VERSION } from './GameplayMigrationManager.js';

export class GameplaySaveManager {
  constructor({
    manaFacade,
    goldFacade,
    crystalFacade,
    gameplayLogFacade,
    itemsFacade,
    researchFacade,
    visualSettingsFacade,
    shopFacade,
    brewingFacade,
    gardenFacade,
    tasksFacade,
    now = () => Date.now(),
  }) {
    this.manaFacade = manaFacade;
    this.goldFacade = goldFacade;
    this.crystalFacade = crystalFacade;
    this.gameplayLogFacade = gameplayLogFacade;
    this.itemsFacade = itemsFacade;
    this.researchFacade = researchFacade;
    this.visualSettingsFacade = visualSettingsFacade;
    this.shopFacade = shopFacade;
    this.brewingFacade = brewingFacade;
    this.gardenFacade = gardenFacade;
    this.tasksFacade = tasksFacade;
    this.now = now;
  }

  createSave() {
    return {
      version: GAMEPLAY_SAVE_VERSION,
      savedAt: this.now(),
      mana: this.manaFacade.getSnapshot(),
      gold: this.goldFacade.getSnapshot(),
      crystal: this.crystalFacade.getSnapshot(),
      logs: this.gameplayLogFacade.getPersistenceSnapshot(),
      inventory: this.itemsFacade.getPersistenceSnapshot(),
      research: this.researchFacade.getPersistenceSnapshot(),
      visualSettings: this.visualSettingsFacade.getPersistenceSnapshot(),
      shop: this.shopFacade.getPersistenceSnapshot(),
      brewing: this.brewingFacade.getPersistenceSnapshot(),
      garden: this.gardenFacade.getPersistenceSnapshot(),
      tasks: this.tasksFacade.getPersistenceSnapshot(),
    };
  }
}
