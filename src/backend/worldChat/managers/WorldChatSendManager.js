import { getChatFailureReason } from '../../shared/chatFailureReasons.js';

const MAX_MESSAGE_LENGTH = 160;

export class WorldChatSendManager {
  constructor({ beforeSendMessage = null } = {}) {
    this.connection = null;
    this.beforeSendMessage = beforeSendMessage;
  }

  connect(connection) {
    this.connection = connection;
  }

  disconnect() {
    this.connection = null;
  }

  setBeforeSendMessage(beforeSendMessage) {
    this.beforeSendMessage =
      typeof beforeSendMessage === 'function' ? beforeSendMessage : null;
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

    const beforeSendResult = await this.runBeforeSendMessage();
    if (!beforeSendResult.ok) {
      return beforeSendResult;
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

  async runBeforeSendMessage() {
    if (!this.beforeSendMessage) {
      return { ok: true };
    }

    try {
      const result = await this.beforeSendMessage();

      if (result === false) {
        return {
          ok: false,
          reason: 'chat_locked',
        };
      }

      if (result?.ok === false) {
        return {
          ok: false,
          reason: result.reason ?? 'chat_locked',
        };
      }

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason: this.getFailureReason(error),
      };
    }
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
