const SAGE_SEED_KEY = 'sageSeed';
const SAGE_HERB_KEY = 'sageHerb';
const MINT_SEED_RESEARCH_ID = 'unlockSeed:mintSeed';
const MANA_TONIC_KEY = 'manaTonic';
const MANA_TONIC_RESEARCH_ID = 'unlockRecipe:manaTonic';
const LEVEL_ONE_SEED_TASK_ID = 'level1-sage-seeds';
const LEVEL_ONE_GOLD_TARGET = 10;
const TUTORIAL_SELL_GOLD_EACH = LEVEL_ONE_GOLD_TARGET;

const LEVEL_ONE_STEP_IDS = [
  'intro-welcome',
  'intro-mana-sphere',
  'first-summon-seed',
  'first-fill-seed-task',
  'finish-seed-task',
  'intro-market',
  'prepare-seed-sale',
  'open-market',
  'select-market-stand',
  'select-sage-seed-sale',
  'earn-tutorial-gold',
  'unselect-sage-seed-sale',
  'level-up-one',
];

const LEVEL_TWO_STEP_IDS = [
  'grow-sage',
  'fill-sage-herb-task',
  'level-up-two',
];

const LEVEL_THREE_STEP_IDS = [
  'research-mint-seed',
];

const LEVEL_FOUR_STEP_IDS = [
  'research-mana-tonic',
  'brew-mana-tonic',
];

export const TUTORIAL_STEP_IDS = [
  ...LEVEL_ONE_STEP_IDS,
  ...LEVEL_TWO_STEP_IDS,
  ...LEVEL_THREE_STEP_IDS,
  ...LEVEL_FOUR_STEP_IDS,
];

