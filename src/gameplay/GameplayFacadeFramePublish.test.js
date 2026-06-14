import { describe, expect, it, vi } from 'vitest';

import { EcsFacade } from '../ecs/EcsFacade.js';
import {
  GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS,
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
  it('throttles automatic frame snapshots below the gameplay tick rate', () => {
    const gameplayFacade = createGameplayFacade();
    const listener = vi.fn();

    gameplayFacade.subscribe(listener);

    expect(gameplayFacade.publishFrameSnapshot({ time: 0 })).toBe(true);
    expect(gameplayFacade.publishFrameSnapshot({ time: 1000 / 120 })).toBe(false);
    expect(
      gameplayFacade.publishFrameSnapshot({
        time: GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS,
      }),
    ).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps explicit publishes immediate for player actions', () => {
    const gameplayFacade = createGameplayFacade();
    const listener = vi.fn();

    gameplayFacade.subscribe(listener);
    gameplayFacade.publishFrameSnapshot({ time: 0 });
    gameplayFacade.publishSnapshot();

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
