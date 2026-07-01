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

  it('updates and keeps the top-panel character avatar visible from player profile state', () => {
    const stage = document.createElement('section');
    const viewManager = new TopPanelViewManager();
    let playerSnapshot = {
      username: 'Merlin',
      theme: 'midnight',
      font: 'lexend',
      colorMode: 'resources',
      character: 'mira',
      iconMode: 'icons',
      progressBar: 'regular',
      plotView: 'boxes',
    };
    const playerListeners = new Set();
    const playerFacade = {
      getSnapshot: vi.fn(() => playerSnapshot),
      subscribe: vi.fn((listener) => {
        playerListeners.add(listener);
        listener(playerSnapshot);
        return () => playerListeners.delete(listener);
      }),
      setCharacter: vi.fn((character) => {
        playerSnapshot = { ...playerSnapshot, character };

        for (const listener of playerListeners) {
          listener(playerSnapshot);
        }
      }),
      setIconMode: vi.fn(() => {
        playerSnapshot = { ...playerSnapshot, iconMode: 'icons' };

        for (const listener of playerListeners) {
          listener(playerSnapshot);
        }
      }),
    };
    document.body.append(stage);
    viewManager.mount(stage);

    const manager = new TopPanelSettingsManager({ playerFacade });
    manager.mount(viewManager.getRefs());

    const avatar = stage.querySelector('.room-top-panel__username-avatar');
    const avatarButton = stage.querySelector('.room-top-panel__avatar-button');
    const topPanel = stage.querySelector('.room-top-panel');
    const usernameButton = stage.querySelector('.room-top-panel__username');
    const rowanButton = stage.querySelector(
      '#room-top-panel-settings-avatar .room-top-panel__character-button[data-character="rowan"]',
    );

    expect(avatar?.getAttribute('src')).toContain('/assets/characters/mira.png');
    expect(avatarButton?.hidden).toBe(false);
    expect(avatar?.hidden).toBe(false);
    expect(topPanel?.classList.contains('has-avatar')).toBe(true);
    expect(usernameButton?.classList.contains('has-avatar')).toBe(true);

    avatarButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(viewManager.getRefs().settings.hidden).toBe(false);
    expect(viewManager.getRefs().settingsTitle.textContent).toBe('avatar');
    expect(viewManager.getRefs().settingsTabs.hidden).toBe(true);
    expect(viewManager.getRefs().avatarPane.hidden).toBe(false);

    rowanButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerFacade.setCharacter).toHaveBeenCalledWith('rowan');
    expect(rowanButton.getAttribute('aria-checked')).toBe('true');
    expect(
      rowanButton.querySelector('.room-top-panel__character-check svg')?.dataset
        .assetAtlasFrame,
    ).toBe('status:checkDefault');
    expect(avatar?.getAttribute('src')).toContain('/assets/characters/rowan.png');

    playerFacade.setIconMode('none');

    expect(avatarButton?.hidden).toBe(false);
    expect(avatar?.hidden).toBe(false);
    expect(topPanel?.classList.contains('has-avatar')).toBe(true);
    expect(usernameButton?.classList.contains('has-avatar')).toBe(true);

    manager.unmount();
    viewManager.unmount();
  });

  it('omits the removed plot view selector from configurations', () => {
    const stage = document.createElement('section');
    const viewManager = new TopPanelViewManager();
    const playerSnapshot = {
      username: 'wizard',
      theme: 'midnight',
      font: 'lexend',
      colorMode: 'resources',
      character: 'elara',
      iconMode: 'icons',
      progressBar: 'regular',
      plotView: 'boxes',
    };
    const playerFacade = {
      getSnapshot: vi.fn(() => playerSnapshot),
      subscribe: vi.fn((listener) => {
        listener(playerSnapshot);
        return () => {};
      }),
    };
    document.body.append(stage);
    viewManager.mount(stage);

    const manager = new TopPanelSettingsManager({ playerFacade });
    manager.mount(viewManager.getRefs());
    manager.showSettings();
    viewManager
      .getRefs()
      .settingsTabButtons.find((button) => button.dataset.settingsTab === 'theme')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.room-top-panel__plotView-section')).toBeNull();
    expect(stage.querySelector('.room-top-panel__plot-view-button')).toBeNull();
    expect(stage.querySelector('.room-top-panel__color-section')).toBeNull();
    expect(stage.querySelector('.room-top-panel__color-button')).toBeNull();
    expect(stage.querySelector('.room-top-panel__icons-section')).toBeNull();
    expect(stage.querySelector('.room-top-panel__icon-button')).toBeNull();
    expect(viewManager.getRefs().plotViewButtons).toBeUndefined();

    manager.unmount();
    viewManager.unmount();
  });
});
