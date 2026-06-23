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
    itemsFacade,
    playerLevelFacade,
    tasksFacade,
    now = () => Date.now(),
  } = {}) {
    this.coinFacade = coinFacade;
    this.itemsFacade = itemsFacade;
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
    let pointsAdded = 0;
    let scoringChanged = false;

    for (const request of notice.requests ?? []) {
      if (request.actionType !== normalizedActionType) {
        continue;
      }

      scoringChanged = true;
      pointsAdded += this.contributionManager.addRequestActionPoints(
        request,
        normalizedActionType,
        amount,
        detail,
      );
    }

    const result = this.progressManager.recordAction(notice, normalizedActionType, amount);
    this.contributionManager.addPoints(notice, pointsAdded);

    return {
      ok: result.changed || scoringChanged,
      changed: result.changed || scoringChanged,
      pointsAdded,
    };
  }

  donateCoin(requestId, quantity = null) {
    return this.donateResource(requestId, 'coin', quantity);
  }

  donateResource(requestId, optionKey, quantity = null) {
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
        candidate.requestId === requestId && this.isDonationRequest(candidate),
    );

    if (!request) {
      return {
        ok: false,
        changed: false,
        reason: 'unknown_request',
      };
    }

    const option = this.getDonationOption(request, optionKey);

    if (!option) {
      return {
        ok: false,
        changed: false,
        reason: 'unknown_option',
      };
    }

    const availableQuantity = this.getDonationAvailableQuantity(option);
    const requestedDonation =
      quantity === null || typeof quantity === 'undefined'
        ? null
        : Math.floor(Number(quantity));

    if (
      requestedDonation !== null &&
      (!Number.isInteger(requestedDonation) || requestedDonation <= 0)
    ) {
      return {
        ok: false,
        changed: false,
        reason: 'bad_amount',
        availableQuantity,
      };
    }

    const donation = Math.min(availableQuantity, requestedDonation ?? availableQuantity);

    if (donation <= 0) {
      return {
        ok: false,
        changed: false,
        reason: this.getDonationEmptyReason(option),
        availableQuantity,
      };
    }

    if (!this.canSpendDonation(option, donation)) {
      return {
        ok: false,
        changed: false,
        reason: this.getDonationEmptyReason(option),
        availableQuantity,
      };
    }

    const spent = this.spendDonation(option, donation);

    if (!spent) {
      return {
        ok: false,
        changed: false,
        reason: this.getDonationEmptyReason(option),
        availableQuantity,
      };
    }

    const pointsAdded = this.contributionManager.getPointsForDonationOption(
      option,
      donation,
    );
    this.contributionManager.addRequestPoints(request, pointsAdded);
    this.addDonationProgress(request, option, donation, pointsAdded);
    this.progressManager.applyProgress(request, pointsAdded);
    this.contributionManager.addPoints(notice, pointsAdded);

    const result = {
      ok: true,
      changed: true,
      requestId,
      optionKey: option.optionKey,
      donatedQuantity: donation,
      pointsAdded,
    };

    if (option.resourceType === 'coin') {
      result.donatedCoin = donation;
    }

    if (option.resourceType === 'item') {
      result.donatedItem = {
        itemKey: option.itemKey,
        label: option.label,
        quantity: donation,
      };
    }

    return result;
  }

  isDonationRequest(request = {}) {
    return (
      request.actionType === WORLD_NOTICE_ACTIONS.DONATE_COIN ||
      request.actionType === WORLD_NOTICE_ACTIONS.DONATE_RESOURCES ||
      Array.isArray(request.donationOptions)
    );
  }

  getDonationOption(request = {}, optionKey = '') {
    const safeOptionKey = String(optionKey ?? '').trim();
    const options = this.getDonationOptions(request);

    if (!safeOptionKey && options.length === 1) {
      return options[0];
    }

    return options.find((option) => option.optionKey === safeOptionKey) ?? null;
  }

  getDonationOptions(request = {}) {
    if (Array.isArray(request.donationOptions) && request.donationOptions.length) {
      return request.donationOptions;
    }

    if (request.actionType === WORLD_NOTICE_ACTIONS.DONATE_COIN) {
      return [
        {
          optionKey: 'coin',
          resourceType: 'coin',
          label: 'coin',
          pointsPerUnit: 1,
        },
      ];
    }

    return [];
  }

  getDonationAvailableQuantity(option = {}) {
    if (option.resourceType === 'coin') {
      return Math.max(
        0,
        Math.floor(Number(this.coinFacade?.getSnapshot?.().current) || 0),
      );
    }

    if (option.resourceType === 'item') {
      const item = this.getDonationItemDefinition(option);

      if (!item) {
        return 0;
      }

      return Math.max(0, Math.floor(Number(this.itemsFacade?.getItemQuantity?.(item.id)) || 0));
    }

    return 0;
  }

  getDonationItemDefinition(option = {}) {
    if (!option.itemKey) {
      return null;
    }

    try {
      return this.itemsFacade?.getItemDefinitionByKey?.(option.itemKey) ?? null;
    } catch {
      return null;
    }
  }

  canSpendDonation(option = {}, quantity = 0) {
    if (option.resourceType === 'coin') {
      return this.coinFacade?.canSpend?.(quantity) === true;
    }

    if (option.resourceType === 'item') {
      return this.getDonationAvailableQuantity(option) >= quantity;
    }

    return false;
  }

  spendDonation(option = {}, quantity = 0) {
    if (option.resourceType === 'coin') {
      return this.coinFacade?.spend?.(quantity) === true;
    }

    if (option.resourceType === 'item') {
      const item = this.getDonationItemDefinition(option);

      if (!item) {
        return false;
      }

      return Boolean(this.itemsFacade?.removeItem?.(item.id, quantity));
    }

    return false;
  }

  addDonationProgress(request = {}, option = {}, quantity = 0, points = 0) {
    if (!request.donationProgress || typeof request.donationProgress !== 'object') {
      request.donationProgress = {};
    }

    const optionKey = option.optionKey;
    const previous = request.donationProgress[optionKey] ?? {};
    request.donationProgress[optionKey] = {
      quantity: Math.max(0, Math.floor(Number(previous.quantity) || 0)) + quantity,
      points: Math.max(0, Math.floor(Number(previous.points) || 0)) + points,
    };
    request.pointProgressQuantity =
      Math.max(0, Math.floor(Number(request.pointProgressQuantity) || 0)) + points;
  }

  getDonationEmptyReason(option = {}) {
    return option.resourceType === 'coin' ? 'not_enough_coin' : 'not_enough_items';
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
    const contributedQuantity =
      this.contributionManager.getRequestPointProgressQuantity(request);
    const remainingQuantity = Math.max(0, requiredQuantity - progressQuantity);
    const currentCoin = Math.max(
      0,
      Math.floor(Number(this.coinFacade?.getSnapshot?.().current) || 0),
    );
    const donationOptions = this.createDonationOptionSnapshots(request);
    const maxOptionDonateQuantity = donationOptions.reduce(
      (max, option) => Math.max(max, option.maxDonateQuantity),
      0,
    );
    const availableQuantity =
      request.actionType === WORLD_NOTICE_ACTIONS.DONATE_COIN
        ? currentCoin
        : maxOptionDonateQuantity;
    const maxDonateQuantity =
      request.actionType === WORLD_NOTICE_ACTIONS.DONATE_COIN
        ? currentCoin
        : maxOptionDonateQuantity;
    const canDonate =
      this.isDonationRequest(request) &&
      donationOptions.some((option) => option.maxDonateQuantity > 0);

    return {
      requestId: request.requestId,
      requestKey: request.requestKey,
      actionType: request.actionType,
      label: request.label,
      title: request.title ?? request.label,
      situation: request.situation ?? '',
      description: request.description ?? '',
      requiredQuantity,
      progressQuantity,
      contributedQuantity,
      remainingQuantity,
      progress: progressQuantity / requiredQuantity,
      completed,
      contributionPoints,
      pointText: this.contributionManager.getActionPointText(request.actionType),
      collectedPointText: this.formatPoints(contributionPoints),
      manual: this.isDonationRequest(request),
      canDonate,
      availableQuantity,
      maxDonateQuantity,
      donationOptions,
      actionText: this.getRequestActionText({ request, completed, canDonate }),
    };
  }

  createDonationOptionSnapshots(request = {}) {
    return this.getDonationOptions(request).map((option) =>
      this.createDonationOptionSnapshot(request, option),
    );
  }

  createDonationOptionSnapshot(request = {}, option = {}) {
    const progress = request.donationProgress?.[option.optionKey] ?? {};
    const itemDefinition =
      option.resourceType === 'item' ? this.getDonationItemDefinition(option) : null;
    const label = itemDefinition?.label ?? option.label;
    const availableQuantity = this.getDonationAvailableQuantity(option);
    const contributedQuantity = Math.max(0, Math.floor(Number(progress.quantity) || 0));
    const contributionPoints = Math.max(0, Math.floor(Number(progress.points) || 0));

    return {
      optionKey: option.optionKey,
      resourceType: option.resourceType,
      itemKey: option.itemKey ?? null,
      itemTypeId: itemDefinition?.id ?? null,
      itemKind: itemDefinition?.kind ?? null,
      label,
      pointsPerUnit: Math.max(0, Math.floor(Number(option.pointsPerUnit) || 0)),
      pointText: `${this.formatPoints(option.pointsPerUnit)} each`,
      availableQuantity,
      maxDonateQuantity: availableQuantity,
      contributedQuantity,
      contributionPoints,
      collectedPointText: this.formatPoints(contributionPoints),
      canDonate: availableQuantity > 0,
    };
  }

  getRequestActionText({ request, completed, canDonate }) {
    if (completed && !this.isDonationRequest(request)) {
      return 'done';
    }

    if (this.isDonationRequest(request)) {
      return canDonate ? 'donate' : 'need items';
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
