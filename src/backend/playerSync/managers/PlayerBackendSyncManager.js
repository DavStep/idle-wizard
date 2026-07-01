import {
  DEFAULT_PLAYER_THEME,
  normalizePlayerTheme,
} from '../../../player/playerThemes.js';

export class PlayerBackendSyncManager {
  constructor() {
    this.connection = null;
    this.playerFacade = null;
    this.unsubscribe = null;
    this.lastProfileSignature = null;
    this.serverProfileLoaded = false;
    this.applyingServerProfile = false;
    this.canSyncBeforeServerProfile = false;
    this.initialProfileSignature = null;
    this.pendingProfile = null;
    this.pendingSyncSignature = null;
  }

  setPlayerFacade(playerFacade) {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.playerFacade = playerFacade;
    this.initialProfileSignature = this.getProfileSignature(
      this.readClientProfile(playerFacade?.getProfileSnapshot?.() ?? playerFacade?.getSnapshot?.()),
    );
    this.pendingProfile = null;

    if (!playerFacade) {
      return;
    }

    this.unsubscribe = playerFacade.subscribe((snapshot) => this.sync(snapshot));
    this.sync(playerFacade.getSnapshot());
  }

  connect(connection) {
    this.connection = connection;
    this.canSyncBeforeServerProfile = !this.hasServerProfileSource(connection);

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
    this.pendingProfile = null;
    this.pendingSyncSignature = null;
  }

  sync(snapshot) {
    const profile = this.readClientProfile(snapshot);
    const profileSignature = this.getProfileSignature(profile);

    if (
      !this.applyingServerProfile &&
      this.connection &&
      profile.username &&
      !this.serverProfileLoaded &&
      !this.canSyncBeforeServerProfile
    ) {
      if (profileSignature !== this.initialProfileSignature) {
        this.pendingProfile = profile;
      }

      return;
    }

    if (
      this.applyingServerProfile ||
      !this.connection ||
      !profile.username ||
      profileSignature === this.lastProfileSignature ||
      (!this.serverProfileLoaded && !this.canSyncBeforeServerProfile)
    ) {
      return;
    }

    const setPlayerProfile = this.findSetPlayerProfileReducer();
    const setUsername = this.findSetUsernameReducer();

    if (!setPlayerProfile && !setUsername) {
      return;
    }

    this.lastProfileSignature = profileSignature;
    this.pendingSyncSignature = setPlayerProfile ? profileSignature : null;

    let syncResult;
    try {
      syncResult = setPlayerProfile
        ? setPlayerProfile({
            username: profile.username,
            theme: profile.theme,
            font: profile.font,
            colorMode: profile.colorMode,
            character: profile.character,
            usernamePromptSeen: profile.usernamePromptSeen,
          })
        : setUsername({ username: profile.username });
    } catch {
      this.lastProfileSignature = null;
      return;
    }

    Promise.resolve(syncResult).catch(() => {
      this.lastProfileSignature = null;
      if (this.pendingSyncSignature === profileSignature) {
        this.pendingSyncSignature = null;
      }
    });
  }

  applyServerProfile(profile) {
    this.serverProfileLoaded = true;
    const pendingProfile = this.pendingProfile;
    this.pendingProfile = null;

    const serverProfile = this.readServerProfile(profile);
    if (!serverProfile.username) {
      this.markUsernameProfileLoadedWithoutSync();
      this.applyPendingProfileAfterHydration(pendingProfile);
      return;
    }

    const serverProfileSignature = this.getProfileSignature(serverProfile);
    const currentProfileSignature = this.getProfileSignature(this.readCurrentPlayerProfile());

    if (this.pendingSyncSignature) {
      if (serverProfileSignature === this.pendingSyncSignature) {
        this.pendingSyncSignature = null;
      } else if (currentProfileSignature === this.pendingSyncSignature) {
        this.markUsernameProfileLoaded();
        return;
      }
    }

    this.lastProfileSignature = serverProfileSignature;

    if (this.applyPendingProfileAfterHydration(pendingProfile)) {
      return;
    }

    if (
      this.getProfileSignature(this.readCurrentPlayerProfile()) ===
      this.getProfileSignature(serverProfile)
    ) {
      this.markUsernameProfileLoaded();
      return;
    }

    try {
      this.applyingServerProfile = true;
      this.applyServerProfileToPlayer(serverProfile);
    } finally {
      this.applyingServerProfile = false;
    }
  }

