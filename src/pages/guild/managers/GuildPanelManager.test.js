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
    charterCostCoin: 1500,
    currentCoin: 2000,
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
  it('centers only the locked or charter box state', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const { parent } = mountManager(gameplayFacade);
    const content = parent.querySelector('.guild-page__content');

    expect(content?.classList.contains('guild-page__content--centered')).toBe(true);

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

    expect(content?.classList.contains('guild-page__content--centered')).toBe(false);
  });

  it('preserves guild charter fields across gameplay snapshot refreshes', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const { popupLayer } = mountManager(gameplayFacade);

    document
      .querySelector('.guild-page__wide-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    popupLayer.querySelector('input[name="name"]').value = 'ash hall';
    popupLayer.querySelector('input[name="tag"]').value = 'ASH';
    popupLayer.querySelector('input[name="color"][value="blue"]').checked = true;

    gameplayFacade.emitGuild(createGuildSnapshot({ currentCoin: 1999 }));

    expect(popupLayer.querySelector('input[name="name"]')?.value).toBe('ash hall');
    expect(popupLayer.querySelector('input[name="tag"]')?.value).toBe('ASH');
    expect(popupLayer.querySelector('input[name="color"][value="blue"]')?.checked).toBe(true);
  });

  it('shows a start guild notification only when the charter is affordable', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const { parent } = mountManager(gameplayFacade);
    const button = parent.querySelector('.guild-page__wide-button');

    expect(button?.textContent).toBe('start guild');
    expect(button?.disabled).toBe(false);
    expect(button?.dataset.notification).toBe('true');
    expect(button?.dataset.notificationTone).toBe('red');

    gameplayFacade.emitGuild(
      createGuildSnapshot({
        canCreate: false,
        currentCoin: 1499,
      }),
    );

    const updatedButton = parent.querySelector('.guild-page__wide-button');
    expect(updatedButton?.disabled).toBe(true);
    expect(updatedButton?.dataset.notification).toBeUndefined();
    expect(updatedButton?.dataset.notificationTone).toBeUndefined();
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

  it('keeps guild popup panels inside the room safe area and visible keyboard stage', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const popupRule = baseCss.match(
      /\.guild-page__popup\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const panelRule = baseCss.match(
      /\.guild-page__popup-panel\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const focusRule = baseCss.match(
      /\.guild-page__popup:focus-within\s+\.guild-page__popup-panel\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(popupRule).toContain('--guild-page-popup-center-y:');
    expect(popupRule).toContain('--guild-page-popup-visible-center-y:');
    expect(popupRule).toContain('var(--app-visible-stage-height, var(--app-stage-height))');
    expect(panelRule).toMatch(/\btop:\s*var\(--guild-page-popup-center-y\);/);
    expect(panelRule).toMatch(
      /\bmax-width:\s*calc\(100%\s*-\s*\(var\(--style-room-content-edge\)\s*\*\s*2\)\);/,
    );
    expect(panelRule).toContain('100% - var(--style-room-content-top) -');
    expect(panelRule).toContain('var(--style-room-chat-clearance)');
    expect(panelRule).toMatch(/\btransform:\s*translate\(-50%, -50%\);/);
    expect(focusRule).toContain('clamp(');
    expect(focusRule).toContain('var(--guild-page-popup-visible-center-y)');
    expect(focusRule).toContain('var(--guild-page-popup-center-y)');
  });

  it('uses the full room inset width for guild boxes', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const contentRule = baseCss.match(
      /\.guild-page__content\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const centeredRule = baseCss.match(
      /\.guild-page__content--centered\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(contentRule).toMatch(
      /\bwidth:\s*calc\(100%\s*-\s*\(var\(--style-room-content-edge\)\s*\*\s*2\)\);/,
    );
    expect(contentRule).not.toMatch(/--style-main-box-width/);
    expect(centeredRule).toMatch(/\bleft:\s*var\(--style-room-content-edge\);/);
    expect(centeredRule).toMatch(/\bright:\s*var\(--style-room-content-edge\);/);
    expect(centeredRule).toMatch(/\btranslate:\s*0 -50%;/);
  });
});
