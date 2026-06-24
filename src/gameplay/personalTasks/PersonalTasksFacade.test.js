import { describe, expect, it } from 'vitest';

import {
  PERSONAL_TASK_ACTIONS,
  PersonalTasksFacade,
} from './PersonalTasksFacade.js';

const START_MS = Date.UTC(2026, 5, 20, 12, 0, 0, 0);

function createCounterFacade() {
  return {
    current: 0,
    add(amount) {
      this.current += amount;
    },
    getSnapshot() {
      return {
        current: this.current,
      };
    },
  };
}

function createFacade({ level = 4, now = () => START_MS, researchTabs = [] } = {}) {
  const coinFacade = createCounterFacade();
  const crystalFacade = createCounterFacade();
  const playerLevelFacade = {
    getSnapshot: () => ({
      currentLevel: level,
    }),
  };
  const tasksFacade = {
    getLevelCompletionCostCoin: (levelNumber) => levelNumber * levelNumber * 10,
    getSnapshot: () => ({
      currentLevel: level,
    }),
  };
  const researchFacade = {
    getSnapshot: () => ({
      tabs: researchTabs,
    }),
  };
  const facade = new PersonalTasksFacade({
    crystalFacade,
    coinFacade,
    playerLevelFacade,
    researchFacade,
    tasksFacade,
    now,
  });

  return {
    crystalFacade,
    facade,
    coinFacade,
  };
}

