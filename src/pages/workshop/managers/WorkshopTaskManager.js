import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import {
  formatLevelRequirementsLabel,
  getLevelRequirementTargetLevel,
} from '../../shared/levelRequirementsLabel.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { setResourceColor } from '../../shared/resourceColor.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { formatGoldPriceText } from '../../../shared/goldPrice.js';
import { formatLevelUpNotice, getLevelPayoffRows } from './levelPayoffSummary.js';

const INITIAL_REQUIREMENTS_LABEL = formatLevelRequirementsLabel();
const TURN_IN_TEXT = 'turn in';
const COMPLETE_TEXT = 'complete';
const EXPANDED_CONTENT_COLLAPSE_MS = 230;

export class WorkshopTaskManager {
  constructor({ gameplayFacade, onLevelUpNotice } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.onLevelUpNotice = onLevelUpNotice;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.rowsByTaskId = new Map();
    this.rowAnimations = new Map();
    this.currentTasksById = new Map();
    this.currentDisplayTasks = [];
    this.currentLevelCompletion = null;
    this.currentGold = 0;
    this.currentSnapshot = null;
    this.currentFirstCompletedTaskId = null;
    this.currentRequirementsLabel = INITIAL_REQUIREMENTS_LABEL;
    this.currentRequirementTargetLevel = null;
    this.taskPriorityByLevel = new Map();
    this.dragState = null;
    this.expanded = false;
    this.collapsingExpandedContent = false;
    this.collapseAnimationTimeoutId = null;
    this.collapseAnimationFrameId = null;
    this.canToggleTasks = false;
    this.infoVisible = false;
    this.previousFocus = null;
    this.suppressNextOutsideClick = false;
    this.handleBackdropPress = (event) => {
      this.collapseFromOutsidePress(event);
    };
    this.handleOutsidePress = (event) => {
      if (event.type === 'click' && this.suppressNextOutsideClick) {
        this.suppressNextOutsideClick = false;
        const target = event.target;

        if (!target || !this.root?.contains(target)) {
          event.preventDefault();
          event.stopPropagation();
        }

        return;
      }

      if (event.type !== 'click') {
        this.suppressNextOutsideClick = false;
      }

      if (!this.isTaskListExpanded() || this.infoVisible) {
        return;
      }

      const target = event.target;

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
        this.finishExpandedContentCollapse();
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
    this.refs.summaryTask = this.createTaskRow();
    this.refs.summary.append(this.refs.summaryTask.root);

    this.refs.count = document.createElement('span');
    this.refs.count.className = 'workshop-page__tasks-count';
    this.refs.count.textContent = '0/5';

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

    this.refs.levelRewards = this.createLevelRewardsPanel();
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
      this.refs.count,
      this.refs.summary,
      this.refs.expandedContent,
      this.refs.toggleButton,
    );
    this.refs.slot.append(this.root);
    parent.append(this.refs.backdrop, this.refs.slot);
    this.refs.infoPopup = this.createInfoPopup();
    popupParent.append(this.refs.infoPopup);
    document.addEventListener('pointerdown', this.handleOutsidePress, true);
    document.addEventListener('click', this.handleOutsidePress, true);
    document.addEventListener('keydown', this.handleKeydown);
    this.setCanToggleTasks(false);
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
    this.cancelExpandedContentCollapse();
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
    this.currentGold = 0;
    this.currentSnapshot = null;
    this.currentFirstCompletedTaskId = null;
    this.currentRequirementsLabel = INITIAL_REQUIREMENTS_LABEL;
    this.currentRequirementTargetLevel = null;
    this.collapsingExpandedContent = false;
    this.infoVisible = false;
    this.previousFocus = null;
    this.dragState = null;
  }

  toggleExpanded() {
    this.setExpanded(!this.expanded);
  }

