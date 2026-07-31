import { describe, expect, it, vi } from 'vitest';

import { PixiPagesFacade } from './PixiPagesFacade.js';

describe('PixiPagesFacade purchase sound', () => {
  it('plays the purchase cue with the retained spend burst after a successful spend', () => {
    const emitReward = vi.fn();
    const playPurchase = vi.fn();
    const presenter = {
      experienceFacade: { transientEffects: { emitReward } },
      uiClickSoundFacade: { playPurchase },
    };

    expect(
      PixiPagesFacade.prototype.emitPurchaseSpendBurstForResult.call(
        presenter,
        { ok: true, cost: 25 },
        { anchorId: 'research.mint', resource: 'coin' },
      ),
    ).toBe(true);
    expect(playPurchase).toHaveBeenCalledTimes(1);
    expect(emitReward).toHaveBeenCalledWith({
      visualOnly: true,
      spendBursts: [
        {
          anchorId: 'research.mint',
          resource: 'coin',
        },
      ],
    });
  });

  it('stays silent when the action fails or does not spend a resource', () => {
    const playPurchase = vi.fn();
    const presenter = {
      experienceFacade: { transientEffects: { emitReward: vi.fn() } },
      uiClickSoundFacade: { playPurchase },
    };

    expect(
      PixiPagesFacade.prototype.emitPurchaseSpendBurstForResult.call(
        presenter,
        { ok: false, cost: 25 },
        { anchorId: 'research.mint' },
      ),
    ).toBe(false);
    expect(
      PixiPagesFacade.prototype.emitPurchaseSpendBurstForResult.call(
        presenter,
        { ok: true, cost: 0 },
        { anchorId: 'research.mint' },
      ),
    ).toBe(false);
    expect(playPurchase).not.toHaveBeenCalled();
  });
});
