import {
  formatOpenLevelRequirementsLabel,
  getLevelRequirementTargetLevel,
} from '../../shared/levelRequirementsLabel.js';

const SAGE_SEED_KEY = 'sageSeed';
const SAGE_HERB_KEY = 'sageHerb';
const MINT_SEED_KEY = 'mintSeed';
const MINT_HERB_KEY = 'mintHerb';
const MINT_SEED_RESEARCH_ID = 'unlockSeed:mintSeed';
const MANA_TONIC_KEY = 'manaTonic';
const MANA_TONIC_RESEARCH_ID = 'unlockRecipe:manaTonic';
const DIRECT_SELL_POPUP_CLASS = 'shop-page__direct-sell-popup';
const DIRECT_SELL_PLUS_ONE_TARGET_ID = 'shop:directSell:amount:+1';
const DIRECT_SELL_CONFIRM_TARGET_ID = 'shop:directSell:sell';
const MANA_TONIC_SAGE_COUNT = 3;
const MANA_TONIC_EXTRA_SAGE_TARGET_ID = `brewing:remove:${SAGE_HERB_KEY}`;
const MANA_READOUT_TARGET_ID = 'top:mana';
const LEVEL_ONE_SEED_TASK_ID = 'level1-sage-seeds';
const LEVEL_ONE_GOLD_TARGET = 10;
const TUTORIAL_SELL_GOLD_EACH = LEVEL_ONE_GOLD_TARGET;
const LEVEL_TWO_SAGE_GROW_TARGET = 3;
const TURN_IN_TEXT = 'turn in';
const COMPLETE_TEXT = 'complete';
export const TUTORIAL_LESSON_THREE_STUCK_MS = 3500;
export const LEVEL_ONE_TUTORIAL_SALE = Object.freeze({
  itemKey: SAGE_SEED_KEY,
  quantity: 1,
  goldEach: TUTORIAL_SELL_GOLD_EACH,
  goldTarget: LEVEL_ONE_GOLD_TARGET,
});
const LEVEL_TWO_SELL_ITEM_KEYS = [SAGE_SEED_KEY, SAGE_HERB_KEY];
const LEVEL_THREE_SELL_ITEM_KEYS = [...LEVEL_TWO_SELL_ITEM_KEYS, MINT_SEED_KEY, MINT_HERB_KEY];

const LEVEL_ONE_STEP_IDS = [
  'purchase-house',
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
  'intro-garden',
  'grow-sage',
  'fill-sage-herb-task',
  'fill-sage-seed-task',
  'level-up-two',
];

const LEVEL_THREE_STEP_IDS = [
  'intro-research',
  'research-mint-seed',
  'fill-mint-seed-task',
  'fill-mint-herb-task',
  'level-up-three',
];

const LEVEL_FOUR_STEP_IDS = [
  'research-mana-tonic',
  'intro-brewing',
  'brew-mana-tonic',
  'refill-mana-tonic-cauldron',
];

const LEVEL_FIVE_STEP_IDS = ['find-theme-settings'];

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
const SETTINGS_LESSON_STEP_IDS = LEVEL_FIVE_STEP_IDS;

const LESSON_TITLE_BY_STEP_ID = new Map([
  ...SEEDING_LESSON_STEP_IDS.map((stepId) => [stepId, 'lesson 1: introduction']),
  ...MARKET_LESSON_STEP_IDS.map((stepId) => [stepId, 'lesson 2: market']),
  ...GARDENING_LESSON_STEP_IDS.map((stepId) => [stepId, 'lesson 3: gardening']),
  ...BREWING_LESSON_STEP_IDS.map((stepId) => [stepId, 'lesson 4: brewing']),
  ...SETTINGS_LESSON_STEP_IDS.map((stepId) => [stepId, 'lesson 5: settings']),
  ['purchase-house', 'the story begins'],
  ['intro-market', 'market opened'],
  ['intro-garden', 'garden opened'],
  ['intro-research', 'research opened'],
  ['intro-brewing', 'brewing opened'],
]);

export const TUTORIAL_STEP_IDS = [
  ...LEVEL_ONE_STEP_IDS,
  ...LEVEL_TWO_STEP_IDS,
  ...LEVEL_THREE_STEP_IDS,
  ...LEVEL_FOUR_STEP_IDS,
  ...LEVEL_FIVE_STEP_IDS,
];

const REVEAL_TOP = ['top'];
const REVEAL_MANA = ['top', 'mana'];
const REVEAL_MANA_SUMMON = ['top', 'mana', 'summon'];
const REVEAL_MANA_SUMMON_TASKS = ['top', 'mana', 'summon', 'tasks'];
const REVEAL_LEVEL_ONE_WORKFLOW = ['mana', 'summon', 'tasks', 'top', 'rooms'];

