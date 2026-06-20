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

  it('waits for player level sync before sending', async () => {
    let finishBeforeSend;
    const beforeSendMessage = vi.fn(
      () =>
        new Promise((resolve) => {
          finishBeforeSend = resolve;
        }),
    );
    const sendWorldChatMessage = vi.fn().mockResolvedValue(undefined);
    const manager = new WorldChatSendManager({ beforeSendMessage });

    manager.connect({
      reducers: {
        sendWorldChatMessage,
      },
    });

    const send = manager.sendMessage('hello');
    await Promise.resolve();

    expect(beforeSendMessage).toHaveBeenCalledTimes(1);
    expect(sendWorldChatMessage).not.toHaveBeenCalled();

    finishBeforeSend(true);

    await expect(send).resolves.toEqual({
      ok: true,
      body: 'hello',
    });
    expect(sendWorldChatMessage).toHaveBeenCalledWith({ body: 'hello' });
  });

  it('does not send while player level sync is still blocked', async () => {
    const sendWorldChatMessage = vi.fn().mockResolvedValue(undefined);
    const manager = new WorldChatSendManager({
      beforeSendMessage: vi.fn().mockResolvedValue(false),
    });

    manager.connect({
      reducers: {
        sendWorldChatMessage,
      },
    });

    await expect(manager.sendMessage('hello')).resolves.toEqual({
      ok: false,
      reason: 'chat_locked',
    });
    expect(sendWorldChatMessage).not.toHaveBeenCalled();
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
      .mockRejectedValueOnce(new Error('World chat is globally rate limited.'))
      .mockRejectedValueOnce(new Error('World chat is rate-limited.'));
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
    await expect(manager.sendMessage('third')).resolves.toEqual({
      ok: false,
      reason: 'rate_limited',
    });
  });

  it('returns known send failure reasons from reducer errors', async () => {
    const sendWorldChatMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error('World chat unlocks at level 3.'))
      .mockRejectedValueOnce(new Error('Account is open on another device.'))
      .mockRejectedValueOnce(new Error('Server maintenance is active.'))
      .mockRejectedValueOnce(new Error('WebSocket connection closed.'))
      .mockRejectedValueOnce(new Error('Unexpected reducer failure.'));
    const manager = new WorldChatSendManager();

    manager.connect({
      reducers: {
        sendWorldChatMessage,
      },
    });

    await expect(manager.sendMessage('locked')).resolves.toEqual({
      ok: false,
      reason: 'chat_locked',
    });
    await expect(manager.sendMessage('elsewhere')).resolves.toEqual({
      ok: false,
      reason: 'account_in_use',
    });
    await expect(manager.sendMessage('maintenance')).resolves.toEqual({
      ok: false,
      reason: 'maintenance',
    });
    await expect(manager.sendMessage('offline')).resolves.toEqual({
      ok: false,
      reason: 'offline',
    });
    await expect(manager.sendMessage('unknown')).resolves.toEqual({
      ok: false,
      reason: 'send_failed',
    });
  });
});
