/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import {
  TutorialPointerSpineManager,
  resolvePointerPose,
  resolvePointerTransform,
  resolvePublicAssetUrl,
} from './TutorialPointerSpineManager.js';

describe('TutorialPointerSpineManager', () => {
  it('resolves public pointer asset URLs against the deployed base path', () => {
    expect(
      resolvePublicAssetUrl(
        'spine/tutorial-pointer/pointer.skel',
        '/idle-wizard/',
      ),
    ).toBe('/idle-wizard/spine/tutorial-pointer/pointer.skel');
    expect(
      resolvePublicAssetUrl(
        '/spine/tutorial-pointer/pointer.atlas',
        '/idle-wizard',
      ),
    ).toBe('/idle-wizard/spine/tutorial-pointer/pointer.atlas');
    expect(
      resolvePublicAssetUrl(
        'spine/tutorial-pointer/pointer.skel',
        '/',
      ),
    ).toBe('/spine/tutorial-pointer/pointer.skel');
  });

  it('keeps a DOM geometry anchor without creating another canvas', () => {
    const pointer = document.createElement('span');
    const manager = new TutorialPointerSpineManager();

    manager.mount(pointer);

    expect(pointer.dataset.spineReady).toBeUndefined();
    expect(
      pointer.querySelector('.tutorial-layer__pointer-spine-shell'),
    ).not.toBeNull();
    expect(pointer.querySelector('canvas')).toBeNull();
  });

  it('loads the pointer into the shared overlay and never creates or destroys an app', async () => {
    const stage = document.createElement('section');
    stage.className = 'game-stage';
    stage.style.setProperty('--style-ui-scale', '3');
    const canvas = document.createElement('canvas');
    canvas.className = 'game-canvas';
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 390,
      bottom: 844,
      width: 390,
      height: 844,
    });
    const root = document.createElement('section');
    root.className = 'tutorial-layer';
    root.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 390,
      bottom: 844,
      width: 390,
      height: 844,
    });
    const pointer = document.createElement('span');
    root.append(pointer);
    stage.append(canvas, root);
    document.body.append(stage);

    const spine = {
      update: vi.fn(),
      getBounds: vi.fn(() => ({ x: 0, y: 0, width: 44, height: 64 })),
      scale: { set: vi.fn() },
      position: { set: vi.fn() },
      skeleton: { data: { animations: [{ name: 'click1' }] } },
      state: { setAnimation: vi.fn(), timeScale: 1 },
      removeFromParent: vi.fn(),
      destroy: vi.fn(),
      visible: false,
      rotation: 0,
    };
    const spineRuntimeFacade = {
      loadSkeleton: vi.fn(async () => null),
      createSkeleton: vi.fn(async () => spine),
      attachToElement: vi.fn(() => true),
      detachFromElement: vi.fn(),
    };
    const manager = new TutorialPointerSpineManager({
      spineRuntimeFacade,
      assetBaseUrl: '/idle-wizard/',
    });

    manager.setPlacement({
      x: 50,
      y: 35,
      placement: 'bottom-right',
    });
    manager.mount(pointer);
    await manager.whenReady();

    expect(pointer.querySelector('canvas')).toBeNull();
    expect(pointer.dataset.spineReady).toBe('true');
    expect(spineRuntimeFacade.loadSkeleton).toHaveBeenCalledWith({
      key: 'tutorial:pointer',
      skeletonSrc: '/idle-wizard/spine/tutorial-pointer/pointer.skel',
      atlasSrc: '/idle-wizard/spine/tutorial-pointer/pointer.atlas',
    });
    expect(spineRuntimeFacade.createSkeleton).toHaveBeenCalledWith({
      key: 'tutorial:pointer',
      layer: 'overlay',
      autoUpdate: true,
    });
    expect(spineRuntimeFacade.attachToElement).toHaveBeenCalledWith(
      pointer,
      spine,
      { zIndex: 0 },
    );
    expect(spine.scale.set).toHaveBeenCalledWith((40 / 44) * 3);
    expect(spine.rotation).toBeCloseTo(-Math.PI / 4);
    expect(spine.state.setAnimation).toHaveBeenCalledWith(0, 'click1', true);
    expect(spine.visible).toBe(false);

    manager.setVisible(true);
    expect(spine.state.timeScale).toBe(1);
    expect(spine.visible).toBe(true);

    manager.setMotionEnabled(false);
    expect(spine.state.timeScale).toBe(0);
    expect(spine.visible).toBe(true);

    manager.setVisible(false);
    expect(spine.visible).toBe(false);

    manager.unmount();

    expect(pointer.dataset.spineReady).toBeUndefined();
    expect(spineRuntimeFacade.detachFromElement).toHaveBeenCalledWith(
      pointer,
      spine,
    );
    expect(spine.removeFromParent).toHaveBeenCalledTimes(1);
    expect(spine.destroy).toHaveBeenCalledWith({ children: true });
  });

  it('fails open when the shared Spine runtime cannot load the pointer', async () => {
    const pointer = document.createElement('span');
    const spineRuntimeFacade = {
      loadSkeleton: vi.fn(async () => {
        throw new Error('missing asset');
      }),
      createSkeleton: vi.fn(),
    };
    const manager = new TutorialPointerSpineManager({
      spineRuntimeFacade,
    });

    manager.mount(pointer);

    await expect(manager.whenReady()).resolves.toBeNull();
    expect(pointer.dataset.spineReady).toBeUndefined();
    expect(spineRuntimeFacade.createSkeleton).not.toHaveBeenCalled();
    expect(pointer.querySelector('canvas')).toBeNull();
  });
});

describe('tutorial pointer geometry', () => {
  it('preserves the authored placement rotations and nudges', () => {
    expect(resolvePointerPose('top-left')).toEqual({
      nudgeX: 6,
      nudgeY: 6,
      rotationDegrees: 135,
    });
    expect(resolvePointerPose('bottom-right')).toEqual({
      nudgeX: -6,
      nudgeY: -6,
      rotationDegrees: -45,
    });
  });

  it('maps source-space pointer geometry into the fixed logical canvas', () => {
    const transform = resolvePointerTransform({
      placement: { x: 50, y: 35 },
      pose: resolvePointerPose('bottom-right'),
      baseFit: { x: 38, y: 45, scale: 2 / 3 },
      shellWidth: 76,
      shellHeight: 90,
      uiScale: 3,
      canvasRect: {
        left: 100,
        top: 20,
        width: 390,
        height: 844,
      },
      rootRect: {
        left: 100,
        top: 20,
      },
    });

    expect(transform).toEqual({
      x: 132,
      y: 87,
      scale: 2,
      rotation: -Math.PI / 4,
    });
  });
});
