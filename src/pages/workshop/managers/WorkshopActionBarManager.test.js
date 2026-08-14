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

function dispatchPointer(target, type, { pointerId = 1, pointerType = 'touch', ...options } = {}) {
  const event = new window.MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...options,
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
    expect(textBoxBadgeRule).toMatch(/\btop:\s*calc\(-1 \* var\(--style-notification-offset\)\);/);
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

  it('summons on quick touch release when native click delivery is suppressed', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const hapticsFacade = { playUiTap: vi.fn() };
    const manager = new WorkshopActionBarManager({
      gameplayFacade,
      hapticsFacade,
    });
    const parent = document.createElement('div');
    const originalElementFromPoint = document.elementFromPoint;
    let summons = 0;
    gameplayFacade.summonSeed = () => {
      summons += 1;
      return { ok: true, seed: { label: 'sage seed' }, quantity: 1 };
    };

    try {
      manager.mount(parent);

      const button = parent.querySelector('.workshop-page__summon-button');
      document.elementFromPoint = () => button;

      dispatchPointer(button, 'pointerdown', { clientX: 120, clientY: 240 });
      dispatchPointer(document, 'pointerup', { clientX: 120, clientY: 240 });

      expect(summons).toBe(1);
      expect(hapticsFacade.playUiTap).toHaveBeenCalledTimes(1);

      button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(summons).toBe(1);
    } finally {
      document.elementFromPoint = originalElementFromPoint;
      manager.unmount();
    }
  });

  it('does not double summon when synthetic click already handled the active touch press', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new WorkshopActionBarManager({ gameplayFacade });
    const parent = document.createElement('div');
    const originalElementFromPoint = document.elementFromPoint;
    let summons = 0;
    gameplayFacade.summonSeed = () => {
      summons += 1;
      return { ok: true, seed: { label: 'sage seed' }, quantity: 1 };
    };

    try {
      manager.mount(parent);

      const button = parent.querySelector('.workshop-page__summon-button');
      document.elementFromPoint = () => button;

      dispatchPointer(button, 'pointerdown', { clientX: 120, clientY: 240 });
      button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      dispatchPointer(document, 'pointerup', { clientX: 120, clientY: 240 });

      expect(summons).toBe(1);
    } finally {
      document.elementFromPoint = originalElementFromPoint;
      manager.unmount();
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
      const manager = new WorkshopActionBarManager({
        gameplayFacade,
        hapticsFacade,
      });
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
    const manager = new WorkshopActionBarManager({
      gameplayFacade,
      hapticsFacade,
    });
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
    gameplayFacade.summonSeed = () => ({
      ok: false,
      reason: 'not_enough_mana',
    });
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
    const circleRule = baseCss.match(/(?:^|\n)\.workshop-page__summon-circle\s*\{(?<body>[^}]*)\}/)
      ?.groups?.body;
    const textRule = baseCss.match(
      /(?:^|\n)\.workshop-page__summon-button-text\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new WorkshopActionBarManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);

    const summonButton = parent.querySelector('.workshop-page__summon-button');
    const summonCircle = parent.querySelector('.workshop-page__summon-circle');

    expect(summonButton?.dataset.pressFeedbackTarget).toBeUndefined();
    expect(summonCircle?.getAttribute('aria-hidden')).toBe('true');
    expect(summonButtonRule).toMatch(
      /\btop:\s*calc\(\s*var\(--workshop-summon-anchor-top\) \+\s*var\(--workshop-summon-button-half-height\)\s*\);/,
    );
    expect(baseCss).toContain('--workshop-summon-chat-gap: 32px;');
    expect(summonButtonRule).toMatch(/\bwidth:\s*auto;/);
    expect(summonButtonRule).not.toMatch(/\bwidth:\s*196px;/);
    expect(actionBarButtonRule).toMatch(/\bwidth:\s*auto;/);
    expect(circleRule).toMatch(/\bposition:\s*absolute;/);
    expect(circleRule).toMatch(/\btop:\s*calc\(50% - 44px\);/);
    expect(circleRule).toMatch(/\bwidth:\s*196px;/);
    expect(circleRule).toMatch(/\bpointer-events:\s*none;/);
    expect(textRule).not.toMatch(/\btext-transform:\s*lowercase;/);
    expect(textRule).toMatch(/\btransform:\s*none;/);

    manager.unmount();
  });

  it('lifts the retained summon cost button within the summon cluster', () => {
    const pixiSource = readFileSync(
      `${cwd()}/src/rendering/pixi/pages/workshop/WorkshopPixiPage.js`,
      'utf8',
    );

    expect(pixiSource).toContain('const SUMMON_BUTTON_HEIGHT = 52;');
    expect(pixiSource).toContain('const SUMMON_BUTTON_UP_OFFSET = 4;');
    expect(pixiSource).toMatch(
      /this\.button\.setBounds\(\s*-SUMMON_BUTTON_WIDTH \/ 2,\s*-SUMMON_BUTTON_UP_OFFSET,/,
    );
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

  it('does not let tutorial state disable the summon button', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    expect(baseCss).not.toContain('data-tutorial-reveal');
    expect(baseCss).not.toContain('is-tutorial-summon-revealing');
  });

  it('keeps the approved Root Run side-action geometry and type treatment', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const rootRule = baseCss.match(/:root\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const labelRule = baseCss.match(/\.workshop-page__feature-character-label\s*\{(?<body>[^}]*)\}/)
      ?.groups?.body;
    const iconFrameRule = baseCss.match(
      /\.workshop-page__personal-tasks-icon-frame,\s*\.workshop-page__world-notice-icon-frame,\s*\.workshop-page__bag-button-icon-frame,\s*\.workshop-page__stats-button-icon-frame,[\s\S]*?\.workshop-page__trade-alliance-button-icon-frame\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(rootRule).toMatch(/--workshop-side-controls-top-offset:\s*71px;/);
    expect(rootRule).toMatch(/--workshop-panel-button-stage-edge:\s*10px;/);
    expect(rootRule).toMatch(/--workshop-panel-button-width:\s*50px;/);
    expect(rootRule).toMatch(/--workshop-panel-button-height:\s*60px;/);
    expect(rootRule).toMatch(/--workshop-panel-button-open-height:\s*60px;/);
    expect(rootRule).toMatch(/--workshop-panel-button-label-bottom:\s*3\.5px;/);
    expect(rootRule).toMatch(/--workshop-panel-button-label-line-height:\s*16\.5px;/);
    expect(rootRule).toMatch(/--workshop-panel-button-row-gap:\s*62px;/);
    expect(labelRule).toMatch(/\bwidth:\s*58px;/);
    expect(labelRule).toMatch(/\bfont-size:\s*13\.5px;/);
    expect(labelRule).toMatch(/\bline-height:\s*var\(--workshop-panel-button-label-line-height\);/);
    expect(labelRule).toContain(
      '-webkit-text-stroke: var(--style-text-stroke-width)',
    );
    expect(labelRule).toMatch(/\btext-align:\s*center;/);
    expect(iconFrameRule).toMatch(/\btop:\s*0;/);
    expect(iconFrameRule).toMatch(/\bwidth:\s*50px;/);
    expect(iconFrameRule).toMatch(/\bheight:\s*50px;/);
    expect(baseCss).toMatch(
      /\.workshop-page__trade-alliance-button-icon\s*\{[\s\S]*?\bscale:\s*0\.72;/,
    );
    expect(baseCss).toMatch(
      /\.workshop-page__panel-button\[data-panel-side="left"\][\s\S]*?\.workshop-page__trade-alliance-button-icon-frame\s*\{\s*left:\s*-2px;/,
    );
    expect(baseCss).toMatch(
      /\.workshop-page__panel-button\[data-panel-side="right"\][\s\S]*?\.workshop-page__trade-alliance-button-icon-frame\s*\{\s*right:\s*-2px;/,
    );
    expect(baseCss).toContain('.workshop-page__ui-layer > .workshop-page__stats');
    expect(baseCss).not.toContain(
      '.workshop-page__action-bar > .style-button.workshop-page__stats-button',
    );
  });

  it('opens Bag and Stats from matching side-panel actions', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const onBagClick = vi.fn();
    const onStatsClick = vi.fn();
    const manager = new WorkshopActionBarManager({
      gameplayFacade,
      onBagClick,
      onStatsClick,
    });
    const parent = document.createElement('div');

    manager.mount(parent);

    const statsPanel = parent.querySelector('.workshop-page__stats');
    const button = parent.querySelector('.workshop-page__stats-button');
    const statsIcon = parent.querySelector('.workshop-page__stats-button-icon');
    const bagPanel = parent.querySelector('.workshop-page__bag');
    const bagButton = parent.querySelector('.workshop-page__bag-button');
    const bagIcon = parent.querySelector('.workshop-page__bag-button-icon');
    const bagLabel = parent.querySelector('.workshop-page__bag-button-label');

    expect(button?.textContent).toBe('Stats');
    expect(button?.getAttribute('aria-label')).toBe('open stats');
    expect(statsPanel?.classList.contains('workshop-page__panel-button')).toBe(true);
    expect(statsPanel?.dataset.panelSide).toBe('right');
    expect(statsPanel?.contains(button)).toBe(true);
    expect(button?.classList.contains('workshop-page__panel-button-open')).toBe(true);
    expect(statsIcon?.getAttribute('src')).toContain('icon-side-stats-root-run.png');
    expect(bagPanel?.classList.contains('workshop-page__panel-button')).toBe(true);
    expect(bagPanel?.dataset.panelSide).toBe('left');
    expect(bagPanel?.contains(bagButton)).toBe(true);
    expect(bagButton?.classList.contains('style-button')).toBe(false);
    expect(bagButton?.classList.contains('workshop-page__panel-button-open')).toBe(true);
    expect(bagButton?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(bagButton?.getAttribute('aria-label')).toBe('open bag');
    expect(bagIcon?.tagName).toBe('IMG');
    expect(bagIcon?.getAttribute('src')).toContain('icon-side-bag-root-run.png');
    expect(bagIcon?.getAttribute('aria-hidden')).toBe('true');
    expect(bagLabel?.textContent).toBe('Bag');

    bagButton?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onBagClick).toHaveBeenCalledTimes(1);
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
    expect(mailButton?.classList.contains('workshop-page__panel-button-open')).toBe(true);
    expect(mailIcon?.tagName).toBe('IMG');
    expect(mailIcon?.getAttribute('src')).toContain('icon-side-inbox-root-run.png');
    expect(mailIcon?.getAttribute('aria-hidden')).toBe('true');
    expect(mailLabel?.textContent).toBe('Inbox');
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

  it('opens summon drop chances from the shared info icon without summoning', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const onSummonInfoClick = vi.fn();
    let summons = 0;
    gameplayFacade.summonSeed = () => {
      summons += 1;
      return { ok: true, seed: { label: 'sage seed' }, quantity: 1 };
    };
    const manager = new WorkshopActionBarManager({
      gameplayFacade,
      onSummonInfoClick,
    });
    const parent = document.createElement('div');

    manager.mount(parent);

    const button = parent.querySelector('.workshop-page__summon-info-button');
    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(button.textContent).toBe('');
    expect(button.querySelector('.style-info-button__icon')).not.toBeNull();
    expect(button.getAttribute('aria-label')).toBe('show seed drop chances');
    expect(onSummonInfoClick).toHaveBeenCalledTimes(1);
    expect(summons).toBe(0);

    manager.unmount();
  });

  it('reports only the summoned reward after a successful summon', () => {
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

    expect(notices).toEqual(['sage seed found']);

    manager.unmount();
  });

  it('leaves successful summon feedback to reward events when they are available', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const notices = [];
    const manager = new WorkshopActionBarManager({
      gameplayFacade,
      onSummonNotice: (message) => notices.push(message),
      rewardEventsAvailable: true,
    });
    const parent = document.createElement('div');

    manager.mount(parent);

    parent
      .querySelector('.workshop-page__summon-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(notices).toEqual([]);

    manager.unmount();
  });
});
