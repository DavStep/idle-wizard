export class PlayerBackendSyncManager {
  constructor() {
    this.connection = null;
    this.playerFacade = null;
    this.unsubscribe = null;
    this.lastUsername = null;
    this.serverProfileLoaded = false;
    this.applyingServerProfile = false;
    this.canSyncBeforeServerProfile = false;
    this.initialUsername = null;
    this.pendingUsername = null;
  }

  setPlayerFacade(playerFacade) {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.playerFacade = playerFacade;
    this.initialUsername = playerFacade?.getSnapshot?.().username ?? null;
    this.pendingUsername = null;

    if (!playerFacade) {
      return;
    }

    this.unsubscribe = playerFacade.subscribe((snapshot) => this.sync(snapshot));
    this.sync(playerFacade.getSnapshot());
  }

  connect(connection) {
    this.connection = connection;
    this.canSyncBeforeServerProfile = !connection?.db?.player;

    if (this.canSyncBeforeServerProfile) {
      this.markUsernameProfileLoaded();
      this.sync(this.playerFacade?.getSnapshot());
    }
  }

  disconnect() {
    this.connection = null;
    this.serverProfileLoaded = false;
    this.applyingServerProfile = false;
    this.canSyncBeforeServerProfile = false;
    this.pendingUsername = null;
  }

  sync(snapshot) {
    const username = snapshot?.username;
    if (
      !this.applyingServerProfile &&
      this.connection &&
      username &&
      !this.serverProfileLoaded &&
      !this.canSyncBeforeServerProfile
    ) {
      if (username !== this.initialUsername) {
        this.pendingUsername = username;
      }

      return;
    }

    if (
      this.applyingServerProfile ||
      !this.connection ||
      !username ||
      username === this.lastUsername ||
      (!this.serverProfileLoaded && !this.canSyncBeforeServerProfile)
    ) {
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

  applyServerProfile(profile) {
    this.serverProfileLoaded = true;
    const pendingUsername = this.pendingUsername;
    this.pendingUsername = null;

    const username = profile?.username;
    if (!username) {
      this.markUsernameProfileLoaded();
      this.sync(this.playerFacade?.getSnapshot());
      return;
    }

    this.lastUsername = username;

    if (pendingUsername) {
      if (this.playerFacade?.getSnapshot?.().username !== pendingUsername) {
        this.playerFacade?.setUsername?.(pendingUsername);
      } else {
        this.sync({ username: pendingUsername });
      }

      return;
    }

    if (this.playerFacade?.getSnapshot?.().username === username) {
      this.markUsernameProfileLoaded();
      return;
    }

    try {
      this.applyingServerProfile = true;
      this.applyServerUsername(username);
    } finally {
      this.applyingServerProfile = false;
    }
  }

  findSetUsernameReducer() {
    const reducers = this.connection?.reducers;
    return reducers?.setUsername ?? reducers?.set_username ?? null;
  }

  applyServerUsername(username) {
    if (typeof this.playerFacade?.applyServerUsername === 'function') {
      this.playerFacade.applyServerUsername(username);
      return;
    }

    this.playerFacade?.setUsername?.(username);
  }

  markUsernameProfileLoaded() {
    this.playerFacade?.markUsernameProfileLoaded?.();
  }
}