export const TUTORIAL_STEPS = [
  {
    id: 'purchase-house',
    kind: 'dialog',
    variant: 'intro-dialog',
    revealTokens: [],
    text:
      "this old workshop is for sale.\n\nit needs work, but it can become a real potion shop.\n\nElara used to work here. she'll help you get started.",
    advanceLabel: 'purchase house 1000 gold',
    advanceOnClick: true,
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) === 1,
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 2 ||
      hasAnySeedQuantity(snapshot) ||
      hasAnySeedTaskProgress(snapshot),
  },
  {
    id: 'intro-welcome',
    kind: 'prompt',
    revealTokens: [],
    text: "i'm Elara. let's get the workshop running.",
    advanceOnClick: true,
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) === 1,
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 2,
  },
  {
    id: 'intro-username',
    kind: 'prompt',
    getTargetId: ({ dom }) =>
      dom.isUsernameSettingsOpen?.() ? 'top:username-input' : 'top:username',
    cueMode: 'focus-target',
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
    targetId: MANA_READOUT_TARGET_ID,
    revealTokens: REVEAL_MANA,
    text: 'this is your mana. it fills over time, up to the cap shown here.',
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
    getPausedText: () => 'wait for mana',
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
        return getOpenLevelRequirementsText(snapshot);
      }

      const task = getLevelOneSeedTask(snapshot);

      if (task?.canComplete) {
        return COMPLETE_TEXT;
      }

      return task?.canFill ? TURN_IN_TEXT : '';
    },
    getPausedText: ({ snapshot }) =>
      snapshot?.seedSummoning?.canSummon ? 'summon more seeds' : 'wait for mana',
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
    objectiveText: 'summon and turn in sage seeds for the next level',
    getTargetId: ({ dom, snapshot }) => {
      if (!dom.isTasksExpanded()) {
        return 'workshop:tasks';
      }

      const task = getLevelOneSeedTask(snapshot);

      if (task?.canComplete || task?.canFill) {
        return `task:${task.taskId}`;
      }

      return snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : MANA_READOUT_TARGET_ID;
    },
    getHintText: ({ dom, snapshot }) => {
      if (!dom.isTasksExpanded()) {
        return getOpenLevelRequirementsText(snapshot);
      }

      const task = getLevelOneSeedTask(snapshot);

      if (task?.canComplete) {
        return COMPLETE_TEXT;
      }

      if (task?.canFill) {
        return TURN_IN_TEXT;
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
    targetId: 'page:shop',
    getAdvanceLabel: ({ snapshot }) =>
      getItemQuantity(snapshot, SAGE_SEED_KEY) > 0 ? 'open market' : 'continue',
    getAdvancePageId: ({ snapshot }) =>
      getItemQuantity(snapshot, SAGE_SEED_KEY) > 0 ? 'shop' : null,
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
    text:
      'the front room is cleared out.\n\nyou can use it to trade what the workshop makes.',
    advanceOnClick: true,
    allowTargetClick: true,
    showPointer: false,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      isLevelOneSeedTaskComplete(snapshot) &&
      getGold(snapshot) < LEVEL_ONE_GOLD_TARGET,
    isComplete: ({ currentPageId, snapshot }) =>
      getCurrentLevel(snapshot) >= 2 ||
      currentPageId === 'shop' ||
      getGold(snapshot) >= LEVEL_ONE_GOLD_TARGET,
  },
  {
    id: 'prepare-seed-sale',
    kind: 'objective',
    pageId: 'workshop',
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
    objectiveText: 'summon one seed to sell',
    getTargetId: ({ snapshot }) =>
      snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : MANA_READOUT_TARGET_ID,
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
    targetId: 'shop:directSell',
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
    objectiveText: 'sell sage seeds in market',
    text: 'fast sell',
    getProgress: () => ({ value: 0, max: 1 }),
    getProgressLabel: () => '0/1 market',
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
    targetId: 'shop:directSell',
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
    getObjectiveText: ({ currentPageId }) =>
      currentPageId === 'shop' ? 'open fast sell' : 'open market',
    text: 'fast sell',
    getProgress: ({ dom }) => ({
      value: dom.isShopDirectSellPopupOpen?.() ? 1 : 0,
      max: 1,
    }),
    getProgressLabel: ({ dom }) => `${dom.isShopDirectSellPopupOpen?.() ? 1 : 0}/1 open`,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      isLevelOneSeedTaskComplete(snapshot) &&
      getGold(snapshot) < LEVEL_ONE_GOLD_TARGET,
    isComplete: ({ dom, snapshot }) =>
      getCurrentLevel(snapshot) >= 2 ||
      dom.isShopDirectSellPopupOpen?.() ||
      isNpcMarketSelling(snapshot, SAGE_SEED_KEY),
  },
  {
    id: 'select-sage-seed-sale',
    kind: 'objective',
    pageId: 'shop',
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
    objectiveText: 'choose sage seed to sell',
    getTargetId: ({ dom }) =>
      dom.isShopDirectSellPopupOpen?.()
        ? `shop:directSell:${SAGE_SEED_KEY}`
        : 'shop:directSell',
    getHintText: ({ dom }) =>
      dom.isShopDirectSellPopupOpen?.() ? 'choose sage seed' : 'fast sell',
    getProgress: ({ dom, snapshot }) => ({
      value:
        isDirectSellSelected(dom, SAGE_SEED_KEY) ||
        isNpcMarketSelling(snapshot, SAGE_SEED_KEY)
          ? 1
          : 0,
      max: 1,
    }),
    getProgressLabel: ({ dom, snapshot }) =>
      `${
        isDirectSellSelected(dom, SAGE_SEED_KEY) ||
        isNpcMarketSelling(snapshot, SAGE_SEED_KEY)
          ? 1
          : 0
      }/1 seed`,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      isLevelOneSeedTaskComplete(snapshot) &&
      getGold(snapshot) < LEVEL_ONE_GOLD_TARGET,
    isComplete: ({ dom, snapshot }) =>
      getCurrentLevel(snapshot) >= 2 ||
      isDirectSellSelected(dom, SAGE_SEED_KEY) ||
      isNpcMarketSelling(snapshot, SAGE_SEED_KEY),
  },
  {
    id: 'earn-tutorial-gold',
    kind: 'objective',
    pageId: null,
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
    objectiveText: 'choose amount and press sell',
    effect: 'tutorial-sale',
    sale: LEVEL_ONE_TUTORIAL_SALE,
    getTargetId: ({ currentPageId, snapshot, dom }) => {
      if (getItemQuantity(snapshot, SAGE_SEED_KEY) <= 0) {
        if (currentPageId !== 'workshop') {
          return 'page:workshop';
        }

        return snapshot?.seedSummoning?.canSummon
          ? 'workshop:summonSeed'
          : MANA_READOUT_TARGET_ID;
      }

      if (currentPageId !== 'shop') {
        return 'page:shop';
      }

      if (!dom.isShopDirectSellPopupOpen?.()) {
        return 'shop:directSell';
      }

      if (!isDirectSellSelected(dom, SAGE_SEED_KEY)) {
        return `shop:directSell:${SAGE_SEED_KEY}`;
      }

      return 'shop:directSell:sell';
    },
    getHintText: ({ currentPageId, snapshot, dom }) => {
      if (getItemQuantity(snapshot, SAGE_SEED_KEY) <= 0) {
        if (currentPageId !== 'workshop') {
          return 'open workshop';
        }

        return snapshot?.seedSummoning?.canSummon ? 'summon seed' : 'wait for mana';
      }

      if (currentPageId !== 'shop') {
        return 'open market';
      }

      if (!dom.isShopDirectSellPopupOpen?.()) {
        return 'fast sell';
      }

      if (!isDirectSellSelected(dom, SAGE_SEED_KEY)) {
        return 'choose sage seed';
      }

      return 'press sell';
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
      getGold(snapshot) < LEVEL_ONE_GOLD_TARGET,
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 2 || getGold(snapshot) >= LEVEL_ONE_GOLD_TARGET,
  },
  {
    id: 'unselect-sage-seed-sale',
    kind: 'objective',
    pageId: 'shop',
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
    objectiveText: 'finish direct sale',
    getTargetId: () => 'shop:directSell',
    getHintText: () => 'done selling',
    getProgress: () => ({
      value: 1,
      max: 1,
    }),
    getProgressLabel: () => '1/1 sold',
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      isLevelOneSeedTaskComplete(snapshot) &&
      getGold(snapshot) >= LEVEL_ONE_GOLD_TARGET,
    isComplete: () => true,
  },
  {
    id: 'level-up-one',
    kind: 'objective',
    pageId: 'workshop',
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
    objectiveText: 'return to workshop and level up',
    getTargetId: ({ dom }) => (dom.isTasksExpanded() ? 'workshop:levelUp' : 'workshop:tasks'),
    getHintText: ({ dom, snapshot }) =>
      dom.isTasksExpanded() ? 'level up' : getOpenLevelRequirementsText(snapshot),
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
    id: 'intro-garden',
    kind: 'dialog',
    targetId: 'page:garden',
    revealTokens: null,
    text:
      'there is a small growing plot behind the house.\n\nyou can plant seeds there.',
    advanceLabel: 'open garden',
    advancePageId: 'garden',
    advanceOnClick: true,
    allowTargetClick: true,
    showPointer: false,
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) === 2,
    isComplete: ({ currentPageId, snapshot }) =>
      getCurrentLevel(snapshot) >= 3 ||
      currentPageId === 'garden' ||
      hasGrownEnoughSageForLesson(snapshot) ||
      hasTaskActionForItem(snapshot, SAGE_HERB_KEY),
  },
  {
    id: 'grow-sage',
    kind: 'objective',
    getObjectiveText: ({ snapshot }) => {
      if (isGrowSageWaitState(snapshot)) {
        return 'wait for sage to grow';
      }

      return getLessonSageGrowCount(snapshot) <= 0
        ? getLevelTwoRequirementIntroText(snapshot)
        : 'keep going. grow sage 3 times.';
    },
    getCueMode: ({ snapshot }) =>
      getLessonSageGrowCount(snapshot) <= 0 ? 'active' : 'delayed-target',
    getTargetId: ({ currentPageId, dom, snapshot }) => {
      if (shouldIntroduceLevelTwoRequirements({ currentPageId, dom, snapshot })) {
        return 'workshop:tasks';
      }

      if (
        getItemQuantity(snapshot, SAGE_SEED_KEY) <= 0 &&
        !hasGrownEnoughSageForLesson(snapshot) &&
        !hasActiveCrop(snapshot, SAGE_SEED_KEY)
      ) {
        if (currentPageId !== 'workshop') {
          return 'page:workshop';
        }

        return snapshot?.seedSummoning?.canSummon
          ? 'workshop:summonSeed'
          : MANA_READOUT_TARGET_ID;
      }

      if (isGrowSageWaitState(snapshot)) {
        return null;
      }

      if (currentPageId !== 'garden') {
        return 'page:garden';
      }

      const tile = getGrowTile(snapshot, SAGE_SEED_KEY);

      if (!tile) {
        return null;
      }

      if (dom.isGardenSeedPopupOpen()) {
        return `garden:seed:${SAGE_SEED_KEY}`;
      }

      if (tile.phase === 'ready') {
        return `garden:plot:${tile.tileNumber}`;
      }

      if (tile.phase === 'empty' && isTileSelectedSeed(tile, SAGE_SEED_KEY)) {
        return `garden:plot:${tile.tileNumber}`;
      }

      return `garden:plot:${tile.tileNumber}:label`;
    },
    getHintText: ({ currentPageId, dom, snapshot }) => {
      if (shouldIntroduceLevelTwoRequirements({ currentPageId, dom, snapshot })) {
        return getOpenLevelRequirementsText(snapshot);
      }

      if (
        getItemQuantity(snapshot, SAGE_SEED_KEY) <= 0 &&
        !hasGrownEnoughSageForLesson(snapshot) &&
        !hasActiveCrop(snapshot, SAGE_SEED_KEY)
      ) {
        if (currentPageId !== 'workshop') {
          return 'open workshop';
        }

        return snapshot?.seedSummoning?.canSummon ? 'summon seed' : 'wait for mana';
      }

      if (currentPageId !== 'garden') {
        return 'open garden';
      }

      const tile = getGrowTile(snapshot, SAGE_SEED_KEY);

      if (dom.isGardenSeedPopupOpen()) {
        return 'choose sage seed';
      }

      if (tile?.phase === 'ready') {
        return `harvest ${getTileHerbHintName(tile, 'sage')}`;
      }

      if (tile?.phase === 'empty' && isTileSelectedSeed(tile, SAGE_SEED_KEY)) {
        return 'plant sage seed';
      }

      return tile?.phase === 'growing' || tile?.phase === 'harvesting'
        ? `wait for ${getTileHerbHintName(tile, 'sage')} to grow`
        : 'choose sage seed';
    },
    getAutoPageId: ({ currentPageId, dom, snapshot }) =>
      shouldMoveToGardenAfterLevelTwoRequirements({ currentPageId, dom, snapshot })
        ? 'garden'
        : null,
    getProgress: ({ snapshot }) => ({
      value: getLessonSageGrowCount(snapshot),
      max: LEVEL_TWO_SAGE_GROW_TARGET,
    }),
    getProgressLabel: ({ snapshot }) =>
      `${getLessonSageGrowCount(snapshot)}/${LEVEL_TWO_SAGE_GROW_TARGET} sage`,
    getReminderKey: () => 'lesson-three-sage-actions',
    getReminderMs: () => TUTORIAL_LESSON_THREE_STUCK_MS,
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) === 2,
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 3 ||
      hasGrownEnoughSageForLesson(snapshot) ||
      hasTaskActionForItem(snapshot, SAGE_HERB_KEY),
  },
  {
    id: 'fill-sage-herb-task',
    kind: 'objective',
    cueMode: 'delayed-target',
    objectiveText: 'good. now turn in sage for the next level.',
    getTargetId: ({ currentPageId, dom, snapshot }) => {
      const taskAction = getTaskActionForItem(snapshot, SAGE_HERB_KEY);

      if (taskAction) {
        return getTaskActionTargetId({ currentPageId, dom, task: taskAction.task });
      }

      return getSageObtainTargetId({ currentPageId, dom, snapshot });
    },
    getHintText: ({ currentPageId, dom, snapshot }) => {
      const taskAction = getTaskActionForItem(snapshot, SAGE_HERB_KEY);

      if (taskAction) {
        return getTaskActionHintText({
          currentPageId,
          dom,
          snapshot,
          taskAction,
          fillText: 'turn in sage',
        });
      }

      return getSageObtainHintText({ currentPageId, dom, snapshot });
    },
    getProgress: ({ snapshot }) => getTaskProgress(getCurrentTaskForItem(snapshot, SAGE_HERB_KEY)),
    getProgressLabel: ({ snapshot }) =>
      getTaskProgressLabel(getCurrentTaskForItem(snapshot, SAGE_HERB_KEY), 'sage'),
    getReminderKey: () => 'lesson-three-sage-actions',
    getReminderMs: () => TUTORIAL_LESSON_THREE_STUCK_MS,
    isPaused: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 2 &&
      (getItemQuantity(snapshot, SAGE_HERB_KEY) > 0 ||
        hasTaskProgressForItem(snapshot, SAGE_HERB_KEY)) &&
      isWaitingForCrop(snapshot, SAGE_SEED_KEY) &&
      !hasTaskActionForItem(snapshot, SAGE_HERB_KEY),
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 2 &&
      (hasTaskActionForItem(snapshot, SAGE_HERB_KEY) ||
        getItemQuantity(snapshot, SAGE_HERB_KEY) > 0 ||
        hasTaskProgressForItem(snapshot, SAGE_HERB_KEY)),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 3 || hasCompletedTaskForItem(snapshot, SAGE_HERB_KEY),
  },
  {
    id: 'fill-sage-seed-task',
    kind: 'objective',
    cueMode: 'delayed-target',
    objectiveText: 'and yes, the next level still requires sage seed.',
    getTargetId: ({ currentPageId, dom, snapshot }) =>
      getSeedTaskTargetId({ currentPageId, dom, snapshot, itemKey: SAGE_SEED_KEY }),
    getHintText: ({ currentPageId, dom, snapshot }) =>
      getSeedTaskHintText({ currentPageId, dom, snapshot, itemKey: SAGE_SEED_KEY }),
    getProgress: ({ snapshot }) => getTaskProgress(getCurrentTaskForItem(snapshot, SAGE_SEED_KEY)),
    getProgressLabel: ({ snapshot }) =>
      getTaskProgressLabel(getCurrentTaskForItem(snapshot, SAGE_SEED_KEY), 'sage seeds'),
    getReminderKey: () => 'lesson-three-sage-actions',
    getReminderMs: () => TUTORIAL_LESSON_THREE_STUCK_MS,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 2 &&
      Boolean(getCurrentTaskForItem(snapshot, SAGE_SEED_KEY)) &&
      !hasCompletedTaskForItem(snapshot, SAGE_SEED_KEY),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 3 || hasCompletedTaskForItem(snapshot, SAGE_SEED_KEY),
  },
  {
    id: 'level-up-two',
    kind: 'objective',
    getObjectiveText: ({ currentPageId, dom, snapshot }) =>
      hasLevelCompletionGold(snapshot)
        ? 'level up again'
        : getLevelUpGoldObjectiveText({
            currentPageId,
            dom,
            snapshot,
            sellItemKeys: LEVEL_TWO_SELL_ITEM_KEYS,
            emptyObjectiveText: 'get sage to sell',
          }),
    getTargetId: ({ currentPageId, dom, snapshot }) => {
      if (!hasLevelCompletionGold(snapshot)) {
        return getLevelUpGoldTargetId({
          currentPageId,
          dom,
          snapshot,
          sellItemKeys: LEVEL_TWO_SELL_ITEM_KEYS,
          getObtainTargetId: getSageObtainTargetId,
        });
      }

      if (currentPageId !== 'workshop') {
        return 'page:workshop';
      }

      return dom.isTasksExpanded() ? 'workshop:levelUp' : 'workshop:tasks';
    },
    getHintText: ({ currentPageId, dom, snapshot }) => {
      if (!hasLevelCompletionGold(snapshot)) {
        return getLevelUpGoldHintText({
          currentPageId,
          dom,
          snapshot,
          sellItemKeys: LEVEL_TWO_SELL_ITEM_KEYS,
          getObtainHintText: getSageObtainHintText,
        });
      }

      if (currentPageId !== 'workshop') {
        return 'open workshop';
      }

      return dom.isTasksExpanded() ? 'level up' : getOpenLevelRequirementsText(snapshot);
    },
    getAllowedPopupClasses: ({ currentPageId, dom, snapshot }) => {
      if (hasLevelCompletionGold(snapshot)) {
        return [];
      }

      return getLevelUpGoldAllowedPopupClasses({
        currentPageId,
        dom,
        snapshot,
        sellItemKeys: LEVEL_TWO_SELL_ITEM_KEYS,
      });
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
    id: 'intro-research',
    kind: 'dialog',
    targetId: 'page:research',
    text:
      'Elara found notes from the old owner.\n\nyou can study them to learn what this place can make.',
    advanceLabel: 'open research',
    advancePageId: 'research',
    advanceOnClick: true,
    allowTargetClick: true,
    showPointer: false,
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) === 3,
    isComplete: ({ currentPageId, snapshot }) =>
      getCurrentLevel(snapshot) >= 4 ||
      currentPageId === 'research' ||
      hasCompletedResearch(snapshot, MINT_SEED_RESEARCH_ID) ||
      hasTaskActionForItem(snapshot, MINT_SEED_KEY),
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
      getCurrentLevel(snapshot) >= 4 ||
      hasCompletedResearch(snapshot, MINT_SEED_RESEARCH_ID) ||
      hasTaskActionForItem(snapshot, MINT_SEED_KEY),
  },
  {
    id: 'fill-mint-seed-task',
    kind: 'objective',
    cueMode: 'passive',
    objectiveText: 'turn in mint seed for the next level',
    getTargetId: ({ currentPageId, dom, snapshot }) =>
      getSeedTaskTargetId({
        currentPageId,
        dom,
        snapshot,
        itemKey: MINT_SEED_KEY,
        researchId: MINT_SEED_RESEARCH_ID,
      }),
    getHintText: ({ currentPageId, dom, snapshot }) =>
      getSeedTaskHintText({
        currentPageId,
        dom,
        snapshot,
        itemKey: MINT_SEED_KEY,
        researchId: MINT_SEED_RESEARCH_ID,
      }),
    getProgress: ({ snapshot }) => getTaskProgress(getCurrentTaskForItem(snapshot, MINT_SEED_KEY)),
    getProgressLabel: ({ snapshot }) =>
      getTaskProgressLabel(getCurrentTaskForItem(snapshot, MINT_SEED_KEY), 'mint seeds'),
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 3 &&
      (hasCompletedResearch(snapshot, MINT_SEED_RESEARCH_ID) ||
        hasTaskActionForItem(snapshot, MINT_SEED_KEY) ||
        hasTaskProgressForItem(snapshot, MINT_SEED_KEY)) &&
      Boolean(getCurrentTaskForItem(snapshot, MINT_SEED_KEY)) &&
      !hasCompletedTaskForItem(snapshot, MINT_SEED_KEY),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 4 || hasCompletedTaskForItem(snapshot, MINT_SEED_KEY),
  },
  {
    id: 'fill-mint-herb-task',
    kind: 'objective',
    cueMode: 'passive',
    objectiveText: 'turn in mint for the next level',
    getTargetId: ({ currentPageId, dom, snapshot }) => {
      const taskAction = getTaskActionForItem(snapshot, MINT_HERB_KEY);

      if (taskAction) {
        return getTaskActionTargetId({ currentPageId, dom, task: taskAction.task });
      }

      return getHerbObtainTargetId({
        currentPageId,
        dom,
        snapshot,
        seedKey: MINT_SEED_KEY,
        researchId: MINT_SEED_RESEARCH_ID,
      });
    },
    getHintText: ({ currentPageId, dom, snapshot }) => {
      const taskAction = getTaskActionForItem(snapshot, MINT_HERB_KEY);

      if (taskAction) {
        return getTaskActionHintText({
          currentPageId,
          dom,
          snapshot,
          taskAction,
          fillText: 'turn in mint',
        });
      }

      return getHerbObtainHintText({
        currentPageId,
        dom,
        snapshot,
        seedKey: MINT_SEED_KEY,
        herbName: 'mint',
        researchId: MINT_SEED_RESEARCH_ID,
      });
    },
    getProgress: ({ snapshot }) => getTaskProgress(getCurrentTaskForItem(snapshot, MINT_HERB_KEY)),
    getProgressLabel: ({ snapshot }) =>
      getTaskProgressLabel(getCurrentTaskForItem(snapshot, MINT_HERB_KEY), 'mint'),
    isPaused: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 3 &&
      hasCompletedTaskForItem(snapshot, MINT_SEED_KEY) &&
      Boolean(getCurrentTaskForItem(snapshot, MINT_HERB_KEY)) &&
      !hasCompletedTaskForItem(snapshot, MINT_HERB_KEY) &&
      isWaitingForCrop(snapshot, MINT_SEED_KEY) &&
      !hasTaskActionForItem(snapshot, MINT_HERB_KEY),
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
    getObjectiveText: ({ currentPageId, dom, snapshot }) =>
      hasLevelCompletionGold(snapshot)
        ? 'level up again'
        : getLevelUpGoldObjectiveText({
            currentPageId,
            dom,
            snapshot,
            sellItemKeys: LEVEL_THREE_SELL_ITEM_KEYS,
            emptyObjectiveText: 'get mint to sell',
          }),
    getTargetId: ({ currentPageId, dom, snapshot }) => {
      if (!hasLevelCompletionGold(snapshot)) {
        return getLevelUpGoldTargetId({
          currentPageId,
          dom,
          snapshot,
          sellItemKeys: LEVEL_THREE_SELL_ITEM_KEYS,
          getObtainTargetId: getMintObtainTargetId,
        });
      }

      if (currentPageId !== 'workshop') {
        return 'page:workshop';
      }

      return dom.isTasksExpanded() ? 'workshop:levelUp' : 'workshop:tasks';
    },
    getHintText: ({ currentPageId, dom, snapshot }) => {
      if (!hasLevelCompletionGold(snapshot)) {
        return getLevelUpGoldHintText({
          currentPageId,
          dom,
          snapshot,
          sellItemKeys: LEVEL_THREE_SELL_ITEM_KEYS,
          getObtainHintText: getMintObtainHintText,
        });
      }

      if (currentPageId !== 'workshop') {
        return 'open workshop';
      }

      return dom.isTasksExpanded() ? 'level up' : getOpenLevelRequirementsText(snapshot);
    },
    getAllowedPopupClasses: ({ currentPageId, dom, snapshot }) => {
      if (hasLevelCompletionGold(snapshot)) {
        return [];
      }

      return getLevelUpGoldAllowedPopupClasses({
        currentPageId,
        dom,
        snapshot,
        sellItemKeys: LEVEL_THREE_SELL_ITEM_KEYS,
      });
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
      hasStartedOrCompletedResearch(snapshot, MANA_TONIC_RESEARCH_ID) ||
      hasTaskActionForItem(snapshot, MANA_TONIC_KEY) ||
      hasBrewedManaTonic(snapshot),
  },
  {
    id: 'intro-brewing',
    kind: 'dialog',
    targetId: 'page:brewing',
    text:
      'the cauldron room is usable again.\n\nyou can brew simple potions there.',
    advanceLabel: 'open brewing',
    advancePageId: 'brewing',
    advanceOnClick: true,
    allowTargetClick: true,
    showPointer: false,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 4 && hasCompletedResearch(snapshot, MANA_TONIC_RESEARCH_ID),
    isComplete: ({ currentPageId, snapshot }) =>
      getCurrentLevel(snapshot) >= 5 || currentPageId === 'brewing' || hasBrewedManaTonic(snapshot),
  },
  {
    id: 'brew-mana-tonic',
    kind: 'objective',
    pageId: 'brewing',
    objectiveText: 'brew mana tonic',
    getTargetId: ({ dom, snapshot }) => {
      if (dom.isBrewingRecipePopupOpen()) {
        if (isBrewingRecipeSelected(dom, MANA_TONIC_KEY)) {
          return 'brewing:recipes:close';
        }

        return `brewing:recipe:${MANA_TONIC_KEY}`;
      }

      const brewing = getPrimaryBrewingState(snapshot);
      const activeAction = isActiveManaTonicBrew(snapshot)
        ? getActiveBrewingAction(brewing)
        : null;
      const recoveryAction = brewing?.activeBrew ? getActiveBrewingAction(brewing) : null;

      if (activeAction) {
        return 'brewing:action';
      }

      if (brewing?.activeBrew) {
        return recoveryAction ? 'brewing:action' : null;
      }

      if (hasExtraManaTonicSage(snapshot)) {
        return MANA_TONIC_EXTRA_SAGE_TARGET_ID;
      }

      if (isManaTonicCauldronReady(snapshot)) {
        return 'brewing:action';
      }

      return canAddManaTonicSage(snapshot) ? `brewing:herb:${SAGE_HERB_KEY}` : null;
    },
    getHintText: ({ dom, snapshot }) => {
      if (dom.isBrewingRecipePopupOpen()) {
        if (isBrewingRecipeSelected(dom, MANA_TONIC_KEY)) {
          return 'close recipes';
        }

        return 'choose mana tonic';
      }

      const brewing = getPrimaryBrewingState(snapshot);
      const activeAction = isActiveManaTonicBrew(snapshot)
        ? getActiveBrewingAction(brewing)
        : null;

      if (activeAction === 'bottle') {
        return 'bottle mana tonic';
      }

      if (brewing?.activeBrew) {
        const recoveryAction = getActiveBrewingAction(brewing);

        if (recoveryAction === 'bottle') {
          return 'bottle current brew';
        }

        return 'wait for current brew';
      }

      if (hasExtraManaTonicSage(snapshot)) {
        return 'remove extra sage';
      }

      if (isManaTonicCauldronReady(snapshot)) {
        return 'brew mana tonic';
      }

      if (getManaTonicCauldronFillCount(snapshot) > 0) {
        return 'add sage. recipes care about order';
      }

      return 'tap sage to fill cauldron. recipes care about order';
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
    getObjectiveText: ({ snapshot }) =>
      hasTaskActionForItem(snapshot, MANA_TONIC_KEY)
        ? 'turn in mana tonic for the next level'
        : 'fill the cauldron again',
    getTargetId: ({ currentPageId, dom, snapshot }) => {
      const taskAction = getTaskActionForItem(snapshot, MANA_TONIC_KEY);

      if (taskAction) {
        return getTaskActionTargetId({ currentPageId, dom, task: taskAction.task });
      }

      if (currentPageId !== 'brewing') {
        return 'page:brewing';
      }

      const brewing = getPrimaryBrewingState(snapshot);
      const activeAction = isActiveManaTonicBrew(snapshot)
        ? getActiveBrewingAction(brewing)
        : null;

      if (activeAction || isManaTonicCauldronReady(snapshot)) {
        return 'brewing:action';
      }

      if (hasExtraManaTonicSage(snapshot)) {
        return MANA_TONIC_EXTRA_SAGE_TARGET_ID;
      }

      return canAddManaTonicSage(snapshot) ? `brewing:herb:${SAGE_HERB_KEY}` : null;
    },
    getHintText: ({ currentPageId, dom, snapshot }) => {
      const taskAction = getTaskActionForItem(snapshot, MANA_TONIC_KEY);

      if (taskAction) {
        return getTaskActionHintText({
          currentPageId,
          dom,
          snapshot,
          taskAction,
          fillText: 'turn in mana tonic',
        });
      }

      if (currentPageId !== 'brewing') {
        return 'open brewing';
      }

      const brewing = getPrimaryBrewingState(snapshot);
      const activeAction = isActiveManaTonicBrew(snapshot)
        ? getActiveBrewingAction(brewing)
        : null;

      if (activeAction === 'bottle') {
        return 'bottle mana tonic';
      }

      if (isManaTonicCauldronReady(snapshot)) {
        return 'brew again';
      }

      if (hasExtraManaTonicSage(snapshot)) {
        return 'remove extra sage';
      }

      const progress = getManaTonicCauldronFillCount(snapshot);

      return progress > 0
        ? 'add sage. recipes care about order'
        : 'tap sage to fill cauldron. recipes care about order';
    },
    getProgress: ({ snapshot }) =>
      hasTaskActionForItem(snapshot, MANA_TONIC_KEY)
        ? getTaskProgress(getCurrentTaskForItem(snapshot, MANA_TONIC_KEY))
        : {
            value: getManaTonicCauldronFillCount(snapshot),
            max: MANA_TONIC_SAGE_COUNT,
          },
    getProgressLabel: ({ snapshot }) =>
      hasTaskActionForItem(snapshot, MANA_TONIC_KEY)
        ? getTaskProgressLabel(getCurrentTaskForItem(snapshot, MANA_TONIC_KEY), 'mana tonic')
        : `${getManaTonicCauldronFillCount(snapshot)}/${MANA_TONIC_SAGE_COUNT} sage`,
    getReminderKey: () => 'refill-mana-tonic-cauldron-actions',
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 4 &&
      (hasTaskActionForItem(snapshot, MANA_TONIC_KEY) ||
        (hasCompletedResearch(snapshot, MANA_TONIC_RESEARCH_ID) &&
          hasBrewedManaTonic(snapshot))) &&
      !hasCompletedTaskForItem(snapshot, MANA_TONIC_KEY),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 5 ||
      hasCompletedTaskForItem(snapshot, MANA_TONIC_KEY) ||
      isActiveManaTonicBrew(snapshot),
  },
  {
    id: 'find-theme-settings',
    kind: 'objective',
    cueMode: 'passive',
    objectiveText:
      'you can change themes in settings. open settings, then use the configurations tab.',
    getTargetId: ({ dom }) =>
      dom?.isSettingsThemeTabVisible?.() ? 'top:settings:theme-tab' : 'top:username',
    getHintText: ({ dom }) =>
      dom?.isSettingsThemeTabVisible?.() ? 'configurations tab' : 'open settings',
    getReminderKey: () => 'level-five-theme-settings',
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) === 5,
    isComplete: ({ dom, snapshot }) =>
      getCurrentLevel(snapshot) >= 6 || Boolean(dom?.isThemeSettingsTabOpen?.()),
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
        return this.createPausedViewModel(step, context);
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

  hasCompletedAllSteps() {
    return TUTORIAL_STEP_IDS.every((stepId) => this.progressManager.hasCompleted(stepId));
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

    if (currentLevel >= 6) {
      this.completeSteps(TUTORIAL_STEP_IDS);
      return;
    }

    if (currentLevel >= 5) {
      this.completeSteps([
        ...LEVEL_ONE_STEP_IDS,
        ...LEVEL_TWO_STEP_IDS,
        ...LEVEL_THREE_STEP_IDS,
        ...LEVEL_FOUR_STEP_IDS,
      ]);
    } else if (currentLevel >= 4) {
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

    if (hasGrownEnoughSageForLesson(snapshot) || hasTaskActionForItem(snapshot, SAGE_HERB_KEY)) {
      this.completeSteps(['intro-garden', 'grow-sage']);
    }

    if (currentLevel === 2 && hasCompletedTaskForItem(snapshot, SAGE_SEED_KEY)) {
      this.completeSteps(['fill-sage-seed-task']);
    }

    if (hasCompletedTaskForItem(snapshot, SAGE_HERB_KEY)) {
      this.completeSteps(['fill-sage-herb-task']);
    }

    if (
      hasCompletedResearch(snapshot, MINT_SEED_RESEARCH_ID) ||
      hasTaskActionForItem(snapshot, MINT_SEED_KEY)
    ) {
      this.completeSteps(['intro-research', 'research-mint-seed']);
    }

    if (hasCompletedTaskForItem(snapshot, MINT_SEED_KEY)) {
      this.completeSteps(['fill-mint-seed-task']);
    }

    if (hasCompletedTaskForItem(snapshot, MINT_HERB_KEY)) {
      this.completeSteps(['fill-mint-herb-task']);
    }

    if (
      hasStartedOrCompletedResearch(snapshot, MANA_TONIC_RESEARCH_ID) ||
      hasTaskActionForItem(snapshot, MANA_TONIC_KEY) ||
      hasBrewedManaTonic(snapshot)
    ) {
      this.completeSteps(['research-mana-tonic']);
    }

    if (hasBrewedManaTonic(snapshot)) {
      this.completeSteps(['intro-brewing', 'brew-mana-tonic']);
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
        lessonTitle: getLessonTitle(step),
        progress: step.getProgress?.(context) ?? null,
        progressLabel: step.getProgressLabel?.(context) ?? '',
        stepLabel,
        reminderKey: step.getReminderKey?.(context) ?? null,
        reminderMs: getReminderMs(step, context),
        revealTokens: getRevealTokens(step),
        allowedPopupClasses: [],
        allowTargetClick: step.allowTargetClick === true,
        cueMode: getCueMode(step, context),
        autoPageId: getAutoPageId(step, context),
        advanceLabel: getAdvanceLabel(step, context),
        advancePageId: getAdvancePageId(step, context),
        variant: getVariant(step, context),
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
      lessonTitle: getLessonTitle(step),
      progress: step.getProgress?.(context) ?? null,
      progressLabel: step.getProgressLabel?.(context) ?? '',
      stepLabel,
      advanceOnClick: step.advanceOnClick === true,
      allowTargetClick: step.allowTargetClick === true,
      showPointer: step.showPointer !== false,
      reminderKey: step.getReminderKey?.({ ...context, targetId, text, hintText }) ?? null,
      reminderMs: getReminderMs(step, { ...context, targetId, text, hintText }),
      revealTokens: getRevealTokens(step),
      allowedPopupClasses: getAllowedPopupClasses(step, { ...context, targetId, text, hintText }),
      cueMode: getCueMode(step, { ...context, targetId, text, hintText }),
      autoPageId: getAutoPageId(step, { ...context, targetId, text, hintText }),
      advanceLabel: getAdvanceLabel(step, { ...context, targetId, text, hintText }),
      advancePageId: getAdvancePageId(step, { ...context, targetId, text, hintText }),
      variant: getVariant(step, { ...context, targetId, text, hintText }),
      effect: step.effect,
      sale: step.sale,
    };
  }

  createPausedViewModel(step, context) {
    const viewModel = this.createViewModel(step, context);
    const pausedText =
      step.getPausedText?.({ ...context, ...viewModel }) ??
      step.pauseText ??
      viewModel.hintText ??
      viewModel.text ??
      viewModel.objectiveText ??
      '';
    const pausedHintText =
      step.getPausedHintText?.({ ...context, ...viewModel, pausedText }) ??
      step.pauseHintText ??
      pausedText ??
      viewModel.hintText;
    const pausedObjectiveText =
      step.getPausedObjectiveText?.({
        ...context,
        ...viewModel,
        pausedHintText,
        pausedText,
      }) ??
      step.pauseObjectiveText ??
      pausedHintText ??
      pausedText;

    return {
      ...viewModel,
      targetId: null,
      text: pausedText,
      hintText: pausedHintText,
      objectiveText: pausedObjectiveText,
      advanceOnClick: false,
      cueMode: step.pauseCueMode ?? 'passive',
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

function getLessonTitle(step) {
  return step?.lessonTitle ?? LESSON_TITLE_BY_STEP_ID.get(step?.id) ?? 'lesson';
}

function getRevealTokens(step) {
  return Array.isArray(step?.revealTokens) ? step.revealTokens : null;
}

function getReminderMs(step, context) {
  const reminderMs = step?.getReminderMs?.(context) ?? step?.reminderMs ?? null;
  return Number.isFinite(reminderMs) && reminderMs >= 0 ? reminderMs : null;
}

function getAllowedPopupClasses(step, context) {
  const popupClasses = step?.getAllowedPopupClasses?.(context) ?? step?.allowedPopupClasses ?? [];

  if (!Array.isArray(popupClasses)) {
    return [];
  }

  return popupClasses.filter((popupClass) => typeof popupClass === 'string' && popupClass.length > 0);
}

function getCueMode(step, context) {
  const cueMode = step?.getCueMode?.(context) ?? step?.cueMode ?? 'active';
  return cueMode || 'active';
}

function getAutoPageId(step, context) {
  const pageId = step?.getAutoPageId?.(context) ?? step?.autoPageId ?? null;
  return typeof pageId === 'string' && pageId.length > 0 ? pageId : null;
}

function getAdvanceLabel(step, context) {
  const label = step?.getAdvanceLabel?.(context) ?? step?.advanceLabel ?? 'next';
  return typeof label === 'string' && label.trim().length > 0 ? label.trim() : 'next';
}

function getAdvancePageId(step, context) {
  const pageId = step?.getAdvancePageId?.(context) ?? step?.advancePageId ?? null;
  return typeof pageId === 'string' && pageId.length > 0 ? pageId : null;
}

function getVariant(step, context) {
  const variant = step?.getVariant?.(context) ?? step?.variant ?? null;
  return typeof variant === 'string' && variant.length > 0 ? variant : null;
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

function getLevelUpGoldObjectiveText({
  currentPageId,
  dom,
  snapshot,
  sellItemKeys,
  emptyObjectiveText,
}) {
  const state = getLevelUpGoldMarketState({
    currentPageId,
    dom,
    snapshot,
    sellItemKeys,
  });

  if (state.kind === 'obtain-item') {
    return emptyObjectiveText;
  }

  if (state.kind === 'choose-item') {
    return 'choose something to sell';
  }

  if (state.kind === 'select-kind') {
    return `open ${getDirectSellKindLabel(state.itemKind)} tab`;
  }

  if (state.kind === 'set-amount') {
    return state.canIncrease
      ? 'amount starts at 1. press sell, or +1 if you have more to sell.'
      : 'press sell';
  }

  return 'earn level-up gold in market';
}

function getLevelUpGoldTargetId({
  currentPageId,
  dom,
  snapshot,
  sellItemKeys,
  getObtainTargetId,
}) {
  const state = getLevelUpGoldMarketState({
    currentPageId,
    dom,
    snapshot,
    sellItemKeys,
  });

  if (state.kind === 'open-market') {
    return 'page:shop';
  }

  if (state.kind === 'open-fast-sell') {
    return 'shop:directSell';
  }

  if (state.kind === 'choose-item') {
    return `shop:directSell:${state.itemKey}`;
  }

  if (state.kind === 'select-kind') {
    return `shop:directSell:tab:${state.itemKind}`;
  }

  if (state.kind === 'set-amount') {
    return state.canIncrease ? DIRECT_SELL_PLUS_ONE_TARGET_ID : DIRECT_SELL_CONFIRM_TARGET_ID;
  }

  if (state.kind !== 'obtain-item') {
    return null;
  }

  return getObtainTargetId({ currentPageId, dom, snapshot });
}

function getLevelUpGoldHintText({
  currentPageId,
  dom,
  snapshot,
  sellItemKeys,
  getObtainHintText,
}) {
  const state = getLevelUpGoldMarketState({
    currentPageId,
    dom,
    snapshot,
    sellItemKeys,
  });

  if (state.kind === 'open-market') {
    return 'open market';
  }

  if (state.kind === 'open-fast-sell') {
    return 'fast sell';
  }

  if (state.kind === 'choose-item') {
    return 'choose something to sell';
  }

  if (state.kind === 'select-kind') {
    return getDirectSellKindLabel(state.itemKind);
  }

  if (state.kind === 'set-amount') {
    return state.canIncrease ? '+1' : 'press sell';
  }

  if (state.kind !== 'obtain-item') {
    return '';
  }

  return getObtainHintText({ currentPageId, dom, snapshot });
}

function getLevelUpGoldAllowedPopupClasses({
  currentPageId,
  dom,
  snapshot,
  sellItemKeys,
}) {
  const state = getLevelUpGoldMarketState({
    currentPageId,
    dom,
    snapshot,
    sellItemKeys,
  });

  if (state.kind === 'set-amount') {
    return [DIRECT_SELL_POPUP_CLASS];
  }

  return [];
}

function getLevelUpGoldMarketState({
  currentPageId,
  dom,
  snapshot,
  sellItemKeys,
}) {
  if (!hasAnyAvailableSellItemQuantity(snapshot, sellItemKeys)) {
    return { kind: 'obtain-item' };
  }

  if (currentPageId !== 'shop') {
    return { kind: 'open-market' };
  }

  if (!dom?.isShopDirectSellPopupOpen?.()) {
    return { kind: 'open-fast-sell' };
  }

  const selectedItemKey = getSelectedDirectSellItemKey(dom, sellItemKeys);

  if (selectedItemKey && getAvailableSellItemQuantity(snapshot, selectedItemKey) > 0) {
    const selectedQuantity = getSelectedDirectSellQuantity(dom);
    return {
      kind: 'set-amount',
      canIncrease:
        getSelectedDirectSellMaxQuantity(snapshot, selectedItemKey) > selectedQuantity &&
        !doesSelectedSellQuantityCoverGoldShortfall({
          snapshot,
          itemKey: selectedItemKey,
          quantity: selectedQuantity,
        }),
    };
  }

  const item = getFirstAvailableSellItem(snapshot, sellItemKeys);

  if (!item) {
    return { kind: 'obtain-item' };
  }

  if (item.kind && !dom?.isShopDirectSellTabSelected?.(item.kind)) {
    return { kind: 'select-kind', itemKind: item.kind };
  }

  return { kind: 'choose-item', itemKey: item.key };
}

function hasAnyAvailableSellItemQuantity(snapshot, itemKeys) {
  return itemKeys.some((itemKey) => getAvailableSellItemQuantity(snapshot, itemKey) > 0);
}

function getFirstAvailableSellItem(snapshot, itemKeys) {
  const sellItems = snapshot?.shop?.shelf?.sellItems;

  if (Array.isArray(sellItems)) {
    return (
      sellItems.find(
        (item) => itemKeys.includes(item?.key) && getPositiveQuantity(item) > 0,
      ) ?? null
    );
  }

  const itemKey = itemKeys.find((key) => getItemQuantity(snapshot, key) > 0) ?? null;
  return itemKey ? { key: itemKey, kind: null, quantity: getItemQuantity(snapshot, itemKey) } : null;
}

function getAvailableSellItemQuantity(snapshot, itemKey) {
  const sellItems = snapshot?.shop?.shelf?.sellItems;

  if (Array.isArray(sellItems)) {
    return sellItems
      .filter((item) => item?.key === itemKey)
      .reduce((total, item) => total + getPositiveQuantity(item), 0);
  }

  return getItemQuantity(snapshot, itemKey);
}

function getPositiveQuantity(item) {
  return Math.max(0, Math.floor(Number(item?.quantity) || 0));
}

function getSelectedDirectSellMaxQuantity(snapshot, itemKey) {
  const sellItems = snapshot?.shop?.shelf?.sellItems;

  if (!Array.isArray(sellItems)) {
    return getAvailableSellItemQuantity(snapshot, itemKey);
  }

  return sellItems
    .filter((item) => item?.key === itemKey)
    .reduce((total, item) => total + getPositiveSellQuantity(item), 0);
}

function getSelectedDirectSellQuantity(dom) {
  const quantity = Math.floor(Number(dom?.getShopDirectSellQuantity?.()));

  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function doesSelectedSellQuantityCoverGoldShortfall({ snapshot, itemKey, quantity }) {
  const unitGold = getDirectSellUnitGold(snapshot, itemKey);

  if (!Number.isFinite(unitGold) || unitGold <= 0) {
    return quantity > 1;
  }

  return unitGold * quantity >= getLevelCompletionCostGold(snapshot) - getGold(snapshot);
}

function getDirectSellUnitGold(snapshot, itemKey) {
  const item = snapshot?.shop?.shelf?.sellItems?.find(
    (sellItem) => sellItem?.key === itemKey,
  );
  const fastSellGold = Number(item?.fastSellGold);

  if (Number.isFinite(fastSellGold) && fastSellGold > 0) {
    return fastSellGold;
  }

  const sellGold = Number(item?.sellGold);
  return Number.isFinite(sellGold) && sellGold > 0 ? sellGold : null;
}

function getPositiveSellQuantity(item) {
  const quantity = getPositiveQuantity(item);
  const sellNeed = Number(item?.sellNeed);

  if (!Number.isFinite(sellNeed) || sellNeed < 0) {
    return quantity;
  }

  return Math.min(quantity, Math.floor(sellNeed));
}

function getDirectSellKindLabel(kind) {
  if (kind === 'herb') {
    return 'herbs';
  }

  if (kind === 'potion') {
    return 'potions';
  }

  return 'seeds';
}

function getSelectedDirectSellItemKey(dom, itemKeys) {
  return itemKeys.find((itemKey) => dom?.isShopDirectSellItemSelected?.(itemKey)) ?? null;
}

function getGrowTile(snapshot, seedKey = null) {
  const tiles = (snapshot?.garden?.plot?.tiles ?? []).filter((tile) => tile.unlocked);

  if (seedKey) {
    return (
      tiles.find((tile) => tile.phase === 'ready' && isTileActiveSeed(tile, seedKey)) ??
      tiles.find((tile) => tile.phase === 'empty' && isTileSelectedSeed(tile, seedKey)) ??
      tiles.find(
        (tile) =>
          (tile.phase === 'growing' || tile.phase === 'harvesting') &&
          isTileActiveSeed(tile, seedKey),
      ) ??
      tiles.find((tile) => tile.phase === 'empty' && !hasTileSelectedSeed(tile)) ??
      tiles.find((tile) => tile.phase === 'empty') ??
      tiles.find((tile) => tile.phase === 'ready') ??
      tiles.find((tile) => tile.phase === 'growing' || tile.phase === 'harvesting') ??
      null
    );
  }

  return (
    tiles.find((tile) => tile.phase === 'ready') ??
    tiles.find((tile) => tile.phase === 'empty') ??
    tiles.find((tile) => tile.phase === 'growing' || tile.phase === 'harvesting') ??
    null
  );
}

function getTaskActionForItem(snapshot, itemKey) {
  const task = getCurrentTaskForItem(snapshot, itemKey);

  if (!task || task.completed) {
    return null;
  }

  if (canCompleteTask(task)) {
    return { kind: 'complete', task };
  }

  if (canFillTaskWithOwnedItem(snapshot, task)) {
    return { kind: 'fill', task };
  }

  return null;
}

function hasTaskActionForItem(snapshot, itemKey) {
  return Boolean(getTaskActionForItem(snapshot, itemKey));
}

function getTaskActionTargetId({ currentPageId, dom, task }) {
  if (currentPageId !== 'workshop') {
    return 'page:workshop';
  }

  if (!dom?.isTasksExpanded?.()) {
    return 'workshop:tasks';
  }

  return `task:${task.taskId}`;
}

function getTaskActionHintText({
  currentPageId,
  dom,
  snapshot,
  taskAction,
  fillText = TURN_IN_TEXT,
}) {
  if (currentPageId !== 'workshop') {
    return 'open workshop';
  }

  if (!dom?.isTasksExpanded?.()) {
    return getOpenLevelRequirementsText(snapshot);
  }

  return taskAction.kind === 'complete' ? COMPLETE_TEXT : fillText;
}

function canCompleteTask(task) {
  if (!task || task.completed) {
    return false;
  }

  if (task.canComplete === true || task.maxed === true) {
    return true;
  }

  return getTaskRemainingQuantity(task) <= 0;
}

function canFillTaskWithOwnedItem(snapshot, task) {
  if (!task || task.completed || canCompleteTask(task)) {
    return false;
  }

  return (
    getTaskRemainingQuantity(task) > 0 &&
    (task.canFill === true || getOwnedQuantityForTask(snapshot, task) > 0)
  );
}

function getOwnedQuantityForTask(snapshot, task) {
  const ownedQuantity = Number(task?.ownedQuantity);

  if (Number.isFinite(ownedQuantity)) {
    return Math.max(0, Math.floor(ownedQuantity));
  }

  return getItemQuantity(snapshot, task?.itemKey);
}

function getTaskRemainingQuantity(task) {
  const remainingQuantity = Number(task?.remainingQuantity);

  if (Number.isFinite(remainingQuantity)) {
    return Math.max(0, Math.floor(remainingQuantity));
  }

  const requiredQuantity = Math.max(0, Math.floor(Number(task?.requiredQuantity) || 0));
  const progressQuantity = Math.max(0, Math.floor(Number(task?.progressQuantity) || 0));

  return Math.max(0, requiredQuantity - progressQuantity);
}

function getSeedTaskTargetId({ currentPageId, dom, snapshot, itemKey, researchId = null }) {
  const taskAction = getTaskActionForItem(snapshot, itemKey);

  if (taskAction) {
    if (currentPageId !== 'workshop') {
      return 'page:workshop';
    }

    if (!dom?.isTasksExpanded?.()) {
      return 'workshop:tasks';
    }

    return `task:${taskAction.task.taskId}`;
  }

  if (researchId && !hasCompletedResearch(snapshot, researchId)) {
    return currentPageId === 'research' ? `research:${researchId}` : 'page:research';
  }

  if (currentPageId !== 'workshop') {
    return 'page:workshop';
  }

  return snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : MANA_READOUT_TARGET_ID;
}

function getSeedTaskHintText({ currentPageId, dom, snapshot, itemKey, researchId = null }) {
  const taskAction = getTaskActionForItem(snapshot, itemKey);

  if (taskAction) {
    return getTaskActionHintText({ currentPageId, dom, snapshot, taskAction });
  }

  if (researchId && !hasCompletedResearch(snapshot, researchId)) {
    return currentPageId === 'research' ? 'research seed' : 'open research';
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

function getMintObtainTargetId({ currentPageId, dom, snapshot }) {
  return getHerbObtainTargetId({
    currentPageId,
    dom,
    snapshot,
    seedKey: MINT_SEED_KEY,
    researchId: MINT_SEED_RESEARCH_ID,
  });
}

function getMintObtainHintText({ currentPageId, dom, snapshot }) {
  return getHerbObtainHintText({
    currentPageId,
    dom,
    snapshot,
    seedKey: MINT_SEED_KEY,
    herbName: 'mint',
    researchId: MINT_SEED_RESEARCH_ID,
  });
}

function getHerbObtainTargetId({ currentPageId, dom, snapshot, seedKey, researchId = null }) {
  if (getItemQuantity(snapshot, seedKey) <= 0 && !hasActiveCrop(snapshot, seedKey)) {
    if (researchId && !hasCompletedResearch(snapshot, researchId)) {
      return currentPageId === 'research' ? `research:${researchId}` : 'page:research';
    }

    if (currentPageId !== 'workshop') {
      return 'page:workshop';
    }

    return snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : MANA_READOUT_TARGET_ID;
  }

  if (currentPageId !== 'garden') {
    return 'page:garden';
  }

  if (dom.isGardenSeedPopupOpen()) {
    return `garden:seed:${seedKey}`;
  }

  const tile = getGrowTile(snapshot, seedKey);

  if (!tile) {
    return null;
  }

  if (tile.phase === 'ready') {
    return `garden:plot:${tile.tileNumber}`;
  }

  if (tile.phase === 'empty' && isTileSelectedSeed(tile, seedKey)) {
    return `garden:plot:${tile.tileNumber}`;
  }

  return `garden:plot:${tile.tileNumber}:label`;
}

function getHerbObtainHintText({
  currentPageId,
  dom,
  snapshot,
  seedKey,
  herbName,
  researchId = null,
}) {
  if (getItemQuantity(snapshot, seedKey) <= 0 && !hasActiveCrop(snapshot, seedKey)) {
    if (researchId && !hasCompletedResearch(snapshot, researchId)) {
      return currentPageId === 'research' ? 'research seed' : 'open research';
    }

    if (currentPageId !== 'workshop') {
      return 'open workshop';
    }

    return snapshot?.seedSummoning?.canSummon ? 'summon seed' : 'wait for mana';
  }

  if (currentPageId !== 'garden') {
    return 'open garden';
  }

  if (dom.isGardenSeedPopupOpen()) {
    return `choose ${herbName} seed`;
  }

  const tile = getGrowTile(snapshot, seedKey);

  if (tile?.phase === 'ready') {
    return `harvest ${getTileHerbHintName(tile, herbName)}`;
  }

  if (tile?.phase === 'empty' && isTileSelectedSeed(tile, seedKey)) {
    return `plant ${herbName} seed`;
  }

  return tile?.phase === 'growing' || tile?.phase === 'harvesting'
    ? `wait for ${getTileHerbHintName(tile, herbName)} to grow`
    : `choose ${herbName} seed`;
}

function hasTileSelectedSeed(tile) {
  return Boolean(tile?.selectedSeedKey || tile?.selectedSeedItemTypeId);
}

function isTileSelectedSeed(tile, seedKey) {
  return tile?.selectedSeedKey === seedKey;
}

function isTileActiveSeed(tile, seedKey) {
  return tile?.seedKey === seedKey;
}

function getTileHerbHintName(tile, fallbackName) {
  return tile?.herbLabel || stripSeedSuffix(tile?.seedLabel) || fallbackName;
}

function stripSeedSuffix(label) {
  if (typeof label !== 'string') {
    return null;
  }

  return label.endsWith(' seed') ? label.slice(0, -' seed'.length) : label;
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

function shouldIntroduceLevelTwoRequirements({ currentPageId, dom, snapshot }) {
  return (
    getCurrentLevel(snapshot) === 2 &&
    currentPageId === 'workshop' &&
    getLessonSageGrowCount(snapshot) <= 0 &&
    hasLevelTwoSageRequirements(snapshot) &&
    !dom?.isTasksExpanded?.()
  );
}

function shouldMoveToGardenAfterLevelTwoRequirements({ currentPageId, dom, snapshot }) {
  return (
    getCurrentLevel(snapshot) === 2 &&
    currentPageId !== 'garden' &&
    getLessonSageGrowCount(snapshot) <= 0 &&
    hasLevelTwoSageRequirements(snapshot) &&
    Boolean(dom?.isTasksExpanded?.()) &&
    (getItemQuantity(snapshot, SAGE_SEED_KEY) > 0 || hasActiveCrop(snapshot, SAGE_SEED_KEY))
  );
}

function hasLevelTwoSageRequirements(snapshot) {
  return Boolean(
    getCurrentTaskForItem(snapshot, SAGE_HERB_KEY) &&
      getCurrentTaskForItem(snapshot, SAGE_SEED_KEY),
  );
}

function getLevelTwoRequirementIntroText(snapshot) {
  const requirementText = formatLevelTwoSageRequirementList(snapshot);

  if (!requirementText) {
    return 'sage seed grows into sage. plant one, then harvest it.';
  }

  const targetLevel = getLevelRequirementTargetLevel(snapshot?.tasks);
  const levelText = targetLevel ? `level ${targetLevel}` : 'the next level';

  return `now ${levelText} requires ${requirementText} to level up. fussy little list. let's start growing sage.`;
}

function formatLevelTwoSageRequirementList(snapshot) {
  const requirements = [
    formatRequirementQuantity(getCurrentTaskForItem(snapshot, SAGE_HERB_KEY), {
      singular: 'sage',
      plural: 'sages',
    }),
    formatRequirementQuantity(getCurrentTaskForItem(snapshot, SAGE_SEED_KEY), {
      singular: 'sage seed',
      plural: 'sage seeds',
    }),
  ].filter(Boolean);

  if (requirements.length <= 1) {
    return requirements[0] ?? '';
  }

  return `${requirements.slice(0, -1).join(', ')} and ${requirements[requirements.length - 1]}`;
}

function formatRequirementQuantity(task, labels) {
  const quantity = Math.max(0, Math.floor(Number(task?.requiredQuantity) || 0));

  if (!quantity) {
    return '';
  }

  return `${quantity} ${quantity === 1 ? labels.singular : labels.plural}`;
}

function getLessonSageGrowCount(snapshot) {
  const task = getCurrentTaskForItem(snapshot, SAGE_HERB_KEY);
  const taskCount = task?.completed
    ? Number(task.requiredQuantity) || LEVEL_TWO_SAGE_GROW_TARGET
    : Number(task?.progressQuantity) || 0;

  return Math.min(
    LEVEL_TWO_SAGE_GROW_TARGET,
    Math.max(0, Math.floor(getItemQuantity(snapshot, SAGE_HERB_KEY) + taskCount)),
  );
}

function hasGrownEnoughSageForLesson(snapshot) {
  return getLessonSageGrowCount(snapshot) >= LEVEL_TWO_SAGE_GROW_TARGET;
}

function isGrowSageWaitState(snapshot) {
  return (
    getCurrentLevel(snapshot) === 2 &&
    !hasGrownEnoughSageForLesson(snapshot) &&
    isWaitingForCrop(snapshot, SAGE_SEED_KEY)
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

function isWaitingForCrop(snapshot, seedKey) {
  return (snapshot?.garden?.plot?.tiles ?? []).some(
    (tile) =>
      tile?.unlocked &&
      tile.seedKey === seedKey &&
      (tile.phase === 'growing' || tile.phase === 'harvesting'),
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
  const brewing = getPrimaryBrewingState(snapshot);

  return (
    getManaTonicCauldronFillCount(snapshot) >= MANA_TONIC_SAGE_COUNT &&
    Boolean(brewing?.canBrew) &&
    brewing?.match?.key === MANA_TONIC_KEY &&
    brewing?.match?.unlocked === true
  );
}

function hasExtraManaTonicSage(snapshot) {
  return getManaTonicCauldronSageCount(snapshot) > MANA_TONIC_SAGE_COUNT;
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
  return Math.min(MANA_TONIC_SAGE_COUNT, getManaTonicCauldronSageCount(snapshot));
}

function getManaTonicCauldronSageCount(snapshot) {
  const ingredients = getPrimaryBrewingState(snapshot)?.ingredients ?? [];
  return ingredients.filter((ingredient) => ingredient?.key === SAGE_HERB_KEY).length;
}

function getCurrentLevel(snapshot) {
  return Math.max(1, Math.floor(Number(snapshot?.tasks?.currentLevel) || 1));
}

function getOpenLevelRequirementsText(snapshot) {
  return formatOpenLevelRequirementsLabel(snapshot?.tasks);
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

function isDirectSellSelected(dom, itemKey) {
  return Boolean(dom?.isShopDirectSellItemSelected?.(itemKey));
}

function isBrewingRecipeSelected(dom, recipeKey) {
  return Boolean(dom?.isBrewingRecipeSelected?.(recipeKey));
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
    return null;
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
