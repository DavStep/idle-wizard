const STORAGE_KEY_PREFIX = 'idle-wizard.gameplay-save.pending.';

function getDefaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export class GameplaySaveJournalManager {
  constructor({ storage = getDefaultStorage() } = {}) {
    this.storage = storage;
    this.storageKey = '';
  }

  connect(identity) {
    this.storageKey = this.createStorageKey(identity);
    return this.load();
  }

  disconnect() {
    this.storageKey = '';
  }

  load() {
    if (!this.storageKey) {
      return null;
    }

    try {
      const journal = JSON.parse(this.storage?.getItem?.(this.storageKey) ?? 'null');

      if (
        journal?.version !== 1 ||
        typeof journal.saveJson !== 'string' ||
        !journal.saveJson ||
        !journal.baseServerRevision ||
        typeof journal.baseServerRevision !== 'object' ||
        Array.isArray(journal.baseServerRevision)
      ) {
        this.clear();
        return null;
      }

      const save = JSON.parse(journal.saveJson);
      if (!save || typeof save !== 'object' || Array.isArray(save)) {
        this.clear();
        return null;
      }

      return journal;
    } catch {
      this.clear();
      return null;
    }
  }

  save({ saveJson, saveContentKey = null, baseServerRevision = null } = {}) {
    if (
      !this.storageKey ||
      typeof this.storage?.setItem !== 'function' ||
      typeof saveJson !== 'string' ||
      !saveJson ||
      !baseServerRevision ||
      typeof baseServerRevision !== 'object' ||
      Array.isArray(baseServerRevision)
    ) {
      return false;
    }

    try {
      this.storage?.setItem?.(
        this.storageKey,
        JSON.stringify({
          version: 1,
          saveJson,
          saveContentKey,
          baseServerRevision,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  clear() {
    if (!this.storageKey || typeof this.storage?.removeItem !== 'function') {
      return false;
    }

    try {
      this.storage?.removeItem?.(this.storageKey);
      return true;
    } catch {
      return false;
    }
  }

  createStorageKey(identity) {
    const identityKey = this.toIdentityKey(identity);
    return identityKey
      ? `${STORAGE_KEY_PREFIX}${encodeURIComponent(identityKey)}`
      : '';
  }

  toIdentityKey(identity) {
    if (!identity) {
      return '';
    }

    try {
      if (typeof identity.toHexString === 'function') {
        return String(identity.toHexString()).trim();
      }
    } catch {
      return '';
    }

    return String(identity).trim();
  }
}
