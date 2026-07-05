import { DEFAULT_PAGE_SWIPE_ORDER } from './PageSwipeNavigationManager.js';
import { WORKSHOP_PRESTIGE_ACTION_UNLOCK_LEVEL } from '../workshop/managers/WorkshopSecondaryActionGateManager.js';

export const PAGE_UNLOCK_REQUIREMENTS = {
  shop: {
    requiredLevel: 1,
    label: 'market',
    message: 'market unlocks at level 1',
  },
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
  guild: {
    requiredLevel: 15,
    label: 'guild',
    message: 'guild unlocks at level 15',
    visibleBeforeUnlock: false,
  },
  prestige: {
    requiredLevel: WORKSHOP_PRESTIGE_ACTION_UNLOCK_LEVEL,
    label: 'prestige',
    message: `prestige unlocks at level ${WORKSHOP_PRESTIGE_ACTION_UNLOCK_LEVEL}`,
    visibleBeforeUnlock: false,
  },
  advancedBrewing: {
    requiredLevel: 999,
    label: 'advanced brewing',
    message: 'advanced brewing is not ready yet',
    visibleBeforeUnlock: false,
  },
  advancedGarden: {
    requiredLevel: 999,
    label: 'advanced garden',
    message: 'advanced garden is not ready yet',
    visibleBeforeUnlock: false,
  },
  advancedMarket: {
    requiredLevel: 999,
    label: 'advanced market',
    message: 'advanced market is not ready yet',
    visibleBeforeUnlock: false,
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
      const visible = requirement?.visibleBeforeUnlock === false ? unlocked : true;

      return {
        id: pageId,
        unlocked,
        visible,
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
      null;

    if (level === null || level === undefined) {
      return 1;
    }

    const normalizedLevel = Math.floor(Number(level));

    return Number.isFinite(normalizedLevel) ? Math.max(0, normalizedLevel) : 1;
  }
}
