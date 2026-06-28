export class PlayerInboxActionManager {
  constructor() {
    this.connection = null;
  }

  connect(connection) {
    this.connection = connection;
  }

  disconnect() {
    this.connection = null;
  }

  markRead(mailKey) {
    return this.callReducer('markPlayerInboxMailRead', 'mark_player_inbox_mail_read', {
      mailKey: this.normalizeMailKey(mailKey),
    });
  }

  collectReward(mailKey) {
    return this.callReducer(
      'collectPlayerInboxMailReward',
      'collect_player_inbox_mail_reward',
      {
        mailKey: this.normalizeMailKey(mailKey),
      },
    );
  }

  async callReducer(camelName, snakeName, payload) {
    const reducer = this.findReducer(camelName, snakeName);

    if (!reducer) {
      return {
        ok: false,
        reason: 'offline',
      };
    }

    try {
      await reducer(payload);
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        reason: 'publish_failed',
      };
    }
  }

  findReducer(camelName, snakeName) {
    const reducers = this.connection?.reducers;
    return reducers?.[camelName] ?? reducers?.[snakeName] ?? null;
  }

  normalizeMailKey(value) {
    return String(value ?? '').trim();
  }
}
