export const QUEST_REQUEST_FILL_DURATION_MS = 260;
export const QUEST_REQUEST_SHINE_DURATION_MS = 300;
export const QUEST_REQUEST_BOX_BOINK_DURATION_MS = 140;
export const QUEST_REQUEST_FEEDBACK_DURATION_MS =
  QUEST_REQUEST_SHINE_DURATION_MS;

const IDLE_SNAPSHOT = Object.freeze({
  active: false,
  phase: 'idle',
  transitionId: 0,
  previousTaskId: null,
  nextTaskId: null,
  fillDurationMs: QUEST_REQUEST_FILL_DURATION_MS,
});

/**
 * Keeps the Workshop request row and the global level HUD on one completion
 * timeline without making either retained view reach into the other.
 */
export class QuestCompletionMotionCoordinator {
  static explain =
    'Sequences the Elara request fill, level-star flight, and next-request reveal across retained Pixi surfaces.';

  constructor() {
    this.snapshot = IDLE_SNAPSHOT;
    this.listeners = new Set();
    this.nextTransitionId = 1;
  }

  getSnapshot() {
    return this.snapshot;
  }

  subscribe(listener, { emitCurrent = false } = {}) {
    if (typeof listener !== 'function') {
      return () => {};
    }
    this.listeners.add(listener);
    if (emitCurrent) {
      listener(this.snapshot);
    }
    return () => this.listeners.delete(listener);
  }

  begin({
    previousTaskId = null,
    nextTaskId = null,
    fillDurationMs = QUEST_REQUEST_FILL_DURATION_MS,
  } = {}) {
    const transitionId = this.nextTransitionId++;
    this.snapshot = Object.freeze({
      active: true,
      phase: 'filling',
      transitionId,
      previousTaskId: normalizeTaskId(previousTaskId),
      nextTaskId: normalizeTaskId(nextTaskId),
      fillDurationMs: Math.max(1, Number(fillDurationMs) || QUEST_REQUEST_FILL_DURATION_MS),
    });
    this.emit();
    return transitionId;
  }

  startFlight(transitionId = this.snapshot.transitionId) {
    if (!this.matchesActiveTransition(transitionId)) {
      return false;
    }
    this.snapshot = Object.freeze({
      ...this.snapshot,
      phase: 'flying',
    });
    this.emit();
    return true;
  }

  complete(transitionId = this.snapshot.transitionId) {
    if (!this.matchesActiveTransition(transitionId)) {
      return false;
    }
    const completed = Object.freeze({
      ...this.snapshot,
      active: false,
      phase: 'complete',
    });
    this.snapshot = completed;
    this.emit();
    this.snapshot = Object.freeze({
      ...IDLE_SNAPSHOT,
      transitionId: completed.transitionId,
    });
    return true;
  }

  cancel() {
    if (!this.snapshot.active) {
      return false;
    }
    return this.complete(this.snapshot.transitionId);
  }

  destroy() {
    this.cancel();
    this.listeners.clear();
  }

  matchesActiveTransition(transitionId) {
    return Boolean(
      this.snapshot.active &&
      this.snapshot.transitionId === transitionId,
    );
  }

  emit() {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }
}

function normalizeTaskId(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}
