import { DEFAULT_PAGE_SWIPE_ORDER } from './PageSwipeNavigationManager.js';

export const PAGE_UNLOCK_REQUIREMENTS = {
  garden: {
    requiredLevel: 2,
    label: 'garden',
    message: 'garden unlocks at level 2',
  },
  research: {
    requiredLevel: 3,
    label: 'research',
    message: 'research unlocks at level 3',
  },
  brewing: {
    requiredLevel: 4,
    label: 'brewing',
    message: 'brewing unlocks at level 4',
  },
};

export class PageUnlockManager {
  constructor({ pageOrder = DEFAULT_PAGE_SWIPE_ORDER } = {}) {
    this.pageOrder = pageOrder;
  }

  getPageStates(snapshot = {}) {
    const currentLevel = this.getCurrentLevel(snapshot);

    return this.pageOrder.map((pageId) => {
      const requirement = PAGE_UNLOCK_REQUIREMENTS[pageId] ?? null;
      const unlocked = !requirement || currentLevel >= requirement.requiredLevel;

      return {
        id: pageId,
        unlocked,
        ...(requirement
          ? {
              requiredLevel: requirement.requiredLevel,
              lockedMessage: requirement.message,
            }
          : {}),
      };
    });
  }

  getUnlockedPageIds(snapshot = {}) {
    return this.getPageStates(snapshot)
      .filter((page) => page.unlocked)
      .map((page) => page.id);
  }

  isUnlocked(pageId, snapshot = {}) {
    return this.getUnlockedPageIds(snapshot).includes(pageId);
  }

  getCurrentLevel(snapshot = {}) {
    const level =
      snapshot.playerLevel?.currentLevel ??
      snapshot.tasks?.currentLevel ??
      snapshot.tasks?.level?.level ??
      1;

    return Math.max(1, Math.floor(Number(level) || 1));
  }
}
