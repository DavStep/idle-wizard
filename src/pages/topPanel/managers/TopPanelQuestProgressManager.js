const REQUEST_SNAP_DURATION_MS = 230;
const QUEST_FLIGHT_ICON_SIZE = 68;
const QUEST_FLIGHT_TEXTURE_WIDTH = 93;
const QUEST_FLIGHT_TEXTURE_HEIGHT = 94;
const QUEST_LEVEL_TARGET_SIZE = 28;
const QUEST_FLIGHT_SPEED_PX_PER_SECOND = 900;
const QUEST_FLIGHT_ARC_HEIGHT_PX = 96;
const QUEST_FLIGHT_MIN_DURATION_MS = 420;
const QUEST_FLIGHT_MAX_DURATION_MS = 760;
const QUEST_FLIGHT_SAMPLE_COUNT = 20;
const QUEST_FLIGHT_ARRIVAL_DURATION_MS = 320;
const QUEST_FLIGHT_ARRIVAL_SPARK_COUNT = 8;
const QUEST_PROGRESS_FILL_MS = 205;
const LEVEL_BADGE_JUMP_MS = 230;
const LEVEL_VALUE_CHANGE_MS = 92;
const QUEST_RECEIVE_PULSE_MS = 400;
const MAX_ACTIVE_QUEST_FLIGHTS = 6;

export class TopPanelQuestProgressManager {
  constructor({ gameplayFacade, random = Math.random } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.random = random;
    this.refs = null;
    this.unsubscribe = null;
    this.previousProgress = null;
    this.previousLoadRevision = null;
    this.resetFrame = null;
    this.receiveTimeoutId = null;
    this.receiveClearTimeoutId = null;
    this.activeFlights = [];
    this.activeArrivalEffects = [];
    this.sequenceTimeoutIds = new Set();
    this.completionSource = null;
    this.previewProgress = null;
  }

  mount(refs) {
    if (this.refs || !refs?.questRow) {
      return;
    }

    this.refs = refs;

    if (this.gameplayFacade) {
      this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
      this.render(this.gameplayFacade.getSnapshot());
    }
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.cancelReset();
    this.cancelCompletionSequence();
    this.clearReceiveTimers();
    this.clearFlights();
    this.refs = null;
    this.previousProgress = null;
    this.previousLoadRevision = null;
    this.previewProgress = null;
  }

  setPreviewProgress(progress = null) {
    this.previewProgress = progress ? this.normalizeProgress(progress) : null;
    this.render(this.gameplayFacade?.getSnapshot?.() ?? {});
  }

  render(snapshot = {}) {
    if (!this.refs) {
      return;
    }

    const progress = this.previewProgress ?? snapshot?.tasks?.level?.questProgress ?? null;
    const currentLevel = snapshot?.tasks?.currentLevel;
    const beforeLevelOne = Number.isInteger(currentLevel) && currentLevel < 1;
    const loadRevision = Number(snapshot?.persistence?.loadRevision) || 0;

    if (!progress || beforeLevelOne) {
      this.cancelCompletionSequence();
      this.refs.questRow.hidden = true;
      this.previousProgress = null;
      this.previousLoadRevision = loadRevision;
      return;
    }

    const normalized = this.normalizeProgress(progress);
    const loadRevisionChanged =
      this.previousLoadRevision !== null && loadRevision !== this.previousLoadRevision;
    const targetLevelChanged =
      this.previousProgress !== null &&
      normalized.targetLevel !== this.previousProgress.targetLevel;
    const completedDelta = this.previousProgress && !loadRevisionChanged
      ? this.getCompletedDelta(this.previousProgress, normalized)
      : 0;
    const duplicateDuringSequence =
      this.sequenceTimeoutIds.size > 0 &&
      !loadRevisionChanged &&
      this.hasSameProgress(this.previousProgress, normalized);

    if (duplicateDuringSequence) {
      this.previousLoadRevision = loadRevision;
      return;
    }

    if (completedDelta > 0 && !this.prefersReducedMotion()) {
      this.startCompletionSequence({
        previous: this.previousProgress,
        next: normalized,
        levelChanged: targetLevelChanged,
      });
    } else {
      this.cancelCompletionSequence();

      if (targetLevelChanged) {
        this.refs.questRow.classList.add('is-resetting');
      }

      this.renderProgress(normalized);
    }

    this.previousProgress = normalized;
    this.previousLoadRevision = loadRevision;

    if (targetLevelChanged) {
      this.scheduleResetEnd();
    }
  }

