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
const DIRECT_SELL_AMOUNT_TARGET_ID = 'shop:directSell:amount';
const DIRECT_SELL_PLUS_ONE_TARGET_ID = 'shop:directSell:amount:+1';
const DIRECT_SELL_CONFIRM_TARGET_ID = 'shop:directSell:sell';
const SELECTED_SELL_AMOUNT_AUTO_ADVANCE_MS = 2000;
const MANA_TONIC_SAGE_COUNT = 3;
const MANA_TONIC_EXTRA_SAGE_TARGET_ID = `brewing:remove:${SAGE_HERB_KEY}`;
const MANA_READOUT_TARGET_ID = 'top:mana';
const MANA_VALUE_TARGET_ID = 'top:mana:value';
const MANA_REGEN_TARGET_ID = 'top:mana:regen';
const LEVEL_ONE_SEED_TASK_IDS = ['level1-turn-in-sage-seed'];
export const TUTORIAL_ADVANCE_ACTIONS = Object.freeze({
  EXPAND_WORKSHOP_TASKS: 'expand-workshop-tasks',
});
const DEFAULT_LEVEL_FOUR_SAGE_GROW_TARGET = 2;
const TURN_IN_TEXT = 'turn in';
const WORKSHOP_TASKS_PIN_TARGET_ID = 'workshop:tasksPin';
export const TUTORIAL_LESSON_THREE_STUCK_MS = 2000;
const LEVEL_TWO_SUMMON_TYPE = 'summon';
const LEVEL_TWO_SELL_TYPE = 'sell';
const LEVEL_TWO_SELL_ITEM_KEYS = [SAGE_SEED_KEY];
const LEVEL_THREE_SELL_ITEM_KEYS = [SAGE_SEED_KEY, MINT_SEED_KEY];
const LEVEL_FOUR_SELL_ITEM_KEYS = [
  SAGE_SEED_KEY,
  MINT_SEED_KEY,
  SAGE_HERB_KEY,
  MINT_HERB_KEY,
];

const LEVEL_ONE_STEP_IDS = [
  'purchase-house',
  'intro-welcome',
  'intro-mana-sphere',
  'first-summon-seed',
  'summon-five-seeds',
  'intro-level-requirements',
  'first-fill-seed-task',
  'finish-seed-task',
  'first-task-complete',
  'level-up-one',
];

const LEVEL_TWO_STEP_IDS = [
  'intro-market',
  'prepare-seed-sale',
  'open-market',
  'select-market-stand',
  'select-sage-seed-sale',
  'show-selected-sale-amount',
  'earn-tutorial-coin',
  'first-sale-complete',
  'unselect-sage-seed-sale',
  'level-up-two',
];

const LEVEL_THREE_STEP_IDS = [
  'intro-research',
  'research-mint-seed',
  'first-research-complete',
  'fill-mint-seed-task',
  'fill-sage-seed-task',
  'level-up-three',
];

const LEVEL_FOUR_STEP_IDS = [
  'intro-garden',
  'grow-sage',
  'first-harvest-complete',
  'fill-sage-herb-task',
  'fill-mint-herb-task',
  'level-up-four',
];

const LEVEL_FIVE_STEP_IDS = [
  'research-mana-tonic',
  'intro-brewing',
  'brew-mana-tonic',
  'first-brew-complete',
  'refill-mana-tonic-cauldron',
];

const SEEDING_LESSON_STEP_IDS = [
  'intro-welcome',
  'intro-mana-sphere',
  'first-summon-seed',
  'summon-five-seeds',
  'intro-level-requirements',
  'first-fill-seed-task',
  'finish-seed-task',
];

const MARKET_LESSON_STEP_IDS = LEVEL_TWO_STEP_IDS;
const RESEARCH_LESSON_STEP_IDS = LEVEL_THREE_STEP_IDS;
const GARDENING_LESSON_STEP_IDS = LEVEL_FOUR_STEP_IDS;
const BREWING_LESSON_STEP_IDS = LEVEL_FIVE_STEP_IDS;

const LESSON_TITLE_BY_STEP_ID = new Map([
  ...SEEDING_LESSON_STEP_IDS.map((stepId) => [stepId, 'lesson 1: introduction']),
  ...MARKET_LESSON_STEP_IDS.map((stepId) => [stepId, 'lesson 2: market']),
  ...RESEARCH_LESSON_STEP_IDS.map((stepId) => [stepId, 'lesson 3: research']),
  ...GARDENING_LESSON_STEP_IDS.map((stepId) => [stepId, 'lesson 4: gardening']),
  ...BREWING_LESSON_STEP_IDS.map((stepId) => [stepId, 'lesson 5: brewing']),
  ['first-task-complete', 'lesson 1: introduction'],
  ['level-up-one', 'lesson 1: introduction'],
  ['purchase-house', 'the story begins'],
  ['intro-market', 'market opened'],
  ['intro-research', 'research opened'],
  ['intro-garden', 'garden opened'],
  ['intro-brewing', 'brewing opened'],
]);

export const TUTORIAL_STEP_IDS = [
  ...LEVEL_ONE_STEP_IDS,
  ...LEVEL_TWO_STEP_IDS,
  ...LEVEL_THREE_STEP_IDS,
  ...LEVEL_FOUR_STEP_IDS,
  ...LEVEL_FIVE_STEP_IDS,
];

const TUTORIAL_STEP_GROUPS = [
  {
    id: 'level-1',
    label: 'level 1: introduction',
    stepIds: LEVEL_ONE_STEP_IDS,
  },
  {
    id: 'level-2',
    label: 'level 2: market',
    stepIds: LEVEL_TWO_STEP_IDS,
  },
  {
    id: 'level-3',
    label: 'level 3: research',
    stepIds: LEVEL_THREE_STEP_IDS,
  },
  {
    id: 'level-4',
    label: 'level 4: gardening',
    stepIds: LEVEL_FOUR_STEP_IDS,
  },
  {
    id: 'level-5',
    label: 'level 5: brewing',
    stepIds: LEVEL_FIVE_STEP_IDS,
  },
];

const TUTORIAL_STEP_GROUP_BY_STEP_ID = new Map(
  TUTORIAL_STEP_GROUPS.flatMap((group) =>
    group.stepIds.map((stepId) => [stepId, group]),
  ),
);

