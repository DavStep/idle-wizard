// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { getPrestigeResetLevel } from '../gameplay/GameplayFacade.js';
import packageJson from '../../package.json';
import { PlayerFacade } from '../player/PlayerFacade.js';
import { PagesFacade } from './PagesFacade.js';
import { setNotificationVisibilityPolicy } from './shared/notificationBadge.js';
import { TUTORIAL_STORAGE_KEY } from './tutorial/managers/TutorialProgressManager.js';
import { TUTORIAL_STEP_IDS } from './tutorial/managers/TutorialStepManager.js';
import { WORKSHOP_CHAT_PENDING_STORAGE_KEY } from './workshop/managers/WorkshopChatPendingMessageManager.js';

afterEach(() => {
  setNotificationVisibilityPolicy(null);
  try {
    window.localStorage?.removeItem?.(WORKSHOP_CHAT_PENDING_STORAGE_KEY);
  } catch {
    // Ignore unavailable storage in jsdom edge cases.
  }
});

function createGameplayFacadeFake() {
  const snapshot = {
    mana: {
      current: 0,
      cap: 50,
      perSecond: 1,
    },
    coin: {
      current: 0,
    },
    crystal: {
      current: 0,
    },
    emerald: {
      current: 0,
    },
    ruby: {
      current: 0,
    },
    prestige: {
      currentLevel: 1,
      maxLevel: 20,
      completedLevels: [],
      earnedRuby: 0,
      nextRuby: 1,
      highestAvailableLevel: null,
      milestones: [
        {
          level: 10,
          rewardRuby: 1,
          completed: false,
          unlocked: false,
          canComplete: false,
          currentLevel: 1,
          lowerThanHighestAvailable: false,
          nextRun: {
            level: getPrestigeResetLevel(10),
            mana: 0,
            coin: 0,
            crystal: 0,
            emerald: 0,
            ruby: 1,
          },
        },
        {
          level: 20,
          rewardRuby: 1,
          completed: false,
          unlocked: false,
          canComplete: false,
          currentLevel: 1,
          lowerThanHighestAvailable: false,
          nextRun: {
            level: getPrestigeResetLevel(20),
            mana: 0,
            coin: 0,
            crystal: 0,
            emerald: 0,
            ruby: 1,
          },
        },
        {
          level: 30,
          rewardRuby: 1,
          completed: false,
          unlocked: false,
          canComplete: false,
          currentLevel: 1,
          lowerThanHighestAvailable: false,
          nextRun: {
            level: getPrestigeResetLevel(30),
            mana: 0,
            coin: 0,
            crystal: 0,
            emerald: 0,
            ruby: 1,
          },
        },
      ],
    },
    visualSettings: {
      costsCrystal: {
        theme: { white: 0, black: 0, midnight: 0, witchcraft: 0 },
        font: { lexend: 0, 'comic-sans-mono': 0 },
        progressBar: { regular: 0, gradient: 0 },
      },
      researched: {
        theme: { white: true, black: false, midnight: false, witchcraft: false },
        font: {
          lexend: true,
          'comic-sans-mono': false,
        },
        progressBar: { regular: true, gradient: false },
      },
    },
    inventory: [],
    seedInventory: [
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: 0,
      },
    ],
    seedSummoning: {
      cost: 10,
      quantity: 1,
      canSummon: false,
    },
    tasks: {
      currentLevel: 1,
      maxLevel: 20,
      completedAllLevels: false,
      level: {
        level: 1,
        completedTasks: 0,
        totalTasks: 1,
        completion: {
          level: 1,
          costCoin: 10,
          allTasksCompleted: false,
          atMaxLevel: false,
          completedAllLevels: false,
          canComplete: false,
        },
        tasks: [
          {
            taskId: 'level1-sage-seeds',
            level: 1,
            action: 'drop',
            itemTypeId: 1,
            itemKey: 'sageSeed',
            itemLabel: 'sage seed',
            itemKind: 'seed',
            requiredQuantity: 5,
            progressQuantity: 0,
            remainingQuantity: 5,
            ownedQuantity: 0,
            progress: 0,
            maxed: false,
            completed: false,
            canFill: false,
            canComplete: false,
          },
        ],
      },
    },
    playerLevel: {
      currentLevel: 1,
      maxLevel: 20,
      effects: {
        maxGardenTiles: 2,
        maxCauldrons: 1,
        maxShopSlots: 1,
        maxNpcMarketStands: 1,
        maxPlayerMarketStands: 1,
        maxManaCap: 50,
        manaPerSecond: 1,
      },
      levels: [
        {
          level: 1,
          current: true,
          unlocked: true,
          totals: {
            maxGardenTiles: 2,
            maxCauldrons: 1,
            maxNpcMarketStands: 1,
            maxPlayerMarketStands: 1,
            maxManaCap: 50,
            manaPerSecond: 1,
          },
          effects: [
            'max garden tiles 2',
            'max cauldrons 1',
            'max trader market stands 1',
            'max player market stands 1',
            'max mana cap 50',
            'mana regen 1/sec',
          ],
        },
        {
          level: 2,
          current: false,
          unlocked: false,
          totals: {
            maxGardenTiles: 3,
            maxCauldrons: 1,
            maxNpcMarketStands: 1,
            maxPlayerMarketStands: 1,
            maxManaCap: 100,
            manaPerSecond: 2,
          },
          effects: [
            'max garden tiles 3',
            'max mana cap 100',
            'mana regen 2/sec',
            'crystal reward 1',
          ],
        },
        {
          level: 3,
          current: false,
          unlocked: false,
          totals: {
            maxGardenTiles: 3,
            maxCauldrons: 1,
            maxNpcMarketStands: 2,
            maxPlayerMarketStands: 2,
            maxManaCap: 150,
            manaPerSecond: 3,
          },
          effects: [
            'max trader market stands 2',
            'max player market stands 2',
            'max mana cap 150',
            'mana regen 3/sec',
            'crystal reward 1',
          ],
        },
      ],
    },
    brewing: {
      herbs: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
          quantity: 3,
          stagedQuantity: 0,
          availableQuantity: 3,
        },
        {
          itemTypeId: 1002,
          key: 'mintHerb',
          label: 'mint',
          kind: 'herb',
          quantity: 1,
          stagedQuantity: 0,
          availableQuantity: 1,
        },
      ],
      ingredients: [],
      recipes: [
        {
          potionTypeId: 2001,
          key: 'manaTonic',
          label: 'mana tonic',
          manaCost: 12,
          brewDurationMs: 30_000,
          unlocked: false,
          ingredients: [
            {
              itemTypeId: 1001,
              key: 'sageHerb',
              label: 'sage',
              kind: 'herb',
              quantity: 3,
            },
          ],
        },
        {
          potionTypeId: 2002,
          key: 'minorHealingPotion',
          label: 'minor healing potion',
          manaCost: 14,
          brewDurationMs: 35_000,
          unlocked: false,
          ingredients: [
            {
              itemTypeId: 1001,
              key: 'sageHerb',
              label: 'sage',
              kind: 'herb',
              quantity: 2,
            },
            {
              itemTypeId: 1002,
              key: 'mintHerb',
              label: 'mint',
              kind: 'herb',
              quantity: 1,
            },
          ],
        },
      ],
      match: null,
      buttonLabel: 'brew',
      manaCost: 12,
      canAddIngredient: true,
      canBrew: false,
      hasEnoughIngredients: true,
      hasEnoughMana: false,
      activeBrew: null,
      canStartBottling: false,
      canCollectPotion: false,
      maxIngredients: 5,
      unlockedCauldrons: 1,
      maxCauldrons: 1,
      configuredMaxCauldrons: 3,
      cauldronCosts: [0, 1, 3],
      nextCauldronNumber: null,
      nextCauldronCost: null,
      nextCauldronLockedByLevel: false,
      nextCauldronRequiresLevel: null,
      autoBrewEnabled: false,
      autoBrewRecipeKey: null,
    },
    discoveries: {
      seeds: [],
      herbs: [],
      potions: [
        {
          itemTypeId: 2019,
          key: 'ashenMemory',
          label: 'ashen memory',
          kind: 'potion',
          quantity: 0,
          discoveryType: 'unknown',
          type: 'unknown',
          unknown: true,
          known: false,
          researchable: false,
          discovered: false,
          researched: false,
          unlocked: false,
          discoveredByUsername: null,
          discoveredAtMs: null,
          ingredients: [
            {
              itemTypeId: 1001,
              key: 'sageHerb',
              label: 'sage',
              kind: 'herb',
              quantity: 5,
            },
            {
              itemTypeId: 1002,
              key: 'mintHerb',
              label: 'mint',
              kind: 'herb',
              quantity: 3,
            },
            {
              itemTypeId: 1003,
              key: 'nettleHerb',
              label: 'nettle',
              kind: 'herb',
              quantity: 10,
            },
          ],
        },
        {
          itemTypeId: 2020,
          key: 'silverleafQuiet',
          label: 'silverleaf quiet',
          kind: 'potion',
          quantity: 0,
          discoveryType: 'unknown',
          type: 'unknown',
          unknown: true,
          known: true,
          researchable: false,
          discovered: true,
          researched: true,
          unlocked: true,
          discoveredByUsername: 'Ada',
          discoveredAtMs: Date.UTC(2026, 0, 2),
          royaltyCoin: 12.5,
          ingredients: [
            {
              itemTypeId: 1002,
              key: 'mintHerb',
              label: 'mint',
              kind: 'herb',
              quantity: 1,
            },
            {
              itemTypeId: 1006,
              key: 'glowcapHerb',
              label: 'glowcap',
              kind: 'herb',
              quantity: 1,
            },
            {
              itemTypeId: 1009,
              key: 'moonflowerHerb',
              label: 'moonflower',
              kind: 'herb',
              quantity: 1,
            },
          ],
          manaCost: 34,
          brewDurationMs: 75_000,
        },
      ],
    },
    logs: {
      entries: [
        {
          id: 1,
          type: 'gameplay',
          message: 'sold sage seed for 1 coin',
          createdAt: 1_000,
        },
        {
          id: 2,
          type: 'gameplay',
          message: 'brewed wasted potion',
          createdAt: 2_000,
        },
      ],
    },
    research: {
      boxes: [
        {
          id: 'seedUnlocks',
          label: 'seed unlock researches',
          researches: [
            {
              id: 'unlockSeed:sageSeed',
              label: 'sage seed',
              value: 'free',
              effect: 'drop',
              costCoin: 0,
              completed: false,
              canResearch: true,
            },
          ],
        },
        {
          id: 'summonSeeds',
          label: 'summon seeds unlock',
          researches: [
            {
              id: 'summonSeedsX2',
              label: 'x2 summon',
              value: '20 coin',
              effect: '20 mana',
              costCoin: 20,
              completed: false,
              canResearch: false,
            },
          ],
        },
        {
          id: 'recipeUnlocks',
          label: 'recipe unlocks research',
          researches: [
            {
              id: 'unlockRecipe:manaTonic',
              label: 'mana tonic',
              value: '3 coin',
              effect: 'brew',
              costCoin: 3,
              completed: false,
              canResearch: false,
            },
          ],
        },
      ],
    },
    shop: {
      coinOffer: {
        rewardCoin: 20,
        currentLevel: 1,
        cooldownSeconds: 7_200,
        cooldownRemainingSeconds: 0,
        remainingMs: 0,
        ready: true,
        canCollect: true,
      },
      shelf: {
        unlockedSlots: 1,
        maxSlots: 5,
        slotCosts: [0, 1, 3, 6, 10],
        nextSlotNumber: 2,
        nextSlotCost: 1,
        selectedSlotNumber: 1,
        autoSellSeconds: 5,
        sellKinds: [
          { id: 1, kind: 'seed', label: 'seeds', sellCoin: 1 },
          { id: 2, kind: 'herb', label: 'herbs', sellCoin: 2 },
          { id: 3, kind: 'potion', label: 'potions', sellCoin: 5 },
        ],
        sellItems: [
          {
            itemTypeId: 1,
            key: 'sageSeed',
            label: 'sage seed',
            kind: 'seed',
            quantity: 0,
            sellCoin: 1,
            sellNeed: 1000,
          },
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 0,
            sellCoin: 2,
            sellNeed: 800,
          },
          {
            itemTypeId: 2001,
            key: 'manaTonic',
            label: 'mana tonic',
            kind: 'potion',
            quantity: 0,
            sellCoin: 5,
            sellNeed: 300,
          },
        ],
        slots: [
          {
            slotNumber: 1,
            unlocked: true,
            sellItemTypeId: null,
            sellKind: null,
            sellLabel: null,
            sellProgressSeconds: 0,
          },
          {
            slotNumber: 2,
            unlocked: false,
            sellItemTypeId: null,
            sellKind: null,
            sellLabel: null,
            sellProgressSeconds: 0,
          },
          {
            slotNumber: 3,
            unlocked: false,
            sellItemTypeId: null,
            sellKind: null,
            sellLabel: null,
            sellProgressSeconds: 0,
          },
          {
            slotNumber: 4,
            unlocked: false,
            sellItemTypeId: null,
            sellKind: null,
            sellLabel: null,
            sellProgressSeconds: 0,
          },
          {
            slotNumber: 5,
            unlocked: false,
            sellItemTypeId: null,
            sellKind: null,
            sellLabel: null,
            sellProgressSeconds: 0,
          },
        ],
      },
      stock: {
        sellKinds: [
          { id: 1, kind: 'seed', label: 'seeds' },
          { id: 2, kind: 'herb', label: 'herbs' },
          { id: 3, kind: 'potion', label: 'potions' },
        ],
        items: [
          {
            itemTypeId: 1,
            key: 'sageSeed',
            label: 'sage seed',
            kind: 'seed',
            quantity: 0,
            buyCoin: 1.2,
            stock: 4,
          },
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 0,
            buyCoin: 2.4,
            stock: 3,
          },
          {
            itemTypeId: 2001,
            key: 'manaTonic',
            label: 'mana tonic',
            kind: 'potion',
            quantity: 0,
            buyCoin: 6,
            stock: 2,
          },
        ],
      },
      playerShelf: {
        unlockedSlots: 1,
        maxSlots: 5,
        slotCosts: [0, 1, 3, 6, 10],
        nextSlotNumber: 2,
        nextSlotCost: 1,
        selectedSlotNumber: 1,
        sellKinds: [
          { id: 1, kind: 'seed', label: 'seeds', sellCoin: 1 },
          { id: 2, kind: 'herb', label: 'herbs', sellCoin: 2 },
          { id: 3, kind: 'potion', label: 'potions', sellCoin: 5 },
        ],
        sellItems: [
          {
            itemTypeId: 1,
            key: 'sageSeed',
            label: 'sage seed',
            kind: 'seed',
            quantity: 0,
            sellCoin: 1,
          },
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 0,
            sellCoin: 2,
          },
          {
            itemTypeId: 2001,
            key: 'manaTonic',
            label: 'mana tonic',
            kind: 'potion',
            quantity: 0,
            sellCoin: 5,
          },
        ],
        slots: [
          {
            slotNumber: 1,
            unlocked: true,
            itemTypeId: null,
            itemKey: null,
            itemKind: null,
            itemLabel: null,
            quantity: 0,
            priceCoin: 0,
          },
          {
            slotNumber: 2,
            unlocked: false,
            itemTypeId: null,
            itemKey: null,
            itemKind: null,
            itemLabel: null,
            quantity: 0,
            priceCoin: 0,
          },
          {
            slotNumber: 3,
            unlocked: false,
            itemTypeId: null,
            itemKey: null,
            itemKind: null,
            itemLabel: null,
            quantity: 0,
            priceCoin: 0,
          },
          {
            slotNumber: 4,
            unlocked: false,
            itemTypeId: null,
            itemKey: null,
            itemKind: null,
            itemLabel: null,
            quantity: 0,
            priceCoin: 0,
          },
          {
            slotNumber: 5,
            unlocked: false,
            itemTypeId: null,
            itemKey: null,
            itemKind: null,
            itemLabel: null,
            quantity: 0,
            priceCoin: 0,
          },
        ],
      },
      playerRequests: {
        unlockedSlots: 1,
        maxSlots: 5,
        nextSlotNumber: 2,
        nextSlotLockedByLevel: false,
        nextSlotRequiresLevel: null,
        slots: [
          {
            slotNumber: 1,
            unlocked: true,
            itemTypeId: null,
            itemKey: null,
            itemKind: null,
            itemLabel: null,
            quantity: 0,
            priceCoin: 0,
          },
          {
            slotNumber: 2,
            unlocked: false,
            itemTypeId: null,
            itemKey: null,
            itemKind: null,
            itemLabel: null,
            quantity: 0,
            priceCoin: 0,
          },
          {
            slotNumber: 3,
            unlocked: false,
            itemTypeId: null,
            itemKey: null,
            itemKind: null,
            itemLabel: null,
            quantity: 0,
            priceCoin: 0,
          },
          {
            slotNumber: 4,
            unlocked: false,
            itemTypeId: null,
            itemKey: null,
            itemKind: null,
            itemLabel: null,
            quantity: 0,
            priceCoin: 0,
          },
          {
            slotNumber: 5,
            unlocked: false,
            itemTypeId: null,
            itemKey: null,
            itemKind: null,
            itemLabel: null,
            quantity: 0,
            priceCoin: 0,
          },
        ],
      },
    },
    garden: {
      plot: {
        unlockedTiles: 1,
        maxTiles: 10,
        tilesPerRow: 4,
        tileCosts: [0, 1, 3, 6, 10, 15, 21, 28, 36, 45],
        nextTileNumber: 2,
        nextTileCost: 1,
        harvestSeconds: 3,
        tiles: Array.from({ length: 10 }, (_value, index) => ({
          tileNumber: index + 1,
          unlocked: index === 0,
          selectedSeedItemTypeId: null,
          selectedSeedKey: null,
          selectedSeedLabel: null,
          selectedHerbKey: null,
          selectedHerbLabel: null,
          seedItemTypeId: null,
          seedKey: null,
          seedLabel: null,
          herbItemTypeId: null,
          herbKey: null,
          herbLabel: null,
          phase: 'empty',
          totalMs: 0,
          remainingMs: 0,
          progress: 0,
          process: null,
        })),
      },
      seeds: [
        {
          itemTypeId: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
          quantity: 0,
        },
      ],
      herbs: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
          quantity: 3,
        },
        {
          itemTypeId: 1002,
          key: 'mintHerb',
          label: 'mint',
          kind: 'herb',
          quantity: 1,
        },
      ],
    },
    leaderboard: {
      topUsers: [
        {
          name: 'Ada',
          allianceTag: 'VOID',
          character: 'mira',
          playerLevel: 2,
          income: 3,
          totalGeneratedCoin: 0,
          totalIncome: 120,
        },
        {
          name: 'Merlin',
          playerLevel: 10,
          income: 9,
          totalGeneratedCoin: 0,
          totalIncome: 75,
        },
      ],
    },
  };
  const automationResearchBoxes = [
    {
      id: 'autoSeedSpawn',
      label: 'auto seed spawn research',
      researches: [
        {
          id: 'automation:autoSeedSpawn',
          label: 'auto seed spawn',
          value: '10 crystal',
          effect: 'auto',
          costCoin: 0,
          costCrystal: 10,
          costCurrency: 'crystal',
          completed: false,
          canResearch: false,
        },
      ],
    },
    {
      id: 'autoPlantTiles',
      label: 'auto plant tile research',
      researches: [
        {
          id: 'automation:autoPlantTile:1',
          label: 'auto plant tile 1',
          value: '1 crystal',
          effect: 'auto',
          costCoin: 0,
          costCrystal: 1,
          costCurrency: 'crystal',
          completed: false,
          canResearch: false,
        },
        {
          id: 'automation:autoPlantTile:2',
          label: 'auto plant tile 2',
          value: 'locked',
          effect: 'auto',
          costCoin: 0,
          costCrystal: 2,
          costCurrency: 'crystal',
          completed: false,
          locked: true,
          canResearch: false,
        },
      ],
    },
    {
      id: 'autoHarvestTiles',
      label: 'auto harvest tile research',
      researches: [
        {
          id: 'automation:autoHarvestPlant:1',
          label: 'auto harvest tile 1',
          value: '1 crystal',
          effect: 'auto',
          costCoin: 0,
          costCrystal: 1,
          costCurrency: 'crystal',
          completed: false,
          canResearch: false,
        },
      ],
    },
    {
      id: 'autoBrewCauldrons',
      label: 'auto brew cauldron research',
      researches: [
        {
          id: 'automation:autoBrewCauldron:1',
          label: 'auto brew cauldron 1',
          value: '1 crystal',
          effect: 'auto',
          costCoin: 0,
          costCrystal: 1,
          costCurrency: 'crystal',
          completed: false,
          canResearch: false,
        },
      ],
    },
    {
      id: 'autoBottleCauldrons',
      label: 'auto bottle cauldron research',
      researches: [
        {
          id: 'automation:autoBottleCauldron:1',
          label: 'auto bottle cauldron 1',
          value: '1 crystal',
          effect: 'auto',
          costCoin: 0,
          costCrystal: 1,
          costCurrency: 'crystal',
          completed: false,
          canResearch: false,
        },
      ],
    },
  ];
  const advancedResearchBoxes = [
    {
      id: 'fastSell',
      label: 'fast sell research',
      researches: [
        {
          id: 'fastSellPayout:1',
          label: 'fast sell lvl 1',
          value: '2 ruby',
          effect: '85% payout',
          showEffect: true,
          requiredResearchIds: [],
          costCoin: 0,
          costRuby: 2,
          costCurrency: 'ruby',
          completed: false,
          canResearch: false,
        },
      ],
    },
    {
      id: 'cauldronBrewing',
      label: 'cauldron brewing research',
      researches: [
        {
          id: 'advanced:cauldronBrewing:1:1',
          label: 'cauldron 1 brewing lvl 1',
          value: '1 ruby',
          effect: '-5% time',
          showEffect: true,
          requiredResearchIds: [],
          costCoin: 0,
          costRuby: 1,
          costCurrency: 'ruby',
          completed: false,
          canResearch: false,
        },
      ],
    },
    {
      id: 'plotGrowth',
      label: 'plot growth research',
      researches: [
        {
          id: 'advanced:plotGrowth:1:1',
          label: 'plot 1 growth lvl 1',
          value: '1 ruby',
          effect: '-5% time',
          showEffect: true,
          requiredResearchIds: [],
          costCoin: 0,
          costRuby: 1,
          costCurrency: 'ruby',
          completed: false,
          canResearch: false,
        },
      ],
    },
    {
      id: 'researchCost',
      label: 'research cost research',
      researches: [
        {
          id: 'emerald:researchCost:1',
          label: 'research cost lvl 1',
          value: '1 ruby',
          effect: '-10% cost',
          showEffect: true,
          requiredResearchIds: [],
          costCoin: 0,
          costRuby: 1,
          costCurrency: 'ruby',
          completed: false,
          canResearch: false,
        },
      ],
    },
    {
      id: 'researchTime',
      label: 'research time research',
      researches: [
        {
          id: 'advanced:researchTime:1',
          label: 'research time lvl 1',
          value: '1 ruby',
          effect: '-10% time',
          showEffect: true,
          requiredResearchIds: [],
          costCoin: 0,
          costRuby: 1,
          costCurrency: 'ruby',
          completed: false,
          canResearch: false,
        },
      ],
    },
  ];
  const emeraldResearchBoxes = [
    {
      id: 'plotPlanting',
      label: 'plot level up',
      researches: [
        {
          id: 'emerald:plotPlanting:1:2',
          label: 'plot 1 lvl 2',
          value: '1 emerald',
          effect: 'x2 herbs',
          showEffect: true,
          actionType: 'levelUp',
          level: 2,
          requiredResearchIds: [],
          costCoin: 0,
          costEmerald: 1,
          costCurrency: 'emerald',
          completed: false,
          canResearch: false,
        },
      ],
    },
    {
      id: 'cauldronBrewing',
      label: 'cauldron level up',
      researches: [
        {
          id: 'emerald:cauldronBrewing:1:2',
          label: 'cauldron 1',
          value: '1 emerald',
          effect: 'x2 potions',
          showEffect: true,
          actionType: 'levelUp',
          level: 2,
          starLevel: 1,
          requiredResearchIds: [],
          costCoin: 0,
          costEmerald: 1,
          costCurrency: 'emerald',
          completed: false,
          canResearch: false,
        },
      ],
    },
  ];
  snapshot.research.completedResearchIds = [];
  snapshot.research.tabs = [
    {
      id: 'regular',
      label: 'regular research',
      boxes: snapshot.research.boxes,
    },
    {
      id: 'automation',
      label: 'automation',
      boxes: automationResearchBoxes,
    },
    {
      id: 'advanced',
      label: 'advanced research',
      boxes: advancedResearchBoxes,
    },
    {
      id: 'emerald',
      label: 'emerald research',
      boxes: emeraldResearchBoxes,
    },
  ];
  const listeners = new Set();

  const publish = () => {
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const getResearches = () =>
    (snapshot.research.tabs ?? [{ boxes: snapshot.research.boxes }])
      .flatMap((tab) => tab.boxes)
      .flatMap((box) => box.researches);

  const updateResearchAffordability = () => {
    for (const research of getResearches()) {
      const currency = research.costCurrency ?? 'coin';
      const current = getCurrencyCurrent(currency);
      const cost = getResearchCost(research);

      research.canResearch = !research.completed && current >= cost;
    }
  };

  const getCurrencyCurrent = (currency) => {
    if (currency === 'crystal') {
      return snapshot.crystal.current;
    }

    if (currency === 'ruby') {
      return snapshot.ruby.current;
    }

    if (currency === 'emerald') {
      return snapshot.emerald.current;
    }

    return snapshot.coin.current;
  };

  const getResearchCost = (research) => {
    if (research.costCurrency === 'crystal') {
      return research.costCrystal;
    }

    if (research.costCurrency === 'ruby') {
      return research.costRuby;
    }

    if (research.costCurrency === 'emerald') {
      return research.costEmerald;
    }

    return research.costCoin;
  };

  const getResearchCurrent = (research) =>
    getCurrencyCurrent(research.costCurrency ?? 'coin');

  const spendResearchCost = (research) => {
    if (research.costCurrency === 'crystal') {
      snapshot.crystal.current -= research.costCrystal;
      return;
    }

    if (research.costCurrency === 'ruby') {
      snapshot.ruby.current -= research.costRuby;
      return;
    }

    if (research.costCurrency === 'emerald') {
      snapshot.emerald.current -= research.costEmerald;
      return;
    }

    snapshot.coin.current -= research.costCoin;
  };

  const isResearchComplete = (researchId) =>
    getResearches().some((research) => research.id === researchId && research.completed);

  const updateBrewing = () => {
    const stagedCounts = new Map();

    for (const ingredient of snapshot.brewing.ingredients) {
      stagedCounts.set(ingredient.itemTypeId, (stagedCounts.get(ingredient.itemTypeId) ?? 0) + 1);
    }

    for (const herb of snapshot.brewing.herbs) {
      herb.stagedQuantity = stagedCounts.get(herb.itemTypeId) ?? 0;
      herb.availableQuantity = Math.max(0, herb.quantity - herb.stagedQuantity);
    }

    const ingredientIds = snapshot.brewing.ingredients.map((ingredient) => ingredient.itemTypeId);
    const manaTonicMatches =
      ingredientIds.length === 3 && ingredientIds.every((itemTypeId) => itemTypeId === 1001);

    if (manaTonicMatches) {
      const unlocked = isResearchComplete('unlockRecipe:manaTonic');
      snapshot.brewing.match = {
        potionTypeId: 2001,
        key: 'manaTonic',
        label: 'mana tonic',
        manaCost: 12,
        brewDurationMs: 30_000,
        unlocked,
      };
      snapshot.brewing.buttonLabel = unlocked ? 'brew mana tonic' : 'brew';
    } else {
      snapshot.brewing.match = null;
      snapshot.brewing.buttonLabel = 'brew';
    }

    for (const recipe of snapshot.brewing.recipes) {
      recipe.unlocked = isResearchComplete(`unlockRecipe:${recipe.key}`);
    }

    snapshot.brewing.manaCost = snapshot.brewing.match?.manaCost ?? 5;
    snapshot.brewing.hasEnoughMana = snapshot.mana.current >= snapshot.brewing.manaCost;
    snapshot.brewing.hasEnoughIngredients = snapshot.brewing.herbs.every(
      (herb) => herb.quantity >= herb.stagedQuantity,
    );
    snapshot.brewing.canAddIngredient =
      !snapshot.brewing.activeBrew &&
      snapshot.brewing.ingredients.length < snapshot.brewing.maxIngredients;
    snapshot.brewing.canBrew =
      !snapshot.brewing.activeBrew &&
      snapshot.brewing.ingredients.length > 0 &&
      snapshot.brewing.hasEnoughIngredients &&
      snapshot.brewing.hasEnoughMana;
    snapshot.brewing.canStartBottling = Boolean(
      snapshot.brewing.activeBrew?.canStartBottling,
    );
    snapshot.brewing.canCollectPotion = Boolean(snapshot.brewing.activeBrew?.canCollect);
  };
  const updateBrewingNextCauldron = () => {
    const brewing = snapshot.brewing;
    const unlockedCauldrons = Number.isInteger(brewing.unlockedCauldrons)
      ? brewing.unlockedCauldrons
      : (brewing.cauldrons?.length ?? 1);
    const nextCauldronNumber = unlockedCauldrons + 1;
    const nextCauldronCost = brewing.cauldronCosts?.[nextCauldronNumber - 1] ?? null;
    brewing.unlockedCauldrons = unlockedCauldrons;
    brewing.nextCauldronNumber = nextCauldronCost === null ? null : nextCauldronNumber;
    brewing.nextCauldronCost = nextCauldronCost;
    brewing.nextCauldronLockedByLevel =
      nextCauldronCost !== null && nextCauldronNumber > brewing.maxCauldrons;
    brewing.nextCauldronRequiresLevel = brewing.nextCauldronLockedByLevel ? 5 : null;
  };

  const updateGardenNextTile = () => {
    const garden = snapshot.garden.plot;
    const nextTileNumber = garden.unlockedTiles + 1;
    const nextTileCost = garden.tileCosts[nextTileNumber - 1] ?? null;
    garden.nextTileNumber = nextTileCost === null ? null : nextTileNumber;
    garden.nextTileCost = nextTileCost;
  };
  const getKnownItemSnapshots = () => [
    ...snapshot.inventory,
    ...snapshot.seedInventory,
    ...snapshot.brewing.herbs,
    ...snapshot.brewing.recipes.map((recipe) => ({
      itemTypeId: recipe.potionTypeId,
      key: recipe.key,
      label: recipe.label,
      kind: 'potion',
      quantity: 0,
    })),
    ...snapshot.shop.shelf.sellItems,
  ];
  const getItemDefinitionByKey = (itemKey) => {
    const item = getKnownItemSnapshots().find((candidate) => candidate.key === itemKey);

    if (!item) {
      throw new Error('Unknown item.');
    }

    return {
      id: item.itemTypeId,
      key: item.key,
      label: item.label,
      kind: item.kind,
    };
  };
  const getItemStack = (itemTypeId) =>
    snapshot.inventory.find((item) => item.itemTypeId === itemTypeId) ??
    snapshot.seedInventory.find((item) => item.itemTypeId === itemTypeId) ??
    null;
  const getItemQuantity = (itemTypeId) => getItemStack(itemTypeId)?.quantity ?? 0;
  const addItemQuantity = (item, quantity) => {
    const stack = getItemStack(item.itemTypeId);

    if (stack) {
      stack.quantity += quantity;
      return;
    }

    snapshot.inventory.push({
      itemTypeId: item.itemTypeId,
      key: item.key,
      label: item.label,
      kind: item.kind,
      quantity,
    });
  };
  const removeItemQuantity = (itemTypeId, quantity) => {
    const stack = getItemStack(itemTypeId);

    if (!stack || stack.quantity < quantity) {
      return false;
    }

    stack.quantity -= quantity;
    return true;
  };
  const getTask = (taskId) =>
    snapshot.tasks.level.tasks.find((candidate) => candidate.taskId === taskId) ?? null;
  const createGardenHerbForSeed = (seed) => {
    const herbLabel = seed.label.replace(/\s+seed$/i, '');

    return {
      itemTypeId: 1000 + seed.itemTypeId,
      key: `${seed.key.replace(/Seed$/, '')}Herb`,
      label: herbLabel,
      kind: 'herb',
    };
  };
  const syncTaskState = (task) => {
    task.remainingQuantity = Math.max(0, task.requiredQuantity - task.progressQuantity);
    task.ownedQuantity = getItemQuantity(task.itemTypeId);
    task.progress = task.requiredQuantity <= 0 ? 1 : task.progressQuantity / task.requiredQuantity;
    task.maxed = task.progressQuantity >= task.requiredQuantity;
    task.canFill = !task.completed && !task.maxed && task.ownedQuantity > 0;
    task.canComplete = !task.completed && task.maxed;
  };

  const gameplayFacade = {
    getSnapshot: () => snapshot,
    itemsFacade: {
      getItemDefinitionByKey,
      getItemQuantity,
    },
    createPersistenceSave: () => ({
      tasks: { currentLevel: snapshot.tasks.currentLevel },
      coin: { current: snapshot.coin.current },
      crystal: { current: snapshot.crystal.current },
    }),
    publishSnapshot: publish,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    summonSeed: () => ({
      ok: false,
      reason: 'not_enough_mana',
    }),
    fillTask: (taskId) => {
      const task = getTask(taskId);

      if (!task) {
        return {
          ok: false,
          reason: 'unknown_task',
          taskId,
        };
      }

      syncTaskState(task);

      if (task.completed) {
        return {
          ok: false,
          reason: 'already_completed',
          taskId,
        };
      }

      if (task.maxed) {
        return {
          ok: false,
          reason: 'ready_to_complete',
          taskId,
        };
      }

      const quantity = Math.min(task.ownedQuantity, task.remainingQuantity);

      if (quantity <= 0 || !removeItemQuantity(task.itemTypeId, quantity)) {
        syncTaskState(task);
        return {
          ok: false,
          reason: 'not_enough_items',
          taskId,
        };
      }

      task.progressQuantity += quantity;
      syncTaskState(task);
      publish();

      return {
        ok: true,
        taskId,
        quantity,
        progressQuantity: task.progressQuantity,
        requiredQuantity: task.requiredQuantity,
        maxed: task.maxed,
      };
    },
    completeTask: (taskId) => {
      const task = getTask(taskId);

      if (!task) {
        return {
          ok: false,
          reason: 'unknown_task',
          taskId,
        };
      }

      syncTaskState(task);

      if (!task.maxed) {
        return {
          ok: false,
          reason: 'not_ready',
          taskId,
        };
      }

      task.completed = true;
      task.progressQuantity = task.requiredQuantity;
      snapshot.tasks.level.completedTasks = snapshot.tasks.level.tasks.filter(
        (candidate) => candidate.completed,
      ).length;
      snapshot.tasks.level.completion.allTasksCompleted =
        snapshot.tasks.level.completedTasks >= snapshot.tasks.level.totalTasks;
      snapshot.tasks.level.completion.canComplete =
        snapshot.tasks.level.completion.allTasksCompleted;
      syncTaskState(task);
      publish();

      return {
        ok: true,
        taskId,
        level: snapshot.tasks.currentLevel,
      };
    },
    buyShopShelfSlot: () => ({
      ok: false,
      reason: 'not_enough_coin',
      cost: 1,
      slotNumber: 2,
    }),
    buyPlayerShopShelfSlot: () => ({
      ok: false,
      reason: 'not_enough_coin',
      cost: 1,
      slotNumber: 2,
    }),
    buyGardenTile: () => {
      const garden = snapshot.garden.plot;
      const tileNumber = garden.nextTileNumber;
      const cost = garden.nextTileCost;

      if (!tileNumber) {
        return {
          ok: false,
          reason: 'max_tiles',
        };
      }

      if (snapshot.coin.current < cost) {
        return {
          ok: false,
          reason: 'not_enough_coin',
          cost,
          tileNumber,
        };
      }

      snapshot.coin.current -= cost;
      garden.unlockedTiles += 1;
      garden.tiles[tileNumber - 1].unlocked = true;
      updateGardenNextTile();
      publish();

      return {
        ok: true,
        cost,
        tileNumber,
      };
    },
    buyBrewingCauldron: () => {
      const brewing = snapshot.brewing;
      const cauldronNumber = brewing.nextCauldronNumber;
      const cost = brewing.nextCauldronCost;

      if (!cauldronNumber) {
        return {
          ok: false,
          reason: 'max_cauldrons',
        };
      }

      if (brewing.nextCauldronLockedByLevel) {
        return {
          ok: false,
          reason: 'level_locked',
          cauldronNumber,
          requiredLevel: brewing.nextCauldronRequiresLevel,
        };
      }

      if (snapshot.coin.current < cost) {
        return {
          ok: false,
          reason: 'not_enough_coin',
          cost,
          cauldronNumber,
        };
      }

      snapshot.coin.current -= cost;
      brewing.unlockedCauldrons += 1;
      const brewingFields = { ...brewing };
      delete brewingFields.cauldrons;
      const cauldrons = Array.isArray(brewing.cauldrons)
        ? brewing.cauldrons
        : [
            {
              ...brewingFields,
              cauldronIndex: 0,
              cauldronNumber: 1,
              unlocked: true,
              ingredients: brewing.ingredients,
              activeBrew: brewing.activeBrew,
            },
          ];
      cauldrons.push({
        ...brewingFields,
        cauldronIndex: cauldronNumber - 1,
        cauldronNumber,
        unlocked: true,
        ingredients: [],
        activeBrew: null,
      });
      brewing.cauldrons = cauldrons;
      updateBrewingNextCauldron();
      publish();

      return {
        ok: true,
        cost,
        cauldronNumber,
      };
    },
    completeTaskLevel: () => {
      const completion = snapshot.tasks.level.completion;

      if (!completion?.canComplete) {
        return {
          ok: false,
          reason: 'tasks_incomplete',
        };
      }

      if (snapshot.coin.current < completion.costCoin) {
        return {
          ok: false,
          reason: 'not_enough_coin',
          costCoin: completion.costCoin,
        };
      }

      snapshot.coin.current -= completion.costCoin;
      snapshot.tasks.currentLevel += 1;
      snapshot.tasks.level.level = snapshot.tasks.currentLevel;
      snapshot.tasks.level.completion = {
        ...completion,
        level: snapshot.tasks.currentLevel,
        allTasksCompleted: false,
        canComplete: false,
      };
      publish();

      return {
        ok: true,
        currentLevel: snapshot.tasks.currentLevel,
        costCoin: completion.costCoin,
      };
    },
    completePrestigeMilestone: (level, { confirmedLower = false } = {}) => {
      const milestone = snapshot.prestige.milestones.find((candidate) => candidate.level === level);

      if (!milestone) {
        return {
          ok: false,
          reason: 'unknown_milestone',
        };
      }

      if (milestone.lowerThanHighestAvailable && !confirmedLower) {
        return {
          ok: false,
          reason: 'higher_prestige_available',
          milestone,
          highestAvailableLevel: snapshot.prestige.highestAvailableLevel,
        };
      }

      milestone.completed = true;
      milestone.canComplete = false;
      milestone.lowerThanHighestAvailable = false;
      snapshot.prestige.completedLevels.push(level);
      snapshot.prestige.earnedRuby += milestone.rewardRuby;
      snapshot.ruby.current = snapshot.prestige.earnedRuby;
      const resetLevel = getPrestigeResetLevel(level);
      snapshot.tasks.currentLevel = resetLevel;
      snapshot.playerLevel.currentLevel = resetLevel;
      snapshot.prestige.currentLevel = resetLevel;
      publish();

      return {
        ok: true,
        milestone,
        currentRuby: snapshot.ruby.current,
      };
    },
    plantGardenSeed: (tileNumber, seedTypeId) => {
      const tile = snapshot.garden.plot.tiles[tileNumber - 1];
      const seed = snapshot.garden.seeds.find((candidate) => candidate.itemTypeId === seedTypeId);

      if (!tile?.unlocked) {
        return {
          ok: false,
          reason: 'tile_locked',
          tileNumber,
        };
      }

      if (tile.phase !== 'empty') {
        return {
          ok: false,
          reason: 'tile_busy',
          tileNumber,
        };
      }

      if (!seed || seed.quantity <= 0) {
        return {
          ok: false,
          reason: 'not_enough_seed',
          seed,
        };
      }

      const herb = createGardenHerbForSeed(seed);

      seed.quantity -= 1;
      tile.selectedSeedItemTypeId = seed.itemTypeId;
      tile.selectedSeedKey = seed.key;
      tile.selectedSeedLabel = seed.label;
      tile.selectedHerbKey = herb.key;
      tile.selectedHerbLabel = herb.label;
      tile.seedItemTypeId = seed.itemTypeId;
      tile.seedKey = seed.key;
      tile.seedLabel = seed.label;
      tile.herbItemTypeId = herb.itemTypeId;
      tile.herbKey = herb.key;
      tile.herbLabel = herb.label;
      tile.phase = 'growing';
      tile.totalMs = 12_000;
      tile.remainingMs = 12_000;
      tile.progress = 0;
      tile.process = {
        phase: 'growing',
        totalMs: 12_000,
        remainingMs: 12_000,
        progress: 0,
      };
      publish();

      return {
        ok: true,
        tileNumber,
        seed,
        herb,
        durationMs: 12_000,
      };
    },
    selectGardenSeed: (tileNumber, seedTypeId) => {
      const tile = snapshot.garden.plot.tiles[tileNumber - 1];

      if (!tile?.unlocked) {
        return {
          ok: false,
          reason: 'tile_locked',
          tileNumber,
        };
      }

      if (tile.phase !== 'empty') {
        return {
          ok: false,
          reason: 'tile_busy',
          tileNumber,
        };
      }

      if (!seedTypeId) {
        tile.selectedSeedItemTypeId = null;
        tile.selectedSeedKey = null;
        tile.selectedSeedLabel = null;
        tile.selectedHerbKey = null;
        tile.selectedHerbLabel = null;
        publish();
        return {
          ok: true,
          tileNumber,
          seed: null,
          herb: null,
          planted: false,
        };
      }

      const seed = snapshot.garden.seeds.find((candidate) => candidate.itemTypeId === seedTypeId);

      if (!seed) {
        return {
          ok: false,
          reason: 'not_seed',
          itemTypeId: seedTypeId,
        };
      }

      tile.selectedSeedItemTypeId = seed.itemTypeId;
      tile.selectedSeedKey = seed.key;
      tile.selectedSeedLabel = seed.label;
      const herb = createGardenHerbForSeed(seed);
      tile.selectedHerbKey = herb.key;
      tile.selectedHerbLabel = herb.label;

      if (seed.quantity > 0) {
        const result = gameplayFacade.plantGardenSeed(tileNumber, seedTypeId);
        return result.ok ? { ...result, planted: true } : { ok: true, planted: false };
      }

      publish();
      return {
        ok: true,
        tileNumber,
        seed,
        planted: false,
      };
    },
    plantSelectedGardenSeed: (tileNumber) => {
      const tile = snapshot.garden.plot.tiles[tileNumber - 1];

      if (!tile?.selectedSeedItemTypeId) {
        return {
          ok: false,
          reason: 'no_seed_selected',
          tileNumber,
        };
      }

      return gameplayFacade.plantGardenSeed(tileNumber, tile.selectedSeedItemTypeId);
    },
    startGardenHarvest: (tileNumber) => {
      const tile = snapshot.garden.plot.tiles[tileNumber - 1];

      if (!tile?.unlocked) {
        return {
          ok: false,
          reason: 'tile_locked',
          tileNumber,
        };
      }

      if (tile.phase !== 'ready') {
        return {
          ok: false,
          reason: 'not_ready',
          tileNumber,
        };
      }

      tile.phase = 'harvesting';
      tile.totalMs = 3_000;
      tile.remainingMs = 3_000;
      tile.progress = 0;
      tile.process = {
        phase: 'harvesting',
        totalMs: 3_000,
        remainingMs: 3_000,
        progress: 0,
      };
      publish();

      return {
        ok: true,
        tileNumber,
        herb: {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
        },
        durationMs: 3_000,
      };
    },
    cancelGardenPlanting: (tileNumber) => {
      const tile = snapshot.garden.plot.tiles[tileNumber - 1];

      if (!tile?.process || !tile.seedItemTypeId) {
        return {
          ok: false,
          reason: 'not_in_progress',
          tileNumber,
        };
      }

      const seed = snapshot.garden.seeds.find(
        (candidate) => candidate.itemTypeId === tile.seedItemTypeId,
      );

      if (seed) {
        seed.quantity += 1;
      }

      tile.selectedSeedItemTypeId = null;
      tile.selectedSeedKey = null;
      tile.selectedSeedLabel = null;
      tile.selectedHerbKey = null;
      tile.selectedHerbLabel = null;
      tile.seedItemTypeId = null;
      tile.seedKey = null;
      tile.seedLabel = null;
      tile.herbItemTypeId = null;
      tile.herbKey = null;
      tile.herbLabel = null;
      tile.phase = 'empty';
      tile.totalMs = 0;
      tile.remainingMs = 0;
      tile.progress = 0;
      tile.process = null;
      publish();

      return {
        ok: true,
        tileNumber,
        seed,
      };
    },
    buyResearch: (researchId) => {
      const research = getResearches().find((candidate) => candidate.id === researchId);

      if (!research) {
        return {
          ok: false,
          reason: 'unknown_research',
          researchId,
        };
      }

      if (research.completed) {
        return {
          ok: false,
          reason: 'already_researched',
          researchId,
          cost: getResearchCost(research),
          ...(research.costCurrency ? { costCurrency: research.costCurrency } : {}),
        };
      }

      if (getResearchCurrent(research) < getResearchCost(research)) {
        return {
          ok: false,
          reason: `not_enough_${research.costCurrency ?? 'coin'}`,
          researchId,
          cost: getResearchCost(research),
          ...(research.costCurrency ? { costCurrency: research.costCurrency } : {}),
        };
      }

      spendResearchCost(research);
      research.completed = true;
      research.value = 'researched';
      snapshot.research.completedResearchIds ??= [];
      if (!snapshot.research.completedResearchIds.includes(researchId)) {
        snapshot.research.completedResearchIds.push(researchId);
      }
      updateResearchAffordability();
      updateBrewing();
      publish();

      return {
        ok: true,
        researchId,
        cost: getResearchCost(research),
        ...(research.costCurrency ? { costCurrency: research.costCurrency } : {}),
      };
    },
    buyVisualSettingOption: (categoryKey, optionKey) => {
      const category = snapshot.visualSettings.researched[categoryKey];

      if (!category || !(optionKey in category)) {
        return {
          ok: false,
          reason: 'unknown_visual_setting',
        };
      }

      const costCrystal = snapshot.visualSettings.costsCrystal[categoryKey]?.[optionKey] ?? 0;

      if (category[optionKey]) {
        return {
          ok: false,
          reason: 'already_researched',
          category: categoryKey,
          optionKey,
          costCrystal,
          costCurrency: 'crystal',
        };
      }

      if (snapshot.crystal.current < costCrystal) {
        return {
          ok: false,
          reason: 'not_enough_crystal',
          category: categoryKey,
          optionKey,
          costCrystal,
          costCurrency: 'crystal',
        };
      }

      snapshot.crystal.current -= costCrystal;
      category[optionKey] = true;
      publish();

      return {
        ok: true,
        category: categoryKey,
        optionKey,
        costCrystal,
        costCurrency: 'crystal',
      };
    },
    selectShopShelfSlot: (slotNumber) => {
      const slot = snapshot.shop.shelf.slots.find(
        (shelfSlot) => shelfSlot.slotNumber === slotNumber,
      );

      if (!slot?.unlocked) {
        return {
          ok: false,
          reason: 'slot_locked',
          slotNumber,
        };
      }

      snapshot.shop.shelf.selectedSlotNumber = slotNumber;
      return {
        ok: true,
        slotNumber,
      };
    },
    selectPlayerShopShelfSlot: (slotNumber) => {
      const slot = snapshot.shop.playerShelf.slots.find(
        (shelfSlot) => shelfSlot.slotNumber === slotNumber,
      );

      if (!slot?.unlocked) {
        return {
          ok: false,
          reason: 'slot_locked',
          slotNumber,
        };
      }

      snapshot.shop.playerShelf.selectedSlotNumber = slotNumber;
      return {
        ok: true,
        slotNumber,
      };
    },
    addBrewingIngredient: (itemTypeId) => {
      const herb = snapshot.brewing.herbs.find((candidate) => candidate.itemTypeId === itemTypeId);

      if (!herb || herb.availableQuantity <= 0) {
        return {
          ok: false,
          reason: 'not_enough_item',
        };
      }

      snapshot.brewing.ingredients.push({
        slotIndex: snapshot.brewing.ingredients.length,
        itemTypeId: herb.itemTypeId,
        key: herb.key,
        label: herb.label,
        kind: herb.kind,
      });
      updateBrewing();
      publish();

      return {
        ok: true,
        item: herb,
      };
    },
    removeBrewingIngredientAt: (slotIndex) => {
      if (!snapshot.brewing.ingredients[slotIndex]) {
        return {
          ok: false,
          reason: 'unknown_ingredient',
          slotIndex,
        };
      }

      snapshot.brewing.ingredients.splice(slotIndex, 1);
      snapshot.brewing.ingredients.forEach((ingredient, index) => {
        ingredient.slotIndex = index;
      });
      updateBrewing();
      publish();

      return {
        ok: true,
        slotIndex,
      };
    },
    clearBrewingCauldron: () => {
      snapshot.brewing.ingredients = [];
      updateBrewing();
      publish();

      return {
        ok: true,
      };
    },
    prepareBrewingRecipe: (recipeKey) => {
      const recipe = snapshot.brewing.recipes.find((candidate) => candidate.key === recipeKey);

      if (!recipe) {
        return {
          ok: false,
          reason: 'auto_recipe_not_found',
        };
      }

      const ingredientItemTypeIds = recipe.ingredients.flatMap((ingredient) => {
        const quantity = Number.isFinite(ingredient.quantity) ? Math.floor(ingredient.quantity) : 1;
        return Array.from({ length: Math.max(1, quantity) }, () => ingredient.itemTypeId);
      });
      const counts = new Map();

      for (const itemTypeId of ingredientItemTypeIds) {
        counts.set(itemTypeId, (counts.get(itemTypeId) ?? 0) + 1);
      }

      const missingIngredients = [...counts]
        .map(([itemTypeId, requiredQuantity]) => {
          const herb = snapshot.brewing.herbs.find(
            (candidate) => candidate.itemTypeId === itemTypeId,
          );
          const ownedQuantity = herb?.quantity ?? 0;
          const missingQuantity = requiredQuantity - ownedQuantity;

          if (missingQuantity <= 0) {
            return null;
          }

          return {
            itemTypeId,
            key: herb?.key ?? '',
            label: herb?.label ?? 'unknown',
            kind: herb?.kind ?? 'herb',
            requiredQuantity,
            ownedQuantity,
            missingQuantity,
          };
        })
        .filter(Boolean);

      snapshot.brewing.ingredients = [];

      if (missingIngredients.length > 0) {
        updateBrewing();
        publish();

        return {
          ok: false,
          reason: 'not_enough_ingredients',
          recipe,
          missingIngredients,
        };
      }

      snapshot.brewing.ingredients = ingredientItemTypeIds.map((itemTypeId, slotIndex) => {
        const herb = snapshot.brewing.herbs.find(
          (candidate) => candidate.itemTypeId === itemTypeId,
        );

        return {
          slotIndex,
          itemTypeId: herb.itemTypeId,
          key: herb.key,
          label: herb.label,
          kind: herb.kind,
        };
      });
      updateBrewing();
      publish();

      return {
        ok: true,
        recipe,
        ingredientItemTypeIds,
      };
    },
    brewCauldron: () => {
      if (snapshot.brewing.match && !snapshot.brewing.match.unlocked) {
        return {
          ok: false,
          reason: 'research_not_unlocked',
          recipe: snapshot.brewing.match,
        };
      }

      if (!snapshot.brewing.canBrew) {
        return {
          ok: false,
          reason: 'not_enough_mana',
          cost: snapshot.brewing.manaCost,
        };
      }

      snapshot.mana.current -= snapshot.brewing.manaCost;
      const brewDurationMs = snapshot.brewing.match?.brewDurationMs ?? 4_000;
      snapshot.brewing.activeBrew = {
        resultItemTypeId: snapshot.brewing.match?.potionTypeId ?? 2029,
        key: snapshot.brewing.match?.key ?? 'wastedPotion',
        label: snapshot.brewing.match?.label ?? 'wasted potion',
        phase: 'brewing',
        canStartBottling: false,
        canCollect: false,
        remainingMs: brewDurationMs,
        totalMs: brewDurationMs,
        bottlingTotalMs: 2_000,
        progress: 0,
      };
      snapshot.brewing.ingredients = [];
      updateBrewing();
      publish();

      return {
        ok: true,
        potion: {
          itemTypeId: snapshot.brewing.activeBrew.resultItemTypeId,
          key: snapshot.brewing.activeBrew.key,
          label: snapshot.brewing.activeBrew.label,
          kind: 'potion',
        },
      };
    },
    startBrewingBottling: () => {
      if (!snapshot.brewing.activeBrew) {
        return {
          ok: false,
          reason: 'no_brew',
        };
      }

      if (!snapshot.brewing.activeBrew.canStartBottling) {
        return {
          ok: false,
          reason: 'brew_not_done',
        };
      }

      const activeBrew = snapshot.brewing.activeBrew;
      activeBrew.phase = 'bottling';
      activeBrew.canStartBottling = false;
      activeBrew.canCollect = false;
      activeBrew.remainingMs = activeBrew.bottlingTotalMs;
      activeBrew.totalMs = activeBrew.bottlingTotalMs;
      activeBrew.progress = 0;
      updateBrewing();
      publish();

      return {
        ok: true,
        potion: {
          itemTypeId: activeBrew.resultItemTypeId,
          key: activeBrew.key,
          label: activeBrew.label,
          kind: 'potion',
        },
        durationMs: activeBrew.totalMs,
      };
    },
    setBrewingAutoBrewRecipe: (recipeKey) => {
      const recipe = snapshot.brewing.recipes.find(
        (candidate) => candidate.key === recipeKey && candidate.unlocked,
      );

      if (!recipe) {
        snapshot.brewing.autoBrewRecipeKey = null;
        snapshot.brewing.autoBrewEnabled = false;
        publish();

        return {
          ok: true,
          autoBrewRecipeKey: null,
          autoBrewEnabled: false,
        };
      }

      snapshot.brewing.autoBrewRecipeKey = recipe.key;
      publish();

      return {
        ok: true,
        autoBrewRecipeKey: recipe.key,
        autoBrewEnabled: snapshot.brewing.autoBrewEnabled,
      };
    },
    setBrewingAutoBrewEnabled: (enabled) => {
      if (enabled === true && !snapshot.brewing.autoBrewRecipeKey) {
        return {
          ok: false,
          reason: 'auto_brew_recipe_required',
        };
      }

      snapshot.brewing.autoBrewEnabled = enabled === true;
      publish();

      return {
        ok: true,
        autoBrewEnabled: snapshot.brewing.autoBrewEnabled,
      };
    },
    setSelectedShopShelfSlotSellItem: (itemTypeId) => {
      const slotNumber = snapshot.shop.shelf.selectedSlotNumber;
      const slot = snapshot.shop.shelf.slots.find(
        (shelfSlot) => shelfSlot.slotNumber === slotNumber,
      );
      const item = snapshot.shop.shelf.sellItems.find(
        (sellItem) => sellItem.itemTypeId === itemTypeId,
      );
      slot.sellItemTypeId = item.itemTypeId;
      slot.sellKind = item.kind;
      slot.sellKey = item.key;
      slot.sellLabel = item.label;
      slot.sellQuantity = item.quantity;
      slot.sellCoin = item.sellCoin;
      slot.sellNeed = item.sellNeed;
      publish();
      return {
        ok: true,
        slotNumber,
        item,
      };
    },
    clearSelectedShopShelfSlotSellItem: () => {
      const slotNumber = snapshot.shop.shelf.selectedSlotNumber;
      const slot = snapshot.shop.shelf.slots.find(
        (shelfSlot) => shelfSlot.slotNumber === slotNumber,
      );
      slot.sellItemTypeId = null;
      slot.sellKind = null;
      slot.sellKey = null;
      slot.sellLabel = null;
      slot.sellQuantity = null;
      slot.sellCoin = null;
      slot.sellNeed = null;
      slot.sellProgressSeconds = 0;
      publish();
      return {
        ok: true,
        slotNumber,
      };
    },
    setSelectedPlayerShopShelfSlotListing: ({ itemTypeId, quantity, priceCoin }) => {
      const slotNumber = snapshot.shop.playerShelf.selectedSlotNumber;
      const slot = snapshot.shop.playerShelf.slots.find(
        (shelfSlot) => shelfSlot.slotNumber === slotNumber,
      );
      const item = snapshot.shop.playerShelf.sellItems.find(
        (sellItem) => sellItem.itemTypeId === itemTypeId,
      );

      if (!item || item.quantity < quantity) {
        return {
          ok: false,
          reason: 'not_enough_item',
        };
      }

      item.quantity -= quantity;
      slot.itemTypeId = item.itemTypeId;
      slot.itemKey = item.key;
      slot.itemKind = item.kind;
      slot.itemLabel = item.label;
      slot.quantity = quantity;
      slot.priceCoin = priceCoin;
      publish();

      return {
        ok: true,
        slotNumber,
        item,
        quantity,
        priceCoin,
      };
    },
    clearSelectedPlayerShopShelfSlotListing: () => {
      const slotNumber = snapshot.shop.playerShelf.selectedSlotNumber;
      const slot = snapshot.shop.playerShelf.slots.find(
        (shelfSlot) => shelfSlot.slotNumber === slotNumber,
      );
      const item = snapshot.shop.playerShelf.sellItems.find(
        (sellItem) => sellItem.itemTypeId === slot.itemTypeId,
      );

      if (item) {
        item.quantity += slot.quantity;
      }

      slot.itemTypeId = null;
      slot.itemKey = null;
      slot.itemKind = null;
      slot.itemLabel = null;
      slot.quantity = 0;
      slot.priceCoin = 0;
      publish();

      return {
        ok: true,
        slotNumber,
      };
    },
    setPlayerShopRequest: (slotNumber, { itemTypeId, quantity, priceCoin }) => {
      const slot = snapshot.shop.playerRequests.slots.find(
        (requestSlot) => requestSlot.slotNumber === slotNumber,
      );
      const item = snapshot.shop.playerShelf.sellItems.find(
        (sellItem) => sellItem.itemTypeId === itemTypeId,
      );

      if (!slot?.unlocked || !item) {
        return {
          ok: false,
          reason: 'slot_locked',
        };
      }

      slot.itemTypeId = item.itemTypeId;
      slot.itemKey = item.key;
      slot.itemKind = item.kind;
      slot.itemLabel = item.label;
      slot.quantity = quantity;
      slot.priceCoin = priceCoin;
      publish();

      return {
        ok: true,
        slotNumber,
        item,
        quantity,
        priceCoin,
      };
    },
    clearPlayerShopRequest: (slotNumber) => {
      const slot = snapshot.shop.playerRequests.slots.find(
        (requestSlot) => requestSlot.slotNumber === slotNumber,
      );

      if (!slot?.unlocked) {
        return {
          ok: false,
          reason: 'slot_locked',
        };
      }

      slot.itemTypeId = null;
      slot.itemKey = null;
      slot.itemKind = null;
      slot.itemLabel = null;
      slot.quantity = 0;
      slot.priceCoin = 0;
      publish();

      return {
        ok: true,
        slotNumber,
      };
    },
    applyPlayerShopMarketSlotQuantity: (slotNumber, quantity) => {
      const slot = snapshot.shop.playerShelf.slots.find(
        (shelfSlot) => shelfSlot.slotNumber === slotNumber,
      );

      if (!slot?.itemTypeId) {
        return {
          ok: false,
          reason: 'empty_slot',
        };
      }

      if (quantity <= 0) {
        slot.itemTypeId = null;
        slot.itemKey = null;
        slot.itemKind = null;
        slot.itemLabel = null;
        slot.quantity = 0;
        slot.priceCoin = 0;
      } else {
        slot.quantity = quantity;
      }

      publish();

      return {
        ok: true,
        slotNumber,
        quantity,
      };
    },
    buyPlayerShopListingItem: ({ itemKey, quantity = 1, priceCoin }) => {
      const totalPriceCoin = quantity * priceCoin;

      if (snapshot.coin.current < totalPriceCoin) {
        return {
          ok: false,
          reason: 'not_enough_coin',
        };
      }

      snapshot.coin.current -= totalPriceCoin;
      publish();

      return {
        ok: true,
        item: { key: itemKey },
        quantity,
        priceCoin,
        totalPriceCoin,
      };
    },
    buyNpcMarketStockItem: async (itemTypeId, quantity = 1) => {
      const item = snapshot.shop.stock.items.find(
        (stockItem) => stockItem.itemTypeId === itemTypeId,
      );

      if (!item || item.stock < quantity) {
        return {
          ok: false,
          reason: 'empty_stock',
        };
      }

      const totalPriceCoin = quantity * item.buyCoin;

      if (snapshot.coin.current < totalPriceCoin) {
        return {
          ok: false,
          reason: 'not_enough_coin',
        };
      }

      snapshot.coin.current -= totalPriceCoin;
      item.stock -= quantity;
      item.quantity += quantity;
      publish();

      return {
        ok: true,
        item,
        quantity,
        priceCoin: item.buyCoin,
        totalPriceCoin,
      };
    },
    claimPlayerShopSaleProceeds: (coin) => {
      snapshot.coin.current += coin;
      publish();

      return {
        ok: true,
        coin,
      };
    },
    collectShopCoinOffer: () => {
      if (!snapshot.shop.coinOffer.canCollect) {
        return {
          ok: false,
          reason: 'cooldown',
          cooldownRemainingSeconds: snapshot.shop.coinOffer.cooldownRemainingSeconds,
        };
      }

      const coin = snapshot.shop.coinOffer.rewardCoin;
      snapshot.coin.current += coin;
      snapshot.shop.coinOffer.cooldownRemainingSeconds = snapshot.shop.coinOffer.cooldownSeconds;
      snapshot.shop.coinOffer.remainingMs = snapshot.shop.coinOffer.cooldownSeconds * 1_000;
      snapshot.shop.coinOffer.ready = false;
      snapshot.shop.coinOffer.canCollect = false;
      publish();

      return {
        ok: true,
        coin,
        cooldownSeconds: snapshot.shop.coinOffer.cooldownSeconds,
      };
    },
    sellTutorialItemForCoin: ({ itemKey, quantity = 1, coinEach = 1, coinTarget = null } = {}) => {
      const item = getItemDefinitionByKey(itemKey);
      const requestedQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
      const remainingCoin = Number.isFinite(coinTarget)
        ? Math.max(0, Math.floor(Number(coinTarget)) - snapshot.coin.current)
        : Number.POSITIVE_INFINITY;

      if (remainingCoin <= 0) {
        return {
          ok: false,
          reason: 'coin_target_met',
        };
      }

      const targetQuantity = Number.isFinite(remainingCoin)
        ? Math.min(requestedQuantity, Math.ceil(remainingCoin / coinEach))
        : requestedQuantity;
      const sellQuantity = Math.min(targetQuantity, getItemQuantity(item.id));

      if (sellQuantity <= 0 || !removeItemQuantity(item.id, sellQuantity)) {
        return {
          ok: false,
          reason: 'not_enough_items',
        };
      }

      const coin = Math.min(remainingCoin, sellQuantity * coinEach);
      snapshot.coin.current += coin;
      publish();

      return {
        ok: true,
        item,
        quantity: sellQuantity,
        coin,
        currentCoin: snapshot.coin.current,
        tutorial: true,
      };
    },
    fillTradeAllianceItemQuest: (quest) => {
      const item = getItemDefinitionByKey(quest.itemKey);
      const remainingQuantity = Math.max(0, quest.target - quest.progress);
      const missingContribution = Math.max(
        0,
        Number(quest.minContribution ?? 0) - Number(quest.ownContribution ?? 0),
      );
      const targetQuantity = Math.max(remainingQuantity, missingContribution);
      const quantity = Math.min(getItemQuantity(item.id), targetQuantity);

      if (quantity <= 0) {
        return {
          ok: false,
          reason: 'not_enough_items',
        };
      }

      removeItemQuantity(item.id, quantity);
      publish();

      return {
        ok: true,
        questId: quest.questId,
        item: {
          itemTypeId: item.id,
          key: item.key,
          label: item.label,
          kind: item.kind,
        },
        quantity,
      };
    },
    refundTradeAllianceItemQuestFill: (fill) => {
      addItemQuantity(fill.item, fill.quantity);
      publish();
      return {
        ok: true,
      };
    },
    setShopSellCoin: (kind, sellCoin) => {
      for (const sellKind of snapshot.shop.shelf.sellKinds) {
        if (sellKind.kind === kind) {
          sellKind.sellCoin = sellCoin;
        }
      }

      for (const item of snapshot.shop.shelf.sellItems) {
        if (item.kind === kind) {
          item.sellCoin = sellCoin;
        }
      }

      for (const slot of snapshot.shop.shelf.slots) {
        if (slot.sellKind === kind) {
          slot.sellCoin = sellCoin;
        }
      }

      publish();
    },
    setShopSellNeed: (itemTypeId, sellNeed) => {
      const item = snapshot.shop.shelf.sellItems.find(
        (sellItem) => sellItem.itemTypeId === itemTypeId,
      );

      if (item) {
        item.sellNeed = sellNeed;
      }

      for (const slot of snapshot.shop.shelf.slots) {
        if (slot.sellItemTypeId === itemTypeId) {
          slot.sellNeed = sellNeed;
        }
      }

      publish();
    },
    setShopSellItems: (sellItems) => {
      snapshot.shop.shelf.sellItems = sellItems;
      snapshot.shop.stock.items = sellItems.map((item) => ({
        ...item,
        buyCoin: item.buyCoin ?? item.sellCoin,
        stock: item.stock ?? item.sellNeed ?? 0,
      }));
      snapshot.shop.playerShelf.sellItems = sellItems.map((item) => ({ ...item }));
      publish();
    },
    setShopSellItemQuantity: (itemTypeId, quantity) => {
      const item = snapshot.shop.shelf.sellItems.find(
        (sellItem) => sellItem.itemTypeId === itemTypeId,
      );

      if (item) {
        item.quantity = quantity;
      }

      const stockItem = snapshot.shop.stock.items.find(
        (sellItem) => sellItem.itemTypeId === itemTypeId,
      );

      if (stockItem) {
        stockItem.quantity = quantity;
      }

      const playerItem = snapshot.shop.playerShelf.sellItems.find(
        (sellItem) => sellItem.itemTypeId === itemTypeId,
      );

      if (playerItem) {
        playerItem.quantity = quantity;
      }

      for (const slot of snapshot.shop.shelf.slots) {
        if (slot.sellItemTypeId === itemTypeId) {
          slot.sellQuantity = quantity;
        }
      }

      publish();
    },
    setCoin: (amount) => {
      snapshot.coin.current = amount;
      updateResearchAffordability();
      updateBrewing();
      publish();
    },
    setMana: (amount) => {
      snapshot.mana.current = amount;
      updateBrewing();
      publish();
    },
    setGardenSeedQuantity: (itemTypeId, quantity) => {
      const seed = snapshot.garden.seeds.find((candidate) => candidate.itemTypeId === itemTypeId);

      if (seed) {
        seed.quantity = quantity;
      }

      publish();
    },
  };

  return gameplayFacade;
}

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function createCompletedTutorialStorage() {
  return createMemoryStorage({
    [TUTORIAL_STORAGE_KEY]: JSON.stringify({
      completedStepIds: TUTORIAL_STEP_IDS,
    }),
  });
}

function unlockWorkshopSecondaryActions(gameplayFacade, level = 4) {
  const snapshot = gameplayFacade.getSnapshot();
  snapshot.tasks.currentLevel = level;
  snapshot.tasks.level.level = level;
  snapshot.playerLevel.currentLevel = level;
  snapshot.prestige.currentLevel = Math.max(snapshot.prestige.currentLevel, level);
}

function unlockWorldNotice(gameplayFacade) {
  gameplayFacade.getSnapshot().worldNotice = {
    unlocked: true,
    unlockLevel: 4,
    current: {
      periodKey: 'weekly-1',
      eventId: 'fever-lower-quarter',
      resetLabel: 'resolves 3d',
      headline: 'fever in the lower quarter',
      body: ['lanterns stay lit past midnight.'],
      completedRequests: 0,
      totalRequests: 1,
      responseLabel: 'weak response',
      leaderboard: {
        currentPoints: 0,
        qualificationPoints: 2000,
        qualified: false,
        remainingQualificationPoints: 2000,
        rows: [],
        rewardTiers: [],
      },
      requests: [
        {
          requestId: 'weekly-1:fever:tonics',
          requestKey: 'tonics',
          actionType: 'donate_resources',
          label: 'cool the fever',
          title: 'cool the fever',
          situation: 'families are sleeping beside buckets.',
          description: 'donate tonics that steady breath and bring fever down.',
          requiredQuantity: 600,
          progressQuantity: 0,
          progress: 0,
          completed: false,
          contributionPoints: 0,
          collectedPointText: '0 points',
          manual: true,
          canDonate: false,
          actionText: 'need items',
          donationOptions: [],
        },
      ],
    },
    archive: [],
  };
}

function createWorkshopSecondaryUnlockedGameplayFacade(level = 3) {
  const gameplayFacade = createGameplayFacadeFake();
  unlockWorkshopSecondaryActions(gameplayFacade, level);
  return gameplayFacade;
}

function markResearchComplete(gameplayFacade, ...researchIds) {
  const research = gameplayFacade.getSnapshot().research;
  const completedResearchIds = new Set(research.completedResearchIds ?? []);

  for (const researchId of researchIds) {
    completedResearchIds.add(researchId);
  }

  research.completedResearchIds = [...completedResearchIds];
}

function markSeedResearchComplete(gameplayFacade, ...seedKeys) {
  markResearchComplete(
    gameplayFacade,
    ...seedKeys.map((seedKey) => `unlockSeed:${seedKey}`),
  );
}

function clickRoomTab(stage, pageId) {
  const button = stage.querySelector(`.room-bottom-panel__tab[data-page-id="${pageId}"]`);
  expect(button).not.toBeNull();
  button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

function clickNpcMarketStandLabel(stage, index = 0) {
  const label = [
    ...stage.querySelectorAll(
      '.shop-page__shelf .shop-page__slot-row--interactive .shop-page__slot-item-value',
    ),
  ][index];
  expect(label).not.toBeNull();
  label.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return label;
}

function createPlayerFacadeFake(
  initialUsername = 'wizard',
  initialTheme = 'white',
  {
    shouldPromptForUsername = false,
    initialColorMode = 'resources',
    initialFont = 'lexend',
    initialCharacter = 'elara',
    initialIconMode = 'icons',
    initialProgressBar = 'regular',
    initialPlotView = 'boxes',
  } = {},
) {
  let snapshot = {
    username: initialUsername,
    theme: initialTheme,
    font: initialFont,
    colorMode: initialColorMode,
    character: initialCharacter,
    iconMode: initialIconMode,
    progressBar: initialProgressBar,
    plotView: initialPlotView,
    shouldPromptForUsername,
  };
  const listeners = new Set();
  let promptSeenCount = 0;

  const publish = () => {
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    setUsername: (username) => {
      snapshot = {
        ...snapshot,
        username: username.trim() || 'wizard',
        shouldPromptForUsername: false,
      };

      publish();

      return snapshot;
    },
    setTheme: (theme) => {
      snapshot = {
        ...snapshot,
        theme: [
          'white',
          'mild-white',
          'mild-black',
          'black',
          'dark-gray',
          'night-black',
          'midnight',
          'witchcraft',
          'vs-code-midnight',
          'vscode-midnight',
          'idle witch craft',
        ].includes(theme)
          ? theme
              .replace('mild-white', 'white')
              .replace('mild-black', 'black')
              .replace('dark-gray', 'black')
              .replace('night-black', 'black')
              .replace('vs-code-midnight', 'midnight')
              .replace('vscode-midnight', 'midnight')
              .replace('idle witch craft', 'witchcraft')
          : 'white',
      };

      publish();
      return snapshot;
    },
    setFont: (font) => {
      const normalizedFont =
        ['comic-sans-mono', 'comic sans mono', 'comic-mono'].includes(font)
          ? 'comic-sans-mono'
          : ['lexend', 'google-lexend'].includes(font)
            ? 'lexend'
            : 'lexend';
      snapshot = {
        ...snapshot,
        font: normalizedFont,
      };

      publish();
      return snapshot;
    },
    setColorMode: (colorMode) => {
      const normalizedColorMode = ['resources', 'color', 'colored'].includes(colorMode)
        ? 'resources'
        : 'resources';
      snapshot = {
        ...snapshot,
        colorMode: normalizedColorMode,
      };

      publish();
      return snapshot;
    },
    setCharacter: (character) => {
      snapshot = {
        ...snapshot,
        character,
      };

      publish();
      return snapshot;
    },
    setIconMode: (iconMode) => {
      const normalizedIconMode = ['icons', 'icon', 'on', 'enabled'].includes(iconMode)
        ? 'icons'
        : 'icons';
      snapshot = {
        ...snapshot,
        iconMode: normalizedIconMode,
      };

      publish();
      return snapshot;
    },
    setProgressBar: (progressBar) => {
      const normalizedProgressBar = ['gradient', 'gradinet', 'grad'].includes(progressBar)
        ? 'gradient'
        : 'regular';
      snapshot = {
        ...snapshot,
        progressBar: normalizedProgressBar,
      };

      publish();
      return snapshot;
    },
    setPlotView: () => {
      snapshot = {
        ...snapshot,
        plotView: 'boxes',
      };

      publish();
      return snapshot;
    },
    markUsernamePromptSeen: () => {
      promptSeenCount += 1;
      snapshot = {
        ...snapshot,
        shouldPromptForUsername: false,
      };

      publish();
      return snapshot;
    },
    getPromptSeenCount: () => promptSeenCount,
  };
}

function createAuthFacadeFake({
  enabled = true,
  authenticated = false,
  disabledReason = null,
  error = null,
  cancelled = false,
} = {}) {
  let signInCount = 0;
  let signInPayload = null;
  const snapshot = {
    oidc: {
      enabled,
      authenticated,
      displayName: authenticated ? 'Dav' : '',
      email: authenticated ? 'dav@example.com' : '',
      error,
      cancelled,
      disabledReason,
    },
  };

  return {
    get signInCount() {
      return signInCount;
    },
    get signInPayload() {
      return signInPayload;
    },
    subscribe: (listener) => {
      listener(snapshot);
      return () => {};
    },
    signInWithGoogle: async (payload) => {
      signInCount += 1;
      signInPayload = payload;
      return { ok: true };
    },
    signOut: async () => ({ ok: true }),
  };
}

function createFeedbackFacadeFake() {
  const messages = [];

  return {
    getMessages: () => messages,
    submitFeedback: async (body) => {
      messages.push(body);
      return {
        ok: true,
        body,
      };
    },
  };
}

function createWorldChatFacadeFake({ messages, sendResult = null, publishOnSend = true } = {}) {
  const snapshot = {
    connected: true,
    messages: messages ?? [
      {
        id: '1',
        senderIdentity: 'sender-a',
        username: 'Ada',
        playerLevel: 3,
        body: 'hello',
        sentAtMs: 1_000,
      },
    ],
  };
  const listeners = new Set();
  const sentMessages = [];

  const publish = () => {
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const pushMessage = (message) => {
    snapshot.messages.push({
      id: String(snapshot.messages.length + 1),
      senderIdentity: 'sender-self',
      username: 'wizard',
      playerLevel: 1,
      body: message,
      sentAtMs: 2_000,
    });
  };

  return {
    getSnapshot: () => snapshot,
    getSentMessages: () => sentMessages,
    publishSnapshot: publish,
    publishServerMessage: (message) => {
      snapshot.messages.push({
        id: String(snapshot.messages.length + 1),
        senderIdentity: message.senderIdentity ?? 'sender-self',
        username: message.username ?? 'wizard',
        character: message.character,
        playerLevel: message.playerLevel ?? 1,
        body: message.body,
        allianceTag: message.allianceTag ?? '',
        allianceTagColor: message.allianceTagColor ?? '',
        sentAtMs: message.sentAtMs ?? 2_000,
      });
      publish();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    sendMessage: async (body) => {
      const message = body.trim().replace(/\s+/g, ' ');
      if (sendResult) {
        return sendResult;
      }

      sentMessages.push(message);
      if (publishOnSend) {
        pushMessage(message);
        publish();
      }
      return {
        ok: true,
        body: message,
      };
    },
  };
}

function createPlayerInfoFacadeFake({ players = [] } = {}) {
  const snapshot = {
    connected: true,
    players,
  };
  const listeners = new Set();

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
  };
}

function createTradeAllianceFacadeFake({
  alliances = [],
  allianceChatMessages = [],
  memberCount = 1,
  members = [],
  quests = [],
  contributions = [],
  rewardInbox = [],
  sendChatResult = null,
  canManageRoles = undefined,
  ownAlliance = undefined,
  ownMember = undefined,
  ownRole = undefined,
  canEditSettings = undefined,
  canManageApplications = undefined,
} = {}) {
  const profileUpdates = [];
  const roleUpdates = [];
  const leadershipTransfers = [];
  const kickedMembers = [];
  const joinRequests = [];
  const applyRequests = [];
  const sentAllianceMessages = [];
  let leaveCount = 0;
  const defaultOwnAlliance = {
    allianceId: 'alliance-1',
    name: 'All Seeing Void',
    tag: 'VOID',
    description: 'Yes',
    notice: '',
    joinMode: 'apply',
    memberCount,
    totalIncome: 0,
    seasonIncome: 0,
    weeklyIncome: 0,
    monthlyIncome: 0,
    dailyIncome: 0,
    seasonKey: '0',
    dayKey: '20705',
  };
  const defaultOwnMember = {
    allianceId: 'alliance-1',
    memberIdentity: 'self',
    username: 'wizard',
    playerLevel: 2,
    role: 'tradeMaster',
    dailyContribution: 0,
    dayKey: '0',
  };
  const resolvedOwnAlliance = ownAlliance === undefined ? defaultOwnAlliance : ownAlliance;
  const resolvedOwnMember = ownMember === undefined ? defaultOwnMember : ownMember;
  const resolvedOwnRole =
    ownRole === undefined ? (resolvedOwnMember?.role ?? null) : ownRole;
  let snapshot = {
    connected: true,
    alliances,
    ownAlliance: resolvedOwnAlliance,
    ownMember: resolvedOwnMember,
    ownRole: resolvedOwnRole,
    canEditSettings: canEditSettings ?? resolvedOwnRole === 'tradeMaster',
    canManageRoles: canManageRoles ?? resolvedOwnRole === 'tradeMaster',
    canManageApplications: canManageApplications ?? resolvedOwnRole === 'tradeMaster',
    members,
    applications: [],
    allianceChatMessages,
    quests,
    contributions,
    rewardInbox,
  };
  const listeners = new Set();

  const publish = () => {
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  return {
    getSnapshot: () => snapshot,
    getProfileUpdates: () => profileUpdates,
    getRoleUpdates: () => roleUpdates,
    getLeadershipTransfers: () => leadershipTransfers,
    getKickedMembers: () => kickedMembers,
    getJoinRequests: () => joinRequests,
    getApplyRequests: () => applyRequests,
    getSentAllianceMessages: () => sentAllianceMessages,
    getLeaveCount: () => leaveCount,
    publishSnapshot: publish,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    retainPublicData: () => () => {},
    sendChatMessage: async (body) => {
      const message = body.trim().replace(/\s+/g, ' ');
      if (sendChatResult) {
        return sendChatResult;
      }

      sentAllianceMessages.push(message);
      snapshot.allianceChatMessages.push({
        id: String(snapshot.allianceChatMessages.length + 1),
        senderIdentity: 'sender-self',
        username: 'wizard',
        playerLevel: 2,
        body: message,
        allianceTag: snapshot.ownAlliance?.tag ?? '',
        sentAtMs: 2_000,
      });
      publish();
      return {
        ok: true,
        body: message,
      };
    },
    updateProfile: async (profile) => {
      profileUpdates.push(profile);
      snapshot = {
        ...snapshot,
        ownAlliance: {
          ...snapshot.ownAlliance,
          ...profile,
        },
      };
      publish();
      return { ok: true };
    },
    setMemberRole: async (memberIdentity, role) => {
      roleUpdates.push({ memberIdentity, role });
      snapshot = {
        ...snapshot,
        members: snapshot.members.map((member) =>
          member.memberIdentity === memberIdentity ? { ...member, role } : member,
        ),
      };
      publish();
      return { ok: true };
    },
    transferLeadership: async (memberIdentity) => {
      leadershipTransfers.push(memberIdentity);
      snapshot = {
        ...snapshot,
        ownRole: snapshot.ownMember?.memberIdentity === memberIdentity ? 'tradeMaster' : 'trader',
        members: snapshot.members.map((member) => {
          if (member.memberIdentity === memberIdentity) {
            return { ...member, role: 'tradeMaster' };
          }

          if (member.memberIdentity === snapshot.ownMember?.memberIdentity) {
            return { ...member, role: 'trader' };
          }

          return member;
        }),
      };
      publish();
      return { ok: true };
    },
    kickMember: async (memberIdentity) => {
      kickedMembers.push(memberIdentity);
      snapshot = {
        ...snapshot,
        ownAlliance: {
          ...snapshot.ownAlliance,
          memberCount: Math.max(1, Number(snapshot.ownAlliance?.memberCount ?? 1) - 1),
        },
        members: snapshot.members.filter((member) => member.memberIdentity !== memberIdentity),
      };
      publish();
      return { ok: true };
    },
    joinAlliance: async (allianceId) => {
      joinRequests.push(allianceId);
      const joinedAlliance = snapshot.alliances.find(
        (alliance) => alliance.allianceId === allianceId,
      );

      if (!joinedAlliance) {
        return { ok: false, reason: 'not_found' };
      }

      snapshot = {
        ...snapshot,
        ownAlliance: {
          ...joinedAlliance,
          memberCount: Math.max(1, Number(joinedAlliance.memberCount ?? 1)),
        },
        ownMember: {
          allianceId,
          memberIdentity: 'self',
          username: 'wizard',
          playerLevel: 2,
          role: 'trader',
          dailyContribution: 0,
          dayKey: '0',
        },
        ownRole: 'trader',
        canEditSettings: false,
        canManageRoles: false,
        canManageApplications: false,
      };
      publish();
      return { ok: true };
    },
    applyAlliance: async (allianceId) => {
      applyRequests.push(allianceId);
      return { ok: true };
    },
    leaveAlliance: async () => {
      leaveCount += 1;
      snapshot = {
        ...snapshot,
        ownAlliance: null,
        ownMember: null,
        ownRole: null,
        canEditSettings: false,
        canManageRoles: false,
        canManageApplications: false,
      };
      publish();
      return { ok: true };
    },
    fillItemQuest: async ({ questId, quantity }) => {
      const quest = snapshot.quests.find((candidate) => candidate.questId === questId);

      if (!quest) {
        return { ok: false, reason: 'not_found' };
      }

      const acceptedQuantity = Math.floor(Number(quantity) || 0);
      quest.progress = Math.min(quest.target, quest.progress + acceptedQuantity);
      quest.progressRatio = quest.target > 0 ? Math.min(quest.progress / quest.target, 1) : 0;
      let contribution = snapshot.contributions.find(
        (candidate) =>
          candidate.questId === questId &&
          candidate.dayKey === quest.dayKey &&
          candidate.contributorIdentity === snapshot.ownMember.memberIdentity,
      );

      if (!contribution) {
        contribution = {
          allianceId: quest.allianceId,
          questId,
          dayKey: quest.dayKey,
          contributorIdentity: snapshot.ownMember.memberIdentity,
          contribution: 0,
        };
        snapshot.contributions.push(contribution);
      }

      contribution.contribution += acceptedQuantity;
      publish();
      return { ok: true };
    },
    claimQuestReward: async (questId) => {
      const quest = snapshot.quests.find((candidate) => candidate.questId === questId);

      if (!quest) {
        return { ok: false, reason: 'not_found' };
      }

      quest.claimed = true;
      snapshot.rewardInbox.push({
        rewardKey: `${quest.dayKey}:${quest.questId}:self`,
        recipientIdentity: snapshot.ownMember.memberIdentity,
        allianceId: quest.allianceId,
        allianceName: snapshot.ownAlliance.name,
        questId: quest.questId,
        questLabel: quest.label,
        dayKey: quest.dayKey,
        crystalReward: quest.crystalReward,
        claimedAtMs: 1,
        collected: true,
      });
      publish();
      return { ok: true };
    },
  };
}

function installQuestOffsetTopGetter(offsetsByQuestId) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    window.HTMLElement.prototype,
    'offsetTop',
  );

  Object.defineProperty(window.HTMLElement.prototype, 'offsetTop', {
    get() {
      const questId = this.dataset?.questId;
      if (Object.prototype.hasOwnProperty.call(offsetsByQuestId, questId)) {
        return offsetsByQuestId[questId];
      }

      return 0;
    },
    configurable: true,
  });

  return () => {
    if (originalDescriptor) {
      Object.defineProperty(window.HTMLElement.prototype, 'offsetTop', originalDescriptor);
      return;
    }

    Reflect.deleteProperty(window.HTMLElement.prototype, 'offsetTop');
  };
}

function createPlayerShopFacadeFake() {
  const snapshot = {
    connected: true,
    listings: [
      {
        listingKey: 'seller-1:1',
        sellerIdentity: 'seller-1',
        username: 'Ada',
        slotNumber: 1,
        itemKey: 'sageSeed',
        itemLabel: 'sage seed',
        itemKind: 'seed',
        quantity: 2,
        priceCoin: 3,
        totalPriceCoin: 3,
      },
    ],
    ownListings: [],
    proceedsCoin: 0,
  };
  const listeners = new Set();

  const publish = () => {
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    setSlotListing: async (slot) => {
      const listingKey = `self:${slot.slotNumber}`;
      const existing = snapshot.ownListings.find((listing) => listing.listingKey === listingKey);
      const listing = {
        listingKey,
        sellerIdentity: 'self',
        username: 'wizard',
        ...slot,
        totalPriceCoin: slot.priceCoin,
      };

      if (existing) {
        Object.assign(existing, listing);
      } else {
        snapshot.ownListings.push(listing);
      }

      publish();
      return { ok: true };
    },
    clearSlotListing: async (slotNumber) => {
      snapshot.ownListings = snapshot.ownListings.filter(
        (listing) => listing.slotNumber !== slotNumber,
      );
      publish();
      return { ok: true };
    },
    buyListing: async ({ listingKey, quantity = 1 }) => {
      const listing = snapshot.listings.find((candidate) => candidate.listingKey === listingKey);

      if (!listing || listing.quantity < quantity) {
        return { ok: false, reason: 'buy_failed' };
      }

      listing.quantity -= quantity;
      snapshot.listings = snapshot.listings.filter((candidate) => candidate.quantity > 0);
      publish();
      return { ok: true };
    },
    claimProceeds: async () => {
      snapshot.proceedsCoin = 0;
      publish();
      return { ok: true };
    },
    setProceedsCoin: (coin) => {
      snapshot.proceedsCoin = coin;
      publish();
    },
  };
}

function createPointerEvent(type, { clientX, clientY, pointerType = 'touch', pointerId = 1 }) {
  const event = new window.MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
  });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  Object.defineProperty(event, 'pointerId', { value: pointerId });
  Object.defineProperty(event, 'isPrimary', { value: true });
  return event;
}

function dispatchPointerSwipe(
  target,
  { startX = 320, endX = 120, startY = 360, endY = startY, pointerType = 'touch' } = {},
) {
  target.dispatchEvent(
    createPointerEvent('pointerdown', { clientX: startX, clientY: startY, pointerType }),
  );
  target.dispatchEvent(
    createPointerEvent('pointermove', {
      clientX: (startX + endX) / 2,
      clientY: (startY + endY) / 2,
      pointerType,
    }),
  );
  target.dispatchEvent(
    createPointerEvent('pointerup', { clientX: endX, clientY: endY, pointerType }),
  );
}

function createTouch(identifier, clientX, clientY, target) {
  return {
    identifier,
    clientX,
    clientY,
    target,
  };
}

function createTouchEvent(type, { touches, changedTouches }) {
  const event = new window.Event(type, {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'touches', { value: touches });
  Object.defineProperty(event, 'targetTouches', { value: touches });
  Object.defineProperty(event, 'changedTouches', { value: changedTouches });
  return event;
}

function installMatchMedia(matches) {
  const originalMatchMedia = window.matchMedia;

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query) => ({
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  return () => {
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: originalMatchMedia,
      });
      return;
    }

    delete window.matchMedia;
  };
}

function dispatchTouchSwipe(
  target,
  { startX = 320, endX = 120, startY = 360, endY = startY, identifier = 1 } = {},
) {
  const startTouch = createTouch(identifier, startX, startY, target);
  const moveTouch = createTouch(identifier, (startX + endX) / 2, (startY + endY) / 2, target);
  const endTouch = createTouch(identifier, endX, endY, target);

  target.dispatchEvent(
    createTouchEvent('touchstart', {
      touches: [startTouch],
      changedTouches: [startTouch],
    }),
  );
  target.dispatchEvent(
    createTouchEvent('touchmove', {
      touches: [moveTouch],
      changedTouches: [moveTouch],
    }),
  );
  target.dispatchEvent(
    createTouchEvent('touchend', {
      touches: [],
      changedTouches: [endTouch],
    }),
  );
}

function dispatchTouchTap(target, { clientX = 160, clientY = 220, identifier = 2 } = {}) {
  const touch = createTouch(identifier, clientX, clientY, target);

  target.dispatchEvent(
    createTouchEvent('touchstart', {
      touches: [touch],
      changedTouches: [touch],
    }),
  );
  target.dispatchEvent(
    createTouchEvent('touchend', {
      touches: [],
      changedTouches: [touch],
    }),
  );
}

describe('PagesFacade', () => {
  it('mounts Workshop as the default room page', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    expect(pagesFacade.getCurrentPageId()).toBe('workshop');
    expect(stage.querySelector('.workshop-page')).not.toBeNull();
    expect(stage.querySelector('.workshop-page__wall')).not.toBeNull();
    expect(stage.querySelector('.workshop-page__floor')).not.toBeNull();
    expect(stage.querySelector('.workshop-page__ui-layer')).not.toBeNull();
    expect(stage.querySelector('.workshop-page__mana-sphere')).toBeNull();
    expect(stage.querySelector('.workshop-page__seed-block')).toBeNull();
    expect(stage.querySelector('.workshop-page__action-bar')).not.toBeNull();
    expect(
      stage.querySelector('.workshop-page__summon-button-label')?.textContent,
    ).toBe('summon seed');
    expect(
      stage.querySelector('.workshop-page__summon-button-cost')?.textContent,
    ).toBe('10 mana');
    expect(stage.querySelector('.workshop-page__summon-button')?.getAttribute('aria-label')).toBe(
      'summon seed, costs 10 mana',
    );
    expect(stage.querySelector('.workshop-page__bag-button')?.textContent).toBe('bag');
    expect(stage.querySelector('.workshop-page__prestige-button')).toBeNull();
    expect(stage.querySelector('.room-bottom-panel__prestige-button')).toBeNull();
    expect(stage.querySelector('.workshop-page__leaderboard-button')?.textContent).toBe(
      'leaderboard',
    );
    expect(stage.querySelector('.workshop-page__leaderboard')?.hidden).toBe(true);
    expect(stage.querySelector('.workshop-page__world-chat-button')?.textContent).toBe(
      'world chat',
    );
    expect(stage.querySelector('.workshop-page__world-chat')?.hidden).toBe(true);
    expect(stage.querySelector('.workshop-page__world-chat-button')?.disabled).toBe(true);
    expect(
      stage.querySelector('.workshop-page__world-chat-box')?.parentElement?.classList.contains(
        'room-world-chat-layer',
      ),
    ).toBe(true);
    expect(stage.querySelector('.workshop-page__logs-button')).toBeNull();
    expect(stage.querySelector('.workshop-page__logs')).toBeNull();
    expect(stage.querySelector('.workshop-page__discoveries-button')?.textContent).toBe(
      'discoveries',
    );
    expect(stage.querySelector('.workshop-page__discoveries')?.hidden).toBe(true);
    expect(stage.querySelector('.workshop-page__bag-popup')).not.toBeNull();
    expect(stage.querySelector('.prestige-page')).toBeNull();
    expect(stage.querySelector('.workshop-page__flyouts')).not.toBeNull();
    expect(stage.querySelector('.workshop-page__summon-message')).toBeNull();
    expect(
      [...stage.querySelectorAll('.room-bottom-panel__tab')].map((button) => button.textContent),
    ).toEqual([
      'brewing',
      'garden',
      'workshop',
      'research',
      'market',
    ]);
    expect(stage.querySelector('.room-bottom-panel__tab.is-selected')?.dataset.pageId).toBe(
      'workshop',
    );
    expect(
      stage
        .querySelector('.room-bottom-panel__tab[data-page-id="brewing"]')
        ?.classList.contains('is-locked'),
    ).toBe(true);
    expect(
      stage
        .querySelector('.room-bottom-panel__tab[data-page-id="brewing"]')
        ?.getAttribute('aria-disabled'),
    ).toBeNull();
    expect(
      stage.querySelector('.room-bottom-panel__tab[aria-current="page"]')?.textContent,
    ).toBe('workshop');
    expect(stage.querySelector('.workshop-page__name')).toBeNull();
    expect(stage.querySelector('.room-page__nav')).toBeNull();
    const topPanel = stage.querySelector('.room-top-panel');
    expect(topPanel).not.toBeNull();
    expect(topPanel.classList.contains('has-avatar')).toBe(true);
    const avatarButton = topPanel.querySelector('.room-top-panel__avatar-button');
    expect(avatarButton).not.toBeNull();
    expect(
      avatarButton
        .querySelector('.room-top-panel__username-avatar')
        ?.getAttribute('src'),
    ).toContain('/assets/characters/elara.png');
    expect(topPanel.children[0]?.className).toBe('room-top-panel__avatar-button');
    expect(topPanel.children[1]?.className).toBe('room-top-panel__identity-row');
    expect(topPanel.children[2]?.classList.contains('room-top-panel__resources')).toBe(true);
    expect(
      topPanel.querySelector('.room-top-panel__identity-row .room-top-panel__username')
        ?.textContent,
    ).toBe('wizard');
    expect(topPanel.querySelector('.room-top-panel__resources')?.textContent).toContain(
      '0/50 mana',
    );
    expect(topPanel.querySelector('.room-top-panel__mana-rate')?.textContent).toBe('+1/s');
    expect(
      topPanel.querySelector('[data-tutorial-id="top:mana"]')?.getAttribute('aria-label'),
    ).toBe('mana');
    expect(topPanel.querySelector('.room-top-panel__resources')?.textContent).toContain('0 coin');
    expect(
      topPanel
        .querySelector('.room-top-panel__resources')
        ?.classList.contains('has-special-currency'),
    ).toBe(false);
    expect(topPanel.querySelector('.room-top-panel__resource[aria-label="crystal"]')?.hidden).toBe(
      true,
    );
  });

  it('keeps gated rooms locked at level 1 and explains the unlock levels', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'garden');

    const popup = stage.querySelector('.room-bottom-panel__lock-popup');

    expect(pagesFacade.getCurrentPageId()).toBe('workshop');
    expect(stage.querySelector('.garden-page')).toBeNull();
    expect(popup?.hidden).toBe(false);
    expect(stage.querySelector('.room-bottom-panel__lock-message')?.textContent).toBe(
      'garden unlocks at level 2',
    );

    clickRoomTab(stage, 'research');

    expect(pagesFacade.getCurrentPageId()).toBe('workshop');
    expect(stage.querySelector('.research-page')).toBeNull();
    expect(stage.querySelector('.room-bottom-panel__lock-message')?.textContent).toBe(
      'research unlocks at level 3',
    );

    clickRoomTab(stage, 'brewing');

    expect(pagesFacade.getCurrentPageId()).toBe('workshop');
    expect(stage.querySelector('.brewing-page')).toBeNull();
    expect(popup?.hidden).toBe(false);
    expect(stage.querySelector('.room-bottom-panel__lock-message')?.textContent).toBe(
      'brewing unlocks at level 4',
    );

    unlockWorkshopSecondaryActions(gameplayFacade);
    gameplayFacade.publishSnapshot();
    clickRoomTab(stage, 'brewing');

    expect(pagesFacade.getCurrentPageId()).toBe('brewing');
    expect(stage.querySelector('.brewing-page')).not.toBeNull();
  });

  it('retains NPC market prices only while Market is open', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const releasePrices = vi.fn();
    const npcMarketFacade = {
      retainPrices: vi.fn(() => releasePrices),
    };
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      npcMarketFacade,
    });

    pagesFacade.mount(stage);

    expect(npcMarketFacade.retainPrices).not.toHaveBeenCalled();

    clickRoomTab(stage, 'shop');

    expect(npcMarketFacade.retainPrices).toHaveBeenCalledTimes(1);

    gameplayFacade.publishSnapshot();

    expect(npcMarketFacade.retainPrices).toHaveBeenCalledTimes(1);

    clickRoomTab(stage, 'workshop');

    expect(releasePrices).toHaveBeenCalledTimes(1);

    pagesFacade.unmount();

    expect(releasePrices).toHaveBeenCalledTimes(1);
  });

  it('retains public player-market rows only while player market tab is open', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const releaseMarketData = vi.fn();
    const playerShopSnapshot = {
      connected: true,
      listings: [],
      ownListings: [],
      requests: [],
      ownRequests: [],
      tradeHistory: [],
      ownTradeHistory: [],
      proceedsCoin: 0,
    };
    const playerShopFacade = {
      getSnapshot: () => playerShopSnapshot,
      subscribe: vi.fn((listener) => {
        listener(playerShopSnapshot);
        return () => {};
      }),
      retainMarketData: vi.fn(() => releaseMarketData),
    };
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      playerShopFacade,
    });

    pagesFacade.mount(stage);

    expect(playerShopFacade.retainMarketData).not.toHaveBeenCalled();

    clickRoomTab(stage, 'shop');

    expect(playerShopFacade.retainMarketData).not.toHaveBeenCalled();

    [...stage.querySelectorAll('.shop-page__market-tab-button')]
      .find((button) => button.textContent === 'player market')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerShopFacade.retainMarketData).toHaveBeenCalledTimes(1);

    [...stage.querySelectorAll('.shop-page__market-tab-button')]
      .find((button) => button.textContent === 'trader market')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(releaseMarketData).toHaveBeenCalledTimes(1);

    [...stage.querySelectorAll('.shop-page__market-tab-button')]
      .find((button) => button.textContent === 'player market')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerShopFacade.retainMarketData).toHaveBeenCalledTimes(2);

    clickRoomTab(stage, 'workshop');

    expect(releaseMarketData).toHaveBeenCalledTimes(2);

    pagesFacade.unmount();

    expect(releaseMarketData).toHaveBeenCalledTimes(2);
  });

  it('reveals Workshop non-prestige secondary buttons by milestone level', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 3);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    expect(stage.querySelector('.room-bottom-panel__prestige-button')).toBeNull();
    expect(stage.querySelector('.workshop-page__leaderboard')?.hidden).toBe(false);
    expect(stage.querySelector('.workshop-page__trade-alliance')?.hidden).toBe(true);
    expect(stage.querySelector('.workshop-page__world-chat')?.hidden).toBe(false);
    expect(stage.querySelector('.workshop-page__world-chat-button')?.disabled).toBe(false);
    expect(stage.querySelector('.workshop-page__logs')).toBeNull();
    expect(stage.querySelector('.workshop-page__discoveries')?.hidden).toBe(true);

    unlockWorkshopSecondaryActions(gameplayFacade, 4);
    gameplayFacade.publishSnapshot();

    expect(stage.querySelector('.workshop-page__trade-alliance')?.hidden).toBe(false);
    expect(stage.querySelector('.workshop-page__discoveries')?.hidden).toBe(false);
  });

  it('reveals the prestige page tab at level 7', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 7);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    expect(stage.querySelector('.room-bottom-panel__prestige-button')?.style.visibility).toBe('');
    expect(stage.querySelector('.room-bottom-panel__prestige-button')?.dataset.pageId).toBe(
      'prestige',
    );

    clickRoomTab(stage, 'research');
    expect(pagesFacade.getCurrentPageId()).toBe('research');

    stage
      .querySelector('.room-bottom-panel__prestige-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(pagesFacade.getCurrentPageId()).toBe('prestige');
    expect(stage.querySelector('.prestige-page')).not.toBeNull();
    expect(stage.querySelector('.prestige-page__description.style-box')).not.toBeNull();
    expect(stage.querySelector('.prestige-page__body.style-page-scroll')).not.toBeNull();
    expect(stage.querySelector('.prestige-page .style-dialog')).toBeNull();
  });

  it('shows crystal, ruby, or emerald in the top panel only on matching research tabs', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 3);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'research');

    const resources = stage.querySelector('.room-top-panel__resources');
    expect(resources?.classList.contains('has-special-currency')).toBe(false);

    const clickResearchTab = (label) => {
      const button = [...stage.querySelectorAll('.research-page__tab-button')].find(
        (candidate) => candidate.textContent === label,
      );
      expect(button).not.toBeNull();
      button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    };

    clickResearchTab('automation');

    const crystal = stage.querySelector('.room-top-panel__resource[aria-label="crystal"]');
    const crystalValue = crystal?.querySelector('.room-top-panel__resource-val');
    expect(crystal?.hidden).toBe(false);
    expect(crystal?.textContent).toBe('0 crystal');
    expect(
      crystalValue?.querySelector('.style-resource-label--crystal .style-resource-label__amount')
        ?.textContent,
    ).toBe('0');
    expect(
      crystal?.querySelector('.style-resource-label--crystal .style-resource-label__icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('resource:crystal');

    clickResearchTab('advanced research');

    const ruby = stage.querySelector('.room-top-panel__resource[aria-label="ruby"]');
    const rubyValue = ruby?.querySelector('.room-top-panel__resource-val');
    expect(ruby?.hidden).toBe(false);
    expect(ruby?.textContent).toBe('0 ruby');
    expect(
      rubyValue?.querySelector('.style-resource-label--ruby .style-resource-label__amount')
        ?.textContent,
    ).toBe('0');
    expect(
      ruby?.querySelector('.style-resource-label--ruby .style-resource-label__icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('resource:ruby');

    clickResearchTab('emerald research');

    const emerald = stage.querySelector('.room-top-panel__resource[aria-label="emerald"]');
    expect(emerald?.hidden).toBe(false);
    expect(emerald?.textContent).toBe('0 emerald');
    expect(
      emerald?.querySelector('.style-resource-label--emerald .style-resource-label__icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('resource:emerald');

    clickResearchTab('regular research');
    expect(resources?.classList.contains('has-special-currency')).toBe(false);
    expect(ruby?.hidden).toBe(true);
    expect(emerald?.hidden).toBe(true);
  });

  it('keeps top panel coin amount and unit in one fitted value', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    gameplayFacade.setCoin(308.33);

    const coin = stage.querySelector('.room-top-panel__resource[aria-label="coin"]');
    const value = coin?.querySelector('.room-top-panel__resource-val');

    expect(coin?.textContent).toBe('308.33 coin');
    expect(value?.textContent).toBe('308.33 coin');
    expect(coin?.querySelector('.room-top-panel__resource-key')).toBeNull();
  });

  it('shows top panel mana regen under the mana amount', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    snapshot.mana.current = 200;
    snapshot.mana.cap = 200;
    snapshot.mana.perSecond = 4;
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    const mana = stage.querySelector('.room-top-panel__resource[aria-label="mana"]');

    expect(mana?.querySelector('.room-top-panel__resource-val')?.textContent).toBe(
      '200/200 mana',
    );
    expect(mana?.querySelector('.room-top-panel__mana-rate')?.textContent).toBe('+4/s');
    expect(stage.querySelector('.workshop-page__mana-sphere')).toBeNull();
  });

  it('marks top panel mana and coin for icon mode', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake('wizard', 'white', { initialIconMode: 'icons' }),
    });

    pagesFacade.mount(stage);

    const mana = stage.querySelector('.room-top-panel__resource[aria-label="mana"]');
    const coin = stage.querySelector('.room-top-panel__resource[aria-label="coin"]');
    const manaValue = mana?.querySelector('.room-top-panel__resource-val');
    const coinValue = coin?.querySelector('.room-top-panel__resource-val');

    expect(manaValue?.textContent).toBe('0/50 mana');
    expect(coinValue?.textContent).toBe('0 coin');
    expect(
      manaValue?.querySelector('.style-resource-label--mana .style-resource-label__amount')
        ?.textContent,
    ).toBe('0/50');
    expect(
      coinValue?.querySelector('.style-resource-label--coin .style-resource-label__amount')
        ?.textContent,
    ).toBe('0');
    expect(
      manaValue?.querySelector('.style-resource-label--mana .style-resource-label__icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('resource:mana');
    expect(coinValue?.querySelector('.style-resource-label--coin')).not.toBeNull();
  });

  it('renders the selected character avatar in the top panel when icons are enabled', () => {
    const stage = document.createElement('section');
    const playerFacade = createPlayerFacadeFake('Merlin', 'white', {
      initialCharacter: 'mira',
      initialIconMode: 'icons',
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade,
    });

    pagesFacade.mount(stage);

    const topPanel = stage.querySelector('.room-top-panel');
    const usernameButton = stage.querySelector('.room-top-panel__username');
    const avatarButton = stage.querySelector('.room-top-panel__avatar-button');
    const usernameAvatar = stage.querySelector('.room-top-panel__username-avatar');

    expect(usernameButton?.textContent).toBe('Merlin');
    expect(avatarButton).not.toBeNull();
    expect(usernameAvatar?.getAttribute('src')).toContain('/assets/characters/mira.png');
    expect(avatarButton?.hidden).toBe(false);
    expect(usernameAvatar?.hidden).toBe(false);
    expect(topPanel?.classList.contains('has-avatar')).toBe(true);

    playerFacade.setCharacter('rowan');

    expect(usernameAvatar?.getAttribute('src')).toContain('/assets/characters/rowan.png');

    playerFacade.setIconMode('none');

    expect(usernameButton?.textContent).toBe('Merlin');
    expect(avatarButton?.hidden).toBe(false);
    expect(usernameAvatar?.hidden).toBe(false);
    expect(topPanel?.classList.contains('has-avatar')).toBe(true);
  });

  it('mounts the FTUE guide shell for fresh level 1 players', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    snapshot.tasks.level.completedTasks = 0;
    snapshot.tasks.level.tasks = snapshot.tasks.level.tasks.map((task) => ({
      ...task,
      progressQuantity: 0,
      remainingQuantity: task.requiredQuantity,
      progress: 0,
      maxed: false,
      completed: false,
      canFill: false,
      canComplete: false,
    }));
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      tutorialStorage: createMemoryStorage(),
    });

    pagesFacade.mount(stage);

    const layer = stage.querySelector('.tutorial-layer');

    expect(layer).not.toBeNull();
    expect(layer?.querySelector('.tutorial-layer__portrait')).not.toBeNull();
    expect(layer?.querySelector('.tutorial-layer__pointer')).not.toBeNull();
    expect(layer?.querySelector('.tutorial-layer__step-label')).not.toBeNull();
    expect(layer?.querySelector('.tutorial-layer__lesson')).not.toBeNull();
    expect(layer?.querySelector('.tutorial-layer__skip')).toBeNull();
  });

  it('can reset stale FTUE progress for a fresh gameplay save', () => {
    const stage = document.createElement('section');
    const storage = createMemoryStorage({
      [TUTORIAL_STORAGE_KEY]: JSON.stringify({
        completedStepIds: TUTORIAL_STEP_IDS,
      }),
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake(),
      tutorialStorage: storage,
    });

    pagesFacade.mount(stage);
    pagesFacade.resetTutorialProgress();

    expect(JSON.parse(storage.getItem(TUTORIAL_STORAGE_KEY))).toEqual({
      completedStepIds: [],
    });

    pagesFacade.unmount();
  });

  it('shows passive FTUE guidance for level five theme settings', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const storage = createMemoryStorage();
    gameplayFacade.getSnapshot().tasks.currentLevel = 5;
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      tutorialStorage: storage,
    });

    pagesFacade.mount(stage);
    pagesFacade.tutorialFacade.refresh();

    expect(pagesFacade.tutorialFacade.activeStep?.id).toBe('find-theme-settings');
    expect(pagesFacade.tutorialFacade.activeStep?.cueMode).toBe('passive');
    expect(pagesFacade.tutorialFacade.activeStep?.targetId).toBe('top:username');
    expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(false);
    expect(stage.querySelector('.tutorial-layer__lesson')?.hidden).toBe(true);

    stage
      .querySelector('[data-tutorial-id="top:username"]')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    pagesFacade.tutorialFacade.refresh();

    expect(pagesFacade.tutorialFacade.activeStep?.targetId).toBe('top:settings:theme-tab');

    stage
      .querySelector('[data-tutorial-id="top:settings:theme-tab"]')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    pagesFacade.tutorialFacade.refresh();

    expect(pagesFacade.tutorialFacade.activeStep).toBeNull();

    pagesFacade.unmount();
  });

  it('auto-completes FTUE for players already past settings introduction', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const storage = createMemoryStorage();
    gameplayFacade.getSnapshot().tasks.currentLevel = 6;
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      tutorialStorage: storage,
    });

    pagesFacade.mount(stage);
    pagesFacade.tutorialFacade.refresh();

    expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(true);
    expect(
      JSON.parse(storage.getItem(TUTORIAL_STORAGE_KEY))?.completedStepIds,
    ).toEqual(TUTORIAL_STEP_IDS);
  });

  it('fills a ready task when the active objective panel is pressed', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const task = snapshot.tasks.level.tasks[0];
    const completedStepIds = TUTORIAL_STEP_IDS.slice(
      0,
      TUTORIAL_STEP_IDS.indexOf('first-fill-seed-task') + 1,
    );

    snapshot.seedInventory[0].quantity = 1;
    task.progressQuantity = 1;
    task.remainingQuantity = 9;
    task.ownedQuantity = 1;
    task.progress = 0.1;
    task.canFill = true;

    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      tutorialStorage: createMemoryStorage({
        [TUTORIAL_STORAGE_KEY]: JSON.stringify({ completedStepIds }),
      }),
    });

    pagesFacade.mount(stage);

    pagesFacade.tutorialFacade.refresh();

    stage
      .querySelector('.tutorial-layer__lesson-button')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.tutorial-layer__lesson')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(task.progressQuantity).toBe(2);
    expect(task.remainingQuantity).toBe(3);
    expect(snapshot.seedInventory[0].quantity).toBe(0);
  });

  it('shows a garden tab notification when garden work is ready outside Workshop', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 2);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      tutorialStorage: createCompletedTutorialStorage(),
    });

    pagesFacade.mount(stage);

    const gardenTab = stage.querySelector('.room-bottom-panel__tab[data-page-id="garden"]');
    expect(gardenTab?.dataset.notification).toBeUndefined();

    const tile = gameplayFacade.getSnapshot().garden.plot.tiles[0];
    tile.phase = 'ready';
    tile.selectedSeedItemTypeId = 1;
    tile.selectedSeedLabel = 'sage seed';
    tile.seedItemTypeId = 1;
    tile.seedLabel = 'sage seed';
    tile.herbItemTypeId = 1001;
    tile.herbLabel = 'sage';
    gameplayFacade.publishSnapshot();

    expect(pagesFacade.getCurrentPageId()).toBe('workshop');
    expect(gardenTab?.dataset.notification).toBe('true');
    expect(gardenTab?.getAttribute('aria-label')).toBe('show garden, action available');

    clickRoomTab(stage, 'garden');

    const row = stage.querySelector('.garden-page__plot-row');
    expect(row?.dataset.notification).toBe('true');
  });

  it('shows guild charter notifications on the guild tab and start button', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 15);
    const snapshot = gameplayFacade.getSnapshot();
    snapshot.guild = {
      unlocked: true,
      created: false,
      canCreate: true,
      charterCostCoin: 1500,
      currentCoin: 1500,
    };
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      tutorialStorage: createCompletedTutorialStorage(),
    });

    pagesFacade.mount(stage);

    const guildTab = stage.querySelector('.room-bottom-panel__tab[data-page-id="guild"]');
    expect(guildTab?.hidden).toBe(false);
    expect(guildTab?.dataset.notification).toBe('true');
    expect(guildTab?.dataset.notificationTone).toBe('red');

    clickRoomTab(stage, 'guild');

    const startButton = stage.querySelector('.guild-page__wide-button');
    expect(startButton?.textContent).toBe('start guild1.5k coin');
    expect(startButton?.querySelector('.style-resource-label--coin')).not.toBeNull();
    expect(startButton?.dataset.notification).toBe('true');
    expect(startButton?.dataset.notificationTone).toBe('red');

    snapshot.guild.canCreate = false;
    snapshot.guild.currentCoin = 1499;
    gameplayFacade.publishSnapshot();

    const updatedStartButton = stage.querySelector('.guild-page__wide-button');
    expect(guildTab?.dataset.notification).toBeUndefined();
    expect(updatedStartButton?.dataset.notification).toBeUndefined();
  });

  it('suppresses unrelated notifications while a blocking FTUE step is active', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      tutorialStorage: createMemoryStorage(),
    });

    gameplayFacade.getSnapshot().shop.coinOffer.canCollect = true;

    pagesFacade.mount(stage);
    gameplayFacade.publishSnapshot();
    pagesFacade.tutorialFacade.refresh();

    const shopTab = stage.querySelector('.room-bottom-panel__tab[data-page-id="shop"]');

    expect(pagesFacade.tutorialFacade.activeStep?.id).toBe('purchase-house');
    expect(shopTab?.dataset.notification).toBeUndefined();

    pagesFacade.tutorialFacade.progressManager.completeMany(TUTORIAL_STEP_IDS);
    pagesFacade.tutorialFacade.refresh();

    expect(shopTab?.dataset.notification).toBe('true');

    pagesFacade.unmount();
  });

  it('opens level rewards from the top-panel level', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    const levelButton = stage.querySelector('.room-top-panel__level');
    const levelPopup = stage.querySelector('.room-top-panel__level-popup');

    expect(levelButton?.textContent).toBe('level 1');
    expect(levelPopup?.hidden).toBe(true);

    levelButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(levelPopup.hidden).toBe(false);
    expect(levelPopup.querySelector('[role="dialog"]')).not.toBeNull();
    expect(
      levelPopup.querySelector('.room-top-panel__level-pager')?.parentElement?.className,
    ).toBe('room-top-panel__level-panel');
    expect(levelPopup.querySelector('.room-top-panel__level-title')?.textContent).toBe(
      'level 1',
    );
    expect(levelPopup.querySelector('.room-top-panel__level-current')?.hidden).toBe(false);
    expect(levelPopup.textContent).toContain('garden plots');
    expect(levelPopup.textContent).toContain('cauldrons');
    expect(levelPopup.textContent).toContain('trader stands');
    expect(levelPopup.textContent).toContain('player stands');
    expect(levelPopup.textContent).not.toContain('max');
    expect(levelPopup.textContent).not.toContain('level 0');
    expect(levelPopup.querySelector('.room-top-panel__level-pager-button')?.hidden).toBe(true);
    expect(levelPopup.querySelector('.room-top-panel__level-divider')?.hidden).toBe(false);
    const level1AddedRows = levelPopup.querySelectorAll(
      '.room-top-panel__level-added-rows .room-top-panel__level-effect-row',
    );
    const level1TotalRows = levelPopup.querySelectorAll(
      '.room-top-panel__level-total-rows .room-top-panel__level-effect-row',
    );
    expect(level1AddedRows[0].textContent).toBe('garden plots+2');
    expect(level1TotalRows[0].textContent).toBe('garden plots2');
    expect(levelPopup.textContent).toContain('mana cap');
    expect(levelPopup.textContent).toContain('mana regen');

    levelPopup
      .querySelector('.room-top-panel__level-pager-button:last-child')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(levelPopup.querySelector('.room-top-panel__level-title')?.textContent).toBe(
      'level 2',
    );
    expect(levelPopup.querySelector('.room-top-panel__level-current')?.hidden).toBe(true);
    expect(levelPopup.querySelector('.room-top-panel__level-added-rows')?.hidden).toBe(false);
    expect(levelPopup.querySelector('.room-top-panel__level-divider')?.hidden).toBe(false);
    expect(
      levelPopup.querySelector('.room-top-panel__level-added-rows')?.textContent,
    ).toContain('garden plots+1');
    expect(
      levelPopup.querySelector('.room-top-panel__level-added-rows')?.textContent,
    ).toContain('mana cap+50');
    expect(
      levelPopup.querySelector('.room-top-panel__level-added-rows')?.textContent,
    ).toContain('mana regen+1/sec');
    expect(
      levelPopup.querySelector('.room-top-panel__level-added-rows')?.textContent,
    ).toContain('crystal+1');
    expect(
      levelPopup.querySelector('.room-top-panel__level-total-rows')?.textContent,
    ).toContain('garden plots3');
    expect(
      levelPopup.querySelector('.room-top-panel__level-total-rows')?.textContent,
    ).toContain('mana cap100');
    expect(
      levelPopup.querySelector('.room-top-panel__level-total-rows')?.textContent,
    ).toContain('mana regen2/sec');

    levelPopup
      .querySelector('.room-top-panel__level-pager-button:last-child')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(levelPopup.querySelector('.room-top-panel__level-title')?.textContent).toBe(
      'level 3',
    );
    const level3AddedText =
      levelPopup.querySelector('.room-top-panel__level-added-rows')?.textContent ?? '';
    const [level3TotalRow] = levelPopup.querySelectorAll(
      '.room-top-panel__level-total-rows .room-top-panel__level-effect-row',
    );
    expect(level3AddedText).toContain('trader stands+1');
    expect(level3AddedText).toContain('player stands+1');
    expect(level3AddedText).toContain('mana cap+50');
    expect(level3AddedText).toContain('crystal+1');
    expect(level3TotalRow.querySelector('.room-top-panel__level-effect-label')?.textContent).toBe(
      'garden plots',
    );
    expect(level3TotalRow.querySelector('.room-top-panel__level-effect-value')?.textContent).toBe(
      '3',
    );

    levelPopup
      .querySelector('.room-top-panel__level-close')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(levelPopup.hidden).toBe(true);
  });

  it('shows a single Workshop task without an expand action', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    const tasks = stage.querySelector('.workshop-page__tasks');
    const title = tasks?.querySelector('.style-box__title');
    const summary = stage.querySelector('.workshop-page__tasks-summary');
    const infoPopup = stage.querySelector('.workshop-page__tasks-info-popup');
    const backdrop = stage.querySelector('.workshop-page__tasks-backdrop');
    const count = stage.querySelector('.workshop-page__tasks-count');
    const pinButton = stage.querySelector('.workshop-page__tasks-pin');
    const toggle = stage.querySelector('.workshop-page__tasks-toggle');
    const list = stage.querySelector('.workshop-page__task-list');
    const summaryRow = summary?.querySelector('.workshop-page__task-row');
    const rewards = stage.querySelector('.workshop-page__level-rewards');
    const rewardsToggle = stage.querySelector('.workshop-page__level-rewards-toggle');

    expect(tasks).not.toBeNull();
    expect(tasks.parentElement?.classList.contains('workshop-page__tasks-slot')).toBe(true);
    expect(title?.textContent).toBe('level 2 requirements');
    expect(summaryRow?.textContent).toBe('sage seed0/5turn in');
    expect(rewards?.hidden).toBe(true);
    expect(rewardsToggle?.hidden).toBe(true);
    expect(rewardsToggle?.disabled).toBe(true);
    expect(stage.querySelector('.workshop-page__tasks-helper')).toBeNull();
    expect(infoPopup?.hidden).toBe(true);
    expect(backdrop?.hidden).toBe(true);
    expect(
      summary?.querySelector('.workshop-page__task-progress-fill')?.style.width,
    ).toBe('0%');
    expect(stage.querySelector('.workshop-page__tasks-level')).toBeNull();
    expect(count?.textContent).toBe('0/1');
    expect(pinButton?.hidden).toBe(true);
    expect(pinButton?.disabled).toBe(true);
    expect(pinButton?.dataset.tutorialId).toBeUndefined();
    expect(toggle?.hidden).toBe(true);
    expect(toggle?.disabled).toBe(true);
    expect(toggle?.dataset.tutorialId).toBeUndefined();
    expect(toggle?.dataset.notification).toBeUndefined();
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(list?.hidden).toBe(true);
    expect(list?.querySelectorAll('.workshop-page__task')).toHaveLength(0);

    summary.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(list.hidden).toBe(true);
    expect(tasks.classList.contains('is-collapsed')).toBe(true);

    title.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(infoPopup.hidden).toBe(false);
    expect(infoPopup.querySelector('.workshop-page__tasks-info-copy')?.textContent).toBe(
      'turn in these items to reach level 2. turned-in items are consumed.',
    );

    infoPopup
      .querySelector('.workshop-page__tasks-info-close')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(infoPopup.hidden).toBe(true);
  });

  it('shows Workshop tasks collapsed and expands multiple tasks from the bottom action', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const baseTask = snapshot.tasks.level.tasks[0];
    snapshot.tasks.level.totalTasks = 2;
    snapshot.tasks.level.tasks = [
      baseTask,
      {
        ...baseTask,
        taskId: 'level1-mint-seeds',
        itemKey: 'mintSeed',
        itemLabel: 'mint seed',
        requiredQuantity: 5,
        remainingQuantity: 5,
      },
    ];
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    const tasks = stage.querySelector('.workshop-page__tasks');
    const title = tasks?.querySelector('.style-box__title');
    const summary = stage.querySelector('.workshop-page__tasks-summary');
    const infoPopup = stage.querySelector('.workshop-page__tasks-info-popup');
    const backdrop = stage.querySelector('.workshop-page__tasks-backdrop');
    const count = stage.querySelector('.workshop-page__tasks-count');
    const pinButton = stage.querySelector('.workshop-page__tasks-pin');
    const toggle = stage.querySelector('.workshop-page__tasks-toggle');
    const list = stage.querySelector('.workshop-page__task-list');
    const summaryRow = summary?.querySelector('.workshop-page__task-row');
    const rewards = stage.querySelector('.workshop-page__level-rewards');
    const rewardsToggle = stage.querySelector('.workshop-page__level-rewards-toggle');

    expect(tasks).not.toBeNull();
    expect(title?.textContent).toBe('level 2 requirements');
    expect(summaryRow?.textContent).toBe('sage seed0/5turn in');
    expect(stage.querySelector('.workshop-page__tasks-helper')).toBeNull();
    expect(infoPopup?.hidden).toBe(true);
    expect(backdrop?.hidden).toBe(true);
    expect(count?.textContent).toBe('0/2');
    expect(pinButton?.hidden).toBe(false);
    expect(pinButton?.textContent).toBe('pin');
    expect(pinButton?.getAttribute('aria-pressed')).toBe('false');
    expect(pinButton?.dataset.tutorialId).toBe('workshop:tasksPin');
    expect(toggle?.hidden).toBe(false);
    expect(toggle?.textContent).toBe('expand');
    expect(toggle?.dataset.tutorialId).toBe('workshop:tasks');
    expect(toggle?.dataset.notification).toBeUndefined();
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(list?.hidden).toBe(true);
    expect(list?.querySelectorAll('.workshop-page__task')).toHaveLength(1);
    expect(rewards?.hidden).toBe(true);
    expect(rewardsToggle?.hidden).toBe(true);

    pinButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toBe('collapse');
    expect(pinButton.textContent).toBe('unpin');
    expect(pinButton.getAttribute('aria-pressed')).toBe('true');
    expect(tasks.classList.contains('is-pinned')).toBe(true);
    expect(backdrop.hidden).toBe(true);
    expect(list.hidden).toBe(false);
    expect(rewards?.hidden).toBe(false);

    document.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(tasks.classList.contains('is-pinned')).toBe(true);
    expect(backdrop.hidden).toBe(true);

    pinButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(pinButton.textContent).toBe('pin');
    expect(pinButton.getAttribute('aria-pressed')).toBe('false');
    expect(tasks.classList.contains('is-pinned')).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(backdrop.hidden).toBe(false);

    toggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(pinButton.textContent).toBe('pin');
    expect(pinButton.getAttribute('aria-pressed')).toBe('false');
    expect(backdrop.hidden).toBe(true);
    expect(list.hidden).toBe(true);

    toggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toBe('collapse');
    expect(toggle.dataset.notification).toBeUndefined();
    expect(list.hidden).toBe(false);
    expect(backdrop.hidden).toBe(false);
    expect(list.querySelectorAll('.workshop-page__task')).toHaveLength(1);
    expect(list.querySelector('.workshop-page__task-label')?.textContent).toBe('mint seed');
    expect(summaryRow?.textContent).toBe('sage seed0/5turn in');
    expect(rewards?.hidden).toBe(false);
    expect(rewards?.textContent).toContain('level 2 rewards');
    expect(rewardsToggle?.hidden).toBe(true);
    expect(rewardsToggle?.disabled).toBe(true);
    expect(pinButton?.textContent).toBe('pin');
    expect(pinButton?.getAttribute('aria-pressed')).toBe('false');
    expect(stage.querySelector('.workshop-page__level-complete')?.hidden).toBe(true);
    expect(tasks.classList.contains('is-expanded')).toBe(true);

    toggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.textContent).toBe('expand');
    expect(toggle.dataset.notification).toBeUndefined();
    expect(list.hidden).toBe(true);
    expect(backdrop.hidden).toBe(true);
    expect(rewards?.hidden).toBe(true);
    expect(pinButton.hidden).toBe(false);
    expect(pinButton.textContent).toBe('pin');
    expect(rewardsToggle.hidden).toBe(true);
    expect(tasks.classList.contains('is-collapsed')).toBe(true);

    toggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(list.hidden).toBe(false);
    expect(backdrop.hidden).toBe(false);

    backdrop.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(list.hidden).toBe(true);
    expect(backdrop.hidden).toBe(true);

    toggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(list.hidden).toBe(false);

    document.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(list.hidden).toBe(true);
    expect(backdrop.hidden).toBe(true);
  });

  it('keeps Workshop tasks expanded when a touch reward toggle retargets to the backdrop', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const baseTask = snapshot.tasks.level.tasks[0];
    snapshot.tasks.currentLevel = 2;
    snapshot.tasks.level.level = 2;
    snapshot.tasks.level.completion.level = 2;
    snapshot.playerLevel.currentLevel = 2;
    snapshot.tasks.level.totalTasks = 2;
    snapshot.tasks.level.tasks = [
      baseTask,
      {
        ...baseTask,
        taskId: 'level1-mint-seeds',
        itemKey: 'mintSeed',
        itemLabel: 'mint seed',
        requiredQuantity: 5,
        remainingQuantity: 5,
      },
    ];
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    document.body.append(stage);
    pagesFacade.mount(stage);

    const tasks = stage.querySelector('.workshop-page__tasks');
    const toggle = stage.querySelector('.workshop-page__tasks-toggle');
    const list = stage.querySelector('.workshop-page__task-list');
    const rewards = stage.querySelector('.workshop-page__level-rewards');
    const rewardsToggle = stage.querySelector('.workshop-page__level-rewards-toggle');
    const backdrop = stage.querySelector('.workshop-page__tasks-backdrop');
    const originalElementFromPoint = document.elementFromPoint;

    toggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(rewards?.hidden).toBe(false);
    expect(rewardsToggle?.textContent).toBe('hide rewards');

    try {
      document.elementFromPoint = () => rewardsToggle;
      rewardsToggle.dispatchEvent(
        createPointerEvent('pointerdown', { clientX: 900, clientY: 500 }),
      );
      document.dispatchEvent(
        createPointerEvent('pointerup', { clientX: 900, clientY: 500 }),
      );

      expect(rewards.hidden).toBe(true);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');

      backdrop.dispatchEvent(
        new window.MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: 902,
          clientY: 502,
        }),
      );
    } finally {
      document.elementFromPoint = originalElementFromPoint;
    }

    expect(rewards.hidden).toBe(true);
    expect(rewardsToggle.textContent).toBe('show rewards');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toBe('collapse');
    expect(list.hidden).toBe(false);
    expect(backdrop.hidden).toBe(false);
    expect(tasks.classList.contains('is-expanded')).toBe(true);

    pagesFacade.unmount();
    stage.remove();
  });

  it('keeps expanded Workshop tasks open while dragging Elara', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const baseTask = snapshot.tasks.level.tasks[0];
    snapshot.tasks.level.totalTasks = 2;
    snapshot.tasks.level.tasks = [
      baseTask,
      {
        ...baseTask,
        taskId: 'level1-mint-seeds',
        itemKey: 'mintSeed',
        itemLabel: 'mint seed',
        requiredQuantity: 5,
        remainingQuantity: 5,
      },
    ];
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      tutorialStorage: createMemoryStorage(),
    });

    stage.style.setProperty('--style-ui-scale', '3');
    document.body.append(stage);

    try {
      pagesFacade.mount(stage);
      pagesFacade.tutorialFacade.hintManager.showLesson({
        id: 'elara-expanded-tasks-drag',
        title: 'lesson',
        text: 'move me',
        stepLabel: 'qa',
      });

      const toggle = stage.querySelector('.workshop-page__tasks-toggle');
      const list = stage.querySelector('.workshop-page__task-list');
      const backdrop = stage.querySelector('.workshop-page__tasks-backdrop');
      const button = stage.querySelector('.tutorial-layer__lesson-button');
      const lesson = stage.querySelector('.tutorial-layer__lesson');

      toggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(list.hidden).toBe(false);
      expect(backdrop.hidden).toBe(false);

      button.dispatchEvent(createPointerEvent('pointerdown', { clientX: 20, clientY: 300 }));
      document.dispatchEvent(createPointerEvent('pointermove', { clientX: 20, clientY: 340 }));
      document.dispatchEvent(createPointerEvent('pointerup', { clientX: 20, clientY: 340 }));

      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(list.hidden).toBe(false);
      expect(backdrop.hidden).toBe(false);
      expect(lesson.hidden).toBe(false);
    } finally {
      pagesFacade.unmount();
      stage.remove();
    }
  });

  it('keeps Workshop tasks expanded across page swaps', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const baseTask = snapshot.tasks.level.tasks[0];
    snapshot.tasks.level.totalTasks = 2;
    snapshot.tasks.level.tasks = [
      baseTask,
      {
        ...baseTask,
        taskId: 'level1-mint-seeds',
        itemKey: 'mintSeed',
        itemLabel: 'mint seed',
        requiredQuantity: 5,
        remainingQuantity: 5,
      },
    ];
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__tasks-toggle')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    pagesFacade.show('brewing');
    pagesFacade.show('workshop');

    const tasks = stage.querySelector('.workshop-page__tasks');
    const toggle = stage.querySelector('.workshop-page__tasks-toggle');
    const list = stage.querySelector('.workshop-page__task-list');

    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(list?.hidden).toBe(false);
    expect(tasks?.classList.contains('is-expanded')).toBe(true);
  });

  it('keeps pinned Workshop tasks pinned across page swaps', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const baseTask = snapshot.tasks.level.tasks[0];
    snapshot.tasks.currentLevel = 2;
    snapshot.tasks.level.level = 2;
    snapshot.tasks.level.completion.level = 2;
    snapshot.playerLevel.currentLevel = 2;
    snapshot.tasks.level.totalTasks = 2;
    snapshot.tasks.level.tasks = [
      baseTask,
      {
        ...baseTask,
        taskId: 'level1-mint-seeds',
        itemKey: 'mintSeed',
        itemLabel: 'mint seed',
        requiredQuantity: 5,
        remainingQuantity: 5,
      },
    ];
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__tasks-pin')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.workshop-page__level-rewards-toggle')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.workshop-page__level-rewards')?.hidden).toBe(true);

    pagesFacade.show('garden');
    expect(pagesFacade.getCurrentPageId()).toBe('garden');
    pagesFacade.show('workshop');

    const tasks = stage.querySelector('.workshop-page__tasks');
    const pinButton = stage.querySelector('.workshop-page__tasks-pin');
    const toggle = stage.querySelector('.workshop-page__tasks-toggle');
    const list = stage.querySelector('.workshop-page__task-list');
    const rewards = stage.querySelector('.workshop-page__level-rewards');
    const rewardsToggle = stage.querySelector('.workshop-page__level-rewards-toggle');
    const backdrop = stage.querySelector('.workshop-page__tasks-backdrop');

    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(list?.hidden).toBe(false);
    expect(rewards?.hidden).toBe(true);
    expect(rewardsToggle?.textContent).toBe('show rewards');
    expect(rewardsToggle?.getAttribute('aria-expanded')).toBe('false');
    expect(pinButton?.textContent).toBe('unpin');
    expect(pinButton?.getAttribute('aria-pressed')).toBe('true');
    expect(tasks?.classList.contains('is-pinned')).toBe(true);
    expect(backdrop?.hidden).toBe(true);
  });

  it('lets expanded Workshop tasks be dragged from the row to change priority', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const baseTask = snapshot.tasks.level.tasks[0];
    snapshot.tasks.level.totalTasks = 3;
    snapshot.tasks.level.tasks = [
      baseTask,
      {
        ...baseTask,
        taskId: 'level1-mint-seeds',
        itemKey: 'mintSeed',
        itemLabel: 'mint seed',
        requiredQuantity: 5,
        remainingQuantity: 5,
      },
      {
        ...baseTask,
        taskId: 'level1-nettle-seeds',
        itemKey: 'nettleSeed',
        itemLabel: 'nettle seed',
        requiredQuantity: 8,
        remainingQuantity: 8,
      },
    ];

    const originalGetBoundingClientRect = window.HTMLElement.prototype.getBoundingClientRect;
    const makeRect = (top) => ({
      x: 0,
      y: top,
      top,
      left: 0,
      right: 240,
      bottom: top + 22,
      width: 240,
      height: 22,
      toJSON: () => ({}),
    });

    window.HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if (this.classList?.contains('workshop-page__task')) {
        if (this.parentElement?.classList?.contains('workshop-page__tasks-summary')) {
          return makeRect(60);
        }

        if (this.parentElement?.classList?.contains('workshop-page__task-list')) {
          const rows = [
            ...this.parentElement.querySelectorAll(':scope > .workshop-page__task'),
          ];
          return makeRect(90 + rows.indexOf(this) * 30);
        }
      }

      return makeRect(0);
    };
    document.dispatchEvent(
      new window.MouseEvent('pointerdown', { bubbles: true, cancelable: true }),
    );
    document.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    document.body.append(stage);

    let pagesFacade = null;

    try {
      pagesFacade = new PagesFacade({
        gameplayFacade,
        playerFacade: createPlayerFacadeFake(),
      });

      pagesFacade.mount(stage);

      const toggle = stage.querySelector('.workshop-page__tasks-toggle');
      toggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      const summary = stage.querySelector('.workshop-page__tasks-summary');
      const list = stage.querySelector('.workshop-page__task-list');
      const getVisibleLabels = () => [
        summary.querySelector('.workshop-page__task-label')?.textContent,
        ...[...list.querySelectorAll('.workshop-page__task-label')].map(
          (label) => label.textContent,
        ),
      ];
      const getFlowLabels = () => getVisibleLabels().filter(Boolean);

      expect(getVisibleLabels()).toEqual(['sage seed', 'mint seed', 'nettle seed']);
      expect(stage.querySelector('.workshop-page__task-drag')).toBeNull();
      expect(document.body.querySelector('.workshop-page__task-drag-ghost')).toBeNull();

      const movedMintRow = list.querySelector('.workshop-page__task');
      movedMintRow.dispatchEvent(
        new window.MouseEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 100,
        }),
      );
      document.dispatchEvent(
        new window.MouseEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 40,
        }),
      );

      expect(stage.querySelector('.workshop-page__task-drag-placeholder')).toBeNull();
      expect(getFlowLabels()).toEqual(['sage seed', 'mint seed', 'nettle seed']);
      const draggedRow = list.querySelector(
        '.workshop-page__task.is-dragging.is-drag-lifted',
      );
      expect(draggedRow?.querySelector('.workshop-page__task-label')?.textContent).toBe(
        'mint seed',
      );
      expect(draggedRow?.style.position).toBe('relative');
      expect(draggedRow?.style.zIndex).toBe('98');
      expect(draggedRow?.style.display).not.toBe('none');
      expect(document.body.querySelector('.workshop-page__task-drag-ghost')).toBeNull();
      expect(
        summary.querySelector('.workshop-page__task.is-reordering .workshop-page__task-label')
          ?.textContent,
      ).toBe('sage seed');

      document.dispatchEvent(
        new window.MouseEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 40,
        }),
      );

      expect(getVisibleLabels()).toEqual(['mint seed', 'sage seed', 'nettle seed']);
      expect(stage.querySelector('.workshop-page__task.is-drag-lifted')).toBeNull();

      const mintSummaryRow = summary.querySelector('.workshop-page__task');
      mintSummaryRow.dispatchEvent(
        new window.MouseEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 70,
        }),
      );
      document.dispatchEvent(
        new window.MouseEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 110,
        }),
      );
      document.dispatchEvent(
        new window.MouseEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 110,
        }),
      );

      expect(getVisibleLabels()).toEqual(['sage seed', 'mint seed', 'nettle seed']);
      expect(summary.querySelector('.workshop-page__task.is-reordering')).toBeNull();

      const mintRow = list.querySelector('.workshop-page__task');
      mintRow.dispatchEvent(
        new window.KeyboardEvent('keydown', {
          bubbles: true,
          key: 'ArrowDown',
        }),
      );

      expect(getVisibleLabels()).toEqual(['sage seed', 'nettle seed', 'mint seed']);
    } finally {
      pagesFacade?.unmount();
      stage.remove();
      window.HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });

  it('keeps Workshop task drag above rows and commits fast downward drops', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const baseTask = snapshot.tasks.level.tasks[0];
    snapshot.tasks.level.totalTasks = 4;
    snapshot.tasks.level.tasks = [
      baseTask,
      {
        ...baseTask,
        taskId: 'level1-mint-seeds',
        itemKey: 'mintSeed',
        itemLabel: 'mint seed',
        requiredQuantity: 5,
        remainingQuantity: 5,
      },
      {
        ...baseTask,
        taskId: 'level1-nettle-seeds',
        itemKey: 'nettleSeed',
        itemLabel: 'nettle seed',
        requiredQuantity: 8,
        remainingQuantity: 8,
      },
      {
        ...baseTask,
        taskId: 'level1-lavender-seeds',
        itemKey: 'lavenderSeed',
        itemLabel: 'lavender seed',
        requiredQuantity: 9,
        remainingQuantity: 9,
      },
    ];

    const originalGetBoundingClientRect = window.HTMLElement.prototype.getBoundingClientRect;
    const makeRect = (top) => ({
      x: 0,
      y: top,
      top,
      left: 0,
      right: 240,
      bottom: top + 22,
      width: 240,
      height: 22,
      toJSON: () => ({}),
    });

    window.HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if (this.classList?.contains('workshop-page__task')) {
        if (this.parentElement?.classList?.contains('workshop-page__tasks-summary')) {
          return makeRect(60);
        }

        if (this.parentElement?.classList?.contains('workshop-page__task-list')) {
          const rows = [
            ...this.parentElement.querySelectorAll(':scope > .workshop-page__task'),
          ];
          return makeRect(90 + rows.indexOf(this) * 30);
        }
      }

      return makeRect(0);
    };
    document.body.append(stage);
    let pagesFacade = null;

    try {
      pagesFacade = new PagesFacade({
        gameplayFacade,
        playerFacade: createPlayerFacadeFake(),
      });

      pagesFacade.mount(stage);
      stage
        .querySelector('.workshop-page__tasks-toggle')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      const summary = stage.querySelector('.workshop-page__tasks-summary');
      const list = stage.querySelector('.workshop-page__task-list');
      const getVisibleLabels = () => [
        summary.querySelector('.workshop-page__task-label')?.textContent,
        ...[...list.querySelectorAll('.workshop-page__task-label')].map(
          (label) => label.textContent,
        ),
      ];
      const mintRow = list.querySelector('.workshop-page__task');

      expect(getVisibleLabels()).toEqual([
        'sage seed',
        'mint seed',
        'nettle seed',
        'lavender seed',
      ]);

      mintRow.dispatchEvent(
        new window.MouseEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 100,
        }),
      );
      document.dispatchEvent(
        new window.MouseEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 170,
        }),
      );

      const draggedRow = list.querySelector('.workshop-page__task.is-drag-lifted');
      const movedRows = [...list.querySelectorAll('.workshop-page__task.is-reordering')].map(
        (row) => row.querySelector('.workshop-page__task-label')?.textContent,
      );

      expect(draggedRow?.querySelector('.workshop-page__task-label')?.textContent).toBe(
        'mint seed',
      );
      expect(draggedRow?.style.zIndex).toBe('98');
      expect(draggedRow?.style.transition).toBe('none');
      expect(movedRows).toEqual(['nettle seed', 'lavender seed']);
      expect(stage.querySelector('.workshop-page__task-drag-placeholder')).toBeNull();

      document.dispatchEvent(
        new window.MouseEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 170,
        }),
      );

      expect(getVisibleLabels()).toEqual([
        'sage seed',
        'nettle seed',
        'lavender seed',
        'mint seed',
      ]);
      expect(stage.querySelector('.workshop-page__task.is-drag-lifted')).toBeNull();
      const droppedMintRow = [...list.querySelectorAll('.workshop-page__task')].find(
        (row) => row.querySelector('.workshop-page__task-label')?.textContent === 'mint seed',
      );
      expect(droppedMintRow?.classList.contains('is-reordering')).toBe(true);
      expect(droppedMintRow?.style.transition).toContain('transform 225ms');
    } finally {
      pagesFacade?.unmount();
      stage.remove();
      window.HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });

  it('keeps completed Workshop tasks fixed below active drag sorting', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const baseTask = snapshot.tasks.level.tasks[0];
    const createTask = ({ taskId, itemLabel, completed = false }) => ({
      ...baseTask,
      taskId,
      itemLabel,
      progressQuantity: completed ? baseTask.requiredQuantity : 0,
      remainingQuantity: completed ? 0 : baseTask.requiredQuantity,
      progress: completed ? 1 : 0,
      maxed: completed,
      completed,
      canFill: false,
      canComplete: false,
    });

    snapshot.tasks.level.completedTasks = 1;
    snapshot.tasks.level.totalTasks = 3;
    snapshot.tasks.level.tasks = [
      createTask({ taskId: 'level1-sage-seeds', itemLabel: 'sage seed' }),
      createTask({ taskId: 'level1-mint-seeds', itemLabel: 'mint seed' }),
      createTask({
        taskId: 'level1-lavender-seeds',
        itemLabel: 'lavender seed',
        completed: true,
      }),
    ];

    const originalGetBoundingClientRect = window.HTMLElement.prototype.getBoundingClientRect;
    const makeRect = (top) => ({
      x: 0,
      y: top,
      top,
      left: 0,
      right: 240,
      bottom: top + 22,
      width: 240,
      height: 22,
      toJSON: () => ({}),
    });

    window.HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if (this.classList?.contains('workshop-page__task')) {
        if (this.parentElement?.classList?.contains('workshop-page__tasks-summary')) {
          return makeRect(60);
        }

        if (this.parentElement?.classList?.contains('workshop-page__task-list')) {
          const rows = [
            ...this.parentElement.querySelectorAll(':scope > .workshop-page__task'),
          ];
          return makeRect(90 + rows.indexOf(this) * 30);
        }
      }

      return makeRect(0);
    };
    document.body.append(stage);
    let pagesFacade = null;

    try {
      pagesFacade = new PagesFacade({
        gameplayFacade,
        playerFacade: createPlayerFacadeFake(),
      });

      pagesFacade.mount(stage);
      stage
        .querySelector('.workshop-page__tasks-toggle')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      const summary = stage.querySelector('.workshop-page__tasks-summary');
      const list = stage.querySelector('.workshop-page__task-list');
      const getVisibleLabels = () => [
        summary.querySelector('.workshop-page__task-label')?.textContent,
        ...[...list.querySelectorAll('.workshop-page__task-label')].map(
          (label) => label.textContent,
        ),
      ];
      const getTaskRow = (itemLabel) =>
        [...stage.querySelectorAll('.workshop-page__task')].find(
          (row) => row.querySelector('.workshop-page__task-label')?.textContent === itemLabel,
        );
      const lavenderRow = getTaskRow('lavender seed');

      expect(getVisibleLabels()).toEqual(['sage seed', 'mint seed', 'lavender seed']);
      expect(lavenderRow?.classList.contains('is-draggable')).toBe(false);
      expect(lavenderRow?.tabIndex).toBe(-1);

      lavenderRow.dispatchEvent(
        new window.MouseEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 130,
        }),
      );
      document.dispatchEvent(
        new window.MouseEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 40,
        }),
      );
      lavenderRow.dispatchEvent(
        new window.KeyboardEvent('keydown', {
          bubbles: true,
          key: 'ArrowUp',
        }),
      );

      expect(stage.querySelector('.workshop-page__task.is-drag-lifted')).toBeNull();
      expect(getVisibleLabels()).toEqual(['sage seed', 'mint seed', 'lavender seed']);

      const sageRow = getTaskRow('sage seed');
      sageRow.dispatchEvent(
        new window.MouseEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 70,
        }),
      );
      document.dispatchEvent(
        new window.MouseEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 220,
        }),
      );

      expect(lavenderRow.classList.contains('is-reordering')).toBe(false);

      document.dispatchEvent(
        new window.MouseEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 220,
        }),
      );

      expect(getVisibleLabels()).toEqual(['mint seed', 'sage seed', 'lavender seed']);
    } finally {
      pagesFacade?.unmount();
      stage.remove();
      window.HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });

  it('moves Workshop task rows shortly before the dragged row center crosses another row center', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const baseTask = snapshot.tasks.level.tasks[0];
    snapshot.tasks.level.totalTasks = 3;
    snapshot.tasks.level.tasks = [
      baseTask,
      {
        ...baseTask,
        taskId: 'level1-mint-seeds',
        itemKey: 'mintSeed',
        itemLabel: 'mint seed',
        requiredQuantity: 5,
        remainingQuantity: 5,
      },
      {
        ...baseTask,
        taskId: 'level1-nettle-seeds',
        itemKey: 'nettleSeed',
        itemLabel: 'nettle seed',
        requiredQuantity: 8,
        remainingQuantity: 8,
      },
    ];

    const originalGetBoundingClientRect = window.HTMLElement.prototype.getBoundingClientRect;
    const makeRect = (top) => ({
      x: 0,
      y: top,
      top,
      left: 0,
      right: 240,
      bottom: top + 22,
      width: 240,
      height: 22,
      toJSON: () => ({}),
    });

    window.HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if (this.classList?.contains('workshop-page__task')) {
        if (this.parentElement?.classList?.contains('workshop-page__tasks-summary')) {
          return makeRect(60);
        }

        if (this.parentElement?.classList?.contains('workshop-page__task-list')) {
          const rows = [
            ...this.parentElement.querySelectorAll(':scope > .workshop-page__task'),
          ];
          return makeRect(90 + rows.indexOf(this) * 30);
        }
      }

      return makeRect(0);
    };
    document.body.append(stage);
    let pagesFacade = null;

    try {
      pagesFacade = new PagesFacade({
        gameplayFacade,
        playerFacade: createPlayerFacadeFake(),
      });

      pagesFacade.mount(stage);
      stage
        .querySelector('.workshop-page__tasks-toggle')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      const summary = stage.querySelector('.workshop-page__tasks-summary');
      const list = stage.querySelector('.workshop-page__task-list');
      const getVisibleLabels = () => [
        summary.querySelector('.workshop-page__task-label')?.textContent,
        ...[...list.querySelectorAll('.workshop-page__task-label')].map(
          (label) => label.textContent,
        ),
      ];
      const mintRow = list.querySelector('.workshop-page__task');

      expect(getVisibleLabels()).toEqual(['sage seed', 'mint seed', 'nettle seed']);

      mintRow.dispatchEvent(
        new window.MouseEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 111,
        }),
      );

      expect(summary.querySelector('.workshop-page__task-drag-placeholder')).toBeNull();
      expect(list.querySelector('.workshop-page__task-drag-placeholder')).toBeNull();

      document.dispatchEvent(
        new window.MouseEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 86,
        }),
      );

      expect(summary.querySelector('.workshop-page__task-drag-placeholder')).toBeNull();
      expect(summary.querySelector('.workshop-page__task.is-reordering')).toBeNull();

      document.dispatchEvent(
        new window.MouseEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 85,
        }),
      );

      expect(summary.querySelector('.workshop-page__task-drag-placeholder')).toBeNull();
      expect(
        summary.querySelector('.workshop-page__task.is-reordering .workshop-page__task-label')
          ?.textContent,
      ).toBe('sage seed');

      document.dispatchEvent(
        new window.MouseEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 85,
        }),
      );

      expect(getVisibleLabels()).toEqual(['mint seed', 'sage seed', 'nettle seed']);
    } finally {
      pagesFacade?.unmount();
      stage.remove();
      window.HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });

  it('keeps Workshop task row nodes stable when completed tasks move down', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const baseTask = snapshot.tasks.level.tasks[0];
    const createTask = ({ taskId, itemLabel, completed = false }) => ({
      ...baseTask,
      taskId,
      itemLabel,
      progressQuantity: completed ? baseTask.requiredQuantity : 0,
      remainingQuantity: completed ? 0 : baseTask.requiredQuantity,
      progress: completed ? 1 : 0,
      maxed: completed,
      completed,
      canFill: false,
      canComplete: false,
    });

    snapshot.tasks.level.completedTasks = 1;
    snapshot.tasks.level.totalTasks = 4;
    snapshot.tasks.level.tasks = [
      createTask({ taskId: 'level1-sage-seeds', itemLabel: 'sage seed' }),
      createTask({ taskId: 'level1-mint-seeds', itemLabel: 'mint seed' }),
      createTask({ taskId: 'level1-nettle-seeds', itemLabel: 'nettle seed' }),
      createTask({
        taskId: 'level1-lavender-seeds',
        itemLabel: 'lavender seed',
        completed: true,
      }),
    ];

    const originalGetBoundingClientRect = window.HTMLElement.prototype.getBoundingClientRect;
    const makeRect = (top) => ({
      x: 0,
      y: top,
      top,
      left: 0,
      right: 240,
      bottom: top + 22,
      width: 240,
      height: 22,
      toJSON: () => ({}),
    });

    window.HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if (this.classList?.contains('workshop-page__task')) {
        if (this.parentElement?.classList?.contains('workshop-page__task-list')) {
          const rows = [
            ...this.parentElement.querySelectorAll(':scope > .workshop-page__task'),
          ];
          return makeRect(100 + rows.indexOf(this) * 28);
        }

        if (this.parentElement?.classList?.contains('workshop-page__tasks-summary')) {
          return makeRect(60);
        }
      }

      return makeRect(0);
    };
    document.body.append(stage);
    let pagesFacade = null;

    try {
      pagesFacade = new PagesFacade({
        gameplayFacade,
        playerFacade: createPlayerFacadeFake(),
      });

      pagesFacade.mount(stage);
      pagesFacade.currentPageManager.currentPage.taskManager.setExpanded(true);

      const list = stage.querySelector('.workshop-page__task-list');
      const getLabels = () =>
        [...list.querySelectorAll('.workshop-page__task-label')].map((label) => label.textContent);

      expect(getLabels()).toEqual(['mint seed', 'nettle seed', 'lavender seed']);
      expect(list.querySelector('.is-first-completed .workshop-page__task-label')?.textContent).toBe(
        'lavender seed',
      );
      const mintRow = list.querySelector('.workshop-page__task');

      snapshot.tasks.level.completedTasks = 2;
      snapshot.tasks.level.tasks = snapshot.tasks.level.tasks.map((task) =>
        task.taskId === 'level1-mint-seeds'
          ? {
              ...task,
              progressQuantity: task.requiredQuantity,
              remainingQuantity: 0,
              progress: 1,
              maxed: true,
              completed: true,
            }
          : task,
      );
      gameplayFacade.publishSnapshot();

      const rowsAfter = [...list.querySelectorAll('.workshop-page__task')];
      expect(getLabels()).toEqual(['nettle seed', 'mint seed', 'lavender seed']);
      expect(rowsAfter[1]).toBe(mintRow);
      expect(mintRow.classList.contains('is-completed')).toBe(true);
      expect(mintRow.classList.contains('is-first-completed')).toBe(true);
      expect(mintRow.classList.contains('is-reordering')).toBe(true);
      expect(mintRow.style.transition).toContain('transform 225ms');
    } finally {
      pagesFacade?.unmount();
      stage.remove();
      window.HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });

  it('shows Workshop level completion without expand when there is one task', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    snapshot.coin.current = 10;
    snapshot.tasks.level.completedTasks = 1;
    snapshot.tasks.level.totalTasks = 1;
    snapshot.tasks.level.completion = {
      level: 1,
      costCoin: 10,
      allTasksCompleted: true,
      atMaxLevel: false,
      completedAllLevels: false,
      canComplete: true,
    };
    snapshot.tasks.level.tasks = snapshot.tasks.level.tasks.map((task) => ({
      ...task,
      progressQuantity: task.requiredQuantity,
      remainingQuantity: 0,
      progress: 1,
      maxed: true,
      completed: true,
      canFill: false,
      canComplete: false,
    }));
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    const toggle = stage.querySelector('.workshop-page__tasks-toggle');
    expect(toggle?.hidden).toBe(true);
    expect(toggle?.dataset.notification).toBeUndefined();

    const completion = stage.querySelector('.workshop-page__level-complete');
    const button = stage.querySelector('.workshop-page__level-complete-button');
    const rewards = stage.querySelector('.workshop-page__level-rewards');
    const payoffTitle = rewards?.querySelector('.workshop-page__level-payoff-title');
    const payoffRows = [
      ...rewards.querySelectorAll('.workshop-page__level-payoff-row'),
    ].map((row) => [
      row.querySelector('.workshop-page__level-payoff-label')?.textContent,
      row.querySelector('.workshop-page__level-payoff-value')?.textContent,
    ]);

    expect(completion?.hidden).toBe(false);
    expect(rewards?.hidden).toBe(false);
    expect(payoffTitle?.textContent).toBe('level 2 rewards');
    expect(payoffRows).toEqual([
      ['unlocks', 'garden'],
      ['garden plots', '+1'],
      ['mana cap', '+50'],
      ['mana regen', '+1/sec'],
      ['crystal', '+1'],
    ]);
    expect(completion?.dataset.tutorialId).toBe('workshop:levelUp');
    expect(button?.textContent).toBe('level up10 coin');
    expect(button?.disabled).toBe(false);

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(2);
    expect(gameplayFacade.getSnapshot().coin.current).toBe(0);
    expect(stage.querySelector('.workshop-page__flyout')?.textContent).toBe(
      'level 2 reached: garden unlocked, +1 garden plot, +50 mana cap, +1/sec mana regen, +1 crystal',
    );
  });

  it('shows seed summon feedback as a flyout', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    gameplayFacade.getSnapshot().seedSummoning.canSummon = true;
    gameplayFacade.summonSeed = () => ({
      ok: true,
      seed: {
        label: 'sage seed',
      },
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__summon-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(
      [...stage.querySelectorAll('.workshop-page__flyout')].map(
        (flyout) => flyout.textContent,
      ),
    ).toEqual(['sage seed found', '-10 mana']);
    expect(stage.querySelector('.workshop-page__action-bar')?.textContent).not.toContain('found');
  });

  it('shows and hides a short mana warning when seed summon is pressed too early', () => {
    vi.useFakeTimers();
    try {
      const stage = document.createElement('section');
      const gameplayFacade = createGameplayFacadeFake();
      const pagesFacade = new PagesFacade({
        gameplayFacade,
        playerFacade: createPlayerFacadeFake(),
      });

      pagesFacade.mount(stage);

      const button = stage.querySelector('.workshop-page__summon-button');
      expect(button?.disabled).toBe(false);
      expect(button?.getAttribute('aria-disabled')).toBe('true');

      button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(stage.querySelector('.workshop-page__flyout')?.textContent).toBe(
        'not enough mana',
      );

      vi.advanceTimersByTime(1200);

      expect(stage.querySelector('.workshop-page__flyout')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows active seed summon multiplier in the Workshop action bar', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    gameplayFacade.getSnapshot().seedSummoning = {
      cost: 20,
      quantity: 2,
      canSummon: true,
    };
    gameplayFacade.summonSeed = () => ({
      ok: true,
      seed: {
        label: 'sage seed',
      },
      seedCounts: [
        {
          seed: {
            label: 'sage seed',
          },
          quantity: 2,
        },
      ],
      quantity: 2,
      cost: 20,
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    const button = stage.querySelector('.workshop-page__summon-button');
    expect(stage.querySelector('.workshop-page__summon-button-label')?.textContent).toBe(
      'summon x2',
    );
    expect(stage.querySelector('.workshop-page__summon-button-cost')?.textContent).toBe(
      '20 mana',
    );
    expect(button?.getAttribute('aria-label')).toBe('summon x2, costs 20 mana');

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(
      [...stage.querySelectorAll('.workshop-page__flyout')].map(
        (flyout) => flyout.textContent,
      ),
    ).toEqual(['sage seed x2 found', '-20 mana']);
  });

  it('shows settings from the username and changes username there', () => {
    const stage = document.createElement('section');
    const playerFacade = createPlayerFacadeFake('Merlin');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade,
    });

    pagesFacade.mount(stage);

    const usernameButton = stage.querySelector('.room-top-panel__username');
    const settings = stage.querySelector('.room-top-panel__settings');
    const input = stage.querySelector('.room-top-panel__username-input');
    const form = stage.querySelector('.room-top-panel__username-form');
    const dialog = stage.querySelector('.room-top-panel__settings-panel');
    const focusOptions = [];
    const focus = dialog.focus.bind(dialog);
    dialog.focus = (options) => {
      focusOptions.push(options);
      focus();
    };

    expect(usernameButton.textContent).toBe('Merlin');
    expect(settings.hidden).toBe(true);

    usernameButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(settings.hidden).toBe(false);
    expect(settings.querySelector('.style-box__title')?.textContent).toBe('settings');
    expect(input.value).toBe('Merlin');
    expect(input.getAttribute('enterkeyhint')).toBe('done');
    expect(
      [...settings.querySelectorAll('.room-top-panel__settings-tab-button')].map(
        (button) => [button.textContent, button.getAttribute('aria-selected')],
      ),
    ).toEqual([
      ['account', 'true'],
      ['report', 'false'],
      ['configurations', 'false'],
    ]);
    expect(stage.querySelector('.room-top-panel__auth-section')?.hidden).toBe(false);
    expect(stage.querySelector('.room-top-panel__auth-status')?.textContent).toBe(
      'login unavailable',
    );
    expect(stage.querySelector('.room-top-panel__auth-button')?.textContent).toBe(
      'connect account',
    );
    expect(stage.querySelector('.room-top-panel__auth-button')?.disabled).toBe(true);
    expect(stage.querySelector('.room-top-panel__version-value')?.textContent).toBe(
      packageJson.version,
    );
    expect(
      [...settings.querySelectorAll('.room-top-panel__theme-button')].map(
        (button) => button.textContent,
      ),
    ).toEqual(['white', 'black', 'midnight', 'witchcraft']);
    expect(
      [...settings.querySelectorAll('.room-top-panel__font-button')].map(
        (button) => button.textContent,
      ),
    ).toEqual(['lexend', 'comic sans mono']);
    expect(
      [...settings.querySelectorAll('.room-top-panel__color-button')].map(
        (button) => button.textContent,
      ),
    ).toEqual([]);
    expect(
      [
        ...settings.querySelectorAll(
          '#room-top-panel-settings-avatar .room-top-panel__character-button',
        ),
      ].map((button) => button.dataset.character),
    ).toContain('mira');
    expect(
      settings.querySelector(
        '#room-top-panel-settings-avatar .room-top-panel__character-section.style-box',
      ),
    ).toBeNull();
    expect(
      settings.querySelector(
        '#room-top-panel-settings-avatar .room-top-panel__character-button[data-character="mira"]',
      ).disabled,
    ).toBe(false);
    const lockedAvatarButton = settings.querySelector(
      '#room-top-panel-settings-avatar .room-top-panel__character-button[data-character="adventurer_cleric"]',
    );
    expect(lockedAvatarButton.disabled).toBe(true);
    expect(lockedAvatarButton.classList.contains('is-unresearched')).toBe(true);
    expect(
      lockedAvatarButton.querySelector('.room-top-panel__character-lock'),
    ).not.toBeNull();
    expect(
      lockedAvatarButton.querySelector('.room-top-panel__character-lock svg')?.dataset
        .assetAtlasFrame,
    ).toBe('status:lockDefault');
    expect(
      lockedAvatarButton.querySelector('.room-top-panel__character-option-silhouette'),
    ).not.toBeNull();
    expect(
      settings.querySelector(
        '#room-top-panel-settings-theme .room-top-panel__character-section',
      ),
    ).toBeNull();
    expect(
      settings.querySelectorAll(
        '#room-top-panel-settings-avatar .room-top-panel__character-section .room-top-panel__visual-option-price',
      ),
    ).toHaveLength(0);
    stage
      .querySelector('.room-top-panel__avatar-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(settings.querySelector('.style-box__title')?.textContent).toBe('avatar');
    expect(settings.querySelector('.room-top-panel__settings-tabs')?.hidden).toBe(true);
    const rowanButton = settings.querySelector(
      '#room-top-panel-settings-avatar .room-top-panel__character-button[data-character="rowan"]',
    );
    rowanButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(playerFacade.getSnapshot().character).toBe('rowan');
    expect(rowanButton.getAttribute('aria-checked')).toBe('true');
    expect(
      rowanButton.querySelector('.room-top-panel__character-check svg')?.dataset
        .assetAtlasFrame,
    ).toBe('status:checkDefault');
    expect(
      stage
        .querySelector('.room-top-panel__avatar-button')
        .querySelector('.room-top-panel__username-avatar')
        ?.getAttribute('src'),
    ).toContain('/assets/characters/rowan.png');
    expect(
      [...settings.querySelectorAll('.room-top-panel__progress-bar-button')].map(
        (button) => button.textContent,
      ),
    ).toEqual(['regular', 'gradient']);
    expect(
      [...settings.querySelectorAll('.room-top-panel__icon-button')].map(
        (button) => button.textContent,
      ),
    ).toEqual([]);
    expect(
      [
        ...settings.querySelectorAll(
          '#room-top-panel-settings-theme .room-top-panel__visual-option-price',
        ),
      ].map(
        (price) => price.textContent,
      ),
    ).toEqual([
      'researched',
      'free',
      'free',
      'free',
      'researched',
      'free',
      'researched',
      'free',
    ]);
    expect(
      [...settings.querySelectorAll('.room-top-panel__settings-tab-button')].map(
        (button) => button.dataset.settingsTab,
      ),
    ).toContain('report');
    expect(focusOptions).toEqual([{ preventScroll: true }, { preventScroll: true }]);

    input.value = 'Mira';
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

    expect(playerFacade.getSnapshot().username).toBe('Mira');
    expect(usernameButton.textContent).toBe('Mira');
    expect(settings.hidden).toBe(true);
  });

  it('selects the whole username on the first edit click', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake('Merlin'),
    });

    pagesFacade.mount(stage);

    const usernameButton = stage.querySelector('.room-top-panel__username');
    const input = stage.querySelector('.room-top-panel__username-input');

    usernameButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    input.dispatchEvent(new window.Event('focus'));
    input.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('Merlin'.length);

    input.value = 'Merlina';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    input.setSelectionRange(3, 3);
    input.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(input.selectionStart).toBe(3);
    expect(input.selectionEnd).toBe(3);
  });

  it('closes settings from the popup close button', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake('Merlin'),
    });

    pagesFacade.mount(stage);

    const usernameButton = stage.querySelector('.room-top-panel__username');
    const settings = stage.querySelector('.room-top-panel__settings');
    const closeButton = stage.querySelector('.room-top-panel__settings-close');

    usernameButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(settings.hidden).toBe(false);
    expect(closeButton?.textContent).toBe('close');
    expect(closeButton?.closest('.room-top-panel__settings-dialog')).not.toBeNull();

    closeButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(settings.hidden).toBe(true);
  });

  it('opens feedback from the dev dialog path and sends player feedback', async () => {
    const stage = document.createElement('section');
    const feedbackFacade = createFeedbackFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake('Merlin'),
      feedbackFacade,
    });

    pagesFacade.mount(stage);

    expect(pagesFacade.openDialog('feedback')).toEqual({ ok: true, dialogId: 'feedback' });

    const settings = stage.querySelector('.room-top-panel__settings');
    const input = stage.querySelector('.room-top-panel__feedback-input');
    const form = stage.querySelector('.room-top-panel__feedback-form');

    expect(settings.querySelector('.style-box__title')?.textContent).toBe('settings');
    expect(settings.classList.contains('is-feedback')).toBe(false);
    expect(
      settings.querySelector('[data-settings-tab="report"]')?.getAttribute('aria-selected'),
    ).toBe('true');
    expect(stage.querySelector('.room-top-panel__feedback-close')).toBeNull();
    expect(input.placeholder).toBe('write feedback');

    input.value = ' needs more quiet space ';
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(feedbackFacade.getMessages()).toEqual([' needs more quiet space ']);
    expect(stage.querySelector('.room-top-panel__feedback-status')?.textContent).toBe(
      'sent',
    );
    expect(input.value).toBe('');
  });

  it('opens bug and feature feedback through the dev dialog path with typed submit prefixes', async () => {
    const stage = document.createElement('section');
    const feedbackFacade = createFeedbackFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake('Merlin'),
      feedbackFacade,
    });

    pagesFacade.mount(stage);

    const settings = stage.querySelector('.room-top-panel__settings');
    const input = stage.querySelector('.room-top-panel__feedback-input');
    const form = stage.querySelector('.room-top-panel__feedback-form');
    const closeButton = stage.querySelector('.room-top-panel__settings-close');
    const cases = [
      {
        kind: 'bug',
        placeholder: 'describe the bug',
        body: 'button disappears',
        expected: 'bug report:\nbutton disappears',
      },
      {
        kind: 'feature',
        placeholder: 'describe the feature',
        body: 'add quieter controls',
        expected: 'feature request:\nadd quieter controls',
      },
    ];

    for (const item of cases) {
      expect(pagesFacade.openDialog(item.kind)).toEqual({ ok: true, dialogId: item.kind });

      expect(settings.querySelector('.style-box__title')?.textContent).toBe('settings');
      expect(
        settings.querySelector('[data-settings-tab="report"]')?.getAttribute('aria-selected'),
      ).toBe('true');
      expect(
        settings
          .querySelector(`[data-feedback-kind="${item.kind}"]`)
          ?.getAttribute('aria-pressed'),
      ).toBe('true');
      expect(input.placeholder).toBe(item.placeholder);

      input.value = item.body;
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();

      const messages = feedbackFacade.getMessages();
      expect(messages[messages.length - 1]).toBe(item.expected);

      closeButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    }

    expect(feedbackFacade.getMessages()).toEqual(cases.map((item) => item.expected));
  });

  it('marks first landed players prompted without opening the username dialog', () => {
    const stage = document.createElement('section');
    const playerFacade = createPlayerFacadeFake('wizard', 'white', {
      shouldPromptForUsername: true,
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade,
    });

    pagesFacade.mount(stage);

    const settings = stage.querySelector('.room-top-panel__settings');
    const usernameButton = stage.querySelector('.room-top-panel__username');

    expect(settings.hidden).toBe(true);
    expect(settings.classList.contains('is-username-prompt')).toBe(false);
    expect(usernameButton?.dataset.tutorialId).toBe('top:username');
    expect(stage.querySelector('.room-top-panel__theme-section')).not.toBeNull();
    expect(playerFacade.getPromptSeenCount()).toBe(1);
  });

  it('keeps the first username prompt closed after a stale unseen profile arrives', () => {
    const stage = document.createElement('section');
    const playerFacade = new PlayerFacade();
    playerFacade.applyServerProfile({
      username: 'wizard',
      usernamePromptSeen: false,
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade,
    });

    pagesFacade.mount(stage);

    const settings = stage.querySelector('.room-top-panel__settings');

    expect(settings.hidden).toBe(true);
    expect(settings.classList.contains('is-username-prompt')).toBe(false);
    expect(playerFacade.getSnapshot().shouldPromptForUsername).toBe(false);

    playerFacade.applyServerProfile({
      username: 'wizard',
      usernamePromptSeen: false,
    });

    expect(settings.hidden).toBe(true);
  });

  it('changes the theme from settings', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const playerFacade = createPlayerFacadeFake('Merlin');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.room-top-panel__username')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const whiteButton = stage.querySelector('.room-top-panel__theme-button[data-theme="white"]');
    const mildWhiteButton = stage.querySelector(
      '.room-top-panel__theme-button[data-theme="mild-white"]',
    );
    const mildBlackButton = stage.querySelector(
      '.room-top-panel__theme-button[data-theme="mild-black"]',
    );
    const darkGrayButton = stage.querySelector(
      '.room-top-panel__theme-button[data-theme="dark-gray"]',
    );
    const blackButton = stage.querySelector('.room-top-panel__theme-button[data-theme="black"]');
    const midnightButton = stage.querySelector(
      '.room-top-panel__theme-button[data-theme="midnight"]',
    );
    const witchcraftButton = stage.querySelector(
      '.room-top-panel__theme-button[data-theme="witchcraft"]',
    );
    const blackResearchButton = blackButton
      ?.closest('.room-top-panel__visual-option')
      ?.querySelector('.room-top-panel__visual-option-price');
    const midnightResearchButton = midnightButton
      ?.closest('.room-top-panel__visual-option')
      ?.querySelector('.room-top-panel__visual-option-price');
    const witchcraftResearchButton = witchcraftButton
      ?.closest('.room-top-panel__visual-option')
      ?.querySelector('.room-top-panel__visual-option-price');

    expect(whiteButton.getAttribute('aria-checked')).toBe('true');
    expect(mildWhiteButton).toBeNull();
    expect(mildBlackButton).toBeNull();
    expect(darkGrayButton).toBeNull();
    expect(blackButton.disabled).toBe(false);
    expect(midnightButton.disabled).toBe(false);
    expect(witchcraftButton.disabled).toBe(false);
    expect(blackResearchButton?.textContent).toBe('free');
    expect(midnightResearchButton?.textContent).toBe('free');
    expect(witchcraftResearchButton?.textContent).toBe('free');

    blackButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerFacade.getSnapshot().theme).toBe('white');
    expect(gameplayFacade.getSnapshot().visualSettings.researched.theme.black).toBe(false);
    expect(stage.querySelector('.room-top-panel__visual-status')?.textContent).toBe(
      'research first',
    );

    blackResearchButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerFacade.getSnapshot().theme).toBe('white');
    expect(gameplayFacade.getSnapshot().visualSettings.researched.theme.black).toBe(true);
    expect(blackResearchButton?.textContent).toBe('researched');
    expect(blackButton.getAttribute('aria-checked')).toBe('false');

    blackButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerFacade.getSnapshot().theme).toBe('black');
    expect(blackButton.getAttribute('aria-checked')).toBe('true');
    expect(whiteButton.getAttribute('aria-checked')).toBe('false');

    const midnightPointerDown = new window.Event('pointerdown', {
      bubbles: true,
      cancelable: true,
    });

    midnightButton.dispatchEvent(midnightPointerDown);

    expect(playerFacade.getSnapshot().theme).toBe('black');
    expect(gameplayFacade.getSnapshot().visualSettings.researched.theme.midnight).toBe(false);
    expect(midnightPointerDown.defaultPrevented).toBe(false);
    expect(midnightButton.getAttribute('aria-checked')).toBe('false');

    midnightResearchButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerFacade.getSnapshot().theme).toBe('black');
    expect(gameplayFacade.getSnapshot().visualSettings.researched.theme.midnight).toBe(true);
    expect(midnightResearchButton?.textContent).toBe('researched');

    const midnightSelectPointerDown = new window.Event('pointerdown', {
      bubbles: true,
      cancelable: true,
    });

    midnightButton.dispatchEvent(midnightSelectPointerDown);

    expect(playerFacade.getSnapshot().theme).toBe('black');
    expect(midnightSelectPointerDown.defaultPrevented).toBe(false);
    expect(midnightButton.getAttribute('aria-checked')).toBe('false');

    midnightButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerFacade.getSnapshot().theme).toBe('midnight');
    expect(midnightButton.getAttribute('aria-checked')).toBe('true');
    expect(blackButton.getAttribute('aria-checked')).toBe('false');

    witchcraftResearchButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    witchcraftButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerFacade.getSnapshot().theme).toBe('witchcraft');
    expect(witchcraftButton.getAttribute('aria-checked')).toBe('true');
    expect(midnightButton.getAttribute('aria-checked')).toBe('false');
  });

  it('changes progress bar mode from settings', () => {
    const stage = document.createElement('section');
    const playerFacade = createPlayerFacadeFake('Merlin');
    const gameplayFacade = createGameplayFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.room-top-panel__username')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const regularButton = stage.querySelector(
      '.room-top-panel__progress-bar-button[data-progress-bar="regular"]',
    );
    const gradientButton = stage.querySelector(
      '.room-top-panel__progress-bar-button[data-progress-bar="gradient"]',
    );
    const gradientResearchButton = gradientButton
      ?.closest('.room-top-panel__visual-option')
      ?.querySelector('.room-top-panel__visual-option-price');

    expect(regularButton.getAttribute('aria-checked')).toBe('true');
    expect(gradientButton.disabled).toBe(false);

    gradientButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerFacade.getSnapshot().progressBar).toBe('regular');
    expect(gameplayFacade.getSnapshot().visualSettings.researched.progressBar.gradient).toBe(
      false,
    );

    gradientResearchButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerFacade.getSnapshot().progressBar).toBe('regular');
    expect(gameplayFacade.getSnapshot().visualSettings.researched.progressBar.gradient).toBe(
      true,
    );
    expect(gradientResearchButton?.textContent).toBe('researched');

    gradientButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerFacade.getSnapshot().progressBar).toBe('gradient');
    expect(gradientButton.getAttribute('aria-checked')).toBe('true');
    expect(regularButton.getAttribute('aria-checked')).toBe('false');
  });

  it('changes font from settings', () => {
    const stage = document.createElement('section');
    const playerFacade = createPlayerFacadeFake('Merlin');
    const gameplayFacade = createGameplayFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.room-top-panel__username')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const comicButton = stage.querySelector(
      '.room-top-panel__font-button[data-font="comic-sans-mono"]',
    );
    const lexendButton = stage.querySelector('.room-top-panel__font-button[data-font="lexend"]');
    const comicResearchButton = comicButton
      ?.closest('.room-top-panel__visual-option')
      ?.querySelector('.room-top-panel__visual-option-price');

    expect(lexendButton.getAttribute('aria-checked')).toBe('true');
    expect(comicButton.disabled).toBe(false);

    comicButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerFacade.getSnapshot().font).toBe('lexend');
    expect(gameplayFacade.getSnapshot().visualSettings.researched.font['comic-sans-mono']).toBe(
      false,
    );

    comicResearchButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerFacade.getSnapshot().font).toBe('lexend');
    expect(gameplayFacade.getSnapshot().visualSettings.researched.font['comic-sans-mono']).toBe(
      true,
    );
    expect(comicResearchButton?.textContent).toBe('researched');
    expect(comicButton.getAttribute('aria-checked')).toBe('false');

    comicButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerFacade.getSnapshot().font).toBe('comic-sans-mono');
    expect(comicButton.getAttribute('aria-checked')).toBe('true');
    expect(lexendButton.getAttribute('aria-checked')).toBe('false');

    lexendButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerFacade.getSnapshot().font).toBe('lexend');
    expect(lexendButton.getAttribute('aria-checked')).toBe('true');
    expect(comicButton.getAttribute('aria-checked')).toBe('false');
  });

  it('shows optional google account connect in settings when auth is configured', async () => {
    const stage = document.createElement('section');
    const authFacade = createAuthFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake('Merlin'),
      authFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.room-top-panel__username')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const authSection = stage.querySelector('.room-top-panel__auth-section');
    const authButton = stage.querySelector('.room-top-panel__auth-button');

    expect(authSection.hidden).toBe(false);
    expect(stage.querySelector('.room-top-panel__auth-status')?.textContent).toBe(
      'not connected',
    );
    expect(authButton.textContent).toBe('connect account');

    authButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(authFacade.signInCount).toBe(1);
    expect(authFacade.signInPayload).toMatchObject({
      pendingGameplaySave: {
        tasks: { currentLevel: 1 },
        coin: { current: 0 },
        crystal: { current: 0 },
      },
    });
  });

  it('shows google account connect errors in settings', () => {
    const stage = document.createElement('section');
    const authFacade = createAuthFacadeFake({
      error: 'NoCredentialException',
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake('Merlin'),
      authFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.room-top-panel__username')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.room-top-panel__auth-status')?.textContent).toBe(
      'login error: NoCredentialException',
    );
  });

  it('shows google account connect cancellation in settings', () => {
    const stage = document.createElement('section');
    const authFacade = createAuthFacadeFake({
      cancelled: true,
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake('Merlin'),
      authFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.room-top-panel__username')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.room-top-panel__auth-status')?.textContent).toBe(
      'login cancelled',
    );
  });

  it('hides account linking in native settings when OIDC is disabled', () => {
    const stage = document.createElement('section');
    const authFacade = createAuthFacadeFake({
      enabled: false,
      disabledReason: 'native',
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake('Merlin'),
      authFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.room-top-panel__username')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.room-top-panel__auth-section')).toBeNull();
  });

  it('saves username from the mobile keyboard done action', () => {
    const stage = document.createElement('section');
    const playerFacade = createPlayerFacadeFake('Merlin');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade,
    });

    pagesFacade.mount(stage);

    const usernameButton = stage.querySelector('.room-top-panel__username');
    const settings = stage.querySelector('.room-top-panel__settings');
    const input = stage.querySelector('.room-top-panel__username-input');

    usernameButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    input.value = 'Mobile Mage';
    input.dispatchEvent(
      new window.KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(playerFacade.getSnapshot().username).toBe('Mobile Mage');
    expect(usernameButton.textContent).toBe('Mobile Mage');
    expect(settings.hidden).toBe(true);
  });

  it('saves username on touch release, not press start', () => {
    const stage = document.createElement('section');
    const playerFacade = createPlayerFacadeFake('Merlin');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade,
    });

    pagesFacade.mount(stage);

    const usernameButton = stage.querySelector('.room-top-panel__username');
    const settings = stage.querySelector('.room-top-panel__settings');
    const input = stage.querySelector('.room-top-panel__username-input');
    const saveButton = stage.querySelector('.room-top-panel__username-save');

    usernameButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    input.value = 'Tap Mage';
    const pointerDown = new window.Event('pointerdown', {
      bubbles: true,
      cancelable: true,
    });

    saveButton.dispatchEvent(pointerDown);

    expect(playerFacade.getSnapshot().username).toBe('Merlin');
    expect(settings.hidden).toBe(false);
    expect(pointerDown.defaultPrevented).toBe(false);

    saveButton.click();

    expect(playerFacade.getSnapshot().username).toBe('Tap Mage');
    expect(usernameButton.textContent).toBe('Tap Mage');
    expect(settings.hidden).toBe(true);
  });

  it('does not save username on mobile touchstart when pointer events are unavailable', () => {
    const stage = document.createElement('section');
    const playerFacade = createPlayerFacadeFake('Merlin');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade,
    });

    pagesFacade.mount(stage);

    const usernameButton = stage.querySelector('.room-top-panel__username');
    const settings = stage.querySelector('.room-top-panel__settings');
    const input = stage.querySelector('.room-top-panel__username-input');
    const saveButton = stage.querySelector('.room-top-panel__username-save');

    usernameButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    input.value = 'MobileDav';
    saveButton.dispatchEvent(
      createTouchEvent('touchstart', {
        touches: [createTouch(1, 320, 360, saveButton)],
        changedTouches: [createTouch(1, 320, 360, saveButton)],
      }),
    );

    expect(playerFacade.getSnapshot().username).toBe('Merlin');
    expect(settings.hidden).toBe(false);

    saveButton.click();

    expect(playerFacade.getSnapshot().username).toBe('MobileDav');
    expect(usernameButton.textContent).toBe('MobileDav');
    expect(settings.hidden).toBe(true);
  });

  it('treats saving the unchanged default name as completing the tutorial step', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const playerFacade = createPlayerFacadeFake('wizard');
    const tutorialStorage = createMemoryStorage({
      [TUTORIAL_STORAGE_KEY]: JSON.stringify({
        completedStepIds: ['purchase-house', 'intro-welcome'],
      }),
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade,
      tutorialStorage,
    });

    pagesFacade.mount(stage);
    pagesFacade.tutorialFacade.refresh();

    expect(pagesFacade.tutorialFacade.activeStep?.id).toBe('intro-username');

    const usernameButton = stage.querySelector('.room-top-panel__username');
    const saveButton = stage.querySelector('.room-top-panel__username-save');

    usernameButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    saveButton.click();
    pagesFacade.tutorialFacade.refresh();

    expect(playerFacade.getSnapshot().username).toBe('wizard');
    expect(pagesFacade.tutorialFacade.progressManager.hasCompleted('intro-username')).toBe(true);
    expect(pagesFacade.tutorialFacade.activeStep?.id).toBe('intro-mana-sphere');

    pagesFacade.unmount();
  });

  it('selects the default tutorial name so typing can replace it immediately', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const playerFacade = createPlayerFacadeFake('wizard');
    const tutorialStorage = createMemoryStorage({
      [TUTORIAL_STORAGE_KEY]: JSON.stringify({
        completedStepIds: ['purchase-house', 'intro-welcome'],
      }),
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade,
      tutorialStorage,
    });

    pagesFacade.mount(stage);
    pagesFacade.tutorialFacade.refresh();

    expect(pagesFacade.tutorialFacade.activeStep?.id).toBe('intro-username');

    const usernameButton = stage.querySelector('.room-top-panel__username');
    const input = stage.querySelector('.room-top-panel__username-input');
    const saveButton = stage.querySelector('.room-top-panel__username-save');

    usernameButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    input.dispatchEvent(new window.Event('focus'));
    input.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('wizard'.length);

    input.value = 'Mira';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    saveButton.click();
    pagesFacade.tutorialFacade.refresh();

    expect(playerFacade.getSnapshot().username).toBe('Mira');
    expect(pagesFacade.tutorialFacade.progressManager.hasCompleted('intro-username')).toBe(true);
    expect(pagesFacade.tutorialFacade.activeStep?.id).toBe('intro-username-return');

    pagesFacade.unmount();
  });

  it('shows seed inventory in the bag when the seeds tab is selected', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    markSeedResearchComplete(gameplayFacade, 'sageSeed');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    const bag = stage.querySelector('.workshop-page__bag-popup');
    const bagButton = stage.querySelector('.workshop-page__bag-button');
    const seedsTab = [...stage.querySelectorAll('.workshop-page__bag-tab-button')].find(
      (button) => button.textContent === 'seeds',
    );

    expect(bag.hidden).toBe(true);

    bagButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    seedsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(bag.hidden).toBe(false);
    expect(bag.querySelector('[role="dialog"]')).not.toBeNull();
    expect(bag.querySelector('.style-dialog')).not.toBeNull();
    expect(bag.querySelector('.workshop-page__bag-close')?.textContent).toBe('close');
    expect(bag.textContent).toContain('sage seed');
    expect(
      bag
        .querySelector('.workshop-page__bag-item-row--seed .row_val .workshop-page__bag-value-icon')
        ?.classList.contains('style-seed-label'),
    ).toBe(true);
    expect(bag.textContent).toContain('0');
    expect(
      bag.querySelector('.workshop-page__bag-item-row--seed')?.classList.contains('is-empty'),
    ).toBe(true);

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    bagButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(bag.hidden).toBe(false);
  });

  it('shows prestige milestones and confirms lower milestone prestige', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    snapshot.tasks.currentLevel = 40;
    snapshot.playerLevel.currentLevel = 40;
    snapshot.prestige.currentLevel = 40;
    snapshot.prestige.highestAvailableLevel = 40;
    snapshot.prestige.milestones = [10, 20, 30, 40].map((level) => ({
      level,
      rewardRuby: 1,
      completed: false,
      unlocked: true,
      canComplete: true,
      currentLevel: 40,
      lowerThanHighestAvailable: level < 40,
      nextRun: {
        level: getPrestigeResetLevel(level),
        mana: 0,
        coin: 0,
        crystal: 0,
        emerald: snapshot.emerald.current,
        ruby: snapshot.prestige.earnedRuby + 1,
      },
    }));
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.room-bottom-panel__prestige-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(pagesFacade.getCurrentPageId()).toBe('prestige');
    const page = stage.querySelector('.prestige-page');
    expect(page).not.toBeNull();
    expect(page.querySelector('.style-dialog')).toBeNull();
    expect(page.querySelector('.workshop-page__prestige-close')).toBeNull();
    expect(page.querySelector('.prestige-page__content .style-box__title')).toBeNull();
    expect(
      page.querySelector('.prestige-page__body')?.classList.contains('style-page-scroll'),
    ).toBe(true);
    expect(page.querySelector('.prestige-page__description')?.textContent).toContain(
      'prestige resets the current run',
    );
    expect(page.querySelector('.prestige-page__description')?.textContent).toContain(
      'mana, coin, crystal, items, ordinary research, garden, brewing, and tasks reset.',
    );
    expect(page.querySelector('.prestige-page__description')?.textContent).toContain(
      'each completed milestone adds 1 prestige point for capacity rewards.',
    );
    const summary = page.querySelector('.workshop-page__prestige-summary');
    expect(
      summary?.querySelector('.workshop-page__prestige-level-flow')?.textContent,
    ).toBe('level 40 > level 20');
    expect(
      summary?.querySelector('.workshop-page__prestige-receive')?.textContent,
    ).toBe('on prestige: 1 ruby, 0 emerald total');
    expect(summary?.getAttribute('data-resource-color')).toBeNull();
    expect(summary?.querySelector('[data-resource-color="ruby"]')?.textContent).toBe('1 ruby');
    expect(summary?.querySelector('[data-resource-color="emerald"]')?.textContent).toBe(
      '0 emerald',
    );
    expect(
      summary?.querySelector('.style-resource-label--ruby .style-resource-label__icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('resource:ruby');
    expect(page.textContent).toContain('level 10');
    expect(page.textContent).toContain('level 40');
    const milestoneRows = [...page.querySelectorAll('.workshop-page__prestige-row')];
    expect(milestoneRows[0]?.classList.contains('style-box')).toBe(true);
    expect(milestoneRows[0]?.dataset.prestigeState).toBe('ready');
    expect(
      page.querySelector(
        '.workshop-page__prestige-reward .style-resource-label--ruby .style-resource-label__icon',
      )?.dataset.assetAtlasFrame,
    ).toBe('resource:ruby');

    page
      .querySelector('.workshop-page__prestige-action')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(page.querySelector('.workshop-page__prestige-confirm').hidden).toBe(false);
    expect(page.textContent).toContain('higher prestige available: level 40');
    expect(page.textContent).toContain('level 40 > level 5');
    expect(page.textContent).toContain('on prestige: 1 ruby, 0 emerald total');
    expect(page.textContent).toContain('start level5');
    expect(page.textContent).toContain('emerald total0 emerald');
    expect(page.textContent).toContain('ruby total1 ruby');

    page
      .querySelector('.workshop-page__prestige-confirm-proceed')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(pagesFacade.getCurrentPageId()).toBe('workshop');
    expect(stage.querySelector('.prestige-page')).toBeNull();
    expect(snapshot.prestige.completedLevels).toEqual([10]);
    expect(snapshot.ruby.current).toBe(1);
    expect(snapshot.tasks.currentLevel).toBe(getPrestigeResetLevel(10));
  });

  it('labels prestige roadmap milestones by completion state', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    snapshot.tasks.currentLevel = 20;
    snapshot.playerLevel.currentLevel = 20;
    snapshot.prestige.currentLevel = 20;
    snapshot.prestige.highestAvailableLevel = 20;
    snapshot.prestige.milestones = [
      {
        level: 10,
        rewardRuby: 1,
        completed: true,
        unlocked: true,
        canComplete: false,
        currentLevel: 20,
        lowerThanHighestAvailable: false,
        nextRun: { level: 5, ruby: 1 },
      },
      {
        level: 20,
        rewardRuby: 1,
        completed: false,
        unlocked: true,
        canComplete: true,
        currentLevel: 20,
        lowerThanHighestAvailable: false,
        nextRun: { level: 10, ruby: 2 },
      },
      {
        level: 30,
        rewardRuby: 1,
        completed: false,
        unlocked: true,
        canComplete: false,
        currentLevel: 20,
        lowerThanHighestAvailable: false,
        nextRun: { level: 15, ruby: 3 },
      },
      {
        level: 40,
        rewardRuby: 1,
        completed: false,
        unlocked: false,
        canComplete: false,
        currentLevel: 20,
        lowerThanHighestAvailable: false,
        nextRun: { level: 20, ruby: 4 },
      },
    ];
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.room-bottom-panel__prestige-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const milestoneRows = [
      ...stage.querySelectorAll('.workshop-page__prestige-row'),
    ];
    expect(milestoneRows.map((row) => row.dataset.prestigeState)).toEqual([
      'completed',
      'ready',
      'upcoming',
      'locked',
    ]);
    const stateLabels = milestoneRows.map((row) =>
      row.querySelector('.workshop-page__prestige-state-label'),
    );
    const contentBlocks = milestoneRows.map((row) =>
      row.querySelector('.workshop-page__prestige-milestone-content'),
    );
    const headerStateLabels = milestoneRows.map((row) =>
      row.querySelector(
        '.workshop-page__prestige-milestone-header .workshop-page__prestige-state-label',
      ),
    );
    expect(stateLabels.map((label) => label?.parentElement)).toEqual(milestoneRows);
    expect(
      stateLabels.map((label) =>
        label?.nextElementSibling?.classList.contains(
          'workshop-page__prestige-milestone-content',
        ),
      ),
    ).toEqual([true, true, true, true]);
    expect(headerStateLabels).toEqual([null, null, null, null]);
    expect(
      contentBlocks.map((content) =>
        content?.querySelector('.workshop-page__prestige-level')?.textContent,
      ),
    ).toEqual(['level 10', 'level 20', 'level 30', 'level 40']);
    expect(stateLabels.map((label) => label?.textContent)).toEqual([
      '',
      'ready',
      'upcoming',
      '',
    ]);
    expect(stateLabels[0]?.getAttribute('aria-label')).toBe('complete');
    expect(stateLabels[0]?.getAttribute('role')).toBe('img');
    expect(
      stateLabels[0]?.querySelector('.workshop-page__prestige-state-icon')?.dataset
        .assetAtlasFrame,
    ).toBe('status:checkDefault');
    expect(stateLabels[3]?.getAttribute('aria-label')).toBe('locked');
    expect(stateLabels[3]?.getAttribute('role')).toBe('img');
    expect(
      stateLabels[3]?.querySelector('.workshop-page__prestige-state-icon')?.dataset
        .assetAtlasFrame,
    ).toBe('status:lockDefault');
    expect(milestoneRows[1]?.querySelector('.workshop-page__prestige-action')).not.toBeNull();
    expect(
      milestoneRows[2]?.querySelector('.workshop-page__prestige-status'),
    ).toBeNull();
    expect(
      milestoneRows.map((row) =>
        row.style.getPropertyValue('--prestige-roadmap-offset'),
      ),
    ).toEqual(['', '', '', '']);
  });

  it('shows prestige total rewards before confirm', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    snapshot.tasks.currentLevel = 20;
    snapshot.playerLevel.currentLevel = 20;
    snapshot.prestige.currentLevel = 20;
    snapshot.prestige.earnedRuby = 2;
    snapshot.prestige.highestAvailableLevel = 20;
    snapshot.emerald.current = 3;
    snapshot.ruby.current = 1;
    snapshot.prestige.milestones = [
      {
        level: 20,
        rewardRuby: 1,
        completed: false,
        unlocked: true,
        canComplete: true,
        currentLevel: 20,
        lowerThanHighestAvailable: false,
        nextRun: {
          level: 10,
          mana: 0,
          coin: 0,
          crystal: 0,
          emerald: 3,
          ruby: 3,
        },
      },
    ];
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.room-bottom-panel__prestige-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const summary = stage.querySelector('.workshop-page__prestige-summary');
    expect(
      summary?.querySelector('.workshop-page__prestige-level-flow')?.textContent,
    ).toBe('level 20 > level 10');
    expect(
      summary?.querySelector('.workshop-page__prestige-receive')?.textContent,
    ).toBe('on prestige: 3 ruby, 3 emerald total');
    expect(summary?.getAttribute('data-resource-color')).toBeNull();
    expect(summary?.querySelector('[data-resource-color="ruby"]')?.textContent).toBe('3 ruby');
    expect(summary?.querySelector('[data-resource-color="emerald"]')?.textContent).toBe(
      '3 emerald',
    );
    expect(
      summary?.querySelector('.style-resource-label--ruby .style-resource-label__icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('resource:ruby');
    expect(
      summary?.querySelector('.style-resource-label--emerald .style-resource-label__icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('resource:emerald');
  });

  it('shows prestige point rewards on the second prestige tab', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    snapshot.tasks.currentLevel = 20;
    snapshot.playerLevel.currentLevel = 20;
    snapshot.prestige.currentLevel = 20;
    snapshot.prestige.completedLevels = [10];
    snapshot.prestige.earnedRuby = 1;
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.room-bottom-panel__prestige-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const page = stage.querySelector('.prestige-page');
    const tabs = page.querySelector('.workshop-page__prestige-tabs');
    const tabButtons = [...tabs.querySelectorAll('.workshop-page__prestige-tab-button')];
    expect(tabButtons.map((button) => button.textContent)).toEqual(['main', 'points']);
    expect(page.querySelector('.style-dialog')).toBeNull();
    expect(page.querySelector('.prestige-page__body')?.nextElementSibling).toBe(tabs);

    tabButtons
      .find((button) => button.textContent === 'points')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(tabButtons.map((button) => button.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
    ]);
    expect(page.textContent).toContain('1 point earned');
    expect(page.textContent).toContain('plot 11 capacity');
    expect(page.querySelector('.workshop-page__prestige-point-box')).toBeNull();
    expect(page.querySelector('.workshop-page__prestige-point-title')?.textContent).toBe(
      'point rewards',
    );
    const pointRows = [...page.querySelectorAll('.workshop-page__prestige-point-row')];
    expect(pointRows[0]?.classList.contains('style-box')).toBe(true);
    expect(pointRows[0]?.querySelector('.workshop-page__prestige-point-count')?.textContent).toBe(
      '★1 point',
    );
    expect(pointRows[0]?.querySelector('.style-star-level')?.dataset.starTone).toBe(
      'yellow',
    );
    expect(pointRows[0]?.textContent).toContain('unlocked');
    expect(pointRows[1]?.querySelector('.workshop-page__prestige-point-count')?.textContent).toBe(
      '★★2 points',
    );
    expect(pointRows[3]?.querySelector('.style-star-level')?.dataset.starTone).toBe(
      'orange',
    );
    expect(
      [...pointRows[1].querySelectorAll('.workshop-page__prestige-point-reward-row')].map(
        (row) => row.textContent,
      ),
    ).toEqual(['- plot 12 capacity', '- cauldron 6 capacity']);
    expect(pointRows[1]?.textContent).not.toContain(',');
    expect(
      pointRows[1]?.textContent,
    ).toContain('next');
  });

  it('separates researched seed inventory rows from unresearched rows', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    snapshot.seedInventory = [
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: 0,
      },
      {
        itemTypeId: 2,
        key: 'mintSeed',
        label: 'mint seed',
        kind: 'seed',
        quantity: 2,
      },
      {
        itemTypeId: 3,
        key: 'nettleSeed',
        label: 'nettle seed',
        kind: 'seed',
        quantity: 0,
      },
      {
        itemTypeId: 4,
        key: 'lavenderSeed',
        label: 'lavender seed',
        kind: 'seed',
        quantity: 4,
      },
      {
        itemTypeId: 5,
        key: 'briarSeed',
        label: 'briar seed',
        kind: 'seed',
        quantity: 0,
        known: false,
      },
    ];
    const seedUnlockBox = snapshot.research.boxes.find((box) => box.id === 'seedUnlocks');
    seedUnlockBox.researches = [
      {
        id: 'unlockSeed:sageSeed',
        label: 'sage seed',
        value: 'researched',
        completed: true,
        canResearch: false,
      },
      {
        id: 'unlockSeed:mintSeed',
        label: 'mint seed',
        value: 'researched',
        completed: true,
        canResearch: false,
      },
      {
        id: 'unlockSeed:nettleSeed',
        label: 'nettle seed',
        value: '3 coin',
        completed: false,
        canResearch: false,
      },
      {
        id: 'unlockSeed:lavenderSeed',
        label: 'lavender seed',
        value: '4 coin',
        completed: false,
        canResearch: false,
      },
      {
        id: 'unlockSeed:briarSeed',
        label: 'briar seed',
        value: '5 coin',
        completed: false,
        canResearch: false,
      },
    ];
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__bag-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    [...stage.querySelectorAll('.workshop-page__bag-tab-button')]
      .find((button) => button.textContent === 'seeds')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const bag = stage.querySelector('.workshop-page__bag-popup');
    const divider = bag.querySelector('.workshop-page__bag-divider');
    const rows = [...bag.querySelectorAll('.workshop-page__bag-item-row--seed')];
    const labels = rows.map((row) => row.querySelector('.row_key')?.textContent);
    const values = rows.map((row) => row.querySelector('.row_val')?.textContent);
    const mysteryLabel = labels[4];
    const mysteryName = rows[4].querySelector('.row_key');
    expect(labels.slice(0, 3)).toEqual(['sage seed', 'mint seed', 'lavender seed']);
    expect(labels[3]).toBe('nettle seed');
    expect(mysteryLabel).not.toBe('briar seed');
    expect(mysteryLabel).toBe('??????');
    expect(mysteryName?.classList.contains('mystery-text')).toBe(true);
    expect(mysteryName?.getAttribute('aria-label')).toBe('unknown');
    expect(values).toEqual(['0', '2', '4', 'locked', 'locked']);
    expect(divider).not.toBeNull();
    expect(divider.previousElementSibling.querySelector('.row_key')?.textContent).toBe(
      'lavender seed',
    );
    expect(divider.nextElementSibling.querySelector('.row_key')?.textContent).toBe(
      'nettle seed',
    );
    expect(
      rows
        .find((row) => row.querySelector('.row_key')?.textContent === 'lavender seed')
        ?.classList.contains('is-locked'),
    ).toBe(false);
    expect(
      [...bag.querySelectorAll('.workshop-page__bag-item-row--seed.is-empty')].map(
        (row) => row.querySelector('.row_key')?.textContent,
      ),
    ).toEqual(['sage seed', 'nettle seed', mysteryLabel]);
  });

  it('shows currencies in the bag with zero balances muted', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__bag-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const rows = [...stage.querySelectorAll('.workshop-page__bag-currency-row')];
    expect(rows.map((row) => row.querySelector('.row_key')?.textContent)).toEqual([
      'mana',
      'coin',
      'crystal',
      'ruby',
    ]);
    expect(rows.map((row) => row.querySelector('.row_val')?.textContent)).toEqual([
      '0/50',
      '0',
      '0',
      '0',
    ]);
    expect(
      rows
        .find((row) => row.querySelector('.row_key')?.textContent === 'coin')
        ?.querySelector('.row_val .style-resource-label--coin'),
    ).not.toBeNull();
    expect(rows.every((row) => row.classList.contains('is-empty'))).toBe(true);
  });

  it('shows herb and potion inventories in the bag with locked rows below unlocked rows', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    snapshot.garden.herbs = [
      {
        itemTypeId: 1001,
        key: 'sageHerb',
        label: 'sage',
        kind: 'herb',
        quantity: 0,
      },
      {
        itemTypeId: 1002,
        key: 'mintHerb',
        label: 'mint',
        kind: 'herb',
        quantity: 0,
      },
    ];
    snapshot.inventory = [
      {
        itemTypeId: 2001,
        key: 'manaTonic',
        label: 'mana tonic',
        kind: 'potion',
        quantity: 2,
      },
      {
        itemTypeId: 2029,
        key: 'wastedPotion',
        label: 'wasted potion',
        kind: 'potion',
        quantity: 1,
        hasRecipe: false,
      },
    ];
    snapshot.research.completedResearchIds = ['unlockSeed:sageSeed', 'unlockRecipe:manaTonic'];
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__bag-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    [...stage.querySelectorAll('.workshop-page__bag-tab-button')]
      .find((button) => button.textContent === 'herbs')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    let rows = [...stage.querySelectorAll('.workshop-page__bag-item-row--herb')];
    expect(rows.map((row) => row.querySelector('.row_key')?.textContent)).toEqual([
      'sage',
      'mint',
    ]);
    expect(rows.map((row) => row.querySelector('.row_val')?.textContent)).toEqual([
      '0',
      'locked',
    ]);
    expect(rows[0].classList.contains('is-locked')).toBe(false);
    expect(rows[1].classList.contains('is-locked')).toBe(true);

    [...stage.querySelectorAll('.workshop-page__bag-tab-button')]
      .find((button) => button.textContent === 'potions')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    rows = [...stage.querySelectorAll('.workshop-page__bag-item-row--potion')];
    const labels = rows.map((row) => row.querySelector('.row_key')?.textContent);
    const values = rows.map((row) => row.querySelector('.row_val')?.textContent);
    expect(labels.slice(0, 2)).toEqual(['mana tonic', 'silverleaf quiet']);
    expect(values.slice(0, 2)).toEqual(['2', '0']);
    expect(rows[0].classList.contains('is-locked')).toBe(false);
    expect(rows[1].classList.contains('is-locked')).toBe(false);
    const firstLockedPotionRowIndex = rows.findIndex((row) =>
      row.classList.contains('is-locked'),
    );
    expect(firstLockedPotionRowIndex).toBeGreaterThan(1);
    expect(
      rows
        .slice(0, firstLockedPotionRowIndex)
        .every((row) => !row.classList.contains('is-locked')),
    ).toBe(true);
    expect(labels).toContain('??????');
    expect(values).toContain('locked');
    expect(
      rows[0].querySelector('.row_val .style-potion-label__icon')?.dataset.assetAtlasFrame,
    ).toBe('potion:manaTonic');
    const wastedRow = rows.find(
      (row) => row.querySelector('.row_key')?.textContent === 'wasted potion',
    );
    expect(
      wastedRow?.querySelector('.row_val .style-potion-label__icon')?.dataset.assetAtlasFrame,
    ).toBe('potion:wastedPotion');
    const unknownRow = rows.find(
      (row) => row.querySelector('.row_key')?.textContent === '??????',
    );
    expect(
      unknownRow?.querySelector('.row_key .style-potion-label__icon')?.dataset.assetAtlasFrame,
    ).toBe('potion:unknownPotion');
  });

  it('hides bag popup with Escape or outside click', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    const bag = stage.querySelector('.workshop-page__bag-popup');
    const bagButton = stage.querySelector('.workshop-page__bag-button');

    bagButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(bag.hidden).toBe(true);

    bagButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    bag.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(bag.hidden).toBe(true);
  });

  it('hides bag popup with close button', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    const bag = stage.querySelector('.workshop-page__bag-popup');
    const bagButton = stage.querySelector('.workshop-page__bag-button');

    bagButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(bag.hidden).toBe(false);

    bag
      .querySelector('.workshop-page__bag-close')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(bag.hidden).toBe(true);
  });

  it('shows leaderboard popup when leaderboard button is clicked', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    gameplayFacade.getSnapshot().leaderboard.topDailyUsers = [
      {
        name: 'Daily Ada',
        allianceTag: 'DAY',
        character: 'rowan',
        playerLevel: 3,
        dailyIncome: 17,
        weeklyIncome: 18,
        monthlyIncome: 19,
        totalIncome: 20,
      },
    ];
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      alliances: [
        {
          allianceId: 'alliance-1',
          name: 'All Seeing Void',
          tag: 'VOID',
          totalIncome: 128,
          seasonIncome: 42,
          weeklyIncome: 42,
          monthlyIncome: 84,
          dailyIncome: 7,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      tradeAllianceFacade,
    });

    pagesFacade.mount(stage);

    const popup = stage.querySelector('.workshop-page__leaderboard-popup');
    const button = stage.querySelector('.workshop-page__leaderboard-button');

    expect(popup.hidden).toBe(true);

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
    expect(popup.querySelector('[role="dialog"]')).not.toBeNull();
    expect(popup.querySelector('.style-dialog')).not.toBeNull();
    expect(popup.querySelector('.style-dialog .workshop-page__leaderboard-tab-button')).toBeNull();
    expect(
      popup.querySelector('.workshop-page__leaderboard-dialog')?.nextElementSibling,
    ).toBe(popup.querySelector('.workshop-page__leaderboard-scope-tabs'));
    expect(
      popup.querySelector('.workshop-page__leaderboard-scope-tabs')?.nextElementSibling,
    ).toBe(popup.querySelector('.workshop-page__leaderboard-period-tabs'));
    const scopeButtons = [
      ...popup.querySelectorAll('.workshop-page__leaderboard-scope-tabs .workshop-page__leaderboard-tab-button'),
    ];
    const periodButtons = [
      ...popup.querySelectorAll('.workshop-page__leaderboard-period-tabs .workshop-page__leaderboard-tab-button'),
    ];
    expect(scopeButtons.map((tabButton) => tabButton.textContent)).toEqual([
      'single player',
      'alliance',
    ]);
    expect(periodButtons.map((tabButton) => tabButton.textContent)).toEqual([
      'daily',
      'weekly',
      'monthly',
      'all time',
    ]);

    const rowLabels = [
      ...popup.querySelectorAll('.workshop-page__leaderboard-rows .row_key'),
    ].map((row) => row.textContent);
    const rowValues = [
      ...popup.querySelectorAll('.workshop-page__leaderboard-rows .row_val'),
    ].map((row) => row.textContent);
    expect(rowLabels).toEqual(['user', '1. [VOID] Ada (2)', '2. Merlin (10)']);
    expect(rowValues).toEqual(['all time', '120', '75']);
    expect(
      popup.querySelectorAll('.workshop-page__leaderboard-character-icon'),
    ).toHaveLength(2);
    const adaPlayerLabel = popup.querySelector('.workshop-page__leaderboard-player');
    expect(
      [...adaPlayerLabel.childNodes].map((node) =>
        node.nodeType === window.Node.TEXT_NODE ? node.textContent : node.className,
      ),
    ).toEqual([
      'style-player-character-icon workshop-page__leaderboard-character-icon',
      'workshop-page__alliance-tag',
      ' ',
      'room-player-info-link workshop-page__leaderboard-player-link',
    ]);

    const dailyButton = periodButtons.find((tabButton) => tabButton.textContent === 'daily');

    dailyButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(dailyButton.getAttribute('aria-selected')).toBe('true');
    expect(
      [...popup.querySelectorAll('.workshop-page__leaderboard-rows .row_key')].map(
        (row) => row.textContent,
      ),
    ).toEqual(['user', '1. [DAY] Daily Ada (3)']);
    expect(
      popup.querySelector('.workshop-page__leaderboard-character-icon')?.getAttribute('src'),
    ).toContain('rowan.png');
    expect(
      [...popup.querySelectorAll('.workshop-page__leaderboard-rows .row_val')].map(
        (row) => row.textContent,
      ),
    ).toEqual(['daily', '17']);

    const allianceButton = scopeButtons.find((tabButton) => tabButton.textContent === 'alliance');
    const monthlyButton = periodButtons.find((tabButton) => tabButton.textContent === 'monthly');

    allianceButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    monthlyButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(allianceButton.getAttribute('aria-selected')).toBe('true');
    expect(monthlyButton.getAttribute('aria-selected')).toBe('true');
    expect(
      [...popup.querySelectorAll('.workshop-page__leaderboard-rows .row_key')].map(
        (row) => row.textContent,
      ),
    ).toEqual(['alliance', '1. All Seeing Void [VOID]']);
    expect(
      [...popup.querySelectorAll('.workshop-page__leaderboard-rows .row_val')].map(
        (row) => row.textContent,
      ),
    ).toEqual(['monthly', '84']);
  });

  it('opens alliance info from leaderboard alliance rows and groups members by role', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      alliances: [
        {
          allianceId: 'alliance-1',
          name: 'All Seeing Void',
          tag: 'VOID',
          joinMode: 'apply',
          memberCount: 3,
          totalIncome: 128,
          seasonIncome: 42,
          weeklyIncome: 42,
          monthlyIncome: 84,
          dailyIncome: 7,
        },
      ],
      members: [
        {
          allianceId: 'alliance-1',
          memberIdentity: 'self',
          username: 'wizard',
          playerLevel: 2,
          role: 'tradeMaster',
          dailyContribution: 0,
        },
        {
          allianceId: 'alliance-1',
          memberIdentity: 'member-2',
          username: 'Ada',
          playerLevel: 4,
          role: 'trader',
          dailyContribution: 0,
        },
        {
          allianceId: 'alliance-1',
          memberIdentity: 'member-3',
          username: 'Merlin',
          playerLevel: 7,
          role: 'trader',
          dailyContribution: 0,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      tradeAllianceFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__leaderboard-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const leaderboardPopup = stage.querySelector('.workshop-page__leaderboard-popup');
    const allianceButton = [
      ...leaderboardPopup.querySelectorAll('.workshop-page__leaderboard-tab-button'),
    ].find((button) => button.textContent === 'alliance');

    allianceButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const allianceRow = leaderboardPopup.querySelector('.workshop-page__leaderboard-row.is-actionable');
    allianceRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const infoPopup = stage.querySelector('.room-alliance-info-popup');
    expect(infoPopup.hidden).toBe(false);
    expect(infoPopup.querySelector('.style-box__title')?.textContent).toBe('[VOID] All Seeing Void');
    expect(
      [...infoPopup.querySelectorAll('.room-alliance-info-section-label')].map(
        (label) => label.textContent,
      ),
    ).toEqual(['members', 'trade master', 'trader']);
    expect(infoPopup.textContent).toContain('wizard');
    expect(infoPopup.textContent).toContain('Ada');
    expect(infoPopup.textContent).toContain('Merlin');
  });

  it('shows the current player rank below the leaderboard when outside the top 100', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    gameplayFacade.getSnapshot().leaderboard = {
      topGeneratedCoinUsers: Array.from({ length: 100 }, (_value, index) => ({
        name: `Player ${index + 1}`,
        playerLevel: index + 1,
        income: 0,
        totalGeneratedCoin: 200 - index,
        totalIncome: 200 - index,
      })),
      topIncomeUsers: [],
      currentGeneratedCoinUser: {
        name: 'Mine',
        allianceTag: 'SELF',
        playerLevel: 4,
        income: 0,
        totalGeneratedCoin: 1,
        totalIncome: 1,
        rank: 102,
      },
    };
    const pagesFacade = new PagesFacade({ gameplayFacade });

    pagesFacade.mount(stage);
    stage
      .querySelector('.workshop-page__leaderboard-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const rowLabels = [
      ...stage.querySelectorAll('.workshop-page__leaderboard-rows .row_key'),
    ].map((row) => row.textContent);
    const rowValues = [
      ...stage.querySelectorAll('.workshop-page__leaderboard-rows .row_val'),
    ].map((row) => row.textContent);

    expect(rowLabels).toHaveLength(102);
    expect(rowLabels[0]).toBe('user');
    expect(rowLabels[1]).toBe('1. Player 1 (1)');
    expect(rowLabels[100]).toBe('100. Player 100 (100)');
    expect(rowLabels[101]).toBe('102. [SELF] Mine (4)');
    expect(rowValues[100]).toBe('101');
    expect(rowValues.at(-1)).toBe('1');
    expect(
      stage
        .querySelector('.workshop-page__leaderboard-row:last-child')
        ?.classList.contains('workshop-page__leaderboard-current'),
    ).toBe(true);
  });

  it('does not add a separate current rank when the player is already in the top 100', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    gameplayFacade.getSnapshot().leaderboard = {
      topGeneratedCoinUsers: Array.from({ length: 100 }, (_value, index) => ({
        name: index === 2 ? 'Mine' : `Player ${index + 1}`,
        playerLevel: index + 1,
        income: 0,
        totalGeneratedCoin: 200 - index,
        totalIncome: 200 - index,
      })),
      topIncomeUsers: [],
      currentGeneratedCoinUser: {
        name: 'Mine',
        playerLevel: 3,
        income: 0,
        totalGeneratedCoin: 98,
        totalIncome: 98,
        rank: 3,
      },
    };
    const pagesFacade = new PagesFacade({ gameplayFacade });

    pagesFacade.mount(stage);
    stage
      .querySelector('.workshop-page__leaderboard-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const mineRows = [
      ...stage.querySelectorAll('.workshop-page__leaderboard-rows .row_key'),
    ].filter((row) => row.textContent === '3. Mine (3)');

    expect(mineRows).toHaveLength(1);
    expect(
      mineRows[0]?.parentElement?.classList.contains('workshop-page__leaderboard-current'),
    ).toBe(true);
  });

  it('hides leaderboard popup with Escape or outside click', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
    });

    pagesFacade.mount(stage);

    const popup = stage.querySelector('.workshop-page__leaderboard-popup');
    const button = stage.querySelector('.workshop-page__leaderboard-button');

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(popup.hidden).toBe(true);

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    popup.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(true);
  });

  it('opens alliance info from the player info dialog alliance tag', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const playerInfoFacade = createPlayerInfoFacadeFake({
      players: [
        {
          identity: 'identity-ada',
          username: 'Ada',
          allianceTag: 'TAP',
          allianceTagColor: 'blue',
          totalProducedCoin: 321,
          playerLevel: 9,
          prestigeCount: 1,
        },
      ],
    });
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      alliances: [
        {
          allianceId: 'alliance-2',
          name: 'Tap Guild',
          tag: 'TAP',
          tagColor: 'blue',
          joinMode: 'apply',
          memberCount: 1,
          totalIncome: 200,
          seasonIncome: 80,
          weeklyIncome: 80,
          monthlyIncome: 120,
          dailyIncome: 10,
        },
      ],
      members: [
        {
          allianceId: 'alliance-2',
          memberIdentity: 'identity-ada',
          username: 'Ada',
          playerLevel: 9,
          role: 'tradeMaster',
          dailyContribution: 0,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerInfoFacade,
      tradeAllianceFacade,
    });

    pagesFacade.mount(stage);
    pagesFacade.playerInfoDialogFacade.show({
      identity: 'identity-ada',
      username: 'Ada',
    });

    const playerInfoPopup = stage.querySelector('.room-player-info-popup');
    const allianceLink = playerInfoPopup.querySelector('.room-player-info-alliance-link');
    allianceLink.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const infoPopup = stage.querySelector('.room-alliance-info-popup');
    expect(infoPopup.hidden).toBe(false);
    expect(infoPopup.querySelector('.style-box__title')?.textContent).toBe('[TAP] Tap Guild');
  });

  it('labels trade alliance browse income and keeps alliance info compact', async () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const description = 'We try to break everything while testing, also we complain a lot';
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      alliances: [
        {
          allianceId: 'alliance-2',
          name: 'BustinGame',
          tag: 'BG',
          description,
          joinMode: 'open',
          memberCount: 1,
          totalIncome: 6367,
          seasonIncome: 6367,
          weeklyIncome: 6367,
          monthlyIncome: 6367,
          dailyIncome: 0,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      tradeAllianceFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__trade-alliance-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = stage.querySelector('.workshop-page__trade-alliance-popup');
    const leaveButton = [
      ...popup.querySelectorAll('.workshop-page__trade-alliance-wide-button'),
    ].find((button) => button.textContent === 'leave');

    leaveButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    const browseRow = popup.querySelector('.workshop-page__trade-alliance-list-row');
    const infoRow = browseRow.querySelector('.workshop-page__trade-alliance-info-row');
    const incomeRow = browseRow.querySelector('.workshop-page__trade-alliance-row.is-compact');

    expect(infoRow.textContent).toBe(description);
    expect(
      browseRow.querySelector('.workshop-page__trade-alliance-row .row_key')?.textContent,
    ).toBe('[BG] BustinGame');
    expect(incomeRow.querySelector('.row_key')?.textContent).toBe('season income');
    expect(incomeRow.querySelector('.row_val')?.textContent).toBe('6.36k coin');
    expect(incomeRow.querySelector('.row_val')?.getAttribute('data-resource-color')).toBe('coin');
    expect(incomeRow.querySelector('.row_val .style-resource-label--coin')).not.toBeNull();
  });

  it('opens alliance info from trade alliance browse rows and joins open alliances', async () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      alliances: [
        {
          allianceId: 'alliance-2',
          name: 'BustinGame',
          tag: 'BG',
          description: 'stress crew',
          joinMode: 'open',
          memberCount: 2,
          totalIncome: 1000,
          seasonIncome: 420,
          weeklyIncome: 420,
          monthlyIncome: 640,
          dailyIncome: 80,
        },
      ],
      members: [
        {
          allianceId: 'alliance-2',
          memberIdentity: 'member-2',
          username: 'Ada',
          playerLevel: 4,
          role: 'tradeMaster',
          dailyContribution: 0,
        },
        {
          allianceId: 'alliance-2',
          memberIdentity: 'member-3',
          username: 'Merlin',
          playerLevel: 6,
          role: 'trader',
          dailyContribution: 0,
        },
      ],
      ownAlliance: null,
      ownMember: null,
      ownRole: null,
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      tradeAllianceFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__trade-alliance-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const browseMain = stage.querySelector('.workshop-page__trade-alliance-list-main.is-actionable');
    browseMain.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const infoPopup = stage.querySelector('.room-alliance-info-popup');
    expect(infoPopup.hidden).toBe(false);
    expect(infoPopup.querySelector('.style-box__title')?.textContent).toBe('[BG] BustinGame');

    const joinButton = infoPopup.querySelector('.room-alliance-info-action');
    expect(joinButton?.textContent).toBe('join');

    joinButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(tradeAllianceFacade.getJoinRequests()).toEqual(['alliance-2']);
    expect(infoPopup.querySelector('.room-alliance-info-action')).toBeNull();
  });

  it('fills a trade alliance item quest from owned inventory', async () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    gameplayFacade.getSnapshot().inventory.push({
      itemTypeId: 2001,
      key: 'manaTonic',
      label: 'mana tonic',
      kind: 'potion',
      quantity: 30,
    });
    const quest = {
      allianceId: 'alliance-1',
      dayKey: '2026-W24',
      questId: 'itemFill:manaTonic',
      label: 'fill 500 mana tonic',
      questType: 'itemFill',
      itemKey: 'manaTonic',
      target: 500,
      progress: 492,
      progressRatio: 0.984,
      minContribution: 25,
      crystalReward: 5,
    };
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      quests: [quest],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      tradeAllianceFacade,
    });

    pagesFacade.mount(stage);
    stage
      .querySelector('.workshop-page__trade-alliance-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = stage.querySelector('.workshop-page__trade-alliance-popup');
    const questsTab = [...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button')]
      .find((button) => button.textContent === 'quests');
    questsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const fillButton = popup.querySelector('.workshop-page__trade-alliance-quest-action');
    expect(fillButton.textContent).toBe('fill');

    fillButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(gameplayFacade.getSnapshot().inventory[0].quantity).toBe(5);
    expect(quest.progress).toBe(500);
    expect(tradeAllianceFacade.getSnapshot().contributions).toContainEqual({
      allianceId: 'alliance-1',
      questId: 'itemFill:manaTonic',
      dayKey: '2026-W24',
      contributorIdentity: 'self',
      contribution: 25,
    });
    expect(popup.querySelector('.workshop-page__trade-alliance-quest-action').textContent).toBe(
      'claim',
    );
    expect(
      [...popup.querySelectorAll('.workshop-page__trade-alliance-row .row_key')].map(
        (row) => row.textContent,
      ),
    ).toContain('your fill 25/25');
  });

  it('lets a player fill missing contribution after an item quest is complete', async () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    gameplayFacade.getSnapshot().inventory.push({
      itemTypeId: 2001,
      key: 'manaTonic',
      label: 'mana tonic',
      kind: 'potion',
      quantity: 20,
    });
    const quest = {
      allianceId: 'alliance-1',
      dayKey: '2026-W24',
      questId: 'itemFill:manaTonic',
      label: 'fill 500 mana tonic',
      questType: 'itemFill',
      itemKey: 'manaTonic',
      target: 500,
      progress: 500,
      progressRatio: 1,
      minContribution: 25,
      crystalReward: 5,
    };
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      quests: [quest],
      contributions: [
        {
          allianceId: 'alliance-1',
          questId: 'itemFill:manaTonic',
          dayKey: '2026-W24',
          contributorIdentity: 'self',
          contribution: 8,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      tradeAllianceFacade,
    });

    pagesFacade.mount(stage);
    stage
      .querySelector('.workshop-page__trade-alliance-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = stage.querySelector('.workshop-page__trade-alliance-popup');
    const questsTab = [...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button')]
      .find((button) => button.textContent === 'quests');
    questsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const fillButton = popup.querySelector('.workshop-page__trade-alliance-quest-action');
    expect(fillButton.textContent).toBe('fill');
    expect(fillButton.disabled).toBe(false);

    fillButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(gameplayFacade.getSnapshot().inventory[0].quantity).toBe(3);
    expect(quest.progress).toBe(500);
    expect(tradeAllianceFacade.getSnapshot().contributions).toContainEqual({
      allianceId: 'alliance-1',
      questId: 'itemFill:manaTonic',
      dayKey: '2026-W24',
      contributorIdentity: 'self',
      contribution: 25,
    });
    expect(popup.querySelector('.workshop-page__trade-alliance-quest-action').textContent).toBe(
      'claim',
    );
  });

  it('shows alliance quest reset timer', () => {
    const now = Date.UTC(2026, 5, 14, 0, 0, 0);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now);
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      quests: [
        {
          allianceId: 'alliance-1',
          dayKey: '0',
          questId: 'allianceIncomeEasy',
          label: 'hard route',
          questType: 'allianceIncome',
          itemKey: '',
          target: 500,
          progress: 0,
          progressRatio: 0,
          minContribution: 25,
          crystalReward: 1,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      tradeAllianceFacade,
    });

    try {
      pagesFacade.mount(stage);
      stage
        .querySelector('.workshop-page__trade-alliance-button')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      const popup = stage.querySelector('.workshop-page__trade-alliance-popup');
      const questsTab = [...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button')]
        .find((button) => button.textContent === 'quests');
      questsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(
        popup.querySelector('.workshop-page__trade-alliance-panel')?.dataset.activeTab,
      ).toBe('quests');
      expect(
        popup.querySelector('.workshop-page__trade-alliance-reset-row .row_key')?.textContent,
      ).toBe('quests reset');
      expect(
        popup.querySelector('.workshop-page__trade-alliance-reset-row .row_val')?.textContent,
      ).toBe('in 1d 0h');
    } finally {
      pagesFacade.unmount();
      nowSpy.mockRestore();
    }
  });

  it('scrolls alliance quests to the first claimable row on tab open', () => {
    const restoreOffsetTop = installQuestOffsetTopGetter({
      'blocked-route': 40,
      'claim-route': 95,
      'claim-late': 150,
    });
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      quests: [
        {
          allianceId: 'alliance-1',
          dayKey: '2026-W24',
          questId: 'blocked-route',
          label: 'slow route',
          questType: 'allianceIncome',
          itemKey: '',
          target: 500,
          progress: 100,
          progressRatio: 0.2,
          minContribution: 25,
          crystalReward: 1,
        },
        {
          allianceId: 'alliance-1',
          dayKey: '2026-W24',
          questId: 'claim-route',
          label: 'fast route',
          questType: 'allianceIncome',
          itemKey: '',
          target: 500,
          progress: 500,
          progressRatio: 1,
          minContribution: 25,
          crystalReward: 1,
        },
        {
          allianceId: 'alliance-1',
          dayKey: '2026-W24',
          questId: 'claim-late',
          label: 'long route',
          questType: 'allianceIncome',
          itemKey: '',
          target: 500,
          progress: 500,
          progressRatio: 1,
          minContribution: 25,
          crystalReward: 1,
        },
      ],
      contributions: [
        {
          allianceId: 'alliance-1',
          questId: 'claim-route',
          dayKey: '2026-W24',
          contributorIdentity: 'self',
          contribution: 25,
        },
        {
          allianceId: 'alliance-1',
          questId: 'claim-late',
          dayKey: '2026-W24',
          contributorIdentity: 'self',
          contribution: 25,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      tradeAllianceFacade,
    });

    try {
      pagesFacade.mount(stage);
      stage
        .querySelector('.workshop-page__trade-alliance-button')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      const popup = stage.querySelector('.workshop-page__trade-alliance-popup');
      const content = popup.querySelector('.workshop-page__trade-alliance-content');
      let scrollTop = 12;
      Object.defineProperty(content, 'clientHeight', { value: 100, configurable: true });
      Object.defineProperty(content, 'scrollHeight', { value: 300, configurable: true });
      Object.defineProperty(content, 'scrollTop', {
        get: () => scrollTop,
        set: (value) => {
          scrollTop = value;
        },
        configurable: true,
      });

      const questsTab = [...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button')]
        .find((button) => button.textContent === 'quests');
      questsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(content.scrollTop).toBe(95);
    } finally {
      pagesFacade.unmount();
      restoreOffsetTop();
    }
  });

  it('scrolls alliance quests to top on tab open when no quest is claimable', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      quests: [
        {
          allianceId: 'alliance-1',
          dayKey: '2026-W24',
          questId: 'slow-route',
          label: 'slow route',
          questType: 'allianceIncome',
          itemKey: '',
          target: 500,
          progress: 100,
          progressRatio: 0.2,
          minContribution: 25,
          crystalReward: 1,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      tradeAllianceFacade,
    });

    try {
      pagesFacade.mount(stage);
      stage
        .querySelector('.workshop-page__trade-alliance-button')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      const popup = stage.querySelector('.workshop-page__trade-alliance-popup');
      const content = popup.querySelector('.workshop-page__trade-alliance-content');
      let scrollTop = 80;
      Object.defineProperty(content, 'scrollTop', {
        get: () => scrollTop,
        set: (value) => {
          scrollTop = value;
        },
        configurable: true,
      });

      const questsTab = [...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button')]
        .find((button) => button.textContent === 'quests');
      questsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(content.scrollTop).toBe(0);
    } finally {
      pagesFacade.unmount();
    }
  });

  it('scrolls alliance quests to top on tab open when the quest list is empty', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const tradeAllianceFacade = createTradeAllianceFacadeFake({ quests: [] });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      tradeAllianceFacade,
    });

    try {
      pagesFacade.mount(stage);
      stage
        .querySelector('.workshop-page__trade-alliance-button')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      const popup = stage.querySelector('.workshop-page__trade-alliance-popup');
      const content = popup.querySelector('.workshop-page__trade-alliance-content');
      let scrollTop = 120;
      Object.defineProperty(content, 'scrollTop', {
        get: () => scrollTop,
        set: (value) => {
          scrollTop = value;
        },
        configurable: true,
      });

      const questsTab = [...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button')]
        .find((button) => button.textContent === 'quests');
      questsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(content.scrollTop).toBe(0);
    } finally {
      pagesFacade.unmount();
    }
  });

  it('blocks current alliance quests when this week has progress in another alliance', () => {
    const now = Date.UTC(2026, 5, 14, 0, 0, 0);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now);
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      alliances: [
        {
          allianceId: 'alliance-old',
          name: 'Old Lanterns',
          tag: 'OLD',
          totalIncome: 0,
          seasonIncome: 0,
          weeklyIncome: 0,
          monthlyIncome: 0,
          dailyIncome: 0,
        },
      ],
      quests: [
        {
          allianceId: 'alliance-1',
          dayKey: '0',
          questId: 'itemFill:manaTonic',
          label: 'fill 500 mana tonic',
          questType: 'itemFill',
          itemKey: 'manaTonic',
          target: 500,
          progress: 100,
          progressRatio: 0.2,
          minContribution: 25,
          crystalReward: 5,
        },
      ],
      contributions: [
        {
          allianceId: 'alliance-old',
          questId: 'itemFill:manaTonic',
          dayKey: '0',
          contributorIdentity: 'self',
          contribution: 25,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      tradeAllianceFacade,
    });

    try {
      pagesFacade.mount(stage);
      stage
        .querySelector('.workshop-page__trade-alliance-button')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      const popup = stage.querySelector('.workshop-page__trade-alliance-popup');
      const questsTab = [...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button')]
        .find((button) => button.textContent === 'quests');
      questsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(
        popup.querySelector('.workshop-page__trade-alliance-lock-message')?.textContent,
      ).toBe(
        'quest progress this week belongs to Old Lanterns. rejoin it to continue, or start quests here after reset in 1d 0h.',
      );
      const action = popup.querySelector('.workshop-page__trade-alliance-quest-action');
      expect(action.textContent).toBe('locked');
      expect(action.disabled).toBe(true);
      expect(
        [...popup.querySelectorAll('.workshop-page__trade-alliance-row .row_key')].map(
          (row) => row.textContent,
        ),
      ).toContain('your fill 0/25');
    } finally {
      pagesFacade.unmount();
      nowSpy.mockRestore();
    }
  });

  it('moves claimed trade alliance quest rewards below unclaimed quests', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      quests: [
        {
          allianceId: 'alliance-1',
          dayKey: '2026-W24',
          questId: 'allianceIncomeHard',
          label: 'hard route',
          questType: 'allianceIncome',
          itemKey: '',
          target: 10000,
          progress: 10000,
          progressRatio: 1,
          minContribution: 500,
          crystalReward: 2,
          claimed: true,
        },
        {
          allianceId: 'alliance-1',
          dayKey: '2026-W24',
          questId: 'allianceIncomeGrand',
          label: 'grand route',
          questType: 'allianceIncome',
          itemKey: '',
          target: 250000,
          progress: 86027,
          progressRatio: 0.34,
          minContribution: 12500,
          crystalReward: 12,
        },
        {
          allianceId: 'alliance-1',
          dayKey: '2026-W24',
          questId: 'allianceIncomeBulk',
          label: 'bulk route',
          questType: 'allianceIncome',
          itemKey: '',
          target: 50000,
          progress: 50000,
          progressRatio: 1,
          minContribution: 2500,
          crystalReward: 5,
        },
        {
          allianceId: 'alliance-1',
          dayKey: '2026-W24',
          questId: 'itemFill:manaTonic',
          label: 'fill 500 mana tonic',
          questType: 'itemFill',
          itemKey: 'manaTonic',
          target: 500,
          progress: 500,
          progressRatio: 1,
          minContribution: 25,
          crystalReward: 5,
          claimed: true,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      tradeAllianceFacade,
    });

    pagesFacade.mount(stage);
    stage
      .querySelector('.workshop-page__trade-alliance-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = stage.querySelector('.workshop-page__trade-alliance-popup');
    const questsTab = [...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button')]
      .find((button) => button.textContent === 'quests');
    questsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(
      [...popup.querySelectorAll('.workshop-page__trade-alliance-quest-row')].map(
        (row) => row.querySelector('.row_key')?.textContent,
      ),
    ).toEqual([
      'grand route',
      'bulk route',
      'hard route',
      'fill 500 mana tonic',
    ]);
  });

  it('marks a trade alliance quest claimed after claiming reward', async () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const quest = {
      allianceId: 'alliance-1',
      dayKey: '2026-W24',
      questId: 'allianceIncomeEasy',
      label: 'small caravan',
      questType: 'allianceIncome',
      itemKey: '',
      target: 500,
      progress: 500,
      progressRatio: 1,
      minContribution: 25,
      crystalReward: 1,
    };
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      quests: [quest],
      contributions: [
        {
          allianceId: 'alliance-1',
          questId: 'allianceIncomeEasy',
          dayKey: '2026-W24',
          contributorIdentity: 'self',
          contribution: 25,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      tradeAllianceFacade,
    });

    pagesFacade.mount(stage);
    stage
      .querySelector('.workshop-page__trade-alliance-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = stage.querySelector('.workshop-page__trade-alliance-popup');
    const questsTab = [...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button')]
      .find((button) => button.textContent === 'quests');
    questsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const claimButton = popup.querySelector('.workshop-page__trade-alliance-quest-action');
    expect(claimButton.textContent).toBe('claim');
    expect(claimButton.disabled).toBe(false);

    claimButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    const claimedButton = popup.querySelector('.workshop-page__trade-alliance-quest-action');
    expect(claimedButton.textContent).toBe('claimed');
    expect(claimedButton.disabled).toBe(true);
    expect(tradeAllianceFacade.getSnapshot().rewardInbox).toContainEqual(
      expect.objectContaining({
        questId: 'allianceIncomeEasy',
        dayKey: '2026-W24',
        collected: true,
      }),
    );
  });

  it('shows alliance quest claim notifications on the workshop button and quests tab', async () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      quests: [
        {
          allianceId: 'alliance-1',
          dayKey: '2026-W24',
          questId: 'allianceIncomeEasy',
          label: 'small caravan',
          questType: 'allianceIncome',
          itemKey: '',
          target: 500,
          progress: 500,
          progressRatio: 1,
          minContribution: 25,
          crystalReward: 1,
        },
      ],
      contributions: [
        {
          allianceId: 'alliance-1',
          questId: 'allianceIncomeEasy',
          dayKey: '2026-W24',
          contributorIdentity: 'self',
          contribution: 25,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      tradeAllianceFacade,
      tutorialStorage: createCompletedTutorialStorage(),
    });

    try {
      pagesFacade.mount(stage);

      const allianceButton = stage.querySelector('.workshop-page__trade-alliance-button');
      expect(allianceButton?.dataset.notification).toBe('true');
      expect(
        stage.querySelector('.room-bottom-panel__tab[data-page-id="workshop"]')?.dataset
          .notification,
      ).toBe('true');

      allianceButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      const popup = stage.querySelector('.workshop-page__trade-alliance-popup');
      const questsTab = [...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button')]
        .find((button) => button.textContent === 'quests');
      expect(questsTab?.dataset.notification).toBe('true');

      questsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      const claimButton = popup.querySelector('.workshop-page__trade-alliance-quest-action');
      expect(claimButton?.dataset.notification).toBe('true');

      claimButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();

      const updatedQuestsTab = [
        ...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button'),
      ].find((button) => button.textContent === 'quests');

      expect(allianceButton?.dataset.notification).toBeUndefined();
      expect(updatedQuestsTab?.dataset.notification).toBeUndefined();
      expect(
        stage.querySelector('.room-bottom-panel__tab[data-page-id="workshop"]')?.dataset
          .notification,
      ).toBeUndefined();
      expect(
        popup.querySelector('.workshop-page__trade-alliance-quest-action')?.dataset.notification,
      ).toBeUndefined();
    } finally {
      pagesFacade.unmount();
    }
  });

  it('scrolls to the next claimable alliance quest after claiming reward', async () => {
    const restoreOffsetTop = installQuestOffsetTopGetter({
      'claim-first': 70,
      'claim-next': 135,
    });
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const quests = [
      {
        allianceId: 'alliance-1',
        dayKey: '2026-W24',
        questId: 'claim-first',
        label: 'first route',
        questType: 'allianceIncome',
        itemKey: '',
        target: 500,
        progress: 500,
        progressRatio: 1,
        minContribution: 25,
        crystalReward: 1,
      },
      {
        allianceId: 'alliance-1',
        dayKey: '2026-W24',
        questId: 'claim-next',
        label: 'next route',
        questType: 'allianceIncome',
        itemKey: '',
        target: 500,
        progress: 500,
        progressRatio: 1,
        minContribution: 25,
        crystalReward: 1,
      },
    ];
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      quests,
      contributions: quests.map((quest) => ({
        allianceId: 'alliance-1',
        questId: quest.questId,
        dayKey: '2026-W24',
        contributorIdentity: 'self',
        contribution: 25,
      })),
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      tradeAllianceFacade,
    });

    try {
      pagesFacade.mount(stage);
      stage
        .querySelector('.workshop-page__trade-alliance-button')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      const popup = stage.querySelector('.workshop-page__trade-alliance-popup');
      const content = popup.querySelector('.workshop-page__trade-alliance-content');
      let scrollTop = 0;
      Object.defineProperty(content, 'clientHeight', { value: 100, configurable: true });
      Object.defineProperty(content, 'scrollHeight', { value: 300, configurable: true });
      Object.defineProperty(content, 'scrollTop', {
        get: () => scrollTop,
        set: (value) => {
          scrollTop = value;
        },
        configurable: true,
      });

      const questsTab = [...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button')]
        .find((button) => button.textContent === 'quests');
      questsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(content.scrollTop).toBe(70);

      const getClaimButtons = () =>
        [...popup.querySelectorAll('.workshop-page__trade-alliance-quest-action')]
          .filter((button) => button.textContent === 'claim' && !button.disabled);

      getClaimButtons()[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();

      expect(content.scrollTop).toBe(135);

      scrollTop = 48;
      getClaimButtons()[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();

      expect(content.scrollTop).toBe(48);
      expect(tradeAllianceFacade.getSnapshot().rewardInbox).toHaveLength(2);
    } finally {
      pagesFacade.unmount();
      restoreOffsetTop();
    }
  });

  it('opens trade alliance member actions from a manageable member row', async () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      memberCount: 2,
      members: [
        {
          allianceId: 'alliance-1',
          memberIdentity: 'self',
          username: 'wizard',
          playerLevel: 2,
          role: 'tradeMaster',
          dailyContribution: 0,
        },
        {
          allianceId: 'alliance-1',
          memberIdentity: 'member-2',
          username: 'Ada',
          playerLevel: 4,
          role: 'trader',
          dailyContribution: 120,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      tradeAllianceFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__trade-alliance-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = stage.querySelector('.workshop-page__trade-alliance-popup');
    const membersTab = [
      ...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button'),
    ].find((button) => button.textContent === 'members');

    membersTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const memberPopup = popup.querySelector('.workshop-page__trade-alliance-member-popup');
    const memberRows = [
      ...popup.querySelectorAll('.workshop-page__trade-alliance-member-row'),
    ];

    expect(memberRows).toHaveLength(2);
    expect(memberRows.every((row) => row.querySelector('.room-player-info-link'))).toBe(true);
    expect(
      memberRows.every(
        (row) => row.querySelector('button:not(.room-player-info-link), select') === null,
      ),
    ).toBe(true);

    memberRows[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(memberPopup.hidden).toBe(true);

    memberRows[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(memberPopup.hidden).toBe(false);
    expect(memberPopup.querySelector('.style-box__title').textContent).toBe('Ada(4)');
    expect(
      [...memberPopup.querySelectorAll('.workshop-page__trade-alliance-wide-button')].map(
        (button) => button.textContent,
      ),
    ).toEqual(['lead', 'kick']);

    const roleSelect = memberPopup.querySelector('select');
    roleSelect.value = 'quartermaster';
    roleSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(tradeAllianceFacade.getRoleUpdates()).toEqual([
      { memberIdentity: 'member-2', role: 'quartermaster' },
    ]);
    expect(memberPopup.querySelector('select').value).toBe('quartermaster');

    const kickButton = [
      ...memberPopup.querySelectorAll('.workshop-page__trade-alliance-wide-button'),
    ].find((button) => button.textContent === 'kick');
    kickButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(tradeAllianceFacade.getKickedMembers()).toEqual(['member-2']);
    expect(memberPopup.hidden).toBe(true);
  });

  it('saves trade alliance settings on button release, not press start', async () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const tradeAllianceFacade = createTradeAllianceFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      tradeAllianceFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__trade-alliance-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = stage.querySelector('.workshop-page__trade-alliance-popup');
    const settingsTab = [
      ...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button'),
    ].find((button) => button.textContent === 'settings');

    settingsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    popup.querySelector('input[name="name"]').value = 'Tap Void';
    popup.querySelector('input[name="tag"]').value = 'TAP';
    popup.querySelector('input[name="description"]').value = 'tap save';
    popup.querySelector('input[name="notice"]').value = 'mobile';
    popup.querySelector('select[name="joinMode"]').value = 'closed';

    const saveButton = [
      ...popup.querySelectorAll('.workshop-page__trade-alliance-wide-button'),
    ].find((button) => button.textContent === 'save');
    const pointerDown = new window.Event('pointerdown', {
      bubbles: true,
      cancelable: true,
    });

    saveButton.dispatchEvent(pointerDown);
    await Promise.resolve();
    await Promise.resolve();

    expect(pointerDown.defaultPrevented).toBe(false);
    expect(tradeAllianceFacade.getProfileUpdates()).toEqual([]);

    saveButton.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(tradeAllianceFacade.getProfileUpdates()).toEqual([
      {
        name: 'Tap Void',
        tag: 'TAP',
        tagColor: 'ink',
        description: 'tap save',
        notice: 'mobile',
        joinMode: 'closed',
      },
    ]);
    expect(popup.querySelector('.style-box__title').textContent).toBe('[TAP] Tap Void');
  });

  it('disbands a solo trade alliance from settings', async () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const tradeAllianceFacade = createTradeAllianceFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      tradeAllianceFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__trade-alliance-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = stage.querySelector('.workshop-page__trade-alliance-popup');
    const settingsTab = [
      ...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button'),
    ].find((button) => button.textContent === 'settings');

    settingsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const disbandButton = [
      ...popup.querySelectorAll('.workshop-page__trade-alliance-wide-button'),
    ].find((button) => button.textContent === 'disband');

    disbandButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(tradeAllianceFacade.getLeaveCount()).toBe(1);
    expect(popup.querySelector('.style-box__title').textContent).toBe('trade alliance');
    expect(
      [...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button')].map(
        (button) => button.textContent,
      ),
    ).toEqual(['browse', 'create']);
  });

  it('leaves a solo trade alliance from home', async () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const tradeAllianceFacade = createTradeAllianceFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      tradeAllianceFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__trade-alliance-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = stage.querySelector('.workshop-page__trade-alliance-popup');
    const leaveButton = [
      ...popup.querySelectorAll('.workshop-page__trade-alliance-wide-button'),
    ].find((button) => button.textContent === 'leave');

    leaveButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(tradeAllianceFacade.getLeaveCount()).toBe(1);
    expect(popup.querySelector('.style-box__title').textContent).toBe('trade alliance');
  });

  it('shows discoveries tabs and revealed unknown potion recipes', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
    });

    pagesFacade.mount(stage);

    const popup = stage.querySelector('.workshop-page__discoveries-popup');
    const button = stage.querySelector('.workshop-page__discoveries-button');

    expect(popup.hidden).toBe(true);

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
    expect(popup.querySelector('[role="dialog"]')).not.toBeNull();
    expect(popup.querySelector('.style-dialog .workshop-page__discoveries-tab-button')).toBeNull();
    expect(
      popup.querySelector('.workshop-page__discoveries-dialog')?.nextElementSibling,
    ).toBe(popup.querySelector('.workshop-page__discoveries-tabs'));
    expect(
      [...popup.querySelectorAll('.workshop-page__discoveries-tab-button')].map(
        (tab) => tab.textContent,
      ),
    ).toEqual(['seeds', 'herbs', 'potions']);
    expect(popup.textContent).toContain('unowned');
    expect(popup.textContent).toContain('unknown potion');
    expect(popup.textContent).not.toContain('ashen memory');
    expect(popup.textContent).not.toContain('ingredients:');
    expect(popup.textContent).toContain('silverleaf quiet');
    expect(popup.textContent).toContain('discovered by Ada');
    expect(popup.querySelector('.workshop-page__discovery-recipe-book')).not.toBeNull();
    expect(popup.querySelector('.workshop-page__discovery-potion-box')).toBeNull();
    expect(popup.querySelector('.workshop-page__discovery-recipe-page-label')?.textContent).toBe(
      'pages 1-2/2',
    );
    expect(popup.querySelector('.brewing-page__recipe-select-button')).toBeNull();

    const discoveredRow = [...popup.querySelectorAll('.workshop-page__discovery-potion-row')].find(
      (row) => row.textContent.includes('silverleaf quiet'),
    );

    expect(discoveredRow?.classList.contains('brewing-page__recipe-row')).toBe(true);
    expect(
      discoveredRow?.querySelector('.workshop-page__discovery-potion-name')?.textContent,
    ).toBe('silverleaf quiet');
    expect(discoveredRow?.querySelector('.workshop-page__discovery-royalties')?.textContent).toBe(
      'royalties 12.5 coin',
    );
    expect(discoveredRow?.textContent).toContain('- 1 mint');
    expect(discoveredRow?.textContent).toContain('34 mana required');
    expect(discoveredRow?.textContent).toContain('time: 75s');

    const herbsTab = [...popup.querySelectorAll('.workshop-page__discoveries-tab-button')].find(
      (tab) => tab.textContent === 'herbs',
    );

    herbsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(herbsTab.getAttribute('aria-selected')).toBe('true');
    expect(popup.querySelector('.workshop-page__discovery-recipe-book')?.hidden).toBe(true);
    expect(popup.querySelector('.workshop-page__discoveries-empty')?.textContent).toBe('empty');
  });

  it('keeps world chat locked until level 3', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      worldChatFacade: createWorldChatFacadeFake(),
    });

    pagesFacade.mount(stage);

    const root = stage.querySelector('.workshop-page__world-chat');
    const popup = stage.querySelector('.workshop-page__world-chat-popup');
    const button = stage.querySelector('.workshop-page__world-chat-button');

    expect(root.hidden).toBe(true);
    expect(button.disabled).toBe(true);

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(true);

    unlockWorkshopSecondaryActions(gameplayFacade, 3);
    gameplayFacade.publishSnapshot();

    expect(root.hidden).toBe(false);
    expect(button.disabled).toBe(false);

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
  });

  it('shows world chat popup and sends messages', async () => {
    const stage = document.createElement('section');
    const gameplayFacade = createWorkshopSecondaryUnlockedGameplayFacade();
    const worldChatFacade = createWorldChatFacadeFake({
      messages: [
        {
          id: '1',
          senderIdentity: 'sender-a',
          username: 'Ada',
          character: 'mira',
          playerLevel: 3,
          body: 'old hello',
          sentAtMs: 1_000,
        },
        {
          id: '2',
          senderIdentity: 'sender-b',
          username: 'Lin',
          character: 'rowan',
          playerLevel: 4,
          body: 'second hello',
          sentAtMs: 2_000,
        },
        {
          id: '3',
          senderIdentity: 'sender-c',
          username: 'Mo',
          character: 'juniper',
          playerLevel: 5,
          body: 'third hello',
          sentAtMs: 3_000,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      worldChatFacade,
    });

    pagesFacade.mount(stage);

    const popup = stage.querySelector('.workshop-page__world-chat-popup');
    const box = stage.querySelector('.workshop-page__world-chat-box');
    const button = stage.querySelector('.workshop-page__world-chat-button');

    expect(popup.hidden).toBe(true);
    expect(box.textContent).not.toContain('old hello');
    expect(box.textContent).toContain('Lin(4): second hello');
    expect(box.textContent).toContain('Mo(5): third hello');
    expect(box.querySelectorAll('.workshop-page__world-chat-message')).toHaveLength(2);
    expect(box.querySelectorAll('.workshop-page__world-chat-character-icon')).toHaveLength(2);
    expect(box.querySelector('.room-player-info-link')).toBeNull();

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
    expect(popup.querySelector('[role="dialog"]')).not.toBeNull();
    expect(popup.querySelector('.style-dialog')).not.toBeNull();
    expect(popup.querySelectorAll('.workshop-page__world-chat-message')).toHaveLength(3);
    expect(popup.querySelectorAll('.room-player-info-link')).toHaveLength(3);
    expect(popup.textContent).toContain('old hello');
    expect(popup.textContent).toContain('Lin(4): second hello');
    expect(popup.textContent).toContain('Mo(5): third hello');
    expect(popup.querySelectorAll('.workshop-page__world-chat-character-icon')).toHaveLength(3);
    expect(
      popup.querySelector('.workshop-page__world-chat-character-icon')?.getAttribute('src'),
    ).toContain('mira.png');

    const input = popup.querySelector('.workshop-page__world-chat-input');
    const form = popup.querySelector('.workshop-page__world-chat-form');

    input.value = '  hello   room  ';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(worldChatFacade.getSentMessages()).toEqual(['hello room']);
    expect(input.value).toBe('');
    expect(box.textContent).not.toContain('old hello');
    expect(box.textContent).not.toContain('second hello');
    expect(box.textContent).toContain('Mo(5): third hello');
    expect(box.textContent).toContain('wizard(1): hello room');
    expect(popup.querySelectorAll('.workshop-page__world-chat-message')).toHaveLength(4);
    expect(popup.textContent).toContain('old hello');
    expect(popup.textContent).toContain('Lin(4): second hello');
    expect(popup.textContent).toContain('Mo(5): third hello');
    expect(popup.textContent).toContain('wizard(1): hello room');

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(popup.hidden).toBe(true);

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(popup.hidden).toBe(false);

    popup
      .querySelector('.workshop-page__world-chat-close')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(true);
  });

  it('sends world chat on button release, not press start', async () => {
    const stage = document.createElement('section');
    const gameplayFacade = createWorkshopSecondaryUnlockedGameplayFacade();
    const worldChatFacade = createWorldChatFacadeFake({ messages: [] });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      worldChatFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__world-chat-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = stage.querySelector('.workshop-page__world-chat-popup');
    const input = popup.querySelector('.workshop-page__world-chat-input');
    const sendButton = popup.querySelector('.workshop-page__world-chat-send');
    const pointerDown = new window.Event('pointerdown', {
      bubbles: true,
      cancelable: true,
    });

    input.value = '  tapped   send  ';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    sendButton.dispatchEvent(pointerDown);
    await Promise.resolve();
    await Promise.resolve();

    expect(pointerDown.defaultPrevented).toBe(false);
    expect(worldChatFacade.getSentMessages()).toEqual([]);

    sendButton.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(worldChatFacade.getSentMessages()).toEqual(['tapped send']);
    expect(input.value).toBe('');
  });

  it('shows sent world chat while waiting for the server subscription row', async () => {
    const dateNow = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    const stage = document.createElement('section');
    const gameplayFacade = createWorkshopSecondaryUnlockedGameplayFacade(7);
    const playerFacade = createPlayerFacadeFake('StepDav', 'white', {
      initialCharacter: 'mira',
    });
    const worldChatFacade = createWorldChatFacadeFake({
      messages: [],
      publishOnSend: false,
    });
    const tradeAllianceFacade = createTradeAllianceFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade,
      worldChatFacade,
      tradeAllianceFacade,
    });

    try {
      pagesFacade.mount(stage);

      stage
        .querySelector('.workshop-page__world-chat-button')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      const popup = stage.querySelector('.workshop-page__world-chat-popup');
      const input = popup.querySelector('.workshop-page__world-chat-input');
      const form = popup.querySelector('.workshop-page__world-chat-form');

      input.value = '  level   20?  ';
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();

      expect(worldChatFacade.getSentMessages()).toEqual(['level 20?']);
      expect(input.value).toBe('');
      expect(popup.querySelector('.workshop-page__world-chat-status')?.textContent).toBe(
        'sent',
      );
      expect(popup.querySelectorAll('.workshop-page__world-chat-message')).toHaveLength(1);
      expect(popup.textContent).toContain('[VOID] StepDav(7): level 20?');
      expect(
        popup.querySelector('.workshop-page__world-chat-character-icon')?.getAttribute('src'),
      ).toContain('mira.png');

      worldChatFacade.publishServerMessage({
        senderIdentity: 'sender-self',
        username: 'StepDav',
        character: 'mira',
        playerLevel: 7,
        body: 'level 20?',
        allianceTag: 'VOID',
        sentAtMs: 10_500,
      });

      expect(popup.querySelectorAll('.workshop-page__world-chat-message')).toHaveLength(1);
      expect(popup.textContent).toContain('[VOID] StepDav(7): level 20?');
    } finally {
      pagesFacade.unmount();
      dateNow.mockRestore();
    }
  });

  it('keeps sent world chat through refresh while waiting for the server subscription row', async () => {
    const dateNow = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'localStorage',
    );
    const chatStorage = createMemoryStorage();
    const gameplayFacade = createWorkshopSecondaryUnlockedGameplayFacade(7);
    const playerFacade = createPlayerFacadeFake('StepDav', 'white', {
      initialCharacter: 'mira',
    });
    const worldChatFacade = createWorldChatFacadeFake({
      messages: [],
      publishOnSend: false,
    });

    const mountOpenChat = () => {
      const stage = document.createElement('section');
      const pagesFacade = new PagesFacade({
        gameplayFacade,
        playerFacade,
        worldChatFacade,
      });

      pagesFacade.mount(stage);
      stage
        .querySelector('.workshop-page__world-chat-button')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      return {
        pagesFacade,
        stage,
        popup: stage.querySelector('.workshop-page__world-chat-popup'),
      };
    };

    let firstMount = null;
    let secondMount = null;

    try {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: chatStorage,
      });
      firstMount = mountOpenChat();

      const input = firstMount.popup.querySelector('.workshop-page__world-chat-input');
      const form = firstMount.popup.querySelector('.workshop-page__world-chat-form');

      input.value = '  still   here  ';
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();

      expect(firstMount.popup.textContent).toContain('StepDav(7): still here');
      expect(chatStorage.getItem(WORKSHOP_CHAT_PENDING_STORAGE_KEY)).toContain('still here');

      firstMount.pagesFacade.unmount();
      firstMount.stage.remove();
      firstMount = null;

      secondMount = mountOpenChat();

      expect(secondMount.popup.querySelectorAll('.workshop-page__world-chat-message')).toHaveLength(
        1,
      );
      expect(secondMount.popup.textContent).toContain('StepDav(7): still here');

      worldChatFacade.publishServerMessage({
        senderIdentity: 'sender-self',
        username: 'StepDav',
        character: 'mira',
        playerLevel: 7,
        body: 'still here',
        sentAtMs: 10_500,
      });

      expect(secondMount.popup.querySelectorAll('.workshop-page__world-chat-message')).toHaveLength(
        1,
      );
      expect(chatStorage.getItem(WORKSHOP_CHAT_PENDING_STORAGE_KEY)).toBeNull();
    } finally {
      firstMount?.pagesFacade.unmount();
      secondMount?.pagesFacade.unmount();
      if (originalLocalStorageDescriptor) {
        Object.defineProperty(window, 'localStorage', originalLocalStorageDescriptor);
      } else {
        delete window.localStorage;
      }
      dateNow.mockRestore();
    }
  });

  it('shows world chat rate-limit failures without clearing the typed message', async () => {
    const stage = document.createElement('section');
    const gameplayFacade = createWorkshopSecondaryUnlockedGameplayFacade();
    const worldChatFacade = createWorldChatFacadeFake({
      messages: [],
      sendResult: {
        ok: false,
        reason: 'rate_limited',
      },
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      worldChatFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__world-chat-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = stage.querySelector('.workshop-page__world-chat-popup');
    const input = popup.querySelector('.workshop-page__world-chat-input');
    const form = popup.querySelector('.workshop-page__world-chat-form');

    input.value = 'too fast';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(worldChatFacade.getSentMessages()).toEqual([]);
    expect(input.value).toBe('too fast');
    expect(popup.querySelector('.workshop-page__world-chat-status')?.textContent).toBe(
      'wait before sending',
    );
  });

  it('keeps world chat send failures visible through snapshot refreshes', async () => {
    const stage = document.createElement('section');
    const gameplayFacade = createWorkshopSecondaryUnlockedGameplayFacade();
    const worldChatFacade = createWorldChatFacadeFake({
      messages: [],
      sendResult: {
        ok: false,
        reason: 'rate_limited',
      },
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      worldChatFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__world-chat-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = stage.querySelector('.workshop-page__world-chat-popup');
    const input = popup.querySelector('.workshop-page__world-chat-input');
    const form = popup.querySelector('.workshop-page__world-chat-form');
    const status = popup.querySelector('.workshop-page__world-chat-status');

    input.value = 'too fast';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(status?.textContent).toBe('wait before sending');

    worldChatFacade.publishSnapshot();

    expect(status?.textContent).toBe('wait before sending');

    input.value = 'next try';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(status?.textContent).toBe('');
  });

  it('shows actionable world chat send failures', async () => {
    const failures = [
      ['chat_locked', 'level syncing'],
      ['account_in_use', 'open elsewhere'],
      ['maintenance', 'maintenance'],
      ['send_failed', 'try again'],
    ];

    for (const [reason, statusText] of failures) {
      const stage = document.createElement('section');
      const gameplayFacade = createWorkshopSecondaryUnlockedGameplayFacade();
      const worldChatFacade = createWorldChatFacadeFake({
        messages: [],
        sendResult: {
          ok: false,
          reason,
        },
      });
      const pagesFacade = new PagesFacade({
        gameplayFacade,
        playerFacade: createPlayerFacadeFake(),
        worldChatFacade,
      });

      pagesFacade.mount(stage);

      stage
        .querySelector('.workshop-page__world-chat-button')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      const popup = stage.querySelector('.workshop-page__world-chat-popup');
      const input = popup.querySelector('.workshop-page__world-chat-input');
      const form = popup.querySelector('.workshop-page__world-chat-form');

      input.value = 'hello';
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();

      expect(worldChatFacade.getSentMessages()).toEqual([]);
      expect(input.value).toBe('hello');
      expect(popup.querySelector('.workshop-page__world-chat-status')?.textContent).toBe(
        statusText,
      );

      pagesFacade.unmount();
    }
  });

  it('sends alliance chat through the alliance chat reducer facade', async () => {
    const stage = document.createElement('section');
    const gameplayFacade = createWorkshopSecondaryUnlockedGameplayFacade();
    const worldChatFacade = createWorldChatFacadeFake({ messages: [] });
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      allianceChatMessages: [
        {
          id: '1',
          senderIdentity: 'sender-a',
          username: 'Ada',
          playerLevel: 4,
          body: 'alliance hello',
          allianceTag: 'VOID',
          sentAtMs: 1_000,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      worldChatFacade,
      tradeAllianceFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__world-chat-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = stage.querySelector('.workshop-page__world-chat-popup');
    const allianceTab = [...popup.querySelectorAll('.workshop-page__world-chat-tab-button')]
      .find((button) => button.textContent === 'alliance chat');
    allianceTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const input = popup.querySelector('.workshop-page__world-chat-input');
    const form = popup.querySelector('.workshop-page__world-chat-form');

    input.value = '  hello   alliance  ';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(worldChatFacade.getSentMessages()).toEqual([]);
    expect(tradeAllianceFacade.getSentAllianceMessages()).toEqual(['hello alliance']);
    expect(input.value).toBe('');
    expect(popup.textContent).toContain('alliance hello');
    expect(popup.textContent).toContain('hello alliance');
    const senderLabel = popup.querySelector('.workshop-page__world-chat-name');
    expect(
      [...senderLabel.childNodes].map((node) =>
        node.nodeType === window.Node.TEXT_NODE ? node.textContent : node.className,
      ),
    ).toEqual([
      'style-player-character-icon workshop-page__world-chat-character-icon',
      'workshop-page__alliance-tag',
      ' ',
      'room-player-info-link workshop-page__world-chat-player-link',
      '(4)',
      ': ',
    ]);
  });

  it('keeps alliance chat send failures visible through snapshot refreshes', async () => {
    const stage = document.createElement('section');
    const gameplayFacade = createWorkshopSecondaryUnlockedGameplayFacade();
    const worldChatFacade = createWorldChatFacadeFake({ messages: [] });
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      allianceChatMessages: [],
      sendChatResult: {
        ok: false,
        reason: 'no_alliance',
      },
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      worldChatFacade,
      tradeAllianceFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__world-chat-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = stage.querySelector('.workshop-page__world-chat-popup');
    const allianceTab = [...popup.querySelectorAll('.workshop-page__world-chat-tab-button')]
      .find((button) => button.textContent === 'alliance chat');
    allianceTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const input = popup.querySelector('.workshop-page__world-chat-input');
    const form = popup.querySelector('.workshop-page__world-chat-form');
    const status = popup.querySelector('.workshop-page__world-chat-status');

    input.value = 'hello alliance';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(status?.textContent).toBe('join alliance first');

    tradeAllianceFacade.publishSnapshot();

    expect(status?.textContent).toBe('join alliance first');
  });

  it('scrolls world chat popup to the newest message after opening', () => {
    const stage = document.createElement('section');
    const callbacks = [];
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

    globalThis.requestAnimationFrame = (callback) => {
      callbacks.push(callback);
      return callbacks.length;
    };
    globalThis.cancelAnimationFrame = () => {};

    try {
      const worldChatFacade = createWorldChatFacadeFake({
        messages: Array.from({ length: 12 }, (_, index) => ({
          id: String(index + 1),
          senderIdentity: `sender-${index}`,
          username: `wizard${index + 1}`,
          playerLevel: 1,
          body: `message ${index + 1}`,
          sentAtMs: (index + 1) * 1_000,
        })),
      });
      const gameplayFacade = createWorkshopSecondaryUnlockedGameplayFacade();
      const pagesFacade = new PagesFacade({
        gameplayFacade,
        playerFacade: createPlayerFacadeFake(),
        worldChatFacade,
      });

      pagesFacade.mount(stage);

      const popup = stage.querySelector('.workshop-page__world-chat-popup');
      const button = stage.querySelector('.workshop-page__world-chat-button');
      const messages = stage.querySelector('.workshop-page__world-chat-messages');
      let laidOut = false;

      Object.defineProperty(messages, 'clientHeight', { value: 90, configurable: true });
      Object.defineProperty(messages, 'scrollHeight', {
        configurable: true,
        get: () => (laidOut ? 360 : 0),
      });

      button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(popup.hidden).toBe(false);
      expect(messages.scrollTop).toBe(0);

      laidOut = true;
      while (callbacks.length) {
        callbacks.shift()?.();
      }

      expect(messages.scrollTop).toBe(360);
    } finally {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
      globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });

  it('opens world chat popup from empty preview', () => {
    const stage = document.createElement('section');
    const worldChatFacade = createWorldChatFacadeFake({ messages: [] });
    const gameplayFacade = createWorkshopSecondaryUnlockedGameplayFacade();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      worldChatFacade,
    });

    pagesFacade.mount(stage);

    const popup = stage.querySelector('.workshop-page__world-chat-popup');
    const preview = stage.querySelector('.workshop-page__world-chat-preview');

    expect(preview.textContent).toBe('no messages yet');

    preview.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
  });

  it('opens world chat popup from preview message rows', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createWorkshopSecondaryUnlockedGameplayFacade();
    const worldChatFacade = createWorldChatFacadeFake({
      messages: [
        {
          id: '1',
          senderIdentity: 'sender-a',
          username: 'Ada',
          character: 'mira',
          playerLevel: 3,
          body: 'old hello',
          sentAtMs: 1_000,
        },
        {
          id: '2',
          senderIdentity: 'sender-b',
          username: 'Lin',
          character: 'rowan',
          playerLevel: 4,
          body: 'second hello',
          sentAtMs: 2_000,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      worldChatFacade,
    });

    pagesFacade.mount(stage);

    const popup = stage.querySelector('.workshop-page__world-chat-popup');
    const preview = stage.querySelector('.workshop-page__world-chat-preview');
    const previewRow = preview.querySelector('.workshop-page__world-chat-message');

    expect(preview.querySelector('.room-player-info-link')).toBeNull();
    expect(popup.hidden).toBe(true);

    previewRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
  });

  it('shows compact world chat message ages', () => {
    const nowMs = 1_000 + 3 * 24 * 60 * 60 * 1000 + 60_000;
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(nowMs);
    const stage = document.createElement('section');
    const gameplayFacade = createWorkshopSecondaryUnlockedGameplayFacade();
    const worldChatFacade = createWorldChatFacadeFake({
      messages: [
        {
          id: '1',
          senderIdentity: 'sender-a',
          username: 'Ada',
          playerLevel: 3,
          body: 'old hello',
          sentAtMs: 1_000,
        },
        {
          id: '2',
          senderIdentity: 'sender-b',
          username: 'Lin',
          playerLevel: 4,
          body: 'hour hello',
          sentAtMs: nowMs - 89 * 60_000,
        },
        {
          id: '3',
          senderIdentity: 'sender-c',
          username: 'Mira',
          playerLevel: 5,
          body: 'minute hello',
          sentAtMs: nowMs - 59 * 60_000,
        },
        {
          id: '4',
          senderIdentity: 'sender-d',
          username: 'Sol',
          playerLevel: 6,
          body: 'fresh hello',
          sentAtMs: nowMs - 59_000,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      worldChatFacade,
    });

    try {
      pagesFacade.mount(stage);

      const popup = stage.querySelector('.workshop-page__world-chat-popup');
      const rows = popup.querySelectorAll('.workshop-page__world-chat-message');

      expect(rows[0].querySelector('.workshop-page__world-chat-age')?.textContent).toBe(
        '3d ago',
      );
      expect(rows[0].querySelector('.workshop-page__world-chat-content')?.textContent).toBe(
        'Ada(3): old hello',
      );
      expect(rows[1].querySelector('.workshop-page__world-chat-age')?.textContent).toBe(
        '1h ago',
      );
      expect(rows[2].querySelector('.workshop-page__world-chat-age')?.textContent).toBe(
        '59m ago',
      );
      expect(rows[3].querySelector('.workshop-page__world-chat-age')?.textContent).toBe(
        'now',
      );
    } finally {
      pagesFacade.unmount();
      nowSpy.mockRestore();
    }
  });

  it('marks system world chat messages and sender label', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createWorkshopSecondaryUnlockedGameplayFacade();
    const worldChatFacade = createWorldChatFacadeFake({
      messages: [
        {
          id: '1',
          senderIdentity: 'sender-a',
          username: 'system',
          playerLevel: 0,
          body: 'Ada researched mana tonic',
          sentAtMs: 1_000,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      worldChatFacade,
    });

    pagesFacade.mount(stage);

    const row = stage.querySelector('.workshop-page__world-chat-message');

    expect(row?.classList.contains('workshop-page__world-chat-message--system')).toBe(true);
    expect(row?.querySelector('.workshop-page__world-chat-name')?.textContent).toBe(
      'system: ',
    );
    expect(row?.querySelector('.workshop-page__world-chat-character-icon')).toBeNull();
    expect(row?.textContent).toContain('system: Ada researched mana tonic');
    expect(row?.querySelector('.workshop-page__world-chat-age')).not.toBeNull();
  });

  it('marks potion recipe discovery chat announcements', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createWorkshopSecondaryUnlockedGameplayFacade();
    const worldChatFacade = createWorldChatFacadeFake({
      messages: [
        {
          id: '1',
          senderIdentity: 'sender-a',
          username: 'system',
          playerLevel: 0,
          body: 'ftw unlocked the recipe of ashen memory: 1 sage, 1 lavender, 1 frostmoss',
          sentAtMs: 1_000,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      worldChatFacade,
    });

    pagesFacade.mount(stage);

    const row = stage.querySelector('.workshop-page__world-chat-message');

    expect(row?.classList.contains('workshop-page__world-chat-message--system')).toBe(true);
    expect(
      row?.classList.contains('workshop-page__world-chat-message--recipe-discovery'),
    ).toBe(true);
    expect(row?.textContent).toContain(
      'system: ftw unlocked the recipe of ashen memory: 1 sage, 1 lavender, 1 frostmoss',
    );
  });

  it('orders rooms as Brewing, Garden, Workshop, Research, Market with Workshop default', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    unlockWorldNotice(gameplayFacade);
    markSeedResearchComplete(gameplayFacade, 'sageSeed', 'mintSeed');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
      tutorialStorage: createCompletedTutorialStorage(),
    });

    pagesFacade.mount(stage);

    clickRoomTab(stage, 'garden');

    expect(pagesFacade.getCurrentPageId()).toBe('garden');
    expect(stage.querySelector('.garden-page')).not.toBeNull();
    expect(stage.querySelector('.garden-page__wall')).not.toBeNull();
    expect(stage.querySelector('.garden-page__floor')).not.toBeNull();
    expect(stage.querySelector('.garden-page__ui-layer')).not.toBeNull();
    expect(stage.querySelector('.garden-page__content')).not.toBeNull();
    expect(stage.querySelector('.garden-page__content')?.classList.contains('style-page-scroll')).toBe(
      true,
    );
    expect(stage.querySelector('.garden-page__plot')?.parentElement).toBe(
      stage.querySelector('.garden-page__ui-layer'),
    );
    expect(stage.querySelector('.garden-page__seeds')?.hidden).toBe(true);
    expect(stage.querySelector('.garden-page__herbs')?.hidden).toBe(true);
    expect(
      stage.querySelector('.garden-page__content > .workshop-page__world-notice'),
    ).toBeNull();
    expect(stage.querySelector('.workshop-page__world-notice-open')).toBeNull();
    expect(stage.querySelector('.room-bottom-panel__tab.is-selected')?.dataset.pageId).toBe(
      'garden',
    );

    clickRoomTab(stage, 'brewing');

    expect(pagesFacade.getCurrentPageId()).toBe('brewing');
    expect(stage.querySelector('.brewing-page')).not.toBeNull();
    expect(stage.querySelector('.brewing-page__wall')).not.toBeNull();
    expect(stage.querySelector('.brewing-page__floor')).not.toBeNull();
    expect(stage.querySelector('.brewing-page__ui-layer')).not.toBeNull();
    expect(stage.querySelector('.brewing-page__world-shell')).not.toBeNull();
    expect(stage.querySelector('.brewing-page__herbs')).not.toBeNull();
    expect(stage.querySelector('.brewing-page__herbs')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__cauldron')).not.toBeNull();
    expect(stage.querySelector('.brewing-page__guide')).toBeNull();
    expect(stage.querySelector('.brewing-page__cauldron')?.textContent).toContain('empty');
    expect(stage.querySelector('.brewing-page__recipes-button')).toBeNull();
    expect(stage.querySelector('.brewing-page__potions-button')).toBeNull();
    expect(stage.querySelector('.brewing-page__actions')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__action-button')?.textContent).toBe('');
    expect(stage.querySelector('.brewing-page__cauldron-select-recipe-text')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__actions')?.classList.contains('is-centered')).toBe(
      true,
    );
    expect(stage.querySelector('.brewing-page__clear-button')).toBeNull();
    expect(stage.querySelector('.room-bottom-panel__tab.is-selected')?.dataset.pageId).toBe(
      'brewing',
    );

    clickRoomTab(stage, 'garden');

    expect(pagesFacade.getCurrentPageId()).toBe('garden');
    expect(stage.querySelector('.garden-page')).not.toBeNull();

    clickRoomTab(stage, 'workshop');

    expect(pagesFacade.getCurrentPageId()).toBe('workshop');
    expect(stage.querySelector('.workshop-page')).not.toBeNull();
    expect(stage.querySelector('.workshop-page__world-notice-open')).not.toBeNull();
    expect(stage.querySelector('.room-bottom-panel__tab.is-selected')?.dataset.pageId).toBe(
      'workshop',
    );

    clickRoomTab(stage, 'research');

    expect(pagesFacade.getCurrentPageId()).toBe('research');
    expect(stage.querySelector('.research-page')).not.toBeNull();
    expect(stage.querySelector('.research-page__content')).not.toBeNull();
    expect(stage.querySelector('.research-page__content')?.textContent).toContain(
      'seed unlock researches',
    );
    expect(stage.querySelector('.research-page__content')?.textContent).not.toContain(
      'mana production rate',
    );
    expect(stage.querySelector('.research-page__content')?.textContent).toContain(
      'sage seed',
    );
    expect(stage.querySelector('.research-page__content')?.textContent).toContain('x2 summon');
    expect(stage.querySelector('.research-page__content')?.textContent).toContain('20 coin');
    expect(stage.querySelector('.research-page__content')?.textContent).toContain('mana tonic');
    expect(
      [...stage.querySelectorAll('.research-page__tab-button')].map(
        (button) => button.textContent,
      ),
    ).toEqual(['regular research', 'automation', 'advanced research', 'emerald research']);
    expect(stage.querySelector('.research-page__box-list')?.nextElementSibling).toBe(
      stage.querySelector('.research-page__tabs'),
    );
    expect(stage.querySelector('.research-page__content')?.textContent).not.toContain(
      'auto plant',
    );
    expect(stage.querySelector('.room-bottom-panel__tab.is-selected')?.dataset.pageId).toBe(
      'research',
    );

    clickRoomTab(stage, 'shop');

    expect(pagesFacade.getCurrentPageId()).toBe('shop');
    expect(stage.querySelector('.shop-page')).not.toBeNull();
    expect(stage.querySelector('.shop-page')?.getAttribute('aria-label')).toBe('Market room');
    expect(
      [...stage.querySelectorAll('.shop-page__market-tab-button')].map(
        (button) => button.textContent,
      ),
    ).toEqual(['trader market', 'player market', 'crystals']);
    expect(
      stage
        .querySelector('.shop-page__market-tab-button')
        ?.getAttribute('aria-selected'),
    ).toBe('true');
    expect(stage.querySelector('.shop-page__shelf')).not.toBeNull();
    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain(
      'trader demand market',
    );
    expect(stage.querySelector('.shop-page__direct-sell-box')).not.toBeNull();
    expect(stage.querySelector('.shop-page__direct-sell-box')?.textContent).toContain(
      'fast sell',
    );
    expect(stage.querySelector('.shop-page__stock')).not.toBeNull();
    expect(stage.querySelector('.shop-page__stock')?.textContent).toContain(
      'trader stock market',
    );
    expect(stage.querySelector('.shop-page__market-panel--crystals')?.hidden).toBe(true);

    const crystalsTab = [...stage.querySelectorAll('.shop-page__market-tab-button')].find(
      (button) => button.textContent === 'crystals',
    );
    expect(
      stage.querySelector('.room-bottom-panel__tab[data-page-id="shop"]')?.dataset.notification,
    ).toBe('true');
    expect(crystalsTab?.dataset.notification).toBe('true');
    crystalsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__market-panel--crystals')?.hidden).toBe(false);
    const coinOffer = stage.querySelector('.shop-page__coin-offer');
    expect(coinOffer).not.toBeNull();
    expect(coinOffer?.querySelector('.shop-page__coin-offer-reward')?.textContent).toBe(
      '20 coin',
    );
    const coinCollectButton = coinOffer?.querySelector('.shop-page__coin-offer-action');
    expect(coinCollectButton?.textContent).toBe('collect');
    expect(coinCollectButton?.disabled).toBe(false);
    expect(coinCollectButton?.dataset.notification).toBe('true');

    coinCollectButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(gameplayFacade.getSnapshot().coin.current).toBe(20);
    expect(coinCollectButton?.textContent).toBe('2h');
    expect(coinCollectButton?.disabled).toBe(true);
    expect(coinCollectButton?.dataset.notification).toBeUndefined();
    expect(crystalsTab?.dataset.notification).toBeUndefined();
    expect(stage.querySelector('.shop-page__crystal-offers')).not.toBeNull();
    expect(stage.querySelector('.shop-page__crystal-offers')?.textContent).toContain(
      'crystals',
    );
    expect(stage.querySelector('.shop-page__crystal-offers')?.textContent).not.toContain('each');
    expect(stage.querySelector('.shop-page__crystal-offers')?.textContent).not.toContain('note');
    expect(stage.querySelector('.shop-page__crystal-offers')?.textContent).not.toContain('base');
    expect(
      [...stage.querySelectorAll('.shop-page__crystal-row:not(.shop-page__crystal-row--header)')]
        .map((row) => row.textContent),
    ).toEqual([
      '1 crystal$4.99',
      '2 crystals$8.99',
      '5 crystals$19.99',
      '10 crystals$36.99',
      '20 crystals$69.99',
      '50 crystals$159.99',
    ]);
    expect(
      stage.querySelector('.shop-page__crystal-row[data-crystal-count="50"]')?.getAttribute(
        'aria-label',
      ),
    ).toBe('50 crystals, $159.99');
    expect(
      stage
        .querySelector(
          '.shop-page__crystal-row[data-crystal-count="50"] .style-resource-label--crystal .style-resource-label__icon',
        )
        ?.dataset.assetAtlasFrame,
    ).toBe('resource:crystal');
    const crystalPriceButton = stage.querySelector(
      '.shop-page__crystal-row[data-crystal-count="50"] .shop-page__crystal-price',
    );
    expect(crystalPriceButton?.tagName).toBe('BUTTON');
    expect(stage.querySelector('.shop-page__crystal-support-popup')?.hidden).toBe(true);

    crystalPriceButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const crystalSupportPopup = stage.querySelector('.shop-page__crystal-support-popup');
    expect(crystalSupportPopup?.hidden).toBe(false);
    expect(
      crystalSupportPopup?.querySelector('.shop-page__crystal-support-message')?.textContent,
    ).toBe(
      'thank you for trying to support the project but the transactions are not yet available <3',
    );

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(crystalSupportPopup?.hidden).toBe(true);
    expect(stage.querySelector('.room-bottom-panel__tab.is-selected')?.dataset.pageId).toBe(
      'shop',
    );

    clickRoomTab(stage, 'research');

    expect(pagesFacade.getCurrentPageId()).toBe('research');
    expect(stage.querySelector('.research-page')).not.toBeNull();

    clickRoomTab(stage, 'workshop');

    expect(pagesFacade.getCurrentPageId()).toBe('workshop');
    expect(stage.querySelector('.workshop-page')).not.toBeNull();

    clickRoomTab(stage, 'garden');

    expect(pagesFacade.getCurrentPageId()).toBe('garden');
    expect(stage.querySelector('.garden-page')).not.toBeNull();

    clickRoomTab(stage, 'brewing');

    expect(pagesFacade.getCurrentPageId()).toBe('brewing');
    expect(stage.querySelector('.brewing-page')).not.toBeNull();
  });

  it('collapses Brewing herbs to three two-herb rows and expands to all rows', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);

    gameplayFacade.getSnapshot().brewing.herbs.push(
      {
        itemTypeId: 1003,
        key: 'nettleHerb',
        label: 'nettle',
        kind: 'herb',
        quantity: 1,
        stagedQuantity: 0,
        availableQuantity: 1,
      },
      {
        itemTypeId: 1004,
        key: 'lavenderHerb',
        label: 'lavender',
        kind: 'herb',
        quantity: 1,
        stagedQuantity: 0,
        availableQuantity: 1,
      },
      {
        itemTypeId: 1005,
        key: 'briarHerb',
        label: 'briar',
        kind: 'herb',
        quantity: 1,
        stagedQuantity: 0,
        availableQuantity: 1,
      },
      {
        itemTypeId: 1006,
        key: 'glowcapHerb',
        label: 'glowcap',
        kind: 'herb',
        quantity: 1,
        stagedQuantity: 0,
        availableQuantity: 1,
      },
      {
        itemTypeId: 1007,
        key: 'mandrakeHerb',
        label: 'mandrake',
        kind: 'herb',
        quantity: 1,
        stagedQuantity: 0,
        availableQuantity: 1,
      },
    );
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'brewing');

    const visibleHerbRows = () =>
      [...stage.querySelectorAll('.brewing-page__herb-row')].filter((row) => !row.hidden);

    expect(stage.querySelectorAll('.brewing-page__herb-row')).toHaveLength(7);
    expect(stage.querySelector('.brewing-page__herbs')?.hidden).toBe(true);
    stage
      .querySelector(
        '.brewing-page__inventory-button--herbs .room-inventory-panel-button__open',
      )
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__herbs')?.hidden).toBe(false);
    expect(visibleHerbRows()).toHaveLength(6);
    expect(stage.querySelector('.brewing-page__herbs-count')).toBeNull();
    expect(stage.querySelector('.brewing-page__herbs-toggle')?.textContent).toBe('expand');
    expect(stage.querySelector('.brewing-page__herbs-toggle')?.getAttribute('aria-expanded')).toBe(
      'false',
    );

    stage
      .querySelector('.brewing-page__herbs-toggle')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(visibleHerbRows()).toHaveLength(7);
    expect(stage.querySelector('.brewing-page__herbs-count')).toBeNull();
    expect(stage.querySelector('.brewing-page__herbs-toggle')?.textContent).toBe('collapse');
    expect(stage.querySelector('.brewing-page__herbs-toggle')?.getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  it('shows each unlocked Brewing cauldron box from the snapshot', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const brewing = gameplayFacade.getSnapshot().brewing;
    brewing.cauldrons = [
      {
        ...brewing,
        cauldronIndex: 0,
        cauldronNumber: 1,
        ingredients: [],
        activeBrew: null,
      },
      {
        ...brewing,
        cauldronIndex: 1,
        cauldronNumber: 2,
        ingredients: [],
        activeBrew: null,
      },
      {
        ...brewing,
        cauldronIndex: 2,
        cauldronNumber: 3,
        ingredients: [],
        activeBrew: null,
      },
    ];
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'brewing');

    expect(
      [
        ...stage.querySelectorAll(
          '.brewing-page__cauldron-recipe-box > .style-box__title',
        ),
      ].map((title) => title.textContent),
    ).toEqual(['cauldron 1 ☆☆☆', 'cauldron 2 ☆☆☆', 'cauldron 3 ☆☆☆']);
  });

  it('shows the next Brewing cauldron as a buyable locked box', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const brewing = gameplayFacade.getSnapshot().brewing;
    brewing.maxCauldrons = 3;
    brewing.configuredMaxCauldrons = 3;
    brewing.cauldronCosts = [0, 1, 3];
    brewing.unlockedCauldrons = 1;
    brewing.nextCauldronNumber = 2;
    brewing.nextCauldronCost = 1;
    brewing.nextCauldronLockedByLevel = false;
    brewing.nextCauldronRequiresLevel = null;
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'brewing');

    let cauldrons = [...stage.querySelectorAll('.brewing-page__cauldron')];
    expect(cauldrons).toHaveLength(2);
    expect(cauldrons[1].classList.contains('is-locked')).toBe(true);
    expect(cauldrons[1].classList.contains('is-buyable')).toBe(false);
    expect(cauldrons[1].querySelector('.brewing-page__cauldron-bubble')?.hidden).toBe(true);
    expect(cauldrons[1].querySelector('.brewing-page__cauldron-items')?.hidden).toBe(true);
    expect(cauldrons[1].querySelector('.brewing-page__action-button')?.textContent).toContain(
      'buy 1 coin',
    );
    expect(cauldrons[1].querySelector('.brewing-page__action-button')?.disabled).toBe(true);

    gameplayFacade.setCoin(1);
    expect(cauldrons[1].classList.contains('is-buyable')).toBe(true);
    expect(cauldrons[1].querySelector('.brewing-page__action-button')?.disabled).toBe(false);
    cauldrons[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    cauldrons = [...stage.querySelectorAll('.brewing-page__cauldron')];
    expect(cauldrons).toHaveLength(3);
    expect(cauldrons[1].classList.contains('is-locked')).toBe(false);
    expect(cauldrons[1].querySelector('.style-box__title')?.textContent).toBe(
      'cauldron 2 ☆☆☆',
    );
    expect(cauldrons[2].querySelector('.style-box__title')?.textContent).toBe(
      'cauldron 3 ☆☆☆',
    );
    expect(cauldrons[2].classList.contains('is-locked')).toBe(true);
  });

  it('opens the cauldron dialog from the clicked world cauldron', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    gameplayFacade.setCoin(3);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');

    const brewing = gameplayFacade.getSnapshot().brewing;
    brewing.cauldrons = [0, 1, 2].map((cauldronIndex) => ({
      ...brewing,
      cauldronIndex,
      cauldronNumber: cauldronIndex + 1,
      ingredients: [],
      activeBrew:
        cauldronIndex === 1
          ? {
              key: 'manaTonic',
              label: 'mana tonic',
              phase: 'bottling',
              canStartBottling: false,
              canCollect: false,
              remainingMs: 500,
              totalMs: 1_000,
              progress: 0.5,
            }
          : null,
    }));
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'brewing');

    const cauldrons = [
      ...stage.querySelectorAll('.brewing-page__cauldron:not(.is-locked)'),
    ];

    expect(cauldrons).toHaveLength(3);

    cauldrons[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = stage.querySelector('.brewing-page__recipes-popup');
    expect(popup.hidden).toBe(false);
    expect(popup.querySelector('.style-box__title')?.textContent).toBe('recipes: learned 1/2');
    expect(stage.querySelector('.brewing-page__cauldron.is-current')?.dataset.cauldronIndex).toBe(
      '1',
    );

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(popup.hidden).toBe(true);
  });

  it('shows select recipe control after recipe unlock', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'brewing');

    const selectRecipeButton = stage.querySelector('.brewing-page__cauldron-select-recipe-text');
    const actions = stage.querySelector('.brewing-page__actions');

    expect(selectRecipeButton?.hidden).toBe(true);
    expect(actions?.classList.contains('is-centered')).toBe(true);

    gameplayFacade.setCoin(3);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');

    expect(selectRecipeButton?.hidden).toBe(false);
    expect(actions?.classList.contains('is-centered')).toBe(false);

    stage
      .querySelector('.brewing-page__cauldron')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = stage.querySelector('.brewing-page__recipes-popup');
    expect(popup.hidden).toBe(false);
    expect(popup.querySelector('.style-box__title')?.textContent).toBe('recipes: learned 1/2');
    expect(popup.textContent).not.toContain('auto brewing');
    expect(popup.querySelector('.brewing-page__auto-summary')).toBeNull();

    popup
      .querySelector('.brewing-page__recipe-select-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
    expect(popup.querySelector('.brewing-page__recipe-select-button')?.textContent).toBe(
      'selected',
    );

    popup
      .querySelector('.brewing-page__recipe-row.is-selected .brewing-page__recipe-select-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.querySelector('.brewing-page__recipe-select-button')?.textContent).toBe(
      'select',
    );
  });

  it('switches the research page between regular, automation, advanced, and emerald research', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 3);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'research');

    const automationTab = [...stage.querySelectorAll('.research-page__tab-button')].find(
      (button) => button.textContent === 'automation',
    );
    const advancedTab = [...stage.querySelectorAll('.research-page__tab-button')].find(
      (button) => button.textContent === 'advanced research',
    );
    const emeraldTab = [...stage.querySelectorAll('.research-page__tab-button')].find(
      (button) => button.textContent === 'emerald research',
    );

    expect(automationTab).not.toBeNull();
    expect(advancedTab).not.toBeNull();
    expect(emeraldTab).not.toBeNull();
    expect(stage.querySelector('.research-page__content')?.textContent).toContain(
      'seed unlock researches',
    );

    automationTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(automationTab.getAttribute('aria-selected')).toBe('true');
    expect(stage.querySelector('.research-page__content')?.textContent).toContain(
      'auto plant tile research',
    );
    expect(stage.querySelector('.research-page__content')?.textContent).toContain(
      'auto plant tile 1',
    );
    expect(stage.querySelector('.research-page__content')?.textContent).toContain(
      '1 crystal',
    );
    expect(stage.querySelector('.research-page__content')?.textContent).not.toContain(
      'seed unlock researches',
    );

    advancedTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(advancedTab.getAttribute('aria-selected')).toBe('true');
    expect(stage.querySelector('.research-page__content')?.textContent).toContain(
      'cauldron brewing research',
    );
    expect(stage.querySelector('.research-page__content')?.textContent).toContain(
      'cauldron 1 brewing lvl 1',
    );
    expect(stage.querySelector('.research-page__content')?.textContent).toContain('1 ruby');
    expect(stage.querySelector('.research-page__content')?.textContent).not.toContain(
      'auto plant tile research',
    );

    emeraldTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(emeraldTab.getAttribute('aria-selected')).toBe('true');
    expect(stage.querySelector('.research-page__content')?.textContent).toContain(
      'plot level up',
    );
    expect(stage.querySelector('.research-page__content')?.textContent).toContain(
      'plot 1 lvl 2',
    );
    expect(stage.querySelector('.research-page__content')?.textContent).toContain(
      '1 emerald',
    );
    expect(stage.querySelector('.research-page__content')?.textContent).not.toContain(
      'cauldron 1 brewing lvl 1',
    );
  });

  it('shows Brewing recipes popup with unlocked and locked recipes', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    gameplayFacade.setCoin(3);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');
    gameplayFacade.getSnapshot().inventory = [
      {
        itemTypeId: 2001,
        key: 'manaTonic',
        label: 'mana tonic',
        kind: 'potion',
        quantity: 2,
      },
    ];
    pagesFacade.mount(stage);
    clickRoomTab(stage, 'brewing');

    const button = stage.querySelector('.brewing-page__cauldron-select-recipe-text');
    const popup = stage.querySelector('.brewing-page__recipes-popup');

    expect(stage.querySelector('.brewing-page__recipes-button')).toBeNull();
    expect(button?.textContent).toBe('recipes');
    expect(stage.querySelector('.brewing-page__potions-button')).toBeNull();
    expect(popup.hidden).toBe(true);

    stage
      .querySelector('.brewing-page__cauldron')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
    expect(popup.querySelector('[role="dialog"]')).not.toBeNull();
    expect(popup.querySelector('.style-box__title')?.textContent).toBe('recipes: learned 1/2');
    expect(popup.querySelector('.brewing-page__recipes-close')?.textContent).toBe('close');
    expect(popup.querySelector('.brewing-page__recipe-group-title')).toBeNull();
    expect(popup.textContent).not.toContain('unlocked recipes');
    expect(popup.textContent).not.toContain('auto brewing');
    expect(popup.textContent).toContain('mana tonic');
    expect(popup.querySelector('.brewing-page__recipe-ingredient-row')).not.toBeNull();
    expect(popup.querySelector('.brewing-page__recipe-cost')).not.toBeNull();
    expect(popup.textContent).toContain('12 mana required');
    expect(popup.textContent).not.toContain('ingredients:');
    const ingredientRow = popup.querySelector('.brewing-page__recipe-ingredient-row');
    expect(
      ingredientRow?.querySelector('.brewing-page__recipe-ingredient-required')?.textContent,
    ).toBe('- 3 sage');
    expect(
      ingredientRow?.querySelector('.brewing-page__recipe-ingredient-owned')?.textContent,
    ).toBe('owned 3');
    expect(popup.textContent).not.toContain('needs:');
    expect(popup.textContent).not.toContain('1. sage');
    expect(popup.textContent).toContain('time: 30s');
    expect(popup.textContent).not.toContain('locked recipes');
    expect(popup.textContent).toContain('minor healing potion');
    expect(popup.textContent).toContain('- 2 sage');
    expect(popup.textContent).toContain('- 1 mint');
    expect([...popup.querySelectorAll('.brewing-page__recipe-row')].length).toBe(2);
    expect(
      [...popup.querySelectorAll('.brewing-page__recipe-row')].map((row) =>
        row.classList.contains('is-locked'),
      ),
    ).toEqual([false, true]);

    const manaTonicRow = [...popup.querySelectorAll('.brewing-page__recipe-row')].find((row) =>
      row.textContent.includes('mana tonic'),
    );
    expect(
      manaTonicRow?.querySelector('.brewing-page__recipe-name')?.classList.contains(
        'style-potion-label',
      ),
    ).toBe(false);
    expect(
      manaTonicRow?.querySelector('.brewing-page__recipe-name .style-potion-label__icon'),
    ).toBeNull();
    expect(manaTonicRow?.querySelector('.brewing-page__recipe-potion-icon')).not.toBeNull();
    expect(
      manaTonicRow?.querySelector('.brewing-page__recipe-meta')?.firstElementChild?.textContent,
    ).toBe('12 mana required');
    expect(
      manaTonicRow?.querySelector('.brewing-page__recipe-meta')?.lastElementChild?.textContent,
    ).toBe('time: 30s');

    const manaTonicSelectButton = manaTonicRow?.querySelector(
      '.brewing-page__recipe-select-button',
    );

    expect(manaTonicSelectButton?.textContent).toBe('select');
    expect(manaTonicRow?.tagName).toBe('DIV');
    expect(manaTonicRow?.getAttribute('aria-pressed')).toBe('false');

    manaTonicSelectButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
    expect(stage.querySelector('.brewing-page__cauldron-recipe-title')).toBeNull();
    expect(stage.querySelector('.brewing-page__cauldron-guide')?.hidden).toBe(false);
    expect(
      stage.querySelector('.brewing-page__cauldron-guide-step')?.textContent,
    ).toBe('sage3/3');
    expect(
      stage.querySelector('.brewing-page__cauldron-guide-step')?.textContent,
    ).not.toContain('remove');
    expect(stage.querySelector('.brewing-page__herbs')?.textContent).toContain('sage0');

    expect(
      [...popup.querySelectorAll('.brewing-page__recipe-row')]
        .find((row) => row.textContent.includes('mana tonic'))
        ?.classList.contains('is-selected'),
    ).toBe(true);
    expect(
      [...popup.querySelectorAll('.brewing-page__recipe-row')]
        .find((row) => row.textContent.includes('mana tonic'))
        ?.querySelector('.brewing-page__recipe-select-button')
        ?.textContent,
    ).toBe('selected');

    const selectedManaTonicRow = [...popup.querySelectorAll('.brewing-page__recipe-row')].find(
      (row) => row.textContent.includes('mana tonic'),
    );
    selectedManaTonicRow
      .querySelector('.brewing-page__recipe-select-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
    expect(stage.querySelector('.brewing-page__cauldron-guide')?.hidden).toBe(true);
    expect(
      [...popup.querySelectorAll('.brewing-page__recipe-row')]
        .find((row) => row.textContent.includes('mana tonic'))
        ?.classList.contains('is-selected'),
    ).toBe(false);
    expect(
      [...popup.querySelectorAll('.brewing-page__recipe-row')]
        .find((row) => row.textContent.includes('mana tonic'))
        ?.querySelector('.brewing-page__recipe-select-button')
        ?.textContent,
    ).toBe('select');

    dispatchPointerSwipe(stage);

    expect(pagesFacade.getCurrentPageId()).toBe('brewing');

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(popup.hidden).toBe(true);

    stage
      .querySelector('.brewing-page__cauldron')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    popup.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(true);
  });

  it('keeps empty cauldron contents when selected Brewing recipe cannot be staged', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    gameplayFacade.getSnapshot().brewing.herbs[0].quantity = 1;
    gameplayFacade.setCoin(3);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');
    pagesFacade.mount(stage);
    clickRoomTab(stage, 'brewing');

    stage
      .querySelector('.brewing-page__cauldron-select-recipe-text')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.brewing-page__recipe-select-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__cauldron-recipe-title')).toBeNull();
    expect(stage.querySelector('.brewing-page__cauldron-guide')?.hidden).toBe(false);
    expect(stage.querySelector('.brewing-page__cauldron-guide-step')?.textContent).toBe(
      'sage1/3',
    );
    expect(stage.querySelector('.brewing-page__cauldron-items')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__action-button')?.disabled).toBe(true);
    expect(stage.querySelector('.brewing-page__action-button')?.getAttribute('aria-label')).toBe(
      'missing herbs for mana tonic',
    );
    expect(stage.querySelector('.brewing-page__cauldron-count')?.textContent).toBe('0/5');
    expect(stage.querySelector('.brewing-page__herbs')?.textContent).toContain('sage1');
  });

  it('refills a remembered Brewing recipe from the primary action after bottling completes', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    markSeedResearchComplete(gameplayFacade, 'sageSeed');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    gameplayFacade.setCoin(3);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');
    gameplayFacade.setMana(24);
    pagesFacade.mount(stage);
    clickRoomTab(stage, 'brewing');

    stage
      .querySelector('.brewing-page__cauldron-select-recipe-text')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.brewing-page__recipe-select-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.brewing-page__action-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const snapshot = gameplayFacade.getSnapshot();
    snapshot.brewing.activeBrew = null;
    snapshot.brewing.canCollectPotion = false;
    snapshot.inventory.push({
      itemTypeId: 2001,
      key: 'manaTonic',
      label: 'mana tonic',
      kind: 'potion',
      quantity: 1,
    });
    gameplayFacade.publishSnapshot();

    expect(stage.querySelector('.brewing-page__action-button')?.textContent).toBe(
      'fill recipe',
    );
    expect(stage.querySelector('.brewing-page__action-button')?.disabled).toBe(false);
    expect(stage.querySelector('.brewing-page__cauldron-recipe-title')).toBeNull();

    stage
      .querySelector('.brewing-page__action-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__cauldron')?.textContent).toContain('3 sage');
    expect(stage.querySelector('.brewing-page__cauldron-count')?.textContent).toBe('3/5');
    expect(stage.querySelector('.brewing-page__cauldron-status')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__cauldron-status')?.textContent).toBe('');
    expect(stage.querySelector('.brewing-page__action-button')?.textContent).toBe(
      'brew 12 mana',
    );
    expect(stage.querySelector('.brewing-page__action-button')?.disabled).toBe(false);
  });

  it('keeps the selected Brewing recipe after switching room tabs', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    gameplayFacade.setCoin(3);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');
    pagesFacade.mount(stage);
    clickRoomTab(stage, 'brewing');

    stage
      .querySelector('.brewing-page__cauldron-select-recipe-text')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.brewing-page__recipe-select-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__cauldron-recipe-title')).toBeNull();

    clickRoomTab(stage, 'garden');
    expect(pagesFacade.getCurrentPageId()).toBe('garden');

    clickRoomTab(stage, 'brewing');
    expect(stage.querySelector('.brewing-page__cauldron-recipe-title')).toBeNull();

    stage
      .querySelector('.brewing-page__cauldron-select-recipe-text')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const selectButton = stage.querySelector('.brewing-page__recipe-select-button');

    expect(selectButton?.textContent).toBe('selected');
  });

  it('keeps the Brewing fill recipe action for the current cauldron after switching room tabs', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    gameplayFacade.setCoin(3);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');
    const brewing = gameplayFacade.getSnapshot().brewing;
    brewing.unlockedCauldrons = 2;
    brewing.maxCauldrons = 2;
    brewing.nextCauldronNumber = null;
    brewing.nextCauldronCost = null;
    brewing.cauldrons = [0, 1].map((cauldronIndex) => ({
      ...brewing,
      cauldronIndex,
      cauldronNumber: cauldronIndex + 1,
      ingredients: [],
      activeBrew: null,
      canAddIngredient: true,
      canBrew: false,
    }));
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'brewing');

    const getCauldron = () =>
      stage.querySelector('.brewing-page__cauldron[data-cauldron-index="1"]');
    const getActionButton = () =>
      getCauldron()?.querySelector('.brewing-page__action-button');

    getCauldron()
      ?.querySelector('.brewing-page__cauldron-select-recipe-text')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.brewing-page__recipe-select-button')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    brewing.ingredients = [];
    for (const herb of brewing.herbs) {
      herb.stagedQuantity = 0;
      herb.availableQuantity = herb.quantity;
    }
    gameplayFacade.publishSnapshot();

    expect(getCauldron()?.classList.contains('is-current')).toBe(true);
    expect(getActionButton()?.textContent).toBe('fill recipe');
    expect(getActionButton()?.disabled).toBe(false);

    clickRoomTab(stage, 'garden');
    expect(pagesFacade.getCurrentPageId()).toBe('garden');

    clickRoomTab(stage, 'brewing');

    expect(getCauldron()?.classList.contains('is-current')).toBe(true);
    expect(getActionButton()?.textContent).toBe('fill recipe');
    expect(getActionButton()?.disabled).toBe(false);
  });

  it('keeps Brewing cauldron recipe guide row DOM stable across snapshot renders', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    markSeedResearchComplete(gameplayFacade, 'sageSeed');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    gameplayFacade.setCoin(3);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');
    pagesFacade.mount(stage);
    clickRoomTab(stage, 'brewing');

    stage
      .querySelector('.brewing-page__cauldron-select-recipe-text')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.brewing-page__recipe-select-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const ingredientRow = stage.querySelector('.brewing-page__cauldron-guide-step');

    expect(ingredientRow).not.toBeNull();
    expect(ingredientRow.textContent).toContain('sage3/3');
    expect(ingredientRow.textContent).not.toContain('remove');

    gameplayFacade.setMana(0);

    expect(stage.querySelector('.brewing-page__cauldron-guide-step')).toBe(ingredientRow);

    ingredientRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__cauldron-guide-step')).toBe(ingredientRow);
    expect(ingredientRow.textContent).toContain('sage3/3');

    const sageButton = [...stage.querySelectorAll('.brewing-page__herb-button')].find((button) =>
      button.textContent.includes('sage'),
    );
    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__cauldron-guide-step')).toBe(ingredientRow);
    expect(ingredientRow.hidden).toBe(true);
    expect(ingredientRow.textContent).toBe('');
  });

  it('keeps top panel resource text DOM stable across unchanged snapshot renders', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    const manaValue = stage.querySelector(
      '.room-top-panel__resource[aria-label="mana"] .room-top-panel__resource-val',
    );
    const coinValue = stage.querySelector(
      '.room-top-panel__resource[aria-label="coin"] .room-top-panel__resource-val',
    );
    const manaText = manaValue.firstChild;
    const coinText = coinValue.firstChild;

    gameplayFacade.publishSnapshot();

    expect(manaValue.firstChild).toBe(manaText);
    expect(coinValue.firstChild).toBe(coinText);
  });

  it('keeps Brewing text DOM stable across unchanged snapshot renders', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    markSeedResearchComplete(gameplayFacade, 'sageSeed');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    pagesFacade.show('brewing');

    const snapshot = gameplayFacade.getSnapshot();
    snapshot.brewing.activeBrew = {
      resultItemTypeId: 2001,
      key: 'manaTonic',
      label: 'mana tonic',
      phase: 'brewing',
      canCollect: false,
      remainingMs: 4_000,
      totalMs: 4_000,
      bottlingTotalMs: 2_000,
      progress: 0,
    };
    snapshot.brewing.canAddIngredient = false;
    snapshot.brewing.canBrew = false;
    gameplayFacade.publishSnapshot();

    const sageButton = [...stage.querySelectorAll('.brewing-page__herb-button')].find(
      (button) => button.textContent === 'sage3',
    );
    const sageLabel = sageButton.querySelector('.row_key');
    const sageQuantity = sageButton.querySelector('.row_val');
    const activeText = stage.querySelector('.brewing-page__active-brew-text');
    const progressText = stage.querySelector('.brewing-page__active-progress-text');
    const sageLabelText = sageLabel.firstChild;
    const sageQuantityText = sageQuantity.firstChild;
    const activeTextNode = activeText.firstChild;
    const progressTextNode = progressText.firstChild;

    gameplayFacade.publishSnapshot();

    expect(sageLabel.firstChild).toBe(sageLabelText);
    expect(sageQuantity.firstChild).toBe(sageQuantityText);
    expect(activeText.firstChild).toBe(activeTextNode);
    expect(progressText.firstChild).toBe(progressTextNode);
  });

  it('opens the potion inventory box from the Brewing icon button', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    pagesFacade.show('brewing');

    gameplayFacade.publishSnapshot();

    expect(stage.querySelector('.brewing-page__potions-button')).toBeNull();
    expect(stage.querySelector('.brewing-page__potions-popup')).toBeNull();
    expect(stage.querySelector('.brewing-page__potions')?.hidden).toBe(true);
    const potionsButtonRoot = stage.querySelector(
      '.brewing-page__inventory-button--potions',
    );
    const potionsButton = potionsButtonRoot?.querySelector(
      '.room-inventory-panel-button__open',
    );
    expect(potionsButtonRoot).not.toBeNull();
    expect(potionsButtonRoot.dataset.panelSide).toBe('right');
    expect(potionsButton).not.toBeNull();
    expect(potionsButton.getAttribute('aria-label')).toBe('open potions');
    expect(
      potionsButton.querySelector('.room-inventory-panel-button__icon'),
    ).not.toBeNull();
    expect(
      potionsButton.querySelector('.room-inventory-panel-button__label')?.textContent,
    ).toBe('potions');

    potionsButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(pagesFacade.getCurrentPageId()).toBe('brewing');
    expect(stage.querySelector('.workshop-page__bag-popup').hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__potions')?.hidden).toBe(false);
    expect(potionsButton.getAttribute('aria-expanded')).toBe('true');
  });

  it('opens seed and herb inventory boxes from Garden icon buttons', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 2);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'garden');

    expect(stage.querySelector('.garden-page__plot')).not.toBeNull();
    expect(stage.querySelector('.garden-page__seeds')?.hidden).toBe(true);
    expect(stage.querySelector('.garden-page__herbs')?.hidden).toBe(true);
    expect(stage.querySelectorAll('.garden-page__seed-inventory-row')).toHaveLength(0);
    expect(stage.querySelectorAll('.garden-page__herb-row').length).toBeGreaterThan(0);
    const herbButtonRoot = stage.querySelector(
      '.garden-page__inventory-button--herbs',
    );
    const seedButtonRoot = stage.querySelector(
      '.garden-page__inventory-button--seeds',
    );
    const herbButton = herbButtonRoot?.querySelector(
      '.room-inventory-panel-button__open',
    );
    const seedButton = seedButtonRoot?.querySelector(
      '.room-inventory-panel-button__open',
    );
    expect(herbButtonRoot).not.toBeNull();
    expect(seedButtonRoot).not.toBeNull();
    expect(
      stage.querySelector('.garden-page__ui-layer > .garden-page__inventory-buttons'),
    ).toBe(stage.querySelector('.garden-page__inventory-buttons'));
    expect(
      stage.querySelector('.garden-page__content > .garden-page__inventory-buttons'),
    ).toBeNull();
    expect(herbButtonRoot.dataset.panelSide).toBe('left');
    expect(seedButtonRoot.dataset.panelSide).toBe('right');
    expect(herbButton).not.toBeNull();
    expect(seedButton).not.toBeNull();
    expect(herbButton.getAttribute('aria-label')).toBe('open herbs');
    expect(seedButton.getAttribute('aria-label')).toBe('open seeds');
    expect(
      herbButton.querySelector('.room-inventory-panel-button__label')?.textContent,
    ).toBe('herbs');
    expect(
      seedButton.querySelector('.room-inventory-panel-button__label')?.textContent,
    ).toBe('seeds');

    herbButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(pagesFacade.getCurrentPageId()).toBe('garden');
    expect(stage.querySelector('.workshop-page__bag-popup').hidden).toBe(true);
    expect(stage.querySelector('.garden-page__herbs')?.hidden).toBe(false);
    expect(stage.querySelector('.garden-page__seeds')?.hidden).toBe(true);
    expect(herbButton.getAttribute('aria-expanded')).toBe('true');

    seedButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(pagesFacade.getCurrentPageId()).toBe('garden');
    expect(stage.querySelector('.workshop-page__bag-popup').hidden).toBe(true);
    expect(stage.querySelector('.garden-page__herbs')?.hidden).toBe(true);
    expect(stage.querySelector('.garden-page__seeds')?.hidden).toBe(false);
    expect(herbButton.getAttribute('aria-expanded')).toBe('false');
    expect(seedButton.getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps Garden inventory boxes hidden across page swaps until a button opens one', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    unlockWorkshopSecondaryActions(gameplayFacade, 2);
    snapshot.garden.seeds = [
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: 1,
        researched: true,
      },
      {
        itemTypeId: 2,
        key: 'mintSeed',
        label: 'mint seed',
        kind: 'seed',
        quantity: 2,
        researched: true,
      },
      {
        itemTypeId: 3,
        key: 'nettleSeed',
        label: 'nettle seed',
        kind: 'seed',
        quantity: 3,
        researched: true,
      },
      {
        itemTypeId: 4,
        key: 'lavenderSeed',
        label: 'lavender seed',
        kind: 'seed',
        quantity: 4,
        researched: true,
      },
    ];
    snapshot.garden.herbs = [
      {
        itemTypeId: 1001,
        key: 'sageHerb',
        label: 'sage',
        kind: 'herb',
        quantity: 1,
        researched: true,
      },
      {
        itemTypeId: 1002,
        key: 'mintHerb',
        label: 'mint',
        kind: 'herb',
        quantity: 2,
        researched: true,
      },
      {
        itemTypeId: 1003,
        key: 'nettleHerb',
        label: 'nettle',
        kind: 'herb',
        quantity: 3,
        researched: true,
      },
      {
        itemTypeId: 1004,
        key: 'lavenderHerb',
        label: 'lavender',
        kind: 'herb',
        quantity: 4,
        researched: true,
      },
    ];
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'garden');

    expect(stage.querySelector('.garden-page__seeds')?.hidden).toBe(true);
    expect(stage.querySelector('.garden-page__herbs')?.hidden).toBe(true);
    stage
      .querySelector(
        '.garden-page__inventory-button--seeds .room-inventory-panel-button__open',
      )
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(stage.querySelector('.garden-page__seeds')?.hidden).toBe(false);
    clickRoomTab(stage, 'workshop');
    clickRoomTab(stage, 'garden');
    expect(stage.querySelector('.garden-page__seeds')?.hidden).toBe(true);
    expect(stage.querySelector('.garden-page__herbs')?.hidden).toBe(true);
  });

  it('shows garden plots as a box world and keeps planting as a popup choice', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 2);
    const seedUnlockBox = gameplayFacade
      .getSnapshot()
      .research.boxes.find((box) => box.id === 'seedUnlocks');
    seedUnlockBox.researches[0].completed = true;
    gameplayFacade.getSnapshot().research.completedResearchIds = ['unlockSeed:sageSeed'];
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'garden');

    const rows = [...stage.querySelectorAll('.garden-page__plot-row')];

    expect(rows).toHaveLength(10);
    expect(rows.filter((row) => !row.hidden)).toHaveLength(2);
    expect(stage.querySelector('.garden-page__plot-summary')).toBeNull();
    expect(stage.querySelector('.garden-page__plot')?.textContent).not.toContain('locked');
    expect(stage.querySelector('.garden-page__tile-button')).toBeNull();
    expect(stage.querySelector('.garden-page__plot')?.classList.contains('style-box')).toBe(
      false,
    );
    expect(stage.querySelector('.garden-page__plot .style-box__title')).toBeNull();
    expect(rows[0].querySelector('.garden-page__plot-box-number')?.textContent).toBe('1');
    expect(rows[0].querySelector('.garden-page__plot-box-label')?.textContent).toBe('choose');
    expect(rows[0].querySelector('.garden-page__plot-box-level')?.textContent).toBe('☆☆☆');
    expect(rows[0].querySelector('.garden-page__plot-box-action')?.textContent).toBe('empty');
    expect(rows[0].disabled).toBe(false);
    expect(rows[1].classList.contains('is-buy-slot')).toBe(true);
    expect(rows[1].querySelector('.garden-page__plot-box-number')?.textContent).toBe('');
    expect(rows[1].querySelector('.garden-page__plot-box-label')?.textContent).toBe('');
    expect(rows[1].querySelector('.garden-page__plot-box-level')?.textContent).toBe('');
    expect(rows[1].querySelector('.garden-page__plot-box-action')?.textContent).toBe(
      'buy 1 coin',
    );
    expect(rows[1].disabled).toBe(true);

    gameplayFacade.setCoin(1);
    expect(rows[1].disabled).toBe(false);

    rows[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.garden-page__message')).toBeNull();
    expect(rows[1].querySelector('.garden-page__plot-box-label')?.textContent).toBe('choose');
    expect(rows[1].querySelector('.garden-page__plot-box-level')?.textContent).toBe('☆☆☆');
    expect(rows[1].querySelector('.garden-page__plot-box-action')?.textContent).toBe('empty');
    expect(rows[1].disabled).toBe(false);
    expect(rows.filter((row) => !row.hidden)).toHaveLength(3);
    expect(stage.querySelector('.garden-page__plot-summary')).toBeNull();
    expect(stage.querySelector('.garden-page__plot')?.textContent).not.toContain('locked');

    gameplayFacade.getSnapshot().garden.seeds.push({
      itemTypeId: 2,
      key: 'mintSeed',
      label: 'mint seed',
      kind: 'seed',
      quantity: 0,
    });
    gameplayFacade.setGardenSeedQuantity(1, 1);
    expect(rows[0].querySelector('.garden-page__plot-box-label')?.textContent).toBe('choose');
    expect(rows[0].querySelector('.garden-page__plot-box-action')?.textContent).toBe('empty');
    expect(rows[0].classList.contains('is-plantable')).toBe(false);
    expect(rows[0].disabled).toBe(false);
    rows[0]
      .querySelector('.garden-page__plot-box-label')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const seedPopup = stage.querySelector('.garden-page__seed-popup');
    const seedButtons = [...seedPopup.querySelectorAll('.garden-page__seed-button')];

    expect(seedPopup.hidden).toBe(false);
    expect(
      seedPopup.querySelector('.garden-page__seed-dialog')?.getAttribute('aria-labelledby'),
    ).toBe('garden-seed-dialog-title');
    expect(seedPopup.querySelector('#garden-seed-dialog-title')?.textContent).toBe(
      'choose seed',
    );
    expect(seedButtons.map((button) => button.textContent)).toEqual([
      'empty',
      'sage seed1',
    ]);
    expect(seedPopup.textContent).not.toContain('mint seed');
    expect(seedPopup.querySelector('.garden-page__seed-divider')).toBeNull();
    expect(seedButtons[0].disabled).toBe(false);
    expect(seedButtons[1].dataset.resourceColor).toBe('seed');

    seedButtons[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(seedPopup.hidden).toBe(true);
    expect(rows[0].querySelector('.garden-page__plot-box-label')?.textContent).toBe('sage');
    expect(rows[0].querySelector('.garden-page__plot-box-label')?.dataset.resourceColor).toBe(
      undefined,
    );
    expect(rows[0].querySelector('.garden-page__plot-box-level')?.textContent).toBe('☆☆☆');
    expect(rows[0].querySelector('.garden-page__plot-box-action')?.textContent).toBe('12s');
    expect(rows[0].querySelector('.garden-page__plot-box-action-label')?.textContent).toBe(
      '',
    );
    expect(rows[0].querySelector('.garden-page__plot-box-timer')?.textContent).toBe('12s');
    expect(rows[0].classList.contains('is-ready')).toBe(false);
    expect(rows[0].querySelector('.garden-page__plot-progress')?.hidden).toBe(false);
    expect(
      rows[0].querySelector('.garden-page__plot-progress')?.classList.contains('style-progress'),
    ).toBe(true);
    expect(
      rows[0]
        .querySelector('.garden-page__plot-progress')
        ?.classList.contains('style-progress--timer'),
    ).toBe(true);
    expect(rows[0].querySelector('.garden-page__plot-progress-text')?.textContent).toBe('');

    rows[0]
      .querySelector('.garden-page__plot-box-label')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const cancelPopup = stage.querySelector('.garden-page__cancel-popup');
    expect(seedPopup.hidden).toBe(false);
    expect(cancelPopup?.hidden).toBe(true);

    seedPopup.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    rows[0]
      .querySelector('.garden-page__plot-box-action')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(cancelPopup?.hidden).toBe(false);
    expect(stage.querySelector('#garden-cancel-dialog-title')?.textContent).toBe(
      'cancel progress?',
    );
  });

  it('changes room pages with horizontal touch swipes', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 4);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });
    const dispatchAllowedSwipe = (target, options) => {
      pagesFacade.swipeNavigationManager.lastNavigationAtMs = -Infinity;
      dispatchTouchSwipe(target, options);
    };

    pagesFacade.mount(stage);

    dispatchAllowedSwipe(stage);

    expect(pagesFacade.getCurrentPageId()).toBe('research');
    expect(stage.querySelector('.research-page')).not.toBeNull();

    dispatchAllowedSwipe(stage, { startX: 120, endX: 320 });

    expect(pagesFacade.getCurrentPageId()).toBe('workshop');
    expect(stage.querySelector('.workshop-page')).not.toBeNull();

    dispatchAllowedSwipe(stage);
    dispatchAllowedSwipe(stage);

    expect(pagesFacade.getCurrentPageId()).toBe('shop');
    expect(stage.querySelector('.shop-page')).not.toBeNull();

    dispatchAllowedSwipe(stage);

    expect(pagesFacade.getCurrentPageId()).toBe('shop');

    dispatchAllowedSwipe(stage, { startX: 120, endX: 320 });

    expect(pagesFacade.getCurrentPageId()).toBe('research');
  });

  it('keeps brewing world drag gestures from triggering room swipe navigation', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 4);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'brewing');

    const worldShell = stage.querySelector('.brewing-page__world-shell');

    expect(pagesFacade.getCurrentPageId()).toBe('brewing');
    expect(worldShell?.dataset.pageSwipeBlock).toBe('true');

    dispatchTouchSwipe(worldShell);
    dispatchPointerSwipe(worldShell);

    expect(pagesFacade.getCurrentPageId()).toBe('brewing');
    expect(stage.dataset.pageSwipeActive).toBeUndefined();

    dispatchTouchSwipe(stage);

    expect(pagesFacade.getCurrentPageId()).toBe('garden');
  });

  it('shows the locked room notice when a swipe targets a locked adjacent room', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    dispatchTouchSwipe(stage);

    const popup = stage.querySelector('.room-bottom-panel__lock-popup');

    expect(pagesFacade.getCurrentPageId()).toBe('workshop');
    expect(stage.querySelector('.workshop-page')).not.toBeNull();
    expect(stage.querySelector('.research-page')).toBeNull();
    expect(stage.querySelector('.room-bottom-panel__tab.is-selected')?.dataset.pageId).toBe(
      'workshop',
    );
    expect(popup?.hidden).toBe(false);
    expect(popup?.dataset.pageId).toBe('research');
    expect(
      stage.querySelector('.room-bottom-panel__tab[data-page-id="research"]')?.classList.contains(
        'is-swipe-bumped',
      ),
    ).toBe(true);
    expect(stage.querySelector('.room-bottom-panel__lock-message')?.textContent).toBe(
      'research unlocks at level 3',
    );
  });

  it('updates bottom-panel swipe target feedback while dragging', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 4);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    const startTouch = createTouch(7, 320, 360, stage);
    const moveTouch = createTouch(7, 220, 360, stage);
    const endTouch = createTouch(7, 120, 360, stage);
    const researchTab = stage.querySelector('.room-bottom-panel__tab[data-page-id="research"]');

    stage.dispatchEvent(
      createTouchEvent('touchstart', {
        touches: [startTouch],
        changedTouches: [startTouch],
      }),
    );
    stage.dispatchEvent(
      createTouchEvent('touchmove', {
        touches: [moveTouch],
        changedTouches: [moveTouch],
      }),
    );

    expect(stage.dataset.pageSwipeActive).toBe('true');
    expect(stage.style.getPropertyValue('--page-swipe-offset')).not.toBe('');
    expect(researchTab?.classList.contains('is-swipe-target')).toBe(true);

    stage.dispatchEvent(
      createTouchEvent('touchend', {
        touches: [],
        changedTouches: [endTouch],
      }),
    );

    expect(pagesFacade.getCurrentPageId()).toBe('research');
    expect(stage.dataset.pageSwipeActive).toBeUndefined();
    expect(stage.style.getPropertyValue('--page-swipe-offset')).toBe('');
    expect(researchTab?.classList.contains('is-selected')).toBe(true);
    expect(researchTab?.classList.contains('is-swipe-target')).toBe(false);
  });

  it('accepts intentional diagonal swipes without taking vertical drags', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 4);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    dispatchTouchSwipe(stage, { endY: 520 });

    expect(pagesFacade.getCurrentPageId()).toBe('research');

    dispatchTouchSwipe(stage, { startX: 320, endX: 120, startY: 360, endY: 700 });

    expect(pagesFacade.getCurrentPageId()).toBe('research');
  });

  it('keeps page scroll roots swipeable after an ambiguous diagonal start', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 4);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    pagesFacade.show('research');

    const scrollRoot = stage.querySelector('.research-page__box-list');
    const startTouch = createTouch(12, 500, 600, scrollRoot);
    const firstMoveTouch = createTouch(12, 486, 616, scrollRoot);
    const secondMoveTouch = createTouch(12, 390, 650, scrollRoot);
    const endTouch = createTouch(12, 250, 690, scrollRoot);

    scrollRoot.dispatchEvent(
      createTouchEvent('touchstart', {
        touches: [startTouch],
        changedTouches: [startTouch],
      }),
    );

    const firstMove = createTouchEvent('touchmove', {
      touches: [firstMoveTouch],
      changedTouches: [firstMoveTouch],
    });
    scrollRoot.dispatchEvent(firstMove);

    expect(firstMove.defaultPrevented).toBe(false);
    expect(stage.dataset.pageSwipeActive).toBeUndefined();

    const secondMove = createTouchEvent('touchmove', {
      touches: [secondMoveTouch],
      changedTouches: [secondMoveTouch],
    });
    scrollRoot.dispatchEvent(secondMove);

    expect(secondMove.defaultPrevented).toBe(true);
    expect(stage.dataset.pageSwipeActive).toBe('true');

    scrollRoot.dispatchEvent(
      createTouchEvent('touchend', {
        touches: [],
        changedTouches: [endTouch],
      }),
    );

    expect(pagesFacade.getCurrentPageId()).toBe('shop');
  });

  it('keeps vertical drags on page scroll roots available for native scrolling', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 4);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    pagesFacade.show('research');

    const scrollRoot = stage.querySelector('.research-page__box-list');
    const startTouch = createTouch(13, 500, 600, scrollRoot);
    const moveTouch = createTouch(13, 490, 680, scrollRoot);
    const endTouch = createTouch(13, 488, 740, scrollRoot);

    scrollRoot.dispatchEvent(
      createTouchEvent('touchstart', {
        touches: [startTouch],
        changedTouches: [startTouch],
      }),
    );

    const verticalMove = createTouchEvent('touchmove', {
      touches: [moveTouch],
      changedTouches: [moveTouch],
    });
    scrollRoot.dispatchEvent(verticalMove);
    scrollRoot.dispatchEvent(
      createTouchEvent('touchend', {
        touches: [],
        changedTouches: [endTouch],
      }),
    );

    expect(verticalMove.defaultPrevented).toBe(false);
    expect(stage.dataset.pageSwipeActive).toBeUndefined();
    expect(pagesFacade.getCurrentPageId()).toBe('research');
  });

  it('uses pointer swipes when TouchEvent is present', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 4);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });
    const originalTouchEvent = window.TouchEvent;

    Object.defineProperty(window, 'TouchEvent', {
      configurable: true,
      value: function TouchEvent() {},
    });

    try {
      pagesFacade.mount(stage);
      dispatchPointerSwipe(stage);

      expect(pagesFacade.getCurrentPageId()).toBe('research');
    } finally {
      if (originalTouchEvent) {
        Object.defineProperty(window, 'TouchEvent', {
          configurable: true,
          value: originalTouchEvent,
        });
      } else {
        delete window.TouchEvent;
      }
    }
  });

  it('allows planting after swiping into the Garden', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 2);
    const seedUnlockBox = gameplayFacade
      .getSnapshot()
      .research.boxes.find((box) => box.id === 'seedUnlocks');
    seedUnlockBox.researches[0].completed = true;
    gameplayFacade.getSnapshot().research.completedResearchIds = ['unlockSeed:sageSeed'];
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    gameplayFacade.setGardenSeedQuantity(1, 1);
    pagesFacade.mount(stage);

    dispatchTouchSwipe(stage, { startX: 120, endX: 320 });

    expect(pagesFacade.getCurrentPageId()).toBe('garden');

    const plotRow = stage.querySelector('.garden-page__plot-row');
    const plotAction = plotRow.querySelector('.garden-page__plot-box-action');
    const seedPopup = stage.querySelector('.garden-page__seed-popup');

    plotAction.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(seedPopup.hidden).toBe(true);

    dispatchTouchTap(plotAction);
    plotAction.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(seedPopup.hidden).toBe(false);

    const seedButton = stage.querySelector('[aria-label="select sage seed, owned 1"]');

    dispatchTouchTap(seedButton);
    seedButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(seedPopup.hidden).toBe(true);
    expect(plotRow.querySelector('.garden-page__plot-box-label')?.textContent).toBe('sage');
    expect(plotRow.querySelector('.garden-page__plot-box-action')?.textContent).toBe('12s');
  });

  it('changes room pages from Research controls with horizontal touch swipes', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 3);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    pagesFacade.show('research');

    const researchLabel = stage.querySelector('.research-page__research-label-button');

    dispatchTouchSwipe(researchLabel);

    expect(pagesFacade.getCurrentPageId()).toBe('shop');
    expect(stage.querySelector('.shop-page')).not.toBeNull();
  });

  it('ignores mouse, vertical, blocked control, and popup swipes', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    dispatchPointerSwipe(stage, { pointerType: 'mouse' });
    dispatchTouchSwipe(stage, { endX: 250, endY: 560 });

    expect(pagesFacade.getCurrentPageId()).toBe('workshop');

    stage
      .querySelector('.room-top-panel__username')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    dispatchTouchSwipe(stage.querySelector('.room-top-panel__username-input'));

    expect(pagesFacade.getCurrentPageId()).toBe('workshop');
    expect(stage.querySelector('.room-top-panel__settings').hidden).toBe(false);

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    stage
      .querySelector('.workshop-page__bag-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.workshop-page__bag-popup').hidden).toBe(false);

    dispatchTouchSwipe(stage);

    expect(pagesFacade.getCurrentPageId()).toBe('workshop');
  });

  it('adds herbs to the Brewing cauldron and names unlocked matching recipes', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    markSeedResearchComplete(gameplayFacade, 'sageSeed');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    gameplayFacade.setMana(12);
    pagesFacade.mount(stage);
    clickRoomTab(stage, 'brewing');

    expect(stage.querySelector('.brewing-page__cauldron-count')?.textContent).toBe('0/5');
    expect(stage.querySelector('.brewing-page__cauldron-status')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__cauldron')?.textContent).not.toContain(
      'tap herbs to add',
    );

    const sageButton = [...stage.querySelectorAll('.brewing-page__herb-button')].find(
      (button) => button.textContent === 'sage3',
    );

    expect(sageButton?.getAttribute('data-resource-color')).toBe('herb');

    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__ingredient-count')?.textContent).toBe('1 ');
    expect(stage.querySelector('.brewing-page__ingredient-label')?.textContent).toBe('sage');
    expect(stage.querySelector('.brewing-page__ingredient-label')?.dataset.resourceColor).toBe(
      'herb',
    );
    expect(stage.querySelector('.brewing-page__cauldron-preview-label')?.hidden).toBe(false);
    expect(stage.querySelector('.brewing-page__cauldron-preview-label')?.textContent).toBe(
      'wasted potion',
    );
    expect(
      stage.querySelector('.brewing-page__cauldron-art-liquid')?.hidden,
    ).toBe(true);
    expect(stage.querySelector('.brewing-page__herbs')?.textContent).toContain('sage2');
    expect(stage.querySelector('.brewing-page__cauldron-status')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__cauldron-status')?.textContent).toBe('');
    expect(stage.querySelector('.brewing-page__message')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__message')?.textContent).toBe('');

    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__ingredient-count')?.textContent).toBe('3 ');
    expect(stage.querySelector('.brewing-page__ingredient-label')?.textContent).toBe('sage');
    expect(stage.querySelector('.brewing-page__cauldron-preview-label')?.hidden).toBe(false);
    expect(stage.querySelector('.brewing-page__cauldron-preview-label')?.textContent).toBe(
      'mana tonic locked',
    );
    expect(
      stage.querySelector('.brewing-page__cauldron-art-liquid')?.hidden,
    ).toBe(true);
    expect(stage.querySelector('.brewing-page__action-button')?.textContent).toBe(
      'brew 12 mana',
    );
    expect(stage.querySelector('.brewing-page__cauldron-count')?.textContent).toBe('3/5');
    expect(stage.querySelector('.brewing-page__cauldron-status')?.textContent).toBe(
      'mana tonic locked',
    );
    expect(stage.querySelector('.brewing-page__message')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__message')?.textContent).toBe('');
    expect(stage.querySelector('.brewing-page__action-button')?.disabled).toBe(true);

    stage
      .querySelector('.brewing-page__action-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__message')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__message')?.textContent).toBe('');

    gameplayFacade.setCoin(3);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');

    expect(stage.querySelector('.brewing-page__action-button')?.textContent).toBe(
      'brew 12 mana',
    );
    expect(stage.querySelector('.brewing-page__cauldron-status')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__cauldron-status')?.textContent).toBe('');
    expect(stage.querySelector('.brewing-page__cauldron-preview-label')?.hidden).toBe(false);
    expect(stage.querySelector('.brewing-page__cauldron-preview-label')?.textContent).toBe(
      'mana tonic',
    );
    expect(
      stage.querySelector('.brewing-page__cauldron-art-liquid')?.hidden,
    ).toBe(true);
    expect(stage.querySelector('.brewing-page__message')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__message')?.textContent).toBe('');

    stage
      .querySelector('.brewing-page__action-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__active-brew')?.hidden).toBe(false);
    expect(stage.querySelector('.brewing-page__active-brew-text')?.textContent).toBe(
      'brewing 30s',
    );
    expect(stage.querySelector('.brewing-page__cauldron-status')?.hidden).toBe(true);
    const progressBar = stage.querySelector('.brewing-page__active-progress');

    expect(progressBar?.getAttribute('role')).toBe('progressbar');
    expect(progressBar?.classList.contains('style-progress')).toBe(true);
    expect(progressBar?.classList.contains('style-progress--timer')).toBe(true);
    expect(progressBar?.getAttribute('aria-valuenow')).toBe('0');
    expect(stage.querySelector('.brewing-page__active-progress-text')?.textContent).toBe('');
    expect(stage.querySelector('.brewing-page__active-progress-fill')?.style.transform).toBe(
      'scaleX(0)',
    );
    expect(stage.querySelector('.brewing-page__action-button')?.textContent).not.toBe('collect');
    expect(stage.querySelector('.brewing-page__action-button')?.disabled).toBe(true);

    const snapshot = gameplayFacade.getSnapshot();
    snapshot.brewing.activeBrew = {
      resultItemTypeId: 2001,
      key: 'manaTonic',
      label: 'mana tonic',
      phase: 'brewed',
      canStartBottling: true,
      canCollect: false,
      remainingMs: 0,
      totalMs: 30_000,
      bottlingTotalMs: 2_000,
      progress: 1,
    };
    gameplayFacade.publishSnapshot();

    expect(stage.querySelector('.brewing-page__active-brew-text')?.textContent).toBe(
      'brewed',
    );
    expect(stage.querySelector('.brewing-page__cauldron-status')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__action-button')?.textContent).toBe('bottle');
    expect(stage.querySelector('.brewing-page__action-button')?.disabled).toBe(false);
    expect(stage.querySelector('.brewing-page__message')?.hidden).toBe(true);

    stage
      .querySelector('.brewing-page__action-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__active-brew-text')?.textContent).toBe(
      'bottling 2s',
    );
    expect(stage.querySelector('.brewing-page__cauldron-status')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__action-button')?.textContent).toBe('bottle');
    expect(stage.querySelector('.brewing-page__action-button')?.disabled).toBe(true);
    expect(stage.querySelector('.brewing-page__message')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__message')?.textContent).toBe('');

    snapshot.brewing.activeBrew = null;
    snapshot.brewing.canCollectPotion = false;
    snapshot.inventory.push({
      itemTypeId: 2001,
      key: 'manaTonic',
      label: 'mana tonic',
      kind: 'potion',
      quantity: 1,
    });
    gameplayFacade.publishSnapshot();

    expect(stage.querySelector('.brewing-page__active-brew')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__cauldron-status')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__action-button')?.textContent).not.toBe('collect');
    expect(stage.querySelector('.brewing-page__action-button')?.disabled).toBe(true);
    expect(stage.querySelector('.brewing-page__message')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__message')?.textContent).toBe('');
    expect(gameplayFacade.getSnapshot().inventory).toContainEqual({
      itemTypeId: 2001,
      key: 'manaTonic',
      label: 'mana tonic',
      kind: 'potion',
      quantity: 1,
    });
  });

  it('keeps vertical touch movement on Brewing herbs available for scrolling', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    markSeedResearchComplete(gameplayFacade, 'sageSeed');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    pagesFacade.show('brewing');

    const sageButton = [...stage.querySelectorAll('.brewing-page__herb-button')].find(
      (button) => button.textContent === 'sage3',
    );

    expect(sageButton.draggable).toBe(false);

    sageButton.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 320, clientY: 360 }),
    );
    const verticalMove = createPointerEvent('pointermove', { clientX: 322, clientY: 430 });
    document.dispatchEvent(verticalMove);
    document.dispatchEvent(createPointerEvent('pointerup', { clientX: 322, clientY: 430 }));

    expect(verticalMove.defaultPrevented).toBe(true);

    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__cauldron')?.textContent).not.toContain('1 sage');
    expect(stage.querySelector('.brewing-page__herbs')?.textContent).toContain('sage3');

    const originalElementFromPoint = document.elementFromPoint;
    try {
      document.elementFromPoint = () => sageButton;
      sageButton.dispatchEvent(
        createPointerEvent('pointerdown', { clientX: 320, clientY: 360 }),
      );
      document.dispatchEvent(createPointerEvent('pointermove', { clientX: 330, clientY: 366 }));
      document.dispatchEvent(createPointerEvent('pointerup', { clientX: 330, clientY: 366 }));
      sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    } finally {
      document.elementFromPoint = originalElementFromPoint;
    }

    expect(stage.querySelector('.brewing-page__cauldron')?.textContent).toContain('1 sage');
    expect(stage.querySelector('.brewing-page__herbs')?.textContent).toContain('sage2');
  });

  it('keeps scrollable Brewing herbs tap-first on touch devices', () => {
    const restoreMatchMedia = installMatchMedia(false);

    try {
      const stage = document.createElement('section');
      const gameplayFacade = createGameplayFacadeFake();
      unlockWorkshopSecondaryActions(gameplayFacade);
      const snapshot = gameplayFacade.getSnapshot();
      snapshot.brewing.herbs.push(
        {
          itemTypeId: 1003,
          key: 'nettleHerb',
          label: 'nettle',
          kind: 'herb',
          quantity: 1,
          stagedQuantity: 0,
          availableQuantity: 1,
        },
        {
          itemTypeId: 1004,
          key: 'lavenderHerb',
          label: 'lavender',
          kind: 'herb',
          quantity: 1,
          stagedQuantity: 0,
          availableQuantity: 1,
        },
        {
          itemTypeId: 1005,
          key: 'briarHerb',
          label: 'briar',
          kind: 'herb',
          quantity: 1,
          stagedQuantity: 0,
          availableQuantity: 1,
        },
        {
          itemTypeId: 1006,
          key: 'glowcapHerb',
          label: 'glowcap',
          kind: 'herb',
          quantity: 1,
          stagedQuantity: 0,
          availableQuantity: 1,
        },
        {
          itemTypeId: 1007,
          key: 'mandrakeHerb',
          label: 'mandrake',
          kind: 'herb',
          quantity: 1,
          stagedQuantity: 0,
          availableQuantity: 1,
        },
      );
      const pagesFacade = new PagesFacade({
        gameplayFacade,
        playerFacade: createPlayerFacadeFake(),
      });

      pagesFacade.mount(stage);
      pagesFacade.show('brewing');

      const rows = stage.querySelector('.brewing-page__herb-rows');
      Object.defineProperty(rows, 'scrollHeight', { configurable: true, value: 260 });
      Object.defineProperty(rows, 'clientHeight', { configurable: true, value: 132 });

      const herbButtons = [...stage.querySelectorAll('.brewing-page__herb-button')];
      const mandrakeButton = herbButtons.find((button) => button.textContent === 'mandrake1');

      expect(herbButtons.every((button) => button.draggable === false)).toBe(true);

      mandrakeButton.dispatchEvent(
        createPointerEvent('pointerdown', { clientX: 320, clientY: 360 }),
      );
      const move = createPointerEvent('pointermove', { clientX: 390, clientY: 370 });
      document.dispatchEvent(move);
      document.dispatchEvent(createPointerEvent('pointerup', { clientX: 390, clientY: 370 }));

      expect(move.defaultPrevented).toBe(true);

      mandrakeButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(stage.querySelector('.brewing-page__cauldron')?.textContent).not.toContain(
        '1 mandrake',
      );
      expect(stage.querySelector('.brewing-page__herbs')?.textContent).toContain(
        'mandrake1',
      );

      const originalElementFromPoint = document.elementFromPoint;
      try {
        document.elementFromPoint = () => mandrakeButton;
        mandrakeButton.dispatchEvent(
          createPointerEvent('pointerdown', { clientX: 320, clientY: 360 }),
        );
        document.dispatchEvent(createPointerEvent('pointerup', { clientX: 320, clientY: 360 }));
        mandrakeButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      } finally {
        document.elementFromPoint = originalElementFromPoint;
      }

      expect(stage.querySelector('.brewing-page__cauldron')?.textContent).toContain(
        '1 mandrake',
      );
      expect(stage.querySelector('.brewing-page__herbs')?.textContent).toContain('mandrake0');
    } finally {
      restoreMatchMedia();
    }
  });

  it('keeps Brewing cauldron remove rows stable through snapshot renders', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    markSeedResearchComplete(gameplayFacade, 'sageSeed');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    pagesFacade.show('brewing');

    const sageButton = [...stage.querySelectorAll('.brewing-page__herb-button')].find(
      (button) => button.textContent === 'sage3',
    );

    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const ingredientRow = stage.querySelector('.brewing-page__ingredient-row');

    expect(ingredientRow?.textContent).toBe('1 sage');
    expect(ingredientRow?.dataset.resourceColor).toBeUndefined();
    expect(
      ingredientRow?.querySelector('.brewing-page__ingredient-count')?.dataset.resourceColor,
    ).toBe('herb');
    expect(ingredientRow?.querySelector('.row_key')?.dataset.resourceColor).toBe('herb');
    expect(ingredientRow?.querySelector('.row_val')?.dataset.resourceColor).toBeUndefined();

    gameplayFacade.setMana(5);

    expect(ingredientRow.parentElement).toBe(stage.querySelector('.brewing-page__cauldron-items'));
    expect(stage.querySelector('.brewing-page__ingredient-row')).toBe(ingredientRow);

    ingredientRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__cauldron')?.textContent).toContain('empty');
    expect(stage.querySelector('.brewing-page__cauldron-count')?.textContent).toBe('0/5');
    expect(stage.querySelector('.brewing-page__cauldron-status')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__herbs')?.textContent).toContain('sage3');
  });

  it('groups adjacent Brewing cauldron herbs without numbered rows', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    gameplayFacade.getSnapshot().brewing.herbs.push({
      itemTypeId: 1003,
      key: 'nettleHerb',
      label: 'nettle',
      kind: 'herb',
      quantity: 2,
      stagedQuantity: 0,
      availableQuantity: 2,
    });
    markSeedResearchComplete(gameplayFacade, 'sageSeed', 'nettleSeed');

    pagesFacade.mount(stage);
    pagesFacade.show('brewing');

    const herbButtons = [...stage.querySelectorAll('.brewing-page__herb-button')];
    const sageButton = herbButtons.find((button) => button.textContent === 'sage3');
    const nettleButton = herbButtons.find((button) => button.textContent === 'nettle2');

    nettleButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    nettleButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const ingredientRows = [...stage.querySelectorAll('.brewing-page__ingredient-row')].filter(
      (row) => !row.hidden,
    );

    expect(ingredientRows.map((row) => row.textContent)).toEqual([
      '2 nettle',
      '1 sage',
    ]);
    expect(stage.querySelector('.brewing-page__cauldron')?.textContent).not.toContain(
      '1. nettle',
    );
    expect(stage.querySelector('.brewing-page__cauldron')?.textContent).not.toContain(
      '2. nettle',
    );
  });

  it('buys research from the research page', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 3);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    gameplayFacade.setCoin(25);
    pagesFacade.mount(stage);
    clickRoomTab(stage, 'research');

    const researchButton = [...stage.querySelectorAll('.research-page__research-button')].find(
      (button) => button.textContent === '20 coin',
    );

    expect(researchButton.textContent).toBe('20 coin');
    expect(researchButton.disabled).toBe(false);

    researchButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(gameplayFacade.getSnapshot().coin.current).toBe(5);
    expect(stage.querySelector('.room-top-panel')?.textContent).toContain('5 coin');
    expect(stage.querySelector('.research-page__content')?.textContent).toContain('researched');
  });

  it('shows active research as researching with a progress bar', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 3);
    const research = gameplayFacade
      .getSnapshot()
      .research.boxes.find((box) => box.id === 'seedUnlocks').researches[0];

    Object.assign(research, {
      value: 'researching',
      completed: false,
      inProgress: true,
      canResearch: false,
      totalMs: 10_000,
      remainingMs: 7_500,
      progress: 0.25,
    });

    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'research');

    const row = stage.querySelector('.research-page__row.is-in-progress');
    const progressBar = row?.querySelector('.research-page__research-progress');

    expect(row?.classList.contains('is-unavailable')).toBe(false);
    expect(row?.querySelector('.research-page__research-value')?.textContent).toBe(
      'researching 8s',
    );
    expect(row?.querySelector('.research-page__research-value-label')?.textContent).toBe(
      'researching',
    );
    expect(row?.querySelector('.research-page__research-value-timer')?.textContent).toBe(
      '8s',
    );
    expect(progressBar?.classList.contains('style-progress')).toBe(true);
    expect(progressBar?.classList.contains('style-progress--timer')).toBe(true);
    expect(progressBar?.getAttribute('role')).toBe('progressbar');
    expect(progressBar?.getAttribute('aria-valuenow')).toBe('25');
    expect(
      progressBar?.querySelector('.research-page__research-progress-fill')?.style.transform,
    ).toBe('scaleX(0.25)');

    research.remainingMs = 2_000;
    research.progress = 0.8;
    gameplayFacade.publishSnapshot();

    expect(row?.querySelector('.research-page__research-value')?.textContent).toBe(
      'researching 2s',
    );
    expect(progressBar?.getAttribute('aria-valuenow')).toBe('80');
    expect(
      progressBar?.querySelector('.research-page__research-progress-fill')?.style.transform,
    ).toBe('scaleX(0.8)');
  });

  it('marks unaffordable and locked research rows unavailable', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 3);
    const seedBox = gameplayFacade
      .getSnapshot()
      .research.boxes.find((box) => box.id === 'seedUnlocks');

    seedBox.researches.push({
      id: 'unlockSeed:mintSeed',
      label: 'mint seed',
      value: 'locked',
      effect: 'drop',
      costCoin: 2,
      completed: false,
      locked: true,
      canResearch: false,
    });

    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'research');

    const findResearchRow = (label) =>
      [...stage.querySelectorAll('.research-page__research-name')]
        .find((name) => name.textContent === label)
        ?.closest('.research-page__row');

    expect(findResearchRow('x2 summon')?.classList.contains('is-unavailable')).toBe(
      true,
    );
    expect(findResearchRow('mint seed')?.classList.contains('is-unavailable')).toBe(true);
    expect(findResearchRow('mint seed')?.classList.contains('is-locked')).toBe(true);

    gameplayFacade.setCoin(25);

    expect(findResearchRow('x2 summon')?.classList.contains('is-unavailable')).toBe(
      false,
    );
  });

  it('shows at most three locked research rows in each block', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 3);
    const seedBox = gameplayFacade
      .getSnapshot()
      .research.boxes.find((box) => box.id === 'seedUnlocks');

    seedBox.researches.push(
      {
        id: 'unlockSeed:mintSeed',
        label: 'mint seed',
        value: 'locked',
        effect: 'drop',
        costCoin: 2,
        completed: false,
        locked: true,
        canResearch: false,
      },
      {
        id: 'unlockSeed:nettleSeed',
        label: 'nettle seed',
        value: 'locked',
        effect: 'drop',
        costCoin: 3,
        completed: false,
        locked: true,
        canResearch: false,
      },
      {
        id: 'unlockSeed:lavenderSeed',
        label: 'lavender seed',
        value: 'locked',
        effect: 'drop',
        costCoin: 5,
        completed: false,
        locked: true,
        canResearch: false,
      },
      {
        id: 'unlockSeed:briarSeed',
        label: 'briar seed',
        value: 'locked',
        effect: 'drop',
        costCoin: 8,
        completed: false,
        locked: true,
        canResearch: false,
      },
    );

    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'research');

    const seedResearchNames = [
      ...stage.querySelectorAll(
        '.research-page__box--seedUnlocks .research-page__research-name',
      ),
    ].map((name) => name.textContent);

    expect(seedResearchNames).toEqual([
      'sage seed',
      'mint seed',
      'nettle seed',
      'lavender seed',
    ]);
  });

  it('shows research info dialog when a research name is clicked', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 3);
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'research');

    const popup = stage.querySelector('.research-page__info-popup');
    const labelButton = stage.querySelector('.research-page__research-label-button');

    expect(popup).not.toBeNull();
    expect(popup.hidden).toBe(true);
    expect(labelButton.querySelector('.research-page__research-name')?.textContent).toBe(
      'sage seed',
    );
    expect(labelButton.querySelector('.research-page__research-effect')).toBeNull();

    labelButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
    expect(popup.querySelector('[role="dialog"]')).not.toBeNull();
    expect(popup.textContent).toContain('sage seed');
    expect(popup.textContent).toContain('allows sage seed to drop from summon seed');

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));

    expect(popup.hidden).toBe(true);
  });

  it('explains missing requirements when a locked research row is tapped', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    unlockWorkshopSecondaryActions(gameplayFacade, 4);
    const recipeBox = gameplayFacade
      .getSnapshot()
      .research.boxes.find((box) => box.id === 'recipeUnlocks');

    recipeBox.researches.push({
      id: 'unlockRecipe:minorHealingPotion',
      label: 'minor healing potion',
      value: 'locked',
      effect: 'brew',
      costCoin: 7,
      completed: false,
      locked: true,
      canResearch: false,
      requiredResearchIds: ['unlockRecipe:manaTonic'],
      requiredPlayerLevel: 5,
      description: 'allows valid cauldron ingredients to brew minor healing potion.',
    });

    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'research');

    const popup = stage.querySelector('.research-page__info-popup');
    const row = [...stage.querySelectorAll('.research-page__row')].find((candidate) =>
      candidate.textContent?.includes('minor healing potion'),
    );

    expect(popup).not.toBeNull();
    expect(popup.hidden).toBe(true);
    expect(row?.classList.contains('is-locked')).toBe(true);

    dispatchTouchTap(row);

    expect(popup.hidden).toBe(false);
    expect(popup.textContent).toContain(
      'allows valid cauldron ingredients to brew minor healing potion.',
    );
    expect(popup.textContent).toContain(
      'requires mana tonic research and level 5.',
    );
  });

  it('sets selected NPC market stand item', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    markSeedResearchComplete(gameplayFacade, 'sageSeed');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'shop');

    clickNpcMarketStandLabel(stage);

    expect(stage.querySelector('.shop-page__sell-popup').hidden).toBe(false);
    expect(stage.querySelector('.shop-page__shelf-message')).toBeNull();
    expect(stage.querySelector('.shop-page__sell-popup')?.textContent).toContain('seeds');
    expect(stage.querySelector('.shop-page__sell-popup')?.textContent).toContain('herbs');
    expect(stage.querySelector('.shop-page__sell-popup')?.textContent).toContain('potions');
    expect(stage.querySelector('.shop-page__sell-popup')?.textContent).toContain(
      'sage seed (0) 1 coin',
    );
    expect(
      stage.querySelector('.shop-page__sell-dialog .shop-page__sell-tab-button'),
    ).toBeNull();
    expect(
      stage.querySelector('.shop-page__sell-dialog')?.nextElementSibling,
    ).toBe(stage.querySelector('.shop-page__sell-tabs'));
    expect(
      [...stage.querySelectorAll('.shop-page__sell-item-row')]
        .filter((row) => !row.hidden)
        .map((row) => row.textContent)[0],
    ).toBe('empty');

    const seedButton = [...stage.querySelectorAll('.shop-page__sell-item-button')].find(
      (button) => button.textContent === 'sage seed (0) 1 coin',
    );
    seedButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.shop-page__sell-mark-all-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain(
      '1.sage seed (0) 1 coin',
    );
    const seedItemValue = stage.querySelector('.shop-page__slot-item-value');
    expect(seedItemValue?.getAttribute('data-resource-color')).toBe('seed');
    expect(seedItemValue?.classList.contains('is-empty')).toBe(true);
    expect(
      stage
        .querySelector('.shop-page__slot-price-value')
        ?.getAttribute('data-resource-color'),
    ).toBe('coin');
    expect(stage.querySelector('.shop-page__shelf')?.textContent).not.toContain(
      '1. sells sage seed',
    );
    expect(stage.querySelector('.shop-page__sell-popup').hidden).toBe(true);
  });

  it('colors NPC market item names and prices separately', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    gameplayFacade.setCoin(3);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'shop');

    clickNpcMarketStandLabel(stage);

    [...stage.querySelectorAll('.shop-page__sell-tab-button')]
      .find((button) => button.textContent === 'potions')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    [...stage.querySelectorAll('.shop-page__sell-item-button')]
      .find((button) => button.textContent === 'mana tonic (0) 5 coin')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.shop-page__sell-mark-all-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const itemValue = stage.querySelector('.shop-page__slot-item-value');
    const priceValue = stage.querySelector('.shop-page__slot-price-value');

    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain(
      '1.mana tonic (0) 5 coin',
    );
    expect(itemValue?.textContent).toBe('mana tonic (0)');
    expect(itemValue?.getAttribute('data-resource-color')).toBe('potion');
    expect(itemValue?.classList.contains('is-empty')).toBe(true);
    expect(priceValue?.textContent).toBe(' 5 coin');
    expect(priceValue?.getAttribute('data-resource-color')).toBe('coin');
  });

  it('does not open shop sell picker for locked NPC market stands', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'shop');

    const lockedRows = [...stage.querySelectorAll('.shop-page__slot-row')].filter(
      (row) => !row.classList.contains('shop-page__slot-row--interactive'),
    );
    expect(lockedRows.every((row) => row.classList.contains('is-locked'))).toBe(true);
    lockedRows[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__sell-popup').hidden).toBe(true);
  });

  it('clears selected NPC market stand item from the sell picker', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    markSeedResearchComplete(gameplayFacade, 'sageSeed');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'shop');

    clickNpcMarketStandLabel(stage);
    [...stage.querySelectorAll('.shop-page__sell-item-button')]
      .find((button) => button.textContent === 'sage seed (0) 1 coin')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.shop-page__sell-mark-all-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain(
      '1.sage seed (0) 1 coin',
    );

    clickNpcMarketStandLabel(stage);

    const visibleRows = [...stage.querySelectorAll('.shop-page__sell-item-row')].filter(
      (row) => !row.hidden,
    );
    const emptyButton = visibleRows[0].querySelector('.shop-page__sell-item-button');
    expect(emptyButton.textContent).toBe('empty');
    expect(emptyButton.classList.contains('shop-page__sell-empty-button')).toBe(false);
    expect(visibleRows[0].classList.contains('shop-page__sell-empty-row')).toBe(false);
    emptyButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain(
      '1.empty standselect',
    );
    expect(stage.querySelector('.shop-page__shelf')?.textContent).not.toContain('1.select');
    expect(stage.querySelector('.shop-page__sell-popup').hidden).toBe(true);
  });

  it('updates visible shop sell prices from gameplay snapshots while hiding needs', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    markSeedResearchComplete(gameplayFacade, 'sageSeed');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'shop');
    clickNpcMarketStandLabel(stage);

    const seedButton = [...stage.querySelectorAll('.shop-page__sell-item-button')].find(
      (button) => button.textContent === 'sage seed (0) 1 coin',
    );
    seedButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.shop-page__sell-mark-all-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    gameplayFacade.setShopSellCoin('seed', 7);

    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain(
      '1.sage seed (0) 7 coin',
    );

    gameplayFacade.setShopSellNeed(1, 4);

    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain(
      '1.sage seed (0) 7 coin',
    );
    expect(stage.querySelector('.shop-page__shelf')?.textContent).not.toContain('need 4');

    clickNpcMarketStandLabel(stage);

    expect(stage.querySelector('.shop-page__sell-popup')?.textContent).toContain(
      'sage seed (0) 7 coin',
    );
  });

  it('hides shop sell rows missing from the latest snapshot', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'shop');
    clickNpcMarketStandLabel(stage);

    gameplayFacade.setShopSellItems([
      {
        itemTypeId: 2,
        key: 'mintSeed',
        label: 'mint seed',
        kind: 'seed',
        quantity: 1,
        sellCoin: 1,
      },
    ]);

    const visibleRows = [...stage.querySelectorAll('.shop-page__sell-item-row')]
      .filter((row) => !row.hidden)
      .map((row) => row.textContent);
    const sageRow = [...stage.querySelectorAll('.shop-page__sell-item-row')].find((row) =>
      row.textContent.includes('sage seed'),
    );
    const mintButton = [...stage.querySelectorAll('.shop-page__sell-item-button')].find(
      (button) => button.textContent === 'mint seed (1) 1 coin',
    );

    expect(visibleRows).toEqual(['empty', 'mint seed (1) 1 coin']);
    expect(mintButton?.disabled).toBe(false);
    expect(sageRow?.hidden ?? true).toBe(true);
  });

  it('keeps zero count visible on a selected NPC market item missing from sell rows', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    markSeedResearchComplete(gameplayFacade, 'sageSeed');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'shop');
    clickNpcMarketStandLabel(stage);

    [...stage.querySelectorAll('.shop-page__sell-item-button')]
      .find((button) => button.textContent === 'sage seed (0) 1 coin')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.shop-page__sell-mark-all-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    gameplayFacade.setShopSellItems([]);

    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain(
      '1.sage seed (0) 1 coin',
    );
  });

  it('switches shop sell item tabs', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    markSeedResearchComplete(gameplayFacade, 'sageSeed');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'shop');
    clickNpcMarketStandLabel(stage);

    const tabButtons = [...stage.querySelectorAll('.shop-page__sell-tab-button')];
    const herbsButton = tabButtons.find((button) => button.textContent === 'herbs');
    const potionsButton = tabButtons.find((button) => button.textContent === 'potions');

    herbsButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const sageHerbButton = [...stage.querySelectorAll('.shop-page__sell-item-button')].find(
      (button) => button.textContent === 'sage (0) 2 coin',
    );
    expect(sageHerbButton.closest('.shop-page__sell-item-row').hidden).toBe(false);

    potionsButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const visiblePotionRows = [...stage.querySelectorAll('.shop-page__sell-item-row')]
      .filter((row) => !row.hidden)
      .map((row) => row.textContent);
    expect(visiblePotionRows).not.toContain('mana tonic (locked) 5 coin');
  });

  it('hides shop sell picker with Escape or outside click', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'shop');

    const popup = stage.querySelector('.shop-page__sell-popup');
    clickNpcMarketStandLabel(stage);
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(popup.hidden).toBe(true);

    clickNpcMarketStandLabel(stage);
    popup.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(true);
  });

  it('sets player market listings and buys selected quantities from player market', async () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const playerShopFacade = createPlayerShopFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerShopFacade,
    });

    gameplayFacade.setShopSellItemQuantity(1, 4);
    gameplayFacade.setCoin(10);
    pagesFacade.mount(stage);
    clickRoomTab(stage, 'shop');

    [...stage.querySelectorAll('.shop-page__market-tab-button')]
      .find((button) => button.textContent === 'player market')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(
      stage
        .querySelector('.shop-page__market-panel--player')
        ?.hasAttribute('hidden'),
    ).toBe(false);
    const firstRequestRow = stage.querySelector('.shop-page__player-request-row');
    expect(firstRequestRow?.querySelector('.shop-page__request-row-item')?.textContent).toBe(
      'empty request',
    );
    expect(firstRequestRow?.querySelector('.shop-page__request-row-price')?.textContent).toBe(
      'request item',
    );

    firstRequestRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const requestPopup = stage.querySelector('.shop-page__request-popup');
    expect(requestPopup.hidden).toBe(false);

    expect(requestPopup.querySelector('.shop-page__request-tabs')?.textContent).toBe(
      'seedsherbspotions',
    );
    [...requestPopup.querySelectorAll('.shop-page__sell-item-button')]
      .find((button) => button.textContent === 'sage seed (4)')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const [requestQuantityInput, requestCoinInput] =
      requestPopup.querySelectorAll('.shop-page__request-input');
    requestQuantityInput.value = '3';
    requestCoinInput.value = '2.5';
    requestPopup
      .querySelector('.shop-page__request-place-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(requestPopup.hidden).toBe(true);
    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '1.sage seed (3) 2.5 coin',
    );

    expect(stage.querySelector('.shop-page__player-shelf')?.textContent).toContain(
      'player market',
    );
    expect(stage.querySelector('.shop-page__player-proceeds-row')).toBeNull();
    expect(stage.querySelector('.shop-page__player-shelf')?.textContent).not.toContain(
      'sales',
    );

    stage
      .querySelector('.shop-page__player-shelf .shop-page__slot-row--interactive')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const listingPopup = stage.querySelector('.shop-page__player-listing-popup');
    expect(listingPopup.textContent).toContain('quantity');
    expect(listingPopup.textContent).toContain('coin each');
    const listingSpace = listingPopup.querySelector('.shop-page__player-listing-space');
    expect(listingSpace).not.toBeNull();
    expect(listingPopup.querySelector('.shop-page__player-listing-choice-row')).toBeNull();
    expect(
      listingSpace.querySelector('.shop-page__player-listing-place-button'),
    ).not.toBeNull();
    expect(listingPopup.querySelector('.shop-page__player-listing-choice-divider')).not.toBeNull();
    const [quantityInput, valueInput] = listingPopup.querySelectorAll(
      '.shop-page__player-listing-input',
    );
    quantityInput.value = '2';
    valueInput.value = '4';
    const sageListingButton = [...listingPopup.querySelectorAll('.shop-page__sell-item-button')]
      .find((button) => button.textContent === 'sage seed (4)');
    sageListingButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(sageListingButton.getAttribute('aria-pressed')).toBe('true');
    expect(quantityInput.value).toBe('2');
    expect(valueInput.value).toBe('4');
    const firstPlayerStand = stage.querySelector(
      '.shop-page__player-shelf .shop-page__player-slot-row',
    );
    expect(firstPlayerStand?.querySelector('.shop-page__slot-item-value')?.textContent).toBe(
      'empty stand',
    );
    expect(firstPlayerStand?.querySelector('.shop-page__slot-price-value')?.textContent).toBe(
      'select',
    );
    expect(listingPopup.hidden).toBe(false);

    listingPopup
      .querySelector('.shop-page__player-listing-place-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(stage.querySelector('.shop-page__player-shelf')?.textContent).toContain(
      '1.sage seed (2) 4 coin',
    );
    expect(
      stage
        .querySelector('.shop-page__player-shelf .shop-page__slot-item-value')
        ?.getAttribute('data-resource-color'),
    ).toBe('seed');
    expect(
      stage
        .querySelector('.shop-page__player-shelf .shop-page__slot-price-value')
        ?.getAttribute('data-resource-color'),
    ).toBe('coin');
    expect(listingPopup.hidden).toBe(true);

    stage
      .querySelector('.shop-page__other-shops-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const marketPopup = stage.querySelector('.shop-page__market-popup');
    expect(marketPopup.hidden).toBe(false);
    expect(marketPopup.textContent).toContain('Ada');
    expect(marketPopup.textContent).toContain('- sage seed (2)');

    const buyQuantityInput = marketPopup.querySelector('.shop-page__market-quantity-input');
    buyQuantityInput.value = '2';
    buyQuantityInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    marketPopup
      .querySelector('.shop-page__market-buy-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(gameplayFacade.getSnapshot().coin.current).toBe(4);
    expect(marketPopup.textContent).toContain('empty');

    playerShopFacade.setProceedsCoin(5);
    const claimProceedsButton = stage.querySelector('.shop-page__claim-proceeds-button');
    expect(claimProceedsButton?.hidden).toBe(false);
    expect(claimProceedsButton?.textContent).toBe('claim (5 coin)');
    claimProceedsButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(gameplayFacade.getSnapshot().coin.current).toBe(9);
    expect(claimProceedsButton.hidden).toBe(true);
  });

});
