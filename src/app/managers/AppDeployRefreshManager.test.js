// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { AppDeployRefreshManager } from './AppDeployRefreshManager.js';

function createWindowRef() {
  return {
    fetch: vi.fn(),
    location: {
      href: 'https://example.test/idle-wizard/',
      reload: vi.fn(),
    },
    setInterval: vi.fn(() => 7),
    clearInterval: vi.fn(),
    setTimeout: vi.fn((callback) => {
      callback();
      return 9;
    }),
    clearTimeout: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

async function flushAsyncWork() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

describe('AppDeployRefreshManager', () => {
  it('blocks the stage and reloads after the deploy version changes', async () => {
    const stage = document.createElement('section');
    const windowRef = createWindowRef();
    const fetchVersion = vi
      .fn()
      .mockResolvedValueOnce({ version: 'old-build' })
      .mockResolvedValueOnce({ version: 'new-build' });
    const manager = new AppDeployRefreshManager({
      enabled: true,
      currentVersion: null,
      fetchVersion,
      reloadDelayMs: 0,
      windowRef,
    });

    manager.mount(stage);
    await flushAsyncWork();
    await manager.checkNow();
    await flushAsyncWork();

    const gate = stage.querySelector('.app-deploy-refresh');
    expect(gate.hidden).toBe(false);
    expect(gate.textContent).toContain('new version');
    expect(gate.textContent).toContain('refreshing...');
    expect(windowRef.location.reload).toHaveBeenCalledTimes(1);

    manager.unmount();
  });

  it('reloads on the first check when the bundled version is stale', async () => {
    const stage = document.createElement('section');
    const windowRef = createWindowRef();
    const manager = new AppDeployRefreshManager({
      enabled: true,
      currentVersion: 'old-build',
      fetchVersion: vi.fn().mockResolvedValueOnce({ version: 'new-build' }),
      reloadDelayMs: 0,
      windowRef,
    });

    manager.mount(stage);
    await flushAsyncWork();

    expect(stage.querySelector('.app-deploy-refresh').hidden).toBe(false);
    expect(windowRef.location.reload).toHaveBeenCalledTimes(1);

    manager.unmount();
  });

  it('flushes a save before reload', async () => {
    const stage = document.createElement('section');
    const windowRef = createWindowRef();
    const events = [];
    windowRef.location.reload = vi.fn(() => events.push('reload'));
    const manager = new AppDeployRefreshManager({
      enabled: true,
      currentVersion: 'old-build',
      fetchVersion: vi.fn().mockResolvedValueOnce({ version: 'new-build' }),
      reloadDelayMs: 0,
      beforeReload: vi.fn(() => {
        events.push('save');
        return Promise.resolve();
      }),
      windowRef,
    });

    manager.mount(stage);
    await flushAsyncWork();

    expect(events).toEqual(['save', 'reload']);

    manager.unmount();
  });

  it('does not reload when the final save flush fails', async () => {
    const stage = document.createElement('section');
    const windowRef = createWindowRef();
    const manager = new AppDeployRefreshManager({
      enabled: true,
      currentVersion: 'old-build',
      fetchVersion: vi.fn().mockResolvedValueOnce({ version: 'new-build' }),
      reloadDelayMs: 0,
      beforeReload: vi.fn(() => false),
      windowRef,
    });

    manager.mount(stage);
    await flushAsyncWork();

    expect(stage.querySelector('.app-deploy-refresh').hidden).toBe(true);
    expect(windowRef.location.reload).not.toHaveBeenCalled();

    manager.unmount();
  });

  it('fetches the deploy version without cache', async () => {
    const windowRef = createWindowRef();
    windowRef.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ version: 'build-1' }),
    });
    const manager = new AppDeployRefreshManager({
      enabled: true,
      endpoint: '/deploy-version.json',
      windowRef,
    });

    const version = await manager.fetchEndpointVersion();

    expect(version).toEqual({ version: 'build-1' });
    expect(windowRef.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = windowRef.fetch.mock.calls[0];
    expect(url).toMatch(/^https:\/\/example\.test\/deploy-version\.json\?_/);
    expect(options).toEqual({ cache: 'no-store' });
  });
});
