import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { createWorkshopCharacterPortrait } from '../workshopCharacters.js';

export class WorkshopWorldNoticeManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
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
    this.root.className = 'workshop-page__world-notice';
    this.root.setAttribute('aria-label', 'world notice');

    this.refs.openButton = document.createElement('button');
    this.refs.openButton.className = 'workshop-page__world-notice-open';
    this.refs.openButton.type = 'button';
    this.refs.openButton.setAttribute('aria-haspopup', 'dialog');
    this.refs.openButton.addEventListener('click', () => this.show());

    this.refs.openLabel = document.createElement('span');
    this.refs.openLabel.className = 'workshop-page__feature-character-label';
    this.refs.openLabel.textContent = 'notice';

    this.refs.openButton.append(
      createWorkshopCharacterPortrait(
        'worldNotice',
        'workshop-page__world-notice-character',
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
    popup.className = 'workshop-page__world-notice-popup';
    popup.hidden = true;
    popup.addEventListener('click', this.handlePopupClick);

    this.refs.dialog = document.createElement('section');
    this.refs.dialog.className = 'workshop-page__world-notice-dialog style-dialog';
    this.refs.dialog.setAttribute('aria-label', 'world notice');
    this.refs.dialog.setAttribute('aria-modal', 'true');
    this.refs.dialog.setAttribute('role', 'dialog');
    this.refs.dialog.tabIndex = -1;

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
    popup.append(this.refs.dialog);

    return popup;
  }

  show() {
    if (!this.root || this.root.hidden) {
      return;
    }

    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyVisibility();
    this.renderPopup(this.currentSnapshot?.worldNotice);
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
      setNotificationBadge(this.refs.openButton, false);
      return;
    }

    this.refs.openButton?.setAttribute(
      'aria-label',
      `open world notice, ${notice.headline}, ${notice.completedRequests}/${notice.totalRequests}, ${notice.responseLabel}, ${notice.resetLabel}`,
    );
    setNotificationBadge(this.refs.openButton, hasIncompleteNoticeRequests(notice));
  }

  renderPopup(worldNotice) {
    if (!this.refs.content) {
      return;
    }

    const notice = worldNotice?.current;

    if (!notice) {
      const empty = document.createElement('div');
      empty.className = 'workshop-page__world-notice-empty';
      empty.textContent = 'no notice';
      this.refs.content.replaceChildren(empty);
      return;
    }

    this.refs.content.replaceChildren(
      this.createNoticeHeader(notice),
      this.createBody(notice),
      this.createRequestList(notice),
      this.createArchive(worldNotice.archive),
    );
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
        this.gameplayFacade?.donateWorldNoticeGold?.(request.requestId);
      });
      return button;
    }

    const action = document.createElement('span');
    action.className = 'workshop-page__world-notice-request-action-text';
    action.textContent = request.actionText;
    return action;
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
      response.textContent = entry.responseLabel;

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
}

function hasIncompleteNoticeRequests(notice) {
  const requests = notice?.requests;

  if (Array.isArray(requests) && requests.length > 0) {
    return requests.some((request) => request?.completed !== true);
  }

  return Number(notice?.completedRequests ?? 0) < Number(notice?.totalRequests ?? 0);
}
