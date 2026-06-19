import { describe, expect, it } from 'vitest';

import { PlayerPlotViewManager } from './PlayerPlotViewManager.js';

function createMemoryStorage(initialEntries = {}) {
  const values = new Map(Object.entries(initialEntries));

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe('PlayerPlotViewManager', () => {
  it('loads a stored plot view', () => {
    const manager = new PlayerPlotViewManager({
      storage: createMemoryStorage({
        'idle-wizard.player.plotView': 'rows',
      }),
    });

    expect(manager.getPlotView()).toBe('rows');
  });

  it('stores the selected plot view', () => {
    const storage = createMemoryStorage();
    const manager = new PlayerPlotViewManager({ storage });

    manager.setPlotView('grid');

    expect(manager.getPlotView()).toBe('boxes');
    expect(storage.getItem('idle-wizard.player.plotView')).toBe('boxes');
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
    const manager = new PlayerPlotViewManager({ storage });

    expect(manager.getPlotView()).toBe('boxes');
    expect(manager.setPlotView('rows')).toBe('rows');
  });
});
