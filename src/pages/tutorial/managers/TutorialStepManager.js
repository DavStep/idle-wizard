const SAGE_SEED_RESEARCH_ID = 'unlockSeed:sageSeed';
const SAGE_SEED_KEY = 'sageSeed';
const SAGE_HERB_KEY = 'sageHerb';

const STEP_IDS = [
  'open-tasks',
  'research-sage-seed',
  'summon-first-seed',
  'grow-sage',
  'finish-first-task',
];

const STEPS = [
  {
    id: 'open-tasks',
    pageId: 'workshop',
    targetId: 'workshop:tasks',
    text: 'open tasks',
    isAvailable: ({ dom }) => !dom.isTasksExpanded(),
    isComplete: ({ dom }) => dom.isTasksExpanded(),
  },
  {
    id: 'research-sage-seed',
    pageId: 'research',
    targetId: `research:${SAGE_SEED_RESEARCH_ID}`,
    text: 'research sage seed',
    isComplete: ({ snapshot }) => hasCompletedResearch(snapshot, SAGE_SEED_RESEARCH_ID),
  },
  {
    id: 'summon-first-seed',
    pageId: 'workshop',
    getTargetId: ({ snapshot }) =>
      snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : 'workshop:manaSphere',
    getText: ({ snapshot }) =>
      snapshot?.seedSummoning?.canSummon ? 'summon seed' : 'wait for mana',
    isComplete: ({ snapshot }) => getItemQuantity(snapshot, SAGE_SEED_KEY) > 0,
  },
  {
    id: 'grow-sage',
    pageId: 'garden',
    getTargetId: ({ dom, snapshot }) => {
      const tile = getGrowTile(snapshot);

      if (!tile) {
        return null;
      }

      if (tile.phase === 'ready') {
        return `garden:plot:${tile.tileNumber}`;
      }

      if (dom.isGardenSeedPopupOpen()) {
        return `garden:seed:${SAGE_SEED_KEY}`;
      }

      if (tile.phase === 'empty' && tile.selectedSeedItemTypeId) {
        return `garden:plot:${tile.tileNumber}`;
      }

      return `garden:plot:${tile.tileNumber}:label`;
    },
    getText: ({ dom, snapshot }) => {
      const tile = getGrowTile(snapshot);

      if (tile?.phase === 'ready') {
        return 'harvest sage';
      }

      if (dom.isGardenSeedPopupOpen()) {
        return 'choose sage seed';
      }

      if (tile?.phase === 'empty' && tile.selectedSeedItemTypeId) {
        return 'plant sage seed';
      }

      return 'choose a seed';
    },
    isAvailable: ({ snapshot }) => {
      const tile = getGrowTile(snapshot);

      if (!tile) {
        return false;
      }

      if (tile.phase === 'ready') {
        return true;
      }

      if (tile.phase !== 'empty') {
        return false;
      }

      return getItemQuantity(snapshot, SAGE_SEED_KEY) > 0;
    },
    isComplete: ({ snapshot }) => getItemQuantity(snapshot, SAGE_HERB_KEY) > 0,
  },
  {
    id: 'finish-first-task',
    pageId: 'workshop',
    getTargetId: ({ dom, snapshot, progress }) => {
      if (!dom.isTasksExpanded()) {
        return 'workshop:tasks';
      }

      const task = getGuidedTask(snapshot, progress) ?? getActionableTask(snapshot);
      return task ? `task:${task.taskId}` : null;
    },
    getText: ({ dom, snapshot, progress }) => {
      if (!dom.isTasksExpanded()) {
        return 'open tasks';
      }

      const task = getGuidedTask(snapshot, progress) ?? getActionableTask(snapshot);
      return task?.canComplete ? 'complete task' : 'fill task';
    },
    isAvailable: ({ snapshot, progress }) => {
      const task = getGuidedTask(snapshot, progress) ?? getActionableTask(snapshot);
      return Boolean(task?.canFill || task?.canComplete);
    },
    isComplete: ({ snapshot, progress }) => {
      const task = getGuidedTask(snapshot, progress);
      return Boolean(task?.completed);
    },
    onStart: ({ snapshot, progress }) => {
      const task = getActionableTask(snapshot) ?? getFirstIncompleteTask(snapshot);
      progress.guidedTaskId = task?.taskId ?? null;
    },
  },
];

