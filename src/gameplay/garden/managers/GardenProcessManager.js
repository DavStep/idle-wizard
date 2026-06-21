export class GardenProcessManager {
  constructor({ gardenTileEntityManager, itemsFacade, onHarvestComplete } = {}) {
    this.gardenTileEntityManager = gardenTileEntityManager;
    this.itemsFacade = itemsFacade;
    this.onHarvestComplete = onHarvestComplete;
    this.registered = false;
  }

  register(systemManager) {
    if (this.registered) {
      return;
    }

    systemManager.register({
      update: (_world, frame) => this.update(this.getTimerDeltaSeconds(frame)),
    });
    this.registered = true;
  }

  update(deltaSeconds) {
    this.gardenTileEntityManager.reduceProcessRemainingSeconds(deltaSeconds);
    this.gardenTileEntityManager.completeFinishedGrowths();

    for (const harvest of this.gardenTileEntityManager.completeFinishedHarvests()) {
      const quantity = Math.max(1, Math.floor(Number(harvest.harvestQuantity) || 1));
      this.itemsFacade.addItem(harvest.herbItemTypeId, quantity);
      this.onHarvestComplete?.({
        herb: this.itemsFacade.getItemDefinition(harvest.herbItemTypeId),
        quantity,
        tileNumber: harvest.tileNumber,
      });
    }
  }

  getTimerDeltaSeconds(frame = {}) {
    return Number.isFinite(frame.timerDeltaSeconds)
      ? frame.timerDeltaSeconds
      : frame.deltaSeconds;
  }
}
