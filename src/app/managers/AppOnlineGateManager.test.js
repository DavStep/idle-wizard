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

    manager.showOffline('connect_error');
    expect(gate.textContent).toContain('server unavailable');

    manager.hide();
    expect(gate.hidden).toBe(true);
  });
});
