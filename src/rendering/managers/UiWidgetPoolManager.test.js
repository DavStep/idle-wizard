import { describe, expect, it, vi } from 'vitest';

import { UiWidgetPoolManager } from './UiWidgetPoolManager.js';

describe('UiWidgetPoolManager', () => {
  it('reuses released widgets in LIFO order and prepares new context', () => {
    const prepare = vi.fn((widget, context) => {
      widget.context = context;
    });
    const reset = vi.fn((widget) => {
      widget.context = null;
    });
    const pool = new UiWidgetPoolManager({
      maxSize: 2,
      create: () => ({}),
      prepare,
      reset,
    });
    const first = pool.acquire('first');
    const second = pool.acquire('second');

    pool.release(first);
    pool.release(second);

    expect(pool.acquire('replacement')).toBe(second);
    expect(prepare).toHaveBeenLastCalledWith(second, 'replacement');
    expect(reset).toHaveBeenCalledTimes(2);
    expect(pool.getStats()).toMatchObject({
      available: 1,
      created: 2,
      reused: 1,
    });
  });

  it('destroys overflow and drains every retained widget', () => {
    const destroy = vi.fn();
    const pool = new UiWidgetPoolManager({
      maxSize: 1,
      create: () => ({}),
      destroy,
    });
    const retained = pool.acquire();
    const overflow = pool.acquire();

    expect(pool.release(retained)).toBe(true);
    expect(pool.release(overflow)).toBe(false);
    expect(destroy).toHaveBeenCalledWith(overflow);

    pool.clear();

    expect(destroy).toHaveBeenCalledWith(retained);
    expect(pool.getStats()).toMatchObject({
      available: 0,
      created: 2,
      destroyed: 2,
      released: 2,
    });
  });
});
