import { normalizePlayerCharacter } from '../../../player/playerCharacters.js';
import { normalizeTradeAllianceTagColor } from '../../../shared/tradeAllianceTagColors.js';
import { normalizeAllianceTag } from '../../shared/allianceTagLabel.js';
import { createAmountSelectionRow } from '../../shared/AmountSelectionRow.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceColor } from '../../shared/resourceColor.js';
import {
  createResourceIconLabel,
  setResourceIconText,
} from '../../shared/resourceIconLabel.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import {
  createWorkshopLeaderboardRow,
  createWorkshopLeaderboardUserLabel,
} from './WorkshopLeaderboardRowRenderer.js';
import { createWorkshopCharacterPortrait } from '../workshopCharacters.js';

const WORLD_NOTICE_TABS = [
  { id: 'tasks', label: 'quests' },
  { id: 'leaderboard', label: 'leaderboard' },
  { id: 'rewards', label: 'rewards' },
];
const DEFAULT_WORLD_NOTICE_TAB_ID = 'tasks';
const WORLD_NOTICE_DEFAULT_QUALIFICATION_POINTS = 2_000;

export class WorkshopWorldNoticeManager {
  constructor({
    gameplayFacade,
    playerFacade,
    worldEventLeaderboardFacade,
    onOpenPlayerInfo,
    onRequirePlayerSurfaceAccess,
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.playerFacade = playerFacade;
    this.worldEventLeaderboardFacade = worldEventLeaderboardFacade;
    this.onOpenPlayerInfo = onOpenPlayerInfo;
    this.onRequirePlayerSurfaceAccess = onRequirePlayerSurfaceAccess;
    this.root = null;
    this.unsubscribe = null;
    this.unsubscribePlayer = null;
    this.unsubscribeWorldEventLeaderboard = null;
    this.refs = {};
    this.visible = false;
    this.donateVisible = false;
    this.donateRequestId = null;
    this.donateOptionKey = null;
    this.donateAmount = 1;
    this.donateStatusText = '';
    this.selectedTabId = DEFAULT_WORLD_NOTICE_TAB_ID;
    this.renderedNoticeScrollKey = null;
    this.previousFocus = null;
    this.previousDonateFocus = null;
    this.currentSnapshot = null;
    this.playerSnapshot = this.playerFacade?.getSnapshot?.() ?? null;
    this.worldEventLeaderboardSnapshot =
      this.worldEventLeaderboardFacade?.getSnapshot?.() ?? null;
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
      if (this.donateVisible) {
        this.hideDonateDialog();
        return;
      }

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
    this.unsubscribePlayer =
      this.playerFacade?.subscribe?.((snapshot) => {
        this.playerSnapshot = snapshot ?? null;
        if (this.visible) {
          this.renderPopup(this.currentSnapshot?.worldNotice);
        }
      }) ?? null;
    this.unsubscribeWorldEventLeaderboard =
      this.worldEventLeaderboardFacade?.subscribe?.((snapshot) => {
        this.worldEventLeaderboardSnapshot = snapshot ?? null;
        if (this.visible) {
          this.renderPopup(this.currentSnapshot?.worldNotice);
        }
      }) ?? null;
    this.playerSnapshot = this.playerFacade?.getSnapshot?.() ?? this.playerSnapshot;
    this.worldEventLeaderboardSnapshot =
      this.worldEventLeaderboardFacade?.getSnapshot?.() ??
      this.worldEventLeaderboardSnapshot;
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
    this.refs.donatePanel = this.createDonateDialog();
    popup.append(this.refs.panel, this.refs.donatePanel);

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

  createDonateDialog() {
    const panel = document.createElement('section');
    panel.className = 'workshop-page__world-notice-donate-panel';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'donate to event quest');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('role', 'dialog');
    panel.tabIndex = -1;

    const dialog = document.createElement('section');
    dialog.className = 'workshop-page__world-notice-donate-dialog style-dialog';

    this.refs.donateTitle = document.createElement('div');
    this.refs.donateTitle.className = 'style-box__title';
    this.refs.donateTitle.textContent = 'donate';

    this.refs.donateCloseButton = document.createElement('button');
    this.refs.donateCloseButton.className =
      'style-button workshop-page__world-notice-donate-close';
    this.refs.donateCloseButton.type = 'button';
    this.refs.donateCloseButton.textContent = 'close';
    this.refs.donateCloseButton.addEventListener('click', () => this.hideDonateDialog());

    this.refs.donateRequestRow = this.createDonateValueRow('quest');
    this.refs.donateGivingRow = this.createDonateValueRow('giving');
    this.refs.donateProgressRow = this.createDonateValueRow('total');
    this.refs.donateAvailableRow = this.createDonateValueRow('owned');
    this.refs.donatePointsRow = this.createDonateValueRow('points');

    this.refs.donateAmountField = createAmountSelectionRow({
      ariaLabel: 'donation amount',
      className: 'workshop-page__world-notice-donate-field',
      inputClassName: 'workshop-page__world-notice-donate-input',
      stepClassName: 'workshop-page__world-notice-donate-step',
      onInput: () => this.onDonateAmountInput(),
      onStep: (delta) => this.onDonateAmountStep(delta),
    });

    const actionRow = document.createElement('div');
    actionRow.className = 'workshop-page__world-notice-donate-action-row';

    this.refs.donateConfirmButton = document.createElement('button');
    this.refs.donateConfirmButton.className =
      'style-button workshop-page__world-notice-donate-confirm';
    this.refs.donateConfirmButton.type = 'button';
    this.refs.donateConfirmButton.addEventListener('click', () => this.onConfirmDonate());
    actionRow.append(this.refs.donateConfirmButton);

    this.refs.donateStatus = document.createElement('div');
    this.refs.donateStatus.className = 'workshop-page__world-notice-donate-status';

    dialog.append(
      this.refs.donateTitle,
      this.refs.donateCloseButton,
      this.refs.donateRequestRow.row,
      this.refs.donateGivingRow.row,
      this.refs.donateProgressRow.row,
      this.refs.donateAvailableRow.row,
      this.refs.donatePointsRow.row,
      this.refs.donateAmountField.field,
      actionRow,
      this.refs.donateStatus,
    );
    panel.append(dialog);
    return panel;
  }

  createDonateValueRow(labelText) {
    const row = document.createElement('div');
    row.className = 'workshop-page__world-notice-donate-row';

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = labelText;

    const value = document.createElement('span');
    value.className = 'row_val';

    row.append(label, value);
    return { row, value };
  }

  onSelectTab(tabId) {
    if (this.selectedTabId === tabId) {
      return { ok: true, dialogId: 'worldNotice', tabId };
    }

    if (tabId === 'leaderboard') {
      return this.requirePlayerSurfaceAccess(() => this.selectTab(tabId), {
        dialogId: 'worldEventLeaderboard',
      });
    }

    return this.selectTab(tabId);
  }

  selectTab(tabId) {
    this.selectedTabId = tabId;
    this.renderPopup(this.currentSnapshot?.worldNotice);
    return { ok: true, dialogId: 'worldNotice', tabId };
  }

  requirePlayerSurfaceAccess(open, meta) {
    if (typeof this.onRequirePlayerSurfaceAccess === 'function') {
      return this.onRequirePlayerSurfaceAccess(open, meta);
    }

    return open();
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
    this.renderedNoticeScrollKey = null;
    this.hideDonateDialog({ restoreFocus: false });
    this.applyVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribePlayer?.();
    this.unsubscribeWorldEventLeaderboard?.();
    this.unsubscribe = null;
    this.unsubscribePlayer = null;
    this.unsubscribeWorldEventLeaderboard = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.root?.remove();
    this.refs.popup?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.hideDonateDialog({ restoreFocus: false });
    this.previousFocus = null;
    this.previousDonateFocus = null;
    this.currentSnapshot = null;
    this.playerSnapshot = null;
    this.worldEventLeaderboardSnapshot = null;
    this.selectedTabId = DEFAULT_WORLD_NOTICE_TAB_ID;
    this.renderedNoticeScrollKey = null;
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

    if (this.donateVisible) {
      this.renderDonateDialog();
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
      this.refs.contentFrame = null;
      this.renderedNoticeScrollKey = null;
      this.refs.content.replaceChildren(empty);
      return;
    }

    if (this.selectedTabId === 'leaderboard') {
      this.renderNoticeContent(
        notice,
        this.createLeaderboard(this.getLeaderboardForNotice(notice)),
      );
      return;
    }

    if (this.selectedTabId === 'rewards') {
      this.renderNoticeContent(
        notice,
        this.createLeaderboardRewards(this.getLeaderboardForNotice(notice)),
      );
      return;
    }

    this.renderNoticeContent(
      notice,
      this.createBody(notice),
      this.createContributionStatus(this.getLeaderboardForNotice(notice)),
      this.createTaskList(notice),
    );
  }

  renderNoticeContent(notice, ...nodes) {
    const scrollKey = this.getNoticeScrollKey(notice);
    const previousFrame = this.getNoticeContentFrame();
    const reuseFrame =
      this.renderedNoticeScrollKey === scrollKey &&
      previousFrame &&
      previousFrame.parentNode === this.refs.content;
    const previousScrollTop = reuseFrame
      ? Math.max(0, Number(previousFrame.scrollTop) || 0)
      : 0;
    const header = this.createNoticeHeader(notice);
    const frame = reuseFrame ? previousFrame : this.createContentFrame();

    frame.replaceChildren(...nodes.filter(Boolean));

    if (reuseFrame) {
      const previousHeader = frame.previousElementSibling;

      if (previousHeader?.classList.contains('workshop-page__world-notice-header')) {
        previousHeader.replaceWith(header);
      } else {
        this.refs.content.insertBefore(header, frame);
      }
    } else {
      this.refs.content.replaceChildren(header, frame);
    }

    this.refs.contentFrame = frame;
    this.renderedNoticeScrollKey = scrollKey;
    this.restoreNoticeScrollTop(frame, previousScrollTop);
  }

  createContentFrame(nodes = []) {
    const frame = document.createElement('div');
    frame.className = 'style-dialog-scroll workshop-page__world-notice-frame';
    frame.replaceChildren(...nodes.filter(Boolean));
    return frame;
  }

  getNoticeContentFrame() {
    return (
      this.refs.contentFrame ??
      this.refs.content?.querySelector?.('.workshop-page__world-notice-frame') ??
      null
    );
  }

  getNoticeScrollKey(notice = {}) {
    return [
      this.selectedTabId,
      notice.periodKey ?? '',
      notice.eventId ?? '',
      notice.headline ?? '',
    ].join('|');
  }

  restoreNoticeScrollTop(frame, scrollTop) {
    if (!frame || scrollTop <= 0) {
      return;
    }

    frame.scrollTop = scrollTop;
    const EventCtor = frame.ownerDocument?.defaultView?.Event ?? globalThis.Event;
    frame.dispatchEvent(new EventCtor('scroll'));
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
    points.textContent = `${this.formatNumber(normalized.currentPoints)} points earned`;

    const status = document.createElement('span');
    status.textContent = normalized.qualified
      ? 'qualified'
      : `${this.formatNumber(normalized.remainingQualificationPoints)} points to qualify`;

    root.append(points, status);
    return root;
  }

  getLeaderboardForNotice(notice = {}) {
    const localLeaderboard = notice?.leaderboard ?? {};
    const sharedLeaderboard = this.getSharedLeaderboardForNotice(notice);

    if (!sharedLeaderboard) {
      return localLeaderboard;
    }

    return {
      ...localLeaderboard,
      ...sharedLeaderboard,
      currentPoints: localLeaderboard.currentPoints ?? sharedLeaderboard.currentPoints,
      qualificationPoints:
        localLeaderboard.qualificationPoints ?? sharedLeaderboard.qualificationPoints,
      qualified: localLeaderboard.qualified ?? sharedLeaderboard.qualified,
      remainingQualificationPoints:
        localLeaderboard.remainingQualificationPoints ??
        sharedLeaderboard.remainingQualificationPoints,
      rewardTiers: localLeaderboard.rewardTiers ?? sharedLeaderboard.rewardTiers,
    };
  }

  getSharedLeaderboardForNotice(notice = {}) {
    const snapshot = this.worldEventLeaderboardSnapshot;

    if (
      !snapshot ||
      snapshot.periodKey !== notice.periodKey ||
      snapshot.eventId !== notice.eventId
    ) {
      return null;
    }

    const rows = Array.isArray(snapshot.topWorldEventUsers)
      ? snapshot.topWorldEventUsers
      : Array.isArray(snapshot.topUsers)
        ? snapshot.topUsers
        : [];
    const currentUser = snapshot.currentWorldEventUser ?? snapshot.currentUser ?? null;

    if (!rows.length && !currentUser) {
      return null;
    }

    return {
      rows,
      topWorldEventUsers: rows,
      currentWorldEventUser: currentUser,
      currentUser,
    };
  }

  createTaskList(notice) {
    const list = document.createElement('div');
    list.className = 'workshop-page__world-notice-requests';

    const title = document.createElement('div');
    title.className = 'workshop-page__world-notice-section-label';
    title.textContent = 'quests';
    list.append(title);

    for (const request of notice.requests ?? []) {
      list.append(this.createTaskRow(request));
    }

    return list;
  }

  createTaskRow(request) {
    const root = document.createElement('div');
    root.className = 'workshop-page__world-notice-request';

    const row = document.createElement('div');
    row.className = 'workshop-page__world-notice-request-title-row';

    const label = document.createElement('span');
    label.className = 'workshop-page__world-notice-request-title';
    label.textContent = request.title ?? request.label;

    row.append(label);

    root.append(row);

    if (request.situation) {
      const situation = document.createElement('div');
      situation.className =
        'workshop-page__world-notice-request-instruction workshop-page__world-notice-request-situation';
      situation.textContent = request.situation;
      root.append(situation);
    }

    const instruction = document.createElement('div');
    instruction.className = 'workshop-page__world-notice-request-instruction';
    setResourceIconText(
      instruction,
      request.description || this.getTaskInstruction(request),
    );
    root.append(instruction);

    if (request.donationOptions?.length) {
      const options = document.createElement('div');
      options.className = 'workshop-page__world-notice-donation-options';

      for (const option of request.donationOptions) {
        options.append(this.createDonationOptionRow(request, option));
      }

      root.append(options);
      return root;
    }

    const detail = document.createElement('div');
    detail.className = 'workshop-page__world-notice-request-points-row';

    const pointValue = document.createElement('span');
    pointValue.className = 'workshop-page__world-notice-request-points';
    setResourceIconText(pointValue, this.getTaskProgressText(request));

    const collectedPoints = document.createElement('span');
    collectedPoints.className = 'workshop-page__world-notice-request-collected';
    setResourceIconText(collectedPoints, `earned ${
      request.collectedPointText ?? this.formatPointCount(request.contributionPoints)
    }`);

    detail.append(pointValue, collectedPoints);
    root.append(detail, this.createRequestAction(request));

    return root;
  }

  createDonationOptionRow(request, option) {
    const row = document.createElement('div');
    row.className = 'workshop-page__world-notice-donation-option';
    row.classList.toggle('is-unavailable', option.canDonate !== true);

    const label = document.createElement('span');
    label.className = 'workshop-page__world-notice-donation-label';
    this.setDonationOptionLabel(label, option);

    const points = document.createElement('span');
    points.className = 'workshop-page__world-notice-donation-points';
    setResourceIconText(points, `${this.formatNumber(option.pointsPerUnit)} points each`);

    const total = document.createElement('span');
    total.className = 'workshop-page__world-notice-donation-total';
    setResourceIconText(
      total,
      `total ${option.collectedPointText ?? this.formatPointCount(option.contributionPoints)}`,
    );

    row.append(label, points, total, this.createDonationOptionAction(request, option));
    return row;
  }

  setDonationOptionLabel(label, option = {}) {
    if (!label) {
      return;
    }

    const resource = this.getDonationOptionResource(option);
    label.classList.toggle('is-unavailable', option.canDonate !== true);

    if (resource === 'coin') {
      label.replaceChildren(createResourceIconLabel('coin', option.label || 'coin'));
    } else {
      label.textContent = option.label ?? '';
      setItemIconLabel(label, resource, option.itemKey);
    }

    setResourceColor(label, resource);
  }

  setDonationOptionText(element, option = {}, text = '', { unavailable = false } = {}) {
    if (!element) {
      return;
    }

    const resource = this.getDonationOptionResource(option);
    element.classList.toggle('is-unavailable', unavailable);
    setItemIconLabel(element, null);

    if (resource === 'coin') {
      setResourceIconText(element, text);
    } else {
      element.textContent = text ?? '';
      setItemIconLabel(element, resource, option.itemKey);
    }

    setResourceColor(element, resource);
  }

  getDonationOptionResource(option = {}) {
    if (option.resourceType === 'coin') {
      return 'coin';
    }

    if (option.resourceType !== 'item') {
      return null;
    }

    const itemKind = String(option.itemKind ?? option.kind ?? '').toLowerCase();

    if (['seed', 'herb', 'potion'].includes(itemKind)) {
      return itemKind;
    }

    const itemKey = String(option.itemKey ?? option.optionKey ?? '').toLowerCase();

    if (itemKey.endsWith('seed')) {
      return 'seed';
    }

    if (itemKey.endsWith('herb')) {
      return 'herb';
    }

    return 'potion';
  }

  createDonationOptionAction(request, option) {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__world-notice-request-action';
    button.type = 'button';
    button.textContent = option.canDonate ? 'donate' : this.getDonationNeedText(option);
    button.disabled = !option.canDonate;
    button.addEventListener('click', () => this.showDonateDialog(request, option));
    return button;
  }

  createRequestAction(request) {
    if (request.manual) {
      const button = document.createElement('button');
      button.className = 'style-button workshop-page__world-notice-request-action';
      button.type = 'button';
      button.textContent = request.actionText;
      button.disabled = !request.canDonate;
      button.addEventListener('click', () => this.showDonateDialog(request));
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

    return rewards.flatMap((reward) => {
      const label = document.createElement('span');
      label.className = 'workshop-page__world-notice-reward-resource';
      label.setAttribute('aria-label', `${this.formatNumber(reward.amount)} ${reward.resource}`);

      const amount = document.createElement('span');
      amount.className = 'workshop-page__world-notice-reward-amount';
      amount.textContent = this.formatNumber(reward.amount);
      setResourceColor(amount, reward.resource);

      const icon = createResourceIconLabel(reward.resource, '');
      if (icon.nodeType === 1) {
        icon.classList.add('workshop-page__world-notice-reward-icon');
        icon.setAttribute('aria-hidden', 'true');
      }

      label.append(amount, icon);

      return [label];
    });
  }

  createLeaderboard(leaderboard = {}) {
    const normalized = this.normalizeLeaderboard(leaderboard);
    const section = document.createElement('div');
    section.className = 'workshop-page__world-notice-leaderboard';

    const rows = document.createElement('div');
    rows.className = 'workshop-page__world-notice-leaderboard-rows';

    rows.append(this.createLeaderboardRow({ name: 'user', pointsLabel: 'points' }, 0, {
      header: true,
    }));

    for (const [index, entry] of normalized.leaderboardRows.entries()) {
      rows.append(this.createLeaderboardRow(entry, index));
    }

    if (this.shouldShowCurrentLeaderboardRow(normalized)) {
      rows.append(
        this.createLeaderboardRow(normalized.currentLeaderboardRow, 0, { current: true }),
      );
    }

    section.append(rows);

    return section;
  }

  createLeaderboardRow(entry = {}, index = 0, { header = false, current = false } = {}) {
    return createWorkshopLeaderboardRow(
      header ? entry.name : this.createLeaderboardPlayerLabel(entry, index),
      header ? entry.pointsLabel : this.formatNumber(entry.points),
      {
        header,
        current: current || entry.current,
      },
    );
  }

  createLeaderboardPlayerLabel(entry = {}, index = 0) {
    return createWorkshopLeaderboardUserLabel(entry, {
      index,
      onOpenPlayerInfo: this.onOpenPlayerInfo,
      playerInfo: {
        worldEventPoints: entry.points,
      },
    });
  }

  applyVisibility() {
    if (this.refs.popup) {
      this.refs.popup.hidden = !this.visible;
    }

    this.refs.openButton?.setAttribute('aria-expanded', this.visible ? 'true' : 'false');
  }

  showDonateDialog(request = {}, option = null) {
    const donationOption = option ?? request.donationOptions?.[0] ?? null;

    if (!request.requestId || !donationOption?.optionKey || !this.refs.donatePanel) {
      return;
    }

    this.previousDonateFocus = document.activeElement;
    this.donateRequestId = request.requestId;
    this.donateOptionKey = donationOption.optionKey;
    this.donateAmount = 1;
    this.donateStatusText = '';
    this.donateVisible = true;
    this.applyDonateVisibility();
    this.renderDonateDialog();
    this.refs.donatePanel.focus();
    this.refs.donateAmountField?.hideInput();
  }

  hideDonateDialog({ restoreFocus = true } = {}) {
    const wasVisible = this.donateVisible;
    this.donateVisible = false;
    this.donateRequestId = null;
    this.donateOptionKey = null;
    this.donateAmount = 1;
    this.donateStatusText = '';
    this.applyDonateVisibility();

    if (
      restoreFocus &&
      wasVisible &&
      this.previousDonateFocus &&
      document.contains(this.previousDonateFocus)
    ) {
      this.previousDonateFocus.focus();
    }

    this.previousDonateFocus = null;
  }

  applyDonateVisibility() {
    if (this.refs.donatePanel) {
      this.refs.donatePanel.hidden = !this.donateVisible;
    }
  }

  onDonateAmountInput() {
    this.donateAmount =
      this.readPositiveInteger(this.refs.donateAmountField?.input.value) ?? 0;
    this.donateStatusText = '';
    this.renderDonateDialog();
  }

  onDonateAmountStep(delta) {
    const request = this.getDonateRequest();
    const option = this.getDonateOption(request);
    const quantity = this.clampDonateAmount(this.donateAmount, option) ?? 1;
    const nextQuantity = this.clampSteppedDonateAmount(quantity + delta, option);

    if (!nextQuantity || nextQuantity === quantity) {
      return;
    }

    this.donateAmount = nextQuantity;
    this.donateStatusText = '';
    this.renderDonateDialog();
  }

  onConfirmDonate() {
    const request = this.getDonateRequest();
    const option = this.getDonateOption(request);
    const quantity = this.clampDonateAmount(this.donateAmount, option);

    if (!request || !option || !quantity) {
      this.donateStatusText = request ? 'bad amount' : 'quest gone';
      this.renderDonateDialog();
      return;
    }

    const result =
      this.gameplayFacade?.donateWorldNoticeResource?.(
        request.requestId,
        option.optionKey,
        quantity,
      ) ??
      (option.resourceType === 'coin'
        ? this.gameplayFacade?.donateWorldNoticeCoin?.(request.requestId, quantity)
        : null);

    if (result?.ok) {
      this.hideDonateDialog({ restoreFocus: false });
      return;
    }

    this.donateStatusText = this.getDonateFailureText(result?.reason);
    this.renderDonateDialog();
  }

  renderDonateDialog() {
    if (!this.donateVisible || !this.refs.donatePanel) {
      return;
    }

    const request = this.getDonateRequest();
    const option = this.getDonateOption(request);

    if (!request || !option) {
      this.donateStatusText = request ? 'option gone' : 'quest gone';
      return;
    }

    const maxQuantity = this.getMaxDonateAmount(option);
    const quantity = maxQuantity > 0
      ? this.clampDonateAmount(this.donateAmount, option) ?? 1
      : 0;
    const disabled = maxQuantity <= 0;

    this.donateAmount = quantity;
    this.refs.donateTitle.textContent = 'donate';
    this.refs.donateRequestRow.value.textContent = request.title ?? request.label;
    this.setDonationOptionText(this.refs.donateGivingRow.value, option, option.label);
    setResourceIconText(
      this.refs.donateProgressRow.value,
      option.collectedPointText ?? this.formatPointCount(option.contributionPoints),
    );
    this.setDonationOptionText(
      this.refs.donateAvailableRow.value,
      option,
      `${this.formatNumber(maxQuantity)} ${option.label}`,
      { unavailable: disabled },
    );
    setResourceIconText(
      this.refs.donatePointsRow.value,
      quantity > 0
        ? `+${this.formatNumber(quantity * option.pointsPerUnit)} points`
        : '+0 points',
    );

    this.refs.donateAmountField.input.min = disabled ? '0' : '1';
    this.refs.donateAmountField.input.max = String(maxQuantity);
    this.refs.donateAmountField.input.disabled = disabled;
    this.refs.donateAmountField.setValue(quantity);
    this.refs.donateAmountField.valueButton.disabled = disabled;
    this.refs.donateAmountField.valueButton.setAttribute(
      'aria-disabled',
      disabled ? 'true' : 'false',
    );

    for (const [delta, button] of this.refs.donateAmountField.stepButtons) {
      const nextQuantity = this.clampSteppedDonateAmount(quantity + delta, option);
      const stepDisabled = disabled || !nextQuantity || nextQuantity === quantity;
      button.disabled = stepDisabled;
      button.setAttribute('aria-disabled', stepDisabled ? 'true' : 'false');
    }

    this.renderDonateConfirmButton(
      this.refs.donateConfirmButton,
      quantity,
      quantity * option.pointsPerUnit,
    );
    this.refs.donateConfirmButton.disabled = disabled;
    this.refs.donateConfirmButton.setAttribute(
      'aria-disabled',
      disabled ? 'true' : 'false',
    );
    this.refs.donateConfirmButton.setAttribute(
      'aria-label',
      quantity > 0
        ? `donate ${this.formatNumber(quantity)} ${option.label} to ${request.title ?? request.label} for ${this.formatPointCount(quantity * option.pointsPerUnit)}`
        : `donate ${option.label} to ${request.title ?? request.label}`,
    );

    this.refs.donateStatus.textContent =
      this.donateStatusText || (disabled ? this.getDonationNeedText(option) : '');
    this.refs.donateStatus.hidden = this.refs.donateStatus.textContent.length === 0;
  }

  renderDonateConfirmButton(button, quantity = 0, points = 0) {
    if (!button) {
      return;
    }

    const safeQuantity = Math.max(0, Math.floor(Number(quantity) || 0));
    const safePoints = Math.max(0, Math.floor(Number(points) || 0));

    if (safeQuantity <= 0) {
      button.textContent = 'donate';
      return;
    }

    const label = document.createElement('span');
    label.className = 'workshop-page__world-notice-donate-confirm-label';
    label.textContent = `donate x${this.formatNumber(safeQuantity)}`;

    const pointLabel = document.createElement('span');
    pointLabel.className = 'workshop-page__world-notice-donate-confirm-points';
    pointLabel.textContent = this.formatPointCount(safePoints);

    button.replaceChildren(label, pointLabel);
  }

  getDonateRequest() {
    const requests = this.currentSnapshot?.worldNotice?.current?.requests;

    if (!Array.isArray(requests)) {
      return null;
    }

    return (
      requests.find((request) => request?.requestId === this.donateRequestId) ?? null
    );
  }

  getDonateOption(request = {}) {
    if (!request || !Array.isArray(request.donationOptions)) {
      return null;
    }

    return (
      request.donationOptions.find(
        (option) => option?.optionKey === this.donateOptionKey,
      ) ?? null
    );
  }

  getMaxDonateAmount(option = {}) {
    const available = Number(option.maxDonateQuantity ?? option.availableQuantity);

    return Math.max(0, Math.floor(available));
  }

  clampDonateAmount(quantity, option) {
    const safeQuantity = this.readPositiveInteger(quantity);

    if (!safeQuantity) {
      return null;
    }

    const maxQuantity = this.getMaxDonateAmount(option);

    if (maxQuantity <= 0) {
      return null;
    }

    return Math.min(safeQuantity, maxQuantity);
  }

  clampSteppedDonateAmount(quantity, option) {
    const integer = Math.floor(Number(quantity));
    const maxQuantity = this.getMaxDonateAmount(option);

    if (!Number.isInteger(integer) || maxQuantity <= 0) {
      return null;
    }

    return Math.min(Math.max(1, integer), maxQuantity);
  }

  readPositiveInteger(value) {
    const integer = Math.floor(Number(value));

    if (!Number.isInteger(integer) || integer <= 0) {
      return null;
    }

    return integer;
  }

  getDonateFailureText(reason) {
    switch (reason) {
      case 'bad_amount':
        return 'bad amount';
      case 'completed':
        return 'already done';
      case 'locked':
        return 'event locked';
      case 'not_enough_coin':
        return 'need coin';
      case 'not_enough_items':
        return 'need items';
      case 'unknown_option':
        return 'option gone';
      case 'unknown_request':
        return 'quest gone';
      default:
        return 'donate failed';
    }
  }

  getDonationNeedText(option = {}) {
    return option.resourceType === 'coin' ? 'need coin' : 'need item';
  }

  formatNumber(value) {
    return String(Math.max(0, Math.floor(Number(value) || 0)));
  }

  formatPointCount(value) {
    const points = Math.max(0, Math.floor(Number(value) || 0));
    return `${this.formatNumber(points)} point${points === 1 ? '' : 's'}`;
  }

  getTaskInstruction(request = {}) {
    if (typeof request.instructionText === 'string' && request.instructionText.trim()) {
      return request.instructionText.trim();
    }

    const action = this.getTaskActionCopy(request);
    const pointRule = this.getTaskPointRule(request);

    if (pointRule) {
      return `${action}. ${pointRule}.`;
    }

    return `${action}.`;
  }

  getTaskProgressText(request = {}) {
    const contributed = Math.max(
      0,
      Math.floor(
        Number(request.contributedQuantity ?? request.pointProgressQuantity) ||
          Number(request.progressQuantity) ||
          0,
      ),
    );

    return `${this.getTaskProgressVerb(request.actionType)} ${this.formatNumber(
      contributed,
    )} ${this.getTaskProgressUnit(
      request.actionType,
      contributed,
    )}`;
  }

  getTaskActionCopy(request = {}) {
    const actionType = request.actionType;

    switch (actionType) {
      case 'brew_potions':
        return 'brew any potion';
      case 'complete_research':
        return 'complete any research';
      case 'donate_coin':
      case 'donate_resources':
        return 'donate coin';
      case 'earn_coin':
        return 'earn coin by selling items or claiming coin';
      case 'harvest_herbs':
        return 'harvest any herb';
      case 'sell_items':
        return 'sell any item';
      case 'summon_seeds':
        return 'summon seeds';
      default:
        return 'complete this quest';
    }
  }

  getTaskPointRule(request = {}) {
    const raw = String(request.pointText ?? request.actionText ?? '').trim();

    if (!raw || raw === 'done') {
      return '';
    }

    if (raw.includes('=')) {
      const [left, right] = raw.split('=').map((part) => part.trim());
      const context = this.getTaskPointContext(request.actionType);
      return context
        ? `${left} ${context} gives ${right}`
        : `${left} gives ${right}`;
    }

    const eachMatch = raw.match(/^(.+?)\s+each$/i);

    if (eachMatch) {
      return `each ${this.getTaskPointUnit(request.actionType)} gives ${eachMatch[1]}`;
    }

    if (/^\d+\s+points?$/i.test(raw)) {
      return `each ${this.getTaskPointUnit(request.actionType)} gives ${raw}`;
    }

    if (/^points?$/i.test(raw)) {
      return '';
    }

    return raw;
  }

  getTaskPointContext(actionType) {
    switch (actionType) {
      case 'donate_coin':
        return 'donated';
      case 'earn_coin':
        return 'earned';
      default:
        return '';
    }
  }

  getTaskPointUnit(actionType) {
    switch (actionType) {
      case 'brew_potions':
        return 'potion';
      case 'complete_research':
        return 'research';
      case 'donate_coin':
      case 'donate_resources':
        return 'coin donated';
      case 'earn_coin':
        return 'coin earned';
      case 'harvest_herbs':
        return 'herb';
      case 'sell_items':
        return 'item sold';
      case 'summon_seeds':
        return 'seed';
      default:
        return 'counted action';
    }
  }

  getTaskProgressVerb(actionType) {
    switch (actionType) {
      case 'brew_potions':
        return 'brewed';
      case 'complete_research':
        return 'finished';
      case 'donate_coin':
      case 'donate_resources':
        return 'donated';
      case 'earn_coin':
        return 'earned';
      case 'harvest_herbs':
        return 'harvested';
      case 'sell_items':
        return 'sold';
      case 'summon_seeds':
        return 'summoned';
      default:
        return 'counted';
    }
  }

  getTaskProgressUnit(actionType, quantity) {
    switch (actionType) {
      case 'brew_potions':
        return `potion${quantity === 1 ? '' : 's'}`;
      case 'complete_research':
        return 'research';
      case 'donate_coin':
      case 'donate_resources':
      case 'earn_coin':
        return 'coin';
      case 'harvest_herbs':
        return `herb${quantity === 1 ? '' : 's'}`;
      case 'sell_items':
        return `item${quantity === 1 ? '' : 's'}`;
      case 'summon_seeds':
        return `seed${quantity === 1 ? '' : 's'}`;
      default:
        return `action${quantity === 1 ? '' : 's'}`;
    }
  }

  normalizeLeaderboard(leaderboard = {}) {
    const currentPoints = Math.max(0, Math.floor(Number(leaderboard.currentPoints) || 0));
    const qualificationPoints = Math.max(
      1,
      Math.floor(Number(leaderboard.qualificationPoints) || WORLD_NOTICE_DEFAULT_QUALIFICATION_POINTS),
    );
    const currentLeaderboardRow = this.normalizeLeaderboardCurrentRow(
      leaderboard,
      currentPoints,
    );
    const leaderboardRows = this.normalizeLeaderboardRows(
      this.getLeaderboardRows(leaderboard),
      currentLeaderboardRow,
      currentPoints,
    );

    return {
      currentPoints,
      qualificationPoints,
      qualified: Boolean(leaderboard.qualified) || currentPoints >= qualificationPoints,
      remainingQualificationPoints: Math.max(0, qualificationPoints - currentPoints),
      rewardTiers: Array.isArray(leaderboard.rewardTiers)
        ? leaderboard.rewardTiers
        : [],
      leaderboardRows,
      currentLeaderboardRow,
    };
  }

  getLeaderboardRows(leaderboard = {}) {
    for (const key of [
      'rows',
      'topWorldEventUsers',
      'topEventUsers',
      'topContributors',
      'topUsers',
    ]) {
      if (Array.isArray(leaderboard[key])) {
        return leaderboard[key];
      }
    }

    return [];
  }

  getCurrentLeaderboardRow(leaderboard = {}) {
    return (
      leaderboard.currentWorldEventUser ??
      leaderboard.currentEventUser ??
      leaderboard.currentContributor ??
      leaderboard.currentUser ??
      null
    );
  }

  normalizeLeaderboardCurrentRow(leaderboard = {}, currentPoints = 0) {
    return (
      this.normalizeLeaderboardEntry(this.getCurrentLeaderboardRow(leaderboard), 0, {
        includeRank: true,
        current: true,
      }) ??
      this.createFallbackLeaderboardRow(currentPoints)
    );
  }

  normalizeLeaderboardRows(rows, currentLeaderboardRow, currentPoints) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return [currentLeaderboardRow ?? this.createFallbackLeaderboardRow(currentPoints)];
    }

    return rows
      .map((row, index) => this.normalizeLeaderboardEntry(row, index))
      .filter(Boolean);
  }

