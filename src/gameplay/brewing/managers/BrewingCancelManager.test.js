import { describe, expect, it, vi } from 'vitest';

import { BrewingCancelManager } from './BrewingCancelManager.js';

describe('BrewingCancelManager', () => {
  it.each(['brewing', 'bottling'])(
    'destroys an unfinished %s batch and disables autobrew without a refund path',
    (phase) => {
      const brewingProcessEntityManager = {
        getActiveBrewSnapshot: vi.fn(() => ({
          cauldronIndex: 1,
          cauldronNumber: 2,
          phase,
          resultQuantity: 5,
        })),
        clearActiveBrew: vi.fn(),
      };
      const disableAutoBrew = vi.fn();
      const manager = new BrewingCancelManager({
        brewingProcessEntityManager,
        disableAutoBrew,
      });

      expect(manager.cancel(1)).toEqual({
        ok: true,
        cauldronIndex: 1,
        cauldronNumber: 2,
        destroyedQuantity: 5,
      });
      expect(brewingProcessEntityManager.clearActiveBrew).toHaveBeenCalledWith(1);
      expect(disableAutoBrew).toHaveBeenCalledWith(1);
    },
  );

  it.each(['brewed', 'ready'])('does not cancel a %s batch', (phase) => {
    const brewingProcessEntityManager = {
      getActiveBrewSnapshot: vi.fn(() => ({ phase })),
      clearActiveBrew: vi.fn(),
    };
    const manager = new BrewingCancelManager({
      brewingProcessEntityManager,
      disableAutoBrew: vi.fn(),
    });

    expect(manager.cancel()).toEqual({
      ok: false,
      reason: 'brew_not_cancellable',
      phase,
    });
    expect(brewingProcessEntityManager.clearActiveBrew).not.toHaveBeenCalled();
  });
});
