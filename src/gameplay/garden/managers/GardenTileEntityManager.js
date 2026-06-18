import { query } from 'bitecs';

import {
  GardenTile,
  gardenTilePhaseNames,
  gardenTilePhases,
} from '../components/GardenComponents.js';

export class GardenTileEntityManager {
  constructor({ initialUnlockedTiles = 0, maxTiles }) {
    this.initialUnlockedTiles = initialUnlockedTiles;
    this.maxTiles = maxTiles;
    this.ecsManagers = null;
    this.tileEntityIds = [];
  }

  initialize(ecsManagers) {
    if (this.ecsManagers) {
      return;
    }

    this.ecsManagers = ecsManagers;

    for (let tileNumber = 1; tileNumber <= this.maxTiles; tileNumber += 1) {
      this.createTileEntity(tileNumber);
    }
  }

  configureCapacity({ initialUnlockedTiles = this.initialUnlockedTiles, maxTiles = this.maxTiles } = {}) {
    this.initialUnlockedTiles = initialUnlockedTiles;
    this.maxTiles = maxTiles;

    if (!this.ecsManagers) {
      return;
    }

    for (let tileNumber = this.tileEntityIds.length + 1; tileNumber <= this.maxTiles; tileNumber += 1) {
      this.createTileEntity(tileNumber);
    }
  }

  createTileEntity(tileNumber) {
    const tileEntityId = this.ecsManagers.entities.createEntity();
    this.ecsManagers.components.add(tileEntityId, GardenTile);
    GardenTile.tileNumber[tileEntityId] = tileNumber;
    GardenTile.isUnlocked[tileEntityId] = tileNumber <= this.initialUnlockedTiles ? 1 : 0;
    this.clearTileData(tileEntityId);
    this.tileEntityIds.push(tileEntityId);
  }

  getUnlockedTiles() {
    return this.getActiveTileEntityIds().filter(
      (tileEntityId) => GardenTile.isUnlocked[tileEntityId] === 1,
    ).length;
  }

  unlockNextTile() {
    const nextTileEntityId = this.getActiveTileEntityIds().find(
      (tileEntityId) => GardenTile.isUnlocked[tileEntityId] !== 1,
    );

    if (nextTileEntityId === undefined) {
      return false;
    }

    GardenTile.isUnlocked[nextTileEntityId] = 1;
    this.clearTileData(nextTileEntityId);
    return true;
  }

  isTileUnlocked(tileNumber) {
    return GardenTile.isUnlocked[this.getTileEntityId(tileNumber)] === 1;
  }

  isTileEmpty(tileNumber) {
    return GardenTile.phase[this.getTileEntityId(tileNumber)] === gardenTilePhases.empty;
  }

  isTileReady(tileNumber) {
    return GardenTile.phase[this.getTileEntityId(tileNumber)] === gardenTilePhases.ready;
  }

  getSelectedSeedItemTypeId(tileNumber) {
    return GardenTile.selectedSeedItemTypeId[this.getTileEntityId(tileNumber)] || 0;
  }

  selectSeed(tileNumber, seedItemTypeId = 0) {
    if (!this.isTileUnlocked(tileNumber)) {
      return false;
    }

    GardenTile.selectedSeedItemTypeId[this.getTileEntityId(tileNumber)] = seedItemTypeId || 0;
    return true;
  }

  clearTile(tileNumber) {
    if (!this.isTileUnlocked(tileNumber)) {
      return false;
    }

    this.clearTileData(this.getTileEntityId(tileNumber));
    return true;
  }

  startGrowth({ tileNumber, seedItemTypeId, herbItemTypeId, totalSeconds }) {
    if (!this.isTileUnlocked(tileNumber) || !this.isTileEmpty(tileNumber)) {
      return false;
    }

    const tileEntityId = this.getTileEntityId(tileNumber);
    GardenTile.selectedSeedItemTypeId[tileEntityId] = seedItemTypeId;
    GardenTile.seedItemTypeId[tileEntityId] = seedItemTypeId;
    GardenTile.herbItemTypeId[tileEntityId] = herbItemTypeId;
    GardenTile.phase[tileEntityId] = gardenTilePhases.growing;
    GardenTile.totalSeconds[tileEntityId] = Math.max(0, totalSeconds);
    GardenTile.remainingSeconds[tileEntityId] = Math.max(0, totalSeconds);
    return true;
  }

