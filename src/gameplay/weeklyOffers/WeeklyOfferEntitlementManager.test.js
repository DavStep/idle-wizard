import { describe, expect, it } from 'vitest';

import {
  WEEKLY_OFFER_DURATION_MS,
  WEEKLY_OFFER_IDS,
  WeeklyOfferEntitlementManager,
} from './WeeklyOfferEntitlementManager.js';

describe('WeeklyOfferEntitlementManager', () => {
  it('grants each verified offer for exactly seven days', () => {
    let now = 10_000;
    const manager = new WeeklyOfferEntitlementManager({ now: () => now });

    const result = manager.applyVerifiedPurchase(WEEKLY_OFFER_IDS.extraPlot);

    expect(result).toEqual({
      ok: true,
      offerId: WEEKLY_OFFER_IDS.extraPlot,
      purchasedAt: now,
      expiresAt: now + WEEKLY_OFFER_DURATION_MS,
    });
    expect(manager.getSnapshot().extraPlotActive).toBe(true);

    now += WEEKLY_OFFER_DURATION_MS;
    expect(manager.getSnapshot().extraPlotActive).toBe(false);
    expect(manager.getSnapshot().offers[0]).toMatchObject({
      canPurchase: true,
      expiresAt: 0,
      remainingMs: 0,
    });
  });

  it('requires expiry before the same offer can be bought again', () => {
    let now = 20_000;
    const manager = new WeeklyOfferEntitlementManager({ now: () => now });
    manager.applyVerifiedPurchase(WEEKLY_OFFER_IDS.extraCauldron);

    expect(
      manager.applyVerifiedPurchase(WEEKLY_OFFER_IDS.extraCauldron),
    ).toMatchObject({ ok: false, reason: 'already_active' });

    now += WEEKLY_OFFER_DURATION_MS;
    expect(
      manager.applyVerifiedPurchase(WEEKLY_OFFER_IDS.extraCauldron),
    ).toMatchObject({ ok: true, purchasedAt: now });
  });

  it('restores independent plot and cauldron expiry timestamps', () => {
    const manager = new WeeklyOfferEntitlementManager({ now: () => 5_000 });
    manager.applyPersistenceSnapshot({
      extraPlotExpiresAt: 6_000,
      extraCauldronExpiresAt: 7_000,
    });

    expect(manager.getSnapshot()).toMatchObject({
      extraPlotActive: true,
      extraCauldronActive: true,
    });
    expect(manager.getPersistenceSnapshot()).toEqual({
      version: 1,
      extraPlotExpiresAt: 6_000,
      extraCauldronExpiresAt: 7_000,
    });
  });
});
