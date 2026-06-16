import { createAllianceTagSpan, normalizeAllianceTag } from '../../shared/allianceTagLabel.js';
import { createPlayerInfoLink } from '../../shared/playerInfoLink.js';

const EMPTY_CHAT_SNAPSHOT = {
  connected: false,
  messages: [],
};

const EMPTY_ALLIANCE_SNAPSHOT = {
  connected: false,
  ownAlliance: null,
  allianceChatMessages: [],
};

const CHAT_CHANNELS = [
  { id: 'world', label: 'world chat' },
  { id: 'alliance', label: 'alliance chat' },
];

const CHAT_AGE_MINUTE_MS = 60_000;
const CHAT_AGE_REFRESH_FUZZ_MS = 250;

export class WorkshopWorldChatManager {
  constructor({ worldChatFacade, tradeAllianceFacade, onOpenPlayerInfo } = {}) {
    this.worldChatFacade = worldChatFacade;
    this.tradeAllianceFacade = tradeAllianceFacade;
    this.onOpenPlayerInfo = onOpenPlayerInfo;
    this.root = null;
    this.unsubscribeWorldChat = null;
    this.unsubscribeTradeAlliance = null;
    this.refs = {};
    this.visible = false;
    this.sending = false;
    this.selectedChannelId = 'world';
    this.worldChatSnapshot = { ...EMPTY_CHAT_SNAPSHOT };
    this.tradeAllianceSnapshot = { ...EMPTY_ALLIANCE_SNAPSHOT };
    this.previousFocus = null;
    this.ageRefreshTimer = null;
    this.scrollFrame = 0;
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
    this.root.className = 'room-world-chat-layer workshop-page__world-chat';

    this.refs.box = this.createBox();
    this.refs.popup = this.createPopup();

    this.root.append(this.refs.box, this.refs.popup);
    parent.append(this.root);
    document.addEventListener('keydown', this.handleKeydown);

    if (this.worldChatFacade) {
      this.unsubscribeWorldChat = this.worldChatFacade.subscribe((snapshot) => {
        this.worldChatSnapshot = snapshot ?? { ...EMPTY_CHAT_SNAPSHOT };
        this.render();
      });
      this.worldChatSnapshot = this.worldChatFacade.getSnapshot();
    }

    if (this.tradeAllianceFacade) {
      this.unsubscribeTradeAlliance = this.tradeAllianceFacade.subscribe((snapshot) => {
        this.tradeAllianceSnapshot = snapshot ?? { ...EMPTY_ALLIANCE_SNAPSHOT };
        this.render();
      });
      this.tradeAllianceSnapshot = this.tradeAllianceFacade.getSnapshot();
    }

    this.render();
    this.applyVisibility();

    return this.root;
  }

  createBox() {
    const box = document.createElement('section');
    box.className = 'workshop-page__world-chat-box style-box';
    box.setAttribute('aria-label', 'Chat preview');

    this.refs.button = this.createButton();
    this.refs.buttonPreview = document.createElement('div');
    this.refs.buttonPreview.className = 'workshop-page__world-chat-preview';

    box.append(this.refs.button, this.refs.buttonPreview);
    return box;
  }

  createButton() {
    const button = document.createElement('button');
    button.className = 'workshop-page__world-chat-button workshop-page__world-chat-title style-box__title';
    button.type = 'button';
    button.textContent = 'world chat';
    button.addEventListener('click', () => this.show());
    return button;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'workshop-page__world-chat-popup';
    popup.addEventListener('click', this.handleRootClick);

    const panel = document.createElement('section');
    panel.className = 'workshop-page__world-chat-panel';
    panel.setAttribute('aria-label', 'Chat');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('role', 'dialog');
    panel.tabIndex = -1;

    const dialog = document.createElement('section');
    dialog.className = 'workshop-page__world-chat-dialog style-dialog';

    this.refs.dialog = panel;
    this.refs.title = this.createTitle();
    this.refs.closeButton = this.createCloseButton();
    this.refs.messages = document.createElement('div');
    this.refs.messages.className = 'workshop-page__world-chat-messages';
    this.refs.status = document.createElement('div');
    this.refs.status.className = 'workshop-page__world-chat-status';
    this.refs.form = this.createForm();
    this.refs.tabs = this.createTabs();

    dialog.append(
      this.refs.title,
      this.refs.closeButton,
      this.refs.messages,
      this.refs.status,
      this.refs.form,
    );
    panel.append(dialog, this.refs.tabs);
    popup.append(panel);

    return popup;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'world chat';
    return title;
  }

