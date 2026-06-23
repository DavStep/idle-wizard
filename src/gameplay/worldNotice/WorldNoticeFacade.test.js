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

function createItemsFacade(initialItems = {}) {
  const definitions = new Map(
    [
      { id: 2001, key: 'manaTonic', label: 'mana tonic', kind: 'potion' },
      {
        id: 2002,
        key: 'minorHealingPotion',
        label: 'minor healing potion',
        kind: 'potion',
      },
      { id: 2009, key: 'healingPotion', label: 'healing potion', kind: 'potion' },
      { id: 2010, key: 'simpleAntidote', label: 'simple antidote', kind: 'potion' },
    ].map((definition) => [definition.key, definition]),
  );
  const quantities = new Map(Object.entries(initialItems));

  return {
    getItemDefinitionByKey(itemKey) {
      const definition = definitions.get(itemKey);

      if (!definition) {
        throw new Error(`unknown item: ${itemKey}`);
      }

      return definition;
    },
    getItemQuantity(itemTypeId) {
      const definition = [...definitions.values()].find((item) => item.id === itemTypeId);
      return quantities.get(definition?.key) ?? 0;
    },
    removeItem(itemTypeId, quantity = 1) {
      const definition = [...definitions.values()].find((item) => item.id === itemTypeId);
      const current = quantities.get(definition?.key) ?? 0;

      if (!definition || current < quantity) {
        return null;
      }

      quantities.set(definition.key, current - quantity);
      return {
        ...definition,
        quantity,
      };
    },
    getQuantity(itemKey) {
      return quantities.get(itemKey) ?? 0;
    },
  };
}

