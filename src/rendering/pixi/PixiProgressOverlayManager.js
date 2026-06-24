import { gameViewport } from '../../viewport/gameViewport.js';

function readPixiProgressBarsEnabled() {
  return import.meta.env?.VITE_ENABLE_PIXI_PROGRESS_BARS === 'true';
}

async function loadPixiPrimitives() {
  const { Container, Graphics } = await import('pixi.js');
  return { Container, Graphics };
}

function clampProgress(progress) {
  const value = Number(progress);

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function parseCssColor(value) {
  const color = String(value || '').trim();

  if (!color || color === 'transparent') {
    return null;
  }

  if (color.startsWith('#')) {
    return parseHexColor(color);
  }

  const rgbMatch = color.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d*(?:\.\d+)?))?\s*\)$/i,
  );

  if (!rgbMatch) {
    return null;
  }

  return {
    color:
      (Math.round(Number(rgbMatch[1])) << 16) |
      (Math.round(Number(rgbMatch[2])) << 8) |
      Math.round(Number(rgbMatch[3])),
    alpha: rgbMatch[4] === undefined ? 1 : Number(rgbMatch[4]),
  };
}

function parseHexColor(color) {
  const hex = color.slice(1);
  const normalized =
    hex.length === 3 || hex.length === 4
      ? hex
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : hex;
  const value = Number.parseInt(normalized.slice(0, 6), 16);

  if (!Number.isFinite(value)) {
    return null;
  }

  const alpha =
    normalized.length === 8 ? Number.parseInt(normalized.slice(6, 8), 16) / 255 : 1;

  return {
    color: value,
    alpha,
  };
}

export class PixiProgressOverlayManager {
  static explain =
    'Draws retained timer progress fills in Pixi while DOM rows stay available for text, input, and accessibility.';

  constructor({
    enabled = readPixiProgressBarsEnabled(),
    viewport = gameViewport,
    whenPixiReady = async () => null,
    getLayers = () => null,
    getCanvas = () => null,
    loadPrimitives = loadPixiPrimitives,
    getComputedStyle = (element) => globalThis.getComputedStyle?.(element),
  } = {}) {
    this.enabled = enabled;
    this.viewport = viewport;
    this.whenPixiReady = whenPixiReady;
    this.getLayers = getLayers;
    this.getCanvas = getCanvas;
    this.loadPrimitives = loadPrimitives;
    this.getComputedStyle = getComputedStyle;
    this.stage = null;
    this.root = null;
    this.Graphics = null;
    this.readyPromise = null;
    this.bars = new Map();
    this.destroyed = false;
  }

  mount(stage) {
    this.stage = stage;
    this.destroyed = false;
  }

  unmount() {
    this.destroyed = true;
    for (const bar of this.bars.values()) {
      this.restoreDomFill(bar);
      bar.graphic?.destroy?.();
      bar.graphic = null;
      bar.active = false;
    }
    this.bars.clear();
    this.root?.destroy?.({ children: true });
    this.root = null;
    this.Graphics = null;
    this.readyPromise = null;
    this.stage = null;
  }

  registerBar(id, { progressElement = null, fillElement = null } = {}) {
    const key = String(id || '');

    if (!key || !progressElement) {
      return null;
    }

    this.unregisterBar(key);

    const controller = {
      setProgress: (progress, options) => this.setBarProgress(key, progress, options),
      hide: () => this.hideBar(key),
      unregister: () => this.unregisterBar(key),
      isActive: () => Boolean(this.bars.get(key)?.active),
    };

    this.bars.set(key, {
      key,
      progressElement,
      fillElement,
      graphic: null,
      controller,
      progress: 0,
      visible: false,
      active: false,
      domFillVisibility: null,
    });

    return controller;
  }

  unregisterBar(id) {
    const key = String(id || '');
    const bar = this.bars.get(key);

    if (!bar) {
      return;
    }

    this.restoreDomFill(bar);
    bar.graphic?.destroy?.();
    this.bars.delete(key);
  }

  setBarProgress(id, progress, { visible = true } = {}) {
    const bar = this.bars.get(String(id || ''));

    if (!bar) {
      return false;
    }

    bar.progress = clampProgress(progress);
    bar.visible = visible !== false;

    if (!bar.visible) {
      this.hideGraphic(bar);
      return false;
    }

    if (!this.enabled || !this.stage) {
      return false;
    }

    void this.ensureReady()
      .then(() => this.drawBar(bar))
      .catch(() => this.restoreBarFallback(bar));

    return bar.active;
  }

  hideBar(id) {
    const bar = this.bars.get(String(id || ''));

    if (!bar) {
      return;
    }

    bar.visible = false;
    this.hideGraphic(bar);
  }

  async ensureReady() {
    if (!this.enabled || this.destroyed || !this.stage) {
      return null;
    }

    if (this.root && this.Graphics) {
      return this.root;
    }

    if (!this.readyPromise) {
      this.readyPromise = this.createRoot().finally(() => {
        this.readyPromise = null;
      });
    }

    return this.readyPromise;
  }

