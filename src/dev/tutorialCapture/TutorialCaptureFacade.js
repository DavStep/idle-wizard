import { FRESH_START_CHOICE_START_FRESH } from '../../app/managers/AppFreshStartChoiceManager.js';

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
      advanceFirstRunIntro: () => this.advanceFirstRunIntro(),
      advanceTutorial: () => this.advanceTutorial(),
      resetTutorialProgress: () => this.resetTutorialProgress(),
      refreshTutorial: () => this.refreshTutorial(),
      openLessonPanel: () => this.openLessonPanel(),
      closeLessonPanel: () => this.closeLessonPanel(),
      dismissDialog: (dialogId) => this.dismissDialog(dialogId),
      showPage: (pageId) => this.showPage(pageId),
      setUsername: (username) => this.setUsername(username),
      clickTarget: (targetId) => this.clickTarget(targetId),
      getTargetState: (targetId) => this.getTargetState(targetId),
      clickSelector: (selector) => this.clickSelector(selector),
      clickByText: (text, selector) => this.clickByText(text, selector),
      recordTaskAction: (action) => this.recordTaskAction(action),
      completeTaskWithItems: (taskId, itemKey, quantity) =>
        this.completeTaskWithItems(taskId, itemKey, quantity),
      completeTurnInTaskByItem: (itemKey) => this.completeTurnInTaskByItem(itemKey),
      completeCurrentTask: (taskId) => this.completeCurrentTask(taskId),
    });
  }

  getState() {
    const experience = this.getExperienceFacade();
    const overlay = experience?.tutorialOverlay;
    const overlayModel = overlay?.model ?? null;
    const tutorial = this.app?.pagesFacade?.tutorialFacade;
    const activeStep = experience?.activeTutorialStep ?? tutorial?.activeStep ?? null;
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
      firstRunIntroVisible: Boolean(experience?.introInProgress),
      firstRunIntroStepId: experience?.introPresenter?.steps?.[
        experience?.introPresenter?.index ?? -1
      ]?.id ?? null,
      lessonOpen: overlay
        ? Boolean(overlay.isLessonPanelOpen?.())
        : Boolean(lesson && !lesson.hidden),
      lessonText: overlayModel?.lesson?.text ??
        lesson?.querySelector('.tutorial-layer__lesson-text')?.textContent ?? '',
      lessonButtonVisible: overlayModel
        ? Boolean(overlayModel.lesson?.advanceOnClick)
        : Boolean(lessonButton && !lessonButton.hidden),
      pointerVisible: overlayModel
        ? Boolean(
            overlayModel.kind === 'lesson' &&
              overlayModel.cue?.kind === 'target-cue' &&
              overlayModel.cue?.showPointer,
          )
        : Boolean(pointer && !pointer.hidden),
      username:
        stage?.querySelector('[data-tutorial-id="top:username"]')?.textContent?.trim() ?? '',
      onlineGateVisible: Boolean(
        this.app?.onlineGateManager?.root && !this.app.onlineGateManager.root.hidden,
      ),
      freshStartVisible: Boolean(
        this.app?.lifecycleManager?.freshStartChoiceManager?.isChoosing?.() ||
          this.getDocumentRoot()?.querySelector('.app-fresh-start-choice:not([hidden])'),
      ),
      completedStepIds: [
        ...(experience?.tutorialProgressManager?.completedStepIds ??
          tutorial?.progressManager?.completedStepIds ?? []),
      ],
      targetIds: experience?.semanticRegistry?.targets
        ? [...experience.semanticRegistry.targets.keys()]
        : [...(stage?.querySelectorAll('[data-tutorial-id]') ?? [])].map(
            (element) => element.dataset.tutorialId,
          ),
      openDialogIds: experience?.tutorialRuntimeState?.getOpenDialogIds?.() ?? [],
      tasksExpanded: experience?.tutorialRuntimeState?.isTasksExpanded?.() ?? null,
      snapshot: this.getSnapshotSummary(),
    };
  }

  getExperienceFacade() {
    return this.app?.experienceFacade ?? this.app?.pagesFacade?.experienceFacade ?? null;
  }

  getSnapshotSummary() {
    let snapshot = {};
    try {
      snapshot = this.app?.gameplayFacade?.getSnapshot?.() ?? {};
    } catch {
      // Fresh-start capture can mount before gameplay entities are initialized.
      // The capture API must remain readable so automation can choose a save.
      snapshot = {};
    }

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
    if (manager?.isChoosing?.() && typeof manager.resolve === 'function') {
      const resolved = manager.resolve(FRESH_START_CHOICE_START_FRESH);
      this.refreshTutorial();
      return {
        ok: resolved !== false,
        hidden: !manager.isChoosing?.(),
        hasResolver: true,
      };
    }

    const button =
      manager?.refs?.freshButton ??
      this.getDocumentRoot()?.querySelector?.(
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
      manager.resolve(FRESH_START_CHOICE_START_FRESH);
    }
    this.refreshTutorial();

    return {
      ok: true,
      hidden: Boolean(manager?.root?.hidden),
      hasResolver: Boolean(manager?.resolveChoice),
    };
  }

  advanceFirstRunIntro() {
    const experience = this.getExperienceFacade();
    const advanced = experience?.introPresenter?.advance?.();
    return {
      ok: advanced !== false && Boolean(experience?.introPresenter),
      state: this.getState(),
    };
  }

  advanceTutorial() {
    const experience = this.getExperienceFacade();
    const advanced = experience?.advanceTutorial?.();

    if (experience) {
      return { ok: advanced !== false, state: this.getState() };
    }

    const button = this.getStage()?.querySelector?.(
      '.tutorial-layer__lesson-advance:not([hidden])',
    );
    if (!button) {
      return { ok: false, reason: 'tutorial_advance_missing' };
    }
    button.click();
    this.refreshTutorial();
    return { ok: true, state: this.getState() };
  }

  resetTutorialProgress() {
    this.app?.pagesFacade?.resetTutorialProgress?.();
    this.refreshTutorial();
    return this.getState();
  }

  refreshTutorial() {
    this.getExperienceFacade()?.refresh?.();
    this.app?.pagesFacade?.tutorialFacade?.refresh?.();
    return this.getState();
  }

  openLessonPanel() {
    const overlay = this.getExperienceFacade()?.tutorialOverlay;
    if (overlay && !overlay.isLessonPanelOpen?.()) {
      overlay.togglePanel?.();
    }
    this.app?.pagesFacade?.tutorialFacade?.hintManager?.openLessonPanel?.();
    return this.getState();
  }

  closeLessonPanel() {
    const overlay = this.getExperienceFacade()?.tutorialOverlay;
    if (overlay?.isLessonPanelOpen?.()) {
      overlay.togglePanel?.();
    }
    this.app?.pagesFacade?.tutorialFacade?.hintManager?.closeLessonPanel?.();
    return this.getState();
  }

  dismissDialog(dialogId) {
    const runtime = this.getExperienceFacade()?.runtime;
    const dialog = runtime?.dialogRegistry?.get?.(dialogId);

    if (!dialog) {
      return { ok: false, reason: 'dialog_missing', dialogId };
    }

    if (dialogId === 'global.announcement') {
      const presenter = this.app?.announcementPresenter;
      const completed = presenter?.current
        ? presenter.completeCurrent?.({
            source: 'tutorial-capture',
            closeDialog: true,
          })
        : null;
      if (runtime?.getOpenDialogIds?.().includes(dialogId)) {
        runtime.closeDialog?.(dialogId);
      }
      this.refreshTutorial();
      return {
        ok: Boolean(completed) || !runtime?.getOpenDialogIds?.().includes(dialogId),
        dialogId,
        state: this.getState(),
      };
    }

    // Headless Chrome can throttle the retained announcement RAF. Settle the
    // already-presented motion before emulating the player's continue tap.
    dialog.stopAnnouncementMotion?.();
    dialog.settleAnnouncementMotion?.();
    const dismissed = dialog.requestClose?.('complete');
    if (dismissed === false) {
      return { ok: false, reason: 'dialog_not_ready', dialogId };
    }
    if (dismissed === undefined) {
      runtime.closeDialog?.(dialogId);
    }
    this.refreshTutorial();
    return { ok: true, dialogId, state: this.getState() };
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
    const experience = this.getExperienceFacade();
    const semanticTarget = experience?.resolveTarget?.(targetId);

    if (semanticTarget?.semanticId) {
      const payload = { source: 'tutorial-capture' };
      if (
        semanticTarget.state?.tutorialPointerGesture?.kind === 'horizontal-drag'
      ) {
        const control = semanticTarget.displayObject;
        const min = Number(control?.min);
        const max = Number(control?.max);
        const targetValue = Number(control?.tutorialTargetValue);
        const width = Number(control?.controlWidth);
        const knobRadius = Math.max(0, Number(control?.knob?.width) || 0) / 2;
        if (
          [min, max, targetValue, width].every(Number.isFinite) &&
          max > min &&
          width > 0
        ) {
          payload.localX =
            knobRadius +
            ((targetValue - min) / (max - min)) *
              Math.max(1, width - knobRadius * 2);
        }
      }
      const activated = experience.semanticRegistry?.activate?.(
        semanticTarget.semanticId,
        payload,
      );
      this.refreshTutorial();
      return {
        ok: activated !== false,
        ...(activated === false ? { reason: 'target_activation_failed' } : {}),
        targetId,
        semanticId: semanticTarget.semanticId,
        targetState: semanticTarget.state ?? null,
        state: this.getState(),
      };
    }

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

  getTargetState(targetId) {
    const semanticTarget = this.getExperienceFacade()?.resolveTarget?.(targetId);

    if (semanticTarget) {
      const rect = semanticTarget.bounds ?? null;
      const state = semanticTarget.state ?? {};
      const measurable = Boolean(rect && rect.width > 0 && rect.height > 0);
      const hidden = state.visible === false || state.active === false;
      return {
        ok: !hidden && measurable,
        targetId,
        semanticId: semanticTarget.semanticId ?? null,
        hidden,
        measurable,
        state,
        rect: rect
          ? {
              left: rect.left ?? rect.x,
              top: rect.top ?? rect.y,
              width: rect.width,
              height: rect.height,
            }
          : null,
      };
    }

    const target = this.app?.pagesFacade?.tutorialFacade?.targetManager?.getTarget?.(targetId);

    if (!target) {
      return { ok: false, reason: 'target_missing', targetId };
    }

    const rect = target.getBoundingClientRect?.();
    const hidden = Boolean(target.hidden || target.closest?.('[hidden]'));
    const measurable = Boolean(rect && rect.width > 0 && rect.height > 0);

    return {
      ok: !hidden && measurable,
      targetId,
      hidden,
      measurable,
      rect: rect
        ? {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }
        : null,
    };
  }

  clickSelector(selector) {
    const target =
      this.getStage()?.querySelector?.(selector) ??
      this.getDocumentRoot()?.querySelector?.(selector);

    if (!target) {
      return { ok: false, reason: 'selector_missing', selector };
    }

    target.click();
    this.refreshTutorial();
    return { ok: true, state: this.getState() };
  }

  clickByText(text, selector = 'button') {
    const wanted = String(text ?? '').trim();
    const elements = [
      ...(this.getStage()?.querySelectorAll?.(selector) ?? []),
      ...(this.getDocumentRoot()?.querySelectorAll?.(selector) ?? []),
    ];
    const target = elements.find((element) => element.textContent.trim() === wanted);

    if (!target) {
      return { ok: false, reason: 'text_missing', text: wanted, selector };
    }

    target.click();
    this.refreshTutorial();
    return { ok: true, state: this.getState() };
  }

  recordTaskAction(action) {
    const gameplay = this.app?.gameplayFacade;

    if (!gameplay?.tasksFacade?.recordAction) {
      return { ok: false, reason: 'tasks_facade_missing', action };
    }

    const result = gameplay.tasksFacade.recordAction(action);
    gameplay.completeReadyTaskLevels?.();
    gameplay.publishAndSaveSnapshot?.();
    this.refreshTutorial();
    const alreadyComplete = result?.ok === false && this.hasCompletedMatchingTaskAction(action);

    return {
      ok: result?.ok !== false || alreadyComplete,
      action,
      result,
      ...(alreadyComplete ? { reason: 'already_completed' } : {}),
      state: this.getState(),
    };
  }

  hasCompletedMatchingTaskAction(action) {
    return (
      this.app?.gameplayFacade
        ?.getSnapshot?.()
        ?.tasks?.level?.tasks?.some(
          (task) => task?.completed && this.taskMatchesAction(task, action),
        ) === true
    );
  }

  taskMatchesAction(task, action) {
    const actionType = String(action?.type ?? action?.action ?? '').trim();
    const taskType = String(task?.type ?? task?.action ?? '').trim();

    if (actionType && taskType && actionType !== taskType) {
      return false;
    }

    if (action?.researchId) {
      return task?.researchId === action.researchId;
    }

    if (action?.itemKey) {
      return task?.itemKey === action.itemKey;
    }

    return false;
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
    const completeOk = complete?.ok !== false || complete?.reason === 'already_completed';
    gameplay.completeReadyTaskLevels?.();
    gameplay.publishAndSaveSnapshot?.();
    this.refreshTutorial();

    return {
      ok: fill?.ok !== false && completeOk,
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

  completeTurnInTaskByItem(itemKey) {
    const task = this.app?.gameplayFacade
      ?.getSnapshot?.()
      ?.tasks?.level?.tasks?.find((candidate) => {
        if (candidate?.itemKey !== itemKey || candidate?.completed) {
          return false;
        }

        const type = candidate.type ?? candidate.action ?? null;
        return !type || type === 'turnIn' || type === 'drop';
      });

    if (!task) {
      return { ok: false, reason: 'turn_in_task_missing', itemKey };
    }

    return this.completeCurrentTask(task.taskId);
  }

  getStage() {
    return this.app?.viewportFacade?.getStageElement?.() ?? null;
  }

  getDocumentRoot() {
    return (
      this.getStage()?.ownerDocument ??
      this.target?.document ??
      globalThis.document ??
      null
    );
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
