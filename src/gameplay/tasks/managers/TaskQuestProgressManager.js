export class TaskQuestProgressManager {
  getSnapshot({
    currentLevel,
    maxLevel,
    tasks = [],
    completion = null,
    completedAllLevels = false,
  } = {}) {
    const atMaxLevel = completedAllLevels || currentLevel >= maxLevel;
    const activeTask = tasks.find((task) => !task.completed) ?? null;
    const taskQuestCount = tasks.length;
    const hasLevelUpQuest = !atMaxLevel && Number(completion?.costCoin) > 0;
    const totalQuests = taskQuestCount + (hasLevelUpQuest ? 1 : 0);
    const completedQuests = tasks.filter((task) => task.completed).length;
    const targetLevel = atMaxLevel ? currentLevel : currentLevel + 1;
    const activeQuest = this.getActiveQuest({
      activeTask,
      completion,
      currentLevel,
      targetLevel,
      atMaxLevel,
      hasLevelUpQuest,
    });
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

  getActiveQuest({
    activeTask,
    completion,
    currentLevel,
    targetLevel,
    atMaxLevel,
    hasLevelUpQuest,
  }) {
    if (activeTask) {
      return {
        kind: 'task',
        taskId: activeTask.taskId,
        progress: Math.max(0, Math.min(1, Number(activeTask.progress) || 0)),
      };
    }

    if (!atMaxLevel && hasLevelUpQuest && completion?.canComplete) {
      return {
        kind: 'levelUp',
        taskId: `level-${currentLevel}-level-up`,
        targetLevel,
        costCoin: completion.costCoin,
      };
    }

    return null;
  }
}
