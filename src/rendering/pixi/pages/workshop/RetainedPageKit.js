import {
  BlurFilter,
  Container,
  Graphics,
  NineSliceSprite,
  Rectangle,
  Text,
  Texture,
} from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import { createPixiPageBackgroundGradient } from '../../theme/PixiPageBackground.js';
import { PixiButton } from '../../primitives/PixiButton.js';
import { PixiProgressBar } from '../../primitives/PixiProgressBar.js';

let nextRetainedInputId = 1;

export const RETAINED_PAGE_GEOMETRY = Object.freeze({
  width: 360,
  height: 2170 / 3,
  contentTop: 104,
  contentEdge: 16,
  chatClearance: 162,
  rowHeight: 20,
  researchRowHeight: 22,
  tabHeight: 28,
  scrollCut: 6,
});

export const RETAINED_TEXT_STYLES = Object.freeze({
  body: Object.freeze({ fontSize: 13, lineHeight: 16 }),
  bold: Object.freeze({ fontSize: 13, lineHeight: 16, fontWeight: '700' }),
  border: Object.freeze({ fontSize: 11, lineHeight: 14 }),
  tiny: Object.freeze({ fontSize: 10, lineHeight: 12 }),
  dialogTitle: Object.freeze({ fontSize: 14, lineHeight: 17, fontWeight: '700' }),
});

