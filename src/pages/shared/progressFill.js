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
  const transform = `scaleX(${scale})`;

  if (element.style.getPropertyValue('--style-progress-fill-scale') !== scale) {
    element.style.setProperty('--style-progress-fill-scale', scale);
  }

  if (element.style.transform !== transform) {
    element.style.transform = transform;
  }

  return scale;
}

function setStyleValue(element, property, value) {
  if (element.style[property] !== value) {
    element.style[property] = value;
  }
}

function commitCurrentStyle(element) {
  const computedStyle = getView(element)?.getComputedStyle?.(element);

  if (computedStyle) {
    return computedStyle.transform;
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

  const scale = formatScale(progress);
  const transition = 'none';
  const existingState = progressStates.get(element);

  if (
    existingState?.mode === 'stopped' &&
    existingState.scale === scale &&
    existingState.transition === transition &&
    element.style.width === '100%' &&
    element.style.transition === transition &&
    element.style.transform === `scaleX(${scale})` &&
    !element.classList.contains(RUNNING_PROGRESS_CLASS)
  ) {
    return;
  }

  clearProgressState(element);
  element.classList.add(SMOOTH_PROGRESS_CLASS);
  element.classList.remove(RUNNING_PROGRESS_CLASS);
  setStyleValue(element, 'width', '100%');
  setStyleValue(element, 'transition', transition);
  progressStates.set(element, {
    mode: 'stopped',
    scale: applyScale(element, progress),
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
  setStyleValue(element, 'width', '100%');

  if (safeProgress <= 0) {
    stopProgressFill(element, 0);
    return safeProgress;
  }

  if (smoothMode === 'step') {
    const stepTransitionMs = getStepTransitionMs(stepMs, remainingMs);
    const transition = prefersReducedMotion(element) || stepTransitionMs <= 0
      ? 'none'
      : `transform ${stepTransitionMs}ms linear`;
    const scale = formatScale(safeProgress);
    const existingState = progressStates.get(element);

    if (
      existingState?.mode === 'step' &&
      existingState.scale === scale &&
      existingState.transition === transition &&
      element.style.width === '100%' &&
      element.style.transition === transition &&
      element.style.transform === `scaleX(${scale})` &&
      !element.classList.contains(RUNNING_PROGRESS_CLASS)
    ) {
      return safeProgress;
    }

    clearProgressState(element);
    element.classList.remove(RUNNING_PROGRESS_CLASS);
    setStyleValue(element, 'transition', transition);
    progressStates.set(element, {
      mode: 'step',
      scale: applyScale(element, safeProgress),
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
  applyScale(element, safeProgress);

  const handleTransitionEnd = (event) => {
    if (event.propertyName !== 'transform') {
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
    element.style.transition = `transform ${Math.ceil(safeRemainingMs)}ms linear`;
    applyScale(element, 1);
  });

  return safeProgress;
}
