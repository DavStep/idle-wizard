const DEFAULT_SYNC_TIMEOUT_MS = 10_000;
const DEFAULT_SYNC_INTERVAL_MS = 5_000;
const MAX_PLAYER_GAMEPLAY_SAVE_JSON_LENGTH = 250_000;

export class GameplaySaveSendManager {
  constructor({
    syncTimeoutMs = DEFAULT_SYNC_TIMEOUT_MS,
    syncIntervalMs = DEFAULT_SYNC_INTERVAL_MS,
    setTimeoutFn = globalThis.setTimeout?.bind(globalThis),
    clearTimeoutFn = globalThis.clearTimeout?.bind(globalThis),
    now = () => Date.now(),
    onSyncUnhealthy = null,
  } = {}) {
    this.connection = null;
    this.pendingSaveJson = null;
    this.pendingSaveWasHydrated = false;
    this.pendingSaveContentKey = null;
    this.inFlightSaveJson = null;
    this.inFlightSaveWasHydrated = false;
    this.inFlightSaveContentKey = null;
    this.syncPromise = null;
    this.syncAttemptId = 0;
    this.syncTimeoutId = null;
    this.resolveSyncCancel = null;
    this.syncTimeoutMs = syncTimeoutMs;
    this.syncIntervalMs = syncIntervalMs;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.now = now;
    this.onSyncUnhealthy = onSyncUnhealthy;
    this.readyToSend = false;
    this.lastSyncedSaveContentKey = null;
    this.lastSyncStartedAtMs = Number.NEGATIVE_INFINITY;
    this.syncTimerId = null;
  }

  connect(connection) {
    this.connection = connection;
    this.flush();
  }

  disconnect() {
    this.restoreInFlightSave();
    this.cancelSyncAttempt();
    this.clearSyncTimer();
    this.lastSyncStartedAtMs = Number.NEGATIVE_INFINITY;
    this.connection = null;
    this.readyToSend = false;
  }

  setSyncUnhealthyHandler(handler) {
    this.onSyncUnhealthy = typeof handler === 'function' ? handler : null;
  }

  setReadyToSend(ready = true) {
    this.readyToSend = Boolean(ready);
    this.flush();
  }

  save(save) {
    if (!save || typeof save !== 'object') {
      return false;
    }

    try {
      const saveJson = JSON.stringify(save);
      const saveContentKey = this.getSaveContentKey(save, saveJson);

      if (!this.isValidSaveJsonLength(saveJson)) {
        this.notifySyncUnhealthy('gameplay_save_too_large', {
          saveJsonLength: saveJson.length,
          maxSaveJsonLength: MAX_PLAYER_GAMEPLAY_SAVE_JSON_LENGTH,
        });
        return false;
      }

      if (this.isRedundantSaveContent(saveContentKey)) {
        return true;
      }

      this.pendingSaveJson = saveJson;
      this.pendingSaveWasHydrated = this.readyToSend;
      this.pendingSaveContentKey = saveContentKey;
    } catch {
      return false;
    }

    this.flush();
    return true;
  }

  async saveAndFlush(save) {
    if (!this.save(save)) {
      return false;
    }

    while (true) {
      this.flush({ force: true });

      if (!this.syncPromise) {
        break;
      }

      const synced = await this.syncPromise;
      if (!synced) {
        break;
      }
    }

    return this.pendingSaveJson === null;
  }

  discardPreHydrationSave() {
    if (this.pendingSaveWasHydrated) {
      return;
    }

    this.pendingSaveJson = null;
    this.pendingSaveWasHydrated = false;
    this.pendingSaveContentKey = null;
  }

  discardPendingSaves() {
    this.cancelSyncAttempt('gameplay_save_discarded');
    this.clearSyncTimer();
    this.pendingSaveJson = null;
    this.pendingSaveWasHydrated = false;
    this.pendingSaveContentKey = null;
    this.clearInFlightSave();
  }

  getPendingHydratedSave() {
    if (this.pendingSaveWasHydrated && this.pendingSaveJson) {
      return this.parseSaveJson(this.pendingSaveJson);
    }

    if (this.inFlightSaveWasHydrated && this.inFlightSaveJson) {
      return this.parseSaveJson(this.inFlightSaveJson);
    }

    return null;
  }

