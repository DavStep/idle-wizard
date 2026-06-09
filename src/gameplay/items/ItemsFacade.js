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

  getItemDefinitionByKey(itemKey) {
    return this.itemDefinitionManager.getDefinitionByKey(itemKey);
  }

  getItemQuantity(itemTypeId) {
    return this.inventoryStackManager.getQuantity(itemTypeId);
  }

  getSellableItemSnapshots() {
    return [
      ...this.itemDefinitionManager.getSeedDefinitions(),
      ...this.itemDefinitionManager.getHerbDefinitions(),
      ...this.itemDefinitionManager.getPotionDefinitions(),
    ].map((definition) => {
      const snapshot = {
        itemTypeId: definition.id,
        key: definition.key,
        label: definition.label,
        kind: definition.kind,
        quantity: this.inventoryStackManager.getQuantity(definition.id),
      };

      if (definition.hasRecipe === false) {
        snapshot.hasRecipe = false;
      }

      if (definition.baseSellPrice !== undefined) {
        snapshot.baseSellPrice = definition.baseSellPrice;
      }

      return snapshot;
    });
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

  getRecipePotionDefinitions() {
    return this.itemDefinitionManager.getRecipePotionDefinitions();
  }

  getPotionRecipes() {
    return this.potionRecipeManager.getPotionRecipes();
  }

  getPotionRecipe(potionKey) {
    return this.potionRecipeManager.getPotionRecipe(potionKey);
  }

  getPotionRecipeByIngredientSequence(ingredientItemTypeIds) {
    return this.potionRecipeManager.getPotionRecipeByIngredientSequence(
      ingredientItemTypeIds,
    );
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

  getPersistenceSnapshot() {
    return this.getInventorySnapshot().map((item) => ({
      itemKey: item.key,
      quantity: item.quantity,
    }));
  }

  applyPersistenceSnapshot(items = []) {
    if (!Array.isArray(items)) {
      return;
    }

    this.inventoryStackManager.clear();

    for (const item of items) {
      if (!item || typeof item.itemKey !== 'string' || !Number.isFinite(item.quantity)) {
        continue;
      }

      const definition = this.safeGetDefinitionByKey(item.itemKey);

      if (!definition) {
        continue;
      }

      this.inventoryStackManager.setItemQuantity(definition.id, Math.floor(item.quantity));
    }
  }

  safeGetDefinitionByKey(itemKey) {
    try {
      return this.itemDefinitionManager.getDefinitionByKey(itemKey);
    } catch {
      return null;
    }
  }
}
