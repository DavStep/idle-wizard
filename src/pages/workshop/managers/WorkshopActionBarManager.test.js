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

function createPlayerInboxFacadeFake(overrides = {}) {
  const listeners = new Set();
  const snapshot = {
    unreadCount: 0,
    claimableCount: 0,
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

      expect(summons).toHaveLength(0);

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

      expect(summons).toBe(0);
      expect(hapticsFacade.playUiTap).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(summons).toBe(1);
      expect(hapticsFacade.playUiTap).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(200);

      expect(summons).toBe(3);
      expect(hapticsFacade.playUiTap).toHaveBeenCalledTimes(3);

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

  it('plays a short summon circle effect after a successful summon', () => {
    vi.useFakeTimers();
    try {
      const gameplayFacade = createGameplayFacadeFake();
      const manager = new WorkshopActionBarManager({ gameplayFacade });
      const parent = document.createElement('div');

      manager.mount(parent);

      const button = parent.querySelector('.workshop-page__summon-button');
      button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(button.classList.contains('is-summoning')).toBe(true);

      vi.advanceTimersByTime(519);

      expect(button.classList.contains('is-summoning')).toBe(true);

      vi.advanceTimersByTime(1);

      expect(button.classList.contains('is-summoning')).toBe(false);

      manager.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not play the summon circle effect when summoning fails', () => {
    const gameplayFacade = createGameplayFacadeFake();
    gameplayFacade.summonSeed = () => ({ ok: false, reason: 'not_enough_mana' });
    const manager = new WorkshopActionBarManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);

    const button = parent.querySelector('.workshop-page__summon-button');
    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(button.classList.contains('is-summoning')).toBe(false);

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

  it('keeps the summon effect on the circle art and disables it for reduced motion', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const summonEffectRule = baseCss.match(
      /\.style-button\.workshop-page__summon-button\.is-summoning\s+\.workshop-page__summon-circle\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(summonEffectRule).toMatch(
      /\banimation:\s*workshop-summon-circle-glow 520ms var\(--style-motion-ease-soft\)\s*both;/,
    );
    expect(baseCss).toContain('@keyframes workshop-summon-circle-glow');
    expect(baseCss).toContain('transform: translate(-50%, -50%) scale(1.045);');
    expect(baseCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.style-button\.workshop-page__summon-button\.is-summoning[\s\S]*animation:\s*none;/,
    );
  });

  it('places the secondary action buttons near chat with matching widths', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const rootRule = baseCss.match(/:root\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const bagRule = baseCss.match(
      /\.workshop-page__action-bar > \.style-button\.workshop-page__bag-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const mailRule = baseCss.match(
      /\.workshop-page__action-bar > \.style-button\.workshop-page__mail-button\s*\{(?<body>[^}]*)\}/,
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

    expect(rootRule).toMatch(/--workshop-secondary-button-width:\s*100px;/);
    expect(rootRule).toMatch(/--workshop-secondary-button-half-width:\s*50px;/);

    expect(bagRule).toBeDefined();
    expect(bagRule).toMatch(
      /\btop:\s*calc\(\s*var\(--style-room-content-top\) \+\s*var\(--workshop-secondary-button-top-offset\) \+\s*var\(--workshop-secondary-button-row-gap\)\s*\);/,
    );
    expect(bagRule).toMatch(/\bleft:\s*0;/);
    expect(bagRule).toMatch(/\bbox-sizing:\s*content-box;/);
    expect(bagRule).toMatch(
      /\bwidth:\s*var\(--workshop-secondary-button-width\);/,
    );
    expect(bagRule).not.toMatch(/\bbottom:/);

    expect(mailRule).toBeDefined();
    expect(mailRule).toMatch(
      /\btop:\s*calc\(\s*var\(--style-room-content-top\) \+\s*var\(--workshop-secondary-button-top-offset\)\s*\);/,
    );
    expect(mailRule).toMatch(
      /\bleft:\s*calc\(50% - var\(--workshop-secondary-button-half-width\)\);/,
    );
    expect(mailRule).toMatch(/\bwidth:\s*var\(--workshop-secondary-button-width\);/);

    expect(leaderboardRule).toMatch(
      /\btop:\s*calc\(\s*var\(--style-room-content-top\) \+\s*var\(--workshop-secondary-button-top-offset\)\s*\);/,
    );
    expect(allianceRule).toMatch(
      /\btop:\s*calc\(\s*var\(--style-room-content-top\) \+\s*var\(--workshop-secondary-button-top-offset\)\s*\);/,
    );
    expect(discoveriesRule).toMatch(
      /\btop:\s*calc\(\s*var\(--style-room-content-top\) \+\s*var\(--workshop-secondary-button-top-offset\) \+\s*var\(--workshop-secondary-button-row-gap\)\s*\);/,
    );
    expect(leaderboardRule).toMatch(
      /\bwidth:\s*var\(--workshop-secondary-button-width\);/,
    );
    expect(allianceRule).toMatch(
      /\bwidth:\s*var\(--workshop-secondary-button-width\);/,
    );
    expect(discoveriesRule).toMatch(
      /\bwidth:\s*var\(--workshop-secondary-button-width\);/,
    );
  });

  it('opens the moved mail button from the Workshop action cluster', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const playerInboxFacade = createPlayerInboxFacadeFake({
      unreadCount: 1,
      claimableCount: 0,
    });
    const onMailClick = vi.fn();
    const manager = new WorkshopActionBarManager({
      gameplayFacade,
      playerInboxFacade,
      onMailClick,
    });
    const parent = document.createElement('div');

    manager.mount(parent);

    const mailButton = parent.querySelector('.workshop-page__mail-button');

    expect(mailButton?.textContent).toBe('mail');
    expect(mailButton?.dataset.notification).toBe('true');
    expect(mailButton?.getAttribute('aria-label')).toBe('open inbox, new mail');

    mailButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onMailClick).toHaveBeenCalledTimes(1);

    playerInboxFacade.getSnapshot().unreadCount = 0;
    playerInboxFacade.publish();

    expect(mailButton?.dataset.notification).toBeUndefined();
    expect(mailButton?.getAttribute('aria-label')).toBe('open inbox');

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
