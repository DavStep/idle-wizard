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
      this.createTaskEntity(task);
    }
  }

  syncTaskEntities() {
    if (!this.ecsManagers) {
      return;
    }

    for (const task of this.taskBalanceManager.getTasks()) {
      if (!this.entityIdsByTaskId.has(task.id)) {
        this.createTaskEntity(task);
        continue;
      }

      const entityId = this.getTaskEntityId(task.id);
      const completed = PlayerTaskProgress.isCompleted[entityId] === 1;
      PlayerTaskProgress.taskIndex[entityId] = task.index;
      PlayerTaskProgress.progressQuantity[entityId] = completed
        ? task.requiredQuantity
        : Math.min(PlayerTaskProgress.progressQuantity[entityId] ?? 0, task.requiredQuantity);
    }

    this.setCurrentLevel(this.getCurrentLevel());
  }

  createTaskEntity(task) {
    const taskEntityId = this.ecsManagers.entities.createEntity();
    this.ecsManagers.components.add(taskEntityId, PlayerTaskProgress);
    PlayerTaskProgress.taskIndex[taskEntityId] = task.index;
    PlayerTaskProgress.progressQuantity[taskEntityId] = 0;
    PlayerTaskProgress.isCompleted[taskEntityId] = 0;
    this.entityIdsByTaskId.set(task.id, taskEntityId);
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
    const levelBefore = this.getCurrentLevel();
    PlayerTaskProgress.isCompleted[this.getTaskEntityId(taskId)] = 1;

    return {
      levelBefore,
      levelAfter: this.getCurrentLevel(),
      advanced: false,
      completedAllLevels: this.areAllLevelsCompleted(),
    };
  }

  advanceCurrentLevel() {
    const levelBefore = this.getCurrentLevel();
    const levelAfter = Math.min(levelBefore + 1, this.taskBalanceManager.getMaxLevel());
    this.setCurrentLevel(levelAfter);

    return {
      levelBefore,
      levelAfter: this.getCurrentLevel(),
      advanced: this.getCurrentLevel() !== levelBefore,
      completedAllLevels: this.areAllLevelsCompleted(),
    };
  }

  areLevelTasksCompleted(levelNumber) {
    return this.taskBalanceManager
      .getCurrentLevelTasks(levelNumber)
      .every((task) => this.isCompleted(task.id));
  }

  areAllLevelsCompleted() {
    return this.getCurrentLevel() >= this.taskBalanceManager.getMaxLevel();
  }

  getTaskStateSnapshots() {
    return this.taskBalanceManager.getTasks().map((task) => ({
      taskId: task.id,
      progressQuantity: this.getProgress(task.id),
      completed: this.isCompleted(task.id),
    }));
  }

  getPersistenceTaskStateSnapshots() {
    const currentLevel = this.getCurrentLevel();

    return this.taskBalanceManager
      .getCurrentLevelTasks(currentLevel)
      .map((task) => ({
        taskId: task.id,
        progressQuantity: this.getProgress(task.id),
        completed: this.isCompleted(task.id),
      }))
      .filter((task) => task.progressQuantity > 0 || task.completed);
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
    const maxLevel = this.taskBalanceManager.getMaxLevel();

    for (
      let level = this.taskBalanceManager.getInitialLevel();
      level < maxLevel;
      level += 1
    ) {
      if (!this.areLevelTasksCompleted(level)) {
        return level;
      }
    }

    return maxLevel;
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
