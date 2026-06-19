import { SeedDropPreferenceManager } from './managers/SeedDropPreferenceManager.js';
import { SeedDropWeightManager } from './managers/SeedDropWeightManager.js';
import { SeedSummonCostManager } from './managers/SeedSummonCostManager.js';
import { SeedSummonEligibilityManager } from './managers/SeedSummonEligibilityManager.js';
import { SeedSummonMultiplierManager } from './managers/SeedSummonMultiplierManager.js';
import { SeedSummonRequestManager } from './managers/SeedSummonRequestManager.js';

export class SeedSummoningFacade {
  static explain =
    'Turns mana into researched random seeds, with player drop preferences that tilt odds without changing seed config.';

  constructor({ manaFacade, itemsFacade, researchFacade }) {
    this.manaFacade = manaFacade;
    this.itemsFacade = itemsFacade;
    this.seedDropPreferenceManager = new SeedDropPreferenceManager();
    this.seedDropWeightManager = new SeedDropWeightManager();
    this.seedSummonMultiplierManager = new SeedSummonMultiplierManager({
      researchFacade,
    });
    this.seedSummonCostManager = new SeedSummonCostManager({
      itemsFacade,
      seedSummonMultiplierManager: this.seedSummonMultiplierManager,
    });
    this.seedSummonEligibilityManager = new SeedSummonEligibilityManager({
      itemsFacade,
      researchFacade,
    });
    this.seedSummonRequestManager = new SeedSummonRequestManager({
      manaFacade,
      itemsFacade,
      seedDropPreferenceManager: this.seedDropPreferenceManager,
      seedDropWeightManager: this.seedDropWeightManager,
      seedSummonCostManager: this.seedSummonCostManager,
      seedSummonEligibilityManager: this.seedSummonEligibilityManager,
      seedSummonMultiplierManager: this.seedSummonMultiplierManager,
    });
  }

  initialize() {}

  summonSeed() {
    return this.seedSummonRequestManager.summonSeed();
  }

  canSummonSeed({ reservedMana = 0 } = {}) {
    const cost = this.seedSummonCostManager.getVisibleSummonCost();
    const currentMana = this.manaFacade.getSnapshot().current;
    const reserved = Number.isFinite(reservedMana) ? Math.max(0, reservedMana) : 0;
    const availableMana = Math.max(0, currentMana - reserved);
    const hasSummonableSeed = this.getSummonableSeeds().some(
      (seed) => seed.effectiveDropWeight > 0,
    );

    return hasSummonableSeed && availableMana >= cost;
  }

  setSeedDropPreference(seedKey, preference) {
    return this.seedDropPreferenceManager.setPreference(seedKey, preference, {
      unlockedSeeds: this.seedSummonEligibilityManager.getSummonableSeeds(),
    });
  }

  getSnapshot() {
    const cost = this.seedSummonCostManager.getVisibleSummonCost();
    const quantity = this.seedSummonMultiplierManager.getSummonQuantity();

    return {
      cost,
      quantity,
      canSummon: this.canSummonSeed(),
      dropChances: this.getDropChances(),
    };
  }

  getDropChances() {
    return this.seedDropWeightManager
      .getDropChances(this.getSummonableSeeds())
      .map((seed) => ({
        itemTypeId: seed.id,
        key: seed.key,
        label: seed.label,
        kind: seed.kind,
        baseDropWeight: seed.baseDropWeight,
        dropPreference: seed.dropPreference,
        preferenceWeight: seed.preferenceWeight,
        dropWeight: seed.dropWeight,
        effectiveDropWeight: seed.effectiveDropWeight,
        dropChance: seed.dropChance,
      }));
  }

  getSummonableSeeds() {
    return this.seedDropPreferenceManager.applyPreferences(
      this.seedSummonEligibilityManager.getSummonableSeeds(),
    );
  }

  getPersistenceSnapshot() {
    return this.seedDropPreferenceManager.getPersistenceSnapshot();
  }

  applyPersistenceSnapshot(snapshot) {
    this.seedDropPreferenceManager.applyPersistenceSnapshot(snapshot);
  }
}
