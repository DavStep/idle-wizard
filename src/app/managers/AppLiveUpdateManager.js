import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

import { UPDATE_BACKGROUND_GRACE_MS } from '../../shared/updatePolicy.js';

const DEFAULT_MANIFEST_URL =
  import.meta.env.VITE_OTA_MANIFEST_URL ??
  'https://davstep.github.io/idle-wizard/ota/latest.json';
const DEFAULT_ENABLED = import.meta.env.PROD;
const DEFAULT_APP_ID = 'com.idlewizard.game';
const SHA_256_PATTERN = /^[a-f0-9]{64}$/i;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export class AppLiveUpdateManager {
  constructor({
    appId = DEFAULT_APP_ID,
    enabled = DEFAULT_ENABLED,
    manifestUrl = DEFAULT_MANIFEST_URL,
    fetchRef = globalThis.fetch?.bind(globalThis),
    updaterPlugin = CapacitorUpdater,
    isNativePlatform = () => Capacitor.isNativePlatform(),
    getPlatform = () => Capacitor.getPlatform(),
    now = () => Date.now(),
  } = {}) {
    this.appId = appId;
    this.enabled = enabled;
    this.manifestUrl = manifestUrl;
    this.fetchRef = fetchRef;
    this.updaterPlugin = updaterPlugin;
    this.isNativePlatform = isNativePlatform;
    this.getPlatform = getPlatform;
    this.now = now;
    this.appReadyPromise = null;
    this.startPromise = null;
  }

  notifyAppReady() {
    if (!this.enabled || !this.isNativePlatform()) {
      return Promise.resolve({ status: 'disabled' });
    }

    if (this.appReadyPromise) {
      return this.appReadyPromise;
    }

    this.appReadyPromise = this.updaterPlugin.notifyAppReady().catch((error) => {
      this.appReadyPromise = null;
      throw error;
    });
    return this.appReadyPromise;
  }

  start() {
    if (this.startPromise) {
      return this.startPromise;
    }

    this.startPromise = this.startOnce();
    return this.startPromise;
  }

  async startOnce() {
    if (!this.enabled || !this.isNativePlatform()) {
      return { status: 'disabled' };
    }

    await this.notifyAppReady();
    return this.checkForUpdate();
  }

  async checkForUpdate() {
    try {
      const manifest = this.normalizeManifest(await this.fetchManifest());
      if (!manifest) {
        return { status: 'invalid_manifest' };
      }

      const platform = this.getPlatform();
      if (!manifest.platforms.includes(platform)) {
        return { status: 'unsupported_platform' };
      }

      const current = await this.updaterPlugin.current();
      if (compareVersions(current.native, manifest.minimumNativeVersion) < 0) {
        return {
          status: 'native_update_required',
          minimumNativeVersion: manifest.minimumNativeVersion,
        };
      }

      const currentVersion = normalizeVersion(current.bundle?.version) ?? current.native;
      if (compareVersions(currentVersion, manifest.version) >= 0) {
        return { status: 'up_to_date', version: currentVersion };
      }

      const bundles = (await this.updaterPlugin.list()).bundles ?? [];
      const existingBundle = bundles.find(
        (bundle) => bundle.version === manifest.version,
      );

      if (existingBundle?.status === 'error') {
        return { status: 'failed_bundle', version: manifest.version };
      }

      const bundle =
        existingBundle?.status === 'success' || existingBundle?.status === 'pending'
          ? existingBundle
          : await this.updaterPlugin.download({
              url: manifest.bundleUrl,
              version: manifest.version,
              checksum: manifest.checksum,
            });

      await this.updaterPlugin.setMultiDelay({
        delayConditions: [
          {
            kind: 'background',
            value: String(UPDATE_BACKGROUND_GRACE_MS),
          },
        ],
      });
      await this.updaterPlugin.next({ id: bundle.id });
      return { status: 'staged', version: manifest.version };
    } catch {
      return { status: 'unavailable' };
    }
  }

  async fetchManifest() {
    if (!this.fetchRef) {
      return null;
    }

    const url = new URL(this.manifestUrl);
    url.searchParams.set('_', String(this.now()));
    const response = await this.fetchRef(url.toString(), { cache: 'no-store' });
    return response.ok ? response.json() : null;
  }

  normalizeManifest(payload) {
    if (
      !payload ||
      payload.schemaVersion !== 1 ||
      payload.appId !== this.appId ||
      !VERSION_PATTERN.test(payload.version ?? '') ||
      !VERSION_PATTERN.test(payload.minimumNativeVersion ?? '') ||
      !SHA_256_PATTERN.test(payload.checksum ?? '') ||
      !Array.isArray(payload.platforms)
    ) {
      return null;
    }

    let bundleUrl;
    let trustedBundleRoot;
    try {
      bundleUrl = new URL(payload.bundleUrl);
      trustedBundleRoot = new URL('./bundles/', this.manifestUrl);
    } catch {
      return null;
    }

    if (
      bundleUrl.protocol !== 'https:' ||
      bundleUrl.origin !== trustedBundleRoot.origin ||
      !bundleUrl.pathname.startsWith(trustedBundleRoot.pathname)
    ) {
      return null;
    }

    return {
      appId: payload.appId,
      bundleUrl: bundleUrl.toString(),
      checksum: payload.checksum.toLowerCase(),
      minimumNativeVersion: payload.minimumNativeVersion,
      platforms: payload.platforms.filter(
        (platform) => typeof platform === 'string',
      ),
      version: payload.version,
    };
  }
}

export function compareVersions(left, right) {
  const leftParts = normalizeVersion(left)?.split('.').map(Number);
  const rightParts = normalizeVersion(right)?.split('.').map(Number);

  if (!leftParts || !rightParts) {
    return 0;
  }

  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] < rightParts[index] ? -1 : 1;
    }
  }

  return 0;
}

function normalizeVersion(version) {
  if (typeof version !== 'string') {
    return null;
  }

  const normalized = version.trim();
  return VERSION_PATTERN.test(normalized) ? normalized : null;
}
