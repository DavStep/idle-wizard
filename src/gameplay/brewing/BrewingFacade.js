import { BrewingBalanceManager } from './managers/BrewingBalanceManager.js';
import { BrewingBottlingManager } from './managers/BrewingBottlingManager.js';
import { BrewingCauldronEntityManager } from './managers/BrewingCauldronEntityManager.js';
import { BrewingCollectManager } from './managers/BrewingCollectManager.js';
import { BrewingProcessEntityManager } from './managers/BrewingProcessEntityManager.js';
import { BrewingProcessManager } from './managers/BrewingProcessManager.js';
import { BrewingRecipeMatchManager } from './managers/BrewingRecipeMatchManager.js';
import { BrewingSnapshotManager } from './managers/BrewingSnapshotManager.js';
import { BrewingStartManager } from './managers/BrewingStartManager.js';
import { parseGameConfig } from '../config/gameConfigSnapshot.js';

export class BrewingFacade {
  static explain =
    'Brewing lets the wizard place herbs into a cauldron, spend mana, bottle the result, and collect the potion.';

  constructor({ itemsFacade, manaFacade, researchFacade, onBrewComplete }) {
    this.brewingBalanceManager = new BrewingBalanceManager();
    this.brewingCauldronEntityManager = new BrewingCauldronEntityManager({
      itemsFacade,
      maxIngredients: this.brewingBalanceManager.getMaxCauldronIngredients(),
    });
    this.brewingProcessEntityManager = new BrewingProcessEntityManager({
      itemsFacade,
    });
    this.brewingRecipeMatchManager = new BrewingRecipeMatchManager({
      itemsFacade,
      researchFacade,
    });
    this.brewingStartManager = new BrewingStartManager({
      brewingBalanceManager: this.brewingBalanceManager,
      brewingCauldronEntityManager: this.brewingCauldronEntityManager,
      brewingProcessEntityManager: this.brewingProcessEntityManager,
      brewingRecipeMatchManager: this.brewingRecipeMatchManager,
      itemsFacade,
      manaFacade,
    });
    this.brewingProcessManager = new BrewingProcessManager({
      brewingProcessEntityManager: this.brewingProcessEntityManager,
    });
    this.brewingBottlingManager = new BrewingBottlingManager({
      brewingProcessEntityManager: this.brewingProcessEntityManager,
    });
    this.brewingCollectManager = new BrewingCollectManager({
      brewingProcessEntityManager: this.brewingProcessEntityManager,
      itemsFacade,
    });
    this.autoBrewEnabled = false;
    this.autoBrewRecipeKey = null;
    this.onBrewComplete = onBrewComplete;
    this.brewingSnapshotManager = new BrewingSnapshotManager({
      brewingBalanceManager: this.brewingBalanceManager,
      brewingCauldronEntityManager: this.brewingCauldronEntityManager,
      brewingProcessEntityManager: this.brewingProcessEntityManager,
      brewingRecipeMatchManager: this.brewingRecipeMatchManager,
      itemsFacade,
      manaFacade,
      getAutoBrewEnabled: () => this.autoBrewEnabled,
      getAutoBrewRecipeKey: () => this.autoBrewRecipeKey,
    });
  }

  initialize(ecsManagers) {
    this.brewingCauldronEntityManager.initialize(ecsManagers);
    this.brewingProcessEntityManager.initialize(ecsManagers);
    this.brewingProcessManager.register(ecsManagers.systems);
  }

  setPotionDiscoveryFacade(potionDiscoveryFacade) {
    this.brewingRecipeMatchManager.setPotionDiscoveryFacade(potionDiscoveryFacade);
  }

  setAutoBrewRecipeKey(recipeKey) {
    const nextKey = typeof recipeKey === 'string' && recipeKey.length > 0 ? recipeKey : null;

    const recipe = nextKey ? this.brewingRecipeMatchManager.getRecipeByKey(nextKey) : null;

    if (!recipe || !this.brewingRecipeMatchManager.isRecipeUnlocked(recipe)) {
      this.autoBrewRecipeKey = null;
      this.autoBrewEnabled = false;
      return {
        ok: true,
        autoBrewRecipeKey: null,
        autoBrewEnabled: false,
      };
    }

    this.autoBrewRecipeKey = nextKey;
    return {
      ok: true,
      autoBrewRecipeKey: this.autoBrewRecipeKey,
      autoBrewEnabled: this.autoBrewEnabled,
    };
  }

  getAutoBrewRecipeKey() {
    return this.autoBrewRecipeKey;
  }

  setAutoBrewEnabled(enabled) {
    const nextEnabled = enabled === true;
    if (nextEnabled && !this.autoBrewRecipeKey) {
      return {
        ok: false,
        reason: 'auto_brew_recipe_required',
      };
    }

    this.autoBrewEnabled = nextEnabled;

    return {
      ok: true,
      autoBrewEnabled: this.autoBrewEnabled,
    };
  }

  toggleAutoBrewEnabled() {
    return this.setAutoBrewEnabled(!this.autoBrewEnabled);
  }

  getAutoBrewEnabled() {
    return this.autoBrewEnabled;
  }

