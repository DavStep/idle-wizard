export class TaskLevelCompletionManager {
  constructor({ taskBalanceManager, taskStateEntityManager }) {
    this.taskBalanceManager = taskBalanceManager;
    this.taskStateEntityManager = taskStateEntityManager;
  }

  getCurrentLevelCompletionSnapshot() {
    const level = this.taskStateEntityManager.getCurrentLevel();
    const atMaxLevel = level >= this.taskBalanceManager.getMaxLevel();
    const allTasksCompleted = this.taskStateEntityManager.areLevelTasksCompleted(level);
    const completedAllLevels = this.taskStateEntityManager.areAllLevelsCompleted();

    return {
      level,
      costCoin: this.taskBalanceManager.getLevelCompletionCostCoin(level),
      allTasksCompleted,
      atMaxLevel,
      completedAllLevels,
      canComplete: allTasksCompleted && !atMaxLevel,
    };
  }

  completeCurrentLevel() {
    const snapshot = this.getCurrentLevelCompletionSnapshot();

    if (snapshot.completedAllLevels) {
      return {
        ok: false,
        reason: 'all_levels_completed',
        ...snapshot,
      };
    }

    if (snapshot.atMaxLevel) {
      return {
        ok: false,
        reason: 'max_level',
        ...snapshot,
      };
    }

    if (!snapshot.allTasksCompleted) {
      return {
        ok: false,
        reason: 'tasks_incomplete',
        ...snapshot,
      };
    }

    const completion = this.taskStateEntityManager.advanceCurrentLevel();

    return {
      ok: true,
      level: snapshot.level,
      levelBefore: completion.levelBefore,
      currentLevel: completion.levelAfter,
      advanced: completion.advanced,
      completedAllLevels: completion.completedAllLevels,
      costCoin: snapshot.costCoin,
    };
  }
}
