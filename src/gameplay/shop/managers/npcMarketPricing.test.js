import { describe, expect, it } from 'vitest';

import {
  getNpcMarketPriceFromNeed,
  getRecoveredNpcNeed,
  getNpcMarketDemandRecoveryWindow,
  getNextNpcDemandWaveInfo,
  NPC_MARKET_DEMAND_WAVE_INTERVAL_MS,
  NPC_MARKET_WEEKLY_RESET_ANCHOR_MS,
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

  it('resets demand at the weekly boundary before day-start buyers return', () => {
    expect(
      getNpcMarketDemandRecoveryWindow({
        npcNeed: 450,
        fromMs: NPC_MARKET_WEEKLY_RESET_ANCHOR_MS - 1,
        toMs: NPC_MARKET_WEEKLY_RESET_ANCHOR_MS,
      }),
    ).toEqual({
      npcNeed: 0,
      fromMs: NPC_MARKET_WEEKLY_RESET_ANCHOR_MS - 1,
    });

    expect(
      getRecoveredNpcNeed({
        npcNeed: 450,
        targetNeed: 1000,
        lastTickAtMs: NPC_MARKET_WEEKLY_RESET_ANCHOR_MS - 1,
        nowMs: NPC_MARKET_WEEKLY_RESET_ANCHOR_MS,
      }),
    ).toBe(1500);
  });

  it('keeps same-week demand when applying later buyer waves', () => {
    expect(
      getNpcMarketDemandRecoveryWindow({
        npcNeed: 450,
        fromMs: NPC_MARKET_WEEKLY_RESET_ANCHOR_MS,
        toMs: NPC_MARKET_WEEKLY_RESET_ANCHOR_MS + NPC_MARKET_DEMAND_WAVE_INTERVAL_MS,
      }),
    ).toEqual({
      npcNeed: 450,
      fromMs: NPC_MARKET_WEEKLY_RESET_ANCHOR_MS,
    });
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

  it('keeps soft-demand prices at the one-coin minimum', () => {
    const price = getNpcMarketPriceFromNeed({
      basePriceCoin: 10,
      itemKind: 'seed',
      npcNeed: 0,
      targetNeed: 1_000,
    });

    expect(price).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(price)).toBe(true);
  });
});
