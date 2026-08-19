import { itemKinds } from '../../items/itemKinds.js';

export class GardenSeedSelectionManager {
  constructor({ itemsFacade }) {
    this.itemsFacade = itemsFacade;
    this.selectedSeedItemTypeId = 0;
  }

  select(seedItemTypeId) {
    const seed = this.getSeedById(seedItemTypeId);

    if (!seed) {
      return {
        ok: false,
        reason: 'invalid_seed',
      };
    }

    this.selectedSeedItemTypeId = seed.id;
    return {
      ok: true,
      selectedSeedItemTypeId: seed.id,
      selectedSeedItemKey: seed.key,
    };
  }

  getSnapshot() {
    const seed = this.getSeedById(this.selectedSeedItemTypeId);
    return {
      selectedSeedItemTypeId: seed?.id ?? null,
      selectedSeedItemKey: seed?.key ?? null,
    };
  }

  getPersistenceSnapshot() {
    return {
      selectedSeedItemKey: this.getSnapshot().selectedSeedItemKey,
    };
  }

  applyPersistenceSnapshot(snapshot = {}) {
    const seed =
      typeof snapshot?.selectedSeedItemKey === 'string'
        ? this.itemsFacade.safeGetDefinitionByKey(snapshot.selectedSeedItemKey)
        : null;
    this.selectedSeedItemTypeId = seed?.kind === itemKinds.seed ? seed.id : 0;
  }

  getSeedById(seedItemTypeId) {
    if (!Number.isInteger(seedItemTypeId) || seedItemTypeId <= 0) {
      return null;
    }

    return (
      this.itemsFacade
        .getSeedDefinitions()
        .find((seed) => seed.id === seedItemTypeId) ?? null
    );
  }
}
