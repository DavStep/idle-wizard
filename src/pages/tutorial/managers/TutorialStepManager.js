const SAGE_SEED_KEY = 'sageSeed';
const SAGE_HERB_KEY = 'sageHerb';
const MINT_SEED_KEY = 'mintSeed';
const MINT_HERB_KEY = 'mintHerb';
const MINT_SEED_RESEARCH_ID = 'unlockSeed:mintSeed';
const MANA_TONIC_KEY = 'manaTonic';
const MANA_TONIC_RESEARCH_ID = 'unlockRecipe:manaTonic';
const MANA_TONIC_SAGE_COUNT = 3;
const LEVEL_ONE_SEED_TASK_ID = 'level1-sage-seeds';
const LEVEL_ONE_GOLD_TARGET = 10;
const TUTORIAL_SELL_GOLD_EACH = LEVEL_ONE_GOLD_TARGET;

const LEVEL_ONE_STEP_IDS = [
  'intro-welcome',
  'intro-username',
  'intro-username-return',
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
  'fill-mint-seed-task',
  'fill-mint-herb-task',
  'level-up-three',
];

const LEVEL_FOUR_STEP_IDS = [
  'research-mana-tonic',
  'brew-mana-tonic',
  'refill-mana-tonic-cauldron',
];

const SEEDING_LESSON_STEP_IDS = [
  'intro-welcome',
  'intro-username',
  'intro-username-return',
  'intro-mana-sphere',
  'first-summon-seed',
  'first-fill-seed-task',
  'finish-seed-task',
];

const MARKET_LESSON_STEP_IDS = LEVEL_ONE_STEP_IDS.filter(
  (stepId) => !SEEDING_LESSON_STEP_IDS.includes(stepId),
);

const GARDENING_LESSON_STEP_IDS = [...LEVEL_TWO_STEP_IDS, ...LEVEL_THREE_STEP_IDS];
const BREWING_LESSON_STEP_IDS = LEVEL_FOUR_STEP_IDS;

const LESSON_TITLE_BY_STEP_ID = new Map([
  ...SEEDING_LESSON_STEP_IDS.map((stepId) => [stepId, 'lesson 1: introduction']),
  ...MARKET_LESSON_STEP_IDS.map((stepId) => [stepId, 'lesson 2: market']),
  ...GARDENING_LESSON_STEP_IDS.map((stepId) => [stepId, 'lesson 3: gardening']),
  ...BREWING_LESSON_STEP_IDS.map((stepId) => [stepId, 'lesson 4: brewing']),
]);

export const TUTORIAL_STEP_IDS = [
  ...LEVEL_ONE_STEP_IDS,
  ...LEVEL_TWO_STEP_IDS,
  ...LEVEL_THREE_STEP_IDS,
  ...LEVEL_FOUR_STEP_IDS,
];

const REVEAL_TOP = ['top'];
const REVEAL_MANA = ['top', 'mana'];
const REVEAL_MANA_SUMMON = ['top', 'mana', 'summon'];
const REVEAL_MANA_SUMMON_TASKS = ['top', 'mana', 'summon', 'tasks'];
const REVEAL_LEVEL_ONE_WORKFLOW = ['mana', 'summon', 'tasks', 'top', 'rooms'];

