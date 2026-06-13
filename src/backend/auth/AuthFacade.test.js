import { describe, expect, it, vi } from 'vitest';

import { AuthFacade } from './AuthFacade.js';

describe('AuthFacade', () => {
  it('does not start Google login when device save cannot be stashed', async () => {
    const facade = new AuthFacade();
    facade.accountLinkSaveManager = {
      savePendingSave: vi.fn(() => false),
      clearPendingSave: vi.fn(),
    };
    facade.sessionManager = {
      signInWithGoogle: vi.fn(),
    };

    await expect(
      facade.signInWithGoogle({ pendingGameplaySave: { version: 1 } }),
    ).resolves.toEqual({
      ok: false,
      reason: 'pending_save_failed',
      message: 'could not save device data',
    });
    expect(facade.sessionManager.signInWithGoogle).not.toHaveBeenCalled();
  });

  it('clears a pending device save when Google login fails', async () => {
    const facade = new AuthFacade();
    facade.accountLinkSaveManager = {
      savePendingSave: vi.fn(() => ({ attemptId: 'attempt-1' })),
      clearPendingSave: vi.fn(),
    };
    facade.sessionManager = {
      signInWithGoogle: vi.fn(() =>
        Promise.resolve({ ok: false, reason: 'web_cancelled' }),
      ),
    };

    await facade.signInWithGoogle({ pendingGameplaySave: { version: 1 } });

    expect(facade.sessionManager.signInWithGoogle).toHaveBeenCalledWith({
      pendingAccountLinkAttemptId: 'attempt-1',
    });
    expect(facade.accountLinkSaveManager.clearPendingSave).toHaveBeenCalledTimes(1);
  });

  it('clears pending device save on sign out', async () => {
    const facade = new AuthFacade();
    facade.accountLinkSaveManager = {
      clearPendingSave: vi.fn(),
    };
    facade.sessionManager = {
      signOut: vi.fn(() => Promise.resolve({ ok: true })),
    };

    await expect(facade.signOut()).resolves.toEqual({ ok: true });

    expect(facade.accountLinkSaveManager.clearPendingSave).toHaveBeenCalledTimes(1);
  });

  it('loads pending account-link saves only for the current auth attempt', () => {
    const facade = new AuthFacade();
    facade.accountLinkSaveManager = {
      loadPendingSave: vi.fn(() => ({ version: 1 })),
    };
    facade.sessionManager = {
      getAccountLinkAttemptId: vi.fn(() => 'attempt-1'),
    };

    expect(facade.getPendingAccountLinkSave()).toEqual({ version: 1 });
    expect(facade.accountLinkSaveManager.loadPendingSave).toHaveBeenCalledWith({
      attemptId: 'attempt-1',
    });
  });
});