  normalizeProgress(progress = {}) {
    const completedQuests = Math.max(0, Math.floor(Number(progress.completedQuests) || 0));
    const totalQuests = Math.max(0, Math.floor(Number(progress.totalQuests) || 0));
    const providedProgress = Number(progress.progress);
    const completedProgress = totalQuests > 0
      ? Math.min(1, completedQuests / totalQuests)
      : 1;

    return {
      progress: Number.isFinite(providedProgress)
        ? Math.max(completedProgress, Math.min(1, providedProgress))
        : completedProgress,
      completedQuests,
      totalQuests,
      targetLevel: Math.max(0, Math.floor(Number(progress.targetLevel) || 0)),
      activeQuest: progress.activeQuest ?? null,
    };
  }

  renderProgress(progress) {
    const completedQuests = Math.min(progress.completedQuests, progress.totalQuests);
    const remainingQuests = Math.max(0, progress.totalQuests - completedQuests);
    const targetSuffix = progress.targetLevel > 0 ? ` to reach level ${progress.targetLevel}` : '';

    this.refs.questRow.hidden = false;
    this.renderSegments(completedQuests, progress.totalQuests);
    const completedRatio = progress.progress;
    const progressQuests = progress.totalQuests * completedRatio;
    this.refs.questProgressFill?.style.setProperty(
      '--room-top-panel-quest-fill-clip-right',
      `${(1 - completedRatio) * 100}%`,
    );
    this.refs.questProgressRail.setAttribute('aria-valuemin', '0');
    this.refs.questProgressRail.setAttribute('aria-valuemax', String(progress.totalQuests));
    this.refs.questProgressRail.setAttribute('aria-valuenow', String(progressQuests));
    this.refs.questProgressRail.classList.toggle(
      'is-complete',
      progress.totalQuests > 0 && completedQuests >= progress.totalQuests,
    );

    if (remainingQuests <= 0) {
      this.refs.questProgressLead.nodeValue = 'all quests complete';
      this.refs.questRemainingValue.textContent = '';
      this.refs.questProgressTail.nodeValue = '';
    } else {
      this.refs.questProgressLead.nodeValue = 'Complete ';
      this.refs.questRemainingValue.textContent = String(remainingQuests);
      this.refs.questProgressTail.nodeValue = ` more ${remainingQuests === 1 ? 'quest' : 'quests'} to level up`;
    }

    const progressLabel = `${completedQuests} of ${progress.totalQuests} quests complete${targetSuffix}`;
    const activeQuestPercent = Math.round(
      Math.max(0, Math.min(1, progressQuests - completedQuests)) * 100,
    );
    const progressValueText = activeQuestPercent > 0
      ? `${progressLabel}, current quest ${activeQuestPercent}% complete`
      : progressLabel;
    this.refs.questProgressRail.setAttribute('aria-label', progressLabel);
    this.refs.questProgressRail.setAttribute('aria-valuetext', progressValueText);
  }

  renderSegments(completedQuests, totalQuests) {
    const currentTotal = this.refs.questSegments.children.length;

    if (currentTotal !== totalQuests) {
      const documentRef = this.refs.questSegments.ownerDocument;
      this.refs.questSegments.replaceChildren(
        ...Array.from({ length: totalQuests }, (_, index) => {
          const segment = documentRef.createElement('span');
          segment.className = 'room-top-panel__quest-segment';
          segment.dataset.questSegment = String(index + 1);
          return segment;
        }),
      );
    }

    this.refs.questSegments.style.setProperty('--room-top-panel-quest-count', String(totalQuests));
    [...this.refs.questSegments.children].forEach((segment, index) => {
      segment.classList.toggle('is-complete', index < completedQuests);
    });
  }

  getCompletedDelta(previous, current) {
    if (
      previous.targetLevel === current.targetLevel &&
      current.completedQuests > previous.completedQuests
    ) {
      return current.completedQuests - previous.completedQuests;
    }

    if (
      previous.activeQuest?.kind === 'task' &&
      current.targetLevel > previous.targetLevel
    ) {
      return 1;
    }

    return 0;
  }

