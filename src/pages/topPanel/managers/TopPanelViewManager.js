import { PLAYER_THEME_OPTIONS } from '../../../player/playerThemes.js';

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

    this.refs.usernameButton = document.createElement('button');
    this.refs.usernameButton.className = 'room-top-panel__username';
    this.refs.usernameButton.type = 'button';
    this.refs.usernameButton.textContent = 'wizard';
    this.refs.usernameButton.setAttribute('aria-label', 'open settings');

    this.refs.levelButton = document.createElement('button');
    this.refs.levelButton.className = 'room-top-panel__level';
    this.refs.levelButton.type = 'button';
    this.refs.levelButton.textContent = 'level 1';
    this.refs.levelButton.setAttribute('aria-label', 'open level rewards');
    this.refs.levelValue = this.refs.levelButton;

    const identityRow = document.createElement('div');
    identityRow.className = 'room-top-panel__identity-row';
    identityRow.append(this.refs.usernameButton, this.refs.levelButton);

    const resources = document.createElement('div');
    resources.className = 'room-top-panel__resources';
    resources.setAttribute('aria-label', 'resources');
    resources.append(
      this.createResource('mana', '0 / 0'),
      this.createResource('gold', '0'),
      this.createResource('crystal', '0'),
    );

    panel.append(identityRow, resources);
    return panel;
  }

  createResource(label, value) {
    const resource = document.createElement('span');
    resource.className = 'room-top-panel__resource';
    resource.setAttribute('aria-label', label);

    const key = document.createElement('span');
    key.className = 'room-top-panel__resource-key';
    key.textContent = `${label} `;

    const val = document.createElement('span');
    val.className = 'room-top-panel__resource-val';
    val.textContent = value;

    if (label === 'mana') {
      this.refs.manaValue = val;
    }

    if (label === 'gold') {
      this.refs.goldValue = val;
    }

    if (label === 'crystal') {
      this.refs.crystalValue = val;
    }

    resource.append(key, val);
    return resource;
  }

  createSettings() {
    this.refs.settings = document.createElement('section');
    this.refs.settings.className = 'room-top-panel__settings';
    this.refs.settings.hidden = true;

    this.refs.settingsDialog = document.createElement('section');
    this.refs.settingsDialog.className = 'room-top-panel__settings-dialog style-dialog';
    this.refs.settingsDialog.setAttribute('aria-label', 'Settings');
    this.refs.settingsDialog.setAttribute('aria-modal', 'true');
    this.refs.settingsDialog.setAttribute('role', 'dialog');
    this.refs.settingsDialog.tabIndex = -1;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'settings';

    const usernameSection = document.createElement('div');
    usernameSection.className = 'room-top-panel__settings-section';

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

    const actions = document.createElement('div');
    actions.className = 'room-top-panel__username-actions';

    this.refs.usernameSaveButton = document.createElement('button');
    this.refs.usernameSaveButton.className = 'style-button room-top-panel__username-save';
    this.refs.usernameSaveButton.type = 'submit';
    this.refs.usernameSaveButton.textContent = 'save';

    this.refs.settingsCloseButton = document.createElement('button');
    this.refs.settingsCloseButton.className = 'style-button room-top-panel__settings-close';
    this.refs.settingsCloseButton.type = 'button';
    this.refs.settingsCloseButton.textContent = 'close';

    actions.append(this.refs.usernameSaveButton, this.refs.settingsCloseButton);
    this.refs.usernameForm.append(this.refs.usernameInput, actions);
    usernameSection.append(usernameLabel, this.refs.usernameForm);

    const themeSection = document.createElement('div');
    themeSection.className = 'room-top-panel__settings-section';

    const themeLabel = document.createElement('div');
    themeLabel.className = 'room-top-panel__settings-label';
    themeLabel.textContent = 'theme';

    const themeButtons = document.createElement('div');
    themeButtons.className = 'room-top-panel__theme-buttons';
    themeButtons.setAttribute('role', 'radiogroup');
    themeButtons.setAttribute('aria-label', 'theme');
    this.refs.themeButtons = [];

    for (const theme of PLAYER_THEME_OPTIONS) {
      const button = document.createElement('button');
      button.className = 'style-button room-top-panel__theme-button';
      button.type = 'button';
      button.textContent = theme.label;
      button.dataset.theme = theme.key;
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', 'false');
      themeButtons.append(button);
      this.refs.themeButtons.push(button);
    }

    themeSection.append(themeLabel, themeButtons);

    this.refs.authSection = document.createElement('div');
    this.refs.authSection.className =
      'room-top-panel__settings-section room-top-panel__auth-section';
    this.refs.authSection.hidden = true;

    const authLabel = document.createElement('div');
    authLabel.className = 'room-top-panel__settings-label';
    authLabel.textContent = 'auth';

    this.refs.authStatus = document.createElement('div');
    this.refs.authStatus.className = 'room-top-panel__auth-status';
    this.refs.authStatus.textContent = 'guest';

    this.refs.authButton = document.createElement('button');
    this.refs.authButton.className = 'style-button room-top-panel__auth-button';
    this.refs.authButton.type = 'button';
    this.refs.authButton.textContent = 'login with google';

    this.refs.authSection.append(authLabel, this.refs.authStatus, this.refs.authButton);

    this.refs.settingsDialog.append(title, usernameSection, themeSection, this.refs.authSection);
    this.refs.settings.append(this.refs.settingsDialog);

    return this.refs.settings;
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
