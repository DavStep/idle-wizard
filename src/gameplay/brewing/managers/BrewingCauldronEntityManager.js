import { query } from 'bitecs';

import {
  BrewingCauldron,
  BrewingCauldronIngredient,
} from '../components/BrewingComponents.js';

export class BrewingCauldronEntityManager {
  constructor({ itemsFacade, maxIngredients, initialUnlockedCauldrons = 1, maxCauldrons = 1 }) {
    this.itemsFacade = itemsFacade;
    this.maxIngredients = maxIngredients;
    this.initialUnlockedCauldrons = this.normalizeCauldronCount(
      initialUnlockedCauldrons,
      1,
      maxCauldrons,
    );
    this.maxCauldrons = this.normalizeMaxCauldrons(maxCauldrons);
    this.unlockedCauldrons = this.initialUnlockedCauldrons;
    this.ecsManagers = null;
    this.entityIds = new Map();
  }

  initialize(ecsManagers) {
    this.ecsManagers = ecsManagers;

    this.ensureCauldrons(this.unlockedCauldrons);
  }

  configureCapacity({
    maxIngredients = this.maxIngredients,
    initialUnlockedCauldrons = this.initialUnlockedCauldrons,
    maxCauldrons = this.maxCauldrons,
  } = {}) {
    this.maxIngredients = maxIngredients;
    this.maxCauldrons = this.normalizeMaxCauldrons(maxCauldrons);
    this.initialUnlockedCauldrons = this.normalizeCauldronCount(
      initialUnlockedCauldrons,
      1,
      this.maxCauldrons,
    );
    this.unlockedCauldrons = this.normalizeCauldronCount(
      this.unlockedCauldrons,
      this.initialUnlockedCauldrons,
      this.maxCauldrons,
    );
    if (!this.ecsManagers) {
      return;
    }

    this.ensureCauldrons(this.unlockedCauldrons);
  }

  ensureCauldrons(maxCauldrons = 1) {
    const safeMaxCauldrons = Math.max(1, Math.floor(Number(maxCauldrons) || 1));

    for (let cauldronIndex = 0; cauldronIndex < safeMaxCauldrons; cauldronIndex += 1) {
      this.ensureCauldron(cauldronIndex);
    }
  }

  ensureCauldron(cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);

    if (this.entityIds.has(safeCauldronIndex)) {
      return this.entityIds.get(safeCauldronIndex);
    }

