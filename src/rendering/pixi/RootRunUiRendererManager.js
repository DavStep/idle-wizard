import {
  Assets,
  ColorMatrixFilter,
  Container,
  FillGradient,
  Graphics,
  NineSliceSprite,
  Sprite,
  Spritesheet,
  Text,
  TextStyle,
  Texture,
} from 'pixi.js';

import {
  gameAssetAtlasImageUrl,
  gameAssetAtlasPixiData,
} from '../../assets/generated/game-asset-atlas.generated.js';
import { getSeedPackIconLayout } from '../../assets/items/seeds/seedIconFrames.js';
import { gameViewport } from '../../viewport/gameViewport.js';
import { UiWidgetPoolManager } from '../managers/UiWidgetPoolManager.js';
import { PIXI_SQUIRCLE_TINTS } from './theme/PixiThemeTokens.js';

const ROOT_RUN_DESIGN_WIDTH = 1080;
const ROOT_RUN_TO_LOGICAL_SCALE = gameViewport.width / ROOT_RUN_DESIGN_WIDTH;
const RENDERER_ATTRIBUTE = 'data-root-run-ui-renderer';
const RENDERED_ROOT_ATTRIBUTE = 'data-root-run-ui-rendered';
const DOM_FALLBACK_ATTRIBUTE = 'data-root-run-dom-fallback';
const PAGE_CACHE_STATE_ATTRIBUTE = 'data-page-cache-state';
const INACTIVE_PAGE_CACHE_SELECTOR =
  `[${PAGE_CACHE_STATE_ATTRIBUTE}="inactive"]`;
