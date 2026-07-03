import { describe, expect, it } from 'vitest';

import { EcsFacade } from '../ecs/EcsFacade.js';
import { GameplayFacade } from './GameplayFacade.js';
import { taskRequirementTypes } from './tasks/taskRequirementTypes.js';
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
    finishTaskRequirement(gameplayFacade, task);
  }

  gameplayFacade.coinFacade.add(gameplayFacade.getSnapshot().tasks.level.completion.costCoin);
  gameplayFacade.completeTaskLevel();
}

function finishTaskRequirement(gameplayFacade, task) {
  if (task.type === taskRequirementTypes.TURN_IN) {
    gameplayFacade.itemsFacade.addItem(task.itemTypeId, task.requiredQuantity);
    gameplayFacade.fillTask(task.taskId);
    gameplayFacade.completeTask(task.taskId);
    return;
  }

  gameplayFacade.tasksFacade.recordAction({
    type: task.type,
    itemKey: task.itemKey,
    researchId: task.researchId,
    quantity: task.requiredQuantity,
  });
}

function advanceToLevel(gameplayFacade, targetLevel) {
  while (gameplayFacade.getSnapshot().tasks.currentLevel < targetLevel) {
    finishCurrentTaskLevel(gameplayFacade);
  }
}

describe('Gameplay world event integration', () => {
  it('unlocks world events at level 4 and tracks donation quests', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    expect(gameplayFacade.getSnapshot().worldNotice.unlocked).toBe(false);

    advanceToLevel(gameplayFacade, 4);

    gameplayFacade.coinFacade.add(50);

    const request = gameplayFacade.getSnapshot().worldNotice.current.requests.find(
      (candidate) =>
        candidate.donationOptions.some((option) => option.resourceType === 'coin'),
    );
    expect(request.actionType).toBe(WORLD_NOTICE_ACTIONS.DONATE_RESOURCES);

    const result = gameplayFacade.donateWorldNoticeResource(
      request.requestId,
      'coin',
      25,
    );
    const updatedRequest = gameplayFacade
      .getSnapshot()
      .worldNotice.current.requests.find(
        (candidate) => candidate.requestId === request.requestId,
      );

    expect(result.ok).toBe(true);
    expect(result.pointsAdded).toBe(25);
    expect(updatedRequest.contributionPoints).toBe(25);

    gameplayFacade.shutdown();
    ecsFacade.destroyWorld();
  });
});
