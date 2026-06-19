export class SeedDropWeightManager {
  constructor({ random = Math.random } = {}) {
    this.random = random;
  }

  pickSeed(seeds) {
    const totalWeight = seeds.reduce((sum, seed) => sum + this.getWeight(seed), 0);

    if (totalWeight <= 0) {
      return null;
    }

    let roll = this.random() * totalWeight;

    for (const seed of seeds) {
      roll -= this.getWeight(seed);

      if (roll <= 0) {
        return seed;
      }
    }

    return seeds[seeds.length - 1];
  }

  getDropChances(seeds) {
    const totalWeight = seeds.reduce((sum, seed) => sum + this.getWeight(seed), 0);

    if (seeds.length <= 0) {
      return [];
    }

    if (totalWeight <= 0) {
      return seeds.map((seed) => ({
        ...seed,
        dropChance: 0,
      }));
    }

    return seeds.map((seed) => ({
      ...seed,
      dropChance: this.getWeight(seed) / totalWeight,
    }));
  }

  getWeight(seed) {
    const weight = Number(seed.effectiveDropWeight ?? seed.dropWeight);

    return Number.isFinite(weight) && weight > 0 ? weight : 0;
  }
}
