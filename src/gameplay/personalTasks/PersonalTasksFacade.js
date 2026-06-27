import {
  PERSONAL_TASK_ACTIONS,
  PERSONAL_TASK_DAILY_MAX_POINTS,
  PERSONAL_TASK_UNLOCK_LEVEL,
  PERSONAL_TASK_WEEKLY_MAX_POINTS,
  PersonalTaskGenerationManager,
} from './managers/PersonalTaskGenerationManager.js';
import { PersonalTaskPeriodManager } from './managers/PersonalTaskPeriodManager.js';
import { PersonalTaskRewardManager } from './managers/PersonalTaskRewardManager.js';

export { PERSONAL_TASK_ACTIONS, PERSONAL_TASK_UNLOCK_LEVEL };

const PERSONAL_TASK_STATE_VERSION = 2;
const PERSONAL_TASK_PERIOD_TYPES = ['daily', 'weekly'];

export class PersonalTasksFacade {
  static explain =
    'Personal tasks give the wizard daily quests that feed daily and weekly point tracks, then hold milestone rewards until the player claims them.';

  constructor({
    crystalFacade,
    coinFacade,
    playerLevelFacade,
    tasksFacade,
    now = () => Date.now(),
  } = {}) {
    this.playerLevelFacade = playerLevelFacade;
    this.tasksFacade = tasksFacade;
    this.periodManager = new PersonalTaskPeriodManager({ now });
    this.generationManager = new PersonalTaskGenerationManager({
      tasksFacade,
    });
    this.rewardManager = new PersonalTaskRewardManager({
      crystalFacade,
      coinFacade,
    });
    this.state = this.createEmptyState();
  }

  recordAction(actionType, quantity = 1) {
    const normalizedActionType = String(actionType ?? '');
    const amount = Math.max(0, Math.floor(Number(quantity) || 0));

    if (!normalizedActionType || amount <= 0 || !this.isUnlocked()) {
      return {
        ok: false,
        changed: false,
      };
    }

    const periods = this.ensureCurrentPeriods();
    const daily = periods.daily;
    const weekly = periods.weekly;
    let changed = false;
    let dailyPointsAdded = 0;
    let weeklyPointsAdded = 0;

    for (const task of daily?.tasks ?? []) {
      if (task.actionType !== normalizedActionType || task.completed) {
        continue;
      }

      const previousProgress = Math.max(0, Math.floor(Number(task.progressQuantity) || 0));
      const requiredQuantity = Math.max(1, Math.floor(Number(task.requiredQuantity) || 1));
      const nextProgress = Math.min(requiredQuantity, previousProgress + amount);

      if (nextProgress === previousProgress) {
        continue;
      }

      task.progressQuantity = nextProgress;
      changed = true;

      if (nextProgress >= requiredQuantity) {
        task.completed = true;
        const pointValue = Math.max(1, Math.floor(Number(task.pointValue) || 1));
        dailyPointsAdded += this.addPeriodPoints(daily, pointValue);
        weeklyPointsAdded += this.addPeriodPoints(weekly, pointValue);
      }
    }

    return {
      ok: changed,
      changed,
      dailyPointsAdded,
      weeklyPointsAdded,
      pointsAdded: dailyPointsAdded,
      rewards: [],
    };
  }

  claimMilestoneReward(periodType, threshold) {
    if (!this.isUnlocked()) {
      return {
        ok: false,
        changed: false,
        reason: 'locked',
      };
    }

    const period = this.getCurrentPeriod(periodType);

    if (!period) {
      return {
        ok: false,
        changed: false,
        reason: 'unknown_period',
      };
    }

    const normalizedThreshold = Math.max(0, Math.floor(Number(threshold) || 0));
    const milestone = (period.rewards ?? []).find(
      (candidate) => candidate.threshold === normalizedThreshold,
    );

    if (!milestone) {
      return {
        ok: false,
        changed: false,
        reason: 'unknown_reward',
      };
    }

    if (milestone.claimed) {
      return {
        ok: false,
        changed: false,
        reason: 'claimed',
      };
    }

    if (Math.max(0, Math.floor(Number(period.currentPoints) || 0)) < milestone.threshold) {
      return {
        ok: false,
        changed: false,
        reason: 'incomplete',
      };
    }

    milestone.claimed = true;
    const granted = this.rewardManager.grantReward(milestone.reward);
    const taskId = `${period.periodKey}:milestone:${milestone.threshold}`;
    const label = `${period.periodType} ${milestone.threshold} points`;

    return {
      ok: true,
      changed: true,
      periodType: period.periodType,
      taskId,
      label,
      milestoneThreshold: milestone.threshold,
      rewards: [
        {
          periodType: period.periodType,
          taskId,
          label,
          milestoneThreshold: milestone.threshold,
          ...granted,
        },
      ],
      ...granted,
    };
  }

  claimTaskReward() {
    return {
      ok: false,
      changed: false,
      reason: 'milestone_rewards_only',
    };
  }

