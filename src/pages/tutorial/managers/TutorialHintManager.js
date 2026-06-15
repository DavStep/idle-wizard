import { setNotificationBadge } from '../../shared/notificationBadge.js';

const WITCH_GUIDE_URL = new URL('../assets/witch-guide.png', import.meta.url).href;
const POINTING_HAND_URL = new URL('../assets/pointing-hand.png', import.meta.url).href;
const HINT_WIDTH = 136;
const HINT_PADDED_WIDTH = HINT_WIDTH + 24;
const HINT_HEIGHT = 56;
const HINT_GAP = 8;
const HIGHLIGHT_PAD = 4;
const HIGHLIGHT_UNDERLINE_HEIGHT = 4;
const HIGHLIGHT_UNDERLINE_OFFSET = 2;
const PORTRAIT_WIDTH = 42;
const PORTRAIT_HEIGHT = 54;
const POINTER_WIDTH = 38;
const POINTER_HALF_HEIGHT = 10;
const GUIDE_LEFT_BIAS = 6;
const GUIDE_TOP_FRACTION = 0.18;
const GUIDE_BOTTOM_FRACTION = 0.44;
const DIALOG_TOP = 218;
const OBJECTIVE_LEFT = 76;
const OBJECTIVE_TOP = 504;
const OBJECTIVE_BUTTON_LEFT = 8;
const OBJECTIVE_BUTTON_TOP = 491;
const OBJECTIVE_BUTTON_WIDTH = 63;
const OBJECTIVE_BUTTON_HEIGHT = 81;

export class TutorialHintManager {
  constructor() {
    this.stage = null;
    this.root = null;
    this.backdrop = null;
    this.highlight = null;
    this.pointer = null;
    this.portrait = null;
    this.hint = null;
    this.stepLabel = null;
    this.text = null;
    this.advanceButton = null;
    this.objectiveButton = null;
    this.objectiveButtonImage = null;
    this.objective = null;
    this.objectiveCloseButton = null;
    this.objectiveText = null;
    this.objectiveStepLabel = null;
    this.objectiveProgress = null;
    this.objectiveProgressFill = null;
    this.objectiveProgressLabel = null;
    this.objectivePanelOpen = false;
    this.objectiveStepId = null;
    this.onAdvance = null;
    this.onObjectivePress = null;
  }

