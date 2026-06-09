export class AuthSessionManager {
  constructor({ tokenStorageManager }) {
    this.tokenStorageManager = tokenStorageManager;
    this.identity = undefined;
  }

  getConnectionToken() {
    return this.tokenStorageManager.loadToken();
  }

  acceptConnection({ identity, token }) {
    this.identity = identity;
    this.tokenStorageManager.saveToken(token);
  }

  clearSession() {
    this.identity = undefined;
    this.tokenStorageManager.clearToken();
  }

  getSnapshot() {
    return {
      hasToken: Boolean(this.getConnectionToken()),
      identity: this.identity,
    };
  }
}
