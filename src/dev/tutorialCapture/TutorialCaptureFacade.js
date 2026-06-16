export class TutorialCaptureFacade {
  static explain =
    'Tutorial capture exposes a narrow browser API so local automation can screenshot the real tutorial flow.';

  constructor({ app, target = globalThis } = {}) {
    this.app = app;
    this.target = target;
    this.apiName = 'tutorialCapture';
    this.previousApi = undefined;
    this.hadPreviousApi = false;
    this.mounted = false;
  }

  mount() {
    if (this.mounted || !this.target) {
      return;
    }

    this.hadPreviousApi = Object.prototype.hasOwnProperty.call(this.target, this.apiName);
    this.previousApi = this.target[this.apiName];
    this.target[this.apiName] = this.createApi();
    this.mounted = true;
  }

  unmount() {
    if (!this.mounted || !this.target) {
      return;
    }

    if (this.hadPreviousApi) {
      this.target[this.apiName] = this.previousApi;
    } else {
      delete this.target[this.apiName];
    }

    this.mounted = false;
  }

  createApi() {
    return Object.freeze({
      getState: () => this.getState(),
      hideOnlineGate: () => this.hideOnlineGate(),
      startFresh: () => this.startFresh(),
      resetTutorialProgress: () => this.resetTutorialProgress(),
      refreshTutorial: () => this.refreshTutorial(),
      openLessonPanel: () => this.openLessonPanel(),
      closeLessonPanel: () => this.closeLessonPanel(),
      showPage: (pageId) => this.showPage(pageId),
      clickTarget: (targetId) => this.clickTarget(targetId),
      clickSelector: (selector) => this.clickSelector(selector),
      clickByText: (text, selector) => this.clickByText(text, selector),
    });
  }

  getState() {
    const tutorial = this.app?.pagesFacade?.tutorialFacade;
    const activeStep = tutorial?.activeStep ?? null;
    const stage = tutorial?.stage ?? null;
    const lesson = stage?.querySelector('.tutorial-layer__lesson');
    const lessonButton = stage?.querySelector('.tutorial-layer__lesson-button');
    const pointer = stage?.querySelector('.tutorial-layer__pointer');

    return {
      activeStep: activeStep
        ? {
            id: activeStep.id,
            kind: activeStep.kind,
            targetId: activeStep.targetId ?? null,
            stepLabel: activeStep.stepLabel ?? '',
            lessonTitle: activeStep.lessonTitle ?? '',
            text: activeStep.text ?? activeStep.objectiveText ?? activeStep.hintText ?? '',
            progressLabel: activeStep.progressLabel ?? '',
            advanceOnClick: Boolean(activeStep.advanceOnClick),
          }
        : null,
      currentPageId: this.app?.pagesFacade?.getCurrentPageId?.() ?? null,
      lessonOpen: Boolean(lesson && !lesson.hidden),
      lessonText: lesson?.querySelector('.tutorial-layer__lesson-text')?.textContent ?? '',
      lessonButtonVisible: Boolean(lessonButton && !lessonButton.hidden),
      pointerVisible: Boolean(pointer && !pointer.hidden),
      onlineGateVisible: Boolean(
        this.app?.onlineGateManager?.root && !this.app.onlineGateManager.root.hidden,
      ),
      freshStartVisible: Boolean(
        stage?.querySelector('.app-fresh-start-choice:not([hidden])'),
      ),
      targetIds: [...(stage?.querySelectorAll('[data-tutorial-id]') ?? [])].map(
        (element) => element.dataset.tutorialId,
      ),
      snapshot: this.getSnapshotSummary(),
    };
  }

  getSnapshotSummary() {
    const snapshot = this.app?.gameplayFacade?.getSnapshot?.() ?? {};

    return {
      level: snapshot?.tasks?.currentLevel ?? null,
      page: this.app?.pagesFacade?.getCurrentPageId?.() ?? null,
      mana: snapshot?.mana ?? null,
      gold: snapshot?.gold ?? null,
      inventory: summarizeItems(snapshot?.inventory),
      seeds: summarizeItems(snapshot?.seedInventory),
      herbs: summarizeItems(snapshot?.garden?.herbs),
      research: snapshot?.research?.completedResearchIds ?? [],
    };
  }

  hideOnlineGate() {
    this.app?.onlineGateManager?.hide?.();
    return this.getState();
  }

  startFresh() {
    const button = this.app?.lifecycleManager?.freshStartChoiceManager?.refs?.freshButton;

    if (!button || button.hidden || button.closest('[hidden]')) {
      return { ok: false, reason: 'fresh_button_missing' };
    }

    button.click();
    return { ok: true };
  }

  resetTutorialProgress() {
    this.app?.pagesFacade?.resetTutorialProgress?.();
    this.refreshTutorial();
    return this.getState();
  }

  refreshTutorial() {
    this.app?.pagesFacade?.tutorialFacade?.refresh?.();
    return this.getState();
  }

  openLessonPanel() {
    this.app?.pagesFacade?.tutorialFacade?.hintManager?.openLessonPanel?.();
    return this.getState();
  }

  closeLessonPanel() {
    this.app?.pagesFacade?.tutorialFacade?.hintManager?.closeLessonPanel?.();
    return this.getState();
  }

  showPage(pageId) {
    this.app?.pagesFacade?.show?.(pageId);
    this.refreshTutorial();
    return this.getState();
  }

  clickTarget(targetId) {
    const target = this.app?.pagesFacade?.tutorialFacade?.targetManager?.getTarget?.(targetId);

    if (!target) {
      return { ok: false, reason: 'target_missing', targetId };
    }

    target.click();
    this.refreshTutorial();
    return { ok: true, state: this.getState() };
  }

  clickSelector(selector) {
    const target = this.getStage()?.querySelector?.(selector);

    if (!target) {
      return { ok: false, reason: 'selector_missing', selector };
    }

    target.click();
    this.refreshTutorial();
    return { ok: true, state: this.getState() };
  }

  clickByText(text, selector = 'button') {
    const wanted = String(text ?? '').trim();
    const elements = [...(this.getStage()?.querySelectorAll?.(selector) ?? [])];
    const target = elements.find((element) => element.textContent.trim() === wanted);

    if (!target) {
      return { ok: false, reason: 'text_missing', text: wanted, selector };
    }

    target.click();
    this.refreshTutorial();
    return { ok: true, state: this.getState() };
  }

  getStage() {
    return this.app?.viewportFacade?.getStageElement?.() ?? null;
  }
}

function summarizeItems(items = []) {
  return items
    .filter((item) => (Number(item?.quantity) || 0) > 0)
    .map((item) => ({
      key: item.key,
      quantity: Number(item.quantity) || 0,
    }));
}
