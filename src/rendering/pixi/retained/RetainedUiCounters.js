/**
 * Shared counter names used by the retained Pixi UI infrastructure.
 *
 * These are cumulative event counters. Live sizes and high-water marks remain
 * available on the owning registry/pool so they cannot become inaccurate when
 * more than one registry or pool uses the same diagnostics instance.
 */
export const RETAINED_UI_COUNTERS = Object.freeze({
  VIEW_WRAPPED: 'view.wrapped',
  VIEW_BOUND: 'view.bound',
  VIEW_THEME_APPLIED: 'view.themeApplied',
  VIEW_LAID_OUT: 'view.laidOut',
  VIEW_ACTIVATED: 'view.activated',
  VIEW_DEACTIVATED: 'view.deactivated',
  VIEW_DESTROYED: 'view.destroyed',
  PAGE_REGISTERED: 'page.registered',
  PAGE_ACTIVATED: 'page.activated',
  PAGE_DEACTIVATED: 'page.deactivated',
  DIALOG_REGISTERED: 'dialog.registered',
  DIALOG_CREATED: 'dialog.created',
  DIALOG_OPENED: 'dialog.opened',
  DIALOG_CLOSED: 'dialog.closed',
  WIDGET_ALLOCATED: 'widget.allocated',
  WIDGET_ACQUIRED: 'widget.acquired',
  WIDGET_RELEASED: 'widget.released',
  WIDGET_DISCARDED: 'widget.discarded',
  COLLECTION_RECONCILED: 'collection.reconciled',
  TARGET_REGISTERED: 'target.registered',
  TARGET_UNREGISTERED: 'target.unregistered',
  TARGET_ACTIVATED: 'target.activated',
});

/**
 * Small, dependency-free diagnostic store for retained UI lifecycle events.
 *
 * It is deliberately opt-in: production code may omit it, while tests and
 * development builds can share one instance across registries and pools.
 */
export class RetainedUiCounters {
  constructor() {
    this.values = new Map();
  }

  increment(name, amount = 1) {
    const safeName = validateCounterName(name);
    const safeAmount = validateFiniteNumber(amount, 'Counter increments');

    if (safeAmount < 0) {
      throw new RangeError('Counter increments must be zero or greater.');
    }

    const nextValue = this.get(safeName) + safeAmount;
    this.values.set(safeName, nextValue);
    return nextValue;
  }

  decrement(name, amount = 1) {
    const safeName = validateCounterName(name);
    const safeAmount = validateFiniteNumber(amount, 'Counter decrements');

    if (safeAmount < 0) {
      throw new RangeError('Counter decrements must be zero or greater.');
    }

    const nextValue = this.get(safeName) - safeAmount;

    if (nextValue < 0) {
      throw new RangeError(`Counter "${safeName}" cannot fall below zero.`);
    }

    this.values.set(safeName, nextValue);
    return nextValue;
  }

  set(name, value) {
    const safeName = validateCounterName(name);
    const safeValue = validateFiniteNumber(value, 'Counter values');
    this.values.set(safeName, safeValue);
    return safeValue;
  }

  observeMaximum(name, value) {
    const safeName = validateCounterName(name);
    const safeValue = validateFiniteNumber(value, 'Observed maximum values');
    const maximum = Math.max(this.get(safeName), safeValue);
    this.values.set(safeName, maximum);
    return maximum;
  }

  get(name) {
    const safeName = validateCounterName(name);
    return this.values.get(safeName) ?? 0;
  }

  reset(name) {
    if (name === undefined) {
      this.values.clear();
      return;
    }

    this.values.delete(validateCounterName(name));
  }

  snapshot() {
    return Object.freeze(
      Object.fromEntries([...this.values.entries()].sort(([left], [right]) =>
        left.localeCompare(right),
      )),
    );
  }
}

export function assertRetainedUiCounters(counters, label = 'Retained UI counters') {
  if (
    counters !== null &&
    counters !== undefined &&
    typeof counters.increment !== 'function'
  ) {
    throw new TypeError(`${label} must expose increment(name, amount).`);
  }

  return counters ?? null;
}

export function incrementRetainedUiCounter(counters, name, amount = 1) {
  counters?.increment(name, amount);
}

function validateCounterName(name) {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new TypeError('Counter names must be non-empty strings.');
  }

  return name;
}

function validateFiniteNumber(value, label) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite numbers.`);
  }

  return value;
}
