// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { ResearchCardSkinManager } from './ResearchCardSkinManager.js';

const ROOT_RUN_TO_LOGICAL_SCALE = 390 / 1080;

function setRect(element, { left, top, width, height }) {
  element.getBoundingClientRect = () => ({
    x: left,
    y: top,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  });
}

function createFakePixiRuntime() {
  const sprites = [];
  const loadedUrls = [];
  const applications = [];

  class FakePoint {
    constructor() {
      this.x = 0;
      this.y = 0;
    }

    set(x, y = x) {
      this.x = x;
      this.y = y;
    }
  }

  class FakeContainer {
    constructor() {
      this.children = [];
      this.position = new FakePoint();
      this.scale = new FakePoint();
      this.visible = true;
      this.label = '';
      this.mask = null;
      this.destroyed = false;
    }

    addChild(...children) {
      this.children.push(...children);
      return children.at(-1);
    }

    removeChild(child) {
      this.children = this.children.filter((candidate) => candidate !== child);
      return child;
    }

    setChildIndex(child, index) {
      this.removeChild(child);
      this.children.splice(index, 0, child);
    }

    destroy() {
      this.destroyed = true;
      this.children.length = 0;
    }
  }

  class FakeGraphics extends FakeContainer {
    clear() {
      this.rectValue = null;
      return this;
    }

    rect(x, y, width, height) {
      this.rectValue = { x, y, width, height };
      return this;
    }

    fill() {
      return this;
    }
  }

  class FakeNineSliceSprite extends FakeContainer {
    constructor(options) {
      super();
      this.options = options;
      this.texture = options.texture;
      this.leftWidth = options.leftWidth;
      this.topHeight = options.topHeight;
      this.rightWidth = options.rightWidth;
      this.bottomHeight = options.bottomHeight;
      this.width = 0;
      this.height = 0;
      sprites.push(this);
    }

    setSize(width, height) {
      this.width = width;
      this.height = height;
    }
  }

  class FakeApplication {
    constructor() {
      this.stage = new FakeContainer();
      this.destroyed = false;
      this.renderCount = 0;
      applications.push(this);
    }

    async init(options) {
      this.initOptions = options;
    }

    render() {
      this.renderCount += 1;
    }

    destroy() {
      this.destroyed = true;
    }
  }

  const Assets = {
    load: vi.fn(async (url) => {
      loadedUrls.push(url);
      return { url };
    }),
  };

  return {
    runtime: {
      Application: FakeApplication,
      Assets,
      Container: FakeContainer,
      Graphics: FakeGraphics,
      NineSliceSprite: FakeNineSliceSprite,
    },
    applications,
    loadedUrls,
    sprites,
  };
}

function createResearchSurface({ locked = false } = {}) {
  const page = document.createElement('article');
  page.className = 'research-page';
  const uiLayer = document.createElement('div');
  uiLayer.className = 'research-page__ui-layer';
  setRect(uiLayer, { left: 0, top: 0, width: 390, height: 844 });

  const content = document.createElement('div');
  content.className = 'research-page__content';

  const list = document.createElement('div');
  list.className = 'research-page__box-list';
  setRect(list, { left: 16, top: 104, width: 358, height: 600 });

  const row = document.createElement('div');
  row.className = 'research-page__row';
  row.classList.toggle('is-locked', locked);
  setRect(row, {
    left: 14,
    top: 128,
    width: 1000 * ROOT_RUN_TO_LOGICAL_SCALE,
    height: 90,
  });

  const art = document.createElement('span');
  art.className = 'research-page__research-art';
  setRect(art, {
    left: 14 + 30 * ROOT_RUN_TO_LOGICAL_SCALE,
    top: 128 + 16,
    width: 58,
    height: 58,
  });

  row.append(art);
  list.append(row);
  content.append(list);
  uiLayer.append(content);
  page.append(uiLayer);

  return { art, list, page, row, uiLayer };
}

