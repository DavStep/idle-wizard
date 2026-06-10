import { BrewingFacade } from './brewing/BrewingFacade.js';
import { CrystalFacade } from './crystal/CrystalFacade.js';
import { GoldFacade } from './gold/GoldFacade.js';
import { GardenFacade } from './garden/GardenFacade.js';
import { ItemsFacade } from './items/ItemsFacade.js';
import { ManaFacade } from './mana/ManaFacade.js';
import { GameplayStateObserverManager } from './managers/GameplayStateObserverManager.js';
import { GameplayLogFacade } from './logs/GameplayLogFacade.js';
import { GameplayPersistenceFacade } from './persistence/GameplayPersistenceFacade.js';
import { ResearchFacade } from './research/ResearchFacade.js';
import { SeedSummoningFacade } from './seedSummoning/SeedSummoningFacade.js';
import { ShopFacade } from './shop/ShopFacade.js';
import { TasksFacade } from './tasks/TasksFacade.js';

export class GameplayFacade {
  static explain =
    'Runs the player resources and actions: mana fills up, actions spend it, and owned things change.';

  constructor({ persistenceStorage } = {}) {
    this.stateObserverManager = new GameplayStateObserverManager();
    this.itemsFacade = new ItemsFacade();
    this.manaFacade = new ManaFacade();
    this.goldFacade = new GoldFacade();
    this.crystalFacade = new CrystalFacade();
    this.gameplayLogFacade = new GameplayLogFacade();
    this.tasksFacade = new TasksFacade({
      itemsFacade: this.itemsFacade,
    });
    this.researchFacade = new ResearchFacade({
      goldFacade: this.goldFacade,
      itemsFacade: this.itemsFacade,
      manaFacade: this.manaFacade,
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
      researchFacade: this.researchFacade,
      onItemSold: (event) => this.gameplayLogFacade.logItemSold(event),
    });
    this.gardenFacade = new GardenFacade({
      goldFacade: this.goldFacade,
      itemsFacade: this.itemsFacade,
      onHarvestComplete: (event) => this.gameplayLogFacade.logGardenHarvestCompleted(event),
    });
    this.persistenceFacade = new GameplayPersistenceFacade({
      storage: persistenceStorage,
      manaFacade: this.manaFacade,
      goldFacade: this.goldFacade,
      crystalFacade: this.crystalFacade,
      gameplayLogFacade: this.gameplayLogFacade,
      itemsFacade: this.itemsFacade,
      researchFacade: this.researchFacade,
      shopFacade: this.shopFacade,
      brewingFacade: this.brewingFacade,
      gardenFacade: this.gardenFacade,
      tasksFacade: this.tasksFacade,
    });
    this.potionDiscoveryFacade = null;
    this.initialized = false;
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
    this.persistenceFacade.load();
    this.persistenceFacade.start();
    this.initialized = true;
    this.publishSnapshot();
  }

  shutdown() {
    this.persistenceFacade.stop();
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
      this.gameplayLogFacade.logShopSlotBought(result);
    }
    this.publishAndSaveSnapshot();
    return result;
  }

  buyPlayerShopShelfSlot() {
    const result = this.shopFacade.buyNextPlayerShelfSlot();
    if (result.ok) {
      this.gameplayLogFacade.logShopSlotBought(result);
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
    this.publishAndSaveSnapshot();
    return result;
  }

  buyResearch(researchId) {
    const result = this.researchFacade.buyResearch(researchId);
    if (result.ok) {
      this.gameplayLogFacade.logResearchBought({
        label: this.researchFacade.getResearchLabel(result.researchId),
      });
    }
    this.publishAndSaveSnapshot();
    return result;
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

  claimPlayerShopSaleProceeds(gold) {
    const result = this.shopFacade.claimPlayerShopSaleProceeds(gold);
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
      tasks: this.tasksFacade.getSnapshot(),
      research: this.researchFacade.getSnapshot(),
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
}
