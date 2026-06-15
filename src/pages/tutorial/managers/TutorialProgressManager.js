export const TUTORIAL_STORAGE_KEY = 'idle-wizard.tutorial.v3';

export class TutorialProgressManager {
  constructor({ storage = globalThis.localStorage } = {}) {
    this.storage = storage;
    this.completedStepIds = new Set();
    this.load();
  }

  isSkipped() {
    return false;
  }

  hasCompleted(stepId) {
    return this.completedStepIds.has(stepId);
  }

  complete(stepId) {
    if (!stepId || this.completedStepIds.has(stepId)) {
      return;
    }

    this.completedStepIds.add(stepId);
    this.save();
  }

  completeMany(stepIds) {
    const nextStepIds = stepIds.filter(
      (stepId) => stepId && !this.completedStepIds.has(stepId),
    );

    if (nextStepIds.length === 0) {
      return;
    }

    for (const stepId of nextStepIds) {
      this.completedStepIds.add(stepId);
    }

    this.save();
  }

  skip() {
    this.save();
  }

  reset() {
    this.completedStepIds.clear();
    this.save();
  }

  load() {
    try {
      const raw = this.storage?.getItem?.(TUTORIAL_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      this.completedStepIds = new Set(
        Array.isArray(parsed?.completedStepIds)
          ? parsed.completedStepIds.filter((stepId) => typeof stepId === 'string')
          : [],
      );
    } catch {
      this.completedStepIds = new Set();
    }
  }

  save() {
    try {
      this.storage?.setItem?.(
        TUTORIAL_STORAGE_KEY,
        JSON.stringify({
          completedStepIds: [...this.completedStepIds],
        }),
      );
    } catch {
      // Tutorial progress is only UI guidance; storage failures should not affect play.
    }
  }
}
