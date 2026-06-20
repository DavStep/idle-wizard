import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceColor } from '../../shared/resourceColor.js';
import {
  createResourceIconLabel,
  setResourceIconText,
} from '../../shared/resourceIconLabel.js';
import { createWorkshopCharacterPortrait } from '../workshopCharacters.js';

const PERSONAL_TASK_RESOURCE_BY_ACTION = new Map([
  ['summon_seeds', 'seed'],
  ['spend_mana', 'mana'],
  ['plant_seeds', 'seed'],
  ['harvest_herbs', 'herb'],
  ['brew_potions', 'potion'],
  ['sell_items', 'gold'],
  ['earn_gold', 'gold'],
]);

const PERSONAL_TASK_ICON_BY_RESOURCE = new Map([
  ['seed', { type: 'item', kind: 'seed' }],
  ['mana', { type: 'resource', resource: 'mana' }],
  ['herb', { type: 'item', kind: 'herb', itemKey: 'sageHerb' }],
  ['potion', { type: 'item', kind: 'potion' }],
  ['gold', { type: 'resource', resource: 'gold' }],
]);

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
    this.root.className = 'workshop-page__personal-tasks';
    this.root.setAttribute('aria-label', 'personal tasks');

    this.refs.openButton = document.createElement('button');
    this.refs.openButton.className = 'workshop-page__personal-tasks-open';
    this.refs.openButton.type = 'button';
    this.refs.openButton.setAttribute('aria-haspopup', 'dialog');
    this.refs.openButton.addEventListener('click', () => this.show());

    this.refs.openLabel = document.createElement('span');
    this.refs.openLabel.className = 'workshop-page__feature-character-label';
    this.refs.openLabel.textContent = 'tasks';

    this.refs.openButton.append(
      createWorkshopCharacterPortrait(
        'personalTasks',
        'workshop-page__personal-tasks-character',
      ),
      this.refs.openLabel,
    );

    this.root.append(this.refs.openButton);
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

    this.refs.header = document.createElement('div');
    this.refs.header.className = 'workshop-page__personal-tasks-header';
    this.refs.header.append(
      createWorkshopCharacterPortrait(
        'personalTasks',
        'workshop-page__personal-tasks-dialog-character',
      ),
      this.refs.periodLabel,
    );

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
      this.refs.header,
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

    this.renderCharacter(personalTasks);

    if (this.visible) {
      this.renderPopup(personalTasks);
    }
  }

  renderCharacter(personalTasks) {
    const daily = personalTasks?.daily;
    const weekly = personalTasks?.weekly;
    this.refs.openButton?.setAttribute(
      'aria-label',
      `open personal tasks, daily ${daily?.completedTasks ?? 0}/${daily?.totalTasks ?? 0}, weekly ${weekly?.completedTasks ?? 0}/${weekly?.totalTasks ?? 0}`,
    );
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
    const root = document.createElement('div');
    root.className = 'workshop-page__personal-task';

    const row = document.createElement('div');
    row.className = 'workshop-page__personal-task-row';

    if (task.completed) {
      root.classList.add('is-completed');
      row.classList.add('is-completed');
    }

    const label = document.createElement('span');
    label.className = 'workshop-page__personal-task-label';

    const progress = document.createElement('span');
    progress.className = 'workshop-page__personal-task-progress';
    progress.textContent = `${task.progressQuantity}/${task.requiredQuantity}`;

    const reward = document.createElement('span');
    reward.className = 'workshop-page__personal-task-reward';

    const taskResource = this.getTaskResource(task);
    const activeTaskResource = task.completed ? null : taskResource;
    this.setTaskIconText(label, task.label, taskResource);
    setResourceIconText(reward, task.completed ? 'done' : task.reward?.text ?? '');
    setResourceColor(label, activeTaskResource);
    setResourceColor(progress, activeTaskResource);
    setResourceColor(reward, task.completed ? null : this.getRewardResource(task.reward));

    const progressBar = this.createProgressBar(
      this.getProgressWidth(task.progressQuantity, task.requiredQuantity, task.completed),
    );

    row.append(label, progress, reward);
    root.append(row, progressBar);
    return root;
  }

  createFullClearRow(period) {
    const root = document.createElement('div');
    root.className = 'workshop-page__personal-task workshop-page__personal-task--full';

    const row = document.createElement('div');
    row.className = 'workshop-page__personal-task-row workshop-page__personal-task-row--full';

    if (period.fullClearRewardClaimed) {
      root.classList.add('is-completed');
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
    setResourceIconText(
      reward,
      period.fullClearRewardClaimed ? 'done' : period.fullClearReward?.text ?? '',
    );

    setResourceColor(reward, this.getFullClearRewardResource(period));

    const progressBar = this.createProgressBar(
      this.getProgressWidth(
        period.completedTasks,
        period.totalTasks,
        period.fullClearRewardClaimed,
      ),
    );

    row.append(label, progress, reward);
    root.append(row, progressBar);
    return root;
  }

  createProgressBar(width) {
    const progress = document.createElement('div');
    progress.className = 'style-progress workshop-page__personal-task-bar';
    progress.setAttribute('aria-hidden', 'true');

    const fill = document.createElement('span');
    fill.className = 'style-progress__fill workshop-page__personal-task-fill';
    fill.style.width = width;

    progress.append(fill);
    return progress;
  }

  getProgressWidth(progressQuantity, requiredQuantity, completed = false) {
    if (completed) {
      return '100%';
    }

    const progress = Number(progressQuantity);
    const required = Number(requiredQuantity);

    if (!Number.isFinite(progress) || !Number.isFinite(required) || required <= 0) {
      return '0%';
    }

    return `${Math.max(0, Math.min(1, progress / required)) * 100}%`;
  }

  getTaskResource(task) {
    return PERSONAL_TASK_RESOURCE_BY_ACTION.get(task?.actionType) ?? null;
  }

  setTaskIconText(label, text, resource) {
    label.textContent = text;
    const icon = PERSONAL_TASK_ICON_BY_RESOURCE.get(resource);

    if (!icon) {
      return;
    }

    if (icon.type === 'item') {
      setItemIconLabel(label, icon.kind, icon.itemKey);
      return;
    }

    label.replaceChildren(
      createResourceIconLabel(icon.resource, ''),
      document.createTextNode(text),
    );
  }

  getFullClearRewardResource(period) {
    if (period?.fullClearRewardClaimed) {
      return null;
    }

    return this.getRewardResource(period?.fullClearReward);
  }

  getRewardResource(reward) {
    const hasGold = Math.max(0, Math.floor(Number(reward?.gold) || 0)) > 0;
    const hasCrystal = Math.max(0, Math.floor(Number(reward?.crystal) || 0)) > 0;

    if (hasGold && !hasCrystal) {
      return 'gold';
    }

    if (hasCrystal && !hasGold) {
      return 'crystal';
    }

    return null;
  }

  applyVisibility() {
    if (this.refs.popup) {
      this.refs.popup.hidden = !this.visible;
    }

    this.refs.openButton?.setAttribute('aria-expanded', this.visible ? 'true' : 'false');
  }
}