const TUTORIAL_STEP_NOTES = new Map([
  [
    'fill-sage-seed-task',
    'balance-dependent: default tasks.json no longer includes a level-3 sage seed turn-in',
  ],
]);

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
    advanceLabel: 'enter workshop',
    advanceOnClick: true,
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) === 0,
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 1 ||
      hasAnySeedQuantity(snapshot) ||
      hasAnySeedTaskProgress(snapshot),
  },
  {
    id: 'intro-welcome',
    kind: 'prompt',
    revealTokens: [],
    text: "i'm Elara. let's get the workshop running.",
    advanceOnClick: true,
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) === 0,
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 1,
  },
  {
    id: 'intro-mana-sphere',
    kind: 'prompt',
    pageId: 'workshop',
    targetId: MANA_READOUT_TARGET_ID,
    revealTokens: REVEAL_MANA,
    highlightTargetIds: [MANA_VALUE_TARGET_ID, MANA_REGEN_TARGET_ID],
    text: 'this is your mana. it fills over time, up to the cap shown here.',
    advanceOnClick: true,
    showPointer: false,
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) === 0,
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 1,
  },
  {
    id: 'first-summon-seed',
    kind: 'prompt',
    pageId: 'workshop',
    targetId: 'workshop:summonSeed',
    revealTokens: REVEAL_MANA_SUMMON,
    text: 'use your mana to summon seeds.',
    targetCueDelayMs: 2000,
    getPausedText: () => 'wait for mana',
    isPaused: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 0 &&
      !hasAnySeedTaskProgress(snapshot) &&
      !hasAnySeedQuantity(snapshot) &&
      !snapshot?.seedSummoning?.canSummon,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 0 && !hasAnySeedTaskProgress(snapshot),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 1 ||
      hasAnySeedTaskProgress(snapshot) ||
      hasAnySeedQuantity(snapshot),
  },
  {
    id: 'summon-five-seeds',
    kind: 'objective',
    pageId: 'workshop',
    revealTokens: REVEAL_MANA_SUMMON,
    objectiveText: 'summon 5 sage seeds',
    getTargetId: ({ snapshot }) =>
      snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : MANA_READOUT_TARGET_ID,
    getHintText: ({ snapshot }) =>
      snapshot?.seedSummoning?.canSummon ? 'summon seed' : 'wait for mana',
    getPausedText: () => 'wait for mana',
    getProgress: ({ snapshot }) => getLevelOneSeedReadyProgress(snapshot),
    getProgressLabel: ({ snapshot }) => getLevelOneSeedReadyProgressLabel(snapshot),
    isPaused: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 0 &&
      hasAnySeedQuantity(snapshot) &&
      !hasEnoughLevelOneSeedsToTurnIn(snapshot) &&
      !snapshot?.seedSummoning?.canSummon,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 0 &&
      !hasAnySeedTaskProgress(snapshot) &&
      hasAnySeedQuantity(snapshot) &&
      !hasEnoughLevelOneSeedsToTurnIn(snapshot),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 1 ||
      hasAnySeedTaskProgress(snapshot) ||
      hasEnoughLevelOneSeedsToTurnIn(snapshot),
  },
  {
    id: 'intro-level-requirements',
    kind: 'prompt',
    pageId: 'workshop',
    revealTokens: REVEAL_MANA_SUMMON,
    text: "for each new lesson or skill, i'll ask you to complete a few tasks.",
    advanceLabel: 'show requirements',
    advanceOnClick: true,
    advanceAction: TUTORIAL_ADVANCE_ACTIONS.EXPAND_WORKSHOP_TASKS,
    showPointer: false,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 0 &&
      !hasAnySeedTaskProgress(snapshot) &&
      hasEnoughLevelOneSeedsToTurnIn(snapshot),
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 1 || hasAnySeedTaskProgress(snapshot),
  },
  {
    id: 'first-fill-seed-task',
    kind: 'prompt',
    pageId: 'workshop',
    revealTokens: REVEAL_MANA_SUMMON_TASKS,
    getTargetId: ({ snapshot }) => {
      const task = getLevelOneSeedTask(snapshot);

      if (needsMoreLevelOneSeedsBeforeTurnIn(snapshot)) {
        return snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : MANA_READOUT_TARGET_ID;
      }

      if (task?.canFill) {
        return `task:${task.taskId}`;
      }

      return null;
    },
    getText: ({ snapshot }) => {
      const task = getLevelOneSeedTask(snapshot);

      if (needsMoreLevelOneSeedsBeforeTurnIn(snapshot)) {
        return snapshot?.seedSummoning?.canSummon ? 'summon seed' : 'wait for mana';
      }

      if (task?.canFill) {
        return TURN_IN_TEXT;
      }

      return '';
    },
    getPausedText: ({ snapshot }) =>
      snapshot?.seedSummoning?.canSummon ? 'summon more seeds' : 'wait for mana',
    isPaused: ({ snapshot }) => {
      const task = getLevelOneSeedTask(snapshot);
      return !task?.canFill;
    },
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 0 &&
      !hasAnySeedTaskProgress(snapshot) &&
      hasEnoughLevelOneSeedsToTurnIn(snapshot),
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 1 || hasAnySeedTaskProgress(snapshot),
  },
  {
    id: 'finish-seed-task',
    kind: 'objective',
    pageId: 'workshop',
    revealTokens: REVEAL_MANA_SUMMON_TASKS,
    objectiveText: 'summon and turn in 5 sage seeds for level 1',
    getTargetId: ({ snapshot }) => {
      const task = getLevelOneSeedTask(snapshot);

      if (needsMoreLevelOneSeedsBeforeTurnIn(snapshot)) {
        return snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : MANA_READOUT_TARGET_ID;
      }

      if (task?.canFill) {
        return `task:${task.taskId}`;
      }

      return snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : MANA_READOUT_TARGET_ID;
    },
    getHintText: ({ snapshot }) => {
      const task = getLevelOneSeedTask(snapshot);

      if (needsMoreLevelOneSeedsBeforeTurnIn(snapshot)) {
        return snapshot?.seedSummoning?.canSummon ? 'summon seed' : 'wait for mana';
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
      getCurrentLevel(snapshot) === 0 &&
      !isLevelOneSeedTaskComplete(snapshot) &&
      (hasAnySeedTaskProgress(snapshot) || hasEnoughLevelOneSeedsToTurnIn(snapshot)),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 1 || isLevelOneSeedTaskComplete(snapshot),
  },
  {
    id: 'first-task-complete',
    kind: 'prompt',
    revealTokens: REVEAL_MANA_SUMMON_TASKS,
    text: 'tasks are how the workshop asks for supplies. finish them to restore more of the house.',
    advanceOnClick: true,
    showPointer: false,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 0 &&
      isLevelOneSeedTaskComplete(snapshot) &&
      Boolean(snapshot?.tasks?.level?.completion?.canComplete),
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 1,
  },
  {
    id: 'level-up-one',
    kind: 'objective',
    pageId: 'workshop',
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
    objectiveText: 'level up',
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
      getCurrentLevel(snapshot) === 0 &&
      Boolean(snapshot?.tasks?.level?.completion?.canComplete),
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 1,
  },
  {
    id: 'intro-market',
    kind: 'dialog',
    targetId: 'workshop:summonSeed',
    advanceLabel: 'continue',
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
    text:
      'the front room is cleared out.\n\nfirst, summon sage seeds again. then sell one in market.',
    advanceOnClick: true,
    allowTargetClick: false,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 && !hasLevelTwoSageSellTaskComplete(snapshot),
    isComplete: ({ currentPageId, snapshot }) =>
      getCurrentLevel(snapshot) >= 2 ||
      hasLevelTwoSageSummonTaskComplete(snapshot) ||
      hasLevelTwoSageSellTaskComplete(snapshot) ||
      currentPageId === 'shop',
  },
  {
    id: 'prepare-seed-sale',
    kind: 'objective',
    pageId: 'workshop',
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
    objectiveText: 'summon sage seeds for market',
    getTargetId: ({ snapshot }) => getLevelTwoSummonTargetId(snapshot),
    getHintText: ({ snapshot }) => getLevelTwoSummonHintText(snapshot),
    getProgress: ({ snapshot }) => getLevelTwoSummonProgress(snapshot),
    getProgressLabel: ({ snapshot }) => getLevelTwoSummonProgressLabel(snapshot),
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      !hasLevelTwoSageSellTaskComplete(snapshot) &&
      !isLevelTwoSummonRequirementDone(snapshot),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 2 ||
      hasLevelTwoSageSellTaskComplete(snapshot) ||
      isLevelTwoSummonRequirementDone(snapshot),
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
      !hasLevelTwoSageSellTaskComplete(snapshot) &&
      hasLevelTwoSageSeedReadyToSell(snapshot),
    isComplete: ({ currentPageId, snapshot }) =>
      getCurrentLevel(snapshot) >= 2 ||
      currentPageId === 'shop' ||
      hasLevelTwoSageSellTaskComplete(snapshot) ||
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
      !hasLevelTwoSageSellTaskComplete(snapshot) &&
      hasLevelTwoSageSeedReadyToSell(snapshot),
    isComplete: ({ dom, snapshot }) =>
      getCurrentLevel(snapshot) >= 2 ||
      hasLevelTwoSageSellTaskComplete(snapshot) ||
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
      !hasLevelTwoSageSellTaskComplete(snapshot) &&
      hasLevelTwoSageSeedReadyToSell(snapshot),
    isComplete: ({ dom, snapshot }) =>
      getCurrentLevel(snapshot) >= 2 ||
      hasLevelTwoSageSellTaskComplete(snapshot) ||
      isDirectSellSelected(dom, SAGE_SEED_KEY) ||
      isNpcMarketSelling(snapshot, SAGE_SEED_KEY),
  },
  {
    id: 'show-selected-sale-amount',
    kind: 'objective',
    pageId: 'shop',
    targetId: DIRECT_SELL_AMOUNT_TARGET_ID,
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
    objectiveText: 'this number is the amount selected to sell.',
    allowedPopupClasses: [DIRECT_SELL_POPUP_CLASS],
    cueMode: 'focus-target',
    showPointer: false,
    emphasizeTarget: true,
    autoAdvanceMs: SELECTED_SELL_AMOUNT_AUTO_ADVANCE_MS,
    isAvailable: ({ dom, snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      !hasLevelTwoSageSellTaskComplete(snapshot) &&
      getAvailableSellItemQuantity(snapshot, SAGE_SEED_KEY) > 0 &&
      dom.isShopDirectSellPopupOpen?.() &&
      isDirectSellSelected(dom, SAGE_SEED_KEY),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 2 || hasLevelTwoSageSellTaskComplete(snapshot),
  },
  {
    id: 'earn-tutorial-coin',
    kind: 'objective',
    pageId: null,
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
    getObjectiveText: ({ currentPageId, dom, snapshot }) =>
      getLevelTwoSaleObjectiveText({ currentPageId, dom, snapshot }),
    getTargetId: ({ currentPageId, dom, snapshot }) =>
      getLevelTwoSaleTargetId({ currentPageId, dom, snapshot }),
    getHintText: ({ currentPageId, dom, snapshot }) =>
      getLevelTwoSaleHintText({ currentPageId, dom, snapshot }),
    getAllowedPopupClasses: ({ currentPageId, dom, snapshot }) =>
      getLevelTwoSaleAllowedPopupClasses({ currentPageId, dom, snapshot }),
    getProgress: ({ snapshot }) => getLevelTwoSaleProgress(snapshot),
    getProgressLabel: ({ snapshot }) => getLevelTwoSaleProgressLabel(snapshot),
    getReminderKey: () => 'earn-tutorial-coin-actions',
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 && !hasLevelTwoSageSellTaskComplete(snapshot),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 2 || hasLevelTwoSageSellTaskComplete(snapshot),
  },
  {
    id: 'first-sale-complete',
    kind: 'prompt',
    targetId: 'page:workshop',
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
    text: 'that was coin. coin pays for level-ups. now turn in the remaining sage seeds.',
    advanceLabel: 'continue',
    advanceOnClick: true,
    allowTargetClick: true,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      hasLevelTwoSageSellTaskComplete(snapshot) &&
      !hasLevelTwoSageTurnInTaskComplete(snapshot),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 2 || hasLevelTwoSageTurnInTaskComplete(snapshot),
  },
  {
    id: 'unselect-sage-seed-sale',
    kind: 'objective',
    pageId: 'workshop',
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
    getObjectiveText: ({ snapshot }) =>
      getLevelTwoTurnInAction(snapshot)
        ? 'turn in remaining sage seeds'
        : 'summon sage seeds to turn in',
    getTargetId: ({ currentPageId, dom, snapshot }) =>
      getLevelTwoTurnInTargetId({ currentPageId, dom, snapshot }),
    getHintText: ({ currentPageId, dom, snapshot }) =>
      getLevelTwoTurnInHintText({ currentPageId, dom, snapshot }),
    getProgress: ({ snapshot }) => getTaskProgress(getLevelTwoSageTurnInTask(snapshot)),
    getProgressLabel: ({ snapshot }) =>
      getTaskProgressLabel(getLevelTwoSageTurnInTask(snapshot), 'seeds'),
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      hasLevelTwoSageSellTaskComplete(snapshot) &&
      !hasLevelTwoSageTurnInTaskComplete(snapshot),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 2 || hasLevelTwoSageTurnInTaskComplete(snapshot),
  },
  {
    id: 'level-up-two',
    kind: 'objective',
    revealTokens: REVEAL_LEVEL_ONE_WORKFLOW,
    getObjectiveText: ({ currentPageId, dom, snapshot }) =>
      hasLevelCompletionCoin(snapshot)
        ? 'return to workshop and level up'
        : getLevelUpCoinObjectiveText({
            currentPageId,
            dom,
            snapshot,
            sellItemKeys: LEVEL_TWO_SELL_ITEM_KEYS,
            emptyObjectiveText: 'summon sage seed to sell',
          }),
    getTargetId: ({ currentPageId, dom, snapshot }) => {
      if (!hasLevelCompletionCoin(snapshot)) {
        return getLevelUpCoinTargetId({
          currentPageId,
          dom,
          snapshot,
          sellItemKeys: LEVEL_TWO_SELL_ITEM_KEYS,
          getObtainTargetId: getSeedSellObtainTargetId,
        });
      }

      if (currentPageId !== 'workshop') {
        return 'page:workshop';
      }

      return dom.isTasksExpanded() ? 'workshop:levelUp' : 'workshop:tasks';
    },
    getHintText: ({ currentPageId, dom, snapshot }) => {
      if (!hasLevelCompletionCoin(snapshot)) {
        return getLevelUpCoinHintText({
          currentPageId,
          dom,
          snapshot,
          sellItemKeys: LEVEL_TWO_SELL_ITEM_KEYS,
          getObtainHintText: getSeedSellObtainHintText,
        });
      }

      if (currentPageId !== 'workshop') {
        return 'open workshop';
      }

      return dom.isTasksExpanded() ? 'level up' : getOpenLevelRequirementsText(snapshot);
    },
    getAllowedPopupClasses: ({ currentPageId, dom, snapshot }) => {
      if (hasLevelCompletionCoin(snapshot)) {
        return [];
      }

      return getLevelUpCoinAllowedPopupClasses({
        currentPageId,
        dom,
        snapshot,
        sellItemKeys: LEVEL_TWO_SELL_ITEM_KEYS,
      });
    },
    getProgress: ({ snapshot }) => {
      if (!hasLevelCompletionCoin(snapshot)) {
        const costCoin = getLevelCompletionCostCoin(snapshot);
        return {
          value: Math.min(getCoin(snapshot), costCoin),
          max: costCoin,
        };
      }

      return {
        value: snapshot?.tasks?.level?.completion?.canComplete ? 1 : 0,
        max: 1,
      };
    },
    getProgressLabel: ({ snapshot }) => {
      if (!hasLevelCompletionCoin(snapshot)) {
        const costCoin = getLevelCompletionCostCoin(snapshot);
        return `${formatCoinProgressValue(Math.min(getCoin(snapshot), costCoin))}/${formatCoinProgressValue(costCoin)} coin`;
      }

      return `${snapshot?.tasks?.level?.completion?.canComplete ? 1 : 0}/1 ready`;
    },
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 1 &&
      Boolean(snapshot?.tasks?.level?.completion?.canComplete),
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 2,
  },
  {
    id: 'intro-garden',
    kind: 'dialog',
    targetId: 'page:garden',
    revealTokens: null,
    text: 'level 4. the garden matters now.\n\nseeds can become herbs there.',
    advanceLabel: 'continue',
    advanceOnClick: true,
    allowTargetClick: true,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 3 && hasSageSeedSource(snapshot),
    isComplete: ({ currentPageId, snapshot }) =>
      getCurrentLevel(snapshot) >= 4 ||
      currentPageId === 'garden' ||
      hasGrownEnoughSageForLesson(snapshot) ||
      hasTaskActionForItem(snapshot, SAGE_HERB_KEY),
  },
  {
    id: 'grow-sage',
    kind: 'objective',
    getObjectiveText: ({ currentPageId, dom, snapshot }) => {
      if (shouldIntroduceLevelTwoRequirements({ currentPageId, dom, snapshot })) {
        return getLevelTwoRequirementIntroText(snapshot);
      }

      if (shouldPinLevelTwoRequirements({ currentPageId, dom, snapshot })) {
        return getLevelTwoRequirementPinText(snapshot);
      }

      if (shouldSummonForLevelTwoRequirements({ currentPageId, dom, snapshot })) {
        return 'summon seed';
      }

      const seedSourceText = getGrowSageSeedSourceText({ currentPageId, snapshot });

      if (seedSourceText) {
        return seedSourceText;
      }

      if (isGrowSageWaitState(snapshot)) {
        return 'wait for sage to grow';
      }

      const gardenActionText = getGrowSageGardenActionText({ currentPageId, dom, snapshot });

      if (gardenActionText) {
        return gardenActionText;
      }

      const growTarget = getLessonSageGrowTarget(snapshot);

      return getLessonSageGrowCount(snapshot) <= 0
        ? getLevelTwoRequirementIntroText(snapshot)
        : `keep going. grow sage ${growTarget} ${growTarget === 1 ? 'time' : 'times'}.`;
    },
    cueMode: 'delayed-target',
    getTargetId: ({ currentPageId, dom, snapshot }) => {
      if (shouldIntroduceLevelTwoRequirements({ currentPageId, dom, snapshot })) {
        return 'workshop:tasks';
      }

      if (shouldPinLevelTwoRequirements({ currentPageId, dom, snapshot })) {
        return WORKSHOP_TASKS_PIN_TARGET_ID;
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

      if (tile.phase === 'empty' && !hasTileSelectedSeed(tile)) {
        return `garden:plot:${tile.tileNumber}`;
      }

      return `garden:plot:${tile.tileNumber}:label`;
    },
    getHintText: ({ currentPageId, dom, snapshot }) => {
      if (shouldIntroduceLevelTwoRequirements({ currentPageId, dom, snapshot })) {
        return getOpenLevelRequirementsText(snapshot);
      }

      if (shouldPinLevelTwoRequirements({ currentPageId, dom, snapshot })) {
        return 'pin';
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
        : 'tap empty plot';
    },
    getProgress: ({ snapshot }) => ({
      value: getLessonSageGrowCount(snapshot),
      max: getLessonSageGrowTarget(snapshot),
    }),
    getProgressLabel: ({ snapshot }) =>
      `${getLessonSageGrowCount(snapshot)}/${getLessonSageGrowTarget(snapshot)} sage`,
    getReminderKey: () => 'lesson-three-sage-actions',
    getReminderMs: () => TUTORIAL_LESSON_THREE_STUCK_MS,
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) === 3,
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 4 ||
      hasGrownEnoughSageForLesson(snapshot) ||
      hasTaskActionForItem(snapshot, SAGE_HERB_KEY),
  },
  {
    id: 'first-harvest-complete',
    kind: 'prompt',
    text: 'seed became sage. when tasks ask for herbs, grow them here first.',
    advanceOnClick: true,
    showPointer: false,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 3 &&
      !hasCompletedTaskForItem(snapshot, SAGE_HERB_KEY) &&
      (hasTaskActionForItem(snapshot, SAGE_HERB_KEY) ||
        getItemQuantity(snapshot, SAGE_HERB_KEY) > 0 ||
        hasTaskProgressForItem(snapshot, SAGE_HERB_KEY)),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 4 || hasCompletedTaskForItem(snapshot, SAGE_HERB_KEY),
  },
  {
    id: 'fill-sage-herb-task',
    kind: 'objective',
    cueMode: 'delayed-target',
    objectiveText: 'turn in sage for the next level.',
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
      getCurrentLevel(snapshot) === 3 &&
      (getItemQuantity(snapshot, SAGE_HERB_KEY) > 0 ||
        hasTaskProgressForItem(snapshot, SAGE_HERB_KEY)) &&
      isWaitingForCrop(snapshot, SAGE_SEED_KEY) &&
      !hasTaskActionForItem(snapshot, SAGE_HERB_KEY),
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 3 &&
      (hasTaskActionForItem(snapshot, SAGE_HERB_KEY) ||
        getItemQuantity(snapshot, SAGE_HERB_KEY) > 0 ||
        hasTaskProgressForItem(snapshot, SAGE_HERB_KEY)),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 4 || hasCompletedTaskForItem(snapshot, SAGE_HERB_KEY),
  },
  {
    id: 'intro-research',
    kind: 'dialog',
    targetId: 'page:research',
    text:
      'Elara found notes from the old owner.\n\nyou can study them to learn what this place can make.',
    advanceLabel: 'continue',
    advanceOnClick: true,
    allowTargetClick: true,
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) === 2,
    isComplete: ({ currentPageId, snapshot }) =>
      getCurrentLevel(snapshot) >= 3 ||
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
    isAvailable: ({ snapshot }) => getCurrentLevel(snapshot) >= 2,
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 3 ||
      hasCompletedResearch(snapshot, MINT_SEED_RESEARCH_ID) ||
      hasTaskActionForItem(snapshot, MINT_SEED_KEY),
  },
  {
    id: 'first-research-complete',
    kind: 'prompt',
    text: 'research unlocks new things the workshop can make. mint seed is available now.',
    advanceOnClick: true,
    showPointer: false,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 2 &&
      hasCompletedResearch(snapshot, MINT_SEED_RESEARCH_ID) &&
      !hasCompletedTaskForItem(snapshot, MINT_SEED_KEY),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 3 || hasCompletedTaskForItem(snapshot, MINT_SEED_KEY),
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
      getCurrentLevel(snapshot) === 2 &&
      (hasCompletedResearch(snapshot, MINT_SEED_RESEARCH_ID) ||
        hasTaskActionForItem(snapshot, MINT_SEED_KEY) ||
        hasTaskProgressForItem(snapshot, MINT_SEED_KEY)) &&
      Boolean(getCurrentTaskForItem(snapshot, MINT_SEED_KEY)) &&
      !hasCompletedTaskForItem(snapshot, MINT_SEED_KEY),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 3 || hasCompletedTaskForItem(snapshot, MINT_SEED_KEY),
  },
  {
    id: 'fill-sage-seed-task',
    kind: 'objective',
    cueMode: 'passive',
    objectiveText: 'turn in sage seed too',
    getTargetId: ({ currentPageId, dom, snapshot }) =>
      getSeedTaskTargetId({ currentPageId, dom, snapshot, itemKey: SAGE_SEED_KEY }),
    getHintText: ({ currentPageId, dom, snapshot }) =>
      getSeedTaskHintText({ currentPageId, dom, snapshot, itemKey: SAGE_SEED_KEY }),
    getProgress: ({ snapshot }) => getTaskProgress(getCurrentTaskForItem(snapshot, SAGE_SEED_KEY)),
    getProgressLabel: ({ snapshot }) =>
      getTaskProgressLabel(getCurrentTaskForItem(snapshot, SAGE_SEED_KEY), 'sage seeds'),
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 2 &&
      Boolean(getCurrentTaskForItem(snapshot, SAGE_SEED_KEY)) &&
      !hasCompletedTaskForItem(snapshot, SAGE_SEED_KEY),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 3 || hasCompletedTaskForItem(snapshot, SAGE_SEED_KEY),
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
      hasLevelCompletionCoin(snapshot)
        ? 'level up again'
        : getLevelUpCoinObjectiveText({
            currentPageId,
            dom,
            snapshot,
            sellItemKeys: LEVEL_THREE_SELL_ITEM_KEYS,
            emptyObjectiveText: 'get mint to sell',
          }),
    getTargetId: ({ currentPageId, dom, snapshot }) => {
      if (!hasLevelCompletionCoin(snapshot)) {
        return getLevelUpCoinTargetId({
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
      if (!hasLevelCompletionCoin(snapshot)) {
        return getLevelUpCoinHintText({
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
      if (hasLevelCompletionCoin(snapshot)) {
        return [];
      }

      return getLevelUpCoinAllowedPopupClasses({
        currentPageId,
        dom,
        snapshot,
        sellItemKeys: LEVEL_THREE_SELL_ITEM_KEYS,
      });
    },
    getProgress: ({ snapshot }) => {
      if (!hasLevelCompletionCoin(snapshot)) {
        const costCoin = getLevelCompletionCostCoin(snapshot);
        return {
          value: Math.min(getCoin(snapshot), costCoin),
          max: costCoin,
        };
      }

      return {
        value: snapshot?.tasks?.level?.completion?.canComplete ? 1 : 0,
        max: 1,
      };
    },
    getProgressLabel: ({ snapshot }) => {
      if (!hasLevelCompletionCoin(snapshot)) {
        const costCoin = getLevelCompletionCostCoin(snapshot);
        return `${formatCoinProgressValue(Math.min(getCoin(snapshot), costCoin))}/${formatCoinProgressValue(costCoin)} coin`;
      }

      return `${snapshot?.tasks?.level?.completion?.canComplete ? 1 : 0}/1 ready`;
    },
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 2 &&
      Boolean(snapshot?.tasks?.level?.completion?.canComplete),
    isComplete: ({ snapshot }) => getCurrentLevel(snapshot) >= 3,
  },
  {
    id: 'level-up-four',
    kind: 'objective',
    cueMode: 'passive',
    getObjectiveText: ({ currentPageId, dom, snapshot }) =>
      hasLevelCompletionCoin(snapshot)
        ? 'level up again'
        : getLevelUpCoinObjectiveText({
            currentPageId,
            dom,
            snapshot,
            sellItemKeys: LEVEL_FOUR_SELL_ITEM_KEYS,
            emptyObjectiveText: 'get herbs to sell',
          }),
    getTargetId: ({ currentPageId, dom, snapshot }) => {
      if (!hasLevelCompletionCoin(snapshot)) {
        return getLevelUpCoinTargetId({
          currentPageId,
          dom,
          snapshot,
          sellItemKeys: LEVEL_FOUR_SELL_ITEM_KEYS,
          getObtainTargetId: getMintObtainTargetId,
        });
      }

      if (currentPageId !== 'workshop') {
        return 'page:workshop';
      }

      return dom.isTasksExpanded() ? 'workshop:levelUp' : 'workshop:tasks';
    },
    getHintText: ({ currentPageId, dom, snapshot }) => {
      if (!hasLevelCompletionCoin(snapshot)) {
        return getLevelUpCoinHintText({
          currentPageId,
          dom,
          snapshot,
          sellItemKeys: LEVEL_FOUR_SELL_ITEM_KEYS,
          getObtainHintText: getMintObtainHintText,
        });
      }

      if (currentPageId !== 'workshop') {
        return 'open workshop';
      }

      return dom.isTasksExpanded() ? 'level up' : getOpenLevelRequirementsText(snapshot);
    },
    getAllowedPopupClasses: ({ currentPageId, dom, snapshot }) => {
      if (hasLevelCompletionCoin(snapshot)) {
        return [];
      }

      return getLevelUpCoinAllowedPopupClasses({
        currentPageId,
        dom,
        snapshot,
        sellItemKeys: LEVEL_FOUR_SELL_ITEM_KEYS,
      });
    },
    getProgress: ({ snapshot }) => {
      if (!hasLevelCompletionCoin(snapshot)) {
        const costCoin = getLevelCompletionCostCoin(snapshot);
        return {
          value: Math.min(getCoin(snapshot), costCoin),
          max: costCoin,
        };
      }

      return {
        value: snapshot?.tasks?.level?.completion?.canComplete ? 1 : 0,
        max: 1,
      };
    },
    getProgressLabel: ({ snapshot }) => {
      if (!hasLevelCompletionCoin(snapshot)) {
        const costCoin = getLevelCompletionCostCoin(snapshot);
        return `${formatCoinProgressValue(Math.min(getCoin(snapshot), costCoin))}/${formatCoinProgressValue(costCoin)} coin`;
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
    advanceLabel: 'continue',
    advanceOnClick: true,
    allowTargetClick: true,
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
    id: 'first-brew-complete',
    kind: 'prompt',
    text:
      'first potion brewed. brewing uses herbs in order, so the cauldron setup matters.',
    advanceOnClick: true,
    showPointer: false,
    isAvailable: ({ snapshot }) =>
      getCurrentLevel(snapshot) === 4 &&
      hasBrewedManaTonic(snapshot) &&
      !hasCompletedTaskForItem(snapshot, MANA_TONIC_KEY) &&
      !isActiveManaTonicBrew(snapshot),
    isComplete: ({ snapshot }) =>
      getCurrentLevel(snapshot) >= 5 ||
      hasCompletedTaskForItem(snapshot, MANA_TONIC_KEY) ||
      isActiveManaTonicBrew(snapshot),
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
];

const TUTORIAL_STEP_BY_ID = new Map(TUTORIAL_STEPS.map((step) => [step.id, step]));

export function resolveTutorialStepId(value) {
  const rawValue = String(value ?? '').trim();

  if (!rawValue) {
    return null;
  }

  if (TUTORIAL_STEP_BY_ID.has(rawValue)) {
    return rawValue;
  }

  const lowerValue = rawValue.toLowerCase();
  const codeMatch = lowerValue.match(/^t(?:utorial)?[-_ ]?(\d+)$/);
  const numericValue = Number(lowerValue);
  const rawIndex = codeMatch
    ? Number(codeMatch[1])
    : Number.isInteger(numericValue)
      ? numericValue
      : null;

  if (Number.isInteger(rawIndex)) {
    const index = rawIndex <= 0 ? rawIndex : rawIndex - 1;
    return TUTORIAL_STEP_IDS[index] ?? null;
  }

  const normalizedValue = lowerValue.replace(/[^a-z0-9]/g, '');
  return (
    TUTORIAL_STEP_IDS.find(
      (stepId) => stepId.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedValue,
    ) ?? null
  );
}

export function getTutorialStepGraph() {
  const total = TUTORIAL_STEP_IDS.length;
  const steps = TUTORIAL_STEP_IDS.map((stepId, index) => {
    const step = TUTORIAL_STEP_BY_ID.get(stepId) ?? { id: stepId };
    const group = TUTORIAL_STEP_GROUP_BY_STEP_ID.get(stepId) ?? null;
    const nextId = TUTORIAL_STEP_IDS[index + 1] ?? null;
    const previousId = TUTORIAL_STEP_IDS[index - 1] ?? null;

    return {
      id: stepId,
      code: getTutorialStepCode(index),
      index: index + 1,
      total,
      kind: step.kind ?? 'objective',
      groupId: group?.id ?? null,
      groupLabel: group?.label ?? '',
      lessonTitle: getLessonTitle(step),
      pageId: typeof step.pageId === 'string' ? step.pageId : null,
      targetId: typeof step.targetId === 'string' ? step.targetId : null,
      cueMode: step.cueMode ?? null,
      autoAdvanceMs: Number.isFinite(step.autoAdvanceMs) ? step.autoAdvanceMs : null,
      targetCueDelayMs: getTargetCueDelayMs(step),
      previousId,
      nextId,
      note: TUTORIAL_STEP_NOTES.get(stepId) ?? '',
      cheat: `cheats.loadTutorialStep("${stepId}")`,
    };
  });
  const edges = steps
    .filter((step) => step.nextId)
    .map((step) => ({
      from: step.id,
      to: step.nextId,
      label: 'next',
    }));

  return {
    ok: true,
    total,
    aliases: ['reset', 'start', 'complete', 'done'],
    sections: TUTORIAL_STEP_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      stepIds: [...group.stepIds],
    })),
    steps,
    edges,
    mermaid: createTutorialStepMermaid(steps, edges),
  };
}

function getTutorialStepCode(index) {
  return `t${String(index + 1).padStart(2, '0')}`;
}

function createTutorialStepMermaid(steps, edges) {
  const lines = ['flowchart TD'];

  for (const step of steps) {
    lines.push(`  ${getMermaidNodeId(step.id)}["${escapeMermaidLabel(
      `${step.index}. ${step.id}<br/>${step.lessonTitle}`,
    )}"]`);
  }

  for (const edge of edges) {
    lines.push(`  ${getMermaidNodeId(edge.from)} --> ${getMermaidNodeId(edge.to)}`);
  }

  return lines.join('\n');
}

function getMermaidNodeId(stepId) {
  return `S${String(TUTORIAL_STEP_IDS.indexOf(stepId) + 1).padStart(2, '0')}`;
}

function escapeMermaidLabel(label) {
  return String(label ?? '').replace(/"/g, '#quot;');
}

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

    if (currentLevel >= 5) {
      this.completeSteps(TUTORIAL_STEP_IDS);
      return;
    }

    if (currentLevel >= 4) {
      this.completeSteps([
        ...LEVEL_ONE_STEP_IDS,
        ...LEVEL_TWO_STEP_IDS,
        ...LEVEL_THREE_STEP_IDS,
        ...LEVEL_FOUR_STEP_IDS,
      ]);
    } else if (currentLevel >= 3) {
      this.completeSteps([...LEVEL_ONE_STEP_IDS, ...LEVEL_TWO_STEP_IDS, ...LEVEL_THREE_STEP_IDS]);
    } else if (currentLevel >= 2) {
      this.completeSteps([...LEVEL_ONE_STEP_IDS, ...LEVEL_TWO_STEP_IDS]);
    } else if (currentLevel >= 1) {
      this.completeSteps(LEVEL_ONE_STEP_IDS);
    }

    if (this.progressManager.hasCompleted('finish-first-task')) {
      this.completeSteps(SEEDING_LESSON_STEP_IDS);
    }

    if (hasAnySeedQuantity(snapshot) || hasAnySeedTaskProgress(snapshot)) {
      this.completeSteps(['first-summon-seed']);
    }

    if (hasEnoughLevelOneSeedsToTurnIn(snapshot)) {
      this.completeSteps(['summon-five-seeds']);
    }

    if (hasAnySeedTaskProgress(snapshot)) {
      this.completeSteps(['summon-five-seeds', 'intro-level-requirements', 'first-fill-seed-task']);
    }

    if (isLevelOneSeedTaskComplete(snapshot)) {
      this.completeSteps(SEEDING_LESSON_STEP_IDS);
    }

    if (
      currentLevel === 1 &&
      (isLevelTwoSummonRequirementDone(snapshot) ||
        hasLevelTwoSageSellTaskComplete(snapshot) ||
        hasLevelCompletionCoin(snapshot))
    ) {
      this.completeSteps(['prepare-seed-sale']);
    }

    if (isNpcMarketSelling(snapshot, SAGE_SEED_KEY) || hasLevelTwoSageSellTaskComplete(snapshot)) {
      this.completeSteps([
        'open-market',
        'select-market-stand',
        'select-sage-seed-sale',
        'show-selected-sale-amount',
      ]);
    }

    if (currentLevel === 1 && hasLevelTwoSageSellTaskComplete(snapshot)) {
      this.completeSteps(['earn-tutorial-coin']);
    }

    if (currentLevel === 1 && hasLevelTwoSageTurnInTaskComplete(snapshot)) {
      this.completeSteps(['first-sale-complete', 'unselect-sage-seed-sale']);
    }

    if (
      currentLevel >= 3 &&
      (hasGrownEnoughSageForLesson(snapshot) || hasTaskActionForItem(snapshot, SAGE_HERB_KEY))
    ) {
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
        highlightTargetIds: getHighlightTargetIds(step, context),
        allowedPopupClasses: [],
        allowTargetClick: step.allowTargetClick === true,
        cueMode: getCueMode(step, context),
        emphasizeTarget: step.emphasizeTarget === true,
        autoPageId: getAutoPageId(step, context),
        advanceLabel: getAdvanceLabel(step, context),
        advancePageId: getAdvancePageId(step, context),
        autoAdvanceMs: getAutoAdvanceMs(step, context),
        targetCueDelayMs: getTargetCueDelayMs(step, context),
        variant: getVariant(step, context),
        advanceAction: step.advanceAction,
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
      emphasizeTarget: step.emphasizeTarget === true,
      reminderKey: step.getReminderKey?.({ ...context, targetId, text, hintText }) ?? null,
      reminderMs: getReminderMs(step, { ...context, targetId, text, hintText }),
      revealTokens: getRevealTokens(step),
      highlightTargetIds: getHighlightTargetIds(step, { ...context, targetId, text, hintText }),
      allowedPopupClasses: getAllowedPopupClasses(step, { ...context, targetId, text, hintText }),
      cueMode: getCueMode(step, { ...context, targetId, text, hintText }),
      autoPageId: getAutoPageId(step, { ...context, targetId, text, hintText }),
      advanceLabel: getAdvanceLabel(step, { ...context, targetId, text, hintText }),
      advancePageId: getAdvancePageId(step, { ...context, targetId, text, hintText }),
      autoAdvanceMs: getAutoAdvanceMs(step, { ...context, targetId, text, hintText }),
      targetCueDelayMs: getTargetCueDelayMs(step, { ...context, targetId, text, hintText }),
      variant: getVariant(step, { ...context, targetId, text, hintText }),
      advanceAction: step.advanceAction,
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

function getHighlightTargetIds(step, context) {
  const targetIds = step?.getHighlightTargetIds?.(context) ?? step?.highlightTargetIds ?? [];

  if (!Array.isArray(targetIds)) {
    return [];
  }

  return targetIds.filter((targetId) => typeof targetId === 'string' && targetId.length > 0);
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

function getAutoAdvanceMs(step, context) {
  const durationMs = step?.getAutoAdvanceMs?.(context) ?? step?.autoAdvanceMs ?? null;
  return Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : null;
}

function getTargetCueDelayMs(step, context) {
  const delayMs = step?.getTargetCueDelayMs?.(context) ?? step?.targetCueDelayMs ?? null;
  return Number.isFinite(delayMs) && delayMs > 0 ? delayMs : null;
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

function getCoin(snapshot) {
  const coin = Number(snapshot?.coin?.current);
  return Number.isFinite(coin) ? Math.max(0, coin) : 0;
}

function getLevelCompletionCostCoin(snapshot) {
  return Math.max(0, Math.floor(Number(snapshot?.tasks?.level?.completion?.costCoin) || 0));
}

function formatCoinProgressValue(value) {
  const coin = Number(value);

  if (!Number.isFinite(coin)) {
    return '0';
  }

  const clampedCoin = Math.max(0, coin);
  return Number.isInteger(clampedCoin)
    ? String(clampedCoin)
    : clampedCoin.toFixed(1).replace(/\.0$/, '');
}

function hasLevelCompletionCoin(snapshot) {
  return getCoin(snapshot) >= getLevelCompletionCostCoin(snapshot);
}

function getLevelTwoSaleObjectiveText({ currentPageId, dom, snapshot }) {
  const state = getLevelUpCoinMarketState({
    currentPageId,
    dom,
    snapshot,
    sellItemKeys: LEVEL_TWO_SELL_ITEM_KEYS,
  });

  if (state.kind === 'obtain-item') {
    return 'summon sage seed to sell';
  }

  if (state.kind === 'choose-item') {
    return 'choose sage seed to sell';
  }

  if (state.kind === 'select-kind') {
    return `open ${getDirectSellKindLabel(state.itemKind)} tab`;
  }

  if (state.kind === 'set-amount') {
    return 'press sell';
  }

  return 'sell one sage seed in market';
}

function getLevelTwoSaleTargetId({ currentPageId, dom, snapshot }) {
  const state = getLevelUpCoinMarketState({
    currentPageId,
    dom,
    snapshot,
    sellItemKeys: LEVEL_TWO_SELL_ITEM_KEYS,
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
    return DIRECT_SELL_CONFIRM_TARGET_ID;
  }

  if (state.kind !== 'obtain-item') {
    return null;
  }

  return getSeedSellObtainTargetId({ currentPageId, dom, snapshot });
}

function getLevelTwoSaleHintText({ currentPageId, dom, snapshot }) {
  const state = getLevelUpCoinMarketState({
    currentPageId,
    dom,
    snapshot,
    sellItemKeys: LEVEL_TWO_SELL_ITEM_KEYS,
  });

  if (state.kind === 'open-market') {
    return 'open market';
  }

  if (state.kind === 'open-fast-sell') {
    return 'fast sell';
  }

  if (state.kind === 'choose-item') {
    return 'choose sage seed';
  }

  if (state.kind === 'select-kind') {
    return getDirectSellKindLabel(state.itemKind);
  }

  if (state.kind === 'set-amount') {
    return 'press sell';
  }

  if (state.kind !== 'obtain-item') {
    return '';
  }

  return getSeedSellObtainHintText({ currentPageId, dom, snapshot });
}

function getLevelTwoSaleAllowedPopupClasses({ currentPageId, dom, snapshot }) {
  const state = getLevelUpCoinMarketState({
    currentPageId,
    dom,
    snapshot,
    sellItemKeys: LEVEL_TWO_SELL_ITEM_KEYS,
  });

  if (state.kind === 'set-amount') {
    return [DIRECT_SELL_POPUP_CLASS];
  }

  return [];
}

function getLevelTwoSaleProgress(snapshot) {
  const task = getLevelTwoSageSellTask(snapshot);

  if (task) {
    return getTaskProgress(task);
  }

  return {
    value: hasLevelCompletionCoin(snapshot) ? 1 : 0,
    max: 1,
  };
}

function getLevelTwoSaleProgressLabel(snapshot) {
  const task = getLevelTwoSageSellTask(snapshot);

  if (task) {
    return getTaskProgressLabel(task, 'sale');
  }

  return `${hasLevelCompletionCoin(snapshot) ? 1 : 0}/1 sale`;
}

function getLevelTwoSummonTargetId(snapshot) {
  return snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : MANA_READOUT_TARGET_ID;
}

function getLevelTwoSummonHintText(snapshot) {
  return snapshot?.seedSummoning?.canSummon ? 'summon seed' : 'wait for mana';
}

function getLevelTwoSummonProgress(snapshot) {
  const task = getLevelTwoSageSummonTask(snapshot);

  if (task) {
    return getTaskProgress(task);
  }

  return {
    value: Math.min(1, getAvailableSellItemQuantity(snapshot, SAGE_SEED_KEY)),
    max: 1,
  };
}

function getLevelTwoSummonProgressLabel(snapshot) {
  const task = getLevelTwoSageSummonTask(snapshot);

  if (task) {
    return getTaskProgressLabel(task, 'seeds');
  }

  return `${Math.min(1, getAvailableSellItemQuantity(snapshot, SAGE_SEED_KEY))}/1 seed`;
}

function isLevelTwoSummonRequirementDone(snapshot) {
  const task = getLevelTwoSageSummonTask(snapshot);

  if (task) {
    return Boolean(task.completed);
  }

  return getAvailableSellItemQuantity(snapshot, SAGE_SEED_KEY) > 0;
}

function hasLevelTwoSageSeedReadyToSell(snapshot) {
  return getAvailableSellItemQuantity(snapshot, SAGE_SEED_KEY) > 0;
}

function getLevelTwoTurnInAction(snapshot) {
  return getTaskAction(snapshot, getLevelTwoSageTurnInTask(snapshot));
}

function getLevelTwoTurnInTargetId({ currentPageId, dom, snapshot }) {
  const task = getLevelTwoSageTurnInTask(snapshot);
  const taskAction = getTaskAction(snapshot, task);

  if (taskAction) {
    return getTaskActionTargetId({ currentPageId, dom, task });
  }

  if (currentPageId !== 'workshop') {
    return 'page:workshop';
  }

  if (!dom?.isTasksExpanded?.()) {
    return 'workshop:tasks';
  }

  if (getOwnedQuantityForTask(snapshot, task) <= 0 && getTaskRemainingQuantity(task) > 0) {
    return getLevelTwoSummonTargetId(snapshot);
  }

  return task?.taskId ? `task:${task.taskId}` : null;
}

function getLevelTwoTurnInHintText({ currentPageId, dom, snapshot }) {
  const task = getLevelTwoSageTurnInTask(snapshot);
  const taskAction = getTaskAction(snapshot, task);

  if (taskAction) {
    return getTaskActionHintText({
      currentPageId,
      dom,
      snapshot,
      taskAction,
      fillText: 'turn in sage seeds',
    });
  }

  if (currentPageId !== 'workshop') {
    return 'open workshop';
  }

  if (!dom?.isTasksExpanded?.()) {
    return getOpenLevelRequirementsText(snapshot);
  }

  if (getOwnedQuantityForTask(snapshot, task) <= 0 && getTaskRemainingQuantity(task) > 0) {
    return getLevelTwoSummonHintText(snapshot);
  }

  return 'turn in sage seeds';
}

function getLevelUpCoinObjectiveText({
  currentPageId,
  dom,
  snapshot,
  sellItemKeys,
  emptyObjectiveText,
}) {
  const state = getLevelUpCoinMarketState({
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

  return 'earn level-up coin in market';
}

function getLevelUpCoinTargetId({
  currentPageId,
  dom,
  snapshot,
  sellItemKeys,
  getObtainTargetId,
}) {
  const state = getLevelUpCoinMarketState({
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

function getLevelUpCoinHintText({
  currentPageId,
  dom,
  snapshot,
  sellItemKeys,
  getObtainHintText,
}) {
  const state = getLevelUpCoinMarketState({
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

function getLevelUpCoinAllowedPopupClasses({
  currentPageId,
  dom,
  snapshot,
  sellItemKeys,
}) {
  const state = getLevelUpCoinMarketState({
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

function getLevelUpCoinMarketState({
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
        !doesSelectedSellQuantityCoverCoinShortfall({
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

function doesSelectedSellQuantityCoverCoinShortfall({ snapshot, itemKey, quantity }) {
  const unitCoin = getDirectSellUnitCoin(snapshot, itemKey);

  if (!Number.isFinite(unitCoin) || unitCoin <= 0) {
    return quantity > 1;
  }

  return unitCoin * quantity >= getLevelCompletionCostCoin(snapshot) - getCoin(snapshot);
}

function getDirectSellUnitCoin(snapshot, itemKey) {
  const item = snapshot?.shop?.shelf?.sellItems?.find(
    (sellItem) => sellItem?.key === itemKey,
  );
  const fastSellCoin = Number(item?.fastSellCoin);

  if (Number.isFinite(fastSellCoin) && fastSellCoin > 0) {
    return fastSellCoin;
  }

  const sellCoin = Number(item?.sellCoin);
  return Number.isFinite(sellCoin) && sellCoin > 0 ? sellCoin : null;
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
  return getTaskAction(snapshot, getCurrentTaskForItem(snapshot, itemKey));
}

function getTaskAction(snapshot, task) {
  if (!task || task.completed) {
    return null;
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
  fillText = TURN_IN_TEXT,
}) {
  if (currentPageId !== 'workshop') {
    return 'open workshop';
  }

  if (!dom?.isTasksExpanded?.()) {
    return getOpenLevelRequirementsText(snapshot);
  }

  return fillText;
}

function canFillTaskWithOwnedItem(snapshot, task) {
  if (!task || task.completed) {
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

function getSeedSellObtainTargetId({ currentPageId, snapshot }) {
  if (currentPageId !== 'workshop') {
    return 'page:workshop';
  }

  return snapshot?.seedSummoning?.canSummon ? 'workshop:summonSeed' : MANA_READOUT_TARGET_ID;
}

function getSeedSellObtainHintText({ currentPageId, snapshot }) {
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

  if (tile.phase === 'empty' && !hasTileSelectedSeed(tile)) {
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
  const tasks = getCurrentTasks(snapshot).filter((task) => task.itemKey === itemKey);

  return (
    tasks.find((task) => !task.completed && isTurnInTask(task)) ??
    tasks.find((task) => !task.completed) ??
    tasks.find((task) => isTurnInTask(task)) ??
    tasks[0] ??
    null
  );
}

function getCurrentTaskForItemByType(snapshot, itemKey, type) {
  const tasks = getCurrentTasks(snapshot).filter((task) => task.itemKey === itemKey);

  if (type === 'turnIn') {
    return tasks.find((task) => isTurnInTask(task)) ?? null;
  }

  return tasks.find((task) => getTaskType(task) === type) ?? null;
}

function getLevelTwoSageSummonTask(snapshot) {
  return getCurrentTaskForItemByType(snapshot, SAGE_SEED_KEY, LEVEL_TWO_SUMMON_TYPE);
}

function getLevelTwoSageSellTask(snapshot) {
  return getCurrentTaskForItemByType(snapshot, SAGE_SEED_KEY, LEVEL_TWO_SELL_TYPE);
}

function getLevelTwoSageTurnInTask(snapshot) {
  return (
    getCurrentTaskForItemByType(snapshot, SAGE_SEED_KEY, 'turnIn') ??
    getCurrentTaskForItem(snapshot, SAGE_SEED_KEY)
  );
}

function hasLevelTwoSageSummonTaskComplete(snapshot) {
  return Boolean(getLevelTwoSageSummonTask(snapshot)?.completed);
}

function hasLevelTwoSageSellTaskComplete(snapshot) {
  return Boolean(getLevelTwoSageSellTask(snapshot)?.completed);
}

function hasLevelTwoSageTurnInTaskComplete(snapshot) {
  return Boolean(getLevelTwoSageTurnInTask(snapshot)?.completed);
}

function getLevelOneSeedTask(snapshot) {
  const tasks = getCurrentTasks(snapshot);

  return (
    LEVEL_ONE_SEED_TASK_IDS.map((taskId) =>
      tasks.find((task) => task.taskId === taskId),
    ).find(Boolean) ??
    tasks.find((task) => task.itemKey === SAGE_SEED_KEY && isTurnInTask(task)) ??
    null
  );
}

function isLevelOneSeedTaskComplete(snapshot) {
  const task = getLevelOneSeedTask(snapshot);
  return Boolean(task?.completed);
}

function needsMoreLevelOneSeedsBeforeTurnIn(snapshot) {
  const task = getLevelOneSeedTask(snapshot);

  if (!task || task.completed) {
    return false;
  }

  const progressQuantity = Math.max(0, Math.floor(Number(task.progressQuantity) || 0));
  const requiredQuantity = Math.max(1, Math.floor(Number(task.requiredQuantity) || 1));
  const ownedQuantity = getOwnedQuantityForTask(snapshot, task);

  return progressQuantity + ownedQuantity < requiredQuantity;
}

function hasEnoughLevelOneSeedsToTurnIn(snapshot) {
  const task = getLevelOneSeedTask(snapshot);

  if (!task) {
    return false;
  }

  const progressQuantity = Math.max(0, Math.floor(Number(task.progressQuantity) || 0));
  const requiredQuantity = Math.max(1, Math.floor(Number(task.requiredQuantity) || 1));
  const ownedQuantity = getOwnedQuantityForTask(snapshot, task);

  return progressQuantity + ownedQuantity >= requiredQuantity;
}

function getLevelOneSeedReadyProgress(snapshot) {
  const task = getLevelOneSeedTask(snapshot);
  const max = Math.max(1, Math.floor(Number(task?.requiredQuantity) || 5));
  const progressQuantity = Math.max(0, Math.floor(Number(task?.progressQuantity) || 0));
  const ownedQuantity = task
    ? getOwnedQuantityForTask(snapshot, task)
    : getItemQuantity(snapshot, SAGE_SEED_KEY);
  const value = Math.min(max, progressQuantity + ownedQuantity);

  return { value, max };
}

function getLevelOneSeedReadyProgressLabel(snapshot) {
  const progress = getLevelOneSeedReadyProgress(snapshot);
  return `${progress.value}/${progress.max} seeds`;
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
  const tasks = getCurrentTasks(snapshot).filter((task) => task.itemKey === itemKey);
  const turnInTasks = tasks.filter((task) => isTurnInTask(task));
  const completionTasks = turnInTasks.length > 0 ? turnInTasks : tasks;

  return completionTasks.some((task) => task.completed);
}

function isTurnInTask(task) {
  const type = getTaskType(task);
  return !type || type === 'turnIn' || type === 'drop';
}

function getTaskType(task) {
  return task?.type ?? task?.action ?? null;
}

function shouldIntroduceLevelTwoRequirements({ currentPageId, dom, snapshot }) {
  return (
    getCurrentLevel(snapshot) === 3 &&
    currentPageId === 'workshop' &&
    getLessonSageGrowCount(snapshot) <= 0 &&
    hasLevelTwoSageRequirements(snapshot) &&
    !dom?.isTasksExpanded?.()
  );
}

function shouldPinLevelTwoRequirements({ currentPageId, dom, snapshot }) {
  return (
    getCurrentLevel(snapshot) === 3 &&
    currentPageId === 'workshop' &&
    getLessonSageGrowCount(snapshot) <= 0 &&
    hasLevelTwoSageRequirements(snapshot) &&
    Boolean(dom?.isTasksExpanded?.()) &&
    !dom?.isTasksPinned?.()
  );
}

function shouldSummonForLevelTwoRequirements({ currentPageId, dom, snapshot }) {
  return (
    getCurrentLevel(snapshot) === 3 &&
    currentPageId === 'workshop' &&
    getLessonSageGrowCount(snapshot) <= 0 &&
    hasLevelTwoSageRequirements(snapshot) &&
    Boolean(dom?.isTasksExpanded?.()) &&
    Boolean(dom?.isTasksPinned?.()) &&
    getItemQuantity(snapshot, SAGE_SEED_KEY) <= 0 &&
    !hasActiveCrop(snapshot, SAGE_SEED_KEY)
  );
}

function hasLevelTwoSageRequirements(snapshot) {
  return Boolean(
    getCurrentTaskForItem(snapshot, SAGE_HERB_KEY) &&
      getCurrentTaskForItem(snapshot, SAGE_SEED_KEY),
  );
}

function getGrowSageSeedSourceText({ currentPageId, snapshot }) {
  if (
    getItemQuantity(snapshot, SAGE_SEED_KEY) > 0 ||
    hasGrownEnoughSageForLesson(snapshot) ||
    hasActiveCrop(snapshot, SAGE_SEED_KEY)
  ) {
    return null;
  }

  if (currentPageId !== 'workshop') {
    return 'open workshop and summon a sage seed.';
  }

  return snapshot?.seedSummoning?.canSummon
    ? 'summon a sage seed.'
    : 'wait for mana, then summon a sage seed.';
}

function getGrowSageGardenActionText({ currentPageId, dom, snapshot }) {
  if (currentPageId !== 'garden') {
    return null;
  }

  if (dom.isGardenSeedPopupOpen()) {
    return 'choose sage seed for this plot.';
  }

  const tile = getGrowTile(snapshot, SAGE_SEED_KEY);

  if (!tile) {
    return null;
  }

  if (tile.phase === 'ready') {
    return `tap the ready plot to harvest ${getTileHerbHintName(tile, 'sage')}.`;
  }

  if (tile.phase === 'empty' && isTileSelectedSeed(tile, SAGE_SEED_KEY)) {
    return 'tap the plot to plant sage seed.';
  }

  if (tile.phase === 'growing' || tile.phase === 'harvesting') {
    return `wait for ${getTileHerbHintName(tile, 'sage')} to grow.`;
  }

  if (tile.phase === 'empty') {
    return 'tap the empty plot, then choose sage seed.';
  }

  return null;
}

function getLevelTwoRequirementIntroText(snapshot) {
  const requirementText = formatLevelTwoSageRequirementList(snapshot);

  if (!requirementText) {
    return 'sage seed grows into sage. plant one, then harvest it.';
  }

  const targetLevel = getLevelRequirementTargetLevel(snapshot?.tasks);
  const levelText = targetLevel ? `level ${targetLevel}` : 'the next level';

  return `to reach ${levelText}, turn in ${requirementText}. grow sage first.`;
}

function getLevelTwoRequirementPinText(snapshot) {
  const targetLevel = getLevelRequirementTargetLevel(snapshot?.tasks);
  const levelText = targetLevel ? `level ${targetLevel}` : 'these';

  return `pin ${levelText} requirements so they stay open.`;
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
  const growTarget = getLessonSageGrowTarget(snapshot);
  const task = getCurrentTaskForItem(snapshot, SAGE_HERB_KEY);
  const taskCount = task?.completed
    ? Number(task.requiredQuantity) || growTarget
    : Number(task?.progressQuantity) || 0;

  return Math.min(
    growTarget,
    Math.max(0, Math.floor(getItemQuantity(snapshot, SAGE_HERB_KEY) + taskCount)),
  );
}

function getLessonSageGrowTarget(snapshot) {
  const requiredQuantity = Number(getCurrentTaskForItem(snapshot, SAGE_HERB_KEY)?.requiredQuantity);

  if (Number.isFinite(requiredQuantity) && requiredQuantity > 0) {
    return Math.max(1, Math.floor(requiredQuantity));
  }

  return DEFAULT_LEVEL_FOUR_SAGE_GROW_TARGET;
}

function hasGrownEnoughSageForLesson(snapshot) {
  return getLessonSageGrowCount(snapshot) >= getLessonSageGrowTarget(snapshot);
}

function isGrowSageWaitState(snapshot) {
  return (
    getCurrentLevel(snapshot) === 3 &&
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

function hasSageSeedSource(snapshot) {
  return getItemQuantity(snapshot, SAGE_SEED_KEY) > 0 || hasActiveCrop(snapshot, SAGE_SEED_KEY);
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
  const level = Math.floor(Number(snapshot?.tasks?.currentLevel));

  return Number.isFinite(level) ? Math.max(0, level) : 1;
}

function getOpenLevelRequirementsText(snapshot) {
  return formatOpenLevelRequirementsLabel(snapshot?.tasks);
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
