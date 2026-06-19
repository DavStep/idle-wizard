export const MAX_SEED_SUMMONING_MANA_RESERVE = 5_000;

export class SeedSummoningAutomationSettingsManager {
  constructor() {
    this.enabled = true;
    this.manaReserve = 0;
  }

  setEnabled(enabled) {
    this.enabled = enabled === true;

    return {
      ok: true,
      enabled: this.enabled,
    };
  }

  toggleEnabled() {
    return this.setEnabled(!this.enabled);
  }

  isEnabled() {
    return this.enabled;
  }

  setManaReserve(manaReserve) {
    this.manaReserve = this.normalizeManaReserve(manaReserve);

    return {
      ok: true,
      manaReserve: this.manaReserve,
    };
  }

  getManaReserve() {
    return this.manaReserve;
  }

  getSnapshot({ unlocked = false } = {}) {
    return {
      unlocked: unlocked === true,
      enabled: this.enabled,
      manaReserve: this.manaReserve,
      maxManaReserve: MAX_SEED_SUMMONING_MANA_RESERVE,
    };
  }

  getPersistenceSnapshot() {
    return {
      seedSummoning: {
        enabled: this.enabled,
        manaReserve: this.manaReserve,
      },
    };
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') {
      return;
    }

    const seedSummoning = this.getSeedSummoningSnapshot(snapshot);

    if (seedSummoning.enabled !== undefined) {
      this.enabled = seedSummoning.enabled !== false;
    }

    if (seedSummoning.manaReserve !== undefined) {
      this.manaReserve = this.normalizeManaReserve(seedSummoning.manaReserve);
    }
  }

  getSeedSummoningSnapshot(snapshot) {
    return snapshot.seedSummoning && typeof snapshot.seedSummoning === 'object'
      ? snapshot.seedSummoning
      : snapshot;
  }

  normalizeManaReserve(manaReserve) {
    const reserve = Math.floor(Number(manaReserve));

    if (!Number.isFinite(reserve)) {
      return 0;
    }

    return Math.min(MAX_SEED_SUMMONING_MANA_RESERVE, Math.max(0, reserve));
  }
}
