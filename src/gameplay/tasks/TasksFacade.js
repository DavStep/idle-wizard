import { TaskBalanceManager } from './managers/TaskBalanceManager.js';
import { TaskFillManager } from './managers/TaskFillManager.js';
import { TaskSnapshotManager } from './managers/TaskSnapshotManager.js';
import { TaskStateEntityManager } from './managers/TaskStateEntityManager.js';

export class TasksFacade {
  static explain =
    'Tasks give the wizard level goals: drop requested items into a task, finish all five tasks, then the player level rises.';

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
    this.taskSnapshotManager = new TaskSnapshotManager({
      itemsFacade,
      taskBalanceManager: this.taskBalanceManager,
      taskStateEntityManager: this.taskStateEntityManager,
    });
  }

  initialize(ecsManagers) {
    this.taskStateEntityManager.initialize(ecsManagers);
  }

  fillTask(taskId) {
    return this.taskFillManager.fillTask(taskId);
  }

  completeTask(taskId) {
    return this.taskFillManager.completeTask(taskId);
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
