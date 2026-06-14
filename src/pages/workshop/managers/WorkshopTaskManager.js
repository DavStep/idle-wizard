import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { formatGoldPriceText } from '../../../shared/goldPrice.js';

export class WorkshopTaskManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.rowsByTaskId = new Map();
    this.currentTasksById = new Map();
    this.currentLevelCompletion = null;
    this.currentGold = 0;
    this.expanded = false;
  }

  mount(parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'workshop-page__tasks style-box is-collapsed';
    this.root.setAttribute('aria-label', 'Tasks');

    this.refs.title = document.createElement('div');
    this.refs.title.className = 'style-box__title';
    this.refs.title.textContent = 'tasks';

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

    this.refs.levelComplete = this.createLevelCompleteRow();

    this.root.append(
      this.refs.title,
      this.refs.count,
      this.refs.summary,
      this.refs.list,
      this.refs.levelComplete.root,
      this.refs.toggleButton,
    );
    parent.append(this.root);
    this.setExpanded(this.expanded);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.rowsByTaskId.clear();
    this.currentTasksById.clear();
    this.currentLevelCompletion = null;
    this.currentGold = 0;
  }

  toggleExpanded() {
    this.setExpanded(!this.expanded);
  }

  setExpanded(expanded) {
    this.expanded = expanded;
    this.root?.classList.toggle('is-expanded', expanded);
    this.root?.classList.toggle('is-collapsed', !expanded);
    this.refs.toggleButton?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    this.setText(this.refs.toggleButton, expanded ? 'collapse' : 'expand');

    if (this.refs.list) {
      this.refs.list.hidden = !expanded;
    }

    this.renderLevelComplete();

    this.updateToggleNotification();
  }

  render(snapshot) {
    const taskSnapshot = snapshot?.tasks;

    if (!this.root || !taskSnapshot?.level) {
      return;
    }

    const tasks = taskSnapshot.level.tasks ?? [];
    const displayTasks = this.getDisplayTasks(tasks);
    const [summaryTask, ...listTasks] = displayTasks;
    this.currentTasksById = new Map(tasks.map((task) => [task.taskId, task]));
    this.currentLevelCompletion = taskSnapshot.level.completion ?? null;
    this.currentGold = Number(snapshot?.gold?.current) || 0;
    this.ensureRows(listTasks);

    this.renderSummaryTask(summaryTask, taskSnapshot.completedAllLevels);
    this.setText(
      this.refs.count,
      taskSnapshot.completedAllLevels
        ? 'done'
        : `${taskSnapshot.level.completedTasks}/${taskSnapshot.level.totalTasks}`,
    );
    this.refs.count.setAttribute('aria-label', this.refs.count.textContent);
    this.refs.toggleButton.setAttribute(
      'aria-label',
      this.expanded ? 'collapse tasks' : 'expand tasks',
    );
    this.root.classList.toggle('is-all-complete', taskSnapshot.completedAllLevels);
    this.updateToggleNotification();

    for (const task of listTasks) {
      this.renderTask(task);
    }

    this.renderLevelComplete();
  }

  getDisplayTasks(tasks) {
    return [
      ...tasks.filter((task) => !task.completed),
      ...tasks.filter((task) => task.completed),
    ];
  }

  updateToggleNotification() {
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
        completedAllLevels ? 'all tasks done' : 'no tasks',
      );
      return;
    }

    this.refs.summaryTask.root.hidden = false;
    this.refs.summary.setAttribute('aria-label', task.itemLabel);
    this.renderTaskRow(this.refs.summaryTask, task);
  }

  ensureRows(tasks) {
    const taskIds = tasks.map((task) => task.taskId);
    const existingTaskIds = [...this.rowsByTaskId.keys()];

    if (
      taskIds.length === existingTaskIds.length &&
      taskIds.every((taskId, index) => taskId === existingTaskIds[index])
    ) {
      return;
    }

    this.refs.list.replaceChildren();
    this.rowsByTaskId.clear();

    for (const task of tasks) {
      const row = this.createTaskRow(task);
      this.rowsByTaskId.set(task.taskId, row);
      this.refs.list.append(row.root);
    }
  }

  createTaskRow() {
    const root = document.createElement('div');
    root.className = 'workshop-page__task';

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

  createLevelCompleteRow() {
    const root = document.createElement('div');
    root.className = 'workshop-page__level-complete';
    root.hidden = true;

    const label = document.createElement('span');
    label.className = 'workshop-page__level-complete-label';
    label.textContent = 'level up';

    const cost = document.createElement('span');
    cost.className = 'workshop-page__level-complete-cost';

    const button = document.createElement('button');
    button.className = 'style-button workshop-page__level-complete-button';
    button.type = 'button';
    button.textContent = 'complete';
    button.addEventListener('click', () => this.onLevelCompleteButton());

    root.append(label, cost, button);

    return {
      root,
      label,
      cost,
      button,
    };
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
    this.gameplayFacade.completeTaskLevel?.();
    this.render(this.gameplayFacade.getSnapshot());
  }

  renderTask(task) {
    const row = this.rowsByTaskId.get(task.taskId);

    if (!row) {
      return;
    }

    this.renderTaskRow(row, task);
  }

  renderTaskRow(row, task) {
    const quantityText = `${task.progressQuantity}/${task.requiredQuantity}`;
    const buttonText = this.getButtonText(task);
    const disabled = !task.canFill && !task.canComplete;

    row.root.classList.toggle('is-completed', task.completed);
    row.root.classList.toggle('is-maxed', task.maxed);
    row.button.dataset.taskId = task.taskId;
    row.button.dataset.tutorialId = `task:${task.taskId}`;
    this.setText(row.label, task.itemLabel);
    setItemIconLabel(row.label, task.itemKind, task.itemKey);
    this.setText(row.quantity, quantityText);
    this.setText(row.button, buttonText);
    row.button.disabled = disabled;
    row.button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    row.button.setAttribute('aria-label', `${buttonText} ${task.itemLabel} task`);
    setNotificationBadge(row.button, !disabled);
    row.fill.style.width = `${Math.max(0, Math.min(1, task.progress)) * 100}%`;
  }

  renderLevelComplete() {
    const row = this.refs.levelComplete;

    if (!row) {
      return;
    }

    const show = this.expanded && this.shouldShowLevelComplete();
    row.root.hidden = !show;

    if (!show) {
      return;
    }

    const costText = formatGoldPriceText(this.currentLevelCompletion.costGold);
    const disabled = !this.canAffordLevelCompletion();

    this.setText(row.cost, costText);
    row.button.disabled = disabled;
    row.button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    row.button.setAttribute(
      'aria-label',
      `complete level ${this.currentLevelCompletion.level} for ${costText}`,
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

  getButtonText(task) {
    if (task.completed) {
      return 'done';
    }

    if (task.canComplete) {
      return 'complete';
    }

    return 'fill';
  }

  setText(element, text) {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }
}
