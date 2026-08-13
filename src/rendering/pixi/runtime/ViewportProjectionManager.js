import {
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';

const PIXI_AUTHORED_VIEWPORT = Object.freeze({
  width: PIXI_UI_GEOMETRY.authoredWidth,
  height: PIXI_UI_GEOMETRY.authoredHeight,
});

export class ViewportProjectionManager {
  static explain =
    'Maps the fixed 390x844 source UI and its 3x authored room into phones and wide desktop windows.';

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
    keyboardInset = Math.max(0, height - visibleHeight),
    lockForTextEntry = this.textEntryLocked,
  }) {
    const measured = this.normalizeViewport({ width, height });
    const layout = this.resolveLayoutViewport(measured, lockForTextEntry);
    const fitScale = Math.min(
      1,
      layout.width / this.viewport.width,
      layout.height / this.viewport.height,
    );
    const authoredScreenWidth = this.viewport.width * fitScale;
    const authoredScreenHeight = this.viewport.height * fitScale;
    const stageScreenWidth = Math.max(authoredScreenWidth, layout.width);
    const stageLogicalWidth = stageScreenWidth / fitScale;
    const authoredOffsetX = (stageLogicalWidth - this.viewport.width) / 2;
    const uiScale = fitScale * this.sourceUiScale;
    const normalizedKeyboardInset = Math.max(0, Number(keyboardInset) || 0);
    const dialogShift = uiScale > 0
      ? roundSource(-normalizedKeyboardInset / uiScale / 2)
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
      stageLogicalHeight: this.viewport.height,
      stageScreenWidth,
      stageScreenHeight: authoredScreenHeight,
      authoredOffsetX,
      sourceOffsetX: authoredOffsetX / this.sourceUiScale,
      sourceWidth: this.viewport.width / this.sourceUiScale,
      sourceHeight: this.viewport.height / this.sourceUiScale,
      isWide: stageLogicalWidth > this.viewport.width + 1 / fitScale,
      visibleStageHeight: Math.max(
        0,
        Math.min(authoredScreenHeight, Number(visibleHeight) || 0),
      ),
      keyboardInset: normalizedKeyboardInset,
      dialogShift,
      topDialogShift: Math.max(dialogShift, -56),
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

    const widthChanged = Math.abs(measured.width - this.layoutViewport.width) > 1;
    const heightShrank = measured.height < this.layoutViewport.height;
    if (widthChanged) {
      this.layoutViewport = measured;
      this.textEntryLocked = this.textEntryActive;
      return measured;
    }

    if (lockForTextEntry && heightShrank && !widthChanged) {
      return this.layoutViewport;
    }

    this.layoutViewport = measured;
    if (this.textEntryLocked && !this.textEntryActive) {
      this.textEntryLocked = false;
    }
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
