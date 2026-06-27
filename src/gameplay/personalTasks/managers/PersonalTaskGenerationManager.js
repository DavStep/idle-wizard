export const PERSONAL_TASK_UNLOCK_LEVEL = 4;

export const PERSONAL_TASK_ACTIONS = Object.freeze({
  BREW_POTIONS: 'brew_potions',
  COMPLETE_MAIN_REQUIREMENTS: 'complete_main_requirements',
  COMPLETE_RESEARCH: 'complete_research',
  EARN_COIN: 'earn_coin',
  HARVEST_HERBS: 'harvest_herbs',
  PLANT_SEEDS: 'plant_seeds',
  SELL_ITEMS: 'sell_items',
  SPEND_MANA: 'spend_mana',
  SUMMON_SEEDS: 'summon_seeds',
});

export const PERSONAL_TASK_DAILY_MAX_POINTS = 100;
export const PERSONAL_TASK_WEEKLY_MAX_POINTS = 700;

const DAILY_TASK_DEFINITIONS = [
  {
    taskKey: 'summon',
    actionType: PERSONAL_TASK_ACTIONS.SUMMON_SEEDS,
    label: 'summon seeds',
    targetKey: 'dailySummonSeeds',
    pointValue: 10,
  },
  {
    taskKey: 'mana',
    actionType: PERSONAL_TASK_ACTIONS.SPEND_MANA,
    label: 'spend mana',
    targetKey: 'dailySpendMana',
    pointValue: 15,
  },
  {
    taskKey: 'plant',
    actionType: PERSONAL_TASK_ACTIONS.PLANT_SEEDS,
    label: 'plant seeds',
    targetKey: 'dailyPlantSeeds',
    pointValue: 10,
  },
  {
    taskKey: 'harvest',
    actionType: PERSONAL_TASK_ACTIONS.HARVEST_HERBS,
    label: 'harvest herbs',
    targetKey: 'dailyHarvestHerbs',
    pointValue: 15,
  },
  {
    taskKey: 'brew',
    actionType: PERSONAL_TASK_ACTIONS.BREW_POTIONS,
    label: 'brew potions',
    targetKey: 'dailyBrewPotions',
    pointValue: 15,
  },
  {
    taskKey: 'sell',
    actionType: PERSONAL_TASK_ACTIONS.SELL_ITEMS,
    label: 'sell items',
    targetKey: 'dailySellItems',
    pointValue: 15,
  },
  {
    taskKey: 'coin',
    actionType: PERSONAL_TASK_ACTIONS.EARN_COIN,
    label: 'earn coin',
    targetKey: 'dailyEarnCoin',
    pointValue: 20,
  },
];

const DAILY_REWARD_MILESTONES = [
  { threshold: 30, coinMultiplier: 0.1, crystal: 0 },
  { threshold: 50, coinMultiplier: 0.15, crystal: 0 },
  { threshold: 70, coinMultiplier: 0.15, crystal: 0 },
  { threshold: 100, coinMultiplier: 0.2, crystal: 0 },
];

const WEEKLY_REWARD_MILESTONES = [
  { threshold: 100, coinMultiplier: 0.4, crystal: 0 },
  { threshold: 250, coinMultiplier: 0.5, crystal: 0 },
  { threshold: 500, coinMultiplier: 0.6, crystal: 0 },
  { threshold: 700, coinMultiplier: 0.9, crystal: 'weeklyFullClear' },
];

export class PersonalTaskGenerationManager {
  constructor({ tasksFacade } = {}) {
    this.tasksFacade = tasksFacade;
  }

  createPeriodState({ periodType, periodKey, resetAtMs, anchorLevel }) {
    const level = Math.max(PERSONAL_TASK_UNLOCK_LEVEL, Math.floor(Number(anchorLevel) || 0));
    const completionCostCoin = this.getCompletionCostCoin(level);

    if (periodType === 'weekly') {
      return {
        version: 2,
        periodType,
        periodKey,
        resetAtMs,
        anchorLevel: level,
        currentPoints: 0,
        maxPoints: PERSONAL_TASK_WEEKLY_MAX_POINTS,
        rewards: this.createWeeklyMilestoneRewards({
          anchorLevel: level,
          completionCostCoin,
        }),
      };
    }

    return {
      version: 2,
      periodType: 'daily',
      periodKey,
      resetAtMs,
      anchorLevel: level,
      currentPoints: 0,
      maxPoints: PERSONAL_TASK_DAILY_MAX_POINTS,
      rewards: this.createDailyMilestoneRewards({ completionCostCoin }),
      tasks: this.createDailyTasks({ periodKey, anchorLevel: level, completionCostCoin }),
    };
  }

