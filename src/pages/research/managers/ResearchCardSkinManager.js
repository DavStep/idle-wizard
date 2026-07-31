import { gameViewport } from '../../../viewport/gameViewport.js';

const ROOT_RUN_DESIGN_WIDTH = 1080;
const ROOT_RUN_TO_LOGICAL_SCALE = gameViewport.width / ROOT_RUN_DESIGN_WIDTH;
const RESEARCH_SKINS = Object.freeze([
  Object.freeze({
    id: 'cardLocked',
    selector: '.research-page__row.is-locked',
    url: new URL(
      '../../../../assets/game/source/ui/root-run-research/research-upgrade-bg.9.png',
      import.meta.url,
    ).href,
    width: 1000,
    height: 304,
    left: 64,
    top: 55,
    right: 77,
    bottom: 88,
  }),
  Object.freeze({
    id: 'card',
    selector: '.research-page__row',
    url: new URL(
      '../../../../assets/game/source/ui/root-run-research/research-upgrade-bg.9.png',
      import.meta.url,
    ).href,
    width: 1000,
    height: 304,
    left: 64,
    top: 55,
    right: 77,
    bottom: 88,
  }),
  Object.freeze({
    id: 'artLocked',
    selector:
      '.research-page__row.is-locked .research-page__research-art',
    url: new URL(
      '../../../../assets/game/source/ui/root-run-research/squirqle-40-cream.png',
      import.meta.url,
    ).href,
    width: 204,
    height: 194,
    left: 49,
    top: 49,
    right: 50,
    bottom: 50,
  }),
  Object.freeze({
    id: 'art',
    selector: '.research-page__research-art',
    url: new URL(
      '../../../../assets/game/source/ui/root-run-research/squirqle-40-cream.png',
      import.meta.url,
    ).href,
    width: 204,
    height: 194,
    left: 49,
    top: 49,
    right: 50,
    bottom: 50,
  }),
]);
const RESEARCH_SKIN_SELECTOR = RESEARCH_SKINS.map(({ selector }) => selector).join(',');

async function loadPixiRuntime() {
  const { Application, Assets, Container, Graphics, NineSliceSprite } =
    await import('pixi.js');

  return {
    Application,
    Assets,
    Container,
    Graphics,
    NineSliceSprite,
  };
}

function defaultRequestFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback);
  }

  return globalThis.setTimeout?.(callback, 0) ?? 0;
}

function defaultCancelFrame(frameId) {
  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(frameId);
    return;
  }

  globalThis.clearTimeout?.(frameId);
}

function defaultIsSupported() {
  return !String(globalThis.navigator?.userAgent || '')
    .toLowerCase()
    .includes('jsdom');
}

export class ResearchCardSkinManager {
  static explain =
    'Draws the rounded Research card chrome with the same Pixi nine-slice composition used by Root Run while the DOM keeps text and controls.';

  constructor({
    viewport = gameViewport,
    loadPixiRuntime: loadRuntime = loadPixiRuntime,
    observeMutations = true,
    observeResize = true,
    requestFrame = defaultRequestFrame,
    cancelFrame = defaultCancelFrame,
    isSupported = defaultIsSupported,
  } = {}) {
    this.viewport = viewport;
    this.loadPixiRuntime = loadRuntime;
    this.observeMutations = observeMutations;
    this.observeResize = observeResize;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.isSupported = isSupported;
    this.uiLayer = null;
    this.skinLayer = null;
    this.canvas = null;
    this.app = null;
    this.authoredRoot = null;
    this.clipMask = null;
    this.runtime = null;
    this.textures = new Map();
    this.sprites = new Map();
    this.readyPromise = null;
    this.frameId = 0;
    this.destroyed = false;
    this.contextLost = false;
    this.mutationObserver = null;
    this.resizeObserver = null;
    this.handleGeometryChange = () => this.scheduleSync();
    this.handleContextLost = (event) => {
      event.preventDefault?.();
      this.contextLost = true;
      this.deactivatePixiSkin();
      if (this.skinLayer) {
        this.skinLayer.hidden = true;
      }
    };
    this.handleContextRestored = () => {
      this.contextLost = false;
      if (this.skinLayer) {
        this.skinLayer.hidden = false;
      }
      this.syncNow();
      this.activatePixiSkin();
    };
  }

