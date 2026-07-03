// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { setSelectedTabState } from './selectedTabState.js';

describe('setSelectedTabState', () => {
  it('syncs class and aria selected state', () => {
    const button = document.createElement('button');

    setSelectedTabState(button, true);

    expect(button.classList.contains('is-selected')).toBe(true);
    expect(button.getAttribute('aria-selected')).toBe('true');

    setSelectedTabState(button, false);

    expect(button.classList.contains('is-selected')).toBe(false);
    expect(button.getAttribute('aria-selected')).toBe('false');
  });

  it('keeps roving tab index when requested', () => {
    const button = document.createElement('button');

    setSelectedTabState(button, true, { tabIndex: true });

    expect(button.tabIndex).toBe(0);

    setSelectedTabState(button, false, { tabIndex: true });

    expect(button.tabIndex).toBe(-1);
  });

  it('ignores missing buttons', () => {
    expect(() => setSelectedTabState(null, true)).not.toThrow();
  });
});
