import { describe, expect, it } from 'vitest';

import { GameplayLogFacade } from './GameplayLogFacade.js';

describe('GameplayLogFacade', () => {
  it('logs the exact seeds from a multi-seed summon', () => {
    const logs = new GameplayLogFacade();

    logs.logSeedSummoned({
      ok: true,
      seedCounts: [
        {
          seed: { label: 'sage seed' },
          quantity: 1,
        },
        {
          seed: { label: 'mint seed' },
          quantity: 1,
        },
      ],
      quantity: 2,
    });

    expect(logs.getSnapshot().entries[0]?.message).toBe('summoned sage seed, mint seed');
  });

  it('keeps grouped quantity when same seed is summoned more than once', () => {
    const logs = new GameplayLogFacade();

    logs.logSeedSummoned({
      ok: true,
      seedCounts: [
        {
          seed: { label: 'sage seed' },
          quantity: 2,
        },
      ],
      quantity: 2,
    });

    expect(logs.getSnapshot().entries[0]?.message).toBe('summoned sage seed x2');
  });
});
