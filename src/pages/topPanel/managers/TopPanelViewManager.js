import { getPlayerVisualSettingCategories } from '../../../player/playerVisualSettings.js';
import { getClientReleaseVersion } from '../../../shared/clientReleaseVersion.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import {
  createPlayerCharacterIcon,
  getPlayerCharacterImageUrl,
} from '../../shared/playerCharacterIcon.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setResourceColor } from '../../shared/resourceColor.js';

export class TopPanelViewManager {
  constructor() {
    this.root = null;
    this.refs = {};
  }

  mount(stage) {
    if (!stage) {
      throw new Error('TopPanelViewManager requires a stage element.');
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'room-top-panel-layer';
    this.root.append(this.createPanel(), this.createSettings(), this.createLevelPopup());
    stage.append(this.root);

    return this.root;
  }

  unmount() {
    this.root?.remove();
    this.root = null;
    this.refs = {};
  }

  getRefs() {
    if (!this.root) {
      throw new Error('TopPanelViewManager is not mounted.');
    }

    return this.refs;
  }

  createPanel() {
    const panel = document.createElement('section');
    panel.className = 'room-top-panel style-panel';
    panel.setAttribute('aria-label', 'Player status');
    this.refs.panel = panel;

    this.refs.usernameAvatarButton = document.createElement('button');
    this.refs.usernameAvatarButton.className = 'room-top-panel__avatar-button';
    this.refs.usernameAvatarButton.type = 'button';
    this.refs.usernameAvatarButton.setAttribute('aria-label', 'open avatar');

    this.refs.usernameAvatar = createPlayerCharacterIcon(
      'elara',
      'room-top-panel__username-avatar',
    );
    this.refs.usernameAvatar.dataset.character = 'elara';
    this.refs.usernameAvatar.loading = 'eager';

    this.refs.usernameAvatarButton.append(this.refs.usernameAvatar);

    this.refs.usernameButton = document.createElement('button');
    this.refs.usernameButton.className = 'room-top-panel__username';
    this.refs.usernameButton.type = 'button';
    this.refs.usernameButton.dataset.tutorialId = 'top:username';
    this.refs.usernameButton.setAttribute('aria-label', 'open settings');

    this.refs.usernameLabel = document.createElement('span');
    this.refs.usernameLabel.className = 'room-top-panel__username-label';
    this.refs.usernameLabel.textContent = 'wizard';

    this.refs.usernameButton.append(this.refs.usernameLabel);

    this.refs.levelButton = document.createElement('button');
    this.refs.levelButton.className = 'room-top-panel__level';
    this.refs.levelButton.type = 'button';
    this.refs.levelButton.textContent = 'level 1';
    this.refs.levelButton.setAttribute('aria-label', 'open level rewards');
    this.refs.levelValue = this.refs.levelButton;

    const identityRow = document.createElement('div');
    identityRow.className = 'room-top-panel__identity-row';
    const contextCurrency = this.createResource('crystal', '0 crystal');
    identityRow.append(this.refs.usernameButton, this.refs.levelButton);

    this.refs.resources = document.createElement('div');
    this.refs.resources.className = 'room-top-panel__resources';
    this.refs.resources.setAttribute('aria-label', 'resources');
    const rightStatus = document.createElement('div');
    rightStatus.className = 'room-top-panel__right-status';
    rightStatus.append(this.createResource('coin', '0 coin'), contextCurrency);
    this.refs.resources.append(this.createResource('mana', '0/0 mana'), rightStatus);

    panel.append(this.refs.usernameAvatarButton, identityRow, this.refs.resources);
    return panel;
  }

  createResource(label, value) {
    const resource = document.createElement('span');
    resource.className = 'room-top-panel__resource';
    resource.setAttribute('aria-label', label);
    setResourceColor(resource, label);

    const val = document.createElement('span');
    val.className = 'room-top-panel__resource-val';
    setResourceIconText(val, value);

    if (label === 'mana') {
      resource.classList.add('room-top-panel__resource--mana');
      resource.dataset.tutorialId = 'top:mana';
      this.refs.manaValue = val;
    }

    if (label === 'coin') {
      this.refs.coinValue = val;
    }

    if (label === 'crystal') {
      this.refs.crystalValue = val;
      this.refs.contextCurrency = resource;
      this.refs.contextCurrencyValue = val;
    }

    if (label === 'mana') {
      const line = document.createElement('span');
      line.className = 'room-top-panel__resource-line';
      line.append(val);

      this.refs.manaRateValue = document.createElement('span');
      this.refs.manaRateValue.className = 'room-top-panel__mana-rate';
      this.refs.manaRateValue.textContent = '+0/s';

      resource.append(line, this.refs.manaRateValue);
      return resource;
    }

    if (label === 'crystal') {
      resource.hidden = true;
    }

    resource.append(val);
    return resource;
  }

  createSettings() {
    this.refs.settings = document.createElement('section');
    this.refs.settings.className = 'room-top-panel__settings';
    this.refs.settings.hidden = true;

    this.refs.settingsPanel = document.createElement('section');
    this.refs.settingsPanel.className = 'room-top-panel__settings-panel';
    this.refs.settingsPanel.setAttribute('aria-label', 'Settings');
    this.refs.settingsPanel.setAttribute('aria-modal', 'true');
    this.refs.settingsPanel.setAttribute('role', 'dialog');
    this.refs.settingsPanel.tabIndex = -1;

    this.refs.settingsDialog = document.createElement('section');
    this.refs.settingsDialog.className = 'room-top-panel__settings-dialog style-dialog';

    this.refs.settingsTitle = document.createElement('div');
    this.refs.settingsTitle.className = 'style-box__title';
    this.refs.settingsTitle.textContent = 'settings';

    this.refs.settingsCloseButton = document.createElement('button');
    this.refs.settingsCloseButton.className = 'room-top-panel__settings-close';
    this.refs.settingsCloseButton.type = 'button';
    this.refs.settingsCloseButton.textContent = 'close';

    this.refs.accountPane = document.createElement('div');
    this.refs.accountPane.id = 'room-top-panel-settings-account';
    this.refs.accountPane.className =
      'room-top-panel__settings-pane room-top-panel__account-pane';
    this.refs.accountPane.setAttribute('role', 'tabpanel');

    const usernameSection = document.createElement('div');
    usernameSection.className =
      'room-top-panel__settings-section room-top-panel__username-section';

    const usernameLabel = document.createElement('label');
    usernameLabel.className = 'room-top-panel__settings-label';
    usernameLabel.textContent = 'username';
    usernameLabel.htmlFor = 'room-top-panel-username-input';

    this.refs.usernameForm = document.createElement('form');
    this.refs.usernameForm.className = 'room-top-panel__username-form';

    this.refs.usernameInput = document.createElement('input');
    this.refs.usernameInput.className = 'style-input room-top-panel__username-input';
    this.refs.usernameInput.id = 'room-top-panel-username-input';
    this.refs.usernameInput.type = 'text';
    this.refs.usernameInput.maxLength = 24;
    this.refs.usernameInput.autocomplete = 'off';
    this.refs.usernameInput.setAttribute('enterkeyhint', 'done');
    this.refs.usernameInput.setAttribute('aria-label', 'username');
    this.refs.usernameInput.dataset.tutorialId = 'top:username-input';

    this.refs.usernameError = document.createElement('div');
    this.refs.usernameError.className = 'room-top-panel__username-error';
    this.refs.usernameError.hidden = true;

    const actions = document.createElement('div');
    actions.className = 'room-top-panel__username-actions';

    this.refs.usernameSaveButton = document.createElement('button');
    this.refs.usernameSaveButton.className = 'style-button room-top-panel__username-save';
    this.refs.usernameSaveButton.type = 'submit';
    this.refs.usernameSaveButton.textContent = 'save';

    actions.append(this.refs.usernameSaveButton);
    this.refs.usernameForm.append(this.refs.usernameInput, this.refs.usernameError, actions);
    usernameSection.append(usernameLabel, this.refs.usernameForm);

    this.refs.avatarPane = document.createElement('div');
    this.refs.avatarPane.id = 'room-top-panel-settings-avatar';
    this.refs.avatarPane.className =
      'room-top-panel__settings-pane room-top-panel__avatar-pane';
    this.refs.avatarPane.setAttribute('role', 'tabpanel');
    this.refs.avatarPane.setAttribute('aria-label', 'avatar');
    const characterSection = this.createVisualSettingSection('character', {
      boxed: false,
      title: false,
    });
    this.refs.avatarPane.append(characterSection);

    this.refs.themePane = document.createElement('div');
    this.refs.themePane.id = 'room-top-panel-settings-theme';
    this.refs.themePane.className =
      'room-top-panel__settings-pane room-top-panel__theme-pane';
    this.refs.themePane.setAttribute('role', 'tabpanel');

    const deviceSection = this.createDevicePreferenceSection();
    const themeSection = this.createVisualSettingSection('theme');
    const fontSection = this.createVisualSettingSection('font');
    const progressBarSection = this.createVisualSettingSection('progressBar');

    this.refs.visualSettingStatus = document.createElement('div');
    this.refs.visualSettingStatus.className = 'room-top-panel__visual-status';
    this.refs.visualSettingStatus.hidden = true;

    this.refs.themePane.append(
      deviceSection,
      themeSection,
      fontSection,
      progressBarSection,
      this.refs.visualSettingStatus,
    );

    this.refs.reportPane = document.createElement('div');
    this.refs.reportPane.id = 'room-top-panel-settings-report';
    this.refs.reportPane.className =
      'room-top-panel__settings-pane room-top-panel__report-pane';
    this.refs.reportPane.setAttribute('role', 'tabpanel');

    const feedbackSection = document.createElement('div');
    feedbackSection.className =
      'room-top-panel__settings-section room-top-panel__feedback-section';

    const feedbackButtons = document.createElement('div');
    feedbackButtons.className = 'room-top-panel__feedback-buttons';
    this.refs.feedbackOpenButtons = [];

    for (const option of [
      { kind: 'feedback', label: 'feedback', ref: 'feedbackOpenButton' },
      { kind: 'bug', label: 'bug', ref: 'bugReportOpenButton' },
      { kind: 'feature', label: 'feature', ref: 'featureRequestOpenButton' },
    ]) {
      const button = document.createElement('button');
      button.className = 'style-button room-top-panel__feedback-open';
      button.type = 'button';
      button.textContent = option.label;
      button.dataset.feedbackKind = option.kind;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', option.label);
      feedbackButtons.append(button);
      this.refs.feedbackOpenButtons.push(button);
      this.refs[option.ref] = button;
    }

    feedbackSection.append(feedbackButtons);

    this.refs.feedbackForm = document.createElement('form');
    this.refs.feedbackForm.className =
      'room-top-panel__settings-section room-top-panel__feedback-form';

    this.refs.feedbackInput = document.createElement('textarea');
    this.refs.feedbackInput.className = 'style-input room-top-panel__feedback-input';
    this.refs.feedbackInput.maxLength = 2000;
    this.refs.feedbackInput.rows = 7;
    this.refs.feedbackInput.placeholder = 'write feedback';
    this.refs.feedbackInput.setAttribute('aria-label', 'feedback');

    this.refs.feedbackStatus = document.createElement('div');
    this.refs.feedbackStatus.className = 'room-top-panel__feedback-status';
    this.refs.feedbackStatus.hidden = true;

    const feedbackActions = document.createElement('div');
    feedbackActions.className = 'room-top-panel__feedback-actions';

    this.refs.feedbackSendButton = document.createElement('button');
    this.refs.feedbackSendButton.className = 'style-button room-top-panel__feedback-send';
    this.refs.feedbackSendButton.type = 'submit';
    this.refs.feedbackSendButton.textContent = 'send';

    feedbackActions.append(this.refs.feedbackSendButton);
    this.refs.feedbackForm.append(
      this.refs.feedbackInput,
      this.refs.feedbackStatus,
      feedbackActions,
    );

    this.refs.authSection = document.createElement('div');
    this.refs.authSection.className =
      'room-top-panel__settings-section room-top-panel__auth-section';
    this.refs.authSection.hidden = true;

    const authLabel = document.createElement('div');
    authLabel.className = 'room-top-panel__settings-label';
    authLabel.textContent = 'account';

    this.refs.authStatus = document.createElement('div');
    this.refs.authStatus.className = 'room-top-panel__auth-status';
    this.refs.authStatus.textContent = 'not connected';

    this.refs.authButton = document.createElement('button');
    this.refs.authButton.className = 'style-button room-top-panel__auth-button';
    this.refs.authButton.type = 'button';
    this.refs.authButton.textContent = 'connect account';

    this.refs.authSection.append(authLabel, this.refs.authStatus, this.refs.authButton);

    const versionSection = document.createElement('div');
    versionSection.className =
      'room-top-panel__settings-section room-top-panel__version-section';

    const versionLabel = document.createElement('div');
    versionLabel.className = 'room-top-panel__settings-label';
    versionLabel.textContent = 'version';

    this.refs.versionValue = document.createElement('div');
    this.refs.versionValue.className = 'room-top-panel__version-value';
    this.refs.versionValue.textContent = getClientReleaseVersion();
    this.refs.versionValue.setAttribute('aria-label', 'client release version');

    versionSection.append(versionLabel, this.refs.versionValue);

    this.refs.accountPane.append(
      usernameSection,
      this.refs.authSection,
      versionSection,
    );
    this.refs.reportPane.hidden = true;
    this.refs.reportPane.append(feedbackSection, this.refs.feedbackForm);

    this.refs.settingsTabs = document.createElement('div');
    this.refs.settingsTabs.className = 'room-top-panel__settings-tabs';
    this.refs.settingsTabs.setAttribute('aria-label', 'Settings sections');
    this.refs.settingsTabs.setAttribute('role', 'tablist');
    this.refs.settingsTabButtons = [];

    for (const tab of [
      { key: 'account', label: 'account', controls: this.refs.accountPane.id },
      { key: 'report', label: 'report', controls: this.refs.reportPane.id },
      { key: 'theme', label: 'configurations', controls: this.refs.themePane.id },
    ]) {
      const button = document.createElement('button');
      button.id = `room-top-panel-settings-${tab.key}-tab`;
      button.className = 'style-button room-top-panel__settings-tab-button';
      button.type = 'button';
      button.textContent = tab.label;
      button.dataset.settingsTab = tab.key;
      button.setAttribute('aria-controls', tab.controls);
      button.setAttribute('aria-selected', 'false');
      button.setAttribute('role', 'tab');
      if (tab.key === 'theme') {
        button.dataset.tutorialId = 'top:settings:theme-tab';
      }
      this.refs.settingsTabs.append(button);
      this.refs.settingsTabButtons.push(button);
    }

    this.refs.accountPane.setAttribute('aria-labelledby', 'room-top-panel-settings-account-tab');
    this.refs.reportPane.setAttribute('aria-labelledby', 'room-top-panel-settings-report-tab');
    this.refs.themePane.setAttribute('aria-labelledby', 'room-top-panel-settings-theme-tab');

    this.refs.settingsDialog.append(
      this.refs.settingsTitle,
      this.refs.settingsCloseButton,
      this.refs.accountPane,
      this.refs.avatarPane,
      this.refs.reportPane,
      this.refs.themePane,
    );
    this.refs.settingsPanel.append(this.refs.settingsDialog, this.refs.settingsTabs);
    this.refs.settings.append(this.refs.settingsPanel);

    return this.refs.settings;
  }

  createDevicePreferenceSection() {
    const section = document.createElement('section');
    section.className =
      'room-top-panel__settings-section room-top-panel__device-section style-box';

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'device';

    section.append(
      title,
      this.createPreferenceRow({
        label: 'haptics',
        ref: 'hapticsToggleButton',
        rowClassName: 'room-top-panel__haptics-row',
        labelClassName: 'room-top-panel__haptics-label',
        toggleClassName: 'room-top-panel__haptics-toggle',
      }),
      this.createPreferenceRow({
        label: 'music',
        ref: 'musicToggleButton',
      }),
      this.createPreferenceRow({
        label: 'sfx',
        ref: 'sfxToggleButton',
      }),
    );

    return section;
  }

  createPreferenceRow({
    label,
    ref,
    rowClassName = '',
    labelClassName = '',
    toggleClassName = '',
  }) {
    const row = document.createElement('div');
    row.className = ['room-top-panel__preference-row', rowClassName]
      .filter(Boolean)
      .join(' ');

    const name = document.createElement('span');
    name.className = ['room-top-panel__preference-label', labelClassName]
      .filter(Boolean)
      .join(' ');
    name.textContent = label;

    const button = document.createElement('button');
    button.className = ['style-button', 'room-top-panel__preference-toggle', toggleClassName]
      .filter(Boolean)
      .join(' ');
    button.type = 'button';
    button.textContent = 'on';
    button.setAttribute('aria-pressed', 'true');
    button.setAttribute('aria-label', `${label} on`);

    this.refs[ref] = button;
    row.append(name, button);
    return row;
  }

  createVisualSettingSection(categoryKey, { boxed = true, title: showTitle = true } = {}) {
    const category = getPlayerVisualSettingCategories().find(
      (candidate) => candidate.key === categoryKey,
    );
    if (!category) {
      throw new Error(`Unknown visual setting category: ${categoryKey}`);
    }

    const section = document.createElement('section');
    section.className = [
      'room-top-panel__settings-section',
      'room-top-panel__visual-section',
      `room-top-panel__${categoryKey}-section`,
      boxed ? 'style-box' : 'room-top-panel__visual-section--plain',
    ]
      .filter(Boolean)
      .join(' ');

    const title = showTitle ? document.createElement('div') : null;
    if (title) {
      title.className = 'style-box__title';
      title.textContent = category.label;
    }

    const buttons = document.createElement('div');
    buttons.className = `room-top-panel__visual-options room-top-panel__${categoryKey}-buttons`;
    buttons.setAttribute('role', 'radiogroup');
    buttons.setAttribute('aria-label', category.label);

    this.refs.visualSettingButtons ??= [];
    this.refs.visualSettingResearchButtons ??= [];
    this.refs.visualSettingPriceLabels ??= [];

    if (categoryKey === 'theme') {
      this.refs.themeButtons = [];
    }

    if (categoryKey === 'font') {
      this.refs.fontButtons = [];
    }

    if (categoryKey === 'color') {
      this.refs.colorModeButtons = [];
    }

    if (categoryKey === 'character') {
      this.refs.characterButtons = [];
    }

    if (categoryKey === 'progressBar') {
      this.refs.progressBarButtons = [];
    }

    if (categoryKey === 'icons') {
      this.refs.iconModeButtons = [];
    }

    for (const option of category.options) {
      const row = document.createElement('div');
      row.className = 'room-top-panel__visual-option';

      const name = document.createElement('button');
      name.className = 'room-top-panel__visual-option-name';
      name.type = 'button';
      name.textContent = option.label;
      name.dataset.visualCategory = categoryKey;
      name.dataset.visualOption = option.key;
      name.setAttribute('role', 'radio');
      name.setAttribute('aria-checked', 'false');

      if (categoryKey === 'theme') {
        name.classList.add('room-top-panel__theme-button');
        name.dataset.theme = option.key;
        this.refs.themeButtons.push(name);
      } else if (categoryKey === 'font') {
        name.classList.add('room-top-panel__font-button');
        name.dataset.font = option.key;
        this.refs.fontButtons.push(name);
      } else if (categoryKey === 'color') {
        name.classList.add('room-top-panel__color-button');
        name.dataset.colorMode = option.key;
        this.refs.colorModeButtons.push(name);
      } else if (categoryKey === 'character') {
        name.classList.add('room-top-panel__character-button');
        name.dataset.character = option.key;

        const iconFrame = document.createElement('span');
        iconFrame.className = 'room-top-panel__character-option-frame';

        const icon = createPlayerCharacterIcon(
          option.key,
          'room-top-panel__character-option-icon',
        );
        icon.loading = 'eager';

        const silhouette = document.createElement('span');
        silhouette.className = 'room-top-panel__character-option-silhouette';
        silhouette.style.setProperty(
          '--room-top-panel-character-mask',
          `url("${getPlayerCharacterImageUrl(option.key)}")`,
        );
        silhouette.setAttribute('aria-hidden', 'true');

        const lock = document.createElement('span');
        lock.className = 'room-top-panel__character-lock';
        lock.setAttribute('aria-hidden', 'true');

        const label = document.createElement('span');
        label.className = 'room-top-panel__character-option-label';
        label.textContent = option.label;
        iconFrame.append(icon, silhouette, lock);
        name.replaceChildren(iconFrame, label);
        this.refs.characterButtons.push(name);
        buttons.append(name);
        this.refs.visualSettingButtons.push(name);
        continue;
      } else if (categoryKey === 'progressBar') {
        name.classList.add('room-top-panel__progress-bar-button');
        name.dataset.progressBar = option.key;
        this.refs.progressBarButtons.push(name);
      } else {
        name.classList.add('room-top-panel__icon-button');
        name.dataset.iconMode = option.key;
        this.refs.iconModeButtons.push(name);
      }

      const price = document.createElement('button');
      price.className = 'room-top-panel__visual-option-price';
      price.type = 'button';
      price.textContent = 'free';
      price.dataset.visualCategory = categoryKey;
      price.dataset.visualOption = option.key;

      const preview = this.createVisualSettingPreview(categoryKey, option);

      row.append(name, price);
      if (preview) {
        row.append(preview);
      }
      buttons.append(row);
      this.refs.visualSettingButtons.push(name);
      this.refs.visualSettingResearchButtons.push(price);
      this.refs.visualSettingPriceLabels.push(price);
    }

    section.append(...[title, buttons].filter(Boolean));
    return section;
  }

  createVisualSettingPreview(categoryKey, option) {
    if (categoryKey === 'theme') {
      return this.createThemePreview(option.key);
    }

    if (categoryKey === 'progressBar') {
      return this.createProgressBarPreview(option.key);
    }

    if (categoryKey === 'color') {
      return this.createColorModePreview(option.key);
    }

    if (categoryKey === 'icons') {
      return this.createIconModePreview(option.key);
    }

    return null;
  }

  createThemePreview(themeKey) {
    const preview = document.createElement('div');
    preview.className = 'room-top-panel__visual-preview room-top-panel__theme-preview';
    preview.dataset.previewTheme = themeKey;
    preview.setAttribute('aria-hidden', 'true');

    const box = document.createElement('div');
    box.className = 'room-top-panel__theme-preview-box';

    const title = document.createElement('div');
    title.className = 'room-top-panel__theme-preview-title';
    title.textContent = 'sample';

    const row = document.createElement('div');
    row.className = 'room-top-panel__theme-preview-row';
    row.textContent = '34.4k coin';

    box.append(
      title,
      row,
      this.createProgressPreviewRail(themeKey === 'witchcraft' ? 0.72 : 0.64),
    );
    preview.append(box);
    return preview;
  }

  createProgressBarPreview(progressBarKey) {
    const preview = document.createElement('div');
    preview.className = 'room-top-panel__visual-preview room-top-panel__progress-preview';
    preview.dataset.previewProgress = progressBarKey;
    preview.setAttribute('aria-hidden', 'true');
    preview.append(this.createProgressPreviewRail(0.68));
    return preview;
  }

  createProgressPreviewRail(ratio) {
    const progress = document.createElement('div');
    progress.className = 'style-progress room-top-panel__preview-progress';

    const fill = document.createElement('div');
    fill.className = 'style-progress__fill room-top-panel__preview-progress-fill';
    fill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;

    progress.append(fill);
    return progress;
  }

  createColorModePreview(colorModeKey) {
    const preview = document.createElement('div');
    preview.className = 'room-top-panel__visual-preview room-top-panel__color-preview';
    preview.dataset.previewColor = colorModeKey;
    preview.setAttribute('aria-hidden', 'true');

    preview.append(
      this.createColorPreviewItem('mana 100/100', 'mana'),
      this.createColorPreviewItem('34.4k coin', 'coin'),
      this.createColorPreviewItem('sage seed', 'seed'),
      this.createColorPreviewItem('sage', 'herb'),
      this.createColorPreviewItem('mana tonic', 'potion'),
    );

    return preview;
  }

  createColorPreviewItem(label, resource) {
    const item = document.createElement('span');
    item.className = 'room-top-panel__color-preview-item';
    item.textContent = label;
    setResourceColor(item, resource);
    return item;
  }

  createIconModePreview(iconModeKey) {
    const preview = document.createElement('div');
    preview.className = 'room-top-panel__visual-preview room-top-panel__icon-preview';
    preview.dataset.previewIcons = iconModeKey;
    preview.setAttribute('aria-hidden', 'true');

    preview.append(
      this.createIconPreviewItem('34.4k coin', 'resource', 'coin'),
      this.createIconPreviewItem('sage seed', 'seed', 'sageSeed'),
      this.createIconPreviewItem('mana tonic', 'potion', 'manaTonic'),
    );

    return preview;
  }

  createIconPreviewItem(label, kind, itemKey) {
    const item = document.createElement('span');
    item.className = 'room-top-panel__icon-preview-item';
    item.textContent = label;

    if (kind === 'resource') {
      setResourceIconText(item, label);
      return item;
    }

    setItemIconLabel(item, kind, itemKey);
    return item;
  }

  createLevelPopup() {
    this.refs.levelPopup = document.createElement('section');
    this.refs.levelPopup.className = 'room-top-panel__level-popup';
    this.refs.levelPopup.hidden = true;

    this.refs.levelPanel = document.createElement('section');
    this.refs.levelPanel.className = 'room-top-panel__level-panel';
    this.refs.levelPanel.setAttribute('aria-label', 'Level rewards');
    this.refs.levelPanel.setAttribute('aria-modal', 'true');
    this.refs.levelPanel.setAttribute('role', 'dialog');
    this.refs.levelPanel.tabIndex = -1;

    this.refs.levelDialog = document.createElement('section');
    this.refs.levelDialog.className = 'room-top-panel__level-dialog style-dialog';

    this.refs.levelTitle = document.createElement('div');
    this.refs.levelTitle.className = 'style-box__title room-top-panel__level-title';
    this.refs.levelTitle.textContent = 'level 1';

    this.refs.levelCurrentLabel = document.createElement('div');
    this.refs.levelCurrentLabel.className = 'room-top-panel__level-current';
    this.refs.levelCurrentLabel.textContent = 'current';
    this.refs.levelCurrentLabel.hidden = true;

    this.refs.levelContent = document.createElement('div');
    this.refs.levelContent.className = 'room-top-panel__level-content';

    this.refs.levelAddedRows = document.createElement('div');
    this.refs.levelAddedRows.className =
      'room-top-panel__level-rows room-top-panel__level-added-rows';

    this.refs.levelDivider = document.createElement('div');
    this.refs.levelDivider.className = 'room-top-panel__level-divider';
    this.refs.levelDivider.hidden = true;

    this.refs.levelTotalRows = document.createElement('div');
    this.refs.levelTotalRows.className =
      'room-top-panel__level-rows room-top-panel__level-total-rows';

    this.refs.levelContent.append(
      this.refs.levelAddedRows,
      this.refs.levelDivider,
      this.refs.levelTotalRows,
    );

    const pager = document.createElement('div');
    pager.className = 'room-top-panel__level-pager';

    this.refs.levelPreviousButton = document.createElement('button');
    this.refs.levelPreviousButton.className =
      'style-button room-top-panel__level-pager-button';
    this.refs.levelPreviousButton.type = 'button';
    this.refs.levelPreviousButton.setAttribute('role', 'tab');

    this.refs.levelNextButton = document.createElement('button');
    this.refs.levelNextButton.className = 'style-button room-top-panel__level-pager-button';
    this.refs.levelNextButton.type = 'button';
    this.refs.levelNextButton.setAttribute('role', 'tab');

    pager.append(this.refs.levelPreviousButton, this.refs.levelNextButton);
    pager.setAttribute('aria-label', 'Level navigation');
    pager.setAttribute('role', 'tablist');

    this.refs.levelCloseButton = document.createElement('button');
    this.refs.levelCloseButton.className = 'room-top-panel__level-close';
    this.refs.levelCloseButton.type = 'button';
    this.refs.levelCloseButton.textContent = 'close';

    this.refs.levelDialog.append(
      this.refs.levelTitle,
      this.refs.levelCurrentLabel,
      this.refs.levelCloseButton,
      this.refs.levelContent,
    );
    this.refs.levelPanel.append(this.refs.levelDialog, pager);
    this.refs.levelPopup.append(this.refs.levelPanel);

    return this.refs.levelPopup;
  }
}
