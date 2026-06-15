export const WORKSHOP_SECONDARY_ACTION_UNLOCK_LEVEL = 3;

export class WorkshopSecondaryActionGateManager {
  constructor({ unlockLevel = WORKSHOP_SECONDARY_ACTION_UNLOCK_LEVEL } = {}) {
    this.unlockLevel = unlockLevel;
  }

  isUnlocked(snapshot) {
    return getCurrentLevel(snapshot) >= this.unlockLevel;
  }

  apply(snapshot, targets = []) {
    const unlocked = this.isUnlocked(snapshot);

    for (const target of targets) {
      this.applyTarget(target, unlocked);
    }

    return unlocked;
  }

  applyTarget(target, unlocked) {
    const element = target?.element ?? target;

    if (!element) {
      return;
    }

    element.hidden = !unlocked;
    element.setAttribute('aria-hidden', unlocked ? 'false' : 'true');

    const button = element.matches?.('button') ? element : element.querySelector?.('button');

    if (!button) {
      return;
    }

    button.disabled = !unlocked;
    button.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
  }
}

function getCurrentLevel(snapshot) {
  const level =
    Number(snapshot?.tasks?.currentLevel) || Number(snapshot?.playerLevel?.currentLevel) || 1;

  return Math.max(1, Math.floor(level));
}