  startHarvest({ tileNumber, totalSeconds }) {
    if (!this.isTileUnlocked(tileNumber) || !this.isTileReady(tileNumber)) {
      return false;
    }

    const tileEntityId = this.getTileEntityId(tileNumber);
    GardenTile.phase[tileEntityId] = gardenTilePhases.harvesting;
    GardenTile.totalSeconds[tileEntityId] = Math.max(0, totalSeconds);
    GardenTile.remainingSeconds[tileEntityId] = Math.max(0, totalSeconds);
    return true;
  }

  reduceProcessRemainingSeconds(deltaSeconds) {
    const safeDeltaSeconds = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;

    for (const tileEntityId of this.getProcessingTileEntityIds()) {
      GardenTile.remainingSeconds[tileEntityId] = Math.max(
        0,
        (GardenTile.remainingSeconds[tileEntityId] ?? 0) - safeDeltaSeconds,
      );
    }
  }

  completeFinishedGrowths() {
    const completedTiles = [];

    for (const tileEntityId of this.getProcessingTileEntityIds(gardenTilePhases.growing)) {
      if ((GardenTile.remainingSeconds[tileEntityId] ?? 0) > 0) {
        continue;
      }

      GardenTile.phase[tileEntityId] = gardenTilePhases.ready;
      GardenTile.totalSeconds[tileEntityId] = 0;
      GardenTile.remainingSeconds[tileEntityId] = 0;
      completedTiles.push(GardenTile.tileNumber[tileEntityId]);
    }

    return completedTiles;
  }

  completeFinishedHarvests() {
    const completedHarvests = [];

    for (const tileEntityId of this.getProcessingTileEntityIds(gardenTilePhases.harvesting)) {
      if ((GardenTile.remainingSeconds[tileEntityId] ?? 0) > 0) {
        continue;
      }

      completedHarvests.push({
        tileNumber: GardenTile.tileNumber[tileEntityId],
        herbItemTypeId: GardenTile.herbItemTypeId[tileEntityId],
        selectedSeedItemTypeId: GardenTile.selectedSeedItemTypeId[tileEntityId] || 0,
      });
      this.clearActiveCropData(tileEntityId);
    }

    return completedHarvests;
  }

  applySnapshot({ unlockedTiles, tiles = [] } = {}) {
    const safeUnlockedTiles = Number.isInteger(unlockedTiles)
      ? Math.max(this.initialUnlockedTiles, Math.min(unlockedTiles, this.maxTiles))
      : this.initialUnlockedTiles;

    for (const tileEntityId of this.getActiveTileEntityIds()) {
      const tileNumber = GardenTile.tileNumber[tileEntityId];
      const tile = tiles.find((candidate) => candidate?.tileNumber === tileNumber);
      const isUnlocked = tileNumber <= safeUnlockedTiles;
      GardenTile.isUnlocked[tileEntityId] = isUnlocked ? 1 : 0;
      this.clearTileData(tileEntityId);

      if (!isUnlocked || !tile) {
        continue;
      }

      const phase = Number.isInteger(tile.phase) ? tile.phase : gardenTilePhases.empty;
      const selectedSeedItemTypeId = Number.isInteger(tile.selectedSeedItemTypeId)
        ? tile.selectedSeedItemTypeId
        : tile.seedItemTypeId || 0;
      GardenTile.selectedSeedItemTypeId[tileEntityId] = selectedSeedItemTypeId;

      if (!this.isRestorablePhase(phase, tile)) {
        continue;
      }

      if (phase === gardenTilePhases.empty) {
        continue;
      }

      GardenTile.seedItemTypeId[tileEntityId] = tile.seedItemTypeId || selectedSeedItemTypeId || 0;
      GardenTile.herbItemTypeId[tileEntityId] = tile.herbItemTypeId || 0;
      GardenTile.phase[tileEntityId] = phase;
      GardenTile.totalSeconds[tileEntityId] = Math.max(0, tile.totalSeconds || 0);
      GardenTile.remainingSeconds[tileEntityId] = Math.max(
        0,
        Math.min(tile.remainingSeconds || 0, GardenTile.totalSeconds[tileEntityId] || 0),
      );

      if (phase === gardenTilePhases.ready) {
        GardenTile.totalSeconds[tileEntityId] = 0;
        GardenTile.remainingSeconds[tileEntityId] = 0;
      }
    }
  }

