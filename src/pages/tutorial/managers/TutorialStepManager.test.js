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
    coin: {
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
          costCoin: 10,
        },
        tasks: [
          {
            taskId: 'level1-sage-seeds',
            itemKey: 'sageSeed',
            requiredQuantity: 4,
            progressQuantity: 0,
            remainingQuantity: 4,
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
  tasksPinned = false,
  seedPopupOpen = false,
  recipePopupOpen = false,
  selectedBrewingRecipeKey = null,
  shopSellPopupOpen = false,
  shopDirectSellPopupOpen = false,
  directSellTabKind = 'seed',
  directSellItemKey = null,
  directSellQuantity = 1,
  username = 'wizard',
  usernameSettingsOpen = false,
  settingsThemeTabVisible = false,
  themeSettingsTabOpen = false,
} = {}) {
  return {
    getUsername: () => username,
    isBrewingRecipePopupOpen: () => recipePopupOpen,
    isBrewingRecipeSelected: (recipeKey) => selectedBrewingRecipeKey === recipeKey,
    isGardenSeedPopupOpen: () => seedPopupOpen,
    isShopDirectSellItemSelected: (itemKey) => directSellItemKey === itemKey,
    isShopDirectSellPopupOpen: () => shopDirectSellPopupOpen,
    isShopDirectSellTabSelected: (kind) => directSellTabKind === kind,
    getShopDirectSellQuantity: () => directSellQuantity,
    isShopSellPopupOpen: () => shopSellPopupOpen,
    isTasksExpanded: () => tasksExpanded,
    isTasksPinned: () => tasksPinned,
    isUsernameSettingsOpen: () => usernameSettingsOpen,
    isSettingsThemeTabVisible: () => settingsThemeTabVisible,
    isThemeSettingsTabOpen: () => themeSettingsTabOpen,
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
          costCoin: 10,
        },
        tasks: [
          {
            taskId: 'level1-sage-seeds',
            itemKey: 'sageSeed',
            requiredQuantity: 4,
            progressQuantity: 4,
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
    inventory: [{ key: 'sageHerb', quantity: 1 }],
    coin: {
      current: 10,
    },
    tasks: {
      currentLevel: 2,
      level: {
        completion: {
          canComplete: true,
          costCoin: 40,
        },
        tasks: [
          {
            taskId: 'level2-sage-herb',
            itemKey: 'sageHerb',
            requiredQuantity: 2,
            progressQuantity: 2,
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

function createLevelThreeMintHerbSnapshot({ seedQuantity = 1, tile = {} } = {}) {
  return createSnapshot({
    seedInventory: [{ key: 'mintSeed', quantity: seedQuantity }],
    garden: {
      seeds: [
        { key: 'sageSeed', quantity: 0 },
        { key: 'mintSeed', quantity: seedQuantity },
      ],
      herbs: [{ key: 'mintHerb', quantity: 0 }],
      plot: {
        tiles: [
          {
            tileNumber: 1,
            unlocked: true,
            phase: 'empty',
            selectedSeedItemTypeId: null,
            selectedSeedKey: null,
            selectedSeedLabel: null,
            seedKey: null,
            seedLabel: null,
            herbLabel: null,
            ...tile,
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
        completion: { canComplete: false, costCoin: 80 },
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
}

describe('TutorialStepManager', () => {
  it('starts with the purchase dialog before Elara opens the tutorial', () => {
    expect(getStep()).toMatchObject({
      id: 'purchase-house',
      kind: 'dialog',
      advanceOnClick: true,
      advanceLabel: 'purchase house 1000 coin',
      variant: 'intro-dialog',
      stepLabel: '1/32',
      revealTokens: [],
      text:
        "this old workshop is for sale.\n\nit needs work, but it can become a real potion shop.\n\nElara used to work here. she'll help you get started.",
    });
  });

  it('does not suppress the guide for legacy skipped progress', () => {
    const progress = createProgressFake();
    progress.isSkipped = () => true;

    const step = getStep({ progress });

    expect(step).toMatchObject({
      id: 'purchase-house',
      kind: 'dialog',
    });
  });

  it('introduces Elara after the house is purchased', () => {
    expect(
      getStep({
        completed: ['purchase-house'],
      }),
    ).toMatchObject({
      id: 'intro-welcome',
      kind: 'prompt',
      advanceOnClick: true,
      stepLabel: '2/32',
      revealTokens: [],
      text: "i'm Elara. let's get the workshop running.",
    });
  });

  it('highlights top-panel mana after the welcome', () => {
    expect(
      getStep({
        completed: completedThrough('intro-username-return'),
      }),
    ).toMatchObject({
      id: 'intro-mana-sphere',
      kind: 'prompt',
      targetId: 'top:mana',
      advanceOnClick: true,
      showPointer: false,
      revealTokens: ['top', 'mana'],
      stepLabel: '5/32',
    });
  });

  it('reveals the top panel and points at username after the introduction', () => {
    expect(
      getStep({
        completed: completedThrough('intro-welcome'),
      }),
    ).toMatchObject({
      id: 'intro-username',
      kind: 'prompt',
      targetId: 'top:username',
      cueMode: 'focus-target',
      revealTokens: ['top'],
      stepLabel: '3/32',
      text: "i don't need your name, but it would be nice to set it here.",
    });
  });

  it('continues the introduction after the username is set', () => {
    expect(
      getStep({
        completed: completedThrough('intro-welcome'),
        dom: createDomFake({ username: 'Mira' }),
      }),
    ).toMatchObject({
      id: 'intro-username-return',
      kind: 'prompt',
      advanceOnClick: true,
      revealTokens: ['top'],
      stepLabel: '4/32',
      text: "hi again, Mira. let's start with mana.",
    });
  });

  it('points at the username input while settings is open', () => {
    expect(
      getStep({
        completed: completedThrough('intro-welcome'),
        dom: createDomFake({ usernameSettingsOpen: true }),
      }),
    ).toMatchObject({
      id: 'intro-username',
      kind: 'prompt',
      targetId: 'top:username-input',
      cueMode: 'focus-target',
      revealTokens: ['top'],
      stepLabel: '3/32',
    });
  });

  it('keeps first summon guidance collapsed while waiting for mana', () => {
    expect(
      getStep({
        completed: completedThrough('intro-mana-sphere'),
      }),
    ).toMatchObject({
      id: 'first-summon-seed',
      kind: 'prompt',
      targetId: null,
      text: 'wait for mana',
      hintText: 'wait for mana',
      cueMode: 'passive',
      stepLabel: '6/32',
    });
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
        completed: completedThrough('intro-mana-sphere'),
      }),
    ).toMatchObject({
      id: 'first-summon-seed',
      kind: 'prompt',
      targetId: 'workshop:summonSeed',
      text: 'use your mana to summon seeds.',
      revealTokens: ['top', 'mana', 'summon'],
      stepLabel: '6/32',
    });
  });

  it('teaches the first fill before switching to objective mode', () => {
    const snapshot = createSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 1 }],
      tasks: {
        currentLevel: 1,
        level: {
          completion: { canComplete: false, costCoin: 10 },
          tasks: [
            {
              taskId: 'level1-sage-seeds',
              itemKey: 'sageSeed',
              requiredQuantity: 4,
              progressQuantity: 0,
              remainingQuantity: 4,
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
        completed: completedThrough('first-summon-seed'),
      }),
    ).toMatchObject({
      id: 'first-fill-seed-task',
      kind: 'prompt',
      targetId: 'task:level1-sage-seeds',
      text: 'turn in',
      stepLabel: '7/32',
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
          completion: { canComplete: false, costCoin: 10 },
          tasks: [
            {
              taskId: 'level1-sage-seeds',
              itemKey: 'sageSeed',
              requiredQuantity: 4,
              progressQuantity: 1,
              remainingQuantity: 3,
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
      objectiveText: 'summon and turn in sage seeds for the next level',
      progress: { value: 1, max: 4 },
      progressLabel: '1/4 seeds',
      stepLabel: '8/32',
    });
  });

  it('points seed task objective at top-panel mana while waiting for summon mana', () => {
    const snapshot = createSnapshot({
      seedSummoning: {
        canSummon: false,
        cost: 10,
      },
      tasks: {
        currentLevel: 1,
        level: {
          completion: { canComplete: false, costCoin: 10 },
          tasks: [
            {
              taskId: 'level1-sage-seeds',
              itemKey: 'sageSeed',
              requiredQuantity: 4,
              progressQuantity: 1,
              remainingQuantity: 3,
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
      targetId: 'top:mana',
      hintText: 'wait for mana',
    });
  });

  it('introduces the market after the seed task is complete', () => {
    const snapshot = createLevelOneTaskCompleteSnapshot();

    expect(getStep({ snapshot })).toMatchObject({
      id: 'intro-market',
      kind: 'dialog',
      text:
        'the front room is cleared out.\n\nyou can use it to trade what the workshop makes.',
      advanceLabel: 'continue',
      advanceOnClick: true,
      stepLabel: '9/32',
    });
  });

  it('keeps the market intro aligned with the next action when a sage seed is already ready', () => {
    const snapshot = createLevelOneTaskCompleteSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 1 }],
    });

    expect(getStep({ snapshot })).toMatchObject({
      id: 'intro-market',
      advanceLabel: 'open market',
      advancePageId: 'shop',
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

  it('does not mark sale prep complete before the seed task is done', () => {
    const progress = createProgressFake(completedThrough('first-fill-seed-task'));
    const snapshot = createSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 1 }],
      tasks: {
        currentLevel: 1,
        level: {
          completion: { canComplete: false, costCoin: 10 },
          tasks: [
            {
              taskId: 'level1-sage-seeds',
              itemKey: 'sageSeed',
              requiredQuantity: 4,
              progressQuantity: 1,
              remainingQuantity: 3,
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
        progress,
      }),
    ).toMatchObject({
      id: 'finish-seed-task',
    });
    expect(progress.completedStepIds.has('prepare-seed-sale')).toBe(false);
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
      objectiveText: 'sell sage seeds in market',
    });
  });

  it('asks to open fast sell after the player reaches market', () => {
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
        completed: completedThrough('open-market'),
      }),
    ).toMatchObject({
      id: 'select-market-stand',
      targetId: 'shop:directSell',
      progressLabel: '0/1 open',
    });
  });

  it('asks to open market before fast sell if the player leaves market', () => {
    const snapshot = createLevelOneTaskCompleteSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 1 }],
    });

    expect(
      getStep({
        pageId: 'workshop',
        snapshot,
        completed: completedThrough('open-market'),
      }),
    ).toMatchObject({
      id: 'select-market-stand',
      targetId: 'page:shop',
      objectiveText: 'open market',
      hintText: 'open market',
      progressLabel: '0/1 open',
    });
  });

  it('targets sage seed inside fast sell', () => {
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
        dom: createDomFake({ shopDirectSellPopupOpen: true }),
        completed: completedThrough('select-market-stand'),
      }),
    ).toMatchObject({
      id: 'select-sage-seed-sale',
      kind: 'objective',
      targetId: 'shop:directSell:sageSeed',
      hintText: 'choose sage seed',
      stepLabel: '13/32',
    });
  });

  it('shows the selected amount after sage seed fast sell item is selected', () => {
    const snapshot = createLevelOneTaskCompleteSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 1 }],
    });

    expect(
      getStep({
        pageId: 'shop',
        snapshot,
        dom: createDomFake({
          shopDirectSellPopupOpen: true,
          directSellItemKey: 'sageSeed',
        }),
        completed: completedThrough('select-sage-seed-sale'),
      }),
    ).toMatchObject({
      id: 'show-selected-sale-amount',
      kind: 'objective',
      targetId: 'shop:directSell:amount',
      objectiveText: 'this number is the amount selected to sell.',
      allowedPopupClasses: ['shop-page__direct-sell-popup'],
      showPointer: false,
      emphasizeTarget: true,
      autoAdvanceMs: 2000,
      stepLabel: '14/32',
    });
  });

  it('runs tutorial sale objective after the selected amount step finishes', () => {
    const snapshot = createLevelOneTaskCompleteSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 1 }],
    });

    expect(
      getStep({
        pageId: 'shop',
        snapshot,
        dom: createDomFake({
          shopDirectSellPopupOpen: true,
          directSellItemKey: 'sageSeed',
        }),
        completed: completedThrough('show-selected-sale-amount'),
      }),
    ).toMatchObject({
      id: 'earn-tutorial-coin',
      kind: 'objective',
      effect: 'tutorial-sale',
      targetId: 'shop:directSell:sell',
      hintText: 'press sell',
      sale: {
        itemKey: 'sageSeed',
        coinEach: 10,
        coinTarget: 10,
      },
      progressLabel: '0/10 coin',
      stepLabel: '15/32',
    });
  });

  it('skips old stand unselect after tutorial coin is earned', () => {
    const snapshot = createLevelOneTaskCompleteSnapshot({
      coin: { current: 10 },
    });

    expect(
      getStep({
        pageId: 'shop',
        snapshot,
        dom: createDomFake({ shopDirectSellPopupOpen: true }),
        completed: completedThrough('earn-tutorial-coin'),
      }),
    ).not.toMatchObject({
      id: 'unselect-sage-seed-sale',
    });
  });

  it('targets level up after coin is earned and sale is unselected', () => {
    const snapshot = createLevelOneTaskCompleteSnapshot({
      coin: { current: 10 },
      tasks: {
        currentLevel: 1,
        level: {
          completion: {
            canComplete: true,
            costCoin: 10,
          },
          tasks: [
            {
              taskId: 'level1-sage-seeds',
              itemKey: 'sageSeed',
              requiredQuantity: 4,
              progressQuantity: 4,
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
      stepLabel: '17/32',
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
      objectiveText: 'sage seed grows into sage. plant one, then harvest it.',
      progressLabel: '0/3 sage',
      cueMode: 'active',
      stepLabel: '19/32',
    });
  });

  it('keeps level two in workshop until there is a sage source for garden', () => {
    const snapshot = createSnapshot({
      seedSummoning: {
        canSummon: true,
        cost: 10,
      },
      seedInventory: [{ key: 'sageSeed', quantity: 0 }],
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
        currentLevel: 2,
        level: {
          completion: { canComplete: false, costCoin: 40 },
          tasks: [
            {
              taskId: 'level2-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 2,
              progressQuantity: 0,
              remainingQuantity: 2,
              canFill: false,
              canComplete: false,
              completed: false,
            },
            {
              taskId: 'level2-sage-seeds',
              itemKey: 'sageSeed',
              requiredQuantity: 7,
              progressQuantity: 0,
              remainingQuantity: 7,
              canFill: false,
              canComplete: false,
              completed: false,
            },
          ],
        },
      },
    });

    expect(getStep({ snapshot })).toMatchObject({
      id: 'grow-sage',
      targetId: 'workshop:tasks',
      hintText: 'open level 3 requirements',
      objectiveText:
        "now level 3 requires 2 sages and 7 sage seeds to level up. fussy little list. let's start growing sage.",
      autoPageId: null,
      progressLabel: '0/2 sage',
    });

    expect(
      getStep({
        snapshot,
        dom: createDomFake({ tasksExpanded: true }),
      }),
    ).toMatchObject({
      id: 'grow-sage',
      targetId: 'workshop:tasksPin',
      hintText: 'pin',
      objectiveText: 'pin level 3 requirements so they stay open.',
      autoPageId: null,
    });

    expect(
      getStep({
        snapshot,
        dom: createDomFake({ tasksExpanded: true, tasksPinned: true }),
      }),
    ).toMatchObject({
      id: 'grow-sage',
      targetId: 'workshop:summonSeed',
      hintText: 'summon seed',
      objectiveText: 'summon seed',
      autoPageId: null,
    });
  });

  it('opens level two requirements before sending the player to garden', () => {
    const snapshot = createSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 1 }],
      tasks: {
        currentLevel: 2,
        level: {
          completion: { canComplete: false, costCoin: 40 },
          tasks: [
            {
              taskId: 'level2-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 2,
              progressQuantity: 0,
              remainingQuantity: 2,
              canFill: false,
              canComplete: false,
              completed: false,
            },
            {
              taskId: 'level2-sage-seeds',
              itemKey: 'sageSeed',
              requiredQuantity: 7,
              progressQuantity: 0,
              remainingQuantity: 7,
              canFill: false,
              canComplete: false,
              completed: false,
            },
          ],
        },
      },
    });

    expect(getStep({ snapshot })).toMatchObject({
      id: 'intro-garden',
      kind: 'dialog',
      targetId: 'page:garden',
      text:
        'there is a small growing plot behind the house.\n\nyou can plant seeds there.',
      advanceLabel: 'open garden',
      advancePageId: 'garden',
      stepLabel: '18/32',
    });

    expect(getStep({ snapshot, completed: completedThrough('intro-garden') })).toMatchObject({
      id: 'grow-sage',
      targetId: 'workshop:tasks',
      hintText: 'open level 3 requirements',
      objectiveText:
        "now level 3 requires 2 sages and 7 sage seeds to level up. fussy little list. let's start growing sage.",
      autoPageId: null,
      progressLabel: '0/2 sage',
    });

    expect(
      getStep({
        snapshot,
        dom: createDomFake({ tasksExpanded: true }),
        completed: completedThrough('intro-garden'),
      }),
    ).toMatchObject({
      id: 'grow-sage',
      targetId: 'workshop:tasksPin',
      hintText: 'pin',
      autoPageId: null,
      objectiveText: 'pin level 3 requirements so they stay open.',
    });

    expect(
      getStep({
        snapshot,
        dom: createDomFake({ tasksExpanded: true, tasksPinned: true }),
        completed: completedThrough('intro-garden'),
      }),
    ).toMatchObject({
      id: 'grow-sage',
      targetId: 'page:garden',
      hintText: 'open garden',
      autoPageId: 'garden',
      objectiveText:
        "now level 3 requires 2 sages and 7 sage seeds to level up. fussy little list. let's start growing sage.",
    });

    expect(getStep({ pageId: 'garden', snapshot })).toMatchObject({
      id: 'grow-sage',
      targetId: 'garden:plot:1:label',
      hintText: 'choose sage seed',
      objectiveText:
        "now level 3 requires 2 sages and 7 sage seeds to level up. fussy little list. let's start growing sage.",
    });
  });

  it('keeps the grow sage objective until the sage requirement target is grown', () => {
    const snapshot = createSnapshot({
      tasks: {
        currentLevel: 2,
        level: {
          completion: { canComplete: false, costCoin: 40 },
          tasks: [
            {
              taskId: 'level2-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 2,
              progressQuantity: 1,
              remainingQuantity: 1,
              canFill: false,
              canComplete: false,
              completed: false,
            },
          ],
        },
      },
    });

    expect(getStep({ pageId: 'garden', snapshot })).toMatchObject({
      id: 'grow-sage',
      progress: { value: 1, max: 2 },
      objectiveText: 'keep going. grow sage 2 times.',
      progressLabel: '1/2 sage',
      cueMode: 'delayed-target',
    });
  });

  it('keeps grow sage visible while planted sage is growing', () => {
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
              seedKey: 'sageSeed',
              seedLabel: 'sage seed',
              herbLabel: 'sage',
            },
          ],
        },
      },
    });

    expect(getStep({ pageId: 'garden', snapshot })).toMatchObject({
      id: 'grow-sage',
      objectiveText: 'wait for sage to grow',
      targetId: null,
      progressLabel: '0/3 sage',
    });
  });

  it('targets ready planted sage instead of returning to workshop', () => {
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
              seedKey: 'sageSeed',
              seedLabel: 'sage seed',
              herbLabel: 'sage',
            },
          ],
        },
      },
    });

    expect(getStep({ pageId: 'garden', snapshot })).toMatchObject({
      id: 'grow-sage',
      kind: 'objective',
      targetId: 'garden:plot:1',
      hintText: 'harvest sage',
    });
  });

  it('skips grow-sage when owned sage can be turned in for the next requirement', () => {
    const snapshot = createSnapshot({
      tasks: {
        currentLevel: 2,
        level: {
          completion: { canComplete: false, costCoin: 40 },
          tasks: [
            {
              taskId: 'level2-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 2,
              progressQuantity: 0,
              remainingQuantity: 2,
              ownedQuantity: 1,
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
      id: 'fill-sage-herb-task',
      targetId: 'task:level2-sage-herb',
      hintText: 'turn in sage',
      objectiveText: 'good. now turn in sage for the next level.',
      progressLabel: '0/2 sage',
    });
  });

  it('guides the level two sage herb task right after the first gardening loop', () => {
    const snapshot = createSnapshot({
      tasks: {
        currentLevel: 2,
        level: {
          completion: { canComplete: false, costCoin: 40 },
          tasks: [
            {
              taskId: 'level2-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 2,
              progressQuantity: 1,
              remainingQuantity: 1,
              canFill: true,
              canComplete: false,
              completed: false,
            },
            {
              taskId: 'level2-sage-seeds',
              itemKey: 'sageSeed',
              requiredQuantity: 7,
              progressQuantity: 0,
              remainingQuantity: 7,
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
        completed: completedThrough('grow-sage'),
      }),
    ).toMatchObject({
      id: 'fill-sage-herb-task',
      kind: 'objective',
      targetId: 'task:level2-sage-herb',
      hintText: 'turn in sage',
      objectiveText: 'good. now turn in sage for the next level.',
      progressLabel: '1/2 sage',
      cueMode: 'delayed-target',
      stepLabel: '20/32',
    });
  });

  it('guides the level two sage seed task after the sage task is filled', () => {
    const snapshot = createSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 4 }],
      tasks: {
        currentLevel: 2,
        level: {
          completion: { canComplete: false, costCoin: 40 },
          tasks: [
            {
              taskId: 'level2-sage-seeds',
              itemKey: 'sageSeed',
              requiredQuantity: 7,
              progressQuantity: 4,
              remainingQuantity: 3,
              canFill: true,
              canComplete: false,
              completed: false,
            },
            {
              taskId: 'level2-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 2,
              progressQuantity: 2,
              remainingQuantity: 0,
              canFill: false,
              canComplete: false,
              completed: true,
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
      id: 'fill-sage-seed-task',
      kind: 'objective',
      targetId: 'task:level2-sage-seeds',
      hintText: 'turn in',
      objectiveText: 'and yes, the next level still requires sage seed.',
      progressLabel: '4/7 sage seeds',
      cueMode: 'delayed-target',
      stepLabel: '21/32',
    });
  });

  it('sends a short sage task to garden when a sage seed is available', () => {
    const snapshot = createSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 1 }],
      tasks: {
        currentLevel: 2,
        level: {
          completion: { canComplete: false, costCoin: 40 },
          tasks: [
            {
              taskId: 'level2-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 2,
              progressQuantity: 1,
              remainingQuantity: 1,
              canFill: false,
              canComplete: false,
              completed: false,
            },
          ],
        },
      },
    });

    expect(getStep({ snapshot, completed: completedThrough('grow-sage') })).toMatchObject({
      id: 'fill-sage-herb-task',
      kind: 'objective',
      targetId: 'page:garden',
      hintText: 'open garden',
      objectiveText: 'good. now turn in sage for the next level.',
      progressLabel: '1/2 sage',
      stepLabel: '20/32',
    });
  });

  it('keeps sage task guidance collapsed while another sage crop is growing', () => {
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
              seedKey: 'sageSeed',
              seedLabel: 'sage seed',
              herbLabel: 'sage',
            },
          ],
        },
      },
      tasks: {
        currentLevel: 2,
        level: {
          completion: { canComplete: false, costCoin: 40 },
          tasks: [
            {
              taskId: 'level2-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 2,
              progressQuantity: 1,
              remainingQuantity: 1,
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
        pageId: 'garden',
        snapshot,
        completed: completedThrough('grow-sage'),
      }),
    ).toMatchObject({
      id: 'fill-sage-herb-task',
      targetId: null,
      hintText: 'wait for sage to grow',
      objectiveText: 'wait for sage to grow',
      cueMode: 'passive',
      progressLabel: '1/2 sage',
      stepLabel: '20/32',
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
          completion: { canComplete: false, costCoin: 40 },
          tasks: [
            {
              taskId: 'level2-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 2,
              progressQuantity: 1,
              remainingQuantity: 1,
              canFill: false,
              canComplete: false,
              completed: false,
            },
          ],
        },
      },
    });

    expect(getStep({ snapshot, completed: completedThrough('grow-sage') })).toMatchObject({
      id: 'fill-sage-herb-task',
      kind: 'objective',
      targetId: 'workshop:summonSeed',
      hintText: 'summon seed',
      objectiveText: 'good. now turn in sage for the next level.',
    });
  });

  it('redirects level two coin shortfall to market before level up', () => {
    const snapshot = createLevelTwoReadySnapshot();

    expect(getStep({ snapshot })).toMatchObject({
      id: 'level-up-two',
      kind: 'objective',
      targetId: 'page:shop',
      hintText: 'open market',
      objectiveText: 'earn level-up coin in market',
      progress: { value: 10, max: 40 },
      progressLabel: '10/40 coin',
      stepLabel: '22/32',
    });
  });

  it('points at the market stand while earning level two coin', () => {
    const snapshot = createLevelTwoReadySnapshot();

    expect(getStep({ pageId: 'shop', snapshot })).toMatchObject({
      id: 'level-up-two',
      kind: 'objective',
      targetId: 'shop:directSell',
      hintText: 'fast sell',
      objectiveText: 'earn level-up coin in market',
      progressLabel: '10/40 coin',
      stepLabel: '22/32',
    });
  });

  it('targets an item row when fast sell is already open during level two coin guidance', () => {
    const snapshot = createLevelTwoReadySnapshot();

    expect(
      getStep({
        pageId: 'shop',
        snapshot,
        dom: createDomFake({ shopDirectSellPopupOpen: true }),
      }),
    ).toMatchObject({
      id: 'level-up-two',
      kind: 'objective',
      targetId: 'shop:directSell:sageHerb',
      hintText: 'choose something to sell',
      objectiveText: 'choose something to sell',
      progressLabel: '10/40 coin',
      stepLabel: '22/32',
    });
  });

  it('targets the herbs tab before a hidden herb row during level two coin guidance', () => {
    const snapshot = createLevelTwoReadySnapshot({
      shop: {
        shelf: {
          selectedSlotNumber: null,
          slots: [],
          sellItems: [
            {
              key: 'sageSeed',
              kind: 'seed',
              quantity: 0,
            },
            {
              key: 'sageHerb',
              kind: 'herb',
              quantity: 1,
            },
          ],
        },
      },
    });

    expect(
      getStep({
        pageId: 'shop',
        snapshot,
        dom: createDomFake({
          shopDirectSellPopupOpen: true,
          directSellTabKind: 'seed',
        }),
      }),
    ).toMatchObject({
      id: 'level-up-two',
      kind: 'objective',
      targetId: 'shop:directSell:tab:herb',
      hintText: 'herbs',
      objectiveText: 'open herbs tab',
      progressLabel: '10/40 coin',
      stepLabel: '22/32',
    });
  });

  it('targets sell once a single fast-sell item is selected', () => {
    const snapshot = createLevelTwoReadySnapshot();

    expect(
      getStep({
        pageId: 'shop',
        snapshot,
        dom: createDomFake({
          shopDirectSellPopupOpen: true,
          directSellItemKey: 'sageHerb',
        }),
      }),
    ).toMatchObject({
      id: 'level-up-two',
      kind: 'objective',
      targetId: 'shop:directSell:sell',
      allowedPopupClasses: ['shop-page__direct-sell-popup'],
      hintText: 'press sell',
      objectiveText: 'press sell',
      progressLabel: '10/40 coin',
      stepLabel: '22/32',
    });
  });

  it('targets +1 once multiple fast-sell items are selected', () => {
    const snapshot = createLevelTwoReadySnapshot({
      inventory: [{ key: 'sageHerb', quantity: 3 }],
    });

    expect(
      getStep({
        pageId: 'shop',
        snapshot,
        dom: createDomFake({
          shopDirectSellPopupOpen: true,
          directSellItemKey: 'sageHerb',
        }),
      }),
    ).toMatchObject({
      id: 'level-up-two',
      kind: 'objective',
      targetId: 'shop:directSell:amount:+1',
      allowedPopupClasses: ['shop-page__direct-sell-popup'],
      hintText: '+1',
      objectiveText: 'amount starts at 1. press sell, or +1 if you have more to sell.',
      progressLabel: '10/40 coin',
      stepLabel: '22/32',
    });
  });

  it('targets sell once the selected fast-sell amount covers the coin shortfall', () => {
    const snapshot = createLevelTwoReadySnapshot({
      inventory: [{ key: 'sageHerb', quantity: 3 }],
      coin: {
        current: 30,
      },
      shop: {
        shelf: {
          selectedSlotNumber: null,
          slots: [],
          sellItems: [
            {
              key: 'sageHerb',
              kind: 'herb',
              quantity: 3,
              fastSellCoin: 10,
              sellNeed: 1000,
            },
          ],
        },
      },
    });

    expect(
      getStep({
        pageId: 'shop',
        snapshot,
        dom: createDomFake({
          shopDirectSellPopupOpen: true,
          directSellItemKey: 'sageHerb',
          directSellQuantity: 3,
        }),
      }),
    ).toMatchObject({
      id: 'level-up-two',
      kind: 'objective',
      targetId: 'shop:directSell:sell',
      allowedPopupClasses: ['shop-page__direct-sell-popup'],
      hintText: 'press sell',
      objectiveText: 'press sell',
      progressLabel: '30/40 coin',
      stepLabel: '22/32',
    });
  });

  it('routes level two coin shortfall back to a sage source when nothing is sellable', () => {
    const snapshot = createLevelTwoReadySnapshot({
      inventory: [],
      seedSummoning: {
        canSummon: true,
        cost: 10,
      },
    });

    expect(getStep({ snapshot })).toMatchObject({
      id: 'level-up-two',
      kind: 'objective',
      targetId: 'workshop:summonSeed',
      hintText: 'summon seed',
      objectiveText: 'get sage to sell',
      progressLabel: '10/40 coin',
      stepLabel: '22/32',
    });
  });

  it('does not target a zero-available fast-sell row during level two coin guidance', () => {
    const snapshot = createLevelTwoReadySnapshot({
      inventory: [{ key: 'sageSeed', quantity: 1 }],
      shop: {
        shelf: {
          selectedSlotNumber: null,
          slots: [],
          sellItems: [
            { key: 'sageSeed', quantity: 0 },
            { key: 'sageHerb', quantity: 0 },
          ],
        },
      },
    });

    expect(
      getStep({
        pageId: 'shop',
        snapshot,
        dom: createDomFake({ shopDirectSellPopupOpen: true }),
      }),
    ).toMatchObject({
      id: 'level-up-two',
      kind: 'objective',
      targetId: 'page:garden',
      hintText: 'open garden',
      objectiveText: 'get sage to sell',
      progressLabel: '10/40 coin',
      stepLabel: '22/32',
    });
  });

  it('returns level two players to the level-up button once coin is ready', () => {
    const snapshot = createLevelTwoReadySnapshot({
      coin: {
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
      stepLabel: '22/32',
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
      stepLabel: '24/32',
    });
  });

  it('keeps Elara active for the level three mint seed task after research', () => {
    const snapshot = createSnapshot({
      seedInventory: [{ key: 'mintSeed', quantity: 3 }],
      research: {
        completedResearchIds: ['unlockSeed:mintSeed'],
      },
      tasks: {
        currentLevel: 3,
        level: {
          completion: { canComplete: false, costCoin: 80 },
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
      hintText: 'turn in',
      objectiveText: 'turn in mint seed for the next level',
      progressLabel: '7/10 mint seeds',
      stepLabel: '25/32',
    });
  });

  it('skips mint seed research when owned mint seeds can satisfy the next requirement', () => {
    const snapshot = createSnapshot({
      research: {
        completedResearchIds: [],
      },
      tasks: {
        currentLevel: 3,
        level: {
          completion: { canComplete: false, costCoin: 90 },
          tasks: [
            {
              taskId: 'level3-mint-seeds',
              itemKey: 'mintSeed',
              requiredQuantity: 10,
              progressQuantity: 0,
              remainingQuantity: 10,
              ownedQuantity: 10,
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
      targetId: 'task:level3-mint-seeds',
      hintText: 'turn in',
      objectiveText: 'turn in mint seed for the next level',
      progressLabel: '0/10 mint seeds',
    });
  });

  it('returns mint seed guidance to research after preowned seeds are turned in but more are needed', () => {
    const snapshot = createSnapshot({
      research: {
        completedResearchIds: [],
      },
      tasks: {
        currentLevel: 3,
        level: {
          completion: { canComplete: false, costCoin: 90 },
          tasks: [
            {
              taskId: 'level3-mint-seeds',
              itemKey: 'mintSeed',
              requiredQuantity: 10,
              progressQuantity: 5,
              remainingQuantity: 5,
              ownedQuantity: 0,
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
        completed: completedThrough('research-mint-seed'),
      }),
    ).toMatchObject({
      id: 'fill-mint-seed-task',
      targetId: 'page:research',
      hintText: 'open research',
      objectiveText: 'turn in mint seed for the next level',
      progressLabel: '5/10 mint seeds',
    });
  });

  it('sends the level three mint herb task to garden after mint seeds are filled', () => {
    const snapshot = createLevelThreeMintHerbSnapshot();

    expect(getStep({ snapshot })).toMatchObject({
      id: 'fill-mint-herb-task',
      kind: 'objective',
      targetId: 'page:garden',
      hintText: 'open garden',
      objectiveText: 'turn in mint for the next level',
      progressLabel: '0/18 mint',
      stepLabel: '26/32',
    });
  });

  it('does not ask to plant mint while a sage seed is selected', () => {
    const snapshot = createLevelThreeMintHerbSnapshot({
      tile: {
        selectedSeedItemTypeId: 1,
        selectedSeedKey: 'sageSeed',
        selectedSeedLabel: 'sage seed',
      },
    });

    expect(getStep({ pageId: 'garden', snapshot })).toMatchObject({
      id: 'fill-mint-herb-task',
      targetId: 'garden:plot:1:label',
      hintText: 'choose mint seed',
    });

    expect(
      getStep({
        pageId: 'garden',
        snapshot,
        dom: createDomFake({ seedPopupOpen: true }),
      }),
    ).toMatchObject({
      id: 'fill-mint-herb-task',
      targetId: 'garden:seed:mintSeed',
      hintText: 'choose mint seed',
    });
  });

  it('keeps mint herb guidance collapsed while planted mint is growing', () => {
    const snapshot = createLevelThreeMintHerbSnapshot({
      seedQuantity: 0,
      tile: {
        phase: 'growing',
        seedKey: 'mintSeed',
        seedLabel: 'mint seed',
        herbLabel: 'mint',
      },
    });

    expect(getStep({ pageId: 'garden', snapshot })).toMatchObject({
      id: 'fill-mint-herb-task',
      targetId: null,
      text: 'wait for mint to grow',
      hintText: 'wait for mint to grow',
      objectiveText: 'wait for mint to grow',
      cueMode: 'passive',
      progressLabel: '0/18 mint',
    });
  });

  it('only asks to plant mint when mint seed is selected', () => {
    const snapshot = createLevelThreeMintHerbSnapshot({
      tile: {
        selectedSeedItemTypeId: 2,
        selectedSeedKey: 'mintSeed',
        selectedSeedLabel: 'mint seed',
      },
    });

    expect(getStep({ pageId: 'garden', snapshot })).toMatchObject({
      id: 'fill-mint-herb-task',
      targetId: 'garden:plot:1',
      hintText: 'plant mint seed',
    });
  });

  it('names a blocking crop by its actual herb', () => {
    const snapshot = createLevelThreeMintHerbSnapshot({
      tile: {
        phase: 'ready',
        selectedSeedItemTypeId: 1,
        selectedSeedKey: 'sageSeed',
        selectedSeedLabel: 'sage seed',
        seedKey: 'sageSeed',
        seedLabel: 'sage seed',
        herbLabel: 'sage',
      },
    });

    expect(getStep({ pageId: 'garden', snapshot })).toMatchObject({
      id: 'fill-mint-herb-task',
      targetId: 'garden:plot:1',
      hintText: 'harvest sage',
    });
  });

  it('keeps level three Elara active for level-up coin', () => {
    const snapshot = createSnapshot({
      inventory: [{ key: 'mintHerb', quantity: 1 }],
      coin: { current: 77 },
      research: {
        completedResearchIds: ['unlockSeed:mintSeed'],
      },
      tasks: {
        currentLevel: 3,
        level: {
          completion: { canComplete: true, costCoin: 80 },
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
      objectiveText: 'earn level-up coin in market',
      progressLabel: '77/80 coin',
      stepLabel: '27/32',
    });
  });

  it('routes level three coin shortfall to mint supply when nothing is sellable', () => {
    const snapshot = createSnapshot({
      coin: { current: 77 },
      seedSummoning: {
        canSummon: true,
        cost: 10,
      },
      research: {
        completedResearchIds: ['unlockSeed:mintSeed'],
      },
      tasks: {
        currentLevel: 3,
        level: {
          completion: { canComplete: true, costCoin: 80 },
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
      targetId: 'workshop:summonSeed',
      hintText: 'summon seed',
      objectiveText: 'get mint to sell',
      progressLabel: '77/80 coin',
      stepLabel: '27/32',
    });
  });

  it('routes level three coin shortfall to mint research when mint is still locked', () => {
    const snapshot = createSnapshot({
      coin: { current: 77 },
      research: {
        completedResearchIds: [],
      },
      tasks: {
        currentLevel: 3,
        level: {
          completion: { canComplete: true, costCoin: 90 },
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

    expect(
      getStep({
        snapshot,
        completed: completedThrough('fill-mint-herb-task'),
      }),
    ).toMatchObject({
      id: 'level-up-three',
      targetId: 'page:research',
      hintText: 'open research',
      objectiveText: 'get mint to sell',
      progressLabel: '77/90 coin',
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
        canAddIngredient: true,
        activeBrew: null,
        herbs: [
          {
            key: 'sageHerb',
            availableQuantity: 3,
          },
        ],
      },
    });

    expect(getStep({ pageId: 'brewing', snapshot })).toMatchObject({
      id: 'brew-mana-tonic',
      kind: 'objective',
      targetId: 'brewing:herb:sageHerb',
      hintText: 'tap sage to fill cauldron. recipes care about order',
      stepLabel: '30/32',
    });
  });

  it('keeps adding sage instead of brewing a one-sage wasted mix', () => {
    const snapshot = createSnapshot({
      tasks: { currentLevel: 4, level: { tasks: [] } },
      research: {
        completedResearchIds: ['unlockRecipe:manaTonic'],
      },
      brewing: {
        ingredients: [{ key: 'sageHerb' }],
        match: null,
        canBrew: true,
        canAddIngredient: true,
        activeBrew: null,
        herbs: [
          {
            key: 'sageHerb',
            availableQuantity: 2,
          },
        ],
      },
    });

    expect(getStep({ pageId: 'brewing', snapshot })).toMatchObject({
      id: 'brew-mana-tonic',
      targetId: 'brewing:herb:sageHerb',
      hintText: 'add sage. recipes care about order',
      stepLabel: '30/32',
    });
  });

  it('asks to remove extra sage before brewing mana tonic', () => {
    const snapshot = createSnapshot({
      tasks: { currentLevel: 4, level: { tasks: [] } },
      research: {
        completedResearchIds: ['unlockRecipe:manaTonic'],
      },
      brewing: {
        ingredients: [
          { key: 'sageHerb' },
          { key: 'sageHerb' },
          { key: 'sageHerb' },
          { key: 'sageHerb' },
        ],
        match: null,
        canBrew: true,
        canAddIngredient: true,
        activeBrew: null,
        herbs: [
          {
            key: 'sageHerb',
            availableQuantity: 12,
          },
        ],
      },
    });

    expect(getStep({ pageId: 'brewing', snapshot })).toMatchObject({
      id: 'brew-mana-tonic',
      targetId: 'brewing:remove:sageHerb',
      hintText: 'remove extra sage',
      stepLabel: '30/32',
    });
  });

  it('points at brew only once the cauldron matches unlocked mana tonic', () => {
    const snapshot = createSnapshot({
      tasks: { currentLevel: 4, level: { tasks: [] } },
      research: {
        completedResearchIds: ['unlockRecipe:manaTonic'],
      },
      brewing: {
        ingredients: [
          { key: 'sageHerb' },
          { key: 'sageHerb' },
          { key: 'sageHerb' },
        ],
        match: {
          key: 'manaTonic',
          unlocked: true,
        },
        canBrew: true,
        canAddIngredient: true,
        activeBrew: null,
        herbs: [
          {
            key: 'sageHerb',
            availableQuantity: 0,
          },
        ],
      },
    });

    expect(getStep({ pageId: 'brewing', snapshot })).toMatchObject({
      id: 'brew-mana-tonic',
      targetId: 'brewing:action',
      hintText: 'brew mana tonic',
      stepLabel: '30/32',
    });
  });

  it('points at recipe dialog close after mana tonic is selected', () => {
    const snapshot = createSnapshot({
      tasks: { currentLevel: 4, level: { tasks: [] } },
      research: {
        completedResearchIds: ['unlockRecipe:manaTonic'],
      },
      brewing: {
        ingredients: [
          { key: 'sageHerb' },
          { key: 'sageHerb' },
          { key: 'sageHerb' },
        ],
        canBrew: true,
      },
    });

    expect(
      getStep({
        pageId: 'brewing',
        snapshot,
        dom: createDomFake({
          recipePopupOpen: true,
          selectedBrewingRecipeKey: 'manaTonic',
        }),
      }),
    ).toMatchObject({
      id: 'brew-mana-tonic',
      targetId: 'brewing:recipes:close',
      hintText: 'close recipes',
      progressLabel: '0/1 potion',
      stepLabel: '30/32',
    });
  });

  it('points at the mana tonic requirement when the potion is already owned', () => {
    const snapshot = createSnapshot({
      research: {
        completedResearchIds: [],
      },
      tasks: {
        currentLevel: 4,
        level: {
          completion: { canComplete: false, costCoin: 160 },
          tasks: [
            {
              taskId: 'level4-mana-tonic',
              itemKey: 'manaTonic',
              requiredQuantity: 3,
              progressQuantity: 0,
              remainingQuantity: 3,
              ownedQuantity: 1,
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
      id: 'refill-mana-tonic-cauldron',
      targetId: 'task:level4-mana-tonic',
      hintText: 'turn in mana tonic',
      objectiveText: 'turn in mana tonic for the next level',
      progressLabel: '0/3 mana tonic',
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
      stepLabel: '31/32',
    });
  });

  it('asks to remove extra sage during the refill cauldron objective', () => {
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
            availableQuantity: 11,
          },
        ],
        ingredients: [
          { key: 'sageHerb' },
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
      targetId: 'brewing:remove:sageHerb',
      hintText: 'remove extra sage',
      progressLabel: '3/3 sage',
      stepLabel: '31/32',
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
        match: {
          key: 'manaTonic',
          unlocked: true,
        },
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
      stepLabel: '31/32',
    });
  });

  it('keeps level five theme settings guidance passive', () => {
    const snapshot = createSnapshot({
      tasks: {
        currentLevel: 5,
        level: {
          tasks: [],
        },
      },
    });

    expect(getStep({ snapshot })).toMatchObject({
      id: 'find-theme-settings',
      targetId: 'top:username',
      objectiveText:
        'you can change themes in settings. open settings, then use the configurations tab.',
      hintText: 'open settings',
      cueMode: 'passive',
      stepLabel: '32/32',
    });
  });

  it('points level five theme guidance at the settings configurations tab when settings is open', () => {
    const snapshot = createSnapshot({
      tasks: {
        currentLevel: 5,
        level: {
          tasks: [],
        },
      },
    });

    expect(
      getStep({
        snapshot,
        dom: createDomFake({ settingsThemeTabVisible: true }),
      }),
    ).toMatchObject({
      id: 'find-theme-settings',
      targetId: 'top:settings:theme-tab',
      hintText: 'configurations tab',
      cueMode: 'passive',
    });
  });

  it('completes level five theme guidance when the configurations tab is selected', () => {
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
      dom: createDomFake({ settingsThemeTabVisible: true, themeSettingsTabOpen: true }),
    });

    expect(step).toBeNull();
    expect(progress.completedStepIds.has('find-theme-settings')).toBe(true);
  });

  it('auto-completes all steps for players already past settings introduction', () => {
    const progress = createProgressFake();
    const manager = new TutorialStepManager({
      progressManager: progress,
      getCurrentPageId: () => 'workshop',
    });

    const step = manager.getActiveStep({
      snapshot: createSnapshot({
        tasks: {
          currentLevel: 6,
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

  it('auto-completes all steps after any prestige', () => {
    const progress = createProgressFake();
    const manager = new TutorialStepManager({
      progressManager: progress,
      getCurrentPageId: () => 'workshop',
    });

    const step = manager.getActiveStep({
      snapshot: createSnapshot({
        prestige: {
          completedLevels: [10],
        },
      }),
      dom: createDomFake(),
    });

    expect(step).toBeNull();
    expect(progress.completedStepIds).toEqual(new Set(TUTORIAL_STEP_IDS));
  });
});
