import {
  assertRetainedUiCounters,
  incrementRetainedUiCounter,
  RETAINED_UI_COUNTERS,
} from './RetainedUiCounters.js';

/**
 * Keyed retained collection backed by a WidgetPool.
 *
 * Existing keys keep the same widget identity across reorders and data updates.
 * Removed widgets are reset/released only after all next-state bindings succeed.
 */
export class PooledCollection {
  /**
   * @param {{
   *   pool?: { acquire: (...arguments_: unknown[]) => object, release: (widget: object) => void },
   *   keyOf?: (item: unknown, index: number) => unknown,
   *   bind?: (widget: object, item: unknown, key: unknown, index: number) => void,
   *   afterReconcile?: (widgets: readonly object[]) => void,
   *   name?: string,
   *   counters?: import('./RetainedUiCounters.js').RetainedUiCounters | null,
   * }} options
   */
  constructor({
    pool,
    keyOf,
    bind = defaultBind,
    afterReconcile = null,
    name = 'pooled collection',
    counters = null,
  } = {}) {
    assertPool(pool);

    if (typeof keyOf !== 'function') {
      throw new TypeError('PooledCollection requires keyOf(item, index).');
    }

    if (typeof bind !== 'function') {
      throw new TypeError('PooledCollection bind must be a function.');
    }

    if (afterReconcile !== null && typeof afterReconcile !== 'function') {
      throw new TypeError('PooledCollection afterReconcile must be a function or null.');
    }

    this.pool = pool;
    this.keyOf = keyOf;
    this.bindWidget = bind;
    this.afterReconcile = afterReconcile;
    this.name = validateName(name);
    this.counters = assertRetainedUiCounters(counters);
    this.widgetsByKey = new Map();
    this.orderedKeys = [];
    this.highWaterMark = 0;
    this.reconcileCount = 0;
    this.destroyed = false;
  }

  reconcile(items) {
    this.assertUsable('reconcile items');
    const nextItems = normalizeItems(items);
    const keyedItems = nextItems.map((item, index) => ({
      item,
      index,
      key: validateKey(this.keyOf(item, index), this.name),
    }));
    assertUniqueKeys(keyedItems, this.name);

    const nextWidgetsByKey = new Map();
    const acquiredWidgets = [];

    try {
      for (const { key } of keyedItems) {
        const existingWidget = this.widgetsByKey.get(key);
        const widget = existingWidget ?? this.pool.acquire(key);

        if (existingWidget === undefined) {
          acquiredWidgets.push(widget);
        }

        nextWidgetsByKey.set(key, widget);
      }

      for (const { item, index, key } of keyedItems) {
        this.bindWidget(nextWidgetsByKey.get(key), item, key, index);
      }
    } catch (error) {
      const errors = [error];

      for (const widget of acquiredWidgets.reverse()) {
        try {
          this.pool.release(widget);
        } catch (releaseError) {
          errors.push(releaseError);
        }
      }

      throwCollectionErrors(errors, `Failed to reconcile ${this.name}.`);
    }

    const removedWidgets = [];

    for (const [key, widget] of this.widgetsByKey) {
      if (!nextWidgetsByKey.has(key)) {
        removedWidgets.push(widget);
      }
    }

    this.widgetsByKey = nextWidgetsByKey;
    this.orderedKeys = keyedItems.map(({ key }) => key);
    this.highWaterMark = Math.max(this.highWaterMark, this.widgetsByKey.size);
    this.reconcileCount += 1;

    const releaseErrors = [];

    for (const widget of removedWidgets) {
      try {
        this.pool.release(widget);
      } catch (error) {
        releaseErrors.push(error);
      }
    }

    const widgets = this.getWidgets();
    this.afterReconcile?.(widgets);
    incrementRetainedUiCounter(
      this.counters,
      RETAINED_UI_COUNTERS.COLLECTION_RECONCILED,
    );
    throwCollectionErrors(
      releaseErrors,
      `Failed to release removed widgets from ${this.name}.`,
    );
    return widgets;
  }

  get(key) {
    return this.widgetsByKey.get(key) ?? null;
  }

  has(key) {
    return this.widgetsByKey.has(key);
  }

  getKeys() {
    return Object.freeze([...this.orderedKeys]);
  }

  getWidgets() {
    return Object.freeze(
      this.orderedKeys.map((key) => this.widgetsByKey.get(key)),
    );
  }

  remove(key) {
    this.assertUsable('remove widgets');
    const widget = this.widgetsByKey.get(key);

    if (!widget) {
      return false;
    }

    this.widgetsByKey.delete(key);
    const index = this.orderedKeys.indexOf(key);

    if (index >= 0) {
      this.orderedKeys.splice(index, 1);
    }

    this.pool.release(widget);
    this.afterReconcile?.(this.getWidgets());
    return true;
  }

  clear() {
    this.assertUsable('clear widgets');
    const widgets = [...this.widgetsByKey.values()];
    this.widgetsByKey.clear();
    this.orderedKeys.length = 0;
    const errors = [];

    for (const widget of widgets) {
      try {
        this.pool.release(widget);
      } catch (error) {
        errors.push(error);
      }
    }

    this.afterReconcile?.(Object.freeze([]));
    throwCollectionErrors(errors, `Failed to clear one or more widgets from ${this.name}.`);
    return widgets.length;
  }

  /**
   * Releases the collection's leases. The pool remains owned by its caller.
   */
  destroy() {
    if (this.destroyed) {
      return false;
    }

    const errors = [];

    try {
      this.clear();
    } catch (error) {
      errors.push(error);
    }

    this.destroyed = true;
    throwCollectionErrors(errors, `Failed to destroy ${this.name}.`);
    return true;
  }

  getStats() {
    return Object.freeze({
      name: this.name,
      size: this.widgetsByKey.size,
      highWaterMark: this.highWaterMark,
      reconciliations: this.reconcileCount,
      destroyed: this.destroyed,
    });
  }

  assertUsable(action) {
    if (this.destroyed) {
      throw new Error(`Cannot ${action} after ${this.name} is destroyed.`);
    }
  }
}

function defaultBind(widget, item, key) {
  if (typeof widget.bind !== 'function') {
    throw new TypeError('Poolable collection widgets must expose bind(key, data).');
  }

  widget.bind(key, item);
}

function assertPool(pool) {
  if (
    !pool ||
    typeof pool.acquire !== 'function' ||
    typeof pool.release !== 'function'
  ) {
    throw new TypeError('PooledCollection requires a pool with acquire() and release().');
  }
}

function normalizeItems(items) {
  if (!items || typeof items[Symbol.iterator] !== 'function') {
    throw new TypeError('PooledCollection reconcile() requires an iterable.');
  }

  return Array.isArray(items) ? items : [...items];
}

function validateKey(key, collectionName) {
  if (key === null || key === undefined) {
    throw new TypeError(`${collectionName} keys cannot be null or undefined.`);
  }

  return key;
}

function assertUniqueKeys(keyedItems, collectionName) {
  const keys = new Set();

  for (const { key } of keyedItems) {
    if (keys.has(key)) {
      throw new Error(`${collectionName} contains duplicate key "${String(key)}".`);
    }

    keys.add(key);
  }
}

function validateName(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError('PooledCollection names must be non-empty strings.');
  }

  return value;
}

function throwCollectionErrors(errors, message) {
  if (errors.length === 1) {
    throw errors[0];
  }

  if (errors.length > 1) {
    throw new AggregateError(errors, message);
  }
}
