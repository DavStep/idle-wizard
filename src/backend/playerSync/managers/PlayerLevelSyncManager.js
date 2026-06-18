export class PlayerLevelSyncManager {
  constructor() {
    this.connection = null;
    this.gameplayFacade = null;
    this.unsubscribe = null;
    this.lastObservedPlayerLevel = null;
    this.pendingPlayerLevel = null;
    this.pendingPlayerLevelWasHydrated = false;
    this.syncPromise = null;
    this.syncAttemptId = 0;
    this.readyToSync = false;
    this.hydratedLevelSource = false;
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
    this.readyToSync = false;
    this.hydratedLevelSource = false;
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
    this.pendingPlayerLevel = playerLevel;
    this.pendingPlayerLevelWasHydrated =
      this.readyToSync || this.hydratedLevelSource;
    this.flush();
  }

  flush() {
    if (
      !this.readyToSync ||
      this.syncPromise ||
      this.pendingPlayerLevel === null ||
      !this.connection
    ) {
      return;
    }

    const setPlayerLevel = this.findSetPlayerLevelReducer();
    if (!setPlayerLevel) {
      return;
    }

    const playerLevel = this.pendingPlayerLevel;
    const playerLevelWasHydrated = this.pendingPlayerLevelWasHydrated;
    this.pendingPlayerLevel = null;
    this.pendingPlayerLevelWasHydrated = false;

    let syncResult;
    try {
      syncResult = setPlayerLevel({ playerLevel });
    } catch {
      this.restorePending(playerLevel, playerLevelWasHydrated);
      return;
    }

    const attemptId = this.beginSyncAttempt();
    this.syncPromise = Promise.resolve(syncResult)
      .catch(() => {
        if (this.isCurrentSyncAttempt(attemptId)) {
          this.restorePending(playerLevel, playerLevelWasHydrated);
        }
      })
      .finally(() => {
        if (!this.isCurrentSyncAttempt(attemptId)) {
          return;
        }

        this.syncPromise = null;
        this.flush();
      });
  }

  restorePending(playerLevel, playerLevelWasHydrated = true) {
    this.pendingPlayerLevel = this.pendingPlayerLevel ?? playerLevel;
    this.pendingPlayerLevelWasHydrated =
      this.pendingPlayerLevelWasHydrated || playerLevelWasHydrated;
  }

  discardPreHydrationLevel() {
    if (this.pendingPlayerLevelWasHydrated) {
      return;
    }

    this.pendingPlayerLevel = null;
    this.lastObservedPlayerLevel = null;
    this.pendingPlayerLevelWasHydrated = false;
  }

  discardPendingLevel() {
    this.cancelSyncAttempt();
    this.pendingPlayerLevel = null;
    this.pendingPlayerLevelWasHydrated = false;
  }

  markGameplaySaveHydrated() {
    this.hydratedLevelSource = true;
  }

  setReadyToSync(ready = true) {
    this.readyToSync = Boolean(ready);

    if (!this.readyToSync) {
      this.hydratedLevelSource = false;
      return;
    }

    this.observe(this.gameplayFacade?.getSnapshot?.());
    this.flush();
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

  beginSyncAttempt() {
    this.syncAttemptId += 1;
    return this.syncAttemptId;
  }

  cancelSyncAttempt() {
    this.syncAttemptId += 1;
    this.syncPromise = null;
  }

  isCurrentSyncAttempt(attemptId) {
    return this.syncAttemptId === attemptId;
  }
}
