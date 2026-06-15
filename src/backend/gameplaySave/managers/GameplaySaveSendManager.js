const DEFAULT_SYNC_TIMEOUT_MS = 10_000;

export class GameplaySaveSendManager {
  constructor({
    syncTimeoutMs = DEFAULT_SYNC_TIMEOUT_MS,
    setTimeoutFn = globalThis.setTimeout?.bind(globalThis),
    clearTimeoutFn = globalThis.clearTimeout?.bind(globalThis),
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
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.onSyncUnhealthy = onSyncUnhealthy;
    this.readyToSend = false;
    this.lastSyncedSaveContentKey = null;
  }

  connect(connection) {
    this.connection = connection;
    this.flush();
  }

  disconnect() {
    this.restoreInFlightSave();
    this.cancelSyncAttempt();
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

    while (this.syncPromise) {
      await this.syncPromise;
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

  flush() {
    if (
      !this.readyToSend ||
      !this.connection ||
      !this.pendingSaveJson ||
      this.syncPromise
    ) {
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

  findSetPlayerGameplaySaveReducer() {
    const reducers = this.connection?.reducers;
    return (
      reducers?.setPlayerGameplaySave ??
      reducers?.set_player_gameplay_save ??
      null
    );
  }
}
