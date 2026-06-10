import { BrewingBalanceManager } from './managers/BrewingBalanceManager.js';
import { BrewingBottlingManager } from './managers/BrewingBottlingManager.js';
import { BrewingCauldronEntityManager } from './managers/BrewingCauldronEntityManager.js';
import { BrewingCollectManager } from './managers/BrewingCollectManager.js';
import { BrewingProcessEntityManager } from './managers/BrewingProcessEntityManager.js';
import { BrewingProcessManager } from './managers/BrewingProcessManager.js';
import { BrewingRecipeMatchManager } from './managers/BrewingRecipeMatchManager.js';
import { BrewingSnapshotManager } from './managers/BrewingSnapshotManager.js';
import { BrewingStartManager } from './managers/BrewingStartManager.js';

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
    this.onBrewComplete = onBrewComplete;
    this.brewingSnapshotManager = new BrewingSnapshotManager({
      brewingBalanceManager: this.brewingBalanceManager,
      brewingCauldronEntityManager: this.brewingCauldronEntityManager,
      brewingProcessEntityManager: this.brewingProcessEntityManager,
      brewingRecipeMatchManager: this.brewingRecipeMatchManager,
      itemsFacade,
      manaFacade,
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

  addIngredient(itemTypeId) {
    return this.brewingStartManager.addIngredient(itemTypeId);
  }

  removeIngredientAt(slotIndex) {
    return this.brewingStartManager.removeIngredientAt(slotIndex);
  }

  clearCauldron() {
    return this.brewingStartManager.clearCauldron();
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
