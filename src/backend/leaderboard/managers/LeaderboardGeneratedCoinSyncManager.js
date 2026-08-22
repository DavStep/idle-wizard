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
    if (totalGeneratedCoin === null) {
      return;
    }

    if (totalGeneratedCoin === this.lastObservedTotalGeneratedCoin) {
      return;
    }

    this.lastObservedTotalGeneratedCoin = totalGeneratedCoin;

    if (totalGeneratedCoin > 0n) {
      this.queue(totalGeneratedCoin);
    }
  }

  queue(totalGeneratedCoin, { force = false } = {}) {
    if (!force && !this.shouldQueue(totalGeneratedCoin)) {
      return;
    }

    this.lastQueuedTotalGeneratedCoin = this.maxIncome(
      this.lastQueuedTotalGeneratedCoin,
      totalGeneratedCoin,
    );
    this.pendingTotalGeneratedCoin = this.maxIncome(
      this.pendingTotalGeneratedCoin,
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

    return (
      totalGeneratedCoin - this.lastQueuedTotalGeneratedCoin >=
      BigInt(this.minSyncDeltaCoin)
    );
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
        [reducer.paramName]: reducer.exact
          ? totalGeneratedCoin.toString()
          : totalGeneratedCoin,
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
    this.pendingTotalGeneratedCoin = this.maxIncome(
      this.pendingTotalGeneratedCoin,
      totalGeneratedCoin,
    );
  }

  queueCurrentTotalGeneratedCoin({ force = false } = {}) {
    if (!this.readyToSync) {
      return;
    }

    const totalGeneratedCoin = this.readTotalGeneratedCoin(this.gameplayFacade?.getSnapshot?.());
    if (totalGeneratedCoin === null) {
      return;
    }

    if (totalGeneratedCoin > 0n) {
      this.queue(totalGeneratedCoin, { force });
    }
  }

  normalizeMinSyncDeltaCoin(value) {
    return Number.isFinite(value)
      ? Math.max(0, Math.floor(value))
      : DEFAULT_MIN_SYNC_DELTA_COIN;
  }

  readTotalGeneratedCoin(snapshot) {
    const coin = snapshot?.coin ?? snapshot?.gold;

    const totalGenerated = this.normalizeIncome(coin?.totalGenerated);
    if (totalGenerated !== null) {
      return totalGenerated;
    }

    return this.normalizeIncome(coin?.totalGeneratedCoin);
  }

  findSetTotalGeneratedCoinReducer() {
    const reducers = this.connection?.reducers;
    const exactCall =
      reducers?.setTotalGeneratedCoinExact ??
      reducers?.set_total_generated_coin_exact ??
      null;
    if (exactCall) {
      return {
        call: exactCall,
        paramName: 'totalGeneratedCoinExact',
        exact: true,
      };
    }

    const call =
      reducers?.setTotalGeneratedCoin ?? reducers?.set_total_generated_coin ?? null;
    if (call) {
      return { call, paramName: 'totalGeneratedCoin', exact: false };
    }

    const legacyCall =
      reducers?.setTotalGeneratedGold ?? reducers?.set_total_generated_gold ?? null;
    return legacyCall
      ? { call: legacyCall, paramName: 'totalGeneratedGold', exact: false }
      : null;
  }

  normalizeIncome(value) {
    if (typeof value === 'bigint') {
      return value >= 0n ? value : null;
    }

    if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
      return BigInt(value.trim());
    }

    return Number.isFinite(value) && value >= 0
      ? BigInt(Math.floor(value))
      : null;
  }

  maxIncome(left, right) {
    return left === null || right > left ? right : left;
  }
}
