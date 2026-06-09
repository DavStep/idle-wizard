import { addEntity, removeEntity } from 'bitecs';

export class EcsEntityManager {
  constructor({ worldManager }) {
    this.worldManager = worldManager;
  }

  createEntity() {
    return addEntity(this.worldManager.getWorld());
  }

  removeEntity(entityId) {
    removeEntity(this.worldManager.getWorld(), entityId);
  }
}
