import { describe, expect, it } from 'vitest';

import { getChatFailureReason } from './chatFailureReasons.js';

describe('getChatFailureReason', () => {
  it('reads reducer errors from nested transport shapes', () => {
    expect(
      getChatFailureReason({
        error: {
          message: 'World chat unlocks at level 3.',
        },
      }),
    ).toBe('chat_locked');
    expect(
      getChatFailureReason({
        details: {
          text: 'World chat is globally rate limited.',
        },
      }),
    ).toBe('global_rate_limited');
    expect(
      getChatFailureReason({
        cause: new Error('Account is open on another device.'),
      }),
    ).toBe('account_in_use');
  });

  it('keeps unknown errors generic', () => {
    expect(getChatFailureReason({ message: 'Unexpected reducer failure.' })).toBe(
      'send_failed',
    );
  });
});
