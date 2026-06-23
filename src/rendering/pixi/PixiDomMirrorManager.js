import {
  Assets,
  ColorMatrixFilter,
  Container,
  Graphics,
  Sprite,
  Spritesheet,
  Text,
  Texture,
} from 'pixi.js';

import {
  gameAssetAtlasImageUrl,
  gameAssetAtlasPixiData,
} from '../../assets/generated/game-asset-atlas.generated.js';

const MIRROR_ROOT_SELECTOR = [
  '.workshop-page',
  '.brewing-page',
  '.garden-page',
  '.research-page',
  '.shop-page',
  '.room-page__popup-layer',
  '.room-top-panel-layer',
  '.room-bottom-panel-layer',
  '.room-world-chat-layer',
  '.room-player-info-popup',
  '.room-alliance-info-popup',
].join(',');

const SKIP_ELEMENT_SELECTOR = [
  '.game-canvas',
  '.tutorial-layer',
  '.app-online-gate',
  '.app-account-link-choice',
  '.app-fresh-start-choice',
  '.app-deploy-refresh',
].join(',');

const TRANSPARENT = { color: 0, alpha: 0 };
const SOURCE_TO_CANVAS_SCALE = 3;
const RENDER_INTERVAL_MS = 125;

export class PixiDomMirrorManager {
  constructor({ stage, canvas, layers } = {}) {
    this.stage = stage;
    this.canvas = canvas;
    this.layers = layers;
    this.root = null;
    this.frameId = 0;
    this.intervalId = 0;
    this.mutationObserver = null;
    this.resizeObserver = null;
    this.destroyed = false;
    this.lastCanvasRect = null;
    this.atlasTextures = null;
    this.atlasPromise = null;
    this.handlePointerRender = () => this.scheduleRender();
  }

  mount() {
    if (!this.stage || !this.canvas || !this.layers || this.root) {
      return;
    }

    this.destroyed = false;
    this.root = new Container();
    this.root.label = 'domMirror';
    this.root.eventMode = 'none';
    this.layers.root.addChild(this.root);
    void this.ensureAtlasTextures();
    this.render();
    this.stage.dataset.pixiMirror = 'true';
    this.observe();
    this.intervalId = globalThis.setInterval?.(
      () => this.scheduleRender(),
      RENDER_INTERVAL_MS,
    );
  }

  unmount() {
    this.destroyed = true;
    delete this.stage?.dataset.pixiMirror;
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.intervalId) {
      globalThis.clearInterval?.(this.intervalId);
      this.intervalId = 0;
    }

    this.stage?.removeEventListener?.('pointerdown', this.handlePointerRender, true);
    this.stage?.removeEventListener?.('pointerup', this.handlePointerRender, true);
    this.stage?.removeEventListener?.('pointercancel', this.handlePointerRender, true);

    if (this.frameId) {
      globalThis.cancelAnimationFrame?.(this.frameId);
      this.frameId = 0;
    }

