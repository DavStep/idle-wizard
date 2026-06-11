const MAX_MESSAGE_LENGTH = 160;
const ROLE_IDS = new Set(['tradeMaster', 'quartermaster', 'factor', 'broker', 'trader']);
const JOIN_MODES = new Set(['open', 'apply', 'closed']);

export class TradeAllianceActionManager {
  constructor() {
    this.connection = null;
  }

  connect(connection) {
    this.connection = connection;
  }

  disconnect() {
    this.connection = null;
  }

  createAlliance({ name, tag, description = '', joinMode = 'apply' } = {}) {
    return this.callReducer('createTradeAlliance', 'create_trade_alliance', {
      name: this.normalizeName(name),
      tag: this.normalizeTag(tag),
      description: this.normalizeText(description, 240),
      joinMode: this.normalizeJoinMode(joinMode),
    });
  }

  updateProfile({ name, tag, description = '', notice = '', joinMode = 'apply' } = {}) {
    return this.callReducer('updateTradeAllianceProfile', 'update_trade_alliance_profile', {
      name: this.normalizeName(name),
      tag: this.normalizeTag(tag),
      description: this.normalizeText(description, 240),
      notice: this.normalizeText(notice, 240),
      joinMode: this.normalizeJoinMode(joinMode),
    });
  }

  joinAlliance(allianceId) {
    return this.callReducer('joinTradeAlliance', 'join_trade_alliance', {
      allianceId: this.normalizeId(allianceId),
    });
  }

  applyAlliance(allianceId) {
    return this.callReducer('applyTradeAlliance', 'apply_trade_alliance', {
      allianceId: this.normalizeId(allianceId),
    });
  }

  cancelApplication(applicationKey) {
    return this.callReducer(
      'cancelTradeAllianceApplication',
      'cancel_trade_alliance_application',
      { applicationKey: this.normalizeId(applicationKey) },
    );
  }

  acceptApplication(applicationKey) {
    return this.callReducer(
      'acceptTradeAllianceApplication',
      'accept_trade_alliance_application',
      { applicationKey: this.normalizeId(applicationKey) },
    );
  }

  rejectApplication(applicationKey) {
    return this.callReducer(
      'rejectTradeAllianceApplication',
      'reject_trade_alliance_application',
      { applicationKey: this.normalizeId(applicationKey) },
    );
  }

  leaveAlliance() {
    return this.callReducer('leaveTradeAlliance', 'leave_trade_alliance', {});
  }

  transferLeadership(memberIdentityHex) {
    return this.callReducer(
      'transferTradeAllianceLeadership',
      'transfer_trade_alliance_leadership',
      { memberIdentityHex: this.normalizeId(memberIdentityHex) },
    );
  }

  setMemberRole(memberIdentityHex, role) {
    return this.callReducer('setTradeAllianceMemberRole', 'set_trade_alliance_member_role', {
      memberIdentityHex: this.normalizeId(memberIdentityHex),
      role: this.normalizeRole(role),
    });
  }

  kickMember(memberIdentityHex) {
    return this.callReducer('kickTradeAllianceMember', 'kick_trade_alliance_member', {
      memberIdentityHex: this.normalizeId(memberIdentityHex),
    });
  }

  sendChatMessage(body) {
    const message = this.normalizeText(body, MAX_MESSAGE_LENGTH);

    if (!message) {
      return Promise.resolve({
        ok: false,
        reason: 'empty_message',
      });
    }

    return this.callReducer(
      'sendTradeAllianceChatMessage',
      'send_trade_alliance_chat_message',
      { body: message },
      { reason: 'send_failed' },
    );
  }

  claimQuestReward(questId) {
    return this.callReducer(
      'claimTradeAllianceQuestReward',
      'claim_trade_alliance_quest_reward',
      { questId: this.normalizeId(questId) },
    );
  }

  collectReward(rewardKey) {
    return this.callReducer('collectTradeAllianceReward', 'collect_trade_alliance_reward', {
      rewardKey: this.normalizeId(rewardKey),
    });
  }

  async callReducer(camelName, snakeName, payload, { reason = 'publish_failed' } = {}) {
    const reducer = this.findReducer(camelName, snakeName);

    if (!reducer) {
      return {
        ok: false,
        reason: 'offline',
      };
    }

    try {
      await reducer(payload);
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        reason,
      };
    }
  }

  findReducer(camelName, snakeName) {
    const reducers = this.connection?.reducers;
    return reducers?.[camelName] ?? reducers?.[snakeName] ?? null;
  }

  normalizeId(value) {
    return String(value ?? '').trim();
  }

  normalizeName(value) {
    return this.normalizeText(value, 24);
  }

  normalizeTag(value) {
    return String(value ?? '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 5);
  }

  normalizeText(value, maxLength) {
    return String(value ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, maxLength);
  }

  normalizeJoinMode(joinMode) {
    return JOIN_MODES.has(joinMode) ? joinMode : 'apply';
  }

  normalizeRole(role) {
    return ROLE_IDS.has(role) ? role : 'trader';
  }
}
