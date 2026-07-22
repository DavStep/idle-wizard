import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import {
  getLevelRequirementTargetLevel,
} from '../../shared/levelRequirementsLabel.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { createPageIcon } from '../../shared/pageIcons.js';
import { setResourceColor } from '../../shared/resourceColor.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { formatCoinPriceText } from '../../../shared/coinPrice.js';
import {
  getTaskRequirementVerb,
  taskRequirementTypes,
} from '../../../gameplay/tasks/taskRequirementTypes.js';
import { getLevelPayoffRows } from './levelPayoffSummary.js';

const ELARA_REQUEST_LABEL = "elara's request";
const LEVEL_UP_LABEL = 'level up';
const TURN_IN_TEXT = 'turn in';
const EXPANDED_CONTENT_MOTION_MS = 225;
const TASK_REORDER_MOTION_MS = 225;
const TASK_REORDER_EARLY_THRESHOLD_RATIO = 0.2;
const DUPLICATE_TOUCH_CLICK_SUPPRESSION_MS = 450;
const TASK_REORDER_TRANSITION =
  'transform 225ms cubic-bezier(0.22, 1, 0.36, 1), opacity 140ms linear';
export class WorkshopTaskManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.rowsByTaskId = new Map();
    this.rowAnimations = new Map();
    this.currentTasksById = new Map();
    this.currentDisplayTasks = [];
    this.currentLevelCompletion = null;
    this.currentCoin = 0;
    this.currentSnapshot = null;
    this.currentFirstCompletedTaskId = null;
    this.currentRequirementsLabel = ELARA_REQUEST_LABEL;
    this.currentRequirementTargetLevel = null;
    this.taskPriorityByLevel = new Map();
    this.dragState = null;
    this.skipNextRowAnimationTaskId = null;
    this.skipNextRowAnimationRoot = null;
    this.expanded = false;
    this.expandingExpandedContent = false;
    this.collapsingExpandedContent = false;
    this.expandedContentAnimationTimeoutId = null;
    this.expandedContentAnimationFrameId = null;
    this.duplicateTouchClickSuppressionTimeoutId = null;
    this.canToggleTasks = false;
    this.pinned = false;
    this.rewardsHidden = false;
    this.levelRewardsTogglePressPointerType = '';
    this.suppressNextLevelRewardsOutsideClick = false;
    this.suppressNextTutorialLayerOutsidePress = false;
    this.infoVisible = false;
    this.previousFocus = null;
    this.suppressNextOutsideClick = false;
    this.tutorialLayerOutsidePressSuppressionTimeoutId = null;
    this.handleBackdropPress = (event) => {
      if (this.consumeTutorialLayerOutsidePress(event)) {
        return;
      }

      if (this.suppressLevelRewardsOutsideClick(event)) {
        return;
      }

      this.collapseFromOutsidePress(event);
    };
    this.handleOutsidePress = (event) => {
      if (this.consumeTutorialLayerOutsidePress(event)) {
        return;
      }

      if (this.suppressLevelRewardsOutsideClick(event)) {
        return;
      }

      if (event.type === 'click' && this.suppressNextOutsideClick) {
        this.suppressNextOutsideClick = false;
        const target = event.target;

        if (!target || !this.root?.contains(target)) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation?.();
        }

        this.clearDuplicateTouchClickSuppression();
        return;
      }

      if (event.type !== 'click') {
        this.suppressNextOutsideClick = false;
      }

      if (!this.isTaskListExpanded() || this.pinned || this.infoVisible) {
        return;
      }

      const target = event.target;

      if (this.isTutorialLayerEvent(event)) {
        this.suppressTutorialLayerOutsidePress();
        return;
      }

      if (target && this.root?.contains(target)) {
        return;
      }

      this.collapseFromOutsidePress(event);

      if (event.type !== 'click') {
        this.suppressNextOutsideClick = true;
      }
    };
    this.handleInfoPopupClick = (event) => {
      if (event.target === this.refs.infoPopup) {
        this.hideInfo();
      }
    };
    this.handleLevelRewardsTogglePointerDown = (event) => {
      this.trackLevelRewardsTogglePress(event);
    };
    this.handleLevelRewardsToggleClick = () => {
      this.toggleLevelRewards();
    };
    this.handleKeydown = (event) => {
      if (!this.infoVisible || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      this.hideInfo();
    };
    this.handleTaskDragDocumentMove = (event) => {
      this.onTaskDragDocumentPointerMove(event);
    };
    this.handleTaskDragDocumentUp = (event) => {
      this.onTaskDragDocumentPointerUp(event);
    };
    this.handleTaskDragDocumentCancel = (event) => {
      this.onTaskDragDocumentPointerCancel(event);
    };
    this.handleExpandedContentTransitionEnd = (event) => {
      if (
        event.target === this.refs.expandedContent &&
        event.propertyName === 'height'
      ) {
        this.finishExpandedContentMotion();
      }
    };
  }

  mount(parent, popupParent = parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'workshop-page__tasks style-box is-collapsed';
    this.root.setAttribute('aria-label', this.currentRequirementsLabel);
    this.root.setAttribute('aria-expanded', 'true');
    this.root.dataset.tutorialId = 'workshop:tasks';
    this.root.dataset.questMode = 'sequential';

    this.refs.slot = document.createElement('div');
    this.refs.slot.className = 'workshop-page__tasks-slot';

    this.refs.backdrop = document.createElement('button');
    this.refs.backdrop.className = 'workshop-page__tasks-backdrop';
    this.refs.backdrop.type = 'button';
    this.refs.backdrop.tabIndex = -1;
    this.refs.backdrop.hidden = true;
    this.refs.backdrop.setAttribute('aria-hidden', 'true');
    this.refs.backdrop.setAttribute('aria-label', `collapse ${this.currentRequirementsLabel}`);
    this.refs.backdrop.addEventListener('pointerdown', this.handleBackdropPress);
    this.refs.backdrop.addEventListener('click', this.handleBackdropPress);

    this.refs.title = document.createElement('button');
    this.refs.title.className = 'style-box__title workshop-page__tasks-title';
    this.refs.title.type = 'button';
    this.refs.title.textContent = this.currentRequirementsLabel;
    this.refs.title.setAttribute('aria-label', `show ${this.currentRequirementsLabel} info`);
    this.refs.title.setAttribute('aria-expanded', 'false');
    this.refs.title.setAttribute('aria-haspopup', 'dialog');
    this.refs.title.addEventListener('click', () => this.showInfo());

    this.refs.summary = document.createElement('div');
    this.refs.summary.className = 'workshop-page__tasks-summary';
    this.refs.nextLine = document.createElement('div');
    this.refs.nextLine.className = 'workshop-page__tasks-next';
    this.refs.summaryTask = this.createTaskRow();
    this.refs.summary.append(this.refs.nextLine, this.refs.summaryTask.root);

    this.refs.list = document.createElement('div');
    this.refs.list.className = 'workshop-page__task-list';
    this.refs.list.id = 'workshop-task-list';
    this.refs.list.hidden = true;

    this.refs.toggleButton = document.createElement('button');
    this.refs.toggleButton.className = 'workshop-page__tasks-toggle';
    this.refs.toggleButton.type = 'button';
    this.refs.toggleButton.dataset.tutorialId = 'workshop:tasks';
    this.refs.toggleButton.setAttribute('aria-expanded', 'false');
    this.refs.toggleButton.setAttribute('aria-controls', 'workshop-task-list');
    this.refs.toggleButton.addEventListener('click', () => this.toggleExpanded());

    this.refs.pinButton = document.createElement('button');
    this.refs.pinButton.className = 'workshop-page__tasks-pin';
    this.refs.pinButton.type = 'button';
    this.refs.pinButton.addEventListener('click', () => this.togglePinned());

    this.refs.levelRewards = this.createLevelRewardsPanel();
    this.refs.levelRewardsToggle = document.createElement('button');
    this.refs.levelRewardsToggle.className = 'workshop-page__level-rewards-toggle';
    this.refs.levelRewardsToggle.type = 'button';
    this.refs.levelRewardsToggle.setAttribute('aria-controls', 'workshop-level-rewards');
    this.refs.levelRewardsToggle.addEventListener(
      'pointerdown',
      this.handleLevelRewardsTogglePointerDown,
    );
    this.refs.levelRewardsToggle.addEventListener('click', this.handleLevelRewardsToggleClick);
    this.refs.levelComplete = this.createLevelCompleteRow();

    this.refs.expandedContent = document.createElement('div');
    this.refs.expandedContent.className = 'workshop-page__tasks-expanded-content';

    this.refs.expandedContentBody = document.createElement('div');
    this.refs.expandedContentBody.className =
      'workshop-page__tasks-expanded-content-body';
    this.refs.expandedContentBody.append(
      this.refs.list,
      this.refs.levelRewards.root,
      this.refs.levelComplete.root,
    );
    this.refs.expandedContent.append(this.refs.expandedContentBody);

    this.root.append(
      this.refs.title,
      this.refs.summary,
      this.refs.expandedContent,
      this.refs.pinButton,
      this.refs.toggleButton,
      this.refs.levelRewardsToggle,
    );
    this.refs.slot.append(this.root);
    parent.append(this.refs.backdrop, this.refs.slot);
    this.refs.infoPopup = this.createInfoPopup();
    popupParent.append(this.refs.infoPopup);
    document.addEventListener('pointerdown', this.handleOutsidePress, true);
    document.addEventListener('click', this.handleOutsidePress, true);
    document.addEventListener('keydown', this.handleKeydown);
    this.setCanToggleTasks(false, { preservePinned: true });
    this.syncExpansionState();

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('pointerdown', this.handleOutsidePress, true);
    document.removeEventListener('click', this.handleOutsidePress, true);
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.infoPopup?.removeEventListener('click', this.handleInfoPopupClick);
    this.refs.backdrop?.removeEventListener('pointerdown', this.handleBackdropPress);
    this.refs.backdrop?.removeEventListener('click', this.handleBackdropPress);
    this.refs.levelRewardsToggle?.removeEventListener(
      'pointerdown',
      this.handleLevelRewardsTogglePointerDown,
    );
    this.refs.levelRewardsToggle?.removeEventListener('click', this.handleLevelRewardsToggleClick);
    this.cancelExpandedContentMotion();
    this.clearDuplicateTouchClickSuppression();
    this.clearTutorialLayerOutsidePressSuppression();
    this.stopTaskDragListeners();
    this.clearTaskDragPreview(this.dragState);
    this.cancelRowAnimations();
    this.refs.infoPopup?.remove();
    this.refs.backdrop?.remove();
    this.refs.slot?.remove();
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.rowsByTaskId.clear();
    this.rowAnimations.clear();
    this.currentTasksById.clear();
    this.currentDisplayTasks = [];
    this.currentLevelCompletion = null;
    this.currentCoin = 0;
    this.currentSnapshot = null;
    this.currentFirstCompletedTaskId = null;
    this.currentRequirementsLabel = ELARA_REQUEST_LABEL;
    this.expandingExpandedContent = false;
    this.collapsingExpandedContent = false;
    this.duplicateTouchClickSuppressionTimeoutId = null;
    this.levelRewardsTogglePressPointerType = '';
    this.suppressNextLevelRewardsOutsideClick = false;
    this.suppressNextTutorialLayerOutsidePress = false;
    this.tutorialLayerOutsidePressSuppressionTimeoutId = null;
    this.infoVisible = false;
    this.previousFocus = null;
    this.dragState = null;
    this.skipNextRowAnimationTaskId = null;
    this.skipNextRowAnimationRoot = null;
  }

  toggleExpanded() {
    this.setExpanded(!this.expanded);
  }

  togglePinned() {
    this.setPinned(!this.pinned);
  }

  setPinned(pinned) {
    const nextPinned = Boolean(pinned && this.canToggleTasks);

    if (nextPinned && !this.expanded) {
      this.pinned = true;
      this.setExpanded(true);
      return;
    }

    this.pinned = nextPinned;
    this.syncExpansionState();
  }

  toggleLevelRewards() {
    const shouldSuppressDuplicateTouchClick =
      this.levelRewardsTogglePressPointerType &&
      this.levelRewardsTogglePressPointerType !== 'mouse';
    this.levelRewardsTogglePressPointerType = '';

    if (!this.canToggleLevelRewards() || !this.hasLevelRewardsLayout()) {
      return;
    }

    this.rewardsHidden = !this.rewardsHidden;
    this.syncExpansionState();

    if (shouldSuppressDuplicateTouchClick) {
      this.suppressDuplicateTouchClick();
    }
  }

  setExpanded(expanded) {
    const nextExpanded = Boolean(expanded);

    if (!nextExpanded) {
      this.pinned = false;
    }

    if (nextExpanded === this.expanded) {
      this.syncExpansionState();
      return;
    }

    const canAnimateExpandedContent = this.shouldAnimateExpandedContentMotion();
    const shouldAnimateExpand = !this.expanded && nextExpanded && canAnimateExpandedContent;
    const shouldAnimateCollapse = this.expanded && !nextExpanded && canAnimateExpandedContent;

    if (shouldAnimateExpand) {
      const startHeight = this.collapsingExpandedContent
        ? this.getExpandedContentHeight()
        : 0;

      this.expanded = true;
      this.syncExpansionState();
      this.startExpandedContentExpand(startHeight);
      return;
    }

    if (shouldAnimateCollapse) {
      const startHeight = this.getExpandedContentHeight();

      this.startExpandedContentCollapse(startHeight);
      this.expanded = false;
      this.syncExpansionState();
      return;
    }

    this.cancelExpandedContentMotion();
    this.expanded = nextExpanded;
    this.syncExpansionState();
  }

  collapseFromOutsidePress(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    this.setExpanded(false);
  }

  trackLevelRewardsTogglePress(event) {
    if (event?.button > 0 || event?.isPrimary === false) {
      return;
    }

    this.levelRewardsTogglePressPointerType = event?.pointerType ?? '';
  }

  suppressDuplicateTouchClick() {
    this.suppressNextLevelRewardsOutsideClick = true;
    this.clearDuplicateTouchClickSuppression({ preserveSuppression: true });

    const window = this.root?.ownerDocument?.defaultView;
    if (!window?.setTimeout) {
      return;
    }

    this.duplicateTouchClickSuppressionTimeoutId = window.setTimeout(() => {
      this.suppressNextLevelRewardsOutsideClick = false;
      this.duplicateTouchClickSuppressionTimeoutId = null;
    }, DUPLICATE_TOUCH_CLICK_SUPPRESSION_MS);
  }

  clearDuplicateTouchClickSuppression({ preserveSuppression = false } = {}) {
    const window = this.root?.ownerDocument?.defaultView;

    if (this.duplicateTouchClickSuppressionTimeoutId !== null) {
      window?.clearTimeout?.(this.duplicateTouchClickSuppressionTimeoutId);
      this.duplicateTouchClickSuppressionTimeoutId = null;
    }

    if (!preserveSuppression) {
      this.suppressNextLevelRewardsOutsideClick = false;
    }
  }

  suppressLevelRewardsOutsideClick(event) {
    if (event?.type !== 'click' || !this.suppressNextLevelRewardsOutsideClick) {
      return false;
    }

    const target = event.target;
    if (target && this.root?.contains(target)) {
      return false;
    }

    event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
    this.clearDuplicateTouchClickSuppression();
    return true;
  }

  suppressTutorialLayerOutsidePress() {
    this.suppressNextTutorialLayerOutsidePress = true;
    this.clearTutorialLayerOutsidePressSuppression({ preserveSuppression: true });

    const window = this.root?.ownerDocument?.defaultView;
    if (!window?.setTimeout) {
      return;
    }

    this.tutorialLayerOutsidePressSuppressionTimeoutId = window.setTimeout(() => {
      this.suppressNextTutorialLayerOutsidePress = false;
      this.tutorialLayerOutsidePressSuppressionTimeoutId = null;
    }, DUPLICATE_TOUCH_CLICK_SUPPRESSION_MS);
  }

  clearTutorialLayerOutsidePressSuppression({ preserveSuppression = false } = {}) {
    const window = this.root?.ownerDocument?.defaultView;

    if (this.tutorialLayerOutsidePressSuppressionTimeoutId !== null) {
      window?.clearTimeout?.(this.tutorialLayerOutsidePressSuppressionTimeoutId);
      this.tutorialLayerOutsidePressSuppressionTimeoutId = null;
    }

    if (!preserveSuppression) {
      this.suppressNextTutorialLayerOutsidePress = false;
    }
  }

  consumeTutorialLayerOutsidePress(event) {
    if (!this.suppressNextTutorialLayerOutsidePress || this.isTutorialLayerEvent(event)) {
      return false;
    }

    const target = event?.target;
    if (target && this.root?.contains(target)) {
      return false;
    }

    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
    this.clearTutorialLayerOutsidePressSuppression();
    return true;
  }

  isTutorialLayerEvent(event) {
    const target = event?.target;

    if (target?.closest?.('.tutorial-layer')) {
      return true;
    }

    return Boolean(
      event
        ?.composedPath?.()
        ?.some((node) => node?.classList?.contains?.('tutorial-layer')),
    );
  }

  render(snapshot) {
    const taskSnapshot = snapshot?.tasks;

    if (!this.root || !taskSnapshot?.level) {
      return;
    }

    const activeDragState = this.dragState;

    if (activeDragState) {
      this.restoreTaskDragFlow(activeDragState);
    }

    const tasks = taskSnapshot.level.tasks ?? [];
    this.setRequirementContext(taskSnapshot);
    const displayTasks = this.getDisplayTasks(tasks, taskSnapshot);
    const [summaryTask] = displayTasks;
    const listTasks = [];
    this.currentSnapshot = snapshot;
    this.currentTasksById = new Map(tasks.map((task) => [task.taskId, task]));
    this.currentDisplayTasks = displayTasks;
    this.currentLevelCompletion = taskSnapshot.level.completion ?? null;
    this.currentCoin = Number(snapshot?.coin?.current) || 0;
    this.currentFirstCompletedTaskId = null;
    const rowMovement = this.ensureRows(listTasks);
    this.setCanToggleTasks(listTasks.length > 0);

    if (!activeDragState) {
      this.ensureSummaryTaskInFlow();
    }

    this.renderSummaryTask(summaryTask, taskSnapshot.completedAllLevels);
    this.setHidden(this.refs.nextLine, true);
    this.root.classList.toggle('is-all-complete', taskSnapshot.completedAllLevels);

    for (const task of listTasks) {
      this.renderTask(task);
    }

    this.syncExpansionState();
    this.animateMovedRows(rowMovement);
    this.skipNextRowAnimationTaskId = null;
    this.skipNextRowAnimationRoot = null;

    if (activeDragState && this.dragState === activeDragState) {
      this.syncTaskDragPreview();
    }
  }

  getDisplayTasks(tasks, taskSnapshot = this.currentSnapshot?.tasks) {
    const activeTaskId = taskSnapshot?.level?.questProgress?.activeQuest?.taskId;
    const activeTask = activeTaskId
      ? tasks.find((task) => task.taskId === activeTaskId)
      : tasks.find((task) => !task.completed);

    return activeTask ? [activeTask] : [];
  }

  getFirstCompletedTaskId(displayTasks) {
    const hasIncompleteTasks = displayTasks.some((task) => !task.completed);

    if (!hasIncompleteTasks) {
      return null;
    }

    return displayTasks.find((task) => task.completed)?.taskId ?? null;
  }

  getTaskPriorityMap(taskSnapshot = this.currentSnapshot?.tasks) {
    const key = this.getTaskPriorityKey(taskSnapshot);
    const order = key ? this.taskPriorityByLevel.get(key) : null;

    return new Map((order ?? []).map((taskId, index) => [taskId, index]));
  }

  getTaskPriorityKey(taskSnapshot = this.currentSnapshot?.tasks) {
    const targetLevel = getLevelRequirementTargetLevel(taskSnapshot);

    if (Number.isInteger(targetLevel)) {
      return `level:${targetLevel}`;
    }

    const level = Number(taskSnapshot?.level?.level ?? taskSnapshot?.currentLevel);

    return Number.isInteger(level) ? `level:${level + 1}` : null;
  }

  sortTasksByPriority(tasks, priority) {
    return tasks
      .map((task, index) => ({
        task,
        index,
        priority: priority.has(task.taskId)
          ? priority.get(task.taskId)
          : Number.MAX_SAFE_INTEGER,
      }))
      .sort((left, right) => {
        if (left.priority !== right.priority) {
          return left.priority - right.priority;
        }

        return left.index - right.index;
      })
      .map((entry) => entry.task);
  }

  updateToggleNotification() {
    if (!this.canToggleTasks) {
      setNotificationBadge(this.refs.toggleButton, false);
      return;
    }

    setNotificationBadge(
      this.refs.toggleButton,
      !this.expanded &&
        (this.canAffordLevelCompletion() ||
          [...this.rowsByTaskId.keys()].some((taskId) => {
            const task = this.currentTasksById.get(taskId);
            return task?.canFill;
          })),
    );
  }

  renderSummaryTask(task, completedAllLevels) {
    if (!this.refs.summaryTask) {
      return;
    }

    if (!task) {
      this.setHidden(this.refs.summaryTask.root, true);
      this.setAttribute(
        this.refs.summary,
        'aria-label',
        completedAllLevels
          ? `all ${this.currentRequirementsLabel} met`
          : `no ${this.currentRequirementsLabel}`,
      );
      return;
    }

    this.setHidden(this.refs.summaryTask.root, false);
    this.setAttribute(
      this.refs.summary,
      'aria-label',
      `${this.getTaskDisplayLabel(task)} required for ${this.getRequirementTargetText()}`,
    );
    this.renderTaskRow(this.refs.summaryTask, task);
  }

  renderNextLine(taskSnapshot, displayTasks = this.currentDisplayTasks) {
    const text = this.getNextLineText(taskSnapshot, displayTasks);
    this.setHidden(this.refs.nextLine, !text);
    this.setText(this.refs.nextLine, text ? `next: ${text}` : '');
  }

  getNextLineText(taskSnapshot, displayTasks = this.currentDisplayTasks) {
    const task = displayTasks.find((candidate) => candidate && !candidate.completed);

    if (task) {
      return this.getNextTaskActionText(task);
    }

    if (taskSnapshot?.completedAllLevels) {
      return 'done';
    }

    if (this.shouldShowLevelComplete()) {
      if (this.canAffordLevelCompletion()) {
        return 'level up';
      }

      const missingCoin = Math.max(
        0,
        Math.ceil((this.currentLevelCompletion?.costCoin ?? 0) - this.currentCoin),
      );
      return missingCoin > 0
        ? `earn ${formatCoinPriceText(missingCoin)}`
        : 'level up';
    }

    return '';
  }

  getNextTaskActionText(task) {
    const targetLabel = this.getTaskTargetLabel(task);
    const remainingQuantity = Math.max(
      0,
      Math.ceil(Number(task.remainingQuantity ?? task.requiredQuantity) || 0),
    );

    if (task.type === taskRequirementTypes.RESEARCH) {
      return `research ${targetLabel}`;
    }

    if (task.type === taskRequirementTypes.TURN_IN) {
      return `${getTaskRequirementVerb(task.type)} ${formatRequirementQuantity(
        remainingQuantity,
        targetLabel,
      )}`;
    }

    return `${getTaskRequirementVerb(task.type)} ${formatRequirementQuantity(
      remainingQuantity,
      targetLabel,
    )}`;
  }

  getCurrentRequirementRowForItemTypeIds(itemTypeIds) {
    const currentTask = this.getCurrentRequirementTask();

    if (!currentTask || !itemTypeIds?.has?.(currentTask.itemTypeId)) {
      return null;
    }

    if (!this.refs.summaryTask?.root || this.refs.summaryTask.root.hidden) {
      return null;
    }

    return this.refs.summaryTask.root;
  }

  getCurrentRequirementTask() {
    return (
      this.currentDisplayTasks.find(
        (task) =>
          task &&
          !task.completed &&
          !task.maxed &&
          Number(task.remainingQuantity) > 0,
      ) ?? null
    );
  }

  ensureRows(tasks) {
    const taskIds = tasks.map((task) => task.taskId);
    const existingTaskIds = [...this.rowsByTaskId.keys()];

    if (
      taskIds.length === existingTaskIds.length &&
      taskIds.every((taskId, index) => taskId === existingTaskIds[index])
    ) {
      return null;
    }

    const shouldAnimate = this.shouldAnimateRows();
    const firstRects = shouldAnimate ? this.getCurrentTaskRowRects(taskIds) : null;

    const nextRowsByTaskId = new Map();
    const orderedRoots = [];

    for (const task of tasks) {
      const row = this.rowsByTaskId.get(task.taskId) ?? this.createTaskRow();
      nextRowsByTaskId.set(task.taskId, row);
      orderedRoots.push(row.root);
    }

    for (const [taskId, row] of this.rowsByTaskId.entries()) {
      if (!nextRowsByTaskId.has(taskId)) {
        this.cancelRowAnimation(taskId);
        row.root.remove();
      }
    }

    this.rowsByTaskId = nextRowsByTaskId;
    this.refs.list.replaceChildren(...orderedRoots);

    return shouldAnimate ? firstRects : null;
  }

  createTaskRow() {
    const root = document.createElement('div');
    root.className = 'workshop-page__task';
    root.addEventListener('pointerdown', (event) =>
      this.onTaskDragPointerDown(event, root),
    );
    root.addEventListener('keydown', (event) => this.onTaskDragKeydown(event, root));

    const row = document.createElement('div');
    row.className = 'workshop-page__task-row';

    const label = document.createElement('span');
    label.className = 'workshop-page__task-label';

    const quantity = document.createElement('span');
    quantity.className = 'workshop-page__task-quantity';

    const button = document.createElement('button');
    button.className = 'style-button workshop-page__task-button';
    button.type = 'button';
    button.addEventListener('click', () => this.onTaskButton(button.dataset.taskId));

    const progress = document.createElement('div');
    progress.className = 'style-progress workshop-page__task-progress';
    progress.setAttribute('aria-hidden', 'true');

    const fill = document.createElement('span');
    fill.className = 'style-progress__fill workshop-page__task-progress-fill';
    progress.append(fill);

    row.append(label, quantity, button);
    root.append(row, progress);

    return {
      root,
      label,
      quantity,
      button,
      fill,
    };
  }

  createLevelRewardsPanel() {
    const root = document.createElement('div');
    root.className = 'workshop-page__level-rewards';
    root.id = 'workshop-level-rewards';

    const title = document.createElement('div');
    title.className = 'workshop-page__level-payoff-title';

    const rows = document.createElement('div');
    rows.className = 'workshop-page__level-payoff-rows';

    root.append(title, rows);

    return {
      root,
      title,
      rows,
    };
  }

  createLevelCompleteRow() {
    const root = document.createElement('div');
    root.className = 'workshop-page__level-complete';
    root.hidden = true;
    root.dataset.tutorialId = 'workshop:levelUp';

    const action = document.createElement('div');
    action.className = 'workshop-page__level-complete-action';

    const label = document.createElement('span');
    label.className = 'workshop-page__level-complete-label';
    label.textContent = 'level up';

    const cost = document.createElement('span');
    cost.className = 'workshop-page__level-complete-cost';
    setResourceColor(cost, 'coin');

    const button = document.createElement('button');
    button.className = 'style-button workshop-page__level-complete-button';
    button.type = 'button';
    button.append(label, cost);
    button.addEventListener('click', () => this.onLevelCompleteButton());

    action.append(button);
    root.append(action);

    return {
      root,
      action,
      label,
      cost,
      button,
    };
  }

  createInfoPopup() {
    const popup = document.createElement('section');
    popup.className = 'workshop-page__tasks-info-popup';
    popup.addEventListener('click', this.handleInfoPopupClick);

    const dialog = document.createElement('section');
    dialog.className = 'workshop-page__tasks-info-dialog style-dialog';
    dialog.setAttribute('aria-label', `${this.currentRequirementsLabel} information`);
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = this.currentRequirementsLabel;

    const body = document.createElement('p');
    body.className = 'workshop-page__tasks-info-copy';
    body.textContent = this.getTasksHelperText();

    const closeButton = document.createElement('button');
    closeButton.className = 'style-button workshop-page__tasks-info-close';
    closeButton.type = 'button';
    closeButton.textContent = 'close';
    closeButton.addEventListener('click', () => this.hideInfo());

    dialog.append(title, closeButton, body);
    popup.append(dialog);
    popup.hidden = true;
    popup.setAttribute('aria-hidden', 'true');

    this.refs.infoDialog = dialog;
    this.refs.infoTitle = title;
    this.refs.infoBody = body;
    return popup;
  }

  showInfo() {
    this.previousFocus = document.activeElement;
    this.infoVisible = true;
    this.applyInfoVisibility();
    this.refs.infoDialog?.focus();
  }

  hideInfo() {
    const wasVisible = this.infoVisible;
    this.infoVisible = false;
    this.applyInfoVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
  }

  applyInfoVisibility() {
    if (!this.refs.infoPopup) {
      return;
    }

    this.refs.infoPopup.hidden = !this.infoVisible;
    this.refs.infoPopup.setAttribute('aria-hidden', this.infoVisible ? 'false' : 'true');
    this.refs.title?.setAttribute('aria-expanded', this.infoVisible ? 'true' : 'false');
  }

  setRequirementContext(taskSnapshot) {
    const requirementTargetLevel = getLevelRequirementTargetLevel(taskSnapshot);
    const hasActiveRequest = (taskSnapshot?.level?.tasks ?? []).some(
      (task) => !task.completed,
    );
    const requirementsLabel =
      !hasActiveRequest && taskSnapshot?.level?.completion?.canComplete
        ? LEVEL_UP_LABEL
        : ELARA_REQUEST_LABEL;

    if (this.currentRequirementTargetLevel !== requirementTargetLevel) {
      this.rewardsHidden = false;
      if (this.currentRequirementTargetLevel !== null) {
        this.cancelExpandedContentMotion();
        this.expanded = false;
        this.pinned = false;
      }
    }

    this.currentRequirementsLabel = requirementsLabel;
    this.currentRequirementTargetLevel = requirementTargetLevel;
    this.setAttribute(this.root, 'aria-label', requirementsLabel);
    this.setText(this.refs.title, requirementsLabel);
    this.setAttribute(this.refs.title, 'aria-label', `show ${requirementsLabel} info`);
    this.setAttribute(this.refs.infoDialog, 'aria-label', `${requirementsLabel} information`);
    this.setText(this.refs.infoTitle, requirementsLabel);
    this.setText(this.refs.infoBody, this.getTasksHelperText(taskSnapshot));
  }

  getTasksHelperText(taskSnapshot = this.currentSnapshot?.tasks) {
    if (this.currentRequirementsLabel === LEVEL_UP_LABEL) {
      const costCoin = Math.max(
        0,
        Math.floor(Number(taskSnapshot?.level?.completion?.costCoin) || 0),
      );
      const target = Number.isInteger(this.currentRequirementTargetLevel)
        ? `level ${this.currentRequirementTargetLevel}`
        : 'the next level';

      return `spend ${formatCoinPriceText(costCoin)} to reach ${target}.`;
    }

    if (Number.isInteger(this.currentRequirementTargetLevel)) {
      return `complete elara's requests one at a time to reach level ${this.currentRequirementTargetLevel}. each request fills one level segment. turn-in requests consume items.`;
    }

    return "complete elara's requests one at a time. each request fills one level segment. turn-in requests consume items.";
  }

  getRequirementTargetText() {
    return Number.isInteger(this.currentRequirementTargetLevel)
      ? `level ${this.currentRequirementTargetLevel}`
      : 'the target level';
  }

  onTaskButton(taskId) {
    const task = this.currentTasksById.get(taskId);

    if (!task) {
      return;
    }

    this.gameplayFacade.fillTask(taskId);

    this.render(this.gameplayFacade.getSnapshot());
  }

  onLevelCompleteButton() {
    this.gameplayFacade.completeTaskLevel?.();
    this.render(this.gameplayFacade.getSnapshot());
  }

  renderTask(task) {
    const row = this.rowsByTaskId.get(task.taskId);

    if (!row) {
      return;
    }

    this.renderTaskRow(row, task, {
      isFirstCompleted: task.taskId === this.currentFirstCompletedTaskId,
    });
  }

  renderTaskRow(row, task, { isFirstCompleted = false } = {}) {
    const quantityText = `${task.progressQuantity}/${task.requiredQuantity}`;
    const buttonText = this.getButtonText(task);
    const disabled = !task.canFill;

    row.root.classList.toggle('is-completed', task.completed);
    row.root.classList.toggle('is-maxed', task.maxed);
    row.root.classList.toggle('is-first-completed', isFirstCompleted);
    this.setDataset(row.root, 'taskId', task.taskId);
    this.setAttribute(
      row.root,
      'aria-label',
      this.getTaskRowAriaLabel(task, this.canReorderTask(task.taskId)),
    );
    this.setDataset(row.button, 'taskId', task.taskId);
    this.setDataset(row.button, 'tutorialId', `task:${task.taskId}`);
    this.setText(row.label, this.getTaskDisplayLabel(task));
    setItemIconLabel(row.label, task.itemKind, task.itemKey);
    this.setText(row.quantity, quantityText);
    this.setText(row.button, buttonText);
    this.setHidden(row.button, task.autoProgress === true);
    this.setDisabled(row.button, disabled);
    this.setAttribute(row.button, 'aria-disabled', disabled ? 'true' : 'false');
    this.setAttribute(row.button, 'aria-label', this.getTaskButtonAriaLabel(task, buttonText));
    setNotificationBadge(row.button, !disabled);
    this.setStyleWidth(row.fill, `${Math.max(0, Math.min(1, task.progress)) * 100}%`);
  }

  renderLevelRewards() {
    const row = this.refs.levelRewards;

    if (!row) {
      return;
    }

    const show = this.shouldShowLevelRewards();
    this.setHidden(row.root, !show);

    if (!show) {
      return;
    }

    const currentLevel = this.getLevelRewardsCurrentLevel();
    const nextLevel = this.getLevelRewardsTargetLevel();
    const payoffRows = this.getLevelPayoffRows(currentLevel, nextLevel);
    const payoffPreview = this.getLevelPayoffPreview(nextLevel, payoffRows);

    this.setText(row.title, 'rewards');
    this.renderLevelPayoffRows(payoffRows, row.rows);
    this.setAttribute(row.root, 'aria-label', payoffPreview);
  }

  getLevelRewardsCurrentLevel() {
    return this.currentLevelCompletion?.level ?? this.currentSnapshot?.tasks?.level?.level;
  }

  getLevelRewardsTargetLevel() {
    const currentLevel = this.getLevelRewardsCurrentLevel();
    return Number.isInteger(currentLevel) ? currentLevel + 1 : null;
  }

  shouldOfferLevelRewards() {
    const nextLevel = this.getLevelRewardsTargetLevel();
    const maxLevel = Math.floor(
      Number(
        this.currentSnapshot?.tasks?.maxLevel ?? this.currentSnapshot?.playerLevel?.maxLevel,
      ),
    );
    const insideLevelRange = !Number.isInteger(maxLevel) || nextLevel <= maxLevel;
    return Boolean(
      Number.isInteger(nextLevel) &&
      insideLevelRange &&
      this.currentSnapshot?.tasks?.completedAllLevels !== true &&
      this.currentLevelCompletion?.completedAllLevels !== true
    );
  }

  shouldShowLevelRewards() {
    return false;
  }

  hasLevelRewardsLayout() {
    return Boolean(
      this.canToggleTasks
        ? this.isExpandedContentVisible()
        : this.shouldShowLevelComplete(),
    );
  }

  canToggleLevelRewards() {
    const currentLevel = this.getLevelRewardsCurrentLevel();
    return Number.isInteger(currentLevel) ? currentLevel > 1 : true;
  }

  renderLevelComplete() {
    const row = this.refs.levelComplete;

    if (!row) {
      return;
    }

    const show =
      this.shouldShowLevelComplete() &&
      (!this.canToggleTasks || this.isExpandedContentVisible());
    this.setHidden(row.root, !show);

    if (!show) {
      return;
    }

    const costText = formatLevelCompletionCostText(this.currentLevelCompletion.costCoin);
    const disabled = !this.canAffordLevelCompletion();
    const nextLevel = this.currentLevelCompletion.level + 1;
    const payoffRows = this.getLevelPayoffRows(this.currentLevelCompletion.level, nextLevel);
    const payoffPreview = this.getLevelPayoffPreview(nextLevel, payoffRows);

    this.setText(row.label, `reach level ${nextLevel}`);
    setResourceIconText(row.cost, costText);
    this.setDisabled(row.button, disabled);
    this.setAttribute(row.button, 'aria-disabled', disabled ? 'true' : 'false');
    this.setAttribute(
      row.button,
      'aria-label',
      `level up to ${nextLevel} for ${costText}. ${payoffPreview}`,
    );
    this.setAttribute(
      row.root,
      'aria-label',
      `level up to ${nextLevel} for ${costText}. ${payoffPreview}`,
    );
    setNotificationBadge(row.button, !disabled);
  }

  shouldShowLevelComplete() {
    return Boolean(this.currentLevelCompletion?.canComplete);
  }

  canAffordLevelCompletion() {
    return (
      this.shouldShowLevelComplete() &&
      this.currentCoin >= (this.currentLevelCompletion?.costCoin ?? Infinity)
    );
  }

  getLevelPayoffRows(currentLevel, nextLevel) {
    return getLevelPayoffRows(this.currentSnapshot, {
      fromLevel: currentLevel,
      toLevel: nextLevel,
    });
  }

  getLevelPayoffPreview(level, rows = []) {
    const details = rows
      .map((row) => row?.notice)
      .filter((notice) => typeof notice === 'string' && notice.length > 0)
      .join(', ');

    return details ? `level ${level} rewards: ${details}` : `level ${level} rewards`;
  }

  renderLevelPayoffRows(rows, container = this.refs.levelRewards?.rows) {
    if (!container) {
      return;
    }

    const displayRows =
      rows.length > 0
        ? rows
        : [
            {
              label: 'rewards',
              value: 'none',
            },
          ];
    const signature = JSON.stringify(displayRows);

    if (container.dataset.signature === signature) {
      return;
    }

    container.dataset.signature = signature;
    container.replaceChildren(
      ...displayRows.map((row) => {
        const valueLines = Array.isArray(row.valueLines) ? row.valueLines : [];
        const valueLinePageIds = row.valueLinePageIds ?? {};
        const root = document.createElement('div');
        root.className = 'workshop-page__level-payoff-row';
        root.classList.toggle('workshop-page__level-payoff-row--list', valueLines.length > 0);
        root.setAttribute(
          'aria-label',
          `${row.label}: ${valueLines.length > 0 ? valueLines.join(', ') : row.value}`,
        );

        const label = document.createElement('span');
        label.className = 'workshop-page__level-payoff-label';
        label.textContent = row.label;

        const value = document.createElement('span');
        value.className = 'workshop-page__level-payoff-value';

        if (valueLines.length > 0) {
          value.classList.add('workshop-page__level-payoff-value--list');
          value.replaceChildren(
            ...this.createLevelPayoffValueNodes(valueLines, valueLinePageIds),
          );
        } else {
          setResourceIconText(value, row.value);
        }

        root.append(label, value);
        return root;
      }),
    );
  }

  createLevelPayoffValueNodes(valueLines, valueLinePageIds = {}) {
    return valueLines.flatMap((line, index) => {
      const nodes = [];

      if (index > 0) {
        const separator = document.createElement('span');
        separator.hidden = true;
        separator.textContent = ', ';
        nodes.push(separator);
      }

      nodes.push(this.createLevelPayoffValueLine(line, valueLinePageIds[line]));
      return nodes;
    });
  }

  createLevelPayoffValueLine(line, pageId) {
    const item = document.createElement('span');
    item.className = 'workshop-page__level-payoff-value-line';

    const icon = createPageIcon(pageId, 'workshop-page__level-payoff-page-icon');
    const text = document.createElement('span');
    text.className = 'workshop-page__level-payoff-value-line-text';
    text.textContent = line;

    item.replaceChildren(...(icon ? [icon, text] : [text]));
    return item;
  }

  getButtonText(task) {
    if (task.completed) {
      return 'done';
    }

    if (task.autoProgress) {
      return '';
    }

    return TURN_IN_TEXT;
  }

  getTaskButtonAriaLabel(task, buttonText) {
    if (task.completed) {
      return `${this.getTaskDisplayLabel(task)} requirement done for ${this.getRequirementTargetText()}`;
    }

    if (task.canFill) {
      return `turn in ${this.getTaskTargetLabel(task)} for ${this.getRequirementTargetText()}. turned-in items are consumed`;
    }

    return `${buttonText} ${this.getTaskDisplayLabel(task)} requirement for ${this.getRequirementTargetText()}`;
  }

  getTaskRowAriaLabel(task, canReorder = false) {
    if (!task) {
      return this.currentRequirementsLabel;
    }

    if (canReorder) {
      return `move ${this.getTaskDisplayLabel(task)} requirement priority with arrow keys or drag`;
    }

    if (task.completed) {
      return `${this.getTaskDisplayLabel(task)} requirement done for ${this.getRequirementTargetText()}`;
    }

    return `${this.getTaskDisplayLabel(task)} required for ${this.getRequirementTargetText()}`;
  }

  getTaskDisplayLabel(task) {
    return task?.requirementLabel || task?.itemLabel || '';
  }

  getTaskTargetLabel(task) {
    return task?.targetLabel || task?.itemLabel || '';
  }

  onTaskDragPointerDown(event, rowRoot) {
    if ((event.button ?? 0) !== 0 || !this.canReorderVisibleTasks()) {
      return;
    }

    if (event.target?.closest?.('.workshop-page__task-button')) {
      return;
    }

    const root = rowRoot?.closest?.('.workshop-page__task');
    const taskId = root?.dataset.taskId;

    if (!taskId || !root || !this.canReorderTask(taskId)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const rect = root.getBoundingClientRect();
    const taskIds = this.currentDisplayTasks.map((task) => task.taskId);
    const initialIndex = taskIds.indexOf(taskId);

    if (initialIndex < 0) {
      return;
    }

    this.dragState = {
      taskId,
      pointerId: event.pointerId,
      lastY: event.clientY,
      grabOffsetY: event.clientY - rect.top,
      dragHeight: rect.height,
      initialIndex,
      initialTop: rect.top,
      initialRects: this.getInitialTaskDragRects(),
      taskIds,
      targetIndex: initialIndex,
      root,
      dragNode: this.liftTaskDragNode(root, rect),
    };
    this.prepareTaskDragSiblingTransitions(this.dragState);
    this.startTaskDragListeners();
    this.syncTaskDragPreview();
  }

  onTaskDragDocumentPointerMove(event) {
    if (!this.isActiveTaskDragPointer(event)) {
      return;
    }

    event.preventDefault();
    this.dragState.lastY = event.clientY;
    this.updateTaskDragGhost(event.clientY);
    this.placeTaskDragPreview(this.getTaskDropIndex(this.dragState.taskId, event.clientY));
  }

  onTaskDragDocumentPointerUp(event) {
    if (!this.isActiveTaskDragPointer(event)) {
      return;
    }

    event.preventDefault();
    this.finishTaskDrag(true, event.clientY);
  }

  onTaskDragDocumentPointerCancel(event) {
    if (!this.isActiveTaskDragPointer(event)) {
      return;
    }

    event.preventDefault();
    this.finishTaskDrag(false);
  }

  onTaskDragKeydown(event, rowRoot) {
    if (!this.canReorderVisibleTasks()) {
      return;
    }

    const taskId = rowRoot?.dataset.taskId;

    if (!taskId || !this.canReorderTask(taskId)) {
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveTaskByOffset(taskId, -1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveTaskByOffset(taskId, 1);
    }
  }

  isActiveTaskDragPointer(event) {
    return Boolean(
      this.dragState &&
        ((event.pointerId === undefined && this.dragState.pointerId === undefined) ||
          event.pointerId === this.dragState.pointerId),
    );
  }

  finishTaskDrag(commit, clientY = this.dragState?.lastY) {
    const dragState = this.dragState;

    if (!dragState) {
      return;
    }

    const taskId = dragState.taskId;
    const settleFromRect = this.getTaskDragVisualRect(dragState);
    const targetIndex = commit
      ? this.getTaskDropIndex(taskId, clientY)
      : dragState.initialIndex;
    dragState.targetIndex = targetIndex;
    this.dragState = null;
    this.stopTaskDragListeners();

    if (commit) {
      const moved = this.moveTaskToIndex(taskId, targetIndex, {
        render: false,
      });

      this.clearTaskDragPreview(dragState, { restoreFlow: false });

      if (moved) {
        this.skipNextRowAnimationTaskId = taskId;
        this.skipNextRowAnimationRoot = dragState.dragNode ?? dragState.root;
        this.render(this.gameplayFacade.getSnapshot());
      }

      this.animateDroppedTaskFromRect(taskId, settleFromRect);
    } else {
      this.clearTaskDragPreview(dragState);
      this.render(this.gameplayFacade.getSnapshot());
      this.animateDroppedTaskFromRect(taskId, settleFromRect);
    }
  }

  getTaskDropIndex(taskId, clientY) {
    const entries = this.getTaskDropEntries(taskId);
    const dragCenterY = this.getTaskDragCenterY(clientY);
    const initialIndex = Number.isInteger(this.dragState?.initialIndex)
      ? this.dragState.initialIndex
      : this.currentDisplayTasks.findIndex((task) => task.taskId === taskId);
    let targetIndex = 0;

    for (const entry of entries) {
      const thresholdY = this.getTaskDropThresholdY(entry, initialIndex);

      if (dragCenterY > thresholdY) {
        targetIndex += 1;
      }
    }

    return this.clampTaskTargetIndex(taskId, targetIndex);
  }

  getTaskDragCenterY(clientY) {
    const pointerY = Number(clientY);

    if (!Number.isFinite(pointerY)) {
      return pointerY;
    }

    const offsetY = Number.isFinite(this.dragState?.grabOffsetY)
      ? this.dragState.grabOffsetY
      : 0;
    const dragHeight = Number.isFinite(this.dragState?.dragHeight)
      ? this.dragState.dragHeight
      : 0;

    return pointerY - offsetY + dragHeight / 2;
  }

  getTaskDropEntries(taskId) {
    const taskIds =
      this.dragState?.taskIds ?? this.currentDisplayTasks.map((task) => task.taskId);
    const tasksById = new Map(this.currentDisplayTasks.map((task) => [task.taskId, task]));
    const draggedTask = tasksById.get(taskId);

    if (!draggedTask || draggedTask.completed) {
      return [];
    }

    return taskIds
      .map((candidateTaskId, index) => ({
        taskId: candidateTaskId,
        task: tasksById.get(candidateTaskId),
        index,
      }))
      .filter(
        (entry) =>
          entry.taskId !== taskId &&
          entry.task &&
          entry.task.completed === draggedTask.completed,
      )
      .map((entry) => {
        const row = this.getVisibleTaskRow(entry.taskId);
        const rect =
          this.dragState?.initialRects?.get(entry.taskId) ??
          row?.root?.getBoundingClientRect();

        if (!rect || (!rect.width && !rect.height)) {
          return null;
        }

        return {
          taskId: entry.taskId,
          index: entry.index,
          rect,
        };
      })
      .filter(Boolean)
      .sort((left, right) => left.rect.top - right.rect.top);
  }

  getTaskDropThresholdY(entry, initialIndex) {
    const rect = entry.rect;
    const centerY = rect.top + rect.height / 2;
    const earlyOffset = Math.max(0, rect.height * TASK_REORDER_EARLY_THRESHOLD_RATIO);

    if (Number.isInteger(initialIndex)) {
      if (entry.index < initialIndex) {
        return centerY + earlyOffset;
      }

      if (entry.index > initialIndex) {
        return centerY - earlyOffset;
      }
    }

    return centerY;
  }

  moveTaskByOffset(taskId, offset) {
    const currentIndex = this.currentDisplayTasks.findIndex((task) => task.taskId === taskId);

    if (currentIndex < 0 || this.currentDisplayTasks[currentIndex]?.completed) {
      return;
    }

    this.moveTaskToIndex(taskId, currentIndex + offset);
  }

  moveTaskToIndex(taskId, targetIndex, { render = true } = {}) {
    const currentIndex = this.currentDisplayTasks.findIndex((task) => task.taskId === taskId);

    if (currentIndex < 0 || this.currentDisplayTasks[currentIndex]?.completed) {
      return false;
    }

    const clampedTargetIndex = this.clampTaskTargetIndex(taskId, targetIndex);

    if (clampedTargetIndex === currentIndex) {
      return false;
    }

    const nextTasks = [...this.currentDisplayTasks];
    const [movedTask] = nextTasks.splice(currentIndex, 1);
    nextTasks.splice(clampedTargetIndex, 0, movedTask);
    this.setTaskPriorityOrder(nextTasks);

    if (render) {
      this.render(this.gameplayFacade.getSnapshot());
    }

    return true;
  }

  clampTaskTargetIndex(taskId, targetIndex) {
    const currentIndex = this.currentDisplayTasks.findIndex((task) => task.taskId === taskId);

    if (currentIndex < 0) {
      return targetIndex;
    }

    const task = this.currentDisplayTasks[currentIndex];
    if (task.completed) {
      return currentIndex;
    }

    const groupStart = this.currentDisplayTasks.findIndex(
      (candidate) => candidate.completed === task.completed,
    );
    const groupEnd = this.getLastTaskGroupIndex(task.completed);

    return Math.max(groupStart, Math.min(groupEnd, targetIndex));
  }

  getLastTaskGroupIndex(completed) {
    for (let index = this.currentDisplayTasks.length - 1; index >= 0; index -= 1) {
      if (this.currentDisplayTasks[index]?.completed === completed) {
        return index;
      }
    }

    return -1;
  }

  setTaskPriorityOrder(tasks) {
    const key = this.getTaskPriorityKey(this.currentSnapshot?.tasks);

    if (!key) {
      return;
    }

    this.taskPriorityByLevel.set(
      key,
      tasks.map((task) => task.taskId),
    );
  }

  getVisibleTaskEntries() {
    const entries = [];

    if (
      this.refs.summaryTask?.root &&
      !this.refs.summaryTask.root.hidden &&
      (this.refs.summary?.contains(this.refs.summaryTask.root) ||
        this.refs.list?.contains(this.refs.summaryTask.root))
    ) {
      entries.push({
        taskId: this.refs.summaryTask.root.dataset.taskId,
        root: this.refs.summaryTask.root,
      });
    }

    if (this.refs.list && !this.refs.list.hidden) {
      for (const [taskId, row] of this.rowsByTaskId.entries()) {
        if (!row.root.hidden && this.refs.list.contains(row.root)) {
          entries.push({ taskId, root: row.root });
        }
      }
    }

    return entries.filter((entry) => entry.taskId);
  }

  getVisibleTaskRow(taskId) {
    if (this.refs.summaryTask?.root?.dataset.taskId === taskId) {
      return this.refs.summaryTask;
    }

    return this.rowsByTaskId.get(taskId) ?? null;
  }

  startTaskDragListeners() {
    document.addEventListener('pointermove', this.handleTaskDragDocumentMove, true);
    document.addEventListener('pointerup', this.handleTaskDragDocumentUp, true);
    document.addEventListener('pointercancel', this.handleTaskDragDocumentCancel, true);
  }

  stopTaskDragListeners() {
    document.removeEventListener('pointermove', this.handleTaskDragDocumentMove, true);
    document.removeEventListener('pointerup', this.handleTaskDragDocumentUp, true);
    document.removeEventListener('pointercancel', this.handleTaskDragDocumentCancel, true);
  }

  getInitialTaskDragRects() {
    const rects = new Map();

    for (const { taskId, root } of this.getVisibleTaskEntries()) {
      const rect = root.getBoundingClientRect();

      if (rect.width || rect.height) {
        rects.set(taskId, rect);
      }
    }

    return rects;
  }

  liftTaskDragNode(root, rect) {
    const scale = this.getTaskDragScale(root, rect);

    root.classList.add('is-drag-lifted');
    root.classList.remove('is-reordering');
    root.setAttribute('aria-hidden', 'true');
    root.style.position = 'relative';
    root.style.zIndex = '98';
    root.style.pointerEvents = 'none';
    root.style.transformOrigin = 'center center';
    root.style.transition = 'none';
    root.style.setProperty('--workshop-task-drag-scale', `${scale}`);

    for (const button of root.querySelectorAll('button')) {
      button.tabIndex = -1;
    }

    return root;
  }

  getTaskDragScale(root, rect) {
    const sourceWidth = root.offsetWidth;

    if (sourceWidth > 0 && rect.width > 0) {
      return rect.width / sourceWidth;
    }

    const sourceHeight = root.offsetHeight;

    if (sourceHeight > 0 && rect.height > 0) {
      return rect.height / sourceHeight;
    }

    return 1;
  }

  prepareTaskDragSiblingTransitions(dragState = this.dragState) {
    for (const taskId of dragState?.taskIds ?? []) {
      if (taskId === dragState.taskId) {
        continue;
      }

      const row = this.getVisibleTaskRow(taskId);

      if (!row?.root) {
        continue;
      }

      this.cancelRowAnimation(taskId);
      row.root.style.transition = this.prefersReducedMotion()
        ? 'none'
        : TASK_REORDER_TRANSITION;
    }

    this.root?.getBoundingClientRect();
  }

  syncTaskDragPreview() {
    const dragState = this.dragState;

    if (!dragState) {
      return;
    }

    const row = this.getVisibleTaskRow(dragState.taskId);

    if (!row?.root) {
      return;
    }

    if (dragState.root && dragState.root !== row.root) {
      dragState.root.classList.remove('is-dragging');
    }

    dragState.root = row.root;
    this.cancelRowAnimation(dragState.taskId);
    row.root.classList.add('is-dragging');

    if (!row.root.classList.contains('is-drag-lifted')) {
      dragState.dragNode = this.liftTaskDragNode(row.root, row.root.getBoundingClientRect());
    }

    this.root?.classList.add('is-task-dragging');
    this.placeTaskDragPreview(dragState.targetIndex);
    this.updateTaskDragGhost(dragState.lastY);
  }

  placeTaskDragPreview(targetIndex) {
    const dragState = this.dragState;

    if (!dragState || !this.refs.summary || !this.refs.list) {
      return;
    }

    const clampedTargetIndex = this.clampTaskTargetIndex(dragState.taskId, targetIndex);

    if (dragState.targetIndex === clampedTargetIndex) {
      return;
    }

    dragState.targetIndex = clampedTargetIndex;
    this.updateTaskDragSiblingTransforms(dragState);
  }

  updateTaskDragSiblingTransforms(dragState = this.dragState) {
    if (!dragState?.initialRects || !dragState.taskIds) {
      return;
    }

    const initialIndex = Number.isInteger(dragState.initialIndex)
      ? dragState.initialIndex
      : dragState.taskIds.indexOf(dragState.taskId);
    const targetIndex = Number.isInteger(dragState.targetIndex)
      ? dragState.targetIndex
      : initialIndex;

    for (let index = 0; index < dragState.taskIds.length; index += 1) {
      const taskId = dragState.taskIds[index];

      if (taskId === dragState.taskId) {
        continue;
      }

      const row = this.getVisibleTaskRow(taskId);

      if (!row?.root) {
        continue;
      }

      const fromRect = dragState.initialRects.get(taskId);
      let toRect = null;

      if (targetIndex > initialIndex && index > initialIndex && index <= targetIndex) {
        toRect = dragState.initialRects.get(dragState.taskIds[index - 1]);
      } else if (targetIndex < initialIndex && index >= targetIndex && index < initialIndex) {
        toRect = dragState.initialRects.get(dragState.taskIds[index + 1]);
      }

      this.setTaskDragSiblingTransform(taskId, row.root, fromRect, toRect);
    }
  }

  setTaskDragSiblingTransform(taskId, root, fromRect, toRect) {
    if (!fromRect || !toRect) {
      this.resetTaskDragSiblingTransform(root);
      return;
    }

    const deltaY = toRect.top - fromRect.top;

    if (Math.abs(deltaY) < 0.5) {
      this.resetTaskDragSiblingTransform(root);
      return;
    }

    const scale = this.getTaskDragScale(root, fromRect);
    const dragScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

    this.cancelRowAnimation(taskId);
    root.classList.add('is-reordering');
    root.style.transition =
      root.style.transition ||
      (this.prefersReducedMotion() ? 'none' : TASK_REORDER_TRANSITION);
    root.style.transform = `translate3d(0, ${deltaY / dragScale}px, 0)`;
    root.style.opacity = '1';
  }

  clearTaskDragSiblingTransforms(dragState = this.dragState) {
    for (const taskId of dragState?.taskIds ?? []) {
      if (taskId === dragState.taskId) {
        continue;
      }

      const row = this.getVisibleTaskRow(taskId);

      if (row?.root) {
        this.clearTaskDragSiblingTransform(row.root);
      }
    }
  }

  resetTaskDragSiblingTransform(root) {
    root.classList.remove('is-reordering');
    root.style.transform = '';
    root.style.opacity = '';
  }

  clearTaskDragSiblingTransform(root) {
    root.classList.remove('is-reordering');
    root.style.transition = '';
    root.style.transform = '';
    root.style.opacity = '';
  }

  updateTaskDragGhost(clientY = this.dragState?.lastY) {
    const dragState = this.dragState;

    if (!dragState?.dragNode || !Number.isFinite(clientY)) {
      return;
    }

    const offsetY = Number.isFinite(dragState.grabOffsetY) ? dragState.grabOffsetY : 0;
    const scale = Number(dragState.dragNode.style.getPropertyValue('--workshop-task-drag-scale'));
    const dragScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const initialTop = Number.isFinite(dragState.initialTop) ? dragState.initialTop : 0;
    dragState.dragNode.style.transform = `translate3d(0, ${
      (clientY - offsetY - initialTop) / dragScale
    }px, 0)`;
  }

  restoreTaskDragFlow() {
    if (this.refs.summary && this.refs.summaryTask?.root) {
      this.refs.summary.replaceChildren(this.refs.summaryTask.root);
    }

    if (this.refs.list) {
      const listRoots = this.currentDisplayTasks
        .slice(1)
        .map((task) => this.rowsByTaskId.get(task.taskId)?.root)
        .filter(Boolean);
      this.refs.list.replaceChildren(...listRoots);
    }
  }

  clearTaskDragPreview(dragState = this.dragState, { restoreFlow = true } = {}) {
    if (!dragState) {
      return;
    }

    dragState.root?.classList.remove('is-dragging');
    this.clearTaskDragSiblingTransforms(dragState);
    this.resetTaskDragNode(dragState);

    this.root?.classList.remove('is-task-dragging');

    if (restoreFlow) {
      this.restoreTaskDragFlow(dragState);
    }
  }

  resetTaskDragNode(dragState = this.dragState) {
    const root = dragState?.dragNode ?? dragState?.root;

    if (!root) {
      return;
    }

    root.classList.remove('is-dragging', 'is-drag-lifted');
    root.removeAttribute('aria-hidden');
    root.style.position = '';
    root.style.left = '';
    root.style.top = '';
    root.style.width = '';
    root.style.height = '';
    root.style.zIndex = '';
    root.style.pointerEvents = '';
    root.style.transformOrigin = '';
    root.style.transform = '';
    root.style.removeProperty('--workshop-task-drag-scale');

    for (const button of root.querySelectorAll('button')) {
      button.tabIndex = 0;
    }
  }

  ensureSummaryTaskInFlow() {
    if (
      this.refs.summary &&
      this.refs.summaryTask?.root &&
      !this.refs.summary.contains(this.refs.summaryTask.root)
    ) {
      this.refs.summary.replaceChildren(this.refs.summaryTask.root);
    }
  }

  canReorderVisibleTasks() {
    const incompleteTaskCount = this.currentDisplayTasks.filter((task) => !task.completed).length;

    return Boolean(
      incompleteTaskCount > 1 &&
        (!this.canToggleTasks || this.isTaskListExpanded()),
    );
  }

  canReorderTask(taskId) {
    const task = this.currentDisplayTasks.find((candidate) => candidate.taskId === taskId);

    return Boolean(task && !task.completed && this.canReorderVisibleTasks());
  }

  syncTaskDragState() {
    const canReorder = this.canReorderVisibleTasks();
    const rows = [this.refs.summaryTask, ...this.rowsByTaskId.values()].filter(Boolean);

    this.root?.classList.toggle('has-task-drag', canReorder);

    for (const row of rows) {
      const task = this.currentTasksById.get(row.root.dataset.taskId);
      const canReorderRow = this.canReorderTask(row.root.dataset.taskId);
      row.root.classList.toggle('is-drag-disabled', !canReorderRow);
      row.root.classList.toggle('is-draggable', canReorderRow);
      this.setTabIndex(row.root, canReorderRow ? 0 : -1);
      this.setAttribute(row.root, 'aria-disabled', canReorderRow ? 'false' : 'true');
      this.setAttribute(row.root, 'aria-label', this.getTaskRowAriaLabel(task, canReorderRow));
    }
  }

  setText(element, text) {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }

  setHidden(element, hidden) {
    if (element && element.hidden !== hidden) {
      element.hidden = hidden;
    }
  }

  setDisabled(element, disabled) {
    if (element && element.disabled !== disabled) {
      element.disabled = disabled;
    }
  }

  setTabIndex(element, tabIndex) {
    if (element && element.tabIndex !== tabIndex) {
      element.tabIndex = tabIndex;
    }
  }

  setDataset(element, key, value) {
    const nextValue = String(value);

    if (element?.dataset?.[key] !== nextValue) {
      element.dataset[key] = nextValue;
    }
  }

  setAttribute(element, name, value) {
    if (element && element.getAttribute(name) !== value) {
      element.setAttribute(name, value);
    }
  }

  removeAttribute(element, name) {
    if (element?.hasAttribute?.(name)) {
      element.removeAttribute(name);
    }
  }

  setStyleWidth(element, value) {
    if (element?.style?.width !== value) {
      element.style.width = value;
    }
  }

  setCanToggleTasks(canToggleTasks, { preservePinned = false } = {}) {
    this.canToggleTasks = Boolean(canToggleTasks);

    if (!this.refs.toggleButton) {
      return;
    }

    if (!this.canToggleTasks && !preservePinned) {
      this.pinned = false;
    }

    this.setHidden(this.refs.toggleButton, !this.canToggleTasks);
    this.setDisabled(this.refs.toggleButton, !this.canToggleTasks);
    this.setHidden(this.refs.pinButton, !this.canToggleTasks);
    this.setDisabled(this.refs.pinButton, !this.canToggleTasks);
    this.root?.classList.toggle('has-task-toggle', this.canToggleTasks);

    if (this.canToggleTasks) {
      this.setDataset(this.refs.toggleButton, 'tutorialId', 'workshop:tasks');
      this.setDataset(this.refs.pinButton, 'tutorialId', 'workshop:tasksPin');
      this.setAttribute(this.refs.toggleButton, 'aria-controls', 'workshop-task-list');
    } else {
      delete this.refs.toggleButton.dataset.tutorialId;
      delete this.refs.pinButton.dataset.tutorialId;
      this.removeAttribute(this.refs.toggleButton, 'aria-controls');
    }
  }

  isTaskListExpanded() {
    return Boolean(this.canToggleTasks && this.expanded);
  }

  isExpandedContentVisible() {
    return Boolean(
      this.isTaskListExpanded() ||
        this.expandingExpandedContent ||
        this.collapsingExpandedContent,
    );
  }

  syncExpansionState() {
    const listExpanded = this.isTaskListExpanded();
    const expandedContentVisible = this.isExpandedContentVisible();
    const levelCompleteExpanded =
      this.shouldShowLevelComplete() && (!this.canToggleTasks || listExpanded);
    const hasExpandedContent = listExpanded || levelCompleteExpanded;

    this.root?.classList.toggle('is-expanded', hasExpandedContent);
    this.root?.classList.toggle('is-collapsed', !hasExpandedContent);
    this.root?.classList.toggle('is-expanding', this.expandingExpandedContent);
    this.root?.classList.toggle('is-collapsing', this.collapsingExpandedContent);
    this.root?.classList.toggle('is-pinned', this.pinned);
    this.refs.slot?.classList.toggle('is-pinned', this.pinned);
    this.setAttribute(this.refs.pinButton, 'aria-pressed', this.pinned ? 'true' : 'false');
    this.setAttribute(
      this.refs.pinButton,
      'aria-label',
      this.pinned
        ? `unpin ${this.currentRequirementsLabel}`
        : `pin ${this.currentRequirementsLabel}`,
    );
    this.setText(this.refs.pinButton, this.pinned ? 'unpin' : 'pin');
    this.setAttribute(this.refs.toggleButton, 'aria-expanded', listExpanded ? 'true' : 'false');
    this.setAttribute(
      this.refs.toggleButton,
      'aria-label',
      listExpanded
        ? `collapse ${this.currentRequirementsLabel}`
        : `expand ${this.currentRequirementsLabel}`,
    );
    this.setText(this.refs.toggleButton, listExpanded ? 'collapse' : 'expand');

    if (this.refs.backdrop) {
      const showBackdrop = listExpanded && !this.pinned;
      this.setHidden(this.refs.backdrop, !showBackdrop);
      this.setAttribute(this.refs.backdrop, 'aria-hidden', showBackdrop ? 'false' : 'true');
      this.setAttribute(this.refs.backdrop, 'aria-label', `collapse ${this.currentRequirementsLabel}`);
    }

    if (this.refs.list) {
      this.setHidden(this.refs.list, !expandedContentVisible);
    }

    this.syncTaskDragState();
    this.renderLevelRewards();
    this.renderLevelComplete();
    this.syncLevelRewardsToggle();
    this.updateToggleNotification();
  }

  syncLevelRewardsToggle() {
    const button = this.refs.levelRewardsToggle;

    if (!button) {
      return;
    }

    const availableInLayout = Boolean(
      this.shouldOfferLevelRewards() &&
        this.hasLevelRewardsLayout() &&
        this.canToggleLevelRewards(),
    );
    const targetLevel = this.getLevelRewardsTargetLevel();
    const actionText = this.rewardsHidden ? 'show' : 'hide';
    const levelText = Number.isInteger(targetLevel)
      ? `level ${targetLevel} rewards`
      : 'level rewards';

    this.setHidden(button, !availableInLayout);
    this.setDisabled(button, !availableInLayout);
    this.setText(button, `${actionText} rewards`);
    this.setAttribute(button, 'aria-expanded', this.rewardsHidden ? 'false' : 'true');
    this.setAttribute(button, 'aria-label', `${actionText} ${levelText}`);
  }

  shouldAnimateExpandedContentMotion() {
    return Boolean(
      this.canToggleTasks &&
        this.root?.isConnected &&
        this.refs.expandedContent &&
        !this.prefersReducedMotion(),
    );
  }

  startExpandedContentExpand(startHeight = 0) {
    const content = this.refs.expandedContent;
    const targetHeight = this.getExpandedContentScrollHeight();

    this.cancelExpandedContentMotion({ clearInlineStyles: false });

    if (!content || targetHeight <= 0) {
      this.finishExpandedContentMotion();
      return;
    }

    this.expandingExpandedContent = true;
    this.root?.classList.add('is-expanding');
    content.style.height = `${Math.max(0, startHeight)}px`;
    content.style.overflow = 'hidden';
    content.getBoundingClientRect();
    content.addEventListener('transitionend', this.handleExpandedContentTransitionEnd);

    this.expandedContentAnimationFrameId =
      window.requestAnimationFrame?.(() => {
        this.expandedContentAnimationFrameId = null;

        if (!this.expandingExpandedContent) {
          return;
        }

        content.style.height = `${targetHeight}px`;
      }) ?? null;

    if (this.expandedContentAnimationFrameId === null) {
      content.style.height = `${targetHeight}px`;
    }

    this.expandedContentAnimationTimeoutId = window.setTimeout(
      () => this.finishExpandedContentMotion(),
      EXPANDED_CONTENT_MOTION_MS + 50,
    );
  }

  startExpandedContentCollapse(startHeight = this.getExpandedContentHeight()) {
    const content = this.refs.expandedContent;

    this.cancelExpandedContentMotion({ clearInlineStyles: false });

    if (content && startHeight > 0) {
      content.style.height = `${startHeight}px`;
      content.style.overflow = 'hidden';
      content.getBoundingClientRect();
    }

    this.collapsingExpandedContent = true;
    this.root?.classList.add('is-collapsing');
    this.refs.expandedContent?.addEventListener(
      'transitionend',
      this.handleExpandedContentTransitionEnd,
    );
    this.expandedContentAnimationFrameId =
      window.requestAnimationFrame?.(() => {
        this.expandedContentAnimationFrameId = null;

        if (!this.collapsingExpandedContent || !content) {
          return;
        }

        content.style.height = '0px';
      }) ?? null;

    if (this.expandedContentAnimationFrameId === null && content) {
      content.style.height = '0px';
    }

    this.expandedContentAnimationTimeoutId = window.setTimeout(
      () => this.finishExpandedContentMotion(),
      EXPANDED_CONTENT_MOTION_MS + 50,
    );
  }

  finishExpandedContentMotion() {
    if (!this.expandingExpandedContent && !this.collapsingExpandedContent) {
      return;
    }

    this.cancelExpandedContentMotion();
    this.syncExpansionState();
  }

  cancelExpandedContentMotion({ clearInlineStyles = true } = {}) {
    if (this.expandedContentAnimationTimeoutId !== null) {
      window.clearTimeout(this.expandedContentAnimationTimeoutId);
      this.expandedContentAnimationTimeoutId = null;
    }

    if (this.expandedContentAnimationFrameId !== null) {
      window.cancelAnimationFrame?.(this.expandedContentAnimationFrameId);
      this.expandedContentAnimationFrameId = null;
    }

    this.refs.expandedContent?.removeEventListener(
      'transitionend',
      this.handleExpandedContentTransitionEnd,
    );
    this.expandingExpandedContent = false;
    this.collapsingExpandedContent = false;
    this.root?.classList.remove('is-expanding');
    this.root?.classList.remove('is-collapsing');

    if (clearInlineStyles && this.refs.expandedContent) {
      this.refs.expandedContent.style.height = '';
      this.refs.expandedContent.style.overflow = '';
    }
  }

  getExpandedContentHeight() {
    const content = this.refs.expandedContent;

    if (!content) {
      return 0;
    }

    return content.offsetHeight || content.scrollHeight || 0;
  }

  getExpandedContentScrollHeight() {
    const content = this.refs.expandedContent;

    if (!content) {
      return 0;
    }

    return Math.max(content.scrollHeight, this.refs.expandedContentBody?.scrollHeight ?? 0);
  }

  shouldAnimateRows() {
    return Boolean(
      this.expanded &&
        this.root?.isConnected &&
        this.refs.list &&
        !this.refs.list.hidden &&
        !this.prefersReducedMotion(),
    );
  }

  getCurrentTaskRowRects(nextTaskIds) {
    const rects = new Map();

    for (const [taskId, row] of this.rowsByTaskId.entries()) {
      const rect = row.root.getBoundingClientRect();

      if (rect.width || rect.height) {
        rects.set(taskId, rect);
      }
    }

    const summaryTaskId = this.refs.summaryTask?.button?.dataset.taskId;

    if (summaryTaskId && nextTaskIds.includes(summaryTaskId) && !rects.has(summaryTaskId)) {
      const rect = this.refs.summaryTask.root.getBoundingClientRect();

      if (rect.width || rect.height) {
        rects.set(summaryTaskId, rect);
      }
    }

    return rects;
  }

  animateMovedRows(firstRects) {
    if (!firstRects?.size || !this.shouldAnimateRows()) {
      return;
    }

    for (const { taskId, root } of this.getVisibleTaskEntries()) {
      if (
        taskId === this.dragState?.taskId ||
        taskId === this.skipNextRowAnimationTaskId ||
        root === this.skipNextRowAnimationRoot
      ) {
        this.cancelRowAnimation(taskId);
        continue;
      }

      const firstRect = firstRects.get(taskId);

      if (!firstRect) {
        continue;
      }

      const lastRect = root.getBoundingClientRect();
      const deltaX = firstRect.left - lastRect.left;
      const deltaY = firstRect.top - lastRect.top;

      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
        continue;
      }

      this.animateRowFromDelta(taskId, root, deltaX, deltaY);
    }
  }

  animateTaskFlowChange(change) {
    if (!this.shouldAnimateRows()) {
      change();
      return;
    }

    const firstRects = this.getCurrentVisibleTaskRowRects({
      excludeTaskId: this.dragState?.taskId,
    });
    change();
    this.animateMovedRows(firstRects);
  }

  getCurrentVisibleTaskRowRects({ excludeTaskId = null } = {}) {
    const rects = new Map();

    for (const { taskId, root } of this.getVisibleTaskEntries()) {
      if (taskId === excludeTaskId) {
        continue;
      }

      const rect = root.getBoundingClientRect();

      if (rect.width || rect.height) {
        rects.set(taskId, rect);
      }
    }

    return rects;
  }

  animateDroppedTaskFromRect(taskId, firstRect) {
    if (!firstRect || !this.shouldAnimateRows()) {
      return;
    }

    const root = this.getVisibleTaskRow(taskId)?.root;

    if (!root) {
      return;
    }

    const lastRect = root.getBoundingClientRect();
    const deltaX = firstRect.left - lastRect.left;
    const deltaY = firstRect.top - lastRect.top;

    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
      return;
    }

    this.animateRowFromDelta(taskId, root, deltaX, deltaY, {
      startOpacity: '0.96',
    });
  }

  getTaskDragVisualRect(dragState = this.dragState) {
    const root = dragState?.dragNode ?? dragState?.root;

    return root?.getBoundingClientRect?.() ?? null;
  }

  animateRowFromDelta(taskId, root, deltaX, deltaY, { startOpacity = '0.9' } = {}) {
    this.cancelRowAnimation(taskId);
    root.classList.add('is-reordering');
    root.style.transition = 'none';
    root.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    root.style.opacity = startOpacity;
    root.getBoundingClientRect();

    const cleanup = () => {
      const animation = this.rowAnimations.get(taskId);

      if (animation?.cleanup !== cleanup) {
        return;
      }

      root.removeEventListener('transitionend', onTransitionEnd);
      window.clearTimeout(animation.timeoutId);
      this.rowAnimations.delete(taskId);
      root.classList.remove('is-reordering');
      root.style.transition = '';
      root.style.transform = '';
      root.style.opacity = '';
    };
    const onTransitionEnd = (event) => {
      if (event.target === root && event.propertyName === 'transform') {
        cleanup();
      }
    };
    const timeoutId = window.setTimeout(cleanup, TASK_REORDER_MOTION_MS + 50);

    this.rowAnimations.set(taskId, { cleanup, onTransitionEnd, root, timeoutId });
    root.addEventListener('transitionend', onTransitionEnd);
    root.style.transition = TASK_REORDER_TRANSITION;
    root.style.transform = 'translate(0, 0)';
    root.style.opacity = '1';
  }

  cancelRowAnimations() {
    for (const taskId of this.rowAnimations.keys()) {
      this.cancelRowAnimation(taskId);
    }
  }

  cancelRowAnimation(taskId) {
    const animation = this.rowAnimations.get(taskId);

    if (!animation) {
      return;
    }

    this.rowAnimations.delete(taskId);
    animation.root.removeEventListener('transitionend', animation.onTransitionEnd);
    window.clearTimeout(animation.timeoutId);
    animation.root.classList.remove('is-reordering');
    animation.root.style.transition = '';
    animation.root.style.transform = '';
    animation.root.style.opacity = '';
  }

  prefersReducedMotion() {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }
}

function formatLevelCompletionCostText(costCoin) {
  return Number(costCoin) <= 0 ? 'free' : formatCoinPriceText(costCoin);
}

function formatRequirementQuantity(quantity, label) {
  const safeQuantity = Math.max(0, Math.ceil(Number(quantity) || 0));
  const safeLabel = String(label ?? '').trim();

  if (safeQuantity <= 1) {
    return safeLabel;
  }

  return `${safeQuantity} ${safeLabel}`;
}
