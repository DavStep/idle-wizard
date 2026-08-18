# Retained Pixi Shop

`ShopPixiPage` is the canvas-only production view for the current Shop surface.
It constructs the three page panels once, reconciles repeated rows through
keyed widget pools, and registers every Shop dialog as a lazy-once
`DialogRegistry` factory.

The view is renderer-only. It does not calculate prices, affordability,
inventory changes, offers, or backend results. A presenter binds this shape:

```js
{
  shop: {
    selectedTabId: 'traders' | 'players' | 'crystals',
    market: { name, rank },
    traders: {
      stalls: [{
        id, slotNumber, itemLabel, quantityLabel, batchLabel,
        priceLabel, resourceKey, progress, locked, notification,
        dialog
      }],
      timerLabel,
      ledger
    },
    players: {
      requests: {
        slots: [{ id, slotNumber, itemLabel, value, enabled, dialog }],
        countLabel, canClear
      },
      market: {
        slots: [{ id, slotNumber, itemLabel, value, enabled, dialog }],
        countLabel, proceedsLabel, proceedsValueLabel, canClaimProceeds,
        browseNotification
      }
    },
    crystals: {
      coinOffer: {
        rewardLabel, actionLabel, timerLabel, canCollect, notification
      },
      dailyCrystalOffer: {
        rewardLabel, actionLabel, timerLabel, canCollect, notification
      },
      offers: [{
        id, crystalCount, bundleLabel, priceLabel, enabled, dialog
      }]
    },
    dialogs: {
      stall, ledger, request, listing, market, tradeHistory, support
    }
  },
  actions: {
    selectTab,
    clearPlayerRequest,
    claimPlayerMarketProceeds,
    collectCoinOffer,
    collectDailyCrystalOffer,
    onActivate,
    onDeactivate
  },
  subscribe(callback)
}
```

Dialog payloads are display-ready. Common fields are `title`, `summaryRows`,
`rows`, `actions`, `tabs`, and optional `fields`/`amount`/`range` models.
Rows in long market/history dialogs are viewport-windowed and keyed by `id`.
Actions are invoked directly and are expected to call the authoritative
gameplay/backend facade. Whole-dialog footer tabs render only when at least two
choices are available; one-category dialogs use the complete paper/content
height instead. Load Stall uses a dedicated `464px` authored shell at
`390x844`; its item-list viewport absorbs additional portrait height and keeps
the allocation controls and footer tabs fixed outside the managed scroll.

The compatibility adapter also accepts the current raw `shelf`,
`playerShelf`, `coinOffer`, `dailyCrystalOffer`, and `crystalOffers` snapshot names during cutover.
It only renames display fields; it does not derive game rules.

`MarketTitleRibbon` owns the Market licence identity above the page panels. It
renders the approved purple folded-ribbon horizontal nine-slice at a fixed
height. The licence name and three rank-star slots are centered as one group
on the ribbon front, with a small upward optical correction because the folds
and tails extend below the raised front panel.

Loaded stall rows reuse the Research art-well frame, but contain item artwork
inside that well. The loaded quantity sits over the artwork as white,
dark-stroked text without a badge background. The sale batch size uses the
shortened `30x27px` red downward badge at the card's top-right, inset `14px`
from the right edge, with centered white, dark-stroked `xN` text.
Each successful automatic sale sweeps the Research upgrade shine once across
the selling stall while the existing bounded coin trail travels to the top
currency display. Reduced motion skips the shine without delaying the sale.

Open `/src/dev/uiRecipes/market-title-ribbon.html` for the deterministic
component-level ribbon state. Open
`/src/dev/uiRecipes/market-stalls-retained.html` for the production retained
stall renderer with loaded Sage and Briar Seed rows, without gameplay,
account, or tutorial gates. Add `?dialog=stall` to open the loader with enabled
mark and clear actions. Add `?dialog=ledger` to open the Bag-sized Market
Ledger with overflow rows, item icons, unlocked category tabs, and locked Grand
Exchange potion rows that exercise the shared market-rank star widget.
Add `&categories=seed` to retain only the always-available Seeds category for
single-category dialog and reclaimed-footer QA.
Add `?stalls=empty-notified` to render one actionable empty stall with the
rolled-up orange NPC-listing notification on both the Traders tab and the
stall's Select action.
Add `?saleShine=loop` to replay the successful-sale shine on Stall 1 for
motion and native-pixel capture QA.
Add `?tab=crystals` to open the Crystal Market tab with its deterministic
cooling-down coin offer, ready daily free crystal offer, and six crystal
bundles. Add `&coinOffer=ready` to show the ready green Collect action and
`&dailyCrystalOffer=cooldown` to show the daily offer's disabled countdown.
Add `&claimFlyout=crystal` to include the production top panel and replay the
daily Free claim's crystal travel into its HUD counter.
Currency offers use the reusable `MarketOfferRow`: the stall card frame and
art well hold a coin or crystal icon with the amount over the art, the offer
name sits at the top-left, and a fixed right-side green button carries the
price or ready `Collect` action. Cooling-down coin offers keep the same
geometry and swap the action to the shared disabled gray state.
Add `?tab=players` to open the Player Market tab with its station-title
sections, the same retained stand widget used by Traders for each request and
listing slot, a dedicated compact claim-proceeds row, and bottom-border actions
on the final card. Add `&proceeds=none` to isolate the empty-request state
without the claim-proceeds row, and add `&requests=empty` to render one empty
request slot.
Add `?dialog=request` to open the retained Request picker directly with
`Coins Per Item` and `Max Quantity` fields. Add `&requestStatus=offline` to
verify visible submission-failure feedback. Add `?dialog=listing` to open the
retained Sell picker directly with its quantity slider and `Coins Per Item`
field. Sell uses the Market-yellow rail, a narrow always-active red `Clear` on
the left, and a double-width green `Sell` on the right. Empty Clear attempts
emit `Nothing to clear`; successful Sell actions close only after backend
publication and local inventory reservation both succeed. Both use the same
split-paper item-picker composition as Load Stall.
Add `&listingState=reference` to reproduce the Mint Seed `x12` / `10` coin
state used for Sell-dialog reference comparison.
Add `&items=overflow` with `?dialog=stall` to open the Load Stall
inventory with eight unlocked seed rows for row-width, spacing, and
scrollbar-gutter QA. Add `&count=3` to bind the allocation slider to the
four exact states `0`, `1`, `2`, and `3`.

## Snapshot adapter

`createShop(options)` is the integration boundary for the current facades:

```js
createShop({
  gameplaySnapshot,       // GameplayFacade.getSnapshot()
  playerShopSnapshot,     // PlayerShopBackendFacade.getSnapshot()
  notificationSnapshot,  // PageNotificationStateManager snapshot
  selectedTabId,
  uiState: {
    selectedRequestSlotNumber,
    stallItemTypeIdBySlot,
    stallTargetQuantityBySlot,
    requestDraftBySlot,
    listingDraftBySlot,
    ledgerKind,
    marketBrowseTab
  },
  gameplayActions,        // existing GameplayFacade
  playerShopActions,      // existing PlayerShopBackendFacade
  actions: { ui: uiDraftAndNavigationActions },
  dialogs,                // optional display-ready overrides
  subscribe               // emits a gameplay snapshot or the three snapshots above
})
```

It returns the exact page contract shown above. Backend-first request,
listing, clear, and proceeds callbacks forward to the current backend and
gameplay APIs; success/failure remains authoritative in those APIs. Optional
UI draft callbacks only retain canvas-local selection/input state and must
recreate/rebind this view model after changing it.
