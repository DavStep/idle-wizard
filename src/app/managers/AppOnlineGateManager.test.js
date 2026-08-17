// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { AppOnlineGateManager } from './AppOnlineGateManager.js';

describe('AppOnlineGateManager', () => {
  it('blocks the stage with an online-required message', () => {
    const stage = document.createElement('section');
    const manager = new AppOnlineGateManager();

    manager.mount(stage);
    manager.showConnecting();

    const gate = stage.querySelector('.app-online-gate');
    expect(gate.hidden).toBe(false);
    expect(
      gate
        .querySelector('.app-online-gate__dialog')
        .classList.contains('style-dialog--system'),
    ).toBe(false);
    expect(gate.textContent).toContain('Server Required');
    expect(gate.textContent).toContain('Connecting to server...');
    const progress = gate.querySelector('.app-online-gate__progress');
    expect(progress.hidden).toBe(false);
    expect(progress.getAttribute('role')).toBe('progressbar');
    expect(progress.classList.contains('style-progress')).toBe(true);
    expect(progress.classList.contains('is-indeterminate')).toBe(true);
    expect(progress.querySelector('.app-online-gate__progress-fill')).not.toBeNull();

    manager.showOffline('connect_error');
    expect(gate.textContent).toContain('Connecting to server...');
    expect(progress.hidden).toBe(false);

    manager.showOffline('connect_timeout');
    expect(gate.textContent).toContain('Connecting to server...');
    expect(progress.hidden).toBe(false);

    manager.showOffline('gameplay_save_timeout');
    expect(gate.textContent).toContain('Connecting to server...');
    expect(progress.hidden).toBe(false);

    manager.showOffline('server_paused');
    expect(gate.textContent).toContain('server paused');
    expect(progress.hidden).toBe(true);

    manager.showOffline('server_no_energy');
    expect(gate.textContent).toContain('server out of energy');
    expect(progress.hidden).toBe(true);

    manager.showOffline('gameplay_save_missing');
    expect(gate.textContent).toContain('server unavailable');
    expect(progress.hidden).toBe(true);
    expect(progress.classList.contains('is-indeterminate')).toBe(false);

    manager.showOffline('account_in_use');
    expect(gate.textContent).toContain('Account opened on another device');
    expect(progress.hidden).toBe(true);

    manager.showMaintenance({
      mode: 'drain',
      message: 'maintenance in progress',
      saving: true,
    });
    expect(gate.querySelector('.style-box__title').textContent).toBe('Maintenance');
    expect(gate.querySelector('.app-online-gate__message').textContent).toBe(
      'Maintenance in progress. Saving progress...',
    );
    expect(progress.hidden).toBe(false);

    manager.showMaintenance({
      mode: 'drain',
      message: 'brief account maintenance',
    });
    expect(gate.querySelector('.style-box__title').textContent).toBe('Maintenance');
    expect(gate.querySelector('.app-online-gate__message').textContent).toBe(
      'Brief account maintenance. Progress is saved.',
    );
    expect(progress.hidden).toBe(true);

    manager.showMaintenance({
      mode: 'drain',
      message: 'account migration in progress',
      saving: true,
    });
    expect(gate.querySelector('.app-online-gate__message').textContent).toBe(
      'Account migration in progress. Saving progress...',
    );

    manager.hide();
    expect(gate.hidden).toBe(true);
  });

  it('reloads the tab when Play Here is pressed from account-in-use gate', () => {
    const stage = document.createElement('section');
    const reload = vi.fn();
    const manager = new AppOnlineGateManager({ reload });

    manager.mount(stage);
    manager.showOffline('account_in_use');

    const action = stage.querySelector('.app-online-gate__action');
    expect(action.hidden).toBe(false);
    expect(action.textContent).toBe('Play Here');

    action.click();

    expect(reload).toHaveBeenCalledTimes(1);

    manager.showOffline('server_paused');
    expect(action.hidden).toBe(true);
  });
});
