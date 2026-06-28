export class GameplayLoadManager {
  constructor({
    manaFacade,
    coinFacade,
    crystalFacade,
    emeraldFacade,
    rubyFacade,
    inboxRewardsFacade,
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
    personalTasksFacade,
    worldNoticeFacade,
    guildFacade,
  }) {
    this.manaFacade = manaFacade;
    this.coinFacade = coinFacade;
    this.crystalFacade = crystalFacade;
    this.emeraldFacade = emeraldFacade;
    this.rubyFacade = rubyFacade;
    this.inboxRewardsFacade = inboxRewardsFacade ?? {
      applyPersistenceSnapshot: () => {},
    };
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
    this.personalTasksFacade = personalTasksFacade;
    this.worldNoticeFacade = worldNoticeFacade;
    this.guildFacade = guildFacade;
  }

  applySave(save) {
    if (!save || typeof save !== 'object') {
      return false;
    }

    this.manaFacade.applyPersistenceSnapshot(save.mana);
    this.coinFacade.applyPersistenceSnapshot(save.coin ?? save.gold);
    this.crystalFacade.applyPersistenceSnapshot(save.crystal);
    this.emeraldFacade.applyPersistenceSnapshot(save.emerald);
    this.rubyFacade.applyPersistenceSnapshot(save.ruby);
    this.inboxRewardsFacade.applyPersistenceSnapshot(save.inboxRewards);
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
    this.personalTasksFacade.applyPersistenceSnapshot(save.personalTasks);
    this.worldNoticeFacade.applyPersistenceSnapshot(save.worldNotice);
    this.guildFacade.applyPersistenceSnapshot(save.guild);
    return true;
  }
}