  hasSameProgress(previous, current) {
    return Boolean(
      previous &&
      current &&
      previous.progress === current.progress &&
      previous.completedQuests === current.completedQuests &&
      previous.totalQuests === current.totalQuests &&
      previous.targetLevel === current.targetLevel &&
      previous.activeQuest?.kind === current.activeQuest?.kind &&
      previous.activeQuest?.taskId === current.activeQuest?.taskId
    );
  }

  startCompletionSequence({ previous, next, levelChanged }) {
    this.cancelCompletionSequence();

    const source = this.getCompletionSource();
    const destination = this.getElementRect(this.refs?.levelButton);
    this.completionSource = source;
    source?.classList.add('is-completing-request');
    this.scheduleSequence(
      () => source?.classList.remove('is-completing-request'),
      REQUEST_SNAP_DURATION_MS,
    );

    if (levelChanged) {
      this.holdPreviousLevel(previous, next);
    }

    this.renderProgress(previous);
    const flight = this.showQuestFlight({ source, destination });
    this.scheduleSequence(() => {
      this.removeFlight(flight?.element);
      if (flight) {
        this.playArrivalBurst(flight.destination, flight.presentationScale);
      }
      this.pulseDestination(this.refs.levelStar, 0);

      if (levelChanged) {
        this.renderProgress({
          ...previous,
          progress: 1,
          completedQuests: previous.totalQuests,
        });
        this.scheduleLevelRollover(next);
        return;
      }

      this.renderProgress(next);
    }, flight?.durationMs ?? 0);
  }

  scheduleLevelRollover(next) {
    this.scheduleSequence(() => {
      this.refs?.levelButton?.classList.add('is-leveling-up');
      this.scheduleSequence(() => this.showNextLevel(next), LEVEL_VALUE_CHANGE_MS);
      this.scheduleSequence(() => {
        this.refs?.levelButton?.classList.remove('is-leveling-up');
        this.refs?.questRow?.classList.add('is-resetting');
        this.renderProgress(next);
        this.scheduleResetEnd();
      }, LEVEL_BADGE_JUMP_MS);
    }, QUEST_PROGRESS_FILL_MS);
  }

  holdPreviousLevel(previous, next) {
    const previousLevel = Math.max(0, previous.targetLevel - 1);
    const nextLevel = Math.max(0, next.targetLevel - 1);

    if (previousLevel <= 0) {
      this.refs.levelValue.textContent = '';
      this.refs.levelButton.hidden = true;
      this.refs.levelButton.setAttribute('aria-label', `level ${nextLevel} arriving`);
      return;
    }

    this.refs.levelValue.textContent = String(previousLevel);
    this.refs.levelButton.hidden = false;
    this.refs.levelButton.setAttribute(
      'aria-label',
      `level ${previousLevel}, open level rewards`,
    );
  }

  showNextLevel(next) {
    const nextLevel = Math.max(0, next.targetLevel - 1);
    this.refs.levelButton.hidden = nextLevel <= 0;
    this.refs.levelValue.textContent = nextLevel > 0 ? String(nextLevel) : '';
    this.refs.levelButton.setAttribute(
      'aria-label',
      nextLevel > 0 ? `level ${nextLevel}, open level rewards` : 'level unavailable',
    );
  }

