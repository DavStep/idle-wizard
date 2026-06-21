import { describe, expect, it } from 'vitest';

import { ResearchBalanceManager } from './ResearchBalanceManager.js';

describe('ResearchBalanceManager', () => {
  it('caps research durations at ten minutes', () => {
    const manager = new ResearchBalanceManager({
      balance: {
        researchCostsGold: {
          shortStudy: 1,
          exactStudy: 2,
          longStudy: 3,
        },
        researchDurationsSeconds: {
          shortStudy: 30,
          exactStudy: 600,
          longStudy: 601,
        },
      },
    });

    expect(manager.getDurationSeconds('shortStudy')).toBe(30);
    expect(manager.getDurationSeconds('exactStudy')).toBe(600);
    expect(manager.getDurationSeconds('longStudy')).toBe(600);

    manager.setRuntimeConfigs([
      {
        researchId: 'shortStudy',
        costGold: 1,
        durationSeconds: 720,
        enabled: true,
      },
      {
        researchId: 'exactStudy',
        costGold: 2,
        durationSeconds: 0,
        enabled: true,
      },
    ]);

    expect(manager.getDurationSeconds('shortStudy')).toBe(600);
    expect(manager.getDurationSeconds('exactStudy')).toBe(0);
  });

  it('reads emerald research costs from balance', () => {
    const manager = new ResearchBalanceManager({
      balance: {
        researchCostsGold: {},
        researchCostsEmerald: {
          'emerald:plotPlanting:2:2': 2,
        },
      },
    });

    expect(manager.getCost('emerald:plotPlanting:2:2')).toEqual({
      amount: 2,
      currency: 'emerald',
    });
    expect(manager.getCostEmerald('emerald:plotPlanting:2:2')).toBe(2);
  });
});
