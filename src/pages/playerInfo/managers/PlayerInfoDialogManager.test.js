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
    expect(popup.querySelector('.style-box__title')?.textContent).toBe('Ada');
    expect(popup.textContent).toContain('alliance[TAP]');
    expect(popup.textContent).toContain('total produced gold1234');
    expect(popup.textContent).toContain('level14');
    expect(popup.textContent).toContain('prestige2 times');

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
});
