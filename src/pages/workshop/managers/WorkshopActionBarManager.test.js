// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { describe, expect, it, vi } from 'vitest';

import { WorkshopActionBarManager } from './WorkshopActionBarManager.js';

function createGameplayFacadeFake(overrides = {}) {
  const listeners = new Set();
  const snapshot = {
    mana: {
      current: 10,
      cap: 150,
      perSecond: 3,
    },
    seedSummoning: {
      cost: 10,
      quantity: 1,
      canSummon: true,
    },
    tasks: {
      currentLevel: 3,
    },
    ...overrides,
  };

  return {
    getSnapshot: () => snapshot,
    publish: () => {
      for (const listener of listeners) {
        listener(snapshot);
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    summonSeed: () => ({ ok: true, seed: { label: 'sage seed' }, quantity: 1 }),
  };
}

function dispatchPointer(target, type, { pointerId = 1, pointerType = 'touch' } = {}) {
  const event = new window.MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
  });

  Object.defineProperty(event, 'pointerId', { value: pointerId });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  Object.defineProperty(event, 'isPrimary', { value: true });
  target.dispatchEvent(event);
  return event;
}

describe('WorkshopActionBarManager', () => {
  it('keeps the summon seed dot immediate in early levels', () => {
    const gameplayFacade = createGameplayFacadeFake({
      mana: { current: 10, cap: 100, perSecond: 2 },
      tasks: { currentLevel: 2 },
    });
    const manager = new WorkshopActionBarManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);

    const button = parent.querySelector('.workshop-page__summon-button');

    expect(button?.dataset.notification).toBe('true');
    expect(button?.dataset.notificationTone).toBe('red');

    manager.unmount();
  });

  it('shows the summon seed dot after early levels only when mana is capped', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new WorkshopActionBarManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);

    const button = parent.querySelector('.workshop-page__summon-button');

    expect(button?.dataset.notification).toBeUndefined();

    gameplayFacade.getSnapshot().mana.current = 150;
    gameplayFacade.publish();

    expect(button?.dataset.notification).toBe('true');
    expect(button?.dataset.notificationTone).toBe('orange');

    manager.unmount();
  });

  it('summons repeatedly while the summon button is held and stops on release', () => {
    vi.useFakeTimers();
    try {
      const gameplayFacade = createGameplayFacadeFake();
      const summons = [];
      gameplayFacade.summonSeed = () => {
        summons.push('summon');
        return { ok: true, seed: { label: 'sage seed' }, quantity: 1 };
      };
      const manager = new WorkshopActionBarManager({ gameplayFacade });
      const parent = document.createElement('div');

      manager.mount(parent);

      const button = parent.querySelector('.workshop-page__summon-button');
      dispatchPointer(button, 'pointerdown');

      expect(summons).toHaveLength(1);

      vi.advanceTimersByTime(540);

      expect(summons.length).toBeGreaterThan(1);

      dispatchPointer(document, 'pointerup');
      const summonsAfterRelease = summons.length;

      button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      vi.advanceTimersByTime(540);

      expect(summons).toHaveLength(summonsAfterRelease);

      manager.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('presses the summon circle without scaling the label sign', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const summonPressRule = baseCss.match(
      /\.style-button\.workshop-page__summon-button:active:not\(:disabled\)\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const circlePressRule = baseCss.match(
      /\.workshop-page__summon-circle\.is-pressing\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(summonPressRule).toBeDefined();
    expect(summonPressRule).toMatch(/\bbackground:\s*transparent;/);
    expect(summonPressRule).toMatch(/\bscale:\s*1;/);
    expect(summonPressRule).toMatch(/\btransform:\s*translate\(-50%, -50%\);/);
    expect(summonPressRule).not.toMatch(/scale\(var\(--style-press-scale\)\)/);
    expect(circlePressRule).toBeDefined();
    expect(circlePressRule).toMatch(
      /\btransform:\s*scale\(var\(--style-press-scale\)\);/,
    );
  });

  it('routes summon press feedback to the circle art instead of the label sign', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new WorkshopActionBarManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);

    expect(parent.querySelector('.workshop-page__summon-button')?.dataset.pressFeedbackTarget).toBe(
      '.workshop-page__summon-circle',
    );

    manager.unmount();
  });

  it('keeps normal click summon activation when no hold started', () => {
    const gameplayFacade = createGameplayFacadeFake();
    let summons = 0;
    gameplayFacade.summonSeed = () => {
      summons += 1;
      return { ok: true, seed: { label: 'sage seed' }, quantity: 1 };
    };
    const manager = new WorkshopActionBarManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);

    parent
      .querySelector('.workshop-page__summon-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(summons).toBe(1);

    manager.unmount();
  });

  it('reports mana spent after a successful summon', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const notices = [];
    const manager = new WorkshopActionBarManager({
      gameplayFacade,
      onSummonNotice: (message) => notices.push(message),
    });
    const parent = document.createElement('div');

    manager.mount(parent);

    parent
      .querySelector('.workshop-page__summon-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(notices).toEqual(['sage seed found', '-10 mana']);

    manager.unmount();
  });
});
