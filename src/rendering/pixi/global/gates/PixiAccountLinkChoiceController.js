export const ACCOUNT_LINK_CHOICE_FORGET_DEVICE = 'forget_device';
export const ACCOUNT_LINK_CHOICE_OVERWRITE_ACCOUNT = 'overwrite_account';

export class PixiAccountLinkChoiceController {
  constructor() {
    this.view = null;
    this.resolveChoice = null;
    this.model = null;
  }

  attach(view) {
    this.view = view;
    if (this.model) {
      view.bind(this.model);
    }
    return view;
  }

  mount() {
    return this.view?.root ?? null;
  }

  choose({ deviceSave, accountSave, accountUsername } = {}) {
    if (this.resolveChoice) {
      this.resolve(ACCOUNT_LINK_CHOICE_FORGET_DEVICE);
    }
    this.model = {
      deviceSummary: this.describeSave(deviceSave),
      accountSummary: this.describeSave(accountSave, {
        username: accountUsername,
      }),
      onSelectDevice: () => this.resolve(ACCOUNT_LINK_CHOICE_OVERWRITE_ACCOUNT),
      onSelectAccount: () => this.resolve(ACCOUNT_LINK_CHOICE_FORGET_DEVICE),
    };
    this.view?.bind(this.model);
    return new Promise((resolve) => {
      this.resolveChoice = resolve;
    });
  }

  resolve(choice) {
    if (!this.resolveChoice) {
      return false;
    }
    const resolveChoice = this.resolveChoice;
    this.resolveChoice = null;
    this.model = null;
    this.view?.hide();
    resolveChoice(choice);
    return true;
  }

  unmount() {
    this.resolve(ACCOUNT_LINK_CHOICE_FORGET_DEVICE);
    this.view = null;
  }

  describeSave(save, { username } = {}) {
    const usernameText = this.getUsernameText(username);
    if (!save || typeof save !== 'object') {
      return usernameText ? `${usernameText}, new save` : 'new save';
    }
    const level = this.getPositiveInteger(save.tasks?.currentLevel, 1);
    const coin = this.getNonNegativeInteger(save.coin?.current);
    const crystal = this.getNonNegativeInteger(save.crystal?.current);
    const summary = `level ${level}, ${coin} coin, ${crystal} crystal`;
    return usernameText ? `${usernameText}, ${summary}` : summary;
  }

  getUsernameText(username) {
    const value = String(username ?? '').replace(/\s+/g, ' ').trim();
    return value ? `username ${value}` : '';
  }

  getPositiveInteger(value, fallback) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : fallback;
  }

  getNonNegativeInteger(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }
}
