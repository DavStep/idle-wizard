// @vitest-environment jsdom

import { installPixiPageTestCanvas } from '../../pages/workshop/PixiPageTestHarness.js';
import { FillGradient, NineSliceSprite, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { SemanticTargetRegistry } from '../../retained/index.js';
import {
  createPixiThemeSnapshot,
  PIXI_ROOT_RUN_ASSETS,
} from '../../theme/PixiThemeTokens.js';
import { PixiTopPanelView } from './PixiTopPanelView.js';

installPixiPageTestCanvas();

describe('PixiTopPanelView', () => {
  it('updates resources and quest geometry without rebuilding the display tree', () => {
    const semanticRegistry = new SemanticTargetRegistry();
    const assets = createAssets();
    const view = new PixiTopPanelView({
      assets,
      semanticRegistry,
    });
    const children = [...view.root.children];

    view.applyTheme(createPixiThemeSnapshot({ theme: 'midnight' }));
    view.activate();
    view.bind({
      username: 'mira',
      character: 'mira',
      mana: { current: 41.9, cap: 80, perSecond: 2.25 },
      coin: 1200,
      contextCurrency: {
        resource: 'ruby',
        amount: 9,
        visible: true,
      },
      level: 4,
      quest: {
        visible: true,
        completed: 1,
        total: 4,
        activeFraction: 0.5,
        remaining: 3,
      },
    });

    expect(view.root.children).toEqual(children);
    expect(view.username.text).toBe('mira');
    expect(view.username.textObject.style.fill).toBe('#fff4dc');
    expect(view.username.textObject.style.stroke).toMatchObject({
      color: '#17100c',
      width: 4,
    });
    expect(view.mana.amount).toBe('41/80');
    expect(view.manaRate.text).toBe('+2.25/s');
    expect(view.coin.amount).toBe('1.2k');
    expect(view.contextCurrency.resource).toBe('ruby');
    expect(view.levelValue.text).toBe('4');
    expect(assets.getTexture).toHaveBeenCalledWith(
      'public:ui/root-run-level-star.png',
    );
    expect(view.questRail.visible).toBe(true);
    expect(view.topHudRoot.position).toMatchObject({
      x: 32 / 3,
      y: 140 / 3,
    });
    expect(view.topHudRoot.scale.x).toBe(1 / 3);
    expect(view.avatarViewport.frame).toBeInstanceOf(NineSliceSprite);
    expect(view.coin.background).toBeInstanceOf(NineSliceSprite);
    expect(view.settingsControl.background).toBeInstanceOf(NineSliceSprite);
    expect(assets.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.settingsGear,
    );
    expect(view.levelRail.track).toBeInstanceOf(NineSliceSprite);
    expect(semanticRegistry.get('top.coin')?.displayObject).toBe(view.coin);
    expect(semanticRegistry.get('top.settings')?.displayObject).toBe(
      view.settingsControl,
    );
    expect(semanticRegistry.resolve('top.coin')).toMatchObject({
      bounds: {
        width: expect.any(Number),
        height: expect.any(Number),
      },
      state: {
        visible: true,
      },
    });
    expect(semanticRegistry.getTutorialTarget('top:mana')).not.toBeNull();
  });

  it('routes the Root Run settings button through the existing settings action', () => {
    const registrations = [];
    const openSettings = vi.fn();
    const view = new PixiTopPanelView({
      assets: createAssets(),
      inputRouter: {
        registerPressTarget: vi.fn((descriptor) => {
          registrations.push(descriptor);
          return { unregister: vi.fn() };
        }),
      },
    });
    view.activate();
    view.bind({
      actions: { openSettings },
    });

    const settingsPress = registrations.find(
      ({ id }) => id === 'top.settings',
    );
    expect(settingsPress?.displayObject).toBe(view.settingsControl);
    expect(settingsPress?.onActivate()).toBeUndefined();
    expect(openSettings).toHaveBeenCalledTimes(1);

    view.destroy();
  });

  it('draws the Root Run rail with a gradient fill, separators, and no progress numbers', () => {
    const view = new PixiTopPanelView({
      assets: createAssets(),
    });

    view.applyTheme(createPixiThemeSnapshot({
      theme: 'midnight',
      progressBar: 'regular',
    }));
    const fillSpy = vi.spyOn(view.levelRail.fill, 'fill');
    view.activate();
    view.bind({
      level: 4,
      quest: {
        visible: true,
        completed: 1,
        total: 4,
        activeFraction: 0.5,
      },
    });

    const fillRects = view.levelRail.fill.context.instructions.filter(
      (instruction) => {
        const path = findPath(instruction, 'roundRect');
        return path && path.data[2] > 3;
      },
    );
    expect(fillRects).toHaveLength(1);
    expect(readPath(fillRects[0])).toEqual([
      23,
      24,
      234.375,
      45,
      22.5,
    ]);
    expect(view.levelRail.gradient).toBeInstanceOf(FillGradient);
    expect(fillSpy).toHaveBeenCalledWith(view.levelRail.gradient);

    const dividerRects =
      view.levelRail.dividers.context.instructions.filter(
        (instruction) =>
          Boolean(findPath(instruction, 'roundRect')),
      );
    expect(dividerRects.map(readPath)).toEqual([
      [176.25, 33, 3, 27, 1.5],
      [182.25, 33, 3, 27, 1.5],
      [179.25, 33, 3, 27, 1.5],
      [332.5, 33, 3, 27, 1.5],
      [338.5, 33, 3, 27, 1.5],
      [335.5, 33, 3, 27, 1.5],
      [488.75, 33, 3, 27, 1.5],
      [494.75, 33, 3, 27, 1.5],
      [491.75, 33, 3, 27, 1.5],
    ]);
    expect(dividerRects.map(readColorAndAlpha)).toEqual([
      [0xffffff, 0.12],
      [0x000000, 0.42],
      [0x201331, 0.82],
      [0x000000, 0.44],
      [0xffffff, 0.08],
      [0xffffff, 0.68],
      [0x000000, 0.44],
      [0xffffff, 0.08],
      [0xffffff, 0.68],
    ]);
    expect(view.root.getChildByLabel('topPanel:questCaption', true)).toBeNull();
    expect(view.levelRail.total).toBe(4);
    expect(view.levelRail.completed).toBe(1);

    view.destroy();
  });

  it('keeps the Idle Wizard gradient regardless of the selected player rail style', () => {
    const view = new PixiTopPanelView({
      assets: createAssets(),
    });

    view.applyTheme(createPixiThemeSnapshot({
      theme: 'midnight',
      progressBar: 'notched',
    }));
    const fillSpy = vi.spyOn(view.levelRail.fill, 'fill');

    view.activate();
    view.bind({
      level: 4,
      quest: {
        visible: true,
        completed: 1,
        total: 4,
        activeFraction: 0,
      },
    });

    expect(view.levelRail.gradient).toBeInstanceOf(FillGradient);
    expect(fillSpy).toHaveBeenCalledWith(view.levelRail.gradient);

    view.destroy();
  });

  it('keeps level-owned chrome hidden while the fresh snapshot has no level', () => {
    const view = new PixiTopPanelView({
      assets: createAssets(),
    });

    view.activate();

    expect(() =>
      view.bind({
        level: null,
        quest: { visible: true },
      }),
    ).not.toThrow();
    expect(view.levelControl.visible).toBe(false);
    expect(view.questRail.visible).toBe(false);
  });

  it('replays the exact Root Run star flight and holds quest progress until arrival', () => {
    const motion = createMotionHarness();
    const semanticRegistry = createQuestSemanticRegistry();
    const view = new PixiTopPanelView({
      assets: createAssets(),
      semanticRegistry,
      reducedMotion: () => false,
      requestFrame: motion.requestFrame,
      cancelFrame: motion.cancelFrame,
      timeSource: motion.timeSource,
      random: () => 0.5,
    });
    view.activate();
    view.bind(createTopModel({
      completed: 1,
      loadRevision: 3,
    }));

    view.bind(createTopModel({
      completed: 2,
      loadRevision: 3,
    }));

    expect(motion.requestFrame).toHaveBeenCalledTimes(1);
    expect(view.questFlightRoot.visible).toBe(true);
    expect(view.levelRail.completed).toBe(1);
    const { start, destination, durationMs } =
      view.questCompletionMotion;
    expect(durationMs).toBeGreaterThanOrEqual(420);
    expect(durationMs).toBeLessThanOrEqual(760);

    motion.runAt(durationMs / 2);
    expect(view.questFlightRoot.position.x).toBeCloseTo(
      (start.x + destination.x) / 2,
      5,
    );
    expect(view.questFlightRoot.position.y).toBeCloseTo(
      (start.y + destination.y) / 2 - 32,
      5,
    );
    expect(view.questFlightRoot.alpha).toBeCloseTo(0.96, 5);
    expect(view.levelRail.completed).toBe(1);

    motion.runAt(durationMs - 1);
    expect(view.levelRail.completed).toBe(1);

    motion.runAt(durationMs);
    expect(view.questFlightRoot.visible).toBe(false);
    expect(view.questArrivalRoot.visible).toBe(true);
    expect(view.questArrivalSparks).toHaveLength(8);
    expect(view.levelRail.completed).toBe(2);

    motion.runAt(durationMs + 200);
    expect(view.levelMotionRoot.scale.x).toBeCloseTo(1.1, 5);

    motion.runAt(durationMs + 320);
    expect(view.questArrivalRoot.visible).toBe(false);

    motion.runAt(durationMs + 400);
    expect(view.levelMotionRoot.scale.x).toBe(1);
    expect(motion.hasPendingFrame()).toBe(false);

    view.destroy();
  });

  it('uses the exact level-up jump keyframes when the visible level advances', () => {
    const motion = createMotionHarness();
    const view = new PixiTopPanelView({
      assets: createAssets(),
      reducedMotion: () => false,
      requestFrame: motion.requestFrame,
      cancelFrame: motion.cancelFrame,
      timeSource: motion.timeSource,
    });
    view.activate();
    view.bind(createTopModel({
      level: 4,
      completed: 3,
      total: 4,
    }));

    view.bind(createTopModel({
      level: 5,
      completed: 0,
      total: 5,
    }));

    motion.runAt(230 * 0.46);
    expect(view.levelMotionRoot.scale.x).toBeCloseTo(1.035, 5);
    expect(view.levelMotionRoot.position.y).toBeCloseTo(37.5, 5);
    expect(view.questRail.scale.y).toBe(1);

    motion.runAt(230 * 0.74);
    expect(view.levelMotionRoot.scale.x).toBeCloseTo(0.994, 5);
    expect(view.levelMotionRoot.position.y).toBeCloseTo(49.5, 5);

    motion.runAt(230);
    expect(view.levelMotionRoot.scale.x).toBe(1);
    expect(view.levelMotionRoot.position.y).toBe(46.5);
    expect(motion.hasPendingFrame()).toBe(false);

    view.destroy();
  });

  it('flies the final request before filling the old rail and revealing the next level', () => {
    const motion = createMotionHarness();
    const view = new PixiTopPanelView({
      assets: createAssets(),
      semanticRegistry: createQuestSemanticRegistry(),
      reducedMotion: () => false,
      requestFrame: motion.requestFrame,
      cancelFrame: motion.cancelFrame,
      timeSource: motion.timeSource,
      random: () => 0.5,
    });
    view.activate();
    view.bind(createTopModel({
      level: 4,
      completed: 3,
      total: 4,
      loadRevision: 2,
    }));

    view.bind(createTopModel({
      level: 5,
      completed: 0,
      total: 5,
      loadRevision: 2,
    }));

    const { durationMs } = view.questCompletionMotion;
    expect(view.levelValue.text).toBe('4');
    expect(view.levelRail.completed).toBe(3);

    motion.runAt(durationMs);
    expect(view.levelValue.text).toBe('4');
    expect(view.levelRail.completed).toBe(4);

    motion.runAt(durationMs + 204);
    expect(view.levelValue.text).toBe('4');

    motion.runAt(durationMs + 205);
    expect(view.levelValue.text).toBe('5');
    expect(view.levelRail.completed).toBe(0);
    expect(view.levelRail.total).toBe(5);

    view.destroy();
  });

  it('suppresses hydration and reduced-motion feedback and restores transforms on deactivate', () => {
    const motion = createMotionHarness();
    const semanticRegistry = createQuestSemanticRegistry();
    let reduced = false;
    const view = new PixiTopPanelView({
      assets: createAssets(),
      semanticRegistry,
      reducedMotion: () => reduced,
      requestFrame: motion.requestFrame,
      cancelFrame: motion.cancelFrame,
      timeSource: motion.timeSource,
      random: () => 0.5,
    });
    view.activate();
    view.bind(createTopModel({
      completed: 0,
      loadRevision: 1,
    }));

    view.bind(createTopModel({
      completed: 2,
      loadRevision: 2,
    }));
    expect(motion.requestFrame).not.toHaveBeenCalled();

    reduced = true;
    view.bind(createTopModel({
      completed: 3,
      loadRevision: 2,
    }));
    expect(motion.requestFrame).not.toHaveBeenCalled();

    reduced = false;
    view.bind(createTopModel({
      completed: 4,
      loadRevision: 2,
    }));
    motion.runAt(210);
    expect(view.questFlightRoot.visible).toBe(true);

    view.deactivate();
    expect(motion.cancelFrame).toHaveBeenCalledTimes(1);
    expect(view.questFlightRoot.visible).toBe(false);
    expect(view.levelMotionRoot.scale.x).toBe(1);
    expect(view.levelMotionRoot.position.y).toBe(46.5);
    expect(view.questRail.scale.y).toBe(1);

    view.destroy();
  });
});

function createAssets() {
  return {
    loaded: false,
    getTexture: vi.fn(() => Texture.EMPTY),
    getAtlasTexture: () => Texture.EMPTY,
  };
}

function createQuestSemanticRegistry() {
  const semanticRegistry = new SemanticTargetRegistry();
  semanticRegistry.register({
    semanticId: 'workshop.tasks',
    displayObject: {
      destroyed: false,
      eventMode: 'static',
      renderable: true,
      visible: true,
      worldVisible: true,
      getBounds: () => ({
        x: 40,
        y: 210,
        width: 120,
        height: 40,
      }),
    },
  });
  return semanticRegistry;
}

function createTopModel({
  level = 4,
  completed = 0,
  total = 4,
  loadRevision = 0,
} = {}) {
  return {
    level,
    loadRevision,
    quest: {
      visible: true,
      completed,
      total,
      remaining: Math.max(0, total - completed),
    },
    reveal: {
      top: true,
      quest: true,
    },
  };
}

function createMotionHarness() {
  let now = 0;
  let nextFrameId = 1;
  let pendingFrame = null;
  const requestFrame = vi.fn((callback) => {
    pendingFrame = callback;
    const frameId = nextFrameId;
    nextFrameId += 1;
    return frameId;
  });
  const cancelFrame = vi.fn(() => {
    pendingFrame = null;
  });

  return {
    requestFrame,
    cancelFrame,
    timeSource: () => now,
    hasPendingFrame: () => pendingFrame !== null,
    runAt(timestamp) {
      now = timestamp;
      const callback = pendingFrame;
      pendingFrame = null;
      expect(callback).toEqual(expect.any(Function));
      callback(timestamp);
    },
  };
}

function readPath(instruction) {
  return findPath(instruction, 'roundRect').data.slice(0, 5);
}

function readColorAndAlpha(instruction) {
  return [
    instruction.data.style.color,
    Number(instruction.data.style.alpha.toFixed(2)),
  ];
}

function findPath(instruction, action) {
  return instruction.data.path.instructions.find(
    (path) => path.action === action,
  );
}
