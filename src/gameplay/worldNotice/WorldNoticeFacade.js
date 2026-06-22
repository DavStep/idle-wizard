import {
  WORLD_NOTICE_ACTIONS,
  WORLD_NOTICE_STATE_VERSION,
  WORLD_NOTICE_UNLOCK_LEVEL,
  WorldNoticeCatalogManager,
} from './managers/WorldNoticeCatalogManager.js';
import { WorldNoticeContributionManager } from './managers/WorldNoticeContributionManager.js';
import { WorldNoticePeriodManager } from './managers/WorldNoticePeriodManager.js';
import { WorldNoticeProgressManager } from './managers/WorldNoticeProgressManager.js';

const WORLD_NOTICE_ARCHIVE_LIMIT = 12;

export { WORLD_NOTICE_ACTIONS, WORLD_NOTICE_UNLOCK_LEVEL };

export class WorldNoticeFacade {
  static explain =
    'Posts one weekly world event, then lets the player answer it through normal workshop work.';

  constructor({
    coinFacade,
    playerLevelFacade,
    tasksFacade,
    now = () => Date.now(),
  } = {}) {
    this.coinFacade = coinFacade;
    this.playerLevelFacade = playerLevelFacade;
    this.tasksFacade = tasksFacade;
    this.periodManager = new WorldNoticePeriodManager({ now });
    this.catalogManager = new WorldNoticeCatalogManager();
    this.contributionManager = new WorldNoticeContributionManager();
    this.progressManager = new WorldNoticeProgressManager();
    this.state = this.createEmptyState();
  }

  recordAction(actionType, quantity = 1, detail = {}) {
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
    let pointsAdded = 0;

    for (const update of result.requests ?? []) {
      const requestPoints = this.contributionManager.getPointsForProgress(
        normalizedActionType,
        update.previousProgress,
        update.nextProgress,
        detail,
      );
      pointsAdded += this.contributionManager.addRequestPoints(
        update.request,
        requestPoints,
      );
    }

    this.contributionManager.addPoints(notice, pointsAdded);

    return {
      ok: result.changed,
      changed: result.changed,
      pointsAdded,
    };
  }

  donateCoin(requestId) {
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
        candidate.actionType === WORLD_NOTICE_ACTIONS.DONATE_COIN,
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
    const currentCoin = Math.max(0, Math.floor(Number(this.coinFacade?.getSnapshot?.().current) || 0));
    const donation = Math.min(remaining, currentCoin);

    if (donation <= 0) {
      return {
        ok: false,
        changed: false,
        reason: 'not_enough_coin',
        remaining,
        currentCoin,
      };
    }

    if (!this.coinFacade?.canSpend?.(donation)) {
      return {
        ok: false,
        changed: false,
        reason: 'not_enough_coin',
        remaining,
        currentCoin,
      };
    }

    this.coinFacade.spend(donation);
    const result = this.progressManager.applyProgress(request, donation);
    const pointsAdded = this.contributionManager.addRequestPoints(
      request,
      this.contributionManager.getPointsForProgress(
        WORLD_NOTICE_ACTIONS.DONATE_COIN,
        result.previousProgress,
        result.nextProgress,
      ),
    );
    this.contributionManager.addPoints(notice, pointsAdded);

    return {
      ok: result.changed,
      changed: result.changed,
      requestId,
      donatedCoin: donation,
      pointsAdded,
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
      version: WORLD_NOTICE_STATE_VERSION,
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

    if (
      storedNotice?.periodKey === currentPeriod.periodKey &&
      storedNotice.version === WORLD_NOTICE_STATE_VERSION
    ) {
      storedNotice.resetAtMs = currentPeriod.resetAtMs;
      return storedNotice;
    }

    if (storedNotice && storedNotice.version === WORLD_NOTICE_STATE_VERSION) {
      this.archiveNotice(storedNotice);
    }

    this.state.current = this.catalogManager.createNoticeState({
      ...currentPeriod,
      anchorLevel: this.getCurrentLevel(),
      completionCostCoin: this.getCompletionCostCoin(),
    });

    return this.state.current;
  }

  createNoticeSnapshot(notice) {
    const responseTier = this.progressManager.getResponseTier(notice);
    const requests = Array.isArray(notice?.requests) ? notice.requests : [];
    const completedRequests = requests.filter((request) => request.completed).length;
    const resetLabel = this.periodManager.formatResetLabel(notice.resetAtMs);

    return {
      version: WORLD_NOTICE_STATE_VERSION,
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
      leaderboard: this.contributionManager.createLeaderboardSnapshot(
        notice.contributionPoints,
      ),
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
    const contributionPoints = Math.max(
      0,
      Math.floor(Number(request.contributionPoints) || 0),
    );
    const canDonate =
      request.actionType === WORLD_NOTICE_ACTIONS.DONATE_COIN &&
      !completed &&
      Math.max(0, Math.floor(Number(this.coinFacade?.getSnapshot?.().current) || 0)) > 0;

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
      contributionPoints,
      pointText: this.contributionManager.getActionPointText(request.actionType),
      collectedPointText: this.formatPoints(contributionPoints),
      manual: request.actionType === WORLD_NOTICE_ACTIONS.DONATE_COIN,
      canDonate,
      actionText: this.getRequestActionText({ request, completed, canDonate }),
    };
  }

  getRequestActionText({ request, completed, canDonate }) {
    if (completed) {
      return 'done';
    }

    if (request.actionType === WORLD_NOTICE_ACTIONS.DONATE_COIN) {
      return canDonate ? 'send coin' : 'need coin';
    }

    return this.contributionManager.getActionPointText(request.actionType);
  }

  archiveNotice(notice) {
    const responseTier = this.progressManager.getResponseTier(notice);
    const entry = {
      periodKey: notice.periodKey,
      eventId: notice.eventId,
      headline: notice.headline,
      responseTier,
      responseLabel: this.getResponseLabel(responseTier),
      contributionPoints: Math.max(0, Math.floor(Number(notice.contributionPoints) || 0)),
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
      contributionPoints: Math.max(0, Math.floor(Number(entry.contributionPoints) || 0)),
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

  formatPoints(points) {
    const safePoints = Math.max(0, Math.floor(Number(points) || 0));
    return `${safePoints} point${safePoints === 1 ? '' : 's'}`;
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

  getCompletionCostCoin() {
    const cost = this.tasksFacade?.getLevelCompletionCostCoin?.(this.getCurrentLevel());

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
      version: WORLD_NOTICE_STATE_VERSION,
      current: null,
      archive: [],
    };
  }

  clone(value) {
    return JSON.parse(JSON.stringify(value ?? null));
  }
}
