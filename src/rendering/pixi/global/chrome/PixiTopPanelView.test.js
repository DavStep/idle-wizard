// @vitest-environment jsdom

import { installPixiPageTestCanvas } from '../../pages/workshop/PixiPageTestHarness.js';
import { NineSliceSprite, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { SemanticTargetRegistry } from '../../retained/index.js';
import {
  createPixiThemeSnapshot,
  PIXI_TEXT_STROKE_COLOR,
  PIXI_UI_GEOMETRY,
  PIXI_ROOT_RUN_ASSETS,
  resolvePixiTextStrokeWidth,
} from '../../theme/PixiThemeTokens.js';
import { PIXI_ROOM_TAB_FRAME_SCALE } from './PixiBottomPanelView.js';
import {
  PIXI_TOP_PANEL_BACKGROUND_SLICE,
  PixiTopPanelView,
} from './PixiTopPanelView.js';

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

    view.applyTheme(createPixiThemeSnapshot({ theme: 'night' }));
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
      color: PIXI_TEXT_STROKE_COLOR,
      width: resolvePixiTextStrokeWidth(view.username.fontSize),
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
      y: 32 / 3,
    });
    expect(view.topHudRoot.scale.x).toBe(1 / 3);
    expect(view.usernameControl.position).toMatchObject({
      x: -16,
      y: 178,
    });
    expect(view.panelBackground).toBeInstanceOf(NineSliceSprite);
    expect(view.panelBackground.texture).toBe(
      assets.getTexture(PIXI_ROOT_RUN_ASSETS.topPanelBackground),
    );
    expect(PIXI_TOP_PANEL_BACKGROUND_SLICE).toEqual({
      leftWidth: 40,
      topHeight: 40,
      rightWidth: 40,
      bottomHeight: 1,
    });
    expect(view.panelBackground.leftWidth).toBe(
      PIXI_TOP_PANEL_BACKGROUND_SLICE.leftWidth,
    );
    expect(view.panelBackground.topHeight).toBe(
      PIXI_TOP_PANEL_BACKGROUND_SLICE.topHeight,
    );
    expect(view.panelBackground.rightWidth).toBe(
      PIXI_TOP_PANEL_BACKGROUND_SLICE.rightWidth,
    );
    expect(view.panelBackground.bottomHeight).toBe(
      PIXI_TOP_PANEL_BACKGROUND_SLICE.bottomHeight,
    );
    expect(view.panelBackground.position).toMatchObject({
      x: 0,
      y:
        PIXI_UI_GEOMETRY.roomContentTop -
        PIXI_UI_GEOMETRY.topPanelContentGap,
    });
    expect(view.panelBackground.scale).toMatchObject({
      x: PIXI_ROOM_TAB_FRAME_SCALE,
      y: -PIXI_ROOM_TAB_FRAME_SCALE,
    });
    expect(
      view.panelBackground.width * view.panelBackground.scale.x,
    ).toBe(PIXI_UI_GEOMETRY.sourceWidth);
    expect(
      view.panelBackground.height *
        Math.abs(view.panelBackground.scale.y),
    ).toBe(
      PIXI_UI_GEOMETRY.roomContentTop -
        PIXI_UI_GEOMETRY.topPanelContentGap,
    );
    expect(view.avatarViewport.avatarFrame).toBeInstanceOf(NineSliceSprite);
    expect(view.coin.background).toBeInstanceOf(NineSliceSprite);
    expect(view.settingsControl.background).toBeInstanceOf(NineSliceSprite);
    expect(assets.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.settingsGear,
    );
    expect(view.levelRail.track).toBeInstanceOf(NineSliceSprite);
    expect(assets.getTexture).toHaveBeenCalledWith(
      'source:assets/ui/root-run-top-hud/level-progress-fill-mask.png',
    );
    expect(view.levelRail.fill).toBeInstanceOf(NineSliceSprite);
    expect([
      view.levelRail.fill.leftWidth,
      view.levelRail.fill.topHeight,
      view.levelRail.fill.rightWidth,
      view.levelRail.fill.bottomHeight,
    ]).toEqual([26, 20, 26, 21]);
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

    view.applyTheme(createPixiThemeSnapshot({ theme: 'day' }));
    expect(assets.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.topPanelBackgroundDay,
    );
  });

  it('keeps the shared top panel compact below its content', () => {
    const view = new PixiTopPanelView({
      assets: createAssets(),
    });
    const panelHeight =
      view.panelBackground.height *
      Math.abs(view.panelBackground.scale.y);

    expect(panelHeight).toBe(88);
    expect(PIXI_UI_GEOMETRY.roomContentTop).toBe(104);
    expect(
      PIXI_UI_GEOMETRY.roomContentTop - panelHeight,
    ).toBe(16);

    view.destroy();
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

  it('gives the avatar the shared button press animation and tap haptic', () => {
    const registrations = [];
    const openAvatar = vi.fn();
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
      actions: { openAvatar },
    });

    const avatarPress = registrations.find(
      ({ id }) => id === 'top.avatar',
    );
    expect(avatarPress).toMatchObject({
      displayObject: view.avatarViewport,
      excludePageSwipe: true,
      haptic: 'light',
      onPressChange: expect.any(Function),
    });

    avatarPress.onPressChange(true, { confirmed: false });
    expect(view.avatarViewport.visual.scale.x).toBe(0.94);
    expect(view.avatarViewport.visual.scale.y).toBe(0.94);

    avatarPress.onPressChange(false, { confirmed: false });
    expect(view.avatarViewport.visual.scale.x).toBe(1);
    expect(view.avatarViewport.visual.scale.y).toBe(1);
    expect(avatarPress.onActivate()).toBeUndefined();
    expect(openAvatar).toHaveBeenCalledTimes(1);

    view.destroy();
  });

  it('opens level rewards from the full level star and progress rail button', () => {
    const registrations = [];
    const openLevel = vi.fn();
    const semanticRegistry = new SemanticTargetRegistry();
    const view = new PixiTopPanelView({
      assets: createAssets(),
      semanticRegistry,
      inputRouter: {
        registerPressTarget: vi.fn((descriptor) => {
          registrations.push(descriptor);
          return { unregister: vi.fn() };
        }),
      },
    });
    view.activate();
    view.bind({
      level: 4,
      quest: {
        visible: true,
        completed: 1,
        total: 4,
        activeFraction: 0.5,
      },
      actions: { openLevel },
    });

    const levelPress = registrations.find(
      ({ id }) => id === 'top.level',
    );
    expect(levelPress).toMatchObject({
      displayObject: view.levelRail,
      excludePageSwipe: true,
      haptic: 'light',
      onPressChange: expect.any(Function),
    });
    expect(view.levelRail.hitArea).toMatchObject({
      x: 0,
      y: 0,
      width: 662,
      height: 93,
    });
    expect(semanticRegistry.get('top.level')?.displayObject).toBe(
      view.levelRail,
    );

    levelPress.onPressChange(true, { confirmed: false });
    expect(view.levelRail.pressVisual.scale.x).toBeLessThan(1);
    expect(view.levelRail.pressVisual.scale.y).toBeLessThan(1);

    levelPress.onPressChange(false, { confirmed: true });
    expect(view.levelRail.pressVisual.scale.x).toBe(1);
    expect(view.levelRail.pressVisual.scale.y).toBe(1);
    expect(levelPress.onActivate()).toBeUndefined();
    expect(openLevel).toHaveBeenCalledTimes(1);

    view.bind({
      level: 4,
      quest: { visible: false },
      actions: { openLevel },
    });
    expect(view.levelRail.hitArea.width).toBe(93);

    view.destroy();
  });

  it('draws the Root Run rail with its authored fill, separators, and no progress numbers', () => {
    const view = new PixiTopPanelView({
      assets: createAssets(),
    });

    view.applyTheme(createPixiThemeSnapshot({
      theme: 'midnight',
      progressBar: 'regular',
    }));
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

    expect(view.levelRail.fill).toBeInstanceOf(NineSliceSprite);
    expect(view.levelRail.fill.position).toMatchObject({
      x: 23,
      y: 21,
    });
    expect(view.levelRail.fill.width).toBe(234.375);
    expect(view.levelRail.fill.height).toBe(51);
    expect(view.levelRail.fill.visible).toBe(true);
    expect(view.levelRail.fill.tint).toBe(0xffffff);

    const dividerRects =
      view.levelRail.dividers.context.instructions.filter(
        (instruction) =>
          Boolean(findPath(instruction, 'roundRect')),
      );
    expect(dividerRects.map(readPath)).toEqual([
      [176.25, 30, 3, 33, 1.5],
      [182.25, 30, 3, 33, 1.5],
      [179.25, 30, 3, 33, 1.5],
      [332.5, 30, 3, 33, 1.5],
      [338.5, 30, 3, 33, 1.5],
      [335.5, 30, 3, 33, 1.5],
      [488.75, 30, 3, 33, 1.5],
      [494.75, 30, 3, 33, 1.5],
      [491.75, 30, 3, 33, 1.5],
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

  it('does not paint a request divider against the rounded fill cap', () => {
    const view = new PixiTopPanelView({
      assets: createAssets(),
    });

    view.levelRail.renderProgress({
      ratio: 0.25,
      total: 4,
      completed: 1,
    });

    const dividerRects =
      view.levelRail.dividers.context.instructions.filter(
        (instruction) =>
          Boolean(findPath(instruction, 'roundRect')),
      );
    expect(dividerRects.map(readPath)).toEqual([
      [332.5, 30, 3, 33, 1.5],
      [338.5, 30, 3, 33, 1.5],
      [335.5, 30, 3, 33, 1.5],
      [488.75, 30, 3, 33, 1.5],
      [494.75, 30, 3, 33, 1.5],
      [491.75, 30, 3, 33, 1.5],
    ]);

    view.destroy();
  });

  it('keeps the Root Run fill regardless of the selected player rail style', () => {
    const view = new PixiTopPanelView({
      assets: createAssets(),
    });

    view.applyTheme(createPixiThemeSnapshot({
      theme: 'midnight',
      progressBar: 'notched',
    }));

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

    expect(view.levelRail.fill).toBeInstanceOf(NineSliceSprite);
    expect(view.levelRail.fill.tint).toBe(0xffffff);
    expect(view.levelRail.fill.visible).toBe(true);

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
