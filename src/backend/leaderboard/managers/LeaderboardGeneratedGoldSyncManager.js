const DEFAULT_SYNC_INTERVAL_MS = 60_000;
const DEFAULT_MIN_SYNC_DELTA_GOLD = 100;

export class LeaderboardGeneratedGoldSyncManager {
  constructor({
    syncIntervalMs = DEFAULT_SYNC_INTERVAL_MS,
    minSyncDeltaGold = DEFAULT_MIN_SYNC_DELTA_GOLD,
    setTimeoutFn = globalThis.setTimeout?.bind(globalThis),
    clearTimeoutFn = globalThis.clearTimeout?.bind(globalThis),
    now = () => Date.now(),
  } = {}) {
    this.connection = null;
    this.gameplayFacade = null;
    this.unsubscribe = null;
    this.lastObservedTotalGeneratedGold = null;
    this.lastQueuedTotalGeneratedGold = null;
    this.pendingTotalGeneratedGold = null;
    this.syncPromise = null;
    this.syncIntervalMs = syncIntervalMs;
    this.minSyncDeltaGold = this.normalizeMinSyncDeltaGold(minSyncDeltaGold);
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.now = now;
    this.lastSyncStartedAtMs = Number.NEGATIVE_INFINITY;
    this.syncTimerId = null;
  }

  setGameplayFacade(gameplayFacade) {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.gameplayFacade = gameplayFacade;
    this.lastObservedTotalGeneratedGold = null;
    this.lastQueuedTotalGeneratedGold = null;

    if (!gameplayFacade) {
      return;
    }

    this.unsubscribe = gameplayFacade.subscribe((snapshot) => this.observe(snapshot));
    this.observe(gameplayFacade.getSnapshot());
  }

  connect(connection) {
    this.connection = connection;
    this.queueCurrentTotalGeneratedGold();
    this.flush({ force: true });
  }

  disconnect() {
    this.clearSyncTimer();
    this.syncPromise = null;
    this.connection = null;
  }

  dispose() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.gameplayFacade = null;
    this.disconnect();
  }

  observe(snapshot) {
    const totalGeneratedGold = this.readTotalGeneratedGold(snapshot);
    if (!Number.isFinite(totalGeneratedGold)) {
      return;
    }

    const flooredTotalGeneratedGold = Math.floor(totalGeneratedGold);
    if (flooredTotalGeneratedGold === this.lastObservedTotalGeneratedGold) {
      return;
    }

    this.lastObservedTotalGeneratedGold = flooredTotalGeneratedGold;

    if (flooredTotalGeneratedGold > 0) {
      this.queue(flooredTotalGeneratedGold);
    }
  }

  queue(totalGeneratedGold, { force = false } = {}) {
    if (!force && !this.shouldQueue(totalGeneratedGold)) {
      return;
    }

    this.lastQueuedTotalGeneratedGold = Math.max(
      this.lastQueuedTotalGeneratedGold ?? 0,
      totalGeneratedGold,
    );
    this.pendingTotalGeneratedGold = Math.max(
      this.pendingTotalGeneratedGold ?? 0,
      totalGeneratedGold,
    );
    this.flush();
  }

  shouldQueue(totalGeneratedGold) {
    if (this.lastQueuedTotalGeneratedGold === null) {
      return true;
    }

    if (totalGeneratedGold <= this.lastQueuedTotalGeneratedGold) {
      return false;
    }

    if (this.minSyncDeltaGold <= 0) {
      return true;
    }

    return totalGeneratedGold - this.lastQueuedTotalGeneratedGold >= this.minSyncDeltaGold;
  }

  flush({ force = false } = {}) {
    if (this.syncPromise || this.pendingTotalGeneratedGold === null || !this.connection) {
      return;
    }

    if (!force && !this.canSyncNow()) {
      this.scheduleFlush();
      return;
    }

    const setTotalGeneratedGold = this.findSetTotalGeneratedGoldReducer();
    if (!setTotalGeneratedGold) {
      return;
    }

    const totalGeneratedGold = this.pendingTotalGeneratedGold;
    this.pendingTotalGeneratedGold = null;
    this.clearSyncTimer();
    this.lastSyncStartedAtMs = this.now();

    let syncResult;
    try {
      syncResult = setTotalGeneratedGold({ totalGeneratedGold: BigInt(totalGeneratedGold) });
    } catch {
      this.restorePending(totalGeneratedGold);
      return;
    }

    this.syncPromise = Promise.resolve(syncResult)
      .catch(() => {
        this.restorePending(totalGeneratedGold);
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

  restorePending(totalGeneratedGold) {
    this.pendingTotalGeneratedGold = Math.max(
      this.pendingTotalGeneratedGold ?? 0,
      totalGeneratedGold,
    );
  }

  queueCurrentTotalGeneratedGold() {
    const totalGeneratedGold = this.readTotalGeneratedGold(this.gameplayFacade?.getSnapshot?.());
    if (!Number.isFinite(totalGeneratedGold)) {
      return;
    }

    const flooredTotalGeneratedGold = Math.floor(totalGeneratedGold);
    if (flooredTotalGeneratedGold > 0) {
      this.queue(flooredTotalGeneratedGold, { force: true });
    }
  }

  normalizeMinSyncDeltaGold(value) {
    return Number.isFinite(value)
      ? Math.max(0, Math.floor(value))
      : DEFAULT_MIN_SYNC_DELTA_GOLD;
  }

  readTotalGeneratedGold(snapshot) {
    const gold = snapshot?.gold;

    if (Number.isFinite(gold?.totalGenerated)) {
      return gold.totalGenerated;
    }

    if (Number.isFinite(gold?.totalGeneratedGold)) {
      return gold.totalGeneratedGold;
    }

    return null;
  }

  findSetTotalGeneratedGoldReducer() {
    const reducers = this.connection?.reducers;
    return reducers?.setTotalGeneratedGold ?? reducers?.set_total_generated_gold ?? null;
  }
}
