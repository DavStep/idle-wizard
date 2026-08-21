import { describe, expect, it } from 'vitest';

import {
  TRADE_ALLIANCE_ROLES,
  canAssignTradeAllianceRole,
  canManageTradeAllianceMember,
} from './tradeAllianceRoles.js';

describe('trade alliance roles', () => {
  it('keeps the server rank order, caps, and player-facing permissions together', () => {
    expect(
      TRADE_ALLIANCE_ROLES.map(({ id, maxMembers }) => [id, maxMembers]),
    ).toEqual([
      ['tradeMaster', 1],
      ['quartermaster', 2],
      ['factor', 5],
      ['broker', 10],
      ['trader', 50],
    ]);
    expect(TRADE_ALLIANCE_ROLES.every(({ permissions }) => permissions)).toBe(
      true,
    );
  });

  it('matches the server member-management hierarchy', () => {
    expect(canManageTradeAllianceMember('tradeMaster', 'quartermaster')).toBe(
      true,
    );
    expect(canManageTradeAllianceMember('quartermaster', 'factor')).toBe(true);
    expect(canManageTradeAllianceMember('factor', 'broker')).toBe(true);
    expect(canManageTradeAllianceMember('factor', 'factor')).toBe(false);
    expect(canManageTradeAllianceMember('broker', 'trader')).toBe(false);
    expect(canAssignTradeAllianceRole('tradeMaster', 'tradeMaster')).toBe(true);
    expect(canAssignTradeAllianceRole('quartermaster', 'tradeMaster')).toBe(
      false,
    );
  });
});
