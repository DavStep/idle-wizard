import { describe, expect, it } from 'vitest';

import { PlayerFacade } from './PlayerFacade.js';

describe('PlayerFacade', () => {
  it('normalizes username edits', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setUsername('  Arch  Mage  ');

    expect(playerFacade.getSnapshot()).toEqual({
      username: 'Arch Mage',
      hasExplicitUsername: true,
      shouldPromptForUsername: false,
      usernamePromptSeen: true,
      theme: 'night',
      font: 'lilita-one',
      colorMode: 'resources',
      character: 'elara',
      frame: 'classic',
      iconMode: 'icons',
      progressBar: 'regular',
      plotView: 'boxes',
      allowFriendRequests: true,
      allowTradeAllianceInvitations: true,
    });
  });

  it('falls back to Wizard for blank username', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setUsername('   ');

    expect(playerFacade.getSnapshot()).toEqual({
      username: 'Wizard',
      hasExplicitUsername: true,
      shouldPromptForUsername: false,
      usernamePromptSeen: true,
      theme: 'night',
      font: 'lilita-one',
      colorMode: 'resources',
      character: 'elara',
      frame: 'classic',
      iconMode: 'icons',
      progressBar: 'regular',
      plotView: 'boxes',
      allowFriendRequests: true,
      allowTradeAllianceInvitations: true,
    });
  });

  it('asks for a username only after a default server profile is known', () => {
    const playerFacade = new PlayerFacade();

    expect(playerFacade.getSnapshot().shouldPromptForUsername).toBe(false);

    playerFacade.applyServerUsername('Wizard');

    expect(playerFacade.getSnapshot()).toMatchObject({
      username: 'Wizard',
      hasExplicitUsername: false,
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
      username: 'Wizard',
      usernamePromptSeen: true,
      allowFriendRequests: false,
      allowTradeAllianceInvitations: false,
    });

    expect(playerFacade.getSnapshot()).toMatchObject({
      username: 'Wizard',
      hasExplicitUsername: false,
      usernamePromptSeen: true,
      shouldPromptForUsername: false,
    });
  });

  it('does not ask again when a stale server profile says the prompt was not seen', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.applyServerProfile({
      username: 'Wizard',
      hasExplicitUsername: false,
      usernamePromptSeen: false,
    });
    playerFacade.markUsernamePromptSeen();
    playerFacade.applyServerProfile({
      username: 'Wizard',
      hasExplicitUsername: false,
      usernamePromptSeen: false,
    });

    expect(playerFacade.getSnapshot()).toMatchObject({
      username: 'Wizard',
      hasExplicitUsername: false,
      usernamePromptSeen: true,
      shouldPromptForUsername: false,
    });
  });

  it('clears explicit username state when a different default server profile arrives', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setUsername('Mira');
    playerFacade.applyServerProfile({
      username: 'Wizard',
      usernamePromptSeen: false,
    });

    expect(playerFacade.getSnapshot()).toMatchObject({
      username: 'Wizard',
      hasExplicitUsername: false,
      shouldPromptForUsername: false,
    });
  });

  it('upgrades the legacy lowercase default username', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.applyServerUsername('wizard');

    expect(playerFacade.getSnapshot()).toMatchObject({
      username: 'Wizard',
      hasExplicitUsername: false,
      shouldPromptForUsername: true,
    });
  });

  it('normalizes theme', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setTheme('day');
    expect(playerFacade.getSnapshot().theme).toBe('day');

    playerFacade.setTheme('night');
    expect(playerFacade.getSnapshot().theme).toBe('night');

    playerFacade.setTheme('unknown');
    expect(playerFacade.getSnapshot().theme).toBe('night');
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
    expect(playerFacade.getSnapshot().font).toBe('lilita-one');

    playerFacade.setFont('unknown');
    expect(playerFacade.getSnapshot().font).toBe('lilita-one');
  });

  it('applies server profile preferences', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.applyServerProfile({
      username: 'Mira',
      theme: 'day',
      font: 'comic-sans-mono',
      colorMode: 'resources',
      character: 'mira',
      frame: 'classic',
      iconMode: 'icons',
      progressBar: 'gradient',
      plotView: 'rows',
      usernamePromptSeen: true,
      allowFriendRequests: false,
      allowTradeAllianceInvitations: false,
    });

    expect(playerFacade.getProfileSnapshot()).toEqual({
      username: 'Mira',
      usernamePromptSeen: true,
      theme: 'day',
      font: 'comic-sans-mono',
      colorMode: 'resources',
      character: 'mira',
      frame: 'classic',
      iconMode: 'icons',
      progressBar: 'gradient',
      plotView: 'boxes',
      allowFriendRequests: false,
      allowTradeAllianceInvitations: false,
    });
  });

  it('updates social preferences and includes them in the synced profile', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setAllowFriendRequests(false);
    playerFacade.setAllowTradeAllianceInvitations(false);

    expect(playerFacade.getProfileSnapshot()).toMatchObject({
      allowFriendRequests: false,
      allowTradeAllianceInvitations: false,
    });
  });

  it('maps old theme names to canonical themes', () => {
    const playerFacade = new PlayerFacade();

    playerFacade.setTheme('mild-white');
    expect(playerFacade.getSnapshot().theme).toBe('night');

    playerFacade.setTheme('mild-black');
    expect(playerFacade.getSnapshot().theme).toBe('night');

    playerFacade.setTheme('night-black');
    expect(playerFacade.getSnapshot().theme).toBe('night');

    playerFacade.setTheme('dark-gray');
    expect(playerFacade.getSnapshot().theme).toBe('night');

    playerFacade.setTheme('vs-code-midnight');
    expect(playerFacade.getSnapshot().theme).toBe('night');

    playerFacade.setTheme('idle witch craft');
    expect(playerFacade.getSnapshot().theme).toBe('night');
  });
});
