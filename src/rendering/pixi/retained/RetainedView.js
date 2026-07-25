import {
  assertRetainedUiCounters,
  incrementRetainedUiCounter,
  RETAINED_UI_COUNTERS,
} from './RetainedUiCounters.js';

export const RETAINED_VIEW_METHODS = Object.freeze([
  'bind',
  'applyTheme',
  'layout',
  'activate',
  'deactivate',
  'destroy',
]);

export const RETAINED_VIEW_STATES = Object.freeze({
  INACTIVE: 'inactive',
  ACTIVE: 'active',
  DESTROYED: 'destroyed',
});

/**
 * @typedef {object} RetainedView
 * @property {(viewModel: unknown) => void} bind
 * @property {(themeSnapshot: unknown) => void} applyTheme
 * @property {(viewportProjection: unknown) => void} layout
 * @property {() => void} activate
 * @property {() => void} deactivate
 * @property {() => void} destroy
 */

/**
 * Verifies the renderer-neutral contract shared by retained pages and dialogs.
 *
 * @template {RetainedView} T
 * @param {T} view
 * @param {{ label?: string }} [options]
 * @returns {T}
 */
export function assertRetainedView(view, { label = 'Retained view' } = {}) {
  if ((typeof view !== 'object' && typeof view !== 'function') || view === null) {
    throw new TypeError(`${label} must be an object.`);
  }

  for (const methodName of RETAINED_VIEW_METHODS) {
    if (typeof view[methodName] !== 'function') {
      throw new TypeError(`${label} must expose ${methodName}().`);
    }
  }

  return view;
}

/**
 * Idempotent lifecycle wrapper used by registries.
 *
 * The wrapper owns lifecycle state, but never owns gameplay state. It ensures
 * deactivate runs before destroy and prevents use-after-destroy.
 */
export class RetainedViewLifecycle {
  /**
   * @param {RetainedView} view
   * @param {{
   *   label?: string,
   *   counters?: import('./RetainedUiCounters.js').RetainedUiCounters | null,
   * }} [options]
   */
  constructor(view, { label = 'Retained view', counters = null } = {}) {
    this.label = label;
    this.view = assertRetainedView(view, { label });
    this.counters = assertRetainedUiCounters(counters);
    /** @type {'inactive' | 'active' | 'destroyed'} */
    this.state = RETAINED_VIEW_STATES.INACTIVE;

    incrementRetainedUiCounter(
      this.counters,
      RETAINED_UI_COUNTERS.VIEW_WRAPPED,
    );
  }

  bind(viewModel) {
    this.assertUsable('bind');
    this.view.bind(viewModel);
    incrementRetainedUiCounter(this.counters, RETAINED_UI_COUNTERS.VIEW_BOUND);
    return this.view;
  }

  applyTheme(themeSnapshot) {
    this.assertUsable('apply a theme to');
    this.view.applyTheme(themeSnapshot);
    incrementRetainedUiCounter(
      this.counters,
      RETAINED_UI_COUNTERS.VIEW_THEME_APPLIED,
    );
    return this.view;
  }

  layout(viewportProjection) {
    this.assertUsable('lay out');
    this.view.layout(viewportProjection);
    incrementRetainedUiCounter(
      this.counters,
      RETAINED_UI_COUNTERS.VIEW_LAID_OUT,
    );
    return this.view;
  }

  activate() {
    this.assertUsable('activate');

    if (this.isActive()) {
      return false;
    }

    this.view.activate();
    this.state = RETAINED_VIEW_STATES.ACTIVE;
    incrementRetainedUiCounter(
      this.counters,
      RETAINED_UI_COUNTERS.VIEW_ACTIVATED,
    );
    return true;
  }

  deactivate() {
    this.assertUsable('deactivate');

    if (!this.isActive()) {
      return false;
    }

    this.view.deactivate();
    this.state = RETAINED_VIEW_STATES.INACTIVE;
    incrementRetainedUiCounter(
      this.counters,
      RETAINED_UI_COUNTERS.VIEW_DEACTIVATED,
    );
    return true;
  }

  destroy() {
    if (this.isDestroyed()) {
      return false;
    }

    const errors = [];

    if (this.isActive()) {
      try {
        this.deactivate();
      } catch (error) {
        errors.push(error);
        this.state = RETAINED_VIEW_STATES.INACTIVE;
      }
    }

    try {
      this.view.destroy();
    } catch (error) {
      errors.push(error);
    } finally {
      this.state = RETAINED_VIEW_STATES.DESTROYED;
      incrementRetainedUiCounter(
        this.counters,
        RETAINED_UI_COUNTERS.VIEW_DESTROYED,
      );
    }

    throwLifecycleErrors(errors, `Failed to destroy ${this.label}.`);
    return true;
  }

  isActive() {
    return this.state === RETAINED_VIEW_STATES.ACTIVE;
  }

  isDestroyed() {
    return this.state === RETAINED_VIEW_STATES.DESTROYED;
  }

  getState() {
    return this.state;
  }

  getView() {
    return this.view;
  }

  assertUsable(action) {
    if (this.isDestroyed()) {
      throw new Error(`Cannot ${action} destroyed ${this.label}.`);
    }
  }
}

function throwLifecycleErrors(errors, message) {
  if (errors.length === 1) {
    throw errors[0];
  }

  if (errors.length > 1) {
    throw new AggregateError(errors, message);
  }
}
