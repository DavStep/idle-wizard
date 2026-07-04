/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { TutorialStepManager, TUTORIAL_STEP_IDS } from './TutorialStepManager.js';

function createProgressFake(completedStepIds = []) {
  const completed = new Set(completedStepIds);

  return {
    completedStepIds: completed,
    hasCompleted: (stepId) => completed.has(stepId),
    complete: (stepId) => completed.add(stepId),
    completeMany: (stepIds) => stepIds.forEach((stepId) => completed.add(stepId)),
  };
}

function createDomFake({
  tasksExpanded = false,
  tasksPinned = false,
  seedPopupOpen = false,
  recipePopupOpen = false,
  selectedBrewingRecipeKey = null,
  shopDirectSellPopupOpen = false,
  directSellTabKind = 'seed',
  directSellItemKey = null,
  directSellQuantity = 1,
} = {}) {
  return {
    isBrewingRecipePopupOpen: () => recipePopupOpen,
    isBrewingRecipeSelected: (recipeKey) => selectedBrewingRecipeKey === recipeKey,
    isGardenSeedPopupOpen: () => seedPopupOpen,
    isShopDirectSellItemSelected: (itemKey) => directSellItemKey === itemKey,
    isShopDirectSellPopupOpen: () => shopDirectSellPopupOpen,
    isShopDirectSellTabSelected: (kind) => directSellTabKind === kind,
    getShopDirectSellQuantity: () => directSellQuantity,
    isTasksExpanded: () => tasksExpanded,
    isTasksPinned: () => tasksPinned,
  };
}

function createTask({
  taskId,
  itemKey,
  type,
  requiredQuantity,
  progressQuantity = 0,
  remainingQuantity = requiredQuantity - progressQuantity,
  canFill = false,
  canComplete = false,
  completed = false,
  ownedQuantity,
}) {
  return {
    taskId,
    itemKey,
    ...(type === undefined ? {} : { type }),
    requiredQuantity,
    progressQuantity,
    remainingQuantity,
    canFill,
    canComplete,
    completed,
    ...(ownedQuantity === undefined ? {} : { ownedQuantity }),
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
      inProgressResearches: [],
    },
    coin: {
      current: 0,
    },
    shop: {
      shelf: {
        slots: [],
        sellItems: [],
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
            selectedSeedKey: null,
            seedKey: null,
          },
        ],
      },
    },
    tasks: {
      currentLevel: 1,
      level: {
        completion: {
          canComplete: false,
          costCoin: 0,
        },
        tasks: [
          createTask({
            taskId: 'level1-turn-in-sage-seed',
            itemKey: 'sageSeed',
            requiredQuantity: 1,
          }),
        ],
      },
    },
    ...overrides,
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

function createLevelOneCompleteSnapshot() {
  return createSnapshot({
    tasks: {
      currentLevel: 1,
      level: {
        completion: {
          canComplete: true,
          costCoin: 0,
        },
        tasks: [
          createTask({
            taskId: 'level1-turn-in-sage-seed',
            itemKey: 'sageSeed',
            requiredQuantity: 1,
            progressQuantity: 1,
            remainingQuantity: 0,
            completed: true,
          }),
        ],
      },
    },
  });
}

function createLevelTwoSnapshot(overrides = {}) {
  return createSnapshot({
    seedSummoning: {
      canSummon: true,
      cost: 10,
    },
    tasks: {
      currentLevel: 2,
      level: {
        completion: {
          canComplete: false,
          costCoin: 4,
        },
        tasks: [
          createTask({
            taskId: 'level2-summon-sage-seed',
            itemKey: 'sageSeed',
            type: 'summon',
            requiredQuantity: 5,
            progressQuantity: 0,
            remainingQuantity: 5,
          }),
          createTask({
            taskId: 'level2-sell-sage-seed',
            itemKey: 'sageSeed',
            type: 'sell',
            requiredQuantity: 1,
            progressQuantity: 0,
            remainingQuantity: 1,
          }),
          createTask({
            taskId: 'level2-turn-in-sage-seed',
            itemKey: 'sageSeed',
            requiredQuantity: 4,
            progressQuantity: 0,
            remainingQuantity: 4,
          }),
        ],
      },
    },
    ...overrides,
  });
}

