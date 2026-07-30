import {
  normalizePlayerCharacter,
} from '../../../../player/playerCharacters.js';
import {
  normalizePlayerFrame,
} from '../../../../player/playerFrames.js';

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

  choose({
    deviceSave,
    accountSave,
    accountUsername,
    accountProfile,
  } = {}) {
    if (this.resolveChoice) {
      this.resolve(ACCOUNT_LINK_CHOICE_FORGET_DEVICE);
    }
    const resolvedAccountProfile = this.normalizeAccountProfile({
      ...accountProfile,
      username: accountProfile?.username ?? accountUsername,
    });
    const device = this.describeSaveDetails(deviceSave);
    const account = {
      ...this.describeSaveDetails(accountSave),
      ...resolvedAccountProfile,
    };
    this.model = {
      deviceSummary: this.describeSave(deviceSave),
      accountSummary: this.describeSave(accountSave, {
        username: resolvedAccountProfile.username,
      }),
      device,
      account,
      onSelectDevice: () => this.resolve(ACCOUNT_LINK_CHOICE_OVERWRITE_ACCOUNT),
      onSelectAccount: () => this.resolve(ACCOUNT_LINK_CHOICE_FORGET_DEVICE),
    };
    this.view?.bind(this.model);
    return new Promise((resolve) => {
      this.resolveChoice = resolve;
    });
  }

  showPreview() {
    void this.choose({
      deviceSave: {
        tasks: { currentLevel: 1 },
        coin: { current: 0 },
        crystal: { current: 1 },
        emerald: { current: 2 },
        ruby: { current: 3 },
      },
      accountSave: {
        tasks: { currentLevel: 5 },
        coin: { current: 53 },
        crystal: { current: 3 },
        emerald: { current: 2 },
        ruby: { current: 1 },
      },
      accountProfile: {
        username: 'StepWizzard',
        character: 'elara',
        frame: 'violet',
      },
    });
    return { ok: true };
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
      return usernameText ? `${usernameText}, New Save` : 'New Save';
    }
    const {
      level,
      coin,
      crystal,
      emerald,
      ruby,
    } = this.describeSaveDetails(save);
    const summary =
      `Level ${level}, ${coin} Coin, ${crystal} Crystal, ` +
      `${emerald} Emerald, ${ruby} Ruby`;
    return usernameText ? `${usernameText}, ${summary}` : summary;
  }

  describeSaveDetails(save) {
    return {
      level: this.getPositiveInteger(save?.tasks?.currentLevel, 1),
      coin: this.getNonNegativeInteger(save?.coin?.current),
      crystal: this.getNonNegativeInteger(save?.crystal?.current),
      emerald: this.getNonNegativeInteger(save?.emerald?.current),
      ruby: this.getNonNegativeInteger(save?.ruby?.current),
    };
  }

  getUsernameText(username) {
    const value = String(username ?? '').replace(/\s+/g, ' ').trim();
    return value;
  }

  normalizeAccountProfile(profile = {}) {
    const username = this.getUsernameText(profile.username);
    return {
      ...(username ? { username } : {}),
      character: normalizePlayerCharacter(profile.character),
      frame: normalizePlayerFrame(profile.frame),
    };
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
