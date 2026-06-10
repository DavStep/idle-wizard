import taskBalance from '../tasks.json';

const TASKS_PER_LEVEL = 5;

export class TaskBalanceManager {
  constructor({ balance = taskBalance, itemsFacade }) {
    this.balance = balance;
    this.itemsFacade = itemsFacade;
    this.levels = this.readLevels();
    this.tasks = this.levels.flatMap((level) => level.tasks);
    this.tasksById = new Map(this.tasks.map((task) => [task.id, task]));
    this.tasksByIndex = new Map(this.tasks.map((task) => [task.index, task]));
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

  getInitialLevel() {
    return this.levels[0]?.level ?? 1;
  }

  getMaxLevel() {
    return this.levels.at(-1)?.level ?? this.getInitialLevel();
  }

  readLevels() {
    const levels = this.balance?.levels;

    if (!Array.isArray(levels) || levels.length <= 0) {
      throw new Error('tasks.json requires levels.');
    }

    const seenTaskIds = new Set();
    let taskIndex = 1;

    return levels.map((level, levelIndex) => {
      const levelNumber = levelIndex + 1;

      if (level?.level !== levelNumber) {
        throw new Error('tasks.json levels must be sequential starting at 1.');
      }

      if (!Array.isArray(level.tasks) || level.tasks.length !== TASKS_PER_LEVEL) {
        throw new Error('tasks.json requires exactly 5 tasks per level.');
      }

      return {
        level: levelNumber,
        tasks: level.tasks.map((task) => {
          if (!task || typeof task.id !== 'string' || task.id.length <= 0) {
            throw new Error('tasks.json task id must be a non-empty string.');
          }

          if (seenTaskIds.has(task.id)) {
            throw new Error(`Duplicate task id: ${task.id}`);
          }

          if (!Number.isInteger(task.quantity) || task.quantity <= 0) {
            throw new Error(`Task ${task.id} quantity must be a positive integer.`);
          }

          const item = this.itemsFacade.getItemDefinitionByKey(task.itemKey);
          seenTaskIds.add(task.id);

          return {
            id: task.id,
            index: taskIndex++,
            level: levelNumber,
            action: 'drop',
            itemKey: item.key,
            itemTypeId: item.id,
            itemLabel: item.label,
            itemKind: item.kind,
            requiredQuantity: task.quantity,
          };
        }),
      };
    });
  }
}
