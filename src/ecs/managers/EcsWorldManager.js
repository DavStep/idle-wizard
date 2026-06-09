import { createWorld } from 'bitecs';

export class EcsWorldManager {
  constructor() {
    this.world = null;
  }

  createWorld() {
    if (!this.world) {
      this.world = createWorld();
    }

    return this.world;
  }

  destroyWorld() {
    this.world = null;
  }

  getWorld() {
    if (!this.world) {
      throw new Error('ECS world has not been created yet.');
    }

    return this.world;
  }
}
