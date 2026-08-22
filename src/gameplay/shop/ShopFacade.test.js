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
  it('starts with one unlocked NPC stall so the level-two market lesson is playable', () => {
    const gameplayFacade = createGameplayAtLevel(1);

    expect(gameplayFacade.getSnapshot().shop.shelf).toMatchObject({
      unlockedSlots: 1,
      maxSlots: 1,
      maxUnlockedSlotsByLevel: 1,
      slotCosts: [50, 150, 400, 1000, 2500],
      nextSlotNumber: null,
      nextSlotCost: null,
      nextSlotLockedByLevel: false,
      slots: [{ slotNumber: 1, unlocked: true }],
    });
    expect(gameplayFacade.getSnapshot().coin.current).toBe(0);
  });

  it('keeps a higher-rank next stall level-locked until its milestone', () => {
    const gameplayFacade = createGameplayAtLevel(4);
    gameplayFacade.marketLicenceFacade.getStallCount = () => 2;

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
