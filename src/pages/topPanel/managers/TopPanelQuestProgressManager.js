const QUEST_FLIGHT_COUNT = 3;
const REQUEST_SNAP_DURATION_MS = 230;
const QUEST_FLIGHT_START_MS = 190;
const QUEST_FLIGHT_DURATION_MS = 520;
const QUEST_FLIGHT_STAGGER_MS = 35;
const QUEST_PROGRESS_SETTLE_MS =
  QUEST_FLIGHT_START_MS + QUEST_FLIGHT_DURATION_MS + QUEST_FLIGHT_STAGGER_MS * 2 - 55;
const QUEST_PROGRESS_FILL_MS = 205;
const LEVEL_BADGE_JUMP_MS = 230;
const LEVEL_VALUE_CHANGE_MS = 92;
const QUEST_RECEIVE_PULSE_MS = 180;
const MAX_ACTIVE_QUEST_FLIGHTS = 6;

export class TopPanelQuestProgressManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.refs = null;
    this.unsubscribe = null;
    this.previousProgress = null;
    this.previousLoadRevision = null;
    this.resetFrame = null;
    this.receiveTimeoutId = null;
    this.receiveClearTimeoutId = null;
    this.activeFlights = [];
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
    const loadRevision = Number(snapshot?.persistence?.loadRevision) || 0;

    if (!progress) {
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
      previous.activeQuest?.kind === 'levelUp' &&
      current.targetLevel !== previous.targetLevel
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
    this.scheduleSequence(
      () => this.showQuestFlight({ source, destination }),
      QUEST_FLIGHT_START_MS,
    );
    this.scheduleSequence(() => {
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
      this.pulseDestination(this.refs.levelButton, 0);
    }, QUEST_PROGRESS_SETTLE_MS);
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
      return;
    }

    const destinationElement = this.refs.levelButton;
    const target = destination ?? this.getElementRect(destinationElement);
    const origin = this.getFlightOrigin(source, target);

    if (!target || !origin) {
      this.pulseDestination(destinationElement, 0);
      return;
    }

    const documentRef = this.refs.questRow.ownerDocument;
    const iconSize = Math.max(12, Math.min(18, target.height || 14));

    for (let index = 0; index < QUEST_FLIGHT_COUNT; index += 1) {
      this.trimFlights();
      const flight = documentRef.createElement('img');
      const spread = (index - 1) * iconSize * 0.55;
      const startX = origin.right - iconSize * 1.4 + spread;
      const startY = origin.top + origin.height / 2 - iconSize / 2;
      const endX = target.left + target.width / 2 - iconSize / 2;
      const endY = target.top + target.height / 2 - iconSize / 2;
      const travelX = endX - startX;
      const travelY = endY - startY;
      const arc = Math.min(32, Math.max(14, Math.abs(travelY) * 0.1));
      const delay = index * QUEST_FLIGHT_STAGGER_MS;

      flight.className = 'room-top-panel__quest-flight';
      flight.src = this.refs.levelStar.currentSrc || this.refs.levelStar.src;
      flight.alt = '';
      flight.setAttribute('aria-hidden', 'true');
      flight.style.left = `${startX}px`;
      flight.style.top = `${startY}px`;
      flight.style.width = `${iconSize}px`;
      flight.style.height = `${iconSize}px`;
      documentRef.body.append(flight);
      this.activeFlights.push(flight);

      const animation = this.animateElement(
        flight,
        [
          { opacity: 0, transform: 'translate3d(0, 3px, 0) scale(0.7) rotate(-7deg)' },
          { opacity: 1, offset: 0.16, transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)' },
          {
            opacity: 0.95,
            offset: 0.66,
            transform: `translate3d(${travelX * 0.72}px, ${travelY * 0.72 - arc}px, 0) scale(0.8) rotate(6deg)`,
          },
          {
            opacity: 0.08,
            transform: `translate3d(${travelX}px, ${travelY}px, 0) scale(0.36) rotate(12deg)`,
          },
        ],
        {
          duration: QUEST_FLIGHT_DURATION_MS,
          delay,
          easing: 'cubic-bezier(0.33, 0, 0.25, 1)',
          fill: 'both',
        },
      );

      Promise.resolve(animation?.finished)
        .catch(() => {})
        .then(() => this.removeFlight(flight));
    }

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
      element?.classList.add('is-receiving-quest');
      this.refs?.questProgressRail?.classList.add('is-receiving-quest');
      this.receiveClearTimeoutId = windowRef.setTimeout(() => {
        element?.classList.remove('is-receiving-quest');
        this.refs?.questProgressRail?.classList.remove('is-receiving-quest');
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

    this.refs?.questProgressRail?.classList.remove('is-receiving-quest');
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

  clearFlights() {
    for (const flight of this.activeFlights) {
      flight.remove();
    }

    this.activeFlights = [];
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
}
