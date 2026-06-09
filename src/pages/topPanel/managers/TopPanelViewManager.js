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
    this.root.append(this.createPanel(), this.createUsernameEditor());
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
    this.refs.usernameButton.setAttribute('aria-label', 'change username');

    const resources = document.createElement('div');
    resources.className = 'room-top-panel__resources';
    resources.append(this.createResource('mana', '0 / 0'), this.createResource('gold', '0'));

    panel.append(this.refs.usernameButton, resources);
    return panel;
  }

  createResource(label, value) {
    const resource = document.createElement('span');
    resource.className = 'room-top-panel__resource';

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

    resource.append(key, val);
    return resource;
  }

  createUsernameEditor() {
    this.refs.usernameEditor = document.createElement('section');
    this.refs.usernameEditor.className = 'room-top-panel__username-editor';

    const dialog = document.createElement('section');
    dialog.className = 'room-top-panel__username-dialog style-dialog';
    dialog.setAttribute('aria-label', 'Change username');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'username';

    this.refs.usernameForm = document.createElement('form');
    this.refs.usernameForm.className = 'room-top-panel__username-form';

    this.refs.usernameInput = document.createElement('input');
    this.refs.usernameInput.className = 'style-input room-top-panel__username-input';
    this.refs.usernameInput.type = 'text';
    this.refs.usernameInput.maxLength = 24;
    this.refs.usernameInput.autocomplete = 'off';
    this.refs.usernameInput.setAttribute('aria-label', 'username');

    const actions = document.createElement('div');
    actions.className = 'room-top-panel__username-actions';

    this.refs.usernameSaveButton = document.createElement('button');
    this.refs.usernameSaveButton.className = 'style-button room-top-panel__username-save';
    this.refs.usernameSaveButton.type = 'submit';
    this.refs.usernameSaveButton.textContent = 'save';

    this.refs.usernameCancelButton = document.createElement('button');
    this.refs.usernameCancelButton.className = 'style-button room-top-panel__username-cancel';
    this.refs.usernameCancelButton.type = 'button';
    this.refs.usernameCancelButton.textContent = 'cancel';

    actions.append(this.refs.usernameSaveButton, this.refs.usernameCancelButton);
    this.refs.usernameForm.append(this.refs.usernameInput, actions);
    dialog.append(title, this.refs.usernameForm);
    this.refs.usernameEditor.append(dialog);

    return this.refs.usernameEditor;
  }
}
