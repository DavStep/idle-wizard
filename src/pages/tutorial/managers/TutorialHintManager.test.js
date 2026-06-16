/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

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

describe('TutorialHintManager', () => {
  it('uses the pointer without drawing a target rectangle', () => {
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

    expect(pointer?.hidden).toBe(false);
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
    expect(pointer?.style.left).toBe('83px');
    expect(pointer?.style.top).toBe('53px');
    expect(pointer?.style.getPropertyValue('--tutorial-pointer-scale-x')).toBe('-1');
    expect(pointer?.style.getPropertyValue('--tutorial-pointer-rotation')).toBe('45deg');
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
      expect(pointer?.style.left).toBe('83px');
      expect(pointer?.style.top).toBe('53px');
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
    expect(pointer?.style.left).toBe('281px');
    expect(pointer?.style.top).toBe('631px');
    expect(pointer?.style.getPropertyValue('--tutorial-pointer-scale-x')).toBe('1');
    expect(pointer?.style.getPropertyValue('--tutorial-pointer-rotation')).toBe('45deg');
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

  it('sizes the lesson for final copy before the typewriter reveals it', () => {
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
        text: 'summon seeds and sell them for level-up gold',
        stepLabel: '11/25',
        progress: { value: 0, max: 10 },
        progressLabel: '0/10 gold',
        canShowTarget: true,
      });

      const longSize = {
        width: Number.parseFloat(lesson?.style.width ?? '0'),
        height: Number.parseFloat(lesson?.style.height ?? '0'),
      };

      expect(text?.textContent).toBe('');
      expect(text?.getAttribute('aria-label')).toBe(
        'summon seeds and sell them for level-up gold',
      );
      expect(longSize.width).toBeGreaterThanOrEqual(shortSize.width);
      expect(longSize.height).toBeGreaterThan(shortSize.height);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps lesson text open until the player closes it', () => {
    vi.useFakeTimers();

    try {
      const stage = document.createElement('section');
      const manager = new TutorialHintManager();
      const lessonText = 'summon seeds and fill the level task';

      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      document.body.append(stage);

      manager.mount(stage);
      manager.showLesson({
        id: 'finish-seed-task',
        title: 'lesson 1: introduction',
        text: lessonText,
        stepLabel: '7/25',
        progress: { value: 1, max: 10 },
        progressLabel: '1/10 seeds',
        canShowTarget: true,
      });

      const button = stage.querySelector('.tutorial-layer__lesson-button');
      const lesson = stage.querySelector('.tutorial-layer__lesson');
      const copy = stage.querySelector('.tutorial-layer__lesson-text');
      const showMe = stage.querySelector('.tutorial-layer__lesson-show');

      expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(false);
      expect(button?.hidden).toBe(false);
      expect(button?.style.left).toBe('4px');
      expect(button?.style.top).toBe(
        `${500 + getLessonOuterHeight(lesson) - 91 + 9}px`,
      );
      expect(button?.dataset.notification).toBeUndefined();
      expect(button?.getAttribute('aria-label')).toBe('close lesson');
      expect(button?.getAttribute('aria-expanded')).toBe('true');
      expect(button?.hasAttribute('data-speaking')).toBe(true);
      expect(lesson?.hidden).toBe(false);
      expect(lesson?.textContent).toContain('lesson 1: introduction');
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
      expect(button?.getAttribute('aria-label')).toBe('close lesson');
      expect(button?.getAttribute('aria-expanded')).toBe('true');
      expect(lesson?.hidden).toBe(false);

      button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(button?.hidden).toBe(false);
      expect(button?.dataset.notification).toBe('true');
      expect(button?.getAttribute('aria-label')).toBe('open lesson');
      expect(button?.getAttribute('aria-expanded')).toBe('false');
      expect(lesson?.hidden).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('omits the visible lesson close label', () => {
    const stage = document.createElement('section');
    const manager = new TutorialHintManager();

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    manager.mount(stage);
    manager.showLesson({
      id: 'finish-seed-task',
      title: 'lesson 1: introduction',
      text: 'summon seeds and fill the level task',
      stepLabel: '7/25',
      progress: { value: 1, max: 10 },
      progressLabel: '1/10 seeds',
    });

    const button = stage.querySelector('.tutorial-layer__lesson-button');
    const lesson = stage.querySelector('.tutorial-layer__lesson');

    expect(lesson?.querySelector('.tutorial-layer__lesson-close')).toBeNull();

    button?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(button?.hidden).toBe(false);
    expect(button?.dataset.notification).toBe('true');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(lesson?.hidden).toBe(true);
    expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(false);
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
      title: 'lesson 3: gardening',
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

    manager.setLessonAttention(true);

    expect(button?.dataset.notification).toBe('true');
    expect(button?.hasAttribute('data-attention')).toBe(true);

    button?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(lesson?.hidden).toBe(false);
    expect(button?.dataset.notification).toBeUndefined();
    expect(button?.hasAttribute('data-attention')).toBe(false);
  });

  it('moves the lesson away from unlocked Workshop secondary controls', () => {
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
    manager.showLesson({
      id: 'research-mint-seed',
      title: 'lesson 3: gardening',
      text: 'research mint seed',
      stepLabel: '19/25',
      progress: { value: 0, max: 1 },
      progressLabel: '0/1 research',
    });

    const button = stage.querySelector('.tutorial-layer__lesson-button');
    const lesson = stage.querySelector('.tutorial-layer__lesson');
    const lessonRect = getLessonRect(lesson);
    const buttonRect = getLessonButtonRect(button);

    expect(button?.style.left).toBe('4px');
    expect(lesson?.style.left).toBe('74px');
    expect(lesson?.style.top).toBe('260px');
    expect(button?.style.top).toBe(
      `${260 + getLessonOuterHeight(lesson) - 91 + 9}px`,
    );
    expect(controls.some((control) => overlaps(lessonRect, control))).toBe(false);
    expect(controls.some((control) => overlaps(buttonRect, control))).toBe(false);
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
      text: 'summon seeds and fill the level task',
      stepLabel: '7/25',
    });

    stage
      .querySelector('.tutorial-layer__lesson-button')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.tutorial-layer__lesson')?.hidden).toBe(true);

    manager.showLesson({
      id: 'prepare-seed-sale',
      title: 'lesson 2: market',
      text: 'summon one seed to sell',
      stepLabel: '9/25',
    });

    expect(stage.querySelector('.tutorial-layer__lesson')?.hidden).toBe(false);
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
      text: 'summon seeds and fill the level task',
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