function createLevelThreeSnapshot(overrides = {}) {
  return createSnapshot({
    research: {
      completedResearchIds: ['unlockSeed:mintSeed'],
      inProgressResearches: [],
    },
    seedInventory: [{ key: 'mintSeed', quantity: 3 }],
    tasks: {
      currentLevel: 3,
      level: {
        completion: {
          canComplete: false,
          costCoin: 8,
        },
        tasks: [
          createTask({
            taskId: 'level3-research-mint-seed',
            itemKey: 'mintSeed',
            type: 'research',
            requiredQuantity: 1,
            progressQuantity: 1,
            remainingQuantity: 0,
            completed: true,
          }),
          createTask({
            taskId: 'level3-summon-mint-seed',
            itemKey: 'mintSeed',
            type: 'summon',
            requiredQuantity: 3,
            progressQuantity: 3,
            remainingQuantity: 0,
            completed: true,
          }),
          createTask({
            taskId: 'level3-turn-in-mint-seed',
            itemKey: 'mintSeed',
            requiredQuantity: 3,
            progressQuantity: 0,
            remainingQuantity: 3,
            canFill: true,
          }),
          createTask({
            taskId: 'level3-turn-in-sage-seed',
            itemKey: 'sageSeed',
            requiredQuantity: 6,
            progressQuantity: 0,
            remainingQuantity: 6,
          }),
        ],
      },
    },
    ...overrides,
  });
}

function createLevelFourSnapshot(overrides = {}) {
  return createSnapshot({
    seedInventory: [
      { key: 'sageSeed', quantity: 1 },
      { key: 'mintSeed', quantity: 1 },
    ],
    research: {
      completedResearchIds: ['unlockSeed:mintSeed'],
      inProgressResearches: [],
    },
    tasks: {
      currentLevel: 4,
      level: {
        completion: {
          canComplete: false,
          costCoin: 16,
        },
        tasks: [
          createTask({
            taskId: 'level4-grow-sage-herb',
            itemKey: 'sageHerb',
            type: 'grow',
            requiredQuantity: 2,
            progressQuantity: 2,
            remainingQuantity: 0,
            completed: true,
          }),
          createTask({
            taskId: 'level4-grow-mint-herb',
            itemKey: 'mintHerb',
            type: 'grow',
            requiredQuantity: 1,
            progressQuantity: 1,
            remainingQuantity: 0,
            completed: true,
          }),
          createTask({
            taskId: 'level4-turn-in-sage-herb',
            itemKey: 'sageHerb',
            requiredQuantity: 2,
            progressQuantity: 0,
            remainingQuantity: 2,
          }),
          createTask({
            taskId: 'level4-turn-in-mint-herb',
            itemKey: 'mintHerb',
            requiredQuantity: 1,
            progressQuantity: 0,
            remainingQuantity: 1,
          }),
          createTask({
            taskId: 'level4-turn-in-sage-seed',
            itemKey: 'sageSeed',
            requiredQuantity: 6,
            progressQuantity: 6,
            remainingQuantity: 0,
            completed: true,
          }),
        ],
      },
    },
    ...overrides,
  });
}