  claimFullClearReward(periodType) {
    if (!this.isUnlocked()) {
      return {
        ok: false,
        changed: false,
        reason: 'locked',
      };
    }

    const period = this.getCurrentPeriod(periodType);
    return this.claimMilestoneReward(periodType, period?.maxPoints);
  }

  getSnapshot() {
    const unlocked = this.isUnlocked();

    if (!unlocked) {
      return {
        unlocked: false,
        unlockLevel: PERSONAL_TASK_UNLOCK_LEVEL,
        daily: null,
        weekly: null,
      };
    }

    const periods = this.ensureCurrentPeriods();

    const daily = this.createPeriodSnapshot(periods.daily);
    const weekly = this.createPeriodSnapshot(periods.weekly);
    const claimableRewards = daily.claimableRewards + weekly.claimableRewards;

    return {
      unlocked: true,
      unlockLevel: PERSONAL_TASK_UNLOCK_LEVEL,
      claimableRewards,
      hasClaimableRewards: claimableRewards > 0,
      daily,
      weekly,
    };
  }

  getPersistenceSnapshot() {
    return this.clone(this.state);
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object' || snapshot.version !== PERSONAL_TASK_STATE_VERSION) {
      this.state = this.createEmptyState();
      return;
    }

    const periods = {};

    for (const periodType of PERSONAL_TASK_PERIOD_TYPES) {
      const period = snapshot.periods?.[periodType];

      if (!period || typeof period !== 'object') {
        continue;
      }

      periods[periodType] = this.sanitizePeriod(period, periodType);
    }