  normalizeLeaderboardEntry(row, index = 0, { includeRank = false, current = false } = {}) {
    if (!row || typeof row !== 'object') {
      return null;
    }

    const name = String(row.name ?? row.username ?? row.userName ?? '').trim();

    if (!name) {
      return null;
    }

    const rank = this.normalizeRank(row.rank);
    const rankLabel = String(row.rankLabel ?? '').trim();

    return {
      identity: row.identity,
      rank: includeRank ? rank : rank ?? index + 1,
      rankLabel: rankLabel || '',
      name,
      allianceTag: normalizeAllianceTag(row.allianceTag ?? row.alliance_tag),
      allianceTagColor: normalizeTradeAllianceTagColor(
        row.allianceTagColor ?? row.alliance_tag_color,
      ),
      character: normalizePlayerCharacter(row.character),
      playerLevel: this.normalizePlayerLevel(row.playerLevel ?? row.player_level),
      points: this.normalizeMetric(
        row.points,
        row.contributionPoints,
        row.eventPoints,
        row.score,
      ),
      current: current || row.current === true || row.isCurrent === true,
    };
  }

  createFallbackLeaderboardRow(currentPoints = 0) {
    const player = this.getPlayerSnapshot();
    return {
      rankLabel: '-',
      name: this.normalizeFallbackPlayerName(player?.username),
      points: currentPoints,
      current: true,
      playerLevel: this.normalizePlayerLevel(this.currentSnapshot?.playerLevel?.currentLevel),
      character: normalizePlayerCharacter(player?.character),
    };
  }

