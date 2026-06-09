import gardenBalance from '../garden-balance.json';

export class GardenBalanceManager {
  constructor({ balance = gardenBalance } = {}) {
    this.balance = balance;
    this.tileCostsGold = this.readTileCostsGold();
    this.initialUnlockedTiles = this.readInitialUnlockedTiles();
    this.tilesPerRow = this.readTilesPerRow();
    this.harvestSeconds = this.readHarvestSeconds();
  }

  getMaxTiles() {
    return this.tileCostsGold.length;
  }

  getInitialUnlockedTiles() {
    return this.initialUnlockedTiles;
  }

  getTileCost(tileNumber) {
    return this.tileCostsGold[tileNumber - 1] ?? null;
  }

  getTileCosts() {
    return [...this.tileCostsGold];
  }

  getTilesPerRow() {
    return this.tilesPerRow;
  }

  getHarvestSeconds() {
    return this.harvestSeconds;
  }

  readTileCostsGold() {
    const tileCosts = this.balance?.garden?.tileCostsGold;

    if (!Array.isArray(tileCosts) || tileCosts.length === 0) {
      throw new Error('garden-balance.json requires garden.tileCostsGold.');
    }

    if (tileCosts.some((cost) => !Number.isFinite(cost) || cost < 0)) {
      throw new Error('garden-balance.json tile costs must be zero or positive numbers.');
    }

    return [...tileCosts];
  }

  readInitialUnlockedTiles() {
    const initialUnlockedTiles = this.balance?.garden?.initialUnlockedTiles ?? 0;

    if (
      !Number.isInteger(initialUnlockedTiles) ||
      initialUnlockedTiles < 0 ||
      initialUnlockedTiles > this.getMaxTiles()
    ) {
      throw new Error('garden-balance.json initial unlocked tiles must fit garden tiles.');
    }

    return initialUnlockedTiles;
  }

  readTilesPerRow() {
    const tilesPerRow = this.balance?.garden?.tilesPerRow;

    if (!Number.isInteger(tilesPerRow) || tilesPerRow <= 0) {
      throw new Error('garden-balance.json requires positive garden.tilesPerRow.');
    }

    return tilesPerRow;
  }

  readHarvestSeconds() {
    const harvestSeconds = this.balance?.garden?.harvestSeconds;

    if (!Number.isFinite(harvestSeconds) || harvestSeconds <= 0) {
      throw new Error('garden-balance.json requires positive garden.harvestSeconds.');
    }

    return harvestSeconds;
  }
}
