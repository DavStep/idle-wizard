import { itemKinds } from '../../items/itemKinds.js';

export class GardenPlantingManager {
  constructor({ gardenBalanceManager, gardenTileEntityManager, itemsFacade, researchFacade }) {
    this.gardenBalanceManager = gardenBalanceManager;
    this.gardenTileEntityManager = gardenTileEntityManager;
    this.itemsFacade = itemsFacade;
    this.researchFacade = researchFacade;
  }

  plantSeed(tileNumber, seedTypeId) {
    if (!this.gardenTileEntityManager.isTileUnlocked(tileNumber)) {
      return {
        ok: false,
        reason: 'tile_locked',
        tileNumber,
      };
    }

    if (!this.gardenTileEntityManager.isTileEmpty(tileNumber)) {
      return {
        ok: false,
        reason: 'tile_busy',
        tileNumber,
      };
    }

    const seedResult = this.getSeedResult(seedTypeId);

    if (!seedResult.ok) {
      return seedResult;
    }

    this.gardenTileEntityManager.selectSeed(tileNumber, seedResult.seed.id);
    return this.startSelectedSeedGrowth(tileNumber, seedResult.seed);
  }

  selectSeed(tileNumber, seedTypeId) {
    if (!this.gardenTileEntityManager.isTileUnlocked(tileNumber)) {
      return {
        ok: false,
        reason: 'tile_locked',
        tileNumber,
      };
    }

    if (!this.gardenTileEntityManager.isTileEmpty(tileNumber)) {
      return {
        ok: false,
        reason: 'tile_busy',
        tileNumber,
      };
    }

    if (!seedTypeId) {
      this.gardenTileEntityManager.selectSeed(tileNumber, 0);
      return {
        ok: true,
        tileNumber,
        seed: null,
        herb: null,
        planted: false,
      };
    }

    const seedResult = this.getSeedResult(seedTypeId);

    if (!seedResult.ok) {
      return seedResult;
    }

    this.gardenTileEntityManager.selectSeed(tileNumber, seedResult.seed.id);

    const plantResult = this.startSelectedSeedGrowth(tileNumber, seedResult.seed);

    if (!plantResult.ok && plantResult.reason === 'not_enough_seed') {
      return {
        ok: true,
        tileNumber,
        seed: this.createItemResult(seedResult.seed),
        herb: this.createItemResult(seedResult.herb),
        planted: false,
      };
    }

    return plantResult.ok ? { ...plantResult, planted: true } : plantResult;
  }

  plantSelectedSeed(tileNumber) {
    if (!this.gardenTileEntityManager.isTileUnlocked(tileNumber)) {
      return {
        ok: false,
        reason: 'tile_locked',
        tileNumber,
      };
    }

    if (!this.gardenTileEntityManager.isTileEmpty(tileNumber)) {
      return {
        ok: false,
        reason: 'tile_busy',
        tileNumber,
      };
    }

    const selectedSeedItemTypeId = this.gardenTileEntityManager.getSelectedSeedItemTypeId(
      tileNumber,
    );

    if (!selectedSeedItemTypeId) {
      return {
        ok: false,
        reason: 'no_seed_selected',
        tileNumber,
      };
    }

    const seedResult = this.getSeedResult(selectedSeedItemTypeId);

    if (!seedResult.ok) {
      return seedResult;
    }

    return this.startSelectedSeedGrowth(tileNumber, seedResult.seed);
  }

