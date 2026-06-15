// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
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

  it('adds logs-style progress below registered scroll containers', async () => {
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
    expect(rows.classList.contains('has-bottom-overflow')).toBe(true);
    expect(rows.style.getPropertyValue('--style-scroll-progress')).toBe('');

    const progress = rows.nextElementSibling;

    expect(progress?.classList.contains('style-progress')).toBe(true);
    expect(progress?.classList.contains('style-scroll-cue-progress')).toBe(true);
    expect(progress?.hidden).toBe(false);
    expect(progress?.querySelector('.style-scroll-cue-progress-fill')?.style.width).toBe(
      '50%',
    );

    rows.scrollTop = 200;
    rows.dispatchEvent(new window.Event('scroll'));
    await flushAnimationFrame();

    expect(progress?.querySelector('.style-scroll-cue-progress-fill')?.style.width).toBe(
      '100%',
    );
    expect(rows.classList.contains('has-bottom-overflow')).toBe(false);

    manager.unmount();

    expect(rows.classList.contains('style-scroll-cue')).toBe(false);
    expect(rows.style.getPropertyValue('--style-scroll-progress')).toBe('');
    expect(root.querySelector('.style-scroll-cue-progress')).toBeNull();
  });

  it('hides managed progress when a scroll container has no overflow', async () => {
    const root = document.createElement('div');
    const rows = document.createElement('div');
    rows.className = 'shop-page__stock-rows';
    root.append(rows);
    document.body.append(root);

    Object.defineProperty(rows, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(rows, 'scrollHeight', { value: 100, configurable: true });

    const manager = new ScrollCueManager();
    manager.mount(root);
    await flushAnimationFrame();

    expect(rows.nextElementSibling?.classList.contains('style-scroll-cue-progress')).toBe(
      true,
    );
    expect(rows.nextElementSibling?.hidden).toBe(true);

    manager.unmount();
  });

  it('lets managed scroll progress use the shared progress rail height', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const progressRule = baseCss.match(/\.style-progress\s*\{(?<body>[^}]*)\}/)
      ?.groups?.body;
    const rule = baseCss.match(/\.style-scroll-cue-progress\s*\{(?<body>[^}]*)\}/)
      ?.groups?.body;

    expect(progressRule).toBeDefined();
    expect(progressRule).toMatch(/\bbox-sizing:\s*content-box;/);
    expect(rule).toBeDefined();
    expect(rule).not.toMatch(/\bheight\s*:/);
    expect(rule).not.toMatch(/\bbox-sizing\s*:/);
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
