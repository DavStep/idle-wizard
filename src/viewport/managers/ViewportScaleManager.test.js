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
  it('scales the source UI down with a fitted web viewport', () => {
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
      `${gameViewport.width * expectedViewportScale}px`,
    );
    expect(document.documentElement.style.getPropertyValue('--app-stage-height')).toBe(
      `${gameViewport.height * expectedViewportScale}px`,
    );
    expect(
      document.documentElement.style.getPropertyValue('--app-visible-stage-height'),
    ).toBe(`${gameViewport.height * expectedViewportScale}px`);
    expect(document.documentElement.style.getPropertyValue('--app-keyboard-inset')).toBe(
      '0px',
    );
  });

  it('keeps the source UI at full mobile scale for the authored viewport', () => {
    const stage = document.createElement('section');
    const manager = new ViewportScaleManager({ viewport: gameViewport });
    manager.stage = stage;
    setWindowSize({ width: 1080, height: 2170 });

    manager.updateScale();

    expect(Number(stage.style.getPropertyValue('--viewport-scale'))).toBe(1);
    expect(Number(stage.style.getPropertyValue('--style-ui-scale'))).toBe(3);
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

  it('does not scale beyond the authored viewport', () => {
    const stage = document.createElement('section');
    const manager = new ViewportScaleManager({ viewport: gameViewport });
    manager.stage = stage;
    setWindowSize({ width: 2560, height: 3200 });

    manager.updateScale();

    expect(Number(stage.style.getPropertyValue('--viewport-scale'))).toBe(1);
    expect(Number(stage.style.getPropertyValue('--style-ui-scale'))).toBe(3);
  });
});
