import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceColor } from '../../shared/resourceColor.js';
import {
  createResourceIconLabel,
  setResourceIconText,
} from '../../shared/resourceIconLabel.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { createWorkshopCharacterPortrait } from '../workshopCharacters.js';

const PERSONAL_TASK_RESOURCE_BY_ACTION = new Map([
  ['summon_seeds', 'seed'],
  ['spend_mana', 'mana'],
  ['plant_seeds', 'seed'],
  ['harvest_herbs', 'herb'],
  ['brew_potions', 'potion'],
  ['sell_items', 'coin'],
  ['earn_coin', 'coin'],
]);

const PERSONAL_TASK_ICON_BY_RESOURCE = new Map([
  ['seed', { type: 'item', kind: 'seed' }],
  ['mana', { type: 'resource', resource: 'mana' }],
  ['herb', { type: 'item', kind: 'herb', itemKey: 'sageHerb' }],
  ['potion', { type: 'item', kind: 'potion' }],
  ['coin', { type: 'resource', resource: 'coin' }],
]);

export class WorkshopPersonalTasksManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.selectedTab = 'tasks';
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
    this.root.className = 'workshop-page__panel-button workshop-page__personal-tasks';
    this.root.dataset.panelSide = 'left';
    this.root.setAttribute('aria-label', 'personal tasks');

    this.refs.openButton = document.createElement('button');
    this.refs.openButton.className =
      'workshop-page__panel-button-open workshop-page__personal-tasks-open';
    this.refs.openButton.type = 'button';
    this.refs.openButton.setAttribute('aria-haspopup', 'dialog');
    this.refs.openButton.addEventListener('click', () => this.show());

    this.refs.openLabel = document.createElement('span');
    this.refs.openLabel.className =
      'workshop-page__panel-button-label workshop-page__feature-character-label';
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
    this.refs.dialog.setAttribute('aria-label', 'quests');
    this.refs.dialog.setAttribute('aria-modal', 'true');
    this.refs.dialog.setAttribute('role', 'dialog');
    this.refs.dialog.tabIndex = -1;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'quests';

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
    this.refs.tabs.setAttribute('aria-label', 'quest view');
    this.refs.tabButtons = new Map(
      ['tasks', 'rewards'].map((tabId) => {
        const button = document.createElement('button');
        button.className = 'style-button workshop-page__personal-tasks-tab-button';
        button.type = 'button';
        button.textContent = tabId;
        button.setAttribute('role', 'tab');
        button.addEventListener('click', () => this.selectTab(tabId));
        return [tabId, button];
      }),
    );
    this.refs.tabs.replaceChildren(...this.refs.tabButtons.values());

    this.refs.dialog.append(title, this.refs.frame, this.refs.closeButton);
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

  selectTab(tabId) {
    if (this.selectedTab === tabId) {
      return;
    }

    this.selectedTab = tabId;
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
    const claimableRewards = this.getVisibleClaimableRewards(personalTasks);
    this.refs.openButton?.setAttribute(
      'aria-label',
      `open quests, daily ${daily?.completedTasks ?? 0}/${daily?.totalTasks ?? 0}, today ${daily?.currentPoints ?? 0}/${daily?.maxPoints ?? 0} points, week ${weekly?.currentPoints ?? 0}/${weekly?.maxPoints ?? 0} points`,
    );
    setNotificationBadge(this.refs.openButton, claimableRewards > 0);
  }

  renderPopup(personalTasks) {
    if (!this.refs.rows) {
      return;
    }

    for (const [tabId, button] of this.refs.tabButtons.entries()) {
      const selected = tabId === this.selectedTab;
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.tabIndex = selected ? 0 : -1;
      setNotificationBadge(
        button,
        tabId === 'rewards' && this.getVisibleClaimableRewards(personalTasks) > 0,
      );
    }

    if (this.selectedTab === 'rewards') {
      this.renderRewardsTab(personalTasks);
      return;
    }

    this.renderTasksTab(personalTasks);
  }

  renderTasksTab(personalTasks) {
    const daily = personalTasks?.daily;

    if (!daily) {
      this.refs.rows.replaceChildren(this.createEmptyRow('no tasks'));
      return;
    }

    const title = document.createElement('div');
    title.className = 'workshop-page__personal-tasks-section-title';
    title.textContent = 'daily quests';

    this.refs.rows.replaceChildren(
      this.createTaskProgressSummary(personalTasks),
      title,
      ...daily.tasks.map((task, index) => this.createTaskRow(task, index + 1)),
    );
  }

  renderRewardsTab(personalTasks) {
    const daily = personalTasks?.daily;
    const weekly = personalTasks?.weekly;

    if (!daily && !weekly) {
      this.refs.rows.replaceChildren(this.createEmptyRow('no rewards'));
      return;
    }

    const sections = [];
    if (daily) {
      sections.push(this.createRewardSection('today', daily));
    }
    if (weekly) {
      sections.push(this.createRewardSection('week', weekly));
    }

    this.refs.rows.replaceChildren(...sections);
  }

  createTaskProgressSummary(personalTasks) {
    const summary = document.createElement('div');
    summary.className = 'workshop-page__personal-tasks-summary';
    summary.append(
      this.createSummaryRow('today', this.formatPointSummary(personalTasks?.daily, 'pts')),
      this.createSummaryRow('week', this.formatPointSummary(personalTasks?.weekly, 'pts')),
    );
    return summary;
  }

  createSummaryRow(labelText, valueText) {
    const row = document.createElement('div');
    row.className = 'workshop-page__personal-tasks-summary-row';

    const label = document.createElement('span');
    label.textContent = labelText;

    const value = document.createElement('span');
    value.textContent = valueText;

    row.append(label, value);
    return row;
  }

  createTaskRow(task, index) {
    const root = document.createElement('div');
    root.className = 'workshop-page__personal-task';

    if (task.completed) {
      root.classList.add('is-completed');
    }

    const row = document.createElement('div');
    row.className = 'workshop-page__personal-task-row';

    const number = document.createElement('span');
    number.className = 'workshop-page__personal-task-number';
    number.textContent = `${index}.`;

    const label = document.createElement('span');
    label.className = 'workshop-page__personal-task-label';

    const points = document.createElement('span');
    points.className = 'workshop-page__personal-task-points';
    points.textContent = `+${task.pointValue ?? 0} pts`;

    const taskResource = this.getTaskResource(task);
    const activeTaskResource = task.completed ? null : taskResource;
    this.setTaskIconText(label, task.label, taskResource);
    setResourceColor(label, activeTaskResource);

    row.append(number, label, points);

    const detail = document.createElement('div');
    detail.className = 'workshop-page__personal-task-detail';

    const progress = document.createElement('span');
    progress.className = 'workshop-page__personal-task-progress';
    progress.textContent = task.completed
      ? 'done'
      : `${task.progressQuantity}/${task.requiredQuantity}`;
    setResourceColor(progress, activeTaskResource);

    detail.append(
      progress,
      this.createProgressBar(
        this.getProgressWidth(task.progressQuantity, task.requiredQuantity, task.completed),
        'workshop-page__personal-task-bar',
      ),
    );

    root.append(row, detail);
    return root;
  }

  createRewardSection(titleText, period) {
    const section = document.createElement('section');
    section.className = 'workshop-page__personal-task-reward-section';

    const title = document.createElement('div');
    title.className = 'workshop-page__personal-task-reward-title';
    title.textContent = titleText;

    const status = document.createElement('div');
    status.className = 'workshop-page__personal-task-reward-status';
    status.textContent = `${this.formatPointSummary(period, 'points')}, ${period.resetLabel}`;

    const rewards = document.createElement('div');
    rewards.className = 'workshop-page__personal-task-milestones';
    rewards.replaceChildren(
      ...(period.rewards ?? []).map((reward) =>
        this.createMilestoneRow(period.periodType, reward),
      ),
    );

    section.append(
      title,
      status,
      this.createProgressBar(
        this.getProgressWidth(period.currentPoints, period.maxPoints),
        'workshop-page__personal-task-period-bar',
      ),
      rewards,
    );
    return section;
  }

  createMilestoneRow(periodType, milestone) {
    const row = document.createElement('div');
    row.className = 'workshop-page__personal-task-milestone';

    if (milestone.claimed) {
      row.classList.add('is-claimed');
    } else if (milestone.claimable) {
      row.classList.add('is-claimable');
    }

    const threshold = document.createElement('span');
    threshold.className = 'workshop-page__personal-task-milestone-threshold';
    threshold.textContent = String(milestone.threshold);

    const reward = document.createElement('span');
    reward.className = 'workshop-page__personal-task-milestone-reward';
    setResourceIconText(reward, milestone.reward?.text || 'reward');
    setResourceColor(reward, milestone.claimed ? null : this.getRewardResource(milestone.reward));

    const status = milestone.claimable
      ? this.createMilestoneClaimButton(periodType, milestone)
      : document.createElement('span');
    status.classList.add('workshop-page__personal-task-milestone-status');

    if (!milestone.claimable) {
      status.textContent = milestone.claimed ? 'claimed' : 'locked';
    }

    row.append(threshold, reward, status);
    return row;
  }

  createMilestoneClaimButton(periodType, milestone) {
    const button = document.createElement('button');
    button.className =
      'style-button workshop-page__personal-task-milestone-claim';
    button.type = 'button';
    button.textContent = 'claim';
    button.dataset.personalTaskPeriodType = periodType;
    button.dataset.personalTaskThreshold = String(milestone.threshold);
    button.setAttribute(
      'aria-label',
      `claim ${milestone.reward?.text ?? 'reward'} from ${periodType} ${milestone.threshold} point reward`,
    );
    button.addEventListener('click', () => {
      this.gameplayFacade?.claimPersonalTaskMilestoneReward?.(
        periodType,
        milestone.threshold,
      );
    });
    setNotificationBadge(button, true);
    return button;
  }

  createProgressBar(width, className) {
    const progress = document.createElement('div');
    progress.className = `style-progress ${className}`;
    progress.setAttribute('aria-hidden', 'true');

    const fill = document.createElement('span');
    fill.className = 'style-progress__fill workshop-page__personal-task-fill';
    fill.style.width = width;

    progress.append(fill);
    return progress;
  }

  createEmptyRow(text) {
    const empty = document.createElement('div');
    empty.className = 'workshop-page__personal-tasks-empty';
    empty.textContent = text;
    return empty;
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

  formatPointSummary(period, unit = 'points') {
    return `${period?.currentPoints ?? 0}/${period?.maxPoints ?? 0} ${unit}`;
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

  getRewardResource(reward) {
    const hasCoin = Math.max(0, Math.floor(Number(reward?.coin) || 0)) > 0;
    const hasCrystal = Math.max(0, Math.floor(Number(reward?.crystal) || 0)) > 0;

    if (hasCoin && !hasCrystal) {
      return 'coin';
    }

    if (hasCrystal && !hasCoin) {
      return 'crystal';
    }

    return null;
  }

  getVisibleClaimableRewards(personalTasks) {
    if (Number.isFinite(personalTasks?.claimableRewards)) {
      return Math.max(0, Math.floor(personalTasks.claimableRewards));
    }

    return ['daily', 'weekly'].reduce(
      (total, periodType) =>
        total + this.getPeriodVisibleClaimableRewards(personalTasks?.[periodType]),
      0,
    );
  }

  getPeriodVisibleClaimableRewards(period) {
    return (period?.rewards ?? period?.milestones ?? []).filter(
      (reward) => reward.claimable === true,
    ).length;
  }

  applyVisibility() {
    if (this.refs.popup) {
      this.refs.popup.hidden = !this.visible;
    }

    this.refs.openButton?.setAttribute('aria-expanded', this.visible ? 'true' : 'false');
  }
}
