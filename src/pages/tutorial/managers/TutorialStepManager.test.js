/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { TutorialStepManager, TUTORIAL_STEP_IDS } from './TutorialStepManager.js';

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
        selectedSlotNumber: null,
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
        completion: {
          canComplete: false,
          costGold: 10,
        },
        tasks: [
          {
            taskId: 'level1-sage-seeds',
            itemKey: 'sageSeed',
            requiredQuantity: 10,
            progressQuantity: 0,
            remainingQuantity: 10,
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

function getStep({ pageId = 'workshop', snapshot, dom, completed = [], progress } = {}) {
  const progressManager = progress ?? createProgressFake(completed);
  const manager = new TutorialStepManager({
    progressManager,
    getCurrentPageId: () => pageId,
  });

  return manager.getActiveStep({
    snapshot: snapshot ?? createSnapshot(),
    dom: dom ?? createDomFake(),
  });
}

function completedThrough(stepId) {
  const index = TUTORIAL_STEP_IDS.indexOf(stepId);
  return index >= 0 ? TUTORIAL_STEP_IDS.slice(0, index + 1) : [];
}

function createLevelOneTaskCompleteSnapshot(overrides = {}) {
  return createSnapshot({
    tasks: {
      currentLevel: 1,
      level: {
        completion: {
          canComplete: false,
          costGold: 10,
        },
        tasks: [
          {
            taskId: 'level1-sage-seeds',
            itemKey: 'sageSeed',
            requiredQuantity: 10,
            progressQuantity: 10,
            remainingQuantity: 0,
            canFill: false,
            canComplete: false,
            completed: true,
          },
        ],
      },
    },
    ...overrides,
  });
}

describe('TutorialStepManager', () => {
  it('starts with Mira intro dialog', () => {
    expect(getStep()).toMatchObject({
      id: 'intro-welcome',
      kind: 'dialog',
      advanceOnClick: true,
      stepLabel: '1/19',
    });
  });

  it('does not suppress the guide for legacy skipped progress', () => {
    const progress = createProgressFake();
    progress.isSkipped = () => true;

    const step = getStep({ progress });

    expect(step).toMatchObject({
      id: 'intro-welcome',
      kind: 'dialog',
    });
  });

  it('highlights mana sphere after the welcome', () => {
    expect(
      getStep({
        completed: ['intro-welcome'],
      }),
    ).toMatchObject({
      id: 'intro-mana-sphere',
      kind: 'prompt',
      targetId: 'workshop:manaSphere',
      advanceOnClick: true,
      showPointer: false,
      stepLabel: '2/19',
    });
  });

  it('hides first summon prompt while waiting for mana', () => {
    expect(
      getStep({
        completed: ['intro-welcome', 'intro-mana-sphere'],
      }),
    ).toBeNull();
  });

  it('points at summon once mana is ready', () => {
    const snapshot = createSnapshot({
      seedSummoning: {
        canSummon: true,
        cost: 10,
      },
    });

    expect(
      getStep({
        snapshot,
        completed: ['intro-welcome', 'intro-mana-sphere'],
      }),
    ).toMatchObject({
      id: 'first-summon-seed',
      kind: 'prompt',
      targetId: 'workshop:summonSeed',
      text: 'use your mana to summon seeds.',
      stepLabel: '3/19',
    });
  });

  it('teaches the first fill before switching to objective mode', () => {
    const snapshot = createSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 1 }],
      tasks: {
        currentLevel: 1,
        level: {
          completion: { canComplete: false, costGold: 10 },
          tasks: [
            {
              taskId: 'level1-sage-seeds',
              itemKey: 'sageSeed',
              requiredQuantity: 10,
              progressQuantity: 0,
              remainingQuantity: 10,
              canFill: true,
              canComplete: false,
              completed: false,
            },
          ],
        },
      },
    });

    expect(
      getStep({
        snapshot,
        dom: createDomFake({ tasksExpanded: true }),
        completed: ['intro-welcome', 'intro-mana-sphere', 'first-summon-seed'],
      }),
    ).toMatchObject({
      id: 'first-fill-seed-task',
      kind: 'prompt',
      targetId: 'task:level1-sage-seeds',
      text: 'fill task',
      stepLabel: '4/19',
    });
  });

  it('uses objective progress for the rest of the seed task', () => {
    const snapshot = createSnapshot({
      seedSummoning: {
        canSummon: true,
        cost: 10,
      },
      tasks: {
        currentLevel: 1,
        level: {
          completion: { canComplete: false, costGold: 10 },
          tasks: [
            {
              taskId: 'level1-sage-seeds',
              itemKey: 'sageSeed',
              requiredQuantity: 10,
              progressQuantity: 1,
              remainingQuantity: 9,
              canFill: false,
              canComplete: false,
              completed: false,
            },
          ],
        },
      },
    });

    expect(
      getStep({
        snapshot,
        dom: createDomFake({ tasksExpanded: true }),
        completed: completedThrough('first-fill-seed-task'),
      }),
    ).toMatchObject({
      id: 'finish-seed-task',
      kind: 'objective',
      targetId: 'workshop:summonSeed',
      objectiveText: 'summon seeds and fill the level task',
      progress: { value: 1, max: 10 },
      progressLabel: '1/10 seeds',
      stepLabel: '5/19',
    });
  });

  it('introduces the market after the seed task is complete', () => {
    const snapshot = createLevelOneTaskCompleteSnapshot();

    expect(getStep({ snapshot })).toMatchObject({
      id: 'intro-market',
      kind: 'dialog',
      advanceOnClick: true,
      stepLabel: '6/19',
    });
  });

  it('asks for one seed to sell before opening market when inventory is empty', () => {
    const snapshot = createLevelOneTaskCompleteSnapshot({
      seedSummoning: {
        canSummon: true,
        cost: 10,
      },
    });

    expect(
      getStep({
        snapshot,
        completed: completedThrough('intro-market'),
      }),
    ).toMatchObject({
      id: 'prepare-seed-sale',
      kind: 'objective',
      targetId: 'workshop:summonSeed',
      objectiveText: 'summon one seed to sell',
      progressLabel: '0/1 seed',
    });
  });

  it('points at market after a seed exists for sale', () => {
    const snapshot = createLevelOneTaskCompleteSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 1 }],
    });

    expect(
      getStep({
        snapshot,
        completed: completedThrough('prepare-seed-sale'),
      }),
    ).toMatchObject({
      id: 'open-market',
      kind: 'objective',
      targetId: 'page:shop',
      hintText: 'open market',
      objectiveText: 'start selling sage seeds in market',
    });
  });

  it('targets sage seed inside the market picker', () => {
    const snapshot = createLevelOneTaskCompleteSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 1 }],
      shop: {
        shelf: {
          selectedSlotNumber: 1,
          slots: [{ slotNumber: 1, unlocked: true, sellKey: null }],
        },
      },
    });

    expect(
      getStep({
        pageId: 'shop',
        snapshot,
        dom: createDomFake({ shopSellPopupOpen: true }),
        completed: completedThrough('select-market-stand'),
      }),
    ).toMatchObject({
      id: 'select-sage-seed-sale',
      kind: 'objective',
      targetId: 'shop:sell:sageSeed',
      hintText: 'choose sage seed',
      stepLabel: '10/19',
    });
  });

  it('runs tutorial sale objective after sage seed sale is selected', () => {
    const snapshot = createLevelOneTaskCompleteSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 1 }],
      shop: {
        shelf: {
          selectedSlotNumber: 1,
          slots: [{ slotNumber: 1, unlocked: true, sellKey: 'sageSeed' }],
        },
      },
    });

    expect(
      getStep({
        pageId: 'shop',
        snapshot,
        completed: completedThrough('select-sage-seed-sale'),
      }),
    ).toMatchObject({
      id: 'earn-tutorial-gold',
      kind: 'objective',
      effect: 'tutorial-sale',
      sale: {
        itemKey: 'sageSeed',
        goldEach: 10,
        goldTarget: 10,
      },
      progressLabel: '0/10 gold',
      stepLabel: '11/19',
    });
  });

  it('requires unselecting seed sale after tutorial gold is earned', () => {
    const snapshot = createLevelOneTaskCompleteSnapshot({
      gold: { current: 10 },
      shop: {
        shelf: {
          selectedSlotNumber: 1,
          slots: [{ slotNumber: 1, unlocked: true, sellKey: 'sageSeed' }],
        },
      },
    });

    expect(
      getStep({
        pageId: 'shop',
        snapshot,
        dom: createDomFake({ shopSellPopupOpen: true }),
        completed: completedThrough('earn-tutorial-gold'),
      }),
    ).toMatchObject({
      id: 'unselect-sage-seed-sale',
      kind: 'objective',
      targetId: 'shop:sell:empty',
      hintText: 'choose empty',
      progressLabel: '0/1 unselected',
    });
  });

  it('targets level up after gold is earned and sale is unselected', () => {
    const snapshot = createLevelOneTaskCompleteSnapshot({
      gold: { current: 10 },
      tasks: {
        currentLevel: 1,
        level: {
          completion: {
            canComplete: true,
            costGold: 10,
          },
          tasks: [
            {
              taskId: 'level1-sage-seeds',
              itemKey: 'sageSeed',
              requiredQuantity: 10,
              progressQuantity: 10,
              remainingQuantity: 0,
              canFill: false,
              canComplete: false,
              completed: true,
            },
          ],
        },
      },
      shop: {
        shelf: {
          selectedSlotNumber: 1,
          slots: [{ slotNumber: 1, unlocked: true, sellKey: null }],
        },
      },
    });

    expect(
      getStep({
        snapshot,
        dom: createDomFake({ tasksExpanded: true }),
        completed: completedThrough('unselect-sage-seed-sale'),
      }),
    ).toMatchObject({
      id: 'level-up-one',
      kind: 'objective',
      targetId: 'workshop:levelUp',
      objectiveText: 'return to workshop and level up',
      stepLabel: '13/19',
    });
  });

  it('continues the same objective style for garden', () => {
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

    expect(getStep({ pageId: 'garden', snapshot })).toMatchObject({
      id: 'grow-sage',
      kind: 'objective',
      targetId: 'garden:plot:1:label',
      objectiveText: 'grow sage in garden',
      progressLabel: '0/1 sage',
      stepLabel: '14/19',
    });
  });

  it('points at mint seed research on level 3', () => {
    const snapshot = createSnapshot({
      tasks: { currentLevel: 3, level: { tasks: [] } },
    });

    expect(getStep({ pageId: 'research', snapshot })).toMatchObject({
      id: 'research-mint-seed',
      kind: 'objective',
      targetId: 'research:unlockSeed:mintSeed',
      objectiveText: 'research mint seed',
      stepLabel: '17/19',
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

    expect(getStep({ pageId: 'brewing', snapshot })).toMatchObject({
      id: 'brew-mana-tonic',
      kind: 'objective',
      targetId: 'brewing:recipes',
      hintText: 'select recipe',
      stepLabel: '19/19',
    });
  });

  it('auto-completes all steps for players already past brewing introduction', () => {
    const progress = createProgressFake();
    const manager = new TutorialStepManager({
      progressManager: progress,
      getCurrentPageId: () => 'workshop',
    });

    const step = manager.getActiveStep({
      snapshot: createSnapshot({
        tasks: {
          currentLevel: 5,
          level: {
            tasks: [],
          },
        },
      }),
      dom: createDomFake(),
    });

    expect(step).toBeNull();
    expect(progress.completedStepIds).toEqual(new Set(TUTORIAL_STEP_IDS));
  });
});
