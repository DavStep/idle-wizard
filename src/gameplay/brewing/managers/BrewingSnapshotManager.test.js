import { describe, expect, it, vi } from 'vitest';

import { BrewingSnapshotManager } from './BrewingSnapshotManager.js';

function createSnapshotManager({
  activeBrew = null,
  cauldronMultiplier = 1,
  brewQuantity,
  getIngredientCountsByItemTypeId,
  getIngredientCountByItemTypeId,
  getIngredientSnapshots = vi.fn(() => []),
  getItemQuantity = vi.fn(() => 0),
  herbs = [],
} = {}) {
  return {
    getIngredientSnapshots,
    getIngredientCountsByItemTypeId,
    getIngredientCountByItemTypeId,
    getItemQuantity,
    getMatch: vi.fn(() => null),
    isRecipeDiscoverable: vi.fn(() => false),
    isRecipeUnlocked: vi.fn(() => false),
    canSpend: vi.fn(() => false),
    manager: new BrewingSnapshotManager({
      brewingBalanceManager: {
        getMaxCauldronIngredients: vi.fn(() => 3),
        getWastedBrewManaCost: vi.fn(() => 1),
      },
      brewingCauldronEntityManager: {
        ensureCauldrons: vi.fn(),
        getIngredientSnapshots,
        getIngredientCountsByItemTypeId,
        getIngredientCountByItemTypeId,
        getUnlockedCauldrons: vi.fn(() => 1),
      },
      brewingProcessEntityManager: {
        getActiveBrewSnapshot: vi.fn(() => activeBrew),
      },
      brewingRecipeMatchManager: {
        getMatch: vi.fn(() => null),
        getRecipes: vi.fn(() => []),
        isRecipeDiscoverable: vi.fn(() => false),
        isRecipeUnlocked: vi.fn(() => false),
      },
      itemsFacade: {
        getHerbDefinitions: vi.fn(() => herbs),
        getItemQuantity,
      },
      manaFacade: {
        canSpend: vi.fn(() => false),
      },
      playerLevelFacade: {
        getMaxCauldrons: vi.fn(() => 1),
      },
      researchFacade: {
        getCauldronBrewingMultiplier: vi.fn(() => cauldronMultiplier),
        getMaxCauldronsWithCapacity: vi.fn((maxCauldrons) => maxCauldrons),
        getRequiredCauldronCapacityResearchId: vi.fn(() => null),
      },
      getAutoBrewEnabled: vi.fn(() => false),
      getAutoBrewRecipeKey: vi.fn(() => null),
      getBrewQuantity: vi.fn(() => brewQuantity),
    }),
  };
}

