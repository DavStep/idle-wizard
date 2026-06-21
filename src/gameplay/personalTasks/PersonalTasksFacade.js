import {
  PERSONAL_TASK_ACTIONS,
  PERSONAL_TASK_UNLOCK_LEVEL,
  PersonalTaskGenerationManager,
} from './managers/PersonalTaskGenerationManager.js';
import { PersonalTaskPeriodManager } from './managers/PersonalTaskPeriodManager.js';
import { PersonalTaskRewardManager } from './managers/PersonalTaskRewardManager.js';

export { PERSONAL_TASK_ACTIONS, PERSONAL_TASK_UNLOCK_LEVEL };

export class PersonalTasksFacade {
  static explain =
    'Personal tasks give the wizard small daily and weekly goals, then hold rewards until the player claims them.';

  constructor({
    crystalFacade,
    goldFacade,
    playerLevelFacade,
    researchFacade,
    tasksFacade,
    now = () => Date.now(),
  } = {}) {
    this.playerLevelFacade = playerLevelFacade;
    this.tasksFacade = tasksFacade;
    this.periodManager = new PersonalTaskPeriodManager({ now });
    this.generationManager = new PersonalTaskGenerationManager({
      researchFacade,
      tasksFacade,
    });
    this.rewardManager = new PersonalTaskRewardManager({
      crystalFacade,
      goldFacade,
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

    this.ensureCurrentPeriods();

    let changed = false;

    for (const periodType of ['daily', 'weekly']) {
      const period = this.state.periods[periodType];

      if (!period) {
        continue;
      }

      for (const task of period.tasks ?? []) {
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
        }
      }
    }

    return {
      ok: changed,
      changed,
      rewards: [],
    };
  }

  claimTaskReward(periodType, taskId) {
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

    const task = (period.tasks ?? []).find(
      (candidate) => candidate.taskId === String(taskId ?? ''),
    );

    if (!task) {
      return {
        ok: false,
        changed: false,
        reason: 'unknown_task',
      };
    }

    return this.grantTaskReward(task, period);
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

    if (!period) {
      return {
        ok: false,
        changed: false,
        reason: 'unknown_period',
      };
    }

    return this.grantFullClearReward(period);
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
    if (!snapshot || typeof snapshot !== 'object') {
      this.state = this.createEmptyState();
      return;
    }

    const periods = {};

    for (const periodType of ['daily', 'weekly']) {
      const period = snapshot.periods?.[periodType];

      if (!period || typeof period !== 'object') {
        continue;
      }

      periods[periodType] = this.sanitizePeriod(period, periodType);
    }

    this.state = {
      version: 1,
      periods,
    };
  }

  ensureCurrentPeriods() {
    const currentPeriods = this.periodManager.getCurrentPeriods();
    const anchorLevel = this.getCurrentLevel();

    for (const periodType of ['daily', 'weekly']) {
      const currentPeriod = currentPeriods[periodType];
      const storedPeriod = this.state.periods[periodType];

      if (storedPeriod?.periodKey === currentPeriod.periodKey) {
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
    const fullClearRewardText = this.rewardManager.formatRewardText(period?.fullClearReward);
    const fullClearRewardClaimable = this.isFullClearRewardClaimable(period);
    const claimableRewards =
      taskSnapshots.filter((task) => task.rewardClaimable).length +
      Number(fullClearRewardClaimable);

    return {
      periodType: period.periodType,
      periodKey: period.periodKey,
      anchorLevel: period.anchorLevel,
      resetAtMs: period.resetAtMs,
      resetLabel: this.periodManager.formatResetLabel(period.resetAtMs),
      completedTasks,
      totalTasks: tasks.length,
      fullClearReward: {
        ...(period.fullClearReward ?? {}),
        text: fullClearRewardText,
      },
      fullClearRewardClaimed: Boolean(period.fullClearRewardClaimed),
      fullClearRewardClaimable,
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
    const rewardClaimed = Boolean(task.rewardClaimed);

    return {
      taskId: task.taskId,
      taskKey: task.taskKey,
      actionType: task.actionType,
      label: task.label,
      requiredQuantity,
      progressQuantity,
      remainingQuantity: Math.max(0, requiredQuantity - progressQuantity),
      progress: progressQuantity / requiredQuantity,
      completed,
      reward: {
        ...(task.reward ?? {}),
        text: this.rewardManager.formatRewardText(task.reward),
      },
      rewardClaimed,
      rewardClaimable: completed && !rewardClaimed,
    };
  }

  grantTaskReward(task, period) {
    if (!this.isTaskCompleted(task)) {
      return {
        ok: false,
        changed: false,
        reason: 'incomplete',
      };
    }

    if (task.rewardClaimed) {
      return {
        ok: false,
        changed: false,
        reason: 'claimed',
      };
    }

    task.completed = true;
    task.rewardClaimed = true;
    const granted = this.rewardManager.grantReward(task.reward);

    return {
      ok: true,
      changed: true,
      periodType: period.periodType,
      taskId: task.taskId,
      label: task.label,
      rewards: [
        {
          periodType: period.periodType,
          taskId: task.taskId,
          label: task.label,
          ...granted,
        },
      ],
      ...granted,
    };
  }

  grantFullClearReward(period) {
    const tasks = Array.isArray(period.tasks) ? period.tasks : [];

    if (period.fullClearRewardClaimed || tasks.length <= 0) {
      return {
        ok: false,
        changed: false,
        reason: period.fullClearRewardClaimed ? 'claimed' : 'empty',
      };
    }

    if (!tasks.every((task) => this.isTaskCompleted(task))) {
      return {
        ok: false,
        changed: false,
        reason: 'incomplete',
      };
    }

    period.fullClearRewardClaimed = true;
    const granted = this.rewardManager.grantReward(period.fullClearReward);
    const taskId = `${period.periodKey}:full-clear`;

    return {
      ok: true,
      changed: true,
      periodType: period.periodType,
      taskId,
      label: `${period.periodType} complete`,
      fullClear: true,
      rewards: [
        {
          periodType: period.periodType,
          taskId,
          label: `${period.periodType} complete`,
          fullClear: true,
          ...granted,
        },
      ],
      ...granted,
    };
  }

  isFullClearRewardClaimable(period) {
    const tasks = Array.isArray(period?.tasks) ? period.tasks : [];

    return (
      !period?.fullClearRewardClaimed &&
      tasks.length > 0 &&
      tasks.every((task) => this.isTaskCompleted(task))
    );
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

    if (!['daily', 'weekly'].includes(normalizedPeriodType)) {
      return null;
    }

    const periods = this.ensureCurrentPeriods();
    return periods[normalizedPeriodType] ?? null;
  }

  sanitizePeriod(period, periodType) {
    return {
      version: 1,
      periodType,
      periodKey: typeof period.periodKey === 'string' ? period.periodKey : '',
      resetAtMs: Number.isFinite(period.resetAtMs) ? period.resetAtMs : 0,
      anchorLevel: Math.max(
        PERSONAL_TASK_UNLOCK_LEVEL,
        Math.floor(Number(period.anchorLevel) || PERSONAL_TASK_UNLOCK_LEVEL),
      ),
      fullClearReward: this.sanitizeReward(period.fullClearReward),
      fullClearRewardClaimed: Boolean(period.fullClearRewardClaimed),
      tasks: Array.isArray(period.tasks)
        ? period.tasks.map((task) => this.sanitizeTask(task)).filter(Boolean)
        : [],
    };
  }

  sanitizeTask(task) {
    if (!task || typeof task !== 'object') {
      return null;
    }

    const taskId = typeof task.taskId === 'string' ? task.taskId : '';
    const actionType = typeof task.actionType === 'string' ? task.actionType : '';
    const label = typeof task.label === 'string' ? task.label : '';

    if (!taskId || !actionType || !label) {
      return null;
    }

    const requiredQuantity = Math.max(1, Math.floor(Number(task.requiredQuantity) || 1));
    const progressQuantity = Math.max(
      0,
      Math.min(requiredQuantity, Math.floor(Number(task.progressQuantity) || 0)),
    );

    return {
      taskId,
      taskKey: typeof task.taskKey === 'string' ? task.taskKey : taskId,
      actionType,
      label,
      requiredQuantity,
      progressQuantity,
      completed: Boolean(task.completed) || progressQuantity >= requiredQuantity,
      reward: this.sanitizeReward(task.reward),
      rewardClaimed: Boolean(task.rewardClaimed),
    };
  }

  sanitizeReward(reward = {}) {
    return {
      gold: Math.max(0, Math.floor(Number(reward.gold) || 0)),
      crystal: Math.max(0, Math.floor(Number(reward.crystal) || 0)),
    };
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
      version: 1,
      periods: {},
    };
  }

  clone(value) {
    return JSON.parse(JSON.stringify(value ?? null));
  }
}
