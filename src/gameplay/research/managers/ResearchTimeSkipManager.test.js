import { describe, expect, it, vi } from 'vitest';

import {
  RESEARCH_SECONDS_PER_AMETHYST,
  ResearchTimeSkipManager,
} from './ResearchTimeSkipManager.js';

function createHarness({ current = 0, remainingSeconds = 331 } = {}) {
  let balance = current;
  let inProgress = true;
  const finishResearch = vi.fn(() => {
    if (!inProgress) return false;
    inProgress = false;
    return true;
  });
  const manager = new ResearchTimeSkipManager({
    amethystFacade: {
      add: (amount) => { balance += amount; },
      canSpend: (amount) => balance >= amount,
      getSnapshot: () => ({ current: balance }),
      spend: (amount) => {
        if (balance < amount) return false;
        balance -= amount;
        return true;
      },
    },
    researchProcessManager: { finishResearch },
    researchStateEntityManager: {
      getProgressSnapshot: () => ({ inProgress, remainingSeconds }),
    },
  });
  return { finishResearch, getBalance: () => balance, manager };
}

describe('ResearchTimeSkipManager', () => {
  it('charges one Amethyst per remaining minute, rounded up', () => {
    const { manager } = createHarness({ remainingSeconds: 331 });

    expect(RESEARCH_SECONDS_PER_AMETHYST).toBe(60);
    expect(manager.getCost('research')).toBe(6);
  });

  it('spends the rounded cost and finishes active research', () => {
    const { finishResearch, getBalance, manager } = createHarness({
      current: 10,
      remainingSeconds: 331,
    });

    expect(manager.skip('research')).toEqual({
      ok: true,
      researchId: 'research',
      cost: 6,
      costCurrency: 'amethyst',
    });
    expect(getBalance()).toBe(4);
    expect(finishResearch).toHaveBeenCalledWith('research');
  });

  it('does not finish research when the player lacks Amethyst', () => {
    const { finishResearch, getBalance, manager } = createHarness({
      current: 5,
      remainingSeconds: 331,
    });

    expect(manager.skip('research')).toMatchObject({
      ok: false,
      reason: 'not_enough_amethyst',
      cost: 6,
      current: 5,
    });
    expect(getBalance()).toBe(5);
    expect(finishResearch).not.toHaveBeenCalled();
  });
});
