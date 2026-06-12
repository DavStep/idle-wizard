const PENDING_SAVE_KEY = 'idle-wizard.account-link.pending-save';

export class AuthAccountLinkSaveManager {
  constructor({ storage = globalThis.localStorage } = {}) {
    this.storage = storage;
  }

  savePendingSave(save) {
    if (!save || typeof save !== 'object') {
      this.clearPendingSave();
      return false;
    }

    try {
      this.storage.setItem(PENDING_SAVE_KEY, JSON.stringify({ save }));
      return true;
    } catch {
      return false;
    }
  }

  loadPendingSave() {
    let parsed;
    try {
      parsed = JSON.parse(this.storage.getItem(PENDING_SAVE_KEY) ?? 'null');
    } catch {
      this.clearPendingSave();
      return null;
    }

    const save = parsed?.save;
    return save && typeof save === 'object' ? save : null;
  }

  clearPendingSave() {
    this.storage.removeItem(PENDING_SAVE_KEY);
  }
}
