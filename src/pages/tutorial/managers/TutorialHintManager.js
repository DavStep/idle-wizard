import { setNotificationBadge } from '../../shared/notificationBadge.js';

const WITCH_GUIDE_URL = new URL('../assets/witch-guide.png', import.meta.url).href;
const POINTING_HAND_URL = new URL('../assets/pointing-hand.png', import.meta.url).href;
const GUIDE_NAME = 'Elara Starbrew';
const HINT_WIDTH = 190;
const HINT_PADDED_WIDTH = HINT_WIDTH + 24;
const HINT_HEIGHT = 56;
const DIALOG_WIDTH = 244;
const DIALOG_PADDED_WIDTH = DIALOG_WIDTH + 24;
const DIALOG_HEIGHT = 95;
const OBJECTIVE_WIDTH = HINT_WIDTH;
const OBJECTIVE_PADDED_WIDTH = OBJECTIVE_WIDTH + 24;
const OBJECTIVE_HEIGHT = DIALOG_HEIGHT;
const OBJECTIVE_CONTENT_HEIGHT = 74;
const OBJECTIVE_HORIZONTAL_CHROME = OBJECTIVE_PADDED_WIDTH - OBJECTIVE_WIDTH;
const OBJECTIVE_VERTICAL_CHROME = OBJECTIVE_HEIGHT - OBJECTIVE_CONTENT_HEIGHT;
const LESSON_MIN_WIDTH = 136;
const LESSON_MAX_WIDTH = DIALOG_WIDTH;
const LESSON_MIN_HEIGHT = 34;
const LESSON_MAX_HEIGHT = 126;
const LESSON_ESTIMATED_CHAR_WIDTH = 6.4;
const LESSON_ESTIMATED_LINE_HEIGHT = 16;
const HINT_GAP = 8;
const TYPEWRITER_INTERVAL_MS = 12;
const TYPEWRITER_CHARS_PER_TICK = 2;
const POINTER_HIDE_MS = 180;
const OBJECTIVE_BUTTON_COLLAPSED_LABEL = 'help';
const PORTRAIT_WIDTH = 70;
const PORTRAIT_HEIGHT = 91;
const PORTRAIT_LEFT_GAP = 4;
const PORTRAIT_BOX_OVERLAP = 0;
const POINTER_WIDTH = 32;
const POINTER_HEIGHT = 16;
const POINTER_HALF_EXTENT = Math.ceil((POINTER_WIDTH + POINTER_HEIGHT) * Math.SQRT1_2 * 0.5);
const POINTER_TARGET_GAP = HINT_GAP;
const GUIDE_LEFT_BIAS = 6;
const GUIDE_TOP_FRACTION = 0.18;
const GUIDE_BOTTOM_FRACTION = 0.44;
const DIALOG_TOP = 218;
const GUIDE_BOX_LEFT_MIN = PORTRAIT_LEFT_GAP + PORTRAIT_WIDTH - PORTRAIT_BOX_OVERLAP;
const OBJECTIVE_LEFT = GUIDE_BOX_LEFT_MIN;
const OBJECTIVE_TOP = 520;
const OBJECTIVE_BUTTON_LEFT = PORTRAIT_LEFT_GAP;
const OBJECTIVE_BUTTON_TOP = OBJECTIVE_TOP + OBJECTIVE_HEIGHT - PORTRAIT_HEIGHT + 9;
const OBJECTIVE_BUTTON_WIDTH = PORTRAIT_WIDTH;
const OBJECTIVE_BUTTON_HEIGHT = PORTRAIT_HEIGHT;
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
    objectiveTop: 260,
    buttonLeft: OBJECTIVE_BUTTON_LEFT,
    buttonTop: 260 + OBJECTIVE_HEIGHT - PORTRAIT_HEIGHT + 9,
  },
  {
    objectiveLeft: OBJECTIVE_LEFT,
    objectiveTop: 166,
    buttonLeft: OBJECTIVE_BUTTON_LEFT,
    buttonTop: 166 + OBJECTIVE_HEIGHT - PORTRAIT_HEIGHT + 9,
  },
];

