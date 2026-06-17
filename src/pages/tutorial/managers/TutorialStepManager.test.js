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
            requiredQuantity: 5,
            progressQuantity: 0,
            remainingQuantity: 5,
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
  shopDirectSellPopupOpen = false,
  directSellItemKey = null,
  username = 'wizard',
  usernameSettingsOpen = false,
} = {}) {
  return {
    getUsername: () => username,
    isBrewingRecipePopupOpen: () => recipePopupOpen,
    isGardenSeedPopupOpen: () => seedPopupOpen,
    isShopDirectSellItemSelected: (itemKey) => directSellItemKey === itemKey,
    isShopDirectSellPopupOpen: () => shopDirectSellPopupOpen,
    isShopSellPopupOpen: () => shopSellPopupOpen,
    isTasksExpanded: () => tasksExpanded,
    isUsernameSettingsOpen: () => usernameSettingsOpen,
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
            requiredQuantity: 5,
            progressQuantity: 5,
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
            requiredQuantity: 3,
            progressQuantity: 3,
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
}

describe('TutorialStepManager', () => {
  it('starts with Elara introduction before the top panel unlocks', () => {
    expect(getStep()).toMatchObject({
      id: 'intro-welcome',
      kind: 'prompt',
      advanceOnClick: true,
      stepLabel: '1/26',
      revealTokens: [],
      text: "hi there. i'm Elara Starbrew. i'll help you wake this workshop up.",
    });
  });

  it('does not suppress the guide for legacy skipped progress', () => {
    const progress = createProgressFake();
    progress.isSkipped = () => true;

    const step = getStep({ progress });

    expect(step).toMatchObject({
      id: 'intro-welcome',
      kind: 'prompt',
    });
  });

  it('highlights mana sphere after the welcome', () => {
    expect(
      getStep({
        completed: completedThrough('intro-username-return'),
      }),
    ).toMatchObject({
      id: 'intro-mana-sphere',
      kind: 'prompt',
      targetId: 'workshop:manaSphere',
      advanceOnClick: true,
      showPointer: false,
      revealTokens: ['top', 'mana'],
      stepLabel: '4/26',
    });
  });

  it('reveals the top panel and points at username after the introduction', () => {
    expect(
      getStep({
        completed: ['intro-welcome'],
      }),
    ).toMatchObject({
      id: 'intro-username',
      kind: 'prompt',
      targetId: 'top:username',
      revealTokens: ['top'],
      stepLabel: '2/26',
      text: "i don't need your name, but it would be nice to set it here.",
    });
  });

  it('continues the introduction after the username is set', () => {
    expect(
      getStep({
        completed: ['intro-welcome'],
        dom: createDomFake({ username: 'Mira' }),
      }),
    ).toMatchObject({
      id: 'intro-username-return',
      kind: 'prompt',
      advanceOnClick: true,
      revealTokens: ['top'],
      stepLabel: '3/26',
      text: "hi again, Mira. let's start with mana.",
    });
  });

  it('points at the username input while settings is open', () => {
    expect(
      getStep({
        completed: ['intro-welcome'],
        dom: createDomFake({ usernameSettingsOpen: true }),
      }),
    ).toMatchObject({
      id: 'intro-username',
      kind: 'prompt',
      targetId: 'top:username-input',
      revealTokens: ['top'],
      stepLabel: '2/26',
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
      stepLabel: '5/26',
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
      stepLabel: '5/26',
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
              requiredQuantity: 5,
              progressQuantity: 0,
              remainingQuantity: 5,
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
      text: 'fill task',
      stepLabel: '6/26',
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
              requiredQuantity: 5,
              progressQuantity: 1,
              remainingQuantity: 4,
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
      progress: { value: 1, max: 5 },
      progressLabel: '1/5 seeds',
      stepLabel: '7/26',
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
              requiredQuantity: 5,
              progressQuantity: 1,
              remainingQuantity: 4,
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
      text: 'good. that finishes the level task. now we need more gold. summon a sage seed, then sell it in market.',
      advanceOnClick: true,
      stepLabel: '8/26',
    });
  });

  it('keeps the market intro aligned with the next action when a sage seed is already ready', () => {
    const snapshot = createLevelOneTaskCompleteSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 1 }],
    });

    expect(getStep({ snapshot })).toMatchObject({
      id: 'intro-market',
      text: 'good. that finishes the level task. now we need more gold. sell a sage seed in market.',
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
          completion: { canComplete: false, costGold: 10 },
          tasks: [
            {
              taskId: 'level1-sage-seeds',
              itemKey: 'sageSeed',
              requiredQuantity: 5,
              progressQuantity: 1,
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
      stepLabel: '12/26',
    });
  });

  it('runs tutorial sale objective after sage seed fast sell item is selected', () => {
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
      id: 'earn-tutorial-gold',
      kind: 'objective',
      effect: 'tutorial-sale',
      targetId: 'shop:directSell:sell',
      hintText: 'press sell',
      sale: {
        itemKey: 'sageSeed',
        goldEach: 10,
        goldTarget: 10,
      },
      progressLabel: '0/10 gold',
      stepLabel: '13/26',
    });
  });

  it('skips old stand unselect after tutorial gold is earned', () => {
    const snapshot = createLevelOneTaskCompleteSnapshot({
      gold: { current: 10 },
    });

    expect(
      getStep({
        pageId: 'shop',
        snapshot,
        dom: createDomFake({ shopDirectSellPopupOpen: true }),
        completed: completedThrough('earn-tutorial-gold'),
      }),
    ).not.toMatchObject({
      id: 'unselect-sage-seed-sale',
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
              requiredQuantity: 5,
              progressQuantity: 5,
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
      stepLabel: '15/26',
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
      objectiveText:
        "hmm... sage, not sage seed. we need to learn gardening. i'm not paid enough for this, but let's do it.",
      progressLabel: '0/3 sage',
      cueMode: 'active',
      stepLabel: '16/26',
    });
  });

  it('keeps the grow sage objective until three sage are grown', () => {
    const snapshot = createSnapshot({
      tasks: {
        currentLevel: 2,
        level: {
          completion: { canComplete: false, costGold: 40 },
          tasks: [
            {
              taskId: 'level2-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 3,
              progressQuantity: 2,
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
      progress: { value: 2, max: 3 },
      objectiveText: 'keep going. grow sage 3 times.',
      progressLabel: '2/3 sage',
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

  it('guides the level two sage herb task right after the first gardening loop', () => {
    const snapshot = createSnapshot({
      tasks: {
        currentLevel: 2,
        level: {
          completion: { canComplete: false, costGold: 40 },
          tasks: [
            {
              taskId: 'level2-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 3,
              progressQuantity: 1,
              remainingQuantity: 2,
              canFill: true,
              canComplete: false,
              completed: false,
            },
            {
              taskId: 'level2-sage-seeds',
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
      hintText: 'fill sage task',
      objectiveText: 'good. now pack the task with sage.',
      progressLabel: '1/3 sage',
      cueMode: 'delayed-target',
      stepLabel: '17/26',
    });
  });

  it('guides the level two sage seed task after the sage task is filled', () => {
    const snapshot = createSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 4 }],
      tasks: {
        currentLevel: 2,
        level: {
          completion: { canComplete: false, costGold: 40 },
          tasks: [
            {
              taskId: 'level2-sage-seeds',
              itemKey: 'sageSeed',
              requiredQuantity: 10,
              progressQuantity: 4,
              remainingQuantity: 6,
              canFill: true,
              canComplete: false,
              completed: false,
            },
            {
              taskId: 'level2-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 3,
              progressQuantity: 3,
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
      hintText: 'fill task',
      objectiveText: 'and yes, the sage seed task still needs filling.',
      progressLabel: '4/10 sage seeds',
      cueMode: 'delayed-target',
      stepLabel: '18/26',
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
              requiredQuantity: 3,
              progressQuantity: 1,
              remainingQuantity: 2,
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
      objectiveText: 'good. now pack the task with sage.',
      progressLabel: '1/3 sage',
      stepLabel: '17/26',
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
          completion: { canComplete: false, costGold: 40 },
          tasks: [
            {
              taskId: 'level2-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 3,
              progressQuantity: 1,
              remainingQuantity: 2,
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
      progressLabel: '1/3 sage',
      stepLabel: '17/26',
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
              requiredQuantity: 3,
              progressQuantity: 1,
              remainingQuantity: 2,
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
      objectiveText: 'good. now pack the task with sage.',
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
      stepLabel: '19/26',
    });
  });

  it('points at the market stand while earning level two gold', () => {
    const snapshot = createLevelTwoReadySnapshot();

    expect(getStep({ pageId: 'shop', snapshot })).toMatchObject({
      id: 'level-up-two',
      kind: 'objective',
      targetId: 'shop:directSell',
      hintText: 'fast sell',
      objectiveText: 'earn level-up gold in market',
      progressLabel: '10/40 gold',
      stepLabel: '19/26',
    });
  });

  it('targets an item row when fast sell is already open during level two gold guidance', () => {
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
      progressLabel: '10/40 gold',
      stepLabel: '19/26',
    });
  });

  it('switches to copy-only amount guidance once a level two fast-sell item is selected', () => {
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
      targetId: null,
      allowedPopupClasses: ['shop-page__direct-sell-popup'],
      hintText: 'sell or +1',
      objectiveText: 'amount starts at 1. press sell, or +1 if you have more to sell.',
      progressLabel: '10/40 gold',
      stepLabel: '19/26',
    });
  });

  it('routes level two gold shortfall back to a sage source when nothing is sellable', () => {
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
      progressLabel: '10/40 gold',
      stepLabel: '19/26',
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
      stepLabel: '19/26',
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
      stepLabel: '20/26',
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
      stepLabel: '21/26',
    });
  });

  it('sends the level three mint herb task to garden after mint seeds are filled', () => {
    const snapshot = createLevelThreeMintHerbSnapshot();

    expect(getStep({ snapshot })).toMatchObject({
      id: 'fill-mint-herb-task',
      kind: 'objective',
      targetId: 'page:garden',
      hintText: 'open garden',
      objectiveText: 'fill the mint level task',
      progressLabel: '0/18 mint',
      stepLabel: '22/26',
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

  it('keeps level three Elara active for level-up gold', () => {
    const snapshot = createSnapshot({
      inventory: [{ key: 'mintHerb', quantity: 1 }],
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
      stepLabel: '23/26',
    });
  });

  it('routes level three gold shortfall to mint supply when nothing is sellable', () => {
    const snapshot = createSnapshot({
      gold: { current: 77 },
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
      targetId: 'workshop:summonSeed',
      hintText: 'summon seed',
      objectiveText: 'get mint to sell',
      progressLabel: '77/80 gold',
      stepLabel: '23/26',
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
      stepLabel: '25/26',
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
      stepLabel: '26/26',
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
      stepLabel: '26/26',
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
