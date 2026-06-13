const PENDING_SAVE_KEY = 'idle-wizard.account-link.pending-save';
const DEFAULT_PENDING_SAVE_MAX_AGE_MS = 15 * 60 * 1000;

export class AuthAccountLinkSaveManager {
  constructor({
    storage = globalThis.localStorage,
    now = () => Date.now(),
    createAttemptId = () =>
      globalThis.crypto?.randomUUID?.() ??
      `link-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`,
    maxAgeMs = DEFAULT_PENDING_SAVE_MAX_AGE_MS,
  } = {}) {
    this.storage = storage;
    this.now = now;
    this.createAttemptId = createAttemptId;
    this.maxAgeMs = maxAgeMs;
  }

  savePendingSave(save) {
    if (!save || typeof save !== 'object') {
      this.clearPendingSave();
      return false;
    }

    try {
      if (!this.storage?.setItem) {
        return false;
      }

      const pendingSave = {
        attemptId: this.createAttemptId(),
        createdAtMs: this.now(),
        save,
      };
      this.storage.setItem(PENDING_SAVE_KEY, JSON.stringify(pendingSave));
      return pendingSave;
    } catch {
      return false;
    }
  }

  loadPendingSave({ attemptId } = {}) {
    let parsed;
    try {
      parsed = JSON.parse(this.storage?.getItem?.(PENDING_SAVE_KEY) ?? 'null');
    } catch {
      this.clearPendingSave();
      return null;
    }

    if (!this.isPendingSaveFresh(parsed)) {
      this.clearPendingSave();
      return null;
    }

    if (attemptId !== undefined && parsed?.attemptId !== attemptId) {
      this.clearPendingSave();
      return null;
    }

    const save = parsed?.save;
    return save && typeof save === 'object' ? save : null;
  }

  clearPendingSave() {
    this.storage?.removeItem?.(PENDING_SAVE_KEY);
  }

  isPendingSaveFresh(parsed) {
    const createdAtMs = Number(parsed?.createdAtMs);
    if (!Number.isFinite(createdAtMs)) {
      return false;
    }

    const ageMs = this.now() - createdAtMs;
    return ageMs >= 0 && ageMs <= this.maxAgeMs;
  }
}
