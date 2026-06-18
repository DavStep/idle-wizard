import { describe, expect, it, vi } from 'vitest';

import { EcsFacade } from '../ecs/EcsFacade.js';
import {
  GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS,
  GAMEPLAY_FRAME_SNAPSHOT_REFRESH_MS,
  GameplayFacade,
} from './GameplayFacade.js';

function createGameplayFacade() {
  const ecsFacade = new EcsFacade();
  const gameplayFacade = new GameplayFacade();

  ecsFacade.createWorld();
  gameplayFacade.initialize(ecsFacade);

  return gameplayFacade;
}

describe('GameplayFacade frame publishing', () => {
  it('skips unchanged automatic frame snapshots below the gameplay tick rate', () => {
    const gameplayFacade = createGameplayFacade();
    const listener = vi.fn();

    gameplayFacade.subscribe(listener);

    expect(gameplayFacade.publishFrameSnapshot({ time: 0 })).toBe(false);
    expect(gameplayFacade.publishFrameSnapshot({ time: 1000 / 120 })).toBe(false);
    gameplayFacade.manaFacade.setCurrent(1);
    expect(gameplayFacade.publishFrameSnapshot({ time: GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS })).toBe(
      true,
    );
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not publish frame snapshots for invisible fractional mana changes', () => {
    const gameplayFacade = createGameplayFacade();
    const listener = vi.fn();

    gameplayFacade.subscribe(listener);

    gameplayFacade.manaFacade.setCurrent(1.1);
    expect(gameplayFacade.publishFrameSnapshot({ time: GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS })).toBe(
      true,
    );
    gameplayFacade.manaFacade.setCurrent(1.9);
    expect(
      gameplayFacade.publishFrameSnapshot({
        time: GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS * 2,
      }),
    ).toBe(false);
    gameplayFacade.manaFacade.setCurrent(2);
    expect(
      gameplayFacade.publishFrameSnapshot({
        time: GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS * 3,
      }),
    ).toBe(true);

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('does not build full snapshots for skipped automatic frames', () => {
    const gameplayFacade = createGameplayFacade();

    gameplayFacade.manaFacade.setCurrent(1.1);
    expect(gameplayFacade.publishFrameSnapshot({ time: GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS })).toBe(
      true,
    );

    const getSnapshot = vi.spyOn(gameplayFacade, 'getSnapshot');
    gameplayFacade.manaFacade.setCurrent(1.9);

    expect(
      gameplayFacade.publishFrameSnapshot({
        time: GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS * 2,
      }),
    ).toBe(false);
    expect(getSnapshot).not.toHaveBeenCalled();
  });

  it('does not refresh full snapshots by time when no gameplay timers are active', () => {
    const gameplayFacade = createGameplayFacade();
    const getSnapshot = vi.spyOn(gameplayFacade, 'getSnapshot');

    expect(
      gameplayFacade.publishFrameSnapshot({
        time: GAMEPLAY_FRAME_SNAPSHOT_REFRESH_MS * 2,
      }),
    ).toBe(false);
    expect(getSnapshot).not.toHaveBeenCalled();
  });

  it('keeps explicit publishes immediate for player actions', () => {
    const gameplayFacade = createGameplayFacade();
    const listener = vi.fn();

    gameplayFacade.subscribe(listener);
    gameplayFacade.manaFacade.setCurrent(1);
    gameplayFacade.publishFrameSnapshot({ time: 0 });
    gameplayFacade.publishSnapshot();

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
