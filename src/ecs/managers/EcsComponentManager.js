import { addComponent, hasComponent, removeComponent } from 'bitecs';

export class EcsComponentManager {
  constructor({ worldManager }) {
    this.worldManager = worldManager;
  }

  add(entityId, component) {
    addComponent(this.worldManager.getWorld(), entityId, component);
  }

  remove(entityId, component) {
    removeComponent(this.worldManager.getWorld(), entityId, component);
  }

  has(entityId, component) {
    return hasComponent(this.worldManager.getWorld(), entityId, component);
  }
}
