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
gameplay/backend facade.

The compatibility adapter also accepts the current raw `shelf`,
`playerShelf`, `coinOffer`, and `crystalOffers` snapshot names during cutover.
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

Open `/src/dev/uiRecipes/market-title-ribbon.html` for the deterministic
component-level ribbon state. Open
`/src/dev/uiRecipes/market-stalls-retained.html` for the production retained
stall renderer with loaded Sage and Briar Seed rows, without gameplay,
account, or tutorial gates. Add `?dialog=stall` to open the loader with enabled
mark and clear actions. Add `?dialog=ledger` to open the Bag-sized Market
Ledger with overflow rows, item icons, and unlocked category tabs.
Add `?tab=crystals` to open the Crystal Market tab with its deterministic
cooling-down coin offer and six crystal bundles. Add
`&coinOffer=ready` to show the ready green Collect action.
Currency offers use the reusable `MarketOfferRow`: the stall card frame and
art well hold a coin or crystal icon with the amount over the art, the offer
name sits at the top-left, and a fixed right-side green button carries the
price or ready `Collect` action. Cooling-down coin offers keep the same
geometry and swap the action to the shared disabled gray state.
Add `?tab=players` to open the Player Market tab with its station-title
sections, the same retained stand widget used by Traders for each request and
listing slot, a dedicated compact claim-proceeds row, and bottom-border actions
on the final card.
Add `?dialog=request` to open the retained Request picker directly with
`Coins Per Item` and `Max Quantity` fields. Add `?dialog=listing` to open the
retained Sell picker directly with its quantity slider and `Coins Per Item`
field. Both use the same split-paper item-picker composition as Load Stall.
Add `&items=overflow` with `?dialog=stall` to open the Load Stall
inventory with eight unlocked seed rows for row-width, spacing, and
scrollbar-gutter QA.

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
    stallAllocationPercentBySlot,
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
