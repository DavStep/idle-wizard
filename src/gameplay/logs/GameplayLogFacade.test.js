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

  it('keeps only the newest 100 entries in persistence', () => {
    const logs = new GameplayLogFacade();

    for (let index = 1; index <= 105; index += 1) {
      logs.logResearchBought({ label: `study ${index}` });
    }

    const entries = logs.getPersistenceSnapshot().entries;

    expect(entries).toHaveLength(100);
    expect(entries[0].message).toBe('researched study 6');
    expect(entries.at(-1).message).toBe('researched study 105');
  });

  it('trims long log messages before persistence', () => {
    const logs = new GameplayLogFacade();

    logs.logResearchBought({ label: 'x'.repeat(300) });

    expect(logs.getPersistenceSnapshot().entries[0].message).toHaveLength(240);
  });
});
