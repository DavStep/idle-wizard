import { describe, expect, it } from 'vitest';

import {
  getNpcMarketPriceFromNeed,
  getRecoveredNpcNeed,
  NPC_MARKET_DEMAND_RECOVERY_HALF_LIFE_MS,
} from './npcMarketPricing.js';

describe('npcMarketPricing', () => {
  it('recovers demand toward target by half after one half-life', () => {
    expect(
      getRecoveredNpcNeed({
        npcNeed: 0,
        targetNeed: 100,
        lastTickAtMs: 1_000,
        nowMs: 1_000 + NPC_MARKET_DEMAND_RECOVERY_HALF_LIFE_MS,
      }),
    ).toBe(50);
  });

  it('uses soft demand instead of collapsing empty demand to a hard cent floor', () => {
    expect(
      getNpcMarketPriceFromNeed({
        basePriceGold: 10,
        itemKind: 'seed',
        npcNeed: 0,
        targetNeed: 1_000,
      }),
    ).toBeGreaterThan(0.01);
  });
});