function createLevelFiveSnapshot(overrides = {}) {
  return createSnapshot({
    inventory: [{ key: 'sageHerb', quantity: 3 }],
    research: {
      completedResearchIds: ['unlockSeed:mintSeed'],
      inProgressResearches: [],
    },
    tasks: {
      currentLevel: 5,
      level: {
        completion: {
          canComplete: false,
          costCoin: 30,
        },
        tasks: [
          createTask({
            taskId: 'level5-research-mana-tonic',
            itemKey: 'manaTonic',
            type: 'research',
            requiredQuantity: 1,
            progressQuantity: 0,
            remainingQuantity: 1,
          }),
          createTask({
            taskId: 'level5-brew-mana-tonic',
            itemKey: 'manaTonic',
            type: 'brew',
            requiredQuantity: 1,
            progressQuantity: 0,
            remainingQuantity: 1,
          }),
          createTask({
            taskId: 'level5-turn-in-mana-tonic',
            itemKey: 'manaTonic',
            requiredQuantity: 1,
            progressQuantity: 0,
            remainingQuantity: 1,
          }),
        ],
      },
    },
    brewing: {
      ingredients: [],
      canBrew: false,
      canAddIngredient: true,
      activeBrew: null,
      herbs: [{ key: 'sageHerb', availableQuantity: 3 }],
    },
    ...overrides,
  });
}

