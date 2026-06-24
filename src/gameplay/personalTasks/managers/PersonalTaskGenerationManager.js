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

const DAILY_TASK_WEIGHTS = [1, 1.15, 1, 1, 1.05, 1.05, 1.2];
const WEEKLY_TASK_WEIGHTS = [1, 1.15, 1, 1, 1.05, 1.05, 1.35];

export class PersonalTaskGenerationManager {
  constructor({ researchFacade, tasksFacade } = {}) {
    this.researchFacade = researchFacade;
    this.tasksFacade = tasksFacade;
  }

  createPeriodState({ periodType, periodKey, resetAtMs, anchorLevel }) {
    const level = Math.max(PERSONAL_TASK_UNLOCK_LEVEL, Math.floor(Number(anchorLevel) || 0));
    const completionCostCoin = this.getCompletionCostCoin(level);
    const tasks =
      periodType === 'weekly'
        ? this.createWeeklyTasks({ periodKey, anchorLevel: level, completionCostCoin })
        : this.createDailyTasks({ periodKey, anchorLevel: level, completionCostCoin });
    const fullClearReward =
      periodType === 'weekly'
        ? {
            coin: this.roundCoin(completionCostCoin * 0.6),
            crystal: this.getWeeklyFullClearCrystal(level),
          }
        : {
            coin: this.roundCoin(completionCostCoin * 0.15),
            crystal: 0,
          };

    return {
      version: 1,
      periodType,
      periodKey,
      resetAtMs,
      anchorLevel: level,
      fullClearReward,
      fullClearRewardClaimed: false,
      tasks,
    };
  }

  createDailyTasks({ periodKey, anchorLevel, completionCostCoin }) {
    const targets = this.getTargets(anchorLevel, completionCostCoin);
    const rewards = this.createTaskRewards({
      budgetCoin: completionCostCoin * 0.45,
      weights: DAILY_TASK_WEIGHTS,
    });

    return [
      this.createTask({
        periodKey,
        taskKey: 'summon',
        actionType: PERSONAL_TASK_ACTIONS.SUMMON_SEEDS,
        label: `summon ${targets.dailySummonSeeds} seeds`,
        requiredQuantity: targets.dailySummonSeeds,
        reward: rewards[0],
      }),
      this.createTask({
        periodKey,
        taskKey: 'mana',
        actionType: PERSONAL_TASK_ACTIONS.SPEND_MANA,
        label: `spend ${targets.dailySpendMana} mana`,
        requiredQuantity: targets.dailySpendMana,
        reward: rewards[1],
      }),
      this.createTask({
        periodKey,
        taskKey: 'plant',
        actionType: PERSONAL_TASK_ACTIONS.PLANT_SEEDS,
        label: `plant ${targets.dailyPlantSeeds} seeds`,
        requiredQuantity: targets.dailyPlantSeeds,
        reward: rewards[2],
      }),
      this.createTask({
        periodKey,
        taskKey: 'harvest',
        actionType: PERSONAL_TASK_ACTIONS.HARVEST_HERBS,
        label: `harvest ${targets.dailyHarvestHerbs} herbs`,
        requiredQuantity: targets.dailyHarvestHerbs,
        reward: rewards[3],
      }),
      this.createTask({
        periodKey,
        taskKey: 'brew',
        actionType: PERSONAL_TASK_ACTIONS.BREW_POTIONS,
        label: `brew ${targets.dailyBrewPotions} potions`,
        requiredQuantity: targets.dailyBrewPotions,
        reward: rewards[4],
      }),
      this.createTask({
        periodKey,
        taskKey: 'sell',
        actionType: PERSONAL_TASK_ACTIONS.SELL_ITEMS,
        label: `sell ${targets.dailySellItems} items`,
        requiredQuantity: targets.dailySellItems,
        reward: rewards[5],
      }),
      this.createTask({
        periodKey,
        taskKey: 'coin',
        actionType: PERSONAL_TASK_ACTIONS.EARN_COIN,
        label: `earn ${targets.dailyEarnCoin} coin`,
        requiredQuantity: targets.dailyEarnCoin,
        reward: rewards[6],
      }),
    ];
  }

