export class PlayerLevelSnapshotManager {
  constructor({ playerLevelBalanceManager, tasksFacade }) {
    this.playerLevelBalanceManager = playerLevelBalanceManager;
    this.tasksFacade = tasksFacade;
  }

  getSnapshot() {
    const currentLevel = this.getCurrentLevel();

    return {
      currentLevel,
      maxLevel: this.playerLevelBalanceManager.getMaxLevel(),
      effects: this.playerLevelBalanceManager.getEffects(currentLevel),
      levels: this.playerLevelBalanceManager.getLevelSummaries(currentLevel),
    };
  }

  getCurrentLevel() {
    return this.tasksFacade.getSnapshot().currentLevel ?? 1;
  }
}