  showQuestFlight({ source, destination }) {
    if (!this.refs || this.prefersReducedMotion()) {
      return null;
    }

    const destinationElement = this.refs.levelButton;
    const target = destination ?? this.getElementRect(destinationElement);
    const origin = this.getFlightOrigin(source, target);

    if (!target || !origin) {
      return null;
    }

    const documentRef = this.refs.questRow.ownerDocument;
    const flightHost =
      this.refs.questRow.closest?.('.game-stage') ?? documentRef.body;
    const presentationScale = Math.max(
      0.01,
      target.width / QUEST_LEVEL_TARGET_SIZE,
    );
    const iconSize = QUEST_FLIGHT_ICON_SIZE * presentationScale;
    const textureWidth = QUEST_FLIGHT_TEXTURE_WIDTH * presentationScale;
    const textureHeight = QUEST_FLIGHT_TEXTURE_HEIGHT * presentationScale;
    const startX = origin.left + origin.width / 2;
    const startY =
      origin.top
      + origin.height / 2
      + this.randomBetween(
        -iconSize * 0.08,
        iconSize * 0.08,
      );
    const endX = target.left + target.width / 2;
    const endY = target.top + target.height / 2;
    const travelX = endX - startX;
    const travelY = endY - startY;
    const durationMs = this.getDistanceBasedFlightDuration(
      { x: startX, y: startY },
      { x: endX, y: endY },
      presentationScale,
    );
    const spin = this.randomBetween(-1.1, 1.1);
    const flight = documentRef.createElement('span');
    const glow = documentRef.createElement('span');
    const icon = documentRef.createElement('img');

    this.trimFlights();
    flight.className = 'room-top-panel__quest-flight';
    flight.setAttribute('aria-hidden', 'true');
    flight.style.left = `${startX}px`;
    flight.style.top = `${startY}px`;
    flight.style.width = `${textureWidth}px`;
    flight.style.height = `${textureHeight}px`;
    glow.className = 'room-top-panel__quest-flight-glow';
    glow.style.width = `${QUEST_FLIGHT_ICON_SIZE * 0.88 * presentationScale}px`;
    glow.style.height = `${QUEST_FLIGHT_ICON_SIZE * 0.88 * presentationScale}px`;
    icon.className = 'room-top-panel__quest-flight-icon';
    icon.src = this.refs.levelStar.currentSrc || this.refs.levelStar.src;
    icon.alt = '';
    flight.append(glow, icon);
    flightHost?.append(flight);
    this.activeFlights.push(flight);

    const animation = this.animateElement(
      flight,
      this.buildDirectFlightKeyframes({
        travelX,
        travelY,
        durationMs,
        spin,
        presentationScale,
      }),
      {
        duration: durationMs,
        easing: 'linear',
        fill: 'both',
      },
    );
    this.animateElement(
      glow,
      this.buildFlightGlowKeyframes(),
      {
        duration: durationMs,
        easing: 'linear',
        fill: 'both',
      },
    );

    if (!animation) {
      this.removeFlight(flight);
      return null;
    }

    if (animation.finished) {
      Promise.resolve(animation.finished)
        .catch(() => {})
        .then(() => this.removeFlight(flight));
    }

    return {
      destination: { x: endX, y: endY },
      durationMs,
      element: flight,
      presentationScale,
    };
  }

  buildDirectFlightKeyframes({
    travelX,
    travelY,
    durationMs,
    spin,
    presentationScale = 1,
  }) {
    const startScale = Math.max(
      0.18,
      (QUEST_FLIGHT_ICON_SIZE * 1.12) / QUEST_FLIGHT_TEXTURE_WIDTH,
    );
    const endScale = Math.max(
      0.1,
      (QUEST_FLIGHT_ICON_SIZE * 0.54) / QUEST_FLIGHT_TEXTURE_WIDTH,
    );

    return Array.from({ length: QUEST_FLIGHT_SAMPLE_COUNT + 1 }, (_, index) => {
      const progress = index / QUEST_FLIGHT_SAMPLE_COUNT;
      const easedProgress = this.easeInOutCubic(progress);
      const enterProgress = Math.min(progress / 0.14, 1);
      const x = travelX * easedProgress;
      const y =
        travelY * easedProgress
        - Math.sin(easedProgress * Math.PI)
          * QUEST_FLIGHT_ARC_HEIGHT_PX
          * presentationScale;
      const scale =
        this.lerp(startScale, endScale, easedProgress)
        * (0.58 + enterProgress * 0.42)
        * (1 + Math.sin(progress * Math.PI) * 0.12);
      const opacity = enterProgress * (1 - progress * 0.08);
      const rotation = spin * (durationMs / 1000) * progress;

      return {
        offset: progress,
        opacity,
        transform:
          'translate(-50%, -50%) '
          + `translate3d(${x}px, ${y}px, 0) `
          + `scale(${scale}) rotate(${rotation}rad)`,
      };
    });
  }

  buildFlightGlowKeyframes() {
    return Array.from({ length: QUEST_FLIGHT_SAMPLE_COUNT + 1 }, (_, index) => {
      const progress = index / QUEST_FLIGHT_SAMPLE_COUNT;

      return {
        offset: progress,
        opacity: 0.26 + Math.sin(progress * Math.PI) * 0.24,
      };
    });
  }

