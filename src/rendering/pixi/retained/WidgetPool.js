import {
  assertRetainedUiCounters,
  incrementRetainedUiCounter,
  RETAINED_UI_COUNTERS,
} from './RetainedUiCounters.js';

/**
 * Bounded idle pool for Pixi widgets.
 *
 * `maxSize` limits retained idle widgets, not active demand. Active demand is
 * never silently dropped. Widgets beyond the idle limit are reset and disposed
 * when released.
 */
export class WidgetPool {
  /**
   * @param {{
   *   create?: (...factoryArguments: unknown[]) => object,
   *   reset?: (widget: object) => void,
   *   dispose?: (widget: object) => void,
   *   maxSize?: number,
   *   name?: string,
   *   counters?: import('./RetainedUiCounters.js').RetainedUiCounters | null,
   * }} options
   */
  constructor({
    create,
    reset = defaultReset,
    dispose = defaultDispose,
    maxSize = Number.POSITIVE_INFINITY,
    name = 'widget pool',
    counters = null,
  } = {}) {
    if (typeof create !== 'function') {
      throw new TypeError('WidgetPool requires a create() factory.');
    }

    if (typeof reset !== 'function') {
      throw new TypeError('WidgetPool reset must be a function.');
    }

    if (typeof dispose !== 'function') {
      throw new TypeError('WidgetPool dispose must be a function.');
    }

    this.name = validateName(name);
    this.createWidget = create;
    this.resetWidget = reset;
    this.disposeWidget = dispose;
    this.maxSize = validateMaxSize(maxSize);
    this.counters = assertRetainedUiCounters(counters);
    this.available = [];
    this.active = new Set();
    this.owned = new Set();
    this.highWaterMark = 0;
    this.allocationCount = 0;
    this.acquireCount = 0;
    this.releaseCount = 0;
    this.discardCount = 0;
    this.destroyed = false;
  }

  acquire(...factoryArguments) {
    this.assertUsable('acquire widgets');
    let widget = this.available.pop();

    if (widget === undefined) {
      widget = assertWidget(this.createWidget(...factoryArguments), this.name);

      if (this.owned.has(widget)) {
        throw new Error(`${this.name} create() returned a widget it already owns.`);
      }

      this.owned.add(widget);
      this.allocationCount += 1;
      incrementRetainedUiCounter(
        this.counters,
        RETAINED_UI_COUNTERS.WIDGET_ALLOCATED,
      );
    }

    if (this.active.has(widget)) {
      throw new Error(`${this.name} attempted to acquire an already-active widget.`);
    }

    this.active.add(widget);
    this.acquireCount += 1;
    this.highWaterMark = Math.max(this.highWaterMark, this.active.size);
    incrementRetainedUiCounter(
      this.counters,
      RETAINED_UI_COUNTERS.WIDGET_ACQUIRED,
    );
    return widget;
  }

  release(widget) {
    this.assertUsable('release widgets');

    if (!this.owned.has(widget)) {
      throw new Error(`${this.name} cannot release a widget it does not own.`);
    }

    if (!this.active.has(widget)) {
      throw new Error(`${this.name} cannot release the same widget twice.`);
    }

    this.active.delete(widget);
    const errors = [];

    try {
      this.resetWidget(widget);
    } catch (error) {
      errors.push(error);
    }

    if (errors.length === 0 && this.available.length < this.maxSize) {
      this.available.push(widget);
    } else {
      try {
        this.discard(widget);
      } catch (error) {
        errors.push(error);
      }
    }

    this.releaseCount += 1;
    incrementRetainedUiCounter(
      this.counters,
      RETAINED_UI_COUNTERS.WIDGET_RELEASED,
    );
    throwPoolErrors(errors, `Failed to release a widget from ${this.name}.`);
    return true;
  }

  /**
   * Disposes every idle widget while leaving active leases intact.
   */
  clear() {
    this.assertUsable('clear widgets');
    const errors = [];

    while (this.available.length > 0) {
      const widget = this.available.pop();

      try {
        this.discard(widget);
      } catch (error) {
        errors.push(error);
      }
    }

    throwPoolErrors(errors, `Failed to clear one or more widgets from ${this.name}.`);
    return true;
  }

  /**
   * App-shutdown cleanup. Active widgets are reset before every owned widget is
   * disposed. Cleanup continues after individual failures.
   */
  destroy() {
    if (this.destroyed) {
      return false;
    }

    const errors = [];

    for (const widget of this.active) {
      try {
        this.resetWidget(widget);
      } catch (error) {
        errors.push(error);
      }
    }

    for (const widget of this.owned) {
      try {
        this.disposeWidget(widget);
      } catch (error) {
        errors.push(error);
      }
    }

    this.available.length = 0;
    this.active.clear();
    this.owned.clear();
    this.destroyed = true;
    throwPoolErrors(errors, `Failed to destroy one or more widgets from ${this.name}.`);
    return true;
  }

  owns(widget) {
    return this.owned.has(widget);
  }

  isActive(widget) {
    return this.active.has(widget);
  }

  getStats() {
    return Object.freeze({
      name: this.name,
      allocated: this.allocationCount,
      acquired: this.acquireCount,
      released: this.releaseCount,
      discarded: this.discardCount,
      retained: this.owned.size,
      active: this.active.size,
      available: this.available.length,
      highWaterMark: this.highWaterMark,
      maxSize: this.maxSize,
      destroyed: this.destroyed,
    });
  }

  discard(widget) {
    this.owned.delete(widget);
    this.discardCount += 1;
    incrementRetainedUiCounter(
      this.counters,
      RETAINED_UI_COUNTERS.WIDGET_DISCARDED,
    );
    this.disposeWidget(widget);
  }

  assertUsable(action) {
    if (this.destroyed) {
      throw new Error(`Cannot ${action} after ${this.name} is destroyed.`);
    }
  }
}

function defaultReset(widget) {
  if (typeof widget.reset !== 'function') {
    throw new TypeError('Poolable widgets must expose reset().');
  }

  widget.reset();
}

function defaultDispose(widget) {
  widget.destroy?.();
}

function assertWidget(widget, poolName) {
  if ((typeof widget !== 'object' && typeof widget !== 'function') || widget === null) {
    throw new TypeError(`${poolName} create() must return a widget object.`);
  }

  return widget;
}

function validateMaxSize(value) {
  if (value === Number.POSITIVE_INFINITY) {
    return value;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError('WidgetPool maxSize must be a non-negative integer or Infinity.');
  }

  return value;
}

function validateName(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError('WidgetPool names must be non-empty strings.');
  }

  return value;
}

function throwPoolErrors(errors, message) {
  if (errors.length === 1) {
    throw errors[0];
  }

  if (errors.length > 1) {
    throw new AggregateError(errors, message);
  }
}
