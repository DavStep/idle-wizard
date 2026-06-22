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

  it('pins the summon seed notification dot to the summon text box corner', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const outerBadgeRule = baseCss.match(
      /\.style-button\.workshop-page__summon-button\[data-notification="true"\]::before\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const textBoxBadgeRule = baseCss.match(
      /\.style-button\.workshop-page__summon-button\[data-notification="true"\]\s+\.workshop-page__summon-button-text::after\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(outerBadgeRule).toMatch(/\bdisplay:\s*none;/);
    expect(textBoxBadgeRule).toMatch(/\bposition:\s*absolute;/);
    expect(textBoxBadgeRule).toMatch(
      /\btop:\s*calc\(-1 \* var\(--style-notification-offset\)\);/,
    );
    expect(textBoxBadgeRule).toMatch(
      /\bright:\s*calc\(-1 \* var\(--style-notification-offset\)\);/,
    );
    expect(baseCss).not.toMatch(
      /\.style-button\.workshop-page__summon-button\[data-notification="true"\]\s+\.workshop-page__summon-button-label::after/,
    );
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

  it('plays haptics for each successful touch summon during a held summon press', () => {
    vi.useFakeTimers();
    try {
      const gameplayFacade = createGameplayFacadeFake();
      const hapticsFacade = { playUiTap: vi.fn() };
      let summons = 0;
      gameplayFacade.summonSeed = () => {
        summons += 1;
        return { ok: true, seed: { label: 'sage seed' }, quantity: 1 };
      };
      const manager = new WorkshopActionBarManager({ gameplayFacade, hapticsFacade });
      const parent = document.createElement('div');

      manager.mount(parent);

      const button = parent.querySelector('.workshop-page__summon-button');
      dispatchPointer(button, 'pointerdown', { pointerType: 'touch' });

      expect(summons).toBe(1);
      expect(hapticsFacade.playUiTap).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(330);

      expect(summons).toBe(4);
      expect(hapticsFacade.playUiTap).toHaveBeenCalledTimes(4);

      dispatchPointer(document, 'pointerup');

      manager.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not play summon haptics for non-touch summon clicks', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const hapticsFacade = { playUiTap: vi.fn() };
    let summons = 0;
    gameplayFacade.summonSeed = () => {
      summons += 1;
      return { ok: true, seed: { label: 'sage seed' }, quantity: 1 };
    };
    const manager = new WorkshopActionBarManager({ gameplayFacade, hapticsFacade });
    const parent = document.createElement('div');

    manager.mount(parent);

    parent
      .querySelector('.workshop-page__summon-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(summons).toBe(1);
    expect(hapticsFacade.playUiTap).not.toHaveBeenCalled();

    manager.unmount();
  });

  it('presses the summon seed label without moving the icon', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const genericPressRule = baseCss.match(
      /\.style-button:is\(:active, \.is-pressing\):not\(:disabled\):not\(\s*\[aria-disabled="true"\]\s*\):not\(\.is-disabled\)\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const summonPressRule = baseCss.match(
      /\.style-button\.workshop-page__summon-button:is\(:active, \.is-pressing\):not\(\s*:disabled\s*\):not\(\[aria-disabled="true"\]\)\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const labelPressRule =
      baseCss.match(
        /\.style-button\.workshop-page__summon-button:is\(:active, \.is-pressing\):not\(\s*:disabled\s*\):not\(\[aria-disabled="true"\]\)\s+\.workshop-page__summon-button-text\s*\{(?<body>[^}]*)\}/,
      )?.groups?.body ?? '';
    const circlePressRule = baseCss.match(
      /\.style-button\.workshop-page__summon-button:is\(:active, \.is-pressing\):not\(\s*:disabled\s*\):not\(\[aria-disabled="true"\]\)\s+\.workshop-page__summon-circle\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(genericPressRule).toBeDefined();
    expect(genericPressRule).toMatch(/\bbackground:\s*var\(--style-active-surface\);/);
    expect(summonPressRule).toBeDefined();
    expect(summonPressRule).toMatch(/\bbackground:\s*transparent;/);
    expect(summonPressRule).toMatch(/\bscale:\s*1;/);
    expect(summonPressRule).toMatch(/\btransform:\s*translate\(-50%, -50%\);/);
    expect(summonPressRule).not.toMatch(/scale\(var\(--style-press-scale\)\)/);
    expect(labelPressRule).toMatch(/\bbackground:\s*var\(--style-active-surface\);/);
    expect(labelPressRule).toMatch(/\bscale:\s*var\(--style-press-scale\);/);
    expect(circlePressRule).toBeDefined();
    expect(circlePressRule).not.toMatch(/scale\(var\(--style-press-scale\)\)/);
  });

  it('keeps the summon sign outside the real button hit box', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const summonButtonRule = baseCss.match(
      /\.style-button\.workshop-page__summon-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const actionBarButtonRule = baseCss.match(
      /\.workshop-page__action-bar \.style-button\.workshop-page__summon-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const circleRule = baseCss.match(
      /\.workshop-page__summon-circle\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const textRule = baseCss.match(
      /\.workshop-page__summon-button-text\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new WorkshopActionBarManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);

    const summonButton = parent.querySelector('.workshop-page__summon-button');
    const summonCircle = parent.querySelector('.workshop-page__summon-circle');

    expect(
      summonButton?.dataset.pressFeedbackTarget,
    ).toBeUndefined();
    expect(summonCircle?.getAttribute('aria-hidden')).toBe('true');
    expect(summonButtonRule).toMatch(/\btop:\s*59\.5%;/);
    expect(summonButtonRule).toMatch(/\bwidth:\s*auto;/);
    expect(summonButtonRule).not.toMatch(/\bwidth:\s*196px;/);
    expect(actionBarButtonRule).toMatch(/\bwidth:\s*auto;/);
    expect(circleRule).toMatch(/\bposition:\s*absolute;/);
    expect(circleRule).toMatch(/\bwidth:\s*196px;/);
    expect(circleRule).toMatch(/\bpointer-events:\s*none;/);
    expect(textRule).toMatch(/\btransform:\s*none;/);

    manager.unmount();
  });

  it('places the secondary action buttons near chat with matching widths', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const bagRule = baseCss.match(
      /\.workshop-page__action-bar > \.style-button\.workshop-page__bag-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const leaderboardRule = baseCss.match(
      /\.style-button\.workshop-page__leaderboard-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const allianceRule = baseCss.match(
      /\.style-button\.workshop-page__trade-alliance-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const discoveriesRule = baseCss.match(
      /\.style-button\.workshop-page__discoveries-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(bagRule).toBeDefined();
    expect(bagRule).toMatch(
      /\btop:\s*calc\(\s*var\(--style-room-content-top\) \+\s*var\(--workshop-secondary-button-top-offset\) \+\s*var\(--workshop-secondary-button-row-gap\)\s*\);/,
    );
    expect(bagRule).toMatch(/\bleft:\s*0;/);
    expect(bagRule).toMatch(/\bbox-sizing:\s*content-box;/);
    expect(bagRule).toMatch(/\bwidth:\s*132px;/);
    expect(bagRule).not.toMatch(/\bbottom:/);

    expect(leaderboardRule).toMatch(
      /\btop:\s*calc\(\s*var\(--style-room-content-top\) \+\s*var\(--workshop-secondary-button-top-offset\)\s*\);/,
    );
    expect(allianceRule).toMatch(
      /\btop:\s*calc\(\s*var\(--style-room-content-top\) \+\s*var\(--workshop-secondary-button-top-offset\)\s*\);/,
    );
    expect(discoveriesRule).toMatch(
      /\btop:\s*calc\(\s*var\(--style-room-content-top\) \+\s*var\(--workshop-secondary-button-top-offset\) \+\s*var\(--workshop-secondary-button-row-gap\)\s*\);/,
    );
    expect(leaderboardRule).toMatch(/\bwidth:\s*132px;/);
    expect(allianceRule).toMatch(/\bwidth:\s*132px;/);
    expect(discoveriesRule).toMatch(/\bwidth:\s*132px;/);
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

  it('opens summon drop chances from the sign question mark without summoning', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const onSummonInfoClick = vi.fn();
    let summons = 0;
    gameplayFacade.summonSeed = () => {
      summons += 1;
      return { ok: true, seed: { label: 'sage seed' }, quantity: 1 };
    };
    const manager = new WorkshopActionBarManager({ gameplayFacade, onSummonInfoClick });
    const parent = document.createElement('div');

    manager.mount(parent);

    const button = parent.querySelector('.workshop-page__summon-info-button');
    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(button.textContent).toBe('?');
    expect(button.getAttribute('aria-label')).toBe('show seed drop chances');
    expect(onSummonInfoClick).toHaveBeenCalledTimes(1);
    expect(summons).toBe(0);

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

  it('groups successful summon flyouts when a list callback is available', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const notices = [];
    const noticeLists = [];
    const manager = new WorkshopActionBarManager({
      gameplayFacade,
      onSummonNotice: (message) => notices.push(message),
      onSummonNoticeList: (messages) => noticeLists.push(messages),
    });
    const parent = document.createElement('div');

    manager.mount(parent);

    parent
      .querySelector('.workshop-page__summon-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(notices).toEqual([]);
    expect(noticeLists).toEqual([
      [
        { message: 'sage seed found' },
        { message: '-10 mana', flyoutKey: 'workshop-mana-spend' },
      ],
    ]);

    manager.unmount();
  });
});
