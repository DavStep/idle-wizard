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
      theme: 'midnight',
      font: 'lexend',
      colorMode: 'resources',
      character: 'elara',
      iconMode: 'icons',
      progressBar: 'regular',
      plotView: 'boxes',
    });
  });

  it('falls back to wizard for blank username', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setUsername('   ');

    expect(playerFacade.getSnapshot()).toEqual({
      username: 'wizard',
      shouldPromptForUsername: false,
      usernamePromptSeen: true,
      theme: 'midnight',
      font: 'lexend',
      colorMode: 'resources',
      character: 'elara',
      iconMode: 'icons',
      progressBar: 'regular',
      plotView: 'boxes',
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

  it('does not ask again when a stale server profile says the prompt was not seen', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.applyServerProfile({
      username: 'wizard',
      usernamePromptSeen: false,
    });
    playerFacade.markUsernamePromptSeen();
    playerFacade.applyServerProfile({
      username: 'wizard',
      usernamePromptSeen: false,
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

    playerFacade.setTheme('midnight');
    expect(playerFacade.getSnapshot().theme).toBe('midnight');

    playerFacade.setTheme('witchcraft');
    expect(playerFacade.getSnapshot().theme).toBe('witchcraft');

    playerFacade.setTheme('unknown');
    expect(playerFacade.getSnapshot().theme).toBe('midnight');
  });

  it('normalizes color mode', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setColorMode('resources');

    expect(playerFacade.getSnapshot().colorMode).toBe('resources');

    playerFacade.setColorMode('unknown');
    expect(playerFacade.getSnapshot().colorMode).toBe('resources');
  });

  it('normalizes character', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setCharacter('mira');
    expect(playerFacade.getSnapshot().character).toBe('mira');

    playerFacade.setCharacter('unknown');
    expect(playerFacade.getSnapshot().character).toBe('elara');
  });

  it('normalizes icon mode', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setIconMode('icons');

    expect(playerFacade.getSnapshot().iconMode).toBe('icons');

    playerFacade.setIconMode('no icons');
    expect(playerFacade.getSnapshot().iconMode).toBe('icons');

    playerFacade.setIconMode('unknown');
    expect(playerFacade.getSnapshot().iconMode).toBe('icons');
  });

  it('normalizes progress bar', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setProgressBar('gradient');
    expect(playerFacade.getSnapshot().progressBar).toBe('gradient');

    playerFacade.setProgressBar('gradinet');
    expect(playerFacade.getSnapshot().progressBar).toBe('gradient');

    playerFacade.setProgressBar('unknown');
    expect(playerFacade.getSnapshot().progressBar).toBe('regular');
  });

  it('normalizes plot view', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setPlotView('rows');
    expect(playerFacade.getSnapshot().plotView).toBe('boxes');

    playerFacade.setPlotView('box');
    expect(playerFacade.getSnapshot().plotView).toBe('boxes');

    playerFacade.setPlotView('unknown');
    expect(playerFacade.getSnapshot().plotView).toBe('boxes');
  });

  it('normalizes font', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setFont('comic-sans-mono');
    expect(playerFacade.getSnapshot().font).toBe('comic-sans-mono');

    playerFacade.setFont('lexend');
    expect(playerFacade.getSnapshot().font).toBe('lexend');

    playerFacade.setFont('unknown');
    expect(playerFacade.getSnapshot().font).toBe('lexend');
  });

  it('applies server profile preferences', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.applyServerProfile({
      username: 'Mira',
      theme: 'black',
      font: 'comic-sans-mono',
      colorMode: 'resources',
      character: 'mira',
      iconMode: 'icons',
      progressBar: 'gradient',
      plotView: 'rows',
      usernamePromptSeen: true,
    });

    expect(playerFacade.getProfileSnapshot()).toEqual({
      username: 'Mira',
      usernamePromptSeen: true,
      theme: 'black',
      font: 'comic-sans-mono',
      colorMode: 'resources',
      character: 'mira',
      iconMode: 'icons',
      progressBar: 'gradient',
      plotView: 'boxes',
    });
  });

  it('maps old theme names to canonical themes', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setTheme('mild-white');
    expect(playerFacade.getSnapshot().theme).toBe('midnight');

    playerFacade.setTheme('mild-black');
    expect(playerFacade.getSnapshot().theme).toBe('black');

    playerFacade.setTheme('night-black');
    expect(playerFacade.getSnapshot().theme).toBe('black');

    playerFacade.setTheme('dark-gray');
    expect(playerFacade.getSnapshot().theme).toBe('black');

    playerFacade.setTheme('vs-code-midnight');
    expect(playerFacade.getSnapshot().theme).toBe('midnight');

    playerFacade.setTheme('idle witch craft');
    expect(playerFacade.getSnapshot().theme).toBe('witchcraft');
  });
});
