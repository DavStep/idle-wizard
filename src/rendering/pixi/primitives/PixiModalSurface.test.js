// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import {
  installPixiPageTestCanvas,
} from '../pages/workshop/PixiPageTestHarness.js';
import {
  PIXI_MODAL_OPEN_MOTION,
  PixiModalSurface,
} from './PixiModalSurface.js';
import { PixiDialogFrame } from './PixiDialogFrame.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
} from '../theme/PixiThemeTokens.js';

installPixiPageTestCanvas();

const PROJECTION = Object.freeze({
  sourceWidth: 360,
  sourceHeight: 723.33,
  sourceScale: 3,
  sourceOffsetX: 0,
  stageLogicalWidth: 1080,
  dialogShift: 0,
});

describe('PixiModalSurface open motion', () => {
  it('uses the shared player-dialog shell by default', () => {
    const surface = createSurface();

    expect(surface.panel).toBeInstanceOf(PixiDialogFrame);

    surface.destroy();
  });

  it('matches the retained center dialog and overlay keyframes', () => {
    const runtime = createMotionRuntime();
    const surface = createSurface({
      openMotion: 'center',
      motionRuntime: runtime,
    });
    const retainedChildren = [...surface.root.children];
    const retainedTick = surface.handleOpenMotionFrame;

    surface.show();
    surface.activate();

    expect(surface.backdrop.alpha).toBe(0);
    expect(surface.panel.alpha).toBe(0);
    expect(surface.panel.scale.x).toBe(
      PIXI_MODAL_OPEN_MOTION.startScale,
    );

    runtime.advance(
      PIXI_MODAL_OPEN_MOTION.durationMs *
        PIXI_MODAL_OPEN_MOTION.overshootProgress,
    );

    expect(surface.backdrop.alpha).toBeGreaterThan(0);
    expect(surface.backdrop.alpha).toBeLessThan(1);
    expect(surface.panel.alpha).toBeCloseTo(1);
    expect(surface.panel.scale.x).toBeCloseTo(
      PIXI_MODAL_OPEN_MOTION.centerOvershootScale,
    );

    runtime.advance(
      PIXI_MODAL_OPEN_MOTION.durationMs *
        (1 - PIXI_MODAL_OPEN_MOTION.overshootProgress),
    );

    expect(surface.backdrop.alpha).toBe(1);
    expect(surface.panel.alpha).toBe(1);
    expect(surface.panel.scale.x).toBe(1);
    expect(surface.panel.scale.y).toBe(1);
    expect(surface.root.children).toEqual(retainedChildren);
    expect(surface.handleOpenMotionFrame).toBe(retainedTick);

    surface.hide();
    surface.show();
    expect(surface.panel.scale.x).toBe(
      PIXI_MODAL_OPEN_MOTION.startScale,
    );
    expect(surface.root.children).toEqual(retainedChildren);
    expect(
      runtime.requestFrame.mock.calls.every(
        ([callback]) => callback === retainedTick,
      ),
    ).toBe(true);

    surface.destroy();
  });

  it('uses the smaller top-dialog overshoot around the panel center', () => {
    const runtime = createMotionRuntime();
    const surface = createSurface({
      openMotion: 'top',
      motionRuntime: runtime,
    });
    surface.panel.pivot.set(surface.panel.outerWidth / 2, 0);
    surface.panel.position.set(180, 72);
    surface.captureOpenMotionBasePosition();
    const settledCenter =
      surface.panel.position.y + surface.panel.outerHeight / 2;

    surface.show();
    surface.activate();
    runtime.advance(
      PIXI_MODAL_OPEN_MOTION.durationMs *
        PIXI_MODAL_OPEN_MOTION.overshootProgress,
    );

    expect(surface.panel.scale.x).toBeCloseTo(
      PIXI_MODAL_OPEN_MOTION.topOvershootScale,
    );
    expect(
      surface.panel.position.y +
        (surface.panel.outerHeight * surface.panel.scale.y) / 2,
    ).toBeCloseTo(settledCenter);

    runtime.advance(
      PIXI_MODAL_OPEN_MOTION.durationMs *
        (1 - PIXI_MODAL_OPEN_MOTION.overshootProgress),
    );
    expect(surface.panel.position.y).toBe(72);
    expect(surface.panel.scale.x).toBe(1);

    surface.destroy();
  });

  it('cancels and restores motion on hide, deactivate, and destroy', () => {
    const runtime = createMotionRuntime();
    const surface = createSurface({
      openMotion: true,
      motionRuntime: runtime,
    });

    surface.show();
    surface.activate();
    runtime.advance(40);
    surface.hide();

    expect(runtime.cancelFrame).toHaveBeenCalledOnce();
    expect(surface.backdrop.alpha).toBe(1);
    expect(surface.panel.alpha).toBe(1);
    expect(surface.panel.scale.x).toBe(1);
    expect(surface.root).toMatchObject({
      visible: false,
      renderable: false,
      eventMode: 'none',
    });

    surface.show();
    expect(surface.panel.scale.x).toBe(
      PIXI_MODAL_OPEN_MOTION.startScale,
    );
    surface.deactivate();

    expect(runtime.cancelFrame).toHaveBeenCalledTimes(2);
    expect(surface.panel.alpha).toBe(1);
    expect(surface.panel.scale.x).toBe(1);

    surface.activate();
    expect(surface.panel.scale.x).toBe(
      PIXI_MODAL_OPEN_MOTION.startScale,
    );
    surface.destroy();

    expect(runtime.cancelFrame).toHaveBeenCalledTimes(3);
  });

  it('settles immediately when reduced motion is requested', () => {
    const runtime = createMotionRuntime({ reducedMotion: true });
    const surface = createSurface({
      openMotion: 'center',
      motionRuntime: runtime,
    });

    surface.show();
    surface.activate();

    expect(runtime.requestFrame).not.toHaveBeenCalled();
    expect(surface.backdrop.alpha).toBe(1);
    expect(surface.panel.alpha).toBe(1);
    expect(surface.panel.scale.x).toBe(1);

    surface.destroy();
  });

  it('does not animate modal surfaces that did not opt into dialog motion', () => {
    const runtime = createMotionRuntime();
    const surface = createSurface({ motionRuntime: runtime });

    surface.show();
    surface.activate();

    expect(runtime.requestFrame).not.toHaveBeenCalled();
    expect(surface.backdrop.alpha).toBe(1);
    expect(surface.panel.alpha).toBe(1);
    expect(surface.panel.scale.x).toBe(1);

    surface.destroy();
  });
});

function createSurface(options = {}) {
  const surface = new PixiModalSurface({
    title: 'research',
    contentWidth: 260,
    contentHeight: 80,
    ...options,
  });
  surface.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  surface.layout(PROJECTION);
  return surface;
}

function createMotionRuntime({ reducedMotion = false } = {}) {
  let currentTime = 0;
  let nextFrameId = 0;
  const callbacks = new Map();
  const requestFrame = vi.fn((callback) => {
    const frameId = ++nextFrameId;
    callbacks.set(frameId, callback);
    return frameId;
  });
  const cancelFrame = vi.fn((frameId) => {
    callbacks.delete(frameId);
  });
  return {
    requestFrame,
    cancelFrame,
    now: () => currentTime,
    prefersReducedMotion: () => reducedMotion,
    advance(milliseconds) {
      currentTime += milliseconds;
      const scheduled = [...callbacks.values()];
      callbacks.clear();
      for (const callback of scheduled) {
        callback(currentTime);
      }
    },
  };
}
