import { FeedbackSendManager } from './managers/FeedbackSendManager.js';

export class FeedbackBackendFacade {
  static explain =
    'Stores player-written feedback on the server so it can be reviewed in a dashboard later.';

  constructor() {
    this.sendManager = new FeedbackSendManager();
  }

  connect(connection) {
    this.sendManager.connect(connection);
  }

  disconnect() {
    this.sendManager.disconnect();
  }

  submitFeedback(body) {
    return this.sendManager.submitFeedback(body);
  }
}
