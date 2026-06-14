const SAGE_SEED_KEY = 'sageSeed';
const SAGE_HERB_KEY = 'sageHerb';
const MINT_SEED_RESEARCH_ID = 'unlockSeed:mintSeed';
const LEVEL_ONE_SEED_TASK_ID = 'level1-sage-seeds';
const LEVEL_ONE_GOLD_TARGET = 15;

const STEP_IDS = [
  'open-tasks',
  'fill-sage-seed-task',
  'open-market',
  'select-sage-seed-sale',
  'earn-level-one-gold',
  'level-up-one',
  'grow-sage',
  'research-mint-seed',
];

const STEPS = [
  {
    id: 'open-tasks',
    pageId: 'workshop',
    targetId: 'workshop:tasks',
    text: 'open tasks',
    isAvailable: ({ dom, snapshot }) =>
      getCurrentLevel(snapshot) === 1 && !dom.isTasksExpanded(),
    isComplete: ({ dom, snapshot }) =>
      getCurrentLevel(snapshot) >= 2 ||
      dom.isTasksExpanded() ||
      hasAnyTaskProgress(snapshot) ||
      hasCompletedAnyTask(snapshot),
  },
  {
    id: 'fill-sage-seed-task',
    pageId: 'workshop',
    getTargetId: ({ dom, snapshot }) => {
      if (!dom.isTasksExpanded()) {
        return 'workshop:tasks';
      }

      const task = getLevelOneSeedTask(snapshot);

      if (task?.canFill || task?.canComplete) {
        return `task:${task.taskId}`;
      }

      return snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : 'workshop:manaSphere';
    },
    getText: ({ dom, snapshot }) => {
      if (!dom.isTasksExpanded()) {
        return 'open tasks';
      }

      const task = getLevelOneSeedTask(snapshot);

      if (task?.canComplete) {
        return 'complete task';
      }

      if (task?.canFill) {
        return 'fill task';
      }

      return snapshot?.seedSummoning?.canSummon ? 'summon seed' : 'wait for mana';
    },
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 && !isLevelOneSeedTaskComplete(snapshot),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 2 || isLevelOneSeedTaskComplete(snapshot),
  },
  {
    id: 'open-market',
    pageId: 'shop',
    targetId: 'shop:stand:1',
    text: 'select stand',
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 && isLevelOneSeedTaskComplete(snapshot),
    isComplete: ({ currentPageId, snapshot }) =>
      getCurrentLevel(snapshot) >= 2 ||
      currentPageId === 'shop' ||
      isNpcMarketSelling(snapshot, SAGE_SEED_KEY),
  },
  {
    id: 'select-sage-seed-sale',
    pageId: 'shop',
    getTargetId: ({ dom }) =>
      dom.isShopSellPopupOpen() ? `shop:sell:${SAGE_SEED_KEY}` : 'shop:stand:1',
    getText: ({ dom }) => (dom.isShopSellPopupOpen() ? 'choose sage seed' : 'select stand'),
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 && isLevelOneSeedTaskComplete(snapshot),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 2 || isNpcMarketSelling(snapshot, SAGE_SEED_KEY),
  },
  {
    id: 'earn-level-one-gold',
    pageId: 'shop',
    targetId: 'shop:stand:1',
    text: 'sell sage seeds',
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 && isNpcMarketSelling(snapshot, SAGE_SEED_KEY),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 2 || getGold(snapshot) >= LEVEL_ONE_GOLD_TARGET,
  },
  {
    id: 'level-up-one',
    pageId: 'workshop',
    getTargetId: ({ dom }) => (dom.isTasksExpanded() ? 'workshop:levelUp' : 'workshop:tasks'),
    getText: ({ dom }) => (dom.isTasksExpanded() ? 'level up' : 'open tasks'),
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      getGold(snapshot) >= LEVEL_ONE_GOLD_TARGET &&
      Boolean(snapshot?.tasks?.level?.completion?.canComplete),
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 2,
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
    isPaused: ({ snapshot }) => isGrowTileBusy(snapshot),
    isAvailable: ({ snapshot }) => {
      const tile = getGrowTile(snapshot);

      if (getCurrentLevel(snapshot) < 2 || !tile) {
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
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 3 ||
      getItemQuantity(snapshot, SAGE_HERB_KEY) > 0 ||
      hasTaskProgressForItem(snapshot, SAGE_HERB_KEY) ||
      hasCompletedTaskForItem(snapshot, SAGE_HERB_KEY),
  },
  {
    id: 'research-mint-seed',
    pageId: 'research',
    targetId: `research:${MINT_SEED_RESEARCH_ID}`,
    text: 'research mint seed',
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) >= 2,
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 3 || hasStartedOrCompletedResearch(snapshot, MINT_SEED_RESEARCH_ID),
  },
];

export class TutorialStepManager {
  constructor({ progressManager, getCurrentPageId }) {
    this.progressManager = progressManager;
    this.getCurrentPageId = getCurrentPageId;
    this.activeStepId = null;
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

      if (step.isPaused?.(context)) {
        this.activeStepId = step.id;
        return null;
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

    if (getCurrentLevel(snapshot) >= 3) {
      this.completeSteps(STEP_IDS);
      return;
    }

    if (getCurrentLevel(snapshot) >= 2) {
      this.completeSteps([
        'open-tasks',
        'fill-sage-seed-task',
        'open-market',
        'select-sage-seed-sale',
        'earn-level-one-gold',
        'level-up-one',
      ]);
    }

    if (this.progressManager.hasCompleted('finish-first-task')) {
      this.completeSteps(['open-tasks', 'fill-sage-seed-task']);
    }

    if (isLevelOneSeedTaskComplete(snapshot)) {
      this.completeSteps(['open-tasks', 'fill-sage-seed-task']);
    }

    if (isNpcMarketSelling(snapshot, SAGE_SEED_KEY)) {
      this.completeSteps(['open-market', 'select-sage-seed-sale']);
    }

    if (getGold(snapshot) >= LEVEL_ONE_GOLD_TARGET) {
      this.completeSteps(['earn-level-one-gold']);
    }

    const hasGrownSage =
      getItemQuantity(snapshot, SAGE_HERB_KEY) > 0 ||
      hasTaskProgressForItem(snapshot, SAGE_HERB_KEY) ||
      hasCompletedTaskForItem(snapshot, SAGE_HERB_KEY);

    if (hasGrownSage) {
      this.completeSteps(['grow-sage']);
    }

    if (hasStartedOrCompletedResearch(snapshot, MINT_SEED_RESEARCH_ID)) {
      this.completeSteps(['research-mint-seed']);
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
      currentPageId: this.getCurrentPageId?.(),
      dom,
      snapshot,
      step,
    };
  }

  createViewModel(step, context) {
    const currentPageId = context.currentPageId;
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

function hasStartedOrCompletedResearch(snapshot, researchId) {
  return (
    (snapshot?.research?.completedResearchIds ?? []).includes(researchId) ||
    (snapshot?.research?.inProgressResearches ?? []).some(
      (research) => research?.researchId === researchId,
    )
  );
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

function getGold(snapshot) {
  return Math.max(0, Math.floor(Number(snapshot?.gold?.current) || 0));
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

function isGrowTileBusy(snapshot) {
  const tile = getGrowTile(snapshot);
  return tile?.phase === 'growing' || tile?.phase === 'harvesting';
}

function getCurrentTasks(snapshot) {
  return snapshot?.tasks?.level?.tasks ?? [];
}

function getLevelOneSeedTask(snapshot) {
  return getCurrentTasks(snapshot).find((task) => task.taskId === LEVEL_ONE_SEED_TASK_ID) ?? null;
}

function isLevelOneSeedTaskComplete(snapshot) {
  const task = getLevelOneSeedTask(snapshot);
  return Boolean(task?.completed);
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

function getCurrentLevel(snapshot) {
  return Math.max(1, Math.floor(Number(snapshot?.tasks?.currentLevel) || 1));
}

function isNpcMarketSelling(snapshot, itemKey) {
  return (snapshot?.shop?.shelf?.slots ?? []).some(
    (slot) => slot?.unlocked && slot.sellKey === itemKey,
  );
}

function getStepLabel(stepId) {
  const index = STEP_IDS.indexOf(stepId);
  return index >= 0 ? `${index + 1}/${STEP_IDS.length}` : '';
}

function formatPageLabel(pageId) {
  return pageId === 'shop' ? 'market' : pageId;
}