export class BaseRetainedPixiPage {
  constructor({
    pageId,
    semanticTargets = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    if (!pageId) {
      throw new Error('Retained Pixi pages require a page id.');
    }

    this.pageId = pageId;
    this.semanticTargets = semanticTargets;
    this.theme = theme;
    this.viewportProjection = null;
    this.viewModel = null;
    this.registeredTargetIds = new Set();
    this.destroyed = false;
    this.backgroundGradient = null;

    this.root = new Container({ label: `${pageId}-page` });
    this.root.visible = false;
    this.root.renderable = false;
    this.root.eventMode = 'none';
    this.background = new Graphics({ label: `${pageId}-background` });
    this.content = new Container({ label: `${pageId}-content` });
    this.root.addChild(this.background, this.content);
    this.applyTheme(theme);
    this.layout({
      sourceWidth: RETAINED_PAGE_GEOMETRY.width,
      sourceHeight: RETAINED_PAGE_GEOMETRY.height,
    });
  }

  bind(viewModel) {
    this.assertUsable('bind');
    this.viewModel = viewModel ?? {};
    this.renderViewModel(this.viewModel);
  }

  applyTheme(themeSnapshot) {
    this.assertUsable('apply a theme');
    this.theme = themeSnapshot ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.backgroundGradient?.destroy?.();
    this.backgroundGradient = createPixiPageBackgroundGradient(
      this.pageId,
      this.theme,
    );
    this.drawBackground();
    this.applyThemeToChildren(this.theme);
  }

  layout(viewportProjection) {
    this.assertUsable('lay out');
    this.viewportProjection = viewportProjection ?? {};
    this.sourceWidth = finiteOr(
      this.viewportProjection.sourceWidth,
      RETAINED_PAGE_GEOMETRY.width,
    );
    this.sourceHeight = finiteOr(
      this.viewportProjection.sourceHeight,
      RETAINED_PAGE_GEOMETRY.height,
    );
    this.drawBackground();
    this.layoutPage(this.sourceWidth, this.sourceHeight);
  }

  activate() {
    this.assertUsable('activate');
    this.root.visible = true;
    this.root.renderable = true;
    this.root.eventMode = 'auto';
  }

  deactivate() {
    this.assertUsable('deactivate');
    this.root.eventMode = 'none';
    this.root.renderable = false;
    this.root.visible = false;
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.clearSemanticTargets();
    this.backgroundGradient?.destroy?.();
    this.backgroundGradient = null;
    this.destroyPage();
    this.root.destroy({ children: true });
    this.destroyed = true;
  }

  getDisplayObject() {
    return this.root;
  }

  registerSemanticTarget(descriptor) {
    if (!this.semanticTargets || !descriptor?.semanticId) {
      return null;
    }

    this.unregisterSemanticTarget(descriptor.semanticId);
    const definition = this.semanticTargets.register(descriptor);
    this.registeredTargetIds.add(definition.semanticId);
    return definition;
  }

  unregisterSemanticTarget(semanticId) {
    if (!this.registeredTargetIds.has(semanticId)) {
      return false;
    }

    this.registeredTargetIds.delete(semanticId);
    return this.semanticTargets?.unregister(semanticId) ?? false;
  }

  clearSemanticTargets() {
    for (const semanticId of this.registeredTargetIds) {
      this.semanticTargets?.unregister(semanticId);
    }

    this.registeredTargetIds.clear();
  }

  drawBackground() {
    if (!this.background || !this.theme) {
      return;
    }

    this.background
      .clear()
      .rect(
        0,
        0,
        this.sourceWidth ?? RETAINED_PAGE_GEOMETRY.width,
        this.sourceHeight ?? RETAINED_PAGE_GEOMETRY.height,
      );
    try {
      this.background.fill(
        this.backgroundGradient ?? this.theme.surface,
      );
    } catch {
      this.background
        .clear()
        .rect(
          0,
          0,
          this.sourceWidth ?? RETAINED_PAGE_GEOMETRY.width,
          this.sourceHeight ?? RETAINED_PAGE_GEOMETRY.height,
        )
        .fill({ color: this.theme.surface });
    }
  }

  renderViewModel() {}

  applyThemeToChildren() {}

  layoutPage() {}

  destroyPage() {}

  assertUsable(action) {
    if (this.destroyed) {
      throw new Error(`Cannot ${action} destroyed ${this.pageId} page.`);
    }
  }
}

export class RetainedPanel {
  constructor({
    assetManager = null,
    label = '',
    panelLabel = 'panel',
    strong = false,
    shadowKind = strong ? 'dialog' : 'none',
  } = {}) {
    this.assetManager = assetManager;
    this.strong = strong;
    this.shadowKind = shadowKind;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.width = 0;
    this.height = 0;
    this.root = new Container({ label: panelLabel });
    this.shadow = new Graphics({ label: `${panelLabel}-shadow` });
    this.shadowFilter =
      this.shadowKind === 'none'
        ? null
        : new BlurFilter({
            strength: this.shadowKind === 'tooltip' ? 2 : 5,
            quality: 3,
          });

    if (this.shadowFilter) {
      this.shadow.filters = [this.shadowFilter];
    }

    this.fallback = new Graphics({ label: `${panelLabel}-frame` });
    this.frame = new NineSliceSprite({
      texture: Texture.EMPTY,
      leftWidth: 29,
      topHeight: 31,
      rightWidth: 29,
      bottomHeight: 31,
    });
    this.frame.label = `${panelLabel}-nine-slice`;
    this.frame.visible = false;
    this.body = new Container({ label: `${panelLabel}-body` });
    this.titleBacking = new Graphics({ label: `${panelLabel}-title-backing` });
    this.title = createText(label, RETAINED_TEXT_STYLES.bold);
    this.title.label = `${panelLabel}-title`;
    this.root.addChild(
      this.shadow,
      this.fallback,
      this.frame,
      this.body,
      this.titleBacking,
      this.title,
    );
    this.setTitle(label);
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = Math.max(0, width);
    this.height = Math.max(0, height);
    this.layoutFrame();
    this.redraw();
    return this;
  }

  setTitle(label) {
    setText(this.title, label ?? '');
    this.title.visible = Boolean(label);
    this.titleBacking.visible = this.title.visible;
    this.redraw();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    applyTextTheme(this.title, this.theme, RETAINED_TEXT_STYLES.bold);
    const frameId = this.theme.frames?.panel;

    if (frameId && this.assetManager?.has?.(frameId)) {
      this.frame.texture = this.assetManager.getTexture(frameId);
      const insets = this.theme.frames.panelSourceInsets;
      this.frame.leftWidth = insets?.left ?? 83;
      this.frame.topHeight = insets?.top ?? 91;
      this.frame.rightWidth = insets?.right ?? 73;
      this.frame.bottomHeight = insets?.bottom ?? 90;
      this.frame.visible = true;
      this.fallback.visible = false;
      this.layoutFrame();
    } else {
      this.frame.visible = false;
      this.fallback.visible = true;
    }

    this.redraw();
  }

