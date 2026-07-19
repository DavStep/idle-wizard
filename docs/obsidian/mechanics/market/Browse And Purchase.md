---
title: "Browse and Purchase"
aliases:
  - Browse Market
tags:
  - mechanics
  - system/market
  - component
status: active
world: mechanics
note_type: trading-component
system: market
implementation: shipped
backend_role: public listing and request views
source_scope: mixed-client-backend
verified_on: 2026-07-19
---

# Browse and Purchase

The browse popup has two tabs:

- **selling** — public [[mechanics/market/Player Listings|listings]] grouped by seller.
- **buying** — public [[mechanics/market/Player Requests|request advertisements]].

Buying a listing:

1. Chooses a quantity.
2. Calls the backend purchase reducer.
3. On success, the client spends local coin and adds the item.

Requests are not bought or fulfilled directly. Their sell action only prefills a normal listing.

## Authority note

The backend serializes listing quantity, but it does not verify the buyer's local coin or grant the local item. See [[mechanics/market/Market Authority|Market Authority]].

