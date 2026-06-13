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
      now: () => 1000,
      createAttemptId: () => 'attempt-1',
    });
    const save = {
      version: 1,
      tasks: { currentLevel: 3 },
    };

    expect(manager.savePendingSave(save)).toEqual({
      attemptId: 'attempt-1',
      createdAtMs: 1000,
      save,
    });
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

  it('drops stale pending save data', () => {
    const storage = createMemoryStorage();
    const manager = new AuthAccountLinkSaveManager({
      storage,
      now: () => 20_000,
      maxAgeMs: 10_000,
    });

    storage.setItem(
      'idle-wizard.account-link.pending-save',
      JSON.stringify({
        attemptId: 'attempt-1',
        createdAtMs: 1_000,
        save: { version: 1 },
      }),
    );

    expect(manager.loadPendingSave()).toBeNull();
    expect(storage.getItem('idle-wizard.account-link.pending-save')).toBeNull();
  });

  it('drops pending save data from another account-link attempt', () => {
    const storage = createMemoryStorage();
    const manager = new AuthAccountLinkSaveManager({
      storage,
      now: () => 2_000,
    });

    storage.setItem(
      'idle-wizard.account-link.pending-save',
      JSON.stringify({
        attemptId: 'attempt-1',
        createdAtMs: 1_000,
        save: { version: 1 },
      }),
    );

    expect(manager.loadPendingSave({ attemptId: 'attempt-2' })).toBeNull();
    expect(storage.getItem('idle-wizard.account-link.pending-save')).toBeNull();
  });

  it('reports storage failures instead of pretending the save was stashed', () => {
    const manager = new AuthAccountLinkSaveManager({
      storage: {
        setItem() {
          throw new Error('quota exceeded');
        },
        getItem: () => null,
        removeItem: () => {},
      },
    });

    expect(manager.savePendingSave({ version: 1 })).toBe(false);
  });
});
