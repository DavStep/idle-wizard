import { describe, expect, it, vi } from 'vitest';

import { PooledCollection } from './PooledCollection.js';
import { WidgetPool } from './WidgetPool.js';

describe('PooledCollection', () => {
  it('keeps widget identity stable by key across data updates and reorders', () => {
    let nextWidgetId = 1;
    const pool = new WidgetPool({
      create: () => ({
        widgetId: nextWidgetId++,
        bind: vi.fn(),
        reset: vi.fn(),
      }),
    });
    const afterReconcile = vi.fn();
    const collection = new PooledCollection({
      pool,
      keyOf: (item) => item.id,
      afterReconcile,
    });

    const firstOrder = collection.reconcile([
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ]);
    const secondOrder = collection.reconcile([
      { id: 'b', label: 'B2' },
      { id: 'a', label: 'A2' },
    ]);

    expect(secondOrder).toEqual([firstOrder[1], firstOrder[0]]);
    expect(pool.getStats().allocated).toBe(2);
    expect(collection.getKeys()).toEqual(['b', 'a']);
    expect(firstOrder[0].bind).toHaveBeenLastCalledWith(
      'a',
      { id: 'a', label: 'A2' },
    );
    expect(afterReconcile).toHaveBeenCalledTimes(2);
    expect(collection.getStats().highWaterMark).toBe(2);
  });

  it('releases removed widgets and reuses them for later keys', () => {
    const pool = new WidgetPool({
      create: () => ({
        bind: vi.fn(),
        reset: vi.fn(),
      }),
    });
    const collection = new PooledCollection({
      pool,
      keyOf: (item) => item.id,
    });
    const [first] = collection.reconcile([{ id: 'a' }]);

    collection.reconcile([]);
    const [reused] = collection.reconcile([{ id: 'b' }]);

    expect(reused).toBe(first);
    expect(first.reset).toHaveBeenCalledTimes(1);
    expect(pool.getStats().allocated).toBe(1);
  });

  it('rejects duplicate keys before acquiring or changing current membership', () => {
    const pool = new WidgetPool({
      create: () => ({
        bind: vi.fn(),
        reset: vi.fn(),
      }),
    });
    const collection = new PooledCollection({
      pool,
      keyOf: (item) => item.id,
      name: 'research rows',
    });
    collection.reconcile([{ id: 'existing' }]);

    expect(() =>
      collection.reconcile([{ id: 'duplicate' }, { id: 'duplicate' }]),
    ).toThrow(/duplicate key/);
    expect(collection.getKeys()).toEqual(['existing']);
    expect(pool.getStats().allocated).toBe(1);
  });

  it('returns newly acquired widgets when binding fails', () => {
    const pool = new WidgetPool({
      create: () => ({
        reset: vi.fn(),
      }),
    });
    const collection = new PooledCollection({
      pool,
      keyOf: (item) => item.id,
      bind: () => {
        throw new Error('bind failed');
      },
    });

    expect(() => collection.reconcile([{ id: 'new' }])).toThrow('bind failed');
    expect(collection.getStats().size).toBe(0);
    expect(pool.getStats()).toMatchObject({ active: 0, available: 1 });
  });

  it('releases all leases on destroy but leaves pool ownership with the caller', () => {
    const pool = new WidgetPool({
      create: () => ({
        bind: vi.fn(),
        reset: vi.fn(),
      }),
    });
    const collection = new PooledCollection({
      pool,
      keyOf: (item) => item.id,
    });
    collection.reconcile([{ id: 'a' }, { id: 'b' }]);

    expect(collection.destroy()).toBe(true);
    expect(collection.destroy()).toBe(false);
    expect(pool.getStats()).toMatchObject({ active: 0, available: 2, destroyed: false });
    expect(() => collection.reconcile([])).toThrow(/destroyed/);
  });
});
