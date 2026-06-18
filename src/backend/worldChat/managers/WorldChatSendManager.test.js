import { describe, expect, it, vi } from 'vitest';

import { WorldChatSendManager } from './WorldChatSendManager.js';

describe('WorldChatSendManager', () => {
  it('normalizes and sends messages through the generated reducer', async () => {
    const sendWorldChatMessage = vi.fn().mockResolvedValue(undefined);
    const manager = new WorldChatSendManager();

    manager.connect({
      reducers: {
        sendWorldChatMessage,
      },
    });

    await expect(manager.sendMessage('  hello   world  ')).resolves.toEqual({
      ok: true,
      body: 'hello world',
    });
    expect(sendWorldChatMessage).toHaveBeenCalledWith({ body: 'hello world' });
  });

  it('fails softly when offline or empty', async () => {
    const manager = new WorldChatSendManager();

    await expect(manager.sendMessage('')).resolves.toEqual({
      ok: false,
      reason: 'empty_message',
    });
    await expect(manager.sendMessage('hello')).resolves.toEqual({
      ok: false,
      reason: 'offline',
    });
  });

  it('returns rate-limit reasons from rejected reducer calls', async () => {
    const sendWorldChatMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error('World chat is rate limited.'))
      .mockRejectedValueOnce(new Error('World chat is globally rate limited.'));
    const manager = new WorldChatSendManager();

    manager.connect({
      reducers: {
        sendWorldChatMessage,
      },
    });

    await expect(manager.sendMessage('first')).resolves.toEqual({
      ok: false,
      reason: 'rate_limited',
    });
    await expect(manager.sendMessage('second')).resolves.toEqual({
      ok: false,
      reason: 'global_rate_limited',
    });
  });
});
