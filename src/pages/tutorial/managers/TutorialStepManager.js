const SAGE_SEED_RESEARCH_ID = 'unlockSeed:sageSeed';
const SAGE_SEED_KEY = 'sageSeed';
const SAGE_HERB_KEY = 'sageHerb';

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
    text: 'research Sage Seed',
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
    id: 'plant-sage-seed',
    pageId: 'garden',
    getTargetId: ({ dom, snapshot }) => {
      const tile = getFirstRelevantGardenTile(snapshot);

      if (!tile) {
        return null;
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
      const tile = getFirstRelevantGardenTile(snapshot);

      if (dom.isGardenSeedPopupOpen()) {
        return 'choose Sage Seed';
      }

      if (tile?.phase === 'empty' && tile.selectedSeedItemTypeId) {
        return 'plant Sage Seed';
      }

      return 'choose a seed';
    },
    isAvailable: ({ snapshot }) => getItemQuantity(snapshot, SAGE_SEED_KEY) > 0,
    isComplete: ({ snapshot }) => Boolean(getActiveGardenTile(snapshot)),
  },
  {
    id: 'harvest-sage',
    pageId: 'garden',
    getTargetId: ({ snapshot }) => {
      const tile = getActiveGardenTile(snapshot);
      return tile ? `garden:plot:${tile.tileNumber}` : null;
    },
    getText: ({ snapshot }) => {
      const tile = getActiveGardenTile(snapshot);

      if (tile?.phase === 'ready') {
        return 'harvest';
      }

      if (tile?.phase === 'harvesting') {
        return 'harvesting';
      }

      return 'growing';
    },
    isAvailable: ({ snapshot }) => Boolean(getActiveGardenTile(snapshot)),
    isComplete: ({ snapshot }) => getItemQuantity(snapshot, SAGE_HERB_KEY) > 0,
  },
  {
    id: 'fill-first-task',
    pageId: 'workshop',
    getTargetId: ({ snapshot }) => {
      const task = getFillableTask(snapshot);
      return task ? `task:${task.taskId}` : null;
    },
    getText: () => 'fill task',
    isAvailable: ({ snapshot }) => Boolean(getFillableTask(snapshot)),
    isComplete: ({ snapshot, progress }) =>
      hasAnyTaskProgress(snapshot, progress.startedTaskProgress),
    onStart: ({ snapshot, progress }) => {
      progress.startedTaskProgress = getTaskProgressMap(snapshot);
    },
  },
  {
    id: 'complete-first-task',
    pageId: 'workshop',
    getTargetId: ({ snapshot }) => {
      const task = getCompletableTask(snapshot);
      return task ? `task:${task.taskId}` : null;
    },
    getText: () => 'complete task',
    isAvailable: ({ snapshot }) => Boolean(getCompletableTask(snapshot)),
    isComplete: ({ snapshot }) => hasCompletedAnyTask(snapshot),
  },
];

export class TutorialStepManager {
  constructor({ progressManager, getCurrentPageId }) {
    this.progressManager = progressManager;
    this.getCurrentPageId = getCurrentPageId;
    this.activeStepId = null;
    this.startedTaskProgress = {};
  }

  getActiveStep({ snapshot, dom }) {
    if (this.progressManager.isSkipped()) {
      return null;
    }

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

    if (step.pageId && currentPageId !== step.pageId) {
      return {
        id: step.id,
        targetId: `page:${step.pageId}`,
        text: `open ${formatPageLabel(step.pageId)}`,
      };
    }

    return {
      id: step.id,
      targetId: step.getTargetId?.(context) ?? step.targetId,
      text: step.getText?.(context) ?? step.text,
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

function getFirstRelevantGardenTile(snapshot) {
  return (snapshot?.garden?.plot?.tiles ?? []).find((tile) => tile.unlocked) ?? null;
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

function getFillableTask(snapshot) {
  return getCurrentTasks(snapshot).find((task) => task.canFill);
}

function getCompletableTask(snapshot) {
  return getCurrentTasks(snapshot).find((task) => task.canComplete);
}

function getTaskProgressMap(snapshot) {
  return Object.fromEntries(
    getCurrentTasks(snapshot).map((task) => [task.taskId, task.progressQuantity]),
  );
}

function hasAnyTaskProgress(snapshot, startedTaskProgress = {}) {
  return getCurrentTasks(snapshot).some(
    (task) => task.progressQuantity > (startedTaskProgress[task.taskId] ?? 0),
  );
}

function hasCompletedAnyTask(snapshot) {
  return getCurrentTasks(snapshot).some((task) => task.completed);
}

function formatPageLabel(pageId) {
  return pageId === 'shop' ? 'market' : pageId;
}
