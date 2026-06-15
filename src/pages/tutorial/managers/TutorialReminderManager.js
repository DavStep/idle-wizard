export const TUTORIAL_HINT_VISIBLE_MS = 4500;
export const TUTORIAL_HINT_REMINDER_MS = 25000;

export class TutorialReminderManager {
  constructor({
    now = () => Date.now(),
    visibleMs = TUTORIAL_HINT_VISIBLE_MS,
    reminderMs = TUTORIAL_HINT_REMINDER_MS,
  } = {}) {
    this.now = now;
    this.visibleMs = visibleMs;
    this.reminderMs = reminderMs;
    this.lastShownAtByPrompt = new Map();
    this.lastShownAtByReminder = new Map();
    this.lastActivityAtByReminder = new Map();
    this.lastPromptKeyByReminder = new Map();
    this.activePromptKey = null;
    this.activeReminderKey = null;
  }

  getCue(viewModel, now = this.now()) {
    if (!viewModel) {
      this.clearVisible();
      return { shouldShow: false, nextDelayMs: null };
    }

    const promptKey = this.getPromptKey(viewModel);
    const reminderKey = this.getReminderKey(viewModel, promptKey);
    const lastShownAt = this.lastShownAtByPrompt.get(promptKey);
    const lastReminderShownAt = this.lastShownAtByReminder.get(reminderKey);
    const lastPromptKey = this.lastPromptKeyByReminder.get(reminderKey);
    this.activePromptKey = promptKey;
    this.activeReminderKey = reminderKey;

    if (lastPromptKey !== promptKey) {
      this.lastPromptKeyByReminder.set(reminderKey, promptKey);
      this.lastActivityAtByReminder.set(reminderKey, now);
    }

    if (!Number.isFinite(lastShownAt)) {
      this.markShown(promptKey, reminderKey, now);
      return { shouldShow: true, nextDelayMs: this.visibleMs };
    }

    const elapsedMs = Math.max(0, now - lastShownAt);

    if (elapsedMs < this.visibleMs) {
      return {
        shouldShow: true,
        nextDelayMs: this.visibleMs - elapsedMs,
      };
    }

    const reminderElapsedMs = Number.isFinite(lastReminderShownAt)
      ? Math.max(0, now - lastReminderShownAt)
      : this.reminderMs;
    const lastActivityAt = this.lastActivityAtByReminder.get(reminderKey);
    const activityElapsedMs = Number.isFinite(lastActivityAt)
      ? Math.max(0, now - lastActivityAt)
      : this.reminderMs;
    const quietElapsedMs = Math.min(reminderElapsedMs, activityElapsedMs);

    if (quietElapsedMs < this.reminderMs) {
      return {
        shouldShow: false,
        nextDelayMs: this.reminderMs - quietElapsedMs,
      };
    }

    this.markShown(promptKey, reminderKey, now);
    return { shouldShow: true, nextDelayMs: this.visibleMs };
  }

  getHintState({ step, now = this.now() } = {}) {
    const cue = this.getCue(step, now);

    return {
      shouldShow: cue.shouldShow,
      nextRefreshAt: Number.isFinite(cue.nextDelayMs) ? now + cue.nextDelayMs : null,
    };
  }

  recordActivity(now = this.now()) {
    if (!this.activeReminderKey) {
      return;
    }

    this.lastActivityAtByReminder.set(this.activeReminderKey, now);
  }

  clearVisible() {
    this.activePromptKey = null;
    this.activeReminderKey = null;
  }

  discardActivePrompt() {
    if (this.activePromptKey) {
      this.lastShownAtByPrompt.delete(this.activePromptKey);
    }

    if (this.activeReminderKey) {
      this.lastShownAtByReminder.delete(this.activeReminderKey);
      this.lastActivityAtByReminder.delete(this.activeReminderKey);
      this.lastPromptKeyByReminder.delete(this.activeReminderKey);
    }

    this.clearVisible();
  }

  resetActivePrompt() {
    this.clearVisible();
  }

  getPromptKey(viewModel) {
    return [
      viewModel.id ?? '',
      viewModel.targetId ?? '',
      viewModel.text ?? '',
    ].join('|');
  }

  getReminderKey(viewModel, promptKey) {
    return viewModel.reminderKey || promptKey;
  }

  markShown(promptKey, reminderKey, shownAt) {
    this.lastShownAtByPrompt.set(promptKey, shownAt);
    this.lastShownAtByReminder.set(reminderKey, shownAt);
  }
}
