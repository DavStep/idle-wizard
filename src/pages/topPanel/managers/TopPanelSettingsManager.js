import {
  DEFAULT_PLAYER_COLOR_MODE,
  normalizePlayerColorMode,
} from '../../../player/playerColorModes.js';
import {
  DEFAULT_PLAYER_THEME,
  normalizePlayerTheme,
} from '../../../player/playerThemes.js';

const DEFAULT_FEEDBACK_KIND = 'feedback';
const FEEDBACK_KIND_CONFIG = {
  feedback: {
    title: 'feedback',
    ariaLabel: 'Feedback',
    placeholder: 'write feedback',
    emptyMessage: 'write feedback',
    prefix: '',
  },
  bug: {
    title: 'report a bug',
    ariaLabel: 'Report a bug',
    placeholder: 'describe the bug',
    emptyMessage: 'describe the bug',
    prefix: 'bug report:',
  },
  feature: {
    title: 'request a feature',
    ariaLabel: 'Request a feature',
    placeholder: 'describe the feature',
    emptyMessage: 'describe the feature',
    prefix: 'feature request:',
  },
};

export class TopPanelSettingsManager {
  constructor({ playerFacade, feedbackFacade } = {}) {
    this.playerFacade = playerFacade;
    this.feedbackFacade = feedbackFacade;
    this.refs = null;
    this.unsubscribe = null;
    this.visible = false;
    this.usernamePromptMode = false;
    this.feedbackMode = false;
    this.feedbackKind = DEFAULT_FEEDBACK_KIND;
    this.feedbackPending = false;
    this.previousFocus = null;
    this.handleUsernameClick = () => this.showSettings();
    this.handleCloseClick = () => this.hide();
    this.handleOverlayClick = (event) => {
      if (event.target === this.refs?.settings) {
        this.hide();
      }
    };
    this.handleSubmit = (event) => {
      event.preventDefault();
      this.saveUsername();
    };
    this.handleInputKeydown = (event) => {
      if (!this.visible || event.key !== 'Enter' || event.isComposing) {
        return;
      }

      event.preventDefault();
      this.saveUsername();
    };
    this.handleSavePressStart = (event) => {
      if (!this.visible) {
        return;
      }

      event.preventDefault();
      this.saveUsername();
    };
    this.handleSavePointerDown = (event) => this.handleSavePressStart(event);
    this.handleSaveTouchStart = (event) => this.handleSavePressStart(event);
    this.handleThemeClick = (event) => {
      this.playerFacade?.setTheme?.(event.currentTarget.dataset.theme);
    };
    this.handleColorModeClick = (event) => {
      this.playerFacade?.setColorMode?.(event.currentTarget.dataset.colorMode);
    };
    this.handleFeedbackOpenClick = (event) =>
      this.showFeedback(event.currentTarget.dataset.feedbackKind);
    this.handleFeedbackSubmit = (event) => {
      event.preventDefault();
      void this.sendFeedback();
    };
    this.handleFeedbackSendPointerDown = (event) => {
      if (!this.visible || !this.feedbackMode) {
        return;
      }

      event.preventDefault();
      void this.sendFeedback();
    };
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
    this.refs.usernameButton.addEventListener('click', this.handleUsernameClick);
    this.refs.settingsCloseButton.addEventListener('click', this.handleCloseClick);
    this.refs.settings.addEventListener('click', this.handleOverlayClick);
    this.refs.usernameForm.addEventListener('submit', this.handleSubmit);
    this.refs.usernameInput.addEventListener('keydown', this.handleInputKeydown);
    this.refs.usernameSaveButton.addEventListener('pointerdown', this.handleSavePointerDown);
    this.refs.usernameSaveButton.addEventListener('touchstart', this.handleSaveTouchStart, {
      passive: false,
    });
    for (const button of this.refs.feedbackOpenButtons) {
      button.addEventListener('click', this.handleFeedbackOpenClick);
    }
    this.refs.feedbackForm.addEventListener('submit', this.handleFeedbackSubmit);
    this.refs.feedbackSendButton.addEventListener(
      'pointerdown',
      this.handleFeedbackSendPointerDown,
    );
    this.refs.feedbackCloseButton.addEventListener('click', this.handleCloseClick);

    for (const button of this.refs.themeButtons) {
      button.addEventListener('click', this.handleThemeClick);
    }

    for (const button of this.refs.colorModeButtons) {
      button.addEventListener('click', this.handleColorModeClick);
    }

    document.addEventListener('keydown', this.handleKeydown);

    if (this.playerFacade) {
      this.unsubscribe = this.playerFacade.subscribe((snapshot) => this.render(snapshot));
      this.render(this.playerFacade.getSnapshot());
    } else {
      this.render({
        username: 'wizard',
        theme: DEFAULT_PLAYER_THEME,
        colorMode: DEFAULT_PLAYER_COLOR_MODE,
      });
    }

    this.applyVisibility();
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;

    if (this.refs) {
      this.refs.usernameButton.removeEventListener('click', this.handleUsernameClick);
      this.refs.settingsCloseButton.removeEventListener('click', this.handleCloseClick);
      this.refs.settings.removeEventListener('click', this.handleOverlayClick);
      this.refs.usernameForm.removeEventListener('submit', this.handleSubmit);
      this.refs.usernameInput.removeEventListener('keydown', this.handleInputKeydown);
      this.refs.usernameSaveButton.removeEventListener(
        'pointerdown',
        this.handleSavePointerDown,
      );
      this.refs.usernameSaveButton.removeEventListener(
        'touchstart',
        this.handleSaveTouchStart,
      );
      for (const button of this.refs.feedbackOpenButtons) {
        button.removeEventListener('click', this.handleFeedbackOpenClick);
      }
      this.refs.feedbackForm.removeEventListener('submit', this.handleFeedbackSubmit);
      this.refs.feedbackSendButton.removeEventListener(
        'pointerdown',
        this.handleFeedbackSendPointerDown,
      );
      this.refs.feedbackCloseButton.removeEventListener('click', this.handleCloseClick);

      for (const button of this.refs.themeButtons) {
        button.removeEventListener('click', this.handleThemeClick);
      }

      for (const button of this.refs.colorModeButtons) {
        button.removeEventListener('click', this.handleColorModeClick);
      }
    }

    document.removeEventListener('keydown', this.handleKeydown);
    this.refs = null;
    this.visible = false;
    this.feedbackPending = false;
    this.previousFocus = null;
  }

