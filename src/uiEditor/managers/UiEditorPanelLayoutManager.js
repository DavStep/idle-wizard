const SPLITTER_SIZE = 5;
const MIN_PANEL_SIZE = 72;
const MIN_PREVIEW_WIDTH = 120;
const MIN_PREVIEW_HEIGHT = 120;
const MAX_SIDE_PANEL_SIZE = 480;
const MAX_BOTTOM_PANEL_SIZE = 480;
const MAX_SIDE_VIEWPORT_RATIO = 0.32;
const MAX_BOTTOM_VIEWPORT_RATIO = 0.45;
const KEYBOARD_STEP = 8;
const KEYBOARD_LARGE_STEP = 32;

const PANEL_CONFIG = {
  left: {
    axis: 'x',
    direction: 1,
    cssProperty: '--editor-left-panel-width',
    dimension: 'width',
  },
  right: {
    axis: 'x',
    direction: -1,
    cssProperty: '--editor-right-panel-width',
    dimension: 'width',
  },
  bottom: {
    axis: 'y',
    direction: -1,
    cssProperty: '--editor-bottom-panel-height',
    dimension: 'height',
  },
};

export class UiEditorPanelLayoutManager {
  constructor({ shell, panels, splitters }) {
    this.shell = shell;
    this.panels = panels;
    this.splitters = splitters;
    this.drag = null;
    this.panelSizes = {};

    this.handleWindowResize = () => this.updateAriaValues();
    this.handleWindowPointerMove = (event) => this.onPointerMove(event);
    this.handleWindowPointerEnd = (event) => this.onPointerEnd(event);
  }

  mount() {
    for (const dock of Object.keys(PANEL_CONFIG)) {
      const splitter = this.splitters[dock];
      this.panelSizes[dock] = this.measureRenderedPanel(dock);
      splitter.addEventListener('pointerdown', (event) =>
        this.onPointerDown(dock, event),
      );
      splitter.addEventListener('keydown', (event) =>
        this.onKeyDown(dock, event),
      );
    }

    window.addEventListener('resize', this.handleWindowResize);
    window.addEventListener('pointermove', this.handleWindowPointerMove);
    window.addEventListener('pointerup', this.handleWindowPointerEnd);
    window.addEventListener('pointercancel', this.handleWindowPointerEnd);
    this.updateAriaValues();
  }

  unmount() {
    window.removeEventListener('resize', this.handleWindowResize);
    window.removeEventListener('pointermove', this.handleWindowPointerMove);
    window.removeEventListener('pointerup', this.handleWindowPointerEnd);
    window.removeEventListener('pointercancel', this.handleWindowPointerEnd);

    this.finishDrag();
  }

  onPointerDown(dock, event) {
    if (event.button !== 0) {
      return;
    }

    const config = PANEL_CONFIG[dock];
    this.drag = {
      dock,
      pointerId: event.pointerId,
      startCoordinate: config.axis === 'x' ? event.clientX : event.clientY,
      startSize: this.measurePanel(dock),
      splitter: event.currentTarget,
    };

    this.shell.dataset.resizing = dock;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  onPointerMove(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) {
      return;
    }

    const config = PANEL_CONFIG[this.drag.dock];
    const coordinate = config.axis === 'x' ? event.clientX : event.clientY;
    const delta =
      (coordinate - this.drag.startCoordinate) * config.direction;

    this.setPanelSize(this.drag.dock, this.drag.startSize + delta);
  }

  onPointerEnd(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) {
      return;
    }

