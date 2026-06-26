// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { gameViewport } from '../gameViewport.js';
import { ViewportScaleManager } from './ViewportScaleManager.js';

function setWindowSize({ width, height }) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
  });
}

function setVisualViewport({ height, offsetTop = 0 }) {
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: {
      height,
      offsetTop,
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  });
}

describe('ViewportScaleManager', () => {
  it('extends the stage width across a wide web viewport without changing source UI scale', () => {
    const stage = document.createElement('section');
    const manager = new ViewportScaleManager({ viewport: gameViewport });
    manager.stage = stage;
    setWindowSize({ width: 1280, height: 720 });

    manager.updateScale();

    const expectedViewportScale = 720 / gameViewport.height;
    expect(Number(stage.style.getPropertyValue('--viewport-scale'))).toBeCloseTo(
      expectedViewportScale,
    );
    expect(Number(stage.style.getPropertyValue('--style-ui-scale'))).toBeCloseTo(
      expectedViewportScale * 3,
    );
    expect(
      document.documentElement.style.getPropertyValue('--app-viewport-height'),
    ).toBe('720px');
    expect(document.documentElement.style.getPropertyValue('--app-stage-width')).toBe(
      '1280px',
    );
    expect(document.documentElement.style.getPropertyValue('--app-stage-height')).toBe(
      `${gameViewport.height * expectedViewportScale}px`,
    );
    expect(
      document.documentElement.style.getPropertyValue('--app-source-ui-screen-width'),
    ).toBe(`${gameViewport.width * expectedViewportScale}px`);
    expect(stage.style.getPropertyValue('--source-ui-scale')).toBe('3');
    expect(stage.dataset.viewportMode).toBe('web-wide');
    expect(
      document.documentElement.style.getPropertyValue('--app-visible-stage-height'),
    ).toBe(`${gameViewport.height * expectedViewportScale}px`);
    expect(document.documentElement.style.getPropertyValue('--app-keyboard-inset')).toBe(
      '0px',
    );
    expect(
      document.documentElement.style.getPropertyValue('--app-keyboard-dialog-shift'),
    ).toBe('0px');
    expect(
      document.documentElement.style.getPropertyValue('--app-keyboard-top-dialog-shift'),
    ).toBe('0px');
  });

  it('keeps the source UI at full mobile scale for the authored viewport', () => {
    const stage = document.createElement('section');
    const manager = new ViewportScaleManager({ viewport: gameViewport });
    manager.stage = stage;
    setWindowSize({ width: 1080, height: 2170 });

    manager.updateScale();

    expect(Number(stage.style.getPropertyValue('--viewport-scale'))).toBe(1);
    expect(Number(stage.style.getPropertyValue('--style-ui-scale'))).toBe(3);
    expect(stage.dataset.viewportMode).toBeUndefined();
  });

  it('keeps a narrow mobile viewport on the authored portrait stage width', () => {
    const stage = document.createElement('section');
    const manager = new ViewportScaleManager({ viewport: gameViewport });
    manager.stage = stage;
    setWindowSize({ width: 390, height: 844 });

    manager.updateScale();

    const expectedViewportScale = 390 / gameViewport.width;
    expect(Number(stage.style.getPropertyValue('--viewport-scale'))).toBeCloseTo(
      expectedViewportScale,
    );
    expect(document.documentElement.style.getPropertyValue('--app-stage-width')).toBe(
      `${gameViewport.width * expectedViewportScale}px`,
    );
    expect(document.documentElement.style.getPropertyValue('--app-stage-height')).toBe(
      `${gameViewport.height * expectedViewportScale}px`,
    );
    expect(
      document.documentElement.style.getPropertyValue('--app-source-ui-screen-width'),
    ).toBe(`${gameViewport.width * expectedViewportScale}px`);
    expect(stage.dataset.viewportMode).toBeUndefined();
  });

  it('keeps the layout scale stable when the mobile keyboard shrinks the viewport', () => {
    const stage = document.createElement('section');
    const input = document.createElement('input');
    const manager = new ViewportScaleManager({ viewport: gameViewport });
    manager.stage = stage;
    document.body.append(input);
    setWindowSize({ width: 1080, height: 2170 });
    manager.updateScale();

    input.focus();
    setWindowSize({ width: 1080, height: 1450 });
    manager.updateScale();

    expect(Number(stage.style.getPropertyValue('--viewport-scale'))).toBe(1);
    expect(Number(stage.style.getPropertyValue('--style-ui-scale'))).toBe(3);
    expect(
      document.documentElement.style.getPropertyValue('--app-viewport-height'),
    ).toBe('2170px');
    expect(
      document.documentElement.style.getPropertyValue('--app-visible-stage-height'),
    ).toBe('1450px');
    expect(document.documentElement.style.getPropertyValue('--app-keyboard-inset')).toBe(
      '720px',
    );
    expect(
      document.documentElement.style.getPropertyValue('--app-keyboard-dialog-shift'),
    ).toBe('-120px');
    expect(
      document.documentElement.style.getPropertyValue('--app-keyboard-top-dialog-shift'),
    ).toBe('-56px');

    input.remove();
  });

  it('locks the layout scale when keyboard resize arrives after text entry press but before focus', () => {
    const stage = document.createElement('section');
    const input = document.createElement('input');
    const manager = new ViewportScaleManager({ viewport: gameViewport });
    manager.stage = stage;
    document.body.append(input);
    setWindowSize({ width: 1080, height: 2170 });
    manager.updateScale();

    manager.handleTextEntryPressStart({ target: input });
    setWindowSize({ width: 1080, height: 1450 });
    manager.updateScale();

    expect(Number(stage.style.getPropertyValue('--viewport-scale'))).toBe(1);
    expect(Number(stage.style.getPropertyValue('--style-ui-scale'))).toBe(3);
    expect(
      document.documentElement.style.getPropertyValue('--app-viewport-height'),
    ).toBe('2170px');
    expect(
      document.documentElement.style.getPropertyValue('--app-visible-stage-height'),
    ).toBe('1450px');
    expect(
      document.documentElement.style.getPropertyValue('--app-keyboard-dialog-shift'),
    ).toBe('-120px');

    input.remove();
  });

  it('tracks keyboard overlap when visual viewport shrinks without layout resize', () => {
    const originalVisualViewport = window.visualViewport;
    const stage = document.createElement('section');
    const input = document.createElement('input');
    const manager = new ViewportScaleManager({ viewport: gameViewport });
    manager.stage = stage;
    document.body.append(input);
    setWindowSize({ width: 1080, height: 2170 });

    try {
      setVisualViewport({ height: 2170 });
      manager.updateScale();

      input.focus();
      setVisualViewport({ height: 1450 });
      manager.updateScale();

      expect(Number(stage.style.getPropertyValue('--viewport-scale'))).toBe(1);
      expect(Number(stage.style.getPropertyValue('--style-ui-scale'))).toBe(3);
      expect(
        document.documentElement.style.getPropertyValue('--app-viewport-height'),
      ).toBe('2170px');
      expect(
        document.documentElement.style.getPropertyValue('--app-visible-stage-height'),
      ).toBe('1450px');
      expect(document.documentElement.style.getPropertyValue('--app-keyboard-inset')).toBe(
        '720px',
      );
    } finally {
      Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        value: originalVisualViewport,
      });
      input.remove();
    }
  });

  it('keeps scale stable after text entry ends while the keyboard viewport is still smaller', () => {
    const stage = document.createElement('section');
    const input = document.createElement('input');
    const manager = new ViewportScaleManager({ viewport: gameViewport });
    manager.stage = stage;
    document.body.append(input);
    setWindowSize({ width: 1080, height: 2170 });
    manager.updateScale();
    input.focus();
    setWindowSize({ width: 1080, height: 1450 });
    manager.updateScale();

    input.blur();
    manager.updateScale();

    expect(Number(stage.style.getPropertyValue('--viewport-scale'))).toBe(1);
    expect(Number(stage.style.getPropertyValue('--style-ui-scale'))).toBe(3);
    expect(
      document.documentElement.style.getPropertyValue('--app-viewport-height'),
    ).toBe('2170px');

    setWindowSize({ width: 1080, height: 2170 });
    manager.updateScale();

    expect(Number(stage.style.getPropertyValue('--viewport-scale'))).toBe(1);
    expect(Number(stage.style.getPropertyValue('--style-ui-scale'))).toBe(3);

    input.remove();
  });

  it('keeps scale stable when keyboard shrink arrives just after text entry focus leaves', () => {
    const stage = document.createElement('section');
    const input = document.createElement('input');
    const manager = new ViewportScaleManager({ viewport: gameViewport });
    manager.stage = stage;
    document.body.append(input);
    setWindowSize({ width: 1080, height: 2170 });
    manager.updateScale();

    input.focus();
    input.blur();
    manager.handleTextEntryFocusOut({ target: input });
    setWindowSize({ width: 1080, height: 1450 });
    manager.updateScale();

    expect(Number(stage.style.getPropertyValue('--viewport-scale'))).toBe(1);
    expect(Number(stage.style.getPropertyValue('--style-ui-scale'))).toBe(3);
    expect(
      document.documentElement.style.getPropertyValue('--app-viewport-height'),
    ).toBe('2170px');

    input.remove();
  });

  it('keeps the document anchored when text entry triggers WebView pan', () => {
    const stage = document.createElement('section');
    const input = document.createElement('input');
    const manager = new ViewportScaleManager({ viewport: gameViewport });
    manager.stage = stage;
    document.body.append(input);
    setWindowSize({ width: 1080, height: 2170 });
    manager.updateScale();

    manager.handleTextEntryFocusIn({ target: input });
    document.documentElement.scrollTop = 240;
    document.body.scrollTop = 240;
    manager.handleViewportScroll();

    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);

    setWindowSize({ width: 1080, height: 1450 });
    document.documentElement.scrollTop = 180;
    document.body.scrollTop = 180;
    manager.handleViewportChange();

    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
    expect(
      document.documentElement.style.getPropertyValue('--app-viewport-height'),
    ).toBe('2170px');
    expect(
      document.documentElement.style.getPropertyValue('--app-visible-stage-height'),
    ).toBe('1450px');

    input.remove();
  });

  it('does not scale source UI beyond the authored viewport on large desktop', () => {
    const stage = document.createElement('section');
    const manager = new ViewportScaleManager({ viewport: gameViewport });
    manager.stage = stage;
    setWindowSize({ width: 2560, height: 3200 });

    manager.updateScale();

    expect(Number(stage.style.getPropertyValue('--viewport-scale'))).toBe(1);
    expect(Number(stage.style.getPropertyValue('--style-ui-scale'))).toBe(3);
    expect(document.documentElement.style.getPropertyValue('--app-stage-width')).toBe(
      '2560px',
    );
    expect(document.documentElement.style.getPropertyValue('--app-stage-height')).toBe(
      '2170px',
    );
    expect(
      document.documentElement.style.getPropertyValue('--app-source-ui-screen-width'),
    ).toBe('1080px');
    expect(stage.dataset.viewportMode).toBe('web-wide');
  });
});
