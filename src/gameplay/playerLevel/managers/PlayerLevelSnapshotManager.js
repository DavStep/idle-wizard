export class PlayerLevelSnapshotManager {
  constructor({ playerLevelBalanceManager, tasksFacade }) {
    this.playerLevelBalanceManager = playerLevelBalanceManager;
    this.tasksFacade = tasksFacade;
    this.cachedSnapshot = null;
    this.cachedLevel = null;
    this.cachedBalanceRevision = null;
  }

  getSnapshot() {
    const currentLevel = this.getCurrentLevel();
    const balanceRevision = this.playerLevelBalanceManager.getRevision?.() ?? null;

    if (
      this.cachedSnapshot &&
      this.cachedLevel === currentLevel &&
      this.cachedBalanceRevision === balanceRevision
    ) {
      return this.cachedSnapshot;
    }

    const snapshot = {
      currentLevel,
      maxLevel: this.playerLevelBalanceManager.getMaxLevel(),
      effects: this.playerLevelBalanceManager.getEffects(currentLevel),
      levels: this.playerLevelBalanceManager.getLevelSummaries(currentLevel),
    };

    this.cachedSnapshot = snapshot;
    this.cachedLevel = currentLevel;
    this.cachedBalanceRevision = balanceRevision;

    return snapshot;
  }

  getCurrentLevel() {
    return this.tasksFacade.getSnapshot().currentLevel ?? 1;
  }
}
