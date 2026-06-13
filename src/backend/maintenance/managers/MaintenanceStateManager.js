const MAINTENANCE_CONFIG_KEY = 'maintenance';
const DEFAULT_MESSAGE = 'maintenance in progress';
const MODES = new Set(['off', 'drain', 'locked']);

const EMPTY_SNAPSHOT = {
  mode: 'off',
  message: DEFAULT_MESSAGE,
  active: false,
  updatedAtMs: 0,
};

export class MaintenanceStateManager {
  constructor() {
    this.listeners = new Set();
    this.snapshot = { ...EMPTY_SNAPSHOT };
  }

  applyGameConfigSnapshot(snapshot = {}) {
    if (snapshot?.connected === false && this.snapshot.active) {
      return;
    }

    const row = Array.isArray(snapshot?.gameConfigs)
      ? snapshot.gameConfigs.find((config) => config?.configKey === MAINTENANCE_CONFIG_KEY)
      : null;
    const config = this.parseConfig(row?.configJson);
    const mode = this.normalizeMode(config.mode);
    const message = this.normalizeMessage(config.message);

    this.publish({
      mode,
      message,
      active: mode !== 'off',
      updatedAtMs: Number.isFinite(row?.updatedAtMs) ? row.updatedAtMs : 0,
    });
  }

  getSnapshot() {
    return this.snapshot;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.snapshot);

    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(snapshot) {
    if (this.isSameSnapshot(snapshot)) {
      return;
    }

    this.snapshot = snapshot;
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  isSameSnapshot(snapshot) {
    return (
      this.snapshot.mode === snapshot.mode &&
      this.snapshot.message === snapshot.message &&
      this.snapshot.active === snapshot.active &&
      this.snapshot.updatedAtMs === snapshot.updatedAtMs
    );
  }

  parseConfig(configJson) {
    if (typeof configJson !== 'string' || !configJson.trim()) {
      return {};
    }

    try {
      const config = JSON.parse(configJson);
      return config && typeof config === 'object' && !Array.isArray(config) ? config : {};
    } catch {
      return {};
    }
  }

  normalizeMode(mode) {
    const value = String(mode ?? 'off').trim().toLowerCase();
    return MODES.has(value) ? value : 'off';
  }

  normalizeMessage(message) {
    const value = String(message ?? DEFAULT_MESSAGE).trim();
    return value || DEFAULT_MESSAGE;
  }
}