  show() {
    this.showSettings();
  }

  showSettings() {
    this.open({ usernamePromptMode: false, feedbackMode: false });
  }

  showUsernamePrompt() {
    this.open({ usernamePromptMode: true, feedbackMode: false });
  }

  showFeedback(feedbackKind = DEFAULT_FEEDBACK_KIND) {
    this.open({
      usernamePromptMode: false,
      feedbackMode: true,
      feedbackKind,
    });
  }

  isVisible() {
    return this.visible;
  }

  open({ usernamePromptMode, feedbackMode, feedbackKind = DEFAULT_FEEDBACK_KIND }) {
    if (!this.refs) {
      return;
    }

    if (!this.visible) {
      this.previousFocus = document.activeElement;
    }

    this.visible = true;
    this.usernamePromptMode = usernamePromptMode;
    this.feedbackMode = feedbackMode;
    this.feedbackKind = feedbackMode
      ? this.normalizeFeedbackKind(feedbackKind)
      : DEFAULT_FEEDBACK_KIND;
    this.applyMode();
    this.refs.usernameInput.value =
      usernamePromptMode && this.refs.usernameButton.textContent === 'wizard'
        ? ''
        : this.refs.usernameButton.textContent;
    this.clearUsernameError();
    this.clearFeedbackStatus();
    this.setFeedbackPending(false);
    this.applyVisibility();
    this.focusWithoutScroll(feedbackMode ? this.refs.feedbackInput : this.refs.settingsDialog);
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.usernamePromptMode = false;
    this.feedbackMode = false;
    this.feedbackKind = DEFAULT_FEEDBACK_KIND;
    this.feedbackPending = false;
    this.applyMode();
    this.applyVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.focusWithoutScroll(this.previousFocus);
    }

