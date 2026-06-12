import { AutomationFacade } from './automation/AutomationFacade.js';
import { BrewingFacade } from './brewing/BrewingFacade.js';
import { CrystalFacade } from './crystal/CrystalFacade.js';
import { GoldFacade } from './gold/GoldFacade.js';
import { GardenFacade } from './garden/GardenFacade.js';
import { ItemsFacade } from './items/ItemsFacade.js';
import { ManaFacade } from './mana/ManaFacade.js';
import { GameplayStateObserverManager } from './managers/GameplayStateObserverManager.js';
import { LevelUpCrystalRewardManager } from './managers/LevelUpCrystalRewardManager.js';
import { GameplayLogFacade } from './logs/GameplayLogFacade.js';
import { GameplayPersistenceFacade } from './persistence/GameplayPersistenceFacade.js';
import { PlayerLevelFacade } from './playerLevel/PlayerLevelFacade.js';
import { ResearchFacade } from './research/ResearchFacade.js';
import { SeedSummoningFacade } from './seedSummoning/SeedSummoningFacade.js';
import { ShopFacade } from './shop/ShopFacade.js';
import { TasksFacade } from './tasks/TasksFacade.js';
import { VisualSettingsFacade } from './visualSettings/VisualSettingsFacade.js';

export class GameplayFacade {
  static explain =
    'Runs the player resources and actions: mana fills up, actions spend it, and owned things change.';

  constructor({ persistenceStorage, persistenceNow } = {}) {
    this.stateObserverManager = new GameplayStateObserverManager();
    this.itemsFacade = new ItemsFacade();
    this.manaFacade = new ManaFacade();
    this.goldFacade = new GoldFacade();
    this.crystalFacade = new CrystalFacade();
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
    this.researchFacade = new ResearchFacade({
      crystalFacade: this.crystalFacade,
      goldFacade: this.goldFacade,
      itemsFacade: this.itemsFacade,
      manaFacade: this.manaFacade,
      onResearchComplete: (event) => this.handleResearchComplete(event),
      playerLevelFacade: this.playerLevelFacade,
    });
    this.levelUpCrystalRewardManager = new LevelUpCrystalRewardManager({
      crystalFacade: this.crystalFacade,
      playerLevelFacade: this.playerLevelFacade,
      getCompletedCrystalResearchCostTotal: () =>
        this.researchFacade.getCompletedCrystalCostTotal(),
    });
    this.brewingFacade = new BrewingFacade({
      itemsFacade: this.itemsFacade,
      manaFacade: this.manaFacade,
      researchFacade: this.researchFacade,
      onBrewComplete: (event) => this.gameplayLogFacade.logBrewCompleted(event),
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
      getReservedItemQuantity: (itemTypeId) =>
        this.brewingFacade.getStagedIngredientQuantity(itemTypeId),
      onItemSold: (event) => this.gameplayLogFacade.logItemSold(event),
    });
    this.gardenFacade = new GardenFacade({
      goldFacade: this.goldFacade,
      itemsFacade: this.itemsFacade,
      playerLevelFacade: this.playerLevelFacade,
      onHarvestComplete: (event) => this.gameplayLogFacade.logGardenHarvestCompleted(event),
    });
    this.automationFacade = new AutomationFacade({
      brewingFacade: this.brewingFacade,
      gardenFacade: this.gardenFacade,
      gameplayLogFacade: this.gameplayLogFacade,
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
      gameplayLogFacade: this.gameplayLogFacade,
      itemsFacade: this.itemsFacade,
      researchFacade: this.researchFacade,
      visualSettingsFacade: this.visualSettingsFacade,
      shopFacade: this.shopFacade,
      brewingFacade: this.brewingFacade,
      gardenFacade: this.gardenFacade,
      tasksFacade: this.tasksFacade,
      now: persistenceNow,
    });
    this.potionDiscoveryFacade = null;
    this.worldChatFacade = null;
    this.gameConfigFacade = null;
    this.gameConfigUnsubscribe = null;
    this.initialized = false;
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
    this.tasksFacade.initialize(ecsManagers);
    this.researchFacade.initialize(ecsManagers);
    this.brewingFacade.initialize(ecsManagers);
    this.seedSummoningFacade.initialize(ecsManagers);
    this.shopFacade.initialize(ecsManagers);
    this.gardenFacade.initialize(ecsManagers);
    this.automationFacade.initialize(ecsManagers);
    const loaded = this.persistenceFacade.load();
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
    this.initialized = false;
  }

  afterUpdate(frame) {
    this.publishSnapshot();
    this.persistenceFacade.afterUpdate(frame);
  }

