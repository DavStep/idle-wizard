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

function createLevelTwoReadySnapshot(overrides = {}) {
  return createSnapshot({
    gold: {
      current: 10,
    },
    tasks: {
      currentLevel: 2,
      level: {
        completion: {
          canComplete: true,
          costGold: 40,
        },
        tasks: [
          {
            taskId: 'level2-sage-herb',
            itemKey: 'sageHerb',
            requiredQuantity: 6,
            progressQuantity: 6,
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
      stepLabel: '1/23',
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
      stepLabel: '2/23',
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
      stepLabel: '3/23',
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
      stepLabel: '4/23',
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
      stepLabel: '5/23',
    });
  });

  it('points seed task objective at mana sphere while waiting for summon mana', () => {
    const snapshot = createSnapshot({
      seedSummoning: {
        canSummon: false,
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
      targetId: 'workshop:manaSphere',
      hintText: 'wait for mana',
    });
  });

  it('introduces the market after the seed task is complete', () => {
    const snapshot = createLevelOneTaskCompleteSnapshot();

    expect(getStep({ snapshot })).toMatchObject({
      id: 'intro-market',
      kind: 'dialog',
      advanceOnClick: true,
      stepLabel: '6/23',
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
      stepLabel: '10/23',
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
      stepLabel: '11/23',
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
      stepLabel: '13/23',
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
      stepLabel: '14/23',
    });
  });

  it('sends a short sage task to garden when a sage seed is available', () => {
    const snapshot = createSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 1 }],
      tasks: {
        currentLevel: 2,
        level: {
          completion: { canComplete: false, costGold: 40 },
          tasks: [
            {
              taskId: 'level2-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 6,
              progressQuantity: 1,
              remainingQuantity: 5,
              canFill: false,
              canComplete: false,
              completed: false,
            },
          ],
        },
      },
    });

    expect(getStep({ snapshot })).toMatchObject({
      id: 'fill-sage-herb-task',
      kind: 'objective',
      targetId: 'page:garden',
      hintText: 'open garden',
      objectiveText: 'fill the sage level task',
      progressLabel: '1/6 sage',
    });
  });

  it('sends a short sage task to summon when no sage source exists', () => {
    const snapshot = createSnapshot({
      seedSummoning: {
        canSummon: true,
        cost: 10,
      },
      tasks: {
        currentLevel: 2,
        level: {
          completion: { canComplete: false, costGold: 40 },
          tasks: [
            {
              taskId: 'level2-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 6,
              progressQuantity: 1,
              remainingQuantity: 5,
              canFill: false,
              canComplete: false,
              completed: false,
            },
          ],
        },
      },
    });

    expect(getStep({ snapshot })).toMatchObject({
      id: 'fill-sage-herb-task',
      kind: 'objective',
      targetId: 'workshop:summonSeed',
      hintText: 'summon seed',
    });
  });

  it('redirects level two gold shortfall to market before level up', () => {
    const snapshot = createLevelTwoReadySnapshot();

    expect(getStep({ snapshot })).toMatchObject({
      id: 'level-up-two',
      kind: 'objective',
      targetId: 'page:shop',
      hintText: 'open market',
      objectiveText: 'earn level-up gold in market',
      progress: { value: 10, max: 40 },
      progressLabel: '10/40 gold',
      stepLabel: '16/23',
    });
  });

  it('points at the market stand while earning level two gold', () => {
    const snapshot = createLevelTwoReadySnapshot();

    expect(getStep({ pageId: 'shop', snapshot })).toMatchObject({
      id: 'level-up-two',
      kind: 'objective',
      targetId: 'shop:stand:1',
      hintText: 'sell for gold',
      objectiveText: 'earn level-up gold in market',
      progressLabel: '10/40 gold',
      stepLabel: '16/23',
    });
  });

  it('returns level two players to the level-up button once gold is ready', () => {
    const snapshot = createLevelTwoReadySnapshot({
      gold: {
        current: 40,
      },
    });

    expect(
      getStep({
        snapshot,
        dom: createDomFake({ tasksExpanded: true }),
      }),
    ).toMatchObject({
      id: 'level-up-two',
      kind: 'objective',
      targetId: 'workshop:levelUp',
      hintText: 'level up',
      objectiveText: 'level up again',
      progressLabel: '1/1 ready',
      stepLabel: '16/23',
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
      stepLabel: '17/23',
    });
  });

  it('keeps Mira active for the level three mint seed task after research', () => {
    const snapshot = createSnapshot({
      seedInventory: [{ key: 'mintSeed', quantity: 3 }],
      research: {
        completedResearchIds: ['unlockSeed:mintSeed'],
      },
      tasks: {
        currentLevel: 3,
        level: {
          completion: { canComplete: false, costGold: 80 },
          tasks: [
            {
              taskId: 'level3-sage-seeds',
              itemKey: 'sageSeed',
              requiredQuantity: 40,
              progressQuantity: 40,
              remainingQuantity: 0,
              canFill: false,
              canComplete: false,
              completed: true,
            },
            {
              taskId: 'level3-mint-seeds',
              itemKey: 'mintSeed',
              requiredQuantity: 10,
              progressQuantity: 7,
              remainingQuantity: 3,
              canFill: true,
              canComplete: false,
              completed: false,
            },
            {
              taskId: 'level3-mint-herb',
              itemKey: 'mintHerb',
              requiredQuantity: 18,
              progressQuantity: 0,
              remainingQuantity: 18,
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
      }),
    ).toMatchObject({
      id: 'fill-mint-seed-task',
      kind: 'objective',
      targetId: 'task:level3-mint-seeds',
      hintText: 'fill task',
      objectiveText: 'fill the mint seed task',
      progressLabel: '7/10 mint seeds',
      stepLabel: '18/23',
    });
  });

  it('sends the level three mint herb task to garden after mint seeds are filled', () => {
    const snapshot = createSnapshot({
      seedInventory: [{ key: 'mintSeed', quantity: 1 }],
      garden: {
        seeds: [{ key: 'mintSeed', quantity: 1 }],
        herbs: [{ key: 'mintHerb', quantity: 0 }],
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
      research: {
        completedResearchIds: ['unlockSeed:mintSeed'],
      },
      tasks: {
        currentLevel: 3,
        level: {
          completion: { canComplete: false, costGold: 80 },
          tasks: [
            {
              taskId: 'level3-mint-seeds',
              itemKey: 'mintSeed',
              requiredQuantity: 10,
              progressQuantity: 10,
              remainingQuantity: 0,
              canFill: false,
              canComplete: false,
              completed: true,
            },
            {
              taskId: 'level3-mint-herb',
              itemKey: 'mintHerb',
              requiredQuantity: 18,
              progressQuantity: 0,
              remainingQuantity: 18,
              canFill: false,
              canComplete: false,
              completed: false,
            },
          ],
        },
      },
    });

    expect(getStep({ snapshot })).toMatchObject({
      id: 'fill-mint-herb-task',
      kind: 'objective',
      targetId: 'page:garden',
      hintText: 'open garden',
      objectiveText: 'fill the mint level task',
      progressLabel: '0/18 mint',
      stepLabel: '19/23',
    });
  });

  it('keeps level three Mira active for level-up gold', () => {
    const snapshot = createSnapshot({
      gold: { current: 77 },
      research: {
        completedResearchIds: ['unlockSeed:mintSeed'],
      },
      tasks: {
        currentLevel: 3,
        level: {
          completion: { canComplete: true, costGold: 80 },
          tasks: [
            {
              taskId: 'level3-mint-seeds',
              itemKey: 'mintSeed',
              requiredQuantity: 10,
              progressQuantity: 10,
              remainingQuantity: 0,
              canFill: false,
              canComplete: false,
              completed: true,
            },
            {
              taskId: 'level3-mint-herb',
              itemKey: 'mintHerb',
              requiredQuantity: 18,
              progressQuantity: 18,
              remainingQuantity: 0,
              canFill: false,
              canComplete: false,
              completed: true,
            },
          ],
        },
      },
    });

    expect(getStep({ snapshot })).toMatchObject({
      id: 'level-up-three',
      kind: 'objective',
      targetId: 'page:shop',
      hintText: 'open market',
      objectiveText: 'earn level-up gold in market',
      progressLabel: '77/80 gold',
      stepLabel: '20/23',
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
      stepLabel: '22/23',
    });
  });

  it('points at sage after the first mana tonic so the cauldron can be refilled', () => {
    const snapshot = createSnapshot({
      inventory: [{ key: 'manaTonic', quantity: 1 }],
      tasks: { currentLevel: 4, level: { tasks: [] } },
      research: {
        completedResearchIds: ['unlockRecipe:manaTonic'],
      },
      brewing: {
        ingredients: [],
        canAddIngredient: true,
        activeBrew: null,
        herbs: [
          {
            key: 'sageHerb',
            quantity: 15,
            availableQuantity: 15,
          },
        ],
      },
    });

    expect(
      getStep({
        pageId: 'brewing',
        snapshot,
        completed: completedThrough('brew-mana-tonic'),
      }),
    ).toMatchObject({
      id: 'refill-mana-tonic-cauldron',
      kind: 'objective',
      targetId: 'brewing:herb:sageHerb',
      hintText: 'tap sage to fill cauldron. recipes care about order',
      objectiveText: 'fill the cauldron again',
      progress: { value: 0, max: 3 },
      progressLabel: '0/3 sage',
      stepLabel: '23/23',
    });
  });

  it('points at brew again once the mana tonic cauldron is full', () => {
    const snapshot = createSnapshot({
      inventory: [{ key: 'manaTonic', quantity: 1 }],
      tasks: { currentLevel: 4, level: { tasks: [] } },
      research: {
        completedResearchIds: ['unlockRecipe:manaTonic'],
      },
      brewing: {
        canBrew: true,
        canAddIngredient: true,
        activeBrew: null,
        herbs: [
          {
            key: 'sageHerb',
            quantity: 15,
            availableQuantity: 12,
          },
        ],
        ingredients: [
          { key: 'sageHerb' },
          { key: 'sageHerb' },
          { key: 'sageHerb' },
        ],
      },
    });

    expect(
      getStep({
        pageId: 'brewing',
        snapshot,
        completed: completedThrough('brew-mana-tonic'),
      }),
    ).toMatchObject({
      id: 'refill-mana-tonic-cauldron',
      targetId: 'brewing:action',
      hintText: 'brew again',
      progressLabel: '3/3 sage',
      stepLabel: '23/23',
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
