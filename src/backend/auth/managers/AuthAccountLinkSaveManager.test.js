import { describe, expect, it } from 'vitest';

import { AuthAccountLinkSaveManager } from './AuthAccountLinkSaveManager.js';

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe('AuthAccountLinkSaveManager', () => {
  it('stores and clears the pre-login gameplay save', () => {
    const manager = new AuthAccountLinkSaveManager({
      storage: createMemoryStorage(),
    });
    const save = {
      version: 1,
      tasks: { currentLevel: 3 },
    };

    expect(manager.savePendingSave(save)).toBe(true);
    expect(manager.loadPendingSave()).toEqual(save);

    manager.clearPendingSave();

    expect(manager.loadPendingSave()).toBeNull();
  });

  it('drops malformed pending save data', () => {
    const storage = createMemoryStorage();
    const manager = new AuthAccountLinkSaveManager({ storage });

    storage.setItem('idle-wizard.account-link.pending-save', '{bad');

    expect(manager.loadPendingSave()).toBeNull();
    expect(storage.getItem('idle-wizard.account-link.pending-save')).toBeNull();
  });
});