  summonSeed() {
    const result = this.seedSummoningFacade.summonSeed();
    if (result.ok) {
      this.gameplayLogFacade.logSeedSummoned(result);
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

  fillTask(taskId) {
    const result = this.tasksFacade.fillTask(taskId);
    this.publishAndSaveSnapshot();
    return result;
  }

  completeTask(taskId) {
    const result = this.tasksFacade.completeTask(taskId);
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

  handleResearchComplete({ label }) {
    this.gameplayLogFacade.logResearchBought({
      label,
    });
    void this.worldChatFacade?.announceResearch(label);
  }

  addBrewingIngredient(itemTypeId) {
    const result = this.brewingFacade.addIngredient(itemTypeId);
    this.publishAndSaveSnapshot();
    return result;
  }

  removeBrewingIngredientAt(slotIndex) {
    const result = this.brewingFacade.removeIngredientAt(slotIndex);
    this.publishAndSaveSnapshot();
    return result;
  }

  clearBrewingCauldron() {
    const result = this.brewingFacade.clearCauldron();
    this.publishAndSaveSnapshot();
    return result;
  }

  setBrewingAutoBrewRecipe(recipeKey) {
    const result = this.brewingFacade.setAutoBrewRecipeKey(recipeKey);
    this.publishAndSaveSnapshot();
    return result;
  }

  setBrewingAutoBrewEnabled(enabled) {
    const result = this.brewingFacade.setAutoBrewEnabled(enabled);
    this.publishAndSaveSnapshot();
    return result;
  }

  toggleBrewingAutoBrewEnabled() {
    const result = this.brewingFacade.toggleAutoBrewEnabled();
    this.publishAndSaveSnapshot();
    return result;
  }

  getBrewingAutoBrewRecipeKey() {
    return this.brewingFacade.getAutoBrewRecipeKey();
  }

  brewCauldron() {
    const result = this.brewingFacade.brew();
    if (result.ok && result.discovery?.potionKey) {
      void this.potionDiscoveryFacade?.discoverPotionRecipe(result.discovery.potionKey);
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  startBrewingBottling() {
    const result = this.brewingFacade.startBottling();
    this.publishAndSaveSnapshot();
    return result;
  }

  collectBrewingPotion() {
    const result = this.brewingFacade.collect();
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

  setSelectedShopShelfSlotSellItem(itemTypeId) {
    const result = this.shopFacade.setSelectedShelfSlotSellItem(itemTypeId);
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

  applyPlayerShopMarketSlotQuantity(slotNumber, quantity) {
    const result = this.shopFacade.applyPlayerShopMarketSlotQuantity(slotNumber, quantity);
    this.publishAndSaveSnapshot();
    return result;
  }

  buyPlayerShopListingItem(listing) {
    const result = this.shopFacade.buyPlayerShopListingItem(listing);
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
    }

    this.publishAndSaveSnapshot();
    return result;
  }

  quoteNpcMarketStockPurchase(itemTypeId, quantity = 1) {
    return this.shopFacade.quoteStockPurchase(itemTypeId, quantity);
  }

  claimPlayerShopSaleProceeds(gold) {
    const result = this.shopFacade.claimPlayerShopSaleProceeds(gold);
    this.publishAndSaveSnapshot();
    return result;
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

  buyVisualSettingOption(categoryKey, optionKey) {
    const result = this.visualSettingsFacade.buyOption(categoryKey, optionKey);
    this.publishAndSaveSnapshot();
    return result;
  }

  plantGardenSeed(tileNumber, seedTypeId) {
    const result = this.gardenFacade.plantSeed(tileNumber, seedTypeId);
    if (result.ok) {
      this.gameplayLogFacade.logGardenSeedPlanted(result);
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  selectGardenSeed(tileNumber, seedTypeId) {
    const result = this.gardenFacade.selectSeed(tileNumber, seedTypeId);
    if (result.planted) {
      this.gameplayLogFacade.logGardenSeedPlanted(result);
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  plantSelectedGardenSeed(tileNumber) {
    const result = this.gardenFacade.plantSelectedSeed(tileNumber);
    if (result.ok) {
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

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }

  getSnapshot() {
    const seedSummoning = this.seedSummoningFacade.getSnapshot();

    return {
      mana: this.manaFacade.getSnapshot(),
      gold: this.goldFacade.getSnapshot(),
      crystal: this.crystalFacade.getSnapshot(),
      inventory: this.itemsFacade.getInventorySnapshot(),
      seedInventory: this.itemsFacade.getSeedInventorySnapshot(),
      seedSummoning,
      brewing: this.brewingFacade.getSnapshot(),
      discoveries: this.itemsFacade.getDiscoverySnapshot({
        getPotionDiscovery: (potionKey) =>
          this.potionDiscoveryFacade?.getDiscovery(potionKey) ?? null,
      }),
      logs: this.gameplayLogFacade.getSnapshot(),
      playerLevel: this.playerLevelFacade.getSnapshot(),
      tasks: this.tasksFacade.getSnapshot(),
      research: this.researchFacade.getSnapshot(),
      visualSettings: this.visualSettingsFacade.getSnapshot(),
      shop: this.shopFacade.getSnapshot(),
      garden: this.gardenFacade.getSnapshot(),
    };
  }

  publishSnapshot() {
    this.stateObserverManager.publish(this.getSnapshot());
  }

  publishAndSaveSnapshot() {
    this.publishSnapshot();
    this.persistenceFacade.save();
  }

  loadPersistenceSave(save, ecsFacade) {
    const loaded = this.persistenceFacade.loadSave(save);
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
