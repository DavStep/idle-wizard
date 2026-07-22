import { describe, expect, it, vi } from 'vitest';

import { automationResearchIds } from '../automationResearchIds.js';
import { BrewingAutomationManager } from './BrewingAutomationManager.js';

function createManager(cauldron) {
  const brewingFacade = {
    autoBrew: vi.fn(() => ({ ok: true })),
    getSnapshot: () => ({ cauldrons: [cauldron] }),
    startBottling: vi.fn(),
  };
  const completedResearchId = automationResearchIds.autoBrewCauldron(1);
  const manager = new BrewingAutomationManager({
    brewingFacade,
    researchFacade: {
      hasCompletedResearch: (researchId) => researchId === completedResearchId,
      hasCompletedResearchMatching: (predicate) => predicate(completedResearchId),
    },
  });

  return { brewingFacade, manager };
}

describe('BrewingAutomationManager', () => {
  it('uses cauldron automation to bottle its finished brew', () => {
    const { brewingFacade, manager } = createManager({
      cauldronNumber: 1,
      canStartBottling: true,
    });

    manager.update();

    expect(brewingFacade.startBottling).toHaveBeenCalledWith(0);
  });

  it('uses the same cauldron automation to brew its armed recipe', () => {
    const { brewingFacade, manager } = createManager({
      cauldronNumber: 1,
      canStartBottling: false,
      autoBrewEnabled: true,
      autoBrewArmed: true,
      autoBrewRecipeKey: 'manaTonic',
    });

    manager.update();

    expect(brewingFacade.autoBrew).toHaveBeenCalledWith(0);
  });
});
