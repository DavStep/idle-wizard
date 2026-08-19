import { describe, expect, it, vi } from 'vitest';

import { ResearchPurchaseManager } from './ResearchPurchaseManager.js';

describe('ResearchPurchaseManager', () => {
  it('starts item timer research with its definition-derived duration', () => {
    const start = vi.fn();
    const getDurationSeconds = vi.fn((_researchId, options) =>
      options.defaultDurationSeconds,
    );
    const manager = new ResearchPurchaseManager({
      coinFacade: { spend: () => true },
      getResearchCostReductionLevel: () => 0,
      getResearchTimeReductionLevel: () => 0,
      researchBalanceManager: {
        getCost: () => ({ amount: 25, currency: 'coin' }),
        getDurationSeconds,
      },
      researchDefinitionManager: {
        normalizeResearchId: (researchId) => researchId,
        hasResearch: () => true,
        getResearch: () => ({ durationSeconds: 12 }),
        getRequiredResearchIds: () => [],
        getMissingRequiredPlayerLevel: () => null,
        getMissingRequiredPrestigeCount: () => null,
      },
      researchManaEffectManager: { syncCompletedEffects: vi.fn() },
      researchStateEntityManager: {
        getCompletedResearchIds: () => ['unlockSeed:sageSeed'],
        isCompleted: () => false,
        isInProgress: () => false,
        start,
      },
    });

    expect(manager.buyResearch('timer:herbGrowth:sageHerb:1')).toMatchObject({
      ok: true,
      durationSeconds: 12,
      remainingSeconds: 12,
    });
    expect(getDurationSeconds).toHaveBeenCalledWith(
      'timer:herbGrowth:sageHerb:1',
      { defaultDurationSeconds: 12 },
    );
    expect(start).toHaveBeenCalledWith('timer:herbGrowth:sageHerb:1', 12);
  });
});
