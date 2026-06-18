// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { TopPanelSettingsManager } from './TopPanelSettingsManager.js';
import { TopPanelViewManager } from './TopPanelViewManager.js';

describe('TopPanelSettingsManager', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('toggles the device-local haptics preference from settings', () => {
    const stage = document.createElement('section');
    const viewManager = new TopPanelViewManager();
    let hapticsListener = null;
    const unsubscribe = vi.fn();
    const hapticsFacade = {
      getSnapshot: vi.fn(() => ({ enabled: false })),
      subscribe: vi.fn((listener) => {
        hapticsListener = listener;
        listener({ enabled: false });
        return unsubscribe;
      }),
      toggleEnabled: vi.fn(() => {
        hapticsListener?.({ enabled: true });
      }),
    };
    document.body.append(stage);
    viewManager.mount(stage);

    const manager = new TopPanelSettingsManager({ hapticsFacade });
    manager.mount(viewManager.getRefs());

    expect(viewManager.getRefs().hapticsToggleButton.textContent).toBe('off');

    viewManager
      .getRefs()
      .hapticsToggleButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(hapticsFacade.toggleEnabled).toHaveBeenCalledTimes(1);
    expect(viewManager.getRefs().hapticsToggleButton.textContent).toBe('on');
    expect(viewManager.getRefs().hapticsToggleButton.getAttribute('aria-pressed')).toBe('true');

    manager.unmount();
    viewManager.unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('toggles device-local sound preferences from settings', () => {
    const stage = document.createElement('section');
    const viewManager = new TopPanelViewManager();
    let soundSettingsListener = null;
    const unsubscribe = vi.fn();
    const soundSettingsFacade = {
      getSnapshot: vi.fn(() => ({ musicEnabled: false, sfxEnabled: true })),
      subscribe: vi.fn((listener) => {
        soundSettingsListener = listener;
        listener({ musicEnabled: false, sfxEnabled: true });
        return unsubscribe;
      }),
      toggleMusicEnabled: vi.fn(() => {
        soundSettingsListener?.({ musicEnabled: true, sfxEnabled: true });
      }),
      toggleSfxEnabled: vi.fn(() => {
        soundSettingsListener?.({ musicEnabled: true, sfxEnabled: false });
      }),
    };
    document.body.append(stage);
    viewManager.mount(stage);

    const manager = new TopPanelSettingsManager({ soundSettingsFacade });
    manager.mount(viewManager.getRefs());

    expect(viewManager.getRefs().musicToggleButton.textContent).toBe('off');
    expect(viewManager.getRefs().sfxToggleButton.textContent).toBe('on');

    viewManager
      .getRefs()
      .musicToggleButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    viewManager
      .getRefs()
      .sfxToggleButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(soundSettingsFacade.toggleMusicEnabled).toHaveBeenCalledTimes(1);
    expect(soundSettingsFacade.toggleSfxEnabled).toHaveBeenCalledTimes(1);
    expect(viewManager.getRefs().musicToggleButton.textContent).toBe('on');
    expect(viewManager.getRefs().musicToggleButton.getAttribute('aria-pressed')).toBe('true');
    expect(viewManager.getRefs().sfxToggleButton.textContent).toBe('off');
    expect(viewManager.getRefs().sfxToggleButton.getAttribute('aria-pressed')).toBe('false');

    manager.unmount();
    viewManager.unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
