import { AuthSessionManager } from './managers/AuthSessionManager.js';
import { AuthOidcManager } from './managers/AuthOidcManager.js';
import { AuthTokenStorageManager } from './managers/AuthTokenStorageManager.js';

export class AuthFacade {
  static explain =
    'Remembers who the player connected as, so a return visit can keep the same server identity.';

  constructor() {
    this.tokenStorageManager = new AuthTokenStorageManager();
    this.oidcManager = new AuthOidcManager();
    this.sessionManager = new AuthSessionManager({
      tokenStorageManager: this.tokenStorageManager,
      oidcManager: this.oidcManager,
    });
  }

  prepare() {
    return this.sessionManager.prepare();
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

  signInWithGoogle() {
    return this.sessionManager.signInWithGoogle();
  }

  signOut() {
    return this.sessionManager.signOut();
  }
}
