import { Container } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { PixiApplicationManager } from './PixiApplicationManager.js';

function createCanvas({ width = 1440, height = 900 } = {}) {
  const classes = new Set();
  return {
    clientWidth: width,
    clientHeight: height,
    classList: {
      contains: (className) => classes.has(className),
      remove: (className) => classes.delete(className),
      toggle: (className, active) =>
        active ? classes.add(className) : classes.delete(className),
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

function createFakeApplication() {
  return {
    stage: new Container(),
    renderer: {
      resize: vi.fn(),
    },
    init: vi.fn(async () => {}),
    destroy: vi.fn(),
  };
}

describe('PixiApplicationManager', () => {
  it('registers Spine render pipes before initializing Pixi', async () => {
    const order = [];
    const app = createFakeApplication();
    app.init.mockImplementation(async () => {
      order.push('pixi');
    });
    const manager = new PixiApplicationManager({
      canvas: createCanvas(),
      createApplication: () => app,
      prepareSpineRuntime: vi.fn(async () => {
        order.push('spine');
      }),
    });

    await manager.initialize();

    expect(order).toEqual(['spine', 'pixi']);
  });

  it('creates one ordered layer tree and centers authored/source layers on wide web', async () => {
    const app = createFakeApplication();
    const manager = new PixiApplicationManager({
      canvas: createCanvas(),
      createApplication: () => app,
      windowTarget: {
        innerWidth: 1440,
        innerHeight: 900,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      devicePixelRatio: () => 1,
    });

    await manager.initialize();

    const layers = manager.getLayers();
    expect(layers.root.children.map((child) => child.label)).toEqual([
      'backgroundLayer',
      'pageWorldsLayer',
      'pageUiLayer',
      'globalChromeLayer',
      'dialogsLayer',
      'tooltipsLayer',
      'tutorialLayer',
      'transientLayer',
      'interactionLocksLayer',
    ]);
    expect(layers.pageWorlds.x).toBeCloseTo(1196, 0);
    expect(layers.pageUi.x).toBeCloseTo(1196, 0);
    expect(layers.pageUi.scale.x).toBe(3);
    expect(app.init.mock.calls[0][0].resolution).toBeCloseTo(900 / 2170, 8);

    const backgroundInstructions =
      layers.backgroundGraphic.context.instructions;
    expect(backgroundInstructions.map(({ action }) => action)).toEqual([
      'fill',
      'fill',
    ]);
    expect(
      backgroundInstructions[0].data.path.instructions[0].data.slice(0, 4),
    ).toEqual([0, 0, manager.projection.stageLogicalWidth, 2170]);
    expect(backgroundInstructions[0].data.style.color).toBe(0x1c1e26);
    expect(
      backgroundInstructions[1].data.path.instructions
        .at(-1)
        .data.slice(0, 4),
    ).toEqual([1196, 0, 1080, 2170]);
    expect(backgroundInstructions[1].data.style.color).toBe(0x17191f);

    const frameInstruction =
      layers.stageFrame.context.instructions[0];
    expect(frameInstruction.action).toBe('stroke');
    expect(
      frameInstruction.data.path.instructions[0].data.slice(0, 4),
    ).toEqual([0, 0, 360, 2170 / 3]);
    expect(frameInstruction.data.style.color).toBe(0x3f465c);
    expect(frameInstruction.data.style.width).toBeCloseTo(
      2 / manager.projection.fitScale / 3,
      8,
    );
    expect(layers.stageFrame.visible).toBe(true);
    expect(layers.stageFrame.zIndex).toBeGreaterThan(0);
  });

  it('does not frame the authored stage on mobile', async () => {
    const app = createFakeApplication();
    const manager = new PixiApplicationManager({
      canvas: createCanvas({ width: 390, height: 844 }),
      createApplication: () => app,
      windowTarget: {
        innerWidth: 390,
        innerHeight: 844,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      devicePixelRatio: () => 1,
    });

    await manager.initialize();

    expect(manager.projection.isWide).toBe(false);
    expect(manager.getLayers().stageFrame.visible).toBe(false);
  });

  it('keeps authored layout stable and reports keyboard dialog shifts', async () => {
    const app = createFakeApplication();
    const canvas = createCanvas({ width: 1080, height: 2170 });
    const manager = new PixiApplicationManager({
      canvas,
      createApplication: () => app,
      windowTarget: {
        innerWidth: 1080,
        innerHeight: 2170,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
    await manager.initialize();

    canvas.clientHeight = 1300;
    const projection = manager.setKeyboardMetrics({
      keyboardInset: 870,
      visibleHeight: 1300,
    });

    expect(projection.viewportPx.height).toBe(2170);
    expect(projection.dialogShift).toBe(-145);
    expect(app.renderer.resize).toHaveBeenLastCalledWith(1080, 2170, 1);
  });

  it('locks the authored layout before keyboard resize and through keyboard dismissal', async () => {
    const app = createFakeApplication();
    const canvas = createCanvas({ width: 1080, height: 2170 });
    const manager = new PixiApplicationManager({
      canvas,
      createApplication: () => app,
      windowTarget: {
        innerWidth: 1080,
        innerHeight: 2170,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
    await manager.initialize();

    manager.setTextEntryActive(true);
    canvas.clientHeight = 1300;
    expect(manager.resizeNow().viewportPx.height).toBe(2170);

    manager.setTextEntryActive(false);
    expect(manager.getProjection().viewportPx.height).toBe(2170);

    canvas.clientHeight = 2170;
    expect(manager.resizeNow().viewportPx.height).toBe(2170);

    canvas.clientHeight = 1300;
    expect(manager.resizeNow().viewportPx.height).toBe(1300);
  });

  it('temporarily expands the loading splash across mobile safe areas', async () => {
    const app = createFakeApplication();
    const canvas = createCanvas({ width: 390, height: 844 });
    const manager = new PixiApplicationManager({
      canvas,
      createApplication: () => app,
    });
    await manager.initialize();

    manager.setSplashViewportActive(true);

    expect(canvas.classList.contains('is-splash-viewport')).toBe(true);
    expect(app.renderer.resize).toHaveBeenCalled();

    manager.setSplashViewportActive(false);

    expect(canvas.classList.contains('is-splash-viewport')).toBe(false);
  });
});
