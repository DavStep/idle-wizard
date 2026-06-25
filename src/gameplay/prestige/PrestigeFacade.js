import { PrestigeCompletionManager } from './managers/PrestigeCompletionManager.js';
import { PrestigeMilestoneBalanceManager } from './managers/PrestigeMilestoneBalanceManager.js';
import { PrestigeSnapshotManager } from './managers/PrestigeSnapshotManager.js';
import { PrestigeStateEntityManager } from './managers/PrestigeStateEntityManager.js';

export class PrestigeFacade {
  static explain =
    'Prestige records which level milestones the player has claimed, then uses those claims to give starting rubies on each run.';

  constructor({ playerLevelFacade } = {}) {
    this.playerLevelFacade = playerLevelFacade;
    this.prestigeMilestoneBalanceManager = new PrestigeMilestoneBalanceManager();
    this.prestigeStateEntityManager = new PrestigeStateEntityManager({
      prestigeMilestoneBalanceManager: this.prestigeMilestoneBalanceManager,
    });
    this.prestigeCompletionManager = new PrestigeCompletionManager({
      getCurrentLevel: () => this.getCurrentLevel(),
      prestigeMilestoneBalanceManager: this.prestigeMilestoneBalanceManager,
      prestigeStateEntityManager: this.prestigeStateEntityManager,
    });
    this.prestigeSnapshotManager = new PrestigeSnapshotManager({
      playerLevelFacade,
      prestigeMilestoneBalanceManager: this.prestigeMilestoneBalanceManager,
      prestigeStateEntityManager: this.prestigeStateEntityManager,
    });
  }

  initialize(ecsManagers) {
    this.prestigeStateEntityManager.initialize(ecsManagers);
  }

  completeMilestone(level) {
    return this.prestigeCompletionManager.complete(level);
  }

  getEarnedRuby() {
    return this.getRubyForCompletedLevels(
      this.prestigeStateEntityManager.getCompletedLevels(),
    );
  }

  getRubyForCompletedLevels(completedLevels = []) {
    return this.prestigeMilestoneBalanceManager.getTotalRuby(
      completedLevels,
    );
  }

  getCompletedCount() {
    return this.prestigeStateEntityManager.getCompletedLevels().length;
  }

  getCurrentLevel() {
    const snapshot = this.playerLevelFacade?.getSnapshot?.() ?? {};
    return Math.max(1, Math.floor(Number(snapshot.currentLevel) || 1));
  }

  getSnapshot() {
    return this.prestigeSnapshotManager.getSnapshot();
  }

  getPersistenceSnapshot() {
    return {
      completedLevels: this.prestigeStateEntityManager.getCompletedLevels(),
    };
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') {
      this.prestigeStateEntityManager.setCompletedLevels([]);
      return;
    }

    const completedLevels = Array.isArray(snapshot.completedLevels)
      ? snapshot.completedLevels
      : [];
    this.prestigeStateEntityManager.setCompletedLevels(completedLevels);
  }
}