const STEPS = [
  {
    id: 'intro-welcome',
    kind: 'dialog',
    text:
      "yo! i'm mira. this is your workshop. i will point at the next thing until the first loop makes sense.",
    advanceOnClick: true,
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) === 1,
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 2,
  },
  {
    id: 'intro-mana-sphere',
    kind: 'prompt',
    pageId: 'workshop',
    targetId: 'workshop:manaSphere',
    text: 'this is the mana sphere. mana fills over time, up to the cap shown here.',
    advanceOnClick: true,
    showPointer: false,
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) === 1,
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 2,
  },
  {
    id: 'first-summon-seed',
    kind: 'prompt',
    pageId: 'workshop',
    targetId: 'workshop:summonSeed',
    text: 'use your mana to summon seeds.',
    isPaused: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      !hasAnySeedTaskProgress(snapshot) &&
      !hasAnySeedQuantity(snapshot) &&
      !snapshot?.seedSummoning?.canSummon,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 && !hasAnySeedTaskProgress(snapshot),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 2 ||
      hasAnySeedTaskProgress(snapshot) ||
      hasAnySeedQuantity(snapshot),
  },
  {
    id: 'first-fill-seed-task',
    kind: 'prompt',
    pageId: 'workshop',
    getTargetId: ({ dom, snapshot }) => {
      if (!dom.isTasksExpanded()) {
        return 'workshop:tasks';
      }

      const task = getLevelOneSeedTask(snapshot);

      if (task?.canFill || task?.canComplete) {
        return `task:${task.taskId}`;
      }

      return null;
    },
    getText: ({ dom, snapshot }) => {
      if (!dom.isTasksExpanded()) {
        return 'open tasks';
      }

      const task = getLevelOneSeedTask(snapshot);

      if (task?.canComplete) {
        return 'complete task';
      }

      return task?.canFill ? 'fill task' : '';
    },
    isPaused: ({ dom, snapshot }) => {
      if (!dom.isTasksExpanded()) {
        return false;
      }

      const task = getLevelOneSeedTask(snapshot);
      return !task?.canComplete && !task?.canFill;
    },
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      !hasAnySeedTaskProgress(snapshot) &&
      getItemQuantity(snapshot, SAGE_SEED_KEY) > 0,
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 2 || hasAnySeedTaskProgress(snapshot),
  },
  {
    id: 'finish-seed-task',
    kind: 'objective',
    pageId: 'workshop',
    objectiveText: 'summon seeds and fill the level task',
    getTargetId: ({ dom, snapshot }) => {
      if (!dom.isTasksExpanded()) {
        return 'workshop:tasks';
      }

      const task = getLevelOneSeedTask(snapshot);

      if (task?.canComplete || task?.canFill) {
        return `task:${task.taskId}`;
      }

      return snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : null;
    },
    getHintText: ({ dom, snapshot }) => {
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
    getProgress: ({ snapshot }) => getTaskProgress(getLevelOneSeedTask(snapshot)),
    getProgressLabel: ({ snapshot }) => getTaskProgressLabel(getLevelOneSeedTask(snapshot), 'seeds'),
    getReminderKey: () => 'finish-seed-task-actions',
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 && !isLevelOneSeedTaskComplete(snapshot),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 2 || isLevelOneSeedTaskComplete(snapshot),
  },
  {
    id: 'intro-market',
    kind: 'dialog',
    text: 'good. that finishes the level task. level up also needs gold. go sell a seed in market.',
    advanceOnClick: true,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      isLevelOneSeedTaskComplete(snapshot) &&
      getGold(snapshot) < LEVEL_ONE_GOLD_TARGET,
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 2 || getGold(snapshot) >= LEVEL_ONE_GOLD_TARGET,
  },
  {
    id: 'prepare-seed-sale',
    kind: 'objective',
    pageId: 'workshop',
    objectiveText: 'summon one seed to sell',
    getTargetId: ({ snapshot }) =>
      snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : null,
    getHintText: ({ snapshot }) =>
      snapshot?.seedSummoning?.canSummon ? 'summon seed' : 'wait for mana',
    getProgress: ({ snapshot }) => ({
      value: Math.min(1, getItemQuantity(snapshot, SAGE_SEED_KEY)),
      max: 1,
    }),
    getProgressLabel: ({ snapshot }) =>
      `${Math.min(1, getItemQuantity(snapshot, SAGE_SEED_KEY))}/1 seed`,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      isLevelOneSeedTaskComplete(snapshot) &&
      getGold(snapshot) < LEVEL_ONE_GOLD_TARGET &&
      getItemQuantity(snapshot, SAGE_SEED_KEY) <= 0,
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 2 ||
      getGold(snapshot) >= LEVEL_ONE_GOLD_TARGET ||
      getItemQuantity(snapshot, SAGE_SEED_KEY) > 0,
  },
  {
    id: 'open-market',
    kind: 'objective',
    pageId: 'shop',
    targetId: 'shop:stand:1',
    objectiveText: 'start selling sage seeds in market',
    text: 'select stand',
    getProgress: () => ({ value: 0, max: 1 }),
    getProgressLabel: () => '0/1 stand',
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      isLevelOneSeedTaskComplete(snapshot) &&
      getGold(snapshot) < LEVEL_ONE_GOLD_TARGET,
    isComplete: ({ currentPageId, snapshot }) =>
      getCurrentLevel(snapshot) >= 2 ||
      currentPageId === 'shop' ||
      isNpcMarketSelling(snapshot, SAGE_SEED_KEY),
  },
  {
    id: 'select-market-stand',
    kind: 'objective',
    pageId: 'shop',
    targetId: 'shop:stand:1',
    objectiveText: 'choose a market stand',
    text: 'select stand',
    getProgress: ({ snapshot }) => ({
      value: snapshot?.shop?.shelf?.selectedSlotNumber === 1 ? 1 : 0,
      max: 1,
    }),
    getProgressLabel: ({ snapshot }) =>
      `${snapshot?.shop?.shelf?.selectedSlotNumber === 1 ? 1 : 0}/1 stand`,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      isLevelOneSeedTaskComplete(snapshot) &&
      getGold(snapshot) < LEVEL_ONE_GOLD_TARGET,
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 2 ||
      snapshot?.shop?.shelf?.selectedSlotNumber === 1 ||
      isNpcMarketSelling(snapshot, SAGE_SEED_KEY),
  },
  {
    id: 'select-sage-seed-sale',
    kind: 'objective',
    pageId: 'shop',
    objectiveText: 'choose sage seed for that stand',
    getTargetId: ({ dom }) =>
      dom.isShopSellPopupOpen() ? `shop:sell:${SAGE_SEED_KEY}` : 'shop:stand:1',
    getHintText: ({ dom }) => (dom.isShopSellPopupOpen() ? 'choose sage seed' : 'select stand'),
    getProgress: ({ snapshot }) => ({
      value: isNpcMarketSelling(snapshot, SAGE_SEED_KEY) ? 1 : 0,
      max: 1,
    }),
    getProgressLabel: ({ snapshot }) =>
      `${isNpcMarketSelling(snapshot, SAGE_SEED_KEY) ? 1 : 0}/1 seed`,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      isLevelOneSeedTaskComplete(snapshot) &&
      getGold(snapshot) < LEVEL_ONE_GOLD_TARGET,
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 2 || isNpcMarketSelling(snapshot, SAGE_SEED_KEY),
  },
  {
    id: 'earn-tutorial-gold',
    kind: 'objective',
    pageId: null,
    objectiveText: 'summon seeds and sell them for level-up gold',
    effect: 'tutorial-sale',
    sale: {
      itemKey: SAGE_SEED_KEY,
      quantity: 1,
      goldEach: TUTORIAL_SELL_GOLD_EACH,
      goldTarget: LEVEL_ONE_GOLD_TARGET,
    },
    getTargetId: ({ currentPageId, snapshot }) => {
      if (getItemQuantity(snapshot, SAGE_SEED_KEY) <= 0) {
        if (currentPageId !== 'workshop') {
          return 'page:workshop';
        }

        return snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : null;
      }

      return currentPageId === 'shop' ? 'shop:stand:1' : null;
    },
    getHintText: ({ currentPageId, snapshot }) => {
      if (getItemQuantity(snapshot, SAGE_SEED_KEY) <= 0) {
        if (currentPageId !== 'workshop') {
          return 'open workshop';
        }

        return snapshot?.seedSummoning?.canSummon ? 'summon seed' : 'wait for mana';
      }

      return 'selling seed';
    },
    getProgress: ({ snapshot }) => ({
      value: Math.min(getGold(snapshot), LEVEL_ONE_GOLD_TARGET),
      max: LEVEL_ONE_GOLD_TARGET,
    }),
    getProgressLabel: ({ snapshot }) =>
      `${Math.min(getGold(snapshot), LEVEL_ONE_GOLD_TARGET)}/${LEVEL_ONE_GOLD_TARGET} gold`,
    getReminderKey: () => 'earn-tutorial-gold-actions',
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      isLevelOneSeedTaskComplete(snapshot) &&
      isNpcMarketSelling(snapshot, SAGE_SEED_KEY),
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 2 || getGold(snapshot) >= LEVEL_ONE_GOLD_TARGET,
  },
  {
    id: 'unselect-sage-seed-sale',
    kind: 'objective',
    pageId: 'shop',
    objectiveText: 'unselect the seed from the stand',
    getTargetId: ({ dom }) =>
      dom.isShopSellPopupOpen() ? 'shop:sell:empty' : 'shop:stand:1',
    getHintText: ({ dom }) => (dom.isShopSellPopupOpen() ? 'choose empty' : 'select stand'),
    getProgress: ({ snapshot }) => ({
      value: isNpcMarketSelling(snapshot, SAGE_SEED_KEY) ? 0 : 1,
      max: 1,
    }),
    getProgressLabel: ({ snapshot }) =>
      `${isNpcMarketSelling(snapshot, SAGE_SEED_KEY) ? 0 : 1}/1 unselected`,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      isLevelOneSeedTaskComplete(snapshot) &&
      getGold(snapshot) >= LEVEL_ONE_GOLD_TARGET,
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 2 || !isNpcMarketSelling(snapshot, SAGE_SEED_KEY),
  },
  {
    id: 'level-up-one',
    kind: 'objective',
    pageId: 'workshop',
    objectiveText: 'return to workshop and level up',
    getTargetId: ({ dom }) => (dom.isTasksExpanded() ? 'workshop:levelUp' : 'workshop:tasks'),
    getHintText: ({ dom }) => (dom.isTasksExpanded() ? 'level up' : 'open tasks'),
    getProgress: ({ snapshot }) => ({
      value: snapshot?.tasks?.level?.completion?.canComplete ? 1 : 0,
      max: 1,
    }),
    getProgressLabel: ({ snapshot }) =>
      `${snapshot?.tasks?.level?.completion?.canComplete ? 1 : 0}/1 ready`,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      getGold(snapshot) >= LEVEL_ONE_GOLD_TARGET &&
      Boolean(snapshot?.tasks?.level?.completion?.canComplete),
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 2,
  },
  {
    id: 'grow-sage',
    kind: 'objective',
    pageId: 'garden',
    objectiveText: 'grow sage in garden',
    getTargetId: ({ currentPageId, dom, snapshot }) => {
      if (getItemQuantity(snapshot, SAGE_SEED_KEY) <= 0 && !hasGrownSage(snapshot)) {
        if (currentPageId !== 'workshop') {
          return 'page:workshop';
        }

        return snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : null;
      }

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
    getHintText: ({ currentPageId, dom, snapshot }) => {
      if (getItemQuantity(snapshot, SAGE_SEED_KEY) <= 0 && !hasGrownSage(snapshot)) {
        if (currentPageId !== 'workshop') {
          return 'open workshop';
        }

        return snapshot?.seedSummoning?.canSummon ? 'summon seed' : 'wait for mana';
      }

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

      return tile?.phase === 'growing' || tile?.phase === 'harvesting'
        ? 'wait for sage'
        : 'choose a seed';
    },
    getProgress: ({ snapshot }) => ({
      value: hasGrownSage(snapshot) ? 1 : 0,
      max: 1,
    }),
    getProgressLabel: ({ snapshot }) => `${hasGrownSage(snapshot) ? 1 : 0}/1 sage`,
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) === 2,
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 3 || hasGrownSage(snapshot),
  },
  {
    id: 'fill-sage-herb-task',
    kind: 'objective',
    pageId: 'workshop',
    objectiveText: 'fill the sage level task',
    getTargetId: ({ dom, snapshot }) => {
      if (!dom.isTasksExpanded()) {
        return 'workshop:tasks';
      }

      const task = getCurrentTaskForItem(snapshot, SAGE_HERB_KEY);

      if (task?.canFill || task?.canComplete) {
        return `task:${task.taskId}`;
      }

      return null;
    },
    getHintText: ({ dom, snapshot }) => {
      if (!dom.isTasksExpanded()) {
        return 'open tasks';
      }

      const task = getCurrentTaskForItem(snapshot, SAGE_HERB_KEY);

      if (task?.canComplete) {
        return 'complete task';
      }

      return task?.canFill ? 'fill sage task' : 'wait for sage';
    },
    getProgress: ({ snapshot }) => getTaskProgress(getCurrentTaskForItem(snapshot, SAGE_HERB_KEY)),
    getProgressLabel: ({ snapshot }) =>
      getTaskProgressLabel(getCurrentTaskForItem(snapshot, SAGE_HERB_KEY), 'sage'),
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 2 &&
      (getItemQuantity(snapshot, SAGE_HERB_KEY) > 0 ||
        hasTaskProgressForItem(snapshot, SAGE_HERB_KEY)),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 3 || hasCompletedTaskForItem(snapshot, SAGE_HERB_KEY),
  },
  {
    id: 'level-up-two',
    kind: 'objective',
    pageId: 'workshop',
    objectiveText: 'level up again',
    getTargetId: ({ dom }) => (dom.isTasksExpanded() ? 'workshop:levelUp' : 'workshop:tasks'),
    getHintText: ({ dom }) => (dom.isTasksExpanded() ? 'level up' : 'open tasks'),
    getProgress: ({ snapshot }) => ({
      value: snapshot?.tasks?.level?.completion?.canComplete ? 1 : 0,
      max: 1,
    }),
    getProgressLabel: ({ snapshot }) =>
      `${snapshot?.tasks?.level?.completion?.canComplete ? 1 : 0}/1 ready`,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 2 &&
      Boolean(snapshot?.tasks?.level?.completion?.canComplete),
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 3,
  },
  {
    id: 'research-mint-seed',
    kind: 'objective',
    pageId: 'research',
    targetId: `research:${MINT_SEED_RESEARCH_ID}`,
    objectiveText: 'research mint seed',
    text: 'research mint seed',
    getProgress: ({ snapshot }) => ({
      value: hasStartedOrCompletedResearch(snapshot, MINT_SEED_RESEARCH_ID) ? 1 : 0,
      max: 1,
    }),
    getProgressLabel: ({ snapshot }) =>
      `${hasStartedOrCompletedResearch(snapshot, MINT_SEED_RESEARCH_ID) ? 1 : 0}/1 research`,
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) >= 3,
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 4 || hasStartedOrCompletedResearch(snapshot, MINT_SEED_RESEARCH_ID),
  },
  {
    id: 'research-mana-tonic',
    kind: 'objective',
    pageId: 'research',
    targetId: `research:${MANA_TONIC_RESEARCH_ID}`,
    objectiveText: 'research mana tonic',
    text: 'research mana tonic',
    getProgress: ({ snapshot }) => ({
      value: hasStartedOrCompletedResearch(snapshot, MANA_TONIC_RESEARCH_ID) ? 1 : 0,
      max: 1,
    }),
    getProgressLabel: ({ snapshot }) =>
      `${hasStartedOrCompletedResearch(snapshot, MANA_TONIC_RESEARCH_ID) ? 1 : 0}/1 research`,
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) >= 4,
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 5 ||
      hasStartedOrCompletedResearch(snapshot, MANA_TONIC_RESEARCH_ID),
  },
  {
    id: 'brew-mana-tonic',
    kind: 'objective',
    pageId: 'brewing',
    objectiveText: 'brew mana tonic',
    getTargetId: ({ dom, snapshot }) => {
      if (dom.isBrewingRecipePopupOpen()) {
        return `brewing:recipe:${MANA_TONIC_KEY}`;
      }

      const brewing = getPrimaryBrewingState(snapshot);
      const activeAction = getActiveBrewingAction(brewing);

      if (activeAction) {
        return 'brewing:action';
      }

      if (brewing?.ingredients?.length > 0) {
        return brewing.canBrew ? 'brewing:action' : null;
      }

      return 'brewing:recipes';
    },
    getHintText: ({ dom, snapshot }) => {
      if (dom.isBrewingRecipePopupOpen()) {
        return 'choose mana tonic';
      }

      const brewing = getPrimaryBrewingState(snapshot);
      const activeAction = getActiveBrewingAction(brewing);

      if (activeAction === 'collect') {
        return 'collect mana tonic';
      }

      if (activeAction === 'bottle') {
        return 'bottle mana tonic';
      }

      if (brewing?.ingredients?.length > 0) {
        return brewing.canBrew ? 'brew mana tonic' : 'wait for ingredients';
      }

      return 'select recipe';
    },
    getProgress: ({ snapshot }) => ({
      value: hasBrewedManaTonic(snapshot) ? 1 : 0,
      max: 1,
    }),
    getProgressLabel: ({ snapshot }) =>
      `${hasBrewedManaTonic(snapshot) ? 1 : 0}/1 potion`,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 4 && hasCompletedResearch(snapshot, MANA_TONIC_RESEARCH_ID),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 5 || hasBrewedManaTonic(snapshot),
  },
];

