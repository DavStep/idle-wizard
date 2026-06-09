import { describe, expect, it } from 'vitest';

import { EcsFacade } from '../ecs/EcsFacade.js';
import { GameplayFacade } from './GameplayFacade.js';

function createGameplay() {
  const ecsFacade = new EcsFacade();
  const gameplayFacade = new GameplayFacade();
  ecsFacade.createWorld();
  gameplayFacade.initialize(ecsFacade);
  return { ecsFacade, gameplayFacade };
}

describe('GameplayFacade', () => {
  it('generates mana up to the mana cap', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    ecsFacade.update({ deltaSeconds: 1_000 });

    expect(gameplayFacade.getSnapshot().mana).toEqual({
      current: 50,
      cap: 50,
      perSecond: 1,
    });
  });

  it('spends mana to summon a seed into inventory', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    ecsFacade.update({ deltaSeconds: 10 });
    const result = gameplayFacade.summonSeed();
    const snapshot = gameplayFacade.getSnapshot();

    expect(result.ok).toBe(true);
    expect(result.cost).toBe(10);
    expect(result.seed.dropWeight).toBe(1);
    expect(snapshot.mana.current).toBe(0);
    expect(result.seed.label).toMatch(/Seed$/);
    expect(snapshot.inventory).toEqual([
      {
        itemTypeId: result.seed.id,
        key: result.seed.key,
        label: result.seed.label,
        kind: 'seed',
        quantity: 1,
      },
    ]);
    expect(snapshot.seedInventory).toHaveLength(14);
    expect(snapshot.seedInventory).toContainEqual(
      {
        itemTypeId: result.seed.id,
        key: result.seed.key,
        label: result.seed.label,
        kind: 'seed',
        quantity: 1,
      },
    );
  });

  it('rejects seed summoning without enough mana', () => {
    const { gameplayFacade } = createGameplay();

    const result = gameplayFacade.summonSeed();

    expect(result).toEqual({
      ok: false,
      reason: 'not_enough_mana',
      cost: 10,
    });
    expect(gameplayFacade.getSnapshot().inventory).toEqual([]);
    expect(gameplayFacade.getSnapshot().seedInventory).toHaveLength(14);
    expect(gameplayFacade.getSnapshot().seedInventory).toContainEqual(
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'Sage Seed',
        kind: 'seed',
        quantity: 0,
      },
    );
    expect(gameplayFacade.getSnapshot().seedInventory).toContainEqual({
      itemTypeId: 14,
      key: 'dragonpepperSeed',
      label: 'Dragonpepper Seed',
      kind: 'seed',
      quantity: 0,
    });
  });

  it('exposes research boxes for mana, seeds, summon counts, and recipes', () => {
    const { gameplayFacade } = createGameplay();
    const research = gameplayFacade.getSnapshot().research;

    expect(research.boxes.map((box) => box.id)).toEqual([
      'manaSphere',
      'seedUnlocks',
      'summonSeeds',
      'recipeUnlocks',
    ]);
    expect(research.boxes[0].researches).toEqual([
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
    ]);
    expect(research.boxes[1].researches).toHaveLength(14);
    expect(research.boxes[1].researches[0]).toEqual({
      id: 'unlockSeed:sageSeed',
      label: 'Sage Seed',
      value: 'drop',
    });
    expect(research.boxes[2].researches).toEqual([
      {
        id: 'summonSeedsX2',
        label: 'x2 summon',
        value: '20 mana',
      },
      {
        id: 'summonSeedsX3',
        label: 'x3 summon',
        value: '30 mana',
      },
      {
        id: 'summonSeedsX4',
        label: 'x4 summon',
        value: '40 mana',
      },
      {
        id: 'summonSeedsX5',
        label: 'x5 summon',
        value: '50 mana',
      },
    ]);
    expect(research.boxes[3].researches).toHaveLength(18);
    expect(research.boxes[3].researches[0]).toEqual({
      id: 'unlockRecipe:manaTonic',
      label: 'Mana Tonic',
      value: 'brew',
    });
  });

  it('buys shop shelf slots with costs from shop balance', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    expect(gameplayFacade.getSnapshot().shop.shelf).toMatchObject({
      unlockedSlots: 1,
      maxSlots: 5,
      slotCosts: [0, 1, 3, 6, 10],
      nextSlotNumber: 2,
      nextSlotCost: 1,
      selectedSlotNumber: 1,
    });
    expect(gameplayFacade.getSnapshot().gold.current).toBe(0);

    ecsFacade.update({ deltaSeconds: 10 });
    const summonResult = gameplayFacade.summonSeed();
    expect(gameplayFacade.setSelectedShopShelfSlotSellItem(summonResult.seed.id)).toEqual({
      ok: true,
      slotNumber: 1,
      item: {
        itemTypeId: summonResult.seed.id,
        key: summonResult.seed.key,
        label: summonResult.seed.label,
        kind: 'seed',
      },
    });

    ecsFacade.update({ deltaSeconds: 5 });

    expect(gameplayFacade.getSnapshot().gold.current).toBe(1);
    expect(gameplayFacade.getSnapshot().inventory).toEqual([]);

    expect(gameplayFacade.buyShopShelfSlot()).toEqual({
      ok: true,
      cost: 1,
      slotNumber: 2,
    });
    expect(gameplayFacade.getSnapshot().gold.current).toBe(0);
    expect(gameplayFacade.getSnapshot().shop.shelf.unlockedSlots).toBe(2);
    expect(gameplayFacade.getSnapshot().shop.shelf.nextSlotCost).toBe(3);
  });

  it('rejects shop shelf slot purchase without enough gold', () => {
    const { gameplayFacade } = createGameplay();

    expect(gameplayFacade.buyShopShelfSlot()).toEqual({
      ok: false,
      reason: 'not_enough_gold',
      cost: 1,
      slotNumber: 2,
    });
    expect(gameplayFacade.getSnapshot().shop.shelf.unlockedSlots).toBe(1);
  });

  it('auto sells selected shop shelf item over time', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    ecsFacade.update({ deltaSeconds: 10 });
    const summonResult = gameplayFacade.summonSeed();
    gameplayFacade.setSelectedShopShelfSlotSellItem(summonResult.seed.id);

    ecsFacade.update({ deltaSeconds: 4 });

    expect(gameplayFacade.getSnapshot().gold.current).toBe(0);
    expect(gameplayFacade.getSnapshot().inventory).toHaveLength(1);

    ecsFacade.update({ deltaSeconds: 1 });

    expect(gameplayFacade.getSnapshot().gold.current).toBe(1);
    expect(gameplayFacade.getSnapshot().inventory).toEqual([]);
    expect(gameplayFacade.getSnapshot().shop.shelf.slots[0]).toMatchObject({
      slotNumber: 1,
      unlocked: true,
      sellItemTypeId: summonResult.seed.id,
      sellKind: 'seed',
      sellLabel: summonResult.seed.label,
    });
  });

  it('auto sells only the selected item type', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(1, 1);
    gameplayFacade.itemsFacade.addItem(2, 1);
    gameplayFacade.setSelectedShopShelfSlotSellItem(2);

    ecsFacade.update({ deltaSeconds: 5 });

    expect(gameplayFacade.getSnapshot().gold.current).toBe(1);
    expect(gameplayFacade.getSnapshot().inventory).toEqual([
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'Sage Seed',
        kind: 'seed',
        quantity: 1,
      },
    ]);
  });
});
