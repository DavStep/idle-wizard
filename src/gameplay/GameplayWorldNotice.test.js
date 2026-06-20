import { describe, expect, it } from 'vitest';

import { EcsFacade } from '../ecs/EcsFacade.js';
import { GameplayFacade } from './GameplayFacade.js';
import { WORLD_NOTICE_ACTIONS } from './worldNotice/WorldNoticeFacade.js';

function createGameplay({ persistenceNow = () => Date.UTC(2026, 5, 20, 12, 0) } = {}) {
  const ecsFacade = new EcsFacade();
  const gameplayFacade = new GameplayFacade({ persistenceNow });

  ecsFacade.createWorld();
  gameplayFacade.initialize(ecsFacade);

  return {
    ecsFacade,
    gameplayFacade,
  };
}

function finishCurrentTaskLevel(gameplayFacade) {
  const tasks = gameplayFacade.getSnapshot().tasks.level.tasks;

  for (const task of tasks) {
    gameplayFacade.itemsFacade.addItem(task.itemTypeId, task.requiredQuantity);
    gameplayFacade.fillTask(task.taskId);
    gameplayFacade.completeTask(task.taskId);
  }

  gameplayFacade.goldFacade.add(gameplayFacade.getSnapshot().tasks.level.completion.costGold);
  gameplayFacade.completeTaskLevel();
}

function advanceToLevel(gameplayFacade, targetLevel) {
  while (gameplayFacade.getSnapshot().tasks.currentLevel < targetLevel) {
    finishCurrentTaskLevel(gameplayFacade);
  }
}

describe('Gameplay world notice integration', () => {
  it('unlocks world notices at level 4 and donates gold through gameplay', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    expect(gameplayFacade.getSnapshot().worldNotice.unlocked).toBe(false);

    advanceToLevel(gameplayFacade, 4);
    gameplayFacade.goldFacade.add(1000);

    const donateRequest = gameplayFacade
      .getSnapshot()
      .worldNotice.current.requests.find(
        (request) => request.actionType === WORLD_NOTICE_ACTIONS.DONATE_GOLD,
      );
    const result = gameplayFacade.donateWorldNoticeGold(donateRequest.requestId);
    const updatedRequest = gameplayFacade
      .getSnapshot()
      .worldNotice.current.requests.find(
        (request) => request.requestId === donateRequest.requestId,
      );

    expect(result.ok).toBe(true);
    expect(updatedRequest.completed).toBe(true);

    gameplayFacade.shutdown();
    ecsFacade.destroyWorld();
  });
});
