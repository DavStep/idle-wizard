import { TaskBalanceManager } from './managers/TaskBalanceManager.js';
import { TaskFillManager } from './managers/TaskFillManager.js';
import { TaskLevelCompletionManager } from './managers/TaskLevelCompletionManager.js';
import { TaskSnapshotManager } from './managers/TaskSnapshotManager.js';
import { TaskStateEntityManager } from './managers/TaskStateEntityManager.js';
import { parseGameConfig } from '../config/gameConfigSnapshot.js';

export class TasksFacade {
  static explain =
    'Level requirements give the wizard item turn-ins: turn in the listed drops, complete the filled requirements, then pay gold to level up.';

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
    this.taskSnapshotManager = new TaskSnapshotManager({
      itemsFacade,
      taskBalanceManager: this.taskBalanceManager,
      taskLevelCompletionManager: this.taskLevelCompletionManager,
      taskStateEntityManager: this.taskStateEntityManager,
    });
  }

  initialize(ecsManagers) {
    this.taskStateEntityManager.initialize(ecsManagers);
  }

  applyRuntimeConfig(snapshot = {}) {
    const balance = parseGameConfig(snapshot, 'tasks');

    if (!balance) {
      return;
    }

    try {
      this.taskBalanceManager.setRuntimeBalance(balance);
      this.taskStateEntityManager.syncTaskEntities();
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

  getCurrentLevelCompletionSnapshot() {
    return this.taskLevelCompletionManager.getCurrentLevelCompletionSnapshot();
  }

  completeCurrentLevel() {
    return this.taskLevelCompletionManager.completeCurrentLevel();
  }

  getSnapshot() {
    return this.taskSnapshotManager.getSnapshot();
  }

  getPersistenceSnapshot() {
    return {
      currentLevel: this.taskStateEntityManager.getCurrentLevel(),
      tasks: this.taskStateEntityManager.getTaskStateSnapshots(),
    };
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') {
      return;
    }

    this.taskStateEntityManager.applySnapshot(snapshot);
  }
}
