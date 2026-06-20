export class WorkshopPersonalTasksManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.selectedPeriodType = 'daily';
    this.previousFocus = null;
    this.currentSnapshot = null;
    this.handlePopupClick = (event) => {
      if (event.target === this.refs.popup) {
        this.hide();
      }
    };
    this.handleKeydown = (event) => {
      if (!this.visible || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      this.hide();
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
    this.root.className = 'workshop-page__personal-tasks style-box';
    this.root.setAttribute('aria-label', 'personal tasks');

    this.refs.title = document.createElement('div');
    this.refs.title.className = 'style-box__title';
    this.refs.title.textContent = 'personal tasks';

    this.refs.summary = document.createElement('div');
    this.refs.summary.className = 'workshop-page__personal-tasks-summary';

    this.refs.openButton = document.createElement('button');
    this.refs.openButton.className = 'workshop-page__personal-tasks-open';
    this.refs.openButton.type = 'button';
    this.refs.openButton.textContent = 'open';
    this.refs.openButton.setAttribute('aria-haspopup', 'dialog');
    this.refs.openButton.addEventListener('click', () => this.show());

    this.root.append(this.refs.title, this.refs.summary, this.refs.openButton);
    parent.append(this.root);

    this.refs.popup = this.createPopup();
    popupParent.append(this.refs.popup);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());

    return this.root;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'workshop-page__personal-tasks-popup';
    popup.hidden = true;
    popup.addEventListener('click', this.handlePopupClick);

    this.refs.panel = document.createElement('div');
    this.refs.panel.className = 'workshop-page__personal-tasks-panel';

    this.refs.dialog = document.createElement('section');
    this.refs.dialog.className = 'workshop-page__personal-tasks-dialog style-dialog';
    this.refs.dialog.setAttribute('aria-label', 'personal tasks');
    this.refs.dialog.setAttribute('aria-modal', 'true');
    this.refs.dialog.setAttribute('role', 'dialog');
    this.refs.dialog.tabIndex = -1;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'personal tasks';

    this.refs.periodLabel = document.createElement('div');
    this.refs.periodLabel.className = 'workshop-page__personal-tasks-period';

    this.refs.frame = document.createElement('div');
    this.refs.frame.className = 'workshop-page__personal-tasks-frame';

    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'workshop-page__personal-tasks-rows';
    this.refs.frame.append(this.refs.rows);

    this.refs.closeButton = document.createElement('button');
    this.refs.closeButton.className =
      'style-button workshop-page__personal-tasks-close';
    this.refs.closeButton.type = 'button';
    this.refs.closeButton.textContent = 'close';
    this.refs.closeButton.addEventListener('click', () => this.hide());

    this.refs.tabs = document.createElement('div');
    this.refs.tabs.className = 'workshop-page__personal-tasks-tabs';
    this.refs.tabs.setAttribute('role', 'tablist');
    this.refs.tabs.setAttribute('aria-label', 'task period');
    this.refs.tabButtons = new Map(
      ['daily', 'weekly'].map((periodType) => {
        const button = document.createElement('button');
        button.className = 'style-button workshop-page__personal-tasks-tab-button';
        button.type = 'button';
        button.textContent = periodType;
        button.setAttribute('role', 'tab');
        button.addEventListener('click', () => this.selectPeriod(periodType));
        return [periodType, button];
      }),
    );
    this.refs.tabs.replaceChildren(...this.refs.tabButtons.values());

    this.refs.dialog.append(
      title,
      this.refs.periodLabel,
      this.refs.frame,
      this.refs.closeButton,
    );
    this.refs.panel.append(this.refs.dialog, this.refs.tabs);
    popup.append(this.refs.panel);

    return popup;
  }

  show() {
    if (!this.root || this.root.hidden) {
      return;
    }

    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyVisibility();
    this.renderPopup(this.currentSnapshot?.personalTasks);
    this.refs.dialog?.focus();
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.applyVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
  }

  selectPeriod(periodType) {
    if (this.selectedPeriodType === periodType) {
      return;
    }

    this.selectedPeriodType = periodType;
    this.renderPopup(this.currentSnapshot?.personalTasks);
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.root?.remove();
    this.refs.popup?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.previousFocus = null;
    this.currentSnapshot = null;
  }

  render(snapshot) {
    if (!this.root) {
      return;
    }

    this.currentSnapshot = snapshot;
    const personalTasks = snapshot?.personalTasks;
    const unlocked = personalTasks?.unlocked === true;
    this.root.hidden = !unlocked;

    if (!unlocked) {
      this.hide();
      return;
    }

    this.renderSummary(personalTasks);

    if (this.visible) {
      this.renderPopup(personalTasks);
    }
  }

  renderSummary(personalTasks) {
    const daily = personalTasks?.daily;
    const weekly = personalTasks?.weekly;
    this.refs.summary.replaceChildren(
      this.createSummaryRow('daily', daily),
      this.createSummaryRow('weekly', weekly),
    );
  }

  createSummaryRow(label, period) {
    const row = document.createElement('div');
    row.className = 'workshop-page__personal-tasks-summary-row';

    const name = document.createElement('span');
    name.className = 'workshop-page__personal-tasks-summary-name';
    name.textContent = label;

    const count = document.createElement('span');
    count.className = 'workshop-page__personal-tasks-summary-count';
    count.textContent = `${period?.completedTasks ?? 0}/${period?.totalTasks ?? 0}`;

    const reset = document.createElement('span');
    reset.className = 'workshop-page__personal-tasks-summary-reset';
    reset.textContent = period?.resetLabel ?? '';

    row.append(name, count, reset);
    return row;
  }

  renderPopup(personalTasks) {
    if (!this.refs.rows) {
      return;
    }

    const period = personalTasks?.[this.selectedPeriodType];

    for (const [periodType, button] of this.refs.tabButtons.entries()) {
      const selected = periodType === this.selectedPeriodType;
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.tabIndex = selected ? 0 : -1;
    }

    this.refs.periodLabel.textContent = period
      ? `${period.completedTasks}/${period.totalTasks} done, ${period.resetLabel}`
      : '';

    if (!period) {
      const empty = document.createElement('div');
      empty.className = 'workshop-page__personal-tasks-empty';
      empty.textContent = 'no tasks';
      this.refs.rows.replaceChildren(empty);
      return;
    }

    const rows = period.tasks.map((task) => this.createTaskRow(task));
    rows.push(this.createFullClearRow(period));
    this.refs.rows.replaceChildren(...rows);
  }

  createTaskRow(task) {
    const row = document.createElement('div');
    row.className = 'workshop-page__personal-task-row';

    if (task.completed) {
      row.classList.add('is-completed');
    }

    const label = document.createElement('span');
    label.className = 'workshop-page__personal-task-label';
    label.textContent = task.label;

    const progress = document.createElement('span');
    progress.className = 'workshop-page__personal-task-progress';
    progress.textContent = `${task.progressQuantity}/${task.requiredQuantity}`;

    const reward = document.createElement('span');
    reward.className = 'workshop-page__personal-task-reward';
    reward.textContent = task.completed ? 'done' : task.reward?.text ?? '';

    row.append(label, progress, reward);
    return row;
  }

  createFullClearRow(period) {
    const row = document.createElement('div');
    row.className = 'workshop-page__personal-task-row workshop-page__personal-task-row--full';

    if (period.fullClearRewardClaimed) {
      row.classList.add('is-completed');
    }

    const label = document.createElement('span');
    label.className = 'workshop-page__personal-task-label';
    label.textContent = 'all tasks';

    const progress = document.createElement('span');
    progress.className = 'workshop-page__personal-task-progress';
    progress.textContent = `${period.completedTasks}/${period.totalTasks}`;

    const reward = document.createElement('span');
    reward.className = 'workshop-page__personal-task-reward';
    reward.textContent = period.fullClearRewardClaimed
      ? 'done'
      : period.fullClearReward?.text ?? '';

    row.append(label, progress, reward);
    return row;
  }

  applyVisibility() {
    if (this.refs.popup) {
      this.refs.popup.hidden = !this.visible;
    }

    this.refs.openButton?.setAttribute('aria-expanded', this.visible ? 'true' : 'false');
  }
}
