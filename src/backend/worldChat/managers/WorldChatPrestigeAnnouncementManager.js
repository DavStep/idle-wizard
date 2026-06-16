export class WorldChatPrestigeAnnouncementManager {
  constructor() {
    this.connection = null;
  }

  connect(connection) {
    this.connection = connection;
  }

  disconnect() {
    this.connection = null;
  }

  async announcePrestige({ prestigeCount, playerLevel } = {}) {
    const safePrestigeCount = this.normalizePositiveInteger(prestigeCount);
    const safePlayerLevel = this.normalizePositiveInteger(playerLevel);

    if (!safePrestigeCount || !safePlayerLevel) {
      return {
        ok: false,
        reason: 'invalid_prestige',
      };
    }

    const announcePrestige = this.findAnnouncePrestigeReducer();

    if (!announcePrestige) {
      return {
        ok: false,
        reason: 'offline',
        prestigeCount: safePrestigeCount,
        playerLevel: safePlayerLevel,
      };
    }

    try {
      await announcePrestige({
        prestigeCount: safePrestigeCount,
        playerLevel: safePlayerLevel,
      });
      return {
        ok: true,
        prestigeCount: safePrestigeCount,
        playerLevel: safePlayerLevel,
      };
    } catch {
      return {
        ok: false,
        reason: 'send_failed',
        prestigeCount: safePrestigeCount,
        playerLevel: safePlayerLevel,
      };
    }
  }

  normalizePositiveInteger(value) {
    const safeValue = Math.floor(Number(value));

    if (!Number.isFinite(safeValue) || safeValue < 1) {
      return null;
    }

    return safeValue;
  }

  findAnnouncePrestigeReducer() {
    const reducers = this.connection?.reducers;
    return reducers?.announcePrestige ?? reducers?.announce_prestige ?? null;
  }
}
