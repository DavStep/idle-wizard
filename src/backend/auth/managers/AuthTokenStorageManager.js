const TOKEN_KEY = 'idle-wizard.spacetimedb.token';

export class AuthTokenStorageManager {
  constructor({ storage = localStorage } = {}) {
    this.storage = storage;
  }

  loadToken() {
    return this.storage.getItem(TOKEN_KEY) || undefined;
  }

  saveToken(token) {
    if (!token) {
      return;
    }

    this.storage.setItem(TOKEN_KEY, token);
  }

  clearToken() {
    this.storage.removeItem(TOKEN_KEY);
  }
}
