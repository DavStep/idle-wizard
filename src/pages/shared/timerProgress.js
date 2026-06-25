import { setProgressFill, stopProgressFill } from './progressFill.js';

const MIN_UPDATE_DELAY_MS = 16;
const MAX_UPDATE_DELAY_MS = 1_000;

const timerProgressStates = new WeakMap();
const activeTimerProgressStates = new Set();

let scheduledUpdate = null;

function clampProgress(progress) {
  const value = Number(progress);

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function toNonNegativeMs(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, number);
}

function getView(element) {
  return element?.ownerDocument?.defaultView ?? globalThis;
}

function getNow(view) {
  const time = view?.performance?.now?.() ?? globalThis.performance?.now?.() ?? Date.now();
  return Number.isFinite(time) ? time : Date.now();
}

function normalizeTimerSnapshot(timer = {}, now = 0) {
  const remainingMs = toNonNegativeMs(timer.remainingMs);
  const suppliedProgress = clampProgress(timer.progress);
  let totalMs = toNonNegativeMs(timer.totalMs);

  if (totalMs <= 0 && remainingMs > 0 && suppliedProgress > 0 && suppliedProgress < 1) {
    totalMs = remainingMs / (1 - suppliedProgress);
  }

  totalMs = Math.max(totalMs, remainingMs);

  const progress = totalMs > 0 ? clampProgress(1 - remainingMs / totalMs) : suppliedProgress;

  return {
    endTime: now + remainingMs,
    progress,
    remainingMs,
    totalMs,
  };
}

function getCurrentTimerSnapshot(state, now) {
  const remainingMs = Math.max(0, Math.round(state.endTime - now));
  const progress =
    state.totalMs > 0 ? clampProgress(1 - remainingMs / state.totalMs) : state.progress;

  return {
    progress,
    remainingMs,
    percent: Math.round(progress * 100),
  };
}

function isConnected(element) {
  return element?.isConnected !== false;
}

function updateTimerState(state, now) {
  if (!isConnected(state.element) && !state.allowDisconnected) {
    clearTimerProgressState(state.element, { resetProgress: false });
    return false;
  }

  if (isConnected(state.element)) {
    state.allowDisconnected = false;
  }

  const snapshot = getCurrentTimerSnapshot(state, now);

  setProgressFill(state.element, snapshot.progress, {
    smooth: true,
    remainingMs: snapshot.remainingMs,
  });

  state.onUpdate?.(snapshot);

  if (snapshot.remainingMs <= 0) {
    activeTimerProgressStates.delete(state);
    timerProgressStates.delete(state.element);
  }

  return snapshot.remainingMs > 0;
}

function getNextUpdateDelayMs(state, now) {
  const remainingMs = Math.max(0, state.endTime - now);

  if (remainingMs <= 0) {
    return 0;
  }

  const nextSecondBoundaryMs = remainingMs % 1_000 || 1_000;

  return Math.max(
    MIN_UPDATE_DELAY_MS,
    Math.min(MAX_UPDATE_DELAY_MS, Math.ceil(nextSecondBoundaryMs)),
  );
}

function scheduleTimerProgressUpdates() {
  if (scheduledUpdate !== null || activeTimerProgressStates.size <= 0) {
    return;
  }

  let nextDelayMs = Number.POSITIVE_INFINITY;

  for (const state of activeTimerProgressStates) {
    const now = getNow(state.view);
    nextDelayMs = Math.min(nextDelayMs, getNextUpdateDelayMs(state, now));
  }

  if (!Number.isFinite(nextDelayMs)) {
    return;
  }

  scheduledUpdate = globalThis.setTimeout(() => {
    scheduledUpdate = null;
    runTimerProgressUpdates();
  }, nextDelayMs);
  scheduledUpdate?.unref?.();
}

function runTimerProgressUpdates() {
  for (const state of Array.from(activeTimerProgressStates)) {
    updateTimerState(state, getNow(state.view));
  }

  scheduleTimerProgressUpdates();
}

function clearScheduledUpdateIfIdle() {
  if (activeTimerProgressStates.size > 0 || scheduledUpdate === null) {
    return;
  }

  globalThis.clearTimeout?.(scheduledUpdate);
  scheduledUpdate = null;
}

function clearTimerProgressState(element, { resetProgress = true, progress = 0 } = {}) {
  const state = timerProgressStates.get(element);

  if (state) {
    activeTimerProgressStates.delete(state);
    timerProgressStates.delete(element);
  }

  clearScheduledUpdateIfIdle();

  if (resetProgress) {
    stopProgressFill(element, progress);
  }
}

export function setTimerProgressFill(element, timer, { onUpdate = null } = {}) {
  if (!element) {
    return 0;
  }

  const view = getView(element);
  const now = getNow(view);
  const next = normalizeTimerSnapshot(timer, now);

  if (next.remainingMs <= 0) {
    clearTimerProgressState(element, {
      progress: next.progress,
      resetProgress: true,
    });
    onUpdate?.({
      progress: next.progress,
      remainingMs: 0,
      percent: Math.round(next.progress * 100),
    });
    return next.progress;
  }

  const existing = timerProgressStates.get(element);
  const state =
    existing ?? {
      allowDisconnected: element.isConnected === false,
      element,
      view,
      progress: next.progress,
    };

  state.endTime = next.endTime;
  state.onUpdate = onUpdate;
  state.progress = next.progress;
  state.remainingMs = next.remainingMs;
  state.totalMs = next.totalMs;
  state.view = view;

  timerProgressStates.set(element, state);
  activeTimerProgressStates.add(state);
  updateTimerState(state, now);
  scheduleTimerProgressUpdates();

  return next.progress;
}

export function stopTimerProgressFill(element, progress = 0) {
  if (!element) {
    return;
  }

  clearTimerProgressState(element, {
    progress,
    resetProgress: true,
  });
}

export function getTimerProgressSnapshotForTest(timer, now = 0) {
  return normalizeTimerSnapshot(timer, now);
}
