export class TopPanelInboxManager {
  constructor({ playerInboxFacade } = {}) {
    this.playerInboxFacade = playerInboxFacade;
    this.refs = null;
    this.unsubscribe = null;
    this.visible = false;
    this.previousFocus = null;
    this.lastSnapshot = null;
    this.pendingMailKeys = new Set();
    this.handleCloseClick = () => this.hide();
    this.handleOverlayClick = (event) => {
      if (event.target === this.refs?.inboxPopup) {
        this.hide();
      }
    };
    this.handleRowsClick = (event) => this.onRowsClick(event);
    this.handleKeydown = (event) => {
      if (!this.visible || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      this.hide();
    };
  }

  mount(refs) {
    this.refs = refs;
    this.refs.inboxCloseButton.addEventListener('click', this.handleCloseClick);
    this.refs.inboxPopup.addEventListener('click', this.handleOverlayClick);
    this.refs.inboxRows.addEventListener('click', this.handleRowsClick);
    document.addEventListener('keydown', this.handleKeydown);

    if (this.playerInboxFacade) {
      this.unsubscribe = this.playerInboxFacade.subscribe((snapshot) => this.render(snapshot));
      this.render(this.playerInboxFacade.getSnapshot?.());
    } else {
      this.render({ connected: false, mail: [], unreadCount: 0, claimableCount: 0 });
    }

    this.applyVisibility();
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;

    if (this.refs) {
      this.refs.inboxCloseButton.removeEventListener('click', this.handleCloseClick);
      this.refs.inboxPopup.removeEventListener('click', this.handleOverlayClick);
      this.refs.inboxRows.removeEventListener('click', this.handleRowsClick);
    }

    document.removeEventListener('keydown', this.handleKeydown);
    this.refs = null;
    this.visible = false;
    this.previousFocus = null;
    this.lastSnapshot = null;
    this.pendingMailKeys.clear();
  }

  show() {
    if (!this.refs) {
      return;
    }

    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyVisibility();
    this.render(this.lastSnapshot);
    this.playerInboxFacade?.markVisibleRead?.();
    this.focusWithoutScroll(this.refs.inboxPanel);
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.applyVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.focusWithoutScroll(this.previousFocus);
    }

    this.previousFocus = null;
  }

  async onRowsClick(event) {
    const button = event.target?.closest?.('[data-inbox-claim-mail-key]');
    if (!button) {
      return;
    }

    const mailKey = button.dataset.inboxClaimMailKey;
    if (!mailKey || this.pendingMailKeys.has(mailKey)) {
      return;
    }

    this.pendingMailKeys.add(mailKey);
    this.render(this.lastSnapshot);

    try {
      await this.playerInboxFacade?.claimReward?.(mailKey);
    } finally {
      this.pendingMailKeys.delete(mailKey);
      this.render(this.playerInboxFacade?.getSnapshot?.() ?? this.lastSnapshot);
    }
  }

  render(snapshot) {
    if (!this.refs) {
      return;
    }

    this.lastSnapshot = snapshot ?? {
      connected: false,
      mail: [],
      unreadCount: 0,
      claimableCount: 0,
    };
    if (!this.visible) {
      return;
    }

    const mail = Array.isArray(this.lastSnapshot.mail) ? this.lastSnapshot.mail : [];
    const signature = JSON.stringify({
      mail,
      pending: [...this.pendingMailKeys].sort(),
    });

    if (this.refs.inboxRows.dataset.signature === signature) {
      return;
    }

    this.refs.inboxRows.dataset.signature = signature;
    this.refs.inboxRows.replaceChildren(
      ...(mail.length > 0 ? mail.map((row) => this.createMailRow(row)) : [this.createEmptyRow()]),
    );
  }

  createMailRow(mail) {
    const row = document.createElement('article');
    row.className = 'room-top-panel__inbox-row';
    row.classList.toggle('is-unread', !mail.read);
    row.classList.toggle('is-claimed', Boolean(mail.rewardCollected));

    const main = document.createElement('div');
    main.className = 'room-top-panel__inbox-row-main';

    const header = document.createElement('div');
    header.className = 'room-top-panel__inbox-row-header';

    const title = document.createElement('div');
    title.className = 'room-top-panel__inbox-row-title';
    title.textContent = mail.title || 'message';

    const meta = document.createElement('div');
    meta.className = 'room-top-panel__inbox-row-meta';
    meta.textContent = this.formatMeta(mail);

    header.append(title, meta);

    const body = document.createElement('p');
    body.className = 'room-top-panel__inbox-row-body';
    body.textContent = mail.body || '';

    main.append(header, body);

    if (mail.hasReward) {
      const reward = document.createElement('div');
      reward.className = 'room-top-panel__inbox-row-reward';
      reward.textContent = mail.rewardText || 'reward';
      main.append(reward);
    }

    const action = document.createElement('div');
    action.className = 'room-top-panel__inbox-row-action';

    if (!mail.hasReward) {
      const status = document.createElement('span');
      status.className = 'room-top-panel__inbox-row-status';
      status.textContent = mail.read ? 'read' : 'new';
      action.append(status);
    } else if (mail.rewardCollected) {
      const status = document.createElement('span');
      status.className = 'room-top-panel__inbox-row-status';
      status.textContent = 'claimed';
      action.append(status);
    } else {
      const button = document.createElement('button');
      button.className = 'style-button room-top-panel__inbox-claim';
      button.type = 'button';
      button.textContent = this.pendingMailKeys.has(mail.mailKey) ? '...' : 'claim';
      button.dataset.inboxClaimMailKey = mail.mailKey;
      button.disabled = this.pendingMailKeys.has(mail.mailKey);
      action.append(button);
    }

    row.append(main, action);
    return row;
  }

  createEmptyRow() {
    const row = document.createElement('div');
    row.className = 'room-top-panel__inbox-empty';
    row.textContent = 'no mail';
    return row;
  }

  formatMeta(mail) {
    const sender = String(mail.senderLabel ?? 'system').trim() || 'system';
    const time = this.formatTime(mail.createdAtMs);

    return time ? `${sender} · ${time}` : sender;
  }

  formatTime(createdAtMs) {
    const timestamp = Number(createdAtMs);
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return '';
    }

    try {
      return new Date(timestamp).toLocaleDateString(undefined, {
        month: 'numeric',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  }

  applyVisibility() {
    if (!this.refs) {
      return;
    }

    this.refs.inboxPopup.hidden = !this.visible;
    this.refs.inboxPopup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }

  focusWithoutScroll(element) {
    try {
      element?.focus?.({ preventScroll: true });
    } catch {
      element?.focus?.();
    }
  }
}
