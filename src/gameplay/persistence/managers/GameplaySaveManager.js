import { GAMEPLAY_SAVE_VERSION } from './GameplayMigrationManager.js';

export class GameplaySaveManager {
  constructor({
    manaFacade,
    coinFacade,
    crystalFacade,
    emeraldFacade,
    rubyFacade,
    inboxRewardsFacade,
    statsFacade,
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
    now = () => Date.now(),
  }) {
    this.manaFacade = manaFacade;
    this.coinFacade = coinFacade;
    this.crystalFacade = crystalFacade;
    this.emeraldFacade = emeraldFacade;
    this.rubyFacade = rubyFacade;
    this.inboxRewardsFacade = inboxRewardsFacade ?? {
      getPersistenceSnapshot: () => ({ version: 1, claimedMailKeys: [] }),
    };
    this.statsFacade = statsFacade ?? {
      getPersistenceSnapshot: () => ({ version: 1 }),
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
    this.now = now;
  }

  createSave() {
    const coin = this.coinFacade.getSnapshot();

    return {
      version: GAMEPLAY_SAVE_VERSION,
      savedAt: this.now(),
      mana: this.manaFacade.getSnapshot(),
      coin,
      gold: coin,
      crystal: this.crystalFacade.getSnapshot(),
      emerald: this.emeraldFacade.getSnapshot(),
      ruby: this.rubyFacade.getSnapshot(),
      inboxRewards: this.inboxRewardsFacade.getPersistenceSnapshot(),
      stats: this.statsFacade.getPersistenceSnapshot(),
      logs: this.gameplayLogFacade.getPersistenceSnapshot(),
      inventory: this.itemsFacade.getPersistenceSnapshot(),
      research: this.researchFacade.getPersistenceSnapshot(),
      automation: this.automationFacade.getPersistenceSnapshot(),
      seedSummoning: this.seedSummoningFacade.getPersistenceSnapshot(),
      prestige: this.prestigeFacade.getPersistenceSnapshot(),
      visualSettings: this.visualSettingsFacade.getPersistenceSnapshot(),
      shop: this.shopFacade.getPersistenceSnapshot(),
      brewing: this.brewingFacade.getPersistenceSnapshot(),
      garden: this.gardenFacade.getPersistenceSnapshot(),
      tasks: this.tasksFacade.getPersistenceSnapshot(),
      personalTasks: this.personalTasksFacade.getPersistenceSnapshot(),
      worldNotice: this.worldNoticeFacade.getPersistenceSnapshot(),
      guild: this.guildFacade.getPersistenceSnapshot(),
    };
  }
}
