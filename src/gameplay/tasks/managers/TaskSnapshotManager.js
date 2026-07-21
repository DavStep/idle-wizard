export class TaskSnapshotManager {
  constructor({
    itemsFacade,
    taskBalanceManager,
    taskLevelCompletionManager,
    taskQuestProgressManager,
    taskStateEntityManager,
  }) {
    this.itemsFacade = itemsFacade;
    this.taskBalanceManager = taskBalanceManager;
    this.taskLevelCompletionManager = taskLevelCompletionManager;
    this.taskQuestProgressManager = taskQuestProgressManager;
    this.taskStateEntityManager = taskStateEntityManager;
  }

  getSnapshot() {
    const currentLevel = this.taskStateEntityManager.getCurrentLevel();
    const maxLevel = this.taskBalanceManager.getMaxLevel();
    const tasks = this.taskBalanceManager
      .getCurrentLevelTasks(currentLevel)
      .map((task) => this.getTaskSnapshot(task));
    const completedTasks = tasks.filter((task) => task.completed).length;
    const completion = this.taskLevelCompletionManager.getCurrentLevelCompletionSnapshot();
    const completedAllLevels = this.taskStateEntityManager.areAllLevelsCompleted();
    const questProgress = this.taskQuestProgressManager.getSnapshot({
      currentLevel,
      maxLevel,
      tasks,
      completion,
      completedAllLevels,
    });
    const activeTaskId = questProgress.activeQuest?.kind === 'task'
      ? questProgress.activeQuest.taskId
      : null;

    return {
      currentLevel,
      maxLevel,
      completedAllLevels,
      level: {
        level: currentLevel,
        completedTasks,
        totalTasks: tasks.length,
        completion,
        questProgress,
        tasks: tasks.map((task) => ({
          ...task,
          isActiveQuest: task.taskId === activeTaskId,
          canFill: task.taskId === activeTaskId && task.canFill,
        })),
      },
    };
  }

  getTaskSnapshot(task) {
    const progressQuantity = this.taskStateEntityManager.getProgress(task.id);
    const completed = this.taskStateEntityManager.isCompleted(task.id);
    const ownedQuantity = Number.isInteger(task.itemTypeId)
      ? this.itemsFacade.getItemQuantity(task.itemTypeId)
      : 0;
    const remainingQuantity = Math.max(0, task.requiredQuantity - progressQuantity);
    const maxed = progressQuantity >= task.requiredQuantity;
    const isTurnIn = task.type === 'turnIn';

    return {
      taskId: task.id,
      level: task.level,
      action: task.action,
      type: task.type,
      researchId: task.researchId,
      itemTypeId: task.itemTypeId,
      itemKey: task.itemKey,
      itemLabel: task.itemLabel,
      itemKind: task.itemKind,
      targetLabel: task.targetLabel,
      requirementLabel: task.requirementLabel,
      requiredQuantity: task.requiredQuantity,
      progressQuantity,
      remainingQuantity,
      ownedQuantity,
      progress: task.requiredQuantity <= 0 ? 1 : progressQuantity / task.requiredQuantity,
      maxed,
      completed,
      canFill: isTurnIn && !completed && !maxed && ownedQuantity > 0,
      canComplete: false,
      autoProgress: !isTurnIn,
    };
  }
}
