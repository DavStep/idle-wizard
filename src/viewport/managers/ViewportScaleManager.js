export class ViewportScaleManager {
  constructor({ viewport, sourceUiScale = 3 }) {
    this.viewport = viewport;
    this.sourceUiScale = sourceUiScale;
    this.stage = null;
    this.resizeObserver = null;
    this.layoutViewport = null;
    this.textEntryViewportLocked = false;
    this.handleViewportChange = () => this.updateScale();
    this.handleTextEntryFocusIn = (event) => {
      if (this.isTextEntryElement(event.target)) {
        this.textEntryViewportLocked = true;
        this.updateScale();
      }
    };
    this.handleTextEntryFocusOut = (event) => {
      if (this.isTextEntryElement(event.target)) {
        this.textEntryViewportLocked = true;
      }
    };
  }

  watch(stage) {
    this.stage = stage;
    this.updateScale();

    this.resizeObserver = new ResizeObserver(() => this.updateScale());
    this.resizeObserver.observe(document.documentElement);
    window.addEventListener('resize', this.handleViewportChange);
    window.visualViewport?.addEventListener('resize', this.handleViewportChange);
    document.addEventListener('focusin', this.handleTextEntryFocusIn);
    document.addEventListener('focusout', this.handleTextEntryFocusOut);
  }

  unwatch() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener('resize', this.handleViewportChange);
    window.visualViewport?.removeEventListener('resize', this.handleViewportChange);
    document.removeEventListener('focusin', this.handleTextEntryFocusIn);
    document.removeEventListener('focusout', this.handleTextEntryFocusOut);
    document.documentElement.style.removeProperty('--app-viewport-width');
    document.documentElement.style.removeProperty('--app-viewport-height');
    this.layoutViewport = null;
    this.textEntryViewportLocked = false;
    this.stage = null;
  }

  updateScale() {
    if (!this.stage) {
      return;
    }

    const viewportSize = this.getLayoutViewportSize();
    const scale = Math.min(
      1,
      viewportSize.width / this.viewport.width,
      viewportSize.height / this.viewport.height,
    );
    const uiScale = scale * this.sourceUiScale;

    document.documentElement.style.setProperty(
      '--app-viewport-width',
      `${viewportSize.width}px`,
    );
    document.documentElement.style.setProperty(
      '--app-viewport-height',
      `${viewportSize.height}px`,
    );
    this.stage.style.setProperty('--viewport-scale', String(scale));
    this.stage.style.setProperty('--style-ui-scale', String(uiScale));
  }

  getLayoutViewportSize() {
    const measuredViewport = {
      width: Math.round(window.innerWidth),
      height: Math.round(window.innerHeight),
    };

    if (!this.layoutViewport) {
      this.layoutViewport = measuredViewport;
      return measuredViewport;
    }

    const widthChanged =
      Math.abs(measuredViewport.width - this.layoutViewport.width) > 1;
    const heightShrank = measuredViewport.height < this.layoutViewport.height;
    const heightRecovered = measuredViewport.height >= this.layoutViewport.height;

    if (widthChanged) {
      this.textEntryViewportLocked = this.isTextEntryActive();
    }

    if (
      (this.textEntryViewportLocked || this.isTextEntryActive()) &&
      heightShrank &&
      !widthChanged
    ) {
      this.textEntryViewportLocked = true;
      return this.layoutViewport;
    }

    if (this.textEntryViewportLocked && heightRecovered && !widthChanged) {
      this.textEntryViewportLocked = this.isTextEntryActive();
    }

    this.layoutViewport = measuredViewport;
    return measuredViewport;
  }

  isTextEntryActive() {
    const activeElement = document.activeElement;
    return this.isTextEntryElement(activeElement);
  }

  isTextEntryElement(element) {
    if (!element) {
      return false;
    }

    if (element.isContentEditable) {
      return true;
    }

    const tagName = element.tagName?.toLowerCase();

    if (tagName === 'textarea' || tagName === 'select') {
      return true;
    }

    if (tagName !== 'input') {
      return false;
    }

    const type = element.getAttribute('type')?.toLowerCase() ?? 'text';
    return ![
      'button',
      'checkbox',
      'color',
      'file',
      'hidden',
      'image',
      'radio',
      'range',
      'reset',
      'submit',
    ].includes(type);
  }
}