describe('BrewingSnapshotManager', () => {
  it('skips recipe and affordability work while a cauldron has an active brew', () => {
    const activeBrew = {
      cauldronIndex: 0,
      cauldronNumber: 1,
      canCollect: false,
      canStartBottling: false,
      remainingMs: 1000,
      resultQuantity: 3,
      totalMs: 2000,
    };
    const setup = createSnapshotManager({ activeBrew });
    const recipeMatchManager = setup.manager.brewingRecipeMatchManager;
    const manaFacade = setup.manager.manaFacade;

    const snapshot = setup.manager.getCauldronSnapshot(0, []);

    expect(snapshot).toMatchObject({
      activeBrew,
      level: 1,
      canAddIngredient: false,
      canBrew: false,
      canCollectPotion: false,
      canStartBottling: false,
      match: null,
      yieldMultiplier: 3,
    });
    expect(setup.getIngredientSnapshots).not.toHaveBeenCalled();
    expect(recipeMatchManager.getMatch).not.toHaveBeenCalled();
    expect(recipeMatchManager.isRecipeDiscoverable).not.toHaveBeenCalled();
    expect(recipeMatchManager.isRecipeUnlocked).not.toHaveBeenCalled();
    expect(manaFacade.canSpend).not.toHaveBeenCalled();
  });

  it('uses one staged ingredient count map for herb snapshots', () => {
    const getIngredientCountsByItemTypeId = vi.fn(
      () =>
        new Map([
          [1001, 2],
          [1002, 1],
        ]),
    );
    const getIngredientCountByItemTypeId = vi.fn(() => 0);
    const getItemQuantity = vi.fn((itemTypeId) => (itemTypeId === 1001 ? 5 : 3));
    const { manager } = createSnapshotManager({
      getIngredientCountsByItemTypeId,
      getIngredientCountByItemTypeId,
      getItemQuantity,
      herbs: [
        { id: 1001, key: 'sageHerb', label: 'sage herb', kind: 'herb' },
        { id: 1002, key: 'mintHerb', label: 'mint herb', kind: 'herb' },
      ],
    });

    expect(manager.getHerbSnapshots()).toEqual([
      {
        itemTypeId: 1001,
        key: 'sageHerb',
        label: 'sage herb',
        kind: 'herb',
        quantity: 5,
        stagedQuantity: 2,
        availableQuantity: 3,
      },
      {
        itemTypeId: 1002,
        key: 'mintHerb',
        label: 'mint herb',
        kind: 'herb',
        quantity: 3,
        stagedQuantity: 1,
        availableQuantity: 2,
      },
    ]);
    expect(getIngredientCountsByItemTypeId).toHaveBeenCalledTimes(1);
    expect(getIngredientCountByItemTypeId).not.toHaveBeenCalled();
  });

  it('skips recipe and affordability work for empty cauldrons', () => {
    const setup = createSnapshotManager({
      getIngredientSnapshots: vi.fn(() => []),
    });
    const recipeMatchManager = setup.manager.brewingRecipeMatchManager;
    const manaFacade = setup.manager.manaFacade;

    const snapshot = setup.manager.getCauldronSnapshot(0, []);

    expect(snapshot).toMatchObject({
      activeBrew: null,
      canAddIngredient: true,
      canBrew: false,
      hasEnoughIngredients: true,
      hasEnoughMana: true,
      match: null,
      level: 1,
      yieldMultiplier: 1,
    });
    expect(recipeMatchManager.getMatch).not.toHaveBeenCalled();
    expect(recipeMatchManager.isRecipeDiscoverable).not.toHaveBeenCalled();
    expect(recipeMatchManager.isRecipeUnlocked).not.toHaveBeenCalled();
    expect(manaFacade.canSpend).not.toHaveBeenCalled();
  });

  it('exposes cauldron level from emerald cauldron level ups', () => {
    const { manager } = createSnapshotManager({
      cauldronMultiplier: 4,
      getIngredientSnapshots: vi.fn(() => []),
    });

    expect(manager.getCauldronSnapshot(0, [])).toMatchObject({
      cauldronNumber: 1,
      level: 4,
      maxBrewQuantity: 4,
      brewQuantity: 4,
      yieldMultiplier: 1,
    });
  });

  it('uses selected brew quantity for affordability while keeping cauldron level as max', () => {
    const recipe = {
      potionTypeId: 2001,
      key: 'manaTonic',
      label: 'mana tonic',
      manaCost: 12,
      brewDurationMs: 30_000,
    };
    const { manager } = createSnapshotManager({
      cauldronMultiplier: 3,
      brewQuantity: 2,
      getIngredientSnapshots: vi.fn(() => [
        { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
        { slotIndex: 1, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
        { slotIndex: 2, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
      ]),
      getItemQuantity: vi.fn(() => 6),
    });
    manager.brewingRecipeMatchManager.getMatch = vi.fn(() => recipe);
    manager.brewingRecipeMatchManager.isRecipeUnlocked = vi.fn(() => true);
    manager.manaFacade.canSpend = vi.fn(() => true);

    expect(manager.getCauldronSnapshot(0, [])).toMatchObject({
      level: 3,
      maxBrewQuantity: 3,
      brewQuantity: 2,
      yieldMultiplier: 2,
      manaCost: 24,
      canBrew: true,
    });
  });

  it('shows discoverable recipes as unknown potion without exposing the real recipe key', () => {
    const recipe = {
      potionTypeId: 2101,
      key: 'ashenMemory',
      label: 'ashen memory',
      manaCost: 30,
      brewDurationMs: 70_000,
      discoveryType: 'unknown',
      unknown: true,
    };
    const { manager } = createSnapshotManager({
      getIngredientSnapshots: vi.fn(() => [
        { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
      ]),
      getItemQuantity: vi.fn(() => 1),
    });
    manager.brewingRecipeMatchManager.getMatch = vi.fn(() => recipe);
    manager.brewingRecipeMatchManager.isRecipeDiscoverable = vi.fn(() => true);
    manager.brewingRecipeMatchManager.isRecipeUnlocked = vi.fn(() => false);
    manager.manaFacade.canSpend = vi.fn(() => true);

    expect(manager.getCauldronSnapshot(0, [])).toMatchObject({
      canBrew: true,
      manaCost: 1,
      match: {
        potionTypeId: null,
        key: null,
        label: 'unknown potion',
        realLabel: 'ashen memory',
        manaCost: null,
        brewDurationMs: null,
        unlocked: false,
        discoverable: true,
        unknown: true,
        discoveryType: 'unknown',
      },
    });
  });
});
