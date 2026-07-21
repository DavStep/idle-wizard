import { TaskActionProgressManager } from './managers/TaskActionProgressManager.js';
import { TaskBalanceManager } from './managers/TaskBalanceManager.js';
import { TaskFillManager } from './managers/TaskFillManager.js';
import { TaskLevelCompletionManager } from './managers/TaskLevelCompletionManager.js';
import { TaskSnapshotManager } from './managers/TaskSnapshotManager.js';
import { TaskStateEntityManager } from './managers/TaskStateEntityManager.js';
import { TaskQuestProgressManager } from './managers/TaskQuestProgressManager.js';
import { parseGameConfig } from '../config/gameConfigSnapshot.js';

export class TasksFacade {
  static explain =
    "Elara gives the wizard one main request at a time. Each completed request fills one level segment, and the final coin request completes the level.";

  constructor({ itemsFacade }) {
    this.taskBalanceManager = new TaskBalanceManager({ itemsFacade });
    this.taskStateEntityManager = new TaskStateEntityManager({
      taskBalanceManager: this.taskBalanceManager,
    });
    this.taskFillManager = new TaskFillManager({
      itemsFacade,
      taskBalanceManager: this.taskBalanceManager,
      taskStateEntityManager: this.taskStateEntityManager,
    });
    this.taskLevelCompletionManager = new TaskLevelCompletionManager({
      taskBalanceManager: this.taskBalanceManager,
      taskStateEntityManager: this.taskStateEntityManager,
    });
    this.taskActionProgressManager = new TaskActionProgressManager({
      taskBalanceManager: this.taskBalanceManager,
      taskStateEntityManager: this.taskStateEntityManager,
    });
    this.taskQuestProgressManager = new TaskQuestProgressManager();
    this.taskSnapshotManager = new TaskSnapshotManager({
      itemsFacade,
      taskBalanceManager: this.taskBalanceManager,
      taskLevelCompletionManager: this.taskLevelCompletionManager,
      taskQuestProgressManager: this.taskQuestProgressManager,
      taskStateEntityManager: this.taskStateEntityManager,
    });
  }

  initialize(ecsManagers) {
    this.taskStateEntityManager.initialize(ecsManagers);
  }

  setResearchFacade(researchFacade) {
    this.taskActionProgressManager.setResearchFacade(researchFacade);
  }

  applyRuntimeConfig(snapshot = {}) {
    const balance = parseGameConfig(snapshot, 'tasks');

    if (!balance) {
      return;
    }

    try {
      this.taskBalanceManager.setRuntimeBalance(balance);
      this.taskStateEntityManager.syncTaskEntities();
      this.syncCurrentLevelStateRequirements();
    } catch {
      return;
    }
  }

  fillTask(taskId) {
    return this.taskFillManager.fillTask(taskId);
  }

  completeTask(taskId) {
    return this.taskFillManager.completeTask(taskId);
  }

  recordAction(action) {
    return this.taskActionProgressManager.recordAction(action);
  }

  syncCurrentLevelStateRequirements() {
    return this.taskActionProgressManager.syncCurrentLevelStateRequirements();
  }

  getCurrentLevelCompletionSnapshot() {
    return this.taskLevelCompletionManager.getCurrentLevelCompletionSnapshot();
  }

  getLevelCompletionCostCoin(levelNumber) {
    return this.taskBalanceManager.getLevelCompletionCostCoin(levelNumber);
  }

  completeCurrentLevel() {
    const result = this.taskLevelCompletionManager.completeCurrentLevel();

    if (result.ok && result.advanced) {
      this.syncCurrentLevelStateRequirements();
    }

    return result;
  }

  getSnapshot() {
    this.syncCurrentLevelStateRequirements();
    return this.taskSnapshotManager.getSnapshot();
  }

  getPersistenceSnapshot() {
    return {
      currentLevel: this.taskStateEntityManager.getCurrentLevel(),
      tasks: this.taskStateEntityManager.getPersistenceTaskStateSnapshots(),
    };
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') {
      return;
    }

    this.taskStateEntityManager.applySnapshot(snapshot);
    this.syncCurrentLevelStateRequirements();
  }
}
