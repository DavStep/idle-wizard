export const WEEKLY_OFFER_DURATION_MS = 7 * 24 * 60 * 60 * 1_000;

export const WEEKLY_OFFER_IDS = Object.freeze({
  extraPlot: 'extraPlot',
  extraCauldron: 'extraCauldron',
});

const OFFER_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: WEEKLY_OFFER_IDS.extraPlot,
    title: 'Extra Plot',
    description: 'Unlocks 1 extra automated plot for 7 days.',
    slotLabel: 'E1',
    priceUsd: 15,
  }),
  Object.freeze({
    id: WEEKLY_OFFER_IDS.extraCauldron,
    title: 'Extra Cauldron',
    description: 'Unlocks 1 extra automated cauldron for 7 days.',
    slotLabel: 'E1',
    priceUsd: 15,
  }),
]);

export class WeeklyOfferEntitlementManager {
  constructor({ now = () => Date.now() } = {}) {
    this.now = now;
    this.expiresAtByOfferId = new Map();
  }

  applyVerifiedPurchase(offerId, { purchasedAt = this.now() } = {}) {
    const definition = this.getDefinition(offerId);
    if (!definition) {
      return { ok: false, reason: 'unknown_offer', offerId };
    }

    const safePurchasedAt = normalizeTimestamp(purchasedAt);
    if (safePurchasedAt === null) {
      return { ok: false, reason: 'invalid_purchase_time', offerId };
    }

    if (this.isActive(offerId, safePurchasedAt)) {
      return {
        ok: false,
        reason: 'already_active',
        offerId,
        expiresAt: this.getExpiresAt(offerId),
      };
    }

    const expiresAt = safePurchasedAt + WEEKLY_OFFER_DURATION_MS;
    this.expiresAtByOfferId.set(offerId, expiresAt);
    return { ok: true, offerId, purchasedAt: safePurchasedAt, expiresAt };
  }

  getSnapshot() {
    const now = this.now();
    const offers = OFFER_DEFINITIONS.map((definition) => {
      const expiresAt = this.getExpiresAt(definition.id);
      const remainingMs = Math.max(0, expiresAt - now);
      const active = remainingMs > 0;
      return {
        ...definition,
        active,
        canPurchase: !active,
        durationMs: WEEKLY_OFFER_DURATION_MS,
        expiresAt: active ? expiresAt : 0,
        remainingMs,
        remainingLabel: active ? formatRemainingDuration(remainingMs) : '',
      };
    });

    return {
      offers,
      extraPlotActive: this.isActive(WEEKLY_OFFER_IDS.extraPlot, now),
      extraCauldronActive: this.isActive(WEEKLY_OFFER_IDS.extraCauldron, now),
    };
  }

  getPersistenceSnapshot() {
    return {
      version: 1,
      extraPlotExpiresAt: this.getExpiresAt(WEEKLY_OFFER_IDS.extraPlot),
      extraCauldronExpiresAt: this.getExpiresAt(WEEKLY_OFFER_IDS.extraCauldron),
    };
  }

  applyPersistenceSnapshot(snapshot = {}) {
    this.expiresAtByOfferId.clear();
    this.restoreExpiry(
      WEEKLY_OFFER_IDS.extraPlot,
      snapshot?.extraPlotExpiresAt,
    );
    this.restoreExpiry(
      WEEKLY_OFFER_IDS.extraCauldron,
      snapshot?.extraCauldronExpiresAt,
    );
  }

  hasActiveEntitlement() {
    return this.getSnapshot().offers.some((offer) => offer.active);
  }

  isActive(offerId, now = this.now()) {
    return this.getExpiresAt(offerId) > now;
  }

  getExpiresAt(offerId) {
    return this.expiresAtByOfferId.get(offerId) ?? 0;
  }

  getDefinition(offerId) {
    return OFFER_DEFINITIONS.find((definition) => definition.id === offerId) ?? null;
  }

  restoreExpiry(offerId, value) {
    const expiresAt = normalizeTimestamp(value);
    if (expiresAt !== null && expiresAt > 0) {
      this.expiresAtByOfferId.set(offerId, expiresAt);
    }
  }
}

function normalizeTimestamp(value) {
  const timestamp = Math.floor(Number(value));
  return Number.isSafeInteger(timestamp) && timestamp >= 0 ? timestamp : null;
}

function formatRemainingDuration(remainingMs) {
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
