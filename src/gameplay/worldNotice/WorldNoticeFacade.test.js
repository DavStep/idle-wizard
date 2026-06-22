import { describe, expect, it } from 'vitest';

import {
  WORLD_NOTICE_ACTIONS,
  WorldNoticeFacade,
} from './WorldNoticeFacade.js';

const WEEK_1_MS = Date.UTC(2026, 5, 20, 12, 0, 0, 0);

function createCoinFacade(initialCoin = 0) {
  return {
    current: initialCoin,
    add(amount) {
      this.current += amount;
    },
    canSpend(amount) {
      return this.current >= amount;
    },
    spend(amount) {
      if (!this.canSpend(amount)) {
        return false;
      }

      this.current -= amount;
      return true;
    },
    getSnapshot() {
      return {
        current: this.current,
      };
    },
  };
}

function createFacade({ level = 4, coin = 0, now = () => WEEK_1_MS } = {}) {
  const coinFacade = createCoinFacade(coin);
  const playerLevelFacade = {
    getSnapshot: () => ({
      currentLevel: level,
    }),
  };
  const tasksFacade = {
    getLevelCompletionCostCoin: (levelNumber) => levelNumber * levelNumber * 10,
    getSnapshot: () => ({
      currentLevel: level,
    }),
  };
  const facade = new WorldNoticeFacade({
    coinFacade,
    now,
    playerLevelFacade,
    tasksFacade,
  });

  return {
    facade,
    coinFacade,
  };
}

