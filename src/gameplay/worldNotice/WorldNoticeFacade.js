import {
  WORLD_NOTICE_ACTIONS,
  WORLD_NOTICE_UNLOCK_LEVEL,
  WorldNoticeCatalogManager,
} from './managers/WorldNoticeCatalogManager.js';
import { WorldNoticePeriodManager } from './managers/WorldNoticePeriodManager.js';
import { WorldNoticeProgressManager } from './managers/WorldNoticeProgressManager.js';
import { WorldNoticeRewardManager } from './managers/WorldNoticeRewardManager.js';

const WORLD_NOTICE_ARCHIVE_LIMIT = 12;

export { WORLD_NOTICE_ACTIONS, WORLD_NOTICE_UNLOCK_LEVEL };

export class WorldNoticeFacade {
  static explain =
    'Posts one weekly world notice, then lets the player answer it through normal workshop work.';

  constructor({
    goldFacade,
    playerLevelFacade,
    tasksFacade,
    now = () => Date.now(),
  } = {}) {
    this.goldFacade = goldFacade;
    this.playerLevelFacade = playerLevelFacade;
    this.tasksFacade = tasksFacade;
    this.periodManager = new WorldNoticePeriodManager({ now });
    this.catalogManager = new WorldNoticeCatalogManager();
    this.progressManager = new WorldNoticeProgressManager();
    this.rewardManager = new WorldNoticeRewardManager({ goldFacade });
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

    const notice = this.ensureCurrentNotice();
    const result = this.progressManager.recordAction(notice, normalizedActionType, amount);
    const rewards = this.claimCompletedRequestRewards(result.completedRequests);

    return {
      ok: result.changed,
      changed: result.changed,
      rewards,
    };
  }

  donateGold(requestId) {
    if (!this.isUnlocked()) {
      return {
        ok: false,
        changed: false,
        reason: 'locked',
      };
    }

    const notice = this.ensureCurrentNotice();
    const request = (notice.requests ?? []).find(
      (candidate) =>
        candidate.requestId === requestId &&
        candidate.actionType === WORLD_NOTICE_ACTIONS.DONATE_GOLD,
    );

    if (!request) {
      return {
        ok: false,
        changed: false,
        reason: 'unknown_request',
      };
    }

    if (request.completed) {
      return {
        ok: false,
        changed: false,
        reason: 'completed',
      };
    }

    const remaining = Math.max(
      0,
      Math.floor(Number(request.requiredQuantity) || 0) -
        Math.floor(Number(request.progressQuantity) || 0),
    );
    const currentGold = Math.max(0, Math.floor(Number(this.goldFacade?.getSnapshot?.().current) || 0));
    const donation = Math.min(remaining, currentGold);

    if (donation <= 0) {
      return {
        ok: false,
        changed: false,
        reason: 'not_enough_gold',
        remaining,
        currentGold,
      };
    }

    if (!this.goldFacade?.canSpend?.(donation)) {
      return {
        ok: false,
        changed: false,
        reason: 'not_enough_gold',
        remaining,
        currentGold,
      };
    }

    this.goldFacade.spend(donation);
    const result = this.progressManager.applyProgress(request, donation);
    const rewards = result.completed ? this.claimCompletedRequestRewards([request]) : [];

    return {
      ok: result.changed,
      changed: result.changed,
      requestId,
      donatedGold: donation,
      rewards,
    };
  }

