// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { describe, expect, it, vi } from 'vitest';

import { WorkshopPersonalTasksManager } from './WorkshopPersonalTasksManager.js';

function createMilestone(threshold, { claimed = false, claimable = false } = {}) {
  return {
    milestoneId: `milestone-${threshold}`,
    threshold,
    reward: {
      coin: threshold,
      crystal: 0,
      text: `+${threshold} coin`,
    },
    claimed,
    claimable,
    unlocked: claimed || claimable,
  };
}

function createPersonalTasksSnapshot() {
  const taskDefinitions = [
    ['summon', 'summon_seeds', 'summon seeds', 10],
    ['mana', 'spend_mana', 'spend mana', 15],
    ['plant', 'plant_seeds', 'plant seeds', 10],
    ['harvest', 'harvest_herbs', 'harvest herbs', 15],
    ['brew', 'brew_potions', 'brew potions', 15],
    ['sell', 'sell_items', 'sell items', 15],
    ['coin', 'earn_coin', 'earn coin', 20],
  ];
  const task = ([taskKey, actionType, label, pointValue], index, completed = false) => ({
    taskId: `task-${index}`,
    taskKey,
    actionType,
    label,
    requiredQuantity: 10,
    progressQuantity: completed ? 10 : index,
    completed,
    pointValue,
  });

  return {
    personalTasks: {
      unlocked: true,
      unlockLevel: 4,
      claimableRewards: 1,
      hasClaimableRewards: true,
      daily: {
        periodType: 'daily',
        periodKey: '2026-06-20',
        anchorLevel: 4,
        resetLabel: 'resets 12h',
        currentPoints: 42,
        maxPoints: 100,
        progress: 0.42,
        completedTasks: 1,
        totalTasks: 7,
        rewards: [
          createMilestone(30, { claimed: true }),
          createMilestone(50, { claimable: true }),
          createMilestone(70),
          createMilestone(100),
        ],
        tasks: taskDefinitions.map((definition, index) =>
          task(definition, index + 1, index === 0),
        ),
      },
      weekly: {
        periodType: 'weekly',
        periodKey: 'weekly-1',
        anchorLevel: 4,
        resetLabel: 'resets 3d',
        currentPoints: 260,
        maxPoints: 700,
        progress: 260 / 700,
        completedTasks: 0,
        totalTasks: 0,
        rewards: [
          createMilestone(100, { claimed: true }),
          createMilestone(250, { claimed: true }),
          createMilestone(500),
          createMilestone(700),
        ],
        tasks: [],
      },
    },
  };
}

