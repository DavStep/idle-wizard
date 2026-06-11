const MAX_FEEDBACK_LENGTH = 2000;

export class FeedbackSendManager {
  constructor() {
    this.connection = null;
  }

  connect(connection) {
    this.connection = connection;
  }

  disconnect() {
    this.connection = null;
  }

  async submitFeedback(body) {
    const feedback = this.normalizeFeedback(body);

    if (!feedback) {
      return {
        ok: false,
        reason: 'empty_feedback',
      };
    }

    const submitFeedback = this.findSubmitFeedbackReducer();

    if (!submitFeedback) {
      return {
        ok: false,
        reason: 'offline',
      };
    }

    try {
      await submitFeedback({ body: feedback });
      return {
        ok: true,
        body: feedback,
      };
    } catch {
      return {
        ok: false,
        reason: 'send_failed',
      };
    }
  }

  normalizeFeedback(body) {
    let safeBody = '';
    const normalizedBody = String(body ?? '').replace(/\r\n?/g, '\n');

    for (const character of normalizedBody) {
      const code = character.charCodeAt(0);

      if ((code < 32 && code !== 10) || code === 127) {
        continue;
      }

      safeBody += character;
    }

    return safeBody.trim().slice(0, MAX_FEEDBACK_LENGTH);
  }

  findSubmitFeedbackReducer() {
    const reducers = this.connection?.reducers;
    return reducers?.submitFeedback ?? reducers?.submit_feedback ?? null;
  }
}
