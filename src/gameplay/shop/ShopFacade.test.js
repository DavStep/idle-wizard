import { describe, expect, it } from 'vitest';

import { EcsFacade } from '../../ecs/EcsFacade.js';
import { GameplayFacade } from '../GameplayFacade.js';

function createGameplayAtLevel(level) {
  const ecsFacade = new EcsFacade();
  const gameplayFacade = new GameplayFacade();
  ecsFacade.createWorld();
  gameplayFacade.initialize(ecsFacade);
  gameplayFacade.tasksFacade.applyPersistenceSnapshot({
    currentLevel: level,
    tasks: [],
  });
  gameplayFacade.coinFacade.applyPersistenceSnapshot({
    current: 0,
    totalGenerated: 0,
  });
  return gameplayFacade;
}

describe('ShopFacade trader stall purchases', () => {
  it('shows only the next stall and buys it at the level-four price', () => {
    const gameplayFacade = createGameplayAtLevel(4);

    expect(gameplayFacade.getSnapshot().shop.shelf).toMatchObject({
      unlockedSlots: 0,
      maxSlots: 1,
      maxUnlockedSlotsByLevel: 1,
      slotCosts: [50, 150, 400, 1000, 2500],
      nextSlotNumber: 1,
      nextSlotCost: 50,
      nextSlotLockedByLevel: false,
      slots: [{ slotNumber: 1, unlocked: false }],
    });
    expect(gameplayFacade.buyShopShelfSlot()).toEqual({
      ok: false,
      reason: 'not_enough_coin',
      cost: 50,
      slotNumber: 1,
    });

    gameplayFacade.coinFacade.add(50);

    expect(gameplayFacade.buyShopShelfSlot()).toEqual({
      ok: true,
      cost: 50,
      slotNumber: 1,
    });
    expect(gameplayFacade.getSnapshot().shop.shelf).toMatchObject({
      unlockedSlots: 1,
      nextSlotNumber: null,
      nextSlotCost: null,
      slots: [{ slotNumber: 1, unlocked: true }],
    });
    expect(gameplayFacade.getSnapshot().coin.current).toBe(0);
  });

  it('keeps a higher-rank next stall level-locked until its milestone', () => {
    const gameplayFacade = createGameplayAtLevel(4);
    gameplayFacade.marketLicenceFacade.getStallCount = () => 2;
    gameplayFacade.shopFacade.shopShelfEntityManager.unlockNextSlot();

    expect(gameplayFacade.getSnapshot().shop.shelf).toMatchObject({
      unlockedSlots: 1,
      maxSlots: 2,
      maxUnlockedSlotsByLevel: 1,
      nextSlotNumber: 2,
      nextSlotCost: 150,
      nextSlotLockedByLevel: true,
      nextSlotRequiresLevel: 5,
      slots: [
        { slotNumber: 1, unlocked: true },
        { slotNumber: 2, unlocked: false },
      ],
    });
  });
});
