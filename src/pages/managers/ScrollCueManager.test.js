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

  it('supports inline cues without adding a sibling progress rail', async () => {
    const root = document.createElement('div');
    const panel = document.createElement('div');
    panel.className = 'style-page-scroll';
    panel.dataset.scrollCueProgress = 'inline';
    root.append(panel);
    document.body.append(root);

    Object.defineProperty(panel, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(panel, 'scrollHeight', { value: 300, configurable: true });
    panel.scrollTop = 100;

    const manager = new ScrollCueManager();
    manager.mount(root);
    await flushAnimationFrame();

    expect(panel.classList.contains('style-scroll-cue')).toBe(true);
    expect(panel.classList.contains('has-scroll-overflow')).toBe(true);
    expect(panel.classList.contains('has-bottom-overflow')).toBe(true);
    expect(panel.style.getPropertyValue('--style-scroll-progress')).toBe('50%');
    expect(panel.nextElementSibling).toBeNull();

    panel.scrollTop = 200;
    panel.dispatchEvent(new window.Event('scroll'));
    await flushAnimationFrame();

    expect(panel.style.getPropertyValue('--style-scroll-progress')).toBe('100%');
    expect(panel.classList.contains('has-bottom-overflow')).toBe(false);

    manager.unmount();

    expect(panel.classList.contains('style-scroll-cue')).toBe(false);
    expect(panel.style.getPropertyValue('--style-scroll-progress')).toBe('');
  });

  it('standardizes page scroll cuts in CSS', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const rootRule = baseCss.match(/:root\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const pageScrollRule = baseCss.match(
      /\.style-page-scroll\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const dialogScrollRule = baseCss.match(
      /\.style-dialog-scroll\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const researchRule = baseCss.match(
      /\.research-page__box-list\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const gardenRule = baseCss.match(
      /\.garden-page__content\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(rootRule).toMatch(/--style-page-scroll-cut:\s*6px;/);
    expect(rootRule).toMatch(
      /--style-page-scroll-padding-top:\s*var\(--style-page-scroll-cut\);/,
    );
    expect(rootRule).toMatch(
      /--style-page-scroll-padding-bottom:\s*var\(--style-page-scroll-cut\);/,
    );
    expect(pageScrollRule).toMatch(
      /scroll-padding-top:\s*var\(--style-scroll-padding-top\);/,
    );
    expect(pageScrollRule).toMatch(
      /scroll-padding-bottom:\s*var\(--style-scroll-padding-bottom\);/,
    );
    expect(pageScrollRule).toMatch(/\btouch-action:\s*pan-y;/);
    expect(dialogScrollRule).toMatch(/\boverflow:\s*hidden auto;/);
    expect(dialogScrollRule).toMatch(/\btouch-action:\s*pan-y;/);
    expect(researchRule).toMatch(
      /padding-top:\s*var\(--style-page-scroll-padding-top\);/,
    );
    expect(researchRule).toMatch(
      /padding-bottom:\s*var\(--style-page-scroll-padding-bottom\);/,
    );
    expect(gardenRule).toMatch(
      /padding-top:\s*var\(--style-page-scroll-padding-top\);/,
    );
    expect(gardenRule).toMatch(
      /padding-bottom:\s*var\(--style-page-scroll-padding-bottom\);/,
    );
  });

  it('registers the personal tasks popup frame for shared scroll progress', async () => {
    const root = document.createElement('div');
    const frame = document.createElement('div');
    frame.className = 'workshop-page__personal-tasks-frame';
    root.append(frame);
    document.body.append(root);

    Object.defineProperty(frame, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(frame, 'scrollHeight', { value: 220, configurable: true });
    frame.scrollTop = 60;

    const manager = new ScrollCueManager();
    manager.mount(root);
    await flushAnimationFrame();

    expect(frame.classList.contains('style-scroll-cue')).toBe(true);
    expect(frame.nextElementSibling?.classList.contains('style-scroll-cue-progress')).toBe(
      true,
    );
    expect(
      frame.nextElementSibling?.querySelector('.style-scroll-cue-progress-fill')?.style
        .width,
    ).toBe('50%');

    manager.unmount();
  });

  it('registers the world event popup frame for shared scroll progress', async () => {
    const root = document.createElement('div');
    const frame = document.createElement('div');
    frame.className = 'workshop-page__world-notice-frame';
    root.append(frame);
    document.body.append(root);

    Object.defineProperty(frame, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(frame, 'scrollHeight', { value: 220, configurable: true });
    frame.scrollTop = 60;

    const manager = new ScrollCueManager();
    manager.mount(root);
    await flushAnimationFrame();

    expect(frame.classList.contains('style-scroll-cue')).toBe(true);
    expect(frame.nextElementSibling?.classList.contains('style-scroll-cue-progress')).toBe(
      true,
    );
    expect(
      frame.nextElementSibling?.querySelector('.style-scroll-cue-progress-fill')?.style
        .width,
    ).toBe('50%');

    manager.unmount();
  });

  it('registers dialog scroll panes for shared bottom progress', async () => {
    const root = document.createElement('div');
    const classNames = [
      'style-dialog-scroll',
      'shop-page__direct-sell-rows',
      'guild-page__popup-content',
      'room-alliance-info-content',
    ];
    const panes = [];

    for (const className of classNames) {
      const pane = document.createElement('div');
      pane.className = className;
      Object.defineProperty(pane, 'clientHeight', { value: 100, configurable: true });
      Object.defineProperty(pane, 'scrollHeight', { value: 220, configurable: true });
      pane.scrollTop = 60;
      panes.push(pane);
      root.append(pane);
    }

    document.body.append(root);

    const manager = new ScrollCueManager();
    manager.mount(root);
    await flushAnimationFrame();

    for (const pane of panes) {
      expect(pane.classList.contains('style-scroll-cue')).toBe(true);
      expect(pane.nextElementSibling?.classList.contains('style-scroll-cue-progress')).toBe(
        true,
      );
      expect(
        pane.nextElementSibling?.querySelector('.style-scroll-cue-progress-fill')?.style
          .width,
      ).toBe('50%');
    }

    manager.unmount();
  });

  it('ignores unrelated subtree text mutations', async () => {
    const root = document.createElement('div');
    const rows = document.createElement('div');
    const unrelated = document.createElement('p');
    rows.className = 'shop-page__stock-rows';
    root.append(rows, unrelated);
    document.body.append(root);

    let scrollHeightReads = 0;
    Object.defineProperty(rows, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(rows, 'scrollHeight', {
      configurable: true,
      get: () => {
        scrollHeightReads += 1;
        return 300;
      },
    });

    const manager = new ScrollCueManager();
    manager.mount(root);
    await flushAnimationFrame();
    await flushAnimationFrame();
    await flushAnimationFrame();
    await flushAnimationFrame();

    scrollHeightReads = 0;
    unrelated.textContent = 'typing elsewhere';
    await flushAnimationFrame();
    await flushAnimationFrame();

    expect(scrollHeightReads).toBe(0);

    manager.unmount();
  });

  it('updates an existing cue when its own content changes', async () => {
    const root = document.createElement('div');
    const rows = document.createElement('div');
    rows.className = 'shop-page__stock-rows';
    root.append(rows);
    document.body.append(root);

    let scrollHeightReads = 0;
    Object.defineProperty(rows, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(rows, 'scrollHeight', {
      configurable: true,
      get: () => {
        scrollHeightReads += 1;
        return 300;
      },
    });

    const manager = new ScrollCueManager();
    manager.mount(root);
    await flushAnimationFrame();
    await flushAnimationFrame();

    scrollHeightReads = 0;
    rows.append(document.createElement('span'));
    await flushAnimationFrame();
    await flushAnimationFrame();

    expect(scrollHeightReads).toBeGreaterThan(0);

    manager.unmount();
  });

  it('scans when a new cue element is added later', async () => {
    const root = document.createElement('div');
    document.body.append(root);

    const manager = new ScrollCueManager();
    manager.mount(root);

    const rows = document.createElement('div');
    rows.className = 'shop-page__stock-rows';
    root.append(rows);

    await flushAnimationFrame();
    await flushAnimationFrame();

    expect(rows.classList.contains('style-scroll-cue')).toBe(true);

    manager.unmount();
  });

  it('lets managed scroll progress use the shared progress rail height', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const progressRule = baseCss.match(/\.style-progress\s*\{(?<body>[^}]*)\}/)
      ?.groups?.body;
    const progressFillRule = baseCss.match(/\.style-progress__fill\s*\{(?<body>[^}]*)\}/)
      ?.groups?.body;
    const rule = baseCss.match(/(?:^|\n)\.style-scroll-cue-progress\s*\{(?<body>[^}]*)\}/)
      ?.groups?.body;

    expect(progressRule).toBeDefined();
    expect(progressFillRule).toBeDefined();
    expect(progressRule).toMatch(/\bflex:\s*0 0 auto;/);
    expect(progressRule).toMatch(/\bbox-sizing:\s*border-box;/);
    expect(progressRule).toMatch(
      /\bborder:\s*var\(--style-progress-rail-border\);/,
    );
    expect(progressFillRule).toMatch(/\bheight:\s*100%;/);
    expect(rule).toBeDefined();
    expect(rule).not.toMatch(/\bheight\s*:/);
    expect(rule).not.toMatch(/\bbox-sizing\s*:/);
  });

  it('keeps chat messages on the shared scroll progress rail height', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const rule = baseCss.match(
      /\.workshop-page__world-chat-messages \+ \.style-scroll-cue-progress\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(baseCss).not.toMatch(/--style-world-chat-scroll-progress-height:/);
    expect(rule).toBeDefined();
    expect(rule).not.toMatch(/\bheight\s*:/);
    expect(rule).not.toMatch(/\bbox-sizing\s*:/);
    expect(rule).toMatch(/\bmargin-top:\s*var\(--style-world-chat-progress-gap\);/);
    expect(rule).toMatch(/\bmargin-bottom:\s*var\(--style-world-chat-progress-gap\);/);
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
