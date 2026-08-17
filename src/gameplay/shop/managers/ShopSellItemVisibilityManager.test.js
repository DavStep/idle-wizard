import { describe, expect, it, vi } from 'vitest';

import { itemKinds } from '../../items/itemKinds.js';
import { ShopSellItemVisibilityManager } from './ShopSellItemVisibilityManager.js';

const discoveredPotion = {
  key: 'ashenMemory',
  kind: itemKinds.potion,
  discoveryType: 'unknown',
  unknown: true,
  quantity: 0,
};

function createManager({ discoveredByCurrentPlayer = false, researched = false } = {}) {
  const manager = new ShopSellItemVisibilityManager({
    researchFacade: {
      hasCompletedResearch: vi.fn(() => researched),
    },
  });
  manager.setPotionDiscoveryFacade({
    hasDiscoveredPotion: vi.fn(() => true),
    isDiscoveredByCurrentPlayer: vi.fn(() => discoveredByCurrentPlayer),
  });
  return manager;
}

describe('ShopSellItemVisibilityManager discovered recipes', () => {
  it('does not treat another player discovery as this player research', () => {
    expect(createManager().isResearched(discoveredPotion)).toBe(false);
  });

  it('accepts either completed research or discovery ownership', () => {
    expect(createManager({ researched: true }).isResearched(discoveredPotion)).toBe(true);
    expect(
      createManager({ discoveredByCurrentPlayer: true }).isResearched(discoveredPotion),
    ).toBe(true);
  });
});