  flush({ force = false } = {}) {
    if (
      !this.readyToSend ||
      !this.connection ||
      !this.pendingSaveJson ||
      this.syncPromise
    ) {
      return;
    }

    if (!force && !this.canSyncNow()) {
      this.scheduleFlush();
      return;
    }

    const setPlayerGameplaySave = this.findSetPlayerGameplaySaveReducer();
    if (!setPlayerGameplaySave) {
      return;
    }

    const saveJson = this.pendingSaveJson;
    const saveWasHydrated = this.pendingSaveWasHydrated;
    const saveContentKey = this.pendingSaveContentKey;
    this.pendingSaveJson = null;
    this.pendingSaveWasHydrated = false;
    this.pendingSaveContentKey = null;
    this.inFlightSaveJson = saveJson;
    this.inFlightSaveWasHydrated = saveWasHydrated;
    this.inFlightSaveContentKey = saveContentKey;

    let syncResult;
    try {
      syncResult = setPlayerGameplaySave({ saveJson });
    } catch (error) {
      this.restoreInFlightSave();
      this.notifySyncUnhealthy('gameplay_save_error', error);
      return;
    }

    this.clearSyncTimer();
    this.lastSyncStartedAtMs = this.now();
    const attemptId = this.beginSyncAttempt();
    let shouldFlush = false;
    const reducerOutcome = Promise.resolve(syncResult)
      .then(() => ({ ok: true }))
      .catch((error) => ({
        ok: false,
        reason: 'gameplay_save_error',
        error,
      }));
    const outcomes = [
      reducerOutcome,
      this.createSyncTimeoutOutcome(attemptId),
      this.createSyncCancelOutcome(),
    ].filter(Boolean);

    this.syncPromise = Promise.race(outcomes)
      .then((outcome) => {
        if (!this.isCurrentSyncAttempt(attemptId)) {
          return outcome?.ok === true;
        }

        this.clearSyncTimeout();
        this.resolveSyncCancel = null;

        if (outcome?.ok) {
          this.lastSyncedSaveContentKey = this.inFlightSaveContentKey;
          this.clearInFlightSave();
          shouldFlush = true;
          return true;
        }

        this.restoreInFlightSave();

        if (!outcome?.cancelled) {
          this.notifySyncUnhealthy(
            outcome?.reason ?? 'gameplay_save_error',
            outcome?.error,
          );
        }

        return false;
      })
      .finally(() => {
        if (!this.isCurrentSyncAttempt(attemptId)) {
          return;
        }

        this.syncPromise = null;
        this.resolveSyncCancel = null;

        if (shouldFlush) {
          this.flush();
        }
      });
  }

  restorePending(saveJson, saveWasHydrated = true, saveContentKey = null) {
    this.pendingSaveJson = saveJson;
    this.pendingSaveWasHydrated = saveWasHydrated;
    this.pendingSaveContentKey = saveContentKey;
  }

  restoreInFlightSave() {
    if (!this.inFlightSaveJson) {
      return;
    }

    if (!this.pendingSaveJson) {
      this.pendingSaveJson = this.inFlightSaveJson;
      this.pendingSaveContentKey = this.inFlightSaveContentKey;
    }

    this.pendingSaveWasHydrated =
      this.pendingSaveWasHydrated || this.inFlightSaveWasHydrated;
    this.clearInFlightSave();
  }

  clearInFlightSave() {
    this.inFlightSaveJson = null;
    this.inFlightSaveWasHydrated = false;
    this.inFlightSaveContentKey = null;
  }

  beginSyncAttempt() {
    this.syncAttemptId += 1;
    this.clearSyncTimeout();
    this.resolveSyncCancel = null;
    return this.syncAttemptId;
  }

  cancelSyncAttempt(reason = 'gameplay_save_cancelled') {
    const resolveSyncCancel = this.resolveSyncCancel;
    this.syncAttemptId += 1;
    this.clearSyncTimeout();
    this.resolveSyncCancel = null;
    this.syncPromise = null;

    if (resolveSyncCancel) {
      resolveSyncCancel({ ok: false, reason, cancelled: true });
    }
  }

  createSyncTimeoutOutcome(attemptId) {
    if (
      !Number.isFinite(this.syncTimeoutMs) ||
      this.syncTimeoutMs <= 0 ||
      typeof this.setTimeoutFn !== 'function'
    ) {
      return null;
    }

    return new Promise((resolve) => {
      this.syncTimeoutId = this.setTimeoutFn(() => {
        if (!this.isCurrentSyncAttempt(attemptId)) {
          return;
        }

        this.syncTimeoutId = null;
        resolve({ ok: false, reason: 'gameplay_save_timeout' });
      }, this.syncTimeoutMs);
    });
  }

  createSyncCancelOutcome() {
    return new Promise((resolve) => {
      this.resolveSyncCancel = resolve;
    });
  }

  clearSyncTimeout() {
    if (this.syncTimeoutId === null) {
      return;
    }

    this.clearTimeoutFn?.(this.syncTimeoutId);
    this.syncTimeoutId = null;
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

  isCurrentSyncAttempt(attemptId) {
    return this.syncAttemptId === attemptId;
  }

  notifySyncUnhealthy(reason, error) {
    this.onSyncUnhealthy?.({ reason, error });
  }

  isRedundantSaveContent(saveContentKey) {
    return Boolean(
      saveContentKey &&
        (saveContentKey === this.pendingSaveContentKey ||
          saveContentKey === this.inFlightSaveContentKey ||
          saveContentKey === this.lastSyncedSaveContentKey),
    );
  }

  getSaveContentKey(save, fallbackJson) {
    if (!save || typeof save !== 'object' || Array.isArray(save)) {
      return fallbackJson;
    }

    const meaningfulSave = { ...save };
    delete meaningfulSave.savedAt;
    return JSON.stringify(meaningfulSave);
  }

  isValidSaveJsonLength(saveJson) {
    return (
      typeof saveJson === 'string' &&
      saveJson.length > 0 &&
      saveJson.length <= MAX_PLAYER_GAMEPLAY_SAVE_JSON_LENGTH
    );
  }

  parseSaveJson(saveJson) {
    try {
      const save = JSON.parse(saveJson);
      return save && typeof save === 'object' && !Array.isArray(save) ? save : null;
    } catch {
      return null;
    }
  }

  findSetPlayerGameplaySaveReducer() {
    const reducers = this.connection?.reducers;
    return (
      reducers?.setPlayerGameplaySave ??
      reducers?.set_player_gameplay_save ??
      null
    );
  }
}
