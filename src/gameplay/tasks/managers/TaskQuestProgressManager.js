export const MAIN_QUEST_XP_REWARD = 20;

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
    const requiredXp = totalQuests * MAIN_QUEST_XP_REWARD;
    const currentXp = completedQuests * MAIN_QUEST_XP_REWARD;
    const targetLevel = atMaxLevel ? currentLevel : currentLevel + 1;

    return {
      currentXp,
      requiredXp,
      progress: requiredXp > 0 ? currentXp / requiredXp : 1,
      xpPerQuest: MAIN_QUEST_XP_REWARD,
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
        xpReward: MAIN_QUEST_XP_REWARD,
      };
    }

    if (!atMaxLevel && completion?.canComplete) {
      return {
        kind: 'levelUp',
        taskId: `level-${currentLevel}-level-up`,
        targetLevel,
        costCoin: completion.costCoin,
        xpReward: MAIN_QUEST_XP_REWARD,
      };
    }

    return null;
  }
}
