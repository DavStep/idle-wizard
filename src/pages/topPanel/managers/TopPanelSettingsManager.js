import {
  DEFAULT_PLAYER_COLOR_MODE,
  normalizePlayerColorMode,
} from '../../../player/playerColorModes.js';
import {
  DEFAULT_PLAYER_FONT,
  normalizePlayerFont,
} from '../../../player/playerFonts.js';
import {
  DEFAULT_PLAYER_THEME,
  normalizePlayerTheme,
} from '../../../player/playerThemes.js';
import { getDefaultPlayerVisualSettingsResearched } from '../../../player/playerVisualSettings.js';

const DEFAULT_SETTINGS_TAB = 'account';
const SETTINGS_TABS = ['account', 'report', 'theme'];
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
  constructor({ playerFacade, gameplayFacade, feedbackFacade } = {}) {
    this.playerFacade = playerFacade;
    this.gameplayFacade = gameplayFacade;
    this.feedbackFacade = feedbackFacade;
    this.refs = null;
    this.unsubscribe = null;
    this.gameplayUnsubscribe = null;
    this.playerSnapshot = null;
    this.gameplaySnapshot = null;
    this.visible = false;
    this.usernamePromptMode = false;
    this.feedbackMode = false;
    this.settingsTab = DEFAULT_SETTINGS_TAB;
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
      this.selectVisualSetting('theme', event.currentTarget.dataset.theme);
    };
    this.handleFontClick = (event) => {
      this.selectVisualSetting('font', event.currentTarget.dataset.font);
    };
    this.handleColorModeClick = (event) => {
      this.selectVisualSetting('color', event.currentTarget.dataset.colorMode);
    };
    this.handleVisualSettingResearchClick = (event) => {
      this.researchVisualSetting(
        event.currentTarget.dataset.visualCategory,
        event.currentTarget.dataset.visualOption,
      );
    };
    this.handleSettingsTabClick = (event) =>
      this.selectSettingsTab(event.currentTarget.dataset.settingsTab);
    this.handleFeedbackOpenClick = (event) =>
      this.selectFeedbackKind(event.currentTarget.dataset.feedbackKind);
    this.handleFeedbackSubmit = (event) => {
      event.preventDefault();
      void this.sendFeedback();
    };
    this.handleFeedbackSendPointerDown = (event) => {
      if (!this.visible || this.settingsTab !== 'report') {
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
    for (const button of this.refs.settingsTabButtons) {
      button.addEventListener('click', this.handleSettingsTabClick);
    }
    for (const button of this.refs.feedbackOpenButtons) {
      button.addEventListener('click', this.handleFeedbackOpenClick);
    }
    this.refs.feedbackForm.addEventListener('submit', this.handleFeedbackSubmit);
    this.refs.feedbackSendButton.addEventListener(
      'pointerdown',
      this.handleFeedbackSendPointerDown,
    );

    for (const button of this.refs.themeButtons) {
      button.addEventListener('click', this.handleThemeClick);
    }

    for (const button of this.refs.fontButtons) {
      button.addEventListener('click', this.handleFontClick);
    }

    for (const button of this.refs.colorModeButtons) {
      button.addEventListener('click', this.handleColorModeClick);
    }

    for (const button of this.refs.visualSettingResearchButtons ?? []) {
      button.addEventListener('click', this.handleVisualSettingResearchClick);
    }

    document.addEventListener('keydown', this.handleKeydown);

    if (this.playerFacade) {
      this.unsubscribe = this.playerFacade.subscribe((snapshot) =>
        this.renderPlayerSnapshot(snapshot),
      );
      this.renderPlayerSnapshot(this.playerFacade.getSnapshot());
    } else {
      this.renderPlayerSnapshot({
        username: 'wizard',
        theme: DEFAULT_PLAYER_THEME,
        font: DEFAULT_PLAYER_FONT,
        colorMode: DEFAULT_PLAYER_COLOR_MODE,
      });
    }

    if (this.gameplayFacade) {
      this.gameplayUnsubscribe = this.gameplayFacade.subscribe((snapshot) =>
        this.renderGameplaySnapshot(snapshot),
      );
      this.renderGameplaySnapshot(this.gameplayFacade.getSnapshot());
    } else {
      this.renderGameplaySnapshot({
        crystal: { current: 0 },
        visualSettings: {
          costsCrystal: {},
          researched: getDefaultPlayerVisualSettingsResearched(),
        },
      });
    }

    this.applyVisibility();
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.gameplayUnsubscribe?.();
    this.gameplayUnsubscribe = null;

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
      for (const button of this.refs.settingsTabButtons) {
        button.removeEventListener('click', this.handleSettingsTabClick);
      }
      for (const button of this.refs.feedbackOpenButtons) {
        button.removeEventListener('click', this.handleFeedbackOpenClick);
      }
      this.refs.feedbackForm.removeEventListener('submit', this.handleFeedbackSubmit);
      this.refs.feedbackSendButton.removeEventListener(
        'pointerdown',
        this.handleFeedbackSendPointerDown,
      );

      for (const button of this.refs.themeButtons) {
        button.removeEventListener('click', this.handleThemeClick);
      }

      for (const button of this.refs.fontButtons) {
        button.removeEventListener('click', this.handleFontClick);
      }

      for (const button of this.refs.colorModeButtons) {
        button.removeEventListener('click', this.handleColorModeClick);
      }

      for (const button of this.refs.visualSettingResearchButtons ?? []) {
        button.removeEventListener('click', this.handleVisualSettingResearchClick);
      }
    }

    document.removeEventListener('keydown', this.handleKeydown);
    this.refs = null;
    this.playerSnapshot = null;
    this.gameplaySnapshot = null;
    this.visible = false;
    this.feedbackPending = false;
    this.previousFocus = null;
  }

  show() {
    this.showSettings();
  }

  showSettings() {
    this.open({ usernamePromptMode: false, feedbackMode: false, settingsTab: 'account' });
  }

  showUsernamePrompt() {
    this.open({ usernamePromptMode: true, feedbackMode: false, settingsTab: 'account' });
  }

  showFeedback(feedbackKind = DEFAULT_FEEDBACK_KIND) {
    this.open({
      usernamePromptMode: false,
      feedbackMode: false,
      settingsTab: 'report',
      feedbackKind,
    });
  }

  isVisible() {
    return this.visible;
  }

  open({
    usernamePromptMode,
    feedbackMode,
    settingsTab = DEFAULT_SETTINGS_TAB,
    feedbackKind = DEFAULT_FEEDBACK_KIND,
  }) {
    if (!this.refs) {
      return;
    }

    if (!this.visible) {
      this.previousFocus = document.activeElement;
    }

    this.visible = true;
    this.usernamePromptMode = usernamePromptMode;
    this.feedbackMode = feedbackMode;
    this.settingsTab = usernamePromptMode
      ? DEFAULT_SETTINGS_TAB
      : this.normalizeSettingsTab(feedbackMode ? 'report' : settingsTab);
    this.feedbackKind = this.normalizeFeedbackKind(feedbackKind);
    this.applyMode();
    this.refs.usernameInput.value =
      usernamePromptMode && this.refs.usernameButton.textContent === 'wizard'
        ? ''
        : this.refs.usernameButton.textContent;
    this.clearUsernameError();
    this.clearFeedbackStatus();
    this.clearVisualSettingStatus();
    this.setFeedbackPending(false);
    this.applyVisibility();
    this.focusWithoutScroll(
      this.settingsTab === 'report' && !usernamePromptMode
        ? this.refs.feedbackInput
        : this.getFocusTarget(),
    );
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.usernamePromptMode = false;
    this.feedbackMode = false;
    this.settingsTab = DEFAULT_SETTINGS_TAB;
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
    if (!this.refs || this.feedbackPending || this.settingsTab !== 'report') {
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

    if (!this.refs || !this.visible || this.settingsTab !== 'report') {
      return;
    }

    if (result?.ok) {
      this.refs.feedbackInput.value = '';
      this.showFeedbackStatus('sent');
      return;
    }

    this.showFeedbackStatus(this.getFeedbackErrorMessage(result?.reason));
  }

  renderPlayerSnapshot(snapshot) {
    if (!this.refs || !snapshot) {
      return;
    }

    this.playerSnapshot = snapshot;

    if (this.refs.usernameButton.textContent !== snapshot.username) {
      this.refs.usernameButton.textContent = snapshot.username;
    }

    this.applyThemeSelection(snapshot.theme);
    this.applyFontSelection(snapshot.font);
    this.applyColorModeSelection(snapshot.colorMode);
    this.renderVisualSettingPrices();

    if (
      this.usernamePromptMode &&
      !snapshot.shouldPromptForUsername &&
      snapshot.username !== 'wizard'
    ) {
      this.hide();
    }
  }

  renderGameplaySnapshot(snapshot) {
    if (!this.refs || !snapshot) {
      return;
    }

    this.gameplaySnapshot = snapshot;
    this.renderVisualSettingPrices();
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

  applyFontSelection(font) {
    const selectedFont = normalizePlayerFont(font);

    for (const button of this.refs.fontButtons) {
      const selected = button.dataset.font === selectedFont;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-checked', selected ? 'true' : 'false');
    }
  }

  selectVisualSetting(categoryKey, optionKey) {
    if (!this.refs) {
      return;
    }

    if (!this.isVisualSettingResearched(categoryKey, optionKey)) {
      this.showVisualSettingStatus('research first');
      return;
    }

    if (this.isCurrentVisualSetting(categoryKey, optionKey)) {
      this.clearVisualSettingStatus();
      return;
    }

    this.applyPlayerVisualSetting(categoryKey, optionKey);
    this.clearVisualSettingStatus();
  }

  researchVisualSetting(categoryKey, optionKey) {
    if (!this.refs) {
      return;
    }

    if (this.isVisualSettingResearched(categoryKey, optionKey)) {
      this.clearVisualSettingStatus();
      return;
    }

    const result = this.gameplayFacade?.buyVisualSettingOption
      ? this.gameplayFacade.buyVisualSettingOption(categoryKey, optionKey)
      : { ok: true };

    if (!result?.ok) {
      this.showVisualSettingStatus(this.getVisualSettingErrorMessage(result?.reason));
      this.renderVisualSettingPrices();
      return;
    }

    this.clearVisualSettingStatus();
  }

  applyPlayerVisualSetting(categoryKey, optionKey) {
    if (categoryKey === 'theme') {
      this.playerFacade?.setTheme?.(optionKey);
      return;
    }

    if (categoryKey === 'font') {
      this.playerFacade?.setFont?.(optionKey);
      return;
    }

    if (categoryKey === 'color') {
      this.playerFacade?.setColorMode?.(optionKey);
    }
  }

  renderVisualSettingPrices() {
    if (!this.refs) {
      return;
    }

    const currentCrystal = Number(this.gameplaySnapshot?.crystal?.current ?? 0);

    for (const button of this.refs.visualSettingButtons ?? []) {
      const categoryKey = button.dataset.visualCategory;
      const optionKey = button.dataset.visualOption;
      const costCrystal = this.getVisualSettingCostCrystal(categoryKey, optionKey);
      const selected = this.isCurrentVisualSetting(categoryKey, optionKey);
      const researched = this.isVisualSettingResearched(categoryKey, optionKey);
      const canResearch = !researched && (costCrystal <= currentCrystal || !this.gameplayFacade);
      const price = this.refs.visualSettingResearchButtons?.find(
        (candidate) =>
          candidate.dataset.visualCategory === categoryKey &&
          candidate.dataset.visualOption === optionKey,
      );
      const label = button.textContent ?? '';
      const priceLabel = this.formatVisualSettingPrice(costCrystal);
      const statusLabel = researched ? 'researched' : priceLabel;

      if (price && price.textContent !== statusLabel) {
        price.textContent = statusLabel;
      }

      button.disabled = !researched;
      button.classList.toggle('is-unresearched', !researched);
      button.setAttribute(
        'aria-label',
        `${label}, ${researched ? 'researched' : 'not researched'}${
          selected ? ', selected' : ''
        }`,
      );

      if (price) {
        price.disabled = researched || !canResearch;
        price.classList.toggle('is-unaffordable', !researched && !canResearch);
        price.setAttribute(
          'aria-label',
          `${label}, ${statusLabel}${canResearch ? '' : researched ? '' : ', not enough crystal'}`,
        );
      }
    }
  }

  getVisualSettingCostCrystal(categoryKey, optionKey) {
    const costs = this.gameplaySnapshot?.visualSettings?.costsCrystal?.[categoryKey];
    const cost = Number(costs?.[optionKey] ?? 0);

    return Number.isFinite(cost) && cost > 0 ? Math.floor(cost) : 0;
  }

  isCurrentVisualSetting(categoryKey, optionKey) {
    if (categoryKey === 'theme') {
      return normalizePlayerTheme(this.playerSnapshot?.theme) === optionKey;
    }

    if (categoryKey === 'font') {
      return normalizePlayerFont(this.playerSnapshot?.font) === optionKey;
    }

    if (categoryKey === 'color') {
      return normalizePlayerColorMode(this.playerSnapshot?.colorMode) === optionKey;
    }

    return false;
  }

  isVisualSettingResearched(categoryKey, optionKey) {
    const researched = this.gameplaySnapshot?.visualSettings?.researched;
    const categoryResearch =
      researched && typeof researched === 'object' ? researched[categoryKey] : null;

    if (categoryResearch && typeof categoryResearch === 'object') {
      return Boolean(categoryResearch[optionKey]);
    }

    return Boolean(getDefaultPlayerVisualSettingsResearched()[categoryKey]?.[optionKey]);
  }

  formatVisualSettingPrice(costCrystal) {
    return costCrystal > 0 ? `${costCrystal} crystal` : 'free';
  }

  getVisualSettingErrorMessage(reason) {
    if (reason === 'not_enough_crystal') {
      return 'not enough crystal';
    }

    if (reason === 'already_researched') {
      return 'researched';
    }

    return 'setting unavailable';
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
    const title = this.usernamePromptMode ? 'username' : 'settings';
    const closeLabel = this.usernamePromptMode ? 'later' : 'close';

    this.refs.settings.classList.toggle('is-username-prompt', this.usernamePromptMode);
    this.refs.settings.classList.toggle('is-feedback', false);
    this.getFocusTarget().setAttribute(
      'aria-label',
      this.usernamePromptMode ? 'Set username' : 'Settings',
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

    this.applySettingsTabSelection();
    this.applyFeedbackKindSelection();
  }

  selectSettingsTab(settingsTab) {
    const nextTab = this.normalizeSettingsTab(settingsTab);

    if (this.settingsTab === nextTab) {
      return;
    }

    this.settingsTab = nextTab;
    this.applyMode();
  }

  selectFeedbackKind(feedbackKind) {
    this.settingsTab = 'report';
    this.feedbackKind = this.normalizeFeedbackKind(feedbackKind);
    this.clearFeedbackStatus();
    this.applyMode();
    this.focusWithoutScroll(this.refs.feedbackInput);
  }

  applySettingsTabSelection() {
    if (!this.refs) {
      return;
    }

    const activeTab = this.usernamePromptMode ? DEFAULT_SETTINGS_TAB : this.settingsTab;
    const panes = {
      account: this.refs.accountPane,
      report: this.refs.reportPane,
      theme: this.refs.themePane,
    };

    this.refs.settingsTabs.hidden = this.usernamePromptMode;

    for (const button of this.refs.settingsTabButtons) {
      const selected = button.dataset.settingsTab === activeTab;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.tabIndex = selected ? 0 : -1;
    }

    for (const [tab, pane] of Object.entries(panes)) {
      pane.hidden = tab !== activeTab;
    }
  }

  applyFeedbackKindSelection() {
    if (!this.refs) {
      return;
    }

    for (const button of this.refs.feedbackOpenButtons) {
      const selected = button.dataset.feedbackKind === this.feedbackKind;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
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

  showVisualSettingStatus(message) {
    if (!this.refs) {
      return;
    }

    if (this.refs.visualSettingStatus.textContent !== message) {
      this.refs.visualSettingStatus.textContent = message;
    }

    this.refs.visualSettingStatus.hidden = false;
  }

  clearVisualSettingStatus() {
    if (!this.refs) {
      return;
    }

    if (this.refs.visualSettingStatus.textContent !== '') {
      this.refs.visualSettingStatus.textContent = '';
    }

    this.refs.visualSettingStatus.hidden = true;
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

  normalizeSettingsTab(settingsTab) {
    return SETTINGS_TABS.includes(settingsTab) ? settingsTab : DEFAULT_SETTINGS_TAB;
  }

  createFeedbackBody(body) {
    const prefix = this.getFeedbackConfig().prefix;
    return prefix ? `${prefix}\n${body}` : body;
  }

  getFocusTarget() {
    return this.refs.settingsPanel ?? this.refs.settingsDialog;
  }

  focusWithoutScroll(element) {
    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus();
    }
  }
}
