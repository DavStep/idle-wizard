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
    completeMany: (stepIds) => stepIds.forEach((stepId) => completed.add(stepId)),
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
      currentLevel: 1,
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
      text: 'tasks show what the room needs',
      stepLabel: '1/5',
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
      id: 'grow-sage',
      targetId: 'garden:seed:sageSeed',
      text: 'choose sage seed',
      stepLabel: '4/5',
    });
  });

  it('hides the grow lesson while sage is still growing', () => {
    const snapshot = createSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 0 }],
      garden: {
        seeds: [{ key: 'sageSeed', quantity: 0 }],
        herbs: [{ key: 'sageHerb', quantity: 0 }],
        plot: {
          tiles: [
            {
              tileNumber: 1,
              unlocked: true,
              phase: 'growing',
              selectedSeedItemTypeId: 1,
            },
          ],
        },
      },
    });
    const step = getStep({
      pageId: 'garden',
      snapshot,
      completed: ['open-tasks', 'research-sage-seed', 'summon-first-seed'],
    });

    expect(step).toBeNull();
  });

  it('targets ready sage for harvest inside the combined grow lesson', () => {
    const snapshot = createSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 0 }],
      garden: {
        seeds: [{ key: 'sageSeed', quantity: 0 }],
        herbs: [{ key: 'sageHerb', quantity: 0 }],
        plot: {
          tiles: [
            {
              tileNumber: 1,
              unlocked: true,
              phase: 'ready',
              selectedSeedItemTypeId: 1,
            },
          ],
        },
      },
    });
    const step = getStep({
      pageId: 'garden',
      snapshot,
      completed: ['open-tasks', 'research-sage-seed', 'summon-first-seed'],
    });

    expect(step).toMatchObject({
      id: 'grow-sage',
      targetId: 'garden:plot:1',
      text: 'harvest sage',
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
      dom: createDomFake({ tasksExpanded: true }),
      completed: ['open-tasks', 'research-sage-seed', 'summon-first-seed', 'grow-sage'],
    });

    expect(step).toMatchObject({
      id: 'finish-first-task',
      targetId: 'task:level1-sage-herb',
      text: 'fill task',
      stepLabel: '5/5',
    });
  });

  it('auto-completes for players already on level 2', () => {
    const progress = createProgressFake();
    const manager = new TutorialStepManager({
      progressManager: progress,
      getCurrentPageId: () => 'workshop',
    });
    const step = manager.getActiveStep({
      snapshot: createSnapshot({
        tasks: {
          currentLevel: 2,
          level: {
            tasks: [],
          },
        },
      }),
      dom: createDomFake(),
    });

    expect(step).toBeNull();
    expect(progress.completedStepIds).toEqual(
      new Set([
        'open-tasks',
        'research-sage-seed',
        'summon-first-seed',
        'grow-sage',
        'finish-first-task',
      ]),
    );
  });

  it('keeps level 1 old completed tasks from ending the whole tutorial', () => {
    const snapshot = createSnapshot({
      tasks: {
        currentLevel: 1,
        level: {
          tasks: [
            {
              taskId: 'level1-sage-seeds',
              progressQuantity: 20,
              canFill: false,
              canComplete: false,
              completed: true,
            },
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
    const step = getStep({ snapshot });

    expect(step).toMatchObject({
      id: 'finish-first-task',
      targetId: 'workshop:tasks',
      text: 'open tasks',
    });
  });
});
