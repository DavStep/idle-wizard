import { query } from 'bitecs';

import {
  BrewingCauldron,
  BrewingCauldronIngredient,
} from '../components/BrewingComponents.js';

export class BrewingCauldronEntityManager {
  constructor({ itemsFacade, maxIngredients }) {
    this.itemsFacade = itemsFacade;
    this.maxIngredients = maxIngredients;
    this.ecsManagers = null;
    this.entityIds = new Map();
  }

  initialize(ecsManagers) {
    this.ecsManagers = ecsManagers;

    this.ensureCauldron(0);
  }

  configureCapacity({ maxIngredients = this.maxIngredients, maxCauldrons = 1 } = {}) {
    this.maxIngredients = maxIngredients;
    this.ensureCauldrons(maxCauldrons);
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
}
