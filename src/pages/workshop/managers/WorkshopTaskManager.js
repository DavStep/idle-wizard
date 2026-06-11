import { setNotificationBadge } from '../../shared/notificationBadge.js';

export class WorkshopTaskManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.rowsByTaskId = new Map();
    this.currentTasksById = new Map();
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

    this.refs.summary = document.createElement('button');
    this.refs.summary.className = 'workshop-page__tasks-summary';
    this.refs.summary.type = 'button';
    this.refs.summary.setAttribute('aria-expanded', 'false');
    this.refs.summary.setAttribute('aria-controls', 'workshop-task-list');
    this.refs.summary.addEventListener('click', () => this.toggleExpanded());

    this.refs.level = document.createElement('span');
    this.refs.level.className = 'workshop-page__tasks-level';
    this.refs.level.textContent = 'level 1';

    this.refs.count = document.createElement('span');
    this.refs.count.className = 'workshop-page__tasks-count';
    this.refs.count.textContent = '0/5';

    this.refs.summary.append(this.refs.level, this.refs.count);

    this.refs.list = document.createElement('div');
    this.refs.list.className = 'workshop-page__task-list';
    this.refs.list.id = 'workshop-task-list';
    this.refs.list.hidden = true;

    this.root.append(this.refs.title, this.refs.summary, this.refs.list);
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
  }

  toggleExpanded() {
    this.setExpanded(!this.expanded);
  }

  setExpanded(expanded) {
    this.expanded = expanded;
    this.root?.classList.toggle('is-expanded', expanded);
    this.root?.classList.toggle('is-collapsed', !expanded);
    this.refs.summary?.setAttribute('aria-expanded', expanded ? 'true' : 'false');

    if (this.refs.list) {
      this.refs.list.hidden = !expanded;
    }
  }

  render(snapshot) {
    const taskSnapshot = snapshot?.tasks;

    if (!this.root || !taskSnapshot?.level) {
      return;
    }

    const tasks = taskSnapshot.level.tasks ?? [];
    this.currentTasksById = new Map(tasks.map((task) => [task.taskId, task]));
    this.ensureRows(tasks);

    this.setText(this.refs.level, `level ${taskSnapshot.currentLevel}`);
    this.setText(
      this.refs.count,
      taskSnapshot.completedAllLevels
        ? 'done'
        : `${taskSnapshot.level.completedTasks}/${taskSnapshot.level.totalTasks}`,
    );
    this.root.classList.toggle('is-all-complete', taskSnapshot.completedAllLevels);
    setNotificationBadge(
      this.refs.summary,
      tasks.some((task) => task.canFill || task.canComplete),
    );

    for (const task of tasks) {
      this.renderTask(task);
    }
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

  createTaskRow(task) {
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
    button.dataset.taskId = task.taskId;
    button.addEventListener('click', () => this.onTaskButton(task.taskId));

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

  renderTask(task) {
    const row = this.rowsByTaskId.get(task.taskId);

    if (!row) {
      return;
    }

    const quantityText = `${task.progressQuantity}/${task.requiredQuantity}`;
    const buttonText = this.getButtonText(task);
    const disabled = !task.canFill && !task.canComplete;

    row.root.classList.toggle('is-completed', task.completed);
    row.root.classList.toggle('is-maxed', task.maxed);
    this.setText(row.label, `${task.action} ${task.itemLabel}`);
    this.setText(row.quantity, quantityText);
    this.setText(row.button, buttonText);
    row.button.disabled = disabled;
    row.button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    row.button.setAttribute('aria-label', `${buttonText} ${task.itemLabel} task`);
    setNotificationBadge(row.button, !disabled);
    row.fill.style.width = `${Math.max(0, Math.min(1, task.progress)) * 100}%`;
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
