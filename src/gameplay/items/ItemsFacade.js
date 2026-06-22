import { InventoryStackManager } from './managers/InventoryStackManager.js';
import { ItemDefinitionManager } from './managers/ItemDefinitionManager.js';
import { PotionRecipeManager } from './managers/PotionRecipeManager.js';
import { parseGameConfig } from '../config/gameConfigSnapshot.js';

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

  applyRuntimeConfig(snapshot = {}) {
    const itemsConfig = parseGameConfig(snapshot, 'items');
    const potionRecipesConfig = parseGameConfig(snapshot, 'potionRecipes');

    try {
      if (itemsConfig) {
        this.itemDefinitionManager.setRuntimeConfig(itemsConfig);
      }

      if (potionRecipesConfig) {
        this.potionRecipeManager.setRuntimeConfig(potionRecipesConfig);
      }
    } catch {
      return;
    }
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
    ].map((definition) =>
      this.createItemSnapshot(definition, this.inventoryStackManager.getQuantity(definition.id)),
    );
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

  getUnknownPotionDefinitions() {
    return this.itemDefinitionManager.getUnknownPotionDefinitions();
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

  getDiscoverySnapshot({ getPotionDiscovery } = {}) {
    return {
      seeds: [],
      herbs: [],
      potions: this.getUnknownPotionDefinitions().map((definition) => {
        const discovery = getPotionDiscovery?.(definition.key) ?? null;
        const discovered = Boolean(discovery);
        const recipe = this.getPotionRecipe(definition.key);

        return {
          ...this.createItemSnapshot(
            definition,
            this.inventoryStackManager.getQuantity(definition.id),
          ),
          discovered,
          researched: discovered,
          unlocked: discovered,
          known: discovered,
          discoveredByUsername: discovery?.username ?? null,
          discoveredByIdentity: discovery?.discoveredByIdentity ?? null,
          discoveredAtMs: discovery?.discoveredAtMs ?? null,
          royaltyCoin: discovery?.royaltyCoin ?? 0,
          ingredients: recipe.ingredients,
          manaCost: recipe.manaCost,
          brewDurationMs: recipe.brewDurationMs,
        };
      }),
    };
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

  createItemSnapshot(definition, quantity) {
    const snapshot = {
      itemTypeId: definition.id,
      key: definition.key,
      label: definition.label,
      kind: definition.kind,
      quantity,
    };

    if (definition.discoveryType) {
      snapshot.discoveryType = definition.discoveryType;
    }

    if (definition.type) {
      snapshot.type = definition.type;
    }

    if (definition.unknown !== undefined) {
      snapshot.unknown = definition.unknown;
    }

    if (definition.known !== undefined) {
      snapshot.known = definition.known;
    }

    if (definition.researchable !== undefined) {
      snapshot.researchable = definition.researchable;
    }

    if (definition.hasRecipe === false) {
      snapshot.hasRecipe = false;
    }

    if (definition.baseSellPrice !== undefined) {
      snapshot.baseSellPrice = definition.baseSellPrice;
    }

    return snapshot;
  }
}
