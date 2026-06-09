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
    this.entityId = null;
  }

  initialize(ecsManagers) {
    this.ecsManagers = ecsManagers;

    if (this.entityId !== null) {
      return;
    }

    this.entityId = ecsManagers.entities.createEntity();
    ecsManagers.components.add(this.entityId, BrewingCauldron);
  }

  addIngredient(itemTypeId) {
    if (this.getIngredientCount() >= this.maxIngredients) {
      return false;
    }

    const entityId = this.ecsManagers.entities.createEntity();
    this.ecsManagers.components.add(entityId, BrewingCauldronIngredient);
    BrewingCauldronIngredient.itemTypeId[entityId] = itemTypeId;
    BrewingCauldronIngredient.slotIndex[entityId] = this.getIngredientCount();
    return true;
  }

  removeIngredientAt(slotIndex) {
    const entityId = this.getIngredientEntityIds()[slotIndex];

    if (entityId === undefined) {
      return false;
    }

    this.ecsManagers.entities.removeEntity(entityId);
    this.reindexIngredients();
    return true;
  }

  clearIngredients() {
    for (const entityId of this.getIngredientEntityIds()) {
      this.ecsManagers.entities.removeEntity(entityId);
    }
  }

  getIngredientCount() {
    return this.getIngredientEntityIds().length;
  }

  getIngredientItemTypeIds() {
    return this.getIngredientEntityIds().map(
      (entityId) => BrewingCauldronIngredient.itemTypeId[entityId],
    );
  }

  getIngredientCountByItemTypeId(itemTypeId) {
    return this.getIngredientItemTypeIds().filter((candidate) => candidate === itemTypeId)
      .length;
  }

  getIngredientSnapshots() {
    return this.getIngredientEntityIds().map((entityId, index) => {
      const itemTypeId = BrewingCauldronIngredient.itemTypeId[entityId];
      const definition = this.itemsFacade.getItemDefinition(itemTypeId);

      return {
        slotIndex: index,
        itemTypeId,
        key: definition.key,
        label: definition.label,
        kind: definition.kind,
      };
    });
  }

  getIngredientEntityIds() {
    return query(this.ecsManagers.world.getWorld(), [BrewingCauldronIngredient])
      .slice()
      .sort(
        (left, right) =>
          BrewingCauldronIngredient.slotIndex[left] -
          BrewingCauldronIngredient.slotIndex[right],
      );
  }

  reindexIngredients() {
    this.getIngredientEntityIds().forEach((entityId, index) => {
      BrewingCauldronIngredient.slotIndex[entityId] = index;
    });
  }
}
