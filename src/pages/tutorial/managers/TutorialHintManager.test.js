/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import { TutorialHintManager } from './TutorialHintManager.js';

const UI_SCALE = 3;
const HINT_PADDED_WIDTH = 160;
const HINT_HEIGHT = 56;

function setClientRect(element, rect) {
  element.getBoundingClientRect = () => ({
    x: rect.left,
    y: rect.top,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    ...rect,
  });
}

function toClientRect(rect) {
  return {
    left: rect.left * UI_SCALE,
    top: rect.top * UI_SCALE,
    width: rect.width * UI_SCALE,
    height: rect.height * UI_SCALE,
  };
}

function getGuideRect(hint) {
  const left = Number.parseFloat(hint.style.left);
  const top = Number.parseFloat(hint.style.top);

  return {
    left,
    top,
    right: left + HINT_PADDED_WIDTH,
    bottom: top + HINT_HEIGHT,
  };
}

function getObjectiveRect(objective) {
  const left = Number.parseFloat(objective.style.left);
  const top = Number.parseFloat(objective.style.top);

  return {
    left,
    top,
    right: left + HINT_PADDED_WIDTH,
    bottom: top + HINT_HEIGHT,
  };
}

function getObjectiveButtonRect(button) {
  const left = Number.parseFloat(button.style.left);
  const top = Number.parseFloat(button.style.top);

  return {
    left,
    top,
    right: left + 112,
    bottom: top + 142,
  };
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

describe('TutorialHintManager', () => {
  it('moves the guide box off the target when default placement would cover it', () => {
    const stage = document.createElement('section');
    const target = document.createElement('button');
    const manager = new TutorialHintManager();
    const targetRect = {
      left: 16,
      top: 316,
      width: 328,
      height: 30,
    };

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(target, toClientRect(targetRect));
    stage.append(target);
    document.body.append(stage);

    manager.mount(stage);
    manager.show({
      target,
      text: 'level up',
      stepLabel: '16/19',
    });

    const hint = stage.querySelector('.tutorial-layer__hint');
    const guideRect = getGuideRect(hint);
    const sourceTargetRect = {
      left: targetRect.left,
      top: targetRect.top,
      right: targetRect.left + targetRect.width,
      bottom: targetRect.top + targetRect.height,
    };

    expect(overlaps(guideRect, sourceTargetRect)).toBe(false);
  });

  it('uses an under-target mark instead of boxing the target', () => {
    const stage = document.createElement('section');
    const target = document.createElement('button');
    const manager = new TutorialHintManager();

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(
      target,
      toClientRect({
        left: 16,
        top: 100,
        width: 120,
        height: 30,
      }),
    );
    stage.append(target);
    document.body.append(stage);

    manager.mount(stage);
    manager.show({
      target,
      text: 'summon seeds',
      stepLabel: '2/19',
    });

    const highlight = stage.querySelector('.tutorial-layer__highlight');

    expect(highlight?.style.left).toBe('12px');
    expect(highlight?.style.top).toBe('132px');
    expect(highlight?.style.width).toBe('128px');
    expect(highlight?.style.height).toBe('4px');
  });

  it('angles the pointer from the best fitting diagonal corner', () => {
    const stage = document.createElement('section');
    const target = document.createElement('button');
    const manager = new TutorialHintManager();

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(
      target,
      toClientRect({
        left: 4,
        top: 4,
        width: 60,
        height: 30,
      }),
    );
    stage.append(target);
    document.body.append(stage);

    manager.mount(stage);
    manager.show({
      target,
      text: 'summon seeds',
      stepLabel: '2/19',
    });

    const pointer = stage.querySelector('.tutorial-layer__pointer');

    expect(pointer?.hidden).toBe(false);
    expect(pointer?.dataset.placement).toBe('bottom-right');
    expect(pointer?.style.left).toBe('83px');
    expect(pointer?.style.top).toBe('53px');
    expect(pointer?.style.getPropertyValue('--tutorial-pointer-scale-x')).toBe('-1');
    expect(pointer?.style.getPropertyValue('--tutorial-pointer-rotation')).toBe('45deg');
  });

  it('moves the angled pointer when another corner has more room', () => {
    const stage = document.createElement('section');
    const target = document.createElement('button');
    const manager = new TutorialHintManager();

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(
      target,
      toClientRect({
        left: 300,
        top: 650,
        width: 52,
        height: 34,
      }),
    );
    stage.append(target);
    document.body.append(stage);

    manager.mount(stage);
    manager.show({
      target,
      text: 'open market',
      stepLabel: '7/19',
    });

    const pointer = stage.querySelector('.tutorial-layer__pointer');

    expect(pointer?.hidden).toBe(false);
    expect(pointer?.dataset.placement).toBe('top-left');
    expect(pointer?.style.left).toBe('281px');
    expect(pointer?.style.top).toBe('631px');
    expect(pointer?.style.getPropertyValue('--tutorial-pointer-scale-x')).toBe('1');
    expect(pointer?.style.getPropertyValue('--tutorial-pointer-rotation')).toBe('45deg');
  });

  it('types prompt text while the next action appears immediately', () => {
    vi.useFakeTimers();

    try {
      const stage = document.createElement('section');
      const manager = new TutorialHintManager();

      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      document.body.append(stage);

      manager.mount(stage);
      manager.showDialog({
        text: 'abc',
        stepLabel: '1/19',
        advanceOnClick: true,
      });

      const text = stage.querySelector('.tutorial-layer__text');
      const advance = stage.querySelector('.tutorial-layer__advance');
      const portrait = stage.querySelector('.tutorial-layer__portrait');

      expect(text?.textContent).toBe('');
      expect(text?.getAttribute('aria-label')).toBe('abc');
      expect(advance?.hidden).toBe(false);
      expect(advance?.textContent).toBe('next');
      expect(portrait?.hasAttribute('data-speaking')).toBe(true);

      vi.advanceTimersByTime(12);
      expect(text?.textContent).toBe('ab');
      expect(advance?.textContent).toBe('next');

      vi.advanceTimersByTime(12);
      expect(text?.textContent).toBe('abc');
      expect(advance?.textContent).toBe('next');
      expect(portrait?.hasAttribute('data-speaking')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens objective text from a larger Elara button and auto-closes it', () => {
    vi.useFakeTimers();

    try {
      const stage = document.createElement('section');
      const manager = new TutorialHintManager();
      const objectiveText = 'summon seeds and fill the level task';

      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      document.body.append(stage);

      manager.mount(stage);
      manager.showObjective({
        id: 'finish-seed-task',
        text: objectiveText,
        stepLabel: '5/19',
        progress: { value: 1, max: 10 },
        progressLabel: '1/10 seeds',
      });

      const button = stage.querySelector('.tutorial-layer__objective-button');
      const objective = stage.querySelector('.tutorial-layer__objective');
      const copy = stage.querySelector('.tutorial-layer__objective-text');

      expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(false);
      expect(button?.hidden).toBe(false);
      expect(button?.style.left).toBe('0px');
      expect(button?.style.top).toBe('498px');
      expect(button?.dataset.notification).toBe('true');
      expect(button?.dataset.notificationTone).toBe('red');
      expect(button?.getAttribute('aria-label')).toBe('close Elara Starbrew objective');
      expect(button?.getAttribute('aria-expanded')).toBe('true');
      expect(button?.hasAttribute('data-speaking')).toBe(true);
      expect(objective?.hidden).toBe(false);
      expect(objective?.textContent).toContain('Elara Starbrew');
      expect(copy?.textContent).toBe('');
      expect(copy?.getAttribute('aria-label')).toBe(objectiveText);

      vi.advanceTimersByTime(12);
      expect(copy?.textContent).toBe('su');

      vi.advanceTimersByTime(objectiveText.length * 12);
      expect(copy?.textContent).toBe(objectiveText);
      expect(button?.hasAttribute('data-speaking')).toBe(false);

      vi.advanceTimersByTime(5200);
      expect(button?.hidden).toBe(false);
      expect(button?.getAttribute('aria-label')).toBe('open Elara Starbrew objective');
      expect(button?.getAttribute('aria-expanded')).toBe('false');
      expect(objective?.hidden).toBe(true);

      button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(button?.hidden).toBe(false);
      expect(button?.getAttribute('aria-label')).toBe('close Elara Starbrew objective');
      expect(button?.getAttribute('aria-expanded')).toBe('true');
      expect(objective?.hidden).toBe(false);

      button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(button?.hidden).toBe(false);
      expect(button?.getAttribute('aria-label')).toBe('open Elara Starbrew objective');
      expect(button?.getAttribute('aria-expanded')).toBe('false');
      expect(objective?.hidden).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the objective close label on the border', () => {
    const stage = document.createElement('section');
    const manager = new TutorialHintManager();

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showObjective({
      id: 'finish-seed-task',
      text: 'summon seeds and fill the level task',
      stepLabel: '5/19',
      progress: { value: 1, max: 10 },
      progressLabel: '1/10 seeds',
    });

    const button = stage.querySelector('.tutorial-layer__objective-button');
    const objective = stage.querySelector('.tutorial-layer__objective');

    objective
      ?.querySelector('.tutorial-layer__objective-close')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(button?.hidden).toBe(false);
    expect(button?.dataset.notification).toBe('true');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(objective?.hidden).toBe(true);
    expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(false);
  });

  it('can keep Elara quiet until passive attention is active', () => {
    const stage = document.createElement('section');
    const manager = new TutorialHintManager();

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showObjective({
      id: 'research-mint-seed',
      text: 'research mint seed',
      stepLabel: '17/23',
      attention: false,
      autoOpen: false,
    });

    const button = stage.querySelector('.tutorial-layer__objective-button');
    const objective = stage.querySelector('.tutorial-layer__objective');

    expect(button?.hidden).toBe(false);
    expect(objective?.hidden).toBe(true);
    expect(button?.dataset.notification).toBeUndefined();
    expect(button?.hasAttribute('data-attention')).toBe(false);

    manager.setObjectiveAttention(true);

    expect(button?.dataset.notification).toBe('true');
    expect(button?.hasAttribute('data-attention')).toBe(true);

    button?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(objective?.hidden).toBe(false);
    expect(button?.dataset.notification).toBeUndefined();
    expect(button?.hasAttribute('data-attention')).toBe(false);
  });

  it('moves the objective away from unlocked Workshop secondary controls', () => {
    const stage = document.createElement('section');
    const controls = [
      { className: 'workshop-page__leaderboard-button', left: 16, top: 468 },
      { className: 'workshop-page__trade-alliance-button', left: 212, top: 468 },
      { className: 'workshop-page__logs-button', left: 16, top: 510 },
      { className: 'workshop-page__discoveries-button', left: 212, top: 510 },
    ].map(({ className, left, top }) => {
      const button = document.createElement('button');
      button.className = className;
      setClientRect(
        button,
        toClientRect({
          left,
          top,
          width: 132,
          height: 28,
        }),
      );
      stage.append(button);
      return {
        left,
        top,
        right: left + 132,
        bottom: top + 28,
      };
    });
    const manager = new TutorialHintManager();

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showObjective({
      id: 'research-mint-seed',
      text: 'research mint seed',
      stepLabel: '17/23',
      progress: { value: 0, max: 1 },
      progressLabel: '0/1 research',
    });

    stage
      .querySelector('.tutorial-layer__objective-button')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const button = stage.querySelector('.tutorial-layer__objective-button');
    const objective = stage.querySelector('.tutorial-layer__objective');
    const objectiveRect = getObjectiveRect(objective);
    const buttonRect = getObjectiveButtonRect(button);

    expect(button?.style.top).toBe('292px');
    expect(objective?.style.top).toBe('286px');
    expect(controls.some((control) => overlaps(objectiveRect, control))).toBe(false);
    expect(controls.some((control) => overlaps(buttonRect, control))).toBe(false);
  });

  it('hides the prompt portrait while an objective button is active', () => {
    const stage = document.createElement('section');
    const target = document.createElement('button');
    const manager = new TutorialHintManager();

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(
      target,
      toClientRect({
        left: 16,
        top: 100,
        width: 120,
        height: 30,
      }),
    );
    stage.append(target);
    document.body.append(stage);

    manager.mount(stage);
    manager.showObjective({
      id: 'prepare-seed-sale',
      text: 'summon one seed to sell',
      stepLabel: '7/19',
    });
    manager.show({
      target,
      text: 'open market',
      stepLabel: '7/19',
      showPortrait: false,
    });

    expect(stage.querySelector('.tutorial-layer__objective-button')?.hidden).toBe(false);
    expect(stage.querySelector('.tutorial-layer__hint')?.hidden).toBe(false);
    expect(stage.querySelector('.tutorial-layer__portrait')?.hidden).toBe(true);
  });

  it('opens the objective panel again when a new objective starts', () => {
    const stage = document.createElement('section');
    const manager = new TutorialHintManager();

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showObjective({
      id: 'finish-seed-task',
      text: 'summon seeds and fill the level task',
      stepLabel: '5/19',
    });

    stage
      .querySelector('.tutorial-layer__objective-button')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.tutorial-layer__objective')?.hidden).toBe(true);

    manager.showObjective({
      id: 'prepare-seed-sale',
      text: 'summon one seed to sell',
      stepLabel: '7/19',
    });

    expect(stage.querySelector('.tutorial-layer__objective')?.hidden).toBe(false);
    expect(
      stage
      .querySelector('.tutorial-layer__objective-button')
      ?.getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('runs objective press handler from the open objective panel', () => {
    const stage = document.createElement('section');
    const manager = new TutorialHintManager();
    let pressed = 0;

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.setObjectivePressHandler(() => {
      pressed += 1;
    });
    manager.showObjective({
      id: 'finish-seed-task',
      text: 'summon seeds and fill the level task',
      stepLabel: '5/19',
    });

    stage
      .querySelector('.tutorial-layer__objective-button')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.tutorial-layer__objective')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(pressed).toBe(1);

    stage
      .querySelector('.tutorial-layer__objective-close')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(pressed).toBe(1);
  });

  it('does not revive a stale objective button after the tutorial hides', () => {
    const stage = document.createElement('section');
    const manager = new TutorialHintManager();

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showObjective({
      id: 'brew-mana-tonic',
      text: 'brew mana tonic',
      stepLabel: '19/19',
    });

    const button = stage.querySelector('.tutorial-layer__objective-button');

    expect(button?.hidden).toBe(false);

    manager.hide();
    manager.hidePrompt();

    expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(true);
    expect(button?.hidden).toBe(true);
    expect(button?.dataset.notification).toBeUndefined();
  });
});