    this.drag.splitter.releasePointerCapture?.(event.pointerId);
    this.finishDrag();
  }

  onKeyDown(dock, event) {
    const direction = resolveKeyboardDirection(dock, event.key);
    if (direction === 0) {
      return;
    }

    const step = event.shiftKey ? KEYBOARD_LARGE_STEP : KEYBOARD_STEP;
    this.setPanelSize(dock, this.measurePanel(dock) + direction * step);
    event.preventDefault();
  }

  setPanelSize(dock, requestedSize) {
    const config = PANEL_CONFIG[dock];
    const size = clamp(
      Math.round(requestedSize),
      MIN_PANEL_SIZE,
      this.resolveMaximumSize(dock),
    );

    this.shell.style.setProperty(config.cssProperty, `${size}px`);
    this.panelSizes[dock] = size;
    this.updateAriaValue(dock);
    return size;
  }

  setPanelVisible(dock, visible) {
    if (!PANEL_CONFIG[dock]) {
      return false;
    }

    const panel = this.panels[dock];
    const splitter = this.splitters[dock];
    const nextVisible = Boolean(visible);

    if (!nextVisible && !panel.hidden) {
      this.panelSizes[dock] = this.measureRenderedPanel(dock);
    }

    panel.hidden = !nextVisible;
    splitter.hidden = !nextVisible;

    const hiddenDatasetKey = `${dock}PanelHidden`;
    if (nextVisible) {
      delete this.shell.dataset[hiddenDatasetKey];
    } else {
      this.shell.dataset[hiddenDatasetKey] = 'true';
    }

    this.updateAriaValues();
    return true;
  }

  getWorkspaceState() {
    return Object.fromEntries(
      Object.keys(PANEL_CONFIG).map((dock) => [
        dock,
        Math.round(this.measurePanel(dock)),
      ]),
    );
  }

  restoreWorkspaceState(state) {
    if (!state || typeof state !== 'object') {
      return false;
    }

    let restored = false;

    for (const dock of Object.keys(PANEL_CONFIG)) {
      const size = Number(state[dock]);

      if (!Number.isFinite(size)) {
        continue;
      }

      this.setPanelSize(dock, size);
      restored = true;
    }

    return restored;
  }

  resolveMaximumSize(dock) {
    if (dock === 'bottom') {
      return Math.floor(
        Math.max(
          MIN_PANEL_SIZE,
          Math.min(
            MAX_BOTTOM_PANEL_SIZE,
            window.innerHeight * MAX_BOTTOM_VIEWPORT_RATIO,
            window.innerHeight - SPLITTER_SIZE - MIN_PREVIEW_HEIGHT,
          ),
        ),
      );
    }

    const oppositeDock = dock === 'left' ? 'right' : 'left';
    const oppositeSize = this.panels[oppositeDock].hidden
      ? 0
      : this.measurePanel(oppositeDock);
    return Math.floor(
      Math.max(
        MIN_PANEL_SIZE,
          Math.min(
            MAX_SIDE_PANEL_SIZE,
            window.innerWidth * MAX_SIDE_VIEWPORT_RATIO,
            window.innerWidth -
            oppositeSize -
            SPLITTER_SIZE * 2 -
            MIN_PREVIEW_WIDTH,
        ),
      ),
    );
  }

  measurePanel(dock) {
    if (this.panels[dock].hidden) {
      return this.panelSizes[dock] ?? MIN_PANEL_SIZE;
    }

    const size = this.measureRenderedPanel(dock);
    if (size > 0) {
      this.panelSizes[dock] = size;
    }
    return size || this.panelSizes[dock] || MIN_PANEL_SIZE;
  }

  measureRenderedPanel(dock) {
    const config = PANEL_CONFIG[dock];
    return this.panels[dock].getBoundingClientRect()[config.dimension];
  }

  updateAriaValues() {
    for (const dock of Object.keys(PANEL_CONFIG)) {
      this.updateAriaValue(dock);
    }
  }

  updateAriaValue(dock) {
    const value = Math.round(this.measurePanel(dock));
    const splitter = this.splitters[dock];
    splitter.setAttribute('aria-valuenow', String(value));
    splitter.setAttribute(
      'aria-valuemax',
      String(Math.round(this.resolveMaximumSize(dock))),
    );
  }

  finishDrag() {
    this.drag = null;
    delete this.shell.dataset.resizing;
  }
}

function resolveKeyboardDirection(dock, key) {
  if (dock === 'left') {
    return key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;
  }

  if (dock === 'right') {
    return key === 'ArrowLeft' ? 1 : key === 'ArrowRight' ? -1 : 0;
  }

  return key === 'ArrowUp' ? 1 : key === 'ArrowDown' ? -1 : 0;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}