  redraw() {
    if (!this.theme) {
      return;
    }

    const borderWidth = 2;
    const isTooltip = this.shadowKind === 'tooltip';
    this.shadow
      .clear()
      .rect(
        isTooltip ? -1 : 5,
        isTooltip ? 3 : 5,
        this.width,
        this.height,
      )
      .fill({
        color: isTooltip
          ? this.theme.tooltipShadow
          : this.theme.dialogShadow,
      });
    this.shadow.visible = this.shadowKind !== 'none';
    this.fallback
      .clear()
      .rect(0, 0, this.width, this.height)
      .fill({ color: this.theme.panelFill ?? this.theme.surface })
      .stroke({ color: this.theme.stroke, width: borderWidth });
    this.title.position.set(8, -12);
    this.title.style.stroke = this.strong
      ? null
      : { color: this.theme.surface, width: 2, join: 'round' };
    const titleWidth = Math.ceil(this.title.width) + 4;
    this.titleBacking
      .clear()
      .rect(6, -12, titleWidth, 14)
      .fill({ color: this.theme.surface });
    this.titleBacking.visible = this.strong && this.title.visible;
  }

  layoutFrame() {
    layoutNineSlice(
      this.frame,
      this.width,
      this.height,
      this.theme.frames?.panelSourceInsets,
      this.theme.frames?.panelBorder,
    );
  }

  destroy() {
    this.shadowFilter?.destroy();
    this.shadowFilter = null;
    this.root.destroy({ children: true });
  }
}

export class RetainedButton {
  constructor({
    assetManager = null,
    label = '',
    buttonLabel = 'button',
    onActivate = null,
    inputRouter = null,
    variant = 'button',
  } = {}) {
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.activation = onActivate;
    this.enabled = true;
    this.selected = false;
    this.notification = false;
    this.width = 0;
    this.height = 0;
    this.variant = variant;
    this.control = new PixiButton({
      assetManager,
      inputRouter,
      text: label,
      action: onActivate,
      variant: normalizeRetainedButtonVariant(variant),
      label: buttonLabel,
    });
    this.root = this.control;
    this.frame = this.control.frame;
    this.nineSlice = this.control.rootRunFrame;
    this.text = this.control.textLabel.textObject;
    this.notificationDot = this.control.notificationDot;
    this.handleTap = (payload) => this.control.activate(payload);
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = Math.max(0, width);
    this.height = Math.max(0, height);
    this.control.setSize(this.width, this.height);
    return this;
  }

  setModel({
    label,
    enabled = true,
    selected = false,
    notification = false,
    action,
  } = {}) {
    this.enabled = enabled !== false;
    this.selected = selected === true;
    this.notification = notification === true;
    this.activation = typeof action === 'function' ? action : null;
    this.control
      .setText(label ?? '')
      .setEnabled(this.enabled)
      .setSelected(this.selected)
      .setNotification(this.notification)
      .setAction(this.activation);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.control.applyTheme(this.theme);
  }

  redraw() {
    this.control
      .setEnabled(this.enabled)
      .setSelected(this.selected)
      .setNotification(this.notification)
      .setAction(this.activation)
      .setVariant(normalizeRetainedButtonVariant(this.variant))
      .applyTheme(this.theme);
  }

  destroy() {
    this.control.destroy({ children: true });
    this.control = null;
  }
}

function normalizeRetainedButtonVariant(variant) {
  return variant === 'button' ? 'regular' : variant;
}

export class RetainedProgressBar {
  constructor({ label = 'progress', tone = 'root' } = {}) {
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.progress = 0;
    this.width = 0;
    this.height = PIXI_UI_GEOMETRY.progressTotalHeight;
    this.control = new PixiProgressBar({
      width: 0,
      height: this.height,
      tone,
      label,
    });
    this.root = this.control;
    this.rail = this.control.railGraphic;
    this.fill = this.control.fillGraphic;
  }

