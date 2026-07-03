import { getResearchSlotLimit } from '../../prestige/prestigeUnlocks.js';

export class ResearchSlotManager {
  constructor({ prestigeFacade, researchStateEntityManager } = {}) {
    this.prestigeFacade = prestigeFacade;
    this.researchStateEntityManager = researchStateEntityManager;
  }

  getSnapshot() {
    const active = this.getActiveCount();
    const max = this.getMaxSlots();

    return {
      active,
      max,
      full: active >= max,
      ...(active >= max ? { blockedReason: 'research_slots_full' } : {}),
    };
  }

  canStartTimedResearch() {
    return this.getActiveCount() < this.getMaxSlots();
  }

  getActiveCount() {
    return this.researchStateEntityManager?.getInProgressResearches?.().length ?? 0;
  }

  getMaxSlots() {
    return getResearchSlotLimit(this.prestigeFacade?.getCompletedCount?.() ?? 0);
  }
}