    const entityId = this.ecsManagers.entities.createEntity();
    this.ecsManagers.components.add(entityId, BrewingCauldron);
    BrewingCauldron.cauldronIndex[entityId] = safeCauldronIndex;
    this.entityIds.set(safeCauldronIndex, entityId);
    return entityId;
  }

  addIngredient(itemTypeId, cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);

    if (!this.isCauldronUnlocked(safeCauldronIndex)) {
      return false;
    }

    this.ensureCauldron(safeCauldronIndex);

    if (this.getIngredientCount(safeCauldronIndex) >= this.maxIngredients) {
      return false;
    }

    const entityId = this.ecsManagers.entities.createEntity();
    this.ecsManagers.components.add(entityId, BrewingCauldronIngredient);
    BrewingCauldronIngredient.cauldronIndex[entityId] = safeCauldronIndex;
    BrewingCauldronIngredient.itemTypeId[entityId] = itemTypeId;
    BrewingCauldronIngredient.slotIndex[entityId] =
      this.getIngredientCount(safeCauldronIndex);
    return true;
  }

  removeIngredientAt(slotIndex, cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const entityId = this.getIngredientEntityIds(safeCauldronIndex)[slotIndex];

    if (entityId === undefined) {
      return false;
    }

    this.ecsManagers.entities.removeEntity(entityId);
    this.reindexIngredients(safeCauldronIndex);
    return true;
  }

  clearIngredients(cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);

    for (const entityId of this.getIngredientEntityIds(safeCauldronIndex)) {
      this.ecsManagers.entities.removeEntity(entityId);
    }
  }

  clearAllIngredients() {
    for (const entityId of this.getIngredientEntityIds(null)) {
      this.ecsManagers.entities.removeEntity(entityId);
    }
  }

  getUnlockedCauldrons() {
    return this.normalizeCauldronCount(
      this.unlockedCauldrons,
      this.initialUnlockedCauldrons,
      this.maxCauldrons,
    );
  }

  unlockNextCauldron() {
    if (this.getUnlockedCauldrons() >= this.maxCauldrons) {
      return false;
    }

    this.unlockedCauldrons += 1;
    this.ensureCauldron(this.unlockedCauldrons - 1);
    return true;
  }

  applyUnlockedCauldrons(unlockedCauldrons) {
    this.unlockedCauldrons = this.normalizeCauldronCount(
      unlockedCauldrons,
      this.initialUnlockedCauldrons,
      this.maxCauldrons,
    );
    if (!this.ecsManagers) {
      return;
    }

    this.ensureCauldrons(this.unlockedCauldrons);
  }

  isCauldronUnlocked(cauldronIndex = 0) {
    return this.normalizeCauldronIndex(cauldronIndex) < this.getUnlockedCauldrons();
  }

  getIngredientCount(cauldronIndex = 0) {
    return this.getIngredientEntityIds(cauldronIndex).length;
  }

  getIngredientItemTypeIds(cauldronIndex = 0) {
    return this.getIngredientEntityIds(cauldronIndex).map(
      (entityId) => BrewingCauldronIngredient.itemTypeId[entityId],
    );
  }

  getIngredientCountByItemTypeId(itemTypeId, cauldronIndex = null) {
    return this.getIngredientItemTypeIds(cauldronIndex).filter(
      (candidate) => candidate === itemTypeId,
    ).length;
  }

  getIngredientCountsByItemTypeId(cauldronIndex = null) {
    const counts = new Map();

    for (const itemTypeId of this.getIngredientItemTypeIds(cauldronIndex)) {
      counts.set(itemTypeId, (counts.get(itemTypeId) ?? 0) + 1);
    }

    return counts;
  }

  getIngredientSnapshots(cauldronIndex = 0) {
    const safeCauldronIndex =
      cauldronIndex === null ? null : this.normalizeCauldronIndex(cauldronIndex);

    return this.getIngredientEntityIds(safeCauldronIndex).map((entityId, index) => {
      const itemTypeId = BrewingCauldronIngredient.itemTypeId[entityId];
      const definition = this.itemsFacade.getItemDefinition(itemTypeId);
      const ingredientCauldronIndex =
        BrewingCauldronIngredient.cauldronIndex[entityId] ?? 0;

      return {
        cauldronIndex: ingredientCauldronIndex,
        cauldronNumber: ingredientCauldronIndex + 1,
        slotIndex: index,
        itemTypeId,
        key: definition.key,
        label: definition.label,
        kind: definition.kind,
      };
    });
  }

  getIngredientEntityIds(cauldronIndex = 0) {
    const safeCauldronIndex =
      cauldronIndex === null ? null : this.normalizeCauldronIndex(cauldronIndex);

    return query(this.ecsManagers.world.getWorld(), [BrewingCauldronIngredient])
      .filter(
        (entityId) =>
          safeCauldronIndex === null ||
          (BrewingCauldronIngredient.cauldronIndex[entityId] ?? 0) ===
            safeCauldronIndex,
      )
      .slice()
      .sort(
        (left, right) => {
          const leftCauldronIndex = BrewingCauldronIngredient.cauldronIndex[left] ?? 0;
          const rightCauldronIndex =
            BrewingCauldronIngredient.cauldronIndex[right] ?? 0;

          if (leftCauldronIndex !== rightCauldronIndex) {
            return leftCauldronIndex - rightCauldronIndex;
          }

          return (
            BrewingCauldronIngredient.slotIndex[left] -
            BrewingCauldronIngredient.slotIndex[right]
          );
        },
      );
  }

  reindexIngredients(cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    this.getIngredientEntityIds(safeCauldronIndex).forEach((entityId, index) => {
      BrewingCauldronIngredient.slotIndex[entityId] = index;
    });
  }

  normalizeCauldronIndex(cauldronIndex) {
    const safeCauldronIndex = Math.floor(Number(cauldronIndex));
    return Number.isInteger(safeCauldronIndex) && safeCauldronIndex >= 0
      ? safeCauldronIndex
      : 0;
  }

  normalizeMaxCauldrons(maxCauldrons) {
    const safeMaxCauldrons = Math.floor(Number(maxCauldrons));
    return Number.isInteger(safeMaxCauldrons) && safeMaxCauldrons > 0
      ? safeMaxCauldrons
      : 1;
  }

  normalizeCauldronCount(cauldronCount, min = 1, max = this.maxCauldrons) {
    const safeMax = this.normalizeMaxCauldrons(max);
    const safeMin = Math.max(1, Math.min(Math.floor(Number(min)) || 1, safeMax));
    const safeCauldronCount = Math.floor(Number(cauldronCount));

    return Number.isInteger(safeCauldronCount)
      ? Math.max(safeMin, Math.min(safeCauldronCount, safeMax))
      : safeMin;
  }
}