describe('PersonalTasksFacade', () => {
  it('stays locked before player level 4', () => {
    const { facade } = createFacade({ level: 3 });

    expect(facade.getSnapshot()).toMatchObject({
      unlocked: false,
      unlockLevel: 4,
      daily: null,
      weekly: null,
    });

    expect(facade.recordAction(PERSONAL_TASK_ACTIONS.SUMMON_SEEDS, 999)).toEqual({
      ok: false,
      changed: false,
    });
  });

  it('generates level-anchored daily and weekly task sets', () => {
    const { facade } = createFacade({ level: 4 });
    const snapshot = facade.getSnapshot();

    expect(snapshot.unlocked).toBe(true);
    expect(snapshot.daily).toMatchObject({
      anchorLevel: 4,
      completedTasks: 0,
      totalTasks: 7,
    });
    expect(snapshot.weekly).toMatchObject({
      anchorLevel: 4,
      completedTasks: 0,
      totalTasks: 7,
    });
    expect(snapshot.daily.tasks.map((task) => task.actionType)).toContain(
      PERSONAL_TASK_ACTIONS.EARN_COIN,
    );
    expect(snapshot.weekly.tasks.map((task) => task.actionType)).toContain(
      PERSONAL_TASK_ACTIONS.COMPLETE_MAIN_REQUIREMENTS,
    );
    expect(snapshot.weekly.tasks.map((task) => ({
      actionType: task.actionType,
      label: task.label,
      requiredQuantity: task.requiredQuantity,
    }))).toEqual([
      {
        actionType: PERSONAL_TASK_ACTIONS.SUMMON_SEEDS,
        label: 'summon 2500 seeds',
        requiredQuantity: 2500,
      },
      {
        actionType: PERSONAL_TASK_ACTIONS.SPEND_MANA,
        label: 'spend 25000 mana',
        requiredQuantity: 25000,
      },
      {
        actionType: PERSONAL_TASK_ACTIONS.PLANT_SEEDS,
        label: 'plant 400 seeds',
        requiredQuantity: 400,
      },
      {
        actionType: PERSONAL_TASK_ACTIONS.HARVEST_HERBS,
        label: 'harvest 600 herbs',
        requiredQuantity: 600,
      },
      {
        actionType: PERSONAL_TASK_ACTIONS.BREW_POTIONS,
        label: 'brew 150 potions',
        requiredQuantity: 150,
      },
      {
        actionType: PERSONAL_TASK_ACTIONS.SELL_ITEMS,
        label: 'sell 1500 items',
        requiredQuantity: 1500,
      },
      {
        actionType: PERSONAL_TASK_ACTIONS.COMPLETE_MAIN_REQUIREMENTS,
        label: 'complete 3 requirements',
        requiredQuantity: 3,
      },
    ]);
  });

  it('uses two researches for the weekly research task when research is visible', () => {
    const { facade } = createFacade({
      level: 4,
      researchTabs: [
        {
          boxes: [
            {
              researches: [
                {
                  completed: false,
                  locked: false,
                },
              ],
            },
          ],
        },
      ],
    });
    const researchTask = facade.getSnapshot().weekly.tasks.at(-1);

    expect(researchTask).toMatchObject({
      actionType: PERSONAL_TASK_ACTIONS.COMPLETE_RESEARCH,
      label: 'finish 2 researches',
      requiredQuantity: 2,
    });
  });

  it('records progress and leaves completed task rewards claimable', () => {
    const { facade, coinFacade } = createFacade({ level: 4 });
    const summonTask = facade
      .getSnapshot()
      .daily.tasks.find((task) => task.actionType === PERSONAL_TASK_ACTIONS.SUMMON_SEEDS);

    const result = facade.recordAction(
      PERSONAL_TASK_ACTIONS.SUMMON_SEEDS,
      summonTask.requiredQuantity,
    );
    const snapshot = facade.getSnapshot();
    const updatedTask = snapshot.daily.tasks.find(
      (task) => task.actionType === PERSONAL_TASK_ACTIONS.SUMMON_SEEDS,
    );

    expect(result.changed).toBe(true);
    expect(updatedTask).toMatchObject({
      completed: true,
      progressQuantity: summonTask.requiredQuantity,
      rewardClaimed: false,
      rewardClaimable: true,
    });
    expect(snapshot.daily.claimableRewards).toBe(1);
    expect(result.rewards).toEqual([]);
    expect(coinFacade.current).toBe(0);
  });

  it('claims completed task rewards on request', () => {
    const { facade, coinFacade } = createFacade({ level: 4 });
    const summonTask = facade
      .getSnapshot()
      .daily.tasks.find((task) => task.actionType === PERSONAL_TASK_ACTIONS.SUMMON_SEEDS);

    facade.recordAction(PERSONAL_TASK_ACTIONS.SUMMON_SEEDS, summonTask.requiredQuantity);

    const claim = facade.claimTaskReward('daily', summonTask.taskId);
    const updatedTask = facade
      .getSnapshot()
      .daily.tasks.find((task) => task.actionType === PERSONAL_TASK_ACTIONS.SUMMON_SEEDS);

    expect(claim).toMatchObject({
      ok: true,
      changed: true,
      periodType: 'daily',
      taskId: summonTask.taskId,
    });
    expect(claim.rewards).toHaveLength(1);
    expect(updatedTask).toMatchObject({
      rewardClaimed: true,
      rewardClaimable: false,
    });
    expect(coinFacade.current).toBeGreaterThan(0);
  });

  it('claims weekly full clear crystal after all weekly tasks complete', () => {
    const { crystalFacade, facade } = createFacade({ level: 10 });
    const weekly = facade.getSnapshot().weekly;

    for (const task of weekly.tasks) {
      facade.recordAction(task.actionType, task.requiredQuantity);
    }

    const updatedWeekly = facade.getSnapshot().weekly;

    expect(updatedWeekly.completedTasks).toBe(7);
    expect(updatedWeekly.fullClearRewardClaimed).toBe(false);
    expect(updatedWeekly.fullClearRewardClaimable).toBe(true);
    expect(crystalFacade.current).toBe(0);

    const claim = facade.claimFullClearReward('weekly');

    expect(claim).toMatchObject({
      ok: true,
      changed: true,
      periodType: 'weekly',
      fullClear: true,
    });
    expect(facade.getSnapshot().weekly.fullClearRewardClaimed).toBe(true);
    expect(crystalFacade.current).toBe(2);
  });

  it('rolls daily tasks on the UTC day key', () => {
    let nowMs = Date.UTC(2026, 5, 20, 23, 59, 0, 0);
    const { facade } = createFacade({
      level: 4,
      now: () => nowMs,
    });
    const firstDaily = facade.getSnapshot().daily;
    const summonTask = firstDaily.tasks.find(
      (task) => task.actionType === PERSONAL_TASK_ACTIONS.SUMMON_SEEDS,
    );

    facade.recordAction(PERSONAL_TASK_ACTIONS.SUMMON_SEEDS, summonTask.requiredQuantity);
    expect(facade.getSnapshot().daily.completedTasks).toBe(1);

    nowMs = Date.UTC(2026, 5, 21, 0, 1, 0, 0);
    const nextDaily = facade.getSnapshot().daily;

    expect(nextDaily.periodKey).not.toBe(firstDaily.periodKey);
    expect(nextDaily.completedTasks).toBe(0);
  });
});
