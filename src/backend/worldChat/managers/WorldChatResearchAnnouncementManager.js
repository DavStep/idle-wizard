const MAX_RESEARCH_NAME_LENGTH = 80;

export class WorldChatResearchAnnouncementManager {
  constructor() {
    this.connection = null;
  }

  connect(connection) {
    this.connection = connection;
  }

  disconnect() {
    this.connection = null;
  }

  async announceResearch(researchName) {
    const safeResearchName = this.normalizeResearchName(researchName);

    if (!safeResearchName) {
      return {
        ok: false,
        reason: 'missing_research',
      };
    }

    const announceResearch = this.findAnnounceResearchReducer();

    if (!announceResearch) {
      return {
        ok: false,
        reason: 'offline',
        researchName: safeResearchName,
      };
    }

    try {
      await announceResearch({ researchName: safeResearchName });
      return {
        ok: true,
        researchName: safeResearchName,
      };
    } catch {
      return {
        ok: false,
        reason: 'send_failed',
        researchName: safeResearchName,
      };
    }
  }

  normalizeResearchName(researchName) {
    return String(researchName ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, MAX_RESEARCH_NAME_LENGTH);
  }

  findAnnounceResearchReducer() {
    const reducers = this.connection?.reducers;
    return reducers?.announceResearch ?? reducers?.announce_research ?? null;
  }
}
