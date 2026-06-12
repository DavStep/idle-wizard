export class GameplayLogManager {
  constructor({ now = () => Date.now() } = {}) {
    this.now = now;
    this.entries = [];
    this.nextId = 1;
  }

  add(message, { type = 'gameplay', createdAt = this.now() } = {}) {
    if (typeof message !== 'string' || !message.trim()) {
      return null;
    }

    const entry = {
      id: this.nextId,
      type,
      message: this.normalizeMessage(message),
      createdAt,
    };

    this.nextId += 1;
    this.entries.push(entry);
    return entry;
  }

  getSnapshot() {
    return {
      entries: this.entries.map((entry) => ({ ...entry })),
    };
  }

  getPersistenceSnapshot() {
    return {
      nextId: this.nextId,
      entries: this.entries.map((entry) => ({ ...entry })),
    };
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') {
      return;
    }

    this.entries = Array.isArray(snapshot.entries)
      ? snapshot.entries.map((entry) => this.normalizeEntry(entry)).filter(Boolean)
      : [];

    const highestId = this.entries.reduce((maxId, entry) => Math.max(maxId, entry.id), 0);
    this.nextId = Number.isInteger(snapshot.nextId) && snapshot.nextId > highestId
      ? snapshot.nextId
      : highestId + 1;
  }

  normalizeEntry(entry) {
    if (!entry || typeof entry !== 'object' || typeof entry.message !== 'string') {
      return null;
    }

    const message = this.normalizeMessage(entry.message);

    if (!message) {
      return null;
    }

    return {
      id: Number.isInteger(entry.id) && entry.id > 0 ? entry.id : this.nextId++,
      type: typeof entry.type === 'string' && entry.type ? entry.type : 'gameplay',
      message,
      createdAt: Number.isFinite(entry.createdAt) ? entry.createdAt : this.now(),
    };
  }

  normalizeMessage(message) {
    return String(message ?? '').trim().toLowerCase();
  }
}
