---
title: "NPC Stock"
aliases:
  - Trader Stock
tags:
  - mechanics
  - system/market
  - component
status: active
world: mechanics
note_type: trading-component
system: market
implementation: shipped
backend_role: shared buyable inventory
source_scope: backend-live
verified_on: 2026-07-19
---

# NPC Stock

NPC stock is shared inside one [[mechanics/market/Market Licences|market licence]].

- Selling to the NPC decreases need and adds the sold quantity to shared stock.
- Buying decreases shared stock and raises need.
- The neutral player buy price is 120% of the market price.
- Batch buys sum marginal prices across the need curve; they do not multiply one visible price.
- A stock buy calls the backend reducer before local coin and item changes.
- Before level 4, real shared stock is unavailable.

## Related

- [[mechanics/market/NPC Market|NPC Market]]
- [[mechanics/market/Demand And Pricing|Demand and Pricing]]
- [[mechanics/market/Market Authority|Authority Boundary]]

## Source of truth

- `src/gameplay/shop/managers/ShopStockPurchaseManager.js`
- `src/gameplay/shop/managers/ShopStockPriceQuoteManager.js`
- `src/backend/npcMarket/`

