import taskBalance from '../tasks.json';
import {
  formatTaskRequirementLabel,
  normalizeTaskRequirementType,
  taskRequirementTypes,
} from '../taskRequirementTypes.js';

const MAX_TASKS_PER_LEVEL = 5;
const LEVEL_COMPLETION_COIN_COST_PER_LEVEL = 20;
const SEED_RESEARCH_PREFIX = 'unlockSeed:';
const RECIPE_RESEARCH_PREFIX = 'unlockRecipe:';

export class TaskBalanceManager {
  constructor({ balance = taskBalance, itemsFacade }) {
    this.balance = balance;
    this.itemsFacade = itemsFacade;
    this.setBalance(balance);
  }

  setRuntimeBalance(balance) {
    this.setBalance(balance);
  }

  setBalance(balance) {
    const levels = this.readLevels(balance);
    const tasks = levels.flatMap((level) => level.tasks);

    this.balance = balance;
    this.levels = levels;
    this.tasks = tasks;
    this.tasksById = new Map(tasks.map((task) => [task.id, task]));
    this.tasksByIndex = new Map(tasks.map((task) => [task.index, task]));
  }

  getLevels() {
    return this.levels;
  }

  getTasks() {
    return this.tasks;
  }

  getTask(taskId) {
    const task = this.tasksById.get(taskId);

    if (!task) {
      throw new Error(`Unknown task: ${taskId}`);
    }

    return task;
  }

  getTaskByIndex(index) {
    const task = this.tasksByIndex.get(index);

    if (!task) {
      throw new Error(`Unknown task index: ${index}`);
    }

    return task;
  }

  hasTask(taskId) {
    return this.tasksById.has(taskId);
  }

  getLevelTasks(levelNumber) {
    return this.levels.find((level) => level.level === levelNumber)?.tasks ?? [];
  }

  getLevelCompletionCostCoin(levelNumber) {
    const clampedLevel = this.clampLevelNumber(levelNumber);
    const configuredCost = this.levels.find((level) => level.level === clampedLevel)?.completionCostCoin;

    if (Number.isInteger(configuredCost) && configuredCost >= 0) {
      return configuredCost;
    }

    return clampedLevel * LEVEL_COMPLETION_COIN_COST_PER_LEVEL;
  }

  getInitialLevel() {
    return this.levels[0]?.level ?? 1;
  }

  getMaxLevel() {
    return this.levels.at(-1)?.level ?? this.getInitialLevel();
  }

  clampLevelNumber(levelNumber) {
    if (!Number.isInteger(levelNumber)) {
      return this.getInitialLevel();
    }

    return Math.max(this.getInitialLevel(), Math.min(levelNumber, this.getMaxLevel()));
  }

  readLevels(balance = this.balance) {
    const levels = balance?.levels;

    if (!Array.isArray(levels) || levels.length <= 0) {
      throw new Error('game_config.tasks requires levels.');
    }

    const seenTaskIds = new Set();
    let taskIndex = 1;

    return levels.map((level, levelIndex) => {
      const levelNumber = levelIndex + 1;

      if (level?.level !== levelNumber) {
        throw new Error('game_config.tasks levels must be sequential starting at 1.');
      }

      if (
        !Array.isArray(level.tasks) ||
        level.tasks.length < 1 ||
        level.tasks.length > MAX_TASKS_PER_LEVEL
      ) {
        throw new Error('game_config.tasks requires 1 to 5 tasks per level.');
      }

      const completionCostValue = level.completionCostCoin ?? level.completionCostGold;
      const completionCostCoin =
        completionCostValue === undefined
          ? undefined
          : Math.max(0, Math.floor(Number(completionCostValue)));

      return {
        level: levelNumber,
        ...(Number.isInteger(completionCostCoin) ? { completionCostCoin } : {}),
        tasks: level.tasks.map((task) => {
          if (!task || typeof task.id !== 'string' || task.id.length <= 0) {
            throw new Error('game_config.tasks task id must be a non-empty string.');
          }

          if (seenTaskIds.has(task.id)) {
            throw new Error(`Duplicate task id: ${task.id}`);
          }

          if (!Number.isInteger(task.quantity) || task.quantity <= 0) {
            throw new Error(`Task ${task.id} quantity must be a positive integer.`);
          }

          const type = normalizeTaskRequirementType(task.type);

          if (!type) {
            throw new Error(`Task ${task.id} type is invalid.`);
          }

          const target = this.readTaskTarget(task, type);
          seenTaskIds.add(task.id);

          return {
            id: task.id,
            index: taskIndex++,
            level: levelNumber,
            type,
            action: type,
            researchId: target.researchId,
            itemKey: target.item?.key ?? null,
            itemTypeId: target.item?.id ?? null,
            itemLabel: target.item?.label ?? target.targetLabel,
            itemKind: target.item?.kind ?? null,
            targetLabel: target.targetLabel,
            requirementLabel: formatTaskRequirementLabel(type, target.targetLabel),
            requiredQuantity: task.quantity,
          };
        }),
      };
    });
  }

  readTaskTarget(task, type) {
    if (type === taskRequirementTypes.RESEARCH) {
      const researchId =
        typeof task.researchId === 'string' ? task.researchId.trim() : '';

      if (!researchId) {
        throw new Error(`Task ${task.id} researchId must be a non-empty string.`);
      }

      const targetItemKey =
        typeof task.itemKey === 'string' && task.itemKey.trim().length > 0
          ? task.itemKey.trim()
          : getResearchTargetItemKey(researchId);
      const item = targetItemKey
        ? this.itemsFacade.getItemDefinitionByKey(targetItemKey)
        : null;

      if (!item) {
        throw new Error(`Task ${task.id} research target item is invalid.`);
      }

      return {
        researchId,
        item,
        targetLabel: item.label,
      };
    }

    const item = this.itemsFacade.getItemDefinitionByKey(task.itemKey);

    return {
      researchId: null,
      item,
      targetLabel: item.label,
    };
  }
}

function getResearchTargetItemKey(researchId) {
  if (researchId.startsWith(SEED_RESEARCH_PREFIX)) {
    return researchId.slice(SEED_RESEARCH_PREFIX.length);
  }

  if (researchId.startsWith(RECIPE_RESEARCH_PREFIX)) {
    return researchId.slice(RECIPE_RESEARCH_PREFIX.length);
  }

  return null;
}