export class TutorialHintManager {
  constructor() {
    this.stage = null;
    this.root = null;
    this.backdrop = null;
    this.pointer = null;
    this.pointerImage = null;
    this.portrait = null;
    this.hint = null;
    this.stepLabel = null;
    this.text = null;
    this.advanceButton = null;
    this.objectiveButton = null;
    this.objectiveButtonImage = null;
    this.objectiveButtonLabel = null;
    this.objective = null;
    this.objectiveTitle = null;
    this.objectiveText = null;
    this.objectiveStepLabel = null;
    this.objectiveProgress = null;
    this.objectiveProgressFill = null;
    this.objectiveProgressLabel = null;
    this.lessonAdvanceButton = null;
    this.lessonShowButton = null;
    this.objectiveWidth = OBJECTIVE_WIDTH;
    this.objectiveHeight = OBJECTIVE_CONTENT_HEIGHT;
    this.objectivePanelOpen = false;
    this.objectiveAttentionActive = false;
    this.objectiveStepId = null;
    this.objectiveCopyText = '';
    this.blockingDialogSuspended = false;
    this.pointerState = null;
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
    this.root.setAttribute('aria-label', `${GUIDE_NAME} guide`);

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'tutorial-layer__backdrop';
    this.backdrop.setAttribute('aria-hidden', 'true');

    this.pointer = document.createElement('span');
    this.pointer.className = 'tutorial-layer__pointer';
    this.pointer.hidden = true;
    this.pointer.setAttribute('aria-hidden', 'true');

    this.pointerImage = document.createElement('img');
    this.pointerImage.className = 'tutorial-layer__pointer-image';
    this.pointerImage.src = POINTING_HAND_URL;
    this.pointerImage.alt = '';
    this.pointerImage.draggable = false;
    this.pointerImage.setAttribute('aria-hidden', 'true');
    this.pointer.append(this.pointerImage);

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
    title.textContent = GUIDE_NAME;

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
    this.objectiveButton.className =
      'tutorial-layer__lesson-button tutorial-layer__objective-button';
    this.objectiveButton.type = 'button';
    this.objectiveButton.hidden = true;
    this.objectiveButton.setAttribute('aria-label', 'open lesson');
    this.objectiveButton.setAttribute('aria-controls', 'tutorial-lesson');
    this.objectiveButton.setAttribute('aria-expanded', 'false');
    this.objectiveButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.objectivePanelOpen) {
        this.closeLessonPanel();
        return;
      }

