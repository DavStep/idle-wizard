const EMPTY_SNAPSHOT = {
  connected: false,
  messages: [],
};

export class WorkshopWorldChatManager {
  constructor({ worldChatFacade } = {}) {
    this.worldChatFacade = worldChatFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.sending = false;
    this.lastSnapshot = { ...EMPTY_SNAPSHOT };
    this.previousFocus = null;
    this.handleRootClick = (event) => {
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

  mount(parent) {
    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('div');
    this.root.className = 'workshop-page__world-chat';

    this.refs.button = this.createButton();
    this.refs.popup = this.createPopup();

    this.root.append(this.refs.button, this.refs.popup);
    parent.append(this.root);
    document.addEventListener('keydown', this.handleKeydown);

    if (this.worldChatFacade) {
      this.unsubscribe = this.worldChatFacade.subscribe((snapshot) => this.render(snapshot));
      this.render(this.worldChatFacade.getSnapshot());
    } else {
      this.render({ ...EMPTY_SNAPSHOT });
    }

    this.applyVisibility();

    return this.root;
  }

  createButton() {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__world-chat-button';
    button.type = 'button';
    button.textContent = 'world chat';
    button.addEventListener('click', () => this.show());
    return button;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'workshop-page__world-chat-popup';
    popup.addEventListener('click', this.handleRootClick);

    const dialog = document.createElement('section');
    dialog.className = 'workshop-page__world-chat-dialog style-dialog';
    dialog.setAttribute('aria-label', 'World chat');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    this.refs.dialog = dialog;
    this.refs.title = this.createTitle();
    this.refs.messages = document.createElement('div');
    this.refs.messages.className = 'workshop-page__world-chat-messages';
    this.refs.status = document.createElement('div');
    this.refs.status.className = 'workshop-page__world-chat-status';
    this.refs.form = this.createForm();
    dialog.append(this.refs.title, this.refs.messages, this.refs.status, this.refs.form);
    popup.append(dialog);

    return popup;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'world chat';
    return title;
  }

  createForm() {
    const form = document.createElement('form');
    form.className = 'workshop-page__world-chat-form';
    form.addEventListener('submit', (event) => this.onSubmit(event));

    this.refs.input = document.createElement('input');
    this.refs.input.className = 'style-input workshop-page__world-chat-input';
    this.refs.input.type = 'text';
    this.refs.input.maxLength = 160;
    this.refs.input.autocomplete = 'off';
    this.refs.input.placeholder = 'message';
    this.refs.input.setAttribute('aria-label', 'World chat message');
    this.refs.input.addEventListener('input', () => this.updateFormState());

    this.refs.sendButton = document.createElement('button');
    this.refs.sendButton.className = 'style-button workshop-page__world-chat-send';
    this.refs.sendButton.type = 'submit';
    this.refs.sendButton.textContent = 'send';

    form.append(this.refs.input, this.refs.sendButton);
    return form;
  }

  async onSubmit(event) {
    event.preventDefault();

    if (this.sending || !this.worldChatFacade) {
      return;
    }

    const body = this.refs.input?.value ?? '';

    if (!body.trim()) {
      this.updateFormState();
      return;
    }

    this.sending = true;
    this.setStatus('sending');
    this.updateFormState();

    const result = await this.worldChatFacade.sendMessage(body);

    this.sending = false;

    if (result.ok) {
      this.refs.input.value = '';
      this.setStatus(this.lastSnapshot.connected ? '' : 'offline');
    } else {
      this.setStatus(this.formatFailure(result.reason));
    }

    this.updateFormState();
  }

  show() {
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyVisibility();
    this.refs.dialog?.focus();
    this.scrollMessagesToBottom();
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
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.sending = false;
    this.lastSnapshot = { ...EMPTY_SNAPSHOT };
    this.previousFocus = null;
  }

  render(snapshot) {
    if (!this.root) {
      return;
    }

    this.lastSnapshot = snapshot ?? { ...EMPTY_SNAPSHOT };
    const messages = Array.isArray(this.lastSnapshot.messages) ? this.lastSnapshot.messages : [];

    if (!messages.length) {
      const empty = document.createElement('div');
      empty.className = 'workshop-page__world-chat-empty';
      empty.textContent = this.lastSnapshot.connected ? 'no messages yet' : 'offline';
      this.refs.messages.replaceChildren(empty);
    } else {
      this.refs.messages.replaceChildren(...messages.map((message) => this.createMessage(message)));
    }

    if (!this.sending) {
      this.setStatus(this.lastSnapshot.connected ? '' : 'offline');
    }

    this.updateFormState();
    this.scrollMessagesToBottom();
  }

  createMessage(message) {
    const row = document.createElement('div');
    row.className = 'workshop-page__world-chat-message';

    const name = document.createElement('span');
    name.className = 'workshop-page__world-chat-name';
    name.textContent = `${this.formatSender(message)}: `;

    const body = document.createElement('span');
    body.className = 'workshop-page__world-chat-body';
    body.textContent = message.body;

    row.append(name, body);
    return row;
  }

  formatSender(message) {
    const username = message?.username || 'wizard';
    const fallbackLevel = username === 'system' ? null : 1;
    const playerLevel = this.normalizePlayerLevel(message?.playerLevel, fallbackLevel);

    if (!playerLevel) {
      return username;
    }

    return `${username} Lv.${playerLevel}`;
  }

  normalizePlayerLevel(playerLevel, fallbackLevel = 1) {
    if (playerLevel === null || playerLevel === undefined) {
      return fallbackLevel;
    }

    const safePlayerLevel = Math.floor(Number(playerLevel));

    if (!Number.isFinite(safePlayerLevel) || safePlayerLevel < 1) {
      return fallbackLevel;
    }

    return safePlayerLevel;
  }

  updateFormState() {
    if (!this.refs.input || !this.refs.sendButton) {
      return;
    }

    const canSend =
      Boolean(this.worldChatFacade) &&
      Boolean(this.lastSnapshot.connected) &&
      !this.sending &&
      Boolean(this.refs.input.value.trim());

    this.refs.input.disabled = !this.worldChatFacade || !this.lastSnapshot.connected || this.sending;
    this.refs.sendButton.disabled = !canSend;
  }

  setStatus(text) {
    if (this.refs.status) {
      this.refs.status.textContent = text;
    }
  }

  formatFailure(reason) {
    if (reason === 'empty_message') {
      return '';
    }

    if (reason === 'offline') {
      return 'offline';
    }

    return 'could not send';
  }

  scrollMessagesToBottom() {
    if (!this.refs.messages) {
      return;
    }

    this.refs.messages.scrollTop = this.refs.messages.scrollHeight;
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
