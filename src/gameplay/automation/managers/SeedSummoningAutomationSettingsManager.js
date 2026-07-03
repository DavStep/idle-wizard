import {
  getAutomationReserveMaxMana,
  getAutomationReservePresetFractions,
  getAutomationReserveStep,
} from '../../research/automationReserveResearch.js';

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

  setManaReserve(manaReserve, { reserveResearchLevel = 0 } = {}) {
    this.manaReserve = this.normalizeManaReserve(manaReserve, {
      reserveResearchLevel,
    });

    return {
      ok: true,
      manaReserve: this.manaReserve,
    };
  }

  getManaReserve() {
    return this.manaReserve;
  }

  getSnapshot({
    unlocked = false,
    reserveControlsUnlocked = false,
    reserveResearchLevel = 0,
  } = {}) {
    const maxManaReserve = Math.max(
      MAX_SEED_SUMMONING_MANA_RESERVE,
      getAutomationReserveMaxMana(reserveResearchLevel),
    );

    return {
      unlocked: unlocked === true,
      reserveControlsUnlocked: reserveControlsUnlocked === true,
      enabled: this.enabled,
      manaReserve: Math.min(this.manaReserve, maxManaReserve),
      maxManaReserve,
      reserveStep: getAutomationReserveStep(reserveResearchLevel),
      reservePresetFractions: getAutomationReservePresetFractions(reserveResearchLevel),
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

  normalizeManaReserve(manaReserve, { reserveResearchLevel = 0 } = {}) {
    const reserve = Math.floor(Number(manaReserve));
    const maxManaReserve = Math.max(
      MAX_SEED_SUMMONING_MANA_RESERVE,
      getAutomationReserveMaxMana(reserveResearchLevel),
    );

    if (!Number.isFinite(reserve)) {
      return 0;
    }

    return Math.min(maxManaReserve, Math.max(0, reserve));
  }
}
