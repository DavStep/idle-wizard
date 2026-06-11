export class LeaderboardGeneratedGoldSyncManager {
  constructor() {
    this.connection = null;
    this.gameplayFacade = null;
    this.unsubscribe = null;
    this.lastObservedTotalGeneratedGold = null;
    this.pendingTotalGeneratedGold = null;
    this.syncPromise = null;
  }

  setGameplayFacade(gameplayFacade) {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.gameplayFacade = gameplayFacade;
    this.lastObservedTotalGeneratedGold = null;

    if (!gameplayFacade) {
      return;
    }

    this.unsubscribe = gameplayFacade.subscribe((snapshot) => this.observe(snapshot));
    this.observe(gameplayFacade.getSnapshot());
  }

  connect(connection) {
    this.connection = connection;
    this.queueCurrentTotalGeneratedGold();
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

  queue(totalGeneratedGold) {
    this.pendingTotalGeneratedGold = Math.max(this.pendingTotalGeneratedGold ?? 0, totalGeneratedGold);
    this.flush();
  }

  flush() {
    if (this.syncPromise || this.pendingTotalGeneratedGold === null || !this.connection) {
      return;
    }

    const setTotalGeneratedGold = this.findSetTotalGeneratedGoldReducer();
    if (!setTotalGeneratedGold) {
      return;
    }

    const totalGeneratedGold = this.pendingTotalGeneratedGold;
    this.pendingTotalGeneratedGold = null;

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

  restorePending(totalGeneratedGold) {
    this.pendingTotalGeneratedGold = Math.max(this.pendingTotalGeneratedGold ?? 0, totalGeneratedGold);
  }

  queueCurrentTotalGeneratedGold() {
    const totalGeneratedGold = this.readTotalGeneratedGold(this.gameplayFacade?.getSnapshot?.());
    if (!Number.isFinite(totalGeneratedGold)) {
      return;
    }

    const flooredTotalGeneratedGold = Math.floor(totalGeneratedGold);
    if (flooredTotalGeneratedGold > 0) {
      this.queue(flooredTotalGeneratedGold);
    }
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
