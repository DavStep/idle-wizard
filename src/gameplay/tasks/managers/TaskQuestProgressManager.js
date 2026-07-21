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
    const hasLevelUpQuest = !atMaxLevel;
    const totalQuests = taskQuestCount + (hasLevelUpQuest ? 1 : 0);
    const completedQuests = tasks.filter((task) => task.completed).length;
    const targetLevel = atMaxLevel ? currentLevel : currentLevel + 1;

    return {
      progress: totalQuests > 0 ? completedQuests / totalQuests : 1,
      completedQuests,
      totalQuests,
      targetLevel,
      activeQuest: this.getActiveQuest({
        activeTask,
        completion,
        currentLevel,
        targetLevel,
        atMaxLevel,
      }),
    };
  }

  getActiveQuest({ activeTask, completion, currentLevel, targetLevel, atMaxLevel }) {
    if (activeTask) {
      return {
        kind: 'task',
        taskId: activeTask.taskId,
      };
    }

    if (!atMaxLevel && completion?.canComplete) {
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
