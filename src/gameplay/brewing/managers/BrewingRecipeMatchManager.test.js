import { describe, expect, it, vi } from 'vitest';

import { BrewingRecipeMatchManager } from './BrewingRecipeMatchManager.js';

const discoveredRecipe = {
  key: 'ashenMemory',
  discoveryType: 'unknown',
  unknown: true,
};

function createManager({ discoveredByCurrentPlayer = false, researched = false } = {}) {
  const researchFacade = {
    hasCompletedResearch: vi.fn(() => researched),
  };
  const manager = new BrewingRecipeMatchManager({
    itemsFacade: {},
    researchFacade,
  });
  manager.setPotionDiscoveryFacade({
    getDiscovery: vi.fn(() => ({
      potionKey: discoveredRecipe.key,
      discoveredByIdentity: discoveredByCurrentPlayer ? 'current-player' : 'other-player',
    })),
    hasDiscoveredPotion: vi.fn(() => true),
    isDiscoveredByCurrentPlayer: vi.fn(() => discoveredByCurrentPlayer),
  });

  return { manager, researchFacade };
}

describe('BrewingRecipeMatchManager discovered recipes', () => {
  it('keeps another player\'s discovery locked until this player researches it', () => {
    const { manager, researchFacade } = createManager();

    expect(manager.isRecipeDiscoverable(discoveredRecipe)).toBe(false);
    expect(manager.isRecipeUnlocked(discoveredRecipe)).toBe(false);
    expect(researchFacade.hasCompletedResearch).toHaveBeenCalledWith(
      'unlockRecipe:ashenMemory',
    );
  });

  it('unlocks another player\'s discovery after this player researches it', () => {
    const { manager } = createManager({ researched: true });

    expect(manager.isRecipeUnlocked(discoveredRecipe)).toBe(true);
  });

  it('keeps the discoverer recipe learned even when prestige cleared research', () => {
    const { manager, researchFacade } = createManager({
      discoveredByCurrentPlayer: true,
      researched: false,
    });

    expect(manager.isRecipeUnlocked(discoveredRecipe)).toBe(true);
    expect(researchFacade.hasCompletedResearch).not.toHaveBeenCalled();
  });
});
