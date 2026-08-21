import { describe, expect, it, vi } from 'vitest';

import { FullscreenManager } from './FullscreenManager.js';

describe('FullscreenManager', () => {
  it('exposes fullscreen only in a supported mobile browser', () => {
    const harness = createHarness();
    const manager = new FullscreenManager(harness.dependencies);

    expect(manager.getSnapshot()).toEqual({
      available: true,
      active: false,
    });

    harness.isNativePlatform.mockReturnValue(true);
    expect(manager.getSnapshot().available).toBe(false);

    harness.isNativePlatform.mockReturnValue(false);
    harness.navigatorRef.userAgent = 'Desktop Browser';
    expect(manager.getSnapshot().available).toBe(false);
  });

  it('requests and exits fullscreen from the explicit setting action', async () => {
    const harness = createHarness();
    const manager = new FullscreenManager(harness.dependencies);

    expect(manager.setEnabled(true)).toBe(true);
    expect(harness.requestFullscreen).toHaveBeenCalledOnce();

    harness.documentRef.fullscreenElement = harness.documentRef.documentElement;
    expect(manager.setEnabled(false)).toBe(true);
    expect(harness.exitFullscreen).toHaveBeenCalledOnce();
    await Promise.resolve();
  });

  it('tracks browser-driven fullscreen exits and removes its listener', () => {
    const harness = createHarness();
    const manager = new FullscreenManager(harness.dependencies);
    const listener = vi.fn();

    expect(manager.mount()).toBe(true);
    manager.subscribe(listener);
    harness.documentRef.fullscreenElement = harness.documentRef.documentElement;
    harness.dispatchFullscreenChange();
    harness.documentRef.fullscreenElement = null;
    harness.dispatchFullscreenChange();

    expect(listener).toHaveBeenLastCalledWith({
      available: true,
      active: false,
    });
    manager.destroy();
    expect(harness.removeEventListener).toHaveBeenCalledWith(
      'fullscreenchange',
      expect.any(Function),
    );
  });

  it('hides the toggle in an installed standalone web app', () => {
    const harness = createHarness({ standalone: true });
    const manager = new FullscreenManager(harness.dependencies);

    expect(manager.getSnapshot().available).toBe(false);
    expect(manager.setEnabled(true)).toBe(false);
    expect(harness.requestFullscreen).not.toHaveBeenCalled();
  });
});

function createHarness({ standalone = false } = {}) {
  const listeners = new Map();
  const requestFullscreen = vi.fn(() => Promise.resolve());
  const exitFullscreen = vi.fn(() => Promise.resolve());
  const addEventListener = vi.fn((eventName, listener) => {
    listeners.set(eventName, listener);
  });
  const removeEventListener = vi.fn((eventName) => {
    listeners.delete(eventName);
  });
  const documentRef = {
    fullscreenEnabled: true,
    fullscreenElement: null,
    documentElement: { requestFullscreen },
    exitFullscreen,
    addEventListener,
    removeEventListener,
  };
  const windowRef = {
    matchMedia: vi.fn((query) => ({
      matches: standalone && query === '(display-mode: standalone)',
    })),
  };
  const navigatorRef = {
    userAgent: 'Android Mobile',
    maxTouchPoints: 5,
  };
  const isNativePlatform = vi.fn(() => false);
  return {
    dependencies: {
      documentRef,
      windowRef,
      navigatorRef,
      isNativePlatform,
    },
    documentRef,
    navigatorRef,
    isNativePlatform,
    requestFullscreen,
    exitFullscreen,
    addEventListener,
    removeEventListener,
    dispatchFullscreenChange: () => listeners.get('fullscreenchange')?.(),
  };
}
