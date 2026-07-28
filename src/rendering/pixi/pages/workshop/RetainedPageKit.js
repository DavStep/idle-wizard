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
import {
  ROOT_RUN_STATION_CLICK_DRAG_THRESHOLD,
  ROOT_RUN_STATION_SCROLLBAR_OVERSCROLL_COMPRESSION,
  ROOT_RUN_STATION_WHEEL_SCROLL_FACTOR,
  ROOT_RUN_TO_IDLE_WIZARD_SCROLL_SCALE,
  StationScrollPhysics,
} from '../../../../pages/managers/StationScrollPhysics.js';
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

export const RETAINED_SCROLLBAR_GEOMETRY = Object.freeze({
  width: 6.5,
  gap: 1.805556,
  trackInset: 4.333333,
  trackBorderWidth: 1.083333,
  thumbGap: 1.083333,
  thumbBorderWidth: 0.722222,
  thumbMinHeight: 29.611111,
});

export const RETAINED_DIALOG_SCROLL_GEOMETRY = Object.freeze({
  contentPaddingTop: PIXI_UI_GEOMETRY.dialogScrollPaddingTop,
  scrollbarShiftRight: 4,
});

export const RETAINED_SCROLLBAR_VISUALS = Object.freeze({
  trackBackground: 0x17100c,
  trackBackgroundAlpha: 0.62,
  trackBorder: 0x000000,
  trackBorderAlpha: 0.72,
  thumbBackground: 0xf2ae54,
  thumbBorder: 0x5e321b,
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
    fallbackHitTest = false,
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
      fallbackHitTest,
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
  constructor({
    label = 'scroll-area',
    inputRouter = null,
    onScroll = null,
  } = {}) {
    this.inputRouter = inputRouter;
    this.onScroll = onScroll;
    this.inputId = createRetainedInputId(label);
    this.root = new Container({ label });
    this.content = new Container({ label: `${label}-content` });
    this.maskShape = new Graphics({ label: `${label}-mask` });
    this.scrollbarTrack = new Graphics({
      label: `${label}-scrollbar-track`,
    });
    this.scrollbarThumb = new Graphics({
      label: `${label}-scrollbar-thumb`,
    });
    this.scrollbarTrack.eventMode = 'none';
    this.scrollbarThumb.eventMode = 'none';
    this.root.addChild(
      this.content,
      this.maskShape,
      this.scrollbarTrack,
      this.scrollbarThumb,
    );
    this.content.mask = this.maskShape;
    this.root.eventMode = 'static';
    this.root.cursor = 'default';
    this.physics = new StationScrollPhysics();
    this.offsetY = 0;
    this.contentHeight = 0;
    this.width = 0;
    this.height = 0;
    this.dragPointerId = null;
    this.animationFrame = 0;
    this.lastFrameTimeMs = null;
    this.suppressNextActivation = false;
    this.handleWheel = (event) => {
      this.onWheelInput({
        event,
        point: event?.global,
      });
    };
    this.handlePointerDown = (event) => {
      if (
        event?.isPrimary === false ||
        (Number.isFinite(event?.button) && event.button > 0)
      ) {
        return;
      }

      if (
        this.beginDrag({
          event,
          point: event?.global,
        })
      ) {
        this.dragPointerId = event.pointerId ?? 1;
        captureNativePointer(event, this.dragPointerId);
      }
    };
    this.handlePointerMove = (event) => {
      if ((event.pointerId ?? 1) !== this.dragPointerId) {
        return;
      }

      this.dragTo({
        event,
        point: event?.global,
      });
    };
    this.handlePointerEnd = (event) => {
      if ((event.pointerId ?? 1) !== this.dragPointerId) {
        return;
      }

      this.dragPointerId = null;
      releaseNativePointer(event, event.pointerId ?? 1);
      this.endDrag({ event });
    };
    this.handleActivationCapture = (event) => {
      if (!this.suppressNextActivation) {
        return;
      }

      this.suppressNextActivation = false;
      preventPixiInput(event, true);
    };
    this.inputRegistration = this.inputRouter?.registerScrollRegion?.({
      id: this.inputId,
      displayObject: this.root,
      excludePageSwipe: false,
      enabled: () => this.physics.maxOffset > 0,
      getOffset: () => this.offsetY,
      getMaxOffset: () => Math.max(0, this.contentHeight - this.height),
      onScroll: (offsetY) => this.scrollTo(offsetY),
      onScrollPointerDown: (context) => this.beginDrag(context),
      onScrollPointerMove: (context) => this.dragTo(context),
      onScrollPointerUp: (context) => this.endDrag(context),
      onWheelInput: (context) => this.onWheelInput(context),
    }) ?? null;
    this.usesDirectInput = !this.inputRegistration;

    if (this.usesDirectInput) {
      this.root.on('wheel', this.handleWheel);
      this.root.on('pointerdown', this.handlePointerDown);
      this.root.on('globalpointermove', this.handlePointerMove);
      this.root.on('pointerup', this.handlePointerEnd);
      this.root.on('pointerupoutside', this.handlePointerEnd);
      this.root.on('pointercancel', this.handlePointerEnd);
      this.root.on('clickcapture', this.handleActivationCapture);
      this.root.on('pointertapcapture', this.handleActivationCapture);
    }
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = Math.max(0, width);
    this.height = Math.max(0, height);
    this.root.hitArea = new Rectangle(0, 0, this.width, this.height);
    this.maskShape.clear().rect(0, 0, this.width, this.height).fill({ color: 0xffffff });
    this.refreshMaximumOffset();
  }

  setContentHeight(height) {
    this.contentHeight = Math.max(0, finiteOr(height, 0));
    this.refreshMaximumOffset();
  }

  scrollBy(deltaY) {
    return this.scrollTo(this.offsetY + deltaY);
  }

  scrollTo(offsetY) {
    this.cancelAnimation();
    this.physics.snapTo(
      this.toPhysicsUnits(finiteOr(offsetY, 0)),
    );
    return this.applyPhysicsOffset();
  }

  refreshMaximumOffset() {
    const maximumOffset = this.toPhysicsUnits(
      Math.max(0, this.contentHeight - this.height),
    );
    if (maximumOffset !== this.physics.maxOffset) {
      this.physics.setMaxOffset(maximumOffset);
    }
    this.root.cursor = this.physics.maxOffset > 0 ? 'grab' : 'default';
    this.applyPhysicsOffset();
  }

  applyPhysicsOffset() {
    const nextOffset = this.toDesignUnits(this.physics.offset);
    const changed =
      nextOffset !== this.offsetY || this.content.y !== -nextOffset;

    if (changed) {
      this.offsetY = nextOffset;
      this.content.y = -nextOffset;
      this.onScroll?.(nextOffset);
    }

    this.updateScrollbar();
    return changed;
  }

  beginDrag(context = {}) {
    if (this.physics.maxOffset === 0) {
      return false;
    }

    this.cancelAnimation();
    this.suppressNextActivation = false;
    const began = this.physics.beginDrag(
      this.toPhysicsUnits(this.localPointerY(context.point)),
      eventTimeMs(context.event),
    );
    if (began) {
      this.root.cursor = 'grabbing';
    }
    return began;
  }

  dragTo(context = {}) {
    if (!this.physics.isDragging) {
      return false;
    }

    this.physics.dragTo(
      this.toPhysicsUnits(this.localPointerY(context.point)),
      eventTimeMs(context.event),
    );
    this.applyPhysicsOffset();
    return true;
  }

  endDrag() {
    if (!this.physics.isDragging) {
      return false;
    }

    const suppressActivation =
      this.physics.dragDistance >
      ROOT_RUN_STATION_CLICK_DRAG_THRESHOLD;
    this.physics.endDrag();
    this.root.cursor = this.physics.maxOffset > 0 ? 'grab' : 'default';
    this.suppressNextActivation = suppressActivation;
    this.startAnimation();
    return suppressActivation;
  }

  onWheelInput(context = {}) {
    if (this.physics.maxOffset === 0) {
      return false;
    }

    preventPixiInput(context.event);
    const localDelta = this.localWheelDelta(
      context.event,
      context.point,
    );
    this.physics.scrollByElastic(
      this.toPhysicsUnits(localDelta) *
        ROOT_RUN_STATION_WHEEL_SCROLL_FACTOR,
    );
    this.applyPhysicsOffset();
    this.startAnimation();
    return true;
  }

  update(deltaSeconds) {
    const moved = this.physics.update(deltaSeconds);
    if (moved) {
      this.applyPhysicsOffset();
    }
    return moved;
  }

  startAnimation() {
    if (
      this.animationFrame ||
      this.physics.isDragging ||
      !this.physics.isAnimating
    ) {
      return;
    }

    const requestFrame = globalThis.requestAnimationFrame;
    if (typeof requestFrame !== 'function') {
      return;
    }

    this.lastFrameTimeMs = null;
    this.animationFrame = requestFrame((timestamp) =>
      this.tickAnimation(timestamp),
    );
  }

  tickAnimation(timestamp) {
    this.animationFrame = 0;
    const deltaSeconds =
      this.lastFrameTimeMs === null
        ? 1 / 60
        : Math.max(0, (timestamp - this.lastFrameTimeMs) / 1000);
    this.lastFrameTimeMs = timestamp;
    this.update(deltaSeconds);

    if (this.physics.isAnimating) {
      this.animationFrame = globalThis.requestAnimationFrame?.(
        (nextTimestamp) => this.tickAnimation(nextTimestamp),
      ) ?? 0;
      return;
    }

    this.lastFrameTimeMs = null;
  }

  cancelAnimation() {
    if (this.animationFrame) {
      globalThis.cancelAnimationFrame?.(this.animationFrame);
    }
    this.animationFrame = 0;
    this.lastFrameTimeMs = null;
  }

  localPointerY(point) {
    const globalPoint = {
      x: finiteOr(point?.x, 0),
      y: finiteOr(point?.y, 0),
    };
    return finiteOr(this.root.toLocal(globalPoint)?.y, 0);
  }

  localWheelDelta(event, point) {
    let delta = finiteOr(event?.deltaY, 0);
    if (event?.deltaMode === 1) {
      delta *= 16;
    } else if (event?.deltaMode === 2) {
      delta *= Math.max(1, this.height);
    }

    const globalPoint = {
      x: finiteOr(point?.x, 0),
      y: finiteOr(point?.y, 0),
    };
    const localStart = this.root.toLocal(globalPoint);
    const localEnd = this.root.toLocal({
      x: globalPoint.x,
      y: globalPoint.y + delta,
    });
    return finiteOr(localEnd?.y, 0) - finiteOr(localStart?.y, 0);
  }

  toPhysicsUnits(value) {
    return value / ROOT_RUN_TO_IDLE_WIZARD_SCROLL_SCALE;
  }

  toDesignUnits(value) {
    return value * ROOT_RUN_TO_IDLE_WIZARD_SCROLL_SCALE;
  }

  updateScrollbar() {
    const maximum = Math.max(0, this.contentHeight - this.height);
    const geometry = RETAINED_SCROLLBAR_GEOMETRY;
    const trackHeight = Math.max(
      0,
      this.height - geometry.trackInset * 2,
    );
    const visible =
      maximum > 0 &&
      this.width > 0 &&
      this.height > 0 &&
      trackHeight > 0;
    this.scrollbarTrack.visible = visible;
    this.scrollbarThumb.visible = visible;

    if (!visible) {
      this.scrollbarTrack.clear();
      this.scrollbarThumb.clear();
      return;
    }

    const trackX = this.width + geometry.gap;
    const trackRadius = Math.min(geometry.width / 2, trackHeight / 2);
    this.scrollbarTrack
      .clear()
      .roundRect(
        trackX,
        geometry.trackInset,
        geometry.width,
        trackHeight,
        trackRadius,
      )
      .fill({
        color: RETAINED_SCROLLBAR_VISUALS.trackBackground,
        alpha: RETAINED_SCROLLBAR_VISUALS.trackBackgroundAlpha,
      })
      .roundRect(
        trackX,
        geometry.trackInset,
        geometry.width,
        trackHeight,
        trackRadius,
      )
      .stroke({
        color: RETAINED_SCROLLBAR_VISUALS.trackBorder,
        alpha: RETAINED_SCROLLBAR_VISUALS.trackBorderAlpha,
        width: geometry.trackBorderWidth,
        alignment: 1,
      });

    const baseThumbHeight = Math.min(
      trackHeight,
      Math.max(
        geometry.thumbMinHeight,
        (trackHeight * this.height) / this.contentHeight,
      ),
    );
    const topOverscroll = Math.max(0, -this.offsetY);
    const bottomOverscroll = Math.max(
      0,
      this.offsetY - maximum,
    );
    const compression = Math.min(
      Math.max(0, baseThumbHeight - geometry.width * 2),
      Math.max(topOverscroll, bottomOverscroll) *
        ROOT_RUN_STATION_SCROLLBAR_OVERSCROLL_COMPRESSION,
    );
    const thumbHeight = baseThumbHeight - compression;
    const thumbTravel = Math.max(
      0,
      trackHeight - baseThumbHeight,
    );
    const clampedOffset = Math.max(
      0,
      Math.min(maximum, this.offsetY),
    );
    let thumbY =
      geometry.trackInset +
      thumbTravel * (clampedOffset / maximum);
    if (bottomOverscroll > 0) {
      thumbY =
        geometry.trackInset + trackHeight - thumbHeight;
    }
    const thumbX = trackX + geometry.thumbGap;
    const thumbWidth = Math.max(
      0,
      geometry.width - geometry.thumbGap * 2,
    );
    const thumbRadius = Math.min(thumbWidth / 2, thumbHeight / 2);
    this.scrollbarThumb
      .clear()
      .roundRect(
        thumbX,
        thumbY,
        thumbWidth,
        thumbHeight,
        thumbRadius,
      )
      .fill(RETAINED_SCROLLBAR_VISUALS.thumbBackground)
      .roundRect(
        thumbX,
        thumbY,
        thumbWidth,
        thumbHeight,
        thumbRadius,
      )
      .stroke({
        color: RETAINED_SCROLLBAR_VISUALS.thumbBorder,
        width: geometry.thumbBorderWidth,
        alignment: 1,
      });
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
    this.cancelAnimation();
    this.inputRegistration?.unregister?.();
    this.inputRegistration = null;

    if (this.usesDirectInput) {
      this.root.off('wheel', this.handleWheel);
      this.root.off('pointerdown', this.handlePointerDown);
      this.root.off('globalpointermove', this.handlePointerMove);
      this.root.off('pointerup', this.handlePointerEnd);
      this.root.off('pointerupoutside', this.handlePointerEnd);
      this.root.off('pointercancel', this.handlePointerEnd);
      this.root.off('clickcapture', this.handleActivationCapture);
      this.root.off('pointertapcapture', this.handleActivationCapture);
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

function eventTimeMs(event) {
  const timestamp = Number(
    event?.timeStamp ??
      event?.nativeEvent?.timeStamp ??
      globalThis.performance?.now?.(),
  );
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function preventPixiInput(event, immediate = false) {
  if (event?.cancelable !== false) {
    event?.preventDefault?.();
  }
  event?.stopPropagation?.();
  if (immediate) {
    event?.stopImmediatePropagation?.();
  }
}

function captureNativePointer(event, pointerId) {
  try {
    const target =
      event?.nativeEvent?.currentTarget ??
      event?.nativeEvent?.target;
    target?.setPointerCapture?.(pointerId);
  } catch {
    // WebView may reject capture for synthetic or already-ended pointers.
  }
}

function releaseNativePointer(event, pointerId) {
  try {
    const target =
      event?.nativeEvent?.currentTarget ??
      event?.nativeEvent?.target;
    target?.releasePointerCapture?.(pointerId);
  } catch {
    // Pointer capture is released automatically on some platforms.
  }
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
