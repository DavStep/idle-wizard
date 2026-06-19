import { getChatFailureReason } from '../../shared/chatFailureReasons.js';

const MAX_MESSAGE_LENGTH = 160;

export class WorldChatSendManager {
  constructor() {
    this.connection = null;
  }

  connect(connection) {
    this.connection = connection;
  }

  disconnect() {
    this.connection = null;
  }

  async sendMessage(body) {
    const message = this.normalizeMessage(body);

    if (!message) {
      return {
        ok: false,
        reason: 'empty_message',
      };
    }

    const sendWorldChatMessage = this.findSendWorldChatMessageReducer();

    if (!sendWorldChatMessage) {
      return {
        ok: false,
        reason: 'offline',
      };
    }

    try {
      await sendWorldChatMessage({ body: message });
      return {
        ok: true,
        body: message,
      };
    } catch (error) {
      return {
        ok: false,
        reason: this.getFailureReason(error),
      };
    }
  }

  getFailureReason(error) {
    return getChatFailureReason(error);
  }

  normalizeMessage(body) {
    return String(body ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, MAX_MESSAGE_LENGTH);
  }

  findSendWorldChatMessageReducer() {
    const reducers = this.connection?.reducers;
    return reducers?.sendWorldChatMessage ?? reducers?.send_world_chat_message ?? null;
  }
}