    this.previousFocus = null;
  }

  saveUsername() {
    const username = this.refs.usernameInput.value;

    if (this.usernamePromptMode && !username.trim()) {
      this.showUsernameError('enter a name');
      this.focusWithoutScroll(this.refs.usernameInput);
      return;
    }

    this.playerFacade?.setUsername(username);
    this.hide();
  }

  async sendFeedback() {
    if (!this.refs || this.feedbackPending) {
      return;
    }

    const body = this.refs.feedbackInput.value;

    if (!body.trim()) {
      this.showFeedbackStatus(this.getFeedbackConfig().emptyMessage);
      this.focusWithoutScroll(this.refs.feedbackInput);
      return;
    }

    this.setFeedbackPending(true);
    this.clearFeedbackStatus();

    const result = this.feedbackFacade?.submitFeedback
      ? await this.feedbackFacade.submitFeedback(this.createFeedbackBody(body))
      : { ok: false, reason: 'offline' };

    this.setFeedbackPending(false);

    if (!this.refs || !this.visible || !this.feedbackMode) {
      return;
    }

    if (result?.ok) {
      this.refs.feedbackInput.value = '';
      this.showFeedbackStatus('sent');
      return;
    }

    this.showFeedbackStatus(this.getFeedbackErrorMessage(result?.reason));
  }

  render(snapshot) {
    if (!this.refs || !snapshot) {
      return;
    }

    if (this.refs.usernameButton.textContent !== snapshot.username) {
      this.refs.usernameButton.textContent = snapshot.username;
    }

    this.applyThemeSelection(snapshot.theme);
    this.applyColorModeSelection(snapshot.colorMode);

    if (
      this.usernamePromptMode &&
      !snapshot.shouldPromptForUsername &&
      snapshot.username !== 'wizard'
    ) {
      this.hide();
    }
  }

  applyThemeSelection(theme) {
    const selectedTheme = normalizePlayerTheme(theme);

    for (const button of this.refs.themeButtons) {
      const selected = button.dataset.theme === selectedTheme;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-checked', selected ? 'true' : 'false');
    }
  }

  applyColorModeSelection(colorMode) {
    const selectedColorMode = normalizePlayerColorMode(colorMode);

    for (const button of this.refs.colorModeButtons) {
      const selected = button.dataset.colorMode === selectedColorMode;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-checked', selected ? 'true' : 'false');
    }
  }

  applyVisibility() {
    if (!this.refs) {
      return;
    }

    this.refs.settings.hidden = !this.visible;
    this.refs.settings.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }

  applyMode() {
    if (!this.refs) {
      return;
    }

    const feedbackConfig = this.getFeedbackConfig();
    const title = this.feedbackMode
      ? feedbackConfig.title
      : this.usernamePromptMode
        ? 'username'
        : 'settings';
    const closeLabel = this.usernamePromptMode ? 'later' : 'close';

    this.refs.settings.classList.toggle('is-username-prompt', this.usernamePromptMode);
    this.refs.settings.classList.toggle('is-feedback', this.feedbackMode);
    this.refs.settingsDialog.setAttribute(
      'aria-label',
      this.feedbackMode
        ? feedbackConfig.ariaLabel
        : this.usernamePromptMode
          ? 'Set username'
          : 'Settings',
    );

    if (this.refs.feedbackInput.placeholder !== feedbackConfig.placeholder) {
      this.refs.feedbackInput.placeholder = feedbackConfig.placeholder;
    }

    if (this.refs.feedbackInput.getAttribute('aria-label') !== feedbackConfig.title) {
      this.refs.feedbackInput.setAttribute('aria-label', feedbackConfig.title);
    }

    if (this.refs.settingsTitle.textContent !== title) {
      this.refs.settingsTitle.textContent = title;
    }

    if (this.refs.settingsCloseButton.textContent !== closeLabel) {
      this.refs.settingsCloseButton.textContent = closeLabel;
    }
  }

  showUsernameError(message) {
    if (!this.refs) {
      return;
    }

    if (this.refs.usernameError.textContent !== message) {
      this.refs.usernameError.textContent = message;
    }

    this.refs.usernameError.hidden = false;
  }

  clearUsernameError() {
    if (!this.refs) {
      return;
    }

    if (this.refs.usernameError.textContent !== '') {
      this.refs.usernameError.textContent = '';
    }

    this.refs.usernameError.hidden = true;
  }

  showFeedbackStatus(message) {
    if (!this.refs) {
      return;
    }

    if (this.refs.feedbackStatus.textContent !== message) {
      this.refs.feedbackStatus.textContent = message;
    }

    this.refs.feedbackStatus.hidden = false;
  }

  clearFeedbackStatus() {
    if (!this.refs) {
      return;
    }

    if (this.refs.feedbackStatus.textContent !== '') {
      this.refs.feedbackStatus.textContent = '';
    }

    this.refs.feedbackStatus.hidden = true;
  }

  setFeedbackPending(pending) {
    if (!this.refs) {
      return;
    }

    this.feedbackPending = pending;
    this.refs.feedbackSendButton.disabled = pending;

    const label = pending ? 'sending' : 'send';
    if (this.refs.feedbackSendButton.textContent !== label) {
      this.refs.feedbackSendButton.textContent = label;
    }
  }

  getFeedbackErrorMessage(reason) {
    if (reason === 'empty_feedback') {
      return 'write feedback';
    }

    if (reason === 'offline') {
      return 'server unavailable';
    }

    return 'send failed';
  }

  getFeedbackConfig() {
    return FEEDBACK_KIND_CONFIG[this.feedbackKind] ?? FEEDBACK_KIND_CONFIG.feedback;
  }

  normalizeFeedbackKind(feedbackKind) {
    return FEEDBACK_KIND_CONFIG[feedbackKind] ? feedbackKind : DEFAULT_FEEDBACK_KIND;
  }

  createFeedbackBody(body) {
    const prefix = this.getFeedbackConfig().prefix;
    return prefix ? `${prefix}\n${body}` : body;
  }

  focusWithoutScroll(element) {
    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus();
    }
  }
}
