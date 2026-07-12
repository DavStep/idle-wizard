import { describe, expect, it } from 'vitest';

import { PlayerProgressBarManager } from './PlayerProgressBarManager.js';

function createMemoryStorage(initialEntries = {}) {
  const values = new Map(Object.entries(initialEntries));

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe('PlayerProgressBarManager', () => {
  it('loads a stored progress bar', () => {
    const manager = new PlayerProgressBarManager({
      storage: createMemoryStorage({
        'idle-wizard.player.progressBar': 'notched',
      }),
    });

    expect(manager.getProgressBar()).toBe('notched');
  });

  it('stores the selected progress bar', () => {
    const storage = createMemoryStorage();
    const manager = new PlayerProgressBarManager({ storage });

    manager.setProgressBar('gradinet');

    expect(manager.getProgressBar()).toBe('gradient');
    expect(storage.getItem('idle-wizard.player.progressBar')).toBe('gradient');
  });

  it('falls back when storage is unavailable', () => {
    const storage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const manager = new PlayerProgressBarManager({ storage });

    expect(manager.getProgressBar()).toBe('regular');
    expect(manager.setProgressBar('gradient')).toBe('gradient');
  });
});
