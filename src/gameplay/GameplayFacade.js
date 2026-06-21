import { AutomationFacade } from './automation/AutomationFacade.js';
import { BrewingFacade } from './brewing/BrewingFacade.js';
import { CrystalFacade } from './crystal/CrystalFacade.js';
import { EmeraldFacade } from './emerald/EmeraldFacade.js';
import { GoldFacade } from './gold/GoldFacade.js';
import { GardenFacade } from './garden/GardenFacade.js';
import { GuildFacade } from './guild/GuildFacade.js';
import { ItemsFacade } from './items/ItemsFacade.js';
import { ManaFacade } from './mana/ManaFacade.js';
import { GameplayRewardEventManager } from './managers/GameplayRewardEventManager.js';
import { GameplayStateObserverManager } from './managers/GameplayStateObserverManager.js';
import { LevelUpCrystalRewardManager } from './managers/LevelUpCrystalRewardManager.js';
import { GameplayLogFacade } from './logs/GameplayLogFacade.js';
import { GameplayPersistenceFacade } from './persistence/GameplayPersistenceFacade.js';
import {
  PERSONAL_TASK_ACTIONS,
  PersonalTasksFacade,
} from './personalTasks/PersonalTasksFacade.js';
import { PlayerLevelFacade } from './playerLevel/PlayerLevelFacade.js';
import { PrestigeFacade } from './prestige/PrestigeFacade.js';
import { ResearchFacade } from './research/ResearchFacade.js';
import { RubyFacade } from './ruby/RubyFacade.js';
import { SeedSummoningFacade } from './seedSummoning/SeedSummoningFacade.js';
import { ShopFacade } from './shop/ShopFacade.js';
import { TasksFacade } from './tasks/TasksFacade.js';
import { VisualSettingsFacade } from './visualSettings/VisualSettingsFacade.js';
import {
  WORLD_NOTICE_ACTIONS,
  WorldNoticeFacade,
} from './worldNotice/WorldNoticeFacade.js';

export const GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS = 50;
export const GAMEPLAY_FRAME_SNAPSHOT_REFRESH_MS = 1_000;
export const PRESTIGE_RESET_LEVEL = 5;

export class GameplayFacade {
  static explain =
    'Runs the player resources and actions: mana fills up, actions spend it, and owned things change.';

  constructor({ persistenceStorage, persistenceNow, shopNow } = {}) {
    this.stateObserverManager = new GameplayStateObserverManager();
    this.rewardEventManager = new GameplayRewardEventManager();
    this.itemsFacade = new ItemsFacade();
    this.manaFacade = new ManaFacade();
    this.goldFacade = new GoldFacade();
    this.crystalFacade = new CrystalFacade();
    this.emeraldFacade = new EmeraldFacade();
    this.rubyFacade = new RubyFacade();
    this.visualSettingsFacade = new VisualSettingsFacade({
      crystalFacade: this.crystalFacade,
    });
    this.gameplayLogFacade = new GameplayLogFacade();
    this.tasksFacade = new TasksFacade({
      itemsFacade: this.itemsFacade,
    });
    this.playerLevelFacade = new PlayerLevelFacade({
      tasksFacade: this.tasksFacade,
    });
    this.prestigeFacade = new PrestigeFacade({
      playerLevelFacade: this.playerLevelFacade,
    });
    this.researchFacade = new ResearchFacade({
      crystalFacade: this.crystalFacade,
      emeraldFacade: this.emeraldFacade,
      goldFacade: this.goldFacade,
      itemsFacade: this.itemsFacade,
      manaFacade: this.manaFacade,
      onResearchComplete: (event) => this.handleResearchComplete(event),
      playerLevelFacade: this.playerLevelFacade,
      prestigeFacade: this.prestigeFacade,
      rubyFacade: this.rubyFacade,
    });
    this.personalTasksFacade = new PersonalTasksFacade({
      crystalFacade: this.crystalFacade,
      goldFacade: this.goldFacade,
      playerLevelFacade: this.playerLevelFacade,
      researchFacade: this.researchFacade,
      tasksFacade: this.tasksFacade,
      now: persistenceNow,
    });
    this.worldNoticeFacade = new WorldNoticeFacade({
      goldFacade: this.goldFacade,
      playerLevelFacade: this.playerLevelFacade,
      tasksFacade: this.tasksFacade,
      now: persistenceNow,
    });
    this.guildFacade = new GuildFacade({
      goldFacade: this.goldFacade,
      itemsFacade: this.itemsFacade,
      playerLevelFacade: this.playerLevelFacade,
      worldNoticeFacade: this.worldNoticeFacade,
      now: persistenceNow,
    });
    this.levelUpCrystalRewardManager = new LevelUpCrystalRewardManager({
      crystalFacade: this.crystalFacade,
      playerLevelFacade: this.playerLevelFacade,
      getCommittedCrystalResearchCostTotal: () =>
        this.researchFacade.getCommittedCrystalCostTotal(),
    });
    this.brewingFacade = new BrewingFacade({
      goldFacade: this.goldFacade,
      itemsFacade: this.itemsFacade,
      manaFacade: this.manaFacade,
      playerLevelFacade: this.playerLevelFacade,
      researchFacade: this.researchFacade,
      onBrewComplete: (event) => this.handleBrewComplete(event),
    });
    this.seedSummoningFacade = new SeedSummoningFacade({
      manaFacade: this.manaFacade,
      itemsFacade: this.itemsFacade,
      researchFacade: this.researchFacade,
    });
    this.shopFacade = new ShopFacade({
      goldFacade: this.goldFacade,
      itemsFacade: this.itemsFacade,
      playerLevelFacade: this.playerLevelFacade,
      researchFacade: this.researchFacade,
      getReservedItemQuantity: (itemTypeId) => this.getReservedShopItemQuantity(itemTypeId),
      onItemSold: (event) => this.handleItemSold(event),
      now: shopNow,
    });
    this.gardenFacade = new GardenFacade({
      goldFacade: this.goldFacade,
      itemsFacade: this.itemsFacade,
      playerLevelFacade: this.playerLevelFacade,
      researchFacade: this.researchFacade,
      onHarvestComplete: (event) => this.handleGardenHarvestComplete(event),
    });
    this.automationFacade = new AutomationFacade({
      brewingFacade: this.brewingFacade,
      gardenFacade: this.gardenFacade,
      gameplayLogFacade: this.gameplayLogFacade,
      onBrewStarted: (result) => this.handleBrewStarted(result),
      onGardenSeedPlanted: (result) => this.handleGardenSeedPlanted(result),
      onSeedSummoned: (result) => this.handleSeedSummoned(result),
      onPotionRecipeDiscovery: (potionKey) =>
        void this.potionDiscoveryFacade?.discoverPotionRecipe(potionKey),
      researchFacade: this.researchFacade,
      seedSummoningFacade: this.seedSummoningFacade,
    });
    this.persistenceFacade = new GameplayPersistenceFacade({
      storage: persistenceStorage,
      manaFacade: this.manaFacade,
      goldFacade: this.goldFacade,
      crystalFacade: this.crystalFacade,
      emeraldFacade: this.emeraldFacade,
      rubyFacade: this.rubyFacade,
      gameplayLogFacade: this.gameplayLogFacade,
      itemsFacade: this.itemsFacade,
      researchFacade: this.researchFacade,
      automationFacade: this.automationFacade,
      seedSummoningFacade: this.seedSummoningFacade,
      prestigeFacade: this.prestigeFacade,
      visualSettingsFacade: this.visualSettingsFacade,
      shopFacade: this.shopFacade,
      brewingFacade: this.brewingFacade,
      gardenFacade: this.gardenFacade,
      tasksFacade: this.tasksFacade,
      personalTasksFacade: this.personalTasksFacade,
      worldNoticeFacade: this.worldNoticeFacade,
      guildFacade: this.guildFacade,
      now: persistenceNow,
    });
    this.potionDiscoveryFacade = null;
    this.worldChatFacade = null;
    this.gameConfigFacade = null;
    this.gameConfigUnsubscribe = null;
    this.initialized = false;
    this.lastFrameSnapshotPublishTime = Number.NEGATIVE_INFINITY;
    this.lastFrameSnapshotBuildTime = Number.NEGATIVE_INFINITY;
    this.lastFrameSnapshotKey = '';
    this.lastFrameHadTimerWork = false;
    this.snapshotCacheDepth = 0;
    this.cachedSnapshot = null;
  }

