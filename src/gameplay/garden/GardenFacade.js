import { GardenBalanceManager } from './managers/GardenBalanceManager.js';
import { GardenCancellationManager } from './managers/GardenCancellationManager.js';
import { GardenPlantingManager } from './managers/GardenPlantingManager.js';
import { GardenProcessManager } from './managers/GardenProcessManager.js';
import { GardenSnapshotManager } from './managers/GardenSnapshotManager.js';
import { GardenTileEntityManager } from './managers/GardenTileEntityManager.js';
import { GardenTilePurchaseManager } from './managers/GardenTilePurchaseManager.js';
import { gardenTilePhases } from './components/GardenComponents.js';
import { parseGameConfig } from '../config/gameConfigSnapshot.js';

export class GardenFacade {
  static explain =
    'The garden turns planted seeds into herbs: tiles are opened with gold, then each tile grows and harvests over time.';

  constructor({
    goldFacade,
    itemsFacade,
    playerLevelFacade,
    onHarvestComplete,
    researchFacade,
  }) {
    this.itemsFacade = itemsFacade;
    this.playerLevelFacade = playerLevelFacade;
    this.researchFacade = researchFacade;
    this.gardenBalanceManager = new GardenBalanceManager();
    this.gardenTileEntityManager = new GardenTileEntityManager({
      initialUnlockedTiles: this.gardenBalanceManager.getInitialUnlockedTiles(),
      maxTiles: this.gardenBalanceManager.getMaxTiles(),
    });
    this.gardenTilePurchaseManager = new GardenTilePurchaseManager({
      goldFacade,
      gardenBalanceManager: this.gardenBalanceManager,
      gardenTileEntityManager: this.gardenTileEntityManager,
      playerLevelFacade,
      researchFacade,
    });
    this.gardenPlantingManager = new GardenPlantingManager({
      gardenBalanceManager: this.gardenBalanceManager,
      gardenTileEntityManager: this.gardenTileEntityManager,
      itemsFacade,
      researchFacade,
    });
    this.gardenCancellationManager = new GardenCancellationManager({
      gardenTileEntityManager: this.gardenTileEntityManager,
      itemsFacade,
    });
    this.gardenProcessManager = new GardenProcessManager({
      gardenTileEntityManager: this.gardenTileEntityManager,
      itemsFacade,
      onHarvestComplete,
    });
    this.gardenSnapshotManager = new GardenSnapshotManager({
      gardenBalanceManager: this.gardenBalanceManager,
      gardenTileEntityManager: this.gardenTileEntityManager,
      itemsFacade,
      playerLevelFacade,
      researchFacade,
    });
  }

  initialize(ecsManagers) {
    this.gardenTileEntityManager.initialize(ecsManagers);
    this.gardenProcessManager.register(ecsManagers.systems);
  }

  applyRuntimeConfig(snapshot = {}) {
    const balance = parseGameConfig(snapshot, 'garden');

    if (!balance) {
      return;
    }

    try {
      this.gardenBalanceManager.setRuntimeBalance(balance);
      this.gardenTileEntityManager.configureCapacity({
        initialUnlockedTiles: this.gardenBalanceManager.getInitialUnlockedTiles(),
        maxTiles: this.gardenBalanceManager.getMaxTiles(),
      });
    } catch {
      return;
    }
  }

  buyNextTile() {
    return this.gardenTilePurchaseManager.buyNextTile();
  }

  plantSeed(tileNumber, seedTypeId) {
    return this.gardenPlantingManager.plantSeed(tileNumber, seedTypeId);
  }

  selectSeed(tileNumber, seedTypeId) {
    return this.gardenPlantingManager.selectSeed(tileNumber, seedTypeId);
  }

  plantSelectedSeed(tileNumber) {
    return this.gardenPlantingManager.plantSelectedSeed(tileNumber);
  }

  replaceSeed(tileNumber, seedTypeId) {
    return this.gardenPlantingManager.replaceSeed(tileNumber, seedTypeId);
  }

  startHarvest(tileNumber) {
    return this.gardenPlantingManager.startHarvest(tileNumber);
  }

  cancelProgress(tileNumber) {
    return this.gardenCancellationManager.cancelProgress(tileNumber);
  }

  getSnapshot() {
    return this.gardenSnapshotManager.getSnapshot();
  }

  hasFrameTimerWork() {
    return this.gardenTileEntityManager.hasProcessingTiles();
  }

  getPersistenceSnapshot() {
    return {
      unlockedTiles: this.gardenTileEntityManager.getUnlockedTiles(),
      tiles: this.gardenSnapshotManager.getTileSnapshots().map((tile) => ({
        tileNumber: tile.tileNumber,
        selectedSeedItemKey: tile.selectedSeedKey,
        seedItemKey: tile.seedKey,
        herbItemKey: tile.herbKey,
        phase: tile.phase,
        totalMs: tile.totalMs,
        remainingMs: tile.remainingMs,
      })),
    };
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') {
      return;
    }

    const tiles = Array.isArray(snapshot.tiles)
      ? snapshot.tiles.map((tile) => this.restoreTile(tile)).filter(Boolean)
      : [];

    this.gardenTileEntityManager.applySnapshot({
      unlockedTiles: this.clampUnlockedTilesByLevel(snapshot.unlockedTiles),
      tiles,
    });
  }

  clampUnlockedTilesByLevel(unlockedTiles) {
    if (!Number.isInteger(unlockedTiles)) {
      return unlockedTiles;
    }

    return Math.min(unlockedTiles, this.getMaxUnlockedTilesByProgression(unlockedTiles));
  }

  getMaxUnlockedTilesByProgression(fallback = this.gardenBalanceManager.getMaxTiles()) {
    const maxTilesByLevel = this.playerLevelFacade?.getMaxGardenTiles?.() ?? fallback;

    return Math.min(
      this.gardenBalanceManager.getMaxTiles(),
      this.researchFacade?.getMaxGardenTilesWithCapacity?.(maxTilesByLevel) ??
        maxTilesByLevel,
    );
  }

  restoreTile(tile) {
    if (!tile || !Number.isInteger(tile.tileNumber)) {
      return null;
    }

    const seed =
      typeof tile.seedItemKey === 'string'
        ? this.itemsFacade.safeGetDefinitionByKey(tile.seedItemKey)
        : null;
    let selectedSeed = seed;
    const phase = gardenTilePhases[tile.phase] ?? gardenTilePhases.empty;

    if (phase === gardenTilePhases.empty && Object.hasOwn(tile, 'selectedSeedItemKey')) {
      selectedSeed =
        typeof tile.selectedSeedItemKey === 'string'
          ? this.itemsFacade.safeGetDefinitionByKey(tile.selectedSeedItemKey)
          : null;
    }
    const herb =
      typeof tile.herbItemKey === 'string'
        ? this.itemsFacade.safeGetDefinitionByKey(tile.herbItemKey)
        : null;

    return {
      tileNumber: tile.tileNumber,
      selectedSeedItemTypeId: selectedSeed?.id ?? 0,
      seedItemTypeId: seed?.id ?? 0,
      herbItemTypeId: herb?.id ?? 0,
      phase,
      totalSeconds: Number.isFinite(tile.totalMs) ? tile.totalMs / 1_000 : 0,
      remainingSeconds: Number.isFinite(tile.remainingMs) ? tile.remainingMs / 1_000 : 0,
    };
  }
}
