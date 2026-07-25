import { describe, expect, it, vi } from 'vitest';

import { PixiAssetManager } from './PixiAssetManager.js';

class FakeRectangle {
  constructor(x, y, width, height) {
    Object.assign(this, { x, y, width, height });
  }
}

class FakeTexture {
  constructor(options) {
    Object.assign(this, options);
  }

  destroy() {}
}

describe('PixiAssetManager', () => {
  it('loads fonts and creates atlas frame textures before reporting ready', async () => {
    const atlasTexture = { source: { label: 'atlas-source' } };
    const assets = {
      load: vi.fn(async () => atlasTexture),
    };
    const fontFaceSet = {
      load: vi.fn(async () => [{}]),
      ready: Promise.resolve(),
    };
    const manager = new PixiAssetManager({
      assets,
      TextureClass: FakeTexture,
      RectangleClass: FakeRectangle,
      manifest: [{ id: 'atlas:game', src: '/atlas.png', kind: 'texture' }],
      atlasFrames: {
        'resource:coin': { x: 4, y: 7, width: 12, height: 13 },
      },
      fontFaceSet,
    });

    await manager.loadAll();

    expect(fontFaceSet.load).toHaveBeenCalledTimes(1);
    expect(manager.getAtlasTexture('resource:coin')).toMatchObject({
      source: atlasTexture.source,
      frame: { x: 4, y: 7, width: 12, height: 13 },
    });
  });

  it('fails validation instead of substituting missing production assets', async () => {
    const manager = new PixiAssetManager({
      assets: { load: vi.fn(async () => null) },
      TextureClass: FakeTexture,
      RectangleClass: FakeRectangle,
      manifest: [{ id: 'atlas:game', src: '/missing.png', kind: 'texture' }],
      atlasFrames: {},
      retryDelaysMs: [],
      fontFaceSet: {
        load: vi.fn(async () => [{}]),
        ready: Promise.resolve(),
      },
    });

    await expect(manager.loadAll()).rejects.toThrow('atlas:game');
  });

  it('recovers when a production asset load fails transiently', async () => {
    const atlasTexture = { source: { label: 'atlas-source' } };
    const assets = {
      load: vi
        .fn()
        .mockRejectedValueOnce(new Error('503 Service Unavailable'))
        .mockResolvedValueOnce(atlasTexture),
    };
    const waitForRetry = vi.fn(async () => {});
    const manager = new PixiAssetManager({
      assets,
      TextureClass: FakeTexture,
      RectangleClass: FakeRectangle,
      manifest: [{ id: 'atlas:game', src: '/flaky.png', kind: 'texture' }],
      atlasFrames: {},
      retryDelaysMs: [250],
      waitForRetry,
      fontFaceSet: {
        load: vi.fn(async () => [{}]),
        ready: Promise.resolve(),
      },
    });

    await manager.loadAll();

    expect(assets.load).toHaveBeenCalledTimes(2);
    expect(waitForRetry).toHaveBeenCalledWith(250);
    expect(manager.getTexture('atlas:game')).toBe(atlasTexture);
  });

  it('registers Spine parsers before preloading retained pointer assets', async () => {
    const order = [];
    const atlasTexture = { source: { label: 'atlas-source' } };
    const manager = new PixiAssetManager({
      assets: {
        load: vi.fn(async (src) => {
          order.push(`load:${src}`);
          return src === '/atlas.png' ? atlasTexture : { src };
        }),
      },
      TextureClass: FakeTexture,
      RectangleClass: FakeRectangle,
      manifest: [
        { id: 'atlas:game', src: '/atlas.png', kind: 'texture' },
        { id: 'pointer:atlas', src: '/pointer.atlas', kind: 'binary' },
        { id: 'pointer:skeleton', src: '/pointer.skel', kind: 'binary' },
      ],
      atlasFrames: {},
      fontFaceSet: {
        load: vi.fn(async () => [{}]),
        ready: Promise.resolve(),
      },
      prepareSpineLoaders: vi.fn(async () => {
        order.push('prepare:spine');
      }),
    });

    await manager.loadAll();

    expect(order[0]).toBe('prepare:spine');
    expect(order.slice(1)).toEqual([
      'load:/atlas.png',
      'load:/pointer.atlas',
      'load:/pointer.skel',
    ]);
  });
});