  replaceSeed(tileNumber, seedTypeId) {
    if (!this.gardenTileEntityManager.isTileUnlocked(tileNumber)) {
      return {
        ok: false,
        reason: 'tile_locked',
        tileNumber,
      };
    }

    const tile = this.gardenTileEntityManager
      .getTileSnapshots()
      .find((candidate) => candidate.tileNumber === tileNumber);

    if (!tile || tile.phase === 'empty') {
      return {
        ok: false,
        reason: 'tile_empty',
        tileNumber,
      };
    }

    if (tile.phase !== 'growing') {
      return {
        ok: false,
        reason: 'not_growing',
        tileNumber,
      };
    }

    const seedResult = this.getSeedResult(seedTypeId);

    if (!seedResult.ok) {
      return seedResult;
    }

    const previousSeed = tile.seedItemTypeId
      ? this.itemsFacade.getItemDefinition(tile.seedItemTypeId)
      : null;
    const availableQuantity =
      this.itemsFacade.getItemQuantity(seedResult.seed.id) +
      (previousSeed?.id === seedResult.seed.id ? 1 : 0);

    if (availableQuantity <= 0) {
      return {
        ok: false,
        reason: 'not_enough_seed',
        seed: seedResult.seed,
      };
    }

    if (previousSeed) {
      this.itemsFacade.addItem(previousSeed.id, 1);
    }

    if (!this.itemsFacade.removeItem(seedResult.seed.id, 1)) {
      if (previousSeed) {
        this.itemsFacade.removeItem(previousSeed.id, 1);
      }

      return {
        ok: false,
        reason: 'not_enough_seed',
        seed: seedResult.seed,
      };
    }

    const durationMs = this.getGrowthDurationMs(tileNumber, seedResult.herb);
    const replaced = this.gardenTileEntityManager.startGrowth({
      tileNumber,
      seedItemTypeId: seedResult.seed.id,
      herbItemTypeId: seedResult.herb.id,
      totalSeconds: durationMs / 1_000,
      replace: true,
    });

    if (!replaced) {
      this.itemsFacade.addItem(seedResult.seed.id, 1);

      if (previousSeed) {
        this.itemsFacade.removeItem(previousSeed.id, 1);
      }

      return {
        ok: false,
        reason: 'replace_failed',
        tileNumber,
      };
    }

    return {
      ok: true,
      tileNumber,
      seed: this.createItemResult(seedResult.seed),
      herb: this.createItemResult(seedResult.herb),
      replacedSeed: previousSeed ? this.createItemResult(previousSeed) : null,
      durationMs,
      replaced: true,
    };
  }

  startSelectedSeedGrowth(tileNumber, seed) {
    if (!this.itemsFacade.removeItem(seed.id, 1)) {
      return {
        ok: false,
        reason: 'not_enough_seed',
        seed,
      };
    }

    const herb = this.itemsFacade.getItemDefinition(seed.producesHerbTypeId);
    const durationMs = this.getGrowthDurationMs(tileNumber, herb);
    this.gardenTileEntityManager.startGrowth({
      tileNumber,
      seedItemTypeId: seed.id,
      herbItemTypeId: herb.id,
      totalSeconds: durationMs / 1_000,
    });

    return {
      ok: true,
      tileNumber,
      seed: this.createItemResult(seed),
      herb: this.createItemResult(herb),
      durationMs,
    };
  }

  getGrowthDurationMs(tileNumber, herb) {
    const baseDurationMs = herb.growthDurationMs ?? 60_000;
    return (
      this.researchFacade?.getReducedPlotGrowthDurationMs?.(tileNumber, baseDurationMs) ??
      baseDurationMs
    );
  }

  getSeedResult(seedTypeId) {
    const seed = this.itemsFacade.getItemDefinition(seedTypeId);

    if (seed.kind !== itemKinds.seed) {
      return {
        ok: false,
        reason: 'not_seed',
        itemTypeId: seedTypeId,
      };
    }

    return {
      ok: true,
      seed,
      herb: this.itemsFacade.getItemDefinition(seed.producesHerbTypeId),
    };
  }

  startHarvest(tileNumber) {
    if (!this.gardenTileEntityManager.isTileUnlocked(tileNumber)) {
      return {
        ok: false,
        reason: 'tile_locked',
        tileNumber,
      };
    }

    if (!this.gardenTileEntityManager.isTileReady(tileNumber)) {
      return {
        ok: false,
        reason: 'not_ready',
        tileNumber,
      };
    }

    const tile = this.gardenTileEntityManager
      .getTileSnapshots()
      .find((candidate) => candidate.tileNumber === tileNumber);
    const herb = this.itemsFacade.getItemDefinition(tile.herbItemTypeId);
    const durationMs = this.gardenBalanceManager.getHarvestSeconds() * 1_000;

    this.gardenTileEntityManager.startHarvest({
      tileNumber,
      totalSeconds: this.gardenBalanceManager.getHarvestSeconds(),
    });

    return {
      ok: true,
      tileNumber,
      herb: this.createItemResult(herb),
      durationMs,
    };
  }

  createItemResult(item) {
    return {
      itemTypeId: item.id,
      key: item.key,
      label: item.label,
      kind: item.kind,
    };
  }
}