    this.root?.destroy({ children: true });
    this.root = null;
    this.atlasTextures = null;
    this.atlasPromise = null;
  }

  observe() {
    this.stage.addEventListener('pointerdown', this.handlePointerRender, true);
    this.stage.addEventListener('pointerup', this.handlePointerRender, true);
    this.stage.addEventListener('pointercancel', this.handlePointerRender, true);

    if (typeof globalThis.MutationObserver === 'function') {
      this.mutationObserver = new globalThis.MutationObserver(() => this.scheduleRender());
      this.mutationObserver.observe(this.stage, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    if (typeof globalThis.ResizeObserver === 'function') {
      this.resizeObserver = new globalThis.ResizeObserver(() => this.scheduleRender());
      this.resizeObserver.observe(this.stage);
      this.resizeObserver.observe(this.canvas);
    }
  }

  scheduleRender() {
    if (this.destroyed || this.frameId) {
      return;
    }

    this.frameId = globalThis.requestAnimationFrame?.(() => {
      this.frameId = 0;
      this.render();
    }) ?? 0;
  }

  render() {
    if (this.destroyed || !this.root || !this.stage || !this.canvas) {
      return;
    }

    const canvasRect = this.canvas.getBoundingClientRect();

    if (!canvasRect.width || !canvasRect.height) {
      return;
    }

    this.lastCanvasRect = canvasRect;
    this.clearRoot();
    this.drawStageBackground();

    for (const root of this.getMirrorRoots()) {
      this.drawElement(root);
    }
  }

  clearRoot() {
    for (const child of this.root.removeChildren()) {
      child.destroy({ children: true });
    }
  }

  drawStageBackground() {
    const style = globalThis.getComputedStyle(this.stage);
    const background = parseCssColor(style.backgroundColor) ?? this.readCssColor('--style-surface');
    const graphic = new Graphics();
    graphic.rect(0, 0, this.canvas.width, this.canvas.height);
    graphic.fill({
      color: background.color,
      alpha: background.alpha || 1,
    });
    this.root.addChild(graphic);
  }

  getMirrorRoots() {
    return Array.from(this.stage.querySelectorAll(MIRROR_ROOT_SELECTOR))
      .filter((element) => !element.matches(SKIP_ELEMENT_SELECTOR))
      .map((element, index) => ({
        element,
        index,
        zIndex: getNumericZIndex(globalThis.getComputedStyle(element).zIndex),
      }))
      .sort((a, b) => a.zIndex - b.zIndex || a.index - b.index)
      .map((entry) => entry.element);
  }

  drawElement(element) {
    if (!this.isRenderableElement(element)) {
      return;
    }

    const style = globalThis.getComputedStyle(element);
    const rect = this.toCanvasRect(element.getBoundingClientRect());
    const opacity = this.getEffectiveOpacity(element);

    if (rect.width > 0 && rect.height > 0) {
      this.drawElementBox(element, style, rect, opacity);
      this.drawElementAtlasSprite(element, style, rect, opacity);
      this.drawElementImage(element, rect, opacity);
      this.drawInputText(element, style, rect, opacity);
    }

    for (const child of element.childNodes) {
      if (child.nodeType === globalThis.Node?.TEXT_NODE) {
        this.drawTextNode(child, opacity);
        continue;
      }

      if (child.nodeType === globalThis.Node?.ELEMENT_NODE) {
        this.drawElement(child);
      }
    }

    if (rect.width > 0 && rect.height > 0) {
      this.drawNotificationDot(element, rect, opacity);
    }
  }

  isRenderableElement(element) {
    if (!isElementNode(element) || element.matches(SKIP_ELEMENT_SELECTOR)) {
      return false;
    }

    if (element.hidden) {
      return false;
    }

    const style = globalThis.getComputedStyle(element);

    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
      return false;
    }

    if (Number.parseFloat(style.opacity) <= 0 && !this.stage.dataset.pixiMirror) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0 || element.childNodes.length > 0;
  }

  drawElementBox(element, style, rect, opacity) {
    const background = parseCssColor(style.backgroundColor) ?? TRANSPARENT;
    const border = this.getBorder(style);
    const shadow = this.getBoxShadow(style);
    const hasBackground = background.alpha > 0;
    const hasBorder = border.top > 0 || border.right > 0 || border.bottom > 0 || border.left > 0;

    if (element.matches('.style-dialog')) {
      this.drawDialogShadow(element, rect, opacity);
    }

    if (shadow) {
      const graphic = new Graphics();
      graphic.rect(
        rect.x + shadow.offsetX,
        rect.y + shadow.offsetY,
        rect.width,
        rect.height,
      );
      graphic.fill({
        color: shadow.color.color,
        alpha: shadow.color.alpha * opacity,
      });
      this.root.addChild(graphic);
    }

    if (hasBackground) {
      const graphic = new Graphics();
      graphic.rect(rect.x, rect.y, rect.width, rect.height);
      graphic.fill({
        color: background.color,
        alpha: background.alpha * opacity,
      });
      this.root.addChild(graphic);
    }

    if (element.matches('.style-dialog')) {
      this.drawDialogBorder(element, rect, opacity);
    }

    if (hasBorder) {
      this.drawBorders(style, rect, border, opacity);
    }

    if (element.matches('.style-progress__fill, [class*="progress-fill"]')) {
      this.drawProgressFallback(style, rect, opacity);
    }
  }

  drawElementImage(element, rect, opacity) {
    if (!isImageElement(element)) {
      return;
    }

    const src = element.currentSrc || element.src;

    if (!src) {
      return;
    }

    if (!element.complete || !element.naturalWidth) {
      element.addEventListener('load', () => this.scheduleRender(), { once: true });
      return;
    }

    const sprite = new Sprite(Texture.from(element));
    sprite.position.set(rect.x, rect.y);
    sprite.width = rect.width;
    sprite.height = rect.height;
    sprite.alpha = opacity;

    const style = globalThis.getComputedStyle(element);

    if (style.filter.includes('grayscale')) {
      const filter = new ColorMatrixFilter();
      filter.greyscale(1, false);
      sprite.filters = [filter];
    }

    this.root.addChild(sprite);
  }

  drawElementAtlasSprite(element, style, rect, opacity) {
    const frameName = element.dataset?.assetAtlasFrame;

    if (!frameName) {
      return;
    }

    const texture = this.atlasTextures?.[frameName];

    if (!texture) {
      void this.ensureAtlasTextures();
      return;
    }

    const sprite = new Sprite(texture);
    sprite.position.set(rect.x, rect.y);
    sprite.width = rect.width;
    sprite.height = rect.height;
    sprite.alpha = opacity;

    if (style.filter.includes('grayscale')) {
      const filter = new ColorMatrixFilter();
      filter.greyscale(1, false);
      sprite.filters = [filter];
    }

    this.root.addChild(sprite);
  }

  async ensureAtlasTextures() {
    if (this.atlasTextures) {
      return this.atlasTextures;
    }

    if (!this.atlasPromise) {
      this.atlasPromise = this.loadAtlasTextures().finally(() => {
        this.atlasPromise = null;
      });
    }

    return this.atlasPromise;
  }

  async loadAtlasTextures() {
    const texture = await Assets.load(gameAssetAtlasImageUrl);

    if (this.destroyed) {
      return null;
    }

    const spritesheet = new Spritesheet(texture, gameAssetAtlasPixiData);
    await spritesheet.parse();

    if (this.destroyed) {
      return null;
    }

    this.atlasTextures = spritesheet.textures;
    this.scheduleRender();
    return this.atlasTextures;
  }

  drawInputText(element, style, rect, opacity) {
    if (!isTextEntryElement(element)) {
      return;
    }

    const value = element.value || element.placeholder;

    if (!value) {
      return;
    }

    const paddingLeft = readCssPixel(style.paddingLeft);
    const paddingTop = readCssPixel(style.paddingTop);
    this.drawText({
      text: value,
      style,
      rect: {
        x: rect.x + paddingLeft * SOURCE_TO_CANVAS_SCALE,
        y: rect.y + paddingTop * SOURCE_TO_CANVAS_SCALE,
        width: Math.max(0, rect.width - paddingLeft * SOURCE_TO_CANVAS_SCALE * 2),
        height: rect.height,
      },
      opacity,
      wordWrap: true,
    });
  }

  drawTextNode(node, inheritedOpacity) {
    const text = normalizeText(node.textContent, node.parentElement);

    if (!text) {
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = Array.from(range.getClientRects());
    const parent = node.parentElement;
    range.detach();

    if (!parent || rects.length === 0) {
      return;
    }

    const style = globalThis.getComputedStyle(parent);

    if (rects.length > 1) {
      this.drawText({
        text,
        style,
        rect: this.toCanvasRect(rangeLikeBounds(rects)),
        opacity: inheritedOpacity,
        wordWrap: true,
      });
      return;
    }

    this.drawText({
      text,
      style,
      rect: this.toCanvasRect(rects[0]),
      opacity: inheritedOpacity,
      wordWrap: false,
    });
  }

  drawText({ text, style, rect, opacity, wordWrap }) {
    const color = parseCssColor(style.color) ?? this.readCssColor('--style-text');
    const fontSize = readCssPixel(style.fontSize) * SOURCE_TO_CANVAS_SCALE;
    const lineHeight = getLineHeight(style, fontSize);
    const pixiText = new Text({
      text,
      style: {
        fill: color.color,
        fontFamily: style.fontFamily,
        fontSize,
        fontStyle: style.fontStyle,
        fontWeight: style.fontWeight,
        letterSpacing: readCssPixel(style.letterSpacing),
        lineHeight,
        padding: 1,
        whiteSpace: style.whiteSpace,
        wordWrap,
        wordWrapWidth: Math.max(1, rect.width),
      },
    });
    pixiText.alpha = color.alpha * opacity;
    pixiText.position.set(rect.x, rect.y);
    pixiText.roundPixels = true;
    this.root.addChild(pixiText);
  }

  drawBorders(style, rect, border, opacity) {
    const topColor = parseCssColor(style.borderTopColor) ?? TRANSPARENT;
    const rightColor = parseCssColor(style.borderRightColor) ?? topColor;
    const bottomColor = parseCssColor(style.borderBottomColor) ?? topColor;
    const leftColor = parseCssColor(style.borderLeftColor) ?? topColor;
    const graphic = new Graphics();

    if (border.top > 0 && topColor.alpha > 0) {
      graphic.rect(rect.x, rect.y, rect.width, border.top);
      graphic.fill({ color: topColor.color, alpha: topColor.alpha * opacity });
    }

    if (border.right > 0 && rightColor.alpha > 0) {
      graphic.rect(rect.x + rect.width - border.right, rect.y, border.right, rect.height);
      graphic.fill({ color: rightColor.color, alpha: rightColor.alpha * opacity });
    }

    if (border.bottom > 0 && bottomColor.alpha > 0) {
      graphic.rect(rect.x, rect.y + rect.height - border.bottom, rect.width, border.bottom);
      graphic.fill({ color: bottomColor.color, alpha: bottomColor.alpha * opacity });
    }

    if (border.left > 0 && leftColor.alpha > 0) {
      graphic.rect(rect.x, rect.y, border.left, rect.height);
      graphic.fill({ color: leftColor.color, alpha: leftColor.alpha * opacity });
    }

    this.root.addChild(graphic);
  }

  drawDialogShadow(element, rect, opacity) {
    const pseudoStyle = globalThis.getComputedStyle(element, '::after');
    const shadow = this.getBoxShadow(pseudoStyle);

    if (!shadow) {
      return;
    }

    const graphic = new Graphics();
    graphic.rect(
      rect.x + shadow.offsetX,
      rect.y + shadow.offsetY,
      rect.width,
      rect.height,
    );
    graphic.fill({
      color: shadow.color.color,
      alpha: shadow.color.alpha * opacity,
    });
    this.root.addChild(graphic);
  }

  drawDialogBorder(element, rect, opacity) {
    const pseudoStyle = globalThis.getComputedStyle(element, '::after');
    const border = this.getBorder(pseudoStyle);
    const hasBorder = border.top > 0 || border.right > 0 || border.bottom > 0 || border.left > 0;

    if (!hasBorder) {
      return;
    }

    this.drawBorders(pseudoStyle, rect, border, opacity);
  }

  drawProgressFallback(style, rect, opacity) {
    const color = parseCssColor(style.backgroundColor);

    if (!color || color.alpha <= 0) {
      return;
    }

    const graphic = new Graphics();
    graphic.rect(rect.x, rect.y, rect.width, rect.height);
    graphic.fill({ color: color.color, alpha: color.alpha * opacity });
    this.root.addChild(graphic);
  }

  drawNotificationDot(element, rect, opacity) {
    if (element.dataset.notification !== 'true') {
      return;
    }

    const style = globalThis.getComputedStyle(element);
    const toneVar =
      element.dataset.notificationTone === 'orange'
        ? '--style-notification-orange'
        : '--style-notification';
    const color = this.readCssColor(toneVar);
    const size = readCssPixel(style.getPropertyValue('--style-notification-size')) * SOURCE_TO_CANVAS_SCALE || 7;
    const offset =
      readCssPixel(style.getPropertyValue('--style-notification-offset')) *
        SOURCE_TO_CANVAS_SCALE || 3;
    const graphic = new Graphics();
    graphic.circle(rect.x + rect.width + offset, rect.y - offset, size / 2);
    graphic.fill({ color: color.color, alpha: color.alpha * opacity });
    this.root.addChild(graphic);
  }

  getBorder(style) {
    return {
      top: readCssPixel(style.borderTopWidth) * SOURCE_TO_CANVAS_SCALE,
      right: readCssPixel(style.borderRightWidth) * SOURCE_TO_CANVAS_SCALE,
      bottom: readCssPixel(style.borderBottomWidth) * SOURCE_TO_CANVAS_SCALE,
      left: readCssPixel(style.borderLeftWidth) * SOURCE_TO_CANVAS_SCALE,
    };
  }

  getBoxShadow(style) {
    if (!style.boxShadow || style.boxShadow === 'none') {
      return null;
    }

    const match = style.boxShadow.match(
      /(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})\s+(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px/,
    );

    if (!match) {
      return null;
    }

    const color = parseCssColor(match[1]);

    if (!color || color.alpha <= 0) {
      return null;
    }

    return {
      color,
      offsetX: Number.parseFloat(match[2]) * SOURCE_TO_CANVAS_SCALE,
      offsetY: Number.parseFloat(match[3]) * SOURCE_TO_CANVAS_SCALE,
    };
  }

  getEffectiveOpacity(element) {
    let opacity = 1;
    let current = element;

    while (current && current !== this.stage.parentElement) {
      if (isElementNode(current)) {
        const style = globalThis.getComputedStyle(current);
        opacity *= Number.parseFloat(style.opacity || '1');
      }

      if (current === this.stage) {
        break;
      }

      current = current.parentElement;
    }

    return opacity;
  }

  toCanvasRect(rect) {
    const canvasRect = this.lastCanvasRect ?? this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / canvasRect.width;
    const scaleY = this.canvas.height / canvasRect.height;

    return {
      x: (rect.left - canvasRect.left) * scaleX,
      y: (rect.top - canvasRect.top) * scaleY,
      width: rect.width * scaleX,
      height: rect.height * scaleY,
    };
  }

  readCssColor(name) {
    return parseCssColor(globalThis.getComputedStyle(this.stage).getPropertyValue(name)) ?? {
      color: 0,
      alpha: 1,
    };
  }
}

function normalizeText(text, parent) {
  if (!text || !parent) {
    return '';
  }

  const style = globalThis.getComputedStyle(parent);

  if (style.whiteSpace.includes('pre')) {
    return text;
  }

  return text.replace(/\s+/g, ' ').trim();
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

function getLineHeight(style, fontSize) {
  const lineHeight = style.lineHeight;

  if (!lineHeight || lineHeight === 'normal') {
    return Math.round(fontSize * 1.2);
  }

  return readCssPixel(lineHeight) * SOURCE_TO_CANVAS_SCALE;
}

function readCssPixel(value) {
  const parsed = Number.parseFloat(String(value || '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function getNumericZIndex(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isElementNode(node) {
  return node?.nodeType === globalThis.Node?.ELEMENT_NODE;
}

function isImageElement(element) {
  return element?.tagName === 'IMG';
}

function isTextEntryElement(element) {
  return element?.tagName === 'INPUT' || element?.tagName === 'TEXTAREA';
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
