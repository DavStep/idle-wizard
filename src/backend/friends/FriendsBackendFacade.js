import { DirectMessageSubscriptionManager } from './managers/DirectMessageSubscriptionManager.js';
import { FriendsActionManager } from './managers/FriendsActionManager.js';
import { FriendsStateObserverManager } from './managers/FriendsStateObserverManager.js';
import { FriendsSubscriptionManager } from './managers/FriendsSubscriptionManager.js';

export class FriendsBackendFacade {
  static explain =
    'Keeps friend requests, accepted friendships, and private conversations synchronized with the server without exposing network details to the game UI.';

  constructor() {
    this.stateObserverManager = new FriendsStateObserverManager();
    this.directMessageObserverManager = new FriendsStateObserverManager();
    this.subscriptionManager = new FriendsSubscriptionManager({
      onSnapshot: (snapshot) => this.stateObserverManager.publish(snapshot),
    });
    this.directMessageSubscriptionManager = new DirectMessageSubscriptionManager({
      onSnapshot: (snapshot) => this.directMessageObserverManager.publish(snapshot),
    });
    this.actionManager = new FriendsActionManager();
  }

  connect(connection, identity) {
    this.subscriptionManager.connect(connection);
    this.directMessageSubscriptionManager.connect(connection, identity);
    this.actionManager.connect(connection);
  }

  disconnect() {
    this.actionManager.disconnect();
    this.directMessageSubscriptionManager.disconnect();
    this.subscriptionManager.disconnect();
  }

  getSnapshot() {
    return this.subscriptionManager.getSnapshot();
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }

  getDirectMessageSnapshot() {
    return this.directMessageSubscriptionManager.getSnapshot();
  }

  subscribeDirectMessages(listener) {
    return this.directMessageObserverManager.subscribe(listener);
  }

  openConversation(identity) {
    return this.directMessageSubscriptionManager.open(identity);
  }

  closeConversation() {
    return this.directMessageSubscriptionManager.close();
  }

  getRelationship(identity) {
    const key = String(identity ?? '').toLowerCase().replace(/^0x/, '');
    const snapshot = this.getSnapshot();
    if (snapshot.friends.some((row) => row.identity.toLowerCase().replace(/^0x/, '') === key)) {
      return 'friend';
    }
    if (snapshot.incomingRequests.some((row) => row.identity.toLowerCase().replace(/^0x/, '') === key)) {
      return 'incoming';
    }
    if (snapshot.outgoingRequests.some((row) => row.identity.toLowerCase().replace(/^0x/, '') === key)) {
      return 'outgoing';
    }
    return 'stranger';
  }

  sendRequest(identity) { return this.actionManager.sendRequest(identity); }
  acceptRequest(identity) { return this.actionManager.acceptRequest(identity); }
  rejectRequest(identity) { return this.actionManager.rejectRequest(identity); }
  unfriend(identity) { return this.actionManager.unfriend(identity); }
  sendDirectMessage(identity, body) { return this.actionManager.sendDirectMessage(identity, body); }
}
