import { PlayerPrestigeMilestone } from '../components/PrestigeComponents.js';

export class PrestigeStateEntityManager {
  constructor({ prestigeMilestoneBalanceManager }) {
    this.prestigeMilestoneBalanceManager = prestigeMilestoneBalanceManager;
    this.ecsManagers = null;
    this.entityIdsByLevel = new Map();
  }

  initialize(ecsManagers) {
    if (this.ecsManagers) {
      return;
    }

    this.ecsManagers = ecsManagers;
    this.syncMilestones();
  }

  syncMilestones({ maxLevel, completedLevels = this.getCompletedLevels() } = {}) {
    if (!this.ecsManagers) {
      return;
    }

    const milestones = this.prestigeMilestoneBalanceManager.getMilestones({
      maxLevel,
      completedLevels,
    });

    for (const milestone of milestones) {
      if (!milestone) {
        continue;
      }

      if (!this.entityIdsByLevel.has(milestone.level)) {
        this.createMilestoneEntity(milestone);
        continue;
      }

      const entityId = this.getEntityId(milestone.level);
      PlayerPrestigeMilestone.rewardRuby[entityId] = milestone.rewardRuby;
    }
  }

  createMilestoneEntity(milestone) {
    const entityId = this.ecsManagers.entities.createEntity();
    this.ecsManagers.components.add(entityId, PlayerPrestigeMilestone);
    PlayerPrestigeMilestone.level[entityId] = milestone.level;
    PlayerPrestigeMilestone.rewardRuby[entityId] = milestone.rewardRuby;
    PlayerPrestigeMilestone.isCompleted[entityId] = 0;
    this.entityIdsByLevel.set(milestone.level, entityId);
  }

  complete(level) {
    return this.completeLevels([level]);
  }

  completeLevels(levels = []) {
    const completedLevels = this.prestigeMilestoneBalanceManager.normalizeCompletedLevels([
      ...this.getCompletedLevels(),
      ...levels,
    ]);

    this.setCompletedLevels(completedLevels);
    return levels.every((level) => this.isCompleted(level));
  }

  isCompleted(level) {
    if (!this.hasMilestone(level)) {
      return false;
    }

    return PlayerPrestigeMilestone.isCompleted[this.getEntityId(level)] === 1;
  }

  setCompletedLevels(levels = []) {
    const completedLevels =
      this.prestigeMilestoneBalanceManager.normalizeCompletedLevels(levels);

    this.syncMilestones({ completedLevels });

    for (const [level, entityId] of this.entityIdsByLevel.entries()) {
      PlayerPrestigeMilestone.isCompleted[entityId] = completedLevels.includes(level) ? 1 : 0;
    }
  }

  getCompletedLevels() {
    return [...this.entityIdsByLevel.entries()]
      .filter(([, entityId]) => PlayerPrestigeMilestone.isCompleted[entityId] === 1)
      .map(([level]) => level)
      .sort((left, right) => left - right);
  }

  hasMilestone(level) {
    return this.entityIdsByLevel.has(level);
  }

  getEntityId(level) {
    const entityId = this.entityIdsByLevel.get(level);

    if (entityId === undefined) {
      throw new Error(`Unknown prestige milestone: ${level}`);
    }

    return entityId;
  }
}
