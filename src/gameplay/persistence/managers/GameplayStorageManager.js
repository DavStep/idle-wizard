const SAVE_KEY = 'idle-wizard.gameplay.save';

export class GameplayStorageManager {
  constructor({ storage = null, saveKey = SAVE_KEY } = {}) {
    this.storage = storage ?? null;
    this.saveKey = saveKey;
  }

  load() {
    if (!this.storage) {
      return null;
    }

    try {
      const rawSave = this.storage.getItem(this.saveKey);
      return rawSave ? JSON.parse(rawSave) : null;
    } catch {
      return null;
    }
  }

  canSave() {
    return Boolean(this.storage);
  }

  save(save) {
    if (!this.storage) {
      return false;
    }

    try {
      this.storage.setItem(this.saveKey, JSON.stringify(save));
      return true;
    } catch {
      return false;
    }
  }
}
