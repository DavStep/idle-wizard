import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { PIXI_DIALOG_BASE_GEOMETRY } from './PixiDialogFrame.js';
import { PixiModalSurface } from './PixiModalSurface.js';

const DEFAULT_SOURCE_HEIGHT = PIXI_UI_GEOMETRY.sourceHeight;

/**
 * Player-dialog adapter for page-owned retained dialogs.
 *
 * Page dialogs predate the global dialog kit and already author their children
 * in an exact outer-core rectangle. This adapter keeps that geometry while
 * routing the surface through the same Root Run frame, modal stack, backdrop,
 * close control, and open motion as every other player dialog.
 */
export class PixiOwnedDialogSurface extends PixiModalSurface {
  constructor({
    id,
    parent,
    inputRouter = null,
    semanticRegistry = null,
    assetManager = null,
    title = '',
    titleVariant = 'default',
    openMotion = 'center',
    onClose = null,
    backdropAlpha = 0.78,
    motionRuntime = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
    label = `${id}-dialog`,
  } = {}) {
    if (!id || !parent?.addChild) {
      throw new Error('Owned Pixi dialogs require an id and parent layer.');
    }

    const close = typeof onClose === 'function' ? onClose : null;
    super({
      assetManager,
      title,
      contentWidth: PIXI_DIALOG_BASE_GEOMETRY.contentWidth,
      contentHeight: PIXI_DIALOG_BASE_GEOMETRY.minContentHeight,
      backdropAlpha,
      inputRouter,
      semanticRegistry,
      modalId: id,
      dismissOnOutside: () => close?.({ source: 'outside', dialogId: id }) ?? true,
      onBack: () => close?.({ source: 'back', dialogId: id }) ?? true,
      onEscape: () => close?.({ source: 'escape', dialogId: id }) ?? true,
      openMotion,
      motionRuntime,
      label,
    });

    this.id = id;
    this.onClose = close;
    this.title = title ?? '';
    this.panel.setTitleVariant(titleVariant);
    this.fixedBounds = null;
    this.panel.setCloseAction((payload) =>
      this.requestClose('close', payload),
    );
    parent.addChild(this.root);
    this.applyTheme(theme);
  }

  setTitle(title) {
    this.title = title ?? '';
    this.panel.setTitle(this.title);
    return this;
  }

  setBounds(x, y, width, height) {
    const safeWidth = Math.max(0, Number(width) || 0);
    const safeHeight = Math.max(0, Number(height) || 0);
    this.fixedBounds = {
      x: Number(x) || 0,
      y: Number(y) || 0,
      width: safeWidth,
      height: safeHeight,
    };
    this.panel.setCoreSize(safeWidth, safeHeight);
    this.applyFixedBounds();
    return this;
  }

  getContentTheme() {
    return this.panel.getContentTheme?.() ?? this.theme;
  }

  onLayout(viewportProjection) {
    super.onLayout(normalizeProjection(viewportProjection));
    this.applyFixedBounds();
  }

  onActivate() {
    this.shown = true;
    super.onActivate();
  }

  onDeactivate() {
    this.shown = false;
    super.onDeactivate();
  }

  requestClose(source, payload = null) {
    return this.onClose?.({
      source,
      dialogId: this.id,
      payload,
    }) ?? true;
  }

  applyFixedBounds() {
    if (!this.fixedBounds) {
      return;
    }
    const { x, y, width, height } = this.fixedBounds;
    this.panel.pivot.set(width / 2, height / 2);
    this.panel.position.set(x + width / 2, y + height / 2);
    this.captureOpenMotionBasePosition();
  }
}

function normalizeProjection(projection = {}) {
  const sourceWidth =
    finiteOr(projection.sourceWidth, PIXI_UI_GEOMETRY.sourceWidth);
  const sourceHeight =
    finiteOr(projection.sourceHeight, DEFAULT_SOURCE_HEIGHT);
  const sourceScale = Math.max(0.0001, finiteOr(projection.sourceScale, 1));
  return {
    ...projection,
    sourceWidth,
    sourceHeight,
    sourceScale,
    sourceOffsetX: finiteOr(projection.sourceOffsetX, 0),
    stageLogicalWidth: finiteOr(
      projection.stageLogicalWidth,
      sourceWidth * sourceScale,
    ),
    dialogShift: finiteOr(projection.dialogShift, 0),
  };
}

function finiteOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
