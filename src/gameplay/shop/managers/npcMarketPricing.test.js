import { describe, expect, it } from 'vitest';

import {
  getNpcMarketPriceFromNeed,
  getRecoveredNpcNeed,
  getNextNpcDemandWaveInfo,
  NPC_MARKET_DEMAND_WAVE_INTERVAL_MS,
} from './npcMarketPricing.js';

describe('npcMarketPricing', () => {
  it('recovers demand in UTC buyer waves with a demand cap', () => {
    expect(
      getRecoveredNpcNeed({
        npcNeed: 0,
        targetNeed: 1000,
        lastTickAtMs: 1_000,
        nowMs: NPC_MARKET_DEMAND_WAVE_INTERVAL_MS,
      }),
    ).toBe(800);

    expect(
      getRecoveredNpcNeed({
        npcNeed: 1490,
        targetNeed: 1000,
        lastTickAtMs: 1_000,
        nowMs: NPC_MARKET_DEMAND_WAVE_INTERVAL_MS,
      }),
    ).toBe(1500);
  });

  it('describes the next buyer wave without exposing UTC clock times', () => {
    expect(
      getNextNpcDemandWaveInfo({
        targetNeed: 1000,
        nowMs: NPC_MARKET_DEMAND_WAVE_INTERVAL_MS - 1,
      }),
    ).toMatchObject({
      nextWaveAtMs: NPC_MARKET_DEMAND_WAVE_INTERVAL_MS,
      nextWaveAmount: 800,
      maxNeed: 1500,
      isBigWave: false,
    });
  });

  it('uses soft demand instead of collapsing empty demand to a hard cent floor', () => {
    expect(
      getNpcMarketPriceFromNeed({
        basePriceCoin: 10,
        itemKind: 'seed',
        npcNeed: 0,
        targetNeed: 1_000,
      }),
    ).toBeGreaterThan(0.01);
  });
});
