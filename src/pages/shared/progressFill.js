const SMOOTH_PROGRESS_CLASS = 'is-smooth-progress-fill';
const RUNNING_PROGRESS_CLASS = 'is-progress-running';
const END_TIME_DRIFT_MS = 120;
const MIN_SMOOTH_REMAINING_MS = 80;
const DEFAULT_STEP_TRANSITION_MS = 140;

const progressStates = new WeakMap();

function clampProgress(progress) {
  const value = Number(progress);

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function formatWidth(progress) {
  return `${Number((clampProgress(progress) * 100).toFixed(4))}%`;
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

function applyWidth(element, progress) {
  const width = formatWidth(progress);

  setStyleValue(element, 'width', width);
  setStyleValue(element, 'transform', '');
  element.style.removeProperty('--style-progress-fill-scale');

  return width;
}

function setStyleValue(element, property, value) {
  if (element.style[property] !== value) {
    element.style[property] = value;
  }
}

function commitCurrentStyle(element) {
  const computedStyle = getView(element)?.getComputedStyle?.(element);

  if (computedStyle) {
    return computedStyle.width;
  }

  return element.getBoundingClientRect();
}

function clearProgressState(element) {
  const state = progressStates.get(element);

  if (state?.handleTransitionEnd) {
    element.removeEventListener('transitionend', state.handleTransitionEnd);
  }

  progressStates.delete(element);
}

function getSmoothMode(smooth) {
  if (smooth === 'step') {
    return 'step';
  }

  return smooth ? 'continuous' : 'none';
}

function getStepTransitionMs(stepMs, remainingMs) {
  const safeStepMs = Math.max(0, Number(stepMs) || 0);
  const transitionMs = safeStepMs > 0 ? Math.ceil(safeStepMs) : DEFAULT_STEP_TRANSITION_MS;

  if (remainingMs === null || remainingMs === undefined) {
    return transitionMs;
  }

  const safeRemainingMs = Math.max(0, Number(remainingMs) || 0);

  if (safeRemainingMs <= 0) {
    return 0;
  }

  return Math.min(transitionMs, Math.ceil(safeRemainingMs));
}

export function stopProgressFill(element, progress = 0) {
  if (!element) {
    return;
  }

  const width = formatWidth(progress);
  const transition = 'none';
  const existingState = progressStates.get(element);

  if (
    existingState?.mode === 'stopped' &&
    existingState.width === width &&
    existingState.transition === transition &&
    element.style.width === width &&
    element.style.transition === transition &&
    element.style.transform === '' &&
    !element.classList.contains(RUNNING_PROGRESS_CLASS)
  ) {
    return;
  }

  clearProgressState(element);
  element.classList.add(SMOOTH_PROGRESS_CLASS);
  element.classList.remove(RUNNING_PROGRESS_CLASS);
  setStyleValue(element, 'transition', transition);
  progressStates.set(element, {
    mode: 'stopped',
    width: applyWidth(element, progress),
    transition,
  });
}

export function setProgressFill(
  element,
  progress,
  { smooth = false, remainingMs = null, stepMs = DEFAULT_STEP_TRANSITION_MS } = {},
) {
  if (!element) {
    return 0;
  }

  const safeProgress = clampProgress(progress);
  const safeRemainingMs = Math.max(0, Number(remainingMs) || 0);
  const view = getView(element);
  const requestFrame = view?.requestAnimationFrame;
  const smoothMode = getSmoothMode(smooth);

  element.classList.add(SMOOTH_PROGRESS_CLASS);

  if (
    safeProgress <= 0 &&
    !(smoothMode === 'continuous' && safeRemainingMs > MIN_SMOOTH_REMAINING_MS)
  ) {
    stopProgressFill(element, 0);
    return safeProgress;
  }

  if (smoothMode === 'step') {
    const stepTransitionMs = getStepTransitionMs(stepMs, remainingMs);
    const transition = prefersReducedMotion(element) || stepTransitionMs <= 0
      ? 'none'
      : `width ${stepTransitionMs}ms linear`;
    const width = formatWidth(safeProgress);
    const existingState = progressStates.get(element);

    if (
      existingState?.mode === 'step' &&
      existingState.width === width &&
      existingState.transition === transition &&
      element.style.width === width &&
      element.style.transition === transition &&
      element.style.transform === '' &&
      !element.classList.contains(RUNNING_PROGRESS_CLASS)
    ) {
      return safeProgress;
    }

    clearProgressState(element);
    element.classList.remove(RUNNING_PROGRESS_CLASS);
    setStyleValue(element, 'transition', transition);
    progressStates.set(element, {
      mode: 'step',
      width: applyWidth(element, safeProgress),
      transition,
    });
    return safeProgress;
  }

  if (
    smoothMode !== 'continuous' ||
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
    existingState.mode === 'continuous' &&
    Math.abs(existingState.endTime - endTime) <= END_TIME_DRIFT_MS
  ) {
    return safeProgress;
  }

  clearProgressState(element);
  element.classList.remove(RUNNING_PROGRESS_CLASS);
  setStyleValue(element, 'transition', 'none');
  applyWidth(element, safeProgress);

  const handleTransitionEnd = (event) => {
    if (event.propertyName !== 'width') {
      return;
    }

    clearProgressState(element);
    element.classList.remove(RUNNING_PROGRESS_CLASS);
  };

  const state = { mode: 'continuous', endTime, handleTransitionEnd };
  progressStates.set(element, state);
  element.addEventListener('transitionend', handleTransitionEnd);

  requestFrame.call(view, () => {
    if (progressStates.get(element) !== state) {
      return;
    }

    commitCurrentStyle(element);
    element.classList.add(RUNNING_PROGRESS_CLASS);
    element.style.transition = `width ${Math.ceil(safeRemainingMs)}ms linear`;
    applyWidth(element, 1);
  });

  return safeProgress;
}