  setExpanded(expanded) {
    const nextExpanded = Boolean(expanded);
    const shouldAnimateCollapse =
      this.expanded && !nextExpanded && this.shouldAnimateExpandedContentCollapse();

    if (nextExpanded) {
      this.cancelExpandedContentCollapse();
    }

    this.expanded = nextExpanded;

    if (shouldAnimateCollapse) {
      this.startExpandedContentCollapse();
    }

    this.syncExpansionState();
  }

  collapseFromOutsidePress(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    this.setExpanded(false);
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
    const [summaryTask, ...listTasks] = displayTasks;
    this.currentSnapshot = snapshot;
    this.currentTasksById = new Map(tasks.map((task) => [task.taskId, task]));
    this.currentDisplayTasks = displayTasks;
    this.currentLevelCompletion = taskSnapshot.level.completion ?? null;
    this.currentGold = Number(snapshot?.gold?.current) || 0;
    this.currentFirstCompletedTaskId = this.getFirstCompletedTaskId(displayTasks);
    const rowMovement = this.ensureRows(listTasks);
    this.setCanToggleTasks(listTasks.length > 0);

    this.renderSummaryTask(summaryTask, taskSnapshot.completedAllLevels);
    this.setText(
      this.refs.count,
      taskSnapshot.completedAllLevels
        ? 'done'
        : `${taskSnapshot.level.completedTasks}/${taskSnapshot.level.totalTasks}`,
    );
    this.refs.count.setAttribute(
      'aria-label',
      taskSnapshot.completedAllLevels
        ? `all ${this.currentRequirementsLabel} met`
        : `${taskSnapshot.level.completedTasks} of ${taskSnapshot.level.totalTasks} ${this.currentRequirementsLabel} met`,
    );
    this.root.classList.toggle('is-all-complete', taskSnapshot.completedAllLevels);

    for (const task of listTasks) {
      this.renderTask(task);
    }

    this.renderLevelRewards();
    this.syncExpansionState();
    this.animateMovedRows(rowMovement);

    if (activeDragState && this.dragState === activeDragState) {
      this.syncTaskDragPreview();
    }
  }

