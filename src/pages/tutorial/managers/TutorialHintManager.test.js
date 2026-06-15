/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

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

  it('keeps objective text behind a Mira button until opened', () => {
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

    expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(false);
    expect(button?.hidden).toBe(false);
    expect(button?.dataset.notification).toBe('true');
    expect(button?.dataset.notificationTone).toBe('red');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(objective?.hidden).toBe(true);

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(button?.getAttribute('aria-expanded')).toBe('true');
    expect(objective?.hidden).toBe(false);
    expect(objective?.textContent).toContain('summon seeds and fill the level task');

    objective
      ?.querySelector('.tutorial-layer__objective-close')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(button?.hidden).toBe(false);
    expect(button?.dataset.notification).toBe('true');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(objective?.hidden).toBe(true);
    expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(false);
  });

  it('closes the objective panel when a new objective starts', () => {
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

    expect(stage.querySelector('.tutorial-layer__objective')?.hidden).toBe(false);

    manager.showObjective({
      id: 'prepare-seed-sale',
      text: 'summon one seed to sell',
      stepLabel: '7/19',
    });

    expect(stage.querySelector('.tutorial-layer__objective')?.hidden).toBe(true);
    expect(
      stage
      .querySelector('.tutorial-layer__objective-button')
      ?.getAttribute('aria-expanded'),
    ).toBe('false');
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
