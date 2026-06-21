export const WORKSHOP_CHAT_PENDING_STORAGE_KEY =
  'idle-wizard:workshop-chat-pending:v1';

const CHAT_CHANNEL_IDS = ['world', 'alliance'];
const DEFAULT_MESSAGE_LIMIT = 40;
const DEFAULT_PENDING_TTL_MS = 5 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 160;

export class WorkshopChatPendingMessageManager {
  constructor({
    key = WORKSHOP_CHAT_PENDING_STORAGE_KEY,
    storage,
    now = () => Date.now(),
    limit = DEFAULT_MESSAGE_LIMIT,
    ttlMs = DEFAULT_PENDING_TTL_MS,
  } = {}) {
    this.key = key;
    this.storage = this.resolveStorage(storage);
    this.now = now;
    this.limit = limit;
    this.ttlMs = ttlMs;
  }

  getMessagesByChannel() {
    return this.readSnapshot();
  }

  setMessages(channelId, messages) {
    if (!CHAT_CHANNEL_IDS.includes(channelId)) {
      return [];
    }

    const snapshot = this.readSnapshot();
    snapshot[channelId] = this.normalizeMessages(messages);
    this.writeSnapshot(snapshot);
    return snapshot[channelId];
  }

  readSnapshot() {
    const snapshot = this.createEmptySnapshot();
    const raw = this.readRaw();

    if (!raw) {
      return snapshot;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.removeRaw();
      return snapshot;
    }

    for (const channelId of CHAT_CHANNEL_IDS) {
      snapshot[channelId] = this.normalizeMessages(parsed?.[channelId]);
    }

    return snapshot;
  }

  writeSnapshot(snapshot) {
    if (!this.storage) {
      return;
    }

    const safeSnapshot = this.createEmptySnapshot();
    for (const channelId of CHAT_CHANNEL_IDS) {
      safeSnapshot[channelId] = this.normalizeMessages(snapshot?.[channelId]);
    }

    try {
      if (CHAT_CHANNEL_IDS.every((channelId) => safeSnapshot[channelId].length <= 0)) {
        this.storage.removeItem?.(this.key);
      } else {
        this.storage.setItem(this.key, JSON.stringify(safeSnapshot));
      }
    } catch {
      // Storage can fail in private contexts; in-memory chat still works.
    }
  }

  normalizeMessages(messages) {
    if (!Array.isArray(messages)) {
      return [];
    }

    return messages
      .map((message) => this.normalizeMessage(message))
      .filter(Boolean)
      .filter((message) => !this.isExpired(message))
      .slice(-this.limit);
  }

  normalizeMessage(message) {
    const body = String(message?.body ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, MAX_MESSAGE_LENGTH);

    if (!body) {
      return null;
    }

    const sentAtMs = Number(message?.sentAtMs);
    if (!Number.isFinite(sentAtMs) || sentAtMs <= 0) {
      return null;
    }

    return {
      id: String(message?.id ?? `local-${sentAtMs}`),
      senderIdentity: String(message?.senderIdentity ?? 'local'),
      username: String(message?.username || 'wizard'),
      character: message?.character,
      playerLevel: this.normalizePlayerLevel(message?.playerLevel),
      body,
      allianceTag: String(message?.allianceTag ?? ''),
      allianceTagColor: String(message?.allianceTagColor ?? ''),
      sentAtMs,
    };
  }

  normalizePlayerLevel(playerLevel) {
    const safePlayerLevel = Math.floor(Number(playerLevel));
    return Number.isFinite(safePlayerLevel) && safePlayerLevel >= 1 ? safePlayerLevel : 1;
  }

  isExpired(message) {
    return this.now() - Number(message?.sentAtMs) > this.ttlMs;
  }

  createEmptySnapshot() {
    return Object.fromEntries(CHAT_CHANNEL_IDS.map((channelId) => [channelId, []]));
  }

  readRaw() {
    try {
      return this.storage?.getItem?.(this.key) ?? null;
    } catch {
      return null;
    }
  }

  removeRaw() {
    try {
      this.storage?.removeItem?.(this.key);
    } catch {
      // Ignore storage cleanup failures.
    }
  }

  resolveStorage(storage) {
    if (storage !== undefined) {
      return this.isStorage(storage) ? storage : null;
    }

    try {
      const windowStorage = globalThis.window?.localStorage;
      if (this.isStorage(windowStorage)) {
        return windowStorage;
      }
    } catch {
      // Fall through to non-window storage.
    }

    try {
      const globalStorage = globalThis.localStorage;
      return this.isStorage(globalStorage) ? globalStorage : null;
    } catch {
      return null;
    }
  }

  isStorage(storage) {
    return (
      Boolean(storage) &&
      typeof storage.getItem === 'function' &&
      typeof storage.setItem === 'function'
    );
  }
}
