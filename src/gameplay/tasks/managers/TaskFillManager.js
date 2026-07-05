import { taskRequirementTypes } from '../taskRequirementTypes.js';

export class TaskFillManager {
  constructor({ itemsFacade, taskBalanceManager, taskStateEntityManager }) {
    this.itemsFacade = itemsFacade;
    this.taskBalanceManager = taskBalanceManager;
    this.taskStateEntityManager = taskStateEntityManager;
  }

  fillTask(taskId) {
    const task = this.taskBalanceManager.getTask(taskId);
    const currentLevel = this.taskStateEntityManager.getCurrentLevel();

    if (!this.taskBalanceManager.isTaskActiveForCurrentLevel(task, currentLevel)) {
      return { ok: false, reason: 'not_current_level', taskId };
    }

    if (this.taskStateEntityManager.isCompleted(taskId)) {
      return { ok: false, reason: 'already_completed', taskId };
    }

    if (task.type !== taskRequirementTypes.TURN_IN) {
      return { ok: false, reason: 'not_turn_in_requirement', taskId };
    }

    const progressQuantity = this.taskStateEntityManager.getProgress(taskId);

    if (progressQuantity >= task.requiredQuantity) {
      return this.completeFilledTask(task);
    }

    const remainingQuantity = task.requiredQuantity - progressQuantity;
    const ownedQuantity = this.itemsFacade.getItemQuantity(task.itemTypeId);
    const fillQuantity = Math.min(ownedQuantity, remainingQuantity);

    if (fillQuantity <= 0) {
      return { ok: false, reason: 'not_enough_items', taskId };
    }

    const removed = this.itemsFacade.removeItem(task.itemTypeId, fillQuantity);

    if (!removed) {
      return { ok: false, reason: 'not_enough_items', taskId };
    }

    const nextProgressQuantity = this.taskStateEntityManager.addProgress(taskId, fillQuantity);

    const result = {
      ok: true,
      taskId,
      item: {
        itemTypeId: task.itemTypeId,
        key: task.itemKey,
        label: task.itemLabel,
        kind: task.itemKind,
      },
      quantity: fillQuantity,
      progressQuantity: nextProgressQuantity,
      requiredQuantity: task.requiredQuantity,
      maxed: nextProgressQuantity >= task.requiredQuantity,
    };

    if (result.maxed) {
      const completion = this.taskStateEntityManager.completeTask(taskId);
      result.completed = true;
      result.levelBefore = completion.levelBefore;
      result.currentLevel = completion.levelAfter;
      result.advanced = completion.advanced;
      result.completedAllLevels = completion.completedAllLevels;
    } else {
      result.completed = false;
    }

    return result;
  }

  completeFilledTask(task) {
    const completion = this.taskStateEntityManager.completeTask(task.id);

    return {
      ok: true,
      taskId: task.id,
      item: {
        itemTypeId: task.itemTypeId,
        key: task.itemKey,
        label: task.itemLabel,
        kind: task.itemKind,
      },
      quantity: 0,
      progressQuantity: task.requiredQuantity,
      requiredQuantity: task.requiredQuantity,
      maxed: true,
      completed: true,
      levelBefore: completion.levelBefore,
      currentLevel: completion.levelAfter,
      advanced: completion.advanced,
      completedAllLevels: completion.completedAllLevels,
    };
  }

  completeTask(taskId) {
    const task = this.taskBalanceManager.getTask(taskId);
    const currentLevel = this.taskStateEntityManager.getCurrentLevel();

    if (!this.taskBalanceManager.isTaskActiveForCurrentLevel(task, currentLevel)) {
      return { ok: false, reason: 'not_current_level', taskId };
    }

    if (this.taskStateEntityManager.isCompleted(taskId)) {
      return { ok: false, reason: 'already_completed', taskId };
    }

    if (this.taskStateEntityManager.getProgress(taskId) < task.requiredQuantity) {
      return { ok: false, reason: 'not_ready', taskId };
    }

    const completion = this.taskStateEntityManager.completeTask(taskId);

    return {
      ok: true,
      taskId,
      level: task.level,
      levelBefore: completion.levelBefore,
      currentLevel: completion.levelAfter,
      advanced: completion.advanced,
      completedAllLevels: completion.completedAllLevels,
    };
  }
}
