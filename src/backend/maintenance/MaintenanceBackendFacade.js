import { MaintenanceStateManager } from './managers/MaintenanceStateManager.js';

export class MaintenanceBackendFacade {
  static explain =
    'Reads the server maintenance switch so the app can pause play before data work begins.';

  constructor({ gameConfigFacade = null } = {}) {
    this.stateManager = new MaintenanceStateManager();
    this.gameConfigUnsubscribe = null;
    this.gameConfigFacade = null;
    this.setGameConfigFacade(gameConfigFacade);
  }

  setGameConfigFacade(gameConfigFacade) {
    this.gameConfigUnsubscribe?.();
    this.gameConfigFacade = gameConfigFacade;
    this.gameConfigUnsubscribe = gameConfigFacade?.subscribe?.((snapshot) => {
      this.stateManager.applyGameConfigSnapshot(snapshot);
    }) ?? null;
    this.stateManager.applyGameConfigSnapshot(gameConfigFacade?.getSnapshot?.());
  }

  dispose() {
    this.gameConfigUnsubscribe?.();
    this.gameConfigUnsubscribe = null;
    this.gameConfigFacade = null;
  }

  getSnapshot() {
    return this.stateManager.getSnapshot();
  }

  subscribe(listener) {
    return this.stateManager.subscribe(listener);
  }
}
