import { GoldFacade } from './gold/GoldFacade.js';
import { ItemsFacade } from './items/ItemsFacade.js';
import { ManaFacade } from './mana/ManaFacade.js';
import { GameplayStateObserverManager } from './managers/GameplayStateObserverManager.js';
import { ResearchFacade } from './research/ResearchFacade.js';
import { SeedSummoningFacade } from './seedSummoning/SeedSummoningFacade.js';
import { ShopFacade } from './shop/ShopFacade.js';

export class GameplayFacade {
  static explain =
    'Runs the player resources and actions: mana fills up, actions spend it, and owned things change.';

  constructor() {
    this.stateObserverManager = new GameplayStateObserverManager();
    this.itemsFacade = new ItemsFacade();
    this.manaFacade = new ManaFacade();
    this.goldFacade = new GoldFacade();
    this.researchFacade = new ResearchFacade({
      itemsFacade: this.itemsFacade,
    });
    this.seedSummoningFacade = new SeedSummoningFacade({
      manaFacade: this.manaFacade,
      itemsFacade: this.itemsFacade,
    });
    this.shopFacade = new ShopFacade({
      goldFacade: this.goldFacade,
      itemsFacade: this.itemsFacade,
    });
    this.initialized = false;
  }

  initialize(ecsFacade) {
    if (this.initialized) {
      return;
    }

    const ecsManagers = ecsFacade.getManagers();
    this.itemsFacade.initialize(ecsManagers);
    this.manaFacade.initialize(ecsManagers);
    this.goldFacade.initialize(ecsManagers);
    this.researchFacade.initialize(ecsManagers);
    this.seedSummoningFacade.initialize(ecsManagers);
    this.shopFacade.initialize(ecsManagers);
    this.initialized = true;
    this.publishSnapshot();
  }

  shutdown() {
    this.stateObserverManager.clear();
    this.initialized = false;
  }

  afterUpdate() {
    this.publishSnapshot();
  }

  summonSeed() {
    const result = this.seedSummoningFacade.summonSeed();
    this.publishSnapshot();
    return result;
  }

  buyShopShelfSlot() {
    const result = this.shopFacade.buyNextShelfSlot();
    this.publishSnapshot();
    return result;
  }

  selectShopShelfSlot(slotNumber) {
    const result = this.shopFacade.selectShelfSlot(slotNumber);
    this.publishSnapshot();
    return result;
  }

  setSelectedShopShelfSlotSellItem(itemTypeId) {
    const result = this.shopFacade.setSelectedShelfSlotSellItem(itemTypeId);
    this.publishSnapshot();
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
      inventory: this.itemsFacade.getInventorySnapshot(),
      seedInventory: this.itemsFacade.getSeedInventorySnapshot(),
      seedSummoning,
      research: this.researchFacade.getSnapshot(),
      shop: this.shopFacade.getSnapshot(),
    };
  }

  publishSnapshot() {
    this.stateObserverManager.publish(this.getSnapshot());
  }
}
