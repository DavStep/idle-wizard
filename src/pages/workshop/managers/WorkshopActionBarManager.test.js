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
      /(?:^|\n)\.workshop-page__summon-circle\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const textRule = baseCss.match(
      /(?:^|\n)\.workshop-page__summon-button-text\s*\{(?<body>[^}]*)\}/,
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

  it('animates the first tutorial summon reveal without changing the hit box', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const summonRevealRule = baseCss.match(
      /\.game-stage\.is-tutorial-summon-revealing\[data-tutorial-reveal~="summon"\]\s+\.workshop-page__action-bar\s+>\s+\.workshop-page__summon-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const signRevealRule = baseCss.match(
      /\.game-stage\.is-tutorial-summon-revealing\[data-tutorial-reveal~="summon"\]\s+\.workshop-page__summon-button\s+\.workshop-page__summon-circle\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const textRevealRule = baseCss.match(
      /\.game-stage\.is-tutorial-summon-revealing\[data-tutorial-reveal~="summon"\]\s+\.workshop-page__summon-button\s+\.workshop-page__summon-button-text\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(summonRevealRule).toMatch(
      /\banimation:\s*workshop-summon-button-reveal 640ms\s+var\(--style-motion-ease-rubber\)\s+both;/,
    );
    expect(summonRevealRule).not.toMatch(/\bwidth:/);
    expect(signRevealRule).toMatch(
      /\banimation:\s*workshop-summon-sign-reveal 640ms\s+var\(--style-motion-ease-rubber\)\s+both;/,
    );
    expect(textRevealRule).toMatch(
      /\banimation:\s*workshop-summon-button-text-reveal 520ms\s+var\(--style-motion-ease-rubber\)\s+80ms both;/,
    );
    expect(baseCss).toContain('@keyframes workshop-summon-button-reveal');
    expect(baseCss).toContain('@keyframes workshop-summon-sign-reveal');
    expect(baseCss).toContain('@keyframes workshop-summon-button-text-reveal');
    expect(baseCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.game-stage\.is-tutorial-summon-revealing\[data-tutorial-reveal~="summon"\][\s\S]*\.workshop-page__summon-button-text[\s\S]*animation:\s*none;/,
    );
  });

  it('places the secondary actions and compact panel openers near chat', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const rootRule = baseCss.match(/:root\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const bagRule = baseCss.match(
      /\.workshop-page__action-bar > \.style-button\.workshop-page__bag-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const statsRule = baseCss.match(
      /\.workshop-page__action-bar > \.style-button\.workshop-page__stats-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const mailRootRule = baseCss.match(
      /\.workshop-page__ui-layer > \.workshop-page__mail\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const sidePanelRootRule = baseCss.match(
      /\.workshop-page__ui-layer > \.workshop-page__mail,\s*\.workshop-page__ui-layer > \.workshop-page__leaderboard,\s*\.workshop-page__ui-layer > \.workshop-page__discoveries,\s*\.workshop-page__ui-layer > \.workshop-page__trade-alliance\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const leaderboardSideRule = baseCss.match(
      /\.workshop-page__ui-layer > \.workshop-page__leaderboard\s*\{(?<body>[^}]*\bleft:[^}]*)\}/,
    )?.groups?.body;
    const discoveriesSideRule = baseCss.match(
      /\.workshop-page__ui-layer > \.workshop-page__discoveries\s*\{(?<body>[^}]*\bright:[^}]*)\}/,
    )?.groups?.body;
    const sidePanelButtonRule = baseCss.match(
      /\.workshop-page__mail > \.workshop-page__mail-button,\s*\.workshop-page__leaderboard > \.workshop-page__leaderboard-button,\s*\.workshop-page__discoveries > \.workshop-page__discoveries-button,\s*\.workshop-page__trade-alliance > \.workshop-page__trade-alliance-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const leftPanelButtonAlignRule = baseCss.match(
      /\.workshop-page__panel-button\[data-panel-side="left"\]\s*>\s*\.workshop-page__panel-button-open\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const rightPanelButtonAlignRule = baseCss.match(
      /\.workshop-page__panel-button\[data-panel-side="right"\]\s*>\s*\.workshop-page__panel-button-open\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const timedPanelButtonAlignRule = baseCss.match(
      /\.workshop-page__panel-button\.has-timer\s*>\s*\.workshop-page__panel-button-open\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const featureCharacterRule = baseCss.match(
      /\.workshop-page__feature-character\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const leftPanelIconOffsetRule = baseCss.match(
      /\.workshop-page__panel-button\[data-panel-side="left"\]\s+\.workshop-page__feature-character,\s*\.workshop-page__panel-button\[data-panel-side="left"\]\s+\.workshop-page__mail-button-icon-frame,\s*\.workshop-page__panel-button\[data-panel-side="left"\]\s+\.workshop-page__leaderboard-button-icon-frame,\s*\.workshop-page__panel-button\[data-panel-side="left"\]\s+\.workshop-page__discoveries-button-icon-frame,\s*\.workshop-page__panel-button\[data-panel-side="left"\]\s+\.workshop-page__trade-alliance-button-icon-frame\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const rightPanelIconOffsetRule = baseCss.match(
      /\.workshop-page__panel-button\[data-panel-side="right"\]\s+\.workshop-page__feature-character,\s*\.workshop-page__panel-button\[data-panel-side="right"\]\s+\.workshop-page__mail-button-icon-frame,\s*\.workshop-page__panel-button\[data-panel-side="right"\]\s+\.workshop-page__leaderboard-button-icon-frame,\s*\.workshop-page__panel-button\[data-panel-side="right"\]\s+\.workshop-page__discoveries-button-icon-frame,\s*\.workshop-page__panel-button\[data-panel-side="right"\]\s+\.workshop-page__trade-alliance-button-icon-frame\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const featureCharacterLabelRule = baseCss.match(
      /\.workshop-page__feature-character-label\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const rightFeatureCharacterLabelRule = baseCss.match(
      /\.workshop-page__panel-button\[data-panel-side="right"\]\s+\.workshop-page__feature-character-label\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const sidePanelLabelRule = baseCss.match(
      /\.workshop-page__mail-button-label,\s*\.workshop-page__leaderboard-button-label,\s*\.workshop-page__discoveries-button-label,\s*\.workshop-page__trade-alliance-button-label\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const sidePanelIconFrameRule = baseCss.match(
      /\.workshop-page__mail-button-icon-frame,\s*\.workshop-page__leaderboard-button-icon-frame,\s*\.workshop-page__discoveries-button-icon-frame,\s*\.workshop-page__trade-alliance-button-icon-frame\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const allianceRule = baseCss.match(
      /\.workshop-page__ui-layer > \.workshop-page__trade-alliance\s*\{(?<body>[^}]*\btop:[^}]*)\}/,
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

    expect(statsRule).toBeDefined();
    expect(statsRule).toMatch(
      /\btop:\s*calc\(\s*var\(--style-room-content-top\) \+\s*var\(--workshop-secondary-button-top-offset\) \+\s*var\(--workshop-secondary-button-row-gap\)\s*\);/,
    );
    expect(statsRule).toMatch(/\bright:\s*0;/);
    expect(statsRule).toMatch(/\bbox-sizing:\s*content-box;/);
    expect(statsRule).toMatch(
      /\bwidth:\s*var\(--workshop-secondary-button-width\);/,
    );
    expect(statsRule).not.toMatch(/\bbottom:/);

    expect(mailRootRule).toBeDefined();
    expect(mailRootRule).toMatch(
      /\btop:\s*calc\(var\(--style-room-content-top\) \+\s*155\.5px\);/,
    );
    expect(mailRootRule).toMatch(/\bright:\s*var\(--style-room-chrome-edge\);/);

    expect(sidePanelRootRule).toBeDefined();
    expect(baseCss).toMatch(
      /\.workshop-page__ui-layer > \.workshop-page__leaderboard,\s*\.workshop-page__ui-layer > \.workshop-page__discoveries\s*\{\s*top:\s*calc\(var\(--style-room-content-top\) \+\s*207\.75px\);/,
    );
    expect(sidePanelRootRule).toMatch(/\bwidth:\s*45\.5px;/);
    expect(sidePanelRootRule).toMatch(/\bheight:\s*80\.25px;/);
    expect(leaderboardSideRule).toMatch(
      /\bleft:\s*var\(--style-room-chrome-edge\);/,
    );
    expect(discoveriesSideRule).toMatch(
      /\bright:\s*var\(--style-room-chrome-edge\);/,
    );
    expect(sidePanelButtonRule).toMatch(/\boverflow:\s*visible;/);
    expect(leftPanelButtonAlignRule).toMatch(/\bjustify-items:\s*start;/);
    expect(leftPanelButtonAlignRule).toMatch(/\btext-align:\s*left;/);
    expect(rightPanelButtonAlignRule).toMatch(/\bjustify-items:\s*end;/);
    expect(rightPanelButtonAlignRule).toMatch(/\btext-align:\s*right;/);
    expect(timedPanelButtonAlignRule).toMatch(/\bbottom:\s*0;/);
    expect(featureCharacterRule).toMatch(/\bposition:\s*relative;/);
    expect(featureCharacterRule).toMatch(/\btop:\s*10px;/);
    expect(sidePanelIconFrameRule).toMatch(/\btop:\s*10px;/);
    expect(leftPanelIconOffsetRule).toMatch(/\bleft:\s*-10px;/);
    expect(rightPanelIconOffsetRule).toMatch(/\bright:\s*-10px;/);
    expect(featureCharacterLabelRule).toMatch(/\bleft:\s*0;/);
    expect(featureCharacterLabelRule).toContain(
      'font-size: calc(var(--style-box-border-label-font-size) * 0.8);',
    );
    expect(featureCharacterLabelRule).toContain(
      'line-height: calc(var(--style-box-border-label-line-height) * 0.8);',
    );
    expect(featureCharacterLabelRule).toMatch(/\bbackground:\s*transparent;/);
    expect(featureCharacterLabelRule).toMatch(/\bborder:\s*0;/);
    expect(featureCharacterLabelRule).toContain(
      '-webkit-text-stroke: var(--style-page-tab-label-text-stroke-width)',
    );
    expect(featureCharacterLabelRule).toContain(
      'var(--style-page-tab-label-text-stroke-color);',
    );
    expect(featureCharacterLabelRule).toMatch(/\bpaint-order:\s*stroke fill;/);
    expect(featureCharacterLabelRule).toMatch(
      /\btext-shadow:\s*var\(--style-page-tab-label-text-stroke-shadow\);/,
    );
    expect(rightFeatureCharacterLabelRule).toMatch(/\bright:\s*0;/);
    expect(rightFeatureCharacterLabelRule).toMatch(/\bleft:\s*auto;/);
    expect(rightFeatureCharacterLabelRule).toMatch(/\btext-align:\s*right;/);
    expect(sidePanelLabelRule).toContain(
      'font-size: calc(var(--style-box-border-label-font-size) * 0.8);',
    );
    expect(sidePanelLabelRule).toContain(
      'line-height: calc(var(--style-box-border-label-line-height) * 0.8);',
    );
    expect(sidePanelLabelRule).toMatch(/\btransform:\s*none;/);

    expect(allianceRule).toMatch(
      /\btop:\s*calc\(var\(--style-room-content-top\) \+\s*155\.5px\);/,
    );
    expect(allianceRule).toMatch(/\bleft:\s*var\(--style-room-chrome-edge\);/);
  });

  it('opens the stats button from the Workshop action cluster', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const onStatsClick = vi.fn();
    const manager = new WorkshopActionBarManager({
      gameplayFacade,
      onStatsClick,
    });
    const parent = document.createElement('div');

    manager.mount(parent);

    const button = parent.querySelector('.workshop-page__stats-button');

    expect(button?.textContent).toBe('stats');
    expect(button?.getAttribute('aria-label')).toBe('open stats');
    expect(button?.querySelector('img, svg')).toBeNull();

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onStatsClick).toHaveBeenCalledTimes(1);

    manager.unmount();
  });

  it('opens the inbox as a compact right-panel button', () => {
    const gameplayFacade = createGameplayFacadeFake({
      tasks: { currentLevel: 4 },
    });
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
    const mailPanel = parent.querySelector('.workshop-page__mail');
    const mailIcon = parent.querySelector('.workshop-page__mail-button-icon');
    const mailLabel = parent.querySelector('.workshop-page__mail-button-label');

    expect(mailPanel?.classList.contains('workshop-page__panel-button')).toBe(true);
    expect(mailPanel?.dataset.panelSide).toBe('right');
    expect(mailPanel?.contains(mailButton)).toBe(true);
    expect(mailButton?.classList.contains('style-button')).toBe(false);
    expect(mailButton?.classList.contains('workshop-page__panel-button-open')).toBe(
      true,
    );
    expect(mailIcon?.tagName).toBe('IMG');
    expect(mailIcon?.getAttribute('src')).toContain('icon-mail-envelope.webp');
    expect(mailIcon?.getAttribute('aria-hidden')).toBe('true');
    expect(mailLabel?.textContent).toBe('inbox');
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

  it('locks the inbox panel until level four', () => {
    const gameplayFacade = createGameplayFacadeFake({
      tasks: { currentLevel: 3 },
    });
    const onMailClick = vi.fn();
    const manager = new WorkshopActionBarManager({
      gameplayFacade,
      playerInboxFacade: createPlayerInboxFacadeFake({ unreadCount: 1 }),
      onMailClick,
    });
    const parent = document.createElement('div');

    manager.mount(parent);

    const mailButton = parent.querySelector('.workshop-page__mail-button');
    const mailPanel = parent.querySelector('.workshop-page__mail');

    expect(mailPanel?.hidden).toBe(true);
    expect(mailPanel?.getAttribute('aria-hidden')).toBe('true');
    expect(mailButton?.disabled).toBe(true);
    expect(mailButton?.getAttribute('aria-disabled')).toBe('true');

    mailButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onMailClick).not.toHaveBeenCalled();

    gameplayFacade.getSnapshot().tasks.currentLevel = 4;
    gameplayFacade.publish();

    expect(mailPanel?.hidden).toBe(false);
    expect(mailPanel?.getAttribute('aria-hidden')).toBe('false');
    expect(mailButton?.disabled).toBe(false);
    expect(mailButton?.getAttribute('aria-disabled')).toBe('false');

    mailButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onMailClick).toHaveBeenCalledTimes(1);

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
