// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PressFeedbackManager } from './PressFeedbackManager.js';
import { ScrollCueManager } from './ScrollCueManager.js';

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

  it('styles the scrolling element without appending a bottom progress rail', () => {
    const root = document.createElement('div');
    const rows = document.createElement('div');
    rows.className = 'style-page-scroll';
    root.append(rows);
    document.body.append(root);

    const manager = new ScrollCueManager();
    manager.mount(root);

    expect(rows.classList.contains('style-scroll-cue')).toBe(true);
    expect(rows.nextElementSibling).toBeNull();
    expect(root.querySelector('.style-scroll-cue-progress')).toBeNull();

    manager.unmount();

    expect(rows.classList.contains('style-scroll-cue')).toBe(false);
  });

  it('does not treat unrelated content as a scroll cue', () => {
    const root = document.createElement('div');
    const content = document.createElement('div');
    content.className = 'room-top-panel__level-content';
    root.append(content);
    document.body.append(root);

    const manager = new ScrollCueManager();
    manager.mount(root);

    expect(content.classList.contains('style-scroll-cue')).toBe(false);

    manager.unmount();
  });

  it('registers every scroll pane through one shared page-scroll class', () => {
    const root = document.createElement('div');
    const pane = document.createElement('div');
    pane.className = 'style-page-scroll workshop-page__world-notice-frame';
    const legacyPane = document.createElement('div');
    legacyPane.className = 'style-dialog-scroll';
    root.append(pane, legacyPane);
    document.body.append(root);

    const manager = new ScrollCueManager();
    manager.mount(root);

    expect(pane.classList.contains('style-scroll-cue')).toBe(true);
    expect(pane.nextElementSibling?.classList.contains('style-scroll-cue-progress')).not.toBe(
      true,
    );
    expect(legacyPane.classList.contains('style-scroll-cue')).toBe(false);

    manager.unmount();
  });

  it('scans when a new cue element is added later', async () => {
    const root = document.createElement('div');
    document.body.append(root);

    const manager = new ScrollCueManager();
    manager.mount(root);

    const rows = document.createElement('div');
    rows.className = 'style-page-scroll';
    root.append(rows);

    await flushAnimationFrame();
    await flushAnimationFrame();

    expect(rows.classList.contains('style-scroll-cue')).toBe(true);

    manager.unmount();
  });

  it('removes managed styling when an element stops being a cue', async () => {
    const root = document.createElement('div');
    const rows = document.createElement('div');
    rows.className = 'style-page-scroll';
    root.append(rows);
    document.body.append(root);

    const manager = new ScrollCueManager();
    manager.mount(root);
    rows.className = 'shop-page__static-rows';

    await flushAnimationFrame();
    await flushAnimationFrame();

    expect(rows.classList.contains('style-scroll-cue')).toBe(false);

    manager.unmount();
  });

  it('refreshes pane geometry when registration and content mutate together', () => {
    const { root, pane } = createScrollablePane();
    const manager = new ScrollCueManager();
    manager.mount(root);
    const cue = manager.cues.get(pane);
    const scheduleGeometryRefresh = vi.spyOn(
      cue,
      'scheduleGeometryRefresh',
    );

    manager.handleMutations([
      {
        type: 'attributes',
        target: pane,
        attributeName: 'class',
      },
      {
        type: 'childList',
        target: pane,
        addedNodes: [document.createElement('div')],
        removedNodes: [],
      },
    ]);

    expect(scheduleGeometryRefresh).toHaveBeenCalledOnce();

    manager.unmount();
  });

  it('uses Root Run station overscroll and compresses the thumb at both edges', () => {
    const { root, dialog, pane } = createScrollablePane();
    const manager = new ScrollCueManager();
    manager.mount(root);
    const cue = manager.cues.get(pane);
    const baseThumbHeight = Number.parseFloat(cue.overlayThumb.style.height);

    expect(cue.overlayHost).toBe(dialog);
    expect(cue.overlay.parentElement).toBe(dialog);

    cue.physics.scrollByElastic(-180);
    cue.applyScroll();

    expect(cue.physics.offset).toBeLessThan(0);
    expect(pane.firstElementChild?.dataset.scrollElasticEdge).toBe('top');
    expect(Number.parseFloat(cue.overlayThumb.style.height)).toBeLessThan(
      baseThumbHeight,
    );
    expect(Number.parseFloat(cue.overlayThumb.style.top)).toBeCloseTo(
      4.333333,
      5,
    );

    cue.physics.snapTo(cue.physics.maxOffset);
    cue.physics.scrollByElastic(180);
    cue.applyScroll();

    const bottomThumbHeight = Number.parseFloat(cue.overlayThumb.style.height);
    const bottomThumbTop = Number.parseFloat(cue.overlayThumb.style.top);
    expect(cue.physics.offset).toBeGreaterThan(cue.physics.maxOffset);
    expect(pane.lastElementChild?.dataset.scrollElasticEdge).toBe('bottom');
    expect(bottomThumbHeight).toBeLessThan(baseThumbHeight);
    expect(bottomThumbTop + bottomThumbHeight).toBeCloseTo(
      pane.clientHeight - 4.333333,
      5,
    );

    cue.physics.snapTo(0);
    cue.physics.scrollByElastic(-1_000_000);
    cue.applyScroll();

    expect(Number.parseFloat(cue.overlayThumb.style.height)).toBeCloseTo(
      13,
      5,
    );

    manager.unmount();
  });

  it('keeps a short station drag from firing a row tap', () => {
    const { root, pane } = createScrollablePane();
    const button = document.createElement('button');
    pane.append(button);
    let clicks = 0;
    button.addEventListener('click', () => {
      clicks += 1;
    });
    const pressManager = new PressFeedbackManager();
    pressManager.mount(root);
    const scrollManager = new ScrollCueManager();
    scrollManager.mount(root);

    dispatchPointer(button, 'pointerdown', {
      pointerId: 4,
      pointerType: 'touch',
      clientX: 40,
      clientY: 100,
    });
    dispatchPointer(document, 'pointermove', {
      pointerId: 4,
      pointerType: 'touch',
      clientX: 40,
      clientY: 105,
    });

    expect(pane.classList.contains('is-scroll-dragging')).toBe(true);

    dispatchPointer(document, 'pointerup', {
      pointerId: 4,
      pointerType: 'touch',
      clientX: 40,
      clientY: 105,
    });

    expect(clicks).toBe(0);

    scrollManager.unmount();
    pressManager.unmount();
  });

  it('preserves release inertia when its own managed scroll event fires', () => {
    const { root, pane } = createScrollablePane();
    const manager = new ScrollCueManager();
    manager.mount(root);
    const cue = manager.cues.get(pane);
    let nowMs = 0;
    cue.now = () => nowMs;

    cue.onPointerDown({
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      clientY: 160,
    });
    nowMs = 40;
    cue.onPointerMove({
      pointerId: 7,
      pointerType: 'touch',
      clientY: 100,
      cancelable: false,
    });
    nowMs = 45;
    cue.onPointerUp({
      pointerId: 7,
      pointerType: 'touch',
    });
    cue.cancelAnimationFrame();

    const releasedOffset = cue.physics.offset;
    cue.physics.update(1 / 60);
    cue.applyScroll();
    pane.dispatchEvent(new window.Event('scroll'));
    const firstInertiaOffset = cue.physics.offset;
    const releaseVelocity = cue.physics.velocity;
    cue.physics.update(1 / 60);

    expect(firstInertiaOffset).toBeGreaterThan(releasedOffset);
    expect(releaseVelocity).toBeGreaterThan(0);
    expect(cue.physics.offset).toBeGreaterThan(firstInertiaOffset);

    manager.unmount();
  });

  it('samples the final pointer-up position before releasing inertia', () => {
    const { root, pane } = createScrollablePane();
    const manager = new ScrollCueManager();
    manager.mount(root);
    const cue = manager.cues.get(pane);
    let nowMs = 0;
    cue.now = () => nowMs;

    cue.onPointerDown({
      pointerId: 8,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      clientY: 160,
    });
    nowMs = 40;
    cue.onPointerMove({
      pointerId: 8,
      pointerType: 'touch',
      clientY: 120,
      cancelable: false,
    });
    nowMs = 80;
    cue.onPointerUp({
      pointerId: 8,
      pointerType: 'touch',
      clientY: 80,
    });
    cue.cancelAnimationFrame();

    expect(cue.physics.offset).toBeCloseTo(
      cue.toRootRunUnits(80),
      10,
    );
    expect(cue.physics.velocity).toBeGreaterThan(0);

    manager.unmount();
  });

  it('stops release inertia immediately when reduced motion is requested', () => {
    const { root, pane } = createScrollablePane();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const manager = new ScrollCueManager();
    manager.mount(root);
    const cue = manager.cues.get(pane);
    let nowMs = 0;
    cue.now = () => nowMs;

    cue.onPointerDown({
      pointerId: 9,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      clientY: 160,
    });
    nowMs = 40;
    cue.onPointerMove({
      pointerId: 9,
      pointerType: 'touch',
      clientY: 100,
      cancelable: false,
    });
    cue.onPointerUp({
      pointerId: 9,
      pointerType: 'touch',
      clientY: 100,
    });

    expect(cue.animationFrame).toBe(0);
    expect(cue.physics.velocity).toBe(0);
    expect(cue.physics.offset).toBeGreaterThan(0);

    manager.unmount();
  });

  it('uses one page-scroll primitive for page and dialog viewports', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const rootRule = baseCss.match(/:root\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const pageScrollRule = baseCss.match(
      /\.style-page-scroll\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const dialogRule = baseCss.match(
      /\.style-dialog\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const dialogScrollRule = baseCss.match(
      /:where\(\.style-dialog\.style-page-scroll,\s*\.style-dialog \.style-page-scroll\)\s*\{(?<body>[^}]*)\}/,
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
    expect(rootRule).toMatch(/--style-dialog-scroll-padding-top:\s*12px;/);
    expect(dialogRule).toMatch(
      /--style-scroll-context-padding-top:\s*var\(\s*--style-dialog-scroll-padding-top\s*\);/,
    );
    expect(pageScrollRule).toMatch(
      /scroll-padding-top:\s*var\(--style-scroll-padding-top\);/,
    );
    expect(pageScrollRule).toMatch(
      /scroll-padding-bottom:\s*var\(--style-scroll-padding-bottom\);/,
    );
    expect(pageScrollRule).toMatch(/\bmin-height:\s*0;/);
    expect(pageScrollRule).toMatch(/\boverflow:\s*hidden auto;/);
    expect(pageScrollRule).toMatch(/\btouch-action:\s*pan-y;/);
    expect(dialogScrollRule).toMatch(/\bbox-sizing:\s*border-box;/);
    expect(dialogScrollRule).toMatch(
      /padding-top:\s*var\(--style-dialog-scroll-padding-top\);/,
    );
    expect(baseCss).not.toMatch(/\.style-dialog-scroll(?:\s|:|\{)/);
    expect(researchRule).toMatch(
      /padding-top:\s*var\(--style-page-scroll-padding-top\);/,
    );
    expect(researchRule).toMatch(
      /padding-bottom:\s*var\(--style-page-scroll-padding-bottom\);/,
    );
    expect(gardenRule).toMatch(
      /padding-top:\s*calc\(\s*var\(--style-page-scroll-padding-top\)\s*\+\s*var\(--garden-page-scroll-title-clearance\)\s*\);/,
    );
    expect(gardenRule).toMatch(
      /padding-bottom:\s*var\(--style-page-scroll-padding-bottom\);/,
    );
  });

  it('uses a Root Run station-style vertical track and thumb', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const rootRule = baseCss.match(/:root\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const cueRule = baseCss.match(
      /(?:^|\n)\.style-scroll-cue\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const scrollbarRule = baseCss.match(
      /(?:^|\n)\.style-scroll-cue::-webkit-scrollbar\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const trackRule = baseCss.match(
      /(?:^|\n)\.style-station-scrollbar__track\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const thumbRule = baseCss.match(
      /(?:^|\n)\.style-station-scrollbar__thumb\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const overlayRule = baseCss.match(
      /(?:^|\n)\.style-station-scrollbar\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(rootRule).toMatch(/--style-scrollbar-width:\s*6\.5px;/);
    expect(rootRule).toMatch(/--style-scrollbar-track-gap:\s*1\.805556px;/);
    expect(rootRule).toMatch(
      /--style-scrollbar-track-inset-block:\s*4\.333333px;/,
    );
    expect(rootRule).toMatch(
      /--style-scrollbar-track-border-width:\s*1\.083333px;/,
    );
    expect(rootRule).toMatch(
      /--style-scrollbar-track-background:\s*rgb\(23 16 12 \/ 62%\);/,
    );
    expect(rootRule).toMatch(
      /--style-scrollbar-track-border:\s*rgb\(0 0 0 \/ 72%\);/,
    );
    expect(rootRule).toMatch(/--style-scrollbar-thumb-gap:\s*1\.083333px;/);
    expect(rootRule).toMatch(
      /--style-scrollbar-thumb-border-width:\s*0\.722222px;/,
    );
    expect(rootRule).toMatch(
      /--style-scrollbar-thumb-min-height:\s*29\.611111px;/,
    );
    expect(rootRule).toMatch(/--style-scrollbar-thumb-background:\s*#f2ae54;/);
    expect(rootRule).toMatch(/--style-scrollbar-thumb-border:\s*#5e321b;/);
    expect(rootRule).not.toMatch(/--style-scroll-progress-block-size:/);
    expect(rootRule).not.toMatch(/--style-scroll-progress-height:/);
    expect(cueRule).toMatch(/\bscrollbar-width:\s*none;/);
    expect(cueRule).toMatch(/\btouch-action:\s*none;/);
    expect(scrollbarRule).toMatch(/\bdisplay:\s*none;/);
    expect(overlayRule).toMatch(/\bwidth:\s*var\(--style-scrollbar-width\);/);
    expect(trackRule).toMatch(
      /\btop:\s*var\(--style-scrollbar-track-inset-block\);/,
    );
    expect(trackRule).toMatch(
      /\bbottom:\s*var\(--style-scrollbar-track-inset-block\);/,
    );
    expect(trackRule).toMatch(
      /\bborder:\s*var\(--style-scrollbar-track-border-width\)\s+solid\s+var\(--style-scrollbar-track-border\);/,
    );
    expect(trackRule).toMatch(/\bborder-radius:\s*999px;/);
    expect(thumbRule).toMatch(
      /\bleft:\s*var\(--style-scrollbar-thumb-gap\);/,
    );
    expect(thumbRule).toMatch(
      /\bborder:\s*var\(--style-scrollbar-thumb-border-width\)\s+solid\s+var\(--style-scrollbar-thumb-border\);/,
    );
    expect(thumbRule).toMatch(/\bborder-radius:\s*999px;/);
    expect(baseCss).not.toMatch(/\.style-scroll-cue-progress\s*\{/);
  });

  it('preserves the shared progress rail geometry for gameplay progress', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const progressRule = baseCss.match(/\.style-progress\s*\{(?<body>[^}]*)\}/)
      ?.groups?.body;
    const progressFillRule = baseCss.match(/\.style-progress__fill\s*\{(?<body>[^}]*)\}/)
      ?.groups?.body;

    expect(progressRule).toBeDefined();
    expect(progressFillRule).toBeDefined();
    expect(progressRule).toMatch(/\bflex:\s*0 0 auto;/);
    expect(progressRule).toMatch(/\bbox-sizing:\s*border-box;/);
    expect(progressRule).toMatch(
      /\bborder:\s*var\(--style-progress-rail-border\);/,
    );
    expect(progressFillRule).toMatch(/\btop:\s*1px;/);
    expect(progressFillRule).toMatch(/\bbottom:\s*1px;/);
    expect(progressFillRule).toMatch(/\bheight:\s*auto;/);
    expect(progressFillRule).toMatch(/\bmax-width:\s*calc\(100% - 2px\);/);
  });
});

function flushAnimationFrame() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function createScrollablePane() {
  const root = document.createElement('div');
  const sourceLayer = document.createElement('div');
  const dialog = document.createElement('div');
  const pane = document.createElement('div');
  root.className = 'game-stage';
  sourceLayer.className = 'workshop-page__ui-layer';
  dialog.className = 'style-dialog';
  pane.className = 'style-page-scroll';
  dialog.append(pane);
  sourceLayer.append(dialog);
  root.append(sourceLayer);
  document.body.append(root);

  defineGeometry(root, {
    clientWidth: 390,
    clientHeight: 844,
    scrollHeight: 844,
    rect: { left: 0, top: 0, width: 390, height: 844 },
  });
  defineGeometry(sourceLayer, {
    clientWidth: 390,
    clientHeight: 844,
    scrollHeight: 844,
    rect: { left: 0, top: 0, width: 390, height: 844 },
  });
  defineGeometry(dialog, {
    clientWidth: 296,
    clientHeight: 256,
    offsetWidth: 300,
    offsetHeight: 260,
    clientLeft: 2,
    clientTop: 2,
    scrollHeight: 256,
    rect: { left: 10, top: 50, width: 300, height: 260 },
  });
  defineGeometry(pane, {
    clientWidth: 220,
    clientHeight: 200,
    scrollHeight: 800,
    rect: { left: 30, top: 80, width: 220, height: 200 },
  });

  return { root, sourceLayer, dialog, pane };
}

function defineGeometry(
  element,
  {
    clientWidth,
    clientHeight,
    offsetWidth = clientWidth,
    offsetHeight = clientHeight,
    clientLeft = 0,
    clientTop = 0,
    scrollHeight,
    rect,
  },
) {
  Object.defineProperties(element, {
    clientWidth: { configurable: true, value: clientWidth },
    clientHeight: { configurable: true, value: clientHeight },
    offsetWidth: { configurable: true, value: offsetWidth },
    offsetHeight: { configurable: true, value: offsetHeight },
    clientLeft: { configurable: true, value: clientLeft },
    clientTop: { configurable: true, value: clientTop },
    scrollHeight: { configurable: true, value: scrollHeight },
    getBoundingClientRect: {
      configurable: true,
      value: () => ({
        ...rect,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
      }),
    },
    getClientRects: {
      configurable: true,
      value: () => [{ ...rect }],
    },
  });
}

function dispatchPointer(target, type, options = {}) {
  const event = new window.Event(type, {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperties(event, {
    pointerId: { value: options.pointerId ?? 1 },
    pointerType: { value: options.pointerType ?? 'touch' },
    isPrimary: { value: options.isPrimary ?? true },
    button: { value: options.button ?? 0 },
    clientX: { value: options.clientX ?? 0 },
    clientY: { value: options.clientY ?? 0 },
  });
  target.dispatchEvent(event);
  return event;
}
