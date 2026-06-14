export class PrestigeSnapshotManager {
  constructor({
    playerLevelFacade,
    prestigeMilestoneBalanceManager,
    prestigeStateEntityManager,
  }) {
    this.playerLevelFacade = playerLevelFacade;
    this.prestigeMilestoneBalanceManager = prestigeMilestoneBalanceManager;
    this.prestigeStateEntityManager = prestigeStateEntityManager;
  }

  getSnapshot() {
    const playerLevel = this.playerLevelFacade?.getSnapshot?.() ?? {};
    const currentLevel = Math.max(1, Math.floor(Number(playerLevel.currentLevel) || 1));
    const maxLevel = Math.max(currentLevel, Math.floor(Number(playerLevel.maxLevel) || currentLevel));
    const completedLevels = this.prestigeStateEntityManager.getCompletedLevels();
    const milestones = this.prestigeMilestoneBalanceManager.getMilestones({
      maxLevel,
      completedLevels,
    });

    this.prestigeStateEntityManager.syncMilestones({ maxLevel, completedLevels });

    const milestoneSnapshots = milestones.map((milestone) => {
      const completed = this.prestigeStateEntityManager.isCompleted(milestone.level);
      const unlocked = currentLevel >= milestone.level;

      return {
        ...milestone,
        completed,
        unlocked,
        canComplete: unlocked && !completed,
        currentLevel,
      };
    });
    const availableLevels = milestoneSnapshots
      .filter((milestone) => milestone.canComplete)
      .map((milestone) => milestone.level);
    const highestAvailableLevel =
      availableLevels.length > 0 ? Math.max(...availableLevels) : null;

    return {
      currentLevel,
      maxLevel,
      completedLevels,
      earnedRuby: this.prestigeMilestoneBalanceManager.getTotalRuby(completedLevels),
      nextRuby: this.getNextRuby(milestoneSnapshots),
      highestAvailableLevel,
      milestones: milestoneSnapshots.map((milestone) => ({
        ...milestone,
        lowerThanHighestAvailable:
          highestAvailableLevel !== null &&
          milestone.canComplete &&
          milestone.level < highestAvailableLevel,
      })),
    };
  }

  getNextRuby(milestones) {
    const next = milestones.find((milestone) => !milestone.completed);
    return next?.rewardRuby ?? 0;
  }
}
