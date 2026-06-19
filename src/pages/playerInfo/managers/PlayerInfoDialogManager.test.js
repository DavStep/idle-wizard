// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlayerInfoDialogManager } from './PlayerInfoDialogManager.js';

function createPlayerInfoFacade(snapshot) {
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listener(snapshot);
      return vi.fn();
    },
  };
}

describe('PlayerInfoDialogManager', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('opens a compact player info dialog from cached player data', () => {
    const snapshot = {
      connected: true,
      players: [
        {
          identity: 'identity-ada',
          username: 'Ada',
          character: 'mira',
          allianceTag: 'TAP',
          totalProducedGold: 1234,
          playerLevel: 14,
          prestigeCount: 2,
        },
      ],
    };
    const stage = document.createElement('section');
    const opener = document.createElement('button');
    const manager = new PlayerInfoDialogManager({
      playerInfoFacade: createPlayerInfoFacade(snapshot),
    });

    opener.textContent = 'open';
    stage.append(opener);
    document.body.append(stage);
    manager.mount(stage);
    opener.focus();
    manager.show({ identity: 'identity-ada', username: 'fallback' });

    const popup = stage.querySelector('.room-player-info-popup');
    expect(popup.hidden).toBe(false);
    expect(popup.querySelector('.style-box__title')?.textContent).toBe('player info');
    expect(popup.querySelector('.room-player-info-character')?.getAttribute('src')).toContain(
      'mira.webp',
    );
    expect(popup.querySelector('.room-player-info-summary')?.firstElementChild).toBe(
      popup.querySelector('.room-player-info-character'),
    );
    const nameLine = popup.querySelector('.room-player-info-name-line');
    expect(nameLine?.parentElement).toBe(popup.querySelector('.room-player-info-main-rows'));
    expect(nameLine?.textContent).toBe('[TAP]Ada');
    expect(popup.querySelector('.room-player-info-main-rows')?.firstElementChild).toBe(
      nameLine,
    );
    expect(popup.querySelector('.room-player-info-main-rows')?.textContent).toContain(
      'level14',
    );
    expect(popup.querySelector('.room-player-info-main-rows')?.textContent).toContain(
      'prestige2 times',
    );
    expect(popup.querySelector('.room-player-info-rows')?.textContent).not.toContain(
      'nameAda',
    );
    expect(popup.querySelector('.room-player-info-rows')?.textContent).toContain(
      'total produced gold1234',
    );

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(popup.hidden).toBe(true);
    expect(document.activeElement).toBe(opener);
  });

  it('opens alliance info from the alliance tag button', () => {
    const snapshot = {
      connected: true,
      players: [
        {
          identity: 'identity-ada',
          username: 'Ada',
          character: 'mira',
          allianceTag: 'TAP',
          allianceTagColor: 'blue',
          totalProducedGold: 1234,
          playerLevel: 14,
          prestigeCount: 2,
        },
      ],
    };
    const onOpenAllianceInfo = vi.fn();
    const stage = document.createElement('section');
    const manager = new PlayerInfoDialogManager({
      playerInfoFacade: createPlayerInfoFacade(snapshot),
      onOpenAllianceInfo,
    });

    document.body.append(stage);
    manager.mount(stage);
    manager.show({ identity: 'identity-ada', username: 'Ada' });

    const button = stage.querySelector('.room-player-info-alliance-link');
    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onOpenAllianceInfo).toHaveBeenCalledWith({
      allianceId: '',
      name: '',
      tag: 'TAP',
      tagColor: 'blue',
    });
  });

  it('shows the player name above level when no alliance tag exists', () => {
    const stage = document.createElement('section');
    const manager = new PlayerInfoDialogManager({
      playerInfoFacade: createPlayerInfoFacade({
        connected: true,
        players: [
          {
            username: 'wizard',
            character: 'elara',
            totalProducedGold: 414,
            playerLevel: 4,
            prestigeCount: 0,
          },
        ],
      }),
    });

    document.body.append(stage);
    manager.mount(stage);
    manager.show({ username: 'wizard' });

    const popup = stage.querySelector('.room-player-info-popup');
    expect(popup.querySelector('.room-player-info-name-line')?.textContent).toBe('wizard');
    expect(popup.querySelector('.room-player-info-rows')?.textContent).not.toContain(
      'namewizard',
    );
  });

  it('retains public player info only while the dialog is open', () => {
    const stage = document.createElement('section');
    const releasePublicData = vi.fn();
    const unsubscribe = vi.fn();
    const playerInfoFacade = {
      getSnapshot: () => ({ connected: true, players: [] }),
      retainPublicData: vi.fn(() => releasePublicData),
      subscribe: vi.fn(() => unsubscribe),
    };
    const manager = new PlayerInfoDialogManager({ playerInfoFacade });

    document.body.append(stage);
    manager.mount(stage);

    expect(playerInfoFacade.retainPublicData).not.toHaveBeenCalled();
    expect(playerInfoFacade.subscribe).not.toHaveBeenCalled();

    manager.show({ username: 'Ada' });

    expect(playerInfoFacade.retainPublicData).toHaveBeenCalledTimes(1);
    expect(playerInfoFacade.subscribe).toHaveBeenCalledTimes(1);

    manager.hide();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(releasePublicData).toHaveBeenCalledTimes(1);
  });
});
