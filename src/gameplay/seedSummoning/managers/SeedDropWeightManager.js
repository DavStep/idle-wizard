export class SeedDropWeightManager {
  constructor({ itemsFacade, random = Math.random }) {
    this.itemsFacade = itemsFacade;
    this.random = random;
  }

  pickSeed() {
    const seeds = this.itemsFacade.getSeedDefinitions();
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
}
