# Weekly Offers

Weekly Offers owns the temporary seven-day access window for the `E1` Garden
plot and `E1` Brewing cauldron. Both offers display a fixed `$15.00` price.

The facade does not perform checkout. A future store adapter must verify the
purchase first, then call `GameplayFacade.applyVerifiedWeeklyOfferPurchase`.
An active offer cannot be bought again; once its exact seven-day window ends,
the extra slot becomes unavailable until another verified purchase.

The extra slot state is saved separately from permanent plot/cauldron capacity,
so it never advances normal numbering or grants permanent capacity research.
Expired slots are paused and hidden rather than deleted, avoiding player-state
loss if the same offer is bought again later.
