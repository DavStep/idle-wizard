export class PlayerSocialPreferencesManager {
  constructor() {
    this.allowFriendRequests = true;
    this.allowTradeAllianceInvitations = true;
  }

  getAllowFriendRequests() {
    return this.allowFriendRequests;
  }

  getAllowTradeAllianceInvitations() {
    return this.allowTradeAllianceInvitations;
  }

  setAllowFriendRequests(allowed) {
    this.allowFriendRequests = allowed !== false;
    return this.allowFriendRequests;
  }

  setAllowTradeAllianceInvitations(allowed) {
    this.allowTradeAllianceInvitations = allowed !== false;
    return this.allowTradeAllianceInvitations;
  }

  applyServerPreferences({
    allowFriendRequests,
    allowTradeAllianceInvitations,
  } = {}) {
    this.setAllowFriendRequests(allowFriendRequests);
    this.setAllowTradeAllianceInvitations(allowTradeAllianceInvitations);
  }
}
