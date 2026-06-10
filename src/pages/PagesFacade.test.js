// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { PagesFacade } from './PagesFacade.js';

function createGameplayFacadeFake() {
  const snapshot = {
    mana: {
      current: 0,
      cap: 50,
      perSecond: 1,
    },
    gold: {
      current: 0,
    },
    crystal: {
      current: 0,
    },
    inventory: [],
    seedInventory: [
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'Sage Seed',
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
        completedTasks: 1,
        totalTasks: 2,
        tasks: [
          {
            taskId: 'level1-sage-seeds',
            level: 1,
            action: 'drop',
            itemTypeId: 1,
            itemKey: 'sageSeed',
            itemLabel: 'Sage Seed',
            itemKind: 'seed',
            requiredQuantity: 20,
            progressQuantity: 20,
            remainingQuantity: 0,
            ownedQuantity: 0,
            progress: 1,
            maxed: true,
            completed: true,
            canFill: false,
            canComplete: false,
          },
          {
            taskId: 'level1-sage-herb',
            level: 1,
            action: 'drop',
            itemTypeId: 1001,
            itemKey: 'sageHerb',
            itemLabel: 'Sage',
            itemKind: 'herb',
            requiredQuantity: 10,
            progressQuantity: 3,
            remainingQuantity: 7,
            ownedQuantity: 3,
            progress: 0.3,
            maxed: false,
            completed: false,
            canFill: true,
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
            'max npc market stands 1',
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
            maxGardenTiles: 2,
            maxCauldrons: 1,
            maxNpcMarketStands: 1,
            maxPlayerMarketStands: 1,
            maxManaCap: 100,
            manaPerSecond: 2,
          },
          effects: ['max mana cap 100', 'mana regen 2/sec'],
        },
        {
          level: 3,
          current: false,
          unlocked: false,
          totals: {
            maxGardenTiles: 3,
            maxCauldrons: 1,
            maxNpcMarketStands: 1,
            maxPlayerMarketStands: 1,
            maxManaCap: 150,
            manaPerSecond: 3,
          },
          effects: ['max garden tiles 3', 'max mana cap 150', 'mana regen 3/sec'],
        },
      ],
    },
    brewing: {
      herbs: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'Sage',
          kind: 'herb',
          quantity: 3,
          stagedQuantity: 0,
          availableQuantity: 3,
        },
        {
          itemTypeId: 1002,
          key: 'mintHerb',
          label: 'Mint',
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
          label: 'Mana Tonic',
          manaCost: 12,
          brewDurationMs: 30_000,
          unlocked: false,
          ingredients: [
            {
              itemTypeId: 1001,
              key: 'sageHerb',
              label: 'Sage',
              kind: 'herb',
              quantity: 3,
            },
          ],
        },
        {
          potionTypeId: 2002,
          key: 'minorHealingPotion',
          label: 'Minor Healing Potion',
          manaCost: 14,
          brewDurationMs: 35_000,
          unlocked: false,
          ingredients: [
            {
              itemTypeId: 1001,
              key: 'sageHerb',
              label: 'Sage',
              kind: 'herb',
              quantity: 2,
            },
            {
              itemTypeId: 1002,
              key: 'mintHerb',
              label: 'Mint',
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
    },
    discoveries: {
      seeds: [],
      herbs: [],
      potions: [
        {
          itemTypeId: 2019,
          key: 'ashenMemory',
          label: 'Ashen Memory',
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
              label: 'Sage',
              kind: 'herb',
              quantity: 5,
            },
            {
              itemTypeId: 1002,
              key: 'mintHerb',
              label: 'Mint',
              kind: 'herb',
              quantity: 3,
            },
            {
              itemTypeId: 1003,
              key: 'nettleHerb',
              label: 'Nettle',
              kind: 'herb',
              quantity: 10,
            },
          ],
        },
        {
          itemTypeId: 2020,
          key: 'silverleafQuiet',
          label: 'Silverleaf Quiet',
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
          ingredients: [
            {
              itemTypeId: 1002,
              key: 'mintHerb',
              label: 'Mint',
              kind: 'herb',
              quantity: 1,
            },
            {
              itemTypeId: 1006,
              key: 'glowcapHerb',
              label: 'Glowcap',
              kind: 'herb',
              quantity: 1,
            },
            {
              itemTypeId: 1009,
              key: 'moonflowerHerb',
              label: 'Moonflower',
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
          message: 'sold Sage Seed for 1 gold',
          createdAt: 1_000,
        },
        {
          id: 2,
          type: 'gameplay',
          message: 'brewed Wasted Potion',
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
              label: 'Sage Seed',
              value: 'free',
              effect: 'drop',
              costGold: 0,
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
              value: '20 gold',
              effect: '20 mana',
              costGold: 20,
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
              label: 'Mana Tonic',
              value: '3 gold',
              effect: 'brew',
              costGold: 3,
              completed: false,
              canResearch: false,
            },
          ],
        },
      ],
    },
    shop: {
      shelf: {
        unlockedSlots: 1,
        maxSlots: 5,
        slotCosts: [0, 1, 3, 6, 10],
        nextSlotNumber: 2,
        nextSlotCost: 1,
        selectedSlotNumber: 1,
        autoSellSeconds: 5,
        sellKinds: [
          { id: 1, kind: 'seed', label: 'seeds', sellGold: 1 },
          { id: 2, kind: 'herb', label: 'herbs', sellGold: 2 },
          { id: 3, kind: 'potion', label: 'potions', sellGold: 5 },
        ],
        sellItems: [
          {
            itemTypeId: 1,
            key: 'sageSeed',
            label: 'Sage Seed',
            kind: 'seed',
            quantity: 0,
            sellGold: 1,
          },
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'Sage',
            kind: 'herb',
            quantity: 0,
            sellGold: 2,
          },
          {
            itemTypeId: 2001,
            key: 'manaTonic',
            label: 'Mana Tonic',
            kind: 'potion',
            quantity: 0,
            sellGold: 5,
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
      playerShelf: {
        unlockedSlots: 1,
        maxSlots: 5,
        slotCosts: [0, 1, 3, 6, 10],
        nextSlotNumber: 2,
        nextSlotCost: 1,
        selectedSlotNumber: 1,
        sellKinds: [
          { id: 1, kind: 'seed', label: 'seeds', sellGold: 1 },
          { id: 2, kind: 'herb', label: 'herbs', sellGold: 2 },
          { id: 3, kind: 'potion', label: 'potions', sellGold: 5 },
        ],
        sellItems: [
          {
            itemTypeId: 1,
            key: 'sageSeed',
            label: 'Sage Seed',
            kind: 'seed',
            quantity: 0,
            sellGold: 1,
          },
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'Sage',
            kind: 'herb',
            quantity: 0,
            sellGold: 2,
          },
          {
            itemTypeId: 2001,
            key: 'manaTonic',
            label: 'Mana Tonic',
            kind: 'potion',
            quantity: 0,
            sellGold: 5,
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
            priceGold: 0,
          },
          {
            slotNumber: 2,
            unlocked: false,
            itemTypeId: null,
            itemKey: null,
            itemKind: null,
            itemLabel: null,
            quantity: 0,
            priceGold: 0,
          },
          {
            slotNumber: 3,
            unlocked: false,
            itemTypeId: null,
            itemKey: null,
            itemKind: null,
            itemLabel: null,
            quantity: 0,
            priceGold: 0,
          },
          {
            slotNumber: 4,
            unlocked: false,
            itemTypeId: null,
            itemKey: null,
            itemKind: null,
            itemLabel: null,
            quantity: 0,
            priceGold: 0,
          },
          {
            slotNumber: 5,
            unlocked: false,
            itemTypeId: null,
            itemKey: null,
            itemKind: null,
            itemLabel: null,
            quantity: 0,
            priceGold: 0,
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
        harvestSeconds: 10,
        tiles: Array.from({ length: 10 }, (_value, index) => ({
          tileNumber: index + 1,
          unlocked: index === 0,
          selectedSeedItemTypeId: null,
          selectedSeedKey: null,
          selectedSeedLabel: null,
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
          label: 'Sage Seed',
          kind: 'seed',
          quantity: 0,
        },
      ],
      herbs: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'Sage',
          kind: 'herb',
          quantity: 3,
        },
        {
          itemTypeId: 1002,
          key: 'mintHerb',
          label: 'Mint',
          kind: 'herb',
          quantity: 1,
        },
      ],
    },
    leaderboard: {
      topUsers: [
        {
          name: 'Ada',
          playerLevel: 2,
          income: 3,
          totalIncome: 120,
        },
        {
          name: 'Merlin',
          playerLevel: 10,
          income: 9,
          totalIncome: 75,
        },
      ],
    },
  };
  const advancedResearchBoxes = [
    {
      id: 'autoPlantTiles',
      label: 'auto plant tile research',
      researches: [
        {
          id: 'automation:autoPlantTile:1',
          label: 'auto plant tile 1',
          value: '50000 gold',
          effect: 'auto',
          costGold: 50000,
          completed: false,
          canResearch: false,
        },
        {
          id: 'automation:autoPlantTile:2',
          label: 'auto plant tile 2',
          value: 'locked',
          effect: 'auto',
          costGold: 75000,
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
          value: '75000 gold',
          effect: 'auto',
          costGold: 75000,
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
          value: '100000 gold',
          effect: 'auto',
          costGold: 100000,
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
          value: '125000 gold',
          effect: 'auto',
          costGold: 125000,
          completed: false,
          canResearch: false,
        },
      ],
    },
    {
      id: 'autoCollectCauldrons',
      label: 'auto collect cauldron research',
      researches: [
        {
          id: 'automation:autoCollectCauldron:1',
          label: 'auto collect cauldron 1',
          value: '150000 gold',
          effect: 'auto',
          costGold: 150000,
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
      id: 'advanced',
      label: 'advanced research',
      boxes: advancedResearchBoxes,
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
      research.canResearch = !research.completed && snapshot.gold.current >= research.costGold;
    }
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
        label: 'Mana Tonic',
        manaCost: 12,
        brewDurationMs: 30_000,
        unlocked,
      };
      snapshot.brewing.buttonLabel = unlocked ? 'brew Mana Tonic' : 'brew';
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

  const updateGardenNextTile = () => {
    const garden = snapshot.garden.plot;
    const nextTileNumber = garden.unlockedTiles + 1;
    const nextTileCost = garden.tileCosts[nextTileNumber - 1] ?? null;
    garden.nextTileNumber = nextTileCost === null ? null : nextTileNumber;
    garden.nextTileCost = nextTileCost;
  };

  const gameplayFacade = {
    getSnapshot: () => snapshot,
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
    buyShopShelfSlot: () => ({
      ok: false,
      reason: 'not_enough_gold',
      cost: 1,
      slotNumber: 2,
    }),
    buyPlayerShopShelfSlot: () => ({
      ok: false,
      reason: 'not_enough_gold',
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

      if (snapshot.gold.current < cost) {
        return {
          ok: false,
          reason: 'not_enough_gold',
          cost,
          tileNumber,
        };
      }

      snapshot.gold.current -= cost;
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

      const herbLabel = seed.label.replace(/ Seed$/, '');
      const herb = {
        itemTypeId: 1000 + seed.itemTypeId,
        key: `${seed.key.replace(/Seed$/, '')}Herb`,
        label: herbLabel,
        kind: 'herb',
      };

      seed.quantity -= 1;
      tile.selectedSeedItemTypeId = seed.itemTypeId;
      tile.selectedSeedKey = seed.key;
      tile.selectedSeedLabel = seed.label;
      tile.seedItemTypeId = seed.itemTypeId;
      tile.seedKey = seed.key;
      tile.seedLabel = seed.label;
      tile.herbItemTypeId = herb.itemTypeId;
      tile.herbKey = herb.key;
      tile.herbLabel = herb.label;
      tile.phase = 'growing';
      tile.totalMs = 20_000;
      tile.remainingMs = 20_000;
      tile.progress = 0;
      tile.process = {
        phase: 'growing',
        totalMs: 20_000,
        remainingMs: 20_000,
        progress: 0,
      };
      publish();

      return {
        ok: true,
        tileNumber,
        seed,
        herb,
        durationMs: 20_000,
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
      tile.totalMs = 10_000;
      tile.remainingMs = 10_000;
      tile.progress = 0;
      tile.process = {
        phase: 'harvesting',
        totalMs: 10_000,
        remainingMs: 10_000,
        progress: 0,
      };
      publish();

      return {
        ok: true,
        tileNumber,
        herb: {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'Sage',
          kind: 'herb',
        },
        durationMs: 10_000,
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
          cost: research.costGold,
        };
      }

      if (snapshot.gold.current < research.costGold) {
        return {
          ok: false,
          reason: 'not_enough_gold',
          researchId,
          cost: research.costGold,
        };
      }

      snapshot.gold.current -= research.costGold;
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
        cost: research.costGold,
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
        label: snapshot.brewing.match?.label ?? 'Wasted Potion',
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
    collectBrewingPotion: () => {
      if (!snapshot.brewing.activeBrew?.canCollect) {
        return {
          ok: false,
          reason: 'bottling_not_done',
        };
      }

      const activeBrew = snapshot.brewing.activeBrew;
      const potion = {
        itemTypeId: activeBrew.resultItemTypeId,
        key: activeBrew.key,
        label: activeBrew.label,
        kind: 'potion',
      };
      snapshot.inventory.push({
        ...potion,
        quantity: 1,
      });
      snapshot.brewing.activeBrew = null;
      updateBrewing();
      publish();

      return {
        ok: true,
        potion,
        quantity: 1,
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
      slot.sellGold = item.sellGold;
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
      slot.sellGold = null;
      slot.sellProgressSeconds = 0;
      return {
        ok: true,
        slotNumber,
      };
    },
    setSelectedPlayerShopShelfSlotListing: ({ itemTypeId, quantity, priceGold }) => {
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
      slot.priceGold = priceGold;
      publish();

      return {
        ok: true,
        slotNumber,
        item,
        quantity,
        priceGold,
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
      slot.priceGold = 0;
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
        slot.priceGold = 0;
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
    buyPlayerShopListingItem: ({ itemKey, quantity = 1, priceGold }) => {
      const totalPriceGold = quantity * priceGold;

      if (snapshot.gold.current < totalPriceGold) {
        return {
          ok: false,
          reason: 'not_enough_gold',
        };
      }

      snapshot.gold.current -= totalPriceGold;
      publish();

      return {
        ok: true,
        item: { key: itemKey },
        quantity,
        priceGold,
        totalPriceGold,
      };
    },
    claimPlayerShopSaleProceeds: (gold) => {
      snapshot.gold.current += gold;
      publish();

      return {
        ok: true,
        gold,
      };
    },
    setShopSellGold: (kind, sellGold) => {
      for (const sellKind of snapshot.shop.shelf.sellKinds) {
        if (sellKind.kind === kind) {
          sellKind.sellGold = sellGold;
        }
      }

      for (const item of snapshot.shop.shelf.sellItems) {
        if (item.kind === kind) {
          item.sellGold = sellGold;
        }
      }

      for (const slot of snapshot.shop.shelf.slots) {
        if (slot.sellKind === kind) {
          slot.sellGold = sellGold;
        }
      }

      publish();
    },
    setShopSellItems: (sellItems) => {
      snapshot.shop.shelf.sellItems = sellItems;
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
    setGold: (amount) => {
      snapshot.gold.current = amount;
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

function markSeedResearchComplete(gameplayFacade, ...seedKeys) {
  const research = gameplayFacade.getSnapshot().research;
  const completedResearchIds = new Set(research.completedResearchIds ?? []);

  for (const seedKey of seedKeys) {
    completedResearchIds.add(`unlockSeed:${seedKey}`);
  }

  research.completedResearchIds = [...completedResearchIds];
}

function clickRoomTab(stage, pageId) {
  const button = stage.querySelector(`.room-bottom-panel__tab[data-page-id="${pageId}"]`);
  expect(button).not.toBeNull();
  button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

function createPlayerFacadeFake(
  initialUsername = 'wizard',
  initialTheme = 'white',
  { shouldPromptForUsername = false } = {},
) {
  let snapshot = {
    username: initialUsername,
    theme: initialTheme,
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
        theme: ['white', 'black', 'dark-gray', 'night-black'].includes(theme)
          ? theme.replace('dark-gray', 'black').replace('night-black', 'black')
          : 'white',
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

function createAuthFacadeFake({ enabled = true, authenticated = false } = {}) {
  let signInCount = 0;
  const snapshot = {
    oidc: {
      enabled,
      authenticated,
      displayName: authenticated ? 'Dav' : '',
      email: authenticated ? 'dav@example.com' : '',
      error: null,
    },
  };

  return {
    get signInCount() {
      return signInCount;
    },
    subscribe: (listener) => {
      listener(snapshot);
      return () => {};
    },
    signInWithGoogle: async () => {
      signInCount += 1;
      return { ok: true };
    },
    signOut: async () => ({ ok: true }),
  };
}

function createWorldChatFacadeFake({ messages } = {}) {
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

  return {
    getSnapshot: () => snapshot,
    getSentMessages: () => sentMessages,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    sendMessage: async (body) => {
      const message = body.trim().replace(/\s+/g, ' ');
      sentMessages.push(message);
      snapshot.messages.push({
        id: String(snapshot.messages.length + 1),
        senderIdentity: 'sender-self',
        username: 'wizard',
        playerLevel: 1,
        body: message,
        sentAtMs: 2_000,
      });
      publish();
      return {
        ok: true,
        body: message,
      };
    },
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
        itemLabel: 'Sage Seed',
        itemKind: 'seed',
        quantity: 2,
        priceGold: 3,
        totalPriceGold: 3,
      },
    ],
    ownListings: [],
    proceedsGold: 0,
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
        totalPriceGold: slot.priceGold,
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
      snapshot.proceedsGold = 0;
      publish();
      return { ok: true };
    },
    setProceedsGold: (gold) => {
      snapshot.proceedsGold = gold;
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
    expect(stage.querySelector('.workshop-page__mana-sphere')).not.toBeNull();
    expect(stage.querySelector('.workshop-page__seed-block')).not.toBeNull();
    expect(stage.querySelector('.workshop-page__mana-sphere')?.textContent).not.toContain(
      'seeds',
    );
    expect(stage.querySelector('.workshop-page__seed-block')?.textContent).toContain('seeds');
    expect(
      stage.querySelector('.workshop-page__summon-button-label')?.textContent,
    ).toBe('summon seed');
    expect(
      stage.querySelector('.workshop-page__summon-button-cost')?.textContent,
    ).toBe('10 mana');
    expect(stage.querySelector('.workshop-page__summon-button')?.getAttribute('aria-label')).toBe(
      'summon seed, costs 10 mana',
    );
    expect(stage.querySelector('.workshop-page__leaderboard-button')?.textContent).toBe(
      'leaderboard',
    );
    expect(stage.querySelector('.workshop-page__world-chat-button')?.textContent).toBe(
      'world chat',
    );
    expect(
      stage.querySelector('.workshop-page__world-chat-box')?.parentElement?.classList.contains(
        'room-world-chat-layer',
      ),
    ).toBe(true);
    expect(stage.querySelector('.workshop-page__logs-button')?.textContent).toBe('logs');
    expect(stage.querySelector('.workshop-page__discoveries-button')?.textContent).toBe(
      'discoveries',
    );
    expect(
      stage.querySelector('.workshop-page__mana-sphere .workshop-page__summon-button'),
    ).toBeNull();
    expect(stage.querySelector('.workshop-page__seed-inventory')).not.toBeNull();
    expect(stage.querySelector('.workshop-page__flyouts')).not.toBeNull();
    expect(stage.querySelector('.workshop-page__summon-message')).toBeNull();
    expect(
      [...stage.querySelectorAll('.room-bottom-panel__tab')].map((button) => button.textContent),
    ).toEqual(['brewing', 'garden', 'workshop', 'research', 'market']);
    expect(stage.querySelector('.room-bottom-panel__tab.is-selected')?.dataset.pageId).toBe(
      'workshop',
    );
    expect(
      stage.querySelector('.room-bottom-panel__tab[aria-current="page"]')?.textContent,
    ).toBe('workshop');
    expect(stage.querySelector('.workshop-page__name')).toBeNull();
    expect(stage.querySelector('.room-page__nav')).toBeNull();
    const topPanel = stage.querySelector('.room-top-panel');
    expect(topPanel).not.toBeNull();
    expect(topPanel.children[0]?.className).toBe('room-top-panel__identity-row');
    expect(topPanel.children[1]?.className).toBe('room-top-panel__resources');
    expect(
      topPanel.querySelector('.room-top-panel__identity-row .room-top-panel__username')
        ?.textContent,
    ).toBe('wizard');
    expect(topPanel.querySelector('.room-top-panel__resources')?.textContent).toContain(
      'mana 0 / 50',
    );
    expect(topPanel.querySelector('.room-top-panel__resources')?.textContent).toContain('gold 0');
    expect(topPanel.querySelector('.room-top-panel__resources')?.textContent).toContain(
      'crystal 0',
    );
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
    expect(levelPopup.textContent).toContain('npc stands');
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
    ).toContain('mana cap+50');
    expect(
      levelPopup.querySelector('.room-top-panel__level-added-rows')?.textContent,
    ).toContain('mana regen+1/sec');
    expect(
      levelPopup.querySelector('.room-top-panel__level-total-rows')?.textContent,
    ).toContain('garden plots2');
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
    const [level3AddedRow] = levelPopup.querySelectorAll(
      '.room-top-panel__level-added-rows .room-top-panel__level-effect-row',
    );
    const [level3TotalRow] = levelPopup.querySelectorAll(
      '.room-top-panel__level-total-rows .room-top-panel__level-effect-row',
    );
    expect(level3AddedRow.querySelector('.room-top-panel__level-effect-label')?.textContent).toBe(
      'garden plots',
    );
    expect(level3AddedRow.querySelector('.room-top-panel__level-effect-value')?.textContent).toBe(
      '+1',
    );
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

  it('shows Workshop tasks collapsed and expands them from the summary row', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    const tasks = stage.querySelector('.workshop-page__tasks');
    const summary = stage.querySelector('.workshop-page__tasks-summary');
    const list = stage.querySelector('.workshop-page__task-list');

    expect(tasks).not.toBeNull();
    expect(summary?.textContent).toBe('level 11/2');
    expect(summary?.getAttribute('aria-expanded')).toBe('false');
    expect(list?.hidden).toBe(true);

    summary.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(summary.getAttribute('aria-expanded')).toBe('true');
    expect(list.hidden).toBe(false);
    expect(tasks.textContent).toContain('drop Sage');
    expect(tasks.classList.contains('is-expanded')).toBe(true);

    summary.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(summary.getAttribute('aria-expanded')).toBe('false');
    expect(list.hidden).toBe(true);
    expect(tasks.classList.contains('is-collapsed')).toBe(true);
  });

  it('keeps Workshop tasks expanded across page swaps', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__tasks-summary')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    pagesFacade.show('brewing');
    pagesFacade.show('workshop');

    const tasks = stage.querySelector('.workshop-page__tasks');
    const summary = stage.querySelector('.workshop-page__tasks-summary');
    const list = stage.querySelector('.workshop-page__task-list');

    expect(summary?.getAttribute('aria-expanded')).toBe('true');
    expect(list?.hidden).toBe(false);
    expect(tasks?.classList.contains('is-expanded')).toBe(true);
  });

  it('shows seed summon feedback as a flyout', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    gameplayFacade.getSnapshot().seedSummoning.canSummon = true;
    gameplayFacade.summonSeed = () => ({
      ok: true,
      seed: {
        label: 'Sage Seed',
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

    expect(stage.querySelector('.workshop-page__flyout')?.textContent).toBe('Sage Seed Found');
    expect(stage.querySelector('.workshop-page__seed-block')?.textContent).not.toContain('found');
  });

  it('shows active seed summon multiplier in the Workshop seed block', () => {
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
        label: 'Sage Seed',
      },
      seedCounts: [
        {
          seed: {
            label: 'Sage Seed',
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

    expect(stage.querySelector('.workshop-page__flyout')?.textContent).toBe(
      'Sage Seed x2 Found',
    );
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
    const dialog = stage.querySelector('.room-top-panel__settings-dialog');
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
      [...settings.querySelectorAll('.room-top-panel__theme-button')].map(
        (button) => button.textContent,
      ),
    ).toEqual(['white', 'black']);
    expect(focusOptions).toEqual([{ preventScroll: true }]);

    input.value = 'Mira';
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

    expect(playerFacade.getSnapshot().username).toBe('Mira');
    expect(usernameButton.textContent).toBe('Mira');
    expect(settings.hidden).toBe(true);
  });

  it('asks first landed players to set a username', () => {
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
    const input = stage.querySelector('.room-top-panel__username-input');
    const form = stage.querySelector('.room-top-panel__username-form');

    expect(settings.hidden).toBe(false);
    expect(settings.classList.contains('is-username-prompt')).toBe(true);
    expect(settings.querySelector('.style-box__title')?.textContent).toBe('username');
    expect(input.value).toBe('');
    expect(stage.querySelector('.room-top-panel__theme-section')).not.toBeNull();
    expect(playerFacade.getPromptSeenCount()).toBe(1);

    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

    expect(settings.hidden).toBe(false);
    expect(stage.querySelector('.room-top-panel__username-error')?.textContent).toBe(
      'enter a name',
    );

    input.value = 'New Mage';
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

    expect(playerFacade.getSnapshot().username).toBe('New Mage');
    expect(stage.querySelector('.room-top-panel__username')?.textContent).toBe('New Mage');
    expect(settings.hidden).toBe(true);
  });

  it('changes the theme from settings', () => {
    const stage = document.createElement('section');
    const playerFacade = createPlayerFacadeFake('Merlin');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.room-top-panel__username')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const whiteButton = stage.querySelector('.room-top-panel__theme-button[data-theme="white"]');
    const darkGrayButton = stage.querySelector(
      '.room-top-panel__theme-button[data-theme="dark-gray"]',
    );
    const blackButton = stage.querySelector('.room-top-panel__theme-button[data-theme="black"]');

    expect(whiteButton.getAttribute('aria-checked')).toBe('true');
    expect(darkGrayButton).toBeNull();

    blackButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerFacade.getSnapshot().theme).toBe('black');
    expect(blackButton.getAttribute('aria-checked')).toBe('true');
    expect(whiteButton.getAttribute('aria-checked')).toBe('false');
  });

  it('shows optional google login in settings when auth is configured', async () => {
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
    expect(stage.querySelector('.room-top-panel__auth-status')?.textContent).toBe('guest');
    expect(authButton.textContent).toBe('login with google');

    authButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(authFacade.signInCount).toBe(1);
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

  it('saves username on touch before mobile keyboard blur can move the layout', () => {
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
    saveButton.dispatchEvent(
      new window.Event('pointerdown', {
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(playerFacade.getSnapshot().username).toBe('Tap Mage');
    expect(usernameButton.textContent).toBe('Tap Mage');
    expect(settings.hidden).toBe(true);
  });

  it('saves username on mobile touchstart when pointer events are unavailable', () => {
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

    expect(playerFacade.getSnapshot().username).toBe('MobileDav');
    expect(usernameButton.textContent).toBe('MobileDav');
    expect(settings.hidden).toBe(true);
  });

  it('shows seed inventory when the seeds row is clicked', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    markSeedResearchComplete(gameplayFacade, 'sageSeed');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    const seedInventory = stage.querySelector('.workshop-page__seed-inventory');
    const seedsRow = stage.querySelector(
      '.workshop-page__seed-block .workshop-page__row--interactive',
    );

    expect(seedInventory.hidden).toBe(true);

    seedsRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(seedInventory.hidden).toBe(false);
    expect(seedInventory.querySelector('[role="dialog"]')).not.toBeNull();
    expect(seedInventory.querySelector('.style-dialog')).not.toBeNull();
    expect(seedInventory.textContent).toContain('Sage Seed');
    expect(seedInventory.textContent).toContain('0');
    expect(
      seedInventory.querySelector('.workshop-page__seed-inventory-row')?.classList.contains(
        'is-empty',
      ),
    ).toBe(true);
  });

  it('separates researched seed inventory rows from unresearched rows', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    snapshot.seedInventory = [
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'Sage Seed',
        kind: 'seed',
        quantity: 0,
      },
      {
        itemTypeId: 2,
        key: 'mintSeed',
        label: 'Mint Seed',
        kind: 'seed',
        quantity: 2,
      },
      {
        itemTypeId: 3,
        key: 'nettleSeed',
        label: 'Nettle Seed',
        kind: 'seed',
        quantity: 0,
      },
      {
        itemTypeId: 4,
        key: 'lavenderSeed',
        label: 'Lavender Seed',
        kind: 'seed',
        quantity: 4,
      },
      {
        itemTypeId: 5,
        key: 'briarSeed',
        label: 'Briar Seed',
        kind: 'seed',
        quantity: 0,
        known: false,
      },
    ];
    const seedUnlockBox = snapshot.research.boxes.find((box) => box.id === 'seedUnlocks');
    seedUnlockBox.researches = [
      {
        id: 'unlockSeed:sageSeed',
        label: 'Sage Seed',
        value: 'researched',
        completed: true,
        canResearch: false,
      },
      {
        id: 'unlockSeed:mintSeed',
        label: 'Mint Seed',
        value: 'researched',
        completed: true,
        canResearch: false,
      },
      {
        id: 'unlockSeed:nettleSeed',
        label: 'Nettle Seed',
        value: '3 gold',
        completed: false,
        canResearch: false,
      },
      {
        id: 'unlockSeed:lavenderSeed',
        label: 'Lavender Seed',
        value: '4 gold',
        completed: false,
        canResearch: false,
      },
      {
        id: 'unlockSeed:briarSeed',
        label: 'Briar Seed',
        value: '5 gold',
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
      .querySelector('.workshop-page__seed-block .workshop-page__row--interactive')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const seedInventory = stage.querySelector('.workshop-page__seed-inventory');
    const divider = seedInventory.querySelector('.workshop-page__seed-inventory-divider');
    const rows = [...seedInventory.querySelectorAll('.workshop-page__seed-inventory-row')];
    const labels = rows.map((row) => row.querySelector('.row_key')?.textContent);
    const values = rows.map((row) => row.querySelector('.row_val')?.textContent);
    const mysteryLabel = labels[4];
    const mysteryName = rows[4].querySelector('.row_key');
    expect(labels.slice(0, 3)).toEqual(['Sage Seed', 'Mint Seed', 'Lavender Seed']);
    expect(labels[3]).toBe('Nettle Seed');
    expect(mysteryLabel).not.toBe('Briar Seed');
    expect(mysteryLabel).toBe('??????');
    expect(mysteryName?.classList.contains('mystery-text')).toBe(true);
    expect(mysteryName?.getAttribute('aria-label')).toBe('unknown');
    expect(values).toEqual(['0', '2', '4', 'locked', 'locked']);
    expect(divider).not.toBeNull();
    expect(divider.previousElementSibling.querySelector('.row_key')?.textContent).toBe(
      'Lavender Seed',
    );
    expect(divider.nextElementSibling.querySelector('.row_key')?.textContent).toBe(
      'Nettle Seed',
    );
    expect(
      rows
        .find((row) => row.querySelector('.row_key')?.textContent === 'Lavender Seed')
        ?.classList.contains('is-unresearched'),
    ).toBe(false);
    expect(
      [...seedInventory.querySelectorAll('.workshop-page__seed-inventory-row.is-empty')].map(
        (row) => row.querySelector('.row_key')?.textContent,
      ),
    ).toEqual(['Sage Seed', 'Nettle Seed', mysteryLabel]);
  });

  it('hides seed inventory popup with Escape or outside click', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    const seedInventory = stage.querySelector('.workshop-page__seed-inventory');
    const seedsRow = stage.querySelector(
      '.workshop-page__seed-block .workshop-page__row--interactive',
    );

    seedsRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(seedInventory.hidden).toBe(true);

    seedsRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    seedInventory.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(seedInventory.hidden).toBe(true);
  });

  it('shows leaderboard popup when leaderboard button is clicked', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
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
    ).toBe(popup.querySelector('.workshop-page__leaderboard-tabs'));
    expect(popup.querySelector('.workshop-page__leaderboard-tab-button')?.textContent).toBe(
      'total generated gold',
    );
    expect(popup.textContent).toContain('1. Ada(2)');
    expect(popup.textContent).toContain('120');
    expect(popup.textContent).toContain('2. Merlin(10)');
    expect(popup.textContent).toContain('75');

    const incomeButton = [...popup.querySelectorAll('.workshop-page__leaderboard-tab-button')].find(
      (tabButton) => tabButton.textContent === 'income',
    );

    incomeButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(incomeButton.getAttribute('aria-selected')).toBe('true');
    const rowLabels = [
      ...popup.querySelectorAll('.workshop-page__leaderboard-rows .row_key'),
    ].map((row) => row.textContent);
    const rowValues = [
      ...popup.querySelectorAll('.workshop-page__leaderboard-rows .row_val'),
    ].map((row) => row.textContent);
    expect(rowLabels).toEqual(['user', '1. Merlin(10)', '2. Ada(2)']);
    expect(rowValues).toEqual(['income', '9', '3']);
  });

  it('shows the current player rank below the leaderboard when outside the top ten', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    gameplayFacade.getSnapshot().leaderboard = {
      topGeneratedGoldUsers: Array.from({ length: 10 }, (_value, index) => ({
        name: `Player ${index + 1}`,
        playerLevel: index + 1,
        income: 0,
        totalGeneratedGold: 100 - index,
        totalIncome: 100 - index,
      })),
      topIncomeUsers: [],
      currentGeneratedGoldUser: {
        name: 'Mine',
        playerLevel: 4,
        income: 0,
        totalGeneratedGold: 1,
        totalIncome: 1,
        rank: 12,
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

    expect(rowLabels).toEqual([
      'user',
      '1. Player 1(1)',
      '2. Player 2(2)',
      '3. Player 3(3)',
      '4. Player 4(4)',
      '5. Player 5(5)',
      '6. Player 6(6)',
      '7. Player 7(7)',
      '8. Player 8(8)',
      '9. Player 9(9)',
      '10. Player 10(10)',
      '12. Mine(4)',
    ]);
    expect(rowValues.at(-1)).toBe('1');
  });

  it('does not add a separate current rank when the player is already in the top ten', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    gameplayFacade.getSnapshot().leaderboard = {
      topGeneratedGoldUsers: Array.from({ length: 10 }, (_value, index) => ({
        name: index === 2 ? 'Mine' : `Player ${index + 1}`,
        playerLevel: index + 1,
        income: 0,
        totalGeneratedGold: 100 - index,
        totalIncome: 100 - index,
      })),
      topIncomeUsers: [],
      currentGeneratedGoldUser: {
        name: 'Mine',
        playerLevel: 3,
        income: 0,
        totalGeneratedGold: 98,
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
    ].filter((row) => row.textContent === '3. Mine(3)');

    expect(mineRows).toHaveLength(1);
  });

  it('hides leaderboard popup with Escape or outside click', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
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

  it('shows discoveries tabs and revealed unknown potion recipes', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
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
    expect(popup.textContent).not.toContain('Ashen Memory');
    expect(popup.textContent).toContain('ingredients:');
    expect(popup.textContent).toContain('- 5 ??????');
    expect(popup.textContent).toContain('- 3 ??????');
    expect(popup.textContent).toContain('- 10 ??????');
    expect(popup.textContent).toContain('cost ? mana');
    expect(popup.textContent).toContain('time: ?s');
    expect(popup.textContent).toContain('Silverleaf Quiet');
    expect(popup.textContent).toContain('Silverleaf Quiet: discovered by Ada');

    const discoveredRow = [...popup.querySelectorAll('.workshop-page__discovery-recipe-row')].find(
      (row) => row.textContent.includes('Silverleaf Quiet'),
    );

    expect(discoveredRow?.querySelector('.brewing-page__recipe-name')?.textContent).toBe(
      'Silverleaf Quiet: discovered by Ada',
    );
    expect(popup.textContent).toContain('- 1 Mint');
    expect(popup.textContent).toContain('- 1 Glowcap');
    expect(popup.textContent).toContain('- 1 Moonflower');
    expect(popup.textContent).toContain('cost 34 mana');
    expect(popup.textContent).toContain('time: 75s');

    const herbsTab = [...popup.querySelectorAll('.workshop-page__discoveries-tab-button')].find(
      (tab) => tab.textContent === 'herbs',
    );

    herbsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(herbsTab.getAttribute('aria-selected')).toBe('true');
    expect(popup.querySelector('.workshop-page__discoveries-empty')?.textContent).toBe('empty');
  });

  it('shows logs popup when logs button is clicked', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
    });

    pagesFacade.mount(stage);

    const popup = stage.querySelector('.workshop-page__logs-popup');
    const button = stage.querySelector('.workshop-page__logs-button');

    expect(popup.hidden).toBe(true);

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
    expect(popup.querySelector('[role="dialog"]')).not.toBeNull();
    expect(popup.querySelector('.style-dialog')).not.toBeNull();
    expect(popup.textContent).toContain('logs');
    expect(popup.textContent).toContain('sold Sage Seed for 1 gold');
    expect(popup.textContent).toContain('brewed Wasted Potion');
    expect([...popup.querySelectorAll('.workshop-page__log-entry')].map((row) => row.textContent))
      .toEqual(['brewed Wasted Potion', 'sold Sage Seed for 1 gold']);
    expect(
      popup.querySelector('.workshop-page__log-entry + .workshop-page__log-entry'),
    ).not.toBeNull();
    const logsProgress = popup.querySelector('.workshop-page__logs-progress');
    expect(logsProgress?.classList.contains('style-progress')).toBe(true);
    expect(
      popup
        .querySelector('.workshop-page__logs-progress-fill')
        ?.classList.contains('style-progress__fill'),
    ).toBe(true);

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(popup.hidden).toBe(true);
  });

  it('shows an empty state when logs popup has no entries', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    gameplayFacade.getSnapshot().logs.entries = [];
    const pagesFacade = new PagesFacade({
      gameplayFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__logs-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.workshop-page__logs-empty')?.textContent).toBe('no logs yet');
  });

  it('keeps logs pinned to newest entries only while player is at the top', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.workshop-page__logs-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const rows = stage.querySelector('.workshop-page__logs-rows');
    let scrollHeight = 300;
    Object.defineProperty(rows, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(rows, 'scrollHeight', {
      get: () => scrollHeight,
      configurable: true,
    });

    gameplayFacade.getSnapshot().logs.entries.push({
      id: 3,
      type: 'gameplay',
      message: 'summoned Sage Seed',
      createdAt: 3_000,
    });
    gameplayFacade.publishSnapshot();

    expect(rows.scrollTop).toBe(0);
    expect(stage.querySelector('.workshop-page__log-entry')?.textContent).toBe(
      'summoned Sage Seed',
    );

    rows.scrollTop = 80;
    scrollHeight = 360;
    const originalReplaceChildren = rows.replaceChildren.bind(rows);
    rows.replaceChildren = (...children) => {
      originalReplaceChildren(...children);
      scrollHeight = 420;
    };
    gameplayFacade.getSnapshot().logs.entries.push({
      id: 4,
      type: 'gameplay',
      message: 'summoned Mint Seed',
      createdAt: 4_000,
    });
    gameplayFacade.publishSnapshot();

    expect(rows.scrollTop).toBe(140);
    expect(stage.querySelector('.workshop-page__log-entry')?.textContent).toBe(
      'summoned Mint Seed',
    );
  });

  it('updates the logs popup progress bar and bottom fade when scrolled', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
    });

    pagesFacade.mount(stage);

    const button = stage.querySelector('.workshop-page__logs-button');
    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const rows = stage.querySelector('.workshop-page__logs-rows');
    const frame = stage.querySelector('.workshop-page__logs-frame');
    const progressFill = stage.querySelector('.workshop-page__logs-progress-fill');

    Object.defineProperty(rows, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(rows, 'scrollHeight', { value: 300, configurable: true });

    rows.scrollTop = 100;
    rows.dispatchEvent(new window.Event('scroll'));

    expect(progressFill.style.width).toBe('50%');
    expect(frame.classList.contains('has-bottom-overflow')).toBe(true);

    rows.scrollTop = 200;
    rows.dispatchEvent(new window.Event('scroll'));

    expect(progressFill.style.width).toBe('100%');
    expect(frame.classList.contains('has-bottom-overflow')).toBe(false);
  });

  it('shows world chat popup and sends messages', async () => {
    const stage = document.createElement('section');
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
          body: 'second hello',
          sentAtMs: 2_000,
        },
        {
          id: '3',
          senderIdentity: 'sender-c',
          username: 'Mo',
          playerLevel: 5,
          body: 'third hello',
          sentAtMs: 3_000,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
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

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
    expect(popup.querySelector('[role="dialog"]')).not.toBeNull();
    expect(popup.querySelector('.style-dialog')).not.toBeNull();
    expect(popup.querySelectorAll('.workshop-page__world-chat-message')).toHaveLength(3);
    expect(popup.textContent).toContain('old hello');
    expect(popup.textContent).toContain('Lin(4): second hello');
    expect(popup.textContent).toContain('Mo(5): third hello');

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

  it('keeps empty world chat preview static', () => {
    const stage = document.createElement('section');
    const worldChatFacade = createWorldChatFacadeFake({ messages: [] });
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake(),
      worldChatFacade,
    });

    pagesFacade.mount(stage);

    const popup = stage.querySelector('.workshop-page__world-chat-popup');
    const preview = stage.querySelector('.workshop-page__world-chat-preview');
    const button = stage.querySelector('.workshop-page__world-chat-button');

    expect(preview.textContent).toBe('no messages yet');

    preview.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(true);

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
  });

  it('marks system world chat messages as gray rows', () => {
    const stage = document.createElement('section');
    const worldChatFacade = createWorldChatFacadeFake({
      messages: [
        {
          id: '1',
          senderIdentity: 'sender-a',
          username: 'system',
          playerLevel: 0,
          body: 'Ada researched Mana Tonic',
          sentAtMs: 1_000,
        },
      ],
    });
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake(),
      worldChatFacade,
    });

    pagesFacade.mount(stage);

    const row = stage.querySelector('.workshop-page__world-chat-message');

    expect(row?.classList.contains('workshop-page__world-chat-message--system')).toBe(true);
    expect(row?.textContent).toBe('system: Ada researched Mana Tonic');
  });

  it('orders rooms as Brewing, Garden, Workshop, Research, Shop with Workshop default', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    markSeedResearchComplete(gameplayFacade, 'sageSeed', 'mintSeed');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    clickRoomTab(stage, 'garden');

    expect(pagesFacade.getCurrentPageId()).toBe('garden');
    expect(stage.querySelector('.garden-page')).not.toBeNull();
    expect(stage.querySelector('.garden-page__wall')).not.toBeNull();
    expect(stage.querySelector('.garden-page__floor')).not.toBeNull();
    expect(stage.querySelector('.garden-page__ui-layer')).not.toBeNull();
    expect(stage.querySelector('.garden-page__herbs')).not.toBeNull();
    expect(stage.querySelector('.garden-page__herbs')?.textContent).toContain('herbs');
    expect(stage.querySelector('.garden-page__herbs')?.textContent).toContain('Sage3');
    expect(stage.querySelector('.garden-page__herbs')?.textContent).toContain('Mint1');
    expect(stage.querySelector('.room-bottom-panel__tab.is-selected')?.dataset.pageId).toBe(
      'garden',
    );

    clickRoomTab(stage, 'brewing');

    expect(pagesFacade.getCurrentPageId()).toBe('brewing');
    expect(stage.querySelector('.brewing-page')).not.toBeNull();
    expect(stage.querySelector('.brewing-page__wall')).not.toBeNull();
    expect(stage.querySelector('.brewing-page__floor')).not.toBeNull();
    expect(stage.querySelector('.brewing-page__ui-layer')).not.toBeNull();
    expect(stage.querySelector('.brewing-page__herbs')).not.toBeNull();
    expect(stage.querySelector('.brewing-page__cauldron')).not.toBeNull();
    expect(stage.querySelector('.brewing-page__guide')?.textContent).toContain(
      'select in recipes',
    );
    expect(stage.querySelector('.brewing-page__recipes-button')?.textContent).toBe('recipes');
    expect(stage.querySelector('.brewing-page__potions-button')?.textContent).toBe('potions');
    expect(stage.querySelector('.brewing-page__action-button')?.textContent).toBe(
      'brew (12 mana)',
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
      'Sage Seed',
    );
    expect(stage.querySelector('.research-page__content')?.textContent).toContain('x2 summon');
    expect(stage.querySelector('.research-page__content')?.textContent).toContain('20 gold');
    expect(stage.querySelector('.research-page__content')?.textContent).toContain('Mana Tonic');
    expect(
      [...stage.querySelectorAll('.research-page__tab-button')].map(
        (button) => button.textContent,
      ),
    ).toEqual(['regular research', 'advanced research']);
    expect(stage.querySelector('.research-page__content')?.textContent).not.toContain(
      'auto plant',
    );
    expect(stage.querySelector('.room-bottom-panel__tab.is-selected')?.dataset.pageId).toBe(
      'research',
    );

    clickRoomTab(stage, 'shop');

    expect(pagesFacade.getCurrentPageId()).toBe('shop');
    expect(stage.querySelector('.shop-page')).not.toBeNull();
    expect(stage.querySelector('.shop-page__shelf')).not.toBeNull();
    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain('npc market');
    expect(
      [...stage.querySelectorAll('.shop-page__shelf .shop-page__slot-row')].some(
        (row) => row.querySelector('.row_key')?.textContent === 'gold',
      ),
    ).toBe(false);
    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain('empty');
    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain('buy (1 gold)');
    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain('stand 3locked');
    expect(stage.querySelector('.shop-page__shelf')?.textContent).not.toContain('3 gold');
    expect(stage.querySelector('.shop-page__sell-popup')).not.toBeNull();
    expect(stage.querySelector('.shop-page__sell-popup').hidden).toBe(true);
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

  it('switches the research page between regular and advanced research', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'research');

    const advancedTab = [...stage.querySelectorAll('.research-page__tab-button')].find(
      (button) => button.textContent === 'advanced research',
    );

    expect(advancedTab).not.toBeNull();
    expect(stage.querySelector('.research-page__content')?.textContent).toContain(
      'seed unlock researches',
    );

    advancedTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(advancedTab.getAttribute('aria-selected')).toBe('true');
    expect(stage.querySelector('.research-page__content')?.textContent).toContain(
      'auto plant tile research',
    );
    expect(stage.querySelector('.research-page__content')?.textContent).toContain(
      'auto plant tile 1',
    );
    expect(stage.querySelector('.research-page__content')?.textContent).toContain(
      '50000 gold',
    );
    expect(stage.querySelector('.research-page__content')?.textContent).not.toContain(
      'seed unlock researches',
    );
  });

  it('shows Brewing recipes popup with unlocked recipes only', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    gameplayFacade.setGold(3);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');
    gameplayFacade.getSnapshot().inventory = [
      {
        itemTypeId: 2001,
        key: 'manaTonic',
        label: 'Mana Tonic',
        kind: 'potion',
        quantity: 2,
      },
    ];
    pagesFacade.mount(stage);
    clickRoomTab(stage, 'brewing');

    const button = stage.querySelector('.brewing-page__recipes-button');
    const popup = stage.querySelector('.brewing-page__recipes-popup');
    const potionsButton = stage.querySelector('.brewing-page__potions-button');
    const potionsPopup = stage.querySelector('.brewing-page__potions-popup');

    expect(button?.textContent).toBe('recipes');
    expect(potionsButton?.textContent).toBe('potions');
    expect(popup.hidden).toBe(true);
    expect(potionsPopup.hidden).toBe(true);

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
    expect(popup.querySelector('[role="dialog"]')).not.toBeNull();
    expect(popup.querySelector('.brewing-page__recipes-close')?.textContent).toBe('close');
    expect(popup.querySelector('.brewing-page__recipe-group-title')).toBeNull();
    expect(popup.textContent).not.toContain('unlocked recipes');
    expect(popup.textContent).toContain('Mana Tonic');
    expect(popup.textContent).toContain('cost 12 mana');
    expect(popup.textContent).toContain('ingredients:');
    expect(popup.textContent).toContain('- 3 Sage');
    expect(popup.textContent).not.toContain('needs:');
    expect(popup.textContent).not.toContain('1. Sage');
    expect(popup.textContent).toContain('time: 30s');
    expect(popup.textContent).not.toContain('locked recipes');
    expect(popup.textContent).not.toContain('Minor Healing Potion');
    expect(popup.textContent).not.toContain('- 2 Sage');
    expect(popup.textContent).not.toContain('- 1 Mint');
    expect([...popup.querySelectorAll('.brewing-page__recipe-row')].length).toBe(1);
    expect(popup.querySelector('.brewing-page__recipe-row')?.classList.contains('is-locked')).toBe(
      false,
    );

    const manaTonicRow = [...popup.querySelectorAll('.brewing-page__recipe-row')].find((row) =>
      row.textContent.includes('Mana Tonic'),
    );
    expect(
      manaTonicRow?.querySelector('.brewing-page__recipe-meta')?.firstElementChild?.textContent,
    ).toBe('cost 12 mana');
    expect(
      manaTonicRow?.querySelector('.brewing-page__recipe-meta')?.lastElementChild?.textContent,
    ).toBe('time: 30s');

    const manaTonicMarkButton = manaTonicRow?.querySelector('.brewing-page__recipe-mark-button');

    expect(manaTonicMarkButton?.textContent).toBe('mark');
    expect(manaTonicMarkButton?.getAttribute('aria-pressed')).toBe('false');

    manaTonicMarkButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__guide')?.textContent).toContain('recipeMana Tonic');
    expect(
      [...stage.querySelectorAll('.brewing-page__guide-row .row_key')].map(
        (row) => row.textContent,
      ),
    ).toEqual(['recipe']);
    expect(stage.querySelector('.brewing-page__guide-step.is-next')?.textContent).toContain(
      '- 3 Sage',
    );

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(
      [...popup.querySelectorAll('.brewing-page__recipe-row')]
        .find((row) => row.textContent.includes('Mana Tonic'))
        ?.classList.contains('is-selected'),
    ).toBe(true);
    expect(
      [...popup.querySelectorAll('.brewing-page__recipe-row')]
        .find((row) => row.textContent.includes('Mana Tonic'))
        ?.querySelector('.brewing-page__recipe-mark-button')
        ?.textContent,
    ).toBe('unmark');

    dispatchPointerSwipe(stage);

    expect(pagesFacade.getCurrentPageId()).toBe('brewing');

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(popup.hidden).toBe(true);

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    popup.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(true);

    potionsButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(potionsPopup.hidden).toBe(false);
    expect(potionsPopup.querySelector('[role="dialog"]')).not.toBeNull();
    expect(potionsPopup.querySelector('.brewing-page__potions-close')?.textContent).toBe('close');
    expect(potionsPopup.textContent).toContain('potions');
    expect(potionsPopup.textContent).toContain('Mana Tonic2');
    expect(potionsPopup.textContent).not.toContain('Minor Healing Potion');
    expect(potionsPopup.textContent).not.toContain('locked');

    dispatchPointerSwipe(stage);

    expect(pagesFacade.getCurrentPageId()).toBe('brewing');

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(potionsPopup.hidden).toBe(true);
  });

  it('keeps the marked Brewing recipe after switching room tabs', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    gameplayFacade.setGold(3);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');
    pagesFacade.mount(stage);
    clickRoomTab(stage, 'brewing');

    stage
      .querySelector('.brewing-page__recipes-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.brewing-page__recipe-mark-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__guide')?.textContent).toContain('recipeMana Tonic');

    clickRoomTab(stage, 'garden');
    expect(pagesFacade.getCurrentPageId()).toBe('garden');

    clickRoomTab(stage, 'brewing');
    expect(stage.querySelector('.brewing-page__guide')?.textContent).toContain('recipeMana Tonic');

    stage
      .querySelector('.brewing-page__recipes-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const markButton = stage.querySelector('.brewing-page__recipe-mark-button');

    expect(markButton?.textContent).toBe('unmark');

    markButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__guide')?.textContent).toContain('recipenone');
  });

  it('keeps Brewing guide step DOM stable across snapshot renders', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    markSeedResearchComplete(gameplayFacade, 'sageSeed');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    gameplayFacade.setGold(3);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');
    pagesFacade.mount(stage);
    clickRoomTab(stage, 'brewing');

    stage
      .querySelector('.brewing-page__recipes-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.brewing-page__recipe-mark-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const guide = stage.querySelector('.brewing-page__guide');
    const firstStep = guide.querySelector('.brewing-page__guide-step');

    expect(firstStep).not.toBeNull();
    expect(firstStep.textContent).toContain('- 3 Sage');

    gameplayFacade.setMana(0);

    expect(guide.querySelector('.brewing-page__guide-step')).toBe(firstStep);

    const sageButton = [...stage.querySelectorAll('.brewing-page__herb-button')].find((button) =>
      button.textContent.includes('Sage'),
    );
    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(guide.querySelector('.brewing-page__guide-step')).toBe(firstStep);
    expect(firstStep.classList.contains('is-placed')).toBe(true);
    expect(firstStep.textContent).toContain('placed');
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
    const goldValue = stage.querySelector(
      '.room-top-panel__resource[aria-label="gold"] .room-top-panel__resource-val',
    );
    const manaText = manaValue.firstChild;
    const goldText = goldValue.firstChild;

    gameplayFacade.publishSnapshot();

    expect(manaValue.firstChild).toBe(manaText);
    expect(goldValue.firstChild).toBe(goldText);
  });

  it('keeps Brewing text DOM stable across unchanged snapshot renders', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
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
      label: 'Mana Tonic',
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
      (button) => button.textContent === 'Sage3',
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

  it('keeps Brewing potion rows stable across unchanged snapshot renders', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    pagesFacade.show('brewing');

    stage
      .querySelector('.brewing-page__potions-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const emptyRow = stage.querySelector('.brewing-page__potion-empty');

    gameplayFacade.publishSnapshot();

    expect(emptyRow).not.toBeNull();
    expect(stage.querySelector('.brewing-page__potion-empty')).toBe(emptyRow);
  });

  it('hides locked garden herb rows and keeps researched or owned herbs', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    snapshot.garden.herbs = [
      {
        itemTypeId: 1001,
        key: 'sageHerb',
        label: 'Sage',
        kind: 'herb',
        quantity: 0,
      },
      {
        itemTypeId: 1002,
        key: 'mintHerb',
        label: 'Mint',
        kind: 'herb',
        quantity: 2,
      },
      {
        itemTypeId: 1003,
        key: 'nettleHerb',
        label: 'Nettle',
        kind: 'herb',
        quantity: 0,
      },
      {
        itemTypeId: 1004,
        key: 'lavenderHerb',
        label: 'Lavender',
        kind: 'herb',
        quantity: 4,
      },
      {
        itemTypeId: 1005,
        key: 'briarHerb',
        label: 'Briar',
        kind: 'herb',
        quantity: 0,
        known: false,
      },
    ];
    const seedUnlockBox = snapshot.research.boxes.find((box) => box.id === 'seedUnlocks');
    seedUnlockBox.researches = [
      {
        id: 'unlockSeed:sageSeed',
        label: 'Sage Seed',
        value: 'researched',
        completed: true,
        canResearch: false,
      },
      {
        id: 'unlockSeed:mintSeed',
        label: 'Mint Seed',
        value: 'researched',
        completed: true,
        canResearch: false,
      },
      {
        id: 'unlockSeed:nettleSeed',
        label: 'Nettle Seed',
        value: '3 gold',
        completed: false,
        canResearch: false,
      },
      {
        id: 'unlockSeed:lavenderSeed',
        label: 'Lavender Seed',
        value: '4 gold',
        completed: false,
        canResearch: false,
      },
      {
        id: 'unlockSeed:briarSeed',
        label: 'Briar Seed',
        value: '5 gold',
        completed: false,
        canResearch: false,
      },
    ];
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'garden');

    const herbs = stage.querySelector('.garden-page__herbs');
    const divider = herbs.querySelector('.garden-page__herb-divider');
    const labels = [...herbs.querySelectorAll('.garden-page__herb-row')].map(
      (row) => row.querySelector('.row_key')?.textContent,
    );
    expect(labels).toEqual(['Sage', 'Mint', 'Lavender']);
    expect(divider).toBeNull();
    expect(labels).not.toContain('Nettle');
    expect(labels).not.toContain('Briar');
    expect(
      [...herbs.querySelectorAll('.garden-page__herb-row.is-empty')].map(
        (row) => row.querySelector('.row_key')?.textContent,
      ),
    ).toEqual(['Sage']);
    expect(herbs.textContent).not.toContain('locked');
    expect(herbs.querySelector('.garden-page__herb-row.is-locked')).toBeNull();
  });

  it('shows garden plots as text rows and keeps planting as a popup choice', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
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
    expect(stage.querySelector('.garden-page__plot .style-box__title')?.textContent).toBe('plots');
    expect(rows[0].querySelector('.garden-page__plot-number')?.textContent).toBe('1');
    expect(rows[0].querySelector('.garden-page__plot-label')?.textContent).toBe('empty');
    expect(rows[0].querySelector('.garden-page__plot-state')?.textContent).toBe('');
    expect(rows[0].querySelector('.garden-page__plot-action')?.textContent).toBe('choose');
    expect(rows[0].disabled).toBe(false);
    expect(rows[1].querySelector('.garden-page__plot-label')?.textContent).toBe('plot 2');
    expect(rows[1].querySelector('.garden-page__plot-state')?.textContent).toBe('');
    expect(rows[1].querySelector('.garden-page__plot-action')?.textContent).toBe('buy 1g');
    expect(rows[1].disabled).toBe(true);

    gameplayFacade.setGold(1);
    expect(rows[1].disabled).toBe(false);

    rows[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.garden-page__message')).toBeNull();
    expect(rows[1].querySelector('.garden-page__plot-label')?.textContent).toBe('empty');
    expect(rows[1].querySelector('.garden-page__plot-action')?.textContent).toBe('choose');
    expect(rows[1].disabled).toBe(false);
    expect(rows.filter((row) => !row.hidden)).toHaveLength(3);
    expect(stage.querySelector('.garden-page__plot-summary')).toBeNull();
    expect(stage.querySelector('.garden-page__plot')?.textContent).not.toContain('locked');

    gameplayFacade.getSnapshot().garden.seeds.push({
      itemTypeId: 2,
      key: 'mintSeed',
      label: 'Mint Seed',
      kind: 'seed',
      quantity: 0,
    });
    gameplayFacade.setGardenSeedQuantity(1, 1);
    expect(rows[0].querySelector('.garden-page__plot-action')?.textContent).toBe('choose');
    expect(rows[0].classList.contains('is-plantable')).toBe(false);
    expect(rows[0].disabled).toBe(false);
    rows[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

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
      'Sage Seed1',
    ]);
    expect(seedPopup.textContent).not.toContain('Mint Seed');
    expect(seedPopup.querySelector('.garden-page__seed-divider')).toBeNull();
    expect(seedButtons[0].disabled).toBe(false);

    seedButtons[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(seedPopup.hidden).toBe(true);
    expect(rows[0].querySelector('.garden-page__plot-label')?.textContent).toBe('Sage Seed');
    expect(rows[0].querySelector('.garden-page__plot-state')?.textContent).toBe('');
    expect(rows[0].querySelector('.garden-page__plot-action')?.textContent).toBe('growing 20s');
    expect(rows[0].querySelector('.garden-page__plot-action-label')?.textContent).toBe('growing');
    expect(rows[0].querySelector('.garden-page__plot-action-timer')?.textContent).toBe('20s');
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
      .querySelector('.garden-page__plot-label')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(seedPopup.hidden).toBe(true);
  });

  it('changes room pages with horizontal touch swipes', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
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

  it('allows planting after swiping into the Garden', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
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
    const seedPopup = stage.querySelector('.garden-page__seed-popup');

    plotRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(seedPopup.hidden).toBe(true);

    dispatchTouchTap(plotRow);
    plotRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(seedPopup.hidden).toBe(false);

    const seedButton = stage.querySelector('[aria-label="select Sage Seed, owned 1"]');

    dispatchTouchTap(seedButton);
    seedButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(seedPopup.hidden).toBe(true);
    expect(plotRow.querySelector('.garden-page__plot-label')?.textContent).toBe('Sage Seed');
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('growing 20s');
  });

  it('changes room pages from Research controls with horizontal touch swipes', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
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
      .querySelector('.workshop-page__seed-block .workshop-page__row--interactive')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.workshop-page__seed-inventory').hidden).toBe(false);

    dispatchTouchSwipe(stage);

    expect(pagesFacade.getCurrentPageId()).toBe('workshop');
  });

  it('adds herbs to the Brewing cauldron and names unlocked matching recipes', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
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
      (button) => button.textContent === 'Sage3',
    );

    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__cauldron')?.textContent).toContain('- 1 Sage');
    expect(stage.querySelector('.brewing-page__herbs')?.textContent).toContain('Sage2');
    expect(stage.querySelector('.brewing-page__cauldron-status')?.textContent).toBe(
      'unknown mix',
    );
    expect(stage.querySelector('.brewing-page__message')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__message')?.textContent).toBe('');

    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__cauldron')?.textContent).toContain('- 3 Sage');
    expect(stage.querySelector('.brewing-page__action-button')?.textContent).toBe(
      'brew (12 mana)',
    );
    expect(stage.querySelector('.brewing-page__cauldron-count')?.textContent).toBe('3/5');
    expect(stage.querySelector('.brewing-page__cauldron-status')?.textContent).toBe(
      'Mana Tonic locked',
    );
    expect(stage.querySelector('.brewing-page__message')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__message')?.textContent).toBe('');
    expect(stage.querySelector('.brewing-page__action-button')?.disabled).toBe(true);

    stage
      .querySelector('.brewing-page__action-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__message')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__message')?.textContent).toBe('');

    gameplayFacade.setGold(3);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');

    expect(stage.querySelector('.brewing-page__action-button')?.textContent).toBe(
      'brew (12 mana)',
    );
    expect(stage.querySelector('.brewing-page__cauldron-status')?.textContent).toBe(
      'matches Mana Tonic',
    );
    expect(stage.querySelector('.brewing-page__message')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__message')?.textContent).toBe('');

    stage
      .querySelector('.brewing-page__action-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__active-brew')?.hidden).toBe(false);
    expect(stage.querySelector('.brewing-page__active-brew-text')?.textContent).toBe(
      'brewing Mana Tonic 30s',
    );
    expect(stage.querySelector('.brewing-page__cauldron-status')?.hidden).toBe(true);
    const progressBar = stage.querySelector('.brewing-page__active-progress');

    expect(progressBar?.getAttribute('role')).toBe('progressbar');
    expect(progressBar?.classList.contains('style-progress')).toBe(true);
    expect(progressBar?.classList.contains('style-progress--timer')).toBe(true);
    expect(progressBar?.getAttribute('aria-valuenow')).toBe('0');
    expect(stage.querySelector('.brewing-page__active-progress-text')?.textContent).toBe('');
    expect(stage.querySelector('.brewing-page__active-progress-fill')?.style.width).toBe('0%');
    expect(stage.querySelector('.brewing-page__action-button')?.textContent).toBe('brew');
    expect(stage.querySelector('.brewing-page__action-button')?.disabled).toBe(true);

    const snapshot = gameplayFacade.getSnapshot();
    snapshot.brewing.activeBrew = {
      resultItemTypeId: 2001,
      key: 'manaTonic',
      label: 'Mana Tonic',
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
      'brewed Mana Tonic',
    );
    expect(stage.querySelector('.brewing-page__cauldron-status')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__action-button')?.textContent).toBe('bottle');
    expect(stage.querySelector('.brewing-page__action-button')?.disabled).toBe(false);
    expect(stage.querySelector('.brewing-page__message')?.hidden).toBe(true);

    stage
      .querySelector('.brewing-page__action-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__active-brew-text')?.textContent).toBe(
      'bottling Mana Tonic 2s',
    );
    expect(stage.querySelector('.brewing-page__cauldron-status')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__action-button')?.textContent).toBe('bottle');
    expect(stage.querySelector('.brewing-page__action-button')?.disabled).toBe(true);
    expect(stage.querySelector('.brewing-page__message')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__message')?.textContent).toBe('');

    snapshot.brewing.activeBrew = {
      resultItemTypeId: 2001,
      key: 'manaTonic',
      label: 'Mana Tonic',
      phase: 'ready',
      canStartBottling: false,
      canCollect: true,
      remainingMs: 0,
      totalMs: 0,
      bottlingTotalMs: 2_000,
      progress: 1,
    };
    snapshot.brewing.canCollectPotion = true;
    gameplayFacade.publishSnapshot();

    expect(stage.querySelector('.brewing-page__active-brew-text')?.textContent).toBe(
      'bottled Mana Tonic',
    );
    expect(stage.querySelector('.brewing-page__cauldron-status')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__action-button')?.textContent).toBe('collect');
    expect(stage.querySelector('.brewing-page__action-button')?.disabled).toBe(false);
    expect(stage.querySelector('.brewing-page__message')?.hidden).toBe(true);

    stage
      .querySelector('.brewing-page__action-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__message')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__message')?.textContent).toBe('');
    expect(gameplayFacade.getSnapshot().inventory).toContainEqual({
      itemTypeId: 2001,
      key: 'manaTonic',
      label: 'Mana Tonic',
      kind: 'potion',
      quantity: 1,
    });
  });

  it('keeps Brewing cauldron remove rows stable through snapshot renders', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    markSeedResearchComplete(gameplayFacade, 'sageSeed');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    pagesFacade.show('brewing');

    const sageButton = [...stage.querySelectorAll('.brewing-page__herb-button')].find(
      (button) => button.textContent === 'Sage3',
    );

    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const ingredientRow = stage.querySelector('.brewing-page__ingredient-row');

    expect(ingredientRow?.textContent).toBe('- 1 Sageremove');

    gameplayFacade.setMana(5);

    expect(ingredientRow.parentElement).toBe(stage.querySelector('.brewing-page__cauldron-items'));
    expect(stage.querySelector('.brewing-page__ingredient-row')).toBe(ingredientRow);

    ingredientRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.brewing-page__cauldron')?.textContent).toContain('empty');
    expect(stage.querySelector('.brewing-page__cauldron-count')?.textContent).toBe('0/5');
    expect(stage.querySelector('.brewing-page__cauldron-status')?.hidden).toBe(true);
    expect(stage.querySelector('.brewing-page__herbs')?.textContent).toContain('Sage3');
  });

  it('groups adjacent Brewing cauldron herbs without numbered rows', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    gameplayFacade.getSnapshot().brewing.herbs.push({
      itemTypeId: 1003,
      key: 'nettleHerb',
      label: 'Nettle',
      kind: 'herb',
      quantity: 2,
      stagedQuantity: 0,
      availableQuantity: 2,
    });
    markSeedResearchComplete(gameplayFacade, 'sageSeed', 'nettleSeed');

    pagesFacade.mount(stage);
    pagesFacade.show('brewing');

    const herbButtons = [...stage.querySelectorAll('.brewing-page__herb-button')];
    const sageButton = herbButtons.find((button) => button.textContent === 'Sage3');
    const nettleButton = herbButtons.find((button) => button.textContent === 'Nettle2');

    nettleButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    nettleButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const ingredientRows = [...stage.querySelectorAll('.brewing-page__ingredient-row')].filter(
      (row) => !row.hidden,
    );

    expect(ingredientRows.map((row) => row.textContent)).toEqual([
      '- 2 Nettleremove',
      '- 1 Sageremove',
    ]);
    expect(stage.querySelector('.brewing-page__cauldron')?.textContent).not.toContain(
      '1. Nettle',
    );
    expect(stage.querySelector('.brewing-page__cauldron')?.textContent).not.toContain(
      '2. Nettle',
    );
  });

  it('buys research from the research page', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
      playerFacade: createPlayerFacadeFake(),
    });

    gameplayFacade.setGold(25);
    pagesFacade.mount(stage);
    clickRoomTab(stage, 'research');

    const researchButton = [...stage.querySelectorAll('.research-page__research-button')].find(
      (button) => button.textContent === '20 gold',
    );

    expect(researchButton.textContent).toBe('20 gold');
    expect(researchButton.disabled).toBe(false);

    researchButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(gameplayFacade.getSnapshot().gold.current).toBe(5);
    expect(stage.querySelector('.room-top-panel')?.textContent).toContain('gold 5');
    expect(stage.querySelector('.research-page__content')?.textContent).toContain('researched');
  });

  it('marks unaffordable and locked research rows unavailable', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const seedBox = gameplayFacade
      .getSnapshot()
      .research.boxes.find((box) => box.id === 'seedUnlocks');

    seedBox.researches.push({
      id: 'unlockSeed:mintSeed',
      label: 'Mint Seed',
      value: 'locked',
      effect: 'drop',
      costGold: 2,
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
    expect(findResearchRow('Mint Seed')?.classList.contains('is-unavailable')).toBe(true);
    expect(findResearchRow('Mint Seed')?.classList.contains('is-locked')).toBe(true);

    gameplayFacade.setGold(25);

    expect(findResearchRow('x2 summon')?.classList.contains('is-unavailable')).toBe(
      false,
    );
  });

  it('shows at most three locked research rows in each block', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const seedBox = gameplayFacade
      .getSnapshot()
      .research.boxes.find((box) => box.id === 'seedUnlocks');

    seedBox.researches.push(
      {
        id: 'unlockSeed:mintSeed',
        label: 'Mint Seed',
        value: 'locked',
        effect: 'drop',
        costGold: 2,
        completed: false,
        locked: true,
        canResearch: false,
      },
      {
        id: 'unlockSeed:nettleSeed',
        label: 'Nettle Seed',
        value: 'locked',
        effect: 'drop',
        costGold: 3,
        completed: false,
        locked: true,
        canResearch: false,
      },
      {
        id: 'unlockSeed:lavenderSeed',
        label: 'Lavender Seed',
        value: 'locked',
        effect: 'drop',
        costGold: 5,
        completed: false,
        locked: true,
        canResearch: false,
      },
      {
        id: 'unlockSeed:briarSeed',
        label: 'Briar Seed',
        value: 'locked',
        effect: 'drop',
        costGold: 8,
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
      'Sage Seed',
      'Mint Seed',
      'Nettle Seed',
      'Lavender Seed',
    ]);
  });

  it('shows research info dialog when a research name is clicked', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'research');

    const popup = stage.querySelector('.research-page__info-popup');
    const labelButton = stage.querySelector('.research-page__research-label-button');

    expect(popup).not.toBeNull();
    expect(popup.hidden).toBe(true);
    expect(labelButton.querySelector('.research-page__research-name')?.textContent).toBe(
      'Sage Seed',
    );
    expect(labelButton.querySelector('.research-page__research-effect')).toBeNull();

    labelButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
    expect(popup.querySelector('[role="dialog"]')).not.toBeNull();
    expect(popup.textContent).toContain('Sage Seed');
    expect(popup.textContent).toContain('allows Sage Seed to drop from summon seed');

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));

    expect(popup.hidden).toBe(true);
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

    stage
      .querySelector('.shop-page__slot-row--interactive')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__sell-popup').hidden).toBe(false);
    expect(stage.querySelector('.shop-page__shelf-message')).toBeNull();
    expect(stage.querySelector('.shop-page__sell-popup')?.textContent).toContain('seeds');
    expect(stage.querySelector('.shop-page__sell-popup')?.textContent).toContain('herbs');
    expect(stage.querySelector('.shop-page__sell-popup')?.textContent).toContain('potions');
    expect(stage.querySelector('.shop-page__sell-popup')?.textContent).toContain(
      'Sage Seed (0) 1 gold',
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
      (button) => button.textContent === 'Sage Seed (0) 1 gold',
    );
    seedButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain(
      'stand 1Sage Seed (0) 1 gold',
    );
    expect(stage.querySelector('.shop-page__shelf')?.textContent).not.toContain(
      'stand 1 sells Sage Seed',
    );
    expect(stage.querySelector('.shop-page__sell-popup').hidden).toBe(true);
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

    stage
      .querySelector('.shop-page__slot-row--interactive')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    [...stage.querySelectorAll('.shop-page__sell-item-button')]
      .find((button) => button.textContent === 'Sage Seed (0) 1 gold')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain(
      'stand 1Sage Seed (0) 1 gold',
    );

    stage
      .querySelector('.shop-page__slot-row--interactive')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const visibleRows = [...stage.querySelectorAll('.shop-page__sell-item-row')].filter(
      (row) => !row.hidden,
    );
    const emptyButton = visibleRows[0].querySelector('.shop-page__sell-item-button');
    expect(emptyButton.textContent).toBe('empty');
    expect(emptyButton.classList.contains('shop-page__sell-empty-button')).toBe(false);
    expect(visibleRows[0].classList.contains('shop-page__sell-empty-row')).toBe(false);
    emptyButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain('stand 1empty');
    expect(stage.querySelector('.shop-page__shelf')?.textContent).not.toContain('stand 1 empty');
    expect(stage.querySelector('.shop-page__sell-popup').hidden).toBe(true);
  });

  it('updates visible shop sell prices and quantities from gameplay snapshots', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    markSeedResearchComplete(gameplayFacade, 'sageSeed');
    const pagesFacade = new PagesFacade({
      gameplayFacade,
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'shop');
    stage
      .querySelector('.shop-page__slot-row--interactive')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const seedButton = [...stage.querySelectorAll('.shop-page__sell-item-button')].find(
      (button) => button.textContent === 'Sage Seed (0) 1 gold',
    );
    seedButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    gameplayFacade.setShopSellGold('seed', 7);

    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain(
      'stand 1Sage Seed (0) 7 gold',
    );

    gameplayFacade.setShopSellItemQuantity(1, 4);

    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain(
      'stand 1Sage Seed (4) 7 gold',
    );

    stage
      .querySelector('.shop-page__slot-row--interactive')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__sell-popup')?.textContent).toContain(
      'Sage Seed (4) 7 gold',
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
    stage
      .querySelector('.shop-page__slot-row--interactive')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    gameplayFacade.setShopSellItems([
      {
        itemTypeId: 2,
        key: 'mintSeed',
        label: 'Mint Seed',
        kind: 'seed',
        quantity: 1,
        sellGold: 1,
      },
    ]);

    const visibleRows = [...stage.querySelectorAll('.shop-page__sell-item-row')]
      .filter((row) => !row.hidden)
      .map((row) => row.textContent);
    const sageRow = [...stage.querySelectorAll('.shop-page__sell-item-row')].find((row) =>
      row.textContent.includes('Sage Seed'),
    );

    expect(visibleRows).toEqual(['empty', 'Mint Seed (1) 1 gold']);
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
    stage
      .querySelector('.shop-page__slot-row--interactive')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    [...stage.querySelectorAll('.shop-page__sell-item-button')]
      .find((button) => button.textContent === 'Sage Seed (0) 1 gold')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    gameplayFacade.setShopSellItems([]);

    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain(
      'stand 1Sage Seed (0) 1 gold',
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
    stage
      .querySelector('.shop-page__slot-row--interactive')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const tabButtons = [...stage.querySelectorAll('.shop-page__sell-tab-button')];
    const herbsButton = tabButtons.find((button) => button.textContent === 'herbs');
    const potionsButton = tabButtons.find((button) => button.textContent === 'potions');

    herbsButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const sageHerbButton = [...stage.querySelectorAll('.shop-page__sell-item-button')].find(
      (button) => button.textContent === 'Sage (0) 2 gold',
    );
    expect(sageHerbButton.closest('.shop-page__sell-item-row').hidden).toBe(false);

    potionsButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const visiblePotionRows = [...stage.querySelectorAll('.shop-page__sell-item-row')]
      .filter((row) => !row.hidden)
      .map((row) => row.textContent);
    expect(visiblePotionRows).not.toContain('Mana Tonic (locked) 5 gold');
  });

  it('hides shop sell picker with Escape or outside click', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
    });

    pagesFacade.mount(stage);
    clickRoomTab(stage, 'shop');

    const popup = stage.querySelector('.shop-page__sell-popup');
    const slot = stage.querySelector('.shop-page__slot-row--interactive');

    slot.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(popup.hidden).toBe(true);

    slot.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
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
    gameplayFacade.setGold(10);
    pagesFacade.mount(stage);
    clickRoomTab(stage, 'shop');

    expect(stage.querySelector('.shop-page__player-shelf')?.textContent).toContain(
      'player market',
    );

    stage
      .querySelector('.shop-page__player-shelf .shop-page__slot-row--interactive')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const listingPopup = stage.querySelector('.shop-page__player-listing-popup');
    expect(listingPopup.textContent).toContain('quantity');
    expect(listingPopup.textContent).toContain('gold each');
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
      .find((button) => button.textContent === 'Sage Seed (4)');
    sageListingButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(sageListingButton.getAttribute('aria-pressed')).toBe('true');
    expect(quantityInput.value).toBe('2');
    expect(valueInput.value).toBe('4');
    expect(stage.querySelector('.shop-page__player-shelf')?.textContent).toContain(
      'stand 1empty',
    );
    expect(listingPopup.hidden).toBe(false);

    listingPopup
      .querySelector('.shop-page__player-listing-place-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(stage.querySelector('.shop-page__player-shelf')?.textContent).toContain(
      'stand 1Sage Seed (2) 4 gold',
    );
    expect(listingPopup.hidden).toBe(true);

    stage
      .querySelector('.shop-page__other-shops-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const marketPopup = stage.querySelector('.shop-page__market-popup');
    expect(marketPopup.hidden).toBe(false);
    expect(marketPopup.textContent).toContain('Ada');
    expect(marketPopup.textContent).toContain('- Sage Seed (2)');

    const buyQuantityInput = marketPopup.querySelector('.shop-page__market-quantity-input');
    buyQuantityInput.value = '2';
    buyQuantityInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    marketPopup
      .querySelector('.shop-page__market-row button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(gameplayFacade.getSnapshot().gold.current).toBe(4);
    expect(marketPopup.textContent).toContain('empty');

    playerShopFacade.setProceedsGold(5);
    stage
      .querySelector('.shop-page__player-proceeds-row button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(gameplayFacade.getSnapshot().gold.current).toBe(9);
  });
});
