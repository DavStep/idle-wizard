import { EcsComponentManager } from './managers/EcsComponentManager.js';
import { EcsEntityManager } from './managers/EcsEntityManager.js';
import { EcsSystemManager } from './managers/EcsSystemManager.js';
import { EcsWorldManager } from './managers/EcsWorldManager.js';

export class EcsFacade {
  static explain =
    'Keeps the world as small facts on things, then lets simple rules update those facts each frame.';

  constructor() {
    this.worldManager = new EcsWorldManager();
    this.entityManager = new EcsEntityManager({ worldManager: this.worldManager });
    this.componentManager = new EcsComponentManager({ worldManager: this.worldManager });
    this.systemManager = new EcsSystemManager({ worldManager: this.worldManager });
  }

  createWorld() {
    return this.worldManager.createWorld();
  }

  destroyWorld() {
    this.systemManager.clear();
    this.worldManager.destroyWorld();
  }

  update(frame) {
    this.systemManager.update(frame);
  }

  getWorld() {
    return this.worldManager.getWorld();
  }

  getManagers() {
    return {
      world: this.worldManager,
      entities: this.entityManager,
      components: this.componentManager,
      systems: this.systemManager,
    };
  }
}
