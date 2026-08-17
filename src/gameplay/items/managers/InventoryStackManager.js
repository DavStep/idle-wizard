import { query } from 'bitecs';

import { InventoryStack } from '../components/InventoryComponents.js';

export class InventoryStackManager {
  constructor({ itemDefinitionManager }) {
    this.itemDefinitionManager = itemDefinitionManager;
    this.ecsManagers = null;
    this.entityIdByItemTypeId = new Map();
  }

  initialize(ecsManagers) {
    this.ecsManagers = ecsManagers;
    this.entityIdByItemTypeId.clear();
    for (const entityId of this.getStackEntities()) {
      this.entityIdByItemTypeId.set(
        InventoryStack.itemTypeId[entityId],
        entityId,
      );
    }
  }

  addItem(itemTypeId, quantity) {
    const existingEntityId = this.findStackEntity(itemTypeId);
    const entityId = existingEntityId ?? this.createStackEntity(itemTypeId);
    InventoryStack.quantity[entityId] = (InventoryStack.quantity[entityId] ?? 0) + quantity;
  }

  setItemQuantity(itemTypeId, quantity) {
    const safeQuantity = Math.max(0, quantity);
    const existingEntityId = this.findStackEntity(itemTypeId);

    if (safeQuantity <= 0) {
      if (existingEntityId !== null) {
        this.ecsManagers.entities.removeEntity(existingEntityId);
        this.entityIdByItemTypeId.delete(itemTypeId);
      }

      return;
    }

    const entityId = existingEntityId ?? this.createStackEntity(itemTypeId);
    InventoryStack.quantity[entityId] = safeQuantity;
  }

  clear() {
    for (const entityId of this.getStackEntities()) {
      this.ecsManagers.entities.removeEntity(entityId);
    }
    this.entityIdByItemTypeId.clear();
  }

  removeItem(itemTypeId, quantity) {
    const entityId = this.findStackEntity(itemTypeId);

    if (entityId === null || this.getQuantity(itemTypeId) < quantity) {
      return false;
    }

    InventoryStack.quantity[entityId] -= quantity;

    if (InventoryStack.quantity[entityId] <= 0) {
      this.ecsManagers.entities.removeEntity(entityId);
      this.entityIdByItemTypeId.delete(itemTypeId);
    }

    return true;
  }

  removeFirstItemByKind(kind, quantity) {
    const entityId = this.getStackEntities().find((stackEntityId) => {
      const itemTypeId = InventoryStack.itemTypeId[stackEntityId];
      const definition = this.itemDefinitionManager.getDefinition(itemTypeId);
      return definition.kind === kind && (InventoryStack.quantity[stackEntityId] ?? 0) >= quantity;
    });

    if (entityId === undefined) {
      return null;
    }

    const itemTypeId = InventoryStack.itemTypeId[entityId];
    const definition = this.itemDefinitionManager.getDefinition(itemTypeId);
    this.removeItem(itemTypeId, quantity);

    return {
      itemTypeId,
      key: definition.key,
      label: definition.label,
      kind: definition.kind,
      quantity,
    };
  }

  getQuantity(itemTypeId) {
    const entityId = this.findStackEntity(itemTypeId);
    return entityId === null ? 0 : InventoryStack.quantity[entityId] ?? 0;
  }

  getSnapshot() {
    return this.getStackEntities().map((entityId) => {
      const itemTypeId = InventoryStack.itemTypeId[entityId];
      const definition = this.itemDefinitionManager.getDefinition(itemTypeId);

      return {
        itemTypeId,
        key: definition.key,
        label: definition.label,
        kind: definition.kind,
        quantity: InventoryStack.quantity[entityId] ?? 0,
      };
    });
  }

  createStackEntity(itemTypeId) {
    const entityId = this.ecsManagers.entities.createEntity();
    this.ecsManagers.components.add(entityId, InventoryStack);
    InventoryStack.itemTypeId[entityId] = itemTypeId;
    InventoryStack.quantity[entityId] = 0;
    this.entityIdByItemTypeId.set(itemTypeId, entityId);
    return entityId;
  }

  findStackEntity(itemTypeId) {
    return this.entityIdByItemTypeId.get(itemTypeId) ?? null;
  }

  getStackEntities() {
    return query(this.ecsManagers.world.getWorld(), [InventoryStack]);
  }
}
