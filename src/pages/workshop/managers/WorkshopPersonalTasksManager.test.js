// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { WorkshopPersonalTasksManager } from './WorkshopPersonalTasksManager.js';

function createPersonalTasksSnapshot() {
  const taskDefinitions = [
    ['summon', 'summon_seeds', 'summon 10 seeds'],
    ['mana', 'spend_mana', 'spend 100 mana'],
    ['plant', 'plant_seeds', 'plant 6 seeds'],
    ['harvest', 'harvest_herbs', 'harvest 8 herbs'],
    ['brew', 'brew_potions', 'brew 3 potions'],
    ['sell', 'sell_items', 'sell 30 items'],
    ['gold', 'earn_gold', 'earn 150 gold'],
  ];
  const task = ([taskKey, actionType, label], index, completed = false) => ({
    taskId: `task-${index}`,
    taskKey,
    actionType,
    label,
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
          gold: 25,
          crystal: 0,
          text: '+25 gold',
        },
        fullClearRewardClaimed: false,
        tasks: taskDefinitions.map((definition, index) =>
          task(definition, index + 1, index === 0),
        ),
      },
      weekly: {
        periodType: 'weekly',
        periodKey: 'weekly-1',
        anchorLevel: 4,
        resetLabel: 'resets 3d',
        completedTasks: 0,
        totalTasks: 7,
        fullClearReward: {
          gold: 95,
          crystal: 1,
          text: '+95 gold, +1 crystal',
        },
        fullClearRewardClaimed: false,
        tasks: taskDefinitions.map((definition, index) => task(definition, index + 1)),
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
  it('renders the unlocked character button and popup task rows', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new WorkshopPersonalTasksManager({ gameplayFacade });
    const parent = document.createElement('div');
    const popupParent = document.createElement('div');

    manager.mount(parent, popupParent);

    expect(parent.querySelector('.workshop-page__personal-tasks').hidden).toBe(false);
    expect(parent.querySelector('.workshop-page__personal-tasks.style-box')).toBeNull();
    const openButton = parent.querySelector('.workshop-page__personal-tasks-open');
    expect(openButton?.textContent).toBe('tasks');
    expect(openButton?.getAttribute('aria-label')).toContain(
      'daily 1/7, weekly 0/7',
    );
    expect(
      openButton?.querySelector('.workshop-page__personal-tasks-character')?.getAttribute('src'),
    ).toContain('miso.webp');
    expect(parent.textContent).not.toContain('daily');
    expect(parent.textContent).not.toContain('weekly');

    openButton.click();

    const popup = popupParent.querySelector('.workshop-page__personal-tasks-popup');
    expect(popup.hidden).toBe(false);
    expect(
      popup
        .querySelector('.workshop-page__personal-tasks-dialog-character')
        ?.getAttribute('src'),
    ).toContain('miso.webp');
    expect(popup.querySelectorAll('.workshop-page__personal-task-row')).toHaveLength(8);
    expect(popup.querySelectorAll('.workshop-page__personal-task')).toHaveLength(8);
    expect(popup.querySelectorAll('.workshop-page__personal-task-bar')).toHaveLength(8);
    expect(
      popup.querySelector('.workshop-page__personal-task-fill')?.style.width,
    ).toBe('100%');
    expect(popup.textContent).toContain('summon 10 seeds');
    expect(popup.textContent).toContain('+25 gold');
    expect(
      popup
        .querySelector('.workshop-page__personal-task--full .workshop-page__personal-task-reward')
        ?.dataset.resourceColor,
    ).toBe('gold');
    const completedLabel = popup.querySelector(
      '.workshop-page__personal-task.is-completed .workshop-page__personal-task-label',
    );
    expect(completedLabel?.dataset.resourceColor).toBeUndefined();
    expect(completedLabel?.querySelector('.style-seed-label__icon')).not.toBeNull();

    popup
      .querySelector('.workshop-page__personal-tasks-tab-button[aria-selected="false"]')
      .click();

    expect(popup.textContent).toContain('0/7 done, resets 3d');
    expect(popup.textContent).toContain('+95 gold, +1 crystal');
    expect(
      [...popup.querySelectorAll('.workshop-page__personal-task-label')]
        .slice(0, 7)
        .map((label) => label.dataset.resourceColor ?? null),
    ).toEqual(['seed', 'mana', 'seed', 'herb', 'potion', 'gold', 'gold']);
    expect(
      [...popup.querySelectorAll('.workshop-page__personal-task-progress')]
        .slice(0, 7)
        .map((progress) => progress.dataset.resourceColor ?? null),
    ).toEqual(['seed', 'mana', 'seed', 'herb', 'potion', 'gold', 'gold']);
    expect(
      [...popup.querySelectorAll('.workshop-page__personal-task-reward')]
        .slice(0, 7)
        .map((reward) => reward.dataset.resourceColor ?? null),
    ).toEqual(['gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold']);
    const weeklyLabels = [
      ...popup.querySelectorAll('.workshop-page__personal-task-label'),
    ].slice(0, 7);
    expect(weeklyLabels.map((label) => label.textContent)).toEqual([
      'summon 10 seeds',
      'spend 100 mana',
      'plant 6 seeds',
      'harvest 8 herbs',
      'brew 3 potions',
      'sell 30 items',
      'earn 150 gold',
    ]);
    expect(weeklyLabels[0].querySelector('.style-seed-label__icon')).not.toBeNull();
    expect(
      weeklyLabels[1].querySelector('.style-resource-label--mana .style-resource-label__icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('resource:mana');
    expect(weeklyLabels[2].querySelector('.style-seed-label__icon')).not.toBeNull();
    expect(weeklyLabels[3].querySelector('.style-herb-label__icon')).not.toBeNull();
    expect(weeklyLabels[3].dataset.itemIconKey).toBe('sageHerb');
    expect(weeklyLabels[4].querySelector('.style-potion-label__icon')).not.toBeNull();
    expect(
      weeklyLabels[5].querySelector('.style-resource-label--gold .style-resource-label__icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('resource:gold');
    expect(
      weeklyLabels[6].querySelector('.style-resource-label--gold .style-resource-label__icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('resource:gold');
    expect(
      popup
        .querySelector('.workshop-page__personal-task-reward .style-resource-label--gold')
        ?.textContent,
    ).toBe('gold');
    expect(
      popup
        .querySelector('.workshop-page__personal-task--full .workshop-page__personal-task-reward')
        ?.dataset.resourceColor,
    ).toBeUndefined();
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
