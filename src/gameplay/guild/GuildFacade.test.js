import { describe, expect, it } from 'vitest';

import { GuildFacade, GUILD_CHARTER_COST_GOLD, GUILD_UNLOCK_LEVEL } from './GuildFacade.js';

function createGoldFacade(initialGold = 0) {
  return {
    current: initialGold,
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

function createFacade({ level = GUILD_UNLOCK_LEVEL, gold = 2000, now = () => 0 } = {}) {
  const goldFacade = createGoldFacade(gold);
  const itemsFacade = createItemsFacade();
  const facade = new GuildFacade({
    goldFacade,
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

  return { facade, goldFacade, itemsFacade };
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

  it('spends gold to create a guild and generates applicants and board requests', () => {
    const { facade, goldFacade } = createFacade();

    expect(facade.createGuild({ name: 'ash hall', tag: 'ASH', color: 'red' })).toMatchObject({
      ok: true,
      costGold: GUILD_CHARTER_COST_GOLD,
    });
    const snapshot = facade.getSnapshot();

    expect(goldFacade.getSnapshot().current).toBe(500);
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
    expect(snapshot.board).toHaveLength(3);
    expect(snapshot.eventBoard.length).toBeGreaterThan(0);
  });

  it('rejects guild tags that cannot render as alliance tags', () => {
    const { facade } = createFacade();

    expect(facade.createGuild({ name: 'ash hall', tag: 'A', color: 'red' })).toMatchObject({
      ok: false,
      reason: 'invalid_profile',
    });
  });

  it('hires one starting adventurer until secretary is upgraded', () => {
    const { facade } = createFacade({ gold: 10_000 });
    facade.createGuild({ name: 'ash hall', tag: 'ASH', color: 'red' });
    const applicantId = facade.getSnapshot().applicants[0].id;

    expect(facade.hireApplicant(applicantId)).toMatchObject({ ok: true });
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
});
