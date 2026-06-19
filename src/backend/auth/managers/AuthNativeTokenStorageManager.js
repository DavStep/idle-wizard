import { Capacitor } from '@capacitor/core';

import { NativeAuthTokenStoragePlugin } from '../nativeAuthTokenStoragePlugin.js';

export class AuthNativeTokenStorageManager {
  constructor({
    plugin = NativeAuthTokenStoragePlugin,
    isNativePlatform = () => Capacitor.isNativePlatform(),
    isPluginAvailable = () => Capacitor.isPluginAvailable('NativeAuthTokenStorage'),
  } = {}) {
    this.plugin = plugin;
    this.isNativePlatform = isNativePlatform;
    this.isPluginAvailable = isPluginAvailable;
  }

  async loadToken() {
    if (!this.isAvailable()) {
      return undefined;
    }

    try {
      const result = await this.plugin.getToken();
      return this.normalizeToken(result?.token);
    } catch {
      return undefined;
    }
  }

  async saveToken(token) {
    const normalizedToken = this.normalizeToken(token);
    if (!normalizedToken || !this.isAvailable()) {
      return false;
    }

    try {
      await this.plugin.setToken({ token: normalizedToken });
      return true;
    } catch {
      return false;
    }
  }

  async clearToken() {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.plugin.clearToken();
      return true;
    } catch {
      return false;
    }
  }

  isAvailable() {
    try {
      return Boolean(this.isNativePlatform?.() && this.isPluginAvailable?.());
    } catch {
      return false;
    }
  }

  normalizeToken(token) {
    const normalizedToken = String(token ?? '').trim();
    return normalizedToken || undefined;
  }
}