export class TutorialStepManager {
  constructor({ progressManager, getCurrentPageId }) {
    this.progressManager = progressManager;
    this.getCurrentPageId = getCurrentPageId;
    this.activeStepId = null;
    this.guidedTaskId = null;
  }

  getActiveStep({ snapshot, dom }) {
    if (this.progressManager.isSkipped()) {
      return null;
    }

    this.syncSnapshotProgress(snapshot);

    for (const step of STEPS) {
      const context = this.createContext({ step, snapshot, dom });

      if (this.progressManager.hasCompleted(step.id)) {
        continue;
      }

      if (step.isComplete?.(context)) {
        this.progressManager.complete(step.id);
        continue;
      }

      if (step.isAvailable && !step.isAvailable(context)) {
        continue;
      }

      if (this.activeStepId !== step.id) {
        this.activeStepId = step.id;
        step.onStart?.(context);
      }

      return this.createViewModel(step, context);
    }

    this.activeStepId = null;
    return null;
  }

  syncSnapshotProgress(snapshot) {
    if (!snapshot) {
      return;
    }

    if (isPastFtueLevel(snapshot) || hasCompletedCurrentLevelTasks(snapshot)) {
      this.completeSteps(STEP_IDS);
      return;
    }

    if (this.progressManager.hasCompleted('complete-first-task')) {
      this.completeSteps(STEP_IDS);
      return;
    }

    if (this.progressManager.hasCompleted('fill-first-task')) {
      this.completeSteps([
        'open-tasks',
        'research-sage-seed',
        'summon-first-seed',
        'grow-sage',
      ]);
      return;
    }

    if (this.progressManager.hasCompleted('harvest-sage')) {
      this.completeSteps([
        'open-tasks',
        'research-sage-seed',
        'summon-first-seed',
        'grow-sage',
      ]);
      return;
    }

    if (this.progressManager.hasCompleted('plant-sage-seed')) {
      this.completeSteps(['open-tasks', 'research-sage-seed', 'summon-first-seed']);
    }

    const hasSeedOrLater =
      getItemQuantity(snapshot, SAGE_SEED_KEY) > 0 ||
      getActiveGardenTile(snapshot) ||
      getItemQuantity(snapshot, SAGE_HERB_KEY) > 0 ||
      hasAnyTaskProgress(snapshot) ||
      hasCompletedAnyTask(snapshot);
    const hasGrownSage =
      getItemQuantity(snapshot, SAGE_HERB_KEY) > 0 ||
      hasTaskProgressForItem(snapshot, SAGE_HERB_KEY) ||
      hasCompletedTaskForItem(snapshot, SAGE_HERB_KEY);

    if (hasGrownSage) {
      this.completeSteps([
        'open-tasks',
        'research-sage-seed',
        'summon-first-seed',
        'grow-sage',
      ]);
      return;
    }

    if (hasSeedOrLater) {
      this.completeSteps(['open-tasks', 'research-sage-seed', 'summon-first-seed']);
      return;
    }

    if (hasCompletedResearch(snapshot, SAGE_SEED_RESEARCH_ID)) {
      this.completeSteps(['open-tasks', 'research-sage-seed']);
    }
  }

  completeSteps(stepIds) {
    if (typeof this.progressManager.completeMany === 'function') {
      this.progressManager.completeMany(stepIds);
      return;
    }

    for (const stepId of stepIds) {
      this.progressManager.complete(stepId);
    }
  }

