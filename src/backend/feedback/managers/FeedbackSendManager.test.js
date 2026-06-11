import { describe, expect, it, vi } from 'vitest';

import { FeedbackSendManager } from './FeedbackSendManager.js';

describe('FeedbackSendManager', () => {
  it('normalizes and sends feedback through the generated reducer', async () => {
    const submitFeedback = vi.fn().mockResolvedValue(undefined);
    const manager = new FeedbackSendManager();

    manager.connect({
      reducers: {
        submitFeedback,
      },
    });

    await expect(manager.submitFeedback('  first line\r\nsecond line  ')).resolves.toEqual({
      ok: true,
      body: 'first line\nsecond line',
    });
    expect(submitFeedback).toHaveBeenCalledWith({
      body: 'first line\nsecond line',
    });
  });

  it('fails softly when offline or empty', async () => {
    const manager = new FeedbackSendManager();

    await expect(manager.submitFeedback('')).resolves.toEqual({
      ok: false,
      reason: 'empty_feedback',
    });
    await expect(manager.submitFeedback('needs work')).resolves.toEqual({
      ok: false,
      reason: 'offline',
    });
  });
});