  get tone() {
    return this.control.tone;
  }

  get gradient() {
    return this.control.gradient;
  }

  setBounds(x, y, width, height = this.height) {
    this.root.position.set(x, y);
    this.width = Math.max(0, width);
    this.height = Math.max(1, height);
    this.control.setSize(this.width, this.height);
  }

  setProgress(progress) {
    this.progress = Math.min(1, Math.max(0, finiteOr(progress, 0)));
    this.control.setProgress(this.progress);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.control.applyTheme(this.theme);
  }

  destroy() {
    this.control.destroy({ children: true });
  }
}

export class RetainedScrollArea {
  constructor({ label = 'scroll-area', inputRouter = null } = {}) {
    this.inputRouter = inputRouter;
    this.inputId = createRetainedInputId(label);
    this.root = new Container({ label });
    this.content = new Container({ label: `${label}-content` });
    this.maskShape = new Graphics({ label: `${label}-mask` });
    this.root.addChild(this.content, this.maskShape);
    this.content.mask = this.maskShape;
    this.root.eventMode = 'static';
    this.offsetY = 0;
    this.contentHeight = 0;
    this.width = 0;
    this.height = 0;
    this.dragPointerId = null;
    this.lastPointerY = 0;
    this.handleWheel = (event) => {
      this.scrollBy(finiteOr(event?.deltaY, 0));
    };
    this.handlePointerDown = (event) => {
      this.dragPointerId = event.pointerId;
      this.lastPointerY = event.global?.y ?? 0;
    };
    this.handlePointerMove = (event) => {
      if (event.pointerId !== this.dragPointerId) {
        return;
      }

      const nextY = event.global?.y ?? this.lastPointerY;
      this.scrollBy(this.lastPointerY - nextY);
      this.lastPointerY = nextY;
    };
    this.handlePointerEnd = (event) => {
      if (event.pointerId === this.dragPointerId) {
        this.dragPointerId = null;
      }
    };
    this.inputRegistration = this.inputRouter?.registerScrollRegion?.({
      id: this.inputId,
      displayObject: this.root,
      excludePageSwipe: false,
      getOffset: () => this.offsetY,
      getMaxOffset: () => Math.max(0, this.contentHeight - this.height),
      onScroll: (offsetY) => this.scrollTo(offsetY),
    }) ?? null;
    this.usesDirectInput = !this.inputRegistration;

    if (this.usesDirectInput) {
      this.root.on('wheel', this.handleWheel);
      this.root.on('pointerdown', this.handlePointerDown);
      this.root.on('pointermove', this.handlePointerMove);
      this.root.on('pointerup', this.handlePointerEnd);
      this.root.on('pointerupoutside', this.handlePointerEnd);
      this.root.on('pointercancel', this.handlePointerEnd);
    }
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = Math.max(0, width);
    this.height = Math.max(0, height);
    this.root.hitArea = new Rectangle(0, 0, this.width, this.height);
    this.maskShape.clear().rect(0, 0, this.width, this.height).fill({ color: 0xffffff });
    this.scrollTo(this.offsetY);
  }

  setContentHeight(height) {
    this.contentHeight = Math.max(0, finiteOr(height, 0));
    this.scrollTo(this.offsetY);
  }

  scrollBy(deltaY) {
    return this.scrollTo(this.offsetY + deltaY);
  }

  scrollTo(offsetY) {
    const maximum = Math.max(0, this.contentHeight - this.height);
    const nextOffset = Math.min(maximum, Math.max(0, finiteOr(offsetY, 0)));

    if (nextOffset === this.offsetY && this.content.y === -nextOffset) {
      return false;
    }

    this.offsetY = nextOffset;
    this.content.y = -nextOffset;
    return true;
  }

