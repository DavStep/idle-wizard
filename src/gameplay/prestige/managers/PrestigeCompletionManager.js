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

    const currentLevel = this.getCurrentLevel();
    const completedBefore = this.prestigeStateEntityManager.getCompletedLevels();
    const creditedLevels = this.prestigeMilestoneBalanceManager.getCreditedLevelsForClaim(
      milestone.level,
      completedBefore,
    );

    this.prestigeStateEntityManager.syncMilestones({
      maxLevel: Math.max(currentLevel, milestone.level),
      completedLevels: [...completedBefore, milestone.level],
    });

    if (creditedLevels.length <= 0) {
      return {
        ok: false,
        reason: 'already_completed',
        milestone,
      };
    }

    if (currentLevel < milestone.level) {
      return {
        ok: false,
        reason: 'level_too_low',
        currentLevel,
        milestone,
      };
    }

    this.prestigeStateEntityManager.completeLevels(creditedLevels);
    const completedLevels = this.prestigeStateEntityManager.getCompletedLevels();

    return {
      ok: true,
      currentLevel,
      milestone,
      creditedLevels,
      creditedMilestones: creditedLevels
        .map((creditedLevel) => this.prestigeMilestoneBalanceManager.getMilestone(creditedLevel))
        .filter(Boolean),
      completedLevels,
    };
  }
}