  createWeeklyTasks({ periodKey, anchorLevel, completionCostCoin }) {
    const targets = this.getTargets(anchorLevel, completionCostCoin);
    const rewards = this.createTaskRewards({
      budgetCoin: completionCostCoin * 1.8,
      weights: WEEKLY_TASK_WEIGHTS,
    });
    const progressTask = this.createWeeklyProgressTask({
      periodKey,
      reward: rewards[6],
    });

    return [
      this.createTask({
        periodKey,
        taskKey: 'summon',
        actionType: PERSONAL_TASK_ACTIONS.SUMMON_SEEDS,
        label: `summon ${targets.weeklySummonSeeds} seeds`,
        requiredQuantity: targets.weeklySummonSeeds,
        reward: rewards[0],
      }),
      this.createTask({
        periodKey,
        taskKey: 'mana',
        actionType: PERSONAL_TASK_ACTIONS.SPEND_MANA,
        label: `spend ${targets.weeklySpendMana} mana`,
        requiredQuantity: targets.weeklySpendMana,
        reward: rewards[1],
      }),
      this.createTask({
        periodKey,
        taskKey: 'plant',
        actionType: PERSONAL_TASK_ACTIONS.PLANT_SEEDS,
        label: `plant ${targets.weeklyPlantSeeds} seeds`,
        requiredQuantity: targets.weeklyPlantSeeds,
        reward: rewards[2],
      }),
      this.createTask({
        periodKey,
        taskKey: 'harvest',
        actionType: PERSONAL_TASK_ACTIONS.HARVEST_HERBS,
        label: `harvest ${targets.weeklyHarvestHerbs} herbs`,
        requiredQuantity: targets.weeklyHarvestHerbs,
        reward: rewards[3],
      }),
      this.createTask({
        periodKey,
        taskKey: 'brew',
        actionType: PERSONAL_TASK_ACTIONS.BREW_POTIONS,
        label: `brew ${targets.weeklyBrewPotions} potions`,
        requiredQuantity: targets.weeklyBrewPotions,
        reward: rewards[4],
      }),
      this.createTask({
        periodKey,
        taskKey: 'sell',
        actionType: PERSONAL_TASK_ACTIONS.SELL_ITEMS,
        label: `sell ${targets.weeklySellItems} items`,
        requiredQuantity: targets.weeklySellItems,
        reward: rewards[5],
      }),
      progressTask,
    ];
  }

  createWeeklyProgressTask({ periodKey, reward }) {
    if (this.hasVisibleResearchTodo()) {
      return this.createTask({
        periodKey,
        taskKey: 'research',
        actionType: PERSONAL_TASK_ACTIONS.COMPLETE_RESEARCH,
        label: 'finish 2 researches',
        requiredQuantity: 2,
        reward,
      });
    }

    return this.createTask({
      periodKey,
      taskKey: 'requirements',
      actionType: PERSONAL_TASK_ACTIONS.COMPLETE_MAIN_REQUIREMENTS,
      label: 'complete 3 requirements',
      requiredQuantity: 3,
      reward,
    });
  }

  createTask({ periodKey, taskKey, actionType, label, requiredQuantity, reward }) {
    return {
      taskId: `${periodKey}:${taskKey}`,
      taskKey,
      actionType,
      label,
      requiredQuantity: Math.max(1, Math.floor(Number(requiredQuantity) || 1)),
      progressQuantity: 0,
      completed: false,
      reward,
      rewardClaimed: false,
    };
  }

  createTaskRewards({ budgetCoin, weights }) {
    const totalWeight = weights.reduce((total, weight) => total + weight, 0);
    return weights.map((weight) => ({
      coin: this.roundCoin((budgetCoin * weight) / totalWeight),
      crystal: 0,
    }));
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
      weeklySummonSeeds: dailySummonSeeds * 50,
      weeklySpendMana: dailySpendMana * 50,
      weeklyPlantSeeds: dailyPlantSeeds * 50,
      weeklyHarvestHerbs: dailyHarvestHerbs * 50,
      weeklyBrewPotions: dailyBrewPotions * 50,
      weeklySellItems: dailySellItems * 50,
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

  hasVisibleResearchTodo() {
    const tabs = this.researchFacade?.getSnapshot?.().tabs;

    if (!Array.isArray(tabs)) {
      return false;
    }

    return tabs.some((tab) =>
      (tab.boxes ?? []).some((box) =>
        (box.researches ?? []).some((research) =>
          Boolean(research && !research.completed && !research.locked),
        ),
      ),
    );
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