  getTileSnapshots() {
    return this.getActiveTileEntityIds().map((tileEntityId) => {
      const totalSeconds = GardenTile.totalSeconds[tileEntityId] ?? 0;
      const remainingSeconds = GardenTile.remainingSeconds[tileEntityId] ?? 0;
      const phase = GardenTile.phase[tileEntityId] ?? gardenTilePhases.empty;

      return {
        tileNumber: GardenTile.tileNumber[tileEntityId],
        unlocked: GardenTile.isUnlocked[tileEntityId] === 1,
        selectedSeedItemTypeId: GardenTile.selectedSeedItemTypeId[tileEntityId] || null,
        seedItemTypeId: GardenTile.seedItemTypeId[tileEntityId] || null,
        herbItemTypeId: GardenTile.herbItemTypeId[tileEntityId] || null,
        phase: gardenTilePhaseNames[phase] ?? 'empty',
        totalMs: Math.ceil(totalSeconds * 1_000),
        remainingMs: Math.ceil(remainingSeconds * 1_000),
        progress:
          totalSeconds <= 0 ? 0 : Math.min(1, (totalSeconds - remainingSeconds) / totalSeconds),
      };
    });
  }

  getTileEntityId(tileNumber) {
    const tileEntityId = this.getActiveTileEntityIds().find(
      (entityId) => GardenTile.tileNumber[entityId] === tileNumber,
    );

    if (tileEntityId === undefined) {
      throw new Error(`Unknown garden tile: ${tileNumber}`);
    }

    return tileEntityId;
  }

  getProcessingTileEntityIds(phase = null) {
    return query(this.ecsManagers.world.getWorld(), [GardenTile]).filter((tileEntityId) => {
      if (GardenTile.tileNumber[tileEntityId] > this.maxTiles) {
        return false;
      }

      const tilePhase = GardenTile.phase[tileEntityId];
      const isProcessing =
        tilePhase === gardenTilePhases.growing || tilePhase === gardenTilePhases.harvesting;
      return phase === null ? isProcessing : tilePhase === phase;
    });
  }

  hasProcessingTiles() {
    return this.getProcessingTileEntityIds().length > 0;
  }

  getActiveTileEntityIds() {
    return this.tileEntityIds.filter((tileEntityId) => GardenTile.tileNumber[tileEntityId] <= this.maxTiles);
  }

  clearTileData(tileEntityId) {
    GardenTile.selectedSeedItemTypeId[tileEntityId] = 0;
    this.clearActiveCropData(tileEntityId);
  }

  clearActiveCropData(tileEntityId) {
    GardenTile.seedItemTypeId[tileEntityId] = 0;
    GardenTile.herbItemTypeId[tileEntityId] = 0;
    GardenTile.phase[tileEntityId] = gardenTilePhases.empty;
    GardenTile.totalSeconds[tileEntityId] = 0;
    GardenTile.remainingSeconds[tileEntityId] = 0;
  }

  isRestorablePhase(phase, tile) {
    if (phase === gardenTilePhases.empty) {
      return true;
    }

    if (!tile.herbItemTypeId) {
      return false;
    }

    return (
      phase === gardenTilePhases.growing ||
      phase === gardenTilePhases.ready ||
      phase === gardenTilePhases.harvesting
    );
  }
}
