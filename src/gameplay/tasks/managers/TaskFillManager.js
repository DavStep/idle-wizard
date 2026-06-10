export class TaskFillManager {
  constructor({ itemsFacade, taskBalanceManager, taskStateEntityManager }) {
    this.itemsFacade = itemsFacade;
    this.taskBalanceManager = taskBalanceManager;
    this.taskStateEntityManager = taskStateEntityManager;
  }

  fillTask(taskId) {
    const task = this.taskBalanceManager.getTask(taskId);
    const currentLevel = this.taskStateEntityManager.getCurrentLevel();

    if (task.level !== currentLevel) {
      return { ok: false, reason: 'not_current_level', taskId };
    }

    if (this.taskStateEntityManager.isCompleted(taskId)) {
      return { ok: false, reason: 'already_completed', taskId };
    }

    const progressQuantity = this.taskStateEntityManager.getProgress(taskId);

    if (progressQuantity >= task.requiredQuantity) {
      return { ok: false, reason: 'ready_to_complete', taskId };
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

    return {
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
  }

  completeTask(taskId) {
    const task = this.taskBalanceManager.getTask(taskId);
    const currentLevel = this.taskStateEntityManager.getCurrentLevel();

    if (task.level !== currentLevel) {
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
      currentLevel: completion.levelAfter,
      advanced: completion.advanced,
      completedAllLevels: completion.completedAllLevels,
    };
  }
}
