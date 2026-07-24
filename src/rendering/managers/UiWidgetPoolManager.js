const DEFAULT_MAX_POOLED_WIDGETS = 128;

export class UiWidgetPoolManager {
  static explain =
    'Keeps a bounded set of inactive rendered UI widgets ready for reuse, so page and list remounts do not rebuild the same display-object structure.';

  constructor({
    maxSize = DEFAULT_MAX_POOLED_WIDGETS,
    create,
    prepare = () => {},
    reset = () => {},
    destroy = () => {},
  } = {}) {
    if (typeof create !== 'function') {
      throw new Error('UiWidgetPoolManager requires a widget factory.');
    }

    this.maxSize = normalizePoolSize(maxSize);
    this.create = create;
    this.prepare = prepare;
    this.reset = reset;
    this.destroy = destroy;
    this.available = [];
    this.availableSet = new Set();
    this.stats = {
      created: 0,
      reused: 0,
      released: 0,
      destroyed: 0,
      peakAvailable: 0,
    };
  }

  acquire(context) {
    const pooled = this.available.pop();
    const widget = pooled ?? this.create(context);

    if (pooled) {
      this.availableSet.delete(widget);
      this.stats.reused += 1;
    } else {
      this.stats.created += 1;
    }

    try {
      this.prepare(widget, context);
    } catch (error) {
      this.destroy(widget);
      this.stats.destroyed += 1;
      throw error;
    }

    return widget;
  }

  release(widget) {
    if (!widget || this.availableSet.has(widget)) {
      return false;
    }

    this.reset(widget);
    this.stats.released += 1;

    if (this.available.length >= this.maxSize) {
      this.destroy(widget);
      this.stats.destroyed += 1;
      return false;
    }

    this.available.push(widget);
    this.availableSet.add(widget);
    this.stats.peakAvailable = Math.max(
      this.stats.peakAvailable,
      this.available.length,
    );
    return true;
  }

  clear() {
    for (const widget of this.available) {
      this.destroy(widget);
      this.stats.destroyed += 1;
    }
    this.available.length = 0;
    this.availableSet.clear();
  }

  get size() {
    return this.available.length;
  }

  getStats() {
    return {
      ...this.stats,
      available: this.available.length,
    };
  }
}

export { DEFAULT_MAX_POOLED_WIDGETS };

function normalizePoolSize(value) {
  const size = Number(value);
  return Number.isFinite(size) && size > 0 ? Math.floor(size) : 0;
}
