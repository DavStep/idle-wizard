import {
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';

const PIXI_AUTHORED_VIEWPORT = Object.freeze({
  width: PIXI_UI_GEOMETRY.authoredWidth,
  height: PIXI_UI_GEOMETRY.authoredHeight,
});

export class ViewportProjectionManager {
  static explain =
    'Keeps the 390-wide source UI fixed in portrait, fills the available height, and contain-fits wide desktop windows.';

  constructor({
    viewport = PIXI_AUTHORED_VIEWPORT,
    sourceUiScale = PIXI_UI_GEOMETRY.sourceScale,
  } = {}) {
    this.viewport = viewport;
    this.sourceUiScale = sourceUiScale;
    this.layoutViewport = null;
    this.textEntryActive = false;
    this.textEntryLocked = false;
    this.lastProjection = null;
  }

  project({
    width,
    height,
    visibleHeight = height,
    safeInsets = {},
    keyboardInset = 0,
    lockForTextEntry = this.textEntryLocked,
  }) {
    const measured = this.normalizeViewport({ width, height });
    const layout = this.resolveLayoutViewport(measured, lockForTextEntry);
    const normalizedVisibleHeight = Math.max(
      0,
      Math.min(layout.height, Number(visibleHeight) || 0),
    );
    const normalizedKeyboardInset = Math.max(0, Number(keyboardInset) || 0);
    const contentScreenHeight =
      lockForTextEntry || normalizedKeyboardInset > 0
        ? layout.height
        : normalizedVisibleHeight;
    const usesFluidPortraitHeight = layout.height >= layout.width;
    const fitScale = Math.min(
      1,
      layout.width / this.viewport.width,
      usesFluidPortraitHeight
        ? Number.POSITIVE_INFINITY
        : layout.height / this.viewport.height,
    );
    const authoredScreenWidth = this.viewport.width * fitScale;
    const authoredScreenHeight = this.viewport.height * fitScale;
    const stageScreenWidth = Math.max(authoredScreenWidth, layout.width);
    const stageLogicalWidth = stageScreenWidth / fitScale;
    const stageLogicalHeight = layout.height / fitScale;
    const contentLogicalHeight = contentScreenHeight / fitScale;
    const authoredOffsetX = (stageLogicalWidth - this.viewport.width) / 2;
    const uiScale = fitScale * this.sourceUiScale;
    // The keyboard overlays the unchanged stage. World Chat alone owns an
    // inset translation so unrelated dialogs and room chrome never move.
    const worldChatShift = uiScale > 0
      ? roundSource(-normalizedKeyboardInset / uiScale)
      : 0;
    const projection = Object.freeze({
      viewportPx: Object.freeze({ ...layout }),
      fitScale,
      uiScale,
      sourceScale: this.sourceUiScale,
      authoredWidth: this.viewport.width,
      authoredHeight: this.viewport.height,
      authoredScreenWidth,
      authoredScreenHeight,
      stageLogicalWidth,
      stageLogicalHeight,
      stageScreenWidth,
      stageScreenHeight: layout.height,
      authoredOffsetX,
      sourceOffsetX: authoredOffsetX / this.sourceUiScale,
      sourceWidth: this.viewport.width / this.sourceUiScale,
      sourceHeight: contentLogicalHeight / this.sourceUiScale,
      isWide: stageLogicalWidth > this.viewport.width + 1 / fitScale,
      visibleStageHeight: normalizedVisibleHeight,
      keyboardInset: normalizedKeyboardInset,
      dialogShift: 0,
      topDialogShift: 0,
      worldChatShift,
      safeInsets: Object.freeze({
        top: Math.max(0, Number(safeInsets.top) || 0),
        right: Math.max(0, Number(safeInsets.right) || 0),
        bottom: Math.max(0, Number(safeInsets.bottom) || 0),
        left: Math.max(0, Number(safeInsets.left) || 0),
      }),
    });

    this.lastProjection = projection;
    return projection;
  }

  lockTextEntry() {
    this.textEntryActive = true;
    this.textEntryLocked = true;
  }

  unlockTextEntry({ force = false } = {}) {
    this.textEntryActive = false;
    if (force) {
      this.textEntryLocked = false;
      this.layoutViewport = null;
    }
  }

  getProjection() {
    return this.lastProjection;
  }

  resolveLayoutViewport(measured, lockForTextEntry) {
    if (!this.layoutViewport) {
      this.layoutViewport = measured;
      return measured;
    }

    // Android can emit a one-frame width-and-height viewport candidate while
    // its IME surface is being removed. Freeze the complete canvas projection,
    // not only height shrinkage, until the runtime explicitly releases it.
    if (lockForTextEntry) {
      return this.layoutViewport;
    }

    this.layoutViewport = measured;
    return measured;
  }

  normalizeViewport({ width, height }) {
    const normalizedWidth = Math.max(1, Math.round(Number(width) || 0));
    const normalizedHeight = Math.max(1, Math.round(Number(height) || 0));
    return { width: normalizedWidth, height: normalizedHeight };
  }
}

function roundSource(value) {
  return Math.round(value * 100) / 100;
}
