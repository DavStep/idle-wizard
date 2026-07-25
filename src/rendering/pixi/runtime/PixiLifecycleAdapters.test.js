import { describe, expect, it, vi } from 'vitest';

import {
  PixiCanvasClipboardBoundary,
  PixiCanvasHostManager,
  PixiCanvasViewportFacade,
  PixiInteractionLockManager,
} from './PixiLifecycleAdapters.js';

describe('Pixi lifecycle adapters', () => {
  it('reuses the authored canvas as both host and viewport', () => {
    const canvas = {};
    expect(new PixiCanvasHostManager({ canvas }).mount()).toBe(canvas);
    expect(new PixiCanvasViewportFacade({ canvas }).mount()).toBe(canvas);
  });

  it('keeps one retained final interaction lock', () => {
    const unregister = vi.fn();
    const pushModal = vi.fn(() => ({ unregister }));
    const manager = new PixiInteractionLockManager({
      inputRouter: { pushModal },
    });

    manager.lock('connecting');
    manager.lock('maintenance');
    expect(pushModal).toHaveBeenCalledTimes(1);
    expect(manager.isLocked()).toBe(true);

    manager.unlock();
    expect(unregister).toHaveBeenCalledTimes(1);
    expect(manager.isLocked()).toBe(false);
  });

  it('uses no secondary clipboard surface', () => {
    const boundary = new PixiCanvasClipboardBoundary();
    expect(boundary.mount()).toBe(boundary);
    expect(boundary.unmount()).toBeUndefined();
  });
});
