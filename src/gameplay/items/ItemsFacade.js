import { InventoryStackManager } from './managers/InventoryStackManager.js';
import { ItemDefinitionManager } from './managers/ItemDefinitionManager.js';
import { PotionRecipeManager } from './managers/PotionRecipeManager.js';

export class ItemsFacade {
  static explain =
    'Knows what seeds, herbs, potions, and recipes are, and keeps count of owned items.';

  constructor() {
    this.itemDefinitionManager = new ItemDefinitionManager();
    this.potionRecipeManager = new PotionRecipeManager({
      itemDefinitionManager: this.itemDefinitionManager,
    });
    this.inventoryStackManager = new InventoryStackManager({
      itemDefinitionManager: this.itemDefinitionManager,
    });
  }

  initialize(ecsManagers) {
    this.inventoryStackManager.initialize(ecsManagers);
  }

  addItem(itemTypeId, quantity) {
    this.inventoryStackManager.addItem(itemTypeId, quantity);
  }

  removeFirstItemByKind(kind, quantity = 1) {
    return this.inventoryStackManager.removeFirstItemByKind(kind, quantity);
  }

  removeItem(itemTypeId, quantity = 1) {
    if (!this.inventoryStackManager.removeItem(itemTypeId, quantity)) {
      return null;
    }

    const definition = this.itemDefinitionManager.getDefinition(itemTypeId);

    return {
      itemTypeId,
      key: definition.key,
      label: definition.label,
      kind: definition.kind,
      quantity,
    };
  }

  getItemDefinition(itemTypeId) {
    return this.itemDefinitionManager.getDefinition(itemTypeId);
  }

  getSellableItemSnapshots() {
    return [
      ...this.itemDefinitionManager.getSeedDefinitions(),
      ...this.itemDefinitionManager.getHerbDefinitions(),
      ...this.itemDefinitionManager.getPotionDefinitions(),
    ].map((definition) => ({
      itemTypeId: definition.id,
      key: definition.key,
      label: definition.label,
      kind: definition.kind,
      quantity: this.inventoryStackManager.getQuantity(definition.id),
    }));
  }

  getSeedDefinitions() {
    return this.itemDefinitionManager.getSeedDefinitions();
  }

  getSeedDefinition(seedTypeId) {
    return this.itemDefinitionManager.getSeedDefinition(seedTypeId);
  }

  getHerbDefinitions() {
    return this.itemDefinitionManager.getHerbDefinitions();
  }

  getPotionDefinitions() {
    return this.itemDefinitionManager.getPotionDefinitions();
  }

  getPotionRecipes() {
    return this.potionRecipeManager.getPotionRecipes();
  }

  getPotionRecipe(potionKey) {
    return this.potionRecipeManager.getPotionRecipe(potionKey);
  }

  getVisibleSummonCost() {
    return this.itemDefinitionManager.getVisibleSummonCost();
  }

  getInventorySnapshot() {
    return this.inventoryStackManager.getSnapshot();
  }

  getSeedInventorySnapshot() {
    return this.itemDefinitionManager.getSeedDefinitions().map((definition) => ({
      itemTypeId: definition.id,
      key: definition.key,
      label: definition.label,
      kind: definition.kind,
      quantity: this.inventoryStackManager.getQuantity(definition.id),
    }));
  }
}
