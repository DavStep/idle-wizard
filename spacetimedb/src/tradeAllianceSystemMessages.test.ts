import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  formatTradeAllianceApprovedMessage,
  formatTradeAllianceFoundedMessage,
  formatTradeAllianceJoinedMessage,
  formatTradeAllianceKickedMessage,
  formatTradeAllianceLeadershipTransferredMessage,
  formatTradeAllianceLeftMessage,
  formatTradeAllianceRoleChangedMessage,
} from './tradeAllianceSystemMessages';

describe('trade alliance system messages', () => {
  it('describes every way a member enters or leaves the alliance', () => {
    expect(formatTradeAllianceFoundedMessage('Elara')).toBe(
      'Elara founded the alliance.',
    );
    expect(formatTradeAllianceJoinedMessage('Rowan')).toBe(
      'Rowan joined the alliance.',
    );
    expect(formatTradeAllianceApprovedMessage('Mira', 'Elara')).toBe(
      'Mira was approved by Elara and joined the alliance.',
    );
    expect(formatTradeAllianceLeftMessage('Rowan')).toBe(
      'Rowan left the alliance.',
    );
    expect(formatTradeAllianceKickedMessage('Mira', 'Elara')).toBe(
      'Mira was kicked by Elara.',
    );
  });

  it('distinguishes promotions and demotions and names the actor', () => {
    expect(
      formatTradeAllianceRoleChangedMessage({
        username: 'Mira',
        previousRolePower: 1,
        nextRole: 'broker',
        nextRolePower: 2,
        actorUsername: 'Elara',
      }),
    ).toBe('Mira was promoted to Broker by Elara.');
    expect(
      formatTradeAllianceRoleChangedMessage({
        username: 'Mira',
        previousRolePower: 3,
        nextRole: 'trader',
        nextRolePower: 1,
        actorUsername: 'Elara',
      }),
    ).toBe('Mira was demoted to Trader by Elara.');
  });

  it('describes both sides of a leadership transfer', () => {
    expect(
      formatTradeAllianceLeadershipTransferredMessage({
        nextLeaderUsername: 'Mira',
        previousLeaderUsername: 'Elara',
        previousLeaderNextRole: 'quartermaster',
      }),
    ).toBe(
      'Mira was promoted to Trade Master by Elara; Elara was demoted to Quartermaster.',
    );
  });

  it('wires every membership and moderation reducer to its system event', () => {
    const reducerSource = readFileSync(
      new URL('./index.ts', import.meta.url),
      'utf8',
    );
    const reducerBody = (name: string, nextName: string) =>
      reducerSource.slice(
        reducerSource.indexOf(`export const ${name} =`),
        reducerSource.indexOf(`export const ${nextName} =`),
      );

    expect(
      reducerBody('create_trade_alliance', 'update_trade_alliance_profile'),
    ).toContain('formatTradeAllianceFoundedMessage');
    expect(
      reducerBody('join_trade_alliance', 'apply_trade_alliance'),
    ).toContain('formatTradeAllianceJoinedMessage');
    expect(
      reducerBody(
        'accept_trade_alliance_application',
        'reject_trade_alliance_application',
      ),
    ).toContain('formatTradeAllianceApprovedMessage');
    expect(
      reducerBody('leave_trade_alliance', 'transfer_trade_alliance_leadership'),
    ).toContain('formatTradeAllianceLeftMessage');
    expect(
      reducerBody(
        'transfer_trade_alliance_leadership',
        'set_trade_alliance_member_role',
      ),
    ).toContain('formatTradeAllianceLeadershipTransferredMessage');
    expect(
      reducerBody(
        'set_trade_alliance_member_role',
        'kick_trade_alliance_member',
      ),
    ).toContain('formatTradeAllianceRoleChangedMessage');
    expect(
      reducerBody(
        'kick_trade_alliance_member',
        'send_trade_alliance_chat_message',
      ),
    ).toContain('formatTradeAllianceKickedMessage');
  });

  it('stores the announced player identity for system-message player links', () => {
    const reducerSource = readFileSync(
      new URL('./index.ts', import.meta.url),
      'utf8',
    );
    const reducerBody = (name: string, nextName: string) =>
      reducerSource.slice(
        reducerSource.indexOf(`export const ${name} =`),
        reducerSource.indexOf(`export const ${nextName} =`),
      );

    expect(reducerSource).toContain('senderIdentity: subjectIdentity');
    expect(
      reducerBody(
        'accept_trade_alliance_application',
        'reject_trade_alliance_application',
      ),
    ).toContain('application.applicantIdentity');
    expect(
      reducerBody(
        'transfer_trade_alliance_leadership',
        'set_trade_alliance_member_role',
      ),
    ).toContain('target.memberIdentity');
    expect(
      reducerBody(
        'set_trade_alliance_member_role',
        'kick_trade_alliance_member',
      ),
    ).toContain('target.memberIdentity');
    expect(
      reducerBody(
        'kick_trade_alliance_member',
        'send_trade_alliance_chat_message',
      ),
    ).toContain('target.memberIdentity');
  });
});
