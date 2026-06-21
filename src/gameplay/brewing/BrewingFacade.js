import { BrewingBalanceManager } from './managers/BrewingBalanceManager.js';
import { BrewingBottlingManager } from './managers/BrewingBottlingManager.js';
import { BrewingCauldronEntityManager } from './managers/BrewingCauldronEntityManager.js';
import { BrewingCauldronPurchaseManager } from './managers/BrewingCauldronPurchaseManager.js';
import { BrewingCollectManager } from './managers/BrewingCollectManager.js';
import { BrewingProcessEntityManager } from './managers/BrewingProcessEntityManager.js';
import { BrewingProcessManager } from './managers/BrewingProcessManager.js';
import { BrewingRecipeMatchManager } from './managers/BrewingRecipeMatchManager.js';
import { BrewingSnapshotManager } from './managers/BrewingSnapshotManager.js';
import { BrewingStartManager } from './managers/BrewingStartManager.js';
import { parseGameConfig } from '../config/gameConfigSnapshot.js';

export class BrewingFacade {
  static explain =
    'Brewing lets the wizard place herbs into a cauldron, spend mana, and bottle the result into inventory.';

  constructor({
    goldFacade,
    itemsFacade,
    manaFacade,
    playerLevelFacade,
    researchFacade,
    onBrewComplete,
  }) {
    this.playerLevelFacade = playerLevelFacade;
    this.researchFacade = researchFacade;
    this.brewingBalanceManager = new BrewingBalanceManager();
    this.brewingCauldronEntityManager = new BrewingCauldronEntityManager({
      itemsFacade,
      maxIngredients: this.brewingBalanceManager.getMaxCauldronIngredients(),
      initialUnlockedCauldrons: this.brewingBalanceManager.getInitialUnlockedCauldrons(),
      maxCauldrons: this.brewingBalanceManager.getMaxCauldrons(),
    });
    this.brewingCauldronPurchaseManager = new BrewingCauldronPurchaseManager({
      goldFacade,
      brewingBalanceManager: this.brewingBalanceManager,
      brewingCauldronEntityManager: this.brewingCauldronEntityManager,
      playerLevelFacade,
      researchFacade,
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
    this.brewingBottlingManager = new BrewingBottlingManager({
      brewingProcessEntityManager: this.brewingProcessEntityManager,
    });
    this.brewingCollectManager = new BrewingCollectManager({
      brewingProcessEntityManager: this.brewingProcessEntityManager,
      itemsFacade,
    });
    this.brewingProcessManager = new BrewingProcessManager({
      brewingProcessEntityManager: this.brewingProcessEntityManager,
      collectReadyBrews: () => this.collectReadyBrews(),
    });
    this.autoBrewEnabledByCauldron = new Map();
    this.autoBrewRecipeKeysByCauldron = new Map();
    this.onBrewComplete = onBrewComplete;
    this.brewingSnapshotManager = new BrewingSnapshotManager({
      brewingBalanceManager: this.brewingBalanceManager,
      brewingCauldronEntityManager: this.brewingCauldronEntityManager,
      brewingProcessEntityManager: this.brewingProcessEntityManager,
      brewingRecipeMatchManager: this.brewingRecipeMatchManager,
      itemsFacade,
      manaFacade,
      playerLevelFacade,
      researchFacade,
      getAutoBrewEnabled: (cauldronIndex) => this.getAutoBrewEnabled(cauldronIndex),
      getAutoBrewRecipeKey: (cauldronIndex) => this.getAutoBrewRecipeKey(cauldronIndex),
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

  setAutoBrewRecipeKey(recipeKey, cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const nextKey = typeof recipeKey === 'string' && recipeKey.length > 0 ? recipeKey : null;

    if (!this.brewingCauldronEntityManager.isCauldronUnlocked(safeCauldronIndex)) {
      return {
        ok: false,
        reason: 'cauldron_locked',
        cauldronIndex: safeCauldronIndex,
        cauldronNumber: safeCauldronIndex + 1,
      };
    }

    const recipe = nextKey ? this.brewingRecipeMatchManager.getRecipeByKey(nextKey) : null;

    if (!recipe || !this.brewingRecipeMatchManager.isRecipeUnlocked(recipe)) {
      this.autoBrewRecipeKeysByCauldron.delete(safeCauldronIndex);
      this.autoBrewEnabledByCauldron.delete(safeCauldronIndex);
      return {
        ok: true,
        autoBrewRecipeKey: null,
        autoBrewEnabled: false,
        cauldronIndex: safeCauldronIndex,
        cauldronNumber: safeCauldronIndex + 1,
      };
    }

    this.autoBrewRecipeKeysByCauldron.set(safeCauldronIndex, nextKey);
    return {
      ok: true,
      autoBrewRecipeKey: this.getAutoBrewRecipeKey(safeCauldronIndex),
      autoBrewEnabled: this.getAutoBrewEnabled(safeCauldronIndex),
      cauldronIndex: safeCauldronIndex,
      cauldronNumber: safeCauldronIndex + 1,
    };
  }

  getAutoBrewRecipeKey(cauldronIndex = 0) {
    return this.autoBrewRecipeKeysByCauldron.get(this.normalizeCauldronIndex(cauldronIndex)) ?? null;
  }

  setAutoBrewEnabled(enabled, cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const nextEnabled = enabled === true;

    if (!this.brewingCauldronEntityManager.isCauldronUnlocked(safeCauldronIndex)) {
      return {
        ok: false,
        reason: 'cauldron_locked',
        cauldronIndex: safeCauldronIndex,
        cauldronNumber: safeCauldronIndex + 1,
      };
    }

    if (nextEnabled && !this.getAutoBrewRecipeKey(safeCauldronIndex)) {
      return {
        ok: false,
        reason: 'auto_brew_recipe_required',
        cauldronIndex: safeCauldronIndex,
        cauldronNumber: safeCauldronIndex + 1,
      };
    }

    if (nextEnabled) {
      this.autoBrewEnabledByCauldron.set(safeCauldronIndex, true);
    } else {
      this.autoBrewEnabledByCauldron.delete(safeCauldronIndex);
    }

    return {
      ok: true,
      autoBrewEnabled: this.getAutoBrewEnabled(safeCauldronIndex),
      cauldronIndex: safeCauldronIndex,
      cauldronNumber: safeCauldronIndex + 1,
    };
  }

  toggleAutoBrewEnabled(cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    return this.setAutoBrewEnabled(!this.getAutoBrewEnabled(safeCauldronIndex), safeCauldronIndex);
  }

  getAutoBrewEnabled(cauldronIndex = 0) {
    return this.autoBrewEnabledByCauldron.get(this.normalizeCauldronIndex(cauldronIndex)) === true;
  }

  getPendingAutoBrewManaCost() {
    const unlockedCauldrons = this.brewingSnapshotManager.getUnlockedCauldrons();
    let manaCost = 0;

    for (let cauldronIndex = 0; cauldronIndex < unlockedCauldrons; cauldronIndex += 1) {
      const cauldronManaCost = this.getPendingAutoBrewManaCostForCauldron(cauldronIndex);

      if (cauldronManaCost <= 0) {
        continue;
      }

      manaCost += cauldronManaCost;
    }

    return manaCost;
  }

  getPendingAutoBrewManaCostForCauldron(cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);

    if (
      !this.getAutoBrewEnabled(safeCauldronIndex) ||
      !this.getAutoBrewRecipeKey(safeCauldronIndex) ||
      this.brewingProcessEntityManager.hasActiveBrew(safeCauldronIndex)
    ) {
      return 0;
    }

    const recipe = this.brewingRecipeMatchManager.getRecipeByKey(
      this.getAutoBrewRecipeKey(safeCauldronIndex),
    );

    if (!recipe || !this.brewingRecipeMatchManager.isRecipeUnlocked(recipe)) {
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
        safeCauldronIndex,
      )
    ) {
      return 0;
    }

    return Number.isFinite(recipe.manaCost) ? Math.max(0, recipe.manaCost) : 0;
  }

  autoBrew(cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);

    if (!this.getAutoBrewEnabled(safeCauldronIndex)) {
      return {
        ok: false,
        reason: 'auto_brew_disabled',
        cauldronIndex: safeCauldronIndex,
        cauldronNumber: safeCauldronIndex + 1,
      };
    }

    const prepared = this.brewingStartManager.prepareRecipeForAutoBrew(
      this.getAutoBrewRecipeKey(safeCauldronIndex),
      safeCauldronIndex,
    );

    if (!prepared.ok) {
      return prepared;
    }

    return this.brew(safeCauldronIndex);
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
        initialUnlockedCauldrons: this.brewingBalanceManager.getInitialUnlockedCauldrons(),
        maxCauldrons: this.brewingBalanceManager.getMaxCauldrons(),
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

  buyNextCauldron() {
    return this.brewingCauldronPurchaseManager.buyNextCauldron();
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

  collectReadyBrews() {
    const readyBrews = this.brewingProcessEntityManager
      .getActiveBrewSnapshots()
      .filter((activeBrew) => activeBrew?.canCollect === true);
    const collected = [];

    for (const activeBrew of readyBrews) {
      const result = this.collect(activeBrew.cauldronIndex);

      if (result.ok) {
        collected.push(result);
      }
    }

    return collected;
  }

  getSnapshot() {
    return this.brewingSnapshotManager.getSnapshot();
  }

  hasFrameTimerWork() {
    return this.brewingProcessEntityManager.hasRunningTimer();
  }

  getPersistenceSnapshot() {
    const activeBrew = this.brewingProcessEntityManager.getActiveBrewSnapshot();
    const unlockedCauldrons = this.brewingSnapshotManager.getUnlockedCauldrons();
    const cauldrons = Array.from({ length: unlockedCauldrons }, (_unused, cauldronIndex) => {
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
        autoBrewEnabled: this.getAutoBrewEnabled(cauldronIndex),
        autoBrewRecipeKey: this.getAutoBrewRecipeKey(cauldronIndex),
      };
    });

    return {
      autoBrewEnabled: this.getAutoBrewEnabled(0),
      autoBrewRecipeKey: this.getAutoBrewRecipeKey(0),
      unlockedCauldrons,
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
      resultQuantity: activeBrew.resultQuantity,
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

    this.clearAutoBrewState();

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

    const restoredUnlockedCauldrons = Number.isInteger(snapshot.unlockedCauldrons)
      ? snapshot.unlockedCauldrons
      : this.getLegacyUnlockedCauldrons(savedCauldrons, snapshot);
    const unlockedCauldrons = this.clampUnlockedCauldronsByLevel(restoredUnlockedCauldrons);
    this.brewingCauldronEntityManager.applyUnlockedCauldrons(unlockedCauldrons);

    for (const [index, savedCauldron] of savedCauldrons.entries()) {
      const cauldronIndex = this.normalizeCauldronIndex(
        Number.isInteger(savedCauldron?.cauldronNumber)
          ? savedCauldron.cauldronNumber - 1
          : index,
      );
      if (cauldronIndex >= unlockedCauldrons) {
        continue;
      }
      this.restoreAutoBrew(savedCauldron, snapshot, cauldronIndex);
      this.restoreCauldronItems(savedCauldron?.cauldronItemKeys, itemsFacade, cauldronIndex);
      this.restoreActiveBrew(savedCauldron?.activeBrew, itemsFacade, cauldronIndex);
    }

    this.collectReadyBrews();
  }

  clampUnlockedCauldronsByLevel(unlockedCauldrons) {
    if (!Number.isInteger(unlockedCauldrons)) {
      return this.brewingBalanceManager.getInitialUnlockedCauldrons();
    }

    return Math.min(
      unlockedCauldrons,
      this.getMaxUnlockedCauldronsByProgression(unlockedCauldrons),
      this.brewingBalanceManager.getMaxCauldrons(),
    );
  }

  getMaxUnlockedCauldronsByProgression(
    fallback = this.brewingBalanceManager.getMaxCauldrons(),
  ) {
    const maxCauldronsByLevel = this.playerLevelFacade?.getMaxCauldrons?.() ?? fallback;

    return Math.min(
      this.brewingBalanceManager.getMaxCauldrons(),
      this.researchFacade?.getMaxCauldronsWithCapacity?.(maxCauldronsByLevel) ??
        maxCauldronsByLevel,
    );
  }

  getLegacyUnlockedCauldrons(savedCauldrons, snapshot = {}) {
    let unlockedCauldrons = this.brewingBalanceManager.getInitialUnlockedCauldrons();

    for (const [index, savedCauldron] of savedCauldrons.entries()) {
      const cauldronNumber = Number.isInteger(savedCauldron?.cauldronNumber)
        ? savedCauldron.cauldronNumber
        : index + 1;

      if (cauldronNumber <= unlockedCauldrons) {
        continue;
      }

      if (this.hasLegacyCauldronProgress(savedCauldron, snapshot, cauldronNumber - 1)) {
        unlockedCauldrons = cauldronNumber;
      }
    }

    return unlockedCauldrons;
  }

  hasLegacyCauldronProgress(savedCauldron, snapshot = {}, cauldronIndex = 0) {
    if (!savedCauldron || typeof savedCauldron !== 'object') {
      return false;
    }

    if (Array.isArray(savedCauldron.cauldronItemKeys) && savedCauldron.cauldronItemKeys.length > 0) {
      return true;
    }

    if (savedCauldron.activeBrew && typeof savedCauldron.activeBrew === 'object') {
      return true;
    }

    const autoBrewRecipeKey =
      typeof savedCauldron.autoBrewRecipeKey === 'string'
        ? savedCauldron.autoBrewRecipeKey
        : cauldronIndex === 0 && typeof snapshot.autoBrewRecipeKey === 'string'
          ? snapshot.autoBrewRecipeKey
          : null;

    return Boolean(autoBrewRecipeKey || savedCauldron.autoBrewEnabled === true);
  }

  restoreAutoBrew(savedCauldron, snapshot, cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const recipeKey =
      typeof savedCauldron?.autoBrewRecipeKey === 'string'
        ? savedCauldron.autoBrewRecipeKey
        : safeCauldronIndex === 0 && typeof snapshot.autoBrewRecipeKey === 'string'
          ? snapshot.autoBrewRecipeKey
          : null;
    const enabled =
      typeof savedCauldron?.autoBrewEnabled === 'boolean'
        ? savedCauldron.autoBrewEnabled
        : safeCauldronIndex === 0
          ? Boolean(snapshot.autoBrewEnabled)
          : false;

    if (!recipeKey) {
      return;
    }

    this.setAutoBrewRecipeKey(recipeKey, safeCauldronIndex);

    if (enabled) {
      this.setAutoBrewEnabled(true, safeCauldronIndex);
    }
  }

  clearAutoBrewState() {
    this.autoBrewEnabledByCauldron.clear();
    this.autoBrewRecipeKeysByCauldron.clear();
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
      resultQuantity: Math.max(1, Math.floor(Number(activeBrew.resultQuantity) || 1)),
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