  mount(stage) {
    if (this.root) {
      return this.root;
    }

    this.stage = stage;
    this.root = document.createElement('section');
    this.root.className = 'tutorial-layer';
    this.root.hidden = true;
    this.root.setAttribute('aria-label', 'guide');

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'tutorial-layer__backdrop';
    this.backdrop.setAttribute('aria-hidden', 'true');

    this.highlight = document.createElement('div');
    this.highlight.className = 'tutorial-layer__highlight';
    this.highlight.setAttribute('aria-hidden', 'true');

    this.pointer = document.createElement('img');
    this.pointer.className = 'tutorial-layer__pointer';
    this.pointer.src = POINTING_HAND_URL;
    this.pointer.alt = '';
    this.pointer.hidden = true;
    this.pointer.setAttribute('aria-hidden', 'true');

    this.portrait = document.createElement('img');
    this.portrait.className = 'tutorial-layer__portrait';
    this.portrait.src = WITCH_GUIDE_URL;
    this.portrait.alt = '';
    this.portrait.hidden = true;
    this.portrait.setAttribute('aria-hidden', 'true');

    this.hint = document.createElement('section');
    this.hint.className = 'tutorial-layer__hint style-box';
    this.hint.hidden = true;
    this.hint.setAttribute('aria-live', 'polite');

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'mira';

    this.stepLabel = document.createElement('div');
    this.stepLabel.className = 'tutorial-layer__step-label';

    const copy = document.createElement('div');
    copy.className = 'tutorial-layer__copy';

    this.text = document.createElement('p');
    this.text.className = 'tutorial-layer__text';

    this.advanceButton = document.createElement('button');
    this.advanceButton.className = 'tutorial-layer__advance';
    this.advanceButton.type = 'button';
    this.advanceButton.textContent = 'next';
    this.advanceButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onAdvance?.();
    });

    copy.append(this.text);
    this.hint.append(title, this.stepLabel, copy, this.advanceButton);

    this.objectiveButton = document.createElement('button');
    this.objectiveButton.className = 'tutorial-layer__objective-button';
    this.objectiveButton.type = 'button';
    this.objectiveButton.hidden = true;
    this.objectiveButton.setAttribute('aria-label', 'open mira objective');
    this.objectiveButton.setAttribute('aria-controls', 'tutorial-objective');
    this.objectiveButton.setAttribute('aria-expanded', 'false');
    this.objectiveButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.objectivePanelOpen) {
        this.closeObjectivePanel();
        return;
      }

      this.openObjectivePanel();
    });

    this.objectiveButtonImage = document.createElement('img');
    this.objectiveButtonImage.className = 'tutorial-layer__objective-button-image';
    this.objectiveButtonImage.src = WITCH_GUIDE_URL;
    this.objectiveButtonImage.alt = '';
    this.objectiveButtonImage.draggable = false;
    this.objectiveButtonImage.setAttribute('aria-hidden', 'true');
    this.objectiveButton.append(this.objectiveButtonImage);

    this.objective = document.createElement('section');
    this.objective.className = 'tutorial-layer__objective style-box';
    this.objective.id = 'tutorial-objective';
    this.objective.hidden = true;
    this.objective.setAttribute('aria-live', 'polite');
    this.objective.addEventListener('click', (event) => {
      if (event.target?.closest?.('.tutorial-layer__objective-close')) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      this.onObjectivePress?.();
    });

    const objectiveTitle = document.createElement('div');
    objectiveTitle.className = 'style-box__title';
    objectiveTitle.textContent = 'objective';

    this.objectiveCloseButton = document.createElement('button');
    this.objectiveCloseButton.className = 'tutorial-layer__objective-close';
    this.objectiveCloseButton.type = 'button';
    this.objectiveCloseButton.textContent = 'close';
    this.objectiveCloseButton.setAttribute('aria-label', 'close objective');
    this.objectiveCloseButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.closeObjectivePanel();
    });

    this.objectiveStepLabel = document.createElement('div');
    this.objectiveStepLabel.className = 'tutorial-layer__objective-step-label';

    this.objectiveText = document.createElement('p');
    this.objectiveText.className = 'tutorial-layer__objective-text';

    this.objectiveProgress = document.createElement('div');
    this.objectiveProgress.className = 'style-progress tutorial-layer__objective-progress';
    this.objectiveProgress.setAttribute('aria-hidden', 'true');

    this.objectiveProgressFill = document.createElement('span');
    this.objectiveProgressFill.className = 'style-progress__fill tutorial-layer__objective-fill';
    this.objectiveProgress.append(this.objectiveProgressFill);

    this.objectiveProgressLabel = document.createElement('div');
    this.objectiveProgressLabel.className = 'tutorial-layer__objective-progress-label';

    this.objective.append(
      objectiveTitle,
      this.objectiveCloseButton,
      this.objectiveStepLabel,
      this.objectiveText,
      this.objectiveProgress,
      this.objectiveProgressLabel,
    );

    this.root.append(
      this.backdrop,
      this.highlight,
      this.pointer,
      this.portrait,
      this.objectiveButton,
      this.objective,
      this.hint,
    );
    stage.append(this.root);

    return this.root;
  }

  unmount() {
    this.root?.remove();
    this.stage = null;
    this.root = null;
    this.backdrop = null;
    this.highlight = null;
    this.pointer = null;
    this.portrait = null;
    this.hint = null;
    this.stepLabel = null;
    this.text = null;
    this.advanceButton = null;
    this.objectiveButton = null;
    this.objectiveButtonImage = null;
    this.objective = null;
    this.objectiveCloseButton = null;
    this.objectiveText = null;
    this.objectiveStepLabel = null;
    this.objectiveProgress = null;
    this.objectiveProgressFill = null;
    this.objectiveProgressLabel = null;
    this.objectivePanelOpen = false;
    this.objectiveStepId = null;
    this.onAdvance = null;
    this.onObjectivePress = null;
  }

  setAdvanceHandler(onAdvance) {
    this.onAdvance = typeof onAdvance === 'function' ? onAdvance : null;
  }

  setObjectivePressHandler(onObjectivePress) {
    this.onObjectivePress = typeof onObjectivePress === 'function' ? onObjectivePress : null;
  }

  show({
    target,
    text,
    stepLabel,
    showPointer = true,
    showPortrait = true,
    advanceOnClick = false,
  }) {
    if (!this.root || !this.stage || !target) {
      this.hidePrompt();
      return;
    }

    if (this.objectivePanelOpen) {
      this.hidePrompt();
      return;
    }

    const rect = this.getSourceRect(target);

    if (!rect) {
      this.hidePrompt();
      return;
    }

    this.root.hidden = false;
    this.hint.hidden = false;
    this.hint.classList.remove('is-dialog');
    this.text.textContent = text ?? '';
    this.stepLabel.textContent = stepLabel ?? '';
    this.advanceButton.hidden = !advanceOnClick;
    this.positionHighlight(rect);
    this.positionPointer(rect, showPointer);
    this.positionGuide(rect, showPortrait);
    this.syncRootVisibility();
  }

  showDialog({ text, stepLabel, advanceOnClick = true }) {
    if (!this.root || !this.stage) {
      return;
    }

    this.root.hidden = false;
    this.hint.hidden = false;
    this.hint.classList.add('is-dialog');
    this.text.textContent = text ?? '';
    this.stepLabel.textContent = stepLabel ?? '';
    this.advanceButton.hidden = !advanceOnClick;
    this.hideTargetCue();
    this.positionDialog();
    this.syncRootVisibility();
  }

  showObjective({ id, text, stepLabel, progress, progressLabel }) {
    if (!this.root || !this.stage || !this.objective || !this.objectiveButton) {
      return;
    }

    if (id && id !== this.objectiveStepId) {
      this.objectiveStepId = id;
      this.objectivePanelOpen = false;
    }

    const normalizedProgress = this.normalizeProgress(progress);
    this.root.hidden = false;
    this.objectiveButton.hidden = false;
    this.objective.hidden = !this.objectivePanelOpen;
    this.objectiveButton.setAttribute(
      'aria-expanded',
      this.objectivePanelOpen ? 'true' : 'false',
    );
    this.objectiveButton.setAttribute(
      'aria-label',
      this.objectivePanelOpen ? 'close mira objective' : 'open mira objective',
    );
    setNotificationBadge(this.objectiveButton, true);
    this.objectiveText.textContent = text ?? '';
    this.objectiveStepLabel.textContent = stepLabel ?? '';
    this.objectiveProgress.hidden = !normalizedProgress;
    this.objectiveProgressLabel.hidden = !normalizedProgress && !progressLabel;
    this.objectiveProgressLabel.textContent = progressLabel ?? '';

    if (normalizedProgress !== null) {
      this.objectiveProgressFill.style.width = `${normalizedProgress * 100}%`;
    }

    this.positionObjective();
    this.syncRootVisibility();
  }

  openObjectivePanel() {
    if (!this.objective || !this.objectiveButton) {
      return;
    }

    this.objectivePanelOpen = true;
    this.objective.hidden = false;
    this.objectiveButton.setAttribute('aria-expanded', 'true');
    this.objectiveButton.setAttribute('aria-label', 'close mira objective');
    this.hidePrompt();
    this.positionObjective();
    this.syncRootVisibility();
  }

  closeObjectivePanel() {
    if (!this.objective || !this.objectiveButton) {
      return;
    }

    this.objectivePanelOpen = false;
    this.objective.hidden = true;
    this.objectiveButton.setAttribute('aria-expanded', 'false');
    this.objectiveButton.setAttribute('aria-label', 'open mira objective');
    this.syncRootVisibility();
  }

  hide() {
    if (this.hint) {
      this.hint.hidden = true;
    }

    this.hideTargetCue();

    if (this.objective) {
      this.objective.hidden = true;
    }

    if (this.objectiveButton) {
      this.objectiveButton.hidden = true;
      this.objectiveButton.setAttribute('aria-expanded', 'false');
      this.objectiveButton.setAttribute('aria-label', 'open mira objective');
      setNotificationBadge(this.objectiveButton, false);
    }

    this.objectivePanelOpen = false;
    this.objectiveStepId = null;
    this.syncRootVisibility();
  }

  hidePrompt() {
    if (!this.hint) {
      return;
    }

    this.hint.hidden = true;
    this.hideTargetCue();
    this.syncRootVisibility();
  }

  hideObjective() {
    if (this.objective) {
      this.objective.hidden = true;
    }

    if (this.objectiveButton) {
      this.objectiveButton.hidden = true;
      this.objectiveButton.setAttribute('aria-expanded', 'false');
      this.objectiveButton.setAttribute('aria-label', 'open mira objective');
      setNotificationBadge(this.objectiveButton, false);
    }

    this.objectivePanelOpen = false;
    this.objectiveStepId = null;
    this.syncRootVisibility();
  }

  hideTargetCue() {
    if (this.highlight) {
      this.highlight.hidden = true;
    }

    if (this.pointer) {
      this.pointer.hidden = true;
    }

    if (this.portrait) {
      this.portrait.hidden = true;
    }
  }

  getSourceRect(target) {
    const stageRect = this.stage.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const scale = this.getUiScale();

    if (targetRect.width <= 0 && targetRect.height <= 0) {
      return null;
    }

    return {
      left: (targetRect.left - stageRect.left) / scale,
      top: (targetRect.top - stageRect.top) / scale,
      width: targetRect.width / scale,
      height: targetRect.height / scale,
    };
  }

  getUiScale() {
    const view = this.stage?.ownerDocument?.defaultView ?? globalThis.window;
    const scale = Number.parseFloat(
      view?.getComputedStyle?.(this.stage)?.getPropertyValue('--style-ui-scale'),
    );

    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  positionHighlight(rect) {
    const bounds = this.getSourceBounds();
    const left = Math.max(0, rect.left - HIGHLIGHT_PAD);
    const top = clamp(
      rect.top + rect.height + HIGHLIGHT_UNDERLINE_OFFSET,
      0,
      Math.max(0, bounds.height - HIGHLIGHT_UNDERLINE_HEIGHT),
    );
    const width = Math.max(0, Math.min(bounds.width - left, rect.width + HIGHLIGHT_PAD * 2));

    this.highlight.hidden = false;
    this.highlight.style.left = `${left}px`;
    this.highlight.style.top = `${top}px`;
    this.highlight.style.width = `${width}px`;
    this.highlight.style.height = `${HIGHLIGHT_UNDERLINE_HEIGHT}px`;
  }

  positionPointer(rect, showPointer) {
    if (!this.pointer || !showPointer) {
      this.pointer.hidden = true;
      return;
    }

    const bounds = this.getSourceBounds();
    const hasLeftRoom = rect.left > POINTER_WIDTH + HINT_GAP * 2;
    const targetX = hasLeftRoom
      ? rect.left - HINT_GAP - POINTER_WIDTH / 2
      : rect.left + rect.width + HINT_GAP + POINTER_WIDTH / 2;
    const x = clamp(
      targetX,
      HINT_GAP + POINTER_WIDTH / 2,
      bounds.width - HINT_GAP - POINTER_WIDTH / 2,
    );
    const y = clamp(
      rect.top + rect.height / 2,
      HINT_GAP + POINTER_HALF_HEIGHT,
      bounds.height - HINT_GAP - POINTER_HALF_HEIGHT,
    );

    this.pointer.hidden = false;
    this.pointer.style.left = `${x}px`;
    this.pointer.style.top = `${y}px`;
    this.pointer.style.setProperty('--tutorial-pointer-scale-x', hasLeftRoom ? '1' : '-1');
  }

  positionGuide(rect, showPortrait = true) {
    const bounds = this.getSourceBounds();
    const baseLeft = clamp(
      (bounds.width - HINT_PADDED_WIDTH) / 2 - GUIDE_LEFT_BIAS,
      HINT_GAP + PORTRAIT_WIDTH - 4,
      Math.max(HINT_GAP + PORTRAIT_WIDTH - 4, bounds.width - HINT_PADDED_WIDTH - HINT_GAP),
    );
    const targetMiddle = rect.top + rect.height / 2;
    const topFraction =
      targetMiddle < bounds.height / 2 ? GUIDE_BOTTOM_FRACTION : GUIDE_TOP_FRACTION;
    const baseTop = clamp(
      Math.round(bounds.height * topFraction),
      HINT_GAP,
      bounds.height - HINT_HEIGHT - HINT_GAP,
    );
    const placement = this.resolveGuidePlacement({
      rect,
      bounds,
      baseLeft,
      baseTop,
    });
    const { left, top } = placement;
    const portraitLeft = left - PORTRAIT_WIDTH + 4;
    const portraitTop = clamp(
      top + HINT_HEIGHT - PORTRAIT_HEIGHT + 9,
      HINT_GAP,
      bounds.height - PORTRAIT_HEIGHT - HINT_GAP,
    );

    this.hint.style.left = `${left}px`;
    this.hint.style.top = `${top}px`;
    this.portrait.style.left = `${portraitLeft}px`;
    this.portrait.style.top = `${portraitTop}px`;
    this.portrait.hidden = !showPortrait;
  }

  resolveGuidePlacement({ rect, bounds, baseLeft, baseTop }) {
    const base = { left: baseLeft, top: baseTop };

    if (!rectsOverlap(toGuideRect(base), toPaddedRect(rect, HINT_GAP))) {
      return base;
    }

    const minLeft = HINT_GAP + PORTRAIT_WIDTH - 4;
    const maxLeft = Math.max(minLeft, bounds.width - HINT_PADDED_WIDTH - HINT_GAP);
    const minTop = HINT_GAP;
    const maxTop = bounds.height - HINT_HEIGHT - HINT_GAP;
    const centeredTop = clamp(
      Math.round(rect.top + rect.height / 2 - HINT_HEIGHT / 2),
      minTop,
      maxTop,
    );
    const candidates = [
      { left: baseLeft, top: rect.top + rect.height + HINT_GAP },
      { left: baseLeft, top: rect.top - HINT_HEIGHT - HINT_GAP },
      { left: rect.left + rect.width + HINT_GAP, top: centeredTop },
      { left: rect.left - HINT_PADDED_WIDTH - HINT_GAP, top: centeredTop },
    ]
      .map((candidate) => ({
        left: clamp(Math.round(candidate.left), minLeft, maxLeft),
        top: clamp(Math.round(candidate.top), minTop, maxTop),
      }))
      .filter((candidate) => !rectsOverlap(toGuideRect(candidate), toPaddedRect(rect, 0)));

    return candidates[0] ?? base;
  }

  positionDialog() {
    const bounds = this.getSourceBounds();
    const left = clamp(
      (bounds.width - HINT_PADDED_WIDTH) / 2 - GUIDE_LEFT_BIAS,
      HINT_GAP + PORTRAIT_WIDTH - 4,
      Math.max(HINT_GAP + PORTRAIT_WIDTH - 4, bounds.width - HINT_PADDED_WIDTH - HINT_GAP),
    );
    const top = clamp(DIALOG_TOP, HINT_GAP, bounds.height - HINT_HEIGHT - HINT_GAP);
    const portraitLeft = left - PORTRAIT_WIDTH + 4;
    const portraitTop = clamp(
      top + HINT_HEIGHT - PORTRAIT_HEIGHT + 9,
      HINT_GAP,
      bounds.height - PORTRAIT_HEIGHT - HINT_GAP,
    );

    this.hint.style.left = `${left}px`;
    this.hint.style.top = `${top}px`;
    this.portrait.style.left = `${portraitLeft}px`;
    this.portrait.style.top = `${portraitTop}px`;
    this.portrait.hidden = false;
  }

  positionObjective() {
    const bounds = this.getSourceBounds();
    const objectiveLeft = clamp(
      OBJECTIVE_LEFT,
      HINT_GAP,
      bounds.width - HINT_PADDED_WIDTH - HINT_GAP,
    );
    const objectiveTop = clamp(OBJECTIVE_TOP, HINT_GAP, bounds.height - HINT_HEIGHT - HINT_GAP);
    const buttonLeft = clamp(
      OBJECTIVE_BUTTON_LEFT,
      HINT_GAP,
      bounds.width - OBJECTIVE_BUTTON_WIDTH - HINT_GAP,
    );
    const buttonTop = clamp(
      OBJECTIVE_BUTTON_TOP,
      HINT_GAP,
      bounds.height - OBJECTIVE_BUTTON_HEIGHT - HINT_GAP,
    );

    this.objective.style.left = `${objectiveLeft}px`;
    this.objective.style.top = `${objectiveTop}px`;
    this.objectiveButton.style.left = `${buttonLeft}px`;
    this.objectiveButton.style.top = `${buttonTop}px`;
  }

  getSourceBounds() {
    const rect = this.stage.getBoundingClientRect();
    const scale = this.getUiScale();

    return {
      width: rect.width > 0 ? rect.width / scale : 360,
      height: rect.height > 0 ? rect.height / scale : 720,
    };
  }

  normalizeProgress(progress) {
    if (!progress || !Number.isFinite(progress.value) || !Number.isFinite(progress.max)) {
      return null;
    }

    if (progress.max <= 0) {
      return null;
    }

    return clamp(progress.value / progress.max, 0, 1);
  }

  syncRootVisibility() {
    if (!this.root) {
      return;
    }

    this.root.hidden =
      Boolean(this.hint?.hidden) &&
      Boolean(this.objective?.hidden) &&
      Boolean(this.objectiveButton?.hidden);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toGuideRect({ left, top }) {
  return {
    left,
    top,
    right: left + HINT_PADDED_WIDTH,
    bottom: top + HINT_HEIGHT,
  };
}

function toPaddedRect(rect, padding) {
  return {
    left: rect.left - padding,
    top: rect.top - padding,
    right: rect.left + rect.width + padding,
    bottom: rect.top + rect.height + padding,
  };
}

function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
