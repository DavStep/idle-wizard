/* @vitest-environment jsdom */

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TutorialHintManager } from './TutorialHintManager.js';

const UI_SCALE = 3;
const LESSON_HORIZONTAL_CHROME = 24;
const LESSON_VERTICAL_CHROME = 21;

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

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));

  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function createPointerEvent(type, { clientX, clientY, pointerId = 1 }) {
  const event = new window.MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
  });

  Object.defineProperty(event, 'pointerId', { value: pointerId });
  Object.defineProperty(event, 'isPrimary', { value: true });

  return event;
}

function getLessonRect(lesson) {
  const left = Number.parseFloat(lesson.style.left);
  const top = Number.parseFloat(lesson.style.top);
  const width = Number.parseFloat(lesson.style.width) + LESSON_HORIZONTAL_CHROME;
  const height = Number.parseFloat(lesson.style.height) + LESSON_VERTICAL_CHROME;

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
  };
}

function getLessonOuterHeight(lesson) {
  return Number.parseFloat(lesson.style.height) + LESSON_VERTICAL_CHROME;
}

function getLessonButtonRect(button) {
  const left = Number.parseFloat(button.style.left);
  const top = Number.parseFloat(button.style.top);

  return {
    left,
    top,
    right: left + 70,
    bottom: top + 91,
  };
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function useFixedLessonSize(manager, { width = 190, height = 74 } = {}) {
  manager.measureLessonSize = () => ({ width, height });
  manager.getUiScale = () => UI_SCALE;
}

describe('TutorialHintManager', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    window.localStorage?.clear?.();
  });

  it('uses the Spine pointer shell without drawing a target rectangle or hand sprite', () => {
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
    manager.showTargetCue({
      target,
    });

    const pointer = stage.querySelector('.tutorial-layer__pointer');
    const pointerCanvas = pointer?.querySelector('.tutorial-layer__pointer-spine');

    expect(pointer?.hidden).toBe(false);
    expect(pointerCanvas).not.toBeNull();
    expect(pointer?.querySelector('img')).toBeNull();
  });

  it('hides the pointer immediately for pointerless highlighted target cues', () => {
    const stage = document.createElement('section');
    const target = document.createElement('button');
    const manager = new TutorialHintManager();

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(
      target,
      toClientRect({
        left: 96,
        top: 140,
        width: 80,
        height: 24,
      }),
    );
    stage.append(target);
    document.body.append(stage);

    manager.mount(stage);
    manager.showTargetCue({ target });

    const pointer = stage.querySelector('.tutorial-layer__pointer');

    expect(pointer?.hidden).toBe(false);

    manager.showTargetCue({ target, showPointer: false, emphasizeTarget: true });

    expect(pointer?.hidden).toBe(true);
    expect(target.classList.contains('is-tutorial-target-emphasized')).toBe(true);
    expect(target.getAttribute('data-tutorial-target-emphasis')).toBe('true');
  });

  it('dims the stage through a masked backdrop while leaving highlighted targets visible', () => {
    const stage = document.createElement('section');
    const topPanel = document.createElement('div');
    const manaValue = document.createElement('span');
    const manaRegen = document.createElement('span');
    const manager = new TutorialHintManager();

    useFixedLessonSize(manager);
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1440, height: 2160 });
    setClientRect(
      manaValue,
      toClientRect({
        left: 180,
        top: 20,
        width: 80,
        height: 18,
      }),
    );
    setClientRect(
      manaRegen,
      toClientRect({
        left: 180,
        top: 40,
        width: 36,
        height: 14,
      }),
    );
    topPanel.style.opacity = '0';
    topPanel.append(manaValue, manaRegen);
    stage.append(topPanel);
    document.body.append(stage);

    manager.mount(stage);
    setClientRect(manager.root, { left: 180, top: 0, width: 1080, height: 2160 });
    manager.showLesson({
      id: 'intro-mana-sphere',
      text: 'this is your mana.',
      highlightTargets: [manaValue, manaRegen],
    });

    const backdrop = stage.querySelector('.tutorial-layer__backdrop');
    const shade = [...(backdrop?.children ?? [])].find(
      (child) => child.tagName.toLowerCase() === 'rect',
    );
    const maskRects = [...(backdrop?.querySelectorAll('mask rect') ?? [])];

    expect(backdrop?.hasAttribute('hidden')).toBe(false);
    expect(backdrop?.getAttribute('viewBox')).toBe('0 0 480 720');
    expect(shade?.getAttribute('fill-opacity')).toBe('0.58');
    expect(maskRects).toHaveLength(3);
    expect(
      maskRects.slice(1).map((rect) => ({
        x: rect.getAttribute('x'),
        y: rect.getAttribute('y'),
        width: rect.getAttribute('width'),
        height: rect.getAttribute('height'),
      })),
    ).toEqual([
      { x: '177', y: '17', width: '86', height: '24' },
      { x: '177', y: '37', width: '42', height: '20' },
    ]);

    manager.hide();

    expect(backdrop?.hasAttribute('hidden')).toBe(true);
    expect(backdrop?.querySelectorAll('mask rect')).toHaveLength(1);
  });

  it('dims the whole stage for advance lessons without highlight targets', () => {
    const stage = document.createElement('section');
    const manager = new TutorialHintManager();

    useFixedLessonSize(manager);
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showLesson({
      id: 'first-task-complete',
      title: 'lesson 1: introduction',
      text: 'tasks are how the workshop asks for supplies.',
      advanceOnClick: true,
      dimBackdrop: true,
    });

    const backdrop = stage.querySelector('.tutorial-layer__backdrop');
    const maskRects = [...(backdrop?.querySelectorAll('mask rect') ?? [])];

    expect(backdrop?.hasAttribute('hidden')).toBe(false);
    expect(backdrop?.getAttribute('viewBox')).toBe('0 0 360 720');
    expect(maskRects).toHaveLength(1);
    expect(maskRects[0]?.getAttribute('width')).toBe('360');
    expect(maskRects[0]?.getAttribute('height')).toBe('720');

    manager.closeLessonPanel();

    expect(backdrop?.hasAttribute('hidden')).toBe(true);

    manager.openLessonPanel();

    expect(backdrop?.hasAttribute('hidden')).toBe(false);
    expect(backdrop?.querySelectorAll('mask rect')).toHaveLength(1);
  });

  it('can cut text-shaped highlight holes instead of rectangular target holes', () => {
    const stage = document.createElement('section');
    const manaValue = document.createElement('span');
    const manager = new TutorialHintManager();

    useFixedLessonSize(manager);
    manaValue.dataset.tutorialHighlightShape = 'text';
    manaValue.textContent = '50/50';
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(
      manaValue,
      toClientRect({
        left: 60,
        top: 20,
        width: 40,
        height: 13,
      }),
    );
    stage.append(manaValue);
    document.body.append(stage);

    manager.mount(stage);
    manager.showLesson({
      id: 'intro-mana-sphere',
      text: 'this is your mana.',
      highlightTargets: [manaValue],
    });

    const backdrop = stage.querySelector('.tutorial-layer__backdrop');
    const maskRects = [...(backdrop?.querySelectorAll('mask rect') ?? [])];
    const maskText = backdrop?.querySelector('mask text');

    expect(maskRects).toHaveLength(1);
    expect(maskText?.textContent).toBe('50/50');
    expect(maskText?.getAttribute('x')).toBe('60');
    expect(maskText?.getAttribute('y')).toBe('33');
    expect(maskText?.getAttribute('textLength')).toBe('40');
    expect(maskText?.hasAttribute('dominant-baseline')).toBe(false);
  });

  it('remeasures highlighted text holes while reveal targets settle', () => {
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const hadRequestAnimationFrame = 'requestAnimationFrame' in window;
    const hadCancelAnimationFrame = 'cancelAnimationFrame' in window;
    const frames = [];
    const requestAnimationFrame = vi.fn((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const cancelAnimationFrame = vi.fn();
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: requestAnimationFrame,
      writable: true,
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: cancelAnimationFrame,
      writable: true,
    });

    let manager = null;

    try {
      const stage = document.createElement('section');
      const manaValue = document.createElement('span');
      let manaValueRect = toClientRect({
        left: 60,
        top: 24,
        width: 40,
        height: 13,
      });
      manager = new TutorialHintManager();

      useFixedLessonSize(manager);
      manaValue.dataset.tutorialHighlightShape = 'text';
      manaValue.textContent = '50/50';
      manaValue.getBoundingClientRect = () => ({
        x: manaValueRect.left,
        y: manaValueRect.top,
        right: manaValueRect.left + manaValueRect.width,
        bottom: manaValueRect.top + manaValueRect.height,
        ...manaValueRect,
      });
      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      stage.append(manaValue);
      document.body.append(stage);

      manager.mount(stage);
      manager.showLesson({
        id: 'intro-mana-sphere',
        text: 'this is your mana.',
        highlightTargets: [manaValue],
      });

      expect(stage.querySelector('mask text')?.getAttribute('y')).toBe('37');
      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

      manaValueRect = toClientRect({
        left: 60,
        top: 20,
        width: 40,
        height: 13,
      });
      frames.shift()?.(0);

      expect(stage.querySelector('mask text')?.getAttribute('y')).toBe('33');
    } finally {
      manager?.unmount();

      if (hadRequestAnimationFrame) {
        Object.defineProperty(window, 'requestAnimationFrame', {
          configurable: true,
          value: originalRequestAnimationFrame,
          writable: true,
        });
      } else {
        Reflect.deleteProperty(window, 'requestAnimationFrame');
      }

      if (hadCancelAnimationFrame) {
        Object.defineProperty(window, 'cancelAnimationFrame', {
          configurable: true,
          value: originalCancelAnimationFrame,
          writable: true,
        });
      } else {
        Reflect.deleteProperty(window, 'cancelAnimationFrame');
      }
    }
  });

  it('mounts and pauses the Spine pointer with target cue visibility', () => {
    const stage = document.createElement('section');
    const target = document.createElement('button');
    const pointerSpineManager = {
      mount: vi.fn(),
      unmount: vi.fn(),
      setMotionEnabled: vi.fn(),
      setVisible: vi.fn(),
    };
    const manager = new TutorialHintManager({ pointerSpineManager });

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
    manager.showTargetCue({ target });
    manager.hideTargetCue({ immediate: true });
    manager.unmount();

    expect(pointerSpineManager.mount).toHaveBeenCalledWith(
      expect.objectContaining({ className: 'tutorial-layer__pointer' }),
    );
    expect(pointerSpineManager.setMotionEnabled).toHaveBeenCalledWith(true);
    expect(pointerSpineManager.setVisible).toHaveBeenCalledWith(true);
    expect(pointerSpineManager.setVisible).toHaveBeenCalledWith(false);
    expect(pointerSpineManager.unmount).toHaveBeenCalled();
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
    manager.showTargetCue({
      target,
    });

    const pointer = stage.querySelector('.tutorial-layer__pointer');

    expect(pointer?.hidden).toBe(false);
    expect(pointer?.dataset.placement).toBe('bottom-right');
    expect(pointer?.style.left).toBe('50px');
    expect(pointer?.style.top).toBe('35px');
  });

  it('measures target cues from the centered tutorial layer on web-wide stages', () => {
    const stage = document.createElement('section');
    const target = document.createElement('button');
    const manager = new TutorialHintManager();

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1920, height: 2160 });
    stage.append(target);
    document.body.append(stage);

    manager.mount(stage);
    setClientRect(manager.root, { left: 420, top: 0, width: 1080, height: 2160 });
    setClientRect(target, {
      left: 420 + 16 * UI_SCALE,
      top: 100 * UI_SCALE,
      width: 120 * UI_SCALE,
      height: 30 * UI_SCALE,
    });

    expect(manager.getSourceBounds()).toEqual({
      width: 360,
      height: 720,
    });
    expect(manager.getSourceRect(target)).toEqual({
      left: 16,
      top: 100,
      width: 120,
      height: 30,
    });
  });

  it('anchors the username cue to the visible name instead of the wide button', () => {
    const stage = document.createElement('section');
    const target = document.createElement('button');
    const label = document.createElement('span');
    const manager = new TutorialHintManager();

    target.dataset.tutorialId = 'top:username';
    label.className = 'room-top-panel__username-label';
    label.textContent = 'wizard';
    target.append(label);
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(
      target,
      toClientRect({
        left: 20,
        top: 32,
        width: 260,
        height: 46,
      }),
    );
    setClientRect(
      label,
      toClientRect({
        left: 80,
        top: 40,
        width: 60,
        height: 20,
      }),
    );
    stage.append(target);
    document.body.append(stage);

    manager.mount(stage);
    manager.showTargetCue({ target });

    const pointer = stage.querySelector('.tutorial-layer__pointer');

    expect(pointer?.hidden).toBe(false);
    expect(pointer?.dataset.placement).toBe('bottom-right');
    expect(pointer?.style.left).toBe('126px');
    expect(pointer?.style.top).toBe('66px');
  });

  it('anchors garden plot cues to the visible plot frame instead of the wide row', () => {
    const stage = document.createElement('section');
    const target = document.createElement('button');
    const frame = document.createElement('span');
    const manager = new TutorialHintManager();

    target.className = 'garden-page__plot-row';
    target.dataset.tutorialId = 'garden:plot:1';
    frame.className = 'garden-page__plot-box-frame';
    target.append(frame);
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(
      target,
      toClientRect({
        left: 20,
        top: 90,
        width: 120,
        height: 110,
      }),
    );
    setClientRect(
      frame,
      toClientRect({
        left: 44,
        top: 112,
        width: 72,
        height: 72,
      }),
    );
    stage.append(target);
    document.body.append(stage);

    manager.mount(stage);

    expect(manager.getTargetCueSourceRect(target)).toEqual({
      left: 44,
      top: 112,
      width: 72,
      height: 72,
    });
  });

  it('retries target cue placement after one frame when target layout is not ready', () => {
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const hadRequestAnimationFrame = 'requestAnimationFrame' in window;
    const hadCancelAnimationFrame = 'cancelAnimationFrame' in window;
    const frames = [];
    const requestAnimationFrame = vi.fn((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const cancelAnimationFrame = vi.fn();
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: requestAnimationFrame,
      writable: true,
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: cancelAnimationFrame,
      writable: true,
    });

    try {
      const stage = document.createElement('section');
      const target = document.createElement('button');
      const manager = new TutorialHintManager();
      let targetRect = { left: 0, top: 0, width: 0, height: 0 };

      target.getBoundingClientRect = () => ({
        x: targetRect.left,
        y: targetRect.top,
        right: targetRect.left + targetRect.width,
        bottom: targetRect.top + targetRect.height,
        ...targetRect,
      });
      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      stage.append(target);
      document.body.append(stage);

      manager.mount(stage);
      manager.showTargetCue({ target });

      const pointer = stage.querySelector('.tutorial-layer__pointer');

      expect(pointer?.hidden).toBe(true);
      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

      targetRect = toClientRect({
        left: 4,
        top: 4,
        width: 60,
        height: 30,
      });
      frames.shift()?.(0);

      expect(pointer?.hidden).toBe(false);
      expect(pointer?.dataset.placement).toBe('bottom-right');
      expect(pointer?.style.left).toBe('50px');
      expect(pointer?.style.top).toBe('35px');
    } finally {
      if (hadRequestAnimationFrame) {
        Object.defineProperty(window, 'requestAnimationFrame', {
          configurable: true,
          value: originalRequestAnimationFrame,
          writable: true,
        });
      } else {
        Reflect.deleteProperty(window, 'requestAnimationFrame');
      }

      if (hadCancelAnimationFrame) {
        Object.defineProperty(window, 'cancelAnimationFrame', {
          configurable: true,
          value: originalCancelAnimationFrame,
          writable: true,
        });
      } else {
        Reflect.deleteProperty(window, 'cancelAnimationFrame');
      }
    }
  });

  it('hides the stale pointer while the next target layout is not ready', () => {
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const hadRequestAnimationFrame = 'requestAnimationFrame' in window;
    const hadCancelAnimationFrame = 'cancelAnimationFrame' in window;
    const frames = [];
    const requestAnimationFrame = vi.fn((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const cancelAnimationFrame = vi.fn();
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: requestAnimationFrame,
      writable: true,
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: cancelAnimationFrame,
      writable: true,
    });

    try {
      const stage = document.createElement('section');
      const firstTarget = document.createElement('button');
      const nextTarget = document.createElement('button');
      const manager = new TutorialHintManager();
      let nextRect = { left: 0, top: 0, width: 0, height: 0 };

      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      setClientRect(
        firstTarget,
        toClientRect({
          left: 90,
          top: 120,
          width: 64,
          height: 24,
        }),
      );
      nextTarget.getBoundingClientRect = () => ({
        x: nextRect.left,
        y: nextRect.top,
        right: nextRect.left + nextRect.width,
        bottom: nextRect.top + nextRect.height,
        ...nextRect,
      });
      stage.append(firstTarget, nextTarget);
      document.body.append(stage);

      manager.mount(stage);
      manager.showTargetCue({ target: firstTarget });
      frames.shift()?.(0);

      const pointer = stage.querySelector('.tutorial-layer__pointer');

      expect(pointer?.hidden).toBe(false);
      expect(pointer?.style.left).toBe('138px');
      expect(pointer?.style.top).toBe('148px');

      manager.showTargetCue({ target: nextTarget });

      expect(pointer?.hidden).toBe(true);

      nextRect = toClientRect({
        left: 4,
        top: 4,
        width: 60,
        height: 30,
      });
      frames.shift()?.(16);

      expect(pointer?.hidden).toBe(false);
      expect(pointer?.style.left).toBe('50px');
      expect(pointer?.style.top).toBe('35px');

      manager.unmount();
      stage.remove();
    } finally {
      if (hadRequestAnimationFrame) {
        Object.defineProperty(window, 'requestAnimationFrame', {
          configurable: true,
          value: originalRequestAnimationFrame,
          writable: true,
        });
      } else {
        Reflect.deleteProperty(window, 'requestAnimationFrame');
      }

      if (hadCancelAnimationFrame) {
        Object.defineProperty(window, 'cancelAnimationFrame', {
          configurable: true,
          value: originalCancelAnimationFrame,
          writable: true,
        });
      } else {
        Reflect.deleteProperty(window, 'cancelAnimationFrame');
      }
    }
  });

  it('follows the Workshop pin cue while expanded requirements settle', () => {
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const hadRequestAnimationFrame = 'requestAnimationFrame' in window;
    const hadCancelAnimationFrame = 'cancelAnimationFrame' in window;
    const frames = [];
    const requestAnimationFrame = vi.fn((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const cancelAnimationFrame = vi.fn();
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: requestAnimationFrame,
      writable: true,
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: cancelAnimationFrame,
      writable: true,
    });

    try {
      const stage = document.createElement('section');
      const requirements = document.createElement('section');
      const pinButton = document.createElement('button');
      const manager = new TutorialHintManager();
      let pinTop = 96;

      requirements.className = 'workshop-page__tasks style-box is-expanded is-expanding';
      pinButton.className = 'workshop-page__tasks-pin';
      pinButton.dataset.tutorialId = 'workshop:tasksPin';
      pinButton.getBoundingClientRect = () =>
        toClientRect({
          left: 20,
          top: pinTop,
          width: 34,
          height: 18,
        });
      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      requirements.append(pinButton);
      stage.append(requirements);
      document.body.append(stage);

      manager.mount(stage);
      manager.showTargetCue({ target: pinButton });

      const pointer = stage.querySelector('.tutorial-layer__pointer');

      expect(pointer?.hidden).toBe(false);
      expect(pointer?.dataset.placement).toBe('bottom-right');
      expect(pointer?.style.top).toBe('121px');
      expect(requestAnimationFrame).toHaveBeenCalledTimes(2);

      pinTop = 232;
      frames.shift()?.(0);
      frames.shift()?.(16);

      expect(pointer?.style.top).toBe('257px');

      requirements.classList.remove('is-expanding');
      frames.shift()?.(32);
      frames.shift()?.(48);

      expect(pointer?.style.top).toBe('257px');
      expect(requestAnimationFrame).toHaveBeenCalledTimes(4);

      manager.unmount();
      stage.remove();
    } finally {
      if (hadRequestAnimationFrame) {
        Object.defineProperty(window, 'requestAnimationFrame', {
          configurable: true,
          value: originalRequestAnimationFrame,
          writable: true,
        });
      } else {
        Reflect.deleteProperty(window, 'requestAnimationFrame');
      }

      if (hadCancelAnimationFrame) {
        Object.defineProperty(window, 'cancelAnimationFrame', {
          configurable: true,
          value: originalCancelAnimationFrame,
          writable: true,
        });
      } else {
        Reflect.deleteProperty(window, 'cancelAnimationFrame');
      }
    }
  });

  it('does not restart the pointer animation when the same cue repeats', () => {
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const hadRequestAnimationFrame = 'requestAnimationFrame' in window;
    const requestAnimationFrame = vi.fn((callback) => {
      callback(0);
      return 1;
    });
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: requestAnimationFrame,
      writable: true,
    });

    try {
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
      manager.showTargetCue({ target });

      const pointer = stage.querySelector('.tutorial-layer__pointer');
      expect(pointer?.classList.contains('is-visible')).toBe(true);
      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

      requestAnimationFrame.mockClear();
      manager.showTargetCue({ target });

      expect(requestAnimationFrame).not.toHaveBeenCalled();
      expect(pointer?.dataset.placement).toBe('bottom-right');
      expect(pointer?.style.left).toBe('50px');
      expect(pointer?.style.top).toBe('35px');
    } finally {
      if (hadRequestAnimationFrame) {
        Object.defineProperty(window, 'requestAnimationFrame', {
          configurable: true,
          value: originalRequestAnimationFrame,
          writable: true,
        });
      } else {
        Reflect.deleteProperty(window, 'requestAnimationFrame');
      }
    }
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
    manager.showTargetCue({
      target,
    });

    const pointer = stage.querySelector('.tutorial-layer__pointer');

    expect(pointer?.hidden).toBe(false);
    expect(pointer?.dataset.placement).toBe('top-left');
    expect(pointer?.style.left).toBe('310px');
    expect(pointer?.style.top).toBe('651px');
  });

  it('keeps the pointer anchored to the target inside an active research row', () => {
    const stage = document.createElement('section');
    const row = document.createElement('div');
    const target = document.createElement('button');
    const manager = new TutorialHintManager();
    const activeRow = {
      left: 16,
      top: 260,
      right: 344,
      bottom: 288,
    };

    row.className = 'research-page__row';
    target.className = 'style-button research-page__research-button';
    target.dataset.tutorialId = 'research:unlockSeed:mintSeed';
    row.append(target);
    stage.append(row);
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(
      row,
      toClientRect({
        left: activeRow.left,
        top: activeRow.top,
        width: activeRow.right - activeRow.left,
        height: activeRow.bottom - activeRow.top,
      }),
    );
    setClientRect(
      target,
      toClientRect({
        left: 276,
        top: 263,
        width: 68,
        height: 22,
      }),
    );
    document.body.append(stage);

    manager.mount(stage);
    manager.showTargetCue({
      target,
    });

    const pointer = stage.querySelector('.tutorial-layer__pointer');
    const pointerRect = {
      left: Number.parseFloat(pointer?.style.left ?? '0') - 17,
      top: Number.parseFloat(pointer?.style.top ?? '0') - 17,
      right: Number.parseFloat(pointer?.style.left ?? '0') + 17,
      bottom: Number.parseFloat(pointer?.style.top ?? '0') + 17,
    };

    expect(pointer?.hidden).toBe(false);
    expect(pointer?.dataset.placement).toBe('bottom-left');
    expect(pointer?.style.left).toBe('294px');
    expect(pointer?.style.top).toBe('290px');
    expect(overlaps(pointerRect, activeRow)).toBe(true);
  });

  it('aims the level-up cue at the button inside the full completion row', () => {
    const stage = document.createElement('section');
    const row = document.createElement('div');
    const button = document.createElement('button');
    const manager = new TutorialHintManager();

    row.className = 'workshop-page__level-complete';
    row.dataset.tutorialId = 'workshop:levelUp';
    button.className = 'style-button workshop-page__level-complete-button';
    row.append(button);
    stage.append(row);
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(
      row,
      toClientRect({
        left: 30,
        top: 190,
        width: 300,
        height: 52,
      }),
    );
    setClientRect(
      button,
      toClientRect({
        left: 250,
        top: 210,
        width: 70,
        height: 24,
      }),
    );
    document.body.append(stage);

    manager.mount(stage);
    manager.showTargetCue({
      target: row,
    });

    const pointer = stage.querySelector('.tutorial-layer__pointer');

    expect(pointer?.hidden).toBe(false);
    expect(pointer?.dataset.placement).toBe('bottom-left');
    expect(pointer?.style.left).toBe('269px');
    expect(pointer?.style.top).toBe('238px');
  });

  it('types lesson text while border actions appear immediately', () => {
    vi.useFakeTimers();

    try {
      const stage = document.createElement('section');
      const manager = new TutorialHintManager();

      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      document.body.append(stage);

      manager.mount(stage);
      manager.showLesson({
        id: 'intro-welcome',
        title: 'lesson 1: introduction',
        text: 'abc',
        stepLabel: '1/25',
        advanceOnClick: true,
      });

      const text = stage.querySelector('.tutorial-layer__lesson-text');
      const advance = stage.querySelector('.tutorial-layer__lesson-advance');
      const showMe = stage.querySelector('.tutorial-layer__lesson-show');
      const button = stage.querySelector('.tutorial-layer__lesson-button');

      expect(text?.textContent).toBe('');
      expect(text?.getAttribute('aria-label')).toBe('abc');
      expect(advance?.hidden).toBe(false);
      expect(advance?.textContent).toBe('next');
      expect(showMe?.hidden).toBe(true);
      expect(button?.hasAttribute('data-speaking')).toBe(true);

      vi.advanceTimersByTime(12);
      expect(text?.textContent).toBe('ab');
      expect(advance?.textContent).toBe('next');

      vi.advanceTimersByTime(12);
      expect(text?.textContent).toBe('abc');
      expect(advance?.textContent).toBe('next');
      expect(button?.hasAttribute('data-speaking')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not type lesson text again after the player has seen the full copy', () => {
    vi.useFakeTimers();

    try {
      const stage = document.createElement('section');
      const manager = new TutorialHintManager();

      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      document.body.append(stage);

      manager.mount(stage);
      manager.showLesson({
        id: 'intro-welcome',
        title: 'lesson 1: introduction',
        text: 'abc',
        stepLabel: '1/25',
        advanceOnClick: true,
      });

      const text = stage.querySelector('.tutorial-layer__lesson-text');
      const button = stage.querySelector('.tutorial-layer__lesson-button');

      vi.advanceTimersByTime(24);
      expect(text?.textContent).toBe('abc');
      expect(button?.hasAttribute('data-speaking')).toBe(false);

      button?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      vi.advanceTimersByTime(260);
      expect(stage.querySelector('.tutorial-layer__lesson')?.hidden).toBe(true);

      button?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(text?.textContent).toBe('abc');
      expect(button?.hasAttribute('data-speaking')).toBe(false);

      vi.advanceTimersByTime(12);
      expect(text?.textContent).toBe('abc');
    } finally {
      vi.useRealTimers();
    }
  });

  it('types lesson text again if the panel was hidden before the copy completed', () => {
    vi.useFakeTimers();

    try {
      const stage = document.createElement('section');
      const manager = new TutorialHintManager();

      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      document.body.append(stage);

      manager.mount(stage);
      manager.showLesson({
        id: 'intro-welcome',
        title: 'lesson 1: introduction',
        text: 'abcd',
        stepLabel: '1/25',
        advanceOnClick: true,
      });

      const text = stage.querySelector('.tutorial-layer__lesson-text');
      const button = stage.querySelector('.tutorial-layer__lesson-button');

      vi.advanceTimersByTime(12);
      expect(text?.textContent).toBe('ab');

      button?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      vi.advanceTimersByTime(260);
      button?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(text?.textContent).toBe('');
      expect(button?.hasAttribute('data-speaking')).toBe(true);

      vi.advanceTimersByTime(12);
      expect(text?.textContent).toBe('ab');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the lesson width fixed while sizing height for final copy', () => {
    vi.useFakeTimers();

    try {
      const stage = document.createElement('section');
      const manager = new TutorialHintManager();

      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      document.body.append(stage);

      manager.mount(stage);
      manager.showLesson({
        id: 'short-copy',
        title: 'lesson 1: introduction',
        text: 'wait',
        stepLabel: '1/25',
      });

      const lesson = stage.querySelector('.tutorial-layer__lesson');
      const text = stage.querySelector('.tutorial-layer__lesson-text');
      const shortSize = {
        width: Number.parseFloat(lesson?.style.width ?? '0'),
        height: Number.parseFloat(lesson?.style.height ?? '0'),
      };

      expect(text?.textContent).toBe('');
      expect(text?.getAttribute('aria-label')).toBe('wait');

      manager.showLesson({
        id: 'long-copy',
        title: 'lesson 2: market',
        text: 'summon seeds and sell them for level-up coin',
        stepLabel: '11/25',
        progress: { value: 0, max: 4 },
        progressLabel: '0/4 coin',
        canShowTarget: true,
      });

      const longSize = {
        width: Number.parseFloat(lesson?.style.width ?? '0'),
        height: Number.parseFloat(lesson?.style.height ?? '0'),
      };

      expect(text?.textContent).toBe('');
      expect(text?.getAttribute('aria-label')).toBe(
        'summon seeds and sell them for level-up coin',
      );
      expect(shortSize.width).toBe(190);
      expect(longSize.width).toBe(shortSize.width);
      expect(longSize.height).toBeGreaterThan(shortSize.height);
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders intro dialogs as centered purchase panels', () => {
    vi.useFakeTimers();

    try {
      const stage = document.createElement('section');
      const manager = new TutorialHintManager();

      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      document.body.append(stage);

      manager.mount(stage);
      manager.showLesson({
        id: 'purchase-house',
        title: 'the story begins',
        text: 'this old workshop is for sale.',
        stepLabel: '1/31',
        advanceOnClick: true,
        advanceLabel: 'enter workshop',
        canShowTarget: true,
        variant: 'intro-dialog',
      });

      const lesson = stage.querySelector('.tutorial-layer__lesson');
      const button = stage.querySelector('.tutorial-layer__lesson-button');
      const advance = stage.querySelector('.tutorial-layer__lesson-advance');
      const showMe = stage.querySelector('.tutorial-layer__lesson-show');

      expect(lesson?.hidden).toBe(false);
      expect(lesson?.classList.contains('is-intro-dialog')).toBe(true);
      expect(lesson?.style.width).toBe('260px');
      expect(lesson?.style.left).toBe('38px');
      expect(lesson?.style.top).toBe('202px');
      expect(button?.hidden).toBe(true);
      expect(advance?.hidden).toBe(false);
      expect(advance?.textContent).toBe('enter workshop');
      expect(showMe?.hidden).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps lesson text open until the player closes it', () => {
    vi.useFakeTimers();

    try {
      const stage = document.createElement('section');
      const manager = new TutorialHintManager();
      const lessonText = 'summon and turn in sage seeds for the next level';

      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      document.body.append(stage);

      manager.mount(stage);
      manager.showLesson({
        id: 'finish-seed-task',
        title: 'lesson 1: introduction',
        text: lessonText,
        stepLabel: '7/25',
        progress: { value: 1, max: 6 },
        progressLabel: '1/6 seeds',
        canShowTarget: true,
      });

      const button = stage.querySelector('.tutorial-layer__lesson-button');
      const lesson = stage.querySelector('.tutorial-layer__lesson');
      const copy = stage.querySelector('.tutorial-layer__lesson-text');
      const showMe = stage.querySelector('.tutorial-layer__lesson-show');
      const buttonImage = button?.querySelector('.tutorial-layer__objective-button-image');

      expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(false);
      expect(button?.hidden).toBe(false);
      expect(button?.style.left).toBe('4px');
      expect(button?.style.top).toBe(
        `${520 + getLessonOuterHeight(lesson) - 91 + 9}px`,
      );
      expect(button?.dataset.notification).toBeUndefined();
      expect(button?.getAttribute('aria-label')).toBe('hide lesson');
      expect(button?.getAttribute('aria-expanded')).toBe('true');
      expect(
        button?.querySelector('.tutorial-layer__objective-button-label')?.textContent,
      ).toBe('hide');
      expect(buttonImage?.hidden).toBe(false);
      expect(button?.hasAttribute('data-speaking')).toBe(true);
      expect(lesson?.hidden).toBe(false);
      expect(lesson?.textContent).toContain('lesson 1: introduction');
      expect(
        Number.parseFloat(
          lesson?.style.getPropertyValue('--tutorial-lesson-origin-x') ?? 'NaN',
        ),
      ).toBeLessThan(0);
      expect(
        Number.parseFloat(
          lesson?.style.getPropertyValue('--tutorial-lesson-origin-y') ?? 'NaN',
        ),
      ).toBeGreaterThan(0);
      expect(
        Number.parseFloat(
          lesson?.style.getPropertyValue('--tutorial-lesson-enter-x') ?? 'NaN',
        ),
      ).toBeLessThan(0);
      expect(copy?.textContent).toBe('');
      expect(Number.parseFloat(lesson?.style.height ?? '0')).toBeGreaterThan(0);
      expect(copy?.getAttribute('aria-label')).toBe(lessonText);
      expect(showMe?.hidden).toBe(false);

      vi.advanceTimersByTime(12);
      expect(copy?.textContent).toBe('su');

      vi.advanceTimersByTime(lessonText.length * 12);
      expect(copy?.textContent).toBe(lessonText);
      expect(button?.hasAttribute('data-speaking')).toBe(false);

      vi.advanceTimersByTime(5200);
      expect(button?.hidden).toBe(false);
      expect(button?.dataset.notification).toBeUndefined();
      expect(button?.getAttribute('aria-label')).toBe('hide lesson');
      expect(button?.getAttribute('aria-expanded')).toBe('true');
      expect(lesson?.hidden).toBe(false);

      button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(button?.hidden).toBe(false);
      expect(button?.dataset.notification).toBe('true');
      expect(button?.getAttribute('aria-label')).toBe('open lesson');
      expect(button?.getAttribute('aria-expanded')).toBe('false');
      expect(
        button?.querySelector('.tutorial-layer__objective-button-label')?.textContent,
      ).toBe('help');
      expect(buttonImage?.hidden).toBe(false);
      expect(lesson?.hidden).toBe(false);
      expect(lesson?.classList.contains('is-hiding')).toBe(true);
      expect(button?.classList.contains('is-collapsing')).toBe(true);

      vi.advanceTimersByTime(260);

      expect(lesson?.hidden).toBe(true);
      expect(lesson?.classList.contains('is-hiding')).toBe(false);
      expect(button?.classList.contains('is-collapsing')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('drags an open Elara lesson vertically and keeps that placement locally', () => {
    const storage = createMemoryStorage();
    const stage = document.createElement('section');
    const manager = new TutorialHintManager({ storage });

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showLesson({
      id: 'drag-test',
      title: 'lesson',
      text: 'move me',
      stepLabel: '1/1',
    });

    const button = stage.querySelector('.tutorial-layer__lesson-button');
    const lesson = stage.querySelector('.tutorial-layer__lesson');
    const dragYell = button?.querySelector('.tutorial-layer__objective-button-drag-yell');
    const startLeft = Number.parseFloat(button?.style.left ?? '0');
    const startTop = Number.parseFloat(button?.style.top ?? '0');
    const dragStart = {
      x: (startLeft + 10) * UI_SCALE,
      y: (startTop + 20) * UI_SCALE,
    };
    const dragEnd = {
      x: dragStart.x + 30 * UI_SCALE,
      y: dragStart.y - 15 * UI_SCALE,
    };

    button?.dispatchEvent(
      createPointerEvent('pointerdown', {
        clientX: dragStart.x,
        clientY: dragStart.y,
      }),
    );
    document.dispatchEvent(
      createPointerEvent('pointermove', {
        clientX: dragEnd.x,
        clientY: dragEnd.y,
      }),
    );

    expect(button?.classList.contains('is-dragging')).toBe(true);
    expect(dragYell?.textContent).toBe('AAAAAA!!!');
    expect(dragYell?.getAttribute('aria-hidden')).toBe('true');

    document.dispatchEvent(
      createPointerEvent('pointerup', {
        clientX: dragEnd.x,
        clientY: dragEnd.y,
      }),
    );

    expect(button?.style.left).toBe(`${startLeft}px`);
    expect(button?.style.top).toBe(`${startTop - 15}px`);
    expect(lesson?.style.left).toBe(`${startLeft + 70}px`);
    expect(lesson?.hidden).toBe(false);

    button?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(lesson?.hidden).toBe(false);
    expect(JSON.parse(storage.getItem('idle-wizard.tutorial.elaraPlacement.v1'))).toEqual({
      buttonLeft: startLeft,
      buttonTop: startTop - 15,
    });

    manager.unmount();
    stage.remove();

    const nextStage = document.createElement('section');
    const nextManager = new TutorialHintManager({ storage });

    nextStage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(nextStage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(nextStage);

    nextManager.mount(nextStage);
    nextManager.showLesson({
      id: 'prepare-seed-sale',
      title: 'lesson 2: market',
      text: 'summon one seed to sell',
      stepLabel: '9/25',
    });

    expect(nextStage.querySelector('.tutorial-layer__lesson-button')?.style.left).toBe(
      `${startLeft}px`,
    );
    expect(nextStage.querySelector('.tutorial-layer__lesson-button')?.style.top).toBe(
      `${startTop - 15}px`,
    );

    nextManager.unmount();
    nextStage.remove();
  });

  it('cycles Elara drag yells while dragging repeatedly', () => {
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const hadRequestAnimationFrame = 'requestAnimationFrame' in window;

    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: undefined,
      writable: true,
    });

    try {
      const stage = document.createElement('section');
      const manager = new TutorialHintManager();

      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      document.body.append(stage);

      manager.mount(stage);
      manager.showLesson({
        id: 'drag-yell-test',
        title: 'lesson',
        text: 'move me',
        stepLabel: '1/1',
      });

      const button = stage.querySelector('.tutorial-layer__lesson-button');
      const dragYell = button?.querySelector('.tutorial-layer__objective-button-drag-yell');
      const dragOnce = () => {
        const startLeft = Number.parseFloat(button?.style.left ?? '0');
        const startTop = Number.parseFloat(button?.style.top ?? '0');
        const dragStart = {
          x: (startLeft + 10) * UI_SCALE,
          y: (startTop + 20) * UI_SCALE,
        };
        const dragEnd = {
          x: dragStart.x + 30 * UI_SCALE,
          y: dragStart.y - 15 * UI_SCALE,
        };

        button?.dispatchEvent(
          createPointerEvent('pointerdown', {
            clientX: dragStart.x,
            clientY: dragStart.y,
          }),
        );
        document.dispatchEvent(
          createPointerEvent('pointermove', {
            clientX: dragEnd.x,
            clientY: dragEnd.y,
          }),
        );

        const text = dragYell?.textContent;

        document.dispatchEvent(
          createPointerEvent('pointerup', {
            clientX: dragEnd.x,
            clientY: dragEnd.y,
          }),
        );

        return text;
      };

      expect([dragOnce(), dragOnce(), dragOnce(), dragOnce(), dragOnce()]).toEqual([
        'AAAAAA!!!',
        'Put me down!',
        'Let me go!',
        'Hey, careful!',
        'AAAAAA!!!',
      ]);

      manager.unmount();
      stage.remove();
    } finally {
      if (hadRequestAnimationFrame) {
        Object.defineProperty(window, 'requestAnimationFrame', {
          configurable: true,
          value: originalRequestAnimationFrame,
          writable: true,
        });
      } else {
        Reflect.deleteProperty(window, 'requestAnimationFrame');
      }
    }
  });

  it('lets Elara trail the gesture during drag, then settle on the saved placement', () => {
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const hadRequestAnimationFrame = 'requestAnimationFrame' in window;
    const hadCancelAnimationFrame = 'cancelAnimationFrame' in window;
    const frames = new Map();
    let nextFrame = 1;
    const requestAnimationFrame = vi.fn((callback) => {
      const frame = nextFrame;
      nextFrame += 1;
      frames.set(frame, callback);
      return frame;
    });
    const cancelAnimationFrame = vi.fn((frame) => {
      frames.delete(frame);
    });
    const flushFrames = (limit = 30) => {
      for (let count = 0; count < limit && frames.size > 0; count += 1) {
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach((callback) => callback(count));
      }
    };

    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: requestAnimationFrame,
      writable: true,
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: cancelAnimationFrame,
      writable: true,
    });

    try {
      const storage = createMemoryStorage();
      const stage = document.createElement('section');
      const manager = new TutorialHintManager({ storage });

      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      document.body.append(stage);

      manager.mount(stage);
      manager.showLesson({
        id: 'drag-trail-test',
        title: 'lesson',
        text: 'move me',
        stepLabel: '1/1',
      });

      const button = stage.querySelector('.tutorial-layer__lesson-button');
      const lesson = stage.querySelector('.tutorial-layer__lesson');
      const startLeft = Number.parseFloat(button?.style.left ?? '0');
      const startTop = Number.parseFloat(button?.style.top ?? '0');
      const dragStart = {
        x: (startLeft + 10) * UI_SCALE,
        y: (startTop + 20) * UI_SCALE,
      };
      const dragEnd = {
        x: dragStart.x,
        y: dragStart.y - 30 * UI_SCALE,
      };

      button?.dispatchEvent(
        createPointerEvent('pointerdown', {
          clientX: dragStart.x,
          clientY: dragStart.y,
        }),
      );
      document.dispatchEvent(
        createPointerEvent('pointermove', {
          clientX: dragEnd.x,
          clientY: dragEnd.y,
        }),
      );

      expect(button?.style.top).toBe(`${startTop - 30}px`);
      expect(button?.style.translate).toBe('0px 18px');
      expect(lesson?.style.translate).toBe('0px 18px');

      document.dispatchEvent(
        createPointerEvent('pointerup', {
          clientX: dragEnd.x,
          clientY: dragEnd.y,
        }),
      );
      flushFrames();

      expect(button?.style.translate).toBe('');
      expect(lesson?.style.translate).toBe('');
      expect(JSON.parse(storage.getItem('idle-wizard.tutorial.elaraPlacement.v1'))).toEqual({
        buttonLeft: startLeft,
        buttonTop: startTop - 30,
      });

      manager.unmount();
      stage.remove();
    } finally {
      if (hadRequestAnimationFrame) {
        Object.defineProperty(window, 'requestAnimationFrame', {
          configurable: true,
          value: originalRequestAnimationFrame,
          writable: true,
        });
      } else {
        Reflect.deleteProperty(window, 'requestAnimationFrame');
      }

      if (hadCancelAnimationFrame) {
        Object.defineProperty(window, 'cancelAnimationFrame', {
          configurable: true,
          value: originalCancelAnimationFrame,
          writable: true,
        });
      } else {
        Reflect.deleteProperty(window, 'cancelAnimationFrame');
      }
    }
  });

  it('temporarily moves an open lesson away from its target, then returns', () => {
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const originalSetTimeout = window.setTimeout;
    const hadRequestAnimationFrame = 'requestAnimationFrame' in window;
    const hadCancelAnimationFrame = 'cancelAnimationFrame' in window;
    const frames = [];
    const requestAnimationFrame = vi.fn((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const cancelAnimationFrame = vi.fn();
    const flushFrames = (...timestamps) => {
      timestamps.forEach((timestamp) => {
        frames.splice(0).forEach((callback) => callback(timestamp));
      });
    };

    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: requestAnimationFrame,
      writable: true,
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: cancelAnimationFrame,
      writable: true,
    });
    Object.defineProperty(window, 'setTimeout', {
      configurable: true,
      value: vi.fn((callback) => {
        callback();
        return 1;
      }),
      writable: true,
    });

    try {
      const storage = createMemoryStorage();
      const stage = document.createElement('section');
      const target = document.createElement('button');
      const manager = new TutorialHintManager({ storage });

      target.dataset.tutorialId = 'workshop:summon';
      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      setClientRect(
        target,
        toClientRect({
          left: 100,
          top: 530,
          width: 92,
          height: 24,
        }),
      );
      stage.append(target);
      document.body.append(stage);

      manager.mount(stage);
      manager.showLesson({
        id: 'auto-move-base',
        title: 'lesson',
        text: 'look here',
        stepLabel: '1/1',
        canShowTarget: true,
      });

      const button = stage.querySelector('.tutorial-layer__lesson-button');
      const lesson = stage.querySelector('.tutorial-layer__lesson');
      const baseButtonTop = Number.parseFloat(button?.style.top ?? '0');
      const baseLessonRect = getLessonRect(lesson);
      const targetProtectedRect = { left: 92, top: 522, right: 200, bottom: 562 };

      manager.guideDragManager.setPlacement({
        buttonLeft: Number.parseFloat(button?.style.left ?? '0'),
        buttonTop: baseButtonTop,
      });
      manager.showLesson({
        id: 'auto-move-target',
        title: 'lesson',
        text: 'look here',
        stepLabel: '1/1',
        canShowTarget: true,
        target,
      });

      expect(Number.parseFloat(button?.style.top ?? '0')).toBe(baseButtonTop);
      expect(getLessonRect(lesson)).toEqual(baseLessonRect);
      expect(button?.classList.contains('is-auto-moving')).toBe(true);
      expect(lesson?.classList.contains('is-auto-moving')).toBe(true);
      expect(button?.style.translate).toBe('');
      expect(lesson?.style.translate).toBe('');

      manager.showLesson({
        id: 'auto-move-target',
        title: 'lesson',
        text: 'look here',
        stepLabel: '1/1',
        canShowTarget: true,
        target,
      });

      expect(Number.parseFloat(button?.style.top ?? '0')).toBe(baseButtonTop);
      expect(getLessonRect(lesson)).toEqual(baseLessonRect);

      flushFrames(0, 112);

      expect(Number.parseFloat(button?.style.top ?? '0')).not.toBe(baseButtonTop);
      expect(getLessonRect(lesson)).not.toEqual(baseLessonRect);
      expect(button?.style.translate).toBe('');
      expect(lesson?.style.translate).toBe('');

      flushFrames(225);

      const movedLessonRect = getLessonRect(lesson);
      const movedButtonTop = Number.parseFloat(button?.style.top ?? '0');

      expect(overlaps(movedLessonRect, targetProtectedRect)).toBe(false);
      expect(movedButtonTop).not.toBe(baseButtonTop);
      expect(button?.style.translate).toBe('');
      expect(lesson?.style.translate).toBe('');
      expect(button?.classList.contains('is-auto-moving')).toBe(false);
      expect(lesson?.classList.contains('is-auto-moving')).toBe(false);

      manager.showLesson({
        id: 'auto-move-clear',
        title: 'lesson',
        text: 'look here',
        stepLabel: '1/1',
        canShowTarget: true,
      });

      expect(Number.parseFloat(button?.style.top ?? '0')).toBe(movedButtonTop);
      expect(getLessonRect(lesson)).toEqual(movedLessonRect);
      expect(button?.classList.contains('is-auto-moving')).toBe(true);
      expect(lesson?.classList.contains('is-auto-moving')).toBe(true);

      manager.showLesson({
        id: 'auto-move-clear',
        title: 'lesson',
        text: 'look here',
        stepLabel: '1/1',
        canShowTarget: true,
      });

      expect(Number.parseFloat(button?.style.top ?? '0')).toBe(movedButtonTop);
      expect(getLessonRect(lesson)).toEqual(movedLessonRect);

      flushFrames(225, 450);

      expect(Number.parseFloat(button?.style.top ?? '0')).toBe(baseButtonTop);
      expect(getLessonRect(lesson)).toEqual(baseLessonRect);
      expect(button?.style.translate).toBe('');
      expect(lesson?.style.translate).toBe('');

      manager.unmount();
      stage.remove();
    } finally {
      Object.defineProperty(window, 'setTimeout', {
        configurable: true,
        value: originalSetTimeout,
        writable: true,
      });

      if (hadRequestAnimationFrame) {
        Object.defineProperty(window, 'requestAnimationFrame', {
          configurable: true,
          value: originalRequestAnimationFrame,
          writable: true,
        });
      } else {
        Reflect.deleteProperty(window, 'requestAnimationFrame');
      }

      if (hadCancelAnimationFrame) {
        Object.defineProperty(window, 'cancelAnimationFrame', {
          configurable: true,
          value: originalCancelAnimationFrame,
          writable: true,
        });
      } else {
        Reflect.deleteProperty(window, 'cancelAnimationFrame');
      }
    }
  });

  it('animates the open lesson away from the fast-sell tab strip target', () => {
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const hadRequestAnimationFrame = 'requestAnimationFrame' in window;
    const hadCancelAnimationFrame = 'cancelAnimationFrame' in window;
    const frames = [];
    const requestAnimationFrame = vi.fn((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const cancelAnimationFrame = vi.fn();
    const flushFrames = (...timestamps) => {
      timestamps.forEach((timestamp) => {
        frames.splice(0).forEach((callback) => callback(timestamp));
      });
    };

    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: requestAnimationFrame,
      writable: true,
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: cancelAnimationFrame,
      writable: true,
    });

    try {
      const stage = document.createElement('section');
      const tabs = document.createElement('div');
      const herbsTab = document.createElement('button');
      const manager = new TutorialHintManager({ storage: createMemoryStorage() });
      const tabStrip = {
        left: 64,
        top: 336,
        right: 296,
        bottom: 382,
      };

      tabs.className = 'shop-page__direct-sell-tabs';
      herbsTab.className = 'style-button shop-page__direct-sell-tab-button';
      herbsTab.dataset.tutorialId = 'shop:directSell:tab:herb';
      tabs.append(herbsTab);
      stage.append(tabs);
      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      setClientRect(
        tabs,
        toClientRect({
          left: tabStrip.left,
          top: tabStrip.top,
          width: tabStrip.right - tabStrip.left,
          height: tabStrip.bottom - tabStrip.top,
        }),
      );
      setClientRect(
        herbsTab,
        toClientRect({
          left: 142,
          top: 330,
          width: 76,
          height: 12,
        }),
      );
      document.body.append(stage);

      useFixedLessonSize(manager);
      manager.mount(stage);
      manager.guideDragManager.setPlacement({ buttonLeft: 4, buttonTop: 363 }, { save: false });
      manager.showLesson({
        id: 'fast-sell-tab-base',
        title: 'lesson 4: gardening',
        text: 'open herbs tab',
        stepLabel: '21/31',
        canShowTarget: true,
      });

      const button = stage.querySelector('.tutorial-layer__lesson-button');
      const lesson = stage.querySelector('.tutorial-layer__lesson');
      const baseLessonRect = getLessonRect(lesson);

      expect(overlaps(baseLessonRect, tabStrip)).toBe(true);

      manager.showLesson({
        id: 'fast-sell-tab-target',
        title: 'lesson 4: gardening',
        text: 'open herbs tab',
        stepLabel: '21/31',
        canShowTarget: true,
        target: herbsTab,
      });

      expect(getLessonRect(lesson)).toEqual(baseLessonRect);
      expect(button?.classList.contains('is-auto-moving')).toBe(true);
      expect(lesson?.classList.contains('is-auto-moving')).toBe(true);

      flushFrames(0, 225);

      expect(overlaps(getLessonRect(lesson), tabStrip)).toBe(false);
      expect(overlaps(getLessonButtonRect(button), tabStrip)).toBe(false);
      expect(button?.classList.contains('is-auto-moving')).toBe(false);
      expect(lesson?.classList.contains('is-auto-moving')).toBe(false);

      manager.unmount();
      stage.remove();
    } finally {
      if (hadRequestAnimationFrame) {
        Object.defineProperty(window, 'requestAnimationFrame', {
          configurable: true,
          value: originalRequestAnimationFrame,
          writable: true,
        });
      } else {
        Reflect.deleteProperty(window, 'requestAnimationFrame');
      }

      if (hadCancelAnimationFrame) {
        Object.defineProperty(window, 'cancelAnimationFrame', {
          configurable: true,
          value: originalCancelAnimationFrame,
          writable: true,
        });
      } else {
        Reflect.deleteProperty(window, 'cancelAnimationFrame');
      }
    }
  });

  it('moves the open lesson below summon when the next visible target is above', () => {
    const stage = document.createElement('section');
    const requirement = document.createElement('button');
    const summonButton = document.createElement('button');
    const summonCircle = document.createElement('span');
    const summonText = document.createElement('span');
    const manager = new TutorialHintManager({ storage: createMemoryStorage() });
    const summonTargetRect = {
      left: 136,
      top: 495,
      right: 224,
      bottom: 534,
    };
    const summonCircleRect = {
      left: 82,
      top: 400,
      right: 278,
      bottom: 490,
    };

    requirement.dataset.tutorialId = 'task:level1-sage-seeds';
    summonButton.className = 'style-button workshop-page__summon-button';
    summonButton.dataset.tutorialId = 'workshop:summonSeed';
    summonCircle.className = 'workshop-page__summon-circle';
    summonText.className = 'workshop-page__summon-button-text';
    summonButton.append(summonCircle, summonText);
    stage.append(requirement, summonButton);
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(
      requirement,
      toClientRect({
        left: 24,
        top: 84,
        width: 312,
        height: 58,
      }),
    );
    setClientRect(
      summonButton,
      toClientRect({
        left: summonTargetRect.left,
        top: summonTargetRect.top,
        width: summonTargetRect.right - summonTargetRect.left,
        height: summonTargetRect.bottom - summonTargetRect.top,
      }),
    );
    setClientRect(
      summonCircle,
      toClientRect({
        left: summonCircleRect.left,
        top: summonCircleRect.top,
        width: summonCircleRect.right - summonCircleRect.left,
        height: summonCircleRect.bottom - summonCircleRect.top,
      }),
    );
    setClientRect(
      summonText,
      toClientRect({
        left: summonTargetRect.left,
        top: summonTargetRect.top,
        width: summonTargetRect.right - summonTargetRect.left,
        height: summonTargetRect.bottom - summonTargetRect.top,
      }),
    );
    document.body.append(stage);

    useFixedLessonSize(manager);
    manager.mount(stage);
    manager.showLesson({
      id: 'summon-flow-above',
      title: 'lesson 1: introduction',
      text: 'summon and turn in sage seeds for the next level',
      stepLabel: '8/32',
      canShowTarget: true,
      target: summonButton,
    });

    const elaraButton = stage.querySelector('.tutorial-layer__lesson-button');
    const lesson = stage.querySelector('.tutorial-layer__lesson');
    const lessonRect = getLessonRect(lesson);

    expect(lessonRect.top).toBeGreaterThanOrEqual(summonTargetRect.bottom);
    expect(overlaps(lessonRect, summonTargetRect)).toBe(false);
    expect(overlaps(lessonRect, summonCircleRect)).toBe(false);
    expect(overlaps(getLessonButtonRect(elaraButton), summonTargetRect)).toBe(false);

    manager.unmount();
    stage.remove();
  });

  it('keeps the default lesson placement when it already clears the summon target', () => {
    const stage = document.createElement('section');
    const requirement = document.createElement('button');
    const summonButton = document.createElement('button');
    const summonCircle = document.createElement('span');
    const summonText = document.createElement('span');
    const manager = new TutorialHintManager({ storage: createMemoryStorage() });
    const summonTargetRect = {
      left: 136,
      top: 400,
      right: 224,
      bottom: 439,
    };
    const summonCircleRect = {
      left: 82,
      top: 305,
      right: 278,
      bottom: 395,
    };

    requirement.dataset.tutorialId = 'task:level1-sage-seeds';
    summonButton.className = 'style-button workshop-page__summon-button';
    summonButton.dataset.tutorialId = 'workshop:summonSeed';
    summonCircle.className = 'workshop-page__summon-circle';
    summonText.className = 'workshop-page__summon-button-text';
    summonButton.append(summonCircle, summonText);
    stage.append(requirement, summonButton);
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(
      requirement,
      toClientRect({
        left: 24,
        top: 84,
        width: 312,
        height: 58,
      }),
    );
    setClientRect(
      summonButton,
      toClientRect({
        left: summonTargetRect.left,
        top: summonTargetRect.top,
        width: summonTargetRect.right - summonTargetRect.left,
        height: summonTargetRect.bottom - summonTargetRect.top,
      }),
    );
    setClientRect(
      summonCircle,
      toClientRect({
        left: summonCircleRect.left,
        top: summonCircleRect.top,
        width: summonCircleRect.right - summonCircleRect.left,
        height: summonCircleRect.bottom - summonCircleRect.top,
      }),
    );
    setClientRect(
      summonText,
      toClientRect({
        left: summonTargetRect.left,
        top: summonTargetRect.top,
        width: summonTargetRect.right - summonTargetRect.left,
        height: summonTargetRect.bottom - summonTargetRect.top,
      }),
    );
    document.body.append(stage);

    useFixedLessonSize(manager);
    manager.mount(stage);
    manager.showLesson({
      id: 'summon-flow-clear',
      title: 'lesson 1: introduction',
      text: 'summon and turn in sage seeds for the next level',
      stepLabel: '8/32',
      canShowTarget: true,
      target: summonButton,
    });

    const elaraButton = stage.querySelector('.tutorial-layer__lesson-button');
    const lesson = stage.querySelector('.tutorial-layer__lesson');
    const lessonRect = getLessonRect(lesson);

    expect(Number.parseFloat(lesson?.style.top ?? 'NaN')).toBe(520);
    expect(overlaps(lessonRect, summonTargetRect)).toBe(false);
    expect(overlaps(lessonRect, summonCircleRect)).toBe(false);
    expect(overlaps(getLessonButtonRect(elaraButton), summonTargetRect)).toBe(false);

    manager.unmount();
    stage.remove();
  });

  it('keeps the player dragged position after an automatic target dodge', () => {
    const storage = createMemoryStorage();
    const stage = document.createElement('section');
    const target = document.createElement('button');
    const manager = new TutorialHintManager({ storage });

    target.dataset.tutorialId = 'workshop:summon';
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(
      target,
      toClientRect({
        left: 100,
        top: 530,
        width: 92,
        height: 24,
      }),
    );
    stage.append(target);
    document.body.append(stage);

    manager.mount(stage);
    manager.showLesson({
      id: 'auto-drag-base',
      title: 'lesson',
      text: 'look here',
      stepLabel: '1/1',
      canShowTarget: true,
    });

    const button = stage.querySelector('.tutorial-layer__lesson-button');
    const baseButtonTop = Number.parseFloat(button?.style.top ?? '0');

    manager.guideDragManager.setPlacement({
      buttonLeft: Number.parseFloat(button?.style.left ?? '0'),
      buttonTop: baseButtonTop,
    });
    manager.showLesson({
      id: 'auto-drag-target',
      title: 'lesson',
      text: 'look here',
      stepLabel: '1/1',
      canShowTarget: true,
      target,
    });

    const autoButtonTop = Number.parseFloat(button?.style.top ?? '0');
    const dragStart = {
      x: (Number.parseFloat(button?.style.left ?? '0') + 10) * UI_SCALE,
      y: (autoButtonTop + 20) * UI_SCALE,
    };
    const dragEnd = {
      x: dragStart.x,
      y: dragStart.y - 18 * UI_SCALE,
    };

    button?.dispatchEvent(
      createPointerEvent('pointerdown', {
        clientX: dragStart.x,
        clientY: dragStart.y,
      }),
    );
    document.dispatchEvent(
      createPointerEvent('pointermove', {
        clientX: dragEnd.x,
        clientY: dragEnd.y,
      }),
    );
    document.dispatchEvent(
      createPointerEvent('pointerup', {
        clientX: dragEnd.x,
        clientY: dragEnd.y,
      }),
    );

    const savedPlacement = JSON.parse(storage.getItem('idle-wizard.tutorial.elaraPlacement.v1'));

    expect(savedPlacement).toEqual({
      buttonLeft: 4,
      buttonTop: autoButtonTop - 18,
    });

    manager.showLesson({
      id: 'auto-drag-clear',
      title: 'lesson',
      text: 'look here',
      stepLabel: '1/1',
      canShowTarget: true,
    });

    expect(Number.parseFloat(button?.style.top ?? '0')).toBe(autoButtonTop - 18);
    expect(Number.parseFloat(button?.style.top ?? '0')).not.toBe(baseButtonTop);

    manager.unmount();
    stage.remove();
  });

  it('lets the collapsed Elara button move slightly past the left edge', () => {
    const storage = createMemoryStorage();
    const stage = document.createElement('section');
    const manager = new TutorialHintManager({ storage });

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showLesson({
      id: 'collapsed-left-drag',
      title: 'lesson',
      text: 'move me',
      stepLabel: '1/1',
      autoOpen: false,
    });

    const button = stage.querySelector('.tutorial-layer__lesson-button');
    const startLeft = Number.parseFloat(button?.style.left ?? '0');
    const startTop = Number.parseFloat(button?.style.top ?? '0');
    const dragStart = {
      x: (startLeft + 10) * UI_SCALE,
      y: (startTop + 20) * UI_SCALE,
    };
    const dragEnd = {
      x: dragStart.x - 50 * UI_SCALE,
      y: dragStart.y,
    };

    button?.dispatchEvent(
      createPointerEvent('pointerdown', {
        clientX: dragStart.x,
        clientY: dragStart.y,
      }),
    );
    document.dispatchEvent(
      createPointerEvent('pointermove', {
        clientX: dragEnd.x,
        clientY: dragEnd.y,
      }),
    );
    document.dispatchEvent(
      createPointerEvent('pointerup', {
        clientX: dragEnd.x,
        clientY: dragEnd.y,
      }),
    );

    expect(button?.style.left).toBe('-32px');
    expect(button?.style.top).toBe(`${startTop}px`);

    manager.unmount();
    stage.remove();
  });

  it('maps the old collapsed Elara left stop to the wider draggable range', () => {
    const storage = createMemoryStorage({
      'idle-wizard.tutorial.elaraPlacement.v1': JSON.stringify({
        buttonLeft: -8,
        buttonTop: 552,
      }),
    });
    const stage = document.createElement('section');
    const manager = new TutorialHintManager({ storage });

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showLesson({
      id: 'legacy-collapsed-left-stop',
      title: 'lesson',
      text: 'move me',
      stepLabel: '1/1',
      autoOpen: false,
    });

    expect(stage.querySelector('.tutorial-layer__lesson-button')?.style.left).toBe('-32px');

    manager.unmount();
    stage.remove();
  });

  it('pins the open lesson to the left even after a right-side drag', () => {
    const storage = createMemoryStorage({
      'idle-wizard.tutorial.elaraPlacement.v1': JSON.stringify({
        buttonLeft: 108,
        buttonTop: 552,
      }),
    });
    const stage = document.createElement('section');
    const manager = new TutorialHintManager({ storage });

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showLesson({
      id: 'drag-right-edge',
      title: 'lesson',
      text: 'drag Elara to move this lesson.',
      stepLabel: 'qa',
      canShowTarget: true,
    });

    const button = stage.querySelector('.tutorial-layer__lesson-button');
    const lesson = stage.querySelector('.tutorial-layer__lesson');

    expect(button?.style.left).toBe('4px');
    expect(lesson?.style.left).toBe('74px');
    expect(overlaps(getLessonButtonRect(button), getLessonRect(lesson))).toBe(false);

    manager.unmount();
    stage.remove();
  });

  it('shows a visible hide label on the open lesson toggle', () => {
    vi.useFakeTimers();

    try {
      const stage = document.createElement('section');
      const manager = new TutorialHintManager();

      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      document.body.append(stage);

      manager.mount(stage);
      manager.showLesson({
        id: 'finish-seed-task',
        title: 'lesson 1: introduction',
        text: 'summon and turn in sage seeds for the next level',
        stepLabel: '7/25',
        progress: { value: 1, max: 6 },
        progressLabel: '1/6 seeds',
      });

      const button = stage.querySelector('.tutorial-layer__lesson-button');
      const lesson = stage.querySelector('.tutorial-layer__lesson');

      expect(lesson?.querySelector('.tutorial-layer__lesson-close')).toBeNull();
      expect(button?.querySelector('.tutorial-layer__objective-button-label')?.textContent).toBe(
        'hide',
      );

      button?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(button?.hidden).toBe(false);
      expect(button?.dataset.notification).toBe('true');
      expect(button?.getAttribute('aria-expanded')).toBe('false');
      expect(lesson?.hidden).toBe(false);
      expect(lesson?.classList.contains('is-hiding')).toBe(true);
      expect(button?.classList.contains('is-collapsing')).toBe(true);
      expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(false);

      vi.advanceTimersByTime(260);

      expect(lesson?.hidden).toBe(true);
      expect(lesson?.classList.contains('is-hiding')).toBe(false);
      expect(button?.classList.contains('is-collapsing')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('can keep Elara quiet until passive attention is active', () => {
    const stage = document.createElement('section');
    const manager = new TutorialHintManager();

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showLesson({
      id: 'research-mint-seed',
      title: 'lesson 4: gardening',
      text: 'research mint seed',
      stepLabel: '19/25',
      attention: false,
      autoOpen: false,
    });

    const button = stage.querySelector('.tutorial-layer__lesson-button');
    const lesson = stage.querySelector('.tutorial-layer__lesson');

    expect(button?.hidden).toBe(false);
    expect(lesson?.hidden).toBe(true);
    expect(button?.dataset.notification).toBeUndefined();
    expect(button?.hasAttribute('data-attention')).toBe(false);
    expect(button?.querySelector('.tutorial-layer__objective-button-image')?.hidden).toBe(
      false,
    );
    expect(button?.querySelector('.tutorial-layer__objective-button-label')?.textContent).toBe(
      'help',
    );

    manager.setLessonAttention(true);

    expect(button?.dataset.notification).toBe('true');
    expect(button?.hasAttribute('data-attention')).toBe(true);

    button?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(lesson?.hidden).toBe(false);
    expect(button?.dataset.notification).toBeUndefined();
    expect(button?.hasAttribute('data-attention')).toBe(false);
    expect(button?.querySelector('.tutorial-layer__objective-button-image')?.hidden).toBe(
      false,
    );
    expect(button?.querySelector('.tutorial-layer__objective-button-label')?.textContent).toBe(
      'hide',
    );
  });

  it('does not include icon-off rules for the Elara lesson button', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');

    expect(baseCss).not.toMatch(/data-style-icons="none"/);
  });

  it('marks Elara as pressing until a tap releases', () => {
    const stage = document.createElement('section');
    const manager = new TutorialHintManager();

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showLesson({
      id: 'press-test',
      title: 'lesson',
      text: 'press me',
      stepLabel: '1/1',
    });

    const button = stage.querySelector('.tutorial-layer__lesson-button');
    const startLeft = Number.parseFloat(button?.style.left ?? '0');
    const startTop = Number.parseFloat(button?.style.top ?? '0');

    button?.dispatchEvent(
      createPointerEvent('pointerdown', {
        clientX: (startLeft + 10) * UI_SCALE,
        clientY: (startTop + 20) * UI_SCALE,
      }),
    );

    expect(button?.classList.contains('is-pressing')).toBe(true);

    document.dispatchEvent(
      createPointerEvent('pointerup', {
        clientX: (startLeft + 10) * UI_SCALE,
        clientY: (startTop + 20) * UI_SCALE,
      }),
    );

    expect(button?.classList.contains('is-pressing')).toBe(false);

    manager.unmount();
    stage.remove();
  });

  it('swings Elara only during drag and disables that animation for reduced motion', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const dragYellRule = baseCss.match(
      /\.tutorial-layer__objective-button-drag-yell\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const collapsedDragYellRule = baseCss.match(
      /\.tutorial-layer__objective-button\[aria-expanded="false"\]\s+\.tutorial-layer__objective-button-drag-yell\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const draggingYellRule = baseCss.match(
      /\.tutorial-layer__objective-button\.is-dragging\s+\.tutorial-layer__objective-button-drag-yell\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const dragImageRules = [
      ...baseCss.matchAll(
        /\.tutorial-layer__objective-button\.is-dragging\s+\.tutorial-layer__objective-button-image\s*\{(?<body>[^}]*)\}/g,
      ),
    ].map((match) => match.groups?.body ?? '');
    const pressImageRule = baseCss.match(
      /\.tutorial-layer__objective-button:is\(:active, \.is-pressing\):not\(\.is-dragging\)\s+\.tutorial-layer__objective-button-image\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const pressLabelRule = baseCss.match(
      /\.tutorial-layer__objective-button:is\(:active, \.is-pressing\):not\(\.is-dragging\)\s+\.tutorial-layer__objective-button-label\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(dragYellRule).toBeDefined();
    expect(dragYellRule).toMatch(/\btop:\s*9px;/);
    expect(dragYellRule).toMatch(/\bborder:\s*0;/);
    expect(dragYellRule).toMatch(/\bbackground:\s*transparent;/);
    expect(collapsedDragYellRule).toBeDefined();
    expect(collapsedDragYellRule).toMatch(/\btop:\s*22px;/);
    expect(collapsedDragYellRule).toMatch(/\bmax-width:\s*58px;/);
    expect(draggingYellRule).toBeDefined();
    expect(draggingYellRule).toMatch(/\bopacity:\s*1;/);
    expect(dragImageRules.some((rule) => /tutorial-elara-drag-swing/.test(rule))).toBe(true);
    expect(pressImageRule).toBeDefined();
    expect(pressImageRule).toMatch(/\bscale:\s*0\.965;/);
    expect(pressImageRule).toMatch(/\btranslate:\s*0 1px;/);
    expect(pressLabelRule).toBeDefined();
    expect(pressLabelRule).toMatch(/\btranslate:\s*0 1px;/);
    expect(baseCss).toMatch(/@keyframes tutorial-elara-drag-swing/);
    expect(baseCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.tutorial-layer__objective-button\.is-dragging\s+\.tutorial-layer__objective-button-image[\s\S]*animation:\s*none;/,
    );
  });

  it('shrinks Elara from the expanded portrait anchor into the help button', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const collapseStart = baseCss.indexOf(
      '@keyframes tutorial-elara-objective-collapse',
    );
    const collapseEnd = baseCss.indexOf('@keyframes tutorial-elara-help-label-snap');
    const collapseKeyframes = baseCss.slice(collapseStart, collapseEnd);
    const labelRule = baseCss.match(
      /\.tutorial-layer__objective-button\.is-collapsing\s+\.tutorial-layer__objective-button-label\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const imageRule = baseCss.match(
      /\.tutorial-layer__objective-button\.is-collapsing\s+\.tutorial-layer__objective-button-image\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(collapseStart).toBeGreaterThan(-1);
    expect(collapseEnd).toBeGreaterThan(collapseStart);
    expect(imageRule).toBeDefined();
    expect(imageRule).toMatch(/\bposition:\s*relative;/);
    expect(imageRule).toMatch(/\bwidth:\s*70px;/);
    expect(imageRule).toMatch(/\bheight:\s*91px;/);
    expect(imageRule).toMatch(
      /animation:\s*tutorial-elara-objective-collapse 250ms var\(--style-motion-ease-rubber\)\s+both;/,
    );
    expect(collapseKeyframes).toContain(
      'transform: translate(0, 0) scale(1);',
    );
    expect(collapseKeyframes).toContain(
      'transform: translate(7px, 5px) scale(0.61);',
    );
    expect(collapseKeyframes).toContain(
      'transform: translate(5.5px, 3.7px) scale(0.657);',
    );
    expect(labelRule).toBeDefined();
    expect(labelRule).toMatch(
      /animation:\s*tutorial-elara-help-label-snap 155ms var\(--style-motion-ease-rubber\)\s+95ms both;/,
    );
  });

  it('moves the lesson away from unlocked Workshop secondary controls', () => {
    const stage = document.createElement('section');
    const controls = [
      { className: 'workshop-page__leaderboard-button', left: 16, top: 496 },
      { className: 'workshop-page__trade-alliance-button', left: 190, top: 496 },
      { className: 'workshop-page__bag-button', left: 16, top: 536 },
      { className: 'workshop-page__discoveries-button', left: 190, top: 536 },
    ].map(({ className, left, top, width = 154 }) => {
      const button = document.createElement('button');
      button.className = className;
      setClientRect(
        button,
        toClientRect({
          left,
          top,
          width,
          height: 28,
        }),
      );
      stage.append(button);
      return {
        left,
        top,
        right: left + width,
        bottom: top + 28,
      };
    });
    const manager = new TutorialHintManager();
    useFixedLessonSize(manager);
    manager.getObjectiveProtectedRects = () => controls;
    manager.getObjectiveTargetProtectedRects = () => [];

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showLesson({
      id: 'research-mint-seed',
      title: 'lesson 4: gardening',
      text: 'research mint seed',
      stepLabel: '19/25',
      progress: { value: 0, max: 1 },
      progressLabel: '0/1 research',
    });

    const button = stage.querySelector('.tutorial-layer__lesson-button');
    const lesson = stage.querySelector('.tutorial-layer__lesson');
    const lessonRect = getLessonRect(lesson);
    const buttonRect = getLessonButtonRect(button);
    const lessonTop = Number.parseFloat(lesson?.style.top ?? 'NaN');

    expect(button?.style.left).toBe('4px');
    expect(lesson?.style.left).toBe('74px');
    expect(Number.isFinite(lessonTop)).toBe(true);
    expect(button?.style.top).toBe(
      `${lessonTop + getLessonOuterHeight(lesson) - 91 + 9}px`,
    );
    expect(controls.some((control) => overlaps(lessonRect, control))).toBe(false);
    expect(controls.some((control) => overlaps(buttonRect, control))).toBe(false);
  });

  it('keeps the expanded Workshop pin lesson on the lower side when that slot is clear', () => {
    const stage = document.createElement('section');
    const requirements = document.createElement('section');
    const pinButton = document.createElement('button');
    const summonButton = document.createElement('button');
    const summonCircle = document.createElement('span');
    const summonText = document.createElement('span');
    const summonInfoButton = document.createElement('button');
    const mailButton = document.createElement('button');
    const bagButton = document.createElement('button');
    const manager = new TutorialHintManager();
    const protectedAreas = [
      { left: 16, top: 82, right: 344, bottom: 248 },
      { left: 82, top: 398, right: 278, bottom: 488 },
      { left: 135, top: 424, right: 227, bottom: 456 },
      { left: 240, top: 388, right: 258, bottom: 406 },
      { left: 130, top: 500, right: 230, bottom: 528 },
      { left: 16, top: 540, right: 116, bottom: 568 },
    ];

    useFixedLessonSize(manager);
    requirements.className = 'workshop-page__tasks style-box is-expanded is-pinned';
    pinButton.className = 'workshop-page__tasks-pin';
    pinButton.dataset.tutorialId = 'workshop:tasksPin';
    summonButton.className = 'style-button workshop-page__summon-button';
    summonCircle.className = 'workshop-page__summon-circle';
    summonText.className = 'workshop-page__summon-button-text';
    summonInfoButton.className = 'workshop-page__summon-info-button';
    mailButton.className = 'style-button workshop-page__mail-button';
    bagButton.className = 'style-button workshop-page__bag-button';
    summonButton.append(summonCircle, summonText);
    requirements.append(pinButton);

    [
      requirements,
      summonCircle,
      summonButton,
      summonInfoButton,
      mailButton,
      bagButton,
    ].forEach((element, index) => {
      const rect = protectedAreas[index];
      setClientRect(
        element,
        toClientRect({
          left: rect.left,
          top: rect.top,
          width: rect.right - rect.left,
          height: rect.bottom - rect.top,
        }),
      );
    });
    setClientRect(
      pinButton,
      toClientRect({
        left: 20,
        top: 232,
        width: 34,
        height: 18,
      }),
    );
    stage.append(requirements, summonButton, summonInfoButton, mailButton, bagButton);
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showLesson({
      id: 'grow-sage-pin',
      title: 'lesson 4: gardening',
      text: 'pin level 3 requirements so they stay open.',
      stepLabel: '19/32',
      progress: { value: 0, max: 2 },
      progressLabel: '0/2 sage',
      canShowTarget: true,
      target: pinButton,
    });

    const button = stage.querySelector('.tutorial-layer__lesson-button');
    const lesson = stage.querySelector('.tutorial-layer__lesson');
    const lessonRect = getLessonRect(lesson);
    const buttonRect = getLessonButtonRect(button);

    expect(lessonRect.top).toBeGreaterThan(protectedAreas.at(-1).bottom);
    expect(protectedAreas.some((area) => overlaps(lessonRect, area))).toBe(false);
    expect(protectedAreas.some((area) => overlaps(buttonRect, area))).toBe(false);

    manager.unmount();
    stage.remove();
  });

  it('protects Workshop summon controls from open lesson placement', () => {
    const stage = document.createElement('section');
    const requirements = document.createElement('section');
    const summonButton = document.createElement('button');
    const summonInfoButton = document.createElement('button');
    const manager = new TutorialHintManager();
    useFixedLessonSize(manager, { height: 97 });

    requirements.className = 'workshop-page__tasks style-box is-expanded is-pinned';
    summonButton.className = 'style-button workshop-page__summon-button';
    summonInfoButton.className = 'workshop-page__summon-info-button';
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(
      requirements,
      toClientRect({
        left: 16,
        top: 82,
        width: 328,
        height: 252,
      }),
    );
    setClientRect(
      summonButton,
      toClientRect({
        left: 135,
        top: 410,
        width: 92,
        height: 32,
      }),
    );
    setClientRect(
      summonInfoButton,
      toClientRect({
        left: 240,
        top: 376,
        width: 18,
        height: 18,
      }),
    );
    stage.append(requirements, summonButton, summonInfoButton);
    document.body.append(stage);

    manager.mount(stage);
    manager.guideDragManager.setPlacement({ buttonLeft: 4, buttonTop: 352 }, { save: false });

    const protectedRects = manager.getObjectiveProtectedRects(null);

    expect(protectedRects).toContainEqual({
      left: 16,
      top: 82,
      right: 344,
      bottom: 334,
    });
    expect(protectedRects).toContainEqual({
      left: 135,
      top: 410,
      right: 227,
      bottom: 442,
    });
    expect(protectedRects).toContainEqual({
      left: 240,
      top: 376,
      right: 258,
      bottom: 394,
    });

    manager.showLesson({
      id: 'summon-protected',
      title: 'lesson 4: gardening',
      text: 'summon seed',
      stepLabel: '18/31',
      canShowTarget: true,
    });

    const lesson = stage.querySelector('.tutorial-layer__lesson');
    const lessonRect = getLessonRect(lesson);
    const requirementsRect = {
      left: 16,
      top: 82,
      right: 344,
      bottom: 334,
    };
    const summonRect = {
      left: 135,
      top: 410,
      right: 227,
      bottom: 442,
    };
    const infoRect = {
      left: 240,
      top: 376,
      right: 258,
      bottom: 394,
    };

    expect(overlaps(lessonRect, requirementsRect)).toBe(false);
    expect(overlaps(lessonRect, summonRect)).toBe(false);
    expect(overlaps(lessonRect, infoRect)).toBe(false);

    manager.unmount();
    stage.remove();
  });

  it('moves the lesson away from research sub-tabs', () => {
    const stage = document.createElement('section');
    const tabs = [
      { left: 16, top: 554, width: 110, height: 30 },
      { left: 130, top: 554, width: 110, height: 30 },
      { left: 244, top: 554, width: 118, height: 30 },
    ].map(({ left, top, width, height }) => {
      const button = document.createElement('button');
      button.className = 'research-page__tab-button';
      setClientRect(
        button,
        toClientRect({
          left,
          top,
          width,
          height,
        }),
      );
      stage.append(button);
      return {
        left,
        top,
        right: left + width,
        bottom: top + height,
      };
    });
    const manager = new TutorialHintManager();
    useFixedLessonSize(manager);
    manager.getObjectiveProtectedRects = () => tabs;
    manager.getObjectiveTargetProtectedRects = () => [];

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showLesson({
      id: 'research-mint-seed',
      title: 'lesson 4: gardening',
      text: 'research mint seed',
      stepLabel: '19/25',
      progress: { value: 0, max: 1 },
      progressLabel: '0/1 research',
      canShowTarget: true,
    });

    const button = stage.querySelector('.tutorial-layer__lesson-button');
    const lesson = stage.querySelector('.tutorial-layer__lesson');
    const lessonRect = getLessonRect(lesson);
    const buttonRect = getLessonButtonRect(button);
    const lessonTop = Number.parseFloat(lesson?.style.top ?? 'NaN');

    expect(Number.isFinite(lessonTop)).toBe(true);
    expect(button?.style.top).toBe(
      `${lessonTop + getLessonOuterHeight(lesson) - 91 + 9}px`,
    );
    expect(tabs.some((tab) => overlaps(lessonRect, tab))).toBe(false);
    expect(tabs.some((tab) => overlaps(buttonRect, tab))).toBe(false);
  });

  it('moves the lesson away from the active research row when sub-tabs block the lower slot', () => {
    const stage = document.createElement('section');
    const row = document.createElement('div');
    const target = document.createElement('button');
    const activeRow = {
      left: 16,
      top: 260,
      right: 344,
      bottom: 288,
    };
    const tabs = [
      { left: 16, top: 554, width: 110, height: 30 },
      { left: 130, top: 554, width: 110, height: 30 },
      { left: 244, top: 554, width: 118, height: 30 },
    ].map(({ left, top, width, height }) => {
      const button = document.createElement('button');
      button.className = 'research-page__tab-button';
      setClientRect(
        button,
        toClientRect({
          left,
          top,
          width,
          height,
        }),
      );
      stage.append(button);
      return {
        left,
        top,
        right: left + width,
        bottom: top + height,
      };
    });
    const manager = new TutorialHintManager();

    row.className = 'research-page__row';
    target.className = 'style-button research-page__research-button';
    target.dataset.tutorialId = 'research:unlockSeed:mintSeed';
    row.append(target);
    stage.append(row);
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(
      row,
      toClientRect({
        left: activeRow.left,
        top: activeRow.top,
        width: activeRow.right - activeRow.left,
        height: activeRow.bottom - activeRow.top,
      }),
    );
    setClientRect(
      target,
      toClientRect({
        left: 276,
        top: 263,
        width: 68,
        height: 22,
      }),
    );
    document.body.append(stage);

    manager.mount(stage);
    manager.showLesson({
      id: 'research-mint-seed',
      title: 'lesson 4: gardening',
      text: 'research mint seed',
      stepLabel: '19/25',
      progress: { value: 0, max: 1 },
      progressLabel: '0/1 research',
      canShowTarget: true,
      target,
    });

    const button = stage.querySelector('.tutorial-layer__lesson-button');
    const lesson = stage.querySelector('.tutorial-layer__lesson');
    const lessonRect = getLessonRect(lesson);
    const buttonRect = getLessonButtonRect(button);

    expect(overlaps(lessonRect, activeRow)).toBe(false);
    expect(overlaps(buttonRect, activeRow)).toBe(false);
    expect(tabs.some((tab) => overlaps(lessonRect, tab))).toBe(false);
    expect(tabs.some((tab) => overlaps(buttonRect, tab))).toBe(false);
  });

  it('keeps the brewing lesson below the cauldron status and above footer controls', () => {
    const stage = document.createElement('section');
    const herbs = document.createElement('section');
    const cauldron = document.createElement('section');
    const bagButton = document.createElement('button');
    const manager = new TutorialHintManager();
    const protectedAreas = [
      { left: 16, top: 82, right: 344, bottom: 177 },
      { left: 16, top: 203, right: 344, bottom: 335 },
      { left: 114, top: 536, right: 246, bottom: 564 },
    ];

    herbs.className = 'brewing-page__herbs';
    cauldron.className = 'brewing-page__cauldron';
    bagButton.className = 'brewing-page__potions-button';

    [herbs, cauldron, bagButton].forEach((element, index) => {
      const rect = protectedAreas[index];
      setClientRect(
        element,
        toClientRect({
          left: rect.left,
          top: rect.top,
          width: rect.right - rect.left,
          height: rect.bottom - rect.top,
        }),
      );
      stage.append(element);
    });
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showLesson({
      id: 'brew-mana-tonic',
      title: 'lesson 4: brewing',
      text: 'brew mana tonic',
      stepLabel: '29/31',
      progress: { value: 0, max: 1 },
      progressLabel: '0/1 potion',
      canShowTarget: true,
    });

    const button = stage.querySelector('.tutorial-layer__lesson-button');
    const lesson = stage.querySelector('.tutorial-layer__lesson');
    const lessonRect = getLessonRect(lesson);
    const buttonRect = getLessonButtonRect(button);

    expect(protectedAreas.some((area) => overlaps(lessonRect, area))).toBe(false);
    expect(protectedAreas.some((area) => overlaps(buttonRect, area))).toBe(false);
    expect(Number.parseFloat(lesson?.style.top ?? '0')).toBeGreaterThan(335);
  });

  it('shows only the lesson box while cueing the target from an open lesson', () => {
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
    manager.showLesson({
      id: 'prepare-seed-sale',
      title: 'lesson 2: market',
      text: 'summon one seed to sell',
      stepLabel: '9/25',
    });
    manager.showTargetCue({
      target,
    });

    expect(stage.querySelector('.tutorial-layer__lesson-button')?.hidden).toBe(false);
    expect(stage.querySelector('.tutorial-layer__lesson')?.hidden).toBe(false);
    expect(stage.querySelector('.tutorial-layer__hint')?.hidden).toBe(true);
    expect(stage.querySelector('.tutorial-layer__portrait')?.hidden).toBe(true);
    expect(stage.querySelector('.tutorial-layer__pointer')?.hidden).toBe(false);
  });

  it('can update an open lesson without hiding the active target cue', () => {
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
    manager.showLesson({
      id: 'prepare-seed-sale',
      title: 'lesson 2: market',
      text: 'summon one seed to sell',
      stepLabel: '9/25',
      canShowTarget: true,
    });
    manager.showTargetCue({ target });

    const pointer = stage.querySelector('.tutorial-layer__pointer');
    expect(pointer?.hidden).toBe(false);

    manager.showLesson({
      id: 'prepare-seed-sale',
      title: 'lesson 2: market',
      text: 'summon one seed to sell',
      stepLabel: '9/25',
      canShowTarget: true,
      hideTargetCue: false,
    });

    expect(pointer?.hidden).toBe(false);
    expect(pointer?.classList.contains('is-hiding')).toBe(false);
    expect(pointer?.dataset.placement).toBeTruthy();
  });

  it('opens the lesson panel again when a new lesson step starts', () => {
    const stage = document.createElement('section');
    const manager = new TutorialHintManager();

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showLesson({
      id: 'finish-seed-task',
      title: 'lesson 1: introduction',
      text: 'summon and turn in sage seeds for the next level',
      stepLabel: '7/25',
    });

    stage
      .querySelector('.tutorial-layer__lesson-button')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.tutorial-layer__lesson')?.hidden).toBe(false);
    expect(
      stage.querySelector('.tutorial-layer__lesson')?.classList.contains('is-hiding'),
    ).toBe(true);

    manager.showLesson({
      id: 'prepare-seed-sale',
      title: 'lesson 2: market',
      text: 'summon one seed to sell',
      stepLabel: '9/25',
    });

    expect(stage.querySelector('.tutorial-layer__lesson')?.hidden).toBe(false);
    expect(
      stage.querySelector('.tutorial-layer__lesson')?.classList.contains('is-hiding'),
    ).toBe(false);
    expect(
      stage.querySelector('.tutorial-layer__lesson-button')?.classList.contains('is-collapsing'),
    ).toBe(false);
    expect(
      stage.querySelector('.tutorial-layer__lesson-button')?.getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('runs lesson press handler from the open lesson panel and show-me action', () => {
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
    manager.showLesson({
      id: 'finish-seed-task',
      title: 'lesson 1: introduction',
      text: 'summon and turn in sage seeds for the next level',
      stepLabel: '7/25',
      canShowTarget: true,
    });

    stage
      .querySelector('.tutorial-layer__lesson')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.tutorial-layer__lesson-show')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(pressed).toBe(2);

    expect(stage.querySelector('.tutorial-layer__lesson-close')).toBeNull();

    stage
      .querySelector('.tutorial-layer__lesson-button')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(pressed).toBe(2);
  });

  it('does not revive a stale lesson button after the tutorial hides', () => {
    const stage = document.createElement('section');
    const manager = new TutorialHintManager();

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showLesson({
      id: 'brew-mana-tonic',
      title: 'lesson 4: brewing',
      text: 'brew mana tonic',
      stepLabel: '24/25',
    });

    const button = stage.querySelector('.tutorial-layer__lesson-button');

    expect(button?.hidden).toBe(false);

    manager.hide();
    manager.hidePrompt();

    expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(true);
    expect(button?.hidden).toBe(true);
    expect(button?.dataset.notification).toBeUndefined();
  });
});
