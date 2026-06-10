export class PlayerLevelSyncManager {
  constructor() {
    this.connection = null;
    this.gameplayFacade = null;
    this.unsubscribe = null;
    this.lastObservedPlayerLevel = null;
    this.pendingPlayerLevel = null;
    this.syncPromise = null;
  }

  setGameplayFacade(gameplayFacade) {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.gameplayFacade = gameplayFacade;
    this.lastObservedPlayerLevel = null;

    if (!gameplayFacade) {
      return;
    }

    this.unsubscribe = gameplayFacade.subscribe((snapshot) => this.observe(snapshot));
    this.observe(gameplayFacade.getSnapshot());
  }

  connect(connection) {
    this.connection = connection;
    this.flush();
  }

  disconnect() {
    this.connection = null;
  }

  dispose() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.gameplayFacade = null;
    this.disconnect();
  }

  observe(snapshot) {
    const playerLevel = this.readPlayerLevel(snapshot);
    if (!Number.isFinite(playerLevel)) {
      return;
    }

    const flooredPlayerLevel = Math.max(1, Math.floor(playerLevel));
    if (flooredPlayerLevel === this.lastObservedPlayerLevel) {
      return;
    }

    this.lastObservedPlayerLevel = flooredPlayerLevel;
    this.queue(flooredPlayerLevel);
  }

  queue(playerLevel) {
    this.pendingPlayerLevel = Math.max(this.pendingPlayerLevel ?? 0, playerLevel);
    this.flush();
  }

  flush() {
    if (this.syncPromise || this.pendingPlayerLevel === null || !this.connection) {
      return;
    }

    const setPlayerLevel = this.findSetPlayerLevelReducer();
    if (!setPlayerLevel) {
      return;
    }

    const playerLevel = this.pendingPlayerLevel;
    this.pendingPlayerLevel = null;

    let syncResult;
    try {
      syncResult = setPlayerLevel({ playerLevel });
    } catch {
      this.restorePending(playerLevel);
      return;
    }

    this.syncPromise = Promise.resolve(syncResult)
      .catch(() => {
        this.restorePending(playerLevel);
      })
      .finally(() => {
        this.syncPromise = null;
        this.flush();
      });
  }

  restorePending(playerLevel) {
    this.pendingPlayerLevel = Math.max(this.pendingPlayerLevel ?? 0, playerLevel);
  }

  readPlayerLevel(snapshot) {
    const level = snapshot?.tasks?.currentLevel;

    if (Number.isFinite(level)) {
      return level;
    }

    return null;
  }

  findSetPlayerLevelReducer() {
    const reducers = this.connection?.reducers;
    return reducers?.setPlayerLevel ?? reducers?.set_player_level ?? null;
  }
}
