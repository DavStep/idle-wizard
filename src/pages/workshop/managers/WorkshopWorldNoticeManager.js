import { setResourceColor } from '../../shared/resourceColor.js';
import { createResourceIconLabel } from '../../shared/resourceIconLabel.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { createWorkshopCharacterPortrait } from '../workshopCharacters.js';

const WORLD_NOTICE_TABS = [
  { id: 'tasks', label: 'tasks' },
  { id: 'leaderboard', label: 'leaderboard' },
  { id: 'rewards', label: 'rewards' },
];
const DEFAULT_WORLD_NOTICE_TAB_ID = 'tasks';
const WORLD_NOTICE_DEFAULT_QUALIFICATION_POINTS = 2_000;
const WORLD_NOTICE_RESOURCE_BY_ACTION = new Map([
  ['brew_potions', 'potion'],
  ['donate_coin', 'coin'],
  ['earn_coin', 'coin'],
  ['harvest_herbs', 'herb'],
  ['sell_items', 'coin'],
  ['summon_seeds', 'seed'],
]);

export class WorkshopWorldNoticeManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.selectedTabId = DEFAULT_WORLD_NOTICE_TAB_ID;
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
    this.root.className = 'workshop-page__panel-button workshop-page__world-notice';
    this.root.dataset.panelSide = 'right';
    this.root.setAttribute('aria-label', 'world event');

    this.refs.openButton = document.createElement('button');
    this.refs.openButton.className =
      'workshop-page__panel-button-open workshop-page__world-notice-open';
    this.refs.openButton.type = 'button';
    this.refs.openButton.setAttribute('aria-haspopup', 'dialog');
    this.refs.openButton.addEventListener('click', () => this.show());

    this.refs.openLabel = document.createElement('span');
    this.refs.openLabel.className =
      'workshop-page__panel-button-label workshop-page__feature-character-label';
    this.refs.openLabel.textContent = 'event';

    this.refs.openTimer = document.createElement('span');
    this.refs.openTimer.className =
      'workshop-page__panel-button-timer workshop-page__feature-character-timer';
    this.refs.openTimer.hidden = true;

    this.refs.openButton.append(
      createWorkshopCharacterPortrait(
        'worldNotice',
        'workshop-page__world-notice-character',
      ),
      this.refs.openLabel,
      this.refs.openTimer,
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
    popup.className = 'workshop-page__world-notice-popup';
    popup.hidden = true;
    popup.addEventListener('click', this.handlePopupClick);

    this.refs.panel = document.createElement('section');
    this.refs.panel.className = 'workshop-page__world-notice-panel';
    this.refs.panel.setAttribute('aria-label', 'world event');
    this.refs.panel.setAttribute('aria-modal', 'true');
    this.refs.panel.setAttribute('role', 'dialog');
    this.refs.panel.tabIndex = -1;

    this.refs.dialog = document.createElement('section');
    this.refs.dialog.className = 'workshop-page__world-notice-dialog style-dialog';

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'world event';

    this.refs.closeButton = document.createElement('button');
    this.refs.closeButton.className = 'style-button workshop-page__world-notice-close';
    this.refs.closeButton.type = 'button';
    this.refs.closeButton.textContent = 'close';
    this.refs.closeButton.addEventListener('click', () => this.hide());

    this.refs.content = document.createElement('div');
    this.refs.content.className = 'workshop-page__world-notice-content';

    this.refs.dialog.append(title, this.refs.closeButton, this.refs.content);
    this.refs.tabs = this.createTabs();
    this.refs.panel.append(this.refs.dialog, this.refs.tabs);
    popup.append(this.refs.panel);

    return popup;
  }

  createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'workshop-page__world-notice-tabs';
    tabs.setAttribute('aria-label', 'world event tabs');
    tabs.setAttribute('role', 'tablist');
    this.refs.tabButtons = new Map();

    for (const tab of WORLD_NOTICE_TABS) {
      const button = document.createElement('button');
      button.className = 'style-button workshop-page__world-notice-tab-button';
      button.type = 'button';
      button.textContent = tab.label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.onSelectTab(tab.id));
      this.refs.tabButtons.set(tab.id, button);
      tabs.append(button);
    }

    return tabs;
  }

  onSelectTab(tabId) {
    if (this.selectedTabId === tabId) {
      return;
    }

    this.selectedTabId = tabId;
    this.renderPopup(this.currentSnapshot?.worldNotice);
  }

  show() {
    if (!this.root || this.root.hidden) {
      return;
    }

    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyVisibility();
    this.renderPopup(this.currentSnapshot?.worldNotice);
    this.refs.panel?.focus();
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
    this.selectedTabId = DEFAULT_WORLD_NOTICE_TAB_ID;
  }

  render(snapshot) {
    if (!this.root) {
      return;
    }

    this.currentSnapshot = snapshot;
    const worldNotice = snapshot?.worldNotice;
    const unlocked = worldNotice?.unlocked === true;
    this.root.hidden = !unlocked;

    if (!unlocked) {
      this.hide();
      return;
    }

    this.renderCharacter(worldNotice.current);

    if (this.visible) {
      this.renderPopup(worldNotice);
    }
  }

  renderCharacter(notice) {
    if (!notice) {
      this.refs.openButton?.setAttribute('aria-label', 'open world event, no event');
      this.renderTimer('');
      setNotificationBadge(this.refs.openButton, false);
      return;
    }

    this.refs.openButton?.setAttribute(
      'aria-label',
      `open world event: ${notice.headline}. ${this.formatNumber(
        notice.leaderboard?.currentPoints,
      )} points. ${notice.resetLabel}`,
    );
    this.renderTimer(notice.resetLabel);
    setNotificationBadge(this.refs.openButton, hasIncompleteNoticeRequests(notice));
  }

  renderTimer(resetLabel) {
    const timerLabel = this.formatTimerLabel(resetLabel);
    if (!this.refs.openTimer) {
      return;
    }

    this.refs.openTimer.textContent = timerLabel;
    this.refs.openTimer.hidden = timerLabel.length === 0;
    this.root?.classList.toggle('has-timer', timerLabel.length > 0);
  }

  formatTimerLabel(resetLabel) {
    return String(resetLabel ?? '')
      .trim()
      .replace(/^resolves\s+/i, '');
  }

  renderPopup(worldNotice) {
    if (!this.refs.content) {
      return;
    }

    this.updateTabs();
    const notice = worldNotice?.current;

    if (!notice) {
      const empty = document.createElement('div');
      empty.className = 'workshop-page__world-notice-empty';
      empty.textContent = 'no event';
      this.refs.content.replaceChildren(empty);
      return;
    }

    if (this.selectedTabId === 'leaderboard') {
      this.renderNoticeContent(notice, this.createLeaderboard(notice.leaderboard));
      return;
    }

    if (this.selectedTabId === 'rewards') {
      this.renderNoticeContent(notice, this.createLeaderboardRewards(notice.leaderboard));
      return;
    }

    this.renderNoticeContent(
      notice,
      this.createBody(notice),
      this.createContributionStatus(notice.leaderboard),
      this.createTaskList(notice),
    );
  }

  renderNoticeContent(notice, ...nodes) {
    this.refs.content.replaceChildren(
      this.createNoticeHeader(notice),
      this.createContentFrame(nodes),
    );
  }

  createContentFrame(nodes = []) {
    const frame = document.createElement('div');
    frame.className = 'workshop-page__world-notice-frame';
    frame.replaceChildren(...nodes.filter(Boolean));
    return frame;
  }

  updateTabs() {
    for (const tab of WORLD_NOTICE_TABS) {
      const selected = this.selectedTabId === tab.id;
      const button = this.refs.tabButtons?.get(tab.id);
      button?.setAttribute('aria-selected', selected ? 'true' : 'false');
      button?.setAttribute('tabindex', selected ? '0' : '-1');
    }
  }

  createNoticeHeader(notice) {
    const header = document.createElement('div');
    header.className = 'workshop-page__world-notice-header';

    const portrait = createWorkshopCharacterPortrait(
      'worldNotice',
      'workshop-page__world-notice-dialog-character',
    );

    const copy = document.createElement('div');
    copy.className = 'workshop-page__world-notice-header-copy';

    const headline = document.createElement('div');
    headline.className = 'workshop-page__world-notice-headline';
    headline.textContent = notice.headline;

    const meta = document.createElement('div');
    meta.className = 'workshop-page__world-notice-meta';
    meta.append(
      this.createNoticeMetaRow(
        'points',
        this.formatPointCount(notice.leaderboard?.currentPoints),
      ),
      this.createNoticeMetaRow('resolves', this.formatTimerLabel(notice.resetLabel)),
    );

    copy.append(headline, meta);
    header.append(portrait, copy);
    return header;
  }

  createNoticeMetaRow(label, value) {
    const row = document.createElement('span');
    row.className = 'workshop-page__world-notice-meta-row';

    const key = document.createElement('span');
    key.className = 'workshop-page__world-notice-meta-key';
    key.textContent = label;

    const val = document.createElement('span');
    val.className = 'workshop-page__world-notice-meta-value';
    val.textContent = value;

    row.append(key, val);
    return row;
  }

  createBody(notice) {
    const body = document.createElement('div');
    body.className = 'workshop-page__world-notice-body';

    for (const line of notice.body ?? []) {
      const paragraph = document.createElement('p');
      paragraph.className = 'workshop-page__world-notice-copy';
      paragraph.textContent = line;
      body.append(paragraph);
    }

    return body;
  }

  createContributionStatus(leaderboard = {}) {
    const normalized = this.normalizeLeaderboard(leaderboard);
    const root = document.createElement('div');
    root.className = 'workshop-page__world-notice-contribution';

    const points = document.createElement('span');
    points.textContent = `${this.formatNumber(normalized.currentPoints)}/${this.formatNumber(
      normalized.qualificationPoints,
    )} points`;

    const status = document.createElement('span');
    status.textContent = normalized.qualified
      ? 'qualified'
      : `${this.formatNumber(normalized.remainingQualificationPoints)} points to qualify`;

    root.append(points, status);
    return root;
  }

  createTaskList(notice) {
    const list = document.createElement('div');
    list.className = 'workshop-page__world-notice-requests';

    const title = document.createElement('div');
    title.className = 'workshop-page__world-notice-section-label';
    title.textContent = 'tasks';
    list.append(title);

    for (const request of notice.requests ?? []) {
      list.append(this.createTaskRow(request));
    }

    return list;
  }

  createTaskRow(request) {
    const root = document.createElement('div');
    root.className = 'workshop-page__world-notice-request';

    if (request.completed) {
      root.classList.add('is-completed');
    }

    const row = document.createElement('div');
    row.className = 'workshop-page__world-notice-request-title-row';

    const marker = document.createElement('span');
    marker.className = 'workshop-page__world-notice-request-marker';
    marker.textContent = '-';

    const label = document.createElement('span');
    label.className = 'workshop-page__world-notice-request-title';
    label.textContent = request.label;
    setResourceColor(label, request.completed ? null : this.getTaskResource(request));

    row.append(marker, label);

    const instruction = document.createElement('div');
    instruction.className = 'workshop-page__world-notice-request-instruction';
    instruction.textContent = this.getTaskInstruction(request);

    const detail = document.createElement('div');
    detail.className = 'workshop-page__world-notice-request-points-row';

    const pointValue = document.createElement('span');
    pointValue.className = 'workshop-page__world-notice-request-points';
    pointValue.textContent = `worth ${request.pointText ?? request.actionText ?? '0 points'}`;

    const collectedPoints = document.createElement('span');
    collectedPoints.className = 'workshop-page__world-notice-request-collected';
    collectedPoints.textContent = `earned ${
      request.collectedPointText ?? this.formatPointCount(request.contributionPoints)
    }`;

    if (request.manual && !request.completed) {
      detail.append(pointValue, collectedPoints);
      root.append(row, instruction, detail, this.createRequestAction(request));
    } else {
      detail.append(pointValue, collectedPoints);
      root.append(row, instruction, detail);
    }

    return root;
  }

  createRequestAction(request) {
    if (request.manual && !request.completed) {
      const button = document.createElement('button');
      button.className = 'style-button workshop-page__world-notice-request-action';
      button.type = 'button';
      button.textContent = request.actionText;
      button.disabled = !request.canDonate;
      button.addEventListener('click', () => {
        this.gameplayFacade?.donateWorldNoticeCoin?.(request.requestId);
      });
      return button;
    }

    const action = document.createElement('span');
    action.className = 'workshop-page__world-notice-request-action-text';
    action.textContent = request.actionText;
    return action;
  }

  createLeaderboardRewards(leaderboard = {}) {
    const normalized = this.normalizeLeaderboard(leaderboard);
    const section = document.createElement('div');
    section.className = 'workshop-page__world-notice-rewards';

    const qualification = document.createElement('div');
    qualification.className = 'workshop-page__world-notice-reward-status';
    const label = document.createElement('span');
    label.textContent = 'leaderboard rewards';
    const value = document.createElement('span');
    value.textContent = normalized.qualified
      ? 'qualified'
      : `${this.formatNumber(normalized.remainingQualificationPoints)} points to qualify`;
    qualification.append(label, value);
    section.append(qualification);

    for (const tier of normalized.rewardTiers) {
      const row = document.createElement('div');
      row.className = 'workshop-page__world-notice-reward-row';

      const rank = document.createElement('span');
      rank.className = 'workshop-page__world-notice-reward-rank';
      rank.textContent = tier.rankLabel;

      const reward = document.createElement('span');
      reward.className = 'workshop-page__world-notice-reward-value';
      reward.replaceChildren(...this.createRewardTierParts(tier));

      row.append(rank, reward);
      section.append(row);
    }

    return section;
  }

  createRewardTierParts(tier = {}) {
    const rewards = [
      {
        resource: 'emerald',
        amount: Math.max(0, Math.floor(Number(tier.emerald) || 0)),
      },
      {
        resource: 'crystal',
        amount: Math.max(0, Math.floor(Number(tier.crystal) || 0)),
      },
    ].filter((reward) => reward.amount > 0);

    if (!rewards.length) {
      return [document.createTextNode('none')];
    }

    return rewards.flatMap((reward, index) => {
      const label = document.createElement('span');
      label.className = 'workshop-page__world-notice-reward-resource';
      label.setAttribute('aria-label', `${this.formatNumber(reward.amount)} ${reward.resource}`);

      const amount = document.createElement('span');
      amount.className = 'workshop-page__world-notice-reward-amount';
      amount.textContent = this.formatNumber(reward.amount);

      const icon = createResourceIconLabel(reward.resource, '');
      if (icon.nodeType === 1) {
        icon.classList.add('workshop-page__world-notice-reward-icon');
        icon.setAttribute('aria-hidden', 'true');
      }

      label.append(amount, icon);

      if (index === 0) {
        return [label];
      }

      return [document.createTextNode(' + '), label];
    });
  }

  createLeaderboard(leaderboard = {}) {
    const normalized = this.normalizeLeaderboard(leaderboard);
    const section = document.createElement('div');
    section.className = 'workshop-page__world-notice-leaderboard';

    section.append(this.createLeaderboardRow({ name: 'user', pointsLabel: 'points' }, 0, {
      header: true,
    }));

    for (const [index, entry] of normalized.leaderboardRows.entries()) {
      section.append(this.createLeaderboardRow(entry, index));
    }

    const qualification = document.createElement('div');
    qualification.className = 'workshop-page__world-notice-leaderboard-note';
    qualification.textContent = normalized.qualified
      ? 'qualified for leaderboard rewards'
      : `${this.formatNumber(normalized.remainingQualificationPoints)} points to qualify`;
    section.append(qualification);

    return section;
  }

  createLeaderboardRow(entry = {}, index = 0, { header = false } = {}) {
    const row = document.createElement('div');
    row.className = 'workshop-page__row workshop-page__leaderboard-row';

    if (header) {
      row.classList.add('workshop-page__leaderboard-header');
    } else if (entry.current) {
      row.classList.add('workshop-page__leaderboard-current');
    }

    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = header
      ? entry.name
      : `${entry.rankLabel || `${index + 1}.`} ${entry.name || 'you'}`;

    const val = document.createElement('span');
    val.className = 'row_val';
    val.textContent = header
      ? entry.pointsLabel
      : this.formatPointCount(entry.points);

    row.append(key, val);
    return row;
  }

  applyVisibility() {
    if (this.refs.popup) {
      this.refs.popup.hidden = !this.visible;
    }

    this.refs.openButton?.setAttribute('aria-expanded', this.visible ? 'true' : 'false');
  }

  formatNumber(value) {
    return String(Math.max(0, Math.floor(Number(value) || 0)));
  }

  formatPointCount(value) {
    const points = Math.max(0, Math.floor(Number(value) || 0));
    return `${this.formatNumber(points)} point${points === 1 ? '' : 's'}`;
  }

  getTaskResource(request) {
    return WORLD_NOTICE_RESOURCE_BY_ACTION.get(request?.actionType) ?? null;
  }

  getTaskInstruction(request = {}) {
    if (typeof request.instructionText === 'string' && request.instructionText.trim()) {
      return request.instructionText.trim();
    }

    const required = Math.max(1, Math.floor(Number(request.requiredQuantity) || 1));
    const progress = Math.max(
      0,
      Math.min(required, Math.floor(Number(request.progressQuantity) || 0)),
    );
    const target = this.getTaskTargetLabel(request.actionType, required);

    return `${target} (${this.formatNumber(progress)}/${this.formatNumber(required)})`;
  }

  getTaskTargetLabel(actionType, requiredQuantity) {
    const amount = this.formatNumber(requiredQuantity);

    switch (actionType) {
      case 'brew_potions':
        return `brew ${amount} potion${requiredQuantity === 1 ? '' : 's'}`;
      case 'complete_research':
        return `complete ${amount} research`;
      case 'donate_coin':
        return `send ${amount} coin`;
      case 'earn_coin':
        return `earn ${amount} coin`;
      case 'harvest_herbs':
        return `harvest ${amount} herb${requiredQuantity === 1 ? '' : 's'}`;
      case 'sell_items':
        return `sell ${amount} item${requiredQuantity === 1 ? '' : 's'}`;
      case 'summon_seeds':
        return `summon ${amount} seed${requiredQuantity === 1 ? '' : 's'}`;
      default:
        return `make ${amount} progress`;
    }
  }

  normalizeLeaderboard(leaderboard = {}) {
    const currentPoints = Math.max(0, Math.floor(Number(leaderboard.currentPoints) || 0));
    const qualificationPoints = Math.max(
      1,
      Math.floor(Number(leaderboard.qualificationPoints) || WORLD_NOTICE_DEFAULT_QUALIFICATION_POINTS),
    );

    return {
      currentPoints,
      qualificationPoints,
      qualified: Boolean(leaderboard.qualified) || currentPoints >= qualificationPoints,
      remainingQualificationPoints: Math.max(0, qualificationPoints - currentPoints),
      rewardTiers: Array.isArray(leaderboard.rewardTiers)
        ? leaderboard.rewardTiers
        : [],
      leaderboardRows: this.normalizeLeaderboardRows(leaderboard.rows, currentPoints),
    };
  }

  normalizeLeaderboardRows(rows, currentPoints) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return [
        {
          rankLabel: '-',
          name: 'you',
          points: currentPoints,
          current: true,
        },
      ];
    }

    return rows.map((row, index) => ({
      rankLabel: String(row?.rankLabel ?? `${index + 1}.`),
      name: String(row?.name ?? 'wizard'),
      points: Math.max(0, Math.floor(Number(row?.points) || 0)),
      current: row?.current === true,
    }));
  }
}

function hasIncompleteNoticeRequests(notice) {
  const requests = notice?.requests;

  if (Array.isArray(requests) && requests.length > 0) {
    return requests.some((request) => request?.completed !== true);
  }

  return Number(notice?.completedRequests ?? 0) < Number(notice?.totalRequests ?? 0);
}
