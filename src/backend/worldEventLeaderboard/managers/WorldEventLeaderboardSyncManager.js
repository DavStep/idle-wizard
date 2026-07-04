const DEFAULT_SYNC_INTERVAL_MS = 30_000;

export class WorldEventLeaderboardSyncManager {
  constructor({
    syncIntervalMs = DEFAULT_SYNC_INTERVAL_MS,
    setTimeoutFn = globalThis.setTimeout?.bind(globalThis),
    clearTimeoutFn = globalThis.clearTimeout?.bind(globalThis),
    now = () => Date.now(),
  } = {}) {
    this.connection = null;
    this.gameplayFacade = null;
    this.unsubscribe = null;
    this.lastObservedContribution = null;
    this.lastQueuedContribution = null;
    this.pendingContribution = null;
    this.syncPromise = null;
    this.syncIntervalMs = syncIntervalMs;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.now = now;
    this.lastSyncStartedAtMs = Number.NEGATIVE_INFINITY;
    this.syncTimerId = null;
    this.readyToSync = false;
  }

  setGameplayFacade(gameplayFacade) {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.gameplayFacade = gameplayFacade;
    this.lastObservedContribution = null;
    this.lastQueuedContribution = null;

    if (!gameplayFacade) {
      return;
    }

    this.unsubscribe = gameplayFacade.subscribe((snapshot) => this.observe(snapshot));
    this.observe(gameplayFacade.getSnapshot());
  }

  connect(connection) {
    this.connection = connection;
    this.queueCurrentContribution({ force: true });
    this.flush({ force: true });
  }

  disconnect() {
    this.clearSyncTimer();
    this.syncPromise = null;
    this.connection = null;
    this.readyToSync = false;
  }

  setReadyToSync(ready = true) {
    this.readyToSync = Boolean(ready);

    if (!this.readyToSync) {
      this.clearSyncTimer();
      this.pendingContribution = null;
      this.lastQueuedContribution = null;
      this.lastObservedContribution = null;
      return;
    }

    this.lastObservedContribution = null;
    this.queueCurrentContribution({ force: true });
    this.flush({ force: true });
  }

  dispose() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.gameplayFacade = null;
    this.disconnect();
  }

  observe(snapshot) {
    if (!this.readyToSync) {
      return;
    }

    const contribution = this.readContribution(snapshot);
    if (!contribution) {
      return;
    }

    if (this.isSameContribution(contribution, this.lastObservedContribution)) {
      return;
    }

    this.lastObservedContribution = contribution;

    if (contribution.points > 0) {
      this.queue(contribution);
    }
  }

  queue(contribution, { force = false } = {}) {
    if (!force && !this.shouldQueue(contribution)) {
      return;
    }

    this.lastQueuedContribution = this.mergeContribution(
      this.lastQueuedContribution,
      contribution,
    );
    this.pendingContribution = this.mergeContribution(
      this.pendingContribution,
      contribution,
    );
    this.flush();
  }

  shouldQueue(contribution) {
    if (!this.lastQueuedContribution) {
      return true;
    }

    if (!this.isSameEvent(contribution, this.lastQueuedContribution)) {
      return true;
    }

    return contribution.points > this.lastQueuedContribution.points;
  }

  flush({ force = false } = {}) {
    if (this.syncPromise || !this.pendingContribution || !this.connection) {
      return;
    }

    if (!this.readyToSync) {
      return;
    }

    if (!force && !this.canSyncNow()) {
      this.scheduleFlush();
      return;
    }

    const reducer = this.findSetWorldEventContributionPointsReducer();
    if (!reducer) {
      return;
    }

    const contribution = this.pendingContribution;
    this.pendingContribution = null;
    this.clearSyncTimer();
    this.lastSyncStartedAtMs = this.now();

    let syncResult;
    try {
      syncResult = reducer({
        periodKey: contribution.periodKey,
        eventId: contribution.eventId,
        points: BigInt(contribution.points),
      });
    } catch {
      this.restorePending(contribution);
      return;
    }

    this.syncPromise = Promise.resolve(syncResult)
      .catch(() => {
        this.restorePending(contribution);
      })
      .finally(() => {
        this.syncPromise = null;
        this.flush();
      });
  }

  canSyncNow() {
    if (!Number.isFinite(this.syncIntervalMs) || this.syncIntervalMs <= 0) {
      return true;
    }

    return this.now() - this.lastSyncStartedAtMs >= this.syncIntervalMs;
  }

  scheduleFlush() {
    if (
      this.syncTimerId !== null ||
      typeof this.setTimeoutFn !== 'function' ||
      !Number.isFinite(this.syncIntervalMs) ||
      this.syncIntervalMs <= 0
    ) {
      return;
    }

    const elapsedMs = this.now() - this.lastSyncStartedAtMs;
    const delayMs = Math.max(0, this.syncIntervalMs - elapsedMs);
    this.syncTimerId = this.setTimeoutFn(() => {
      this.syncTimerId = null;
      this.flush();
    }, delayMs);
  }

  clearSyncTimer() {
    if (this.syncTimerId === null) {
      return;
    }

    this.clearTimeoutFn?.(this.syncTimerId);
    this.syncTimerId = null;
  }

  restorePending(contribution) {
    this.pendingContribution = this.mergeContribution(
      this.pendingContribution,
      contribution,
    );
  }

  queueCurrentContribution({ force = false } = {}) {
    if (!this.readyToSync) {
      return;
    }

    const contribution = this.readContribution(this.gameplayFacade?.getSnapshot?.());
    if (!contribution || contribution.points <= 0) {
      return;
    }

    this.queue(contribution, { force });
  }

  readContribution(snapshot) {
    const notice = snapshot?.worldNotice?.current;
    const periodKey = String(notice?.periodKey ?? '').trim();
    const eventId = String(notice?.eventId ?? '').trim();
    const points = Math.max(
      0,
      Math.floor(Number(notice?.leaderboard?.currentPoints) || 0),
    );

    if (!periodKey || !eventId || !Number.isFinite(points)) {
      return null;
    }

    return {
      periodKey,
      eventId,
      points,
    };
  }

  mergeContribution(previous, next) {
    if (!next) {
      return previous;
    }

    if (!previous || !this.isSameEvent(previous, next)) {
      return { ...next };
    }

    return {
      ...next,
      points: Math.max(previous.points, next.points),
    };
  }

  isSameContribution(left, right) {
    return (
      this.isSameEvent(left, right) &&
      Math.floor(Number(left?.points) || 0) === Math.floor(Number(right?.points) || 0)
    );
  }

  isSameEvent(left, right) {
    return (
      Boolean(left) &&
      Boolean(right) &&
      left.periodKey === right.periodKey &&
      left.eventId === right.eventId
    );
  }

  findSetWorldEventContributionPointsReducer() {
    const reducers = this.connection?.reducers;
    return (
      reducers?.setWorldEventContributionPoints ??
      reducers?.set_world_event_contribution_points ??
      null
    );
  }
}
