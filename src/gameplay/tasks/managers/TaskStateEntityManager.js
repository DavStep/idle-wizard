import {
  PlayerTaskLevel,
  PlayerTaskProgress,
} from '../components/TaskComponents.js';

export class TaskStateEntityManager {
  constructor({ taskBalanceManager }) {
    this.taskBalanceManager = taskBalanceManager;
    this.ecsManagers = null;
    this.levelEntityId = null;
    this.entityIdsByTaskId = new Map();
  }

  initialize(ecsManagers) {
    if (this.ecsManagers) {
      return;
    }

    this.ecsManagers = ecsManagers;
    this.levelEntityId = ecsManagers.entities.createEntity();
    ecsManagers.components.add(this.levelEntityId, PlayerTaskLevel);
    PlayerTaskLevel.currentLevel[this.levelEntityId] = this.taskBalanceManager.getInitialLevel();

    for (const task of this.taskBalanceManager.getTasks()) {
      const taskEntityId = ecsManagers.entities.createEntity();
      ecsManagers.components.add(taskEntityId, PlayerTaskProgress);
      PlayerTaskProgress.taskIndex[taskEntityId] = task.index;
      PlayerTaskProgress.progressQuantity[taskEntityId] = 0;
      PlayerTaskProgress.isCompleted[taskEntityId] = 0;
      this.entityIdsByTaskId.set(task.id, taskEntityId);
    }
  }

  getCurrentLevel() {
    return this.clampLevel(PlayerTaskLevel.currentLevel[this.levelEntityId]);
  }

  setCurrentLevel(levelNumber) {
    PlayerTaskLevel.currentLevel[this.levelEntityId] = this.clampLevel(levelNumber);
  }

  getProgress(taskId) {
    return PlayerTaskProgress.progressQuantity[this.getTaskEntityId(taskId)] ?? 0;
  }

  setProgress(taskId, quantity) {
    const task = this.taskBalanceManager.getTask(taskId);
    PlayerTaskProgress.progressQuantity[this.getTaskEntityId(taskId)] = Math.max(
      0,
      Math.min(task.requiredQuantity, Math.floor(quantity)),
    );
  }

  addProgress(taskId, quantity) {
    const safeQuantity = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
    this.setProgress(taskId, this.getProgress(taskId) + safeQuantity);
    return this.getProgress(taskId);
  }

  isCompleted(taskId) {
    return PlayerTaskProgress.isCompleted[this.getTaskEntityId(taskId)] === 1;
  }

  completeTask(taskId) {
    const task = this.taskBalanceManager.getTask(taskId);
    const levelBefore = this.getCurrentLevel();
    PlayerTaskProgress.isCompleted[this.getTaskEntityId(taskId)] = 1;

    if (task.level === levelBefore && this.areLevelTasksCompleted(levelBefore)) {
      this.setCurrentLevel(Math.min(levelBefore + 1, this.taskBalanceManager.getMaxLevel()));
    }

    return {
      levelBefore,
      levelAfter: this.getCurrentLevel(),
      advanced: this.getCurrentLevel() !== levelBefore,
      completedAllLevels: this.areAllLevelsCompleted(),
    };
  }

  areLevelTasksCompleted(levelNumber) {
    return this.taskBalanceManager
      .getLevelTasks(levelNumber)
      .every((task) => this.isCompleted(task.id));
  }

  areAllLevelsCompleted() {
    return this.areLevelTasksCompleted(this.taskBalanceManager.getMaxLevel());
  }

  getTaskStateSnapshots() {
    return this.taskBalanceManager.getTasks().map((task) => ({
      taskId: task.id,
      progressQuantity: this.getProgress(task.id),
      completed: this.isCompleted(task.id),
    }));
  }

  applySnapshot(snapshot = {}) {
    const savedTasks = Array.isArray(snapshot.tasks) ? snapshot.tasks : [];
    const savedTasksById = new Map(
      savedTasks
        .filter((task) => task && typeof task.taskId === 'string')
        .map((task) => [task.taskId, task]),
    );

    for (const task of this.taskBalanceManager.getTasks()) {
      const savedTask = savedTasksById.get(task.id);
      const progressQuantity = Number.isFinite(savedTask?.progressQuantity)
        ? savedTask.progressQuantity
        : 0;
      const completed = Boolean(savedTask?.completed);
      this.setProgress(task.id, completed ? task.requiredQuantity : progressQuantity);
      PlayerTaskProgress.isCompleted[this.getTaskEntityId(task.id)] =
        completed && this.getProgress(task.id) >= task.requiredQuantity ? 1 : 0;
    }

    if (Number.isInteger(snapshot.currentLevel)) {
      this.setCurrentLevel(snapshot.currentLevel);
      return;
    }

    this.setCurrentLevel(this.getFirstIncompleteLevel());
  }

  getFirstIncompleteLevel() {
    for (const level of this.taskBalanceManager.getLevels()) {
      if (!this.areLevelTasksCompleted(level.level)) {
        return level.level;
      }
    }

    return this.taskBalanceManager.getMaxLevel();
  }

  getTaskEntityId(taskId) {
    const entityId = this.entityIdsByTaskId.get(taskId);

    if (entityId === undefined) {
      throw new Error(`Unknown task: ${taskId}`);
    }

    return entityId;
  }

  clampLevel(levelNumber) {
    if (!Number.isInteger(levelNumber)) {
      return this.taskBalanceManager.getInitialLevel();
    }

    return Math.max(
      this.taskBalanceManager.getInitialLevel(),
      Math.min(levelNumber, this.taskBalanceManager.getMaxLevel()),
    );
  }
}
