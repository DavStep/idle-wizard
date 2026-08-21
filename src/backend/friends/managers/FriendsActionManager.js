import { getChatFailureReason } from '../../shared/chatFailureReasons.js';

const MAX_MESSAGE_LENGTH = 160;

export class FriendsActionManager {
  constructor() {
    this.connection = null;
  }

  connect(connection) {
    this.connection = connection;
  }

  disconnect() {
    this.connection = null;
  }

  sendRequest(identity) {
    return this.call('sendFriendRequest', 'send_friend_request', {
      recipientIdentityHex: this.normalizeIdentity(identity),
    });
  }

  acceptRequest(identity) {
    return this.call('acceptFriendRequest', 'accept_friend_request', {
      senderIdentityHex: this.normalizeIdentity(identity),
    });
  }

  rejectRequest(identity) {
    return this.call('rejectFriendRequest', 'reject_friend_request', {
      senderIdentityHex: this.normalizeIdentity(identity),
    });
  }

  unfriend(identity) {
    return this.call('unfriendPlayer', 'unfriend_player', {
      friendIdentityHex: this.normalizeIdentity(identity),
    });
  }

  sendDirectMessage(identity, body) {
    const message = String(body ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_MESSAGE_LENGTH);
    if (!message) {
      return Promise.resolve({ ok: false, reason: 'empty_message' });
    }
    return this.call('sendDirectMessage', 'send_direct_message', {
      recipientIdentityHex: this.normalizeIdentity(identity),
      body: message,
    });
  }

  async call(camelName, snakeName, payload) {
    if (Object.values(payload).some((value) => !value)) {
      return { ok: false, reason: 'player_required' };
    }
    const reducer = this.connection?.reducers?.[camelName] ?? this.connection?.reducers?.[snakeName];
    if (!reducer) {
      return { ok: false, reason: 'offline' };
    }
    try {
      await reducer(payload);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: getChatFailureReason(error), error };
    }
  }

  normalizeIdentity(identity) {
    return String(identity ?? '').trim().replace(/^0x/, '');
  }
}
