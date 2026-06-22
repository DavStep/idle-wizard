import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { createWorkshopCharacterPortrait } from '../workshopCharacters.js';

const WORLD_NOTICE_TABS = [
  { id: 'requests', label: 'requests' },
  { id: 'rewards', label: 'rewards' },
  { id: 'archive', label: 'archive' },
];
const DEFAULT_WORLD_NOTICE_TAB_ID = 'requests';
const WORLD_NOTICE_DEFAULT_QUALIFICATION_POINTS = 2_000;

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
    this.root.setAttribute('aria-label', 'world notice');

    this.refs.openButton = document.createElement('button');
    this.refs.openButton.className =
      'workshop-page__panel-button-open workshop-page__world-notice-open';
    this.refs.openButton.type = 'button';
    this.refs.openButton.setAttribute('aria-haspopup', 'dialog');
    this.refs.openButton.addEventListener('click', () => this.show());

    this.refs.openLabel = document.createElement('span');
    this.refs.openLabel.className =
      'workshop-page__panel-button-label workshop-page__feature-character-label';
    this.refs.openLabel.textContent = 'notice';

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
    this.refs.panel.setAttribute('aria-label', 'world notice');
    this.refs.panel.setAttribute('aria-modal', 'true');
    this.refs.panel.setAttribute('role', 'dialog');
    this.refs.panel.tabIndex = -1;

    this.refs.dialog = document.createElement('section');
    this.refs.dialog.className = 'workshop-page__world-notice-dialog style-dialog';

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'world notice';

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
    tabs.setAttribute('aria-label', 'world notice tabs');
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
      this.refs.openButton?.setAttribute('aria-label', 'open world notice, no notice');
      this.renderTimer('');
      setNotificationBadge(this.refs.openButton, false);
      return;
    }

    this.refs.openButton?.setAttribute(
      'aria-label',
      `open world notice, ${notice.headline}, ${notice.completedRequests}/${notice.totalRequests}, ${notice.responseLabel}, ${notice.resetLabel}`,
    );
    this.renderTimer(notice.resetLabel);
    setNotificationBadge(this.refs.openButton, hasIncompleteNoticeRequests(notice));
  }

  renderTimer(resetLabel) {
    const timerLabel = String(resetLabel ?? '').trim();
    if (!this.refs.openTimer) {
      return;
    }

    this.refs.openTimer.textContent = timerLabel;
    this.refs.openTimer.hidden = timerLabel.length === 0;
    this.root?.classList.toggle('has-timer', timerLabel.length > 0);
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
      empty.textContent = 'no notice';
      this.refs.content.replaceChildren(empty);
      return;
    }

    if (this.selectedTabId === 'rewards') {
      this.refs.content.replaceChildren(
        this.createNoticeHeader(notice),
        this.createLeaderboardRewards(notice.leaderboard),
      );
      return;
    }

    if (this.selectedTabId === 'archive') {
      this.refs.content.replaceChildren(
        this.createNoticeHeader(notice),
        this.createArchive(worldNotice.archive),
      );
      return;
    }

    this.refs.content.replaceChildren(
      this.createNoticeHeader(notice),
      this.createBody(notice),
      this.createContributionStatus(notice.leaderboard),
      this.createRequestList(notice),
    );
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
    meta.textContent = `${notice.completedRequests}/${notice.totalRequests} answers, ${notice.responseLabel}, ${notice.resetLabel}`;

    copy.append(headline, meta);
    header.append(portrait, copy);
    return header;
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
      : `${this.formatNumber(normalized.remainingQualificationPoints)} to qualify`;

    root.append(points, status);
    return root;
  }

  createRequestList(notice) {
    const list = document.createElement('div');
    list.className = 'workshop-page__world-notice-requests';

    for (const request of notice.requests ?? []) {
      list.append(this.createRequestRow(request));
    }

    return list;
  }

  createRequestRow(request) {
    const root = document.createElement('div');
    root.className = 'workshop-page__world-notice-request';

    if (request.completed) {
      root.classList.add('is-completed');
    }

    const row = document.createElement('div');
    row.className = 'workshop-page__world-notice-request-row';

    const label = document.createElement('span');
    label.className = 'workshop-page__world-notice-request-label';
    label.textContent = request.label;

    const progress = document.createElement('span');
    progress.className = 'workshop-page__world-notice-request-progress';
    progress.textContent = `${request.progressQuantity}/${request.requiredQuantity}`;

    row.append(label, progress, this.createRequestAction(request));
    root.append(row, this.createProgressBar(request.progress, request.completed));
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
    qualification.textContent = normalized.qualified
      ? `${this.formatNumber(normalized.currentPoints)} points, qualified`
      : `${this.formatNumber(normalized.currentPoints)}/${this.formatNumber(
          normalized.qualificationPoints,
        )} points, not qualified`;
    section.append(qualification);

    for (const tier of normalized.rewardTiers) {
      const row = document.createElement('div');
      row.className = 'workshop-page__world-notice-reward-row';

      const rank = document.createElement('span');
      rank.className = 'workshop-page__world-notice-reward-rank';
      rank.textContent = tier.rankLabel;

      const reward = document.createElement('span');
      reward.className = 'workshop-page__world-notice-reward-value';
      reward.textContent = this.formatRewardTier(tier);

      row.append(rank, reward);
      section.append(row);
    }

    return section;
  }

  formatRewardTier(tier = {}) {
    const parts = [];
    const emerald = Math.max(0, Math.floor(Number(tier.emerald) || 0));
    const crystal = Math.max(0, Math.floor(Number(tier.crystal) || 0));

    if (emerald > 0) {
      parts.push(`${emerald} emerald`);
    }

    if (crystal > 0) {
      parts.push(`${crystal} crystal`);
    }

    return parts.length ? parts.join(', ') : 'none';
  }

  createProgressBar(progressValue, completed = false) {
    const progress = document.createElement('div');
    progress.className = 'style-progress workshop-page__world-notice-request-bar';
    progress.setAttribute('aria-hidden', 'true');

    const fill = document.createElement('span');
    fill.className = 'style-progress__fill workshop-page__world-notice-request-fill';
    fill.style.width = completed
      ? '100%'
      : `${Math.max(0, Math.min(1, Number(progressValue) || 0)) * 100}%`;

    progress.append(fill);
    return progress;
  }

  createArchive(archive = []) {
    const section = document.createElement('div');
    section.className = 'workshop-page__world-notice-archive';

    const title = document.createElement('div');
    title.className = 'workshop-page__world-notice-section-label';
    title.textContent = 'past notices';
    section.append(title);

    if (!archive.length) {
      const empty = document.createElement('div');
      empty.className = 'workshop-page__world-notice-empty';
      empty.textContent = 'none yet';
      section.append(empty);
      return section;
    }

    for (const entry of archive.slice(0, 4)) {
      const row = document.createElement('div');
      row.className = 'workshop-page__world-notice-archive-row';

      const headline = document.createElement('span');
      headline.className = 'workshop-page__world-notice-archive-headline';
      headline.textContent = entry.headline;

      const response = document.createElement('span');
      response.className = 'workshop-page__world-notice-archive-response';
      response.textContent = entry.contributionPoints
        ? `${entry.responseLabel}, ${this.formatNumber(entry.contributionPoints)} points`
        : entry.responseLabel;

      row.append(headline, response);
      section.append(row);
    }

    return section;
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
    };
  }
}

function hasIncompleteNoticeRequests(notice) {
  const requests = notice?.requests;

  if (Array.isArray(requests) && requests.length > 0) {
    return requests.some((request) => request?.completed !== true);
  }

  return Number(notice?.completedRequests ?? 0) < Number(notice?.totalRequests ?? 0);
}