  scrollRectIntoView(
    { y = 0, height = 0 } = {},
    { padding = 0 } = {},
  ) {
    const inset = Math.max(0, finiteOr(padding, 0));
    const rectTop = finiteOr(y, 0);
    const rectBottom =
      rectTop + Math.max(0, finiteOr(height, 0));
    const viewportTop = this.offsetY;
    const viewportBottom = viewportTop + this.height;

    if (rectTop - inset < viewportTop) {
      return this.scrollTo(rectTop - inset);
    }
    if (rectBottom + inset > viewportBottom) {
      return this.scrollTo(
        rectBottom + inset - this.height,
      );
    }
    return false;
  }

  destroy() {
    this.inputRegistration?.unregister?.();
    this.inputRegistration = null;

    if (this.usesDirectInput) {
      this.root.off('wheel', this.handleWheel);
      this.root.off('pointerdown', this.handlePointerDown);
      this.root.off('pointermove', this.handlePointerMove);
      this.root.off('pointerup', this.handlePointerEnd);
      this.root.off('pointerupoutside', this.handlePointerEnd);
      this.root.off('pointercancel', this.handlePointerEnd);
    }

    this.root.destroy({ children: true });
  }
}

export function createText(text = '', style = RETAINED_TEXT_STYLES.body) {
  return new Text({
    text: String(text ?? ''),
    resolution: 3,
    roundPixels: true,
    style: {
      fontFamily: DEFAULT_PIXI_THEME_SNAPSHOT.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight ?? '400',
      fontStyle: 'normal',
      fontVariant: 'normal',
      fill: style.fill ?? DEFAULT_PIXI_THEME_SNAPSHOT.text,
      lineHeight: style.lineHeight,
      align: style.align ?? 'left',
      wordWrap: Boolean(style.wordWrapWidth),
      wordWrapWidth: style.wordWrapWidth,
      breakWords: false,
      leading: 0,
      letterSpacing: 0,
      padding: 0,
      whiteSpace: style.wordWrapWidth ? 'normal' : 'pre',
    },
  });
}

export function applyTextTheme(text, theme, style = RETAINED_TEXT_STYLES.body) {
  text.style = {
    fontFamily: theme.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight ?? '400',
    fontStyle: 'normal',
    fontVariant: 'normal',
    fill: style.fill ?? theme.text,
    lineHeight: style.lineHeight,
    align: style.align ?? 'left',
    wordWrap: Boolean(style.wordWrapWidth),
    wordWrapWidth: style.wordWrapWidth,
    breakWords: false,
    leading: 0,
    letterSpacing: 0,
    padding: 0,
    whiteSpace: style.wordWrapWidth ? 'normal' : 'pre',
  };
}

export function setText(text, value) {
  const nextValue = String(value ?? '');

  if (text.text !== nextValue) {
    text.text = nextValue;
  }
}

export function finiteOr(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function normalizeRows(rows) {
  return Array.isArray(rows) ? rows : [];
}

export function createRetainedInputId(label) {
  const normalizedLabel = String(label ?? 'control')
    .trim()
    .replaceAll(/[^a-zA-Z0-9_.:-]+/g, '-');
  const inputId = `retained:${normalizedLabel}:${nextRetainedInputId}`;
  nextRetainedInputId += 1;
  return inputId;
}

function layoutNineSlice(
  sprite,
  width,
  height,
  sourceInsets,
  borderInsets,
) {
  if (!sourceInsets || !borderInsets) {
    sprite.width = width;
    sprite.height = height;
    return;
  }

  sprite.leftWidth = sourceInsets.left;
  sprite.topHeight = sourceInsets.top;
  sprite.rightWidth = sourceInsets.right;
  sprite.bottomHeight = sourceInsets.bottom;
  const scaleX = borderInsets.left / sourceInsets.left;
  const scaleY = borderInsets.top / sourceInsets.top;
  sprite.scale.set(scaleX, scaleY);
  sprite.setSize(
    scaleX > 0 ? width / scaleX : width,
    scaleY > 0 ? height / scaleY : height,
  );
}