export class TutorialStepManager {
  constructor({ progressManager, getCurrentPageId }) {
    this.progressManager = progressManager;
    this.getCurrentPageId = getCurrentPageId;
    this.activeStepId = null;
  }

  getActiveStep({ snapshot, dom }) {
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

  advanceStep(stepId) {
    if (!stepId) {
      return;
    }

    this.progressManager.complete(stepId);
    if (this.activeStepId === stepId) {
      this.activeStepId = null;
    }
  }

  syncSnapshotProgress(snapshot) {
    if (!snapshot) {
      return;
    }

    const currentLevel = getCurrentLevel(snapshot);

    if (currentLevel >= 5) {
      this.completeSteps(TUTORIAL_STEP_IDS);
      return;
    }

    if (currentLevel >= 4) {
      this.completeSteps([...LEVEL_ONE_STEP_IDS, ...LEVEL_TWO_STEP_IDS, ...LEVEL_THREE_STEP_IDS]);
    } else if (currentLevel >= 3) {
      this.completeSteps([...LEVEL_ONE_STEP_IDS, ...LEVEL_TWO_STEP_IDS]);
    } else if (currentLevel >= 2) {
      this.completeSteps(LEVEL_ONE_STEP_IDS);
    }

    if (this.progressManager.hasCompleted('finish-first-task')) {
      this.completeSteps([
        'intro-welcome',
        'intro-mana-sphere',
        'first-summon-seed',
        'first-fill-seed-task',
        'finish-seed-task',
      ]);
    }

    if (hasAnySeedQuantity(snapshot) || hasAnySeedTaskProgress(snapshot)) {
      this.completeSteps(['first-summon-seed']);
    }

    if (hasAnySeedTaskProgress(snapshot)) {
      this.completeSteps(['first-fill-seed-task']);
    }

    if (isLevelOneSeedTaskComplete(snapshot)) {
      this.completeSteps([
        'intro-welcome',
        'intro-mana-sphere',
        'first-summon-seed',
        'first-fill-seed-task',
        'finish-seed-task',
      ]);
    }

    if (getItemQuantity(snapshot, SAGE_SEED_KEY) > 0 || getGold(snapshot) >= LEVEL_ONE_GOLD_TARGET) {
      this.completeSteps(['prepare-seed-sale']);
    }

    if (isNpcMarketSelling(snapshot, SAGE_SEED_KEY)) {
      this.completeSteps(['open-market', 'select-market-stand', 'select-sage-seed-sale']);
    }

    if (getGold(snapshot) >= LEVEL_ONE_GOLD_TARGET) {
      this.completeSteps(['prepare-seed-sale', 'earn-tutorial-gold']);

      if (!isNpcMarketSelling(snapshot, SAGE_SEED_KEY)) {
        this.completeSteps(['unselect-sage-seed-sale']);
      }
    }

    if (hasGrownSage(snapshot)) {
      this.completeSteps(['grow-sage']);
    }

    if (hasCompletedTaskForItem(snapshot, SAGE_HERB_KEY)) {
      this.completeSteps(['fill-sage-herb-task']);
    }

    if (hasStartedOrCompletedResearch(snapshot, MINT_SEED_RESEARCH_ID)) {
      this.completeSteps(['research-mint-seed']);
    }

    if (hasStartedOrCompletedResearch(snapshot, MANA_TONIC_RESEARCH_ID)) {
      this.completeSteps(['research-mana-tonic']);
    }

    if (hasBrewedManaTonic(snapshot)) {
      this.completeSteps(['brew-mana-tonic']);
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
    const stepLabel = getStepLabel(step.id);
    const kind = step.kind ?? 'objective';

    if (kind !== 'dialog' && step.pageId && context.currentPageId !== step.pageId) {
      return {
        id: step.id,
        kind,
        targetId: `page:${step.pageId}`,
        text: `open ${formatPageLabel(step.pageId)}`,
        hintText: `open ${formatPageLabel(step.pageId)}`,
        objectiveText: step.getObjectiveText?.(context) ?? step.objectiveText ?? step.text ?? '',
        progress: step.getProgress?.(context) ?? null,
        progressLabel: step.getProgressLabel?.(context) ?? '',
        stepLabel,
        reminderKey: step.getReminderKey?.(context) ?? null,
        effect: step.effect,
        sale: step.sale,
      };
    }

    const targetId = step.getTargetId?.(context) ?? step.targetId ?? null;
    const text = step.getText?.(context) ?? step.text ?? '';
    const hintText = step.getHintText?.(context) ?? text;

    return {
      id: step.id,
      kind,
      targetId,
      text,
      hintText,
      objectiveText: step.getObjectiveText?.(context) ?? step.objectiveText ?? text,
      progress: step.getProgress?.(context) ?? null,
      progressLabel: step.getProgressLabel?.(context) ?? '',
      stepLabel,
      advanceOnClick: step.advanceOnClick === true,
      showPointer: step.showPointer !== false,
      reminderKey: step.getReminderKey?.({ ...context, targetId, text, hintText }) ?? null,
      effect: step.effect,
      sale: step.sale,
    };
  }
}

function hasStartedOrCompletedResearch(snapshot, researchId) {
  return (
    hasCompletedResearch(snapshot, researchId) ||
    (snapshot?.research?.inProgressResearches ?? []).some(
      (research) => research?.researchId === researchId,
    )
  );
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

function getCurrentTasks(snapshot) {
  return snapshot?.tasks?.level?.tasks ?? [];
}

function getCurrentTaskForItem(snapshot, itemKey) {
  return getCurrentTasks(snapshot).find((task) => task.itemKey === itemKey) ?? null;
}

function getLevelOneSeedTask(snapshot) {
  return getCurrentTasks(snapshot).find((task) => task.taskId === LEVEL_ONE_SEED_TASK_ID) ?? null;
}

function isLevelOneSeedTaskComplete(snapshot) {
  const task = getLevelOneSeedTask(snapshot);
  return Boolean(task?.completed);
}

function hasAnySeedTaskProgress(snapshot) {
  const task = getLevelOneSeedTask(snapshot);
  return Boolean(task?.completed) || (Number(task?.progressQuantity) || 0) > 0;
}

function hasAnySeedQuantity(snapshot) {
  return (snapshot?.seedInventory ?? []).some((item) => (Number(item?.quantity) || 0) > 0);
}

function hasTaskProgressForItem(snapshot, itemKey) {
  return getCurrentTasks(snapshot).some(
    (task) => task.itemKey === itemKey && task.progressQuantity > 0,
  );
}

function hasCompletedTaskForItem(snapshot, itemKey) {
  return getCurrentTasks(snapshot).some((task) => task.itemKey === itemKey && task.completed);
}

function hasGrownSage(snapshot) {
  return (
    getItemQuantity(snapshot, SAGE_HERB_KEY) > 0 ||
    hasTaskProgressForItem(snapshot, SAGE_HERB_KEY) ||
    hasCompletedTaskForItem(snapshot, SAGE_HERB_KEY)
  );
}

function hasBrewedManaTonic(snapshot) {
  return (
    getItemQuantity(snapshot, MANA_TONIC_KEY) > 0 ||
    hasTaskProgressForItem(snapshot, MANA_TONIC_KEY) ||
    hasCompletedTaskForItem(snapshot, MANA_TONIC_KEY)
  );
}

function getCurrentLevel(snapshot) {
  return Math.max(1, Math.floor(Number(snapshot?.tasks?.currentLevel) || 1));
}

function isNpcMarketSelling(snapshot, itemKey) {
  return (snapshot?.shop?.shelf?.slots ?? []).some(
    (slot) => slot?.unlocked && slot.sellKey === itemKey,
  );
}

function getPrimaryBrewingState(snapshot) {
  const brewing = snapshot?.brewing ?? {};
  const cauldrons = brewing.cauldrons;

  if (Array.isArray(cauldrons) && cauldrons.length > 0) {
    return cauldrons[0];
  }

  return brewing;
}

function getActiveBrewingAction(brewing) {
  const activeBrew = brewing?.activeBrew;

  if (!activeBrew) {
    return null;
  }

  if (activeBrew.canCollect || activeBrew.phase === 'ready') {
    return activeBrew.canCollect ? 'collect' : null;
  }

  if (
    activeBrew.canStartBottling ||
    activeBrew.phase === 'brewed' ||
    activeBrew.phase === 'bottling'
  ) {
    return activeBrew.canStartBottling ? 'bottle' : null;
  }

  return null;
}

function getTaskProgress(task) {
  const max = Math.max(1, Math.floor(Number(task?.requiredQuantity) || 1));
  const value = Math.min(max, Math.max(0, Math.floor(Number(task?.progressQuantity) || 0)));

  return { value, max };
}

function getTaskProgressLabel(task, unit) {
  const progress = getTaskProgress(task);
  return `${progress.value}/${progress.max} ${unit}`;
}

function getStepLabel(stepId) {
  const index = TUTORIAL_STEP_IDS.indexOf(stepId);
  return index >= 0 ? `${index + 1}/${TUTORIAL_STEP_IDS.length}` : '';
}

function formatPageLabel(pageId) {
  return pageId === 'shop' ? 'market' : pageId;
}
