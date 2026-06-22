import { describe, expect, it, vi } from 'vitest';

import { EcsFacade } from '../ecs/EcsFacade.js';
import {
  GAMEPLAY_ACTIVE_TICK_DELAY_MS,
  GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS,
  GAMEPLAY_FRAME_SNAPSHOT_REFRESH_MS,
  GAMEPLAY_MIN_RESOURCE_TICK_DELAY_MS,
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
  it('publishes mana frame resources without a full snapshot at the gameplay tick rate', () => {
    const gameplayFacade = createGameplayFacade();
    const listener = vi.fn();
    const frameResourceListener = vi.fn();

    gameplayFacade.subscribe(listener);
    gameplayFacade.subscribeFrameResources(frameResourceListener);

    expect(gameplayFacade.publishFrameSnapshot({ time: 0 })).toBe(false);
    expect(gameplayFacade.publishFrameSnapshot({ time: 1000 / 120 })).toBe(false);
    gameplayFacade.manaFacade.setCurrent(1);
    expect(gameplayFacade.publishFrameSnapshot({ time: GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS })).toBe(
      false,
    );
    expect(listener).not.toHaveBeenCalled();
    expect(frameResourceListener).toHaveBeenCalledTimes(1);
    expect(frameResourceListener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mana: expect.objectContaining({ current: 1 }),
      }),
    );
  });

  it('does not publish frame resources for invisible fractional mana changes', () => {
    const gameplayFacade = createGameplayFacade();
    const listener = vi.fn();
    const frameResourceListener = vi.fn();

    gameplayFacade.subscribe(listener);
    gameplayFacade.subscribeFrameResources(frameResourceListener);

    gameplayFacade.manaFacade.setCurrent(1.1);
    expect(gameplayFacade.publishFrameSnapshot({ time: GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS })).toBe(
      false,
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
    ).toBe(false);

    expect(listener).not.toHaveBeenCalled();
    expect(frameResourceListener).toHaveBeenCalledTimes(2);
  });

  it('does not build full snapshots for skipped automatic frames', () => {
    const gameplayFacade = createGameplayFacade();

    gameplayFacade.manaFacade.setCurrent(1.1);
    expect(gameplayFacade.publishFrameSnapshot({ time: GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS })).toBe(
      false,
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

  it('publishes a full frame snapshot when mana crosses the cap boundary', () => {
    const gameplayFacade = createGameplayFacade();
    const listener = vi.fn();

    gameplayFacade.subscribe(listener);

    gameplayFacade.manaFacade.setCurrent(49);
    expect(gameplayFacade.publishFrameSnapshot({ time: GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS })).toBe(
      false,
    );
    gameplayFacade.manaFacade.setCurrent(50);
    expect(
      gameplayFacade.publishFrameSnapshot({
        time: GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS * 2,
      }),
    ).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('refreshes full snapshots at a slow cadence while gameplay timers are active', () => {
    const gameplayFacade = createGameplayFacade();
    const listener = vi.fn();

    vi.spyOn(gameplayFacade, 'hasFrameTimerWork').mockReturnValue(true);
    gameplayFacade.subscribe(listener);
    gameplayFacade.publishSnapshotObject(
      gameplayFacade.getSnapshot(),
      gameplayFacade.getFrameSnapshotKey(),
      0,
      true,
    );
    listener.mockClear();
    const getSnapshot = vi.spyOn(gameplayFacade, 'getSnapshot');

    expect(
      gameplayFacade.publishFrameSnapshot({
        time: GAMEPLAY_FRAME_SNAPSHOT_REFRESH_MS - 1,
      }),
    ).toBe(false);
    expect(getSnapshot).not.toHaveBeenCalled();

    expect(
      gameplayFacade.publishFrameSnapshot({
        time: GAMEPLAY_FRAME_SNAPSHOT_REFRESH_MS + GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS,
      }),
    ).toBe(true);
    expect(getSnapshot).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('publishes once when timer work completes and the frame key is unchanged', () => {
    const gameplayFacade = createGameplayFacade();
    const listener = vi.fn();
    let hasTimerWork = true;

    vi.spyOn(gameplayFacade, 'hasFrameTimerWork').mockImplementation(() => hasTimerWork);
    gameplayFacade.subscribe(listener);
    gameplayFacade.publishSnapshot();

    expect(
      gameplayFacade.publishFrameSnapshot({
        time: GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS,
      }),
    ).toBe(false);

    hasTimerWork = false;

    expect(
      gameplayFacade.publishFrameSnapshot({
        time: GAMEPLAY_FRAME_SNAPSHOT_INTERVAL_MS + 1,
      }),
    ).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps explicit publishes immediate for player actions', () => {
    const gameplayFacade = createGameplayFacade();
    const listener = vi.fn();

    gameplayFacade.subscribe(listener);
    gameplayFacade.manaFacade.setCurrent(1);
    gameplayFacade.publishFrameSnapshot({ time: 0 });
    gameplayFacade.publishSnapshot();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('sleeps gameplay ticks when no timer work is active and mana is capped', () => {
    const gameplayFacade = createGameplayFacade();

    gameplayFacade.manaFacade.fill();

    expect(gameplayFacade.getNextGameplayTickDelayMs()).toBe(null);
  });

  it('uses the active tick delay while timer work is active', () => {
    const gameplayFacade = createGameplayFacade();

    vi.spyOn(gameplayFacade, 'hasFrameTimerWork').mockReturnValue(true);

    expect(gameplayFacade.getNextGameplayTickDelayMs()).toBe(
      GAMEPLAY_ACTIVE_TICK_DELAY_MS,
    );
  });

  it('wakes near the next visible mana step when mana is regenerating', () => {
    const gameplayFacade = createGameplayFacade();

    gameplayFacade.manaFacade.setCurrent(0);
    expect(gameplayFacade.getNextGameplayTickDelayMs()).toBe(1000);

    gameplayFacade.manaFacade.setCurrent(0.9);
    expect(gameplayFacade.getNextGameplayTickDelayMs()).toBe(
      GAMEPLAY_MIN_RESOURCE_TICK_DELAY_MS,
    );
  });
});
