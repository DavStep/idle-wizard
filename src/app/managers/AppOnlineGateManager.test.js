// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { AppOnlineGateManager } from './AppOnlineGateManager.js';

describe('AppOnlineGateManager', () => {
  it('blocks the stage with an online-required message', () => {
    const stage = document.createElement('section');
    const manager = new AppOnlineGateManager();

    manager.mount(stage);
    manager.showConnecting();

    const gate = stage.querySelector('.app-online-gate');
    expect(gate.hidden).toBe(false);
    expect(gate.textContent).toContain('server required');
    expect(gate.textContent).toContain('connecting to server...');
    const progress = gate.querySelector('.app-online-gate__progress');
    expect(progress.hidden).toBe(false);
    expect(progress.getAttribute('role')).toBe('progressbar');
    expect(progress.classList.contains('style-progress')).toBe(true);
    expect(progress.classList.contains('is-indeterminate')).toBe(true);
    expect(progress.querySelector('.app-online-gate__progress-fill')).not.toBeNull();

    manager.showOffline('connect_error');
    expect(gate.textContent).toContain('connecting to server...');
    expect(progress.hidden).toBe(false);

    manager.showOffline('gameplay_save_timeout');
    expect(gate.textContent).toContain('connecting to server...');
    expect(progress.hidden).toBe(false);

    manager.showOffline('gameplay_save_missing');
    expect(gate.textContent).toContain('server unavailable');
    expect(progress.hidden).toBe(true);
    expect(progress.classList.contains('is-indeterminate')).toBe(false);

    manager.showOffline('account_in_use');
    expect(gate.textContent).toContain('account opened on another device');
    expect(progress.hidden).toBe(true);

    manager.hide();
    expect(gate.hidden).toBe(true);
  });
});