      this.openLessonPanel();
    });

    this.objectiveButtonImage = document.createElement('img');
    this.objectiveButtonImage.className =
      'tutorial-layer__lesson-button-image tutorial-layer__objective-button-image';
    this.objectiveButtonImage.src = WITCH_GUIDE_URL;
    this.objectiveButtonImage.alt = '';
    this.objectiveButtonImage.draggable = false;
    this.objectiveButtonImage.setAttribute('aria-hidden', 'true');

    this.objectiveButtonLabel = document.createElement('span');
    this.objectiveButtonLabel.className = 'tutorial-layer__objective-button-label';
    this.objectiveButtonLabel.textContent = OBJECTIVE_BUTTON_COLLAPSED_LABEL;
    this.objectiveButtonLabel.setAttribute('aria-hidden', 'true');

    this.objectiveButton.append(this.objectiveButtonImage, this.objectiveButtonLabel);

    this.objective = document.createElement('section');
    this.objective.className = 'tutorial-layer__lesson tutorial-layer__objective style-box';
    this.objective.id = 'tutorial-lesson';
    this.objective.hidden = true;
    this.objective.setAttribute('aria-live', 'polite');
    this.objective.addEventListener('click', (event) => {
      if (
        event.target?.closest?.(
          '.tutorial-layer__lesson-advance, .tutorial-layer__lesson-show',
        )
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      this.onObjectivePress?.();
    });

    this.objectiveTitle = document.createElement('div');
    this.objectiveTitle.className = 'style-box__title';
    this.objectiveTitle.textContent = 'lesson';

    this.objectiveStepLabel = document.createElement('div');
    this.objectiveStepLabel.className =
      'tutorial-layer__lesson-step-label tutorial-layer__objective-step-label';

    this.objectiveText = document.createElement('p');
    this.objectiveText.className = 'tutorial-layer__lesson-text tutorial-layer__objective-text';

    this.objectiveProgress = document.createElement('div');
    this.objectiveProgress.className =
      'style-progress tutorial-layer__lesson-progress tutorial-layer__objective-progress';
    this.objectiveProgress.setAttribute('aria-hidden', 'true');

    this.objectiveProgressFill = document.createElement('span');
    this.objectiveProgressFill.className =
      'style-progress__fill tutorial-layer__lesson-fill tutorial-layer__objective-fill';
    this.objectiveProgress.append(this.objectiveProgressFill);

    this.objectiveProgressLabel = document.createElement('div');
    this.objectiveProgressLabel.className =
      'tutorial-layer__lesson-progress-label tutorial-layer__objective-progress-label';

    this.lessonShowButton = document.createElement('button');
    this.lessonShowButton.className = 'tutorial-layer__lesson-show';
    this.lessonShowButton.type = 'button';
    this.lessonShowButton.textContent = 'show me';
    this.lessonShowButton.hidden = true;
    this.lessonShowButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onObjectivePress?.();
    });

    this.lessonAdvanceButton = document.createElement('button');
    this.lessonAdvanceButton.className = 'tutorial-layer__lesson-advance tutorial-layer__advance';
    this.lessonAdvanceButton.type = 'button';
    this.lessonAdvanceButton.textContent = 'next';
    this.lessonAdvanceButton.hidden = true;
    this.lessonAdvanceButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onAdvance?.();
    });

    this.objective.append(
      this.objectiveTitle,
      this.objectiveStepLabel,
      this.objectiveText,
      this.objectiveProgress,
      this.objectiveProgressLabel,
      this.lessonShowButton,
      this.lessonAdvanceButton,
    );

    this.root.append(
      this.backdrop,
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
    this.pointer = null;
    this.pointerImage = null;
    this.portrait = null;
    this.hint = null;
    this.stepLabel = null;
    this.text = null;
    this.advanceButton = null;
    this.objectiveButton = null;
    this.objectiveButtonImage = null;
    this.objectiveButtonLabel = null;
    this.objective = null;
    this.objectiveTitle = null;
    this.objectiveText = null;
    this.objectiveStepLabel = null;
    this.objectiveProgress = null;
    this.objectiveProgressFill = null;
    this.objectiveProgressLabel = null;
    this.lessonAdvanceButton = null;
    this.lessonShowButton = null;
    this.objectiveWidth = OBJECTIVE_WIDTH;
    this.objectiveHeight = OBJECTIVE_CONTENT_HEIGHT;
    this.objectivePanelOpen = false;
    this.objectiveAttentionActive = false;
    this.objectiveStepId = null;
    this.objectiveCopyText = '';
    this.blockingDialogSuspended = false;
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
    advanceOnClick = false,
  }) {
    this.showLesson({
      id: `prompt:${stepLabel ?? ''}:${text ?? ''}`,
      title: 'lesson',
      text,
      stepLabel,
      advanceOnClick,
      canShowTarget: Boolean(target),
    });

    if (target) {
      this.showTargetCue({ target, showPointer });
    }
  }

  showTargetCue({ target, showPointer = true } = {}) {
    if (!this.root || !this.stage || !target) {
      this.hideTargetCue();
      return;
    }

    const rect = this.getSourceRect(target);

    if (!rect) {
      this.hideTargetCue();
      return;
    }

    this.blockingDialogSuspended = false;
    this.root.hidden = false;
    this.hidePromptBox();
    this.positionPointer(rect, showPointer);
    this.syncRootVisibility();
  }

  showDialog({ text, stepLabel, advanceOnClick = true }) {
    this.showLesson({
      id: `dialog:${stepLabel ?? ''}:${text ?? ''}`,
      title: 'lesson',
      text,
      stepLabel,
      advanceOnClick,
    });
  }

  showLesson({
    id,
    title = 'lesson',
    text,
    stepLabel,
    progress,
    progressLabel,
    attention = true,
    autoOpen = true,
    forceOpen = false,
    advanceOnClick = false,
    canShowTarget = false,
    hideTargetCue = true,
  }) {
    if (!this.root || !this.stage || !this.objective || !this.objectiveButton) {
      return;
    }

    if (id && id !== this.objectiveStepId) {
      this.objectiveStepId = id;
      this.objectivePanelOpen = Boolean(autoOpen);
      this.resetTypedText(this.objectiveText);
    } else if (forceOpen) {
      this.objectivePanelOpen = true;
    }

    const normalizedProgress = this.normalizeProgress(progress);
    const hasProgress = normalizedProgress !== null;
    this.objectiveCopyText = text ?? '';
    this.blockingDialogSuspended = false;
    this.root.hidden = false;
    this.objectiveButton.hidden = false;
    this.objective.hidden = !this.objectivePanelOpen;
    this.updateObjectiveButtonState();
    this.objectiveTitle.textContent = title ?? 'lesson';
    this.objectiveStepLabel.textContent = stepLabel ?? '';
    this.lessonAdvanceButton.hidden = !advanceOnClick;
    this.lessonShowButton.hidden = advanceOnClick || !canShowTarget;
    this.objectiveProgress.hidden = !hasProgress;
    this.objectiveProgressLabel.hidden = !hasProgress && !progressLabel;
    this.objectiveProgressLabel.textContent = progressLabel ?? '';

    if (normalizedProgress !== null) {
      this.objectiveProgressFill.style.width = `${normalizedProgress * 100}%`;
    }

    this.applyObjectiveSize(
      this.measureLessonSize({
        title,
        text,
        stepLabel,
        progress: hasProgress,
        progressLabel,
        advanceOnClick,
        canShowTarget,
      }),
    );
    this.setObjectiveAttention(attention);
    this.updateObjectiveCopy();

    if (this.objectivePanelOpen) {
      this.hidePromptBox();
      if (hideTargetCue) {
        this.hideTargetCue();
      }
    }

    this.positionObjective();
    this.syncRootVisibility();
  }

  showObjective(objective) {
    this.showLesson({
      title: 'lesson',
      ...objective,
    });
  }

  measureLessonSize({
    title,
    text,
    stepLabel,
    progress,
    progressLabel,
    advanceOnClick,
    canShowTarget,
  } = {}) {
    const width = this.estimateLessonWidth({
      title,
      text,
      stepLabel,
      progressLabel,
      advanceOnClick,
      canShowTarget,
    });
    const estimatedHeight = this.estimateLessonHeight({
      text,
      width,
      progress,
      progressLabel,
    });
    const measuredHeight = this.measureLessonHeight({
      title,
      text,
      stepLabel,
      progress,
      progressLabel,
      advanceOnClick,
      canShowTarget,
      width,
    });

    return {
      width,
      height: clamp(measuredHeight ?? estimatedHeight, LESSON_MIN_HEIGHT, LESSON_MAX_HEIGHT),
    };
  }

  measureLessonHeight({
    title,
    text,
    stepLabel,
    progress,
    progressLabel,
    advanceOnClick,
    canShowTarget,
    width,
  }) {
    const doc = this.root?.ownerDocument;

    if (!doc || !this.root) {
      return null;
    }

    const measure = doc.createElement('section');
    measure.className = 'tutorial-layer__lesson tutorial-layer__lesson-measure style-box';
    measure.setAttribute('aria-hidden', 'true');
    measure.style.width = `${width}px`;

    const measureTitle = doc.createElement('div');
    measureTitle.className = 'style-box__title';
    measureTitle.textContent = title ?? 'lesson';

    const measureStep = doc.createElement('div');
    measureStep.className = 'tutorial-layer__lesson-step-label tutorial-layer__objective-step-label';
    measureStep.textContent = stepLabel ?? '';

    const measureText = doc.createElement('p');
    measureText.className = 'tutorial-layer__lesson-text tutorial-layer__objective-text';
    measureText.textContent = text ?? '';

    const measureProgress = doc.createElement('div');
    measureProgress.className =
      'style-progress tutorial-layer__lesson-progress tutorial-layer__objective-progress';
    measureProgress.hidden = !progress;
    measureProgress.append(doc.createElement('span'));

    const measureProgressLabel = doc.createElement('div');
    measureProgressLabel.className =
      'tutorial-layer__lesson-progress-label tutorial-layer__objective-progress-label';
    measureProgressLabel.hidden = !progress && !progressLabel;
    measureProgressLabel.textContent = progressLabel ?? '';

    const measureShow = doc.createElement('button');
    measureShow.className = 'tutorial-layer__lesson-show';
    measureShow.type = 'button';
    measureShow.textContent = 'show me';
    measureShow.hidden = advanceOnClick || !canShowTarget;

    const measureAdvance = doc.createElement('button');
    measureAdvance.className = 'tutorial-layer__lesson-advance tutorial-layer__advance';
    measureAdvance.type = 'button';
    measureAdvance.textContent = 'next';
    measureAdvance.hidden = !advanceOnClick;

    measure.append(
      measureTitle,
      measureStep,
      measureText,
      measureProgress,
      measureProgressLabel,
      measureShow,
      measureAdvance,
    );
    this.root.append(measure);

    const style = this.getWindow()?.getComputedStyle?.(measure);
    const paddingTop = Number.parseFloat(style?.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(style?.paddingBottom) || 0;
    const contentHeight = Math.ceil(measure.scrollHeight - paddingTop - paddingBottom);
    measure.remove();

    return contentHeight > 0 ? contentHeight : null;
  }

  estimateLessonWidth({
    title,
    text,
    stepLabel,
    progressLabel,
    advanceOnClick,
    canShowTarget,
  }) {
    const titleWidth =
      estimateInlineWidth(title ?? 'lesson') + estimateInlineWidth(stepLabel ?? '') + HINT_GAP * 3;
    const actionLabel = advanceOnClick ? 'next' : canShowTarget ? 'show me' : '';
    const actionWidth = actionLabel ? estimateInlineWidth(actionLabel) + HINT_GAP * 2 : 0;
    const textWidth = Math.min(estimateInlineWidth(text ?? ''), LESSON_MAX_WIDTH);
    const progressWidth = estimateInlineWidth(progressLabel ?? '');

    return clamp(
      Math.ceil(Math.max(titleWidth, actionWidth, textWidth, progressWidth, LESSON_MIN_WIDTH)),
      LESSON_MIN_WIDTH,
      LESSON_MAX_WIDTH,
    );
  }

  estimateLessonHeight({ text, width, progress, progressLabel }) {
    const charsPerLine = Math.max(1, Math.floor(width / LESSON_ESTIMATED_CHAR_WIDTH));
    const textLines = String(text ?? '')
      .split('\n')
      .reduce(
        (total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)),
        0,
      );
    let height = Math.max(
      LESSON_MIN_HEIGHT,
      textLines * LESSON_ESTIMATED_LINE_HEIGHT,
      Number(Boolean(text)) * 20,
    );

    if (progress) {
      height += 8;
    }

    if (progress || progressLabel) {
      height += 16;
    }

    return Math.ceil(height);
  }

  applyObjectiveSize({ width, height }) {
    this.objectiveWidth = width;
    this.objectiveHeight = height;
    this.objective.style.width = `${width}px`;
    this.objective.style.height = `${height}px`;
  }

  setObjectiveAttention(active) {
    this.objectiveAttentionActive = Boolean(active);
    this.applyObjectiveAttention();
  }

  setLessonAttention(active) {
    this.setObjectiveAttention(active);
  }

  isObjectivePanelOpen() {
    return Boolean(this.objectivePanelOpen && this.objective && !this.objective.hidden);
  }

  isLessonPanelOpen() {
    return this.isObjectivePanelOpen();
  }

  applyObjectiveAttention() {
    if (!this.objectiveButton) {
      return;
    }

    const active = this.objectiveAttentionActive && !this.objectivePanelOpen;
    setNotificationBadge(this.objectiveButton, active);
    this.objectiveButton.toggleAttribute('data-attention', active);
  }

  updateObjectiveButtonState() {
    if (!this.objectiveButton) {
      return;
    }

    const expanded = Boolean(this.objectivePanelOpen && this.objective && !this.objective.hidden);
    this.objectiveButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    this.objectiveButton.setAttribute('aria-label', expanded ? 'hide lesson' : 'open lesson');

    if (this.objectiveButtonLabel) {
      this.objectiveButtonLabel.hidden = expanded;
      this.objectiveButtonLabel.textContent = expanded ? '' : OBJECTIVE_BUTTON_COLLAPSED_LABEL;
    }
  }

  openObjectivePanel() {
    this.openLessonPanel();
  }

  openLessonPanel() {
    if (!this.objective || !this.objectiveButton) {
      return;
    }

    this.objectivePanelOpen = true;
    this.objective.hidden = false;
    this.updateObjectiveButtonState();
    this.applyObjectiveAttention();
    this.hidePrompt();
    this.resetTypedText(this.objectiveText);
    this.updateObjectiveCopy();
    this.positionObjective();
    this.syncRootVisibility();
  }

  closeObjectivePanel() {
    this.closeLessonPanel();
  }

  closeLessonPanel() {
    if (!this.objective || !this.objectiveButton) {
      return;
    }

    this.objectivePanelOpen = false;
    this.objective.hidden = true;
    this.resetTypedText(this.objectiveText);
    this.hideTargetCue();
    this.updateObjectiveButtonState();
    this.applyObjectiveAttention();
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
      this.objectiveAttentionActive = false;
      this.updateObjectiveButtonState();
      this.applyObjectiveAttention();
      this.setSpeaking(this.objectiveButton, false);
    }

    this.objectivePanelOpen = false;
    this.objectiveAttentionActive = false;
    this.objectiveStepId = null;
    this.objectiveCopyText = '';
    this.blockingDialogSuspended = false;
    this.clearAllTypewriterTimers();
    this.resetTypedText(this.text);
    this.resetTypedText(this.advanceButton);
    this.resetTypedText(this.objectiveText);
    this.syncRootVisibility();
  }

  suspendForBlockingDialog() {
    if (!this.root) {
      return;
    }

    this.blockingDialogSuspended = true;
    this.root.hidden = true;
  }

  hidePrompt() {
    if (!this.hint) {
      return;
    }

    this.hidePromptBox();
    this.hideTargetCue();
    this.syncRootVisibility();
  }

  hidePromptBox() {
    if (this.hint) {
      this.hint.hidden = true;
      this.hint.classList.remove('is-dialog');
    }

    this.resetTypedText(this.text);
    this.resetTypedText(this.advanceButton);

    if (this.portrait) {
      this.portrait.hidden = true;
      this.setSpeaking(this.portrait, false);
    }
  }

  hideObjective() {
    if (this.objective) {
      this.objective.hidden = true;
    }

    if (this.objectiveButton) {
      this.objectiveButton.hidden = true;
      this.objectiveAttentionActive = false;
      this.updateObjectiveButtonState();
      this.applyObjectiveAttention();
      this.setSpeaking(this.objectiveButton, false);
    }

    this.objectivePanelOpen = false;
    this.objectiveAttentionActive = false;
    this.objectiveStepId = null;
    this.objectiveCopyText = '';
    this.blockingDialogSuspended = false;
    this.resetTypedText(this.objectiveText);
    this.syncRootVisibility();
  }

  hideTargetCue({ immediate = false } = {}) {
    this.hidePointer({ immediate });

    if (this.portrait) {
      this.portrait.hidden = true;
      this.setSpeaking(this.portrait, false);
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
    const nextPointerState = {
      placement: placement.id,
      x: placement.x,
      y: placement.y,
      scaleX: placement.scaleX,
      rotation: placement.rotation,
    };
    const pointerStateChanged =
      !this.pointerState ||
      this.pointerState.placement !== nextPointerState.placement ||
      this.pointerState.x !== nextPointerState.x ||
      this.pointerState.y !== nextPointerState.y ||
      this.pointerState.scaleX !== nextPointerState.scaleX ||
      this.pointerState.rotation !== nextPointerState.rotation;
    const shouldRevealPointer =
      this.pointer.hidden ||
      !this.pointer.classList.contains('is-visible') ||
      this.pointer.classList.contains('is-hiding');

    this.pointer.hidden = false;
    this.clearPointerHideTimeout();
    this.pointer.classList.remove('is-hiding');

    if (pointerStateChanged) {
      this.pointer.dataset.placement = placement.id;
      this.pointer.style.left = `${placement.x}px`;
      this.pointer.style.top = `${placement.y}px`;
      this.pointer.style.setProperty('--tutorial-pointer-scale-x', placement.scaleX);
      this.pointer.style.setProperty('--tutorial-pointer-rotation', placement.rotation);
      this.pointerState = nextPointerState;
    }

    if (shouldRevealPointer) {
      this.showPointerWithAnimation();
    }
  }

  positionGuide(rect, showPortrait = true) {
    const bounds = this.getSourceBounds();
    const baseLeft = clamp(
      (bounds.width - HINT_PADDED_WIDTH) / 2 - GUIDE_LEFT_BIAS,
      PORTRAIT_LEFT_GAP + PORTRAIT_WIDTH - PORTRAIT_BOX_OVERLAP,
      Math.max(
        PORTRAIT_LEFT_GAP + PORTRAIT_WIDTH - PORTRAIT_BOX_OVERLAP,
        bounds.width - HINT_PADDED_WIDTH - HINT_GAP,
      ),
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
    const portraitLeft = left - PORTRAIT_WIDTH + PORTRAIT_BOX_OVERLAP;
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

    const minLeft = PORTRAIT_LEFT_GAP + PORTRAIT_WIDTH - PORTRAIT_BOX_OVERLAP;
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
    const view = this.getWindow();

    if (typeof view?.setTimeout !== 'function') {
      this.pointer.hidden = true;
      this.cleanupPointerState();
      this.syncRootVisibility();
      return;
    }

    this.pointerHideTimeout = view.setTimeout(() => {
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
    this.pointerState = null;
  }

  positionDialog() {
    const bounds = this.getSourceBounds();
    const left = clamp(
      (bounds.width - DIALOG_PADDED_WIDTH) / 2 - GUIDE_LEFT_BIAS,
      PORTRAIT_LEFT_GAP + PORTRAIT_WIDTH - PORTRAIT_BOX_OVERLAP,
      Math.max(
        PORTRAIT_LEFT_GAP + PORTRAIT_WIDTH - PORTRAIT_BOX_OVERLAP,
        bounds.width - DIALOG_PADDED_WIDTH - HINT_GAP,
      ),
    );
    const top = clamp(DIALOG_TOP, HINT_GAP, bounds.height - DIALOG_HEIGHT - HINT_GAP);
    const portraitLeft = left - PORTRAIT_WIDTH + PORTRAIT_BOX_OVERLAP;
    const portraitTop = clamp(
      top + DIALOG_HEIGHT - PORTRAIT_HEIGHT + 9,
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
    const outerSize = this.getObjectiveOuterSize();
    const candidates = OBJECTIVE_PLACEMENTS.map((placement, index) => {
      const clamped = this.clampObjectivePlacement(placement, bounds, outerSize);
      const rects = getObjectivePlacementRects(clamped, outerSize);
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

  clampObjectivePlacement(placement, bounds, outerSize) {
    const objectiveLeft = clamp(
      placement.objectiveLeft,
      HINT_GAP,
      bounds.width - outerSize.width - HINT_GAP,
    );
    const objectiveTop = clamp(
      placement.objectiveTop,
      HINT_GAP,
      bounds.height - outerSize.height - HINT_GAP,
    );

    return {
      objectiveLeft,
      objectiveTop,
      buttonLeft: clamp(
        placement.buttonLeft,
        0,
        bounds.width - OBJECTIVE_BUTTON_WIDTH - HINT_GAP,
      ),
      buttonTop: clamp(
        objectiveTop + outerSize.height - OBJECTIVE_BUTTON_HEIGHT + 9,
        HINT_GAP,
        bounds.height - OBJECTIVE_BUTTON_HEIGHT - HINT_GAP,
      ),
    };
  }

  getObjectiveOuterSize() {
    return {
      width: this.objectiveWidth + OBJECTIVE_HORIZONTAL_CHROME,
      height: this.objectiveHeight + OBJECTIVE_VERTICAL_CHROME,
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

    if (this.blockingDialogSuspended) {
      this.root.hidden = true;
      return;
    }

    const hasTargetCue =
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
      speakingElement: this.objectiveButton,
    });
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

  setTypedText(element, text, { onComplete, speakingElement } = {}) {
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
      if (speakingElement) {
        existing.speakingElement = speakingElement;
        this.setSpeaking(speakingElement, true);
      }
      return;
    }

    if (element.dataset.tutorialFullText === nextText && element.textContent === nextText) {
      this.setSpeaking(speakingElement, false);
      onComplete?.();
      return;
    }

    this.clearTypedText(element);
    element.dataset.tutorialFullText = nextText;

    if (!nextText) {
      element.textContent = '';
      element.removeAttribute('aria-label');
      this.setSpeaking(speakingElement, false);
      onComplete?.();
      return;
    }

    element.setAttribute('aria-label', nextText);

    if (this.prefersReducedMotion()) {
      element.textContent = nextText;
      this.setSpeaking(speakingElement, false);
      onComplete?.();
      return;
    }

    const view = element.ownerDocument?.defaultView ?? this.getWindow();

    if (typeof view?.setTimeout !== 'function' || typeof view?.clearTimeout !== 'function') {
      element.textContent = nextText;
      this.setSpeaking(speakingElement, false);
      onComplete?.();
      return;
    }

    const timerState = {
      isTyping: true,
      timeout: null,
      onComplete,
      speakingElement,
      setTimeout: view.setTimeout.bind(view),
      clearTimeout: view.clearTimeout.bind(view),
    };
    this.typewriterTimers.set(element, timerState);
    this.setSpeaking(speakingElement, true);
    let index = 0;

    const tick = () => {
      if (!this.typewriterTimers.has(element)) {
        return;
      }

      index += TYPEWRITER_CHARS_PER_TICK;
      element.textContent = nextText.slice(0, index);

      if (index >= nextText.length) {
        this.typewriterTimers.delete(element);
        this.setSpeaking(timerState.speakingElement, false);
        timerState.onComplete?.();
        return;
      }

      timerState.timeout = timerState.setTimeout(tick, TYPEWRITER_INTERVAL_MS);
    };

    element.textContent = '';
    timerState.timeout = timerState.setTimeout(tick, TYPEWRITER_INTERVAL_MS);
  }

  clearTypedText(element) {
    if (!element) {
      return;
    }

    const timerState = this.typewriterTimers.get(element);

    if (timerState?.timeout) {
      timerState.clearTimeout?.(timerState.timeout);
    }

    this.setSpeaking(timerState?.speakingElement, false);
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
        timerState.clearTimeout?.(timerState.timeout);
      }
      this.setSpeaking(timerState?.speakingElement, false);
    });
    this.typewriterTimers.clear();
  }

  setSpeaking(element, active) {
    element?.toggleAttribute?.('data-speaking', Boolean(active));
  }

  clearPointerHideTimeout() {
    if (!this.pointerHideTimeout) {
      return;
    }

    this.getWindow()?.clearTimeout?.(this.pointerHideTimeout);
    this.pointerHideTimeout = null;
  }

  prefersReducedMotion() {
    const view = this.getWindow();

    return Boolean(view?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  }

  getWindow() {
    return this.stage?.ownerDocument?.defaultView ?? globalThis.window;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function estimateInlineWidth(text) {
  return Math.ceil(String(text ?? '').length * LESSON_ESTIMATED_CHAR_WIDTH);
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

function getObjectivePlacementRects(
  { objectiveLeft, objectiveTop, buttonLeft, buttonTop },
  outerSize,
) {
  return {
    objective: {
      left: objectiveLeft,
      top: objectiveTop,
      right: objectiveLeft + outerSize.width,
      bottom: objectiveTop + outerSize.height,
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
