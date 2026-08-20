import { describe, expect, it } from 'vitest';

import { normalizeResearchForSaveMerge } from './playerGameplayResearchMerge';

describe('player gameplay research merge', () => {
  it('normalizes merged research with the prestige count from the same save', () => {
    const save = {
      prestige: { completedLevels: [10, 20] },
      research: {
        completedIds: [
          'unlockSeed:sageSeed',
          'advanced:plotCapacity:6',
          'advanced:plotCapacity:7',
        ],
      },
    };
    const normalizeResearch = (
      research: unknown,
      prestigeCount = 0,
    ) => ({
      completedIds:
        prestigeCount >= 2
          ? (research as typeof save.research).completedIds
          : ['unlockSeed:sageSeed'],
    });

    const normalizedState = normalizeResearchForSaveMerge({
      save,
      normalizePrestige: (prestige) =>
        prestige as { completedLevels: unknown[] },
      normalizeResearch,
    });

    expect(normalizedState).toMatchObject({ prestigeCount: 2 });
    expect(normalizedState.research.completedIds).toContain(
      'advanced:plotCapacity:7',
    );
  });
});