  getPlayerSnapshot() {
    return this.playerFacade?.getSnapshot?.() ?? this.playerSnapshot ?? {};
  }

  normalizeFallbackPlayerName(username) {
    return String(username ?? '').trim() || 'wizard';
  }

  shouldShowCurrentLeaderboardRow(normalized = {}) {
    const current = normalized.currentLeaderboardRow;
    const rows = normalized.leaderboardRows ?? [];

    if (!current || rows.some((row) => this.isSameLeaderboardPlayer(row, current))) {
      return false;
    }

    const rank = this.normalizeRank(current.rank);
    return rank !== null && rank > rows.length;
  }

  isSameLeaderboardPlayer(row = {}, current = {}) {
    if (row.current === true) {
      return true;
    }

    const rowIdentity = String(row.identity ?? '');
    const currentIdentity = String(current.identity ?? '');

    if (rowIdentity && currentIdentity) {
      return rowIdentity === currentIdentity;
    }

    const rowRank = this.normalizeRank(row.rank);
    const currentRank = this.normalizeRank(current.rank);

    return rowRank !== null && currentRank !== null && rowRank === currentRank;
  }

  normalizeMetric(...values) {
    for (const value of values) {
      if (typeof value === 'bigint') {
        return Number(value);
      }

      if (Number.isFinite(value)) {
        return Math.max(0, Math.floor(value));
      }
    }

    return 0;
  }

  normalizeRank(rank) {
    const safeRank = Math.floor(Number(rank));

    if (!Number.isFinite(safeRank) || safeRank < 1) {
      return null;
    }

    return safeRank;
  }

  normalizePlayerLevel(playerLevel) {
    const safePlayerLevel = Math.floor(Number(playerLevel));

    if (!Number.isFinite(safePlayerLevel) || safePlayerLevel < 1) {
      return 1;
    }

    return safePlayerLevel;
  }
}

function hasIncompleteNoticeRequests(notice) {
  const requests = notice?.requests;

  if (Array.isArray(requests) && requests.length > 0) {
    return requests.some((request) => request?.completed !== true);
  }

  return Number(notice?.completedRequests ?? 0) < Number(notice?.totalRequests ?? 0);
}
