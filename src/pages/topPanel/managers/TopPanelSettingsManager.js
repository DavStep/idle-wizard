import {
  DEFAULT_PLAYER_COLOR_MODE,
  normalizePlayerColorMode,
} from '../../../player/playerColorModes.js';
import {
  DEFAULT_PLAYER_FONT,
  normalizePlayerFont,
} from '../../../player/playerFonts.js';
import {
  DEFAULT_PLAYER_ICON_MODE,
  normalizePlayerIconMode,
} from '../../../player/playerIconModes.js';
import {
  DEFAULT_PLAYER_CHARACTER,
  normalizePlayerCharacter,
} from '../../../player/playerCharacters.js';
import {
  DEFAULT_PLAYER_PROGRESS_BAR,
  normalizePlayerProgressBar,
} from '../../../player/playerProgressBars.js';
import {
  DEFAULT_PLAYER_THEME,
  normalizePlayerTheme,
} from '../../../player/playerThemes.js';
import { getDefaultPlayerVisualSettingsResearched } from '../../../player/playerVisualSettings.js';
import { getPlayerCharacterImageUrl } from '../../shared/playerCharacterIcon.js';
import { TOP_PANEL_USERNAME_SAVED_EVENT } from '../topPanelEvents.js';

const DEFAULT_SETTINGS_TAB = 'account';
const DEFAULT_USERNAME = 'wizard';
const SETTINGS_TABS = ['account', 'avatar', 'report', 'theme'];
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
  constructor({
    playerFacade,
    gameplayFacade,
    feedbackFacade,
    hapticsFacade,
    soundSettingsFacade,
  } = {}) {
    this.playerFacade = playerFacade;
    this.gameplayFacade = gameplayFacade;
    this.feedbackFacade = feedbackFacade;
    this.hapticsFacade = hapticsFacade;
    this.soundSettingsFacade = soundSettingsFacade;
    this.refs = null;
    this.unsubscribe = null;
    this.gameplayUnsubscribe = null;
    this.hapticsUnsubscribe = null;
    this.soundSettingsUnsubscribe = null;
    this.playerSnapshot = null;
    this.gameplaySnapshot = null;
    this.visible = false;
    this.usernamePromptMode = false;
    this.feedbackMode = false;
    this.settingsTab = DEFAULT_SETTINGS_TAB;
    this.feedbackKind = DEFAULT_FEEDBACK_KIND;
    this.feedbackPending = false;
    this.primeUsernameSelection = false;
    this.reselectUsernameOnClick = false;
    this.previousFocus = null;
    this.handleUsernameClick = () => this.showSettings();
    this.handleAvatarClick = () => this.showAvatarSettings();
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
    this.handleSaveClick = (event) => {
      if (!this.visible) {
        return;
      }

      event.preventDefault();
      this.submitForm(this.refs.usernameForm, this.refs.usernameSaveButton);
    };
    this.handleInputKeydown = (event) => {
      if (!this.visible || event.key !== 'Enter' || event.isComposing) {
        return;
      }

      event.preventDefault();
      this.saveUsername();
    };
    this.handleUsernameInputFocus = () => {
      if (!this.visible) {
        return;
      }

      this.selectUsernameOnFirstFocus();
    };
    this.handleUsernameInputClick = () => {
      if (!this.visible || !this.reselectUsernameOnClick) {
        return;
      }

      this.selectUsernameInputText();
      this.reselectUsernameOnClick = false;
    };
    this.handleUsernameInputInput = () => {
      this.reselectUsernameOnClick = false;
      this.clearUsernameError();
    };
    this.handleUsernameInputBlur = () => {
      this.reselectUsernameOnClick = false;
    };
    this.handleThemeClick = (event) => {
      this.selectVisualSetting('theme', event.currentTarget.dataset.theme);
    };
    this.handleFontClick = (event) => {
      this.selectVisualSetting('font', event.currentTarget.dataset.font);
    };
    this.handleColorModeClick = (event) => {
      this.selectVisualSetting('color', event.currentTarget.dataset.colorMode);
    };
    this.handleCharacterClick = (event) => {
      this.selectVisualSetting('character', event.currentTarget.dataset.character);
    };
    this.handleIconModeClick = (event) => {
      this.selectVisualSetting('icons', event.currentTarget.dataset.iconMode);
    };
    this.handleProgressBarClick = (event) => {
      this.selectVisualSetting('progressBar', event.currentTarget.dataset.progressBar);
    };
    this.handleVisualSettingResearchClick = (event) => {
      this.researchVisualSetting(
        event.currentTarget.dataset.visualCategory,
        event.currentTarget.dataset.visualOption,
      );
    };
    this.handleSettingsTabClick = (event) =>
      this.selectSettingsTab(event.currentTarget.dataset.settingsTab);
    this.handleHapticsToggleClick = () => this.toggleHaptics();
    this.handleMusicToggleClick = () => this.toggleMusic();
    this.handleSfxToggleClick = () => this.toggleSfx();
    this.handleFeedbackOpenClick = (event) =>
      this.selectFeedbackKind(event.currentTarget.dataset.feedbackKind);
    this.handleFeedbackSubmit = (event) => {
      event.preventDefault();
      void this.sendFeedback();
    };
    this.handleFeedbackSendClick = (event) => {
      if (!this.visible || this.settingsTab !== 'report') {
        return;
      }

      event.preventDefault();
      this.submitForm(this.refs.feedbackForm, this.refs.feedbackSendButton);
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
    this.refs.usernameAvatarButton?.addEventListener('click', this.handleAvatarClick);
    this.refs.usernameButton.addEventListener('click', this.handleUsernameClick);
    this.refs.settingsCloseButton.addEventListener('click', this.handleCloseClick);
    this.refs.settings.addEventListener('click', this.handleOverlayClick);
    this.refs.usernameForm.addEventListener('submit', this.handleSubmit);
    this.refs.usernameSaveButton.addEventListener('click', this.handleSaveClick);
    this.refs.usernameInput.addEventListener('keydown', this.handleInputKeydown);
    this.refs.usernameInput.addEventListener('focus', this.handleUsernameInputFocus);
    this.refs.usernameInput.addEventListener('click', this.handleUsernameInputClick);
    this.refs.usernameInput.addEventListener('input', this.handleUsernameInputInput);
    this.refs.usernameInput.addEventListener('blur', this.handleUsernameInputBlur);
    for (const button of this.refs.settingsTabButtons) {
      button.addEventListener('click', this.handleSettingsTabClick);
    }
    this.refs.hapticsToggleButton.addEventListener('click', this.handleHapticsToggleClick);
    this.refs.musicToggleButton.addEventListener('click', this.handleMusicToggleClick);
    this.refs.sfxToggleButton.addEventListener('click', this.handleSfxToggleClick);
    for (const button of this.refs.feedbackOpenButtons) {
      button.addEventListener('click', this.handleFeedbackOpenClick);
    }
    this.refs.feedbackForm.addEventListener('submit', this.handleFeedbackSubmit);
    this.refs.feedbackSendButton.addEventListener('click', this.handleFeedbackSendClick);

    for (const button of this.refs.themeButtons) {
      button.addEventListener('click', this.handleThemeClick);
    }

    for (const button of this.refs.fontButtons) {
      button.addEventListener('click', this.handleFontClick);
    }

    for (const button of this.refs.colorModeButtons) {
      button.addEventListener('click', this.handleColorModeClick);
    }

    for (const button of this.refs.characterButtons ?? []) {
      button.addEventListener('click', this.handleCharacterClick);
    }

    for (const button of this.refs.progressBarButtons) {
      button.addEventListener('click', this.handleProgressBarClick);
    }

    for (const button of this.refs.iconModeButtons) {
      button.addEventListener('click', this.handleIconModeClick);
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
        character: DEFAULT_PLAYER_CHARACTER,
        theme: DEFAULT_PLAYER_THEME,
        font: DEFAULT_PLAYER_FONT,
        colorMode: DEFAULT_PLAYER_COLOR_MODE,
        iconMode: DEFAULT_PLAYER_ICON_MODE,
        progressBar: DEFAULT_PLAYER_PROGRESS_BAR,
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

    if (this.hapticsFacade) {
      this.hapticsUnsubscribe = this.hapticsFacade.subscribe((snapshot) =>
        this.renderHapticsSnapshot(snapshot),
      );
      this.renderHapticsSnapshot(this.hapticsFacade.getSnapshot());
    } else {
      this.renderHapticsSnapshot({ enabled: true });
    }

    if (this.soundSettingsFacade) {
      this.soundSettingsUnsubscribe = this.soundSettingsFacade.subscribe((snapshot) =>
        this.renderSoundSettingsSnapshot(snapshot),
      );
      this.renderSoundSettingsSnapshot(this.soundSettingsFacade.getSnapshot());
    } else {
      this.renderSoundSettingsSnapshot({ musicEnabled: true, sfxEnabled: true });
    }

    this.applyVisibility();
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.gameplayUnsubscribe?.();
    this.gameplayUnsubscribe = null;
    this.hapticsUnsubscribe?.();
    this.hapticsUnsubscribe = null;
    this.soundSettingsUnsubscribe?.();
    this.soundSettingsUnsubscribe = null;

    if (this.refs) {
      this.refs.usernameAvatarButton?.removeEventListener('click', this.handleAvatarClick);
      this.refs.usernameButton.removeEventListener('click', this.handleUsernameClick);
      this.refs.settingsCloseButton.removeEventListener('click', this.handleCloseClick);
      this.refs.settings.removeEventListener('click', this.handleOverlayClick);
      this.refs.usernameForm.removeEventListener('submit', this.handleSubmit);
      this.refs.usernameSaveButton.removeEventListener('click', this.handleSaveClick);
      this.refs.usernameInput.removeEventListener('keydown', this.handleInputKeydown);
      this.refs.usernameInput.removeEventListener('focus', this.handleUsernameInputFocus);
      this.refs.usernameInput.removeEventListener('click', this.handleUsernameInputClick);
      this.refs.usernameInput.removeEventListener('input', this.handleUsernameInputInput);
      this.refs.usernameInput.removeEventListener('blur', this.handleUsernameInputBlur);
      for (const button of this.refs.settingsTabButtons) {
        button.removeEventListener('click', this.handleSettingsTabClick);
      }
      this.refs.hapticsToggleButton.removeEventListener(
        'click',
        this.handleHapticsToggleClick,
      );
      this.refs.musicToggleButton.removeEventListener('click', this.handleMusicToggleClick);
      this.refs.sfxToggleButton.removeEventListener('click', this.handleSfxToggleClick);
      for (const button of this.refs.feedbackOpenButtons) {
        button.removeEventListener('click', this.handleFeedbackOpenClick);
      }
      this.refs.feedbackForm.removeEventListener('submit', this.handleFeedbackSubmit);
      this.refs.feedbackSendButton.removeEventListener('click', this.handleFeedbackSendClick);

      for (const button of this.refs.themeButtons) {
        button.removeEventListener('click', this.handleThemeClick);
      }

      for (const button of this.refs.fontButtons) {
        button.removeEventListener('click', this.handleFontClick);
      }

      for (const button of this.refs.colorModeButtons) {
        button.removeEventListener('click', this.handleColorModeClick);
      }

      for (const button of this.refs.characterButtons ?? []) {
        button.removeEventListener('click', this.handleCharacterClick);
      }

      for (const button of this.refs.progressBarButtons) {
        button.removeEventListener('click', this.handleProgressBarClick);
      }

      for (const button of this.refs.iconModeButtons) {
        button.removeEventListener('click', this.handleIconModeClick);
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
    this.primeUsernameSelection = false;
    this.reselectUsernameOnClick = false;
    this.previousFocus = null;
  }

  show() {
    this.showSettings();
  }

  showSettings() {
    this.open({ usernamePromptMode: false, feedbackMode: false, settingsTab: 'account' });
  }

  showAvatarSettings() {
    this.open({ usernamePromptMode: false, feedbackMode: false, settingsTab: 'avatar' });
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
      usernamePromptMode && this.getVisibleUsername() === DEFAULT_USERNAME
        ? ''
        : this.getVisibleUsername();
    this.primeUsernameSelection = this.refs.usernameInput.value.length > 0;
    this.reselectUsernameOnClick = false;
    this.clearUsernameError();
    this.clearFeedbackStatus();
    this.clearVisualSettingStatus();
    this.setFeedbackPending(false);
    this.applyVisibility();
    this.renderVisualSettingPrices();
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
    this.primeUsernameSelection = false;
    this.reselectUsernameOnClick = false;
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
    const CustomEventClass =
      this.refs?.settings?.ownerDocument?.defaultView?.CustomEvent ?? globalThis.CustomEvent;
    if (typeof CustomEventClass !== 'function') {
      this.hide();
      return;
    }
    this.refs?.settings?.dispatchEvent(
      new CustomEventClass(TOP_PANEL_USERNAME_SAVED_EVENT, {
        bubbles: true,
      }),
    );
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

  submitForm(form, submitter) {
    if (!form) {
      return;
    }

    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit(submitter);
      return;
    }

    const EventClass = form.ownerDocument?.defaultView?.Event ?? globalThis.Event;
    form.dispatchEvent(new EventClass('submit', { bubbles: true, cancelable: true }));
  }

  renderPlayerSnapshot(snapshot) {
    if (!this.refs || !snapshot) {
      return;
    }

    this.playerSnapshot = snapshot;

    if (this.refs.usernameLabel.textContent !== snapshot.username) {
      this.refs.usernameLabel.textContent = snapshot.username;
    }

    this.applyThemeSelection(snapshot.theme);
    this.applyFontSelection(snapshot.font);
    this.applyColorModeSelection(snapshot.colorMode);
    this.applyIconModeSelection(snapshot.iconMode);
    this.applyCharacter(snapshot.character, snapshot.iconMode);
    this.applyCharacterSelection(snapshot.character);
    this.applyProgressBarSelection(snapshot.progressBar);
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

  renderHapticsSnapshot(snapshot = {}) {
    if (!this.refs?.hapticsToggleButton) {
      return;
    }

    this.renderToggleButton(this.refs.hapticsToggleButton, 'haptics', snapshot.enabled !== false);
  }

  renderSoundSettingsSnapshot(snapshot = {}) {
    if (!this.refs?.musicToggleButton || !this.refs?.sfxToggleButton) {
      return;
    }

    this.renderToggleButton(
      this.refs.musicToggleButton,
      'music',
      snapshot.musicEnabled !== false,
    );
    this.renderToggleButton(this.refs.sfxToggleButton, 'sfx', snapshot.sfxEnabled !== false);
  }

  renderToggleButton(button, name, enabled) {
    const label = enabled ? 'on' : 'off';
    button.textContent = label;
    button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    button.setAttribute('aria-label', `${name} ${label}`);
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

  applyIconModeSelection(iconMode) {
    const selectedIconMode = normalizePlayerIconMode(iconMode);

    for (const button of this.refs.iconModeButtons) {
      const selected = button.dataset.iconMode === selectedIconMode;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-checked', selected ? 'true' : 'false');
    }
  }

  applyCharacter(character, iconMode) {
    if (!this.refs?.usernameAvatar || !this.refs?.usernameButton) {
      return;
    }

    const selectedCharacter = normalizePlayerCharacter(character);
    const showAvatar = normalizePlayerIconMode(iconMode) === 'icons';
    const avatarSrc = getPlayerCharacterImageUrl(selectedCharacter);

    if (this.refs.usernameAvatar.dataset.character !== selectedCharacter) {
      this.refs.usernameAvatar.src = avatarSrc;
      this.refs.usernameAvatar.dataset.character = selectedCharacter;
    }

    this.refs.usernameAvatar.hidden = !showAvatar;
    if (this.refs.usernameAvatarButton) {
      this.refs.usernameAvatarButton.hidden = !showAvatar;
    }
    this.refs.usernameButton.classList.toggle('has-avatar', showAvatar);
    this.refs.panel?.classList.toggle('has-avatar', showAvatar);
  }

  applyCharacterSelection(character) {
    const selectedCharacter = normalizePlayerCharacter(character);

    for (const button of this.refs.characterButtons ?? []) {
      const selected = button.dataset.character === selectedCharacter;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-checked', selected ? 'true' : 'false');
    }
  }

  applyProgressBarSelection(progressBar) {
    const selectedProgressBar = normalizePlayerProgressBar(progressBar);

    for (const button of this.refs.progressBarButtons) {
      const selected = button.dataset.progressBar === selectedProgressBar;
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
      return { ok: false, reason: 'unmounted' };
    }

    if (this.isVisualSettingResearched(categoryKey, optionKey)) {
      this.clearVisualSettingStatus();
      return {
        ok: true,
        reason: 'already_researched',
        category: categoryKey,
        optionKey,
      };
    }

    const result = this.gameplayFacade?.buyVisualSettingOption
      ? this.gameplayFacade.buyVisualSettingOption(categoryKey, optionKey)
      : { ok: true };

    if (!result?.ok) {
      this.showVisualSettingStatus(this.getVisualSettingErrorMessage(result?.reason));
      this.renderVisualSettingPrices();
      return result;
    }

    this.clearVisualSettingStatus();
    return result;
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
      return;
    }

    if (categoryKey === 'character') {
      this.playerFacade?.setCharacter?.(optionKey);
      return;
    }

    if (categoryKey === 'progressBar') {
      this.playerFacade?.setProgressBar?.(optionKey);
      return;
    }

    if (categoryKey === 'icons') {
      this.playerFacade?.setIconMode?.(optionKey);
    }
  }

  renderVisualSettingPrices() {
    if (!this.refs || !this.visible) {
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

      button.disabled = !researched && costCrystal > 0;
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

    if (categoryKey === 'character') {
      return normalizePlayerCharacter(this.playerSnapshot?.character) === optionKey;
    }

    if (categoryKey === 'progressBar') {
      return normalizePlayerProgressBar(this.playerSnapshot?.progressBar) === optionKey;
    }

    if (categoryKey === 'icons') {
      return normalizePlayerIconMode(this.playerSnapshot?.iconMode) === optionKey;
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
    const title = this.usernamePromptMode
      ? 'username'
      : this.settingsTab === 'avatar'
        ? 'avatar'
        : 'settings';
    const closeLabel = this.usernamePromptMode ? 'later' : 'close';

    this.refs.settings.classList.toggle('is-username-prompt', this.usernamePromptMode);
    this.refs.settings.classList.toggle('is-feedback', false);
    this.getFocusTarget().setAttribute(
      'aria-label',
      this.usernamePromptMode
        ? 'Set username'
        : this.settingsTab === 'avatar'
          ? 'Avatar'
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
    this.renderVisualSettingPrices();
  }

  toggleHaptics() {
    this.hapticsFacade?.toggleEnabled?.();
  }

  toggleMusic() {
    this.soundSettingsFacade?.toggleMusicEnabled?.();
  }

  toggleSfx() {
    this.soundSettingsFacade?.toggleSfxEnabled?.();
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
      avatar: this.refs.avatarPane,
      report: this.refs.reportPane,
      theme: this.refs.themePane,
    };

    this.refs.settingsTabs.hidden = this.usernamePromptMode || activeTab === 'avatar';

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

  getVisibleUsername() {
    return this.refs?.usernameLabel?.textContent ?? this.refs?.usernameButton?.textContent ?? '';
  }

  selectUsernameOnFirstFocus() {
    if (!this.primeUsernameSelection) {
      return;
    }

    this.primeUsernameSelection = false;
    this.reselectUsernameOnClick = true;
    this.selectUsernameInputText();
  }

  selectUsernameInputText() {
    const input = this.refs?.usernameInput;

    if (!input) {
      return;
    }

    input.select?.();

    try {
      input.setSelectionRange(0, input.value.length);
    } catch {
      // Selection APIs are not guaranteed for every input implementation.
    }
  }

  focusWithoutScroll(element) {
    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus();
    }
  }
}
