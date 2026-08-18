import { Container, Sprite, Texture } from 'pixi.js';

import {
  isDisplayObjectDescendant,
  pointInDisplayObject,
} from '../../input/InputGeometry.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
import {
  RETAINED_TEXT_STYLES,
  RetainedPanel,
  applyTextTheme,
  createText,
  setText,
} from '../workshop/RetainedPageKit.js';

export const PIXI_TOOLTIP_POINTER_ASSET_ID =
  'source:assets/ui/tooltip-pointer.png';
export const PIXI_TOOLTIP_ENTRY_DURATION_MS = 220;
export const PIXI_TOOLTIP_GEOMETRY = Object.freeze({
  width: 180,
  sideInset: 8,
  copyInsetX: 10,
  copyInsetY: 8,
  pointerWidth: 28,
  pointerHeight: 15,
  pointerOverlap: 2,
  targetGap: 4,
});

const defaultPrefersReducedMotion = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
const defaultTimeSource = () =>
  globalThis.performance?.now?.() ?? Date.now();

export class PixiTooltip {
  constructor({
    assetManager = null,
    inputRouter = null,
    label = 'tooltip',
    prefersReducedMotion = defaultPrefersReducedMotion,
    timeSource = defaultTimeSource,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.prefersReducedMotion = prefersReducedMotion;
    this.timeSource = timeSource;
    this.theme = theme;
    this.width = PIXI_TOOLTIP_GEOMETRY.width;
    this.height = 0;
    this.bodyHeight = 0;
    this.placement = 'above';
    this.anchorTarget = null;
    this.entryStartedAt = null;

    this.root = new Container({ label });
    this.root.eventMode = 'none';
    this.panel = new RetainedPanel({
      assetManager,
      panelLabel: `${label}-panel`,
      strong: true,
      shadowKind: 'tooltip',
    });
    this.copy = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      fill: '#ffffff',
      wordWrapWidth: this.width - PIXI_TOOLTIP_GEOMETRY.copyInsetX * 2,
    });
    this.panel.body.addChild(this.copy);

    const hasPointer = assetManager?.has?.(PIXI_TOOLTIP_POINTER_ASSET_ID);
    this.pointer = new Sprite(
      hasPointer
        ? assetManager.getTexture(PIXI_TOOLTIP_POINTER_ASSET_ID)
        : Texture.EMPTY,
    );
    this.pointer.label = `${label}-pointer`;
    this.pointer.anchor.set(0.5, 0);
    this.pointer.width = PIXI_TOOLTIP_GEOMETRY.pointerWidth;
    this.pointer.height = PIXI_TOOLTIP_GEOMETRY.pointerHeight;
    this.pointer.visible = Boolean(hasPointer);
    this.pointer.renderable = Boolean(hasPointer);
    this.pointer.eventMode = 'none';

