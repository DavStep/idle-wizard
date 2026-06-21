import { describe, expect, it, vi } from 'vitest';

import { TradeAllianceActionManager } from './TradeAllianceActionManager.js';

describe('TradeAllianceActionManager', () => {
  it('normalizes and sends alliance chat messages through the reducer', async () => {
    const sendTradeAllianceChatMessage = vi.fn().mockResolvedValue(undefined);
    const manager = new TradeAllianceActionManager();

    manager.connect({
      reducers: {
        sendTradeAllianceChatMessage,
      },
    });

    await expect(manager.sendChatMessage('  hello   alliance  ')).resolves.toEqual({
      ok: true,
    });
    expect(sendTradeAllianceChatMessage).toHaveBeenCalledWith({
      body: 'hello alliance',
    });
  });

  it('fails softly when alliance chat is offline or empty', async () => {
    const manager = new TradeAllianceActionManager();

    await expect(manager.sendChatMessage('')).resolves.toEqual({
      ok: false,
      reason: 'empty_message',
    });
    await expect(manager.sendChatMessage('hello')).resolves.toEqual({
      ok: false,
      reason: 'offline',
    });
  });

  it('returns known alliance chat failure reasons from reducer errors', async () => {
    const sendTradeAllianceChatMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error('Alliance chat is globally rate limited.'))
      .mockRejectedValueOnce(new Error('Alliance chat requires membership.'))
      .mockRejectedValueOnce(new Error('Server maintenance is active.'));
    const manager = new TradeAllianceActionManager();

    manager.connect({
      reducers: {
        sendTradeAllianceChatMessage,
      },
    });

    await expect(manager.sendChatMessage('first')).resolves.toEqual({
      ok: false,
      reason: 'global_rate_limited',
    });
    await expect(manager.sendChatMessage('second')).resolves.toEqual({
      ok: false,
      reason: 'no_alliance',
    });
    await expect(manager.sendChatMessage('third')).resolves.toEqual({
      ok: false,
      reason: 'maintenance',
    });
  });
});
