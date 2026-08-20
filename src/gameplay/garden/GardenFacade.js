import { GardenBalanceManager } from "./managers/GardenBalanceManager.js";
import { GardenBulkActionManager } from "./managers/GardenBulkActionManager.js";
import { GardenCancellationManager } from "./managers/GardenCancellationManager.js";
import { GardenPlantingManager } from "./managers/GardenPlantingManager.js";
import { GardenProcessManager } from "./managers/GardenProcessManager.js";
import { GardenSeedSelectionManager } from "./managers/GardenSeedSelectionManager.js";
import { GardenSnapshotManager } from "./managers/GardenSnapshotManager.js";
import { GardenTileEntityManager } from "./managers/GardenTileEntityManager.js";
import { GardenTilePurchaseManager } from "./managers/GardenTilePurchaseManager.js";
import { GardenTapAccelerationManager } from "./managers/GardenTapAccelerationManager.js";
import { gardenTilePhases } from "./components/GardenComponents.js";
import { parseGameConfig } from "../config/gameConfigSnapshot.js";

export class GardenFacade {
  static explain =
    "The garden turns planted seeds into herbs: tiles are opened with coin, then each tile grows and harvests over time.";

  constructor({
    coinFacade,
    itemsFacade,
    playerLevelFacade,
    onHarvestComplete,
    researchFacade,
    tapNow,
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
      coinFacade,
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
    this.gardenSeedSelectionManager = new GardenSeedSelectionManager({
      itemsFacade,
    });
    this.gardenTapAccelerationManager = new GardenTapAccelerationManager({
      gardenTileEntityManager: this.gardenTileEntityManager,
      now: tapNow,
    });
    this.gardenBulkActionManager = new GardenBulkActionManager({
      gardenPlantingManager: this.gardenPlantingManager,
      gardenTileEntityManager: this.gardenTileEntityManager,
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
    const balance = parseGameConfig(snapshot, "garden");

    if (!balance) {
      return;
    }

    try {
      this.gardenBalanceManager.setRuntimeBalance(balance);
      this.gardenTileEntityManager.configureCapacity({
        initialUnlockedTiles:
          this.gardenBalanceManager.getInitialUnlockedTiles(),
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

  selectToolbarSeed(seedTypeId) {
    return this.gardenSeedSelectionManager.select(seedTypeId);
  }

  selectSeed(tileNumber, seedTypeId) {
    return this.gardenPlantingManager.selectSeed(tileNumber, seedTypeId);
  }

  selectAutomationSeed(tileNumber, seedTypeId) {
    return this.gardenPlantingManager.selectAutomationSeed(
      tileNumber,
      seedTypeId,
    );
  }

  setAutomationEnabled(tileNumber, enabled) {
    if (!this.gardenTileEntityManager.isTileUnlocked(tileNumber)) {
      return { ok: false, reason: "tile_locked", tileNumber };
    }
    this.gardenTileEntityManager.setAutomationEnabled(tileNumber, enabled);
    return { ok: true, tileNumber, enabled: enabled !== false };
  }

  toggleAutomationEnabled(tileNumber) {
    return this.setAutomationEnabled(
      tileNumber,
      !this.gardenTileEntityManager.isAutomationEnabled(tileNumber),
    );
  }

  setPlantQuantity(tileNumber, quantity) {
    if (!this.gardenTileEntityManager.isTileUnlocked(tileNumber)) {
      return { ok: false, reason: "tile_locked", tileNumber };
    }
    const maxQuantity = this.gardenSnapshotManager.getPlotLevel(tileNumber);
    const safeQuantity = Math.floor(Number(quantity));
    if (
      !Number.isInteger(safeQuantity) ||
      safeQuantity < 1 ||
      safeQuantity > maxQuantity
    ) {
      return { ok: false, reason: "invalid_quantity", tileNumber, maxQuantity };
    }
    this.gardenTileEntityManager.setPlantQuantity(tileNumber, safeQuantity);
    return { ok: true, tileNumber, quantity: safeQuantity, maxQuantity };
  }

  plantSelectedSeed(tileNumber) {
    return this.gardenPlantingManager.plantSelectedSeed(tileNumber);
  }

  plantAllSeeds(seedTypeId) {
    return this.gardenBulkActionManager.plantAll(seedTypeId);
  }

  replaceSeed(tileNumber, seedTypeId) {
    return this.gardenPlantingManager.replaceSeed(tileNumber, seedTypeId);
  }

  startHarvest(tileNumber) {
    return this.gardenPlantingManager.startHarvest(tileNumber);
  }

  startAllReadyHarvests() {
    return this.gardenBulkActionManager.harvestAll();
  }

  acceleratePlot(tileNumber) {
    return this.gardenTapAccelerationManager.accelerate(tileNumber);
  }

  cancelProgress(tileNumber) {
    return this.gardenCancellationManager.cancelProgress(tileNumber);
  }

  getSnapshot() {
    return {
      ...this.gardenSnapshotManager.getSnapshot(),
      ...this.gardenSeedSelectionManager.getSnapshot(),
    };
  }

  hasFrameTimerWork() {
    return this.gardenTileEntityManager.hasProcessingTiles();
  }

  getPersistenceSnapshot() {
    return {
      ...this.gardenSeedSelectionManager.getPersistenceSnapshot(),
      unlockedTiles: this.gardenTileEntityManager.getUnlockedTiles(),
      tiles: this.gardenSnapshotManager.getTileSnapshots().map((tile) => ({
        tileNumber: tile.tileNumber,
        autoEnabled: tile.autoEnabled !== false,
        plantQuantity: tile.plantQuantity,
        selectedSeedItemKey: tile.selectedSeedKey,
        seedItemKey: tile.seedKey,
        herbItemKey: tile.herbKey,
        harvestQuantity: tile.harvestQuantity,
        phase: tile.phase,
        totalMs: tile.totalMs,
        remainingMs: tile.remainingMs,
      })),
    };
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (!snapshot || typeof snapshot !== "object") {
      return;
    }

    this.gardenTapAccelerationManager.reset();
    this.gardenSeedSelectionManager.applyPersistenceSnapshot(snapshot);
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

    return Math.min(
      unlockedTiles,
      this.getMaxUnlockedTilesByProgression(unlockedTiles),
    );
  }

  getMaxUnlockedTilesByProgression(
    fallback = this.gardenBalanceManager.getMaxTiles(),
  ) {
    const maxTilesByLevel =
      this.playerLevelFacade?.getMaxGardenTiles?.() ?? fallback;

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
      typeof tile.seedItemKey === "string"
        ? this.itemsFacade.safeGetDefinitionByKey(tile.seedItemKey)
        : null;
    let selectedSeed = seed;
    const phase = gardenTilePhases[tile.phase] ?? gardenTilePhases.empty;

    if (
      phase === gardenTilePhases.empty &&
      Object.hasOwn(tile, "selectedSeedItemKey")
    ) {
      selectedSeed =
        typeof tile.selectedSeedItemKey === "string"
          ? this.itemsFacade.safeGetDefinitionByKey(tile.selectedSeedItemKey)
          : null;
    }
    const herb =
      typeof tile.herbItemKey === "string"
        ? this.itemsFacade.safeGetDefinitionByKey(tile.herbItemKey)
        : null;

    return {
      tileNumber: tile.tileNumber,
      autoEnabled: tile.autoEnabled !== false,
      plantQuantity: Math.max(0, Math.floor(Number(tile.plantQuantity) || 0)),
      selectedSeedItemTypeId: selectedSeed?.id ?? 0,
      seedItemTypeId: seed?.id ?? 0,
      herbItemTypeId: herb?.id ?? 0,
      harvestQuantity: Math.max(
        1,
        Math.floor(Number(tile.harvestQuantity) || 1),
      ),
      phase,
      totalSeconds: Number.isFinite(tile.totalMs) ? tile.totalMs / 1_000 : 0,
      remainingSeconds: Number.isFinite(tile.remainingMs)
        ? tile.remainingMs / 1_000
        : 0,
    };
  }
}
