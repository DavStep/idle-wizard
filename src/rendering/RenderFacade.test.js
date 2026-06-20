// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { RenderFacade } from './RenderFacade.js';

function createManagers() {
  const canvasManager = {
    mount: vi.fn(),
    unmount: vi.fn(),
    getCanvas: vi.fn(() => null),
    getPixiApp: vi.fn(() => null),
    getPixiLayers: vi.fn(() => null),
    whenReady: vi.fn(() => Promise.resolve(null)),
  };
  const fpsDisplayManager = {
    mount: vi.fn(),
    unmount: vi.fn(),
    reset: vi.fn(),
    update: vi.fn(),
  };
  const renderLoopManager = {
    start: vi.fn(),
    stop: vi.fn(),
  };

  return { canvasManager, fpsDisplayManager, renderLoopManager };
}

describe('RenderFacade', () => {
  it('skips the fps display when disabled for builds', () => {
    const stage = document.createElement('section');
    const managers = createManagers();
    let onFrame = null;
    managers.renderLoopManager.start.mockImplementation((callback) => {
      onFrame = callback;
    });
    const frame = { time: 100, deltaSeconds: 0.016, timerDeltaSeconds: 0.016 };
    const frameCallback = vi.fn();

    const facade = new RenderFacade({
      ...managers,
      showFpsDisplay: false,
      spineRuntimeFacade: {},
    });

    facade.mount(stage);
    facade.startFrameLoop(frameCallback);
    onFrame(frame);
    facade.stopFrameLoop();
    facade.unmount();

    expect(managers.canvasManager.mount).toHaveBeenCalledWith(stage);
    expect(managers.renderLoopManager.start).toHaveBeenCalledTimes(1);
    expect(managers.renderLoopManager.stop).toHaveBeenCalledTimes(1);
    expect(frameCallback).toHaveBeenCalledWith(frame);
    expect(managers.fpsDisplayManager.mount).not.toHaveBeenCalled();
    expect(managers.fpsDisplayManager.update).not.toHaveBeenCalled();
    expect(managers.fpsDisplayManager.reset).not.toHaveBeenCalled();
    expect(managers.fpsDisplayManager.unmount).not.toHaveBeenCalled();
  });

  it('mounts and updates the fps display when enabled', () => {
    const stage = document.createElement('section');
    const managers = createManagers();
    let onFrame = null;
    managers.renderLoopManager.start.mockImplementation((callback) => {
      onFrame = callback;
    });
    const frame = { time: 100, deltaSeconds: 0.016, timerDeltaSeconds: 0.016 };

    const facade = new RenderFacade({
      ...managers,
      showFpsDisplay: true,
      spineRuntimeFacade: {},
    });

    facade.mount(stage);
    facade.startFrameLoop();
    onFrame(frame);
    facade.stopFrameLoop();
    facade.unmount();

    expect(managers.fpsDisplayManager.mount).toHaveBeenCalledWith(stage);
    expect(managers.fpsDisplayManager.reset).toHaveBeenCalledTimes(2);
    expect(managers.fpsDisplayManager.update).toHaveBeenCalledWith(frame);
    expect(managers.fpsDisplayManager.unmount).toHaveBeenCalledTimes(1);
  });
});
