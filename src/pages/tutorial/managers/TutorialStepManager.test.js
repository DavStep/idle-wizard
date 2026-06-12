/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { TutorialStepManager } from './TutorialStepManager.js';

function createProgressFake(completedStepIds = []) {
  const completed = new Set(completedStepIds);

  return {
    completedStepIds: completed,
    skipped: false,
    hasCompleted: (stepId) => completed.has(stepId),
    isSkipped: () => false,
    complete: (stepId) => completed.add(stepId),
  };
}

function createSnapshot(overrides = {}) {
  return {
    inventory: [],
    seedInventory: [{ key: 'sageSeed', quantity: 0 }],
    seedSummoning: {
      canSummon: false,
      cost: 10,
    },
    research: {
      completedResearchIds: [],
    },
    garden: {
      seeds: [{ key: 'sageSeed', quantity: 0 }],
      herbs: [{ key: 'sageHerb', quantity: 0 }],
      plot: {
        tiles: [
          {
            tileNumber: 1,
            unlocked: true,
            phase: 'empty',
            selectedSeedItemTypeId: null,
          },
        ],
      },
    },
    tasks: {
      level: {
        tasks: [
          {
            taskId: 'level1-sage-herb',
            progressQuantity: 0,
            canFill: false,
            canComplete: false,
            completed: false,
          },
        ],
      },
    },
    ...overrides,
  };
}

function createDomFake({ tasksExpanded = false, seedPopupOpen = false } = {}) {
  return {
    isGardenSeedPopupOpen: () => seedPopupOpen,
    isTasksExpanded: () => tasksExpanded,
  };
}

function getStep({ pageId = 'workshop', snapshot, dom, completed = [] } = {}) {
  const manager = new TutorialStepManager({
    progressManager: createProgressFake(completed),
    getCurrentPageId: () => pageId,
  });

  return manager.getActiveStep({
    snapshot: snapshot ?? createSnapshot(),
    dom: dom ?? createDomFake(),
  });
}

describe('TutorialStepManager', () => {
  it('starts by pointing at collapsed workshop tasks', () => {
    expect(getStep()).toMatchObject({
      id: 'open-tasks',
      targetId: 'workshop:tasks',
      text: 'open tasks',
    });
  });

  it('points at the room tab before targeting research on another page', () => {
    const step = getStep({
      dom: createDomFake({ tasksExpanded: true }),
      completed: ['open-tasks'],
    });

    expect(step).toMatchObject({
      id: 'research-sage-seed',
      targetId: 'page:research',
      text: 'open research',
    });
  });

  it('targets free sage seed research when already in research', () => {
    const step = getStep({
      pageId: 'research',
      dom: createDomFake({ tasksExpanded: true }),
      completed: ['open-tasks'],
    });

    expect(step).toMatchObject({
      id: 'research-sage-seed',
      targetId: 'research:unlockSeed:sageSeed',
      text: 'research sage seed',
    });
  });

  it('waits on mana sphere before summon is available', () => {
    const snapshot = createSnapshot({
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
    });
    const step = getStep({
      snapshot,
      completed: ['open-tasks', 'research-sage-seed'],
    });

    expect(step).toMatchObject({
      id: 'summon-first-seed',
      targetId: 'workshop:manaSphere',
      text: 'wait for mana',
    });
  });

  it('targets summon seed once mana is ready', () => {
    const snapshot = createSnapshot({
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
      seedSummoning: {
        canSummon: true,
        cost: 10,
      },
    });
    const step = getStep({
      snapshot,
      completed: ['open-tasks', 'research-sage-seed'],
    });

    expect(step).toMatchObject({
      id: 'summon-first-seed',
      targetId: 'workshop:summonSeed',
      text: 'summon seed',
    });
  });

  it('targets the garden seed popup row when choosing sage seed', () => {
    const snapshot = createSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 1 }],
      garden: {
        seeds: [{ key: 'sageSeed', quantity: 1 }],
        herbs: [{ key: 'sageHerb', quantity: 0 }],
        plot: {
          tiles: [
            {
              tileNumber: 1,
              unlocked: true,
              phase: 'empty',
              selectedSeedItemTypeId: null,
            },
          ],
        },
      },
    });
    const step = getStep({
      pageId: 'garden',
      snapshot,
      dom: createDomFake({ seedPopupOpen: true, tasksExpanded: true }),
      completed: ['open-tasks', 'research-sage-seed', 'summon-first-seed'],
    });

    expect(step).toMatchObject({
      id: 'plant-sage-seed',
      targetId: 'garden:seed:sageSeed',
      text: 'choose sage seed',
    });
  });

  it('shows fill task only when a task can consume owned items', () => {
    const snapshot = createSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 0 }],
      garden: {
        seeds: [{ key: 'sageSeed', quantity: 0 }],
        herbs: [{ key: 'sageHerb', quantity: 1 }],
        plot: {
          tiles: [
            {
              tileNumber: 1,
              unlocked: true,
              phase: 'empty',
              selectedSeedItemTypeId: 1,
            },
          ],
        },
      },
      tasks: {
        level: {
          tasks: [
            {
              taskId: 'level1-sage-herb',
              progressQuantity: 0,
              canFill: true,
              canComplete: false,
              completed: false,
            },
          ],
        },
      },
    });
    const step = getStep({
      snapshot,
      completed: [
        'open-tasks',
        'research-sage-seed',
        'summon-first-seed',
        'plant-sage-seed',
        'harvest-sage',
      ],
    });

    expect(step).toMatchObject({
      id: 'fill-first-task',
      targetId: 'task:level1-sage-herb',
      text: 'fill task',
    });
  });
});
