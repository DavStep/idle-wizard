---
title: "Player Listings"
tags:
  - mechanics
  - system/market
  - component
status: active
world: mechanics
note_type: trading-component
system: market
implementation: shipped
maximum_quantity: 1000
maximum_coin_each: 1000000
maximum_trade_total_coin: 10000000
backend_role: listing row and quantity concurrency
source_scope: mixed-client-backend
verified_on: 2026-07-19
---

# Player Listings

A listing reserves local inventory and publishes quantity plus coin per item to the backend.

| Limit | Value |
| --- | ---: |
| Quantity | 1,000 |
| Coin per item | 1,000,000 |
| Trade total | 10,000,000 |

- The listing popup stages selection locally; **place** publishes it.
- Publication happens before local inventory reservation.
- Clearing a listing returns its remaining reserved quantity.
- Prices use global sanity limits, not a multiplier of item base price.
- Listings are isolated by [[mechanics/market/Market Licences|market licence]].
- The public browse view exposes at most 80 recent rows.

## Related

- [[mechanics/market/Sellable Quantity|Sellable Quantity]]
- [[mechanics/market/Browse And Purchase|Browse and Purchase]]
- [[mechanics/market/Market Authority|Authority Boundary]]

## Source of truth

- `src/gameplay/shop/managers/ShopPlayerShelfListingManager.js`
- `src/backend/playerShop/`
- `src/shared/playerMarketLimits.js`

