import { describe, expect, it } from 'vitest';

import { GameplayLogFacade } from './GameplayLogFacade.js';

describe('GameplayLogFacade', () => {
  it('logs the exact seeds from a multi-seed summon', () => {
    const logs = new GameplayLogFacade();

    logs.logSeedSummoned({
      ok: true,
      seedCounts: [
        {
          seed: { label: 'Sage Seed' },
          quantity: 1,
        },
        {
          seed: { label: 'Mint Seed' },
          quantity: 1,
        },
      ],
      quantity: 2,
    });

    expect(logs.getSnapshot().entries[0]?.message).toBe('summoned Sage Seed, Mint Seed');
  });

  it('keeps grouped quantity when same seed is summoned more than once', () => {
    const logs = new GameplayLogFacade();

    logs.logSeedSummoned({
      ok: true,
      seedCounts: [
        {
          seed: { label: 'Sage Seed' },
          quantity: 2,
        },
      ],
      quantity: 2,
    });

    expect(logs.getSnapshot().entries[0]?.message).toBe('summoned Sage Seed x2');
  });
});
