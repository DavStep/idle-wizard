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
      shouldPromptForUsername: false,
      theme: 'white',
    });
  });

  it('falls back to wizard for blank username', () => {
    const playerFacade = new PlayerFacade({
      storage: createMemoryStorage(),
    });

    playerFacade.setUsername('   ');

    expect(playerFacade.getSnapshot()).toEqual({
      username: 'wizard',
      shouldPromptForUsername: false,
      theme: 'white',
    });
  });

  it('asks for a username only after a default server profile is known', () => {
    const playerFacade = new PlayerFacade({
      storage: createMemoryStorage(),
    });

    expect(playerFacade.getSnapshot().shouldPromptForUsername).toBe(false);

    playerFacade.applyServerUsername('wizard');

    expect(playerFacade.getSnapshot()).toMatchObject({
      username: 'wizard',
      shouldPromptForUsername: true,
    });

    playerFacade.markUsernamePromptSeen();

    expect(playerFacade.getSnapshot().shouldPromptForUsername).toBe(false);
  });

  it('does not ask again after restoring a saved username', () => {
    const storage = createMemoryStorage();
    const playerFacade = new PlayerFacade({ storage });

    playerFacade.setUsername('Mira');

    const restoredPlayerFacade = new PlayerFacade({ storage });
    restoredPlayerFacade.applyServerUsername('wizard');

    expect(restoredPlayerFacade.getSnapshot()).toMatchObject({
      username: 'wizard',
      shouldPromptForUsername: false,
    });
  });

  it('stores and normalizes theme', () => {
    const storage = createMemoryStorage();
    const playerFacade = new PlayerFacade({ storage });

    playerFacade.setTheme('black');

    expect(playerFacade.getSnapshot().theme).toBe('black');

    const restoredPlayerFacade = new PlayerFacade({ storage });
    expect(restoredPlayerFacade.getSnapshot().theme).toBe('black');

    restoredPlayerFacade.setTheme('unknown');
    expect(restoredPlayerFacade.getSnapshot().theme).toBe('white');
  });

  it('maps old dark theme names to black', () => {
    const playerFacade = new PlayerFacade({
      storage: createMemoryStorage(),
    });

    playerFacade.setTheme('night-black');
    expect(playerFacade.getSnapshot().theme).toBe('black');

    playerFacade.setTheme('dark-gray');
    expect(playerFacade.getSnapshot().theme).toBe('black');
  });
});
