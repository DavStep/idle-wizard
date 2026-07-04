const DEFAULT_SYNC_INTERVAL_MS = 60_000;
const DEFAULT_MIN_SYNC_DELTA_COIN = 100;

export class LeaderboardGeneratedCoinSyncManager {
  constructor({
    syncIntervalMs = DEFAULT_SYNC_INTERVAL_MS,
    minSyncDeltaCoin = DEFAULT_MIN_SYNC_DELTA_COIN,
    setTimeoutFn = globalThis.setTimeout?.bind(globalThis),
    clearTimeoutFn = globalThis.clearTimeout?.bind(globalThis),
    now = () => Date.now(),
  } = {}) {
    this.connection = null;
    this.gameplayFacade = null;
    this.unsubscribe = null;
    this.lastObservedTotalGeneratedCoin = null;
    this.lastQueuedTotalGeneratedCoin = null;
    this.pendingTotalGeneratedCoin = null;
    this.syncPromise = null;
    this.syncIntervalMs = syncIntervalMs;
    this.minSyncDeltaCoin = this.normalizeMinSyncDeltaCoin(minSyncDeltaCoin);
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
    this.lastObservedTotalGeneratedCoin = null;
    this.lastQueuedTotalGeneratedCoin = null;

    if (!gameplayFacade) {
      return;
    }

    this.unsubscribe = gameplayFacade.subscribe((snapshot) => this.observe(snapshot));
    this.observe(gameplayFacade.getSnapshot());
  }

  connect(connection) {
    this.connection = connection;
    this.queueCurrentTotalGeneratedCoin({ force: true });
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
      this.pendingTotalGeneratedCoin = null;
      this.lastQueuedTotalGeneratedCoin = null;
      this.lastObservedTotalGeneratedCoin = null;
      return;
    }

    this.lastObservedTotalGeneratedCoin = null;
    this.queueCurrentTotalGeneratedCoin({ force: true });
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

    const totalGeneratedCoin = this.readTotalGeneratedCoin(snapshot);
    if (!Number.isFinite(totalGeneratedCoin)) {
      return;
    }

    const flooredTotalGeneratedCoin = Math.floor(totalGeneratedCoin);
    if (flooredTotalGeneratedCoin === this.lastObservedTotalGeneratedCoin) {
      return;
    }

    this.lastObservedTotalGeneratedCoin = flooredTotalGeneratedCoin;

    if (flooredTotalGeneratedCoin > 0) {
      this.queue(flooredTotalGeneratedCoin);
    }
  }

  queue(totalGeneratedCoin, { force = false } = {}) {
    if (!force && !this.shouldQueue(totalGeneratedCoin)) {
      return;
    }

    this.lastQueuedTotalGeneratedCoin = Math.max(
      this.lastQueuedTotalGeneratedCoin ?? 0,
      totalGeneratedCoin,
    );
    this.pendingTotalGeneratedCoin = Math.max(
      this.pendingTotalGeneratedCoin ?? 0,
      totalGeneratedCoin,
    );
    this.flush();
  }

  shouldQueue(totalGeneratedCoin) {
    if (this.lastQueuedTotalGeneratedCoin === null) {
      return true;
    }

    if (totalGeneratedCoin <= this.lastQueuedTotalGeneratedCoin) {
      return false;
    }

    if (this.minSyncDeltaCoin <= 0) {
      return true;
    }

    return totalGeneratedCoin - this.lastQueuedTotalGeneratedCoin >= this.minSyncDeltaCoin;
  }

  flush({ force = false } = {}) {
    if (this.syncPromise || this.pendingTotalGeneratedCoin === null || !this.connection) {
      return;
    }

    if (!this.readyToSync) {
      return;
    }

    if (!force && !this.canSyncNow()) {
      this.scheduleFlush();
      return;
    }

    const reducer = this.findSetTotalGeneratedCoinReducer();
    if (!reducer) {
      return;
    }

    const totalGeneratedCoin = this.pendingTotalGeneratedCoin;
    this.pendingTotalGeneratedCoin = null;
    this.clearSyncTimer();
    this.lastSyncStartedAtMs = this.now();

    let syncResult;
    try {
      syncResult = reducer.call({
        [reducer.paramName]: BigInt(totalGeneratedCoin),
      });
    } catch {
      this.restorePending(totalGeneratedCoin);
      return;
    }

    this.syncPromise = Promise.resolve(syncResult)
      .catch(() => {
        this.restorePending(totalGeneratedCoin);
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

  restorePending(totalGeneratedCoin) {
    this.pendingTotalGeneratedCoin = Math.max(
      this.pendingTotalGeneratedCoin ?? 0,
      totalGeneratedCoin,
    );
  }

  queueCurrentTotalGeneratedCoin({ force = false } = {}) {
    if (!this.readyToSync) {
      return;
    }

    const totalGeneratedCoin = this.readTotalGeneratedCoin(this.gameplayFacade?.getSnapshot?.());
    if (!Number.isFinite(totalGeneratedCoin)) {
      return;
    }

    const flooredTotalGeneratedCoin = Math.floor(totalGeneratedCoin);
    if (flooredTotalGeneratedCoin > 0) {
      this.queue(flooredTotalGeneratedCoin, { force });
    }
  }

  normalizeMinSyncDeltaCoin(value) {
    return Number.isFinite(value)
      ? Math.max(0, Math.floor(value))
      : DEFAULT_MIN_SYNC_DELTA_COIN;
  }

  readTotalGeneratedCoin(snapshot) {
    const coin = snapshot?.coin ?? snapshot?.gold;

    if (Number.isFinite(coin?.totalGenerated)) {
      return coin.totalGenerated;
    }

    if (Number.isFinite(coin?.totalGeneratedCoin)) {
      return coin.totalGeneratedCoin;
    }

    return null;
  }

  findSetTotalGeneratedCoinReducer() {
    const reducers = this.connection?.reducers;
    const call =
      reducers?.setTotalGeneratedCoin ?? reducers?.set_total_generated_coin ?? null;
    if (call) {
      return { call, paramName: 'totalGeneratedCoin' };
    }

    const legacyCall =
      reducers?.setTotalGeneratedGold ?? reducers?.set_total_generated_gold ?? null;
    return legacyCall ? { call: legacyCall, paramName: 'totalGeneratedGold' } : null;
  }
}
