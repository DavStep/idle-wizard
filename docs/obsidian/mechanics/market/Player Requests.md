---
title: "Player Requests"
tags:
  - mechanics
  - system/market
  - component
status: active
world: mechanics
note_type: trading-component
system: market
implementation: partial
maximum_quantity: 1000
maximum_coin_each: 1000000
backend_role: public request advertisement
source_scope: mixed-client-backend
verified_on: 2026-07-19
---

# Player Requests

Requests advertise that a player wants to buy an item. They are **not escrow or direct fulfillment**.

- Requests use local numbered slots that follow Player Market stand unlocks.
- Local save state is mirrored to public backend request rows.
- Pressing **sell** on a request can prefill a normal listing in an empty seller stand.
- It does not transfer the requested item or coin directly.
- Request rows are isolated by [[mechanics/market/Market Licences|market licence]].
- The public browse view exposes at most 80 recent rows.

## Related

- [[mechanics/market/Player Listings|Player Listings]]
- [[mechanics/market/Browse And Purchase|Browse and Purchase]]
- [[mechanics/market/Market Authority|Authority Boundary]]