    this.state = {
      version: PERSONAL_TASK_STATE_VERSION,
      periods,
    };
  }

  ensureCurrentPeriods() {
    const currentPeriods = this.periodManager.getCurrentPeriods();
    const anchorLevel = this.getCurrentLevel();

    for (const periodType of PERSONAL_TASK_PERIOD_TYPES) {
      const currentPeriod = currentPeriods[periodType];
      const storedPeriod = this.state.periods[periodType];

      if (
        storedPeriod?.version === PERSONAL_TASK_STATE_VERSION &&
        storedPeriod.periodKey === currentPeriod.periodKey
      ) {
        storedPeriod.resetAtMs = currentPeriod.resetAtMs;
        continue;
      }

      this.state.periods[periodType] = this.generationManager.createPeriodState({
        ...currentPeriod,
        anchorLevel,
      });
    }

    return this.state.periods;
  }

  createPeriodSnapshot(period) {
    const tasks = Array.isArray(period?.tasks) ? period.tasks : [];
    const completedTasks = tasks.filter((task) => this.isTaskCompleted(task)).length;
    const taskSnapshots = tasks.map((task) => this.createTaskSnapshot(task));
    const rewardSnapshots = (period?.rewards ?? []).map((reward) =>
      this.createMilestoneSnapshot(period, reward),
    );
    const claimableRewards = rewardSnapshots.filter((reward) => reward.claimable).length;
    const currentPoints = Math.max(0, Math.floor(Number(period?.currentPoints) || 0));
    const maxPoints = Math.max(
      1,
      Math.floor(
        Number(period?.maxPoints) ||
          (period?.periodType === 'weekly'
            ? PERSONAL_TASK_WEEKLY_MAX_POINTS
            : PERSONAL_TASK_DAILY_MAX_POINTS),
      ),
    );

    return {
      periodType: period.periodType,
      periodKey: period.periodKey,
      anchorLevel: period.anchorLevel,
      resetAtMs: period.resetAtMs,
      resetLabel: this.periodManager.formatResetLabel(period.resetAtMs),
      currentPoints,
      maxPoints,
      progress: Math.min(1, currentPoints / maxPoints),
      completedTasks,
      totalTasks: tasks.length,
      rewards: rewardSnapshots,
      milestones: rewardSnapshots,
      claimableRewards,
      hasClaimableRewards: claimableRewards > 0,
      tasks: taskSnapshots,
    };
  }

  createTaskSnapshot(task) {
    const requiredQuantity = Math.max(1, Math.floor(Number(task.requiredQuantity) || 1));
    const progressQuantity = Math.max(
      0,
      Math.min(requiredQuantity, Math.floor(Number(task.progressQuantity) || 0)),
    );
    const completed = this.isTaskCompleted(task);

    return {
      taskId: task.taskId,
      taskKey: task.taskKey,
      actionType: task.actionType,
      label: task.label,
      requiredQuantity,
      progressQuantity,
      remainingQuantity: Math.max(0, requiredQuantity - progressQuantity),
      progress: progressQuantity / requiredQuantity,
      pointValue: Math.max(1, Math.floor(Number(task.pointValue) || 1)),
      completed,
    };
  }

  createMilestoneSnapshot(period, milestone) {
    const threshold = Math.max(1, Math.floor(Number(milestone?.threshold) || 1));
    const currentPoints = Math.max(0, Math.floor(Number(period?.currentPoints) || 0));
    const claimed = Boolean(milestone?.claimed);
    const unlocked = currentPoints >= threshold;

    return {
      milestoneId: `${period.periodKey}:milestone:${threshold}`,
      threshold,
      reward: {
        ...(milestone.reward ?? {}),
        text: this.rewardManager.formatRewardText(milestone.reward),
      },
      claimed,
      claimable: unlocked && !claimed,
      unlocked,
    };
  }

  addPeriodPoints(period, amount) {
    if (!period) {
      return 0;
    }

    const previousPoints = Math.max(0, Math.floor(Number(period.currentPoints) || 0));
    const maxPoints = Math.max(1, Math.floor(Number(period.maxPoints) || 1));
    const nextPoints = Math.min(
      maxPoints,
      previousPoints + Math.max(0, Math.floor(Number(amount) || 0)),
    );

    period.currentPoints = nextPoints;
    return nextPoints - previousPoints;
  }

  isTaskCompleted(task) {
    const requiredQuantity = Math.max(1, Math.floor(Number(task?.requiredQuantity) || 1));
    const progressQuantity = Math.max(
      0,
      Math.min(requiredQuantity, Math.floor(Number(task?.progressQuantity) || 0)),
    );

    return Boolean(task?.completed) || progressQuantity >= requiredQuantity;
  }

  getCurrentPeriod(periodType) {
    const normalizedPeriodType = String(periodType ?? '');

    if (!PERSONAL_TASK_PERIOD_TYPES.includes(normalizedPeriodType)) {
      return null;
    }

    const periods = this.ensureCurrentPeriods();
    return periods[normalizedPeriodType] ?? null;
  }

  sanitizePeriod(period, periodType) {
    const anchorLevel = Math.max(
      PERSONAL_TASK_UNLOCK_LEVEL,
      Math.floor(Number(period.anchorLevel) || PERSONAL_TASK_UNLOCK_LEVEL),
    );
    const generatedPeriod = this.generationManager.createPeriodState({
      periodType,
      periodKey: typeof period.periodKey === 'string' ? period.periodKey : '',
      resetAtMs: Number.isFinite(period.resetAtMs) ? period.resetAtMs : 0,
      anchorLevel,
    });
    const maxPoints = Math.max(1, Math.floor(Number(generatedPeriod.maxPoints) || 1));
    const currentPoints = Math.max(
      0,
      Math.min(maxPoints, Math.floor(Number(period.currentPoints) || 0)),
    );

    return {
      ...generatedPeriod,
      currentPoints,
      rewards: this.sanitizeRewards(period.rewards, generatedPeriod.rewards),
      tasks:
        periodType === 'daily'
          ? this.sanitizeTasks(period.tasks, generatedPeriod.tasks)
          : [],
    };
  }

  sanitizeRewards(rewards, generatedRewards) {
    const rewardByThreshold = new Map(
      (Array.isArray(rewards) ? rewards : []).map((reward) => [
        Math.max(1, Math.floor(Number(reward?.threshold) || 1)),
        reward,
      ]),
    );

    return generatedRewards.map((generatedReward) => {
      const storedReward = rewardByThreshold.get(generatedReward.threshold);

      return {
        ...generatedReward,
        claimed: Boolean(storedReward?.claimed),
      };
    });
  }

  sanitizeTasks(tasks, generatedTasks = []) {
    const taskByKey = new Map(
      (Array.isArray(tasks) ? tasks : []).map((task) => [
        String(task?.taskKey ?? ''),
        task,
      ]),
    );

    return generatedTasks.map((generatedTask) => {
      const storedTask = taskByKey.get(generatedTask.taskKey);
      const requiredQuantity = Math.max(
        1,
        Math.floor(Number(generatedTask.requiredQuantity) || 1),
      );
      const progressQuantity = Math.max(
        0,
        Math.min(requiredQuantity, Math.floor(Number(storedTask?.progressQuantity) || 0)),
      );

      return {
        ...generatedTask,
        progressQuantity,
        completed: Boolean(storedTask?.completed) || progressQuantity >= requiredQuantity,
      };
    });
  }

  getCurrentLevel() {
    const playerLevel = this.playerLevelFacade?.getSnapshot?.().currentLevel;

    if (Number.isFinite(playerLevel)) {
      return Math.floor(playerLevel);
    }

    const taskLevel = this.tasksFacade?.getSnapshot?.().currentLevel;

    if (Number.isFinite(taskLevel)) {
      return Math.floor(taskLevel);
    }

    return 1;
  }

  isUnlocked() {
    return this.getCurrentLevel() >= PERSONAL_TASK_UNLOCK_LEVEL;
  }

  createEmptyState() {
    return {
      version: PERSONAL_TASK_STATE_VERSION,
      periods: {},
    };
  }

  clone(value) {
    return JSON.parse(JSON.stringify(value ?? null));
  }
}
