const DEFAULT_GARDEN_BALANCE = {
  garden: {
    initialUnlockedTiles: 1,
    tileCostsCoin: [
      0, 25, 75, 175, 400, 800, 1400, 2200, 3300, 4800, 7000, 10000,
    ],
    tilesPerRow: 4,
    harvestSeconds: 3,
  },
};

export class GardenBalanceManager {
  constructor({ balance = DEFAULT_GARDEN_BALANCE } = {}) {
    this.setBalance(balance);
  }

  setRuntimeBalance(balance) {
    this.setBalance(balance);
  }

  setBalance(balance) {
    this.balance = balance;
    this.tileCostsCoin = this.readTileCostsCoin();
    this.initialUnlockedTiles = this.readInitialUnlockedTiles();
    this.tilesPerRow = this.readTilesPerRow();
    this.harvestSeconds = this.readHarvestSeconds();
  }

  getMaxTiles() {
    return this.tileCostsCoin.length;
  }

  getInitialUnlockedTiles() {
    return this.initialUnlockedTiles;
  }

  getTileCost(tileNumber) {
    return this.tileCostsCoin[tileNumber - 1] ?? null;
  }

  getTileCosts() {
    return [...this.tileCostsCoin];
  }

  getTilesPerRow() {
    return this.tilesPerRow;
  }

  getHarvestSeconds() {
    return this.harvestSeconds;
  }

  readTileCostsCoin() {
    const tileCosts = this.balance?.garden?.tileCostsCoin;

    if (!Array.isArray(tileCosts) || tileCosts.length === 0) {
      throw new Error('game_config.garden requires garden.tileCostsCoin.');
    }

    if (tileCosts.some((cost) => !Number.isFinite(cost) || cost < 0)) {
      throw new Error('game_config.garden tile costs must be zero or positive numbers.');
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
      throw new Error('game_config.garden initial unlocked tiles must fit garden tiles.');
    }

    return initialUnlockedTiles;
  }

  readTilesPerRow() {
    const tilesPerRow = this.balance?.garden?.tilesPerRow;

    if (!Number.isInteger(tilesPerRow) || tilesPerRow <= 0) {
      throw new Error('game_config.garden requires positive garden.tilesPerRow.');
    }

    return tilesPerRow;
  }

  readHarvestSeconds() {
    const harvestSeconds = this.balance?.garden?.harvestSeconds;

    if (!Number.isFinite(harvestSeconds) || harvestSeconds <= 0) {
      throw new Error('game_config.garden requires positive garden.harvestSeconds.');
    }

    return harvestSeconds;
  }
}
