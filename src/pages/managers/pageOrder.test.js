import { describe, expect, it } from 'vitest';

import { DEFAULT_PAGE_SWIPE_ORDER } from './pageOrder.js';

describe('DEFAULT_PAGE_SWIPE_ORDER', () => {
  it('keeps prestige before the default rooms and appends other optional rooms', () => {
    expect(DEFAULT_PAGE_SWIPE_ORDER).toEqual([
      'prestige',
      'brewing',
      'garden',
      'workshop',
      'shop',
      'research',
      'advancedBrewing',
      'advancedGarden',
      'guild',
      'advancedMarket',
    ]);
  });
});
