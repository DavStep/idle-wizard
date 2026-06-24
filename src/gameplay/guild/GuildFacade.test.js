import { describe, expect, it } from 'vitest';

import { GuildFacade, GUILD_CHARTER_COST_COIN, GUILD_UNLOCK_LEVEL } from './GuildFacade.js';

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

function createItemsFacade() {
  return {
    added: [],
    getSeedDefinitions: () => [{ id: 1, key: 'sageSeed', label: 'sage seed' }],
    getHerbDefinitions: () => [{ id: 2, key: 'sageHerb', label: 'sage' }],
    addItem(itemTypeId, quantity) {
      this.added.push({ itemTypeId, quantity });
    },
  };
}

function createFacade({ level = GUILD_UNLOCK_LEVEL, coin = 2000, now = () => 0 } = {}) {
  const coinFacade = createCoinFacade(coin);
  const itemsFacade = createItemsFacade();
  const facade = new GuildFacade({
    coinFacade,
    itemsFacade,
    now,
    playerLevelFacade: {
      getSnapshot: () => ({ currentLevel: level }),
    },
    worldNoticeFacade: {
      getSnapshot: () => ({
        current: {
          eventId: 'siege-stonebridge',
          headline: 'siege at stonebridge',
          family: 'military danger',
        },
      }),
    },
  });

  return { facade, coinFacade, itemsFacade };
}

describe('GuildFacade', () => {
  it('stays locked before level 15', () => {
    const { facade } = createFacade({ level: 14 });

    expect(facade.getSnapshot()).toMatchObject({
      unlocked: false,
      unlockLevel: 15,
      created: false,
    });
    expect(facade.createGuild({ name: 'ash hall', tag: 'ASH', color: 'red' })).toMatchObject({
      ok: false,
      reason: 'locked',
    });
  });

  it('spends coin to create a guild and generates applicants and available requests', () => {
    const { facade, coinFacade } = createFacade();

    expect(facade.createGuild({ name: 'ash hall', tag: 'ASH', color: 'red' })).toMatchObject({
      ok: true,
      costCoin: GUILD_CHARTER_COST_COIN,
    });
    const snapshot = facade.getSnapshot();

    expect(coinFacade.getSnapshot().current).toBe(500);
    expect(snapshot).toMatchObject({
      created: true,
      profile: {
        name: 'ash hall',
        tag: 'ASH',
        color: 'red',
      },
      secretary: {
        level: 1,
        hiredCap: 1,
        boardSlots: 3,
      },
    });
    expect(snapshot.applicants).toHaveLength(3);
    expect(
      snapshot.applicants.every((applicant) => applicant.iconKey && applicant.iconKey !== 'elara'),
    ).toBe(true);
    expect(snapshot.board).toHaveLength(0);
    expect(snapshot.availableRequests).toHaveLength(5);
    expect(snapshot.availableEventRequests.length).toBeGreaterThan(0);
    expect(snapshot.availableRequests[0]).toMatchObject({
      expiresLabel: '30m',
    });
  });

  it('rejects guild tags that cannot render as alliance tags', () => {
    const { facade } = createFacade();

    expect(facade.createGuild({ name: 'ash hall', tag: 'A', color: 'red' })).toMatchObject({
      ok: false,
      reason: 'invalid_profile',
    });
  });

  it('hires one starting adventurer until secretary is upgraded', () => {
    const { facade } = createFacade({ coin: 10_000 });
    facade.createGuild({ name: 'ash hall', tag: 'ASH', color: 'red' });
    const applicant = facade.getSnapshot().applicants[0];
    const applicantId = applicant.id;

    expect(facade.hireApplicant(applicantId)).toMatchObject({ ok: true });
    expect(facade.getSnapshot().adventurers[0].iconKey).toBe(applicant.iconKey);
    expect(facade.hireApplicant(facade.getSnapshot().applicants[0].id)).toMatchObject({
      ok: false,
      reason: 'roster_full',
      hiredCap: 1,
    });

    expect(facade.upgradeSecretary()).toMatchObject({
      ok: true,
      secretary: {
        level: 2,
        hiredCap: 2,
      },
    });
    expect(facade.hireApplicant(facade.getSnapshot().applicants[0].id)).toMatchObject({
      ok: true,
    });
  });

  it('posts chosen available requests to the board and removal does not auto-refill it', () => {
    const { facade } = createFacade();
    facade.createGuild({ name: 'ash hall', tag: 'ASH', color: 'red' });
    const requestId = facade.getSnapshot().availableRequests[0].id;

    expect(facade.postRequest(requestId)).toMatchObject({
      ok: true,
      requestId,
    });
    expect(facade.getSnapshot()).toMatchObject({
      board: [{ id: requestId }],
    });
    expect(facade.getSnapshot().availableRequests.some((request) => request.id === requestId)).toBe(
      false,
    );

    expect(facade.removeRequest(requestId)).toMatchObject({
      ok: true,
      requestId,
    });

    const snapshot = facade.getSnapshot();
    expect(snapshot.board).toHaveLength(0);
    expect(snapshot.availableRequests.some((request) => request.id === requestId)).toBe(true);
  });

  it('expires board and available requests on the request wave without filling the board', () => {
    let nowMs = 0;
    const { facade } = createFacade({ now: () => nowMs });
    facade.createGuild({ name: 'ash hall', tag: 'ASH', color: 'red' });
    const requestId = facade.getSnapshot().availableRequests[0].id;
    facade.postRequest(requestId);

    nowMs = 30 * 60 * 1000;
    const snapshot = facade.getSnapshot();

    expect(snapshot.board).toHaveLength(0);
    expect(snapshot.availableRequests).toHaveLength(5);
    expect(snapshot.availableRequests.some((request) => request.id === requestId)).toBe(false);
    expect(snapshot.availableRequests[0].expiresLabel).toBe('30m');
    expect(snapshot.boardWaveLabel).toBe('30m');
  });
});
