import { describe, expect, it, vi } from 'vitest';

import { WorldEventLeaderboardSyncManager } from './WorldEventLeaderboardSyncManager.js';

function createGameplayFacade(points = 0) {
  const listeners = new Set();
  let snapshot = createSnapshot(points);

  return {
    getSnapshot: () => snapshot,
    publishPoints(nextPoints, overrides = {}) {
      snapshot = createSnapshot(nextPoints, overrides);

      for (const listener of listeners) {
        listener(snapshot);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function createSnapshot(points = 0, overrides = {}) {
  return {
    worldNotice: {
      current: {
        periodKey: overrides.periodKey ?? 'weekly-1',
        eventId: overrides.eventId ?? 'fever-lower-quarter',
        leaderboard: {
          currentPoints: points,
        },
      },
    },
  };
}

describe('WorldEventLeaderboardSyncManager', () => {
  it('reports current world event points through the reducer', async () => {
    const setWorldEventContributionPoints = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(125);
    const manager = new WorldEventLeaderboardSyncManager({ syncIntervalMs: 0 });

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setWorldEventContributionPoints,
      },
    });
    manager.setReadyToSync(true);
    await Promise.resolve();

    expect(setWorldEventContributionPoints).toHaveBeenCalledWith({
      periodKey: 'weekly-1',
      eventId: 'fever-lower-quarter',
      points: 125n,
    });

    gameplayFacade.publishPoints(225);
    await Promise.resolve();

    expect(setWorldEventContributionPoints).toHaveBeenLastCalledWith({
      periodKey: 'weekly-1',
      eventId: 'fever-lower-quarter',
      points: 225n,
    });
  });

  it('does not resend unchanged points', async () => {
    const setWorldEventContributionPoints = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(125);
    const manager = new WorldEventLeaderboardSyncManager({ syncIntervalMs: 0 });

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setWorldEventContributionPoints,
      },
    });
    manager.setReadyToSync(true);
    await Promise.resolve();

    gameplayFacade.publishPoints(125);
    gameplayFacade.publishPoints(125);
    await Promise.resolve();

    expect(setWorldEventContributionPoints).toHaveBeenCalledTimes(1);
  });

  it('waits for gameplay save hydration before reporting event points', async () => {
    const setWorldEventContributionPoints = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(7013);
    const manager = new WorldEventLeaderboardSyncManager({ syncIntervalMs: 0 });

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setWorldEventContributionPoints,
      },
    });
    gameplayFacade.publishPoints(7014);
    await Promise.resolve();

    expect(setWorldEventContributionPoints).not.toHaveBeenCalled();

    manager.setReadyToSync(true);
    await Promise.resolve();

    expect(setWorldEventContributionPoints).toHaveBeenCalledTimes(1);
    expect(setWorldEventContributionPoints).toHaveBeenCalledWith({
      periodKey: 'weekly-1',
      eventId: 'fever-lower-quarter',
      points: 7014n,
    });
  });

  it('reports a new event even when the points total is lower', async () => {
    const set_world_event_contribution_points = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(300);
    const manager = new WorldEventLeaderboardSyncManager({ syncIntervalMs: 0 });

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        set_world_event_contribution_points,
      },
    });
    manager.setReadyToSync(true);
    await Promise.resolve();

    gameplayFacade.publishPoints(25, {
      periodKey: 'weekly-2',
      eventId: 'siege-stonebridge',
    });
    await Promise.resolve();

    expect(set_world_event_contribution_points).toHaveBeenLastCalledWith({
      periodKey: 'weekly-2',
      eventId: 'siege-stonebridge',
      points: 25n,
    });
  });
});
