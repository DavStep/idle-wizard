const SMOOTH_PROGRESS_CLASS = 'is-smooth-progress-fill';
const RUNNING_PROGRESS_CLASS = 'is-progress-running';
const END_TIME_DRIFT_MS = 120;
const MIN_SMOOTH_REMAINING_MS = 80;

const progressStates = new WeakMap();

function clampProgress(progress) {
  const value = Number(progress);

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function formatScale(progress) {
  return String(Number(clampProgress(progress).toFixed(4)));
}

function getView(element) {
  return element?.ownerDocument?.defaultView ?? globalThis;
}

function getNow(view) {
  const time = view?.performance?.now?.() ?? globalThis.performance?.now?.() ?? Date.now();
  return Number.isFinite(time) ? time : Date.now();
}

function prefersReducedMotion(element) {
  const matchMedia = getView(element)?.matchMedia;

  if (typeof matchMedia !== 'function') {
    return false;
  }

  return Boolean(matchMedia('(prefers-reduced-motion: reduce)')?.matches);
}

function applyScale(element, progress) {
  const scale = formatScale(progress);
  element.style.setProperty('--style-progress-fill-scale', scale);
  element.style.transform = `scaleX(${scale})`;
}

function clearProgressState(element) {
  const state = progressStates.get(element);

  if (state?.handleTransitionEnd) {
    element.removeEventListener('transitionend', state.handleTransitionEnd);
  }

  progressStates.delete(element);
}

export function stopProgressFill(element, progress = 0) {
  if (!element) {
    return;
  }

  clearProgressState(element);
  element.classList.add(SMOOTH_PROGRESS_CLASS);
  element.classList.remove(RUNNING_PROGRESS_CLASS);
  element.style.width = '100%';
  element.style.transition = 'none';
  applyScale(element, progress);
}

export function setProgressFill(
  element,
  progress,
  { smooth = false, remainingMs = 0 } = {},
) {
  if (!element) {
    return 0;
  }

  const safeProgress = clampProgress(progress);
  const safeRemainingMs = Math.max(0, Number(remainingMs) || 0);
  const view = getView(element);
  const requestFrame = view?.requestAnimationFrame;

  element.classList.add(SMOOTH_PROGRESS_CLASS);
  element.style.width = '100%';

  if (
    !smooth ||
    safeProgress >= 1 ||
    safeRemainingMs <= MIN_SMOOTH_REMAINING_MS ||
    prefersReducedMotion(element) ||
    typeof requestFrame !== 'function'
  ) {
    stopProgressFill(element, safeProgress);
    return safeProgress;
  }

  const now = getNow(view);
  const endTime = now + safeRemainingMs;
  const existingState = progressStates.get(element);

  if (
    existingState &&
    Math.abs(existingState.endTime - endTime) <= END_TIME_DRIFT_MS
  ) {
    return safeProgress;
  }

  clearProgressState(element);
  element.classList.remove(RUNNING_PROGRESS_CLASS);
  element.style.transition = 'none';
  applyScale(element, safeProgress);

  const handleTransitionEnd = (event) => {
    if (event.propertyName !== 'transform') {
      return;
    }

    clearProgressState(element);
    element.classList.remove(RUNNING_PROGRESS_CLASS);
  };

  const state = { endTime, handleTransitionEnd };
  progressStates.set(element, state);
  element.addEventListener('transitionend', handleTransitionEnd);

  requestFrame.call(view, () => {
    if (progressStates.get(element) !== state) {
      return;
    }

    element.classList.add(RUNNING_PROGRESS_CLASS);
    element.style.transition = `transform ${Math.ceil(safeRemainingMs)}ms linear`;
    applyScale(element, 1);
  });

  return safeProgress;
}