  getPendingAutoBrewManaCost() {
    if (!this.autoBrewEnabled || !this.autoBrewRecipeKey) {
      return 0;
    }

    const recipe = this.brewingRecipeMatchManager.getRecipeByKey(this.autoBrewRecipeKey);

    if (!recipe || !this.brewingRecipeMatchManager.isRecipeUnlocked(recipe)) {
      return 0;
    }

    if (this.brewingProcessEntityManager.hasActiveBrew()) {
      return 0;
    }

    const ingredientItemTypeIds =
      this.brewingStartManager.getRecipeIngredientItemTypeIds(recipe);

    if (
      ingredientItemTypeIds.length >
      this.brewingBalanceManager.getMaxCauldronIngredients()
    ) {
      return 0;
    }

    if (!this.brewingStartManager.hasEnoughInventory(ingredientItemTypeIds)) {
      return 0;
    }

    return Number.isFinite(recipe.manaCost) ? Math.max(0, recipe.manaCost) : 0;
  }

  autoBrew() {
    if (!this.autoBrewEnabled) {
      return {
        ok: false,
        reason: 'auto_brew_disabled',
      };
    }

    const prepared = this.brewingStartManager.prepareRecipeForAutoBrew(this.autoBrewRecipeKey);

    if (!prepared.ok) {
      return prepared;
    }

    return this.brew();
  }

  applyRuntimeConfig(snapshot = {}) {
    const balance = parseGameConfig(snapshot, 'brewing');

    if (!balance) {
      return;
    }

    try {
      this.brewingBalanceManager.setRuntimeBalance(balance);
      this.brewingCauldronEntityManager.configureCapacity({
        maxIngredients: this.brewingBalanceManager.getMaxCauldronIngredients(),
      });
    } catch {
      return;
    }
  }

  addIngredient(itemTypeId) {
    return this.brewingStartManager.addIngredient(itemTypeId);
  }

  removeIngredientAt(slotIndex) {
    return this.brewingStartManager.removeIngredientAt(slotIndex);
  }

  clearCauldron() {
    return this.brewingStartManager.clearCauldron();
  }

  getStagedIngredientQuantity(itemTypeId) {
    return this.brewingCauldronEntityManager.getIngredientCountByItemTypeId(itemTypeId);
  }

  brew() {
    return this.brewingStartManager.brew();
  }

  startBottling() {
    return this.brewingBottlingManager.startBottling();
  }

  collect() {
    const result = this.brewingCollectManager.collect();

    if (result.ok) {
      this.onBrewComplete?.({
        potion: result.potion,
        quantity: result.quantity,
      });
    }

    return result;
  }

  getSnapshot() {
    return this.brewingSnapshotManager.getSnapshot();
  }

  getPersistenceSnapshot() {
    const activeBrew = this.brewingProcessEntityManager.getActiveBrewSnapshot();

    return {
      autoBrewEnabled: this.autoBrewEnabled,
      autoBrewRecipeKey: this.autoBrewRecipeKey,
      cauldronItemKeys: this.brewingCauldronEntityManager
        .getIngredientSnapshots()
        .map((ingredient) => ingredient.key),
      activeBrew: activeBrew
        ? {
            resultItemKey: activeBrew.key,
            phase: activeBrew.phase,
            remainingMs: activeBrew.remainingMs,
            totalMs: activeBrew.totalMs,
            bottlingTotalMs: activeBrew.bottlingTotalMs,
          }
        : null,
    };
  }

  applyPersistenceSnapshot(snapshot = {}, itemsFacade) {
    if (!snapshot || typeof snapshot !== 'object') {
      return;
    }

    this.setAutoBrewRecipeKey(
      typeof snapshot.autoBrewRecipeKey === 'string' ? snapshot.autoBrewRecipeKey : null,
    );
    this.setAutoBrewEnabled(Boolean(snapshot.autoBrewEnabled));

    this.brewingCauldronEntityManager.clearIngredients();

    if (Array.isArray(snapshot.cauldronItemKeys)) {
      for (const itemKey of snapshot.cauldronItemKeys) {
        const definition =
          typeof itemKey === 'string' ? itemsFacade.safeGetDefinitionByKey(itemKey) : null;

        if (!definition) {
          continue;
        }

        if (definition.kind !== 'herb') {
          continue;
        }

        this.brewingCauldronEntityManager.addIngredient(definition.id);
      }
    }

    if (!snapshot.activeBrew) {
      this.brewingProcessEntityManager.clearActiveBrew();
      return;
    }

    const resultDefinition =
      typeof snapshot.activeBrew.resultItemKey === 'string'
        ? itemsFacade.safeGetDefinitionByKey(snapshot.activeBrew.resultItemKey)
        : null;

    if (
      !resultDefinition ||
      resultDefinition.kind !== 'potion' ||
      !Number.isFinite(snapshot.activeBrew.totalMs) ||
      !Number.isFinite(snapshot.activeBrew.remainingMs)
    ) {
      this.brewingProcessEntityManager.clearActiveBrew();
      return;
    }

    this.brewingProcessEntityManager.restoreActiveBrew({
      resultItemTypeId: resultDefinition.id,
      phase: snapshot.activeBrew.phase,
      totalSeconds: snapshot.activeBrew.totalMs / 1_000,
      remainingSeconds: snapshot.activeBrew.remainingMs / 1_000,
      bottlingTotalSeconds:
        (Number.isFinite(snapshot.activeBrew.bottlingTotalMs)
          ? snapshot.activeBrew.bottlingTotalMs
          : this.brewingBalanceManager.getBottlingDurationMs()) / 1_000,
    });
  }
}
