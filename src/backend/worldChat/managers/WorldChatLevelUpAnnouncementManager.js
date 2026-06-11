const MIN_ANNOUNCED_PLAYER_LEVEL = 2;

export class WorldChatLevelUpAnnouncementManager {
  constructor() {
    this.connection = null;
  }

  connect(connection) {
    this.connection = connection;
  }

  disconnect() {
    this.connection = null;
  }

  async announceLevelUp(playerLevel) {
    const safePlayerLevel = this.normalizePlayerLevel(playerLevel);

    if (!safePlayerLevel) {
      return {
        ok: false,
        reason: 'invalid_player_level',
      };
    }

    const announceLevelUp = this.findAnnounceLevelUpReducer();

    if (!announceLevelUp) {
      return {
        ok: false,
        reason: 'offline',
        playerLevel: safePlayerLevel,
      };
    }

    try {
      await announceLevelUp({ playerLevel: safePlayerLevel });
      return {
        ok: true,
        playerLevel: safePlayerLevel,
      };
    } catch {
      return {
        ok: false,
        reason: 'send_failed',
        playerLevel: safePlayerLevel,
      };
    }
  }

  normalizePlayerLevel(playerLevel) {
    const safePlayerLevel = Math.floor(Number(playerLevel));

    if (!Number.isFinite(safePlayerLevel) || safePlayerLevel < MIN_ANNOUNCED_PLAYER_LEVEL) {
      return null;
    }

    return safePlayerLevel;
  }

  findAnnounceLevelUpReducer() {
    const reducers = this.connection?.reducers;
    return reducers?.announceLevelUp ?? reducers?.announce_level_up ?? null;
  }
}
