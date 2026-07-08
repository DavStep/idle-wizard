export type SaveTaskCatalog = {
  levels: number[];
  tasks: Array<{
    id: string;
    level: number;
    quantity: number;
  }>;
  initialLevel: number;
  maxLevel: number;
};

type NormalizedSaveTask = {
  taskId: string;
  progressQuantity: number;
  completed: boolean;
  level: number;
  requiredQuantity: number;
};

export function normalizeSaveTasks(
  value: unknown,
  taskCatalog: SaveTaskCatalog,
  previousLevel: number | null,
) {
  const taskState = isRecord(value) ? value : {};
  const savedTasks = Array.isArray(taskState.tasks) ? taskState.tasks : [];
  const savedTasksById = new Map(
    savedTasks
      .filter((task): task is Record<string, unknown> => isRecord(task))
      .map((task) => [String(task.taskId ?? ''), task]),
  );
  const reportedLevel = taskState.currentLevel === undefined
    ? null
    : clampSaveInteger(
        taskState.currentLevel,
        taskCatalog.initialLevel,
        taskCatalog.maxLevel,
        taskCatalog.initialLevel,
      );
  const maxAllowedLevel = previousLevel === null
    ? taskCatalog.initialLevel
    : Math.min(taskCatalog.maxLevel, previousLevel + 1);
  const fallbackLevel = previousLevel ?? taskCatalog.initialLevel;
  const currentLevel = Math.min(
    reportedLevel ?? fallbackLevel,
    maxAllowedLevel,
  );
  const activeTaskLevel = getSaveRequirementTargetLevel(currentLevel, taskCatalog);
  const normalizedTasks = taskCatalog.tasks.map((task): NormalizedSaveTask => {
    const savedTask = savedTasksById.get(task.id);
    const progressQuantity = clampSaveInteger(
      savedTask?.progressQuantity,
      0,
      task.quantity,
      0,
    );
    const completed =
      task.level <= currentLevel ||
      (Boolean(savedTask?.completed) && progressQuantity >= task.quantity);

    return {
      taskId: task.id,
      progressQuantity: completed ? task.quantity : progressQuantity,
      completed,
      level: task.level,
      requiredQuantity: task.quantity,
    };
  });

  return {
    currentLevel,
    tasks: normalizedTasks
      .filter((task) => task.level === activeTaskLevel)
      .filter((task) => task.progressQuantity > 0 || task.completed)
      .map((task) => ({
        taskId: task.taskId,
        progressQuantity: task.progressQuantity,
        completed: task.completed,
      })),
  };
}

function getSaveRequirementTargetLevel(
  currentLevel: number,
  taskCatalog: SaveTaskCatalog,
): number {
  if (currentLevel >= taskCatalog.maxLevel) {
    return taskCatalog.maxLevel;
  }

  const firstTaskLevel = taskCatalog.levels[0] ?? taskCatalog.initialLevel;
  return Math.max(firstTaskLevel, Math.min(taskCatalog.maxLevel, currentLevel + 1));
}

function clampSaveInteger(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const numberValue = Math.floor(Number(value));

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, numberValue));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