describe('ResearchCardSkinManager', () => {
  it.each(['initializing', 'ready', 'fallback'])(
    'leaves Research on its CSS fallback when the shared renderer is %s',
    async (rendererState) => {
      const { runtime, applications } = createFakePixiRuntime();
      const loadPixiRuntime = vi.fn(async () => runtime);
      const { page, uiLayer } = createResearchSurface();
      const stage = document.createElement('main');
      stage.className = 'game-stage';
      stage.dataset.rootRunUiRenderer = rendererState;
      stage.append(page);
      const manager = new ResearchCardSkinManager({
        loadPixiRuntime,
        isSupported: () => true,
      });

      expect(manager.mount(uiLayer)).toBeNull();
      await expect(manager.whenReady()).resolves.toBeNull();

      expect(loadPixiRuntime).not.toHaveBeenCalled();
      expect(applications).toHaveLength(0);
      expect(stage.querySelector('.research-page__skin-layer')).toBeNull();
      expect(stage.querySelector('.research-page__skin-canvas')).toBeNull();
      expect(uiLayer.dataset.researchSkinRenderer).toBeUndefined();

      manager.unmount();
    },
  );

  it('composes Root Run research skins at authored size before scaling the Pixi layer', async () => {
    const { runtime, applications, loadedUrls, sprites } = createFakePixiRuntime();
    const { art, list, row, uiLayer } = createResearchSurface();
    const manager = new ResearchCardSkinManager({
      loadPixiRuntime: async () => runtime,
      observeMutations: false,
      observeResize: false,
      isSupported: () => true,
      requestFrame: (callback) => {
        callback();
        return 1;
      },
    });

    manager.mount(uiLayer);
    await manager.whenReady();

    expect(applications).toHaveLength(1);
    expect(applications[0].initOptions).toMatchObject({
      width: 390,
      height: 844,
      antialias: false,
      autoDensity: true,
      preference: 'webgl',
      autoStart: false,
    });
    expect(applications[0].renderCount).toBe(1);
    expect(uiLayer.dataset.researchSkinRenderer).toBe('pixi');
    expect(uiLayer.parentElement.querySelector('.research-page__skin-canvas')).not.toBeNull();
    expect(loadedUrls.map((url) => new URL(url, 'http://localhost').pathname)).toEqual([
      '/assets/game/source/ui/root-run-research/research-upgrade-bg.9.png',
      '/assets/game/source/ui/root-run-research/research-upgrade-bg.9.png',
      '/assets/game/source/ui/root-run-research/squirqle-40-cream.png',
      '/assets/game/source/ui/root-run-research/squirqle-40-cream.png',
    ]);
    const authoredRoot = applications[0].stage.children.find(
      (child) => child.label === 'researchCardSkinScene',
    );
    const clipMask = applications[0].stage.children.find(
      (child) => child.label === 'researchCardSkinClip',
    );
    expect(authoredRoot.scale).toMatchObject({
      x: ROOT_RUN_TO_LOGICAL_SCALE,
      y: ROOT_RUN_TO_LOGICAL_SCALE,
    });
    expect(clipMask.rectValue).toEqual({
      x: 16,
      y: 104,
      width: 358,
      height: 600,
    });

    const rowSprite = sprites.find((sprite) => sprite.sourceElement === row);
    const artSprite = sprites.find((sprite) => sprite.sourceElement === art);

    expect(rowSprite).toMatchObject({
      leftWidth: 64,
      topHeight: 55,
      rightWidth: 77,
      bottomHeight: 88,
    });
    expect(rowSprite.width).toBeCloseTo(1000);
    expect(rowSprite.height).toBeCloseTo(90 / ROOT_RUN_TO_LOGICAL_SCALE);
    expect(artSprite).toMatchObject({
      leftWidth: 49,
      topHeight: 49,
      rightWidth: 50,
      bottomHeight: 50,
    });
    expect(artSprite.width).toBeCloseTo(58 / ROOT_RUN_TO_LOGICAL_SCALE);
    expect(artSprite.height).toBeCloseTo(58 / ROOT_RUN_TO_LOGICAL_SCALE);
    const initialRowY = rowSprite.position.y;
    setRect(row, {
      left: 14,
      top: 108,
      width: 1000 * ROOT_RUN_TO_LOGICAL_SCALE,
      height: 90,
    });
    list.dispatchEvent(new window.Event('scroll'));

    expect(sprites).toHaveLength(2);
    expect(rowSprite.position.y).toBeLessThan(initialRowY);
    expect(applications[0].renderCount).toBe(2);

    const canvas = uiLayer.parentElement.querySelector(
      '.research-page__skin-canvas',
    );
    canvas.dispatchEvent(new window.Event('webglcontextlost', { cancelable: true }));
    expect(uiLayer.dataset.researchSkinRenderer).toBeUndefined();
    expect(canvas.parentElement.hidden).toBe(true);
    list.dispatchEvent(new window.Event('scroll'));
    expect(applications[0].renderCount).toBe(2);
    canvas.dispatchEvent(new window.Event('webglcontextrestored'));
    expect(uiLayer.dataset.researchSkinRenderer).toBe('pixi');
    expect(canvas.parentElement.hidden).toBe(false);
    expect(applications[0].renderCount).toBe(3);

    manager.unmount();

    expect(uiLayer.dataset.researchSkinRenderer).toBeUndefined();
    expect(applications[0].destroyed).toBe(true);
  });

  it('uses the normal card and art textures for locked rows', async () => {
    const { runtime, sprites } = createFakePixiRuntime();
    const { art, row, uiLayer } = createResearchSurface({ locked: true });
    const manager = new ResearchCardSkinManager({
      loadPixiRuntime: async () => runtime,
      observeMutations: false,
      observeResize: false,
      isSupported: () => true,
    });

    manager.mount(uiLayer);
    await manager.whenReady();

    expect(
      new URL(
        sprites.find((sprite) => sprite.sourceElement === row)?.texture?.url,
        'http://localhost',
    ).pathname,
    ).toBe(
      '/assets/game/source/ui/root-run-research/research-upgrade-bg.9.png',
    );
    expect(
      new URL(
        sprites.find((sprite) => sprite.sourceElement === art)?.texture?.url,
        'http://localhost',
    ).pathname,
    ).toBe(
      '/assets/game/source/ui/root-run-research/squirqle-40-cream.png',
    );

    manager.unmount();
  });
});
