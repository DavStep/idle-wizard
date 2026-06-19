export class SeedDropWeightManager {
  constructor({ random = Math.random } = {}) {
    this.random = random;
  }

  pickSeed(seeds) {
    const totalWeight = seeds.reduce((sum, seed) => sum + seed.dropWeight, 0);
    let roll = this.random() * totalWeight;

    for (const seed of seeds) {
      roll -= seed.dropWeight;

      if (roll <= 0) {
        return seed;
      }
    }

    return seeds[seeds.length - 1];
  }

  getDropChances(seeds) {
    const totalWeight = seeds.reduce((sum, seed) => sum + seed.dropWeight, 0);

    if (totalWeight <= 0) {
      return [];
    }

    return seeds.map((seed) => ({
      ...seed,
      dropChance: seed.dropWeight / totalWeight,
    }));
  }
}
