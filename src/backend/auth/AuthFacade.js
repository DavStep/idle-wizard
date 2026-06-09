import { AuthSessionManager } from './managers/AuthSessionManager.js';
import { AuthTokenStorageManager } from './managers/AuthTokenStorageManager.js';

export class AuthFacade {
  static explain =
    'Remembers who the player connected as, so a return visit can keep the same server identity.';

  constructor() {
    this.tokenStorageManager = new AuthTokenStorageManager();
    this.sessionManager = new AuthSessionManager({
      tokenStorageManager: this.tokenStorageManager,
    });
  }

  prepare() {
    return this.sessionManager.getSnapshot();
  }

  getSessionManager() {
    return this.sessionManager;
  }
}