  getDistanceBasedFlightDuration(start, end, presentationScale = 1) {
    const distance = Math.max(1, Math.hypot(end.x - start.x, end.y - start.y));
    const speed = QUEST_FLIGHT_SPEED_PX_PER_SECOND * presentationScale;

    return Math.min(
      QUEST_FLIGHT_MAX_DURATION_MS,
      Math.max(
        QUEST_FLIGHT_MIN_DURATION_MS,
        (distance / speed) * 1000,
      ),
    );
  }

  playArrivalBurst(destination, presentationScale = 1) {
    if (!destination || this.prefersReducedMotion() || !this.refs) {
      return;
    }

    const documentRef = this.refs.questRow.ownerDocument;
    const effectHost =
      this.refs.questRow.closest?.('.game-stage') ?? documentRef.body;
    const ring = documentRef.createElement('span');
    ring.className = 'room-top-panel__quest-arrival-ring';
    ring.style.width = `${26 * presentationScale}px`;
    ring.style.height = `${26 * presentationScale}px`;
    ring.style.borderWidth = `${2 * presentationScale}px`;
    this.positionArrivalEffect(ring, destination);
    effectHost?.append(ring);
    this.activeArrivalEffects.push(ring);
    this.animateArrivalEffect(ring, { x: 0, y: 0 });

    for (let index = 0; index < QUEST_FLIGHT_ARRIVAL_SPARK_COUNT; index += 1) {
      const angle =
        (Math.PI * 2 * index) / QUEST_FLIGHT_ARRIVAL_SPARK_COUNT
        + this.randomBetween(-0.18, 0.18);
      const distance = this.randomBetween(16, 31) * presentationScale;
      const diameter = this.randomBetween(4.2, 7.4) * presentationScale;
      const spark = documentRef.createElement('span');
      spark.className = 'room-top-panel__quest-arrival-spark';
      spark.style.width = `${diameter}px`;
      spark.style.height = `${diameter}px`;
      this.positionArrivalEffect(spark, destination);
      effectHost?.append(spark);
      this.activeArrivalEffects.push(spark);
      this.animateArrivalEffect(spark, {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      });
    }
  }

  positionArrivalEffect(element, destination) {
    element.style.left = `${destination.x}px`;
    element.style.top = `${destination.y}px`;
  }

  animateArrivalEffect(element, travel) {
    const animation = this.animateElement(
      element,
      [
        {
          opacity: 1,
          transform: 'translate(-50%, -50%) translate3d(0, 0, 0) scale(1)',
        },
        {
          opacity: 0,
          transform:
            'translate(-50%, -50%) '
            + `translate3d(${travel.x}px, ${travel.y}px, 0) scale(2.15)`,
        },
      ],
      {
        duration: QUEST_FLIGHT_ARRIVAL_DURATION_MS,
        easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
        fill: 'both',
      },
    );

    if (!animation?.finished) {
      this.removeArrivalEffect(element);
      return;
    }

    Promise.resolve(animation.finished)
      .catch(() => {})
      .then(() => this.removeArrivalEffect(element));
  }

  getCompletionSource() {
    return this.refs?.questRow?.ownerDocument?.querySelector?.(
      '.workshop-page__tasks:not([hidden])',
    ) ?? null;
  }

  getFlightOrigin(source, destination) {
    return this.getElementRect(source) ?? this.getElementRect(this.refs?.panel) ?? destination;
  }

  getElementRect(element) {
    if (!element?.getBoundingClientRect) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? rect : null;
  }

  animateElement(element, keyframes, options) {
    if (typeof element?.animate !== 'function') {
      element?.remove();
      return null;
    }

    return element.animate(keyframes, options);
  }

  pulseDestination(element, delayMs) {
    this.clearReceiveTimers();
    const windowRef = this.refs?.questRow?.ownerDocument?.defaultView;

    if (!windowRef?.setTimeout || this.prefersReducedMotion()) {
      return;
    }

    this.receiveTimeoutId = windowRef.setTimeout(() => {
      this.receiveTimeoutId = null;
      const animation = this.animateElement(
        element,
        Array.from({ length: QUEST_FLIGHT_SAMPLE_COUNT + 1 }, (_, index) => {
          const progress = index / QUEST_FLIGHT_SAMPLE_COUNT;
          return {
            offset: progress,
            transform: `scale(${1 + Math.sin(progress * Math.PI) * 0.1})`,
          };
        }),
        {
          duration: QUEST_RECEIVE_PULSE_MS,
          easing: 'linear',
        },
      );

      if (animation) {
        return;
      }

      element?.classList.add('is-receiving-quest');
      this.receiveClearTimeoutId = windowRef.setTimeout(() => {
        element?.classList.remove('is-receiving-quest');
        this.receiveClearTimeoutId = null;
      }, QUEST_RECEIVE_PULSE_MS);
    }, delayMs);
  }

