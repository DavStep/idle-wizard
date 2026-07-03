import { PrestigeCompletionManager } from './managers/PrestigeCompletionManager.js';
import { PrestigeMilestoneBalanceManager } from './managers/PrestigeMilestoneBalanceManager.js';
import { PrestigeRunFocusManager } from './managers/PrestigeRunFocusManager.js';
import { PrestigeSnapshotManager } from './managers/PrestigeSnapshotManager.js';
import { PrestigeStateEntityManager } from './managers/PrestigeStateEntityManager.js';
import {
  getPrestigeUnlocksSnapshot,
  hasPrestigeUnlock,
  prestigeUnlockIds,
} from './prestigeUnlocks.js';

export class PrestigeFacade {
  static explain =
    'Prestige records which level milestones the player has claimed, then uses those claims to give starting rubies on each run.';

  constructor({ playerLevelFacade } = {}) {
    this.playerLevelFacade = playerLevelFacade;
    this.prestigeMilestoneBalanceManager = new PrestigeMilestoneBalanceManager();
    this.prestigeStateEntityManager = new PrestigeStateEntityManager({
      prestigeMilestoneBalanceManager: this.prestigeMilestoneBalanceManager,
    });
    this.prestigeRunFocusManager = new PrestigeRunFocusManager();
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

  getUnlockSnapshot() {
    return getPrestigeUnlocksSnapshot(this.getCompletedCount());
  }

  hasUnlock(unlockId) {
    return hasPrestigeUnlock(this.getCompletedCount(), unlockId);
  }

  setRunFocus(focusId) {
    return this.prestigeRunFocusManager.setRunFocus(focusId, {
      unlocked: this.hasUnlock(prestigeUnlockIds.runFocus),
    });
  }

  getCurrentLevel() {
    const snapshot = this.playerLevelFacade?.getSnapshot?.() ?? {};
    return Math.max(1, Math.floor(Number(snapshot.currentLevel) || 1));
  }

  getSnapshot() {
    const snapshot = this.prestigeSnapshotManager.getSnapshot();
    const runFocusUnlocked = this.hasUnlock(prestigeUnlockIds.runFocus);

    return {
      ...snapshot,
      unlocks: this.getUnlockSnapshot(),
      runFocus: this.prestigeRunFocusManager.getSnapshot({
        unlocked: runFocusUnlocked,
      }),
    };
  }

  getPersistenceSnapshot() {
    return {
      completedLevels: this.prestigeStateEntityManager.getCompletedLevels(),
      runFocus: this.prestigeRunFocusManager.getRunFocus(),
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
    this.prestigeRunFocusManager.applyPersistenceSnapshot(snapshot, {
      unlocked: this.hasUnlock(prestigeUnlockIds.runFocus),
    });
  }
}