  getSnapshot() {
    const unlocked = this.isUnlocked();

    if (!unlocked) {
      return {
        unlocked: false,
        unlockLevel: WORLD_NOTICE_UNLOCK_LEVEL,
        current: null,
        archive: this.createArchiveSnapshot(),
      };
    }

    const notice = this.ensureCurrentNotice();

    return {
      unlocked: true,
      unlockLevel: WORLD_NOTICE_UNLOCK_LEVEL,
      current: this.createNoticeSnapshot(notice),
      archive: this.createArchiveSnapshot(),
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

    this.state = {
      version: 1,
      current: this.catalogManager.sanitizeNotice(snapshot.current),
      archive: Array.isArray(snapshot.archive)
        ? snapshot.archive
            .map((entry) => this.sanitizeArchiveEntry(entry))
            .filter(Boolean)
            .slice(0, WORLD_NOTICE_ARCHIVE_LIMIT)
        : [],
    };
  }

  ensureCurrentNotice() {
    const currentPeriod = this.periodManager.getCurrentPeriod();
    const storedNotice = this.state.current;

    if (storedNotice?.periodKey === currentPeriod.periodKey) {
      storedNotice.resetAtMs = currentPeriod.resetAtMs;
      return storedNotice;
    }

    if (storedNotice) {
      this.archiveNotice(storedNotice);
    }

    this.state.current = this.catalogManager.createNoticeState({
      ...currentPeriod,
      anchorLevel: this.getCurrentLevel(),
      completionCostGold: this.getCompletionCostGold(),
    });

    return this.state.current;
  }

  createNoticeSnapshot(notice) {
    const responseTier = this.progressManager.getResponseTier(notice);
    const requests = Array.isArray(notice?.requests) ? notice.requests : [];
    const completedRequests = requests.filter((request) => request.completed).length;
    const resetLabel = this.periodManager.formatResetLabel(notice.resetAtMs);

    return {
      version: 1,
      periodKey: notice.periodKey,
      weekIndex: notice.weekIndex,
      resetAtMs: notice.resetAtMs,
      resetLabel,
      anchorLevel: notice.anchorLevel,
      eventId: notice.eventId,
      family: notice.family,
      tags: [...(notice.tags ?? [])],
      headline: notice.headline,
      body: [...(notice.body ?? [])],
      completedRequests,
      totalRequests: requests.length,
      responseTier,
      responseLabel: this.getResponseLabel(responseTier),
      outcome: notice.outcomes?.[responseTier] ?? '',
      requests: requests.map((request) => this.createRequestSnapshot(request)),
    };
  }

  createRequestSnapshot(request) {
    const requiredQuantity = Math.max(1, Math.floor(Number(request.requiredQuantity) || 1));
    const progressQuantity = Math.max(
      0,
      Math.min(requiredQuantity, Math.floor(Number(request.progressQuantity) || 0)),
    );
    const completed = Boolean(request.completed) || progressQuantity >= requiredQuantity;
    const canDonate =
      request.actionType === WORLD_NOTICE_ACTIONS.DONATE_GOLD &&
      !completed &&
      Math.max(0, Math.floor(Number(this.goldFacade?.getSnapshot?.().current) || 0)) > 0;

    return {
      requestId: request.requestId,
      requestKey: request.requestKey,
      actionType: request.actionType,
      label: request.label,
      requiredQuantity,
      progressQuantity,
      remainingQuantity: Math.max(0, requiredQuantity - progressQuantity),
      progress: progressQuantity / requiredQuantity,
      completed,
      manual: request.actionType === WORLD_NOTICE_ACTIONS.DONATE_GOLD,
      canDonate,
      actionText: this.getRequestActionText({ request, completed, canDonate }),
      reward: {
        ...(request.reward ?? {}),
        text: this.rewardManager.formatRewardText(request.reward),
      },
      rewardClaimed: Boolean(request.rewardClaimed),
    };
  }

  getRequestActionText({ request, completed, canDonate }) {
    if (completed) {
      return 'done';
    }

    if (request.actionType === WORLD_NOTICE_ACTIONS.DONATE_GOLD) {
      return canDonate ? 'donate' : 'need gold';
    }

    return this.rewardManager.formatRewardText(request.reward);
  }

  claimCompletedRequestRewards(requests) {
    const rewards = [];

    for (const request of requests ?? []) {
      if (!request || request.rewardClaimed) {
        continue;
      }

      request.rewardClaimed = true;
      rewards.push({
        requestId: request.requestId,
        label: request.label,
        ...this.rewardManager.grantReward(request.reward),
      });
    }

    return rewards;
  }

  archiveNotice(notice) {
    const responseTier = this.progressManager.getResponseTier(notice);
    const entry = {
      periodKey: notice.periodKey,
      eventId: notice.eventId,
      headline: notice.headline,
      responseTier,
      responseLabel: this.getResponseLabel(responseTier),
      outcome: notice.outcomes?.[responseTier] ?? notice.archive ?? '',
      archive: notice.archive ?? '',
    };

    this.state.archive = [
      entry,
      ...(Array.isArray(this.state.archive) ? this.state.archive : []),
    ].slice(0, WORLD_NOTICE_ARCHIVE_LIMIT);
  }

  createArchiveSnapshot() {
    return (this.state.archive ?? []).map((entry) => ({
      ...entry,
    }));
  }

  sanitizeArchiveEntry(entry) {
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    const periodKey = typeof entry.periodKey === 'string' ? entry.periodKey : '';
    const eventId = typeof entry.eventId === 'string' ? entry.eventId : '';
    const headline = typeof entry.headline === 'string' ? entry.headline : '';

    if (!periodKey || !eventId || !headline) {
      return null;
    }

    const responseTier =
      typeof entry.responseTier === 'string' ? entry.responseTier : 'small';

    return {
      periodKey,
      eventId,
      headline,
      responseTier,
      responseLabel:
        typeof entry.responseLabel === 'string'
          ? entry.responseLabel
          : this.getResponseLabel(responseTier),
      outcome: typeof entry.outcome === 'string' ? entry.outcome : '',
      archive: typeof entry.archive === 'string' ? entry.archive : '',
    };
  }

  getResponseLabel(responseTier) {
    if (responseTier === 'strong') {
      return 'strong response';
    }

    if (responseTier === 'steady') {
      return 'steady response';
    }

    return 'small response';
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

  getCompletionCostGold() {
    const cost = this.tasksFacade?.getLevelCompletionCostGold?.(this.getCurrentLevel());

    if (Number.isFinite(cost) && cost >= 0) {
      return Math.floor(cost);
    }

    const level = this.getCurrentLevel();
    return Math.max(0, Math.floor(level * level * 10));
  }

  isUnlocked() {
    return this.getCurrentLevel() >= WORLD_NOTICE_UNLOCK_LEVEL;
  }

  createEmptyState() {
    return {
      version: 1,
      current: null,
      archive: [],
    };
  }

  clone(value) {
    return JSON.parse(JSON.stringify(value ?? null));
  }
}