  prefersReducedMotion() {
    const windowRef = this.refs?.questRow?.ownerDocument?.defaultView;
    return Boolean(windowRef?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  }

  scheduleResetEnd() {
    const windowRef = this.refs?.questRow?.ownerDocument?.defaultView;

    if (this.resetFrame !== null) {
      windowRef?.cancelAnimationFrame?.(this.resetFrame);
      this.resetFrame = null;
    }

    if (typeof windowRef?.requestAnimationFrame !== 'function') {
      this.refs?.questRow?.classList.remove('is-resetting');
      return;
    }

    this.resetFrame = windowRef.requestAnimationFrame(() => {
      this.refs?.questRow?.classList.remove('is-resetting');
      this.resetFrame = null;
    });
  }

  cancelReset() {
    const windowRef = this.refs?.questRow?.ownerDocument?.defaultView;

    if (this.resetFrame !== null) {
      windowRef?.cancelAnimationFrame?.(this.resetFrame);
      this.resetFrame = null;
    }

    this.refs?.questRow?.classList.remove('is-resetting');
  }

  clearReceiveTimers() {
    const windowRef = this.refs?.questRow?.ownerDocument?.defaultView;

    if (this.receiveTimeoutId !== null) {
      windowRef?.clearTimeout?.(this.receiveTimeoutId);
      this.receiveTimeoutId = null;
    }

    if (this.receiveClearTimeoutId !== null) {
      windowRef?.clearTimeout?.(this.receiveClearTimeoutId);
      this.receiveClearTimeoutId = null;
    }

    this.refs?.questRow?.querySelectorAll?.('.is-receiving-quest').forEach((element) => {
      element.classList.remove('is-receiving-quest');
    });
  }

  trimFlights() {
    while (this.activeFlights.length >= MAX_ACTIVE_QUEST_FLIGHTS) {
      this.activeFlights.shift()?.remove();
    }
  }

  removeFlight(flight) {
    const index = this.activeFlights.indexOf(flight);

    if (index >= 0) {
      this.activeFlights.splice(index, 1);
    }

    flight?.remove();
  }

  removeArrivalEffect(effect) {
    const index = this.activeArrivalEffects.indexOf(effect);

    if (index >= 0) {
      this.activeArrivalEffects.splice(index, 1);
    }

    effect?.remove();
  }

  clearFlights() {
    for (const flight of this.activeFlights) {
      flight.remove();
    }

    this.activeFlights = [];

    for (const effect of this.activeArrivalEffects) {
      effect.remove();
    }

    this.activeArrivalEffects = [];
  }

  scheduleSequence(callback, delayMs) {
    const windowRef = this.refs?.questRow?.ownerDocument?.defaultView;

    if (!windowRef?.setTimeout) {
      callback();
      return null;
    }

    const timeoutId = windowRef.setTimeout(() => {
      this.sequenceTimeoutIds.delete(timeoutId);
      callback();
    }, delayMs);
    this.sequenceTimeoutIds.add(timeoutId);
    return timeoutId;
  }

  cancelCompletionSequence() {
    const windowRef = this.refs?.questRow?.ownerDocument?.defaultView;

    for (const timeoutId of this.sequenceTimeoutIds) {
      windowRef?.clearTimeout?.(timeoutId);
    }

    this.sequenceTimeoutIds.clear();
    this.completionSource?.classList.remove('is-completing-request');
    this.completionSource = null;
    this.refs?.levelButton?.classList.remove('is-leveling-up');
  }

  randomBetween(minimum, maximum) {
    return minimum + (maximum - minimum) * this.random();
  }

  lerp(start, end, progress) {
    return start + (end - start) * progress;
  }

  easeInOutCubic(progress) {
    const clamped = Math.max(0, Math.min(1, progress));

    return clamped < 0.5
      ? 4 * clamped * clamped * clamped
      : 1 - (-2 * clamped + 2) ** 3 / 2;
  }
}
