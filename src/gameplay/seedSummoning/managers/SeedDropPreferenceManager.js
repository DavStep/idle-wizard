export const seedDropPreferenceWeights = Object.freeze({
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
});

export const DEFAULT_SEED_DROP_PREFERENCE = 'medium';

export class SeedDropPreferenceManager {
  constructor() {
    this.preferencesBySeedKey = new Map();
  }

  setPreference(seedKey, preference, { unlockedSeeds = [] } = {}) {
    const normalizedSeedKey = this.normalizeSeedKey(seedKey);
    const normalizedPreference = this.normalizePreference(preference);
    const nextPreferences = new Map(this.preferencesBySeedKey);
    nextPreferences.set(normalizedSeedKey, normalizedPreference);

    if (!this.hasActiveSeedPreference(unlockedSeeds, nextPreferences)) {
      return {
        ok: false,
        reason: 'last_active_seed',
        seedKey: normalizedSeedKey,
        preference: this.getPreference(normalizedSeedKey),
      };
    }

    this.preferencesBySeedKey = nextPreferences;

    return {
      ok: true,
      seedKey: normalizedSeedKey,
      preference: normalizedPreference,
      weight: this.getPreferenceWeight(normalizedPreference),
    };
  }

  getPreference(seedKey) {
    return (
      this.preferencesBySeedKey.get(this.normalizeSeedKey(seedKey)) ??
      DEFAULT_SEED_DROP_PREFERENCE
    );
  }

  getPreferenceWeight(preference) {
    return seedDropPreferenceWeights[this.normalizePreference(preference)];
  }

  applyPreferences(seeds) {
    return seeds.map((seed) => {
      const preference = this.getPreference(seed.key);
      const preferenceWeight = this.getPreferenceWeight(preference);
      const baseDropWeight = this.normalizeBaseDropWeight(seed.dropWeight);

      return {
        ...seed,
        baseDropWeight,
        dropPreference: preference,
        preferenceWeight,
        effectiveDropWeight: baseDropWeight * preferenceWeight,
      };
    });
  }

  getPersistenceSnapshot() {
    const dropPreferences = {};

    for (const [seedKey, preference] of this.preferencesBySeedKey.entries()) {
      dropPreferences[seedKey] = preference;
    }

    return {
      dropPreferences,
    };
  }

  applyPersistenceSnapshot(snapshot = {}) {
    const source = snapshot?.seedSummoning ?? snapshot;
    const dropPreferences = source?.dropPreferences;

    if (!dropPreferences || typeof dropPreferences !== 'object') {
      return;
    }

    this.preferencesBySeedKey.clear();

    for (const [seedKey, preference] of Object.entries(dropPreferences)) {
      this.preferencesBySeedKey.set(
        this.normalizeSeedKey(seedKey),
        this.normalizePreference(preference),
      );
    }
  }

  hasActiveSeedPreference(seeds, preferencesBySeedKey = this.preferencesBySeedKey) {
    if (!Array.isArray(seeds) || seeds.length <= 0) {
      return true;
    }

    return seeds.some((seed) => {
      const preference =
        preferencesBySeedKey.get(this.normalizeSeedKey(seed.key)) ??
        DEFAULT_SEED_DROP_PREFERENCE;

      return this.getPreferenceWeight(preference) > 0;
    });
  }

  normalizeSeedKey(seedKey) {
    return String(seedKey ?? '').trim();
  }

  normalizePreference(preference) {
    return Object.hasOwn(seedDropPreferenceWeights, preference)
      ? preference
      : DEFAULT_SEED_DROP_PREFERENCE;
  }

  normalizeBaseDropWeight(dropWeight) {
    const weight = Number(dropWeight);

    return Number.isFinite(weight) && weight > 0 ? weight : 0;
  }
}
