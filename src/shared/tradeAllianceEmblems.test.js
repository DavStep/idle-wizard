import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TRADE_ALLIANCE_EMBLEM,
  TRADE_ALLIANCE_EMBLEMS,
  getTradeAllianceEmblem,
  normalizeTradeAllianceEmblem,
} from './tradeAllianceEmblems.js';

describe('tradeAllianceEmblems', () => {
  it('offers the original emblem plus eleven new simple silhouettes', () => {
    expect(DEFAULT_TRADE_ALLIANCE_EMBLEM).toBe('unity');
    expect(TRADE_ALLIANCE_EMBLEMS).toHaveLength(12);
    expect(new Set(TRADE_ALLIANCE_EMBLEMS.map(({ id }) => id)).size).toBe(12);
    expect(TRADE_ALLIANCE_EMBLEMS.every(({ assetId }) => assetId.endsWith('.png'))).toBe(true);
  });

  it('normalizes unknown persisted values to the original unity emblem', () => {
    expect(normalizeTradeAllianceEmblem('OWL')).toBe('owl');
    expect(normalizeTradeAllianceEmblem('DRAGON')).toBe('dragon');
    expect(normalizeTradeAllianceEmblem('unknown')).toBe('unity');
    expect(getTradeAllianceEmblem('unknown').id).toBe('unity');
  });
});
