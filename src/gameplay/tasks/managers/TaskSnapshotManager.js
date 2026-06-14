export class TaskSnapshotManager {
  constructor({
    itemsFacade,
    taskBalanceManager,
    taskLevelCompletionManager,
    taskStateEntityManager,
  }) {
    this.itemsFacade = itemsFacade;
    this.taskBalanceManager = taskBalanceManager;
    this.taskLevelCompletionManager = taskLevelCompletionManager;
    this.taskStateEntityManager = taskStateEntityManager;
  }

  getSnapshot() {
    const currentLevel = this.taskStateEntityManager.getCurrentLevel();
    const maxLevel = this.taskBalanceManager.getMaxLevel();
    const tasks = this.taskBalanceManager
      .getLevelTasks(currentLevel)
      .map((task) => this.getTaskSnapshot(task));
    const completedTasks = tasks.filter((task) => task.completed).length;

    return {
      currentLevel,
      maxLevel,
      completedAllLevels: this.taskStateEntityManager.areAllLevelsCompleted(),
      level: {
        level: currentLevel,
        completedTasks,
        totalTasks: tasks.length,
        completion: this.taskLevelCompletionManager.getCurrentLevelCompletionSnapshot(),
        tasks,
      },
    };
  }

  getTaskSnapshot(task) {
    const progressQuantity = this.taskStateEntityManager.getProgress(task.id);
    const completed = this.taskStateEntityManager.isCompleted(task.id);
    const ownedQuantity = this.itemsFacade.getItemQuantity(task.itemTypeId);
    const remainingQuantity = Math.max(0, task.requiredQuantity - progressQuantity);
    const maxed = progressQuantity >= task.requiredQuantity;

    return {
      taskId: task.id,
      level: task.level,
      action: task.action,
      itemTypeId: task.itemTypeId,
      itemKey: task.itemKey,
      itemLabel: task.itemLabel,
      itemKind: task.itemKind,
      requiredQuantity: task.requiredQuantity,
      progressQuantity,
      remainingQuantity,
      ownedQuantity,
      progress: task.requiredQuantity <= 0 ? 1 : progressQuantity / task.requiredQuantity,
      maxed,
      completed,
      canFill: !completed && !maxed && ownedQuantity > 0,
      canComplete: !completed && maxed,
    };
  }
}