  createCloseButton() {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__world-chat-close';
    button.type = 'button';
    button.textContent = 'close';
    button.addEventListener('click', () => this.hide());
    return button;
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
    this.refs.input.setAttribute('aria-label', 'Chat message');
    this.refs.input.addEventListener('input', () => this.updateFormState());

    this.refs.sendButton = document.createElement('button');
    this.refs.sendButton.className = 'style-button workshop-page__world-chat-send';
    this.refs.sendButton.type = 'submit';
    this.refs.sendButton.textContent = 'send';

    form.append(this.refs.input, this.refs.sendButton);
    return form;
  }

  createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'workshop-page__world-chat-tabs';
    tabs.setAttribute('aria-label', 'Chat channel');
    tabs.setAttribute('role', 'tablist');
    this.refs.tabButtons = new Map();

    for (const channel of CHAT_CHANNELS) {
      const button = document.createElement('button');
      button.className = 'style-button workshop-page__world-chat-tab-button';
      button.type = 'button';
      button.textContent = channel.label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.onSelectChannel(channel.id));
      this.refs.tabButtons.set(channel.id, button);
      tabs.append(button);
    }

    return tabs;
  }

  onSelectChannel(channelId) {
    if (channelId === 'alliance' && !this.hasAllianceChat()) {
      return;
    }

    this.selectedChannelId = channelId;
    this.render();
  }

  async onSubmit(event) {
    event.preventDefault();

    const facade = this.getSelectedSendFacade();
    if (this.sending || !facade) {
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

    const result = await facade.sendMessage(body);

    this.sending = false;

    if (result.ok) {
      this.refs.input.value = '';
      this.setStatus(this.getSelectedSnapshot().connected ? '' : 'offline');
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
    this.scrollMessagesToBottom({ afterLayout: true });
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.applyVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
    this.cancelScheduledScroll();
  }

  unmount() {
    this.unsubscribeWorldChat?.();
    this.unsubscribeTradeAlliance?.();
    this.unsubscribeWorldChat = null;
    this.unsubscribeTradeAlliance = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.sending = false;
    this.selectedChannelId = 'world';
    this.worldChatSnapshot = { ...EMPTY_CHAT_SNAPSHOT };
    this.tradeAllianceSnapshot = { ...EMPTY_ALLIANCE_SNAPSHOT };
    this.previousFocus = null;
    this.clearAgeRefreshTimer();
    this.cancelScheduledScroll();
  }

  render() {
    if (!this.root) {
      return;
    }

    if (this.selectedChannelId === 'alliance' && !this.hasAllianceChat()) {
      this.selectedChannelId = 'world';
    }

    const channel = this.getSelectedChannel();
    const snapshot = this.getSelectedSnapshot();
    const messages = this.getMessagesWithBody(snapshot.messages);
    const previewMessages = this.getPreviewMessages(messages);

    this.refs.button.textContent = channel.label;
    this.refs.title.textContent = channel.label;
    this.refs.input?.setAttribute('aria-label', `${channel.label} message`);
    this.renderTabs();
    this.renderButtonPreview(previewMessages, channel);
    this.renderMessages(messages, snapshot);

    if (!this.sending) {
      this.setStatus(snapshot.connected ? '' : 'offline');
    }

    this.updateFormState();
    this.scrollMessagesToBottom({ afterLayout: this.visible });
    this.scheduleAgeRefresh(messages);
  }

  renderMessages(messages, snapshot) {
    if (!messages.length) {
      const empty = document.createElement('div');
      empty.className = 'workshop-page__world-chat-empty';
      empty.textContent = snapshot.connected ? 'no messages yet' : 'offline';
      this.refs.messages.replaceChildren(empty);
      return;
    }

    this.refs.messages.replaceChildren(
      ...messages.map((message) => this.createMessage(message)),
    );
  }

  renderTabs() {
    const hasAllianceChat = this.hasAllianceChat();
    this.refs.tabs.hidden = !hasAllianceChat;

    for (const channel of CHAT_CHANNELS) {
      const selected = this.selectedChannelId === channel.id;
      const disabled = channel.id === 'alliance' && !hasAllianceChat;
      const button = this.refs.tabButtons?.get(channel.id);
      button?.setAttribute('aria-selected', selected ? 'true' : 'false');
      button?.setAttribute('tabindex', selected ? '0' : '-1');
      button.disabled = disabled;
    }
  }

  createMessage(message) {
    const row = document.createElement('div');
    row.className = 'workshop-page__world-chat-message';
    const isSystemMessage = this.isSystemMessage(message);
    const isRecipeDiscoveryMessage = this.isRecipeDiscoveryMessage(message);

    if (isSystemMessage) {
      row.classList.add('workshop-page__world-chat-message--system');
    }
    if (isRecipeDiscoveryMessage) {
      row.classList.add('workshop-page__world-chat-message--recipe-discovery');
    }

    const name = document.createElement('span');
    name.className = 'workshop-page__world-chat-name';
    name.append(...this.createSenderContent(message), document.createTextNode(': '));

    const body = document.createElement('span');
    body.className = 'workshop-page__world-chat-body';
    body.textContent = message.body;

    const content = document.createElement('span');
    content.className = 'workshop-page__world-chat-content';
    content.append(name, body);

    row.append(content);

    const age = this.formatMessageAge(message);
    if (age) {
      const ageLabel = document.createElement('span');
      ageLabel.className = 'workshop-page__world-chat-age';
      ageLabel.dataset.sentAtMs = String(Number(message.sentAtMs));
      ageLabel.textContent = age;
      row.append(ageLabel);
    }

    return row;
  }

  getMessagesWithBody(messages) {
    return Array.isArray(messages) ? messages.filter((message) => message?.body) : [];
  }

  getPreviewMessages(messages) {
    return messages.slice(-2);
  }

  renderButtonPreview(messages, channel) {
    if (!this.refs.buttonPreview || !this.refs.button) {
      return;
    }

    if (!messages.length) {
      const empty = document.createElement('div');
      empty.className = 'workshop-page__world-chat-empty';
      empty.textContent = this.getSelectedSnapshot().connected ? 'no messages yet' : 'offline';
      this.refs.buttonPreview.replaceChildren(empty);
      this.refs.button.setAttribute('aria-label', `${channel.label}, ${empty.textContent}`);
      return;
    }

    this.refs.buttonPreview.replaceChildren(
      ...messages.map((message) => this.createMessage(message)),
    );
    this.refs.button.setAttribute(
      'aria-label',
      `${channel.label}, latest messages: ${messages
        .map((message) => {
          const age = this.formatMessageAge(message);
          return `${this.formatSender(message)}: ${message.body}${age ? `, ${age}` : ''}`;
        })
        .join('; ')}`,
    );
  }

  formatMessageAge(message, nowMs = Date.now()) {
    const sentAtMs = Number(message?.sentAtMs);

    if (!Number.isFinite(sentAtMs) || sentAtMs <= 0) {
      return '';
    }

    const elapsedMs = Math.max(0, nowMs - sentAtMs);

    if (elapsedMs < CHAT_AGE_MINUTE_MS) {
      return 'now';
    }

    const totalMinutes = Math.floor(elapsedMs / CHAT_AGE_MINUTE_MS);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];

    if (days > 0) {
      parts.push(`${days}d`);
    }

    if (hours > 0) {
      parts.push(`${hours}h`);
    }

    if (minutes > 0) {
      parts.push(`${minutes}m`);
    }

    return `${parts.slice(0, 2).join(' ')} ago`;
  }

  scheduleAgeRefresh(messages) {
    this.clearAgeRefreshTimer();

    const delayMs = this.getNextAgeRefreshDelayMs(messages);
    if (!delayMs) {
      return;
    }

    this.ageRefreshTimer = globalThis.setTimeout(() => {
      this.ageRefreshTimer = null;
      this.refreshMessageAges();
    }, delayMs);
    this.ageRefreshTimer?.unref?.();
  }

  refreshMessageAges() {
    for (const ageLabel of this.root?.querySelectorAll('.workshop-page__world-chat-age') ??
      []) {
      const age = this.formatMessageAge({ sentAtMs: ageLabel.dataset.sentAtMs });
      ageLabel.textContent = age;
    }

    this.scheduleAgeRefresh(this.getSelectedSnapshot().messages);
  }

  clearAgeRefreshTimer() {
    if (!this.ageRefreshTimer) {
      return;
    }

    globalThis.clearTimeout(this.ageRefreshTimer);
    this.ageRefreshTimer = null;
  }

  getNextAgeRefreshDelayMs(messages, nowMs = Date.now()) {
    const validSentTimes = this.getMessagesWithBody(messages)
      .map((message) => Number(message?.sentAtMs))
      .filter((sentAtMs) => Number.isFinite(sentAtMs) && sentAtMs > 0);

    if (!validSentTimes.length) {
      return null;
    }

    return Math.min(
      ...validSentTimes.map((sentAtMs) => {
        const elapsedMs = Math.max(0, nowMs - sentAtMs);
        const untilNextMinuteMs =
          elapsedMs < CHAT_AGE_MINUTE_MS
            ? CHAT_AGE_MINUTE_MS - elapsedMs
            : CHAT_AGE_MINUTE_MS - (elapsedMs % CHAT_AGE_MINUTE_MS);

        return Math.max(1_000, untilNextMinuteMs + CHAT_AGE_REFRESH_FUZZ_MS);
      }),
    );
  }

  formatSender(message) {
    const username = message?.username || 'wizard';
    const fallbackLevel = this.isSystemMessage(message) ? null : 1;
    const playerLevel = this.normalizePlayerLevel(message?.playerLevel, fallbackLevel);
    const allianceTag = this.normalizeAllianceTag(message?.allianceTag);
    const prefix = allianceTag ? `[${allianceTag}] ` : '';

    if (!playerLevel) {
      return `${prefix}${username}`;
    }

    return `${prefix}${username}(${playerLevel})`;
  }

  normalizeAllianceTag(tag) {
    return normalizeAllianceTag(tag);
  }

  createSenderContent(message) {
    const username = message?.username || 'wizard';
    const fallbackLevel = this.isSystemMessage(message) ? null : 1;
    const playerLevel = this.normalizePlayerLevel(message?.playerLevel, fallbackLevel);
    const tag = createAllianceTagSpan(message?.allianceTag, message?.allianceTagColor);
    const nodes = [];

    if (tag) {
      nodes.push(tag, document.createTextNode(' '));
    }

    if (this.isSystemMessage(message)) {
      nodes.push(document.createTextNode(username));
      return nodes;
    }

    nodes.push(
      createPlayerInfoLink(
        {
          identity: message?.senderIdentity,
          username,
          allianceTag: message?.allianceTag,
          allianceTagColor: message?.allianceTagColor,
          playerLevel,
        },
        {
          onOpenPlayerInfo: this.onOpenPlayerInfo,
          text: username,
          className: 'workshop-page__world-chat-player-link',
        },
      ),
    );

    if (playerLevel) {
      nodes.push(document.createTextNode(`(${playerLevel})`));
    }

    return nodes;
  }

  isSystemMessage(message) {
    return message?.username === 'system';
  }

  isRecipeDiscoveryMessage(message) {
    return (
      this.isSystemMessage(message) &&
      /\bunlocked the recipe of\b/i.test(String(message?.body ?? ''))
    );
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

    const snapshot = this.getSelectedSnapshot();
    const facade = this.getSelectedSendFacade();
    const canSend =
      Boolean(facade) &&
      Boolean(snapshot.connected) &&
      !this.sending &&
      Boolean(this.refs.input.value.trim());

    this.refs.input.disabled = !facade || !snapshot.connected || this.sending;
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

  scrollMessagesToBottom({ afterLayout = false } = {}) {
    if (!this.refs.messages) {
      return;
    }

    this.refs.messages.scrollTop = this.refs.messages.scrollHeight;
    const EventConstructor = this.refs.messages.ownerDocument?.defaultView?.Event;
    if (typeof EventConstructor === 'function') {
      this.refs.messages.dispatchEvent(new EventConstructor('scroll'));
    }

    if (afterLayout) {
      this.scheduleScrollMessagesToBottom();
    }
  }

  scheduleScrollMessagesToBottom() {
    this.cancelScheduledScroll();

    const run = () => {
      this.scrollFrame = 0;
      this.scrollMessagesToBottom();
    };

    if (typeof requestAnimationFrame !== 'function') {
      run();
      return;
    }

    this.scrollFrame = requestAnimationFrame(run);
  }

  cancelScheduledScroll() {
    if (!this.scrollFrame) {
      return;
    }

    if (typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.scrollFrame);
    }

    this.scrollFrame = 0;
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }

  getSelectedChannel() {
    return (
      CHAT_CHANNELS.find((channel) => channel.id === this.selectedChannelId) ??
      CHAT_CHANNELS[0]
    );
  }

  getSelectedSnapshot() {
    if (this.selectedChannelId === 'alliance') {
      return {
        connected: this.tradeAllianceSnapshot?.connected && this.hasAllianceChat(),
        messages: this.tradeAllianceSnapshot?.allianceChatMessages ?? [],
      };
    }

    return this.worldChatSnapshot ?? { ...EMPTY_CHAT_SNAPSHOT };
  }

  getSelectedSendFacade() {
    if (this.selectedChannelId === 'alliance') {
      return this.tradeAllianceFacade;
    }

    return this.worldChatFacade;
  }

  hasAllianceChat() {
    return Boolean(this.tradeAllianceSnapshot?.ownAlliance);
  }
}
