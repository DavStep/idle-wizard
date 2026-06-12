// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrollCueManager, updateScrollCueState } from './ScrollCueManager.js';

describe('ScrollCueManager', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback) => {
      return window.setTimeout(() => callback(), 0);
    });
    vi.stubGlobal('cancelAnimationFrame', (frame) => window.clearTimeout(frame));
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it('adds progress and bottom overflow state to registered scroll containers', async () => {
    const root = document.createElement('div');
    const rows = document.createElement('div');
    rows.className = 'shop-page__stock-rows';
    root.append(rows);
    document.body.append(root);

    Object.defineProperty(rows, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(rows, 'scrollHeight', { value: 300, configurable: true });
    rows.scrollTop = 100;

    const manager = new ScrollCueManager();
    manager.mount(root);
    await flushAnimationFrame();

    expect(rows.classList.contains('style-scroll-cue')).toBe(true);
    expect(rows.classList.contains('has-scroll-overflow')).toBe(true);
    expect(rows.classList.contains('has-bottom-overflow')).toBe(true);
    expect(rows.style.getPropertyValue('--style-scroll-progress')).toBe('50%');

    rows.scrollTop = 200;
    rows.dispatchEvent(new window.Event('scroll'));
    await flushAnimationFrame();

    expect(rows.style.getPropertyValue('--style-scroll-progress')).toBe('100%');
    expect(rows.classList.contains('has-bottom-overflow')).toBe(false);

    manager.unmount();

    expect(rows.classList.contains('style-scroll-cue')).toBe(false);
    expect(rows.style.getPropertyValue('--style-scroll-progress')).toBe('');
  });

  it('shares progress math with framed scroll views', () => {
    const rows = document.createElement('div');
    const frame = document.createElement('div');
    const fill = document.createElement('div');
    Object.defineProperty(rows, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(rows, 'scrollHeight', { value: 300, configurable: true });
    rows.scrollTop = 100;

    const state = updateScrollCueState({
      scrollElement: rows,
      cueElement: frame,
      progressFill: fill,
      inlineCue: false,
    });

    expect(state.percent).toBe(50);
    expect(fill.style.width).toBe('50%');
    expect(frame.classList.contains('has-bottom-overflow')).toBe(true);
    expect(rows.style.getPropertyValue('--style-scroll-progress')).toBe('');
  });
});

function flushAnimationFrame() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}
