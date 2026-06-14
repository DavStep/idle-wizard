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
    gold: {
      current: 0,
    },
    shop: {
      shelf: {
        slots: [],
      },
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
            taskId: 'level1-sage-seeds',
            requiredQuantity: 10,
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

function createDomFake({
  tasksExpanded = false,
  seedPopupOpen = false,
  shopSellPopupOpen = false,
} = {}) {
  return {
    isGardenSeedPopupOpen: () => seedPopupOpen,
    isShopSellPopupOpen: () => shopSellPopupOpen,
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
      stepLabel: '1/8',
    });
  });

  it('waits on mana sphere before seed task can be filled', () => {
    const step = getStep({
      dom: createDomFake({ tasksExpanded: true }),
      completed: ['open-tasks'],
    });

    expect(step).toMatchObject({
      id: 'fill-sage-seed-task',
      targetId: 'workshop:manaSphere',
      text: 'wait for mana',
      stepLabel: '2/8',
    });
  });

  it('targets summon seed once mana is ready for seed task', () => {
    const snapshot = createSnapshot({
      seedSummoning: {
        canSummon: true,
        cost: 10,
      },
    });
    const step = getStep({
      snapshot,
      dom: createDomFake({ tasksExpanded: true }),
      completed: ['open-tasks'],
    });

    expect(step).toMatchObject({
      id: 'fill-sage-seed-task',
      targetId: 'workshop:summonSeed',
      text: 'summon seed',
    });
  });

  it('targets the level-one seed task when it can be filled', () => {
    const snapshot = createSnapshot({
      tasks: {
        currentLevel: 1,
        level: {
          tasks: [
            {
              taskId: 'level1-sage-seeds',
              requiredQuantity: 10,
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
      completed: ['open-tasks'],
    });

    expect(step).toMatchObject({
      id: 'fill-sage-seed-task',
      targetId: 'task:level1-sage-seeds',
      text: 'fill task',
    });
  });

  it('points at market after the seed task is complete', () => {
    const snapshot = createSnapshot({
      tasks: {
        currentLevel: 1,
        level: {
          tasks: [
            {
              taskId: 'level1-sage-seeds',
              requiredQuantity: 10,
              progressQuantity: 10,
              canFill: false,
              canComplete: false,
              completed: true,
            },
          ],
        },
      },
    });
    const step = getStep({ snapshot });

    expect(step).toMatchObject({
      id: 'open-market',
      targetId: 'page:shop',
      text: 'open market',
      stepLabel: '3/8',
    });
  });

  it('targets the sage seed sale row inside market picker', () => {
    const snapshot = createSnapshot({
      tasks: {
        currentLevel: 1,
        level: {
          tasks: [
            {
              taskId: 'level1-sage-seeds',
              requiredQuantity: 10,
              progressQuantity: 10,
              canFill: false,
              canComplete: false,
              completed: true,
            },
          ],
        },
      },
    });
    const step = getStep({
      pageId: 'shop',
      snapshot,
      dom: createDomFake({ shopSellPopupOpen: true }),
      completed: ['open-tasks', 'fill-sage-seed-task', 'open-market'],
    });

    expect(step).toMatchObject({
      id: 'select-sage-seed-sale',
      targetId: 'shop:sell:sageSeed',
      text: 'choose sage seed',
      stepLabel: '4/8',
    });
  });

  it('waits for level-one gold after sage seed sale is selected', () => {
    const snapshot = createSnapshot({
      tasks: {
        currentLevel: 1,
        level: {
          tasks: [
            {
              taskId: 'level1-sage-seeds',
              requiredQuantity: 10,
              progressQuantity: 10,
              canFill: false,
              canComplete: false,
              completed: true,
            },
          ],
        },
      },
      shop: {
        shelf: {
          slots: [{ unlocked: true, sellKey: 'sageSeed' }],
        },
      },
    });
    const step = getStep({
      pageId: 'shop',
      snapshot,
      completed: ['open-tasks', 'fill-sage-seed-task', 'open-market', 'select-sage-seed-sale'],
    });

    expect(step).toMatchObject({
      id: 'earn-level-one-gold',
      targetId: 'shop:stand:1',
      text: 'sell sage seeds',
      stepLabel: '5/8',
    });
  });

  it('targets level up after enough gold is earned', () => {
    const snapshot = createSnapshot({
      gold: { current: 15 },
      tasks: {
        currentLevel: 1,
        level: {
          completion: {
            canComplete: true,
          },
          tasks: [
            {
              taskId: 'level1-sage-seeds',
              requiredQuantity: 10,
              progressQuantity: 10,
              canFill: false,
              canComplete: false,
              completed: true,
            },
          ],
        },
      },
    });
    const step = getStep({
      snapshot,
      dom: createDomFake({ tasksExpanded: true }),
      completed: [
        'open-tasks',
        'fill-sage-seed-task',
        'open-market',
        'select-sage-seed-sale',
        'earn-level-one-gold',
      ],
    });

    expect(step).toMatchObject({
      id: 'level-up-one',
      targetId: 'workshop:levelUp',
      text: 'level up',
      stepLabel: '6/8',
    });
  });

  it('targets the garden seed popup row when choosing sage seed', () => {
    const snapshot = createSnapshot({
      tasks: { currentLevel: 2, level: { tasks: [] } },
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
      completed: [
        'open-tasks',
        'fill-sage-seed-task',
        'open-market',
        'select-sage-seed-sale',
        'earn-level-one-gold',
        'level-up-one',
      ],
    });

    expect(step).toMatchObject({
      id: 'grow-sage',
      targetId: 'garden:seed:sageSeed',
      text: 'choose sage seed',
      stepLabel: '7/8',
    });
  });

  it('hides the grow lesson while sage is still growing', () => {
    const snapshot = createSnapshot({
      tasks: { currentLevel: 2, level: { tasks: [] } },
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
      completed: [
        'open-tasks',
        'fill-sage-seed-task',
        'open-market',
        'select-sage-seed-sale',
        'earn-level-one-gold',
        'level-up-one',
      ],
    });

    expect(step).toBeNull();
  });

  it('targets ready sage for harvest inside the combined grow lesson', () => {
    const snapshot = createSnapshot({
      tasks: { currentLevel: 2, level: { tasks: [] } },
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
      completed: [
        'open-tasks',
        'fill-sage-seed-task',
        'open-market',
        'select-sage-seed-sale',
        'earn-level-one-gold',
        'level-up-one',
      ],
    });

    expect(step).toMatchObject({
      id: 'grow-sage',
      targetId: 'garden:plot:1',
      text: 'harvest sage',
    });
  });

  it('points at mint seed research after sage has been grown', () => {
    const snapshot = createSnapshot({
      tasks: { currentLevel: 2, level: { tasks: [] } },
      garden: {
        herbs: [{ key: 'sageHerb', quantity: 1 }],
      },
    });
    const step = getStep({
      pageId: 'research',
      snapshot,
      completed: [
        'open-tasks',
        'fill-sage-seed-task',
        'open-market',
        'select-sage-seed-sale',
        'earn-level-one-gold',
        'level-up-one',
        'grow-sage',
      ],
    });

    expect(step).toMatchObject({
      id: 'research-mint-seed',
      targetId: 'research:unlockSeed:mintSeed',
      text: 'research mint seed',
      stepLabel: '8/8',
    });
  });

  it('auto-completes level-one steps for players already on level 2', () => {
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

    expect(step).toMatchObject({
      id: 'research-mint-seed',
      targetId: 'page:research',
      text: 'open research',
    });
    expect(progress.completedStepIds).toEqual(
      new Set([
        'open-tasks',
        'fill-sage-seed-task',
        'open-market',
        'select-sage-seed-sale',
        'earn-level-one-gold',
        'level-up-one',
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
              requiredQuantity: 10,
              progressQuantity: 10,
              canFill: false,
              canComplete: false,
              completed: true,
            },
          ],
        },
      },
    });
    const step = getStep({ snapshot });

    expect(step).toMatchObject({
      id: 'open-market',
      targetId: 'page:shop',
      text: 'open market',
    });
  });
});