  async createRoot() {
    const [layers, primitives] = await Promise.all([
      this.whenPixiReady(),
      this.loadPrimitives(),
    ]);

    if (this.destroyed || !this.stage) {
      return null;
    }

    const resolvedLayers = this.getLayers() ?? layers;
    const layer = resolvedLayers?.root;

    if (!layer?.addChild) {
      return null;
    }

    this.Graphics = primitives.Graphics;
    this.root = new primitives.Container();
    this.root.label = 'progressOverlay';
    this.root.eventMode = 'none';
    layer.addChild(this.root);

    for (const bar of this.bars.values()) {
      if (bar.visible) {
        this.drawBar(bar);
      }
    }

    return this.root;
  }

  drawBar(bar) {
    if (!this.enabled || this.destroyed || !this.root || !this.Graphics || !bar.visible) {
      return false;
    }

    const rect = this.getProgressContentRect(bar.progressElement);

    if (!rect || rect.width <= 0 || rect.height <= 0) {
      this.hideGraphic(bar);
      return false;
    }

    const graphic = this.ensureGraphic(bar);
    const fill = this.readFillColor(bar);
    const fillWidth = Math.max(0, rect.width * bar.progress);

    graphic.clear();
    graphic.rect(rect.x, rect.y, fillWidth, rect.height);
    graphic.fill(fill);
    graphic.visible = bar.progress > 0 && fillWidth > 0;
    bar.active = graphic.visible;

    if (graphic.visible) {
      this.hideDomFill(bar);
    } else {
      this.restoreDomFill(bar);
    }

    return graphic.visible;
  }

  ensureGraphic(bar) {
    if (bar.graphic) {
      return bar.graphic;
    }

    bar.graphic = new this.Graphics();
    bar.graphic.label = `progress:${bar.key}`;
    bar.graphic.eventMode = 'none';
    this.root.addChild(bar.graphic);
    return bar.graphic;
  }

  hideGraphic(bar) {
    if (bar.graphic) {
      bar.graphic.visible = false;
    }
    bar.active = false;
    this.restoreDomFill(bar);
  }

  restoreBarFallback(bar) {
    this.hideGraphic(bar);
    this.restoreDomFill(bar);
  }

  hideDomFill(bar) {
    if (!bar.fillElement || bar.domFillVisibility !== null) {
      return;
    }

    bar.domFillVisibility = bar.fillElement.style.visibility;
    bar.fillElement.style.visibility = 'hidden';
  }

  restoreDomFill(bar) {
    if (!bar.fillElement || bar.domFillVisibility === null) {
      return;
    }

    bar.fillElement.style.visibility = bar.domFillVisibility;
    bar.domFillVisibility = null;
  }

  getProgressContentRect(element) {
    if (!element || element.hidden) {
      return null;
    }

    const canvas = this.getCanvas();
    const canvasRect = canvas?.getBoundingClientRect?.();
    const elementRect = element.getBoundingClientRect?.();

    if (!canvasRect?.width || !canvasRect?.height || !elementRect?.width || !elementRect?.height) {
      return null;
    }

    const style = this.getComputedStyle(element) ?? {};
    const scaleX = this.viewport.width / canvasRect.width;
    const scaleY = this.viewport.height / canvasRect.height;
    const sourceScale = this.readSourceScale();
    const borderLeft = this.readPixelValue(style.borderLeftWidth) * sourceScale;
    const borderRight = this.readPixelValue(style.borderRightWidth) * sourceScale;
    const borderTop = this.readPixelValue(style.borderTopWidth) * sourceScale;
    const borderBottom = this.readPixelValue(style.borderBottomWidth) * sourceScale;
    const x = (elementRect.left - canvasRect.left) * scaleX + borderLeft;
    const y = (elementRect.top - canvasRect.top) * scaleY + borderTop;
    const width = elementRect.width * scaleX - borderLeft - borderRight;
    const height = elementRect.height * scaleY - borderTop - borderBottom;

    return {
      x,
      y,
      width: Math.max(0, width),
      height: Math.max(0, height),
    };
  }

  readSourceScale() {
    const layers = this.getLayers();
    const sourceScale = Number(layers?.sourceScale);

    if (Number.isFinite(sourceScale) && sourceScale > 0) {
      return sourceScale;
    }

    return 3;
  }

  readPixelValue(value) {
    const parsed = Number.parseFloat(String(value || ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  readFillColor(bar) {
    const fillStyle = bar.fillElement ? this.getComputedStyle(bar.fillElement) : null;
    const stageStyle = this.stage ? this.getComputedStyle(this.stage) : null;

    return (
      parseCssColor(fillStyle?.backgroundColor) ??
      parseCssColor(stageStyle?.getPropertyValue?.('--style-progress-fill-background')) ??
      parseCssColor(stageStyle?.getPropertyValue?.('--style-text')) ?? {
        color: 0x1a1a1a,
        alpha: 1,
      }
    );
  }
}