  mount(uiLayer) {
    if (!uiLayer) {
      throw new Error('ResearchCardSkinManager requires the Research UI layer.');
    }

    if (this.uiLayer) {
      return this.canvas;
    }

    this.uiLayer = uiLayer;
    this.destroyed = false;
    this.contextLost = false;

    const gameStage = this.uiLayer.closest('.game-stage');

    if (gameStage?.hasAttribute('data-root-run-ui-renderer')) {
      this.readyPromise = Promise.resolve(null);
      return null;
    }

    if (!this.isSupported()) {
      this.readyPromise = Promise.resolve(null);
      return null;
    }

    this.skinLayer = document.createElement('div');
    this.skinLayer.className = 'research-page__skin-layer';
    this.skinLayer.setAttribute('aria-hidden', 'true');
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'research-page__skin-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.skinLayer.append(this.canvas);
    this.uiLayer.before(this.skinLayer);
    this.uiLayer.addEventListener('scroll', this.handleGeometryChange, true);
    globalThis.window?.addEventListener?.('resize', this.handleGeometryChange);
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    this.readyPromise = this.initialize().catch(() => {
      this.deactivatePixiSkin();
      return null;
    });

    return this.canvas;
  }

  whenReady() {
    return this.readyPromise ?? Promise.resolve(null);
  }

  unmount() {
    this.destroyed = true;
    this.deactivatePixiSkin();
    this.stopObservers();
    this.uiLayer?.removeEventListener('scroll', this.handleGeometryChange, true);
    globalThis.window?.removeEventListener?.('resize', this.handleGeometryChange);
    this.canvas?.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas?.removeEventListener('webglcontextrestored', this.handleContextRestored);

    if (this.frameId) {
      this.cancelFrame(this.frameId);
      this.frameId = 0;
    }

    this.clearSprites();
    this.app?.destroy?.({ removeView: false }, { children: true });
    this.skinLayer?.remove();
    this.uiLayer = null;
    this.skinLayer = null;
    this.canvas = null;
    this.app = null;
    this.authoredRoot = null;
    this.clipMask = null;
    this.runtime = null;
    this.textures.clear();
    this.readyPromise = null;
    this.contextLost = false;
  }

  async initialize() {
    const runtime = await this.loadPixiRuntime();

    if (this.destroyed || !this.canvas) {
      return null;
    }

    const app = new runtime.Application();
    await app.init({
      canvas: this.canvas,
      width: this.viewport.width,
      height: this.viewport.height,
      backgroundAlpha: 0,
      antialias: false,
      autoDensity: true,
      resolution: Math.min(globalThis.devicePixelRatio || 1, 2),
      preference: 'webgl',
      powerPreference: 'high-performance',
      autoStart: false,
    });

    if (this.destroyed || !this.canvas) {
      app.destroy?.({ removeView: false }, { children: true });
      return null;
    }

    this.runtime = runtime;
    this.app = app;
    this.syncCanvasCssSize();
    const textures = await Promise.all(
      RESEARCH_SKINS.map(async (skin) => [skin.id, await runtime.Assets.load(skin.url)]),
    );

    if (this.destroyed || !this.app) {
      return null;
    }

    this.textures = new Map(textures);
    this.authoredRoot = new runtime.Container();
    this.authoredRoot.label = 'researchCardSkinScene';
    this.authoredRoot.eventMode = 'none';
    this.authoredRoot.scale.set(ROOT_RUN_TO_LOGICAL_SCALE);
    this.clipMask = new runtime.Graphics();
    this.clipMask.label = 'researchCardSkinClip';
    this.app.stage.addChild(this.authoredRoot, this.clipMask);
    this.authoredRoot.mask = this.clipMask;
    this.startObservers();
    this.syncNow();
    this.activatePixiSkin();

    return this.app;
  }

  syncCanvasCssSize() {
    if (!this.canvas) {
      return;
    }

    this.canvas.style.width = `${this.viewport.width}px`;
    this.canvas.style.height = `${this.viewport.height}px`;
  }

  startObservers() {
    if (this.observeMutations && typeof globalThis.MutationObserver === 'function') {
      this.mutationObserver = new globalThis.MutationObserver(this.handleGeometryChange);
      this.mutationObserver.observe(this.uiLayer, {
        childList: true,
        subtree: true,
      });
    }

    if (this.observeResize && typeof globalThis.ResizeObserver === 'function') {
      this.resizeObserver = new globalThis.ResizeObserver(this.handleGeometryChange);
      this.resizeObserver.observe(this.uiLayer);
      const list = this.uiLayer.querySelector('.research-page__box-list');

      if (list) {
        this.resizeObserver.observe(list);
      }
    }
  }

