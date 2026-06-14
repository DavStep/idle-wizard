export class PrestigeCompletionManager {
  constructor({
    getCurrentLevel,
    prestigeMilestoneBalanceManager,
    prestigeStateEntityManager,
  }) {
    this.getCurrentLevel = getCurrentLevel;
    this.prestigeMilestoneBalanceManager = prestigeMilestoneBalanceManager;
    this.prestigeStateEntityManager = prestigeStateEntityManager;
  }

  complete(level) {
    const milestone = this.prestigeMilestoneBalanceManager.getMilestone(level);

    if (!milestone) {
      return {
        ok: false,
        reason: 'unknown_milestone',
      };
    }

    this.prestigeStateEntityManager.syncMilestones({
      maxLevel: Math.max(this.getCurrentLevel(), milestone.level),
      completedLevels: [milestone.level],
    });

    if (this.prestigeStateEntityManager.isCompleted(milestone.level)) {
      return {
        ok: false,
        reason: 'already_completed',
        milestone,
      };
    }

    const currentLevel = this.getCurrentLevel();

    if (currentLevel < milestone.level) {
      return {
        ok: false,
        reason: 'level_too_low',
        currentLevel,
        milestone,
      };
    }

    this.prestigeStateEntityManager.complete(milestone.level);

    return {
      ok: true,
      currentLevel,
      milestone,
      completedLevels: this.prestigeStateEntityManager.getCompletedLevels(),
    };
  }
}
