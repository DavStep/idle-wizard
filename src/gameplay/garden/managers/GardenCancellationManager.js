export class GardenCancellationManager {
  constructor({ gardenTileEntityManager, itemsFacade }) {
    this.gardenTileEntityManager = gardenTileEntityManager;
    this.itemsFacade = itemsFacade;
  }

  cancelProgress(tileNumber) {
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

    if (tile.phase !== 'growing' && tile.phase !== 'harvesting') {
      return {
        ok: false,
        reason: 'not_in_progress',
        tileNumber,
      };
    }

    if (!tile.seedItemTypeId) {
      return {
        ok: false,
        reason: 'missing_seed',
        tileNumber,
      };
    }

    const seed = this.itemsFacade.getItemDefinition(tile.seedItemTypeId);
    const quantity = Math.max(1, Math.floor(Number(tile.harvestQuantity) || 1));
    this.itemsFacade.addItem(seed.id, quantity);
    this.gardenTileEntityManager.clearTile(tileNumber);

    return {
      ok: true,
      tileNumber,
      seed: this.createItemResult(seed),
      quantity,
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