describe('WorldNoticeFacade', () => {
  it('stays locked before player level 4', () => {
    const { facade } = createFacade({ level: 3 });

    expect(facade.getSnapshot()).toMatchObject({
      unlocked: false,
      unlockLevel: 4,
      current: null,
    });
    expect(facade.recordAction(WORLD_NOTICE_ACTIONS.BREW_POTIONS, 10)).toEqual({
      ok: false,
      changed: false,
    });
  });

  it('creates one weekly world event with event-matched requests', () => {
    const { facade } = createFacade({ level: 4 });
    const snapshot = facade.getSnapshot();

    expect(snapshot.unlocked).toBe(true);
    expect(snapshot.current).toMatchObject({
      anchorLevel: 4,
      completedRequests: 0,
      totalRequests: 3,
      responseLabel: 'small response',
    });
    expect(snapshot.current.headline).toBeTruthy();
    expect(snapshot.current.requests).toHaveLength(3);
    expect(snapshot.current.requests.map((request) => request.label)).not.toContain(
      'bring random mint',
    );
    expect(snapshot.current.requests.map((request) => request.actionType)).not.toContain(
      WORLD_NOTICE_ACTIONS.DONATE_COIN,
    );
  });

  it('keeps default events on normal workshop actions instead of raw funding', () => {
    for (let weekIndex = 0; weekIndex < 10; weekIndex += 1) {
      const { facade } = createFacade({
        level: 4,
        now: () => Date.UTC(2026, 5, 8 + weekIndex * 7, 12, 0, 0, 0),
      });
      const requestTypes = facade
        .getSnapshot()
        .current.requests.map((request) => request.actionType);

      expect(requestTypes).not.toContain(WORLD_NOTICE_ACTIONS.DONATE_COIN);
      expect(new Set(requestTypes).size).toBe(requestTypes.length);
    }
  });

  it('replaces stale saved funding events with the current catalog', () => {
    const { facade } = createFacade({ level: 4 });
    facade.applyPersistenceSnapshot({
      version: 1,
      current: {
        version: 1,
        periodKey: 'weekly-1',
        weekIndex: 1,
        resetAtMs: Date.UTC(2026, 5, 22, 0, 0, 0, 0),
        anchorLevel: 4,
        eventId: 'siege-stonebridge',
        requests: [
          {
            requestId: 'weekly-1:siege-stonebridge:wallFund',
            requestKey: 'wallFund',
            actionType: WORLD_NOTICE_ACTIONS.DONATE_COIN,
            label: 'fund the wall watch',
            requiredQuantity: 160,
            progressQuantity: 0,
            completed: false,
            reward: {
              coin: 10,
            },
            rewardClaimed: false,
          },
        ],
      },
      archive: [],
    });

    const snapshot = facade.getSnapshot();

    expect(snapshot.current.requests.map((request) => request.label)).not.toContain(
      'fund the wall watch',
    );
    expect(snapshot.current.requests.map((request) => request.actionType)).not.toContain(
      WORLD_NOTICE_ACTIONS.DONATE_COIN,
    );
  });

  it('replaces stale in-memory funding events from hot reload state', () => {
    const { facade } = createFacade({ level: 4 });
    facade.state.current = {
      version: 1,
      periodKey: 'weekly-1',
      weekIndex: 1,
      resetAtMs: Date.UTC(2026, 5, 22, 0, 0, 0, 0),
      anchorLevel: 4,
      eventId: 'siege-stonebridge',
      headline: 'siege at stonebridge',
      body: ['stonebridge asks every alchemist for field bottles and hard coin.'],
      requests: [
        {
          requestId: 'weekly-1:siege-stonebridge:wallFund',
          requestKey: 'wallFund',
          actionType: WORLD_NOTICE_ACTIONS.DONATE_COIN,
          label: 'fund the wall watch',
          requiredQuantity: 160,
          progressQuantity: 0,
          completed: false,
          reward: {
            coin: 10,
          },
          rewardClaimed: false,
        },
      ],
      outcomes: {
        small: 'old',
        steady: 'old',
        strong: 'old',
      },
      archive: 'old',
    };

    const snapshot = facade.getSnapshot();

    expect(snapshot.current.body.join(' ')).not.toContain('hard coin');
    expect(snapshot.current.requests.map((request) => request.label)).not.toContain(
      'fund the wall watch',
    );
  });

  it('records matching action progress and adds contribution points', () => {
    const { facade, coinFacade } = createFacade({ level: 4 });
    const brewRequest = facade
      .getSnapshot()
      .current.requests.find(
        (request) => request.actionType === WORLD_NOTICE_ACTIONS.BREW_POTIONS,
      );

    const result = facade.recordAction(
      WORLD_NOTICE_ACTIONS.BREW_POTIONS,
      brewRequest.requiredQuantity,
    );
    const updatedRequest = facade
      .getSnapshot()
      .current.requests.find((request) => request.requestId === brewRequest.requestId);

    expect(result.changed).toBe(true);
    expect(updatedRequest).toMatchObject({
      completed: true,
      progressQuantity: brewRequest.requiredQuantity,
    });
    expect(result.pointsAdded).toBeGreaterThan(0);
    expect(updatedRequest.contributionPoints).toBe(result.pointsAdded);
    expect(updatedRequest.collectedPointText).toBe(`${result.pointsAdded} points`);
    expect(updatedRequest.pointText).toBe('25 points each');
    expect(facade.getSnapshot().current.leaderboard.currentPoints).toBe(result.pointsAdded);
    expect(facade.getSnapshot().current.leaderboard.qualificationPoints).toBe(2000);
    expect(coinFacade.current).toBe(0);
  });

  it('scores mana tonic contributions as 25 points each', () => {
    const { facade } = createFacade({ level: 4 });
    const brewRequest = facade
      .getSnapshot()
      .current.requests.find(
        (request) => request.actionType === WORLD_NOTICE_ACTIONS.BREW_POTIONS,
      );

    const result = facade.recordAction(WORLD_NOTICE_ACTIONS.BREW_POTIONS, 2, {
      potion: { key: 'manaTonic' },
    });

    expect(result).toMatchObject({
      ok: true,
      changed: true,
      pointsAdded: 50,
    });
    expect(
      facade
        .getSnapshot()
        .current.requests.find((request) => request.requestId === brewRequest.requestId)
        .progressQuantity,
    ).toBe(2);
    expect(
      facade
        .getSnapshot()
        .current.requests.find((request) => request.requestId === brewRequest.requestId)
        .contributionPoints,
    ).toBe(50);
    expect(facade.getSnapshot().current.leaderboard.currentPoints).toBe(50);
  });

  it('donates coin into explicit manual event requests', () => {
    const { facade, coinFacade } = createFacade({ level: 4, coin: 1000 });
    facade.applyPersistenceSnapshot({
      version: 2,
      current: {
        version: 2,
        periodKey: 'weekly-1',
        weekIndex: 1,
        resetAtMs: Date.UTC(2026, 5, 22, 0, 0, 0, 0),
        anchorLevel: 4,
        eventId: 'siege-stonebridge',
        requests: [
          {
            requestId: 'weekly-1:siege-stonebridge:bridgeCoin',
            requestKey: 'bridgeCoin',
            actionType: WORLD_NOTICE_ACTIONS.DONATE_COIN,
            label: 'send bridge coin',
            requiredQuantity: 30,
            progressQuantity: 0,
            completed: false,
            reward: {
              coin: 10,
            },
            rewardClaimed: false,
          },
        ],
      },
      archive: [],
    });
    const donateRequest = facade
      .getSnapshot()
      .current.requests.find(
        (request) => request.actionType === WORLD_NOTICE_ACTIONS.DONATE_COIN,
      );

    const result = facade.donateCoin(donateRequest.requestId);
    const updatedRequest = facade
      .getSnapshot()
      .current.requests.find((request) => request.requestId === donateRequest.requestId);

    expect(result).toMatchObject({
      ok: true,
      changed: true,
      donatedCoin: donateRequest.requiredQuantity,
    });
    expect(updatedRequest.completed).toBe(true);
    expect(result.pointsAdded).toBe(1);
    expect(coinFacade.current).toBe(1000 - donateRequest.requiredQuantity);
  });

  it('archives resolved events when the weekly period rolls', () => {
    let nowMs = Date.UTC(2026, 5, 14, 12, 0, 0, 0);
    const { facade } = createFacade({
      level: 4,
      now: () => nowMs,
    });
    const firstNotice = facade.getSnapshot().current;

    nowMs = Date.UTC(2026, 5, 15, 1, 0, 0, 0);
    const nextSnapshot = facade.getSnapshot();

    expect(nextSnapshot.current.periodKey).not.toBe(firstNotice.periodKey);
    expect(nextSnapshot.archive[0]).toMatchObject({
      periodKey: firstNotice.periodKey,
      headline: firstNotice.headline,
      responseLabel: 'small response',
    });
  });
});
