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
  recipePopupOpen = false,
  shopSellPopupOpen = false,
} = {}) {
  return {
    isBrewingRecipePopupOpen: () => recipePopupOpen,
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
      stepLabel: '1/12',
    });
  });

  it('does not suppress the guide for legacy skipped progress', () => {
    const progress = createProgressFake();
    progress.isSkipped = () => true;
    const manager = new TutorialStepManager({
      progressManager: progress,
      getCurrentPageId: () => 'workshop',
    });

    const step = manager.getActiveStep({
      snapshot: createSnapshot(),
      dom: createDomFake(),
    });

    expect(step).toMatchObject({
      id: 'open-tasks',
      targetId: 'workshop:tasks',
    });
  });

  it('hides while waiting for mana before seed task can be filled', () => {
    const step = getStep({
      dom: createDomFake({ tasksExpanded: true }),
      completed: ['open-tasks'],
    });

    expect(step).toBeNull();
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
      reminderKey: 'fill-sage-seed-task-actions',
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
      reminderKey: 'fill-sage-seed-task-actions',
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
      stepLabel: '3/12',
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
      stepLabel: '4/12',
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
      stepLabel: '5/12',
    });
  });

  it('targets level up after enough gold is earned', () => {
    const snapshot = createSnapshot({
      gold: { current: 10 },
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
      stepLabel: '6/12',
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
      stepLabel: '7/12',
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

  it('points at the sage herb task after sage has been grown', () => {
    const snapshot = createSnapshot({
      tasks: {
        currentLevel: 2,
        level: {
          tasks: [
            {
              taskId: 'level2-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 6,
              progressQuantity: 0,
              canFill: true,
              canComplete: false,
              completed: false,
            },
          ],
        },
      },
      garden: {
        herbs: [{ key: 'sageHerb', quantity: 1 }],
      },
    });
    const step = getStep({
      pageId: 'workshop',
      snapshot,
      dom: createDomFake({ tasksExpanded: true }),
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
      id: 'fill-sage-herb-task',
      targetId: 'task:level2-sage-herb',
      text: 'fill sage task',
      stepLabel: '8/12',
    });
  });

  it('points at level two completion once garden tasks are complete', () => {
    const snapshot = createSnapshot({
      tasks: {
        currentLevel: 2,
        level: {
          completion: {
            canComplete: true,
          },
          tasks: [
            {
              taskId: 'level2-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 6,
              progressQuantity: 6,
              canFill: false,
              canComplete: false,
              completed: true,
            },
          ],
        },
      },
    });
    const step = getStep({
      pageId: 'workshop',
      snapshot,
      dom: createDomFake({ tasksExpanded: true }),
      completed: [
        'open-tasks',
        'fill-sage-seed-task',
        'open-market',
        'select-sage-seed-sale',
        'earn-level-one-gold',
        'level-up-one',
        'grow-sage',
        'fill-sage-herb-task',
      ],
    });

    expect(step).toMatchObject({
      id: 'level-up-two',
      targetId: 'workshop:levelUp',
      text: 'level up',
      stepLabel: '9/12',
    });
  });

  it('points at mint seed research on level 3', () => {
    const snapshot = createSnapshot({
      tasks: { currentLevel: 3, level: { tasks: [] } },
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
        'fill-sage-herb-task',
        'level-up-two',
      ],
    });

    expect(step).toMatchObject({
      id: 'research-mint-seed',
      targetId: 'research:unlockSeed:mintSeed',
      text: 'research mint seed',
      stepLabel: '10/12',
    });
  });

  it('points at mana tonic research on level 4', () => {
    const snapshot = createSnapshot({
      tasks: { currentLevel: 4, level: { tasks: [] } },
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
        'fill-sage-herb-task',
        'level-up-two',
        'research-mint-seed',
      ],
    });

    expect(step).toMatchObject({
      id: 'research-mana-tonic',
      targetId: 'research:unlockRecipe:manaTonic',
      text: 'research mana tonic',
      stepLabel: '11/12',
    });
  });

  it('points at mana tonic recipe selection before brewing', () => {
    const snapshot = createSnapshot({
      tasks: { currentLevel: 4, level: { tasks: [] } },
      research: {
        completedResearchIds: ['unlockRecipe:manaTonic'],
      },
      brewing: {
        ingredients: [],
        canBrew: false,
      },
    });
    const step = getStep({
      pageId: 'brewing',
      snapshot,
      completed: [
        'open-tasks',
        'fill-sage-seed-task',
        'open-market',
        'select-sage-seed-sale',
        'earn-level-one-gold',
        'level-up-one',
        'grow-sage',
        'fill-sage-herb-task',
        'level-up-two',
        'research-mint-seed',
        'research-mana-tonic',
      ],
    });

    expect(step).toMatchObject({
      id: 'brew-mana-tonic',
      targetId: 'brewing:recipes',
      text: 'select recipe',
      stepLabel: '12/12',
    });
  });

  it('points at brew action after mana tonic ingredients are staged', () => {
    const snapshot = createSnapshot({
      tasks: { currentLevel: 4, level: { tasks: [] } },
      research: {
        completedResearchIds: ['unlockRecipe:manaTonic'],
      },
      brewing: {
        ingredients: [{ key: 'sageHerb' }],
        canBrew: true,
      },
    });
    const step = getStep({
      pageId: 'brewing',
      snapshot,
      completed: [
        'open-tasks',
        'fill-sage-seed-task',
        'open-market',
        'select-sage-seed-sale',
        'earn-level-one-gold',
        'level-up-one',
        'grow-sage',
        'fill-sage-herb-task',
        'level-up-two',
        'research-mint-seed',
        'research-mana-tonic',
      ],
    });

    expect(step).toMatchObject({
      id: 'brew-mana-tonic',
      targetId: 'brewing:action',
      text: 'brew mana tonic',
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
      id: 'grow-sage',
      targetId: 'page:garden',
      text: 'open garden',
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
