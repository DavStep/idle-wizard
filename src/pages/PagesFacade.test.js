// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { PagesFacade } from './PagesFacade.js';

function createGameplayFacadeFake() {
  const snapshot = {
    mana: {
      current: 0,
      cap: 50,
      perSecond: 1,
    },
    gold: {
      current: 0,
    },
    inventory: [],
    seedInventory: [
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'Sage Seed',
        kind: 'seed',
        quantity: 0,
      },
    ],
    seedSummoning: {
      cost: 10,
      canSummon: false,
    },
    research: {
      boxes: [
        {
          id: 'manaSphere',
          label: 'mana sphere researches',
          researches: [
            {
              id: 'manaProductionRate',
              label: 'mana production rate',
              value: 'increase',
            },
            {
              id: 'manaSphereCap',
              label: 'mana sphere cap',
              value: 'increase',
            },
          ],
        },
        {
          id: 'seedUnlocks',
          label: 'seed unlock researches',
          researches: [
            {
              id: 'unlockSeed:sageSeed',
              label: 'Sage Seed',
              value: 'drop',
            },
          ],
        },
        {
          id: 'summonSeeds',
          label: 'summon seeds unlock',
          researches: [
            {
              id: 'summonSeedsX2',
              label: 'x2 summon',
              value: '20 mana',
            },
          ],
        },
        {
          id: 'recipeUnlocks',
          label: 'recipe unlocks research',
          researches: [
            {
              id: 'unlockRecipe:manaTonic',
              label: 'Mana Tonic',
              value: 'brew',
            },
          ],
        },
      ],
    },
    shop: {
      shelf: {
        unlockedSlots: 1,
        maxSlots: 5,
        slotCosts: [0, 1, 3, 6, 10],
        nextSlotNumber: 2,
        nextSlotCost: 1,
        selectedSlotNumber: 1,
        autoSellSeconds: 5,
        sellKinds: [
          { id: 1, kind: 'seed', label: 'seeds', sellGold: 1 },
          { id: 2, kind: 'herb', label: 'herbs', sellGold: 2 },
          { id: 3, kind: 'potion', label: 'potions', sellGold: 5 },
        ],
        sellItems: [
          {
            itemTypeId: 1,
            key: 'sageSeed',
            label: 'Sage Seed',
            kind: 'seed',
            quantity: 0,
            sellGold: 1,
          },
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'Sage',
            kind: 'herb',
            quantity: 0,
            sellGold: 2,
          },
          {
            itemTypeId: 2001,
            key: 'manaTonic',
            label: 'Mana Tonic',
            kind: 'potion',
            quantity: 0,
            sellGold: 5,
          },
        ],
        slots: [
          {
            slotNumber: 1,
            unlocked: true,
            sellItemTypeId: null,
            sellKind: null,
            sellLabel: null,
            sellProgressSeconds: 0,
          },
          {
            slotNumber: 2,
            unlocked: false,
            sellItemTypeId: null,
            sellKind: null,
            sellLabel: null,
            sellProgressSeconds: 0,
          },
          {
            slotNumber: 3,
            unlocked: false,
            sellItemTypeId: null,
            sellKind: null,
            sellLabel: null,
            sellProgressSeconds: 0,
          },
          {
            slotNumber: 4,
            unlocked: false,
            sellItemTypeId: null,
            sellKind: null,
            sellLabel: null,
            sellProgressSeconds: 0,
          },
          {
            slotNumber: 5,
            unlocked: false,
            sellItemTypeId: null,
            sellKind: null,
            sellLabel: null,
            sellProgressSeconds: 0,
          },
        ],
      },
    },
    leaderboard: {
      topUsers: [
        {
          name: 'Ada',
          totalIncome: 120,
        },
        {
          name: 'Merlin',
          totalIncome: 75,
        },
      ],
    },
  };
  const listeners = new Set();

  const publish = () => {
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    summonSeed: () => ({
      ok: false,
      reason: 'not_enough_mana',
    }),
    buyShopShelfSlot: () => ({
      ok: false,
      reason: 'not_enough_gold',
      cost: 1,
      slotNumber: 2,
    }),
    selectShopShelfSlot: (slotNumber) => {
      snapshot.shop.shelf.selectedSlotNumber = slotNumber;
      return {
        ok: true,
        slotNumber,
      };
    },
    setSelectedShopShelfSlotSellItem: (itemTypeId) => {
      const slotNumber = snapshot.shop.shelf.selectedSlotNumber;
      const slot = snapshot.shop.shelf.slots.find(
        (shelfSlot) => shelfSlot.slotNumber === slotNumber,
      );
      const item = snapshot.shop.shelf.sellItems.find(
        (sellItem) => sellItem.itemTypeId === itemTypeId,
      );
      slot.sellItemTypeId = item.itemTypeId;
      slot.sellKind = item.kind;
      slot.sellLabel = item.label;
      slot.sellGold = item.sellGold;
      return {
        ok: true,
        slotNumber,
        item,
      };
    },
    setShopSellGold: (kind, sellGold) => {
      for (const sellKind of snapshot.shop.shelf.sellKinds) {
        if (sellKind.kind === kind) {
          sellKind.sellGold = sellGold;
        }
      }

      for (const item of snapshot.shop.shelf.sellItems) {
        if (item.kind === kind) {
          item.sellGold = sellGold;
        }
      }

      for (const slot of snapshot.shop.shelf.slots) {
        if (slot.sellKind === kind) {
          slot.sellGold = sellGold;
        }
      }

      publish();
    },
  };
}

