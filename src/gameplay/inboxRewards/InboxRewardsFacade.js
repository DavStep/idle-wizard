import { InboxRewardGrantManager } from './managers/InboxRewardGrantManager.js';

export class InboxRewardsFacade {
  static explain =
    'Grants rewards from server mail once and remembers which mail was claimed so retries do not duplicate rewards.';

  constructor({ coinFacade, crystalFacade, rubyFacade, emeraldFacade, itemsFacade } = {}) {
    this.grantManager = new InboxRewardGrantManager({
      coinFacade,
      crystalFacade,
      rubyFacade,
      emeraldFacade,
      itemsFacade,
    });
  }

  claim(mail) {
    return this.grantManager.claim(mail);
  }

  getPersistenceSnapshot() {
    return this.grantManager.getPersistenceSnapshot();
  }

  applyPersistenceSnapshot(snapshot) {
    this.grantManager.applyPersistenceSnapshot(snapshot);
  }
}
