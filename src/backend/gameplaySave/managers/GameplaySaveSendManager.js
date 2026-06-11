export class GameplaySaveSendManager {
  constructor() {
    this.connection = null;
    this.pendingSaveJson = null;
    this.pendingSaveWasHydrated = false;
    this.syncPromise = null;
    this.readyToSend = false;
  }

  connect(connection) {
    this.connection = connection;
    this.flush();
  }

  disconnect() {
    this.connection = null;
    this.syncPromise = null;
    this.readyToSend = false;
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
      this.pendingSaveJson = JSON.stringify(save);
      this.pendingSaveWasHydrated = this.readyToSend;
    } catch {
      return false;
    }

    this.flush();
    return true;
  }

  discardPreHydrationSave() {
    if (this.pendingSaveWasHydrated) {
      return;
    }

    this.pendingSaveJson = null;
    this.pendingSaveWasHydrated = false;
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
    this.pendingSaveJson = null;
    this.pendingSaveWasHydrated = false;

    let syncResult;
    try {
      syncResult = setPlayerGameplaySave({ saveJson });
    } catch {
      this.restorePending(saveJson, saveWasHydrated);
      return;
    }

    this.syncPromise = Promise.resolve(syncResult)
      .catch(() => {
        this.restorePending(saveJson, saveWasHydrated);
      })
      .finally(() => {
        this.syncPromise = null;
        this.flush();
      });
  }

  restorePending(saveJson, saveWasHydrated = true) {
    this.pendingSaveJson = saveJson;
    this.pendingSaveWasHydrated = saveWasHydrated;
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
