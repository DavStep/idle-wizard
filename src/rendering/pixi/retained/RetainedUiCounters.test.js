import { describe, expect, it } from 'vitest';

import { RetainedUiCounters } from './RetainedUiCounters.js';

describe('RetainedUiCounters', () => {
  it('records deterministic snapshots, gauges, and high-water values', () => {
    const counters = new RetainedUiCounters();

    counters.increment('z.event');
    counters.increment('z.event', 2);
    counters.set('a.active', 3);
    counters.decrement('a.active');
    counters.observeMaximum('a.highWater', 2);
    counters.observeMaximum('a.highWater', 1);

    expect(counters.snapshot()).toEqual({
      'a.active': 2,
      'a.highWater': 2,
      'z.event': 3,
    });
    expect(Object.isFrozen(counters.snapshot())).toBe(true);
  });

  it('rejects invalid values and counter underflow', () => {
    const counters = new RetainedUiCounters();

    expect(() => counters.increment('', 1)).toThrow(/non-empty/);
    expect(() => counters.increment('event', Number.NaN)).toThrow(/finite/);
    expect(() => counters.increment('event', -1)).toThrow(/zero or greater/);
    expect(() => counters.decrement('active')).toThrow(/below zero/);
  });
});
