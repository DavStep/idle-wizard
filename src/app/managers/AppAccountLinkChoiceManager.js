export const ACCOUNT_LINK_CHOICE_FORGET_DEVICE = 'forget_device';
export const ACCOUNT_LINK_CHOICE_OVERWRITE_ACCOUNT = 'overwrite_account';

export class AppAccountLinkChoiceManager {
  constructor() {
    this.root = null;
    this.refs = null;
    this.resolveChoice = null;
    this.previousFocus = null;
    this.handleForgetDevice = () => this.resolve(ACCOUNT_LINK_CHOICE_FORGET_DEVICE);
    this.handleOverwriteAccount = () =>
      this.resolve(ACCOUNT_LINK_CHOICE_OVERWRITE_ACCOUNT);
  }

  mount(stage) {
    if (!stage) {
      throw new Error('AppAccountLinkChoiceManager requires a stage element.');
    }

    if (this.root) {
      return this.root;
    }

    const root = document.createElement('section');
    root.className = 'app-account-link-choice';
    root.hidden = true;
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('role', 'dialog');

    const panel = document.createElement('div');
    panel.className = 'app-account-link-choice__panel';
    panel.tabIndex = -1;

    const dialog = document.createElement('div');
    dialog.className = 'app-account-link-choice__dialog style-dialog';

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'account data';

    const message = document.createElement('p');
    message.className = 'app-account-link-choice__message';
    message.textContent = 'choose which save should remain connected';

    const rows = document.createElement('div');
    rows.className = 'app-account-link-choice__rows';

    const deviceRow = this.createRow('this device');
    const accountRow = this.createRow('account');
    rows.append(deviceRow.root, accountRow.root);

    const warning = document.createElement('p');
    warning.className = 'app-account-link-choice__warning';
    warning.textContent = 'overwrite account replaces the connected save';

    const actions = document.createElement('div');
    actions.className = 'app-account-link-choice__actions';

    const forgetButton = document.createElement('button');
    forgetButton.className = 'style-button app-account-link-choice__button';
    forgetButton.type = 'button';
    forgetButton.textContent = 'forget this data';

    const overwriteButton = document.createElement('button');
    overwriteButton.className = 'style-button app-account-link-choice__button';
    overwriteButton.type = 'button';
    overwriteButton.textContent = 'overwrite account';

    actions.append(forgetButton, overwriteButton);
    dialog.append(title, message, rows, warning, actions);
    panel.append(dialog);
    root.append(panel);
    stage.append(root);

    forgetButton.addEventListener('click', this.handleForgetDevice);
    overwriteButton.addEventListener('click', this.handleOverwriteAccount);

    this.root = root;
    this.refs = {
      panel,
      deviceSummary: deviceRow.summary,
      accountSummary: accountRow.summary,
      forgetButton,
      overwriteButton,
    };

    return root;
  }

  choose({ deviceSave, accountSave } = {}) {
    if (!this.root || !this.refs) {
      return Promise.resolve(ACCOUNT_LINK_CHOICE_FORGET_DEVICE);
    }

    if (this.resolveChoice) {
      this.resolve(ACCOUNT_LINK_CHOICE_FORGET_DEVICE);
    }

    this.setText(this.refs.deviceSummary, this.describeSave(deviceSave));
    this.setText(this.refs.accountSummary, this.describeSave(accountSave));
    const activeElement = document.activeElement;
    this.previousFocus =
      typeof activeElement?.focus === 'function' ? activeElement : null;
    this.root.hidden = false;
    this.refs.panel.focus();

    return new Promise((resolve) => {
      this.resolveChoice = resolve;
    });
  }

  unmount() {
    this.resolve(ACCOUNT_LINK_CHOICE_FORGET_DEVICE);
    this.refs?.forgetButton?.removeEventListener('click', this.handleForgetDevice);
    this.refs?.overwriteButton?.removeEventListener(
      'click',
      this.handleOverwriteAccount,
    );
    this.root?.remove();
    this.root = null;
    this.refs = null;
    this.previousFocus = null;
  }

  resolve(choice) {
    if (!this.resolveChoice) {
      return;
    }

    const resolveChoice = this.resolveChoice;
    this.resolveChoice = null;

    if (this.root) {
      this.root.hidden = true;
    }

    this.previousFocus?.focus?.();
    this.previousFocus = null;
    resolveChoice(choice);
  }

  createRow(labelText) {
    const root = document.createElement('div');
    root.className = 'app-account-link-choice__row';

    const label = document.createElement('span');
    label.className = 'app-account-link-choice__label';
    label.textContent = labelText;

    const summary = document.createElement('span');
    summary.className = 'app-account-link-choice__summary';

    root.append(label, summary);
    return { root, summary };
  }

  describeSave(save) {
    if (!save || typeof save !== 'object') {
      return 'new save';
    }

    const level = this.getPositiveInteger(save.tasks?.currentLevel, 1);
    const gold = this.getNonNegativeInteger(save.gold?.current);
    const crystal = this.getNonNegativeInteger(save.crystal?.current);
    return `level ${level}, ${gold} gold, ${crystal} crystal`;
  }

  getPositiveInteger(value, fallback) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : fallback;
  }

  getNonNegativeInteger(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  setText(element, text) {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }
}
