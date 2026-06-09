export class EcsSystemManager {
  constructor({ worldManager }) {
    this.worldManager = worldManager;
    this.systems = [];
  }

  register(system) {
    if (!system || typeof system.update !== 'function') {
      throw new Error('ECS systems must expose an update(world, frame) method.');
    }

    this.systems.push(system);
  }

  clear() {
    this.systems = [];
  }

  update(frame) {
    const world = this.worldManager.getWorld();

    for (const system of this.systems) {
      system.update(world, frame);
    }
  }
}
