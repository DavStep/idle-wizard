import { describe, expect, it, vi } from 'vitest';

import {
  AppLiveUpdateManager,
  compareVersions,
} from './AppLiveUpdateManager.js';

const MANIFEST_URL = 'https://davstep.github.io/idle-wizard/ota/latest.json';

function createManifest(overrides = {}) {
  return {
    schemaVersion: 1,
    appId: 'com.idlewizard.game',
    version: '0.3.49',
    minimumNativeVersion: '0.3.48',
    platforms: ['android'],
    bundleUrl:
      'https://davstep.github.io/idle-wizard/ota/bundles/idle-wizard-0.3.49.zip',
    checksum: 'a'.repeat(64),
    ...overrides,
  };
}

function createUpdater(overrides = {}) {
  return {
    notifyAppReady: vi.fn(() => Promise.resolve({})),
    current: vi.fn(() =>
      Promise.resolve({
        native: '0.3.48',
        bundle: { id: 'builtin', version: '0.3.48', status: 'success' },
      }),
    ),
    list: vi.fn(() => Promise.resolve({ bundles: [] })),
    download: vi.fn(() =>
      Promise.resolve({ id: 'downloaded-1', version: '0.3.49', status: 'success' }),
    ),
    setMultiDelay: vi.fn(() => Promise.resolve()),
    next: vi.fn(() => Promise.resolve({})),
    ...overrides,
  };
}

function createManager({ manifest = createManifest(), updater, ...overrides } = {}) {
  return new AppLiveUpdateManager({
    enabled: true,
    manifestUrl: MANIFEST_URL,
    fetchRef: vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(manifest),
      }),
    ),
    updaterPlugin: updater ?? createUpdater(),
    isNativePlatform: () => true,
    getPlatform: () => 'android',
    now: () => 123,
    ...overrides,
  });
}

describe('AppLiveUpdateManager', () => {
  it('marks the active bundle ready before checking for and staging an update', async () => {
    const events = [];
    const updater = createUpdater({
      notifyAppReady: vi.fn(() => {
        events.push('ready');
        return Promise.resolve({});
      }),
      current: vi.fn(() => {
        events.push('current');
        return Promise.resolve({
          native: '0.3.48',
          bundle: { id: 'builtin', version: '0.3.48', status: 'success' },
        });
      }),
    });
    const manager = createManager({ updater });

    await expect(manager.start()).resolves.toEqual({
      status: 'staged',
      version: '0.3.49',
    });

    expect(events).toEqual(['ready', 'current']);
    expect(updater.download).toHaveBeenCalledWith({
      url: createManifest().bundleUrl,
      version: '0.3.49',
      checksum: 'a'.repeat(64),
    });
    expect(updater.setMultiDelay).toHaveBeenCalledWith({
      delayConditions: [{ kind: 'background', value: '300000' }],
    });
    expect(updater.next).toHaveBeenCalledWith({ id: 'downloaded-1' });
    expect(
      updater.setMultiDelay.mock.invocationCallOrder[0],
    ).toBeLessThan(updater.next.mock.invocationCallOrder[0]);
  });

  it('lets the app mark a launched OTA bundle ready before heavy startup work', async () => {
    const updater = createUpdater();
    const manager = createManager({ updater });

    await expect(manager.notifyAppReady()).resolves.toEqual({});
    await expect(manager.notifyAppReady()).resolves.toEqual({});

    expect(updater.notifyAppReady).toHaveBeenCalledOnce();
    expect(updater.current).not.toHaveBeenCalled();

    await manager.start();

    expect(updater.notifyAppReady).toHaveBeenCalledOnce();
    expect(updater.current).toHaveBeenCalledOnce();
  });

  it('retries marking the app ready after a transient native plugin failure', async () => {
    const updater = createUpdater({
      notifyAppReady: vi.fn()
        .mockRejectedValueOnce(new Error('bridge not ready'))
        .mockResolvedValueOnce({}),
    });
    const manager = createManager({ updater });

    await expect(manager.notifyAppReady()).rejects.toThrow('bridge not ready');
    await expect(manager.notifyAppReady()).resolves.toEqual({});

    expect(updater.notifyAppReady).toHaveBeenCalledTimes(2);
  });

  it('does nothing in a browser build', async () => {
    const updater = createUpdater();
    const manager = createManager({
      updater,
      isNativePlatform: () => false,
    });

    await expect(manager.start()).resolves.toEqual({ status: 'disabled' });
    expect(updater.notifyAppReady).not.toHaveBeenCalled();
  });

  it('rejects bundles that require a newer native APK', async () => {
    const updater = createUpdater();
    const manager = createManager({
      manifest: createManifest({ minimumNativeVersion: '0.3.50' }),
      updater,
    });

    await expect(manager.start()).resolves.toEqual({
      status: 'native_update_required',
      minimumNativeVersion: '0.3.50',
    });
    expect(updater.download).not.toHaveBeenCalled();
  });

  it('does not retry a bundle already marked as failed', async () => {
    const updater = createUpdater({
      list: vi.fn(() =>
        Promise.resolve({
          bundles: [
            { id: 'failed-1', version: '0.3.49', status: 'error' },
          ],
        }),
      ),
    });
    const manager = createManager({ updater });

    await expect(manager.start()).resolves.toEqual({
      status: 'failed_bundle',
      version: '0.3.49',
    });
    expect(updater.download).not.toHaveBeenCalled();
  });

  it('does not stage an update when the background grace cannot be configured', async () => {
    const updater = createUpdater({
      setMultiDelay: vi.fn(() => Promise.reject(new Error('delay unavailable'))),
    });
    const manager = createManager({ updater });

    await expect(manager.start()).resolves.toEqual({ status: 'unavailable' });

    expect(updater.next).not.toHaveBeenCalled();
  });

  it('rejects untrusted bundle locations and malformed checksums', () => {
    const manager = createManager();

    expect(
      manager.normalizeManifest(
        createManifest({ bundleUrl: 'https://example.test/update.zip' }),
      ),
    ).toBeNull();
    expect(
      manager.normalizeManifest(createManifest({ checksum: 'not-a-hash' })),
    ).toBeNull();
  });

  it('uses a cache-busting manifest request', async () => {
    const fetchRef = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(createManifest()) }),
    );
    const manager = createManager({ fetchRef });

    await manager.fetchManifest();

    expect(fetchRef).toHaveBeenCalledWith(`${MANIFEST_URL}?_=123`, {
      cache: 'no-store',
    });
  });
});

describe('compareVersions', () => {
  it('compares three-part release versions', () => {
    expect(compareVersions('0.3.48', '0.3.49')).toBe(-1);
    expect(compareVersions('0.3.49', '0.3.49')).toBe(0);
    expect(compareVersions('0.4.0', '0.3.999')).toBe(1);
  });
});