function createGameplayFacadeFake(snapshot = createPersonalTasksSnapshot()) {
  let currentSnapshot = snapshot;
  let listener = null;

  return {
    claimPersonalTaskMilestoneReward: vi.fn(),
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
  it('keeps the dialog width matched to the shared tabbed popup width', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const panelRule = baseCss.match(
      /\.workshop-page__personal-tasks-panel\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const dialogRule = baseCss.match(
      /\.style-dialog\.workshop-page__personal-tasks-dialog\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(panelRule).toMatch(/\bwidth:\s*var\(--style-tabbed-dialog-width\);/);
    expect(dialogRule).toMatch(/\bwidth:\s*260px;/);
  });

  it('gives the personal task frame the full tabbed dialog height', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const frameRule = baseCss.match(
      /\.workshop-page__personal-tasks-frame\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(frameRule).not.toMatch(/\b90px\b/);
    expect(frameRule).toMatch(/var\(--style-tabbed-dialog-content-height\)/);
  });

  it('renders daily quest rows in the tasks tab', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new WorkshopPersonalTasksManager({ gameplayFacade });
    const parent = document.createElement('div');
    const popupParent = document.createElement('div');

    manager.mount(parent, popupParent);

    expect(parent.querySelector('.workshop-page__personal-tasks').hidden).toBe(false);
    expect(parent.querySelector('.workshop-page__personal-tasks.style-box')).toBeNull();
    expect(parent.querySelector('.workshop-page__personal-tasks')?.dataset.panelSide).toBe(
      'left',
    );
    const openButton = parent.querySelector('.workshop-page__personal-tasks-open');
    expect(openButton?.textContent).toBe('tasks');
    expect(openButton?.getAttribute('aria-label')).toContain(
      'daily 1/7, today 42/100 points, week 260/700 points',
    );
    expect(openButton?.dataset.notification).toBe('true');
    expect(
      openButton?.querySelector('.workshop-page__personal-tasks-character')?.getAttribute('src'),
    ).toContain('miso.webp');

    openButton.click();

    const popup = popupParent.querySelector('.workshop-page__personal-tasks-popup');
    expect(popup.hidden).toBe(false);
    expect(popup.querySelector('.style-box__title')?.textContent).toBe('quests');
    expect(
      [...popup.querySelectorAll('.workshop-page__personal-tasks-tab-button')].map(
        (button) => `${button.textContent}:${button.getAttribute('aria-selected')}`,
      ),
    ).toEqual(['tasks:true', 'rewards:false']);
    expect(popup.textContent).toContain('today42/100 pts');
    expect(popup.textContent).toContain('week260/700 pts');
    expect(popup.textContent).toContain('daily quests');
    expect(popup.querySelectorAll('.workshop-page__personal-task-row')).toHaveLength(7);
    expect(popup.querySelectorAll('.workshop-page__personal-task-bar')).toHaveLength(7);
    expect(
      popup.querySelector('.workshop-page__personal-task-fill')?.style.width,
    ).toBe('100%');
    expect(popup.textContent).toContain('1.summon seeds+10 ptsdone');
    expect(popup.textContent).toContain('2.spend mana+15 pts2/10');
    expect(popup.textContent).not.toContain('+50 coin');
    expect(popup.querySelector('.workshop-page__personal-task-milestone')).toBeNull();
    const completedLabel = popup.querySelector(
      '.workshop-page__personal-task.is-completed .workshop-page__personal-task-label',
    );
    expect(completedLabel?.dataset.resourceColor).toBeUndefined();
    expect(completedLabel?.querySelector('.style-seed-label__icon')).not.toBeNull();
  });

  it('renders daily and weekly milestone rewards in the rewards tab', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new WorkshopPersonalTasksManager({ gameplayFacade });
    const parent = document.createElement('div');
    const popupParent = document.createElement('div');

    manager.mount(parent, popupParent);
    parent.querySelector('.workshop-page__personal-tasks-open').click();

    const popup = popupParent.querySelector('.workshop-page__personal-tasks-popup');
    popup
      .querySelector('.workshop-page__personal-tasks-tab-button[aria-selected="false"]')
      .click();

    expect(
      [...popup.querySelectorAll('.workshop-page__personal-tasks-tab-button')].map(
        (button) => `${button.textContent}:${button.getAttribute('aria-selected')}`,
      ),
    ).toEqual(['tasks:false', 'rewards:true']);
    expect(popup.textContent).toContain('today42/100 points, resets 12h');
    expect(popup.textContent).toContain('week260/700 points, resets 3d');
    expect(popup.querySelectorAll('.workshop-page__personal-task-milestone')).toHaveLength(
      8,
    );
    expect(popup.textContent).toContain('30+30 coinclaimed');
    expect(popup.textContent).toContain('50+50 coinclaim');
    expect(popup.textContent).toContain('500+500 coinlocked');

    const rewardsTab = popup.querySelector(
      '.workshop-page__personal-tasks-tab-button[aria-selected="true"]',
    );
    const claimButton = popup.querySelector(
      '.workshop-page__personal-task-milestone-claim',
    );

    expect(rewardsTab?.dataset.notification).toBe('true');
    expect(claimButton?.textContent).toBe('claim');
    expect(claimButton?.dataset.notification).toBe('true');
    expect(claimButton?.dataset.personalTaskPeriodType).toBe('daily');
    expect(claimButton?.dataset.personalTaskThreshold).toBe('50');

    claimButton.click();

    expect(gameplayFacade.claimPersonalTaskMilestoneReward).toHaveBeenCalledWith(
      'daily',
      50,
    );
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
