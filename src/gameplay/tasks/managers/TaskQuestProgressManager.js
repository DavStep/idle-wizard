export class TaskQuestProgressManager {
  getSnapshot({
    currentLevel,
    maxLevel,
    tasks = [],
    completedAllLevels = false,
  } = {}) {
    const atMaxLevel = completedAllLevels || currentLevel >= maxLevel;
    const activeTask = tasks.find((task) => !task.completed) ?? null;
    const totalQuests = tasks.length;
    const completedQuests = tasks.filter((task) => task.completed).length;
    const targetLevel = atMaxLevel ? currentLevel : currentLevel + 1;
    const activeQuest = this.getActiveQuest(activeTask);
    const activeQuestProgress = activeQuest?.kind === 'task'
      ? Math.max(0, Math.min(1, Number(activeQuest.progress) || 0))
      : 0;

    return {
      progress: totalQuests > 0
        ? Math.min(1, (completedQuests + activeQuestProgress) / totalQuests)
        : 1,
      completedQuests,
      totalQuests,
      targetLevel,
      activeQuest,
    };
  }

  getActiveQuest(activeTask) {
    if (activeTask) {
      return {
        kind: 'task',
        taskId: activeTask.taskId,
        progress: Math.max(0, Math.min(1, Number(activeTask.progress) || 0)),
      };
    }

    return null;
  }
}