function createFacade({
  level = 4,
  coin = 0,
  items = {},
  now = () => WEEK_1_MS,
} = {}) {
  const coinFacade = createCoinFacade(coin);
  const itemsFacade = createItemsFacade(items);
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
    itemsFacade,
    now,
    playerLevelFacade,
    tasksFacade,
  });

  return {
    facade,
    coinFacade,
    itemsFacade,
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

  it('creates one weekly world event with lore-backed donation quests', () => {
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
    expect(snapshot.current.requests.every((request) => request.title)).toBe(true);
    expect(snapshot.current.requests.every((request) => request.situation)).toBe(true);
    expect(snapshot.current.requests.every((request) => request.description)).toBe(true);
    expect(snapshot.current.requests.every((request) => request.donationOptions.length > 0))
      .toBe(true);
    expect(snapshot.current.requests.map((request) => request.actionType)).toEqual([
      WORLD_NOTICE_ACTIONS.DONATE_RESOURCES,
      WORLD_NOTICE_ACTIONS.DONATE_RESOURCES,
      WORLD_NOTICE_ACTIONS.DONATE_RESOURCES,
    ]);
  });

  it('keeps default events on explicit donation quests', () => {
    for (let weekIndex = 0; weekIndex < 10; weekIndex += 1) {
      const { facade } = createFacade({
        level: 4,
        now: () => Date.UTC(2026, 5, 8 + weekIndex * 7, 12, 0, 0, 0),
      });
      const requests = facade.getSnapshot().current.requests;

      expect(requests.every((request) => request.actionType)).toBe(true);
      expect(requests.every((request) => request.donationOptions.length > 0)).toBe(true);
      expect(requests.some((request) =>
        request.donationOptions.some((option) => option.resourceType === 'coin'),
      )).toBe(true);
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
    expect(snapshot.current.requests.every((request) => request.donationOptions.length > 0))
      .toBe(true);
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

  it('donates items and adds contribution points', () => {
    const { facade, coinFacade, itemsFacade } = createFacade({
      level: 4,
      items: { minorHealingPotion: 3 },
    });
    const donateRequest = facade.getSnapshot().current.requests.find((request) =>
      request.donationOptions.some((option) => option.itemKey === 'minorHealingPotion'),
    );
    const option = donateRequest.donationOptions.find((candidate) =>
      candidate.itemKey === 'minorHealingPotion',
    );

    expect(option).toMatchObject({
      itemKind: 'potion',
      itemTypeId: 2002,
    });

    const result = facade.donateResource(donateRequest.requestId, option.optionKey, 2);
    const updatedRequest = facade
      .getSnapshot()
      .current.requests.find((request) => request.requestId === donateRequest.requestId);
    const updatedOption = updatedRequest.donationOptions.find(
      (candidate) => candidate.optionKey === option.optionKey,
    );

    expect(result.changed).toBe(true);
    expect(updatedRequest).toMatchObject({
      progressQuantity: 300,
      contributionPoints: 300,
    });
    expect(updatedOption).toMatchObject({
      contributedQuantity: 2,
      contributionPoints: 300,
      maxDonateQuantity: 1,
    });
    expect(result.pointsAdded).toBe(300);
    expect(facade.getSnapshot().current.leaderboard.currentPoints).toBe(300);
    expect(facade.getSnapshot().current.leaderboard.qualificationPoints).toBe(2000);
    expect(coinFacade.current).toBe(0);
    expect(itemsFacade.getQuantity('minorHealingPotion')).toBe(1);
  });

  it('continues adding donation points after the quest is complete', () => {
    const { facade } = createFacade({ level: 4, coin: 1000 });
    const coinRequest = facade.getSnapshot().current.requests.find((request) =>
      request.donationOptions.some((option) => option.resourceType === 'coin'),
    );
    const option = coinRequest.donationOptions.find(
      (candidate) => candidate.resourceType === 'coin',
    );

    const completionResult = facade.donateResource(
      coinRequest.requestId,
      option.optionKey,
      coinRequest.requiredQuantity,
    );
    const extraResult = facade.donateResource(coinRequest.requestId, option.optionKey, 3);
    const updatedRequest = facade
      .getSnapshot()
      .current.requests.find((request) => request.requestId === coinRequest.requestId);

    expect(extraResult).toMatchObject({
      ok: true,
      changed: true,
      pointsAdded: 3,
    });
    expect(updatedRequest).toMatchObject({
      completed: true,
      progressQuantity: coinRequest.requiredQuantity,
      contributionPoints: completionResult.pointsAdded + 3,
    });
    expect(facade.getSnapshot().current.leaderboard.currentPoints).toBe(
      completionResult.pointsAdded + 3,
    );
  });

  it('donates coin into explicit manual event requests', () => {
    const { facade, coinFacade } = createFacade({ level: 4, coin: 1000 });
    const donateRequest = facade.getSnapshot().current.requests.find((request) =>
      request.donationOptions.some((option) => option.resourceType === 'coin'),
    );

    const result = facade.donateCoin(donateRequest.requestId);
    const updatedRequest = facade
      .getSnapshot()
      .current.requests.find((request) => request.requestId === donateRequest.requestId);

    expect(result).toMatchObject({
      ok: true,
      changed: true,
      donatedCoin: 1000,
      pointsAdded: 1000,
    });
    expect(updatedRequest.completed).toBe(true);
    expect(updatedRequest.contributedQuantity).toBe(1000);
    expect(coinFacade.current).toBe(0);
  });

  it('donates requested coin amount without request limit cap', () => {
    const { facade, coinFacade } = createFacade({ level: 4, coin: 1000 });
    const donateRequest = facade.getSnapshot().current.requests.find((request) =>
      request.donationOptions.some((option) => option.resourceType === 'coin'),
    );

    const result = facade.donateCoin(donateRequest.requestId, 250);
    const updatedRequest = facade
      .getSnapshot()
      .current.requests.find((request) => request.requestId === donateRequest.requestId);

    expect(result).toMatchObject({
      ok: true,
      changed: true,
      donatedCoin: 250,
      pointsAdded: 250,
    });
    expect(updatedRequest).toMatchObject({
      completed: false,
      progressQuantity: 250,
      contributedQuantity: 250,
      remainingQuantity: 650,
      maxDonateQuantity: 750,
    });
    expect(coinFacade.current).toBe(750);
    expect(facade.donateCoin(donateRequest.requestId, 0)).toMatchObject({
      ok: false,
      changed: false,
      reason: 'bad_amount',
    });
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
