// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GuildPanelManager } from './GuildPanelManager.js';

function createGuildSnapshot(overrides = {}) {
  return {
    unlocked: true,
    created: false,
    canCreate: true,
    charterCostGold: 1500,
    currentGold: 2000,
    ...overrides,
  };
}

function createGameplayFacadeFake(initialGuild = createGuildSnapshot()) {
  let snapshot = { guild: initialGuild };
  const listeners = new Set();

  return {
    createGuild: vi.fn(() => ({ ok: true })),
    updateGuildProfile: vi.fn(() => ({ ok: true })),
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    emitGuild(guild) {
      snapshot = { guild };
      for (const listener of listeners) {
        listener(snapshot);
      }
    },
  };
}

function mountManager(gameplayFacade) {
  const parent = document.createElement('section');
  const popupLayer = document.createElement('section');
  const manager = new GuildPanelManager({ gameplayFacade });

  document.body.append(parent, popupLayer);
  manager.mount(parent, popupLayer);

  return { manager, parent, popupLayer };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('GuildPanelManager', () => {
  it('preserves guild charter fields across gameplay snapshot refreshes', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const { popupLayer } = mountManager(gameplayFacade);

    document
      .querySelector('.guild-page__wide-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    popupLayer.querySelector('input[name="name"]').value = 'ash hall';
    popupLayer.querySelector('input[name="tag"]').value = 'ASH';
    popupLayer.querySelector('input[name="color"][value="blue"]').checked = true;

    gameplayFacade.emitGuild(createGuildSnapshot({ currentGold: 1999 }));

    expect(popupLayer.querySelector('input[name="name"]')?.value).toBe('ash hall');
    expect(popupLayer.querySelector('input[name="tag"]')?.value).toBe('ASH');
    expect(popupLayer.querySelector('input[name="color"][value="blue"]')?.checked).toBe(true);
  });

  it('populates guild settings fields and keeps in-progress edits through refreshes', () => {
    const gameplayFacade = createGameplayFacadeFake(
      createGuildSnapshot({
        created: true,
        profile: {
          name: 'ash hall',
          tag: 'ASH',
          color: 'red',
        },
        secretary: {
          level: 1,
          hiredCap: 1,
          boardSlots: 3,
        },
        adventurers: [],
        board: [],
        applicants: [],
        logs: [],
      }),
    );
    const { popupLayer } = mountManager(gameplayFacade);

    document
      .querySelector('.guild-page__wide-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popupLayer.querySelector('input[name="name"]')?.value).toBe('ash hall');
    expect(popupLayer.querySelector('input[name="tag"]')?.value).toBe('ASH');
    expect(popupLayer.querySelector('input[name="color"][value="red"]')?.checked).toBe(true);

    popupLayer.querySelector('input[name="name"]').value = 'ember hall';
    gameplayFacade.emitGuild(
      createGuildSnapshot({
        created: true,
        profile: {
          name: 'ash hall',
          tag: 'ASH',
          color: 'red',
        },
        secretary: {
          level: 1,
          hiredCap: 1,
          boardSlots: 3,
        },
        adventurers: [],
        board: [],
        applicants: [],
        logs: [],
      }),
    );

    expect(popupLayer.querySelector('input[name="name"]')?.value).toBe('ember hall');
    expect(popupLayer.querySelector('input[name="tag"]')?.value).toBe('ASH');
    expect(popupLayer.querySelector('input[name="color"][value="red"]')?.checked).toBe(true);
  });

  it('keeps guild dialog labels outside the scrolling clip', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const dialogRule = baseCss.match(
      /\.style-dialog\.guild-page__dialog\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const contentRule = baseCss.match(
      /\.guild-page__popup-content\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(dialogRule).toMatch(/\bdisplay:\s*flex;/);
    expect(dialogRule).toMatch(/\bflex-direction:\s*column;/);
    expect(dialogRule).not.toMatch(/\boverflow:\s*hidden;/);
    expect(contentRule).toMatch(/\bmin-height:\s*0;/);
    expect(contentRule).toMatch(/\boverflow:\s*hidden auto;/);
  });
});