  createContext({ step, snapshot, dom }) {
    return {
      dom,
      progress: this,
      snapshot,
      step,
    };
  }

  createViewModel(step, context) {
    const currentPageId = this.getCurrentPageId?.();
    const stepLabel = getStepLabel(step.id);

    if (step.pageId && currentPageId !== step.pageId) {
      return {
        id: step.id,
        targetId: `page:${step.pageId}`,
        text: `open ${formatPageLabel(step.pageId)}`,
        stepLabel,
      };
    }

    return {
      id: step.id,
      targetId: step.getTargetId?.(context) ?? step.targetId,
      text: step.getText?.(context) ?? step.text,
      stepLabel,
    };
  }
}

function hasCompletedResearch(snapshot, researchId) {
  return (snapshot?.research?.completedResearchIds ?? []).includes(researchId);
}

function getItemQuantity(snapshot, itemKey) {
  const inventories = [
    snapshot?.inventory ?? [],
    snapshot?.seedInventory ?? [],
    snapshot?.garden?.seeds ?? [],
    snapshot?.garden?.herbs ?? [],
  ];

  return inventories
    .flat()
    .filter((item) => item?.key === itemKey)
    .reduce((total, item) => total + (Number(item.quantity) || 0), 0);
}

function getGrowTile(snapshot) {
  const tiles = (snapshot?.garden?.plot?.tiles ?? []).filter((tile) => tile.unlocked);

  return (
    tiles.find((tile) => tile.phase === 'ready') ??
    tiles.find((tile) => tile.phase === 'empty') ??
    tiles.find((tile) => tile.phase === 'growing' || tile.phase === 'harvesting') ??
    null
  );
}

function getActiveGardenTile(snapshot) {
  return (snapshot?.garden?.plot?.tiles ?? []).find(
    (tile) =>
      tile.unlocked &&
      (tile.phase === 'growing' || tile.phase === 'ready' || tile.phase === 'harvesting'),
  );
}

function getCurrentTasks(snapshot) {
  return snapshot?.tasks?.level?.tasks ?? [];
}

function getFirstIncompleteTask(snapshot) {
  return getCurrentTasks(snapshot).find((task) => !task.completed) ?? null;
}

function getActionableTask(snapshot) {
  return (
    getCurrentTasks(snapshot).find((task) => !task.completed && task.canComplete) ??
    getCurrentTasks(snapshot).find((task) => !task.completed && task.canFill) ??
    null
  );
}

function getGuidedTask(snapshot, progress) {
  return (
    getCurrentTasks(snapshot).find((task) => task.taskId === progress.guidedTaskId) ?? null
  );
}

function hasAnyTaskProgress(snapshot) {
  return getCurrentTasks(snapshot).some((task) => task.progressQuantity > 0);
}

function hasCompletedAnyTask(snapshot) {
  return getCurrentTasks(snapshot).some((task) => task.completed);
}

function hasTaskProgressForItem(snapshot, itemKey) {
  return getCurrentTasks(snapshot).some(
    (task) => task.itemKey === itemKey && task.progressQuantity > 0,
  );
}

function hasCompletedTaskForItem(snapshot, itemKey) {
  return getCurrentTasks(snapshot).some((task) => task.itemKey === itemKey && task.completed);
}

function hasCompletedCurrentLevelTasks(snapshot) {
  const tasks = getCurrentTasks(snapshot);

  if (tasks.length === 0) {
    return false;
  }

  return tasks.every((task) => task.completed);
}

function isPastFtueLevel(snapshot) {
  return (snapshot?.tasks?.currentLevel ?? 1) >= 2;
}

function getStepLabel(stepId) {
  const index = STEP_IDS.indexOf(stepId);
  return index >= 0 ? `${index + 1}/${STEP_IDS.length}` : '';
}

function formatPageLabel(pageId) {
  return pageId === 'shop' ? 'market' : pageId;
}
