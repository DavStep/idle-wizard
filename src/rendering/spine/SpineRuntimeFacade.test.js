import { describe, expect, it, vi } from 'vitest';

import { SpineRuntimeFacade } from './SpineRuntimeFacade.js';

describe('SpineRuntimeFacade', () => {
  it('creates a Spine skeleton on a Pixi layer with placement and animation', async () => {
    const spine = {
      position: { set: vi.fn() },
      scale: { set: vi.fn() },
      state: { setAnimation: vi.fn() },
    };
    const layer = { addChild: vi.fn() };
    const assetManager = {
      createSkeleton: vi.fn(async () => spine),
      loadSkeleton: vi.fn(),
    };
    const facade = new SpineRuntimeFacade({
      assetManager,
      whenPixiReady: vi.fn(async () => ({ ui: layer })),
      getLayers: vi.fn(() => null),
    });

    const created = await facade.createSkeleton({
      key: 'elara',
      position: { x: 12, y: 34 },
      scale: 0.5,
      animationName: 'idle',
      loop: false,
    });

    expect(created).toBe(spine);
    expect(assetManager.createSkeleton).toHaveBeenCalledWith({ key: 'elara' });
    expect(spine.position.set).toHaveBeenCalledWith(12, 34);
    expect(spine.scale.set).toHaveBeenCalledWith(0.5);
    expect(spine.state.setAnimation).toHaveBeenCalledWith(0, 'idle', false);
    expect(layer.addChild).toHaveBeenCalledWith(spine);
  });

  it('uses explicit layer lookups when available', async () => {
    const spine = {};
    const layer = { addChild: vi.fn() };
    const facade = new SpineRuntimeFacade({
      assetManager: {
        createSkeleton: vi.fn(async () => spine),
      },
      whenPixiReady: vi.fn(async () => null),
      getLayers: vi.fn(() => ({ popup: layer })),
    });

    await facade.createSkeleton({ key: 'elara', layer: 'popup' });

    expect(layer.addChild).toHaveBeenCalledWith(spine);
  });

  it('can create a detached Spine skeleton', async () => {
    const spine = {};
    const assetManager = {
      createSkeleton: vi.fn(async () => spine),
    };
    const facade = new SpineRuntimeFacade({
      assetManager,
      whenPixiReady: vi.fn(async () => null),
    });

    await expect(facade.createSkeleton({ key: 'elara', layer: null })).resolves.toBe(spine);
  });
});
