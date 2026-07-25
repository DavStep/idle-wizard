import { RetainedViewLifecycle } from './RetainedView.js';
import {
  assertRetainedUiCounters,
  incrementRetainedUiCounter,
  RETAINED_UI_COUNTERS,
} from './RetainedUiCounters.js';

/**
 * Owns eager retained page instances and switches visibility through lifecycle
 * hooks without rebuilding or destroying pages.
 */
export class PageRegistry {
  /**
   * @param {{
   *   pages?: Iterable<[string, import('./RetainedView.js').RetainedView]>,
   *   counters?: import('./RetainedUiCounters.js').RetainedUiCounters | null,
   * }} [options]
   */
  constructor({ pages = [], counters = null } = {}) {
    this.counters = assertRetainedUiCounters(counters);
    this.pages = new Map();
    this.activePageId = null;
    this.destroyed = false;

    for (const [pageId, page] of pages) {
      this.register(pageId, page);
    }
  }

  register(pageId, page) {
    this.assertUsable('register pages');
    const safePageId = validateId(pageId, 'Page');

    if (this.pages.has(safePageId)) {
      throw new Error(`Page "${safePageId}" is already registered.`);
    }

    const lifecycle = new RetainedViewLifecycle(page, {
      label: `page "${safePageId}"`,
      counters: this.counters,
    });
    this.pages.set(safePageId, lifecycle);
    incrementRetainedUiCounter(
      this.counters,
      RETAINED_UI_COUNTERS.PAGE_REGISTERED,
    );

    return page;
  }

  get(pageId) {
    return this.getLifecycle(pageId).getView();
  }

  has(pageId) {
    return this.pages.has(pageId);
  }

  getPageIds() {
    return Object.freeze([...this.pages.keys()]);
  }

  getActivePageId() {
    return this.activePageId;
  }

  getActivePage() {
    return this.activePageId === null ? null : this.get(this.activePageId);
  }

  bind(pageId, viewModel) {
    return this.getLifecycle(pageId).bind(viewModel);
  }

  applyTheme(themeSnapshot) {
    this.assertUsable('apply page themes');

    for (const lifecycle of this.pages.values()) {
      lifecycle.applyTheme(themeSnapshot);
    }
  }

  layout(viewportProjection) {
    this.assertUsable('lay out pages');

    for (const lifecycle of this.pages.values()) {
      lifecycle.layout(viewportProjection);
    }
  }

  activate(pageId) {
    this.assertUsable('activate pages');
    const safePageId = validateId(pageId, 'Page');
    const nextLifecycle = this.getLifecycle(safePageId);

    if (this.activePageId === safePageId) {
      return nextLifecycle.getView();
    }

    this.deactivate();
    nextLifecycle.activate();
    this.activePageId = safePageId;
    incrementRetainedUiCounter(
      this.counters,
      RETAINED_UI_COUNTERS.PAGE_ACTIVATED,
    );

    return nextLifecycle.getView();
  }

  deactivate() {
    this.assertUsable('deactivate pages');

    if (this.activePageId === null) {
      return false;
    }

    const activeLifecycle = this.pages.get(this.activePageId);
    activeLifecycle.deactivate();
    this.activePageId = null;
    incrementRetainedUiCounter(
      this.counters,
      RETAINED_UI_COUNTERS.PAGE_DEACTIVATED,
    );
    return true;
  }

  destroy() {
    if (this.destroyed) {
      return false;
    }

    const errors = [];

    try {
      this.deactivate();
    } catch (error) {
      errors.push(error);
    }

    for (const lifecycle of this.pages.values()) {
      try {
        lifecycle.destroy();
      } catch (error) {
        errors.push(error);
      }
    }

    this.pages.clear();
    this.activePageId = null;
    this.destroyed = true;
    throwRegistryErrors(errors, 'Failed to destroy one or more retained pages.');
    return true;
  }

  getStats() {
    return Object.freeze({
      registered: this.pages.size,
      active: this.activePageId === null ? 0 : 1,
      destroyed: this.destroyed,
    });
  }

  getLifecycle(pageId) {
    this.assertUsable('access pages');
    const safePageId = validateId(pageId, 'Page');
    const lifecycle = this.pages.get(safePageId);

    if (!lifecycle) {
      throw new Error(`Unknown page: ${safePageId}`);
    }

    return lifecycle;
  }

  assertUsable(action) {
    if (this.destroyed) {
      throw new Error(`Cannot ${action} after the page registry is destroyed.`);
    }
  }
}

function validateId(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${label} ids must be non-empty strings.`);
  }

  return value;
}

function throwRegistryErrors(errors, message) {
  if (errors.length === 1) {
    throw errors[0];
  }

  if (errors.length > 1) {
    throw new AggregateError(errors, message);
  }
}
