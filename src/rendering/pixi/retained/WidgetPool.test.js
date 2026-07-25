import { describe, expect, it, vi } from 'vitest';

import { WidgetPool } from './WidgetPool.js';

describe('WidgetPool', () => {
  it('reuses reset widgets and reports the active high-water mark', () => {
    const widgets = [];
    const pool = new WidgetPool({
      create: (key) => {
        const widget = createWidget(key);
        widgets.push(widget);
        return widget;
      },
      maxSize: 2,
      name: 'row pool',
    });

    const first = pool.acquire('first');
    const second = pool.acquire('second');
    pool.release(first);
    const reused = pool.acquire('ignored-for-reuse');

    expect(reused).toBe(first);
    expect(widgets).toHaveLength(2);
    expect(first.reset).toHaveBeenCalledTimes(1);
    expect(pool.getStats()).toMatchObject({
      allocated: 2,
      acquired: 3,
      released: 1,
      active: 2,
      available: 0,
      highWaterMark: 2,
    });

    pool.release(second);
    pool.release(reused);
  });

  it('disposes released widgets beyond the idle retention limit', () => {
    const pool = new WidgetPool({
      create: () => createWidget(),
      maxSize: 1,
    });
    const first = pool.acquire();
    const second = pool.acquire();

    pool.release(first);
    pool.release(second);

    expect(first.destroy).not.toHaveBeenCalled();
    expect(second.destroy).toHaveBeenCalledTimes(1);
    expect(pool.getStats()).toMatchObject({
      retained: 1,
      available: 1,
      discarded: 1,
    });
  });

  it('rejects foreign and duplicate releases', () => {
    const pool = new WidgetPool({ create: () => createWidget() });
    const widget = pool.acquire();

    expect(() => pool.release(createWidget())).toThrow(/does not own/);
    pool.release(widget);
    expect(() => pool.release(widget)).toThrow(/same widget twice/);
  });

  it('discards a widget when reset fails so dirty state cannot re-enter the pool', () => {
    const widget = createWidget();
    widget.reset.mockImplementation(() => {
      throw new Error('reset failed');
    });
    const pool = new WidgetPool({ create: () => widget });

    expect(() => pool.release(pool.acquire())).toThrow('reset failed');
    expect(widget.destroy).toHaveBeenCalledTimes(1);
    expect(pool.getStats()).toMatchObject({
      retained: 0,
      active: 0,
      available: 0,
      discarded: 1,
    });
  });

  it('resets active widgets and disposes all retained widgets on shutdown', () => {
    const pool = new WidgetPool({ create: () => createWidget() });
    const active = pool.acquire();
    const idle = pool.acquire();
    pool.release(idle);

    expect(pool.destroy()).toBe(true);
    expect(pool.destroy()).toBe(false);
    expect(active.reset).toHaveBeenCalledTimes(1);
    expect(idle.reset).toHaveBeenCalledTimes(1);
    expect(active.destroy).toHaveBeenCalledTimes(1);
    expect(idle.destroy).toHaveBeenCalledTimes(1);
    expect(() => pool.acquire()).toThrow(/destroyed/);
  });
});

function createWidget(key = null) {
  return {
    key,
    reset: vi.fn(),
    destroy: vi.fn(),
  };
}