describe('TutorialStepManager', () => {
  it('starts with a free purchase dialog', () => {
    expect(getStep()).toMatchObject({
      id: 'purchase-house',
      kind: 'dialog',
      advanceLabel: 'enter workshop',
      variant: 'intro-dialog',
      stepLabel: '1/35',
    });
  });

  it('waits two seconds before pointing at the first summon seed button', () => {
    expect(
      getStep({
        snapshot: createSnapshot({
          seedSummoning: {
            canSummon: true,
            cost: 10,
          },
        }),
        completed: completedThrough('intro-mana-sphere'),
      }),
    ).toMatchObject({
      id: 'first-summon-seed',
      targetId: 'workshop:summonSeed',
      targetCueDelayMs: 2000,
    });
  });

  it('points at the first sage task when a summoned seed can be turned in', () => {
    expect(
      getStep({
        snapshot: createSnapshot({
          seedInventory: [{ key: 'sageSeed', quantity: 1 }],
          seedSummoning: {
            canSummon: true,
            cost: 10,
          },
          tasks: {
            currentLevel: 1,
            level: {
              completion: {
                canComplete: false,
                costCoin: 0,
              },
              tasks: [
                createTask({
                  taskId: 'level1-sage-seeds',
                  itemKey: 'sageSeed',
                  requiredQuantity: 4,
                  progressQuantity: 0,
                  remainingQuantity: 4,
                  canFill: true,
                }),
              ],
            },
          },
        }),
        dom: createDomFake({ tasksExpanded: true }),
        completed: completedThrough('first-summon-seed'),
      }),
    ).toMatchObject({
      id: 'first-fill-seed-task',
      targetId: 'task:level1-sage-seeds',
      text: 'turn in',
    });
  });

  it('keeps pointing at sage turn-in before summon-more fallback on the level-one objective', () => {
    expect(
      getStep({
        snapshot: createSnapshot({
          seedInventory: [{ key: 'sageSeed', quantity: 1 }],
          seedSummoning: {
            canSummon: true,
            cost: 10,
          },
          tasks: {
            currentLevel: 1,
            level: {
              completion: {
                canComplete: false,
                costCoin: 0,
              },
              tasks: [
                createTask({
                  taskId: 'level1-sage-seeds',
                  itemKey: 'sageSeed',
                  requiredQuantity: 4,
                  progressQuantity: 1,
                  remainingQuantity: 3,
                  canFill: true,
                }),
              ],
            },
          },
        }),
        dom: createDomFake({ tasksExpanded: true }),
        completed: completedThrough('first-fill-seed-task'),
      }),
    ).toMatchObject({
      id: 'finish-seed-task',
      targetId: 'task:level1-sage-seeds',
      hintText: 'turn in',
    });
  });

  it('lets level 1 advance without coins after the first seed task', () => {
    expect(
      getStep({
        snapshot: createLevelOneCompleteSnapshot(),
        dom: createDomFake({ tasksExpanded: true }),
        completed: completedThrough('first-task-complete'),
      }),
    ).toMatchObject({
      id: 'level-up-one',
      targetId: 'workshop:levelUp',
      progressLabel: '1/1 ready',
      stepLabel: '8/35',
    });
  });

  it('introduces level 2 by telling the player to summon before market', () => {
    expect(getStep({ snapshot: createLevelTwoSnapshot() })).toMatchObject({
      id: 'intro-market',
      kind: 'dialog',
      targetId: 'workshop:summonSeed',
      lessonTitle: 'market opened',
      stepLabel: '9/35',
    });
  });

  it('asks for level 2 summon progress before opening market', () => {
    expect(
      getStep({
        snapshot: createLevelTwoSnapshot(),
        completed: completedThrough('intro-market'),
      }),
    ).toMatchObject({
      id: 'prepare-seed-sale',
      targetId: 'workshop:summonSeed',
      objectiveText: 'summon sage seeds for market',
      progressLabel: '0/5 seeds',
    });
  });

  it('uses normal fast sell controls for the level 2 sale task', () => {
    const snapshot = createLevelTwoSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 5 }],
      shop: {
        shelf: {
          slots: [],
          sellItems: [
            {
              key: 'sageSeed',
              kind: 'seed',
              quantity: 5,
              fastSellCoin: 0.8,
              sellNeed: 1000,
            },
          ],
        },
      },
      tasks: {
        currentLevel: 2,
        level: {
          completion: { canComplete: false, costCoin: 4 },
          tasks: [
            createTask({
              taskId: 'level2-summon-sage-seed',
              itemKey: 'sageSeed',
              type: 'summon',
              requiredQuantity: 5,
              progressQuantity: 5,
              remainingQuantity: 0,
              completed: true,
            }),
            createTask({
              taskId: 'level2-sell-sage-seed',
              itemKey: 'sageSeed',
              type: 'sell',
              requiredQuantity: 1,
              progressQuantity: 0,
              remainingQuantity: 1,
            }),
            createTask({
              taskId: 'level2-turn-in-sage-seed',
              itemKey: 'sageSeed',
              requiredQuantity: 4,
              progressQuantity: 0,
              remainingQuantity: 4,
            }),
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
          directSellItemKey: 'sageSeed',
          directSellQuantity: 1,
        }),
        completed: completedThrough('show-selected-sale-amount'),
      }),
    ).toMatchObject({
      id: 'earn-tutorial-coin',
      targetId: 'shop:directSell:sell',
      hintText: 'press sell',
      progressLabel: '0/1 sale',
      stepLabel: '15/35',
    });
  });

  it('routes level 2 back to a seed source instead of targeting a zero-count fast-sell row', () => {
    expect(
      getStep({
        pageId: 'shop',
        snapshot: createLevelTwoSnapshot({
          shop: {
            shelf: {
              slots: [],
              sellItems: [
                {
                  key: 'sageSeed',
                  kind: 'seed',
                  quantity: 0,
                  fastSellCoin: 0.8,
                  sellNeed: 1000,
                },
              ],
            },
          },
          tasks: {
            currentLevel: 2,
            level: {
              completion: { canComplete: false, costCoin: 4 },
              tasks: [
                createTask({
                  taskId: 'level2-summon-sage-seed',
                  itemKey: 'sageSeed',
                  type: 'summon',
                  requiredQuantity: 5,
                  progressQuantity: 5,
                  remainingQuantity: 0,
                  completed: true,
                }),
                createTask({
                  taskId: 'level2-sell-sage-seed',
                  itemKey: 'sageSeed',
                  type: 'sell',
                  requiredQuantity: 1,
                  progressQuantity: 0,
                  remainingQuantity: 1,
                }),
                createTask({
                  taskId: 'level2-turn-in-sage-seed',
                  itemKey: 'sageSeed',
                  requiredQuantity: 4,
                  progressQuantity: 0,
                  remainingQuantity: 4,
                }),
              ],
            },
          },
        }),
        dom: createDomFake({ shopDirectSellPopupOpen: true }),
        completed: completedThrough('select-market-stand'),
      }),
    ).toMatchObject({
      id: 'earn-tutorial-coin',
      targetId: 'page:workshop',
      hintText: 'open workshop',
      objectiveText: 'summon sage seed to sell',
    });
  });

  it('does not attach a tutorial sale effect to the market objective', () => {
    const step = getStep({
      pageId: 'shop',
      snapshot: createLevelTwoSnapshot({
        seedInventory: [{ key: 'sageSeed', quantity: 5 }],
        shop: {
          shelf: {
            slots: [],
            sellItems: [{ key: 'sageSeed', kind: 'seed', quantity: 5, fastSellCoin: 0.8 }],
          },
        },
      }),
      dom: createDomFake({
        shopDirectSellPopupOpen: true,
        directSellItemKey: 'sageSeed',
        directSellQuantity: 5,
      }),
      completed: completedThrough('show-selected-sale-amount'),
    });

    expect(step).toMatchObject({
      id: 'earn-tutorial-coin',
      targetId: 'shop:directSell:sell',
      hintText: 'press sell',
    });
    expect(step.effect).toBeUndefined();
    expect(step.sale).toBeUndefined();
  });

  it('returns level 2 players to the remaining seed turn-in after selling once', () => {
    expect(
      getStep({
        snapshot: createLevelTwoSnapshot({
          seedInventory: [{ key: 'sageSeed', quantity: 4 }],
          tasks: {
            currentLevel: 2,
            level: {
              completion: { canComplete: false, costCoin: 4 },
              tasks: [
                createTask({
                  taskId: 'level2-summon-sage-seed',
                  itemKey: 'sageSeed',
                  type: 'summon',
                  requiredQuantity: 5,
                  progressQuantity: 5,
                  remainingQuantity: 0,
                  completed: true,
                }),
                createTask({
                  taskId: 'level2-sell-sage-seed',
                  itemKey: 'sageSeed',
                  type: 'sell',
                  requiredQuantity: 1,
                  progressQuantity: 1,
                  remainingQuantity: 0,
                  completed: true,
                }),
                createTask({
                  taskId: 'level2-turn-in-sage-seed',
                  itemKey: 'sageSeed',
                  requiredQuantity: 4,
                  progressQuantity: 0,
                  remainingQuantity: 4,
                  canFill: true,
                }),
              ],
            },
          },
        }),
        dom: createDomFake({ tasksExpanded: true }),
        completed: completedThrough('first-sale-complete'),
      }),
    ).toMatchObject({
      id: 'unselect-sage-seed-sale',
      targetId: 'task:level2-turn-in-sage-seed',
      hintText: 'turn in sage seeds',
      progressLabel: '0/4 seeds',
    });
  });

  it('uses seed-source guidance for level 2 coin shortfall after requirements are done', () => {
    expect(
      getStep({
        snapshot: createLevelTwoSnapshot({
          coin: { current: 0.8 },
          tasks: {
            currentLevel: 2,
            level: {
              completion: { canComplete: true, costCoin: 4 },
              tasks: [
                createTask({
                  taskId: 'level2-summon-sage-seed',
                  itemKey: 'sageSeed',
                  type: 'summon',
                  requiredQuantity: 5,
                  progressQuantity: 5,
                  remainingQuantity: 0,
                  completed: true,
                }),
                createTask({
                  taskId: 'level2-sell-sage-seed',
                  itemKey: 'sageSeed',
                  type: 'sell',
                  requiredQuantity: 1,
                  progressQuantity: 1,
                  remainingQuantity: 0,
                  completed: true,
                }),
                createTask({
                  taskId: 'level2-turn-in-sage-seed',
                  itemKey: 'sageSeed',
                  requiredQuantity: 4,
                  progressQuantity: 4,
                  remainingQuantity: 0,
                  completed: true,
                }),
              ],
            },
          },
        }),
        completed: completedThrough('unselect-sage-seed-sale'),
      }),
    ).toMatchObject({
      id: 'level-up-two',
      targetId: 'workshop:summonSeed',
      hintText: 'summon seed',
      progressLabel: '0.8/4 coin',
    });
  });

  it('returns level 2 players to level up after normal market coin is earned', () => {
    expect(
      getStep({
        snapshot: createLevelTwoSnapshot({
          coin: { current: 4 },
          tasks: {
            currentLevel: 2,
            level: {
              completion: { canComplete: true, costCoin: 4 },
              tasks: [
                createTask({
                  taskId: 'level2-summon-sage-seed',
                  itemKey: 'sageSeed',
                  type: 'summon',
                  requiredQuantity: 5,
                  progressQuantity: 5,
                  remainingQuantity: 0,
                  completed: true,
                }),
                createTask({
                  taskId: 'level2-sell-sage-seed',
                  itemKey: 'sageSeed',
                  type: 'sell',
                  requiredQuantity: 1,
                  progressQuantity: 1,
                  remainingQuantity: 0,
                  completed: true,
                }),
                createTask({
                  taskId: 'level2-turn-in-sage-seed',
                  itemKey: 'sageSeed',
                  requiredQuantity: 4,
                  progressQuantity: 4,
                  remainingQuantity: 0,
                  completed: true,
                }),
              ],
            },
          },
        }),
        dom: createDomFake({ tasksExpanded: true }),
        completed: completedThrough('unselect-sage-seed-sale'),
      }),
    ).toMatchObject({
      id: 'level-up-two',
      targetId: 'workshop:levelUp',
      progressLabel: '1/1 ready',
      stepLabel: '18/35',
    });
  });

  it('introduces mint seed research on level 3', () => {
    expect(
      getStep({
        pageId: 'research',
        snapshot: createLevelThreeSnapshot({
          seedInventory: [],
          research: { completedResearchIds: [], inProgressResearches: [] },
          tasks: {
            currentLevel: 3,
            level: {
              completion: { canComplete: false, costCoin: 8 },
              tasks: [
                createTask({
                  taskId: 'level3-turn-in-mint-seed',
                  itemKey: 'mintSeed',
                  requiredQuantity: 3,
                  progressQuantity: 0,
                  remainingQuantity: 3,
                }),
              ],
            },
          },
        }),
        completed: completedThrough('intro-research'),
      }),
    ).toMatchObject({
      id: 'research-mint-seed',
      targetId: 'research:unlockSeed:mintSeed',
      objectiveText: 'research mint seed',
      stepLabel: '20/35',
    });
  });

  it('guides the level 3 mint seed task after research', () => {
    expect(
      getStep({
        snapshot: createLevelThreeSnapshot(),
        dom: createDomFake({ tasksExpanded: true }),
        completed: completedThrough('first-research-complete'),
      }),
    ).toMatchObject({
      id: 'fill-mint-seed-task',
      targetId: 'task:level3-turn-in-mint-seed',
      hintText: 'turn in',
      stepLabel: '22/35',
    });
  });

  it('also guides the level 3 sage seed requirement', () => {
    expect(
      getStep({
        snapshot: createLevelThreeSnapshot({
          tasks: {
            currentLevel: 3,
            level: {
              completion: { canComplete: false, costCoin: 8 },
              tasks: [
                createTask({
                  taskId: 'level3-turn-in-mint-seed',
                  itemKey: 'mintSeed',
                  requiredQuantity: 3,
                  progressQuantity: 3,
                  remainingQuantity: 0,
                  completed: true,
                }),
                createTask({
                  taskId: 'level3-turn-in-sage-seed',
                  itemKey: 'sageSeed',
                  requiredQuantity: 6,
                  progressQuantity: 3,
                  remainingQuantity: 3,
                  canFill: true,
                }),
              ],
            },
          },
        }),
        dom: createDomFake({ tasksExpanded: true }),
        completed: completedThrough('fill-mint-seed-task'),
      }),
    ).toMatchObject({
      id: 'fill-sage-seed-task',
      targetId: 'task:level3-turn-in-sage-seed',
      stepLabel: '23/35',
    });
  });

  it('uses seed-only market guidance for the level 3 coin gate', () => {
    expect(
      getStep({
        snapshot: createLevelThreeSnapshot({
          coin: { current: 6.4 },
          seedInventory: [{ key: 'mintSeed', quantity: 2 }],
          shop: {
            shelf: {
              slots: [],
              sellItems: [{ key: 'mintSeed', kind: 'seed', quantity: 2, fastSellCoin: 0.8 }],
            },
          },
          tasks: {
            currentLevel: 3,
            level: {
              completion: { canComplete: true, costCoin: 8 },
              tasks: [
                createTask({
                  taskId: 'level3-turn-in-mint-seed',
                  itemKey: 'mintSeed',
                  requiredQuantity: 3,
                  progressQuantity: 3,
                  remainingQuantity: 0,
                  completed: true,
                }),
                createTask({
                  taskId: 'level3-turn-in-sage-seed',
                  itemKey: 'sageSeed',
                  requiredQuantity: 6,
                  progressQuantity: 6,
                  remainingQuantity: 0,
                  completed: true,
                }),
              ],
            },
          },
        }),
      }),
    ).toMatchObject({
      id: 'level-up-three',
      targetId: 'page:shop',
      progressLabel: '6.4/8 coin',
      stepLabel: '24/35',
    });
  });

  it('introduces herbs on level 4', () => {
    expect(getStep({ snapshot: createLevelFourSnapshot() })).toMatchObject({
      id: 'intro-garden',
      kind: 'dialog',
      targetId: 'page:garden',
      lessonTitle: 'garden opened',
      stepLabel: '25/35',
    });
  });

  it('opens pinned level 4 requirements before sending the player to garden', () => {
    expect(
      getStep({
        snapshot: createLevelFourSnapshot(),
        completed: completedThrough('intro-garden'),
      }),
    ).toMatchObject({
      id: 'grow-sage',
      targetId: 'workshop:tasks',
      hintText: 'open level 5 requirements',
      stepLabel: '26/35',
    });
  });

  it('guides level 4 sage herb turn-in after harvest', () => {
    expect(
      getStep({
        snapshot: createLevelFourSnapshot({
          inventory: [{ key: 'sageHerb', quantity: 1 }],
          tasks: {
            currentLevel: 4,
            level: {
              completion: { canComplete: false, costCoin: 16 },
              tasks: [
                createTask({
                  taskId: 'level4-turn-in-sage-herb',
                  itemKey: 'sageHerb',
                  requiredQuantity: 2,
                  progressQuantity: 1,
                  remainingQuantity: 1,
                  canFill: true,
                }),
              ],
            },
          },
        }),
        dom: createDomFake({ tasksExpanded: true }),
        completed: completedThrough('first-harvest-complete'),
      }),
    ).toMatchObject({
      id: 'fill-sage-herb-task',
      targetId: 'task:level4-turn-in-sage-herb',
      hintText: 'turn in sage',
      stepLabel: '28/35',
    });
  });

  it('guides level 4 mint herb after sage herb is handled', () => {
    expect(
      getStep({
        snapshot: createLevelFourSnapshot({
          tasks: {
            currentLevel: 4,
            level: {
              completion: { canComplete: false, costCoin: 16 },
              tasks: [
                createTask({
                  taskId: 'level4-turn-in-sage-herb',
                  itemKey: 'sageHerb',
                  requiredQuantity: 2,
                  progressQuantity: 2,
                  remainingQuantity: 0,
                  completed: true,
                }),
                createTask({
                  taskId: 'level4-turn-in-mint-herb',
                  itemKey: 'mintHerb',
                  requiredQuantity: 1,
                  progressQuantity: 0,
                  remainingQuantity: 1,
                }),
              ],
            },
          },
        }),
        completed: completedThrough('fill-sage-herb-task'),
      }),
    ).toMatchObject({
      id: 'fill-mint-herb-task',
      targetId: 'page:garden',
      stepLabel: '29/35',
    });
  });

  it('uses seeds and herbs for the level 4 coin gate', () => {
    expect(
      getStep({
        snapshot: createLevelFourSnapshot({
          coin: { current: 10 },
          inventory: [{ key: 'sageHerb', quantity: 2 }],
          shop: {
            shelf: {
              slots: [],
              sellItems: [{ key: 'sageHerb', kind: 'herb', quantity: 2, fastSellCoin: 4.8 }],
            },
          },
          tasks: {
            currentLevel: 4,
            level: {
              completion: { canComplete: true, costCoin: 16 },
              tasks: [
                createTask({
                  taskId: 'level4-turn-in-sage-herb',
                  itemKey: 'sageHerb',
                  requiredQuantity: 2,
                  progressQuantity: 2,
                  remainingQuantity: 0,
                  completed: true,
                }),
                createTask({
                  taskId: 'level4-turn-in-mint-herb',
                  itemKey: 'mintHerb',
                  requiredQuantity: 1,
                  progressQuantity: 1,
                  remainingQuantity: 0,
                  completed: true,
                }),
              ],
            },
          },
        }),
      }),
    ).toMatchObject({
      id: 'level-up-four',
      targetId: 'page:shop',
      progressLabel: '10/16 coin',
      stepLabel: '30/35',
    });
  });

  it('introduces mana tonic research on level 5', () => {
    expect(getStep({ pageId: 'research', snapshot: createLevelFiveSnapshot() })).toMatchObject({
      id: 'research-mana-tonic',
      targetId: 'research:unlockRecipe:manaTonic',
      stepLabel: '31/35',
    });
  });

  it('guides brewing mana tonic after recipe research', () => {
    expect(
      getStep({
        pageId: 'brewing',
        snapshot: createLevelFiveSnapshot({
          research: {
            completedResearchIds: ['unlockRecipe:manaTonic'],
            inProgressResearches: [],
          },
        }),
        completed: completedThrough('intro-brewing'),
      }),
    ).toMatchObject({
      id: 'brew-mana-tonic',
      targetId: 'brewing:herb:sageHerb',
      hintText: 'tap sage to fill cauldron. recipes care about order',
      stepLabel: '33/35',
    });
  });

  it('turns in mana tonic on level 5 after brewing', () => {
    expect(
      getStep({
        snapshot: createLevelFiveSnapshot({
          inventory: [{ key: 'manaTonic', quantity: 1 }],
          research: {
            completedResearchIds: ['unlockRecipe:manaTonic'],
            inProgressResearches: [],
          },
          tasks: {
            currentLevel: 5,
            level: {
              completion: { canComplete: false, costCoin: 30 },
              tasks: [
                createTask({
                  taskId: 'level5-turn-in-mana-tonic',
                  itemKey: 'manaTonic',
                  requiredQuantity: 1,
                  progressQuantity: 0,
                  remainingQuantity: 1,
                  canFill: true,
                }),
              ],
            },
          },
        }),
        dom: createDomFake({ tasksExpanded: true }),
        completed: completedThrough('first-brew-complete'),
      }),
    ).toMatchObject({
      id: 'refill-mana-tonic-cauldron',
      targetId: 'task:level5-turn-in-mana-tonic',
      hintText: 'turn in mana tonic',
      stepLabel: '35/35',
    });
  });

  it('completes FTUE once the player reaches level 6', () => {
    const progress = createProgressFake();

    expect(
      getStep({
        snapshot: createSnapshot({
          tasks: {
            currentLevel: 6,
            level: { completion: { canComplete: false, costCoin: 50 }, tasks: [] },
          },
        }),
        progress,
      }),
    ).toBeNull();
    expect(TUTORIAL_STEP_IDS.every((stepId) => progress.completedStepIds.has(stepId))).toBe(true);
  });
});
