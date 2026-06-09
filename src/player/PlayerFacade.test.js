import { describe, expect, it } from 'vitest';

import { PlayerFacade } from './PlayerFacade.js';

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe('PlayerFacade', () => {
  it('stores and normalizes username', () => {
    const playerFacade = new PlayerFacade({
      storage: createMemoryStorage(),
    });

    playerFacade.setUsername('  Arch  Mage  ');

    expect(playerFacade.getSnapshot()).toEqual({
      username: 'Arch Mage',
    });
  });

  it('falls back to wizard for blank username', () => {
    const playerFacade = new PlayerFacade({
      storage: createMemoryStorage(),
    });

    playerFacade.setUsername('   ');

    expect(playerFacade.getSnapshot()).toEqual({
      username: 'wizard',
    });
  });
});
