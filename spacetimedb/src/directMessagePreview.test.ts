import { describe, expect, it } from 'vitest';

import { selectLatestDirectMessagePreview } from './directMessagePreview';

describe('direct message preview', () => {
  it('selects the newest message regardless of iteration order', () => {
    expect(
      selectLatestDirectMessagePreview([
        message('newest', 3_000n, 3),
        message('oldest', 1_000n, 1),
        message('middle', 2_000n, 2),
      ]),
    ).toBe('newest');
  });

  it('uses message id as the stable tie breaker and handles empty conversations', () => {
    expect(
      selectLatestDirectMessagePreview([
        message('first', 1_000n, 1),
        message('second', 1_000n, 2),
      ]),
    ).toBe('second');
    expect(selectLatestDirectMessagePreview([])).toBe('');
  });
});

function message(body: string, micros: bigint, id: number) {
  return {
    body,
    sentAt: { microsSinceUnixEpoch: micros },
    messageId: { compareTo: (other: { value: number }) => id - other.value, value: id },
  };
}
