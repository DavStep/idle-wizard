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

  constructor({ itemsFacade, manaFacade, playerLevelFacade, researchFacade, onBrewComplete }) {
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
      researchFacade,
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
      playerLevelFacade,
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

    const targetCauldronIndex = this.getPendingAutoBrewCauldronIndex(recipe);

    if (targetCauldronIndex === null) {
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

    if (
      !this.brewingStartManager.hasEnoughInventoryForCauldron(
        ingredientItemTypeIds,
        targetCauldronIndex,
      )
    ) {
      return 0;
    }

    return Number.isFinite(recipe.manaCost) ? Math.max(0, recipe.manaCost) : 0;
  }

  getPendingAutoBrewCauldronIndex(recipe) {
    const maxCauldrons = this.brewingSnapshotManager.getMaxCauldrons();

    for (let cauldronIndex = 0; cauldronIndex < maxCauldrons; cauldronIndex += 1) {
      if (this.brewingProcessEntityManager.hasActiveBrew(cauldronIndex)) {
        continue;
      }

      const ingredientItemTypeIds =
        this.brewingStartManager.getRecipeIngredientItemTypeIds(recipe);

      if (
        this.brewingStartManager.hasEnoughInventoryForCauldron(
          ingredientItemTypeIds,
          cauldronIndex,
        )
      ) {
        return cauldronIndex;
      }
    }

    return null;
  }

  autoBrew(cauldronIndex = 0) {
    if (!this.autoBrewEnabled) {
      return {
        ok: false,
        reason: 'auto_brew_disabled',
      };
    }

    const prepared = this.brewingStartManager.prepareRecipeForAutoBrew(
      this.autoBrewRecipeKey,
      cauldronIndex,
    );

    if (!prepared.ok) {
      return prepared;
    }

    return this.brew(cauldronIndex);
  }

  prepareRecipeForSelection(recipeKey, cauldronIndex = 0) {
    return this.brewingStartManager.prepareRecipeForSelection(recipeKey, cauldronIndex);
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
        maxCauldrons: this.brewingSnapshotManager.getMaxCauldrons(),
      });
    } catch {
      return;
    }
  }

  addIngredient(itemTypeId, cauldronIndex = 0) {
    return this.brewingStartManager.addIngredient(itemTypeId, cauldronIndex);
  }

  removeIngredientAt(slotIndex, cauldronIndex = 0) {
    return this.brewingStartManager.removeIngredientAt(slotIndex, cauldronIndex);
  }

  clearCauldron(cauldronIndex = 0) {
    return this.brewingStartManager.clearCauldron(cauldronIndex);
  }

  getStagedIngredientQuantity(itemTypeId) {
    return this.brewingCauldronEntityManager.getIngredientCountByItemTypeId(itemTypeId);
  }

  brew(cauldronIndex = 0) {
    return this.brewingStartManager.brew(cauldronIndex);
  }

  startBottling(cauldronIndex = 0) {
    return this.brewingBottlingManager.startBottling(cauldronIndex);
  }

  collect(cauldronIndex = 0) {
    const result = this.brewingCollectManager.collect(cauldronIndex);

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
    const maxCauldrons = this.brewingSnapshotManager.getMaxCauldrons();
    const cauldrons = Array.from({ length: maxCauldrons }, (_unused, cauldronIndex) => {
      const cauldronActiveBrew =
        this.brewingProcessEntityManager.getActiveBrewSnapshot(cauldronIndex);

      return {
        cauldronNumber: cauldronIndex + 1,
        cauldronItemKeys: this.brewingCauldronEntityManager
          .getIngredientSnapshots(cauldronIndex)
          .map((ingredient) => ingredient.key),
        activeBrew: cauldronActiveBrew
          ? this.formatActiveBrewPersistence(cauldronActiveBrew)
          : null,
      };
    });

    return {
      autoBrewEnabled: this.autoBrewEnabled,
      autoBrewRecipeKey: this.autoBrewRecipeKey,
      cauldrons,
      cauldronItemKeys: this.brewingCauldronEntityManager
        .getIngredientSnapshots()
        .map((ingredient) => ingredient.key),
      activeBrew: activeBrew ? this.formatActiveBrewPersistence(activeBrew) : null,
    };
  }

  formatActiveBrewPersistence(activeBrew) {
    return {
      resultItemKey: activeBrew.key,
      phase: activeBrew.phase,
      remainingMs: activeBrew.remainingMs,
      totalMs: activeBrew.totalMs,
      bottlingTotalMs: activeBrew.bottlingTotalMs,
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

    this.brewingCauldronEntityManager.clearAllIngredients();
    this.brewingProcessEntityManager.clearAllActiveBrews();

    const savedCauldrons = Array.isArray(snapshot.cauldrons)
      ? snapshot.cauldrons
      : [
          {
            cauldronNumber: 1,
            cauldronItemKeys: snapshot.cauldronItemKeys,
            activeBrew: snapshot.activeBrew,
          },
        ];

    for (const [index, savedCauldron] of savedCauldrons.entries()) {
      const cauldronIndex = this.normalizeCauldronIndex(
        Number.isInteger(savedCauldron?.cauldronNumber)
          ? savedCauldron.cauldronNumber - 1
          : index,
      );
      this.restoreCauldronItems(savedCauldron?.cauldronItemKeys, itemsFacade, cauldronIndex);
      this.restoreActiveBrew(savedCauldron?.activeBrew, itemsFacade, cauldronIndex);
    }
  }

  restoreCauldronItems(cauldronItemKeys, itemsFacade, cauldronIndex = 0) {
    if (!Array.isArray(cauldronItemKeys)) {
      return;
    }

    for (const itemKey of cauldronItemKeys) {
      const definition =
        typeof itemKey === 'string' ? itemsFacade.safeGetDefinitionByKey(itemKey) : null;

      if (!definition || definition.kind !== 'herb') {
        continue;
      }

      this.brewingCauldronEntityManager.addIngredient(definition.id, cauldronIndex);
    }
  }

  restoreActiveBrew(activeBrew, itemsFacade, cauldronIndex = 0) {
    if (!activeBrew) {
      return;
    }

    const resultDefinition =
      typeof activeBrew.resultItemKey === 'string'
        ? itemsFacade.safeGetDefinitionByKey(activeBrew.resultItemKey)
        : null;

    if (
      !resultDefinition ||
      resultDefinition.kind !== 'potion' ||
      !Number.isFinite(activeBrew.totalMs) ||
      !Number.isFinite(activeBrew.remainingMs)
    ) {
      return;
    }

    this.brewingProcessEntityManager.restoreActiveBrew({
      cauldronIndex,
      resultItemTypeId: resultDefinition.id,
      phase: activeBrew.phase,
      totalSeconds: activeBrew.totalMs / 1_000,
      remainingSeconds: activeBrew.remainingMs / 1_000,
      bottlingTotalSeconds:
        (Number.isFinite(activeBrew.bottlingTotalMs)
          ? activeBrew.bottlingTotalMs
          : this.brewingBalanceManager.getBottlingDurationMs()) / 1_000,
    });
  }

  normalizeCauldronIndex(cauldronIndex) {
    const safeCauldronIndex = Math.floor(Number(cauldronIndex));
    return Number.isInteger(safeCauldronIndex) && safeCauldronIndex >= 0
      ? safeCauldronIndex
      : 0;
  }
}
