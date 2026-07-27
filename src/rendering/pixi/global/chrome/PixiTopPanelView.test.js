// @vitest-environment jsdom

import { installPixiPageTestCanvas } from '../../pages/workshop/PixiPageTestHarness.js';
import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { SemanticTargetRegistry } from '../../retained/index.js';
import { createPixiThemeSnapshot } from '../../theme/PixiThemeTokens.js';
import { PixiTopPanelView } from './PixiTopPanelView.js';

installPixiPageTestCanvas();

describe('PixiTopPanelView', () => {
  it('updates resources and quest geometry without rebuilding the display tree', () => {
    const semanticRegistry = new SemanticTargetRegistry();
    const view = new PixiTopPanelView({
      assets: createAssets(),
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
    expect(view.username.textObject.style.fill).toBe('#ffffff');
    expect(view.username.textObject.style.stroke).toMatchObject({
      color: '#0a0a0a',
      width: 2,
    });
    expect(view.mana.amount).toBe('41/80');
    expect(view.manaRate.text).toBe('+2.25/s');
    expect(view.coin.amount).toBe('1.2k');
    expect(view.contextCurrency.resource).toBe('ruby');
    expect(view.levelValue.text).toBe('4');
    expect(view.questRail.visible).toBe(true);
    expect(semanticRegistry.get('top.coin')?.displayObject).toBe(view.coin);
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

  it('draws the production quest rail capsule, inset edges, and segment shadows', () => {
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

    const instructions = view.questRail.context.instructions;
    const railRects = instructions.filter(
      (instruction) => {
        const path = findPath(instruction, 'roundRect');
        return path && path.data[2] > 1;
      },
    );
    expect(railRects).toHaveLength(5);
    expect(readPath(railRects[0])).toEqual([0, 0, 208, 14, 7]);
    expect(railRects[0].data.style).toMatchObject({
      color: 0x000000,
      alpha: 0.6,
    });
    expect(readPath(railRects[1])).toEqual([0, 0, 208, 14, 7]);
    expect(railRects[1].data.style).toMatchObject({
      color: 0x000000,
      width: 1,
      alignment: 1,
    });
    expect(readPath(railRects[2])).toEqual([1, 1, 206, 12, 6]);
    expect(railRects[2].data.style).toMatchObject({
      color: 0x090705,
      alpha: 0.64,
      width: 1,
      alignment: 1,
    });
    expect(readPath(railRects[3])).toEqual([1, 1, 77, 12, 6]);
    expect(railRects[3].data.style.color).toBe(0x8740df);
    expect(readPath(railRects[4])).toEqual([1, 1, 77, 12, 6]);
    expect(railRects[4].data.style).toMatchObject({
      color: 0xbd72f3,
      width: 1,
      alignment: 1,
    });

    const dividerRects = instructions.filter(
      (instruction) => {
        const path = findPath(instruction, 'roundRect');
        return path && path.data[2] === 1;
      },
    );
    expect(dividerRects.map(readPath)).toEqual([
      [51, 3, 1, 8, 1],
      [53, 3, 1, 8, 1],
      [52, 3, 1, 8, 1],
      [102, 3, 1, 8, 1],
      [104, 3, 1, 8, 1],
      [103, 3, 1, 8, 1],
      [153, 3, 1, 8, 1],
      [155, 3, 1, 8, 1],
      [154, 3, 1, 8, 1],
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

  it('replays the exact quest-receive badge and rail peaks on progress completion', () => {
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
      completed: 1,
      loadRevision: 3,
    }));

    view.bind(createTopModel({
      completed: 2,
      loadRevision: 3,
    }));

    expect(motion.requestFrame).toHaveBeenCalledTimes(1);
    motion.runAt(140 * 0.52);
    expect(view.levelMotionRoot.scale.x).toBeCloseTo(1.06, 5);
    expect(view.levelMotionRoot.scale.y).toBeCloseTo(1.06, 5);
    expect(view.levelMotionRoot.position.y).toBeCloseTo(13, 5);
    expect(view.questRail.scale.y).toBeCloseTo(1.35, 5);

    motion.runAt(140);
    expect(view.levelMotionRoot.scale.x).toBe(1);
    expect(view.levelMotionRoot.position.y).toBe(14);
    expect(view.questRail.scale.y).toBe(1);
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
    expect(view.levelMotionRoot.position.y).toBeCloseTo(11, 5);
    expect(view.questRail.scale.y).toBe(1);

    motion.runAt(230 * 0.74);
    expect(view.levelMotionRoot.scale.x).toBeCloseTo(0.994, 5);
    expect(view.levelMotionRoot.position.y).toBeCloseTo(15, 5);

    motion.runAt(230);
    expect(view.levelMotionRoot.scale.x).toBe(1);
    expect(view.levelMotionRoot.position.y).toBe(14);
    expect(motion.hasPendingFrame()).toBe(false);

    view.destroy();
  });

  it('suppresses hydration and reduced-motion feedback and restores transforms on deactivate', () => {
    const motion = createMotionHarness();
    let reduced = false;
    const view = new PixiTopPanelView({
      assets: createAssets(),
      reducedMotion: () => reduced,
      requestFrame: motion.requestFrame,
      cancelFrame: motion.cancelFrame,
      timeSource: motion.timeSource,
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
    motion.runAt(140 * 0.52);
    expect(view.questRail.scale.y).toBeCloseTo(1.35, 5);

    view.deactivate();
    expect(motion.cancelFrame).toHaveBeenCalledTimes(1);
    expect(view.levelMotionRoot.scale.x).toBe(1);
    expect(view.levelMotionRoot.position.y).toBe(14);
    expect(view.questRail.scale.y).toBe(1);

    view.destroy();
  });
});

function createAssets() {
  return {
    loaded: false,
    getTexture: () => Texture.EMPTY,
    getAtlasTexture: () => Texture.EMPTY,
  };
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
