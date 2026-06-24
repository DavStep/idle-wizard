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

  it('updates and hides the top-panel character avatar from player profile state', () => {
    const stage = document.createElement('section');
    const viewManager = new TopPanelViewManager();
    let playerSnapshot = {
      username: 'Merlin',
      theme: 'white',
      font: 'lexend',
      colorMode: 'monochrome',
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
      setIconMode: vi.fn((iconMode) => {
        playerSnapshot = { ...playerSnapshot, iconMode };

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
    const topPanel = stage.querySelector('.room-top-panel');
    const usernameButton = stage.querySelector('.room-top-panel__username');
    const rowanButton = stage.querySelector(
      '#room-top-panel-settings-avatar .room-top-panel__character-button[data-character="rowan"]',
    );

    expect(avatar?.getAttribute('src')).toContain('/assets/characters/mira.png');
    expect(avatar?.hidden).toBe(false);
    expect(topPanel?.classList.contains('has-avatar')).toBe(true);
    expect(usernameButton?.classList.contains('has-avatar')).toBe(true);

    manager.showSettings();
    manager.selectSettingsTab('avatar');
    rowanButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerFacade.setCharacter).toHaveBeenCalledWith('rowan');
    expect(rowanButton.getAttribute('aria-checked')).toBe('true');
    expect(avatar?.getAttribute('src')).toContain('/assets/characters/rowan.png');

    playerFacade.setIconMode('none');

    expect(avatar?.hidden).toBe(true);
    expect(topPanel?.classList.contains('has-avatar')).toBe(false);
    expect(usernameButton?.classList.contains('has-avatar')).toBe(false);

    manager.unmount();
    viewManager.unmount();
  });

  it('shows plot view in configurations and applies rows or boxes selection', () => {
    const stage = document.createElement('section');
    const viewManager = new TopPanelViewManager();
    let playerSnapshot = {
      username: 'wizard',
      theme: 'white',
      font: 'lexend',
      colorMode: 'monochrome',
      character: 'elara',
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
      setPlotView: vi.fn((plotView) => {
        playerSnapshot = { ...playerSnapshot, plotView };

        for (const listener of playerListeners) {
          listener(playerSnapshot);
        }
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

    const plotViewButtons = viewManager.getRefs().plotViewButtons;

    expect(
      stage.querySelector('.room-top-panel__plotView-section .style-box__title')?.textContent,
    ).toBe('plot view');
    expect(plotViewButtons.map((button) => button.textContent)).toEqual(['rows', 'boxes']);
    expect(plotViewButtons[1].getAttribute('aria-checked')).toBe('true');

    plotViewButtons[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerFacade.setPlotView).toHaveBeenCalledWith('rows');
    expect(playerSnapshot.plotView).toBe('rows');
    expect(plotViewButtons[0].getAttribute('aria-checked')).toBe('true');

    plotViewButtons[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(playerFacade.setPlotView).toHaveBeenCalledWith('boxes');
    expect(playerSnapshot.plotView).toBe('boxes');
    expect(plotViewButtons[1].getAttribute('aria-checked')).toBe('true');

    manager.unmount();
    viewManager.unmount();
  });
});