const INTERNAL_ATTRIBUTE_NAMES = new Set([
  RENDERER_ATTRIBUTE,
  RENDERED_ROOT_ATTRIBUTE,
  DOM_FALLBACK_ATTRIBUTE,
]);
const DOCUMENT_STYLE_ATTRIBUTES = [
  'data-style-theme',
  'data-style-font',
  'data-style-progress',
  'data-style-icons',
  'data-style-color',
];
const EXCLUDED_ROOT_SELECTOR = [
  '.game-canvas',
  '.app-fps-display',
  '.dev-console',
  '[data-pixi-visual-skip="true"]',
].join(',');
const EXCLUDED_ELEMENT_SELECTOR = [
  '.game-canvas',
  '.app-fps-display',
  '.dev-console',
  '[data-pixi-visual-skip="true"]',
].join(',');
const RESEARCH_SKINS = Object.freeze([
  Object.freeze({
    selector: '.research-page__row.is-locked',
    url: new URL(
      '../../../assets/game/source/ui/root-run-research/research-upgrade-bg-locked.png',
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
    selector: '.research-page__row',
    url: new URL(
      '../../../assets/game/source/ui/root-run-research/research-upgrade-bg.9.png',
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
    selector:
      '.research-page__row.is-locked .research-page__research-art',
    url: new URL(
      '../../../assets/game/source/ui/white-squircle/white-squircle-40.9.png',
      import.meta.url,
    ).href,
    width: 83,
    height: 83,
    left: 41,
    top: 41,
    right: 41,
    bottom: 41,
    tint: PIXI_SQUIRCLE_TINTS.lockedArtWell,
  }),
  Object.freeze({
    selector: '.research-page__research-art',
    url: new URL(
      '../../../assets/game/source/ui/white-squircle/white-squircle-40.9.png',
      import.meta.url,
    ).href,
    width: 83,
    height: 83,
    left: 41,
    top: 41,
    right: 41,
    bottom: 41,
    tint: PIXI_SQUIRCLE_TINTS.artWell,
  }),
]);
const RESEARCH_FALLBACK_PSEUDO_SELECTORS = new Map();
const TRANSPARENT = Object.freeze({ color: 0, alpha: 0 });
const DEFAULT_BACKGROUND = Object.freeze({ color: 0xd6d6d6, alpha: 1 });
const MAX_RETAINED_ROLES_PER_POOLED_WIDGET = 32;

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

function defaultGetComputedStyle(element, pseudo) {
  return globalThis.getComputedStyle(element, pseudo);
}

function defaultCreateRasterCanvas(width, height, documentRef) {
  if (typeof globalThis.OffscreenCanvas === 'function') {
    return new globalThis.OffscreenCanvas(width, height);
  }

  const canvas = documentRef?.createElement?.('canvas');
  if (!canvas) {
    return null;
  }
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export class RootRunUiRendererManager {
  static explain =
    'Renders every game UI surface through one fixed 390x844 retained Pixi scene, while the DOM remains the source of layout, input, tutorial targets, and accessibility.';

  constructor({
    stage,
    canvas,
    layers,
    viewport = gameViewport,
    runtime = {
      Assets,
      ColorMatrixFilter,
      Container,
      FillGradient,
      Graphics,
      NineSliceSprite,
      Sprite,
      Spritesheet,
      Text,
      TextStyle,
      Texture,
    },
    getComputedStyle = defaultGetComputedStyle,
    requestFrame = defaultRequestFrame,
    cancelFrame = defaultCancelFrame,
    createRasterCanvas = defaultCreateRasterCanvas,
    maxPooledWidgets,
  } = {}) {
    this.stage = stage;
    this.canvas = canvas;
    this.layers = layers;
    this.viewport = viewport;
    this.runtime = runtime;
    this.getComputedStyle = getComputedStyle;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.createRasterCanvas = createRasterCanvas;
    this.layerRoots = null;
    this.stageBackground = null;
    this.records = new Map();
    this.usedNodes = new Set();
    this.uiWidgetPool = new UiWidgetPoolManager({
      maxSize: maxPooledWidgets,
      create: (element) => this.createElementRecord(element),
      prepare: (record, element) =>
        this.prepareElementRecord(record, element),
      reset: (record) => this.resetElementRecord(record),
      destroy: (record) => this.destroyElementRecord(record),
    });
    this.textureCache = new Map();
    this.texturePromises = new Map();
    this.failedTextureUrls = new Set();
    this.atlasTextures = null;
    this.atlasSpritesheet = null;
    this.atlasPromise = null;
    this.frameId = 0;
    this.animationFrameId = 0;
    this.refreshPromise = null;
    this.refreshRequested = false;
    this.mutationObserver = null;
    this.resizeObserver = null;
    this.destroyed = false;
    this.failed = false;
    this.nativeInputFallbackActive = false;
    this.animatedElements = new Set();
    this.externalDisplayObjects = new Map();
    this.warnedAssetUrls = new Set();
    this.handleInvalidation = () => this.scheduleRefresh();
    this.handleMutations = (mutations) => {
      this.recycleDetachedRecords();
      if (this.shouldIgnoreMutations(mutations)) {
        return;
      }

      this.scheduleRefresh();
    };
    this.handleFocusIn = (event) => {
      this.showNativeInputRoot(event.target);
      this.scheduleRefresh();
    };
    this.handleFocusOut = () => {
      if (!this.nativeInputFallbackActive) {
        return;
      }
      this.requestFrame(() => this.restoreNativeInputRoots());
    };
    this.handleAnimationStart = (event) => {
      this.trackAnimatedElement(event.target);
    };
    this.handleAnimationEnd = (event) => {
      this.trackAnimatedElement(event.target);
    };
    this.handleContextLost = (event) => {
      event.preventDefault?.();
      this.failOpen();
    };
    this.handleContextRestored = () => {
      if (this.destroyed) {
        return;
      }

      this.failed = false;
      this.stage?.setAttribute(RENDERER_ATTRIBUTE, 'initializing');
      this.setLayerVisibility(false);
      this.scheduleRefresh();
    };
  }

  mount() {
    if (!this.stage || !this.canvas || !this.layers) {
      throw new Error(
        'RootRunUiRendererManager requires a stage, canvas, and Pixi layers.',
      );
    }

    if (this.layerRoots) {
      return this.refreshPromise ?? Promise.resolve(this.layerRoots);
    }

    this.destroyed = false;
    this.failed = false;
    this.stage.setAttribute(RENDERER_ATTRIBUTE, 'initializing');
    this.createLayerRoots();
    this.setLayerVisibility(false);
    this.observe();
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.addEventListener(
      'webglcontextrestored',
      this.handleContextRestored,
    );
    this.refreshPromise = this.refresh().finally(() => {
      this.refreshPromise = null;
      if (this.refreshRequested && !this.destroyed) {
        this.refreshRequested = false;
        this.scheduleRefresh();
      }
    });
    return this.refreshPromise;
  }

  unmount() {
    this.destroyed = true;
    this.failed = false;
    this.nativeInputFallbackActive = false;
    this.stopObserving();
    this.canvas?.removeEventListener(
      'webglcontextlost',
      this.handleContextLost,
    );
    this.canvas?.removeEventListener(
      'webglcontextrestored',
      this.handleContextRestored,
    );

    if (this.frameId) {
      this.cancelFrame(this.frameId);
      this.frameId = 0;
    }
    if (this.animationFrameId) {
      this.cancelFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }

    this.restoreAllDomRoots();
    this.destroyRecords();
    this.uiWidgetPool.clear();
    for (const root of Object.values(this.layerRoots ?? {})) {
      root?.destroy?.({ children: true });
    }
    this.layerRoots = null;
    this.stageBackground = null;
    this.atlasSpritesheet?.destroy?.(false);
    this.atlasSpritesheet = null;
    this.textureCache.clear();
    this.texturePromises.clear();
    this.failedTextureUrls.clear();
    this.atlasTextures = null;
    this.atlasPromise = null;
    this.refreshPromise = null;
    this.refreshRequested = false;
    this.usedNodes.clear();
    this.animatedElements.clear();
    this.detachAllExternalDisplayObjects();
    this.externalDisplayObjects.clear();
    this.stage?.removeAttribute(RENDERER_ATTRIBUTE);
  }

  createLayerRoots() {
    const { Container: PixiContainer, Graphics: PixiGraphics } = this.runtime;
    const background = new PixiContainer();
    background.label = 'rootRunUi:background';
    background.eventMode = 'none';
    const ui = new PixiContainer();
    ui.label = 'rootRunUi:ui';
    ui.eventMode = 'none';
    ui.sortableChildren = true;
    const popup = new PixiContainer();
    popup.label = 'rootRunUi:popup';
    popup.eventMode = 'none';
    const overlay = new PixiContainer();
    overlay.label = 'rootRunUi:overlay';
    overlay.eventMode = 'none';
    this.stageBackground = new PixiGraphics();
    this.stageBackground.label = 'rootRunUi:stageBackground';
    background.addChild(this.stageBackground);
    this.layers.background.addChild(background);
    this.layers.ui.addChild(ui);
    this.layers.popup.addChild(popup);
    this.layers.overlay.addChild(overlay);
    this.layerRoots = { background, ui, popup, overlay };
  }

  observe() {
    const events = [
      'pointerdown',
      'pointerup',
      'pointercancel',
      'pointerover',
      'pointerout',
      'input',
      'change',
      'scroll',
    ];

    for (const eventName of events) {
      this.stage.addEventListener(eventName, this.handleInvalidation, true);
    }
    this.stage.addEventListener(
      'animationstart',
      this.handleAnimationStart,
      true,
    );
    this.stage.addEventListener(
      'animationend',
      this.handleAnimationEnd,
      true,
    );
    this.stage.addEventListener(
      'animationcancel',
      this.handleAnimationEnd,
      true,
    );
    this.stage.addEventListener(
      'transitionrun',
      this.handleAnimationStart,
      true,
    );
    this.stage.addEventListener(
      'transitionend',
      this.handleAnimationEnd,
      true,
    );
    this.stage.addEventListener(
      'transitioncancel',
      this.handleAnimationEnd,
      true,
    );
    this.stage.addEventListener('focusin', this.handleFocusIn, true);
    this.stage.addEventListener('focusout', this.handleFocusOut, true);
    this.reconcileAnimatedElements();

    if (typeof globalThis.MutationObserver === 'function') {
      this.mutationObserver = new globalThis.MutationObserver(
        this.handleMutations,
      );
      this.mutationObserver.observe(this.stage, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
      });
      const documentElement = this.stage.ownerDocument?.documentElement;
      if (documentElement && documentElement !== this.stage) {
        this.mutationObserver.observe(documentElement, {
          attributes: true,
          attributeFilter: DOCUMENT_STYLE_ATTRIBUTES,
        });
      }
    }

    if (typeof globalThis.ResizeObserver === 'function') {
      this.resizeObserver = new globalThis.ResizeObserver(
        this.handleInvalidation,
      );
      this.resizeObserver.observe(this.stage);
      this.resizeObserver.observe(this.canvas);
    }
  }

  stopObserving() {
    const events = [
      'pointerdown',
      'pointerup',
      'pointercancel',
      'pointerover',
      'pointerout',
      'input',
      'change',
      'scroll',
    ];

    for (const eventName of events) {
      this.stage?.removeEventListener(
        eventName,
        this.handleInvalidation,
        true,
      );
    }
    this.stage?.removeEventListener(
      'animationstart',
      this.handleAnimationStart,
      true,
    );
    this.stage?.removeEventListener(
      'animationend',
      this.handleAnimationEnd,
      true,
    );
    this.stage?.removeEventListener(
      'animationcancel',
      this.handleAnimationEnd,
      true,
    );
    this.stage?.removeEventListener(
      'transitionrun',
      this.handleAnimationStart,
      true,
    );
    this.stage?.removeEventListener(
      'transitionend',
      this.handleAnimationEnd,
      true,
    );
    this.stage?.removeEventListener(
      'transitioncancel',
      this.handleAnimationEnd,
      true,
    );
    this.stage?.removeEventListener('focusin', this.handleFocusIn, true);
    this.stage?.removeEventListener('focusout', this.handleFocusOut, true);
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  shouldIgnoreMutations(mutations) {
    return mutations.every((mutation) => {
      if (mutation.target === this.canvas) {
        return true;
      }

      return (
        mutation.type === 'attributes' &&
        INTERNAL_ATTRIBUTE_NAMES.has(mutation.attributeName)
      );
    });
  }

  scheduleRefresh() {
    if (
      this.destroyed ||
      this.failed ||
      this.nativeInputFallbackActive ||
      this.frameId
    ) {
      return;
    }

    if (this.refreshPromise) {
      this.refreshRequested = true;
      return;
    }

    this.frameId = this.requestFrame(() => {
      this.frameId = 0;
      this.refreshPromise = this.refresh()
        .catch((error) => {
          globalThis.console?.warn?.(
            '[rendering] Root Run UI renderer fell back to DOM.',
            error,
          );
          this.failOpen();
        })
        .finally(() => {
          this.refreshPromise = null;
          if (this.refreshRequested && !this.destroyed && !this.failed) {
            this.refreshRequested = false;
            this.scheduleRefresh();
          }
        });
    });
  }

  async refresh() {
    if (
      this.destroyed ||
      this.failed ||
      this.nativeInputFallbackActive ||
      !this.layerRoots
    ) {
      return null;
    }

    await this.waitForFonts();
    const roots = this.getStageRoots();
    const rootStates = await Promise.all(
      roots.map(async (root) => ({
        root,
        ready: await this.prepareRoot(root),
      })),
    );

    if (this.destroyed || this.failed || !this.layerRoots) {
      return null;
    }

    const failedRoot = rootStates.find(
      ({ root, ready }) =>
        !ready &&
        this.stage.contains(root) &&
        this.isElementDisplayed(root) &&
        !root.hasAttribute(DOM_FALLBACK_ATTRIBUTE),
    );
    if (failedRoot) {
      this.failOpen();
      return null;
    }

    this.render(rootStates);
    this.setLayerVisibility(true);
    this.stage.setAttribute(RENDERER_ATTRIBUTE, 'ready');
    this.reconcileAnimatedElements();
    return this.layerRoots;
  }

  async waitForFonts() {
    try {
      await this.stage.ownerDocument?.fonts?.ready;
    } catch {
      // Browser font readiness is advisory; the DOM fallback remains available.
    }
  }

  getStageRoots() {
    return Array.from(this.stage.children).filter(
      (element) =>
        isElementNode(element) &&
        !element.matches(EXCLUDED_ROOT_SELECTOR),
    );
  }

  async prepareRoot(root) {
    if (!this.isElementDisplayed(root)) {
      return true;
    }

    if (root.hasAttribute(DOM_FALLBACK_ATTRIBUTE)) {
      return false;
    }

    const assets = this.collectRootAssets(root);
    const results = await Promise.allSettled(
      [...assets.urls].map((url) => this.ensureTexture(url)),
    );
    const textureFailure = results.some(
      (result) => result.status === 'rejected',
    );
    let atlasFailure = false;

    if (assets.needsAtlas) {
      try {
        await this.ensureAtlasTextures();
      } catch {
        atlasFailure = true;
      }
    }

    const imagesReady = await this.waitForRootImages(root);
    const ready = !textureFailure && !atlasFailure && imagesReady;

    if (!ready) {
      root.removeAttribute(RENDERED_ROOT_ATTRIBUTE);
    }

    return ready;
  }

  collectRootAssets(root) {
    const urls = new Set();
    let needsAtlas = false;
    const visit = (element) => {
      if (!isElementNode(element) || element.matches(EXCLUDED_ELEMENT_SELECTOR)) {
        return;
      }

      if (!this.isElementDisplayed(element)) {
        return;
      }

      const style = this.getComputedStyle(element);
      this.collectStyleUrls(style, urls);
      this.collectStyleUrls(this.getComputedStyle(element, '::before'), urls);
      this.collectStyleUrls(this.getComputedStyle(element, '::after'), urls);
      const researchSkin = getResearchSkin(element);

      if (researchSkin) {
        urls.add(researchSkin.url);
      }

      if (element.dataset?.assetAtlasFrame) {
        needsAtlas = true;
      }

      for (const child of element.children) {
        visit(child);
      }
    };

    visit(root);
    return { urls, needsAtlas };
  }

  collectStyleUrls(style, urls) {
    if (!style || style.display === 'none') {
      return;
    }

    for (const value of [
      style.backgroundImage,
      style.borderImageSource,
      style.maskImage,
      style.webkitMaskImage,
      style.mask,
      style.webkitMask,
    ]) {
      for (const url of extractCssUrls(value)) {
        urls.add(url);
      }
    }
  }

  async waitForRootImages(root) {
    const renderableImages = Array.from(root.querySelectorAll('img')).filter(
      (image) => this.isElementDisplayedWithinRoot(image, root),
    );
    const pending = renderableImages.filter((image) => !image.complete);
    const failed = renderableImages.some(
      (image) => image.complete && !image.naturalWidth,
    );

    if (failed) {
      return false;
    }

    if (pending.length === 0) {
      return true;
    }

    const results = await Promise.all(
      pending.map(
        (image) =>
          new Promise((resolve) => {
            let settled = false;
            const settle = () => {
              if (settled) {
                return;
              }
              settled = true;
              image.removeEventListener('load', settle);
              image.removeEventListener('error', settle);
              resolve(Boolean(image.naturalWidth));
            };
            image.addEventListener('load', settle, { once: true });
            image.addEventListener('error', settle, { once: true });
            if (image.complete) {
              settle();
            }
          }),
      ),
    );
    return results.every(Boolean);
  }

  isElementDisplayedWithinRoot(element, root) {
    let current = element;

    while (current) {
      if (!this.isElementDisplayed(current)) {
        return false;
      }
      if (current === root) {
        return true;
      }
      current = current.parentElement;
    }

    return false;
  }

  async ensureTexture(url) {
    if (!url) {
      return null;
    }

    if (this.textureCache.has(url)) {
      return this.textureCache.get(url);
    }
    if (this.failedTextureUrls.has(url)) {
      throw new Error(`UI texture previously failed to load: ${url}`);
    }

    if (!this.texturePromises.has(url)) {
      const promise = this.runtime.Assets.load(url)
        .then((texture) => {
          if (!this.destroyed) {
            this.textureCache.set(url, texture);
          }
          return texture;
        })
        .catch((error) => {
          this.failedTextureUrls.add(url);
          if (!this.warnedAssetUrls.has(url)) {
            this.warnedAssetUrls.add(url);
            globalThis.console?.warn?.(
              `[rendering] Could not load UI texture ${url}.`,
              error,
            );
          }
          throw error;
        })
        .finally(() => {
          this.texturePromises.delete(url);
        });
      this.texturePromises.set(url, promise);
    }

    return this.texturePromises.get(url);
  }

  async ensureAtlasTextures() {
    if (this.atlasTextures) {
      return this.atlasTextures;
    }

    if (!this.atlasPromise) {
      this.atlasPromise = this.runtime.Assets.load(gameAssetAtlasImageUrl)
        .then(async (texture) => {
          const spritesheet = new this.runtime.Spritesheet(
            texture,
            gameAssetAtlasPixiData,
          );
          await spritesheet.parse();
          if (!this.destroyed) {
            this.atlasSpritesheet = spritesheet;
            this.atlasTextures = spritesheet.textures;
          } else {
            spritesheet.destroy?.(false);
          }
          return spritesheet.textures;
        })
        .finally(() => {
          this.atlasPromise = null;
        });
    }

    return this.atlasPromise;
  }

  render(rootStates) {
    const canvasRect = this.canvas.getBoundingClientRect();

    if (!(canvasRect.width > 0) || !(canvasRect.height > 0)) {
      return;
    }

    this.canvasRect = canvasRect;
    this.recycleDetachedRecords();
    this.usedNodes.clear();
    this.drawStageBackground();
    const orderedStates = rootStates
      .map((state, index) => ({
        ...state,
        index,
        zIndex: getNumericZIndex(this.getComputedStyle(state.root).zIndex),
      }))
      .sort((a, b) => a.zIndex - b.zIndex || a.index - b.index);

    for (const { root, ready } of orderedStates) {
      const record = this.records.get(root);

      if (
        !ready ||
        !this.stage.contains(root) ||
        !this.isElementDisplayed(root)
      ) {
        if (record) {
          record.container.visible = false;
        }
        root.removeAttribute(RENDERED_ROOT_ATTRIBUTE);
        continue;
      }

      this.syncElement(root);
      const syncedRecord = this.records.get(root);
      const targetLayer = this.resolveRootLayer(root);

      syncedRecord.container.visible = true;
      syncedRecord.container.zIndex = getNumericZIndex(
        this.getComputedStyle(root).zIndex,
      );
      targetLayer.addChild(syncedRecord.container);
      root.setAttribute(RENDERED_ROOT_ATTRIBUTE, 'true');
    }

    for (const layerRoot of Object.values(this.layerRoots)) {
      layerRoot.sortChildren?.();
    }
    this.cleanupUnusedRecords();
  }

  drawStageBackground() {
    const style = this.getComputedStyle(this.stage);
    const color =
      parseCssColor(style.backgroundColor) ??
      this.readCssColor('--style-surface') ??
      DEFAULT_BACKGROUND;

    this.stageBackground.clear();
    this.stageBackground.rect(
      0,
      0,
      this.viewport.width,
      this.viewport.height,
    );
    this.stageBackground.fill({
      color: color.color,
      alpha: color.alpha || 1,
    });
  }

  resolveRootLayer(root) {
    void root;
    return this.layerRoots.ui;
  }

  syncElement(element) {
    if (!isElementNode(element) || element.matches(EXCLUDED_ELEMENT_SELECTOR)) {
      return null;
    }

    const displayed = this.isElementDisplayed(element);
    const record = this.ensureElementRecord(element);
    this.syncExternalDisplayObjects(element, record);
    this.usedNodes.add(element);
    record.container.visible = displayed;

    if (!displayed) {
      return record;
    }

    const style = this.getComputedStyle(element);
    const rect = this.toLogicalRect(element.getBoundingClientRect());
    record.container.alpha = clampOpacity(
      Number.parseFloat(style.opacity || '1'),
    );
    const negativePseudo = [];
    const beforePseudo = [];
    const afterPseudo = [];
    this.syncPseudo(
      element,
      'before',
      rect,
      record,
      negativePseudo,
      beforePseudo,
    );
    this.syncPseudo(
      element,
      'after',
      rect,
      record,
      negativePseudo,
      afterPseudo,
    );
    const chrome = [];
    this.syncElementBox(element, style, rect, record, chrome);
    const content = [...negativePseudo, ...beforePseudo];
    this.syncAtlasSprite(element, style, rect, record, content);
    this.syncElementImage(element, style, rect, record, content);
    this.syncTutorialBackdrop(element, rect, record, content);
    this.syncRangeInput(element, style, rect, record, content);
    this.syncInputText(element, style, rect, record, content);

    if (!isNativeTextEntryElement(element)) {
      let childIndex = 0;
      for (const child of element.childNodes) {
        const roleIndex = childIndex;
        childIndex += 1;
        if (child.nodeType === globalThis.Node?.TEXT_NODE) {
          const textObject = this.syncTextNode(
            child,
            element,
            record,
            `content:text:${roleIndex}`,
          );
          if (textObject) {
            content.push(textObject);
          }
          continue;
        }

        if (child.nodeType !== globalThis.Node?.ELEMENT_NODE) {
          continue;
        }

        if (
          isTutorialBackdrop(element) ||
          (element.dataset?.assetAtlasFrame &&
            String(child.namespaceURI || '').includes('svg'))
        ) {
          continue;
        }

        const childRecord = this.syncElement(child);
        if (childRecord?.container.visible) {
          childRecord.container.zIndex = getNumericZIndex(
            this.getComputedStyle(child).zIndex,
          );
          content.push(childRecord.container);
        }
      }
    }
    content.push(...afterPseudo);

    this.syncClipMask(style, rect, record);
    record.chrome.removeChildren();
    if (chrome.length > 0) {
      record.chrome.addChild(...chrome);
    }
    record.content.removeChildren();
    if (content.length > 0) {
      record.content.addChild(...content);
    }
    record.content.sortChildren?.();
    this.hideUnusedRoles(record);
    return record;
  }

  ensureElementRecord(element) {
    if (this.records.has(element)) {
      return this.records.get(element);
    }

    const record = this.uiWidgetPool.acquire(element);
    this.records.set(element, record);
    this.syncExternalDisplayObjects(element, record);
    return record;
  }

  createElementRecord() {
    const container = new this.runtime.Container();
    container.eventMode = 'none';
    const visual = new this.runtime.Container();
    visual.label = 'visual';
    visual.eventMode = 'none';
    const clipTarget = new this.runtime.Container();
    clipTarget.label = 'clipTarget';
    clipTarget.eventMode = 'none';
    const chrome = new this.runtime.Container();
    chrome.label = 'chrome';
    chrome.eventMode = 'none';
    const content = new this.runtime.Container();
    content.label = 'content';
    content.eventMode = 'none';
    content.sortableChildren = true;
    const external = new this.runtime.Container();
    external.label = 'external';
    external.eventMode = 'none';
    external.sortableChildren = true;
    const descendants = new this.runtime.Container();
    descendants.label = 'descendants';
    descendants.eventMode = 'none';
    const masks = new this.runtime.Container();
    masks.label = 'masks';
    masks.eventMode = 'none';
    descendants.addChild(content, external);
    visual.addChild(chrome, descendants);
    clipTarget.addChild(visual);
    container.addChild(clipTarget, masks);
    return {
      element: null,
      container,
      clipTarget,
      visual,
      chrome,
      content,
      external,
      descendants,
      masks,
      roles: new Map(),
      usedRoles: new Set(),
      overflowMask: null,
      clipPathMask: null,
      cssMaskCanvas: null,
      cssMaskContext: null,
      cssMaskTexture: null,
      cssMaskSprite: null,
    };
  }

  prepareElementRecord(record, element) {
    record.element = element;
    record.container.label = `dom:${describeElement(element)}`;
    resetPooledDisplayObject(record.container, { visible: true });
    resetPooledDisplayObject(record.clipTarget, { visible: true });
    resetPooledDisplayObject(record.visual, { visible: true });
    resetPooledDisplayObject(record.chrome, { visible: true });
    resetPooledDisplayObject(record.content, { visible: true });
    resetPooledDisplayObject(record.external, { visible: true });
    resetPooledDisplayObject(record.descendants, { visible: true });
    resetPooledDisplayObject(record.masks, { visible: true });
    record.content.sortableChildren = true;
    record.external.sortableChildren = true;
    record.descendants.addChild(record.content, record.external);
    record.visual.addChild(record.chrome, record.descendants);
    record.clipTarget.addChild(record.visual);
    record.container.addChild(record.clipTarget, record.masks);
  }

  resetElementRecord(record) {
    record.element?.removeAttribute?.(RENDERED_ROOT_ATTRIBUTE);
    record.container.removeFromParent?.();
    record.chrome.removeChildren();
    record.content.removeChildren();
    record.external.removeChildren();
    record.descendants.mask = null;
    record.clipTarget.mask = null;
    record.visual.mask = null;

    const unsafeRoleKeys = [];
    for (const [role, entry] of record.roles) {
      entry.object?.removeFromParent?.();
      if (entry.kind === 'container') {
        entry.object?.removeChildren?.();
      }
      if (
        typeof role !== 'string' ||
        String(entry.kind).startsWith('image:') ||
        String(entry.kind).startsWith('gradient:') ||
        (entry.kind === 'spriteShadow' &&
          String(role).startsWith('content:image:'))
      ) {
        unsafeRoleKeys.push(role);
        continue;
      }
      entry.object?.clear?.();
      resetPooledDisplayObject(entry.object);
    }
    for (const role of unsafeRoleKeys) {
      this.destroyRoleObject(record.roles.get(role)?.object);
      record.roles.delete(role);
    }
    this.pruneRetainedRoles(record, [...record.roles.keys()]);

    record.usedRoles.clear();
    if (record.overflowMask) {
      record.overflowMask.clear?.();
      resetPooledDisplayObject(record.overflowMask);
    }
    if (record.clipPathMask) {
      record.clipPathMask.clear?.();
      resetPooledDisplayObject(record.clipPathMask);
    }
    this.destroyCssMaskResources(record);
    resetPooledDisplayObject(record.container);
    record.element = null;
  }

  syncElementBox(element, style, rect, record, output) {
    if (!(rect.width > 0) || !(rect.height > 0)) {
      return;
    }

    const researchSkin = getResearchSkin(element);
    this.syncShadow(style, rect, record, 'box:shadow', output);
    const hasMaskFill = researchSkin
      ? false
      : this.syncMaskedColorFill(
          style,
          rect,
          record,
          'box:maskFill',
          output,
        );
    if (!hasMaskFill) {
      this.syncColorFill(style, rect, record, 'box:fill', output);
      this.syncGradientFill(style, rect, record, 'box:gradient', output);
    }

    if (researchSkin) {
      this.syncResearchNineSlice(
        researchSkin,
        style,
        rect,
        record,
        'box:research',
        output,
      );
    } else {
      this.syncBackgroundImage(
        style,
        rect,
        record,
        'box:backgroundImage',
        output,
      );
      this.syncBorderImage(
        style,
        rect,
        record,
        'box:borderImage',
        output,
      );
    }

    this.syncInsetShadow(style, rect, record, 'box:insetShadow', output);
    this.syncBorders(style, rect, record, 'box:border', output);
    this.syncOutline(style, rect, record, 'box:outline', output);
  }

  syncMaskedColorFill(style, rect, record, role, output) {
    const maskValue = [
      style.maskImage,
      style.webkitMaskImage,
      style.mask,
      style.webkitMask,
    ].find((value) => extractCssUrls(value).length > 0);
    const urls = extractCssUrls(maskValue);
    const background = parseCssColor(style.backgroundColor);

    if (urls.length === 0 || !background || background.alpha <= 0) {
      return false;
    }

    const texture = this.textureCache.get(urls[0]);
    if (!texture) {
      return false;
    }

    const sprite = this.ensureRole(record, role, `sprite:${urls[0]}`, () => {
      const next = new this.runtime.Sprite(texture);
      next.label = role;
      return next;
    });
    sprite.texture = texture;
    resetSpriteTransform(sprite);
    const sourceSize = getTextureSize(texture);
    const maskSize =
      style.maskSize ||
      style.webkitMaskSize ||
      readMaskShorthandSize(maskValue) ||
      'auto';
    const size = parseBackgroundSize(maskSize, rect, sourceSize);
    const position = parseBackgroundPosition(
      style.maskPosition || style.webkitMaskPosition || '50% 50%',
      rect,
      size,
    );
    sprite.position.set(position.x, position.y);
    sprite.width = size.width;
    sprite.height = size.height;
    sprite.tint = background.color;
    sprite.alpha = background.alpha;
    this.applyVisualFilter(sprite, style);
    applySpriteFlips(sprite, style);
    this.syncSpriteDropShadow(
      style,
      sprite,
      record,
      `${role}:dropShadow`,
      output,
    );
    output.push(sprite);
    return true;
  }

  syncPseudo(
    element,
    pseudo,
    parentRect,
    record,
    negativeOutput,
    regularOutput,
  ) {
    if (
      getResearchSkin(element) &&
      RESEARCH_FALLBACK_PSEUDO_SELECTORS.get(pseudo) &&
      element.matches(RESEARCH_FALLBACK_PSEUDO_SELECTORS.get(pseudo))
    ) {
      return;
    }

    const style = this.getComputedStyle(element, `::${pseudo}`);

    if (!isRenderablePseudo(style)) {
      return;
    }

    const visualScale = this.getElementVisualScale(element, parentRect);
    const rect = resolvePseudoRect({
      style,
      parentRect,
      scaleX: visualScale.x,
      scaleY: visualScale.y,
    });

    if (!(rect.width > 0) || !(rect.height > 0)) {
      return;
    }

    const prefix = `pseudo:${pseudo}`;
    const output = [];
    this.syncShadow(style, rect, record, `${prefix}:shadow`, output);
    this.syncColorFill(style, rect, record, `${prefix}:fill`, output);
    this.syncGradientFill(
      style,
      rect,
      record,
      `${prefix}:gradient`,
      output,
    );
    this.syncBackgroundImage(
      style,
      rect,
      record,
      `${prefix}:backgroundImage`,
      output,
    );
    this.syncBorderImage(
      style,
      rect,
      record,
      `${prefix}:borderImage`,
      output,
    );
    this.syncInsetShadow(
      style,
      rect,
      record,
      `${prefix}:insetShadow`,
      output,
    );
    this.syncBorders(style, rect, record, `${prefix}:border`, output);
    const pseudoContent = resolvePseudoContent(style.content, element);
    if (pseudoContent) {
      const textObject = this.syncTextObject({
        record,
        role: `${prefix}:text`,
        text: applyTextTransform(pseudoContent, style.textTransform),
        style,
        rect,
        visualScale,
        wordWrap: style.whiteSpace !== 'nowrap',
      });
      this.alignPseudoText(
        textObject,
        this.getComputedStyle(element),
        parentRect,
      );
      output.push(textObject);
    }
    const pseudoOpacity = clampOpacity(
      Number.parseFloat(style.opacity || '1'),
    );
    const zIndex = getNumericZIndex(style.zIndex);
    const transformedOutput = this.wrapPseudoTransform({
      style,
      rect,
      visualScale,
      record,
      role: `${prefix}:transform`,
      output,
    });
    for (const displayObject of transformedOutput) {
      displayObject.alpha = pseudoOpacity;
      displayObject.zIndex = zIndex;
    }
    (zIndex < 0 ? negativeOutput : regularOutput).push(
      ...transformedOutput,
    );
  }

  alignPseudoText(textObject, parentStyle, parentRect) {
    if (!textObject?.anchor?.set) {
      return;
    }

    const placeItems = String(parentStyle?.placeItems || '').toLowerCase();
    const centerX =
      placeItems.includes('center') ||
      String(parentStyle?.justifyItems || '').toLowerCase() === 'center';
    const centerY =
      placeItems.includes('center') ||
      String(parentStyle?.alignItems || '').toLowerCase() === 'center';

    if (!centerX && !centerY) {
      return;
    }

    textObject.anchor.set(centerX ? 0.5 : 0, centerY ? 0.5 : 0);
    textObject.position.set(
      centerX
        ? parentRect.x + parentRect.width / 2
        : textObject.position.x,
      centerY
        ? parentRect.y + parentRect.height / 2
        : textObject.position.y,
    );
  }

  wrapPseudoTransform({
    style,
    rect,
    visualScale,
    record,
    role,
    output,
  }) {
    const matrix = parseCssTransformMatrix(style.transform);
    const rotation = matrix?.rotation ?? readCssAngle(style.rotate);
    const translateX = (matrix?.e ?? 0) * visualScale.x;
    const translateY = (matrix?.f ?? 0) * visualScale.y;
    const scaleValue = String(style.scale || '').trim();
    const scaleTokens = scaleValue
      ? scaleValue.split(/\s+/).map(Number)
      : [];
    const scaleX =
      matrix?.scaleX ??
      (Number.isFinite(scaleTokens[0]) ? scaleTokens[0] : 1);
    const scaleY =
      matrix?.scaleY ??
      (Number.isFinite(scaleTokens[1]) ? scaleTokens[1] : scaleX);

    if (
      output.length === 0 ||
      (Math.abs(rotation) < 0.001 &&
        Math.abs(translateX) < 0.001 &&
        Math.abs(translateY) < 0.001 &&
        Math.abs(scaleX - 1) < 0.001 &&
        Math.abs(scaleY - 1) < 0.001)
    ) {
      return output;
    }

    const group = this.ensureRole(record, role, 'container', () => {
      const next = new this.runtime.Container();
      next.label = role;
      return next;
    });
    group.removeChildren();
    for (const displayObject of output) {
      displayObject.alpha = 1;
    }
    group.addChild(...output);
    group.pivot?.set?.(rect.x + rect.width / 2, rect.y + rect.height / 2);
    group.position.set(
      rect.x + rect.width / 2 + translateX,
      rect.y + rect.height / 2 + translateY,
    );
    group.scale.set(scaleX, scaleY);
    group.rotation = rotation;
    return [group];
  }

  syncOutline(style, rect, record, role, output) {
    const width = readCssPixel(style.outlineWidth);
    const color = parseCssColor(style.outlineColor);

    if (
      !(width > 0) ||
      !color ||
      color.alpha <= 0 ||
      style.outlineStyle === 'none'
    ) {
      return;
    }

    const graphic = this.ensureRole(record, role, 'graphics', () => {
      const next = new this.runtime.Graphics();
      next.label = role;
      return next;
    });
    const offset = readCssPixel(style.outlineOffset);
    graphic.clear();
    this.drawRectPath(
      graphic,
      {
        x: rect.x - offset - width / 2,
        y: rect.y - offset - width / 2,
        width: rect.width + offset * 2 + width,
        height: rect.height + offset * 2 + width,
      },
      Math.max(0, readBorderRadius(style) + offset),
    );
    graphic.stroke({
      color: color.color,
      alpha: color.alpha,
      width,
    });
    output.push(graphic);
  }

  syncInsetShadow(style, rect, record, role, output) {
    const shadow = parseInsetBoxShadow(style.boxShadow);

    if (!shadow) {
      return;
    }

    const graphic = this.ensureRole(record, role, 'graphics', () => {
      const next = new this.runtime.Graphics();
      next.label = role;
      return next;
    });
    const inset = shadow.width / 2;
    graphic.clear();
    this.drawRectPath(
      graphic,
      {
        x: rect.x + inset,
        y: rect.y + inset,
        width: Math.max(0, rect.width - shadow.width),
        height: Math.max(0, rect.height - shadow.width),
      },
      Math.max(0, readBorderRadius(style) - inset),
    );
    graphic.stroke({
      color: shadow.color.color,
      alpha: shadow.color.alpha,
      width: shadow.width,
    });
    output.push(graphic);
  }

  syncShadow(style, rect, record, role, output) {
    const shadow = parseBoxShadow(style.boxShadow);

    if (!shadow) {
      return;
    }

    const graphic = this.ensureRole(record, role, 'graphics', () => {
      const next = new this.runtime.Graphics();
      next.label = role;
      return next;
    });
    graphic.clear();
    this.drawRectPath(
      graphic,
      {
        x: rect.x + shadow.offsetX,
        y: rect.y + shadow.offsetY,
        width: rect.width,
        height: rect.height,
      },
      readBorderRadius(style),
    );
    graphic.fill({
      color: shadow.color.color,
      alpha: shadow.color.alpha,
    });
    output.push(graphic);
  }

  syncColorFill(style, rect, record, role, output) {
    const background = parseCssColor(style.backgroundColor);

    if (!background || background.alpha <= 0) {
      return;
    }

    const graphic = this.ensureRole(record, role, 'graphics', () => {
      const next = new this.runtime.Graphics();
      next.label = role;
      return next;
    });
    graphic.clear();
    this.drawRectPath(graphic, rect, readBorderRadius(style));
    graphic.fill({
      color: background.color,
      alpha: background.alpha,
    });
    output.push(graphic);
  }

  syncGradientFill(style, rect, record, role, output) {
    const definition =
      parseLinearGradient(style.backgroundImage) ??
      parseRadialGradient(style.backgroundImage, rect);

    if (!definition || !this.runtime.FillGradient) {
      return;
    }

    const graphic = this.ensureRole(
      record,
      role,
      `gradient:${definition.source}`,
      () => {
        const next = new this.runtime.Graphics();
        next.label = role;
        next.rootRunFillGradient = new this.runtime.FillGradient({
          ...definition.options,
          colorStops: definition.colorStops,
          textureSpace: 'local',
        });
        return next;
      },
    );
    graphic.clear();
    this.drawRectPath(graphic, rect, readBorderRadius(style));
    graphic.fill(graphic.rootRunFillGradient);
    output.push(graphic);
  }

  syncBackgroundImage(style, rect, record, role, output) {
    const urls = extractCssUrls(style.backgroundImage);

    if (urls.length === 0) {
      return;
    }

    const texture = this.textureCache.get(urls[0]);

    if (!texture) {
      return;
    }

    const sprite = this.ensureRole(record, role, `sprite:${urls[0]}`, () => {
      const next = new this.runtime.Sprite(texture);
      next.label = role;
      return next;
    });
    sprite.texture = texture;
    this.placeBackgroundSprite(sprite, texture, style, rect);
    this.applyVisualFilter(sprite, style);
    output.push(sprite);
    this.syncSpriteClipMask(
      style,
      rect,
      record,
      `${role}:clipMask`,
      sprite,
      output,
      true,
    );
  }

  syncBorderImage(style, rect, record, role, output) {
    const urls = extractCssUrls(style.borderImageSource);

    if (urls.length === 0 || style.borderImageSource === 'none') {
      return;
    }

    const texture = this.textureCache.get(urls[0]);

    if (!texture) {
      return;
    }

    const sourceSize = getTextureSize(texture);
    const slice = parseBorderImageSlice(
      style.borderImageSlice,
      sourceSize.width,
      sourceSize.height,
    );

    if (!slice) {
      return;
    }

    const border = readBorderWidths(style);
    const widths = parseBorderImageWidths(
      style.borderImageWidth,
      border,
      rect,
    );
    const scale = resolveNineSliceScale({ slice, widths, rect });
    const meta = [
      urls[0],
      slice.left,
      slice.top,
      slice.right,
      slice.bottom,
    ].join(':');
    const sprite = this.ensureRole(record, role, `nine:${meta}`, () => {
      const next = new this.runtime.NineSliceSprite({
        texture,
        leftWidth: slice.left,
        topHeight: slice.top,
        rightWidth: slice.right,
        bottomHeight: slice.bottom,
      });
      next.label = role;
      return next;
    });
    sprite.texture = texture;
    sprite.tint = 0xffffff;
    sprite.position.set(rect.x, rect.y);
    sprite.setSize(rect.width / scale.x, rect.height / scale.y);
    sprite.scale.set(scale.x, scale.y);
    this.applyVisualFilter(sprite, style);
    output.push(sprite);
  }

  syncResearchNineSlice(skin, style, rect, record, role, output) {
    const texture = this.textureCache.get(skin.url);

    if (!texture) {
      return;
    }

    const meta = [
      skin.url,
      skin.left,
      skin.top,
      skin.right,
      skin.bottom,
    ].join(':');
    const sprite = this.ensureRole(record, role, `nine:${meta}`, () => {
      const next = new this.runtime.NineSliceSprite({
        texture,
        leftWidth: skin.left,
        topHeight: skin.top,
        rightWidth: skin.right,
        bottomHeight: skin.bottom,
      });
      next.label = role;
      return next;
    });
    sprite.texture = texture;
    sprite.tint = skin.tint ?? 0xffffff;
    sprite.position.set(rect.x, rect.y);
    sprite.setSize(
      rect.width / ROOT_RUN_TO_LOGICAL_SCALE,
      rect.height / ROOT_RUN_TO_LOGICAL_SCALE,
    );
    sprite.scale.set(ROOT_RUN_TO_LOGICAL_SCALE);
    this.applyVisualFilter(sprite, style);
    output.push(sprite);
  }

  syncBorders(style, rect, record, role, output) {
    if (
      extractCssUrls(style.borderImageSource).length > 0 &&
      style.borderImageSource !== 'none'
    ) {
      return;
    }

    const border = readBorderWidths(style);
    const colors = {
      top: parseCssColor(style.borderTopColor) ?? TRANSPARENT,
      right: parseCssColor(style.borderRightColor) ?? TRANSPARENT,
      bottom: parseCssColor(style.borderBottomColor) ?? TRANSPARENT,
      left: parseCssColor(style.borderLeftColor) ?? TRANSPARENT,
    };
    const hasBorder = Object.entries(border).some(
      ([side, width]) => width > 0 && colors[side].alpha > 0,
    );

    if (!hasBorder) {
      return;
    }

    const graphic = this.ensureRole(record, role, 'graphics', () => {
      const next = new this.runtime.Graphics();
      next.label = role;
      return next;
    });
    graphic.clear();
    const uniformWidth =
      border.top === border.right &&
      border.top === border.bottom &&
      border.top === border.left
        ? border.top
        : 0;
    const uniformColor =
      colors.top.color === colors.right.color &&
      colors.top.color === colors.bottom.color &&
      colors.top.color === colors.left.color &&
      colors.top.alpha === colors.right.alpha &&
      colors.top.alpha === colors.bottom.alpha &&
      colors.top.alpha === colors.left.alpha
        ? colors.top
        : null;

    if (uniformWidth > 0 && uniformColor?.alpha > 0) {
      const inset = uniformWidth / 2;
      this.drawRectPath(
        graphic,
        {
          x: rect.x + inset,
          y: rect.y + inset,
          width: Math.max(0, rect.width - uniformWidth),
          height: Math.max(0, rect.height - uniformWidth),
        },
        Math.max(0, readBorderRadius(style) - inset),
      );
      graphic.stroke({
        color: uniformColor.color,
        alpha: uniformColor.alpha,
        width: uniformWidth,
      });
    } else {
      drawSideBorders(graphic, rect, border, colors);
    }
    output.push(graphic);
  }

  syncAtlasSprite(element, style, rect, record, output) {
    const frameName = element.dataset?.assetAtlasFrame;

    if (!frameName || !(rect.width > 0) || !(rect.height > 0)) {
      return;
    }

    const texture = this.atlasTextures?.[frameName];

    if (!texture) {
      return;
    }

    const role = 'content:atlas';
    const sprite = this.ensureRole(
      record,
      role,
      `atlas:${frameName}`,
      () => {
        const next = new this.runtime.Sprite(texture);
        next.label = role;
        return next;
      },
    );
    sprite.texture = texture;
    resetSpriteTransform(sprite);
    const sourceSize = getTextureSize(texture);
    const placement = this.getReplacedElementPlacement(element, style, rect);
    placeObjectFitSprite({
      sprite,
      rect: placement.rect,
      sourceWidth: sourceSize.width,
      sourceHeight: sourceSize.height,
      fit: 'contain',
      position: '50% 50%',
    });
    const atlasColor = isMaskedAtlasSprite(element)
      ? parseCssColor(style.color)
      : null;
    sprite.tint = atlasColor?.color ?? 0xffffff;
    this.applyVisualFilter(sprite, style);
    applySpriteFlips(sprite, style);
    const packRect = {
      x: sprite.position.x,
      y: sprite.position.y,
      width: sprite.width,
      height: sprite.height,
    };
    applySpriteRotation(sprite, placement.rotation);
    this.syncSpriteDropShadow(
      style,
      sprite,
      record,
      `${role}:dropShadow`,
      output,
    );
    output.push(sprite);
    this.syncSeedPackItem(
      element,
      style,
      packRect,
      placement.rotation,
      record,
      output,
    );
    this.syncSpriteClipMask(
      style,
      rect,
      record,
      `${role}:clipMask`,
      sprite,
      output,
    );
  }

  syncSeedPackItem(
    element,
    style,
    packRect,
    packRotation,
    record,
    output,
  ) {
    const itemFrameName = element.dataset?.seedPackItemFrame;
    const itemTexture = this.atlasTextures?.[itemFrameName];

    if (!itemFrameName || !itemTexture) {
      return;
    }

    const role = 'content:atlas:seedItem';
    const itemSprite = this.ensureRole(
      record,
      role,
      `atlas:${itemFrameName}`,
      () => {
        const next = new this.runtime.Sprite(itemTexture);
        next.label = role;
        return next;
      },
    );
    itemSprite.texture = itemTexture;
    resetSpriteTransform(itemSprite);
    const layout = getSeedPackIconLayout({
      x: packRect.x,
      y: packRect.y,
      width: packRect.width,
      height: packRect.height,
      aspectRatio: null,
    });
    const itemRect = {
      x: layout.item.centerX - layout.item.size / 2,
      y: layout.item.centerY - layout.item.size / 2,
      width: layout.item.size,
      height: layout.item.size,
    };
    const itemSourceSize = getTextureSize(itemTexture);
    placeObjectFitSprite({
      sprite: itemSprite,
      rect: itemRect,
      sourceWidth: itemSourceSize.width,
      sourceHeight: itemSourceSize.height,
      fit: 'contain',
      position: '50% 50%',
    });
    if (itemSprite.anchor?.set) {
      const centerX = itemSprite.position.x + itemSprite.width / 2;
      const centerY = itemSprite.position.y + itemSprite.height / 2;
      const packCenterX = packRect.x + packRect.width / 2;
      const packCenterY = packRect.y + packRect.height / 2;
      const rotatedCenter = rotatePointAround(
        { x: centerX, y: centerY },
        { x: packCenterX, y: packCenterY },
        packRotation,
      );
      itemSprite.anchor.set(0.5);
      itemSprite.position.set(rotatedCenter.x, rotatedCenter.y);
      itemSprite.rotation =
        packRotation + (layout.item.rotationDegrees * Math.PI) / 180;
    }
    this.applyVisualFilter(itemSprite, style);
    this.syncSpriteDropShadow(
      style,
      itemSprite,
      record,
      `${role}:dropShadow`,
      output,
    );
    output.push(itemSprite);
  }

  syncElementImage(element, style, rect, record, output) {
    if (!isImageElement(element) || !(rect.width > 0) || !(rect.height > 0)) {
      return;
    }

    if (!element.complete || !element.naturalWidth) {
      return;
    }

    const role = 'content:image';
    const src = element.currentSrc || element.src;
    const sprite = this.ensureRole(record, role, `image:${src}`, () => {
      const next = new this.runtime.Sprite(this.runtime.Texture.from(element));
      next.label = role;
      return next;
    });
    sprite.texture = this.runtime.Texture.from(element);
    resetSpriteTransform(sprite);
    const placement = this.getReplacedElementPlacement(element, style, rect);
    placeObjectFitSprite({
      sprite,
      rect: placement.rect,
      sourceWidth: element.naturalWidth,
      sourceHeight: element.naturalHeight,
      fit: style.objectFit,
      position: style.objectPosition,
    });
    this.applyVisualFilter(sprite, style);
    applySpriteFlips(sprite, style);
    applySpriteRotation(sprite, placement.rotation);
    this.syncSpriteDropShadow(
      style,
      sprite,
      record,
      `${role}:dropShadow`,
      output,
    );
    output.push(sprite);
    this.syncSpriteClipMask(
      style,
      rect,
      record,
      `${role}:clipMask`,
      sprite,
      output,
      style.objectFit === 'cover',
    );
  }

  getReplacedElementPlacement(element, style, rect) {
    const matrix = this.getCumulativeElementTransform(element, style);
    const rotation = matrix.rotation;

    if (Math.abs(rotation) < 0.001 || matrix.flipped) {
      return { rect, rotation: 0 };
    }

    const canvasRect = this.canvasRect;
    const logicalScaleX = this.viewport.width / canvasRect.width;
    const logicalScaleY = this.viewport.height / canvasRect.height;
    const baseSize = readElementLayoutSize(element, style);
    const baseWidth = baseSize.width * logicalScaleX;
    const baseHeight = baseSize.height * logicalScaleY;

    if (!(baseWidth > 0) || !(baseHeight > 0)) {
      return { rect, rotation };
    }

    const width = baseWidth * matrix.scaleX;
    const height = baseHeight * matrix.scaleY;
    return {
      rect: {
        x: rect.x + rect.width / 2 - width / 2,
        y: rect.y + rect.height / 2 - height / 2,
        width,
        height,
      },
      rotation,
    };
  }

  getCumulativeElementTransform(element, elementStyle = null) {
    let combined = createIdentityLinearMatrix();
    let current = element;

    while (current && current !== this.stage) {
      const style =
        current === element && elementStyle
          ? elementStyle
          : this.getComputedStyle(current);
      combined = multiplyLinearMatrices(
        readStyleLinearMatrix(style),
        combined,
      );
      current = current.parentElement;
    }

    return decomposeLinearMatrix(combined);
  }

  syncSpriteDropShadow(style, sprite, record, role, output) {
    const shadow = parseDropShadow(style.filter);

    if (!shadow) {
      return;
    }

    const shadowSprite = this.ensureRole(record, role, 'spriteShadow', () => {
      const next = new this.runtime.Sprite(sprite.texture);
      next.label = role;
      return next;
    });
    shadowSprite.texture = sprite.texture;
    shadowSprite.anchor?.set?.(
      Number(sprite.anchor?.x) || 0,
      Number(sprite.anchor?.y) || 0,
    );
    shadowSprite.position.set(
      sprite.position.x + shadow.offsetX,
      sprite.position.y + shadow.offsetY,
    );
    shadowSprite.scale?.set?.(sprite.scale.x, sprite.scale.y);
    shadowSprite.rotation = sprite.rotation;
    shadowSprite.tint = shadow.color.color;
    shadowSprite.alpha = shadow.color.alpha * (Number(sprite.alpha) || 1);
    shadowSprite.filters = null;
    output.push(shadowSprite);
  }

  syncSpriteClipMask(
    style,
    rect,
    record,
    role,
    sprite,
    output,
    forceRect = false,
  ) {
    const inset = parseClipPathInset(style.clipPath, rect);

    if (!inset && !forceRect) {
      sprite.mask = null;
      return;
    }

    const maskRect = inset ?? rect;
    const mask = this.ensureRole(record, role, 'graphics', () => {
      const next = new this.runtime.Graphics();
      next.label = role;
      return next;
    });
    mask.clear();
    this.drawRectPath(mask, maskRect, readBorderRadius(style));
    mask.fill({ color: 0xffffff, alpha: 1 });
    sprite.mask = mask;
    output.push(mask);
  }

  syncTutorialBackdrop(element, rect, record, output) {
    if (!isTutorialBackdrop(element)) {
      return;
    }

    const shade = element.querySelector(
      ':scope > rect[fill="black"], :scope > rect',
    );
    const opacity = clampOpacity(
      Number.parseFloat(shade?.getAttribute('fill-opacity') || '0.62'),
    );
    const role = 'content:tutorialBackdrop';
    const graphic = this.ensureRole(record, role, 'graphics', () => {
      const next = new this.runtime.Graphics();
      next.label = role;
      return next;
    });
    graphic.clear();
    graphic.rect(rect.x, rect.y, rect.width, rect.height);
    graphic.fill({ color: 0x000000, alpha: opacity });
    const viewBox = parseViewBox(element.getAttribute('viewBox'), rect);
    const mask = element.querySelector('mask');

    for (const hole of mask?.children ?? []) {
      if (hole === mask.firstElementChild || hole.getAttribute('fill') !== 'black') {
        continue;
      }

      const holeRect = resolveSvgHoleRect(hole, viewBox, rect);

      if (!holeRect) {
        continue;
      }

      graphic.rect(
        holeRect.x,
        holeRect.y,
        holeRect.width,
        holeRect.height,
      );
      graphic.cut();
    }
    output.push(graphic);
  }

  syncRangeInput(element, style, rect, record, output) {
    if (!isRangeInputElement(element)) {
      return;
    }

    const min = Number.parseFloat(element.min || '0');
    const max = Number.parseFloat(element.max || '100');
    const value = Number.parseFloat(element.value || String(min));
    const progress =
      max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;
    const visualScale = this.getElementVisualScale(element, rect);
    const configuredSize = readCssPixel(
      style.getPropertyValue?.('--style-progress-knob-size'),
    );
    const knobSize = Math.max(
      4,
      (configuredSize || Math.min(rect.height, 12)) * visualScale.x,
    );
    const centerX =
      rect.x + knobSize / 2 + progress * Math.max(0, rect.width - knobSize);
    const centerY = rect.y + rect.height / 2;
    const fill =
      parseCssColor(
        style.getPropertyValue?.('--style-progress-knob-fill'),
      ) ?? { color: 0xf2ae54, alpha: 1 };
    const border =
      parseCssColor(
        style.getPropertyValue?.('--style-progress-knob-border'),
      ) ?? { color: 0x5e321b, alpha: 1 };
    const ring =
      parseCssColor(
        style.getPropertyValue?.('--style-progress-knob-ring'),
      ) ?? { color: 0x17100c, alpha: 1 };
    const role = 'content:rangeThumb';
    const graphic = this.ensureRole(record, role, 'graphics', () => {
      const next = new this.runtime.Graphics();
      next.label = role;
      return next;
    });
    graphic.clear();
    graphic.circle(centerX, centerY, knobSize / 2 + 1);
    graphic.fill(ring);
    graphic.circle(centerX, centerY, knobSize / 2);
    graphic.fill(fill);
    graphic.stroke({
      color: border.color,
      alpha: border.alpha,
      width: 1,
    });
    output.push(graphic);
  }

  syncInputText(element, style, rect, record, output) {
    if (!isNativeTextEntryElement(element)) {
      return;
    }

    const value =
      element.tagName === 'SELECT'
        ? element.selectedOptions?.[0]?.textContent
        : element.value || element.placeholder;

    if (!value) {
      return;
    }

    const role = 'content:inputText';
    const visualScale = this.getElementVisualScale(element, rect);
    const paddingLeft = readCssPixel(style.paddingLeft) * visualScale.x;
    const paddingTop = readCssPixel(style.paddingTop) * visualScale.y;
    const textObject = this.syncTextObject({
      record,
      role,
      text: value,
      style,
      rect: {
        x: rect.x + paddingLeft,
        y: rect.y + paddingTop,
        width: Math.max(1, rect.width - paddingLeft * 2),
        height: Math.max(1, rect.height - paddingTop * 2),
      },
      visualScale,
      wordWrap: false,
    });
    output.push(textObject);
  }

  syncTextNode(node, parent, record, role = 'content:text:0') {
    const text = normalizeText(node.textContent, parent);

    if (!text) {
      return null;
    }

    const range = parent.ownerDocument.createRange();
    range.selectNodeContents(node);
    const rects = Array.from(range.getClientRects());
    range.detach?.();

    if (rects.length === 0) {
      return null;
    }

    const style = this.getComputedStyle(parent);
    const rect = this.toLogicalRect(
      rects.length === 1 ? rects[0] : rangeLikeBounds(rects),
    );
    const parentRect = this.toLogicalRect(parent.getBoundingClientRect());
    const visualScale = this.getElementVisualScale(parent, parentRect);
    return this.syncTextObject({
      record,
      role,
      text: applyTextTransform(text, style.textTransform),
      style,
      rect,
      visualScale,
      wordWrap: rects.length > 1,
    });
  }

  syncTextObject({
    record,
    role,
    text,
    style,
    rect,
    visualScale,
    wordWrap,
  }) {
    const color =
      parseCssColor(style.color) ??
      this.readCssColor('--style-text') ??
      DEFAULT_BACKGROUND;
    const fontSize = Math.max(
      1,
      readCssPixel(style.fontSize) * visualScale.y,
    );
    const lineHeight =
      style.lineHeight === 'normal'
        ? fontSize * 1.2
        : readCssPixel(style.lineHeight) * visualScale.y;
    const strokeWidth =
      readCssPixel(
        style.webkitTextStrokeWidth ||
          style.getPropertyValue?.('-webkit-text-stroke-width'),
      ) * visualScale.x;
    const strokeColor =
      parseCssColor(
        style.webkitTextStrokeColor ||
          style.getPropertyValue?.('-webkit-text-stroke-color'),
      ) ?? TRANSPARENT;
    const textStyleOptions = {
      fill: color.color,
      fontFamily: style.fontFamily,
      fontSize,
      fontStyle: style.fontStyle,
      fontWeight: style.fontWeight,
      letterSpacing: readCssPixel(style.letterSpacing) * visualScale.x,
      lineHeight,
      align: style.textAlign,
      padding: Math.max(1, Math.ceil(strokeWidth)),
      whiteSpace: style.whiteSpace,
      wordWrap,
      wordWrapWidth: Math.max(1, rect.width),
      breakWords: true,
      ...(strokeWidth > 0 && strokeColor.alpha > 0
        ? {
            stroke: {
              color: strokeColor.color,
              width: strokeWidth,
              alpha: strokeColor.alpha,
              join: 'round',
            },
          }
        : {}),
    };
    const textObject = this.ensureRole(record, role, 'text', () => {
      const next = new this.runtime.Text({
        text,
        style: new this.runtime.TextStyle(textStyleOptions),
      });
      next.label = typeof role === 'string' ? role : 'content:text';
      return next;
    });
    textObject.text = text;
    if (
      typeof textObject.style?.reset === 'function' &&
      typeof textObject.style?.assign === 'function'
    ) {
      textObject.style.reset();
      textObject.style.assign(textStyleOptions);
    } else {
      textObject.style = new this.runtime.TextStyle(textStyleOptions);
    }
    textObject.position.set(rect.x, rect.y);
    textObject.alpha = color.alpha;
    textObject.roundPixels = false;
    return textObject;
  }

  syncClipMask(style, rect, record) {
    const shouldClip = [style.overflow, style.overflowX, style.overflowY].some(
      (value) => ['auto', 'clip', 'hidden', 'scroll'].includes(value),
    );
    const clipPathRect = parseClipPathInset(style.clipPath, rect);
    if (!shouldClip || !(rect.width > 0) || !(rect.height > 0)) {
      record.descendants.mask = null;
      if (record.overflowMask) {
        record.overflowMask.visible = false;
      }
    } else {
      if (!record.overflowMask) {
        record.overflowMask = new this.runtime.Graphics();
        record.overflowMask.label = 'content:overflowMask';
        record.masks.addChild(record.overflowMask);
      }
      record.overflowMask.visible = true;
      record.overflowMask.clear();
      this.drawRectPath(record.overflowMask, rect, readBorderRadius(style));
      record.overflowMask.fill({ color: 0xffffff, alpha: 1 });
      record.descendants.mask = record.overflowMask;
    }

    if (!clipPathRect || !(rect.width > 0) || !(rect.height > 0)) {
      record.clipTarget.mask = null;
      if (record.clipPathMask) {
        record.clipPathMask.visible = false;
      }
    } else {
      if (!record.clipPathMask) {
        record.clipPathMask = new this.runtime.Graphics();
        record.clipPathMask.label = 'visual:clipPathMask';
        record.masks.addChild(record.clipPathMask);
      }
      record.clipPathMask.visible = true;
      record.clipPathMask.clear();
      this.drawRectPath(
        record.clipPathMask,
        clipPathRect,
        0,
      );
      record.clipPathMask.fill({ color: 0xffffff, alpha: 1 });
      record.clipTarget.mask = record.clipPathMask;
    }

    this.syncCssGradientMask(style, rect, record);
  }

  syncCssGradientMask(style, rect, record) {
    const maskValue = [
      style.maskImage,
      style.webkitMaskImage,
    ].find((value) => String(value || '').includes('linear-gradient('));
    const definitions = maskValue
      ? splitCssFunctionArguments(maskValue)
          .map((layer) => parseLinearGradient(layer))
          .filter(Boolean)
      : [];

    if (
      definitions.length === 0 ||
      !(rect.width > 0) ||
      !(rect.height > 0)
    ) {
      record.visual.mask = null;
      if (record.cssMaskSprite) {
        record.cssMaskSprite.visible = false;
      }
      return;
    }

    const width = Math.max(1, Math.ceil(rect.width));
    const height = Math.max(1, Math.ceil(rect.height));
    if (!record.cssMaskCanvas) {
      record.cssMaskCanvas = this.createRasterCanvas(
        width,
        height,
        this.stage.ownerDocument,
      );
      record.cssMaskContext =
        record.cssMaskCanvas?.getContext?.('2d') ?? null;
    }
    const canvas = record.cssMaskCanvas;
    const context = record.cssMaskContext;

    if (!canvas || !context) {
      record.visual.mask = null;
      return;
    }

    if (canvas.width !== width) {
      canvas.width = width;
    }
    if (canvas.height !== height) {
      canvas.height = height;
    }
    context.clearRect(0, 0, width, height);
    for (const [index, definition] of definitions.entries()) {
      context.globalCompositeOperation =
        index === 0 ? 'source-over' : 'destination-in';
      const gradient = context.createLinearGradient(
        definition.start.x * width,
        definition.start.y * height,
        definition.end.x * width,
        definition.end.y * height,
      );
      for (const stop of definition.colorStops) {
        gradient.addColorStop(stop.offset, stop.color);
      }
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    }
    context.globalCompositeOperation = 'source-over';

    if (!record.cssMaskTexture) {
      record.cssMaskTexture = this.runtime.Texture.from(canvas);
    }
    if (!record.cssMaskSprite) {
      record.cssMaskSprite = new this.runtime.Sprite(record.cssMaskTexture);
      record.cssMaskSprite.label = 'visual:cssGradientMask';
      record.cssMaskSprite.eventMode = 'none';
      record.masks.addChild(record.cssMaskSprite);
    }
    const sprite = record.cssMaskSprite;
    record.cssMaskTexture.source?.update?.();
    sprite.texture = record.cssMaskTexture;
    resetSpriteTransform(sprite);
    sprite.position.set(rect.x, rect.y);
    sprite.width = rect.width;
    sprite.height = rect.height;
    sprite.visible = true;
    if (typeof record.visual.setMask === 'function') {
      record.visual.setMask({ mask: sprite, channel: 'alpha' });
    } else {
      record.visual.mask = sprite;
    }
  }

  ensureRole(record, role, kind, factory) {
    record.usedRoles.add(role);
    const existing = record.roles.get(role);

    if (existing?.kind === kind) {
      record.roles.delete(role);
      record.roles.set(role, existing);
      existing.object.visible = true;
      return existing.object;
    }

    record.roles.delete(role);
    this.destroyRoleObject(existing?.object);
    const object = factory();
    object.eventMode = 'none';
    object.visible = true;
    record.roles.set(role, { kind, object });
    return object;
  }

  hideUnusedRoles(record) {
    const unusedRoles = [];
    for (const [role, entry] of record.roles) {
      if (!record.usedRoles.has(role)) {
        entry.object.visible = false;
        unusedRoles.push(role);
      }
    }
    this.pruneRetainedRoles(record, unusedRoles);
    record.usedRoles.clear();
  }

  pruneRetainedRoles(record, candidateRoles) {
    let overflow =
      record.roles.size - MAX_RETAINED_ROLES_PER_POOLED_WIDGET;
    if (overflow <= 0) {
      return;
    }

    const rolesToDestroy = candidateRoles
      .filter((role) => record.roles.has(role))
      .slice(0, overflow);
    for (const role of rolesToDestroy) {
      const entry = record.roles.get(role);
      entry?.object?.removeFromParent?.();
      if (entry?.kind === 'container') {
        entry.object?.removeChildren?.();
      }
    }
    for (const role of rolesToDestroy) {
      this.destroyRoleObject(record.roles.get(role)?.object);
      record.roles.delete(role);
      overflow -= 1;
    }
  }

  recycleDetachedRecords() {
    if (!this.stage || this.records.size === 0) {
      return;
    }

    this.releaseElementRecords(
      [...this.records].filter(
        ([element]) =>
          !this.stage.contains(element) &&
          !this.isRetainedCachedPageElement(element),
      ),
    );
  }

  cleanupUnusedRecords() {
    this.releaseElementRecords(
      [...this.records].filter(
        ([element]) =>
          !this.usedNodes.has(element) &&
          !this.isRetainedCachedPageElement(element),
      ),
    );
  }

  isRetainedCachedPageElement(element) {
    return Boolean(element.closest?.(INACTIVE_PAGE_CACHE_SELECTOR));
  }

  releaseElementRecords(entries) {
    if (entries.length === 0) {
      return;
    }

    for (const [element, record] of entries) {
      this.records.delete(element);
      this.usedNodes.delete(element);
      element.removeAttribute?.(RENDERED_ROOT_ATTRIBUTE);
      this.detachExternalDisplayObjectsForElement(element);
      record.container.removeFromParent?.();
    }
    for (const [, record] of entries) {
      this.uiWidgetPool.release(record);
    }
  }

  destroyRecords() {
    const entries = [...this.records];
    this.records.clear();
    for (const [element, record] of entries) {
      this.detachExternalDisplayObjectsForElement(element);
      record.container.removeFromParent?.();
    }
    for (const [, record] of entries) {
      this.destroyElementRecord(record);
    }
  }

  destroyRecordResources(record) {
    for (const entry of record.roles.values()) {
      this.destroyRoleObject(entry.object);
    }
    record.roles.clear();
    record.usedRoles.clear();
    this.destroyCssMaskResources(record);
  }

  destroyCssMaskResources(record) {
    record.visual.mask = null;
    record.cssMaskSprite?.removeFromParent?.();
    record.cssMaskSprite?.destroy?.({ children: true });
    record.cssMaskTexture?.destroy?.(true);
    record.cssMaskTexture = null;
    record.cssMaskCanvas = null;
    record.cssMaskContext = null;
    record.cssMaskSprite = null;
  }

  destroyElementRecord(record) {
    this.destroyRecordResources(record);
    record.container.removeFromParent?.();
    record.container.destroy?.({ children: true });
    record.element = null;
  }

  destroyRoleObject(object) {
    object?.removeFromParent?.();
    object?.rootRunFillGradient?.destroy?.();
    object?.destroy?.({ children: true });
  }

  getWidgetPoolStats() {
    return {
      ...this.uiWidgetPool.getStats(),
      active: this.records.size,
    };
  }

  drawRectPath(graphic, rect, radius = 0) {
    if (radius > 0) {
      graphic.roundRect(
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        Math.min(radius, rect.width / 2, rect.height / 2),
      );
      return;
    }

    graphic.rect(rect.x, rect.y, rect.width, rect.height);
  }

  placeBackgroundSprite(sprite, texture, style, rect) {
    const size = parseBackgroundSize(
      style.backgroundSize,
      rect,
      getTextureSize(texture),
    );
    const position = parseBackgroundPosition(
      style.backgroundPosition,
      rect,
      size,
    );
    sprite.position.set(position.x, position.y);
    sprite.width = size.width;
    sprite.height = size.height;
  }

  applyVisualFilter(displayObject, style) {
    const filterText = String(style.filter || '');
    const grayscale = readFilterAmount(filterText, 'grayscale');
    const brightness = readFilterAmount(filterText, 'brightness', 1);

    if (!(grayscale > 0) && brightness === 1) {
      displayObject.filters = null;
      return;
    }

    const filter = new this.runtime.ColorMatrixFilter();

    if (grayscale > 0) {
      filter.greyscale(grayscale, false);
    }
    if (brightness !== 1) {
      filter.brightness(brightness, true);
    }
    displayObject.filters = [filter];
  }

  getElementVisualScale(element, logicalRect) {
    const width = Number(element.offsetWidth);
    const height = Number(element.offsetHeight);
    return {
      x: width > 0 ? logicalRect.width / width : 1,
      y: height > 0 ? logicalRect.height / height : 1,
    };
  }

  isElementDisplayed(element) {
    if (
      !isElementNode(element) ||
      element.hidden ||
      element.matches(EXCLUDED_ELEMENT_SELECTOR)
    ) {
      return false;
    }

    const style = this.getComputedStyle(element);
    return !(
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.visibility === 'collapse'
    );
  }

  toLogicalRect(rect) {
    const canvasRect = this.canvasRect ?? this.canvas.getBoundingClientRect();
    const scaleX = this.viewport.width / canvasRect.width;
    const scaleY = this.viewport.height / canvasRect.height;
    return {
      x: (rect.left - canvasRect.left) * scaleX,
      y: (rect.top - canvasRect.top) * scaleY,
      width: rect.width * scaleX,
      height: rect.height * scaleY,
    };
  }

  readCssColor(name) {
    return parseCssColor(
      this.getComputedStyle(this.stage).getPropertyValue(name),
    );
  }

  showNativeInputRoot(target) {
    if (!isNativeTextEntryElement(target)) {
      return;
    }

    const root = this.findStageRoot(target);

    if (!root) {
      return;
    }

    this.nativeInputFallbackActive = true;
    this.stage.setAttribute(RENDERER_ATTRIBUTE, 'native-input');
    this.restoreAllDomRoots();
    root.setAttribute(DOM_FALLBACK_ATTRIBUTE, 'true');
    this.setLayerVisibility(false);
    this.restoreExternalDisplayObjectsToFallback();
  }

  restoreNativeInputRoots() {
    if (!this.nativeInputFallbackActive) {
      return;
    }

    const activeElement = this.stage.ownerDocument?.activeElement;

    if (
      activeElement &&
      this.stage.contains(activeElement) &&
      isNativeTextEntryElement(activeElement)
    ) {
      return;
    }

    this.nativeInputFallbackActive = false;
    for (const root of this.getStageRoots()) {
      root.removeAttribute(DOM_FALLBACK_ATTRIBUTE);
    }
    this.stage.setAttribute(RENDERER_ATTRIBUTE, 'initializing');
    this.scheduleRefresh();
  }

  findStageRoot(element) {
    let current = element;

    while (current?.parentElement && current.parentElement !== this.stage) {
      current = current.parentElement;
    }

    return current?.parentElement === this.stage ? current : null;
  }

  failOpen() {
    if (this.destroyed) {
      return;
    }

    this.failed = true;
    this.nativeInputFallbackActive = false;
    this.stage?.setAttribute(RENDERER_ATTRIBUTE, 'fallback');
    this.restoreAllDomRoots();
    this.setLayerVisibility(false);
    this.restoreExternalDisplayObjectsToFallback();
  }

  setLayerVisibility(visible) {
    for (const root of Object.values(this.layerRoots ?? {})) {
      root.visible = visible;
    }
  }

  restoreAllDomRoots() {
    for (const root of this.getStageRoots()) {
      root.removeAttribute(RENDERED_ROOT_ATTRIBUTE);
      root.removeAttribute(DOM_FALLBACK_ATTRIBUTE);
    }
  }

  trackAnimatedElement(element) {
    if (!isElementNode(element) || !this.stage?.contains(element)) {
      return;
    }

    this.animatedElements.add(element);
    this.scheduleAnimatedRefresh();
  }

  untrackAnimatedElement(element) {
    this.animatedElements.delete(element);
  }

  reconcileAnimatedElements() {
    const activeTargets = new Set();

    for (const animation of this.stage?.getAnimations?.({ subtree: true }) ?? []) {
      if (!['pending', 'running'].includes(animation.playState)) {
        continue;
      }

      const target = animation.effect?.target;
      if (isElementNode(target) && this.stage.contains(target)) {
        activeTargets.add(target);
      }
    }

    for (const element of this.animatedElements) {
      if (!activeTargets.has(element)) {
        this.untrackAnimatedElement(element);
      }
    }
    for (const element of activeTargets) {
      this.animatedElements.add(element);
    }

    if (this.animatedElements.size > 0) {
      this.scheduleAnimatedRefresh();
    }
  }

  scheduleAnimatedRefresh() {
    if (
      this.destroyed ||
      this.failed ||
      this.animationFrameId ||
      this.animatedElements.size === 0
    ) {
      return;
    }

    this.animationFrameId = this.requestFrame(() => {
      this.animationFrameId = 0;
      this.refreshAnimatedElements();
      this.scheduleAnimatedRefresh();
    });
  }

  refreshAnimatedElements() {
    if (
      this.destroyed ||
      this.failed ||
      this.nativeInputFallbackActive ||
      this.refreshPromise
    ) {
      return;
    }

    const canvasRect = this.canvas.getBoundingClientRect();
    if (!(canvasRect.width > 0) || !(canvasRect.height > 0)) {
      return;
    }
    this.canvasRect = canvasRect;
    const hadAnimatedElements = this.animatedElements.size > 0;
    this.reconcileAnimatedElements();

    for (const element of [...this.animatedElements]) {
      if (!this.stage.contains(element)) {
        this.animatedElements.delete(element);
        continue;
      }

      const root = this.findStageRoot(element);
      if (
        !root?.hasAttribute(RENDERED_ROOT_ATTRIBUTE) ||
        root.hasAttribute(DOM_FALLBACK_ATTRIBUTE)
      ) {
        continue;
      }

      this.syncElement(element);
    }

    if (hadAnimatedElements && this.animatedElements.size === 0) {
      this.scheduleRefresh();
    }
  }

  attachExternalDisplayObject(element, object, { zIndex = 0 } = {}) {
    if (!isElementNode(element) || !object) {
      return false;
    }

    const entries = this.externalDisplayObjects.get(element) ?? [];
    if (!entries.some((entry) => entry.object === object)) {
      entries.push({
        object,
        zIndex: getNumericZIndex(zIndex),
        fallbackParent: object.parent ?? null,
      });
      this.externalDisplayObjects.set(element, entries);
    }
    if (
      this.layerRoots &&
      !this.failed &&
      !this.nativeInputFallbackActive
    ) {
      this.syncExternalDisplayObjects(
        element,
        this.ensureElementRecord(element),
      );
    }
    this.scheduleRefresh();
    return true;
  }

  detachExternalDisplayObject(element, object) {
    const entries = this.externalDisplayObjects.get(element);
    if (!entries) {
      object?.removeFromParent?.();
      return;
    }

    const remaining = entries.filter((entry) => entry.object !== object);
    object?.removeFromParent?.();
    if (remaining.length > 0) {
      this.externalDisplayObjects.set(element, remaining);
    } else {
      this.externalDisplayObjects.delete(element);
    }
    this.scheduleRefresh();
  }

  detachExternalDisplayObjectsForElement(element) {
    for (const entry of this.externalDisplayObjects.get(element) ?? []) {
      entry.object?.removeFromParent?.();
    }
  }

  syncExternalDisplayObjects(element, record) {
    const entries = this.externalDisplayObjects.get(element);
    if (!entries || !record?.external) {
      return;
    }

    const activeEntries = entries.filter((entry) => !entry.object?.destroyed);
    for (const entry of activeEntries) {
      entry.object.zIndex = entry.zIndex;
      if (entry.object.parent !== record.external) {
        record.external.addChild(entry.object);
      }
    }
    record.external.sortChildren?.();

    if (activeEntries.length === 0) {
      this.externalDisplayObjects.delete(element);
    } else if (activeEntries.length !== entries.length) {
      this.externalDisplayObjects.set(element, activeEntries);
    }
  }

  detachAllExternalDisplayObjects() {
    for (const element of this.externalDisplayObjects.keys()) {
      this.detachExternalDisplayObjectsForElement(element);
    }
  }

  restoreExternalDisplayObjectsToFallback() {
    for (const [element, entries] of this.externalDisplayObjects) {
      const activeEntries = entries.filter((entry) => !entry.object?.destroyed);
      for (const entry of activeEntries) {
        if (entry.fallbackParent?.addChild) {
          entry.fallbackParent.addChild(entry.object);
        } else {
          entry.object?.removeFromParent?.();
        }
      }
      if (activeEntries.length === 0) {
        this.externalDisplayObjects.delete(element);
      } else if (activeEntries.length !== entries.length) {
        this.externalDisplayObjects.set(element, activeEntries);
      }
    }
  }
}

export function extractCssUrls(value) {
  const urls = [];
  const pattern = /url\(\s*(['"]?)(.*?)\1\s*\)/g;
  let match = pattern.exec(String(value || ''));

  while (match) {
    const url = match[2]?.trim();
    if (url && !url.startsWith('#')) {
      urls.push(url);
    }
    match = pattern.exec(String(value || ''));
  }

  return urls;
}

export function parseLinearGradient(value) {
  const source = String(value || '').trim();
  const startIndex = source.indexOf('linear-gradient(');

  if (startIndex < 0) {
    return null;
  }

  const bodyStart = startIndex + 'linear-gradient('.length;
  const bodyEnd = findCssFunctionEnd(source, bodyStart);
  if (bodyEnd < 0) {
    return null;
  }

  const tokens = splitCssFunctionArguments(
    source.slice(bodyStart, bodyEnd),
  );
  if (tokens.length < 2) {
    return null;
  }

  let angleDegrees = 180;
  if (/^-?[\d.]+deg$/i.test(tokens[0])) {
    angleDegrees = Number.parseFloat(tokens.shift());
  } else if (/^to\s+/i.test(tokens[0])) {
    angleDegrees = directionToGradientAngle(tokens.shift());
  }

  const parsedStops = tokens.flatMap(parseGradientStops);
  if (parsedStops.length < 2) {
    return null;
  }
  normalizeGradientStopOffsets(parsedStops);

  const radians = (angleDegrees * Math.PI) / 180;
  const directionX = Math.sin(radians);
  const directionY = -Math.cos(radians);
  const extent =
    0.5 / Math.max(Math.abs(directionX), Math.abs(directionY), 0.0001);

  const start = {
    x: 0.5 - directionX * extent,
    y: 0.5 - directionY * extent,
  };
  const end = {
    x: 0.5 + directionX * extent,
    y: 0.5 + directionY * extent,
  };
  return {
    source: source.slice(startIndex, bodyEnd + 1),
    start,
    end,
    options: { type: 'linear', start, end },
    colorStops: parsedStops.map(({ offset, color }) => ({
      offset,
      color: toHexaColor(color),
    })),
  };
}

export function parseRadialGradient(value, rect = { width: 1, height: 1 }) {
  const source = String(value || '').trim();
  const startIndex = source.indexOf('radial-gradient(');

  if (startIndex < 0) {
    return null;
  }

  const bodyStart = startIndex + 'radial-gradient('.length;
  const bodyEnd = findCssFunctionEnd(source, bodyStart);
  if (bodyEnd < 0) {
    return null;
  }

  const tokens = splitCssFunctionArguments(
    source.slice(bodyStart, bodyEnd),
  );
  if (tokens.length < 2) {
    return null;
  }

  let descriptor = '';
  if (!parseGradientColor(tokens[0])) {
    descriptor = tokens.shift();
  }
  const parsedStops = tokens.flatMap(parseGradientStops);
  if (parsedStops.length < 2) {
    return null;
  }
  normalizeGradientStopOffsets(parsedStops);
  const centerMatch = descriptor.match(
    /\bat\s+(-?[\d.]+)%?\s+(-?[\d.]+)%?/i,
  );
  const center = {
    x: centerMatch ? Number.parseFloat(centerMatch[1]) / 100 : 0.5,
    y: centerMatch ? Number.parseFloat(centerMatch[2]) / 100 : 0.5,
  };
  const aspectScale =
    rect.width > 0 && rect.height > 0 ? rect.height / rect.width : 1;

  return {
    source: source.slice(startIndex, bodyEnd + 1),
    options: {
      type: 'radial',
      center,
      outerCenter: center,
      innerRadius: 0,
      outerRadius: 0.72,
      scale: descriptor.includes('ellipse') ? aspectScale : 1,
    },
    colorStops: parsedStops.map(({ offset, color }) => ({
      offset,
      color: toHexaColor(color),
    })),
  };
}

export function parseBorderImageSlice(value, textureWidth, textureHeight) {
  const tokens = String(value || '')
    .trim()
    .split(/\s+/)
    .filter((token) => token && token !== 'fill');

  if (tokens.length === 0 || tokens[0] === 'none') {
    return null;
  }

  const [top, right, bottom, left] = expandFourValues(tokens);
  return {
    top: readSliceValue(top, textureHeight),
    right: readSliceValue(right, textureWidth),
    bottom: readSliceValue(bottom, textureHeight),
    left: readSliceValue(left, textureWidth),
  };
}

export function parseBorderImageWidths(value, border, rect) {
  const tokens = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const [top, right, bottom, left] = expandFourValues(
    tokens.length > 0 ? tokens : ['1'],
  );
  return {
    top: readBorderImageWidth(top, border.top, rect.height),
    right: readBorderImageWidth(right, border.right, rect.width),
    bottom: readBorderImageWidth(bottom, border.bottom, rect.height),
    left: readBorderImageWidth(left, border.left, rect.width),
  };
}

export function resolveNineSliceScale({ slice, widths, rect }) {
  const xRatios = [
    slice.left > 0 && widths.left > 0 ? widths.left / slice.left : 0,
    slice.right > 0 && widths.right > 0 ? widths.right / slice.right : 0,
  ].filter((value) => value > 0);
  const yRatios = [
    slice.top > 0 && widths.top > 0 ? widths.top / slice.top : 0,
    slice.bottom > 0 && widths.bottom > 0
      ? widths.bottom / slice.bottom
      : 0,
  ].filter((value) => value > 0);
  const fallbackX = Math.min(
    1,
    rect.width / Math.max(1, slice.left + slice.right),
  );
  const fallbackY = Math.min(
    1,
    rect.height / Math.max(1, slice.top + slice.bottom),
  );
  return {
    x: average(xRatios) || fallbackX || 1,
    y: average(yRatios) || fallbackY || 1,
  };
}

export function resolvePseudoRect({
  style,
  parentRect,
  scaleX = 1,
  scaleY = 1,
}) {
  const left = readPositionValue(style.left, parentRect.width, scaleX);
  const right = readPositionValue(style.right, parentRect.width, scaleX);
  const top = readPositionValue(style.top, parentRect.height, scaleY);
  const bottom = readPositionValue(style.bottom, parentRect.height, scaleY);
  const declaredWidth = readDimensionValue(
    style.width,
    parentRect.width,
    scaleX,
  );
  const declaredHeight = readDimensionValue(
    style.height,
    parentRect.height,
    scaleY,
  );
  const contentBoxWidth =
    style.boxSizing === 'content-box'
      ? (readCssPixel(style.paddingLeft) +
          readCssPixel(style.paddingRight) +
          readCssPixel(style.borderLeftWidth) +
          readCssPixel(style.borderRightWidth)) *
        scaleX
      : 0;
  const contentBoxHeight =
    style.boxSizing === 'content-box'
      ? (readCssPixel(style.paddingTop) +
          readCssPixel(style.paddingBottom) +
          readCssPixel(style.borderTopWidth) +
          readCssPixel(style.borderBottomWidth)) *
        scaleY
      : 0;
  const minimumWidth = readDimensionValue(
    style.minWidth,
    parentRect.width,
    scaleX,
  );
  const minimumHeight = readDimensionValue(
    style.minHeight,
    parentRect.height,
    scaleY,
  );
  const width =
    (declaredWidth === null ? null : declaredWidth + contentBoxWidth) ??
    (left !== null && right !== null
      ? Math.max(0, parentRect.width - left - right)
      : minimumWidth ?? parentRect.width);
  const height =
    (declaredHeight === null ? null : declaredHeight + contentBoxHeight) ??
    (top !== null && bottom !== null
      ? Math.max(0, parentRect.height - top - bottom)
      : minimumHeight ?? parentRect.height);
  let x =
    left !== null
      ? parentRect.x + left
      : right !== null
        ? parentRect.x + parentRect.width - right - width
        : parentRect.x;
  let y =
    top !== null
      ? parentRect.y + top
      : bottom !== null
        ? parentRect.y + parentRect.height - bottom - height
        : parentRect.y;
  const translation = parseCssTranslate(style.translate, width, height);
  x += translation.x;
  y += translation.y;
  return { x, y, width, height };
}

export function parseClipPathInset(value, rect) {
  const match = String(value || '').match(/^inset\(([^)]+)\)$/i);

  if (!match) {
    return null;
  }

  const rawTokens = match[1].split(/\s+round\s+/i)[0].trim().split(/\s+/);
  const [topToken, rightToken, bottomToken, leftToken] =
    expandFourValues(rawTokens);
  const top = readInsetValue(topToken, rect.height);
  const right = readInsetValue(rightToken, rect.width);
  const bottom = readInsetValue(bottomToken, rect.height);
  const left = readInsetValue(leftToken, rect.width);

  return {
    x: rect.x + left,
    y: rect.y + top,
    width: Math.max(0, rect.width - left - right),
    height: Math.max(0, rect.height - top - bottom),
  };
}

export function parseCssColor(value) {
  const color = String(value || '').trim();

  if (!color || color === 'transparent') {
    return null;
  }

  if (color.startsWith('#')) {
    return parseHexColor(color);
  }

  const rgbMatch = color.match(
    /^rgba?\(\s*([\d.]+)(?:\s+|,\s*)([\d.]+)(?:\s+|,\s*)([\d.]+)(?:\s*(?:\/|,)\s*([\d.]+%?))?\s*\)$/i,
  );

  if (rgbMatch) {
    return {
      color:
        (Math.round(Number(rgbMatch[1])) << 16) |
        (Math.round(Number(rgbMatch[2])) << 8) |
        Math.round(Number(rgbMatch[3])),
      alpha: parseAlpha(rgbMatch[4]),
    };
  }

  const oklchMatch = color.match(
    /^oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i,
  );

  if (oklchMatch) {
    const lightness = Number(oklchMatch[1]) / (color.includes('%') ? 100 : 1);
    const chroma = Number(oklchMatch[2]);
    const hue = (Number(oklchMatch[3]) * Math.PI) / 180;
    const rgb = oklchToSrgb(lightness, chroma, hue);
    return {
      color: (rgb.r << 16) | (rgb.g << 8) | rgb.b,
      alpha: parseAlpha(oklchMatch[4]),
    };
  }

  return null;
}

function parseHexColor(color) {
  const hex = color.slice(1);
  const normalized =
    hex.length === 3 || hex.length === 4
      ? hex
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : hex;
  const numeric = Number.parseInt(normalized.slice(0, 6), 16);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  return {
    color: numeric,
    alpha:
      normalized.length === 8
        ? Number.parseInt(normalized.slice(6, 8), 16) / 255
        : 1,
  };
}

function parseAlpha(value) {
  if (value === undefined) {
    return 1;
  }

  return String(value).endsWith('%')
    ? Number.parseFloat(value) / 100
    : Number.parseFloat(value);
}

function findCssFunctionEnd(source, bodyStart) {
  let depth = 1;

  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '(') {
      depth += 1;
    } else if (source[index] === ')') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function splitCssFunctionArguments(value) {
  const tokens = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '(') {
      depth += 1;
    } else if (value[index] === ')') {
      depth = Math.max(0, depth - 1);
    } else if (value[index] === ',' && depth === 0) {
      tokens.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }

  tokens.push(value.slice(start).trim());
  return tokens.filter(Boolean);
}

function directionToGradientAngle(value) {
  const direction = String(value || '')
    .toLowerCase()
    .replace(/^to\s+/, '')
    .trim();
  const horizontal = direction.includes('right')
    ? 90
    : direction.includes('left')
      ? 270
      : null;
  const vertical = direction.includes('bottom')
    ? 180
    : direction.includes('top')
      ? 0
      : null;

  if (horizontal !== null && vertical !== null) {
    if (horizontal === 90 && vertical === 180) return 135;
    if (horizontal === 90 && vertical === 0) return 45;
    if (horizontal === 270 && vertical === 180) return 225;
    return 315;
  }

  return horizontal ?? vertical ?? 180;
}

function parseGradientColor(value) {
  return readGradientColor(value)?.color ?? null;
}

function parseGradientStops(value) {
  const token = String(value || '').trim();
  const parsedColor = readGradientColor(token);

  if (!parsedColor) {
    return [];
  }

  const offsetMatches = [
    ...token.slice(parsedColor.length).matchAll(/(-?[\d.]+)(%?)/g),
  ];
  if (offsetMatches.length === 0) {
    return [{ color: parsedColor.color, offset: null }];
  }

  return offsetMatches.map((match) => {
    const offset =
      Number.parseFloat(match[1]) / (match[2] === '%' ? 100 : 1);
    return {
      color: parsedColor.color,
      offset: Number.isFinite(offset)
        ? Math.max(0, Math.min(1, offset))
        : null,
    };
  });
}

function readGradientColor(value) {
  const token = String(value || '').trim();

  if (/^transparent(?:\s|$)/i.test(token)) {
    return { color: TRANSPARENT, length: 'transparent'.length };
  }

  const colorEnd = token.startsWith('#')
    ? token.search(/\s/)
    : token.indexOf(')') + 1;
  const resolvedColorEnd = colorEnd > 0 ? colorEnd : token.length;
  const color = parseCssColor(token.slice(0, resolvedColorEnd));
  return color ? { color, length: resolvedColorEnd } : null;
}

function normalizeGradientStopOffsets(stops) {
  if (stops[0].offset === null) {
    stops[0].offset = 0;
  }
  if (stops.at(-1).offset === null) {
    stops.at(-1).offset = 1;
  }

  let anchorIndex = 0;
  for (let index = 1; index < stops.length; index += 1) {
    if (stops[index].offset === null) {
      continue;
    }

    const anchorOffset = stops[anchorIndex].offset;
    const distance = index - anchorIndex;
    for (let fillIndex = anchorIndex + 1; fillIndex < index; fillIndex += 1) {
      stops[fillIndex].offset =
        anchorOffset +
        ((stops[index].offset - anchorOffset) *
          (fillIndex - anchorIndex)) /
          distance;
    }
    anchorIndex = index;
  }
}

function toHexaColor({ color, alpha }) {
  return `#${Math.max(0, color)
    .toString(16)
    .padStart(6, '0')
    .slice(-6)}${Math.round(clampOpacity(alpha) * 255)
    .toString(16)
    .padStart(2, '0')}`;
}

function oklchToSrgb(lightness, chroma, hue) {
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;
  const linear = {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
  const toSrgb = (channel) => {
    const encoded =
      channel <= 0.0031308
        ? 12.92 * channel
        : 1.055 * channel ** (1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(1, encoded)) * 255);
  };
  return {
    r: toSrgb(linear.r),
    g: toSrgb(linear.g),
    b: toSrgb(linear.b),
  };
}

function isRenderablePseudo(style) {
  if (
    !style ||
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.content === 'none' ||
    style.content === 'normal'
  ) {
    return false;
  }

  return Boolean(
    style.content ||
      parseCssColor(style.backgroundColor) ||
      extractCssUrls(style.backgroundImage).length ||
      extractCssUrls(style.borderImageSource).length ||
      parseBoxShadow(style.boxShadow),
  );
}

function resolvePseudoContent(value, element) {
  const source = String(value || '').trim();

  if (!source || source === 'none' || source === 'normal') {
    return '';
  }

  const withAttributes = source.replace(
    /attr\(\s*([-\w]+)(?:\s+[^)]*)?\)/gi,
    (_match, attributeName) => element.getAttribute(attributeName) ?? '',
  );
  const quotedParts = [];
  const quotedPattern = /(["'])((?:\\.|(?!\1).)*)\1/g;
  let quotedMatch = quotedPattern.exec(withAttributes);

  while (quotedMatch) {
    quotedParts.push(decodeCssContent(quotedMatch[2]));
    quotedMatch = quotedPattern.exec(withAttributes);
  }

  if (quotedParts.length > 0) {
    const unquoted = withAttributes.replace(quotedPattern, '').trim();
    return `${quotedParts.join('')}${decodeCssContent(unquoted)}`;
  }

  return decodeCssContent(withAttributes);
}

function decodeCssContent(value) {
  return String(value || '')
    .replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_match, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/\\(["'\\])/g, '$1');
}

function getResearchSkin(element) {
  return RESEARCH_SKINS.find(({ selector }) => element.matches(selector)) ?? null;
}

function readBorderWidths(style) {
  return {
    top: readCssPixel(style.borderTopWidth),
    right: readCssPixel(style.borderRightWidth),
    bottom: readCssPixel(style.borderBottomWidth),
    left: readCssPixel(style.borderLeftWidth),
  };
}

function readBorderRadius(style) {
  return readCssPixel(
    style.borderTopLeftRadius || style.borderRadius?.split(/\s+/)[0],
  );
}

function parseBoxShadow(value) {
  const text = String(value || '');

  if (!text || text === 'none' || text.startsWith('inset')) {
    return null;
  }

  const colorMatch = text.match(
    /(rgba?\([^)]+\)|oklch\([^)]+\)|#[0-9a-fA-F]{3,8})/,
  );
  const values = text
    .replace(colorMatch?.[0] ?? '', '')
    .match(/-?[\d.]+px/g)
    ?.map((entry) => Number.parseFloat(entry));
  const color = parseCssColor(colorMatch?.[0]);

  if (!color || !values || values.length < 2 || color.alpha <= 0) {
    return null;
  }

  return {
    color,
    offsetX: values[0],
    offsetY: values[1],
  };
}

function parseInsetBoxShadow(value) {
  const entry = splitCssFunctionArguments(String(value || '')).find((part) =>
    /^\s*inset\b/i.test(part),
  );
  if (!entry) {
    return null;
  }

  const colorMatch = entry.match(
    /(rgba?\([^)]+\)|oklch\([^)]+\)|#[0-9a-fA-F]{3,8})/,
  );
  const values = entry
    .replace(colorMatch?.[0] ?? '', '')
    .replace(/^\s*inset\b/i, '')
    .match(/-?[\d.]+px/g)
    ?.map((item) => Number.parseFloat(item));
  const color = parseCssColor(colorMatch?.[0]);
  const spread = values?.[3] ?? 0;

  if (!color || !(spread > 0) || color.alpha <= 0) {
    return null;
  }

  return { color, width: spread };
}

function parseDropShadow(value) {
  const source = String(value || '');
  const startIndex = source.indexOf('drop-shadow(');

  if (startIndex < 0) {
    return null;
  }

  const bodyStart = startIndex + 'drop-shadow('.length;
  const bodyEnd = findCssFunctionEnd(source, bodyStart);
  if (bodyEnd < 0) {
    return null;
  }

  const body = source.slice(bodyStart, bodyEnd);
  const colorMatch = body.match(
    /(rgba?\([^)]+\)|oklch\([^)]+\)|#[0-9a-fA-F]{3,8})/,
  );
  const color = parseCssColor(colorMatch?.[0]) ?? {
    color: 0x000000,
    alpha: 1,
  };
  const offsets = body
    .replace(colorMatch?.[0] ?? '', '')
    .match(/-?[\d.]+px/g)
    ?.map((entry) => Number.parseFloat(entry));

  if (!offsets || offsets.length < 2 || color.alpha <= 0) {
    return null;
  }

  return {
    color,
    offsetX: offsets[0],
    offsetY: offsets[1],
  };
}

function drawSideBorders(graphic, rect, border, colors) {
  if (border.top > 0 && colors.top.alpha > 0) {
    graphic.rect(rect.x, rect.y, rect.width, border.top);
    graphic.fill(colors.top);
  }
  if (border.right > 0 && colors.right.alpha > 0) {
    graphic.rect(
      rect.x + rect.width - border.right,
      rect.y,
      border.right,
      rect.height,
    );
    graphic.fill(colors.right);
  }
  if (border.bottom > 0 && colors.bottom.alpha > 0) {
    graphic.rect(
      rect.x,
      rect.y + rect.height - border.bottom,
      rect.width,
      border.bottom,
    );
    graphic.fill(colors.bottom);
  }
  if (border.left > 0 && colors.left.alpha > 0) {
    graphic.rect(rect.x, rect.y, border.left, rect.height);
    graphic.fill(colors.left);
  }
}

function parseBackgroundSize(value, rect, textureSize) {
  const text = String(value || '').trim();

  if (text === 'contain' || text === 'cover') {
    const ratio =
      text === 'contain'
        ? Math.min(
            rect.width / textureSize.width,
            rect.height / textureSize.height,
          )
        : Math.max(
            rect.width / textureSize.width,
            rect.height / textureSize.height,
          );
    return {
      width: textureSize.width * ratio,
      height: textureSize.height * ratio,
    };
  }

  const [widthToken = 'auto', heightToken = 'auto'] = text.split(/\s+/);
  let width = readBackgroundDimension(widthToken, rect.width);
  let height = readBackgroundDimension(heightToken, rect.height);

  if (width === null && height === null) {
    width = textureSize.width;
    height = textureSize.height;
  } else if (width === null) {
    width = (height / textureSize.height) * textureSize.width;
  } else if (height === null) {
    height = (width / textureSize.width) * textureSize.height;
  }

  return { width, height };
}

function readMaskShorthandSize(value) {
  const match = String(value || '').match(
    /\/\s*(.+?)(?:\s+(?:no-repeat|repeat(?:-[xy])?|space|round)\b|$)/i,
  );
  return match?.[1]?.trim() || null;
}

function parseBackgroundPosition(value, rect, size) {
  const [xToken = '0%', yToken = '50%'] = String(value || '')
    .trim()
    .split(/\s+/);
  return {
    x:
      rect.x +
      readBackgroundPositionValue(xToken, rect.width - size.width),
    y:
      rect.y +
      readBackgroundPositionValue(yToken, rect.height - size.height),
  };
}

function readBackgroundDimension(token, available) {
  if (!token || token === 'auto') {
    return null;
  }
  if (token.endsWith('%')) {
    return (Number.parseFloat(token) / 100) * available;
  }
  return readCssPixel(token);
}

function readBackgroundPositionValue(token, available) {
  if (token === 'left' || token === 'top') {
    return 0;
  }
  if (token === 'center') {
    return available / 2;
  }
  if (token === 'right' || token === 'bottom') {
    return available;
  }
  if (token.endsWith('%')) {
    return (Number.parseFloat(token) / 100) * available;
  }
  return readCssPixel(token);
}

function placeObjectFitSprite({
  sprite,
  rect,
  sourceWidth,
  sourceHeight,
  fit,
  position,
}) {
  if (!sourceWidth || !sourceHeight || fit === 'fill') {
    sprite.position.set(rect.x, rect.y);
    sprite.width = rect.width;
    sprite.height = rect.height;
    return;
  }

  const ratio =
    fit === 'cover'
      ? Math.max(rect.width / sourceWidth, rect.height / sourceHeight)
      : fit === 'none'
        ? 1
        : Math.min(rect.width / sourceWidth, rect.height / sourceHeight);
  const width = sourceWidth * ratio;
  const height = sourceHeight * ratio;
  const resolvedPosition = parseBackgroundPosition(position, rect, {
    width,
    height,
  });
  sprite.position.set(resolvedPosition.x, resolvedPosition.y);
  sprite.width = width;
  sprite.height = height;
}

function resetSpriteTransform(sprite) {
  sprite.anchor?.set?.(0);
  sprite.rotation = 0;
  if (sprite.scale) {
    sprite.scale.x = Math.abs(Number(sprite.scale.x) || 1);
    sprite.scale.y = Math.abs(Number(sprite.scale.y) || 1);
  }
}

function resetPooledDisplayObject(displayObject, { visible = false } = {}) {
  if (!displayObject) {
    return;
  }

  displayObject.position?.set?.(0);
  displayObject.pivot?.set?.(0);
  displayObject.scale?.set?.(1);
  displayObject.anchor?.set?.(0);
  displayObject.rotation = 0;
  displayObject.alpha = 1;
  displayObject.zIndex = 0;
  displayObject.visible = visible;
  displayObject.mask = null;
  displayObject.filters = null;
  if ('tint' in displayObject) {
    displayObject.tint = 0xffffff;
  }
}

function applySpriteFlips(sprite, style) {
  const matrix = parseCssTransformMatrix(style.transform);
  const scaleTokens = String(style.scale || '')
    .trim()
    .split(/\s+/)
    .map(Number);
  const flipX =
    (matrix &&
      matrix.a < 0 &&
      Math.abs(matrix.b) < 0.001 &&
      Math.abs(matrix.c) < 0.001) ||
    scaleTokens[0] < 0;
  const flipY =
    (matrix &&
      matrix.d < 0 &&
      Math.abs(matrix.b) < 0.001 &&
      Math.abs(matrix.c) < 0.001) ||
    scaleTokens[1] < 0;

  if ((!flipX && !flipY) || !sprite.anchor?.set) {
    return;
  }

  const centerX = sprite.position.x + sprite.width / 2;
  const centerY = sprite.position.y + sprite.height / 2;
  sprite.anchor.set(0.5);
  sprite.position.set(centerX, centerY);
  if (flipX) {
    sprite.scale.x = -Math.abs(sprite.scale.x);
  }
  if (flipY) {
    sprite.scale.y = -Math.abs(sprite.scale.y);
  }
}

function applySpriteRotation(sprite, rotation) {
  if (!(Math.abs(rotation) >= 0.001) || !sprite.anchor?.set) {
    return;
  }

  const centerX = sprite.position.x + sprite.width / 2;
  const centerY = sprite.position.y + sprite.height / 2;
  sprite.anchor.set(0.5);
  sprite.position.set(centerX, centerY);
  sprite.rotation = rotation;
}

function readElementLayoutSize(element, style) {
  const viewBox = element?.viewBox?.baseVal;
  let bounds = null;
  try {
    bounds = element?.getBBox?.() ?? null;
  } catch {
    // SVG layout can be unavailable while a node is detached; other authored
    // dimensions below still preserve the visual geometry.
  }
  const width = firstPositiveNumber([
    element?.offsetWidth,
    element?.clientWidth,
    readCssPixel(style?.width),
    element?.width?.baseVal?.value,
    viewBox?.width,
    bounds?.width,
    element?.getAttribute?.('width'),
  ]);
  const height = firstPositiveNumber([
    element?.offsetHeight,
    element?.clientHeight,
    readCssPixel(style?.height),
    element?.height?.baseVal?.value,
    viewBox?.height,
    bounds?.height,
    element?.getAttribute?.('height'),
  ]);
  return { width, height };
}

function firstPositiveNumber(values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) {
      return number;
    }
  }
  return 0;
}

function rotatePointAround(point, pivot, rotation) {
  if (!(Math.abs(rotation) >= 0.001)) {
    return point;
  }

  const deltaX = point.x - pivot.x;
  const deltaY = point.y - pivot.y;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return {
    x: pivot.x + deltaX * cosine - deltaY * sine,
    y: pivot.y + deltaX * sine + deltaY * cosine,
  };
}

function parseCssTransformMatrix(value) {
  const match = String(value || '').match(
    /^matrix\(\s*(-?[\d.e+-]+)\s*,\s*(-?[\d.e+-]+)\s*,\s*(-?[\d.e+-]+)\s*,\s*(-?[\d.e+-]+)\s*,\s*(-?[\d.e+-]+)\s*,\s*(-?[\d.e+-]+)\s*\)$/i,
  );

  if (!match) {
    return null;
  }

  const [, aText, bText, cText, dText, eText, fText] = match;
  const a = Number(aText);
  const b = Number(bText);
  const c = Number(cText);
  const d = Number(dText);
  const determinant = a * d - b * c;
  return {
    a,
    b,
    c,
    d,
    e: Number(eText),
    f: Number(fText),
    scaleX: Math.hypot(a, b),
    scaleY: Math.hypot(c, d),
    rotation: Math.atan2(b, a),
    flipped: determinant < 0,
  };
}

function createIdentityLinearMatrix() {
  return { a: 1, b: 0, c: 0, d: 1 };
}

function readStyleLinearMatrix(style) {
  const transform =
    parseCssTransformMatrix(style?.transform) ??
    createIdentityLinearMatrix();
  const scaleValue = String(style?.scale || '').trim();
  const scaleTokens =
    scaleValue && scaleValue !== 'none'
      ? scaleValue.split(/\s+/).map(Number)
      : [];
  const scaleX = Number.isFinite(scaleTokens[0]) ? scaleTokens[0] : 1;
  const scaleY = Number.isFinite(scaleTokens[1])
    ? scaleTokens[1]
    : scaleX;
  const rotation = readCssAngle(style?.rotate);

  if (
    Math.abs(rotation) < 0.001 &&
    Math.abs(scaleX - 1) < 0.001 &&
    Math.abs(scaleY - 1) < 0.001
  ) {
    return transform;
  }

  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const individual = {
    a: cosine * scaleX,
    b: sine * scaleX,
    c: -sine * scaleY,
    d: cosine * scaleY,
  };
  return multiplyLinearMatrices(transform, individual);
}

function multiplyLinearMatrices(left, right) {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
  };
}

function decomposeLinearMatrix(matrix) {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  return {
    ...matrix,
    scaleX: Math.hypot(matrix.a, matrix.b),
    scaleY: Math.hypot(matrix.c, matrix.d),
    rotation: Math.atan2(matrix.b, matrix.a),
    flipped: determinant < 0,
  };
}

function isMaskedAtlasSprite(element) {
  return Boolean(element.querySelector?.(':scope > defs > mask'));
}

function readInsetValue(token, available) {
  const value = String(token || '0');
  return value.endsWith('%')
    ? (Number.parseFloat(value) / 100) * available
    : readCssPixel(value);
}

function parseViewBox(value, fallbackRect) {
  const values = String(value || '')
    .trim()
    .split(/\s+/)
    .map(Number);

  if (values.length !== 4 || values.some((entry) => !Number.isFinite(entry))) {
    return {
      x: 0,
      y: 0,
      width: fallbackRect.width,
      height: fallbackRect.height,
    };
  }

  return {
    x: values[0],
    y: values[1],
    width: values[2],
    height: values[3],
  };
}

function resolveSvgHoleRect(element, viewBox, rect) {
  const sourceX = Number.parseFloat(element.getAttribute('x') || '0');
  const sourceWidth = Number.parseFloat(
    element.getAttribute('width') ||
      element.getAttribute('textLength') ||
      '0',
  );
  const fontSize = Number.parseFloat(element.getAttribute('font-size') || '0');
  const isText = element.localName === 'text';
  const sourceY = Number.parseFloat(element.getAttribute('y') || '0');
  const sourceHeight = isText
    ? fontSize * 1.2
    : Number.parseFloat(element.getAttribute('height') || '0');

  if (!(sourceWidth > 0) || !(sourceHeight > 0)) {
    return null;
  }

  const scaleX = rect.width / Math.max(1, viewBox.width);
  const scaleY = rect.height / Math.max(1, viewBox.height);
  return {
    x: rect.x + (sourceX - viewBox.x) * scaleX,
    y:
      rect.y +
      ((isText ? sourceY - sourceHeight : sourceY) - viewBox.y) * scaleY,
    width: sourceWidth * scaleX,
    height: sourceHeight * scaleY,
  };
}

function readFilterAmount(text, name, fallback = 0) {
  const match = String(text || '').match(
    new RegExp(`${name}\\(\\s*([\\d.]+)(%)?\\s*\\)`),
  );

  if (!match) {
    return fallback;
  }

  return Number.parseFloat(match[1]) / (match[2] ? 100 : 1);
}

function readSliceValue(value, textureDimension) {
  if (String(value).endsWith('%')) {
    return (Number.parseFloat(value) / 100) * textureDimension;
  }

  return Math.max(0, Number.parseFloat(value) || 0);
}

function readBorderImageWidth(value, borderWidth, dimension) {
  const token = String(value || '1');

  if (token === 'auto') {
    return borderWidth;
  }
  if (token.endsWith('%')) {
    return (Number.parseFloat(token) / 100) * dimension;
  }
  if (token.endsWith('px')) {
    return Math.max(0, Number.parseFloat(token));
  }

  return Math.max(0, (Number.parseFloat(token) || 0) * borderWidth);
}

function readPositionValue(value, parentSize, scale) {
  const token = String(value || '').trim();

  if (!token || token === 'auto') {
    return null;
  }
  if (token.endsWith('%')) {
    return (Number.parseFloat(token) / 100) * parentSize;
  }
  return readCssPixel(token) * scale;
}

function readDimensionValue(value, parentSize, scale) {
  const token = String(value || '').trim();

  if (!token || token === 'auto' || token === 'none') {
    return null;
  }
  if (token.endsWith('%')) {
    return (Number.parseFloat(token) / 100) * parentSize;
  }
  return Math.max(0, readCssPixel(token) * scale);
}

function parseCssTranslate(value, width, height) {
  const source = String(value || '').trim();

  if (!source || source === 'none') {
    return { x: 0, y: 0 };
  }

  const [xToken = '0', yToken = '0'] = source.split(/\s+/);
  return {
    x: readTranslateValue(xToken, width),
    y: readTranslateValue(yToken, height),
  };
}

function readTranslateValue(value, available) {
  return String(value).endsWith('%')
    ? (Number.parseFloat(value) / 100) * available
    : readCssPixel(value);
}

function readCssAngle(value) {
  const source = String(value || '').trim();
  if (!source || source === 'none') {
    return 0;
  }
  const numeric = Number.parseFloat(source);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return source.endsWith('rad') ? numeric : (numeric * Math.PI) / 180;
}

function expandFourValues(values) {
  if (values.length === 1) {
    return [values[0], values[0], values[0], values[0]];
  }
  if (values.length === 2) {
    return [values[0], values[1], values[0], values[1]];
  }
  if (values.length === 3) {
    return [values[0], values[1], values[2], values[1]];
  }
  return [values[0], values[1], values[2], values[3]];
}

function getTextureSize(texture) {
  return {
    width: texture?.orig?.width || texture?.width || texture?.source?.width || 1,
    height:
      texture?.orig?.height || texture?.height || texture?.source?.height || 1,
  };
}

function average(values) {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
}

function normalizeText(text, parent) {
  if (!text || !parent) {
    return '';
  }

  const style = globalThis.getComputedStyle(parent);
  return style.whiteSpace?.includes('pre')
    ? text
    : text.replace(/\s+/g, ' ').trim();
}

function applyTextTransform(text, transform) {
  if (transform === 'uppercase') {
    return text.toUpperCase();
  }
  if (transform === 'lowercase') {
    return text.toLowerCase();
  }
  if (transform === 'capitalize') {
    return text.replace(/\b\p{L}/gu, (character) => character.toUpperCase());
  }
  return text;
}

function rangeLikeBounds(rects) {
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

function describeElement(element) {
  const className =
    typeof element.className === 'string'
      ? element.className.trim().split(/\s+/)[0]
      : '';
  return className || element.id || element.tagName.toLowerCase();
}

function isTutorialBackdrop(element) {
  return (
    element?.localName === 'svg' &&
    element.classList?.contains('tutorial-layer__backdrop')
  );
}

function isElementNode(node) {
  return node?.nodeType === globalThis.Node?.ELEMENT_NODE;
}

function isImageElement(element) {
  return element?.tagName === 'IMG';
}

function isRangeInputElement(element) {
  return (
    element?.tagName === 'INPUT' &&
    String(element.type || '').toLowerCase() === 'range'
  );
}

function isNativeTextEntryElement(element) {
  if (element?.tagName === 'TEXTAREA' || element?.tagName === 'SELECT') {
    return true;
  }
  if (element?.tagName !== 'INPUT') {
    return false;
  }

  return ![
    'button',
    'checkbox',
    'color',
    'file',
    'hidden',
    'image',
    'radio',
    'range',
    'reset',
    'submit',
  ].includes(String(element.type || 'text').toLowerCase());
}

function getNumericZIndex(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readCssPixel(value) {
  const parsed = Number.parseFloat(String(value || '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampOpacity(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
}
