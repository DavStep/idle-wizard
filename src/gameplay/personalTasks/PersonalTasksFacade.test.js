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

function createFacade({ level = 4, now = () => START_MS } = {}) {
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
  const facade = new PersonalTasksFacade({
    crystalFacade,
    coinFacade,
    playerLevelFacade,
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

  it('generates daily quests plus daily and weekly reward tracks', () => {
    const { facade } = createFacade({ level: 4 });
    const snapshot = facade.getSnapshot();

    expect(snapshot.unlocked).toBe(true);
    expect(snapshot.daily).toMatchObject({
      anchorLevel: 4,
      completedTasks: 0,
      totalTasks: 7,
      currentPoints: 0,
      maxPoints: 100,
    });
    expect(snapshot.weekly).toMatchObject({
      anchorLevel: 4,
      completedTasks: 0,
      totalTasks: 0,
      currentPoints: 0,
      maxPoints: 700,
      tasks: [],
    });
    expect(snapshot.daily.tasks.map((task) => ({
      actionType: task.actionType,
      label: task.label,
      pointValue: task.pointValue,
    }))).toEqual([
      {
        actionType: PERSONAL_TASK_ACTIONS.SUMMON_SEEDS,
        label: 'summon seeds',
        pointValue: 10,
      },
      {
        actionType: PERSONAL_TASK_ACTIONS.SPEND_MANA,
        label: 'spend mana',
        pointValue: 15,
      },
      {
        actionType: PERSONAL_TASK_ACTIONS.PLANT_SEEDS,
        label: 'plant seeds',
        pointValue: 10,
      },
      {
        actionType: PERSONAL_TASK_ACTIONS.HARVEST_HERBS,
        label: 'harvest herbs',
        pointValue: 15,
      },
      {
        actionType: PERSONAL_TASK_ACTIONS.BREW_POTIONS,
        label: 'brew potions',
        pointValue: 15,
      },
      {
        actionType: PERSONAL_TASK_ACTIONS.SELL_ITEMS,
        label: 'sell items',
        pointValue: 15,
      },
      {
        actionType: PERSONAL_TASK_ACTIONS.EARN_COIN,
        label: 'earn coin',
        pointValue: 20,
      },
    ]);
    expect(snapshot.daily.rewards.map((reward) => reward.threshold)).toEqual([
      30, 50, 70, 100,
    ]);
    expect(snapshot.weekly.rewards.map((reward) => reward.threshold)).toEqual([
      100, 250, 500, 700,
    ]);
  });

  it('completes daily quests into daily and weekly points', () => {
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

    expect(result).toMatchObject({
      changed: true,
      dailyPointsAdded: 10,
      weeklyPointsAdded: 10,
      rewards: [],
    });
    expect(updatedTask).toMatchObject({
      completed: true,
      progressQuantity: summonTask.requiredQuantity,
    });
    expect(snapshot.daily.currentPoints).toBe(10);
    expect(snapshot.weekly.currentPoints).toBe(10);
    expect(snapshot.daily.claimableRewards).toBe(0);
    expect(coinFacade.current).toBe(0);
  });

  it('claims milestone rewards on request', () => {
    const { facade, coinFacade } = createFacade({ level: 4 });
    const dailyTasks = facade.getSnapshot().daily.tasks;

    for (const task of dailyTasks.slice(0, 3)) {
      facade.recordAction(task.actionType, task.requiredQuantity);
    }

    const claimableDaily = facade.getSnapshot().daily;

    expect(claimableDaily.currentPoints).toBe(35);
    expect(claimableDaily.rewards[0]).toMatchObject({
      threshold: 30,
      claimable: true,
      claimed: false,
    });

    const claim = facade.claimMilestoneReward('daily', 30);
    const updatedReward = facade.getSnapshot().daily.rewards[0];

    expect(claim).toMatchObject({
      ok: true,
      changed: true,
      periodType: 'daily',
      milestoneThreshold: 30,
    });
    expect(claim.rewards).toHaveLength(1);
    expect(updatedReward).toMatchObject({
      claimed: true,
      claimable: false,
    });
    expect(coinFacade.current).toBeGreaterThan(0);
  });

  it('claims weekly milestone crystal after enough daily quest points', () => {
    const { crystalFacade, facade } = createFacade({ level: 10 });
    const dailyTasks = facade.getSnapshot().daily.tasks;

    for (const task of dailyTasks) {
      facade.recordAction(task.actionType, task.requiredQuantity);
    }

    const weekly = facade.getSnapshot().weekly;

    expect(weekly.currentPoints).toBe(100);
    expect(weekly.rewards[0]).toMatchObject({
      threshold: 100,
      claimable: true,
    });
    expect(crystalFacade.current).toBe(0);

    const claim = facade.claimMilestoneReward('weekly', 100);

    expect(claim).toMatchObject({
      ok: true,
      changed: true,
      periodType: 'weekly',
      milestoneThreshold: 100,
    });
    expect(facade.getSnapshot().weekly.rewards[0].claimed).toBe(true);
    expect(crystalFacade.current).toBe(0);
  });

  it('rolls daily quests on the UTC day key while keeping weekly points', () => {
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
    expect(facade.getSnapshot().weekly.currentPoints).toBe(10);

    nowMs = Date.UTC(2026, 5, 21, 0, 1, 0, 0);
    const nextSnapshot = facade.getSnapshot();

    expect(nextSnapshot.daily.periodKey).not.toBe(firstDaily.periodKey);
    expect(nextSnapshot.daily.completedTasks).toBe(0);
    expect(nextSnapshot.daily.currentPoints).toBe(0);
    expect(nextSnapshot.weekly.currentPoints).toBe(10);
  });

  it('resets old v1 personal task saves instead of migrating points', () => {
    const { facade } = createFacade({ level: 4 });

    facade.applyPersistenceSnapshot({
      version: 1,
      periods: {
        daily: {
          periodKey: '2026-06-20',
          tasks: [
            {
              taskKey: 'summon',
              progressQuantity: 999,
              completed: true,
            },
          ],
        },
      },
    });

    const snapshot = facade.getSnapshot();

    expect(snapshot.daily.currentPoints).toBe(0);
    expect(snapshot.weekly.currentPoints).toBe(0);
    expect(snapshot.daily.completedTasks).toBe(0);
  });
});
