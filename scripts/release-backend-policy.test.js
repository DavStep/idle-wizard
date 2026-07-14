import { describe, expect, it } from 'vitest';

import { shouldPublishBackend } from './release-backend-policy.js';

describe('release backend policy', () => {
  it('publishes committed backend changes since the previous release', () => {
    expect(
      shouldPublishBackend('auto', {
        backendChangesInWorktree: false,
        backendChangedSinceLastRelease: true,
      }),
    ).toBe(true);
  });

  it('publishes uncommitted backend changes and otherwise skips in auto mode', () => {
    expect(
      shouldPublishBackend('auto', {
        backendChangesInWorktree: true,
        backendChangedSinceLastRelease: false,
      }),
    ).toBe(true);
    expect(
      shouldPublishBackend('auto', {
        backendChangesInWorktree: false,
        backendChangedSinceLastRelease: false,
      }),
    ).toBe(false);
  });

  it('honors explicit backend publish modes', () => {
    expect(shouldPublishBackend('always')).toBe(true);
    expect(shouldPublishBackend('skip')).toBe(false);
    expect(() => shouldPublishBackend('invalid')).toThrow(/Unknown backend mode/u);
  });
});
