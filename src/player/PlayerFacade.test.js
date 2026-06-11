import { describe, expect, it } from 'vitest';

import { PlayerFacade } from './PlayerFacade.js';

describe('PlayerFacade', () => {
  it('normalizes username edits', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setUsername('  Arch  Mage  ');

    expect(playerFacade.getSnapshot()).toEqual({
      username: 'Arch Mage',
      shouldPromptForUsername: false,
      usernamePromptSeen: true,
      theme: 'white',
      colorMode: 'monochrome',
    });
  });

  it('falls back to wizard for blank username', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setUsername('   ');

    expect(playerFacade.getSnapshot()).toEqual({
      username: 'wizard',
      shouldPromptForUsername: false,
      usernamePromptSeen: true,
      theme: 'white',
      colorMode: 'monochrome',
    });
  });

  it('asks for a username only after a default server profile is known', () => {
    const playerFacade = new PlayerFacade();

    expect(playerFacade.getSnapshot().shouldPromptForUsername).toBe(false);

    playerFacade.applyServerUsername('wizard');

    expect(playerFacade.getSnapshot()).toMatchObject({
      username: 'wizard',
      shouldPromptForUsername: true,
      usernamePromptSeen: false,
    });

    playerFacade.markUsernamePromptSeen();

    expect(playerFacade.getSnapshot()).toMatchObject({
      shouldPromptForUsername: false,
      usernamePromptSeen: true,
    });
  });

  it('does not ask again after server says the prompt was seen', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.applyServerProfile({
      username: 'wizard',
      usernamePromptSeen: true,
    });

    expect(playerFacade.getSnapshot()).toMatchObject({
      username: 'wizard',
      usernamePromptSeen: true,
      shouldPromptForUsername: false,
    });
  });

  it('normalizes theme', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setTheme('black');

    expect(playerFacade.getSnapshot().theme).toBe('black');

    playerFacade.setTheme('unknown');
    expect(playerFacade.getSnapshot().theme).toBe('white');
  });

  it('normalizes color mode', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setColorMode('resources');

    expect(playerFacade.getSnapshot().colorMode).toBe('resources');

    playerFacade.setColorMode('unknown');
    expect(playerFacade.getSnapshot().colorMode).toBe('monochrome');
  });

  it('applies server profile preferences', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.applyServerProfile({
      username: 'Mira',
      theme: 'black',
      colorMode: 'resources',
      usernamePromptSeen: true,
    });

    expect(playerFacade.getProfileSnapshot()).toEqual({
      username: 'Mira',
      usernamePromptSeen: true,
      theme: 'black',
      colorMode: 'resources',
    });
  });

  it('maps old dark theme names to black', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setTheme('night-black');
    expect(playerFacade.getSnapshot().theme).toBe('black');

    playerFacade.setTheme('dark-gray');
    expect(playerFacade.getSnapshot().theme).toBe('black');
  });
});
