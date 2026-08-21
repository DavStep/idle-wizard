import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TRADE_ALLIANCE_EMBLEM,
  TRADE_ALLIANCE_EMBLEMS,
  getTradeAllianceEmblem,
  normalizeTradeAllianceEmblem,
} from './tradeAllianceEmblems.js';

describe('tradeAllianceEmblems', () => {
  it('offers sixteen unique simple silhouettes', () => {
    expect(DEFAULT_TRADE_ALLIANCE_EMBLEM).toBe('unity');
    expect(TRADE_ALLIANCE_EMBLEMS).toHaveLength(16);
    expect(new Set(TRADE_ALLIANCE_EMBLEMS.map(({ id }) => id)).size).toBe(16);
    expect(TRADE_ALLIANCE_EMBLEMS.slice(-4).map(({ id }) => id)).toEqual([
      'cauldron',
      'sword',
      'shield',
      'book',
    ]);
    expect(TRADE_ALLIANCE_EMBLEMS.every(({ assetId }) => assetId.endsWith('.png'))).toBe(true);
  });

  it('normalizes unknown persisted values to the original unity emblem', () => {
    expect(normalizeTradeAllianceEmblem('OWL')).toBe('owl');
    expect(normalizeTradeAllianceEmblem('DRAGON')).toBe('dragon');
    expect(normalizeTradeAllianceEmblem('unknown')).toBe('unity');
    expect(getTradeAllianceEmblem('unknown').id).toBe('unity');
  });
});