  setPersistenceStorage(storageManager) {
    this.persistenceFacade.setStorageManager(storageManager);
  }

  setGameConfigFacade(gameConfigFacade) {
    this.gameConfigUnsubscribe?.();
    this.gameConfigFacade = gameConfigFacade;
    this.gameConfigUnsubscribe = gameConfigFacade?.subscribe?.((snapshot) => {
      this.applyRuntimeConfig(snapshot);

      if (this.initialized) {
        this.publishSnapshot();
      }
    }) ?? null;
    this.applyRuntimeConfig(gameConfigFacade?.getSnapshot?.());
  }

  applyRuntimeConfig(snapshot = {}) {
    this.itemsFacade.applyRuntimeConfig(snapshot);
    this.brewingFacade.applyRuntimeConfig(snapshot);
    this.gardenFacade.applyRuntimeConfig(snapshot);
    this.shopFacade.applyRuntimeConfig(snapshot);
    this.researchFacade.applyRuntimeConfig(snapshot);
    this.visualSettingsFacade.applyRuntimeConfig(snapshot);
    this.tasksFacade.applyRuntimeConfig(snapshot);
    this.playerLevelFacade.applyRuntimeConfig(snapshot);

    if (this.initialized) {
      this.syncPlayerLevelManaEffects();
    }
  }

  setNpcMarketFacade(npcMarketFacade) {
    this.shopFacade.setNpcMarketFacade(npcMarketFacade);

    if (this.initialized) {
      this.publishSnapshot();
    }
  }

  setPotionDiscoveryFacade(potionDiscoveryFacade) {
    this.potionDiscoveryFacade = potionDiscoveryFacade;
    this.brewingFacade.setPotionDiscoveryFacade(potionDiscoveryFacade);
    this.shopFacade.setPotionDiscoveryFacade(potionDiscoveryFacade);

    if (this.initialized) {
      this.publishSnapshot();
    }
  }

  setWorldChatFacade(worldChatFacade) {
    this.worldChatFacade = worldChatFacade;

    if (this.initialized) {
      this.publishSnapshot();
    }
  }

  initialize(ecsFacade) {
    if (this.initialized) {
      return;
    }

    const ecsManagers = ecsFacade.getManagers();
    this.itemsFacade.initialize(ecsManagers);
    this.manaFacade.initialize(ecsManagers);
    this.goldFacade.initialize(ecsManagers);
    this.crystalFacade.initialize(ecsManagers);
    this.emeraldFacade.initialize(ecsManagers);
    this.rubyFacade.initialize(ecsManagers);
    this.tasksFacade.initialize(ecsManagers);
    this.prestigeFacade.initialize(ecsManagers);
    this.researchFacade.initialize(ecsManagers);
    this.brewingFacade.initialize(ecsManagers);
    this.seedSummoningFacade.initialize(ecsManagers);
    this.shopFacade.initialize(ecsManagers);
    this.gardenFacade.initialize(ecsManagers);
    this.automationFacade.initialize(ecsManagers);
    const loaded = this.persistenceFacade.load();
    this.syncRubyFromPrestige();
    const backfilledCrystal = loaded
      ? this.levelUpCrystalRewardManager.grantMissingForCurrentLevel()
      : 0;
    this.syncPlayerLevelManaEffects();
    if (loaded) {
      this.applyOfflineTimerCatchup(ecsFacade);
      if (backfilledCrystal > 0) {
        this.persistenceFacade.save();
      }
    }
    this.persistenceFacade.start();
    this.initialized = true;
    this.publishSnapshot();
  }

