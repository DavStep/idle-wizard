export class GameplayLoadManager {
  constructor({
    manaFacade,
    goldFacade,
    crystalFacade,
    gameplayLogFacade,
    itemsFacade,
    researchFacade,
    shopFacade,
    brewingFacade,
    gardenFacade,
    tasksFacade,
  }) {
    this.manaFacade = manaFacade;
    this.goldFacade = goldFacade;
    this.crystalFacade = crystalFacade;
    this.gameplayLogFacade = gameplayLogFacade;
    this.itemsFacade = itemsFacade;
    this.researchFacade = researchFacade;
    this.shopFacade = shopFacade;
    this.brewingFacade = brewingFacade;
    this.gardenFacade = gardenFacade;
    this.tasksFacade = tasksFacade;
  }

  applySave(save) {
    if (!save || typeof save !== 'object') {
      return false;
    }

    this.manaFacade.applyPersistenceSnapshot(save.mana);
    this.goldFacade.applyPersistenceSnapshot(save.gold);
    this.crystalFacade.applyPersistenceSnapshot(save.crystal);
    this.gameplayLogFacade.applyPersistenceSnapshot(save.logs);
    this.itemsFacade.applyPersistenceSnapshot(save.inventory);
    this.researchFacade.applyPersistenceSnapshot(save.research);
    this.shopFacade.applyPersistenceSnapshot(save.shop);
    this.brewingFacade.applyPersistenceSnapshot(save.brewing, this.itemsFacade);
    this.gardenFacade.applyPersistenceSnapshot(save.garden);
    this.tasksFacade.applyPersistenceSnapshot(save.tasks);
    return true;
  }
}
