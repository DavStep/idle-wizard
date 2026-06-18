export const HAPTICS_STORAGE_KEY = 'idle-wizard:haptics';
export const DEFAULT_HAPTICS_ENABLED = true;

export class HapticPreferenceManager {
  constructor({ storage = getDefaultStorage() } = {}) {
    this.storage = storage;
    this.enabled = this.loadEnabled();
    this.listeners = new Set();
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled) {
    const nextEnabled = Boolean(enabled);

    if (this.enabled === nextEnabled) {
      return this.getSnapshot();
    }

    this.enabled = nextEnabled;
    this.saveEnabled();
    this.emit();
    return this.getSnapshot();
  }

  getSnapshot() {
    return {
      enabled: this.enabled,
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit() {
    const snapshot = this.getSnapshot();

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  loadEnabled() {
    if (!this.storage) {
      return DEFAULT_HAPTICS_ENABLED;
    }

    try {
      const raw = this.storage.getItem(HAPTICS_STORAGE_KEY);
      if (!raw) {
        return DEFAULT_HAPTICS_ENABLED;
      }

      if (raw === 'true' || raw === 'false') {
        return raw === 'true';
      }

      const parsed = JSON.parse(raw);
      if (typeof parsed?.enabled === 'boolean') {
        return parsed.enabled;
      }
    } catch {
      return DEFAULT_HAPTICS_ENABLED;
    }

    return DEFAULT_HAPTICS_ENABLED;
  }

  saveEnabled() {
    if (!this.storage) {
      return;
    }

    try {
      this.storage.setItem(
        HAPTICS_STORAGE_KEY,
        JSON.stringify({ enabled: this.enabled }),
      );
    } catch {
      // Device preference persistence is best-effort.
    }
  }
}

function getDefaultStorage() {
  try {
    return globalThis.window?.localStorage ?? null;
  } catch {
    return null;
  }
}
