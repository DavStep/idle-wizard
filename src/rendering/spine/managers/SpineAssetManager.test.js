import { describe, expect, it, vi } from 'vitest';

import { SpineAssetManager } from './SpineAssetManager.js';

describe('SpineAssetManager', () => {
  it('loads the Spine runtime before registering Pixi assets', async () => {
    const events = [];
    const Assets = {
      add: vi.fn((asset) => events.push(['add', asset])),
      load: vi.fn(async (aliases) => events.push(['load', aliases])),
    };
    const Spine = vi.fn();
    const manager = new SpineAssetManager({
      importRuntime: vi.fn(async () => {
        events.push(['runtime']);
        return { Spine };
      }),
      importPixi: vi.fn(async () => ({ Assets })),
    });

    const aliases = await manager.loadSkeleton({
      key: 'elara',
      skeletonSrc: '/assets/elara.skel',
      atlasSrc: '/assets/elara.atlas',
    });

    expect(aliases).toEqual({
      skeletonAlias: 'elara:skeleton',
      atlasAlias: 'elara:atlas',
    });
    expect(events).toEqual([
      ['runtime'],
      ['add', { alias: 'elara:skeleton', src: '/assets/elara.skel' }],
      ['add', { alias: 'elara:atlas', src: '/assets/elara.atlas' }],
      ['load', ['elara:skeleton', 'elara:atlas']],
    ]);
  });

  it('does not re-register an unchanged asset alias', async () => {
    const Assets = {
      add: vi.fn(),
      load: vi.fn(async () => null),
    };
    const manager = new SpineAssetManager({
      importRuntime: vi.fn(async () => ({ Spine: vi.fn() })),
      importPixi: vi.fn(async () => ({ Assets })),
    });

    await manager.loadSkeleton({
      key: 'elara',
      skeletonSrc: '/assets/elara.skel',
      atlasSrc: '/assets/elara.atlas',
    });
    await manager.loadSkeleton({
      key: 'elara',
      skeletonSrc: '/assets/elara.skel',
      atlasSrc: '/assets/elara.atlas',
    });

    expect(Assets.add).toHaveBeenCalledTimes(2);
    expect(Assets.load).toHaveBeenCalledTimes(2);
  });

  it('rejects alias reuse with a different source', async () => {
    const manager = new SpineAssetManager({
      importRuntime: vi.fn(async () => ({ Spine: vi.fn() })),
      importPixi: vi.fn(async () => ({
        Assets: {
          add: vi.fn(),
          load: vi.fn(async () => null),
        },
      })),
    });

    await manager.loadSkeleton({
      key: 'elara',
      skeletonSrc: '/assets/elara.skel',
      atlasSrc: '/assets/elara.atlas',
    });

    await expect(
      manager.loadSkeleton({
        key: 'elara',
        skeletonSrc: '/assets/elara-v2.skel',
        atlasSrc: '/assets/elara.atlas',
      }),
    ).rejects.toThrow('Spine asset alias "elara:skeleton" is already registered');
  });

  it('creates a Spine container with loaded aliases', async () => {
    const Spine = vi.fn();
    const manager = new SpineAssetManager({
      importRuntime: vi.fn(async () => ({ Spine })),
      importPixi: vi.fn(async () => ({ Assets: { add: vi.fn(), load: vi.fn() } })),
    });

    await manager.createSkeleton({
      key: 'elara',
      autoUpdate: false,
    });

    expect(Spine).toHaveBeenCalledWith({
      skeleton: 'elara:skeleton',
      atlas: 'elara:atlas',
      autoUpdate: false,
    });
  });
});
