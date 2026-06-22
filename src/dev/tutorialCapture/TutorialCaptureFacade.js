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
      setUsername: (username) => this.setUsername(username),
      clickTarget: (targetId) => this.clickTarget(targetId),
      clickSelector: (selector) => this.clickSelector(selector),
      clickByText: (text, selector) => this.clickByText(text, selector),
      completeTaskWithItems: (taskId, itemKey, quantity) =>
        this.completeTaskWithItems(taskId, itemKey, quantity),
      completeCurrentTask: (taskId) => this.completeCurrentTask(taskId),
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
      username:
        stage?.querySelector('[data-tutorial-id="top:username"]')?.textContent?.trim() ?? '',
      onlineGateVisible: Boolean(
        this.app?.onlineGateManager?.root && !this.app.onlineGateManager.root.hidden,
      ),
      freshStartVisible: Boolean(
        stage?.querySelector('.app-fresh-start-choice:not([hidden])'),
      ),
      completedStepIds: [...(tutorial?.progressManager?.completedStepIds ?? [])],
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
      coin: snapshot?.coin ?? null,
      tasks: snapshot?.tasks ?? null,
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
    const manager = this.app?.lifecycleManager?.freshStartChoiceManager;
    const button =
      manager?.refs?.freshButton ??
      this.getStage()?.querySelector?.(
        '.app-fresh-start-choice__button--fresh:not([hidden])',
      );

    if (!button || button.hidden || button.closest('[hidden]')) {
      return {
        ok: false,
        reason: 'fresh_button_missing',
        hasButton: Boolean(button),
        buttonHidden: Boolean(button?.hidden),
        hiddenAncestor: Boolean(button?.closest?.('[hidden]')),
        hasResolver: Boolean(manager?.resolveChoice),
      };
    }

    button.click();
    if (manager?.root && !manager.root.hidden && manager.resolveChoice) {
      manager.resolve('start_fresh');
    }
    this.refreshTutorial();

    return {
      ok: true,
      hidden: Boolean(manager?.root?.hidden),
      hasResolver: Boolean(manager?.resolveChoice),
    };
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

  setUsername(username) {
    const open = this.clickTarget('top:username');

    if (!open?.ok) {
      return open;
    }

    const stage = this.getStage();
    const input = stage?.querySelector?.('.room-top-panel__username-input');
    const form = stage?.querySelector?.('.room-top-panel__username-form');

    if (!input || !form) {
      return {
        ok: false,
        reason: 'username_form_missing',
        hasInput: Boolean(input),
        hasForm: Boolean(form),
      };
    }

    const EventCtor = input.ownerDocument?.defaultView?.Event ?? globalThis.Event;

    input.value = String(username ?? '');
    input.dispatchEvent(new EventCtor('input', { bubbles: true }));
    form.dispatchEvent(new EventCtor('submit', { bubbles: true, cancelable: true }));
    this.refreshTutorial();

    return { ok: true, state: this.getState() };
  }

  clickTarget(targetId) {
    const target = this.app?.pagesFacade?.tutorialFacade?.targetManager?.getTarget?.(targetId);

    if (!target) {
      return { ok: false, reason: 'target_missing', targetId };
    }

    const clickable = target.matches?.('button')
      ? target
      : (target.querySelector?.('button') ?? target);
    clickable.click();
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

  completeTaskWithItems(taskId, itemKey, quantity) {
    const gameplay = this.app?.gameplayFacade;
    let definition = null;
    try {
      definition = gameplay?.itemsFacade?.getItemDefinitionByKey?.(itemKey);
    } catch {
      definition = null;
    }
    const safeQuantity = Math.max(0, Math.floor(Number(quantity) || 0));

    if (!gameplay || !definition) {
      return { ok: false, reason: 'gameplay_or_item_missing', taskId, itemKey };
    }

    if (safeQuantity > 0) {
      gameplay.itemsFacade.addItem(definition.id, safeQuantity);
    }

    const fill = gameplay.tasksFacade?.fillTask?.(taskId);
    const complete = gameplay.tasksFacade?.completeTask?.(taskId);
    gameplay.publishAndSaveSnapshot?.();
    this.refreshTutorial();

    return {
      ok: fill?.ok !== false && complete?.ok !== false,
      fill,
      complete,
      state: this.getState(),
    };
  }

  completeCurrentTask(taskId) {
    const task = this.app?.gameplayFacade
      ?.getSnapshot?.()
      ?.tasks?.level?.tasks?.find((candidate) => candidate.taskId === taskId);

    if (!task) {
      return { ok: false, reason: 'task_missing', taskId };
    }

    return this.completeTaskWithItems(
      taskId,
      task.itemKey,
      Math.max(
        0,
        (Number(task.remainingQuantity) || 0) - (Number(task.ownedQuantity) || 0),
      ),
    );
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
