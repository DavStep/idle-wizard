import { describe, expect, it } from 'vitest';

import { PageUnlockManager } from './PageUnlockManager.js';

describe('PageUnlockManager', () => {
  it('unlocks research before level 3 requirements can ask for research tasks', () => {
    const manager = new PageUnlockManager();

    expect(manager.isUnlocked('research', levelSnapshot(1))).toBe(false);
    expect(manager.isUnlocked('research', levelSnapshot(2))).toBe(true);
    expect(
      manager.getPageStates(levelSnapshot(1)).find((page) => page.id === 'research')
        ?.lockedMessage,
    ).toBe('research unlocks at level 2');
  });
});

function levelSnapshot(level) {
  return {
    tasks: {
      currentLevel: level,
    },
    playerLevel: {
      currentLevel: level,
    },
  };
}
