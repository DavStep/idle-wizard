import {
  WEEKLY_OFFER_IDS,
  WeeklyOfferEntitlementManager,
} from './WeeklyOfferEntitlementManager.js';

export class WeeklyOffersFacade {
  static explain =
    'Tracks temporary one-week gameplay slots after a store purchase has been verified.';

  constructor({ brewingFacade, gardenFacade, now } = {}) {
    this.brewingFacade = brewingFacade;
    this.gardenFacade = gardenFacade;
    this.entitlementManager = new WeeklyOfferEntitlementManager({ now });
  }

  getSnapshot() {
    const snapshot = this.entitlementManager.getSnapshot();
    this.syncFeatureAvailability(snapshot);
    return snapshot;
  }

  applyVerifiedPurchase(offerId, purchase = {}) {
    const result = this.entitlementManager.applyVerifiedPurchase(
      offerId,
      purchase,
    );
    if (result.ok) {
      this.syncFeatureAvailability(this.entitlementManager.getSnapshot());
    }
    return result;
  }

  getPersistenceSnapshot() {
    return {
      ...this.entitlementManager.getPersistenceSnapshot(),
      extraPlot: this.gardenFacade?.getExtraPlotPersistenceSnapshot?.() ?? null,
      extraCauldron:
        this.brewingFacade?.getExtraCauldronPersistenceSnapshot?.() ?? null,
    };
  }

  applyPersistenceSnapshot(snapshot = {}) {
    this.entitlementManager.applyPersistenceSnapshot(snapshot);
    this.gardenFacade?.applyExtraPlotPersistenceSnapshot?.(
      snapshot?.extraPlot,
    );
    this.brewingFacade?.applyExtraCauldronPersistenceSnapshot?.(
      snapshot?.extraCauldron,
    );
    this.syncFeatureAvailability(this.entitlementManager.getSnapshot());
  }

  hasFrameTimerWork() {
    return this.entitlementManager.hasActiveEntitlement();
  }

  syncFeatureAvailability(snapshot) {
    this.gardenFacade?.setExtraPlotActive?.(
      snapshot?.extraPlotActive === true,
    );
    this.brewingFacade?.setExtraCauldronActive?.(
      snapshot?.extraCauldronActive === true,
    );
  }
}

export { WEEKLY_OFFER_IDS };