  stopObservers() {
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  scheduleSync() {
    if (this.destroyed || !this.app || this.frameId) {
      return;
    }

    let ranSynchronously = false;
    const frameId = this.requestFrame(() => {
      ranSynchronously = true;
      this.frameId = 0;
      this.syncNow();
    });
    this.frameId = ranSynchronously ? 0 : frameId;
  }

  syncNow() {
    if (
      this.destroyed ||
      !this.uiLayer ||
      !this.authoredRoot ||
      !this.clipMask ||
      !this.runtime
    ) {
      return;
    }

    const uiRect = this.uiLayer.getBoundingClientRect();

    if (!uiRect.width || !uiRect.height) {
      return;
    }

    this.syncClipMask(uiRect);
    const elements = Array.from(this.uiLayer.querySelectorAll(RESEARCH_SKIN_SELECTOR));
    const liveElements = new Set(elements);

    for (const [element, sprite] of this.sprites.entries()) {
      if (liveElements.has(element)) {
        continue;
      }

      this.authoredRoot.removeChild(sprite);
      sprite.destroy?.();
      this.sprites.delete(element);
    }

    elements.forEach((element, index) => {
      const skin = RESEARCH_SKINS.find(({ selector }) => element.matches(selector));

      if (!skin) {
        return;
      }

      const sprite = this.ensureSprite(element, skin);
      const rect = this.toLogicalRect(element.getBoundingClientRect(), uiRect);
      sprite.position.set(
        rect.x / ROOT_RUN_TO_LOGICAL_SCALE,
        rect.y / ROOT_RUN_TO_LOGICAL_SCALE,
      );
      const authoredWidth = rect.width / ROOT_RUN_TO_LOGICAL_SCALE;
      const authoredHeight = rect.height / ROOT_RUN_TO_LOGICAL_SCALE;
      sprite.setSize?.(authoredWidth, authoredHeight);
      if (!sprite.setSize) {
        sprite.width = authoredWidth;
        sprite.height = authoredHeight;
      }
      sprite.visible = !element.hidden && rect.width > 0 && rect.height > 0;
      this.authoredRoot.setChildIndex(sprite, index);
    });

    if (!this.contextLost) {
      this.app.render();
    }
  }

  ensureSprite(element, skin) {
    const existing = this.sprites.get(element);

    if (existing) {
      return existing;
    }

    const sprite = new this.runtime.NineSliceSprite({
      texture: this.textures.get(skin.id),
      leftWidth: skin.left,
      topHeight: skin.top,
      rightWidth: skin.right,
      bottomHeight: skin.bottom,
    });
    sprite.label = `researchSkin:${skin.id}`;
    sprite.eventMode = 'none';
    sprite.sourceElement = element;
    this.sprites.set(element, sprite);
    this.authoredRoot.addChild(sprite);
    return sprite;
  }

  syncClipMask(uiRect) {
    const list = this.uiLayer.querySelector('.research-page__box-list');
    const rect = list
      ? this.toLogicalRect(list.getBoundingClientRect(), uiRect)
      : { x: 0, y: 0, width: 0, height: 0 };

    this.clipMask.clear();
    this.clipMask.rect(rect.x, rect.y, rect.width, rect.height);
    this.clipMask.fill({ color: 0xffffff, alpha: 1 });
  }

  toLogicalRect(rect, uiRect) {
    const scaleX = this.viewport.width / uiRect.width;
    const scaleY = this.viewport.height / uiRect.height;

    return {
      x: (rect.left - uiRect.left) * scaleX,
      y: (rect.top - uiRect.top) * scaleY,
      width: rect.width * scaleX,
      height: rect.height * scaleY,
    };
  }

  clearSprites() {
    for (const sprite of this.sprites.values()) {
      this.authoredRoot?.removeChild?.(sprite);
      sprite.destroy?.();
    }

    this.sprites.clear();
  }

  activatePixiSkin() {
    if (this.uiLayer && !this.destroyed) {
      this.uiLayer.dataset.researchSkinRenderer = 'pixi';
    }
  }

  deactivatePixiSkin() {
    if (this.uiLayer) {
      delete this.uiLayer.dataset.researchSkinRenderer;
    }
  }
}
