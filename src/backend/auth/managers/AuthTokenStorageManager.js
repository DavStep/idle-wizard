import { AuthNativeTokenStorageManager } from './AuthNativeTokenStorageManager.js';

const TOKEN_KEY = 'idle-wizard.spacetimedb.token';

function getDefaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export class AuthTokenStorageManager {
  constructor({
    storage = getDefaultStorage(),
    nativeStorageManager = new AuthNativeTokenStorageManager(),
  } = {}) {
    this.storage = storage;
    this.nativeStorageManager = nativeStorageManager;
    this.cachedToken = this.readStoredToken();
  }

  loadToken() {
    return this.readStoredToken() ?? this.cachedToken ?? undefined;
  }

  async loadConnectionAuth() {
    const storedToken = this.readStoredToken();
    const nativeToken = await this.nativeStorageManager?.loadToken?.();
    const token = storedToken ?? nativeToken ?? undefined;
    const fallbackTokens = this.uniqueTokens([nativeToken, storedToken]).filter(
      (candidate) => candidate !== token,
    );

    if (token) {
      this.cachedToken = token;
    }

    if (nativeToken && !storedToken) {
      this.saveStoredToken(nativeToken);
    }

    if (storedToken && !nativeToken) {
      void this.nativeStorageManager?.saveToken?.(storedToken);
    }

    return {
      token,
      fallbackTokens,
    };
  }

  saveToken(token) {
    const normalizedToken = this.normalizeToken(token);
    if (!normalizedToken) {
      return Promise.resolve(false);
    }

    this.cachedToken = normalizedToken;
    const stored = this.saveStoredToken(normalizedToken);
    return Promise.resolve(this.nativeStorageManager?.saveToken?.(normalizedToken))
      .then((nativeStored) => Boolean(stored || nativeStored))
      .catch(() => stored);
  }

  clearToken() {
    this.cachedToken = undefined;
    this.clearStoredToken();
    return Promise.resolve(this.nativeStorageManager?.clearToken?.())
      .then((nativeCleared) => Boolean(nativeCleared))
      .catch(() => false);
  }

  readStoredToken() {
    try {
      return this.normalizeToken(this.storage?.getItem?.(TOKEN_KEY));
    } catch {
      return undefined;
    }
  }

  saveStoredToken(token) {
    if (!this.storage?.setItem) {
      return false;
    }

    try {
      this.storage.setItem(TOKEN_KEY, token);
      return true;
    } catch {
      return false;
    }
  }

  clearStoredToken() {
    try {
      this.storage?.removeItem?.(TOKEN_KEY);
    } catch {
      // Best effort only. Native storage is cleared separately.
    }
  }

  normalizeToken(token) {
    const normalizedToken = String(token ?? '').trim();
    return normalizedToken || undefined;
  }

  uniqueTokens(tokens) {
    return Array.from(new Set(tokens.map((token) => this.normalizeToken(token)).filter(Boolean)));
  }
}
