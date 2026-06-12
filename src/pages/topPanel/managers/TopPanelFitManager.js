const RESOURCE_FONT_SIZE_PROPERTY = '--room-top-panel-resource-font-size';
const RESOURCE_FONT_MAX = 15;
const RESOURCE_FONT_MIN = 11;
const FIT_TOLERANCE = 1;

export function fitTopPanelResourceFont(
  resources,
  { minFontSize = RESOURCE_FONT_MIN, maxFontSize = RESOURCE_FONT_MAX } = {},
) {
  if (!resources) {
    return maxFontSize;
  }

  const currentFontSize = readCurrentFontSize(resources, maxFontSize);
  let fittedFontSize = maxFontSize;

  if (doesElementOverflow(resources)) {
    fittedFontSize = Math.min(
      fittedFontSize,
      getMaxFittingFontSize(resources, currentFontSize),
    );
  }

  for (const value of resources.querySelectorAll('.room-top-panel__resource-val')) {
    fittedFontSize = Math.min(
      fittedFontSize,
      getMaxFittingFontSize(value, currentFontSize),
    );
  }

  fittedFontSize = Math.min(Math.max(fittedFontSize, minFontSize), maxFontSize);
  setResourceFontSize(resources, fittedFontSize);
  resources.classList.toggle('is-resource-font-shrunk', fittedFontSize < maxFontSize);
  return fittedFontSize;
}

function readCurrentFontSize(resources, fallback) {
  const inlineValue = Number.parseFloat(
    resources.style.getPropertyValue(RESOURCE_FONT_SIZE_PROPERTY),
  );

  if (Number.isFinite(inlineValue) && inlineValue > 0) {
    return inlineValue;
  }

  const readComputedStyle =
    resources.ownerDocument?.defaultView?.getComputedStyle ?? globalThis.getComputedStyle;
  const computedValue =
    typeof readComputedStyle === 'function'
      ? Number.parseFloat(readComputedStyle(resources).fontSize)
      : Number.NaN;
  return Number.isFinite(computedValue) && computedValue > 0 ? computedValue : fallback;
}

function setResourceFontSize(resources, fontSize) {
  const value = `${fontSize}px`;

  if (resources.style.getPropertyValue(RESOURCE_FONT_SIZE_PROPERTY) !== value) {
    resources.style.setProperty(RESOURCE_FONT_SIZE_PROPERTY, value);
  }
}

function doesElementOverflow(element) {
  if (!element.clientWidth) {
    return false;
  }

  return element.scrollWidth > element.clientWidth + FIT_TOLERANCE;
}

function getMaxFittingFontSize(element, currentFontSize) {
  if (!element.clientWidth || !element.scrollWidth) {
    return currentFontSize;
  }

  return Math.floor(
    (currentFontSize * (element.clientWidth + FIT_TOLERANCE)) / element.scrollWidth,
  );
}

export class TopPanelFitManager {
  constructor() {
    this.resources = null;
    this.window = null;
    this.resizeObserver = null;
    this.mutationObserver = null;
    this.frame = 0;
    this.handleChange = () => this.scheduleFit();
  }

  mount(refs) {
    if (this.resources || !refs?.resources) {
      return;
    }

    this.resources = refs.resources;
    this.window = this.resources.ownerDocument?.defaultView ?? globalThis;

    const ResizeObserverCtor = this.window?.ResizeObserver ?? globalThis.ResizeObserver;

    if (typeof ResizeObserverCtor === 'function') {
      this.resizeObserver = new ResizeObserverCtor(this.handleChange);
      this.resizeObserver.observe(this.resources);
    }

    const MutationObserverCtor = this.window?.MutationObserver ?? globalThis.MutationObserver;

    if (typeof MutationObserverCtor === 'function') {
      this.mutationObserver = new MutationObserverCtor(this.handleChange);
      this.mutationObserver.observe(this.resources, {
        characterData: true,
        childList: true,
        subtree: true,
      });
    }

    this.window?.addEventListener?.('resize', this.handleChange);
    this.scheduleFit();
  }

  unmount() {
    this.cancelScheduledFit();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    this.window?.removeEventListener?.('resize', this.handleChange);
    this.window = null;

    if (this.resources) {
      this.resources.classList.remove('is-resource-font-shrunk');
      this.resources.style.removeProperty(RESOURCE_FONT_SIZE_PROPERTY);
    }

    this.resources = null;
  }

  scheduleFit() {
    if (this.frame || !this.resources) {
      return;
    }

    const requestFrame =
      this.window?.requestAnimationFrame?.bind(this.window) ?? globalThis.requestAnimationFrame;

    if (typeof requestFrame === 'function') {
      this.frame = requestFrame(() => {
        this.frame = 0;
        this.fit();
      });
      return;
    }

    this.fit();
  }

  cancelScheduledFit() {
    if (!this.frame) {
      return;
    }

    const cancelFrame =
      this.window?.cancelAnimationFrame?.bind(this.window) ?? globalThis.cancelAnimationFrame;

    if (typeof cancelFrame === 'function') {
      cancelFrame(this.frame);
    }

    this.frame = 0;
  }

  fit() {
    fitTopPanelResourceFont(this.resources);
  }
}
