import { describe, expect, it } from 'vitest';
import { TaskQuestProgressManager } from './TaskQuestProgressManager.js';

describe('TaskQuestProgressManager', () => {
  it('shows only the first incomplete task as the active request', () => {
    const manager = new TaskQuestProgressManager();
    const snapshot = manager.getSnapshot({
      currentLevel: 2,
      maxLevel: 10,
      tasks: [
        { taskId: 'done', completed: true },
        { taskId: 'active', completed: false },
        { taskId: 'later', completed: false },
      ],
      completion: { canComplete: false, costCoin: 4 },
    });

    expect(snapshot).toMatchObject({
      progress: 0.25,
      completedQuests: 1,
      totalQuests: 4,
      targetLevel: 3,
      activeQuest: {
        kind: 'task',
        taskId: 'active',
      },
    });
  });

  it('turns the coin payment into the final request', () => {
    const manager = new TaskQuestProgressManager();
    const snapshot = manager.getSnapshot({
      currentLevel: 2,
      maxLevel: 10,
      tasks: [
        { taskId: 'one', completed: true },
        { taskId: 'two', completed: true },
      ],
      completion: { canComplete: true, costCoin: 8 },
    });

    expect(snapshot).toMatchObject({
      progress: 2 / 3,
      completedQuests: 2,
      totalQuests: 3,
      activeQuest: {
        kind: 'levelUp',
        targetLevel: 3,
        costCoin: 8,
      },
    });
  });
});