  createDailyTasks({ periodKey, anchorLevel, completionCostCoin }) {
    const targets = this.getTargets(anchorLevel, completionCostCoin);

    return DAILY_TASK_DEFINITIONS.map((definition) =>
      this.createTask({
        periodKey,
        ...definition,
        requiredQuantity: targets[definition.targetKey],
      }),
    );
  }

  createDailyMilestoneRewards({ completionCostCoin }) {
    return DAILY_REWARD_MILESTONES.map((milestone) =>
      this.createRewardMilestone({
        threshold: milestone.threshold,
        coin: this.roundCoin(completionCostCoin * milestone.coinMultiplier),
        crystal: milestone.crystal,
      }),
    );
  }

  createWeeklyMilestoneRewards({ anchorLevel, completionCostCoin }) {
    return WEEKLY_REWARD_MILESTONES.map((milestone) =>
      this.createRewardMilestone({
        threshold: milestone.threshold,
        coin: this.roundCoin(completionCostCoin * milestone.coinMultiplier),
        crystal:
          milestone.crystal === 'weeklyFullClear'
            ? this.getWeeklyFullClearCrystal(anchorLevel)
            : milestone.crystal,
      }),
    );
  }

  createRewardMilestone({ threshold, coin, crystal }) {
    return {
      threshold: Math.max(1, Math.floor(Number(threshold) || 1)),
      reward: {
        coin: Math.max(0, Math.floor(Number(coin) || 0)),
        crystal: Math.max(0, Math.floor(Number(crystal) || 0)),
      },
      claimed: false,
    };
  }

  createTask({ periodKey, taskKey, actionType, label, requiredQuantity, pointValue }) {
    return {
      taskId: `${periodKey}:${taskKey}`,
      taskKey,
      actionType,
      label,
      requiredQuantity: Math.max(1, Math.floor(Number(requiredQuantity) || 1)),
      progressQuantity: 0,
      pointValue: Math.max(1, Math.floor(Number(pointValue) || 1)),
      completed: false,
    };
  }

  getTargets(anchorLevel, completionCostCoin) {
    const dailySummonSeeds = this.roundToFive(20 + 8 * anchorLevel);
    const dailySpendMana = dailySummonSeeds * 10;
    const dailyPlantSeeds = this.clamp(Math.round(4 + 1.1 * anchorLevel), 6, 45);
    const dailyHarvestHerbs = this.clamp(Math.round(6 + 1.4 * anchorLevel), 8, 60);
    const dailyBrewPotions = this.clamp(Math.round(2 + anchorLevel / 5), 3, 12);
    const dailySellItems = this.roundToFive(15 + 4 * anchorLevel);
    const dailyEarnCoin = this.roundToFive(0.35 * completionCostCoin);

    return {
      dailySummonSeeds,
      dailySpendMana,
      dailyPlantSeeds,
      dailyHarvestHerbs,
      dailyBrewPotions,
      dailySellItems,
      dailyEarnCoin,
    };
  }

  getCompletionCostCoin(level) {
    const cost = this.tasksFacade?.getLevelCompletionCostCoin?.(level);

    if (Number.isFinite(cost) && cost >= 0) {
      return Math.floor(cost);
    }

    return Math.max(0, Math.floor(level * level * 10));
  }

  getWeeklyFullClearCrystal(anchorLevel) {
    if (anchorLevel >= 30) {
      return 3;
    }

    if (anchorLevel >= 10) {
      return 2;
    }

    return 1;
  }

  roundCoin(value) {
    return Math.max(1, this.roundToFive(value));
  }

  roundToFive(value) {
    const rounded = Math.round((Number(value) || 0) / 5) * 5;
    return Math.max(5, rounded);
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
}
