export class GameplayLoadManager {
  constructor({
    manaFacade,
    goldFacade,
    crystalFacade,
    rubyFacade,
    gameplayLogFacade,
    itemsFacade,
    researchFacade,
    automationFacade,
    seedSummoningFacade,
    prestigeFacade,
    visualSettingsFacade,
    shopFacade,
    brewingFacade,
    gardenFacade,
    tasksFacade,
  }) {
    this.manaFacade = manaFacade;
    this.goldFacade = goldFacade;
    this.crystalFacade = crystalFacade;
    this.rubyFacade = rubyFacade;
    this.gameplayLogFacade = gameplayLogFacade;
    this.itemsFacade = itemsFacade;
    this.researchFacade = researchFacade;
    this.automationFacade = automationFacade;
    this.seedSummoningFacade = seedSummoningFacade;
    this.prestigeFacade = prestigeFacade;
    this.visualSettingsFacade = visualSettingsFacade;
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
    this.rubyFacade.applyPersistenceSnapshot(save.ruby);
    this.gameplayLogFacade.applyPersistenceSnapshot(save.logs);
    this.itemsFacade.applyPersistenceSnapshot(save.inventory);
    this.researchFacade.applyPersistenceSnapshot(save.research);
    this.automationFacade.applyPersistenceSnapshot(save.automation);
    this.seedSummoningFacade.applyPersistenceSnapshot(save.seedSummoning);
    this.prestigeFacade.applyPersistenceSnapshot(save.prestige);
    this.visualSettingsFacade.applyPersistenceSnapshot(save.visualSettings);
    this.tasksFacade.applyPersistenceSnapshot(save.tasks);
    this.shopFacade.applyPersistenceSnapshot(save.shop);
    this.brewingFacade.applyPersistenceSnapshot(save.brewing, this.itemsFacade);
    this.gardenFacade.applyPersistenceSnapshot(save.garden);
    return true;
  }
}
