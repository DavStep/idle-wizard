export class BrewingCollectManager {
  constructor({ brewingProcessEntityManager, itemsFacade }) {
    this.brewingProcessEntityManager = brewingProcessEntityManager;
    this.itemsFacade = itemsFacade;
  }

  collect() {
    const activeBrew = this.brewingProcessEntityManager.getActiveBrewSnapshot();

    if (!activeBrew) {
      return {
        ok: false,
        reason: 'no_brew',
      };
    }

    if (!activeBrew.canCollect) {
      return {
        ok: false,
        reason: 'bottling_not_done',
      };
    }

    const collected = this.brewingProcessEntityManager.collectReadyBrew();

    if (!collected) {
      return {
        ok: false,
        reason: 'bottling_not_done',
      };
    }

    this.itemsFacade.addItem(collected.resultItemTypeId, collected.resultQuantity);

    const potion = this.itemsFacade.getItemDefinition(collected.resultItemTypeId);

    return {
      ok: true,
      potion: {
        itemTypeId: potion.id,
        key: potion.key,
        label: potion.label,
        kind: potion.kind,
      },
      quantity: collected.resultQuantity,
    };
  }
}
