import { describe, expect, it } from 'vitest';

import {
  isTradeAllianceUnlocked,
  TRADE_ALLIANCE_UNLOCK_LEVEL,
} from './tradeAllianceAccess';

describe('trade alliance access', () => {
  it('keeps alliance membership actions locked until level four', () => {
    expect(TRADE_ALLIANCE_UNLOCK_LEVEL).toBe(4);
    expect(isTradeAllianceUnlocked(1)).toBe(false);
    expect(isTradeAllianceUnlocked(3)).toBe(false);
    expect(isTradeAllianceUnlocked(4)).toBe(true);
  });
});