export const TUTORIAL_STEPS = [
  {
    id: 'intro-welcome',
    kind: 'prompt',
    revealTokens: [],
    text: "hi there. i'm Elara Starbrew. i'll help you wake this workshop up.",
    advanceOnClick: true,
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) === 1,
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 2,
  },
  {
    id: 'intro-username',
    kind: 'prompt',
    targetId: 'top:username',
    revealTokens: REVEAL_TOP,
    text: "i don't need your name, but it would be nice to set it here.",
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) === 1,
    isComplete: ({ dom, snapshot }) =>
      getCurrentLevel(snapshot) >= 2 || hasCustomUsername(dom),
  },
  {
    id: 'intro-username-return',
    kind: 'prompt',
    revealTokens: REVEAL_TOP,
    getText: ({ dom }) => `hi again, ${getTutorialUsername(dom)}. let's start with mana.`,
    advanceOnClick: true,
    isAvailable: ({ dom, snapshot }) =>
      getCurrentLevel(snapshot) === 1 && hasCustomUsername(dom),
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 2,
  },
  {
    id: 'intro-mana-sphere',
    kind: 'prompt',
    pageId: 'workshop',
    targetId: 'workshop:manaSphere',
    revealTokens: REVEAL_MANA,
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
    revealTokens: REVEAL_MANA_SUMMON,
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
    revealTokens: REVEAL_MANA_SUMMON_TASKS,
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
    revealTokens: REVEAL_MANA_SUMMON_TASKS,
    objectiveText: 'summon seeds and fill the level task',
    getTargetId: ({ dom, snapshot }) => {
      if (!dom.isTasksExpanded()) {
        return 'workshop:tasks';
      }

      const task = getLevelOneSeedTask(snapshot);

      if (task?.canComplete || task?.canFill) {
        return `task:${task.taskId}`;
      }

      return snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : 'workshop:manaSphere';
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
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
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
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
    objectiveText: 'summon one seed to sell',
    getTargetId: ({ snapshot }) =>
      snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : 'workshop:manaSphere',
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
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
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
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
    objectiveText: 'choose a market stand',
    text: 'select stand',
    getProgress: ({ dom }) => ({
      value: dom.isShopSellPopupOpen() ? 1 : 0,
      max: 1,
    }),
    getProgressLabel: ({ dom }) => `${dom.isShopSellPopupOpen() ? 1 : 0}/1 stand`,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      isLevelOneSeedTaskComplete(snapshot) &&
      getGold(snapshot) < LEVEL_ONE_GOLD_TARGET,
    isComplete: ({ dom, snapshot }) =>
      getCurrentLevel(snapshot) >= 2 ||
      dom.isShopSellPopupOpen() ||
      isNpcMarketSelling(snapshot, SAGE_SEED_KEY),
  },
  {
    id: 'select-sage-seed-sale',
    kind: 'objective',
    pageId: 'shop',
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
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
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
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

        return snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : 'workshop:manaSphere';
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
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
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
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
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

        return snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : 'workshop:manaSphere';
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
    objectiveText: 'fill the sage level task',
    getTargetId: ({ currentPageId, dom, snapshot }) => {
      const task = getCurrentTaskForItem(snapshot, SAGE_HERB_KEY);

      if (task?.canFill || task?.canComplete) {
        if (currentPageId !== 'workshop') {
          return 'page:workshop';
        }

        if (!dom.isTasksExpanded()) {
          return 'workshop:tasks';
        }

        return `task:${task.taskId}`;
      }

      return getSageObtainTargetId({ currentPageId, dom, snapshot });
    },
    getHintText: ({ currentPageId, dom, snapshot }) => {
      const task = getCurrentTaskForItem(snapshot, SAGE_HERB_KEY);

      if (task?.canComplete) {
        if (currentPageId !== 'workshop') {
          return 'open workshop';
        }

        if (!dom.isTasksExpanded()) {
          return 'open tasks';
        }

        return 'complete task';
      }

      if (task?.canFill) {
        if (currentPageId !== 'workshop') {
          return 'open workshop';
        }

        if (!dom.isTasksExpanded()) {
          return 'open tasks';
        }

        return 'fill sage task';
      }

      return getSageObtainHintText({ currentPageId, dom, snapshot });
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
    getObjectiveText: ({ snapshot }) =>
      hasLevelCompletionGold(snapshot) ? 'level up again' : 'earn level-up gold in market',
    getTargetId: ({ currentPageId, dom, snapshot }) => {
      if (!hasLevelCompletionGold(snapshot)) {
        return currentPageId === 'shop' ? 'shop:stand:1' : 'page:shop';
      }

      if (currentPageId !== 'workshop') {
        return 'page:workshop';
      }

      return dom.isTasksExpanded() ? 'workshop:levelUp' : 'workshop:tasks';
    },
    getHintText: ({ currentPageId, dom, snapshot }) => {
      if (!hasLevelCompletionGold(snapshot)) {
        return currentPageId === 'shop' ? 'sell for gold' : 'open market';
      }

      if (currentPageId !== 'workshop') {
        return 'open workshop';
      }

      return dom.isTasksExpanded() ? 'level up' : 'open tasks';
    },
    getProgress: ({ snapshot }) => {
      if (!hasLevelCompletionGold(snapshot)) {
        const costGold = getLevelCompletionCostGold(snapshot);
        return {
          value: Math.min(getGold(snapshot), costGold),
          max: costGold,
        };
      }

      return {
        value: snapshot?.tasks?.level?.completion?.canComplete ? 1 : 0,
        max: 1,
      };
    },
    getProgressLabel: ({ snapshot }) => {
      if (!hasLevelCompletionGold(snapshot)) {
        const costGold = getLevelCompletionCostGold(snapshot);
        return `${Math.min(getGold(snapshot), costGold)}/${costGold} gold`;
      }

      return `${snapshot?.tasks?.level?.completion?.canComplete ? 1 : 0}/1 ready`;
    },
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 2 &&
      Boolean(snapshot?.tasks?.level?.completion?.canComplete),
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 3,
  },
  {
    id: 'research-mint-seed',
    kind: 'objective',
    cueMode: 'passive',
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
      getCurrentLevel(snapshot) >= 4 || hasCompletedResearch(snapshot, MINT_SEED_RESEARCH_ID),
  },
  {
    id: 'fill-mint-seed-task',
    kind: 'objective',
    cueMode: 'passive',
    objectiveText: 'fill the mint seed task',
    getTargetId: ({ currentPageId, dom, snapshot }) =>
      getSeedTaskTargetId({ currentPageId, dom, snapshot, itemKey: MINT_SEED_KEY }),
    getHintText: ({ currentPageId, dom, snapshot }) =>
      getSeedTaskHintText({ currentPageId, dom, snapshot, itemKey: MINT_SEED_KEY }),
    getProgress: ({ snapshot }) => getTaskProgress(getCurrentTaskForItem(snapshot, MINT_SEED_KEY)),
    getProgressLabel: ({ snapshot }) =>
      getTaskProgressLabel(getCurrentTaskForItem(snapshot, MINT_SEED_KEY), 'mint seeds'),
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 3 &&
      hasCompletedResearch(snapshot, MINT_SEED_RESEARCH_ID) &&
      Boolean(getCurrentTaskForItem(snapshot, MINT_SEED_KEY)) &&
      !hasCompletedTaskForItem(snapshot, MINT_SEED_KEY),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 4 || hasCompletedTaskForItem(snapshot, MINT_SEED_KEY),
  },
  {
    id: 'fill-mint-herb-task',
    kind: 'objective',
    cueMode: 'passive',
    objectiveText: 'fill the mint level task',
    getTargetId: ({ currentPageId, dom, snapshot }) => {
      const task = getCurrentTaskForItem(snapshot, MINT_HERB_KEY);

      if (task?.canFill || task?.canComplete) {
        if (currentPageId !== 'workshop') {
          return 'page:workshop';
        }

        if (!dom.isTasksExpanded()) {
          return 'workshop:tasks';
        }

        return `task:${task.taskId}`;
      }

      return getHerbObtainTargetId({
        currentPageId,
        dom,
        snapshot,
        seedKey: MINT_SEED_KEY,
      });
    },
    getHintText: ({ currentPageId, dom, snapshot }) => {
      const task = getCurrentTaskForItem(snapshot, MINT_HERB_KEY);

      if (task?.canComplete) {
        if (currentPageId !== 'workshop') {
          return 'open workshop';
        }

        if (!dom.isTasksExpanded()) {
          return 'open tasks';
        }

        return 'complete task';
      }

      if (task?.canFill) {
        if (currentPageId !== 'workshop') {
          return 'open workshop';
        }

        if (!dom.isTasksExpanded()) {
          return 'open tasks';
        }

        return 'fill mint task';
      }

      return getHerbObtainHintText({
        currentPageId,
        dom,
        snapshot,
        seedKey: MINT_SEED_KEY,
        herbName: 'mint',
      });
    },
    getProgress: ({ snapshot }) => getTaskProgress(getCurrentTaskForItem(snapshot, MINT_HERB_KEY)),
    getProgressLabel: ({ snapshot }) =>
      getTaskProgressLabel(getCurrentTaskForItem(snapshot, MINT_HERB_KEY), 'mint'),
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 3 &&
      hasCompletedTaskForItem(snapshot, MINT_SEED_KEY) &&
      Boolean(getCurrentTaskForItem(snapshot, MINT_HERB_KEY)) &&
      !hasCompletedTaskForItem(snapshot, MINT_HERB_KEY),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 4 || hasCompletedTaskForItem(snapshot, MINT_HERB_KEY),
  },
  {
    id: 'level-up-three',
    kind: 'objective',
    cueMode: 'passive',
    getObjectiveText: ({ snapshot }) =>
      hasLevelCompletionGold(snapshot) ? 'level up again' : 'earn level-up gold in market',
    getTargetId: ({ currentPageId, dom, snapshot }) => {
      if (!hasLevelCompletionGold(snapshot)) {
        return currentPageId === 'shop' ? 'shop:stand:1' : 'page:shop';
      }

      if (currentPageId !== 'workshop') {
        return 'page:workshop';
      }

      return dom.isTasksExpanded() ? 'workshop:levelUp' : 'workshop:tasks';
    },
    getHintText: ({ currentPageId, dom, snapshot }) => {
      if (!hasLevelCompletionGold(snapshot)) {
        return currentPageId === 'shop' ? 'sell for gold' : 'open market';
      }

      if (currentPageId !== 'workshop') {
        return 'open workshop';
      }

      return dom.isTasksExpanded() ? 'level up' : 'open tasks';
    },
    getProgress: ({ snapshot }) => {
      if (!hasLevelCompletionGold(snapshot)) {
        const costGold = getLevelCompletionCostGold(snapshot);
        return {
          value: Math.min(getGold(snapshot), costGold),
          max: costGold,
        };
      }

      return {
        value: snapshot?.tasks?.level?.completion?.canComplete ? 1 : 0,
        max: 1,
      };
    },
    getProgressLabel: ({ snapshot }) => {
      if (!hasLevelCompletionGold(snapshot)) {
        const costGold = getLevelCompletionCostGold(snapshot);
        return `${Math.min(getGold(snapshot), costGold)}/${costGold} gold`;
      }

      return `${snapshot?.tasks?.level?.completion?.canComplete ? 1 : 0}/1 ready`;
    },
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 3 &&
      Boolean(snapshot?.tasks?.level?.completion?.canComplete),
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 4,
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
  {
    id: 'refill-mana-tonic-cauldron',
    kind: 'objective',
    pageId: 'brewing',
    objectiveText: 'fill the cauldron again',
    getTargetId: ({ snapshot }) => {
      const brewing = getPrimaryBrewingState(snapshot);
      const activeAction = isActiveManaTonicBrew(snapshot)
        ? getActiveBrewingAction(brewing)
        : null;

      if (activeAction || isManaTonicCauldronReady(snapshot)) {
        return 'brewing:action';
      }

      return canAddManaTonicSage(snapshot) ? `brewing:herb:${SAGE_HERB_KEY}` : null;
    },
    getHintText: ({ snapshot }) => {
      const brewing = getPrimaryBrewingState(snapshot);
      const activeAction = isActiveManaTonicBrew(snapshot)
        ? getActiveBrewingAction(brewing)
        : null;

      if (activeAction === 'collect') {
        return 'collect mana tonic';
      }

      if (activeAction === 'bottle') {
        return 'bottle mana tonic';
      }

      if (isManaTonicCauldronReady(snapshot)) {
        return 'brew again';
      }

      const progress = getManaTonicCauldronFillCount(snapshot);

      return progress > 0
        ? 'add sage. recipes care about order'
        : 'tap sage to fill cauldron. recipes care about order';
    },
    getProgress: ({ snapshot }) => ({
      value: getManaTonicCauldronFillCount(snapshot),
      max: MANA_TONIC_SAGE_COUNT,
    }),
    getProgressLabel: ({ snapshot }) =>
      `${getManaTonicCauldronFillCount(snapshot)}/${MANA_TONIC_SAGE_COUNT} sage`,
    getReminderKey: () => 'refill-mana-tonic-cauldron-actions',
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 4 &&
      hasCompletedResearch(snapshot, MANA_TONIC_RESEARCH_ID) &&
      hasBrewedManaTonic(snapshot) &&
      !hasCompletedTaskForItem(snapshot, MANA_TONIC_KEY),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 5 ||
      hasCompletedTaskForItem(snapshot, MANA_TONIC_KEY) ||
      isActiveManaTonicBrew(snapshot),
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

    for (const step of TUTORIAL_STEPS) {
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

    if (hasCompletedPrestige(snapshot)) {
      this.completeSteps(TUTORIAL_STEP_IDS);
      return;
    }

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
      this.completeSteps(SEEDING_LESSON_STEP_IDS);
    }

    if (hasAnySeedQuantity(snapshot) || hasAnySeedTaskProgress(snapshot)) {
      this.completeSteps(['first-summon-seed']);
    }

    if (hasAnySeedTaskProgress(snapshot)) {
      this.completeSteps(['first-fill-seed-task']);
    }

    if (isLevelOneSeedTaskComplete(snapshot)) {
      this.completeSteps(SEEDING_LESSON_STEP_IDS);
    }

    if (
      isLevelOneSeedTaskComplete(snapshot) &&
      (getItemQuantity(snapshot, SAGE_SEED_KEY) > 0 ||
        getGold(snapshot) >= LEVEL_ONE_GOLD_TARGET)
    ) {
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

    if (hasCompletedResearch(snapshot, MINT_SEED_RESEARCH_ID)) {
      this.completeSteps(['research-mint-seed']);
    }

    if (hasCompletedTaskForItem(snapshot, MINT_SEED_KEY)) {
      this.completeSteps(['fill-mint-seed-task']);
    }

    if (hasCompletedTaskForItem(snapshot, MINT_HERB_KEY)) {
      this.completeSteps(['fill-mint-herb-task']);
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
        lessonTitle: getLessonTitle(step.id),
        progress: step.getProgress?.(context) ?? null,
        progressLabel: step.getProgressLabel?.(context) ?? '',
        stepLabel,
        reminderKey: step.getReminderKey?.(context) ?? null,
        revealTokens: step.revealTokens ?? [],
        allowTargetClick: step.allowTargetClick === true,
        cueMode: step.cueMode ?? 'active',
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
      lessonTitle: getLessonTitle(step.id),
      progress: step.getProgress?.(context) ?? null,
      progressLabel: step.getProgressLabel?.(context) ?? '',
      stepLabel,
      advanceOnClick: step.advanceOnClick === true,
      allowTargetClick: step.allowTargetClick === true,
      showPointer: step.showPointer !== false,
      reminderKey: step.getReminderKey?.({ ...context, targetId, text, hintText }) ?? null,
      revealTokens: step.revealTokens ?? [],
      cueMode: step.cueMode ?? 'active',
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

function hasCompletedPrestige(snapshot) {
  return (snapshot?.prestige?.completedLevels ?? []).length > 0;
}

function getLessonTitle(stepId) {
  return LESSON_TITLE_BY_STEP_ID.get(stepId) ?? 'lesson';
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

function getLevelCompletionCostGold(snapshot) {
  return Math.max(0, Math.floor(Number(snapshot?.tasks?.level?.completion?.costGold) || 0));
}

function hasLevelCompletionGold(snapshot) {
  return getGold(snapshot) >= getLevelCompletionCostGold(snapshot);
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

function getSeedTaskTargetId({ currentPageId, dom, snapshot, itemKey }) {
  const task = getCurrentTaskForItem(snapshot, itemKey);

  if (task?.canFill || task?.canComplete) {
    if (currentPageId !== 'workshop') {
      return 'page:workshop';
    }

    if (!dom.isTasksExpanded()) {
      return 'workshop:tasks';
    }

    return `task:${task.taskId}`;
  }

  if (currentPageId !== 'workshop') {
    return 'page:workshop';
  }

  return snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : 'workshop:manaSphere';
}

function getSeedTaskHintText({ currentPageId, dom, snapshot, itemKey }) {
  const task = getCurrentTaskForItem(snapshot, itemKey);

  if (task?.canComplete) {
    if (currentPageId !== 'workshop') {
      return 'open workshop';
    }

    if (!dom.isTasksExpanded()) {
      return 'open tasks';
    }

    return 'complete task';
  }

  if (task?.canFill) {
    if (currentPageId !== 'workshop') {
      return 'open workshop';
    }

    if (!dom.isTasksExpanded()) {
      return 'open tasks';
    }

    return 'fill task';
  }

  if (currentPageId !== 'workshop') {
    return 'open workshop';
  }

  return snapshot?.seedSummoning?.canSummon ? 'summon seed' : 'wait for mana';
}

function getSageObtainTargetId({ currentPageId, dom, snapshot }) {
  return getHerbObtainTargetId({
    currentPageId,
    dom,
    snapshot,
    seedKey: SAGE_SEED_KEY,
  });
}

function getSageObtainHintText({ currentPageId, dom, snapshot }) {
  return getHerbObtainHintText({
    currentPageId,
    dom,
    snapshot,
    seedKey: SAGE_SEED_KEY,
    herbName: 'sage',
  });
}

function getHerbObtainTargetId({ currentPageId, dom, snapshot, seedKey }) {
  if (getItemQuantity(snapshot, seedKey) <= 0 && !hasActiveCrop(snapshot, seedKey)) {
    if (currentPageId !== 'workshop') {
      return 'page:workshop';
    }

    return snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : 'workshop:manaSphere';
  }

  if (currentPageId !== 'garden') {
    return 'page:garden';
  }

  const tile = getGrowTile(snapshot);

  if (!tile) {
    return null;
  }

  if (tile.phase === 'ready') {
    return `garden:plot:${tile.tileNumber}`;
  }

  if (dom.isGardenSeedPopupOpen()) {
    return `garden:seed:${seedKey}`;
  }

  if (tile.phase === 'empty' && tile.selectedSeedItemTypeId) {
    return `garden:plot:${tile.tileNumber}`;
  }

  return `garden:plot:${tile.tileNumber}:label`;
}

function getHerbObtainHintText({ currentPageId, dom, snapshot, seedKey, herbName }) {
  if (getItemQuantity(snapshot, seedKey) <= 0 && !hasActiveCrop(snapshot, seedKey)) {
    if (currentPageId !== 'workshop') {
      return 'open workshop';
    }

    return snapshot?.seedSummoning?.canSummon ? 'summon seed' : 'wait for mana';
  }

  if (currentPageId !== 'garden') {
    return 'open garden';
  }

  const tile = getGrowTile(snapshot);

  if (tile?.phase === 'ready') {
    return `harvest ${herbName}`;
  }

  if (dom.isGardenSeedPopupOpen()) {
    return `choose ${herbName} seed`;
  }

  if (tile?.phase === 'empty' && tile.selectedSeedItemTypeId) {
    return `plant ${herbName} seed`;
  }

  return tile?.phase === 'growing' || tile?.phase === 'harvesting'
    ? `wait for ${herbName}`
    : 'choose a seed';
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

function hasActiveCrop(snapshot, seedKey) {
  return (snapshot?.garden?.plot?.tiles ?? []).some(
    (tile) =>
      tile?.unlocked &&
      tile.seedKey === seedKey &&
      (tile.phase === 'ready' || tile.phase === 'growing' || tile.phase === 'harvesting'),
  );
}

function hasBrewedManaTonic(snapshot) {
  return (
    getItemQuantity(snapshot, MANA_TONIC_KEY) > 0 ||
    hasTaskProgressForItem(snapshot, MANA_TONIC_KEY) ||
    hasCompletedTaskForItem(snapshot, MANA_TONIC_KEY)
  );
}

function isActiveManaTonicBrew(snapshot) {
  return getPrimaryBrewingState(snapshot)?.activeBrew?.key === MANA_TONIC_KEY;
}

function isManaTonicCauldronReady(snapshot) {
  return (
    getManaTonicCauldronFillCount(snapshot) >= MANA_TONIC_SAGE_COUNT &&
    Boolean(getPrimaryBrewingState(snapshot)?.canBrew)
  );
}

function canAddManaTonicSage(snapshot) {
  const brewing = getPrimaryBrewingState(snapshot);

  return (
    Boolean(brewing?.canAddIngredient) &&
    !brewing?.activeBrew &&
    getManaTonicCauldronFillCount(snapshot) < MANA_TONIC_SAGE_COUNT &&
    (brewing?.herbs ?? []).some(
      (herb) => herb?.key === SAGE_HERB_KEY && (Number(herb.availableQuantity) || 0) > 0,
    )
  );
}

function getManaTonicCauldronFillCount(snapshot) {
  const ingredients = getPrimaryBrewingState(snapshot)?.ingredients ?? [];
  const stagedSageCount = ingredients.filter((ingredient) => ingredient?.key === SAGE_HERB_KEY)
    .length;

  return Math.min(MANA_TONIC_SAGE_COUNT, stagedSageCount);
}

function getCurrentLevel(snapshot) {
  return Math.max(1, Math.floor(Number(snapshot?.tasks?.currentLevel) || 1));
}

function getTutorialUsername(dom) {
  const username = typeof dom?.getUsername === 'function' ? dom.getUsername() : '';
  return String(username ?? '').trim() || 'wizard';
}

function hasCustomUsername(dom) {
  return getTutorialUsername(dom).toLowerCase() !== 'wizard';
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