  shutdown() {
    this.persistenceFacade.stop();
    this.gameConfigUnsubscribe?.();
    this.gameConfigUnsubscribe = null;
    this.stateObserverManager.clear();
    this.rewardEventManager.clear();
    this.initialized = false;
  }

  afterUpdate(frame = {}) {
    this.publishFrameSnapshot(frame);
    this.persistenceFacade.afterUpdate(frame);
  }

  summonSeed() {
    const result = this.seedSummoningFacade.summonSeed();
    if (result.ok) {
      this.handleSeedSummoned(result);
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  buyShopShelfSlot() {
    const result = this.shopFacade.buyNextShelfSlot();
    if (result.ok) {
      this.gameplayLogFacade.logShopStandBought({
        ...result,
        marketLabel: 'npc market',
      });
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  buyPlayerShopShelfSlot() {
    const result = this.shopFacade.buyNextPlayerShelfSlot();
    if (result.ok) {
      this.gameplayLogFacade.logShopStandBought({
        ...result,
        marketLabel: 'player market',
      });
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  buyGardenTile() {
    const result = this.gardenFacade.buyNextTile();
    if (result.ok) {
      this.gameplayLogFacade.logGardenTileBought(result);
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  buyBrewingCauldron() {
    const result = this.brewingFacade.buyNextCauldron();
    if (result.ok) {
      this.gameplayLogFacade.logBrewingCauldronBought(result);
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  fillTask(taskId) {
    const result = this.tasksFacade.fillTask(taskId);
    this.publishAndSaveSnapshot();
    return result;
  }

  completeTask(taskId) {
    const result = this.tasksFacade.completeTask(taskId);
    if (result.ok) {
      this.recordPersonalTaskAction(PERSONAL_TASK_ACTIONS.COMPLETE_MAIN_REQUIREMENTS, 1);
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  completeTaskLevel() {
    const completion = this.tasksFacade.getCurrentLevelCompletionSnapshot();

    if (!completion.canComplete) {
      this.publishAndSaveSnapshot();
      return {
        ok: false,
        reason: completion.completedAllLevels
          ? 'all_levels_completed'
          : completion.atMaxLevel
            ? 'max_level'
            : 'tasks_incomplete',
        ...completion,
      };
    }

    if (!this.goldFacade.canSpend(completion.costGold)) {
      this.publishAndSaveSnapshot();
      return {
        ok: false,
        reason: 'not_enough_gold',
        ...completion,
        currentGold: this.goldFacade.getSnapshot().current,
      };
    }

    this.goldFacade.spend(completion.costGold);
    const result = this.tasksFacade.completeCurrentLevel();

    if (result.ok && result.advanced) {
      this.levelUpCrystalRewardManager.grantForLevelRange(
        result.levelBefore ?? result.level,
        result.currentLevel,
      );
      this.syncPlayerLevelManaEffects();
      void this.worldChatFacade?.announceLevelUp?.(result.currentLevel);
    }

    this.publishAndSaveSnapshot();
    return result;
  }

  completePrestigeMilestone(level, { confirmedLower = false } = {}) {
    const prestigeSnapshot = this.prestigeFacade.getSnapshot();
    const milestone = prestigeSnapshot.milestones.find(
      (candidate) => candidate.level === Math.floor(Number(level)),
    );

    if (!milestone) {
      this.publishAndSaveSnapshot();
      return {
        ok: false,
        reason: 'unknown_milestone',
      };
    }

    if (
      milestone.lowerThanHighestAvailable &&
      !confirmedLower &&
      prestigeSnapshot.highestAvailableLevel
    ) {
      return {
        ok: false,
        reason: 'higher_prestige_available',
        milestone,
        highestAvailableLevel: prestigeSnapshot.highestAvailableLevel,
      };
    }

    const result = this.prestigeFacade.completeMilestone(milestone.level);

    if (!result.ok) {
      this.publishAndSaveSnapshot();
      return result;
    }

    void this.worldChatFacade?.announcePrestige?.({
      prestigeCount: result.completedLevels?.length,
      playerLevel: result.milestone?.level,
    });

    this.resetRunAfterPrestige();
    this.publishAndSaveSnapshot();

    return {
      ...result,
      earnedRuby: this.prestigeFacade.getEarnedRuby(),
      currentRuby: this.rubyFacade.getSnapshot().current,
    };
  }

  buyResearch(researchId) {
    const result = this.researchFacade.buyResearch(researchId);
    if (result.ok && this.researchFacade.hasCompletedResearch(result.researchId)) {
      this.handleResearchComplete({
        researchId: result.researchId,
        label: this.researchFacade.getResearchLabel(result.researchId),
      });
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  resetRunAfterPrestige() {
    const prestige = this.prestigeFacade.getPersistenceSnapshot();
    const completedCapacityResearchIds = this.researchFacade.getPermanentCompletedResearchIds();
    const visualSettings = this.visualSettingsFacade.getPersistenceSnapshot();
    const automation = this.automationFacade.getPersistenceSnapshot();
    const seedSummoning = this.seedSummoningFacade.getPersistenceSnapshot();

    this.persistenceFacade.applyRuntimeSave({
      mana: {
        current: 0,
        cap: 50,
        perSecond: 1,
      },
      gold: {
        current: 0,
        totalGenerated: 0,
      },
      crystal: {
        current: 0,
      },
      emerald: {
        current: 0,
      },
      ruby: {
        current: 0,
      },
      logs: {
        nextId: 1,
        entries: [],
      },
      inventory: [],
      research: {
        completedIds: completedCapacityResearchIds,
        inProgress: [],
      },
      automation,
      seedSummoning,
      prestige,
      visualSettings,
      shop: {},
      brewing: {},
      garden: {},
      tasks: {
        currentLevel: PRESTIGE_RESET_LEVEL,
        tasks: [],
      },
      personalTasks: {
        version: 1,
        periods: {},
      },
      worldNotice: this.worldNoticeFacade.getPersistenceSnapshot(),
      guild: this.guildFacade.getPersistenceSnapshot(),
    });
    this.syncPlayerLevelManaEffects();
    this.syncRubyFromPrestige();
  }

  syncRubyFromPrestige() {
    const earnedRuby = this.prestigeFacade.getEarnedRuby();
    const spentRuby = Math.max(
      0,
      Math.floor(Number(this.researchFacade.getCommittedRubyCostTotal()) || 0),
    );
    this.rubyFacade.setCurrent(Math.max(0, earnedRuby - spentRuby));
  }

  handleResearchComplete({ label }) {
    this.recordPersonalTaskAction(PERSONAL_TASK_ACTIONS.COMPLETE_RESEARCH, 1);
    this.recordWorldNoticeAction(WORLD_NOTICE_ACTIONS.COMPLETE_RESEARCH, 1);
    this.gameplayLogFacade.logResearchBought({
      label,
    });
    void this.worldChatFacade?.announceResearch(label);
  }

  handleSeedSummoned(result) {
    this.recordPersonalTaskAction(PERSONAL_TASK_ACTIONS.SUMMON_SEEDS, result.quantity);
    this.recordPersonalTaskAction(PERSONAL_TASK_ACTIONS.SPEND_MANA, result.cost);
    this.recordWorldNoticeAction(WORLD_NOTICE_ACTIONS.SUMMON_SEEDS, result.quantity);
    this.gameplayLogFacade.logSeedSummoned(result);
    this.rewardEventManager.publish({
      type: 'seed_summoned',
      seed: result.seed,
      seedCounts: result.seedCounts,
      quantity: result.quantity,
    });
  }

  handleBrewStarted(event) {
    this.recordPersonalTaskAction(PERSONAL_TASK_ACTIONS.SPEND_MANA, event?.manaCost);
  }

  handleBrewComplete(event) {
    this.recordPersonalTaskAction(PERSONAL_TASK_ACTIONS.BREW_POTIONS, event.quantity);
    this.recordWorldNoticeAction(WORLD_NOTICE_ACTIONS.BREW_POTIONS, event.quantity);
    this.gameplayLogFacade.logBrewCompleted(event);
    this.rewardEventManager.publish({
      type: 'potion_collected',
      potion: event.potion,
      quantity: event.quantity,
    });
  }

  handleGardenHarvestComplete(event) {
    this.recordPersonalTaskAction(PERSONAL_TASK_ACTIONS.HARVEST_HERBS, event.quantity);
    this.recordWorldNoticeAction(WORLD_NOTICE_ACTIONS.HARVEST_HERBS, event.quantity);
    this.gameplayLogFacade.logGardenHarvestCompleted(event);
    this.rewardEventManager.publish({
      type: 'herb_harvested',
      herb: event.herb,
      quantity: event.quantity,
      tileNumber: event.tileNumber,
    });
  }

  handleGardenSeedPlanted(event) {
    if (!event?.ok && event?.planted !== true) {
      return;
    }

    this.recordPersonalTaskAction(PERSONAL_TASK_ACTIONS.PLANT_SEEDS, 1);
  }

  handleItemSold(event) {
    this.recordPersonalTaskAction(PERSONAL_TASK_ACTIONS.SELL_ITEMS, event.quantity ?? 1);
    this.recordPersonalTaskAction(PERSONAL_TASK_ACTIONS.EARN_GOLD, event.gold);
    this.recordWorldNoticeAction(WORLD_NOTICE_ACTIONS.SELL_ITEMS, event.quantity ?? 1);
    this.recordWorldNoticeAction(WORLD_NOTICE_ACTIONS.EARN_GOLD, event.gold);
    this.gameplayLogFacade.logItemSold(event);
    this.rewardEventManager.publish({
      type: 'item_sold',
      item: event.item,
      gold: event.gold,
      quantity: event.quantity ?? 1,
      slotNumber: event.slotNumber,
    });
  }

  publishItemBought(event) {
    this.rewardEventManager.publish({
      type: 'item_bought',
      item: event.item,
      gold: event.gold,
      quantity: event.quantity ?? 1,
      source: event.source,
      listingKey: event.listingKey,
    });
  }

  handleGoldCollected(event) {
    this.recordPersonalTaskAction(PERSONAL_TASK_ACTIONS.EARN_GOLD, event.gold);
    this.recordWorldNoticeAction(WORLD_NOTICE_ACTIONS.EARN_GOLD, event.gold);
    this.rewardEventManager.publish({
      type: 'gold_collected',
      gold: event.gold,
      source: event.source,
    });
  }

  recordPersonalTaskAction(actionType, quantity = 1) {
    return this.personalTasksFacade.recordAction(actionType, quantity);
  }

  claimPersonalTaskReward(periodType, taskId) {
    const result = this.personalTasksFacade.claimTaskReward(periodType, taskId);
    this.publishAndSaveSnapshot();
    return result;
  }

  claimPersonalTaskFullClearReward(periodType) {
    const result = this.personalTasksFacade.claimFullClearReward(periodType);
    this.publishAndSaveSnapshot();
    return result;
  }

  recordWorldNoticeAction(actionType, quantity = 1) {
    return this.worldNoticeFacade.recordAction(actionType, quantity);
  }

  donateWorldNoticeGold(requestId) {
    const result = this.worldNoticeFacade.donateGold(requestId);
    this.publishAndSaveSnapshot();
    return result;
  }

  createGuild(profile) {
    const result = this.guildFacade.createGuild(profile);
    this.publishAndSaveSnapshot();
    return result;
  }

  updateGuildProfile(profile) {
    const result = this.guildFacade.updateGuildProfile(profile);
    this.publishAndSaveSnapshot();
    return result;
  }

  hireGuildApplicant(applicantId) {
    const result = this.guildFacade.hireApplicant(applicantId);
    this.publishAndSaveSnapshot();
    return result;
  }

  fireGuildAdventurer(adventurerId) {
    const result = this.guildFacade.fireAdventurer(adventurerId);
    this.publishAndSaveSnapshot();
    return result;
  }

  removeGuildRequest(requestId) {
    const result = this.guildFacade.removeRequest(requestId);
    this.publishAndSaveSnapshot();
    return result;
  }

  upgradeGuildSecretary() {
    const result = this.guildFacade.upgradeSecretary();
    this.publishAndSaveSnapshot();
    return result;
  }

  addBrewingIngredient(itemTypeId, cauldronIndex = 0) {
    const result = this.brewingFacade.addIngredient(itemTypeId, cauldronIndex);
    this.publishAndSaveSnapshot();
    return result;
  }

  removeBrewingIngredientAt(slotIndex, cauldronIndex = 0) {
    const result = this.brewingFacade.removeIngredientAt(slotIndex, cauldronIndex);
    this.publishAndSaveSnapshot();
    return result;
  }

  clearBrewingCauldron(cauldronIndex = 0) {
    const result = this.brewingFacade.clearCauldron(cauldronIndex);
    this.publishAndSaveSnapshot();
    return result;
  }

  prepareBrewingRecipe(recipeKey, cauldronIndex = 0) {
    const result = this.brewingFacade.prepareRecipeForSelection(recipeKey, cauldronIndex);
    this.publishAndSaveSnapshot();
    return result;
  }

  setBrewingAutoBrewRecipe(recipeKey, cauldronIndex = 0) {
    const result = this.brewingFacade.setAutoBrewRecipeKey(recipeKey, cauldronIndex);
    this.publishAndSaveSnapshot();
    return result;
  }

  setBrewingAutoBrewEnabled(enabled, cauldronIndex = 0) {
    const result = this.brewingFacade.setAutoBrewEnabled(enabled, cauldronIndex);
    this.publishAndSaveSnapshot();
    return result;
  }

  toggleBrewingAutoBrewEnabled(cauldronIndex = 0) {
    const result = this.brewingFacade.toggleAutoBrewEnabled(cauldronIndex);
    this.publishAndSaveSnapshot();
    return result;
  }

  getBrewingAutoBrewRecipeKey(cauldronIndex = 0) {
    return this.brewingFacade.getAutoBrewRecipeKey(cauldronIndex);
  }

  setSeedSummoningAutoEnabled(enabled) {
    const result = this.automationFacade.setSeedSummoningEnabled(enabled);
    this.publishAndSaveSnapshot();
    return result;
  }

  toggleSeedSummoningAutoEnabled() {
    const result = this.automationFacade.toggleSeedSummoningEnabled();
    this.publishAndSaveSnapshot();
    return result;
  }

  setSeedSummoningManaReserve(manaReserve) {
    const result = this.automationFacade.setSeedSummoningManaReserve(manaReserve);
    this.publishAndSaveSnapshot();
    return result;
  }

  setSeedDropPreference(seedKey, preference) {
    const result = this.seedSummoningFacade.setSeedDropPreference(seedKey, preference);
    this.publishAndSaveSnapshot();
    return result;
  }

  brewCauldron(cauldronIndex = 0) {
    const result = this.brewingFacade.brew(cauldronIndex);
    if (result.ok) {
      this.handleBrewStarted(result);
    }
    if (result.ok && result.discovery?.potionKey) {
      void this.potionDiscoveryFacade?.discoverPotionRecipe(result.discovery.potionKey);
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  startBrewingBottling(cauldronIndex = 0) {
    const result = this.brewingFacade.startBottling(cauldronIndex);
    this.publishAndSaveSnapshot();
    return result;
  }

  selectShopShelfSlot(slotNumber) {
    const result = this.shopFacade.selectShelfSlot(slotNumber);
    this.publishAndSaveSnapshot();
    return result;
  }

  selectPlayerShopShelfSlot(slotNumber) {
    const result = this.shopFacade.selectPlayerShelfSlot(slotNumber);
    this.publishAndSaveSnapshot();
    return result;
  }

  setSelectedShopShelfSlotSellItem(itemTypeId, sellLimit) {
    const result = this.shopFacade.setSelectedShelfSlotSellItem(itemTypeId, sellLimit);
    this.publishAndSaveSnapshot();
    return result;
  }

  clearSelectedShopShelfSlotSellItem() {
    const result = this.shopFacade.clearSelectedShelfSlotSellItem();
    this.publishAndSaveSnapshot();
    return result;
  }

  setSelectedPlayerShopShelfSlotListing(listing) {
    const result = this.shopFacade.setSelectedPlayerShelfSlotListing(listing);
    this.publishAndSaveSnapshot();
    return result;
  }

  clearSelectedPlayerShopShelfSlotListing() {
    const result = this.shopFacade.clearSelectedPlayerShelfSlotListing();
    this.publishAndSaveSnapshot();
    return result;
  }

  setPlayerShopRequest(slotNumber, request) {
    const result = this.shopFacade.setPlayerShopRequest(slotNumber, request);
    this.publishAndSaveSnapshot();
    return result;
  }

  clearPlayerShopRequest(slotNumber) {
    const result = this.shopFacade.clearPlayerShopRequest(slotNumber);
    this.publishAndSaveSnapshot();
    return result;
  }

  applyPlayerShopMarketSlotQuantity(slotNumber, quantity) {
    const result = this.shopFacade.applyPlayerShopMarketSlotQuantity(slotNumber, quantity);
    this.publishAndSaveSnapshot();
    return result;
  }

  buyPlayerShopListingItem(listing) {
    const result = this.shopFacade.buyPlayerShopListingItem(listing);
    if (result.ok) {
      this.publishItemBought({
        item: result.item,
        gold: result.totalPriceGold,
        quantity: result.quantity,
        source: 'player_market',
        listingKey: listing?.listingKey,
      });
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  async buyNpcMarketStockItem(itemTypeId, quantity = 1) {
    const result = await this.shopFacade.buyStockItem(itemTypeId, quantity);

    if (result.ok) {
      this.gameplayLogFacade.logItemBought({
        item: result.item,
        gold: result.totalPriceGold,
        quantity: result.quantity,
      });
      this.publishItemBought({
        item: result.item,
        gold: result.totalPriceGold,
        quantity: result.quantity,
        source: 'npc_stock',
      });
    }

    this.publishAndSaveSnapshot();
    return result;
  }

  quoteNpcMarketStockPurchase(itemTypeId, quantity = 1) {
    return this.shopFacade.quoteStockPurchase(itemTypeId, quantity);
  }

  async sellNpcMarketItem(itemTypeId, quantity = 1) {
    const result = await this.shopFacade.sellNpcMarketItem(itemTypeId, quantity);
    this.publishAndSaveSnapshot();
    return result;
  }

  quoteNpcMarketSell(itemTypeId, quantity = 1) {
    return this.shopFacade.quoteNpcMarketSell(itemTypeId, quantity);
  }

  claimPlayerShopSaleProceeds(gold) {
    const result = this.shopFacade.claimPlayerShopSaleProceeds(gold);
    if (result.ok) {
      this.handleGoldCollected({
        gold: result.gold,
        source: 'player_shop_proceeds',
      });
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  collectShopGoldOffer() {
    const result = this.shopFacade.collectGoldOffer();
    if (result.ok) {
      this.handleGoldCollected({
        gold: result.gold,
        source: 'shop_gold_offer',
      });
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  sellTutorialItemForGold({ itemKey, quantity = 1, goldEach = 1, goldTarget = null } = {}) {
    let item;

    try {
      item = this.itemsFacade.getItemDefinitionByKey(itemKey);
    } catch {
      return {
        ok: false,
        reason: 'unknown_item',
        itemKey,
      };
    }

    const requestedQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
    const unitGold = Math.max(0, Number(goldEach) || 0);

    if (unitGold <= 0) {
      return {
        ok: false,
        reason: 'invalid_gold',
      };
    }

    const currentGold = this.goldFacade.getSnapshot().current;
    const remainingGold = Number.isFinite(goldTarget)
      ? Math.max(0, Math.floor(Number(goldTarget)) - currentGold)
      : Number.POSITIVE_INFINITY;

    if (remainingGold <= 0) {
      return {
        ok: false,
        reason: 'gold_target_met',
        currentGold,
      };
    }

    const targetQuantity = Number.isFinite(remainingGold)
      ? Math.min(requestedQuantity, Math.ceil(remainingGold / unitGold))
      : requestedQuantity;
    const ownedQuantity = this.itemsFacade.getItemQuantity(item.id);
    const sellQuantity = Math.min(targetQuantity, ownedQuantity);

    if (sellQuantity <= 0) {
      return {
        ok: false,
        reason: 'not_enough_items',
        item,
      };
    }

    const soldItem = this.itemsFacade.removeItem(item.id, sellQuantity);

    if (!soldItem) {
      return {
        ok: false,
        reason: 'not_enough_items',
        item,
      };
    }

    const gold = Math.min(remainingGold, sellQuantity * unitGold);
    this.goldFacade.add(gold);
    this.handleItemSold({
      item,
      gold,
      quantity: sellQuantity,
      tutorial: true,
    });
    this.publishAndSaveSnapshot();

    return {
      ok: true,
      item,
      quantity: sellQuantity,
      gold,
      currentGold: this.goldFacade.getSnapshot().current,
      tutorial: true,
    };
  }

  claimTradeAllianceCrystalReward(reward) {
    const crystalReward = Math.max(0, Math.floor(Number(reward?.crystalReward) || 0));

    if (crystalReward <= 0) {
      return {
        ok: false,
        reason: 'empty_reward',
      };
    }

    this.crystalFacade.add(crystalReward);
    this.gameplayLogFacade.logTradeAllianceReward({
      questLabel: reward?.questLabel,
      crystalReward,
    });
    this.publishAndSaveSnapshot();

    return {
      ok: true,
      crystalReward,
    };
  }

  fillTradeAllianceItemQuest(quest) {
    const itemKey = String(quest?.itemKey ?? '').trim();
    const target = Math.max(0, Math.floor(Number(quest?.target) || 0));
    const progress = Math.max(0, Math.floor(Number(quest?.progress) || 0));
    const minContribution = Math.max(0, Math.floor(Number(quest?.minContribution) || 0));
    const ownContribution = Math.max(0, Math.floor(Number(quest?.ownContribution) || 0));
    const remainingQuantity = Math.max(0, target - progress);
    const missingContribution = Math.max(0, minContribution - ownContribution);
    const fillGoalQuantity = Math.max(remainingQuantity, missingContribution);

    if (!itemKey || fillGoalQuantity <= 0) {
      return {
        ok: false,
        reason: 'not_ready',
      };
    }

    let itemDefinition;

    try {
      itemDefinition = this.itemsFacade.getItemDefinitionByKey(itemKey);
    } catch {
      return {
        ok: false,
        reason: 'unknown_item',
      };
    }

    const ownedQuantity = this.itemsFacade.getItemQuantity(itemDefinition.id);
    const fillQuantity = Math.min(ownedQuantity, fillGoalQuantity);

    if (fillQuantity <= 0) {
      return {
        ok: false,
        reason: 'not_enough_items',
      };
    }

    const removed = this.itemsFacade.removeItem(itemDefinition.id, fillQuantity);

    if (!removed) {
      return {
        ok: false,
        reason: 'not_enough_items',
      };
    }

    this.publishAndSaveSnapshot();

    return {
      ok: true,
      questId: quest.questId,
      item: {
        itemTypeId: itemDefinition.id,
        key: itemDefinition.key,
        label: itemDefinition.label,
        kind: itemDefinition.kind,
      },
      quantity: fillQuantity,
    };
  }

  refundTradeAllianceItemQuestFill(fill) {
    const itemTypeId = Number(fill?.item?.itemTypeId);
    const quantity = Math.max(0, Math.floor(Number(fill?.quantity) || 0));

    if (!Number.isInteger(itemTypeId) || itemTypeId <= 0 || quantity <= 0) {
      return {
        ok: false,
        reason: 'invalid_fill',
      };
    }

    this.itemsFacade.addItem(itemTypeId, quantity);
    this.publishAndSaveSnapshot();

    return {
      ok: true,
    };
  }

  buyVisualSettingOption(categoryKey, optionKey) {
    const result = this.visualSettingsFacade.buyOption(categoryKey, optionKey);
    this.publishAndSaveSnapshot();
    return result;
  }

  plantGardenSeed(tileNumber, seedTypeId) {
    const result = this.gardenFacade.plantSeed(tileNumber, seedTypeId);
    if (result.ok) {
      this.handleGardenSeedPlanted(result);
      this.gameplayLogFacade.logGardenSeedPlanted(result);
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  selectGardenSeed(tileNumber, seedTypeId) {
    const result = this.gardenFacade.selectSeed(tileNumber, seedTypeId);
    if (result.planted) {
      this.handleGardenSeedPlanted(result);
      this.gameplayLogFacade.logGardenSeedPlanted(result);
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  plantSelectedGardenSeed(tileNumber) {
    const result = this.gardenFacade.plantSelectedSeed(tileNumber);
    if (result.ok) {
      this.handleGardenSeedPlanted(result);
      this.gameplayLogFacade.logGardenSeedPlanted(result);
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  replaceGardenSeed(tileNumber, seedTypeId) {
    const result = this.gardenFacade.replaceSeed(tileNumber, seedTypeId);
    if (result.ok) {
      this.handleGardenSeedPlanted(result);
      this.gameplayLogFacade.logGardenSeedPlanted(result);
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  startGardenHarvest(tileNumber) {
    const result = this.gardenFacade.startHarvest(tileNumber);
    this.publishAndSaveSnapshot();
    return result;
  }

  cancelGardenPlanting(tileNumber) {
    const result = this.gardenFacade.cancelProgress(tileNumber);
    this.publishAndSaveSnapshot();
    return result;
  }

  getReservedShopItemQuantity(itemTypeId) {
    return (
      this.brewingFacade.getStagedIngredientQuantity(itemTypeId) +
      this.getGardenSelectedSeedReservedQuantity(itemTypeId)
    );
  }

  getGardenSelectedSeedReservedQuantity(itemTypeId) {
    return (this.gardenFacade.getSnapshot().plot?.tiles ?? []).filter(
      (tile) =>
        tile.unlocked &&
        tile.phase === 'empty' &&
        tile.selectedSeedItemTypeId === itemTypeId,
    ).length;
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }

  subscribeRewardEvents(listener) {
    return this.rewardEventManager.subscribe(listener);
  }

  getSnapshot() {
    if (this.snapshotCacheDepth > 0 && this.cachedSnapshot) {
      return this.cachedSnapshot;
    }

    const automation = this.automationFacade.getSnapshot();
    const seedSummoning = {
      ...this.seedSummoningFacade.getSnapshot(),
      autoSummoning: automation.seedSummoning,
    };
    const guild = this.guildFacade.getSnapshot();

    const snapshot = {
      mana: this.manaFacade.getSnapshot(),
      gold: this.goldFacade.getSnapshot(),
      crystal: this.crystalFacade.getSnapshot(),
      emerald: this.emeraldFacade.getSnapshot(),
      ruby: this.rubyFacade.getSnapshot(),
      inventory: this.itemsFacade.getInventorySnapshot(),
      seedInventory: this.itemsFacade.getSeedInventorySnapshot(),
      seedSummoning,
      automation,
      brewing: this.brewingFacade.getSnapshot(),
      discoveries: this.itemsFacade.getDiscoverySnapshot({
        getPotionDiscovery: (potionKey) =>
          this.potionDiscoveryFacade?.getDiscovery(potionKey) ?? null,
      }),
      logs: this.gameplayLogFacade.getSnapshot(),
      playerLevel: this.playerLevelFacade.getSnapshot(),
      tasks: this.tasksFacade.getSnapshot(),
      personalTasks: this.personalTasksFacade.getSnapshot(),
      worldNotice: this.worldNoticeFacade.getSnapshot(),
      guild,
      prestige: this.prestigeFacade.getSnapshot(),
      research: this.researchFacade.getSnapshot(),
      visualSettings: this.visualSettingsFacade.getSnapshot(),
      shop: this.shopFacade.getSnapshot(),
      garden: this.gardenFacade.getSnapshot(),
    };

    if (this.snapshotCacheDepth > 0) {
      this.cachedSnapshot = snapshot;
    }

    return snapshot;
  }

  withSnapshotCache(callback) {
    if (typeof callback !== 'function') {
      return undefined;
    }

    this.snapshotCacheDepth += 1;

    try {
      return callback();
    } finally {
      this.snapshotCacheDepth = Math.max(0, this.snapshotCacheDepth - 1);

      if (this.snapshotCacheDepth === 0) {
        this.cachedSnapshot = null;
      }
    }
  }

  publishSnapshot() {
    this.publishSnapshotObject(this.getSnapshot());
  }

  publishFrameSnapshot(frame = {}) {
    const time = Number(frame.time);

    if (!Number.isFinite(time)) {
      this.publishSnapshot();
      return true;
    }

    const hasTimerWork = this.hasFrameTimerWork();
    const timerWorkCompleted = this.lastFrameHadTimerWork && !hasTimerWork;

    if (
      !timerWorkCompleted &&
      time >= this.lastFrameSnapshotPublishTime &&
      time - this.lastFrameSnapshotPublishTime < GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS
    ) {
      this.lastFrameHadTimerWork = hasTimerWork;
      return false;
    }

    this.lastFrameSnapshotPublishTime = time;
    const snapshotKey = this.getFrameSnapshotKey();
    const shouldRefresh = this.shouldRefreshFrameSnapshot(time, hasTimerWork);

    if (snapshotKey === this.lastFrameSnapshotKey && !shouldRefresh && !timerWorkCompleted) {
      this.lastFrameHadTimerWork = hasTimerWork;
      return false;
    }

    this.publishSnapshotObject(this.getSnapshot(), snapshotKey, time, hasTimerWork);
    return true;
  }

  publishSnapshotObject(
    snapshot,
    frameSnapshotKey = this.getFrameSnapshotKey(),
    frameTime = this.getCurrentFrameTime(),
    hasTimerWork = this.hasFrameTimerWork(),
  ) {
    this.lastFrameSnapshotKey = frameSnapshotKey;
    this.lastFrameSnapshotBuildTime = frameTime;
    this.lastFrameHadTimerWork = hasTimerWork;
    this.stateObserverManager.publish(snapshot);
  }

  getFrameSnapshotKey() {
    const mana = this.manaFacade.getSnapshot();
    return JSON.stringify({
      manaCurrent: Math.floor(Number(mana.current) || 0),
      manaCap: Number(mana.cap) || 0,
      manaPerSecond: Number(mana.perSecond) || 0,
      guild: this.guildFacade.getFrameSnapshotKey(),
    });
  }

  shouldRefreshFrameSnapshot(time, hasTimerWork = this.hasFrameTimerWork()) {
    if (!hasTimerWork) {
      return false;
    }

    if (!Number.isFinite(this.lastFrameSnapshotBuildTime)) {
      return true;
    }

    return (
      time >= this.lastFrameSnapshotBuildTime &&
      time - this.lastFrameSnapshotBuildTime >= GAMEPLAY_FRAME_SNAPSHOT_REFRESH_MS
    );
  }

  getCurrentFrameTime() {
    const now = globalThis.performance?.now?.();
    return Number.isFinite(now) ? now : 0;
  }

  hasFrameTimerWork() {
    return (
      this.brewingFacade.hasFrameTimerWork() ||
      this.gardenFacade.hasFrameTimerWork() ||
      this.researchFacade.hasFrameTimerWork()
    );
  }

  publishAndSaveSnapshot() {
    this.publishSnapshot();
    this.persistenceFacade.save();
  }

  loadPersistenceSave(save, ecsFacade) {
    const loaded = this.persistenceFacade.loadSave(save);
    this.syncRubyFromPrestige();
    const backfilledCrystal = loaded
      ? this.levelUpCrystalRewardManager.grantMissingForCurrentLevel()
      : 0;
    this.syncPlayerLevelManaEffects();

    if (loaded) {
      this.applyOfflineTimerCatchup(ecsFacade);
      if (backfilledCrystal > 0) {
        this.persistenceFacade.save();
      }
    }

    this.publishSnapshot();
    return loaded;
  }

  savePersistenceSnapshot() {
    return this.persistenceFacade.save();
  }

  createPersistenceSave() {
    return this.persistenceFacade.createSave();
  }

  savePersistenceSnapshotAndFlush() {
    return this.persistenceFacade.saveAndFlush();
  }

  consumeProgressResetPending() {
    return this.persistenceFacade.consumeProgressResetPending();
  }

  syncPlayerLevelManaEffects() {
    this.manaFacade.setLevelUpgradeEffects(this.playerLevelFacade.getManaEffects());
  }

  applyOfflineTimerCatchup(ecsFacade) {
    const offlineDeltaSeconds = this.persistenceFacade.consumeOfflineDeltaSeconds();

    if (!Number.isFinite(offlineDeltaSeconds) || offlineDeltaSeconds <= 0) {
      return;
    }

    ecsFacade.update({
      deltaSeconds: 0,
      timerDeltaSeconds: offlineDeltaSeconds,
      offline: true,
    });
    this.persistenceFacade.save();
  }
}