    this.root.addChild(this.panel.root, this.pointer);
    this.root.visible = false;
    this.root.renderable = false;
    this.unsubscribePointerDown = inputRouter?.subscribePointerDown?.(
      (context) => this.handlePointerDown(context),
    ) ?? null;
    this.applyTheme(theme);
  }

  bind(copy) {
    setText(this.copy, copy ?? '');
    this.copy.position.set(
      PIXI_TOOLTIP_GEOMETRY.copyInsetX,
      PIXI_TOOLTIP_GEOMETRY.copyInsetY,
    );
    this.bodyHeight = Math.ceil(
      this.copy.height + PIXI_TOOLTIP_GEOMETRY.copyInsetY * 2,
    );
    this.height =
      this.bodyHeight +
      PIXI_TOOLTIP_GEOMETRY.pointerHeight -
      PIXI_TOOLTIP_GEOMETRY.pointerOverlap;
    this.layoutChrome();
    return this;
  }

  showNearTarget({
    target,
    container,
    boundaryWidth,
    boundaryHeight,
    animate = true,
  } = {}) {
    if (!target || !container || this.height <= 0) {
      this.hide();
      return false;
    }

    const targetBounds = target.getBounds();
    const minX = Number.isFinite(targetBounds.minX)
      ? targetBounds.minX
      : targetBounds.x;
    const maxX = Number.isFinite(targetBounds.maxX)
      ? targetBounds.maxX
      : targetBounds.x + targetBounds.width;
    const minY = Number.isFinite(targetBounds.minY)
      ? targetBounds.minY
      : targetBounds.y;
    const maxY = Number.isFinite(targetBounds.maxY)
      ? targetBounds.maxY
      : targetBounds.y + targetBounds.height;
    const targetTop = container.toLocal({ x: (minX + maxX) / 2, y: minY });
    const targetBottom = container.toLocal({ x: (minX + maxX) / 2, y: maxY });
    const safeWidth = Math.max(this.width, Number(boundaryWidth) || this.width);
    const safeHeight = Math.max(this.height, Number(boundaryHeight) || this.height);
    const maxLeft = Math.max(
      PIXI_TOOLTIP_GEOMETRY.sideInset,
      safeWidth - this.width - PIXI_TOOLTIP_GEOMETRY.sideInset,
    );
    const x = clamp(
      targetTop.x - this.width / 2,
      PIXI_TOOLTIP_GEOMETRY.sideInset,
      maxLeft,
    );
    const aboveY =
      targetTop.y - this.height - PIXI_TOOLTIP_GEOMETRY.targetGap;
    const placement =
      aboveY >= PIXI_TOOLTIP_GEOMETRY.sideInset ? 'above' : 'below';
    const maxTop = Math.max(
      PIXI_TOOLTIP_GEOMETRY.sideInset,
      safeHeight - this.height - PIXI_TOOLTIP_GEOMETRY.sideInset,
    );
    const y = clamp(
      placement === 'above'
        ? aboveY
        : targetBottom.y + PIXI_TOOLTIP_GEOMETRY.targetGap,
      PIXI_TOOLTIP_GEOMETRY.sideInset,
      maxTop,
    );
    const pointerX = clamp(
      targetTop.x - x,
      PIXI_TOOLTIP_GEOMETRY.pointerWidth / 2 + 6,
      this.width - PIXI_TOOLTIP_GEOMETRY.pointerWidth / 2 - 6,
    );

    this.show({
      x,
      y,
      placement,
      pointerX,
      target,
      animate,
    });
    return true;
  }

  show({
    x,
    y,
    placement = 'above',
    pointerX = this.width / 2,
    target = null,
    animate = true,
  } = {}) {
    this.anchorTarget = target;
    this.placement = placement === 'below' ? 'below' : 'above';
    this.layoutChrome(pointerX);
    const tipY = this.placement === 'above' ? this.height : 0;
    this.root.pivot.set(pointerX, tipY);
    this.root.position.set(x + pointerX, y + tipY);
    this.root.visible = true;
    this.root.renderable = true;

    if (!animate || this.isReducedMotion()) {
      this.settleEntry();
      return;
    }

    this.entryStartedAt = this.timeSource();
    this.updateTime(this.entryStartedAt);
  }

  updateTime(now = this.timeSource()) {
    if (!this.root.visible || this.entryStartedAt === null) {
      return false;
    }

    const progress = clamp(
      (Number(now) - this.entryStartedAt) / PIXI_TOOLTIP_ENTRY_DURATION_MS,
      0,
      1,
    );
    const scale = getPixiTooltipEntryScale(progress);
    this.root.scale.set(scale);
    this.root.alpha = 0.72 + 0.28 * easeOutQuart(Math.min(1, progress / 0.55));

    if (progress >= 1) {
      this.settleEntry();
      return false;
    }
    return true;
  }

  settleEntry() {
    this.entryStartedAt = null;
    this.root.scale.set(1);
    this.root.alpha = 1;
  }

  hide() {
    const wasVisible = this.root.visible;
    this.entryStartedAt = null;
    this.anchorTarget = null;
    this.root.visible = false;
    this.root.renderable = false;
    this.root.scale.set(1);
    this.root.alpha = 1;
    return wasVisible;
  }

  handlePointerDown({ target, point } = {}) {
    if (!this.root.visible) {
      return false;
    }

    const insideTooltip =
      isDisplayObjectDescendant(target, this.root) ||
      pointInDisplayObject(this.root, point);
    const insideAnchor =
      isDisplayObjectDescendant(target, this.anchorTarget) ||
      pointInDisplayObject(this.anchorTarget, point);
    if (insideTooltip || insideAnchor) {
      return false;
    }

    return this.hide();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.panel.applyTheme(this.theme);
    // Tooltips are never allowed to fall back to the generic solid rectangle.
    this.panel.fallback.visible = false;
    this.pointer.tint = this.theme.tooltipPointerTint ?? '#ffffff';
    applyTextTheme(this.copy, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: '#ffffff',
      wordWrapWidth: this.width - PIXI_TOOLTIP_GEOMETRY.copyInsetX * 2,
    });
  }

  layoutChrome(pointerX = this.width / 2) {
    const panelY =
      this.placement === 'below'
        ? PIXI_TOOLTIP_GEOMETRY.pointerHeight -
          PIXI_TOOLTIP_GEOMETRY.pointerOverlap
        : 0;
    this.panel.setBounds(0, panelY, this.width, this.bodyHeight);
    this.panel.fallback.visible = false;
    this.pointer.rotation = this.placement === 'below' ? Math.PI : 0;
    this.pointer.position.set(
      pointerX,
      this.placement === 'below'
        ? PIXI_TOOLTIP_GEOMETRY.pointerHeight
        : this.bodyHeight - PIXI_TOOLTIP_GEOMETRY.pointerOverlap,
    );
  }

  isReducedMotion() {
    return typeof this.prefersReducedMotion === 'function'
      ? this.prefersReducedMotion() === true
      : this.prefersReducedMotion === true;
  }

  destroy() {
    this.unsubscribePointerDown?.();
    this.unsubscribePointerDown = null;
    this.panel.destroy();
    this.root.destroy();
  }
}

export function getPixiTooltipEntryScale(progress) {
  const normalized = clamp(Number(progress) || 0, 0, 1);
  if (normalized <= 0.72) {
    return 0.82 + (1.035 - 0.82) * easeOutQuart(normalized / 0.72);
  }
  return 1.035 + (1 - 1.035) * easeOutQuart((normalized - 0.72) / 0.28);
}

function easeOutQuart(value) {
  const normalized = clamp(Number(value) || 0, 0, 1);
  return 1 - (1 - normalized) ** 4;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
