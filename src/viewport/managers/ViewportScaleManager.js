export class ViewportScaleManager {
  constructor({ viewport, sourceUiScale = 3 }) {
    this.viewport = viewport;
    this.sourceUiScale = sourceUiScale;
    this.stage = null;
    this.resizeObserver = null;
  }

  watch(stage) {
    this.stage = stage;
    this.updateScale();

    this.resizeObserver = new ResizeObserver(() => this.updateScale());
    this.resizeObserver.observe(document.documentElement);
  }

  unwatch() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.stage = null;
  }

  updateScale() {
    if (!this.stage) {
      return;
    }

    const scale = Math.min(
      1,
      window.innerWidth / this.viewport.width,
      window.innerHeight / this.viewport.height,
    );
    const uiScale = scale * this.sourceUiScale;

    this.stage.style.setProperty('--viewport-scale', String(scale));
    this.stage.style.setProperty('--style-ui-scale', String(uiScale));
  }
}
