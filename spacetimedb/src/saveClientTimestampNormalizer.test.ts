import { describe, expect, it } from 'vitest';

import {
  normalizeSaveClientSequence,
  normalizeSaveClientSessionId,
  normalizeSaveClientTimestamp,
} from './saveClientTimestampNormalizer';

describe('normalizeSaveClientTimestamp', () => {
  it('preserves a valid client save timestamp for reconnect ordering', () => {
    expect(normalizeSaveClientTimestamp(123)).toBe(123);
  });

  it('rejects invalid client save timestamps', () => {
    expect(normalizeSaveClientTimestamp(-1)).toBe(0);
    expect(normalizeSaveClientTimestamp(Number.POSITIVE_INFINITY)).toBe(0);
    expect(normalizeSaveClientTimestamp('not-a-timestamp')).toBe(0);
  });

  it('keeps bounded client session and sequence metadata', () => {
    expect(normalizeSaveClientSessionId('session-1')).toBe('session-1');
    expect(normalizeSaveClientSequence(2)).toBe(2);
  });

  it('rejects invalid client session and sequence metadata', () => {
    expect(normalizeSaveClientSessionId('')).toBeNull();
    expect(normalizeSaveClientSessionId('x'.repeat(65))).toBeNull();
    expect(normalizeSaveClientSequence(0)).toBe(0);
    expect(normalizeSaveClientSequence(Number.MAX_SAFE_INTEGER + 1)).toBe(0);
  });
});
