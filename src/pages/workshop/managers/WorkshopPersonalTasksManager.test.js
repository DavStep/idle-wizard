// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { WorkshopPersonalTasksManager } from './WorkshopPersonalTasksManager.js';

function createPersonalTasksSnapshot() {
  const task = (index, completed = false) => ({
    taskId: `task-${index}`,
    taskKey: `task-${index}`,
    actionType: 'summon_seeds',
    label: `task ${index}`,
    requiredQuantity: 10,
    progressQuantity: completed ? 10 : index,
    completed,
    reward: {
      gold: 5,
      crystal: 0,
      text: '+5 gold',
    },
    rewardClaimed: completed,
  });

  return {
    personalTasks: {
      unlocked: true,
      unlockLevel: 4,
      daily: {
        periodType: 'daily',
        periodKey: '2026-06-20',
        anchorLevel: 4,
        resetLabel: 'resets 12h',
        completedTasks: 1,
        totalTasks: 7,
        fullClearReward: {
          text: '+25 gold',
        },
        fullClearRewardClaimed: false,
        tasks: Array.from({ length: 7 }, (_, index) => task(index + 1, index === 0)),
      },
      weekly: {
        periodType: 'weekly',
        periodKey: 'weekly-1',
        anchorLevel: 4,
        resetLabel: 'resets 3d',
        completedTasks: 0,
        totalTasks: 7,
        fullClearReward: {
          text: '+95 gold, +1 crystal',
        },
        fullClearRewardClaimed: false,
        tasks: Array.from({ length: 7 }, (_, index) => task(index + 1)),
      },
    },
  };
}

function createGameplayFacadeFake(snapshot = createPersonalTasksSnapshot()) {
  let currentSnapshot = snapshot;
  let listener = null;

  return {
    getSnapshot: vi.fn(() => currentSnapshot),
    subscribe: vi.fn((callback) => {
      listener = callback;
      return vi.fn();
    }),
    emit(nextSnapshot) {
      currentSnapshot = nextSnapshot;
      listener?.(currentSnapshot);
    },
  };
}

describe('WorkshopPersonalTasksManager', () => {
  it('renders the unlocked summary and popup task rows', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new WorkshopPersonalTasksManager({ gameplayFacade });
    const parent = document.createElement('div');
    const popupParent = document.createElement('div');

    manager.mount(parent, popupParent);

    expect(parent.querySelector('.workshop-page__personal-tasks').hidden).toBe(false);
    expect(parent.textContent).toContain('daily');
    expect(parent.textContent).toContain('1/7');

    parent.querySelector('.workshop-page__personal-tasks-open').click();

    const popup = popupParent.querySelector('.workshop-page__personal-tasks-popup');
    expect(popup.hidden).toBe(false);
    expect(popup.querySelectorAll('.workshop-page__personal-task-row')).toHaveLength(8);
    expect(popup.textContent).toContain('task 1');
    expect(popup.textContent).toContain('+25 gold');

    popup
      .querySelector('.workshop-page__personal-tasks-tab-button[aria-selected="false"]')
      .click();

    expect(popup.textContent).toContain('0/7 done, resets 3d');
    expect(popup.textContent).toContain('+95 gold, +1 crystal');
  });

  it('hides and closes when personal tasks are locked', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new WorkshopPersonalTasksManager({ gameplayFacade });
    const parent = document.createElement('div');
    const popupParent = document.createElement('div');

    manager.mount(parent, popupParent);
    parent.querySelector('.workshop-page__personal-tasks-open').click();

    gameplayFacade.emit({
      personalTasks: {
        unlocked: false,
        unlockLevel: 4,
        daily: null,
        weekly: null,
      },
    });

    expect(parent.querySelector('.workshop-page__personal-tasks').hidden).toBe(true);
    expect(popupParent.querySelector('.workshop-page__personal-tasks-popup').hidden).toBe(
      true,
    );
  });
});
