export const TUTORIAL_STORAGE_KEY = 'idle-wizard.tutorial.v4';

const LEGACY_STEP_ID_ALIASES = new Map([
  ['earn-tutorial-gold', 'earn-tutorial-coin'],
]);

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
    return this.completedStepIds.has(normalizeTutorialStepId(stepId));
  }

  complete(stepId) {
    const normalizedStepId = normalizeTutorialStepId(stepId);

    if (!normalizedStepId || this.completedStepIds.has(normalizedStepId)) {
      return;
    }

    this.completedStepIds.add(normalizedStepId);
    this.save();
  }

  completeMany(stepIds) {
    const nextStepIds = stepIds.map(normalizeTutorialStepId).filter(
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

  setCompletedStepIds(stepIds = []) {
    this.completedStepIds = new Set(
      stepIds
        .map(normalizeTutorialStepId)
        .filter((stepId) => typeof stepId === 'string' && stepId.length > 0),
    );
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
          ? parsed.completedStepIds
              .filter((stepId) => typeof stepId === 'string')
              .map(normalizeTutorialStepId)
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

function normalizeTutorialStepId(stepId) {
  return LEGACY_STEP_ID_ALIASES.get(stepId) ?? stepId;
}
