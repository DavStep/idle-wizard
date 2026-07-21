const EDITABLE_NUMBER_FIELDS = ['offsetX', 'offsetY', 'width', 'height', 'opacity'];

export class UiEditorLayoutOverrideManager {
  constructor({ stage, savedLayout = { version: 1, elements: {} } } = {}) {
    this.stage = stage;
    this.elements = this.normalizeElements(savedLayout.elements);
    this.originalState = new WeakMap();
    this.dirty = false;
  }

  applyAll() {
    for (const selector of Object.keys(this.elements)) {
      const element = this.find(selector);

      if (element) {
        this.applyToElement(element, this.elements[selector]);
      }
    }
  }

  update(selector, patch) {
    if (!selector || selector === ':scope') {
      return null;
    }

    const previous = this.elements[selector] ?? {};
    const next = this.normalizeOverride({ ...previous, ...patch });

    if (Object.keys(next).length === 0) {
      delete this.elements[selector];
    } else {
      this.elements[selector] = next;
    }

    const element = this.find(selector);

    if (element) {
      this.restoreElement(element);
      this.applyToElement(element, next);
    }

    this.dirty = true;
    return next;
  }

  reset(selector) {
    const element = this.find(selector);

    if (element) {
      this.restoreElement(element);
    }

    delete this.elements[selector];
    this.dirty = true;
  }

  get(selector) {
    return { ...(this.elements[selector] ?? {}) };
  }

  serialize() {
    return {
      version: 1,
      elements: Object.fromEntries(
        Object.entries(this.elements).sort(([left], [right]) => left.localeCompare(right)),
      ),
    };
  }

  markSaved() {
    this.dirty = false;
  }

  applyToElement(element, override) {
    this.captureOriginalState(element);

    const offsetX = Number(override.offsetX) || 0;
    const offsetY = Number(override.offsetY) || 0;
    element.style.translate = offsetX || offsetY ? `${offsetX}px ${offsetY}px` : '';

    if (Number.isFinite(override.width)) {
      element.style.width = `${override.width}px`;
    }

    if (Number.isFinite(override.height)) {
      element.style.height = `${override.height}px`;
    }

    if (Number.isFinite(override.opacity)) {
      element.style.opacity = String(override.opacity);
    }

    if (typeof override.asset === 'string' && override.asset.trim()) {
      this.applyAsset(element, override.asset.trim());
    }
  }

  applyAsset(element, asset) {
    if (element instanceof globalThis.HTMLImageElement) {
      element.setAttribute('src', asset);
      return;
    }

    const escapedAsset = asset.replaceAll('"', '%22');
    element.style.backgroundImage = `url("${escapedAsset}")`;
  }

  captureOriginalState(element) {
    if (this.originalState.has(element)) {
      return;
    }

    this.originalState.set(element, {
      translate: element.style.translate,
      width: element.style.width,
      height: element.style.height,
      opacity: element.style.opacity,
      backgroundImage: element.style.backgroundImage,
      src: element instanceof globalThis.HTMLImageElement
        ? element.getAttribute('src')
        : null,
    });
  }

  restoreElement(element) {
    const original = this.originalState.get(element);

    if (!original) {
      return;
    }

    element.style.translate = original.translate;
    element.style.width = original.width;
    element.style.height = original.height;
    element.style.opacity = original.opacity;
    element.style.backgroundImage = original.backgroundImage;

    if (element instanceof globalThis.HTMLImageElement) {
      if (original.src === null) {
        element.removeAttribute('src');
      } else {
        element.setAttribute('src', original.src);
      }
    }
  }

  find(selector) {
    if (!this.stage || !selector || selector === ':scope') {
      return selector === ':scope' ? this.stage : null;
    }

    try {
      return this.stage.querySelector(selector);
    } catch {
      return null;
    }
  }

  normalizeElements(elements) {
    if (!elements || typeof elements !== 'object' || Array.isArray(elements)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(elements)
        .map(([selector, override]) => [selector, this.normalizeOverride(override)])
        .filter(([, override]) => Object.keys(override).length > 0),
    );
  }

  normalizeOverride(override) {
    if (!override || typeof override !== 'object' || Array.isArray(override)) {
      return {};
    }

    const normalized = {};

    for (const field of EDITABLE_NUMBER_FIELDS) {
      const value = Number(override[field]);

      if (Number.isFinite(value)) {
        normalized[field] = field === 'opacity'
          ? Math.max(0, Math.min(1, value))
          : Math.round(value * 100) / 100;
      }
    }

    if (typeof override.asset === 'string' && override.asset.trim()) {
      normalized.asset = override.asset.trim();
    }

    return normalized;
  }
}