function createPlayerFacadeFake(initialUsername = 'wizard') {
  let snapshot = {
    username: initialUsername,
  };
  const listeners = new Set();

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    setUsername: (username) => {
      snapshot = {
        username: username.trim() || 'wizard',
      };

      for (const listener of listeners) {
        listener(snapshot);
      }

      return snapshot;
    },
  };
}

describe('PagesFacade', () => {
  it('mounts Workshop as the default room page', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    expect(pagesFacade.getCurrentPageId()).toBe('workshop');
    expect(stage.querySelector('.workshop-page')).not.toBeNull();
    expect(stage.querySelector('.workshop-page__wall')).not.toBeNull();
    expect(stage.querySelector('.workshop-page__floor')).not.toBeNull();
    expect(stage.querySelector('.workshop-page__ui-layer')).not.toBeNull();
    expect(stage.querySelector('.workshop-page__mana-sphere')).not.toBeNull();
    expect(stage.querySelector('.workshop-page__summon-controls')).not.toBeNull();
    expect(stage.querySelector('.workshop-page__leaderboard-button')?.textContent).toBe(
      'leaderboard',
    );
    expect(
      stage.querySelector('.workshop-page__mana-sphere .workshop-page__summon-button'),
    ).toBeNull();
    expect(stage.querySelector('.workshop-page__seed-inventory')).not.toBeNull();
    expect(stage.querySelector('.workshop-page__name')?.textContent).toBe('Workshop');
    expect(stage.querySelector('.room-page__nav--right')?.textContent).toBe('research');
    expect(stage.querySelector('.room-top-panel')).not.toBeNull();
    expect(stage.querySelector('.room-top-panel')?.textContent).toContain('wizard');
    expect(stage.querySelector('.room-top-panel')?.textContent).toContain('mana 0 / 50');
    expect(stage.querySelector('.room-top-panel')?.textContent).toContain('gold 0');
  });

  it('changes username from the top panel', () => {
    const stage = document.createElement('section');
    const playerFacade = createPlayerFacadeFake('Merlin');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade,
    });

    pagesFacade.mount(stage);

    const usernameButton = stage.querySelector('.room-top-panel__username');
    const editor = stage.querySelector('.room-top-panel__username-editor');
    const input = stage.querySelector('.room-top-panel__username-input');
    const form = stage.querySelector('.room-top-panel__username-form');

    expect(usernameButton.textContent).toBe('Merlin');
    expect(editor.hidden).toBe(true);

    usernameButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(editor.hidden).toBe(false);
    expect(input.value).toBe('Merlin');

    input.value = 'Mira';
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

    expect(playerFacade.getSnapshot().username).toBe('Mira');
    expect(usernameButton.textContent).toBe('Mira');
    expect(editor.hidden).toBe(true);
  });

  it('shows seed inventory when the seeds row is clicked', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    const seedInventory = stage.querySelector('.workshop-page__seed-inventory');
    const seedsRow = stage.querySelector('.workshop-page__row--interactive');

    expect(seedInventory.hidden).toBe(true);

    seedsRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(seedInventory.hidden).toBe(false);
    expect(seedInventory.querySelector('[role="dialog"]')).not.toBeNull();
    expect(seedInventory.querySelector('.style-dialog')).not.toBeNull();
    expect(seedInventory.textContent).toContain('Sage Seed');
    expect(seedInventory.textContent).toContain('0');
  });

  it('hides seed inventory popup with Escape or outside click', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    const seedInventory = stage.querySelector('.workshop-page__seed-inventory');
    const seedsRow = stage.querySelector('.workshop-page__row--interactive');

    seedsRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(seedInventory.hidden).toBe(true);

    seedsRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    seedInventory.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(seedInventory.hidden).toBe(true);
  });

  it('shows leaderboard popup when leaderboard button is clicked', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
    });

    pagesFacade.mount(stage);

    const popup = stage.querySelector('.workshop-page__leaderboard-popup');
    const button = stage.querySelector('.workshop-page__leaderboard-button');

    expect(popup.hidden).toBe(true);

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
    expect(popup.querySelector('[role="dialog"]')).not.toBeNull();
    expect(popup.querySelector('.style-dialog')).not.toBeNull();
    expect(popup.textContent).toContain('Ada');
    expect(popup.textContent).toContain('120');
    expect(popup.textContent).toContain('Merlin');
    expect(popup.textContent).toContain('75');
  });

  it('hides leaderboard popup with Escape or outside click', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
    });

    pagesFacade.mount(stage);

    const popup = stage.querySelector('.workshop-page__leaderboard-popup');
    const button = stage.querySelector('.workshop-page__leaderboard-button');

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(popup.hidden).toBe(true);

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    popup.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(true);
  });

  it('moves right from Workshop to Research, then Shop, then back left', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
      playerFacade: createPlayerFacadeFake(),
    });

    pagesFacade.mount(stage);

    stage
      .querySelector('.room-page__nav--right')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(pagesFacade.getCurrentPageId()).toBe('research');
    expect(stage.querySelector('.research-page')).not.toBeNull();
    expect(stage.querySelector('.research-page__content')).not.toBeNull();
    expect(stage.querySelector('.research-page__name')?.textContent).toBe('Research');
    expect(stage.querySelector('.research-page__content')?.textContent).toContain(
      'mana sphere researches',
    );
    expect(stage.querySelector('.research-page__content')?.textContent).toContain(
      'mana production rate',
    );
    expect(stage.querySelector('.research-page__content')?.textContent).toContain(
      'Sage Seed',
    );
    expect(stage.querySelector('.research-page__content')?.textContent).toContain('x2 summon');
    expect(stage.querySelector('.research-page__content')?.textContent).toContain('20 mana');
    expect(stage.querySelector('.research-page__content')?.textContent).toContain('Mana Tonic');

    stage
      .querySelector('.room-page__nav--right')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(pagesFacade.getCurrentPageId()).toBe('shop');
    expect(stage.querySelector('.shop-page')).not.toBeNull();
    expect(stage.querySelector('.shop-page__shelf')).not.toBeNull();
    expect(stage.querySelector('.shop-page__name')?.textContent).toBe('Shop');
    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain('shop shelf');
    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain('gold');
    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain('empty');
    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain('buy (1 gold)');
    expect(stage.querySelector('.shop-page__sell-popup')).not.toBeNull();
    expect(stage.querySelector('.shop-page__sell-popup').hidden).toBe(true);

    stage
      .querySelector('.room-page__nav--left')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(pagesFacade.getCurrentPageId()).toBe('research');
    expect(stage.querySelector('.research-page')).not.toBeNull();

    stage
      .querySelector('.room-page__nav--left')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(pagesFacade.getCurrentPageId()).toBe('workshop');
    expect(stage.querySelector('.workshop-page')).not.toBeNull();
  });

  it('sets selected shop shelf slot item', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
    });

    pagesFacade.mount(stage);
    stage
      .querySelector('.room-page__nav--right')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.room-page__nav--right')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    stage
      .querySelector('.shop-page__slot-row--interactive')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__sell-popup').hidden).toBe(false);
    expect(stage.querySelector('.shop-page__sell-popup')?.textContent).toContain('seeds');
    expect(stage.querySelector('.shop-page__sell-popup')?.textContent).toContain('herbs');
    expect(stage.querySelector('.shop-page__sell-popup')?.textContent).toContain('potions');
    expect(stage.querySelector('.shop-page__sell-popup')?.textContent).toContain(
      'Sage Seed (0) 1 gold',
    );

    const seedButton = stage.querySelector('.shop-page__sell-item-button');
    seedButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain(
      'slot 1Sage Seed (1 gold)',
    );
    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain(
      'slot 1 sells Sage Seed',
    );
    expect(stage.querySelector('.shop-page__sell-popup').hidden).toBe(true);
  });

  it('updates visible shop sell prices from gameplay snapshots', () => {
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const pagesFacade = new PagesFacade({
      gameplayFacade,
    });

    pagesFacade.mount(stage);
    stage
      .querySelector('.room-page__nav--right')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.room-page__nav--right')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.shop-page__slot-row--interactive')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const seedButton = stage.querySelector('.shop-page__sell-item-button');
    seedButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    gameplayFacade.setShopSellGold('seed', 7);

    expect(stage.querySelector('.shop-page__shelf')?.textContent).toContain(
      'slot 1Sage Seed (7 gold)',
    );

    stage
      .querySelector('.shop-page__slot-row--interactive')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__sell-popup')?.textContent).toContain(
      'Sage Seed (0) 7 gold',
    );
  });

  it('switches shop sell item tabs', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
    });

    pagesFacade.mount(stage);
    stage
      .querySelector('.room-page__nav--right')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.room-page__nav--right')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.shop-page__slot-row--interactive')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const tabButtons = [...stage.querySelectorAll('.shop-page__sell-tab-button')];
    const herbsButton = tabButtons.find((button) => button.textContent === 'herbs');
    const potionsButton = tabButtons.find((button) => button.textContent === 'potions');

    herbsButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const sageHerbButton = [...stage.querySelectorAll('.shop-page__sell-item-button')].find(
      (button) => button.textContent === 'Sage (0) 2 gold',
    );
    expect(sageHerbButton.closest('.shop-page__sell-item-row').hidden).toBe(false);

    potionsButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const manaTonicButton = [...stage.querySelectorAll('.shop-page__sell-item-button')].find(
      (button) => button.textContent === 'Mana Tonic (0) 5 gold',
    );
    expect(manaTonicButton.closest('.shop-page__sell-item-row').hidden).toBe(false);
  });

  it('hides shop sell picker with Escape or outside click', () => {
    const stage = document.createElement('section');
    const pagesFacade = new PagesFacade({
      gameplayFacade: createGameplayFacadeFake(),
    });

    pagesFacade.mount(stage);
    stage
      .querySelector('.room-page__nav--right')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    stage
      .querySelector('.room-page__nav--right')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = stage.querySelector('.shop-page__sell-popup');
    const slot = stage.querySelector('.shop-page__slot-row--interactive');

    slot.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(popup.hidden).toBe(true);

    slot.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    popup.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(true);
  });
});
