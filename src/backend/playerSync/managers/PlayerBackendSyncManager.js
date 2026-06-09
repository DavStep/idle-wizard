export class PlayerBackendSyncManager {
  constructor() {
    this.connection = null;
    this.playerFacade = null;
    this.unsubscribe = null;
    this.lastUsername = null;
  }

  setPlayerFacade(playerFacade) {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.playerFacade = playerFacade;

    if (!playerFacade) {
      return;
    }

    this.unsubscribe = playerFacade.subscribe((snapshot) => this.sync(snapshot));
    this.sync(playerFacade.getSnapshot());
  }

  connect(connection) {
    this.connection = connection;
    this.sync(this.playerFacade?.getSnapshot());
  }

  disconnect() {
    this.connection = null;
  }

  sync(snapshot) {
    const username = snapshot?.username;
    if (!this.connection || !username || username === this.lastUsername) {
      return;
    }

    const setUsername = this.findSetUsernameReducer();
    if (!setUsername) {
      return;
    }

    this.lastUsername = username;
    setUsername({ username }).catch(() => {
      this.lastUsername = null;
    });
  }

  findSetUsernameReducer() {
    const reducers = this.connection?.reducers;
    return reducers?.setUsername ?? reducers?.set_username ?? null;
  }
}