  getDisplayTasks(tasks, taskSnapshot = this.currentSnapshot?.tasks) {
    const priority = this.getTaskPriorityMap(taskSnapshot);

    return [
      ...this.sortTasksByPriority(
        tasks.filter((task) => !task.completed),
        priority,
      ),
      ...this.sortTasksByPriority(
        tasks.filter((task) => task.completed),
        priority,
      ),
    ];
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
            return task?.canFill || task?.canComplete;
          })),
    );
  }

  renderSummaryTask(task, completedAllLevels) {
    if (!this.refs.summaryTask) {
      return;
    }

    if (!task) {
      this.refs.summaryTask.root.hidden = true;
      this.refs.summary.setAttribute(
        'aria-label',
        completedAllLevels
          ? `all ${this.currentRequirementsLabel} met`
          : `no ${this.currentRequirementsLabel}`,
      );
      return;
    }

    this.refs.summaryTask.root.hidden = false;
    this.refs.summary.setAttribute(
      'aria-label',
      `${task.itemLabel} required for ${this.getRequirementTargetText()}`,
    );
    this.renderTaskRow(this.refs.summaryTask, task);
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
    setResourceColor(cost, 'gold');

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
    const requirementsLabel = formatLevelRequirementsLabel(taskSnapshot);
    this.currentRequirementsLabel = requirementsLabel;
    this.currentRequirementTargetLevel = getLevelRequirementTargetLevel(taskSnapshot);
    this.root.setAttribute('aria-label', requirementsLabel);
    this.setText(this.refs.title, requirementsLabel);
    this.refs.title.setAttribute('aria-label', `show ${requirementsLabel} info`);
    this.refs.infoDialog?.setAttribute('aria-label', `${requirementsLabel} information`);
    this.setText(this.refs.infoTitle, requirementsLabel);
    this.setText(this.refs.infoBody, this.getTasksHelperText());
  }

  getTasksHelperText() {
    if (Number.isInteger(this.currentRequirementTargetLevel)) {
      return `turn in these items to reach level ${this.currentRequirementTargetLevel}. turned-in items are consumed.`;
    }

    return 'turn in these items to level up. turned-in items are consumed.';
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

    if (task.canComplete) {
      this.gameplayFacade.completeTask(taskId);
    } else {
      this.gameplayFacade.fillTask(taskId);
    }

    this.render(this.gameplayFacade.getSnapshot());
  }

  onLevelCompleteButton() {
    const currentLevel = this.currentLevelCompletion?.level ?? null;
    const nextLevel = Number.isInteger(currentLevel) ? currentLevel + 1 : null;
    const payoffRows =
      Number.isInteger(currentLevel) && Number.isInteger(nextLevel)
        ? this.getLevelPayoffRows(currentLevel, nextLevel)
        : [];
    const result = this.gameplayFacade.completeTaskLevel?.();
    this.render(this.gameplayFacade.getSnapshot());

    if (result?.ok && Number.isInteger(result.currentLevel) && result.currentLevel === nextLevel) {
      this.onLevelUpNotice?.({
        level: result.currentLevel,
        rows: payoffRows,
        message: formatLevelUpNotice(result.currentLevel, payoffRows),
      });
    }
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
    const disabled = !task.canFill && !task.canComplete;

    row.root.classList.toggle('is-completed', task.completed);
    row.root.classList.toggle('is-maxed', task.maxed);
    row.root.classList.toggle('is-first-completed', isFirstCompleted);
    row.root.dataset.taskId = task.taskId;
    row.root.setAttribute(
      'aria-label',
      `move ${task.itemLabel} requirement priority with arrow keys or drag`,
    );
    row.button.dataset.taskId = task.taskId;
    row.button.dataset.tutorialId = `task:${task.taskId}`;
    this.setText(row.label, task.itemLabel);
    setItemIconLabel(row.label, task.itemKind, task.itemKey);
    this.setText(row.quantity, quantityText);
    this.setText(row.button, buttonText);
    row.button.disabled = disabled;
    row.button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    row.button.setAttribute('aria-label', this.getTaskButtonAriaLabel(task, buttonText));
    setNotificationBadge(row.button, !disabled);
    row.fill.style.width = `${Math.max(0, Math.min(1, task.progress)) * 100}%`;
  }

  renderLevelRewards() {
    const row = this.refs.levelRewards;

    if (!row) {
      return;
    }

    const currentLevel =
      this.currentLevelCompletion?.level ?? this.currentSnapshot?.tasks?.level?.level;
    const nextLevel = Number.isInteger(currentLevel) ? currentLevel + 1 : null;
    const maxLevel = Math.floor(
      Number(
        this.currentSnapshot?.tasks?.maxLevel ?? this.currentSnapshot?.playerLevel?.maxLevel,
      ),
    );
    const insideLevelRange = !Number.isInteger(maxLevel) || nextLevel <= maxLevel;
    const show =
      Number.isInteger(nextLevel) &&
      insideLevelRange &&
      (!this.canToggleTasks || this.isExpandedContentVisible()) &&
      this.currentSnapshot?.tasks?.completedAllLevels !== true &&
      this.currentLevelCompletion?.completedAllLevels !== true;

    row.root.hidden = !show;

    if (!show) {
      return;
    }

    const payoffRows = this.getLevelPayoffRows(currentLevel, nextLevel);
    const payoffPreview = this.getLevelPayoffPreview(nextLevel, payoffRows);

    this.setText(row.title, `level ${nextLevel} rewards`);
    this.renderLevelPayoffRows(payoffRows, row.rows);
    row.root.setAttribute('aria-label', payoffPreview);
  }

  renderLevelComplete() {
    const row = this.refs.levelComplete;

    if (!row) {
      return;
    }

    const show =
      this.shouldShowLevelComplete() &&
      (!this.canToggleTasks || this.isExpandedContentVisible());
    row.root.hidden = !show;

    if (!show) {
      return;
    }

    const costText = formatGoldPriceText(this.currentLevelCompletion.costGold);
    const disabled = !this.canAffordLevelCompletion();
    const nextLevel = this.currentLevelCompletion.level + 1;
    const payoffRows = this.getLevelPayoffRows(this.currentLevelCompletion.level, nextLevel);
    const payoffPreview = this.getLevelPayoffPreview(nextLevel, payoffRows);

    setResourceIconText(row.cost, costText);
    row.button.disabled = disabled;
    row.button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    row.button.setAttribute(
      'aria-label',
      `level up to ${nextLevel} for ${costText}. ${payoffPreview}`,
    );
    row.root.setAttribute(
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
      this.currentGold >= (this.currentLevelCompletion?.costGold ?? Infinity)
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
        const root = document.createElement('div');
        root.className = 'workshop-page__level-payoff-row';
        root.classList.toggle('workshop-page__level-payoff-row--list', valueLines.length > 0);

        const label = document.createElement('span');
        label.className = 'workshop-page__level-payoff-label';
        label.textContent = row.label;

        const value = document.createElement('span');
        value.className = 'workshop-page__level-payoff-value';

        if (valueLines.length > 0) {
          value.classList.add('workshop-page__level-payoff-value--list');
          value.replaceChildren(
            ...valueLines.map((line) => {
              const item = document.createElement('span');
              item.className = 'workshop-page__level-payoff-value-line';
              item.textContent = line;
              return item;
            }),
          );
        } else {
          value.textContent = row.value;
        }

        root.append(label, value);
        return root;
      }),
    );
  }

  getButtonText(task) {
    if (task.completed) {
      return 'done';
    }

    if (task.canComplete) {
      return COMPLETE_TEXT;
    }

    return TURN_IN_TEXT;
  }

  getTaskButtonAriaLabel(task, buttonText) {
    if (task.completed) {
      return `${task.itemLabel} requirement done for ${this.getRequirementTargetText()}`;
    }

    if (task.canComplete) {
      return `complete ${task.itemLabel} requirement for ${this.getRequirementTargetText()}`;
    }

    if (task.canFill) {
      return `turn in ${task.itemLabel} for ${this.getRequirementTargetText()}. turned-in items are consumed`;
    }

    return `${buttonText} ${task.itemLabel} requirement for ${this.getRequirementTargetText()}`;
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

    if (!taskId || !root) {
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
      taskIds,
      targetIndex: initialIndex,
      root,
      ghost: this.createTaskDragGhost(root, rect),
      placeholder: this.createTaskDragPlaceholder(rect),
    };
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
    this.placeTaskDragPlaceholder(
      this.getTaskDropIndex(this.dragState.taskId, event.clientY),
    );
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

    if (!taskId) {
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
    const targetIndex = commit
      ? this.getTaskDropIndex(taskId, clientY)
      : dragState.targetIndex;
    this.dragState = null;
    this.stopTaskDragListeners();
    this.clearTaskDragPreview(dragState);

    if (commit) {
      this.moveTaskToIndex(taskId, targetIndex);
    } else {
      this.render(this.gameplayFacade.getSnapshot());
    }
  }

  getTaskDropIndex(taskId, clientY) {
    const entries = this.getTaskDropEntries(taskId);
    let targetIndex = 0;

    for (const entry of entries) {
      const rect = entry.rect;
      const centerY = rect.top + rect.height / 2;

      if (clientY > centerY) {
        targetIndex += 1;
      }
    }

    return this.clampTaskTargetIndex(taskId, targetIndex);
  }

  getTaskDropEntries(taskId) {
    const taskIds =
      this.dragState?.taskIds ?? this.currentDisplayTasks.map((task) => task.taskId);

    return taskIds
      .filter((candidateTaskId) => candidateTaskId !== taskId)
      .map((candidateTaskId) => {
        const row = this.getVisibleTaskRow(candidateTaskId);
        const rect = row?.root?.getBoundingClientRect();

        if (!rect || (!rect.width && !rect.height)) {
          return null;
        }

        return {
          taskId: candidateTaskId,
          rect,
        };
      })
      .filter(Boolean)
      .sort((left, right) => left.rect.top - right.rect.top);
  }

  moveTaskByOffset(taskId, offset) {
    const currentIndex = this.currentDisplayTasks.findIndex((task) => task.taskId === taskId);

    if (currentIndex < 0) {
      return;
    }

    this.moveTaskToIndex(taskId, currentIndex + offset);
  }

  moveTaskToIndex(taskId, targetIndex) {
    const currentIndex = this.currentDisplayTasks.findIndex((task) => task.taskId === taskId);

    if (currentIndex < 0) {
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
    this.render(this.gameplayFacade.getSnapshot());
    return true;
  }

  clampTaskTargetIndex(taskId, targetIndex) {
    const currentIndex = this.currentDisplayTasks.findIndex((task) => task.taskId === taskId);

    if (currentIndex < 0) {
      return targetIndex;
    }

    const task = this.currentDisplayTasks[currentIndex];
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

    if (this.refs.summaryTask?.root && !this.refs.summaryTask.root.hidden) {
      entries.push({
        taskId: this.refs.summaryTask.root.dataset.taskId,
        root: this.refs.summaryTask.root,
      });
    }

    if (this.refs.list && !this.refs.list.hidden) {
      for (const [taskId, row] of this.rowsByTaskId.entries()) {
        if (!row.root.hidden) {
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

  createTaskDragGhost(root, rect) {
    const ghost = root.cloneNode(true);
    ghost.classList.add('workshop-page__task-drag-ghost', 'is-dragging');
    ghost.classList.remove('is-reordering', 'is-first-completed');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = '0';
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;

    for (const button of ghost.querySelectorAll('button')) {
      button.tabIndex = -1;
    }

    document.body.append(ghost);
    return ghost;
  }

  createTaskDragPlaceholder(rect) {
    const placeholder = document.createElement('div');
    placeholder.className = 'workshop-page__task workshop-page__task-drag-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.style.height = `${rect.height}px`;
    return placeholder;
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
      dragState.root.style.display = '';
    }

    dragState.root = row.root;
    this.cancelRowAnimation(dragState.taskId);
    row.root.classList.add('is-dragging');
    row.root.style.display = 'none';
    this.root?.classList.add('is-task-dragging');
    this.placeTaskDragPlaceholder(dragState.targetIndex);
    this.updateTaskDragGhost(dragState.lastY);
  }

  placeTaskDragPlaceholder(targetIndex) {
    const dragState = this.dragState;

    if (!dragState?.placeholder || !this.refs.summary || !this.refs.list) {
      return;
    }

    const clampedTargetIndex = this.clampTaskTargetIndex(dragState.taskId, targetIndex);
    const orderedTaskIds = dragState.taskIds.filter(
      (taskId) =>
        taskId !== dragState.taskId &&
        this.currentDisplayTasks.some((task) => task.taskId === taskId),
    );
    orderedTaskIds.splice(
      Math.min(clampedTargetIndex, orderedTaskIds.length),
      0,
      dragState.taskId,
    );
    const roots = orderedTaskIds
      .map((taskId) =>
        taskId === dragState.taskId
          ? dragState.placeholder
          : this.getVisibleTaskRow(taskId)?.root,
      )
      .filter(Boolean);

    dragState.targetIndex = clampedTargetIndex;
    this.refs.summary.replaceChildren(...roots.slice(0, 1));
    this.refs.list.replaceChildren(...roots.slice(1));
  }

  updateTaskDragGhost(clientY = this.dragState?.lastY) {
    const dragState = this.dragState;

    if (!dragState?.ghost || !Number.isFinite(clientY)) {
      return;
    }

    const offsetY = Number.isFinite(dragState.grabOffsetY) ? dragState.grabOffsetY : 0;
    dragState.ghost.style.transform = `translate3d(0, ${clientY - offsetY}px, 0)`;
  }

  restoreTaskDragFlow(dragState = this.dragState) {
    dragState?.placeholder?.remove();

    if (dragState?.root) {
      dragState.root.style.display = '';
    }

    if (this.refs.summary && this.refs.summaryTask?.root) {
      this.refs.summary.replaceChildren(this.refs.summaryTask.root);
    }
  }

  clearTaskDragPreview(dragState = this.dragState) {
    if (!dragState) {
      return;
    }

    dragState.ghost?.remove();
    dragState.placeholder?.remove();
    dragState.root?.classList.remove('is-dragging');

    if (dragState.root) {
      dragState.root.style.display = '';
    }

    this.root?.classList.remove('is-task-dragging');
    this.restoreTaskDragFlow(dragState);
  }

  canReorderVisibleTasks() {
    return Boolean(
      this.currentDisplayTasks.length > 1 &&
        (!this.canToggleTasks || this.isTaskListExpanded()),
    );
  }

  syncTaskDragState() {
    const canReorder = this.canReorderVisibleTasks();
    const rows = [this.refs.summaryTask, ...this.rowsByTaskId.values()].filter(Boolean);

    this.root?.classList.toggle('has-task-drag', canReorder);

    for (const row of rows) {
      row.root.classList.toggle('is-drag-disabled', !canReorder);
      row.root.classList.toggle('is-draggable', canReorder);
      row.root.tabIndex = canReorder ? 0 : -1;
      row.root.setAttribute('aria-disabled', canReorder ? 'false' : 'true');
    }
  }

  setText(element, text) {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }

  setCanToggleTasks(canToggleTasks) {
    this.canToggleTasks = Boolean(canToggleTasks);

    if (!this.refs.toggleButton) {
      return;
    }

    this.refs.toggleButton.hidden = !this.canToggleTasks;
    this.refs.toggleButton.disabled = !this.canToggleTasks;
    this.root?.classList.toggle('has-task-toggle', this.canToggleTasks);

    if (this.canToggleTasks) {
      this.refs.toggleButton.dataset.tutorialId = 'workshop:tasks';
      this.refs.toggleButton.setAttribute('aria-controls', 'workshop-task-list');
    } else {
      delete this.refs.toggleButton.dataset.tutorialId;
      this.refs.toggleButton.removeAttribute('aria-controls');
    }
  }

  isTaskListExpanded() {
    return Boolean(this.canToggleTasks && this.expanded);
  }

  isExpandedContentVisible() {
    return Boolean(this.isTaskListExpanded() || this.collapsingExpandedContent);
  }

  syncExpansionState() {
    const listExpanded = this.isTaskListExpanded();
    const expandedContentVisible = this.isExpandedContentVisible();
    const levelCompleteExpanded =
      this.shouldShowLevelComplete() && (!this.canToggleTasks || listExpanded);
    const hasExpandedContent = listExpanded || levelCompleteExpanded;

    this.root?.classList.toggle('is-expanded', hasExpandedContent);
    this.root?.classList.toggle('is-collapsed', !hasExpandedContent);
    this.root?.classList.toggle('is-collapsing', this.collapsingExpandedContent);
    this.refs.toggleButton?.setAttribute('aria-expanded', listExpanded ? 'true' : 'false');
    this.refs.toggleButton?.setAttribute(
      'aria-label',
      listExpanded
        ? `collapse ${this.currentRequirementsLabel}`
        : `expand ${this.currentRequirementsLabel}`,
    );
    this.setText(this.refs.toggleButton, listExpanded ? 'collapse' : 'expand');

    if (this.refs.backdrop) {
      this.refs.backdrop.hidden = !listExpanded;
      this.refs.backdrop.setAttribute('aria-hidden', listExpanded ? 'false' : 'true');
      this.refs.backdrop.setAttribute('aria-label', `collapse ${this.currentRequirementsLabel}`);
    }

    if (this.refs.list) {
      this.refs.list.hidden = !expandedContentVisible;
    }

    this.syncTaskDragState();
    this.renderLevelRewards();
    this.renderLevelComplete();
    this.updateToggleNotification();
  }

  shouldAnimateExpandedContentCollapse() {
    return Boolean(
      this.canToggleTasks &&
        this.root?.isConnected &&
        this.refs.expandedContent &&
        !this.prefersReducedMotion(),
    );
  }

  startExpandedContentCollapse() {
    this.cancelExpandedContentCollapse();
    const content = this.refs.expandedContent;
    const contentHeight = content?.getBoundingClientRect().height ?? 0;

    if (content && contentHeight > 0) {
      content.style.height = `${contentHeight}px`;
      content.style.opacity = '1';
      content.style.overflow = 'hidden';
      content.getBoundingClientRect();
    }

    this.collapsingExpandedContent = true;
    this.root?.classList.add('is-collapsing');
    this.refs.expandedContent?.addEventListener(
      'transitionend',
      this.handleExpandedContentTransitionEnd,
    );
    this.collapseAnimationFrameId =
      window.requestAnimationFrame?.(() => {
        this.collapseAnimationFrameId = null;

        if (!this.collapsingExpandedContent || !content) {
          return;
        }

        content.style.height = '0px';
        content.style.opacity = '0.01';
      }) ?? null;

    if (this.collapseAnimationFrameId === null && content) {
      content.style.height = '0px';
      content.style.opacity = '0.01';
    }

    this.collapseAnimationTimeoutId = window.setTimeout(
      () => this.finishExpandedContentCollapse(),
      EXPANDED_CONTENT_COLLAPSE_MS + 40,
    );
  }

  finishExpandedContentCollapse() {
    if (!this.collapsingExpandedContent) {
      return;
    }

    this.cancelExpandedContentCollapse();
    this.syncExpansionState();
  }

  cancelExpandedContentCollapse() {
    if (this.collapseAnimationTimeoutId !== null) {
      window.clearTimeout(this.collapseAnimationTimeoutId);
      this.collapseAnimationTimeoutId = null;
    }

    if (this.collapseAnimationFrameId !== null) {
      window.cancelAnimationFrame?.(this.collapseAnimationFrameId);
      this.collapseAnimationFrameId = null;
    }

    this.refs.expandedContent?.removeEventListener(
      'transitionend',
      this.handleExpandedContentTransitionEnd,
    );
    this.collapsingExpandedContent = false;
    this.root?.classList.remove('is-collapsing');

    if (this.refs.expandedContent) {
      this.refs.expandedContent.style.height = '';
      this.refs.expandedContent.style.opacity = '';
      this.refs.expandedContent.style.overflow = '';
    }
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

    for (const [taskId, row] of this.rowsByTaskId.entries()) {
      if (taskId === this.dragState?.taskId) {
        this.cancelRowAnimation(taskId);
        continue;
      }

      const firstRect = firstRects.get(taskId);

      if (!firstRect) {
        continue;
      }

      const lastRect = row.root.getBoundingClientRect();
      const deltaX = firstRect.left - lastRect.left;
      const deltaY = firstRect.top - lastRect.top;

      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
        continue;
      }

      this.animateRowFromDelta(taskId, row.root, deltaX, deltaY);
    }
  }

  animateRowFromDelta(taskId, root, deltaX, deltaY) {
    this.cancelRowAnimation(taskId);
    root.classList.add('is-reordering');
    root.style.transition = 'none';
    root.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    root.style.opacity = '0.9';
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
    const timeoutId = window.setTimeout(cleanup, 310);

    this.rowAnimations.set(taskId, { cleanup, onTransitionEnd, root, timeoutId });
    root.addEventListener('transitionend', onTransitionEnd);
    root.style.transition =
      'transform 260ms cubic-bezier(0.2, 1.32, 0.36, 1), opacity 140ms linear';
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
