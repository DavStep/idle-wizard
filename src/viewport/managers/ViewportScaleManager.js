export class ViewportScaleManager {
  constructor({ viewport, sourceUiScale = 3 }) {
    this.viewport = viewport;
    this.sourceUiScale = sourceUiScale;
    this.stage = null;
    this.resizeObserver = null;
    this.layoutViewport = null;
    this.textEntryViewportLocked = false;
    this.focusedTextEntryElement = null;
    this.scrollResetFrame = null;
    this.handleViewportChange = () => {
      this.keepDocumentAnchoredDuringTextEntry();
      this.updateScale();
    };
    this.handleViewportScroll = () => {
      if (!this.textEntryViewportLocked && !this.isTextEntryActive()) {
        return;
      }

      this.keepDocumentAnchoredDuringTextEntry();
      this.updateScale();
    };
    this.handleTextEntryPressStart = (event) => {
      if (this.getTextEntryElementFromEvent(event)) {
        this.lockTextEntryViewport();
      }
    };
    this.handleTextEntryFocusIn = (event) => {
      if (this.isTextEntryElement(event.target)) {
        this.focusedTextEntryElement = event.target;
        this.lockTextEntryViewport();
        this.updateScale();
      }
    };
    this.handleTextEntryFocusOut = (event) => {
      if (this.isTextEntryElement(event.target)) {
        if (this.focusedTextEntryElement === event.target) {
          this.focusedTextEntryElement = null;
        }
        this.lockTextEntryViewport();
      }
    };
  }

  watch(stage) {
    this.stage = stage;
    this.updateScale();

    this.resizeObserver = new ResizeObserver(this.handleViewportChange);
    this.resizeObserver.observe(document.documentElement);
    window.addEventListener('resize', this.handleViewportChange);
    window.visualViewport?.addEventListener('resize', this.handleViewportChange);
    window.addEventListener('scroll', this.handleViewportScroll);
    window.visualViewport?.addEventListener('scroll', this.handleViewportScroll);
    document.addEventListener('pointerdown', this.handleTextEntryPressStart, true);
    document.addEventListener('touchstart', this.handleTextEntryPressStart, true);
    document.addEventListener('focusin', this.handleTextEntryFocusIn);
    document.addEventListener('focusout', this.handleTextEntryFocusOut);
  }

  unwatch() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener('resize', this.handleViewportChange);
    window.visualViewport?.removeEventListener('resize', this.handleViewportChange);
    window.removeEventListener('scroll', this.handleViewportScroll);
    window.visualViewport?.removeEventListener('scroll', this.handleViewportScroll);
    document.removeEventListener('pointerdown', this.handleTextEntryPressStart, true);
    document.removeEventListener('touchstart', this.handleTextEntryPressStart, true);
    document.removeEventListener('focusin', this.handleTextEntryFocusIn);
    document.removeEventListener('focusout', this.handleTextEntryFocusOut);
    this.cancelScrollResetFrame();
    document.documentElement.style.removeProperty('--app-viewport-width');
    document.documentElement.style.removeProperty('--app-viewport-height');
    document.documentElement.style.removeProperty('--app-stage-width');
    document.documentElement.style.removeProperty('--app-stage-height');
    document.documentElement.style.removeProperty('--app-source-ui-screen-width');
    document.documentElement.style.removeProperty('--app-visible-stage-height');
    document.documentElement.style.removeProperty('--app-keyboard-inset');
    document.documentElement.style.removeProperty('--app-keyboard-dialog-shift');
    document.documentElement.style.removeProperty('--app-keyboard-top-dialog-shift');
    this.stage?.style.removeProperty('--source-ui-scale');
    delete this.stage?.dataset.viewportMode;
    this.layoutViewport = null;
    this.textEntryViewportLocked = false;
    this.focusedTextEntryElement = null;
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
    const stageSize = this.getStageSize({ viewportSize, scale });

    document.documentElement.style.setProperty(
      '--app-viewport-width',
      `${viewportSize.width}px`,
    );
    document.documentElement.style.setProperty(
      '--app-viewport-height',
      `${viewportSize.height}px`,
    );
    document.documentElement.style.setProperty(
      '--app-stage-width',
      `${stageSize.width}px`,
    );
    document.documentElement.style.setProperty(
      '--app-stage-height',
      `${stageSize.height}px`,
    );
    document.documentElement.style.setProperty(
      '--app-source-ui-screen-width',
      `${this.viewport.width * scale}px`,
    );
    this.stage.style.setProperty('--viewport-scale', String(scale));
    this.stage.style.setProperty('--style-ui-scale', String(uiScale));
    this.stage.style.setProperty('--source-ui-scale', String(this.sourceUiScale));

    if (stageSize.isWide) {
      this.stage.dataset.viewportMode = 'web-wide';
    } else {
      delete this.stage.dataset.viewportMode;
    }

    this.updateVisibleStageMetrics({ viewportSize, stageSize, uiScale });
  }

  getStageSize({ viewportSize, scale }) {
    const baseWidth = this.viewport.width * scale;
    const height = this.viewport.height * scale;
    const isWide = viewportSize.width > baseWidth + 1;

    return {
      width: isWide ? viewportSize.width : baseWidth,
      height,
      isWide,
    };
  }

  updateVisibleStageMetrics({ viewportSize, stageSize, uiScale }) {
    const stageHeight = stageSize.height;
    const stageRect = this.stage.getBoundingClientRect();
    const fallbackStageTop = Math.max(0, (viewportSize.height - stageHeight) / 2);
    const stageTop =
      Number.isFinite(stageRect.top) && stageRect.height > 0
        ? stageRect.top
        : fallbackStageTop;
    const visibleViewportBottom = this.getVisibleViewportBottom();
    const visibleStageHeight = Math.max(
      0,
      Math.min(stageHeight, visibleViewportBottom - stageTop),
    );
    const keyboardInset = Math.max(0, stageHeight - visibleStageHeight);
    const dialogShift = this.getKeyboardDialogShift({ keyboardInset, uiScale });
    const topDialogShift = Math.max(dialogShift, -56);

    document.documentElement.style.setProperty(
      '--app-visible-stage-height',
      `${visibleStageHeight}px`,
    );
    document.documentElement.style.setProperty(
      '--app-keyboard-inset',
      `${keyboardInset}px`,
    );
    document.documentElement.style.setProperty(
      '--app-keyboard-dialog-shift',
      `${dialogShift}px`,
    );
    document.documentElement.style.setProperty(
      '--app-keyboard-top-dialog-shift',
      `${topDialogShift}px`,
    );
  }

  getKeyboardDialogShift({ keyboardInset, uiScale }) {
    if (!(keyboardInset > 0) || !(uiScale > 0)) {
      return 0;
    }

    return Math.round((-keyboardInset / uiScale / 2) * 100) / 100;
  }

  getVisibleViewportBottom() {
    const visualViewport = window.visualViewport;

    if (visualViewport) {
      return Math.round((visualViewport.offsetTop ?? 0) + visualViewport.height);
    }

    return Math.round(window.innerHeight);
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

  lockTextEntryViewport() {
    this.textEntryViewportLocked = true;
    this.keepDocumentAnchoredDuringTextEntry();
  }

  keepDocumentAnchoredDuringTextEntry() {
    if (!this.textEntryViewportLocked && !this.isTextEntryActive()) {
      return;
    }

    this.resetDocumentScroll();
    this.scheduleScrollResetFrame();
  }

  scheduleScrollResetFrame() {
    if (this.scrollResetFrame) {
      return;
    }

    const requestFrame = window.requestAnimationFrame;

    if (typeof requestFrame !== 'function') {
      return;
    }

    this.scrollResetFrame = requestFrame.call(window, () => {
      this.scrollResetFrame = null;

      if (this.textEntryViewportLocked || this.isTextEntryActive()) {
        this.resetDocumentScroll();
      }
    });
  }

  cancelScrollResetFrame() {
    if (!this.scrollResetFrame) {
      return;
    }

    const cancelFrame = window.cancelAnimationFrame;

    if (typeof cancelFrame === 'function') {
      cancelFrame.call(window, this.scrollResetFrame);
    }

    this.scrollResetFrame = null;
  }

  resetDocumentScroll() {
    const scrollingElement = document.scrollingElement ?? document.documentElement;
    const resetElement = (element) => {
      if (!element) {
        return;
      }

      element.scrollLeft = 0;
      element.scrollTop = 0;
    };

    resetElement(scrollingElement);
    resetElement(document.documentElement);
    resetElement(document.body);

    if (
      typeof window.scrollTo === 'function' &&
      ((window.scrollX ?? 0) !== 0 || (window.scrollY ?? 0) !== 0)
    ) {
      window.scrollTo(0, 0);
    }
  }

  isTextEntryActive() {
    const activeElement = document.activeElement;
    if (this.isTextEntryElement(activeElement)) {
      return true;
    }

    return (
      this.isTextEntryElement(this.focusedTextEntryElement) &&
      document.contains(this.focusedTextEntryElement)
    );
  }

  getTextEntryElementFromEvent(event) {
    const target = event?.target;

    if (!target) {
      return null;
    }

    if (this.isTextEntryElement(target)) {
      return target;
    }

    const closestTextEntry = target.closest?.(
      'input, textarea, select, [contenteditable="true"]',
    );

    if (this.isTextEntryElement(closestTextEntry)) {
      return closestTextEntry;
    }

    const label = target.closest?.('label');
    const control = label?.control ?? null;

    return this.isTextEntryElement(control) ? control : null;
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
