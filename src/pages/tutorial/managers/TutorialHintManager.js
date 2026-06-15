import { setNotificationBadge } from '../../shared/notificationBadge.js';

const WITCH_GUIDE_URL = new URL('../assets/witch-guide.png', import.meta.url).href;
const POINTING_HAND_URL = new URL('../assets/pointing-hand.png', import.meta.url).href;
const HINT_WIDTH = 136;
const HINT_PADDED_WIDTH = HINT_WIDTH + 24;
const HINT_HEIGHT = 56;
const HINT_GAP = 8;
const TYPEWRITER_CHARACTER_MS = 18;
const OBJECTIVE_AUTO_CLOSE_MS = 5200;
const POINTER_HIDE_MS = 180;
const HIGHLIGHT_PAD = 4;
const HIGHLIGHT_UNDERLINE_HEIGHT = 4;
const HIGHLIGHT_UNDERLINE_OFFSET = 2;
const PORTRAIT_WIDTH = 42;
const PORTRAIT_HEIGHT = 54;
const POINTER_WIDTH = 38;
const POINTER_HEIGHT = 17;
const POINTER_HALF_EXTENT = Math.ceil((POINTER_WIDTH + POINTER_HEIGHT) * Math.SQRT1_2 * 0.5);
const POINTER_TARGET_GAP = HINT_GAP;
const GUIDE_LEFT_BIAS = 6;
const GUIDE_TOP_FRACTION = 0.18;
const GUIDE_BOTTOM_FRACTION = 0.44;
const DIALOG_TOP = 218;
const OBJECTIVE_LEFT = 92;
const OBJECTIVE_TOP = 500;
const OBJECTIVE_BUTTON_LEFT = 0;
const OBJECTIVE_BUTTON_TOP = 506;
const OBJECTIVE_BUTTON_WIDTH = 96;
const OBJECTIVE_BUTTON_HEIGHT = 118;
const OBJECTIVE_PROTECTED_SELECTORS = [
  '.workshop-page__leaderboard-button',
  '.workshop-page__trade-alliance-button',
  '.workshop-page__logs-button',
  '.workshop-page__discoveries-button',
];
const OBJECTIVE_PLACEMENTS = [
  {
    objectiveLeft: OBJECTIVE_LEFT,
    objectiveTop: OBJECTIVE_TOP,
    buttonLeft: OBJECTIVE_BUTTON_LEFT,
    buttonTop: OBJECTIVE_BUTTON_TOP,
  },
  {
    objectiveLeft: OBJECTIVE_LEFT,
    objectiveTop: 286,
    buttonLeft: OBJECTIVE_BUTTON_LEFT,
    buttonTop: 292,
  },
  {
    objectiveLeft: OBJECTIVE_LEFT,
    objectiveTop: 166,
    buttonLeft: OBJECTIVE_BUTTON_LEFT,
    buttonTop: 172,
  },
];

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
    this.objectiveCopyText = '';
    this.objectiveAutoCloseTimeout = null;
    this.pointerHideTimeout = null;
    this.typewriterTimers = new Map();
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
    objectiveTitle.textContent = 'mira';

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
    this.objectiveCopyText = '';
    this.clearObjectiveAutoClose();
    this.clearPointerHideTimeout();
    this.clearAllTypewriterTimers();
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

    const rect = this.getSourceRect(target);

    if (!rect) {
      this.hidePrompt();
      return;
    }

    this.root.hidden = false;
    this.hint.hidden = false;
    this.hint.classList.remove('is-dialog');
    this.setTypedText(this.text, text ?? '', {
      onComplete: () => this.typeAdvanceLabel(advanceOnClick),
    });
    this.stepLabel.textContent = stepLabel ?? '';
    this.advanceButton.hidden = !advanceOnClick;
    if (advanceOnClick) {
      this.advanceButton.textContent = '';
      this.advanceButton.setAttribute('aria-label', 'next');
    } else {
      this.setPlainText(this.advanceButton, '');
    }
    this.positionHighlight(rect);
    const guidePlacement = this.positionGuide(rect, showPortrait);
    this.positionPointer(rect, showPointer, guidePlacement);
    this.syncRootVisibility();
  }

  showDialog({ text, stepLabel, advanceOnClick = true }) {
    if (!this.root || !this.stage) {
      return;
    }

    this.root.hidden = false;
    this.hint.hidden = false;
    this.hint.classList.add('is-dialog');
    this.setTypedText(this.text, text ?? '', {
      onComplete: () => this.typeAdvanceLabel(advanceOnClick),
    });
    this.stepLabel.textContent = stepLabel ?? '';
    this.advanceButton.hidden = !advanceOnClick;
    if (advanceOnClick) {
      this.advanceButton.textContent = '';
      this.advanceButton.setAttribute('aria-label', 'next');
    } else {
      this.setPlainText(this.advanceButton, '');
    }
    this.hideTargetCue();
    this.positionDialog();
    this.syncRootVisibility();
  }

  showObjective({
    id,
    text,
    stepLabel,
    progress,
    progressLabel,
    attention = true,
    autoOpen = true,
  }) {
    if (!this.root || !this.stage || !this.objective || !this.objectiveButton) {
      return;
    }

    if (id && id !== this.objectiveStepId) {
      this.objectiveStepId = id;
      this.objectivePanelOpen = Boolean(autoOpen);
      this.resetTypedText(this.objectiveText);
      this.clearObjectiveAutoClose();
    }

    const normalizedProgress = this.normalizeProgress(progress);
    this.objectiveCopyText = text ?? '';
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
    this.setObjectiveAttention(attention);
    this.updateObjectiveCopy();
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

  setObjectiveAttention(active) {
    if (!this.objectiveButton) {
      return;
    }

    setNotificationBadge(this.objectiveButton, active);
    this.objectiveButton.toggleAttribute('data-attention', Boolean(active));
  }

  openObjectivePanel() {
    if (!this.objective || !this.objectiveButton) {
      return;
    }

    this.objectivePanelOpen = true;
    this.objective.hidden = false;
    this.objectiveButton.setAttribute('aria-expanded', 'true');
    this.objectiveButton.setAttribute('aria-label', 'close mira objective');
    this.setObjectiveAttention(false);
    this.hidePrompt();
    this.resetTypedText(this.objectiveText);
    this.clearObjectiveAutoClose();
    this.updateObjectiveCopy();
    this.positionObjective();
    this.syncRootVisibility();
  }

  closeObjectivePanel() {
    if (!this.objective || !this.objectiveButton) {
      return;
    }

    this.objectivePanelOpen = false;
    this.objective.hidden = true;
    this.clearObjectiveAutoClose();
    this.resetTypedText(this.objectiveText);
    this.objectiveButton.setAttribute('aria-expanded', 'false');
    this.objectiveButton.setAttribute('aria-label', 'open mira objective');
    this.syncRootVisibility();
  }

  hide() {
    if (this.hint) {
      this.hint.hidden = true;
    }

    this.hideTargetCue({ immediate: true });

    if (this.objective) {
      this.objective.hidden = true;
    }

    if (this.objectiveButton) {
      this.objectiveButton.hidden = true;
      this.objectiveButton.setAttribute('aria-expanded', 'false');
      this.objectiveButton.setAttribute('aria-label', 'open mira objective');
      this.setObjectiveAttention(false);
    }

    this.objectivePanelOpen = false;
    this.objectiveStepId = null;
    this.objectiveCopyText = '';
    this.clearObjectiveAutoClose();
    this.clearAllTypewriterTimers();
    this.resetTypedText(this.text);
    this.resetTypedText(this.advanceButton);
    this.resetTypedText(this.objectiveText);
    this.syncRootVisibility();
  }

  hidePrompt() {
    if (!this.hint) {
      return;
    }

    this.hint.hidden = true;
    this.resetTypedText(this.text);
    this.resetTypedText(this.advanceButton);
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
      this.setObjectiveAttention(false);
    }

    this.objectivePanelOpen = false;
    this.objectiveStepId = null;
    this.objectiveCopyText = '';
    this.clearObjectiveAutoClose();
    this.resetTypedText(this.objectiveText);
    this.syncRootVisibility();
  }

  hideTargetCue({ immediate = false } = {}) {
    if (this.highlight) {
      this.highlight.hidden = true;
    }

    this.hidePointer({ immediate });

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

  positionPointer(rect, showPointer, guidePlacement) {
    if (!this.pointer || !showPointer) {
      this.hidePointer();
      return;
    }

    const bounds = this.getSourceBounds();
    const protectedRects = [
      guidePlacement?.hint,
      guidePlacement?.portrait,
    ].filter(Boolean);
    const placement = this.resolvePointerPlacement({ rect, bounds, protectedRects });

    this.pointer.hidden = false;
    this.clearPointerHideTimeout();
    this.pointer.classList.remove('is-hiding');
    this.showPointerWithAnimation();
    this.pointer.dataset.placement = placement.id;
    this.pointer.style.left = `${placement.x}px`;
    this.pointer.style.top = `${placement.y}px`;
    this.pointer.style.setProperty('--tutorial-pointer-scale-x', placement.scaleX);
    this.pointer.style.setProperty('--tutorial-pointer-rotation', placement.rotation);
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

    return {
      hint: toGuideRect({ left, top }),
      portrait: showPortrait
        ? {
            left: portraitLeft,
            top: portraitTop,
            right: portraitLeft + PORTRAIT_WIDTH,
            bottom: portraitTop + PORTRAIT_HEIGHT,
          }
        : null,
    };
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

  resolvePointerPlacement({ rect, bounds, protectedRects }) {
    const candidates = createPointerCandidates(rect).map((candidate, index) => {
      const pointerRect = toPointerRect(candidate);
      const overflow = getOverflowAmount(pointerRect, bounds);
      const protectedOverlap = protectedRects.reduce(
        (total, protectedRect) => total + getOverlapArea(pointerRect, protectedRect),
        0,
      );
      const sideSpace = getPointerSideSpace(candidate.id, rect, bounds);

      return {
        ...candidate,
        index,
        score: overflow * 1000 + protectedOverlap * 3 - sideSpace,
      };
    });
    const best = candidates.sort((a, b) => a.score - b.score || a.index - b.index)[0];
    const x = clamp(
      Math.round(best.x),
      HINT_GAP + POINTER_HALF_EXTENT,
      bounds.width - HINT_GAP - POINTER_HALF_EXTENT,
    );
    const y = clamp(
      Math.round(best.y),
      HINT_GAP + POINTER_HALF_EXTENT,
      bounds.height - HINT_GAP - POINTER_HALF_EXTENT,
    );

    return {
      ...best,
      x,
      y,
    };
  }

  hidePointer({ immediate = false } = {}) {
    if (!this.pointer) {
      return;
    }

    this.clearPointerHideTimeout();

    if (this.pointer.hidden) {
      this.cleanupPointerState();
      return;
    }

    if (immediate || this.prefersReducedMotion()) {
      this.pointer.hidden = true;
      this.cleanupPointerState();
      return;
    }

    this.pointer.classList.remove('is-visible');
    this.pointer.classList.add('is-hiding');
    this.pointerHideTimeout = window.setTimeout(() => {
      this.pointerHideTimeout = null;
      if (!this.pointer) {
        return;
      }

      this.pointer.hidden = true;
      this.cleanupPointerState();
      this.syncRootVisibility();
    }, POINTER_HIDE_MS);
  }

  showPointerWithAnimation() {
    if (!this.pointer) {
      return;
    }

    if (this.prefersReducedMotion()) {
      this.pointer.classList.add('is-visible');
      return;
    }

    const view = this.pointer.ownerDocument?.defaultView ?? globalThis.window;

    if (typeof view?.requestAnimationFrame !== 'function') {
      this.pointer.classList.add('is-visible');
      return;
    }

    view.requestAnimationFrame(() => {
      this.pointer?.classList.add('is-visible');
    });
  }

  cleanupPointerState() {
    if (!this.pointer) {
      return;
    }

    this.pointer.classList.remove('is-visible', 'is-hiding');
    this.pointer.hidden = true;
    delete this.pointer.dataset.placement;
    this.pointer.style.removeProperty('--tutorial-pointer-scale-x');
    this.pointer.style.removeProperty('--tutorial-pointer-rotation');
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
    const protectedRects = this.getObjectiveProtectedRects();
    const placement = this.resolveObjectivePlacement({ bounds, protectedRects });
    const { objectiveLeft, objectiveTop, buttonLeft, buttonTop } = placement;

    this.objective.style.left = `${objectiveLeft}px`;
    this.objective.style.top = `${objectiveTop}px`;
    this.objectiveButton.style.left = `${buttonLeft}px`;
    this.objectiveButton.style.top = `${buttonTop}px`;
  }

  resolveObjectivePlacement({ bounds, protectedRects }) {
    const candidates = OBJECTIVE_PLACEMENTS.map((placement, index) => {
      const clamped = this.clampObjectivePlacement(placement, bounds);
      const rects = getObjectivePlacementRects(clamped);
      const protectedOverlap = protectedRects.reduce(
        (total, protectedRect) =>
          total +
          getOverlapArea(rects.objective, protectedRect) +
          getOverlapArea(rects.button, protectedRect),
        0,
      );

      return {
        ...clamped,
        index,
        score: protectedOverlap,
      };
    });

    return candidates.sort((a, b) => a.score - b.score || a.index - b.index)[0];
  }

  clampObjectivePlacement(placement, bounds) {
    return {
      objectiveLeft: clamp(
        placement.objectiveLeft,
        HINT_GAP,
        bounds.width - HINT_PADDED_WIDTH - HINT_GAP,
      ),
      objectiveTop: clamp(
        placement.objectiveTop,
        HINT_GAP,
        bounds.height - HINT_HEIGHT - HINT_GAP,
      ),
      buttonLeft: clamp(
        placement.buttonLeft,
        0,
        bounds.width - OBJECTIVE_BUTTON_WIDTH - HINT_GAP,
      ),
      buttonTop: clamp(
        placement.buttonTop,
        HINT_GAP,
        bounds.height - OBJECTIVE_BUTTON_HEIGHT - HINT_GAP,
      ),
    };
  }

  getObjectiveProtectedRects() {
    if (!this.stage) {
      return [];
    }

    const stageRect = this.stage.getBoundingClientRect();
    const scale = this.getUiScale();

    return OBJECTIVE_PROTECTED_SELECTORS.flatMap((selector) =>
      [...this.stage.querySelectorAll(selector)]
        .filter((element) => isVisibleElement(element))
        .map((element) => {
          const rect = element.getBoundingClientRect();

          return {
            left: (rect.left - stageRect.left) / scale,
            top: (rect.top - stageRect.top) / scale,
            right: (rect.right - stageRect.left) / scale,
            bottom: (rect.bottom - stageRect.top) / scale,
          };
        }),
    );
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

    const hasTargetCue =
      Boolean(this.highlight && !this.highlight.hidden) ||
      Boolean(this.pointer && !this.pointer.hidden) ||
      Boolean(this.portrait && !this.portrait.hidden);

    this.root.hidden =
      Boolean(this.hint?.hidden) &&
      Boolean(this.objective?.hidden) &&
      Boolean(this.objectiveButton?.hidden) &&
      !hasTargetCue;
  }

  updateObjectiveCopy() {
    if (!this.objectiveText) {
      return;
    }

    if (!this.objectivePanelOpen) {
      this.setPlainText(this.objectiveText, this.objectiveCopyText);
      return;
    }

    this.setTypedText(this.objectiveText, this.objectiveCopyText, {
      onComplete: () => this.scheduleObjectiveAutoClose(),
    });
  }

  typeAdvanceLabel(show) {
    if (!this.advanceButton || !show || this.advanceButton.hidden) {
      return;
    }

    this.setTypedText(this.advanceButton, 'next');
  }

  setPlainText(element, text) {
    if (!element) {
      return;
    }

    this.clearTypedText(element);
    element.textContent = text;

    if (text) {
      element.setAttribute('aria-label', text);
      element.dataset.tutorialFullText = text;
      return;
    }

    element.removeAttribute('aria-label');
    delete element.dataset.tutorialFullText;
  }

  setTypedText(element, text, { onComplete } = {}) {
    if (!element) {
      return;
    }

    const nextText = text ?? '';
    const existing = this.typewriterTimers.get(element);

    if (
      element.dataset.tutorialFullText === nextText &&
      existing?.isTyping &&
      element.textContent !== nextText
    ) {
      existing.onComplete = onComplete;
      return;
    }

    if (element.dataset.tutorialFullText === nextText && element.textContent === nextText) {
      onComplete?.();
      return;
    }

    this.clearTypedText(element);
    element.dataset.tutorialFullText = nextText;

    if (!nextText) {
      element.textContent = '';
      element.removeAttribute('aria-label');
      onComplete?.();
      return;
    }

    element.setAttribute('aria-label', nextText);

    if (this.prefersReducedMotion()) {
      element.textContent = nextText;
      onComplete?.();
      return;
    }

    const timerState = {
      isTyping: true,
      timeout: null,
      onComplete,
    };
    this.typewriterTimers.set(element, timerState);
    let index = 0;

    const tick = () => {
      if (!this.typewriterTimers.has(element)) {
        return;
      }

      index += 1;
      element.textContent = nextText.slice(0, index);

      if (index >= nextText.length) {
        this.typewriterTimers.delete(element);
        timerState.onComplete?.();
        return;
      }

      timerState.timeout = window.setTimeout(tick, TYPEWRITER_CHARACTER_MS);
    };

    element.textContent = '';
    timerState.timeout = window.setTimeout(tick, TYPEWRITER_CHARACTER_MS);
  }

  clearTypedText(element) {
    if (!element) {
      return;
    }

    const timerState = this.typewriterTimers.get(element);

    if (timerState?.timeout) {
      window.clearTimeout(timerState.timeout);
    }

    this.typewriterTimers.delete(element);
  }

  resetTypedText(element) {
    if (!element) {
      return;
    }

    this.clearTypedText(element);
    element.textContent = '';
    element.removeAttribute('aria-label');
    delete element.dataset.tutorialFullText;
  }

  clearAllTypewriterTimers() {
    this.typewriterTimers.forEach((timerState) => {
      if (timerState?.timeout) {
        window.clearTimeout(timerState.timeout);
      }
    });
    this.typewriterTimers.clear();
  }

  scheduleObjectiveAutoClose() {
    if (!this.objectivePanelOpen || this.objectiveAutoCloseTimeout) {
      return;
    }

    this.objectiveAutoCloseTimeout = window.setTimeout(() => {
      this.objectiveAutoCloseTimeout = null;
      this.closeObjectivePanel();
    }, OBJECTIVE_AUTO_CLOSE_MS);
  }

  clearObjectiveAutoClose() {
    if (!this.objectiveAutoCloseTimeout) {
      return;
    }

    window.clearTimeout(this.objectiveAutoCloseTimeout);
    this.objectiveAutoCloseTimeout = null;
  }

  clearPointerHideTimeout() {
    if (!this.pointerHideTimeout) {
      return;
    }

    window.clearTimeout(this.pointerHideTimeout);
    this.pointerHideTimeout = null;
  }

  prefersReducedMotion() {
    const view = this.stage?.ownerDocument?.defaultView ?? globalThis.window;

    return Boolean(view?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
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

function createPointerCandidates(rect) {
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  const diagonalOffset = (POINTER_WIDTH / 2 + POINTER_TARGET_GAP) * Math.SQRT1_2;

  return [
    {
      id: 'top-left',
      x: rect.left - diagonalOffset,
      y: rect.top - diagonalOffset,
      scaleX: '1',
      rotation: '45deg',
    },
    {
      id: 'top-right',
      x: right + diagonalOffset,
      y: rect.top - diagonalOffset,
      scaleX: '-1',
      rotation: '-45deg',
    },
    {
      id: 'bottom-left',
      x: rect.left - diagonalOffset,
      y: bottom + diagonalOffset,
      scaleX: '1',
      rotation: '-45deg',
    },
    {
      id: 'bottom-right',
      x: right + diagonalOffset,
      y: bottom + diagonalOffset,
      scaleX: '-1',
      rotation: '45deg',
    },
  ];
}

function toPointerRect({ x, y }) {
  return {
    left: x - POINTER_HALF_EXTENT,
    top: y - POINTER_HALF_EXTENT,
    right: x + POINTER_HALF_EXTENT,
    bottom: y + POINTER_HALF_EXTENT,
  };
}

function getObjectivePlacementRects({ objectiveLeft, objectiveTop, buttonLeft, buttonTop }) {
  return {
    objective: {
      left: objectiveLeft,
      top: objectiveTop,
      right: objectiveLeft + HINT_PADDED_WIDTH,
      bottom: objectiveTop + HINT_HEIGHT,
    },
    button: {
      left: buttonLeft,
      top: buttonTop,
      right: buttonLeft + OBJECTIVE_BUTTON_WIDTH,
      bottom: buttonTop + OBJECTIVE_BUTTON_HEIGHT,
    },
  };
}

function isVisibleElement(element) {
  const rect = element.getBoundingClientRect();

  if (element.hidden || rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  const view = element.ownerDocument?.defaultView ?? globalThis.window;
  const style = view?.getComputedStyle?.(element);

  return style?.display !== 'none' && style?.visibility !== 'hidden';
}

function getOverflowAmount(rect, bounds) {
  return (
    Math.max(0, HINT_GAP - rect.left) +
    Math.max(0, HINT_GAP - rect.top) +
    Math.max(0, rect.right - (bounds.width - HINT_GAP)) +
    Math.max(0, rect.bottom - (bounds.height - HINT_GAP))
  );
}

function getOverlapArea(a, b) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

  return width * height;
}

function getPointerSideSpace(id, rect, bounds) {
  const rightSpace = bounds.width - rect.left - rect.width;
  const bottomSpace = bounds.height - rect.top - rect.height;
  const spaces = {
    'top-left': Math.min(rect.left, rect.top),
    'top-right': Math.min(rightSpace, rect.top),
    'bottom-left': Math.min(rect.left, bottomSpace),
    'bottom-right': Math.min(rightSpace, bottomSpace),
  };

  return Math.max(0, spaces[id] ?? 0);
}
