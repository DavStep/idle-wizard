import { describe, expect, it, vi } from 'vitest';

import { TradeAllianceActionManager } from './TradeAllianceActionManager.js';

describe('TradeAllianceActionManager', () => {
  it('normalizes banner colors in alliance profile writes', async () => {
    const updateTradeAllianceProfile = vi.fn().mockResolvedValue(undefined);
    const manager = new TradeAllianceActionManager();
    manager.connect({ reducers: { updateTradeAllianceProfile } });

    await manager.updateProfile({
      name: '  Moon   Traders ',
      tag: ' moon ',
      tagColor: 'violet',
      bannerColor: 'RED',
      emblemColor: 'white',
      emblemId: 'OWL',
      joinMode: 'open',
    });

    expect(updateTradeAllianceProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Moon Traders',
        tag: 'MOON',
        bannerColor: 'red',
        emblemColor: 'white',
        emblemId: 'owl',
      }),
    );
  });

  it('sends a normalized join-mode change through its focused reducer', async () => {
    const setTradeAllianceJoinMode = vi.fn().mockResolvedValue(undefined);
    const manager = new TradeAllianceActionManager();
    manager.connect({ reducers: { setTradeAllianceJoinMode } });

    await expect(manager.setJoinMode('closed')).resolves.toEqual({ ok: true });
    expect(setTradeAllianceJoinMode).toHaveBeenCalledWith({
      joinMode: 'closed',
    });

    await manager.setJoinMode('unknown');
    expect(setTradeAllianceJoinMode).toHaveBeenLastCalledWith({
      joinMode: 'apply',
    });
  });

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
