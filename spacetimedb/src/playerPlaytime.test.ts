import { describe, expect, it } from 'vitest';

import {
  addPlayerSessionPlaytimeMicros,
  combinePlayerPlaytimeMicros,
  playtimeMicrosToWholeSeconds,
} from './playerPlaytime';

describe('player playtime', () => {
  it('adds an authoritative connected session to the lifetime total', () => {
    expect(
      addPlayerSessionPlaytimeMicros(
        2_000_000n,
        { microsSinceUnixEpoch: 10_000_000n },
        { microsSinceUnixEpoch: 15_500_000n },
      ),
    ).toBe(7_500_000n);
  });

  it('does not subtract time for missing or future session timestamps', () => {
    expect(
      addPlayerSessionPlaytimeMicros(
        2_000_000n,
        { microsSinceUnixEpoch: 20_000_000n },
        { microsSinceUnixEpoch: 15_000_000n },
      ),
    ).toBe(2_000_000n);
    expect(
      addPlayerSessionPlaytimeMicros(
        2_000_000n,
        undefined,
        { microsSinceUnixEpoch: 15_000_000n },
      ),
    ).toBe(2_000_000n);
  });

  it('combines account totals and exposes only whole seconds', () => {
    expect(combinePlayerPlaytimeMicros(4_500_000n, 2_750_000n)).toBe(7_250_000n);
    expect(playtimeMicrosToWholeSeconds(7_250_000n)).toBe(7n);
  });
});
