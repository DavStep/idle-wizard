export class GameplaySaveSendManager {
  constructor() {
    this.connection = null;
    this.pendingSaveJson = null;
    this.syncPromise = null;
  }

  connect(connection) {
    this.connection = connection;
    this.flush();
  }

  disconnect() {
    this.connection = null;
    this.syncPromise = null;
  }

  save(save) {
    if (!save || typeof save !== 'object') {
      return false;
    }

    try {
      this.pendingSaveJson = JSON.stringify(save);
    } catch {
      return false;
    }

    this.flush();
    return true;
  }

  flush() {
    if (!this.connection || !this.pendingSaveJson || this.syncPromise) {
      return;
    }

    const setPlayerGameplaySave = this.findSetPlayerGameplaySaveReducer();
    if (!setPlayerGameplaySave) {
      return;
    }

    const saveJson = this.pendingSaveJson;
    this.pendingSaveJson = null;

    let syncResult;
    try {
      syncResult = setPlayerGameplaySave({ saveJson });
    } catch {
      this.restorePending(saveJson);
      return;
    }

    this.syncPromise = Promise.resolve(syncResult)
      .catch(() => {
        this.restorePending(saveJson);
      })
      .finally(() => {
        this.syncPromise = null;
        this.flush();
      });
  }

  restorePending(saveJson) {
    this.pendingSaveJson = saveJson;
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
