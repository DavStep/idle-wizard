import { AuthSessionManager } from './managers/AuthSessionManager.js';
import { AuthOidcManager } from './managers/AuthOidcManager.js';
import { AuthTokenStorageManager } from './managers/AuthTokenStorageManager.js';
import { AuthAccountLinkSaveManager } from './managers/AuthAccountLinkSaveManager.js';

export class AuthFacade {
  static explain =
    'Remembers who the player connected as, so a return visit can keep the same server identity.';

  constructor() {
    this.tokenStorageManager = new AuthTokenStorageManager();
    this.accountLinkSaveManager = new AuthAccountLinkSaveManager();
    this.oidcManager = new AuthOidcManager();
    this.sessionManager = new AuthSessionManager({
      tokenStorageManager: this.tokenStorageManager,
      oidcManager: this.oidcManager,
    });
  }

  prepare() {
    return this.sessionManager.prepare();
  }

  stop() {
    this.sessionManager.stop?.();
  }

  getSessionManager() {
    return this.sessionManager;
  }

  getSnapshot() {
    return this.sessionManager.getSnapshot();
  }

  subscribe(listener) {
    return this.sessionManager.subscribe(listener);
  }

  signInWithGoogle({ pendingGameplaySave } = {}) {
    let pendingAccountLinkSave = null;
    if (pendingGameplaySave) {
      pendingAccountLinkSave =
        this.accountLinkSaveManager.savePendingSave(pendingGameplaySave);
      if (!pendingAccountLinkSave) {
        return Promise.resolve({
          ok: false,
          reason: 'pending_save_failed',
          message: 'could not save device data',
        });
      }
    }

    return Promise.resolve(
      this.sessionManager.signInWithGoogle({
        pendingAccountLinkAttemptId: pendingAccountLinkSave?.attemptId ?? null,
      }),
    ).then((result) => {
      if (pendingAccountLinkSave && result?.ok === false) {
        this.accountLinkSaveManager.clearPendingSave();
      }

      return result;
    });
  }

  signOut() {
    this.accountLinkSaveManager.clearPendingSave();
    return this.sessionManager.signOut();
  }

  getPendingAccountLinkSave() {
    return this.accountLinkSaveManager.loadPendingSave({
      attemptId: this.sessionManager.getAccountLinkAttemptId?.() ?? null,
    });
  }

  clearPendingAccountLinkSave() {
    this.accountLinkSaveManager.clearPendingSave();
  }
}
