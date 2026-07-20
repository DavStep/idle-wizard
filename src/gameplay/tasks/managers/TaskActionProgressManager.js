import {
  isActionRequirement,
  taskRequirementTypes,
} from '../taskRequirementTypes.js';

export class TaskActionProgressManager {
  constructor({ taskBalanceManager, taskStateEntityManager }) {
    this.taskBalanceManager = taskBalanceManager;
    this.taskStateEntityManager = taskStateEntityManager;
    this.researchFacade = null;
  }

  setResearchFacade(researchFacade) {
    this.researchFacade = researchFacade;
  }

  recordAction({ type, itemKey = null, researchId = null, quantity = 1 } = {}) {
    const safeQuantity = Math.max(0, Math.floor(Number(quantity) || 0));

    if (!type || safeQuantity <= 0) {
      return {
        ok: false,
        updates: [],
      };
    }

    const updates = [];
    const task = this.taskStateEntityManager.getActiveTask();

    if (task && this.matchesAction(task, { type, itemKey, researchId })) {
      const update = this.addActionProgress(task, safeQuantity);

      if (update) {
        updates.push(update);
      }
    }

    return {
      ok: updates.length > 0,
      updates,
    };
  }

  syncCurrentLevelStateRequirements() {
    const updates = [];

    while (true) {
      const task = this.taskStateEntityManager.getActiveTask();

      if (!task) {
        break;
      }

      if (
        isActionRequirement(task.type) &&
        task.type === taskRequirementTypes.RESEARCH &&
        this.researchFacade?.hasCompletedResearch?.(task.researchId)
      ) {
        this.taskStateEntityManager.setProgress(task.id, task.requiredQuantity);
      }

      if (this.taskStateEntityManager.getProgress(task.id) >= task.requiredQuantity) {
        const completion = this.taskStateEntityManager.completeTask(task.id);
        updates.push({
          taskId: task.id,
          progressQuantity: task.requiredQuantity,
          requiredQuantity: task.requiredQuantity,
          completed: true,
          levelBefore: completion.levelBefore,
          currentLevel: completion.levelAfter,
        });
        continue;
      }

      break;
    }

    return {
      ok: updates.length > 0,
      updates,
    };
  }

  matchesAction(task, { type, itemKey = null, researchId = null } = {}) {
    if (!isActionRequirement(task.type) || task.type !== type) {
      return false;
    }

    if (this.taskStateEntityManager.isCompleted(task.id)) {
      return false;
    }

    if (task.type === taskRequirementTypes.RESEARCH) {
      return Boolean(researchId && task.researchId === researchId);
    }

    return Boolean(itemKey && task.itemKey === itemKey);
  }

  addActionProgress(task, quantity) {
    const progressQuantity = this.taskStateEntityManager.getProgress(task.id);

    if (progressQuantity >= task.requiredQuantity) {
      return null;
    }

    const nextProgressQuantity = this.taskStateEntityManager.addProgress(task.id, quantity);
    const update = {
      taskId: task.id,
      progressQuantity: nextProgressQuantity,
      requiredQuantity: task.requiredQuantity,
      completed: false,
    };

    if (nextProgressQuantity >= task.requiredQuantity) {
      const completion = this.taskStateEntityManager.completeTask(task.id);
      update.completed = true;
      update.levelBefore = completion.levelBefore;
      update.currentLevel = completion.levelAfter;
    }

    return update;
  }
}