  readCurrentPlayerProfile() {
    return this.readClientProfile(
      this.playerFacade?.getProfileSnapshot?.() ?? this.playerFacade?.getSnapshot?.(),
    );
  }

  readClientProfile(snapshot = {}) {
    return {
      username: snapshot?.username,
      theme: normalizePlayerTheme(snapshot?.theme ?? DEFAULT_PLAYER_THEME),
      font: snapshot?.font ?? 'lexend',
      colorMode: snapshot?.colorMode ?? 'resources',
      character: snapshot?.character ?? 'elara',
      usernamePromptSeen: Boolean(snapshot?.usernamePromptSeen),
    };
  }

  readServerProfile(profile = {}) {
    return {
      username: profile?.username,
      theme: normalizePlayerTheme(profile?.theme ?? DEFAULT_PLAYER_THEME),
      font: profile?.font ?? 'lexend',
      colorMode: profile?.colorMode ?? 'resources',
      character: profile?.character ?? 'elara',
      usernamePromptSeen: Boolean(profile?.usernamePromptSeen),
    };
  }

  hasServerProfileSource(connection) {
    return Boolean(
      connection?.db?.ownPlayerProfile ||
        connection?.db?.own_player_profile ||
        connection?.db?.player,
    );
  }

  getProfileSignature(profile) {
    if (!profile?.username) {
      return null;
    }

    return JSON.stringify({
      username: profile.username,
      theme: profile.theme,
      font: profile.font,
      colorMode: profile.colorMode,
      character: profile.character,
      usernamePromptSeen: Boolean(profile.usernamePromptSeen),
    });
  }

  findSetPlayerProfileReducer() {
    const reducers = this.connection?.reducers;
    return reducers?.setPlayerProfile ?? reducers?.set_player_profile ?? null;
  }

  findSetUsernameReducer() {
    const reducers = this.connection?.reducers;
    return reducers?.setUsername ?? reducers?.set_username ?? null;
  }

  applyServerProfileToPlayer(profile) {
    if (typeof this.playerFacade?.applyServerProfile === 'function') {
      this.playerFacade.applyServerProfile(profile);
      return;
    }

    this.playerFacade?.setUsername?.(profile.username);
    this.playerFacade?.setTheme?.(profile.theme);
    this.playerFacade?.setFont?.(profile.font);
    this.playerFacade?.setColorMode?.(profile.colorMode);
    this.playerFacade?.setCharacter?.(profile.character);

    if (profile.usernamePromptSeen) {
      this.playerFacade?.markUsernamePromptSeen?.();
    }
  }

  markUsernameProfileLoaded() {
    this.playerFacade?.markUsernameProfileLoaded?.();
  }

  markUsernameProfileLoadedWithoutSync() {
    try {
      this.applyingServerProfile = true;
      this.markUsernameProfileLoaded();
    } finally {
      this.applyingServerProfile = false;
    }
  }

  applyPendingProfileAfterHydration(pendingProfile) {
    if (!pendingProfile) {
      return false;
    }

    const currentProfileSignature = this.getProfileSignature(this.readCurrentPlayerProfile());
    if (currentProfileSignature !== this.getProfileSignature(pendingProfile)) {
      this.applyServerProfileToPlayer(pendingProfile);
    } else {
      this.sync(pendingProfile);
    }

    return true;
  }
}
