---
title: "Crystal Shop"
aliases:
  - Crystals Tab
tags:
  - mechanics
  - system/market
  - component
status: active
world: mechanics
note_type: trading-component
system: market
implementation: partial
coin_per_player_level: 20
coin_offer_cooldown_seconds: 7200
backend_role: none
source_scope: client
verified_on: 2026-07-19
---

# Crystal Shop

The third Market tab contains a manual coin offer and static crystal bundle prices.

## Coin offer

- Reward: **current player level × 20 coin**.
- Cooldown: **2 hours**.
- Offline time advances the cooldown.
- Coin is never granted until the player manually collects it.

## Crystal bundles

| Crystals | Displayed price |
| ---: | ---: |
| 1 | $4.99 |
| 2 | $8.99 |
| 5 | $19.99 |
| 10 | $36.99 |
| 20 | $69.99 |
| 50 | $159.99 |

Payments and crystal grants are **not implemented**. Pressing a price opens the support-unavailable message.

## Source of truth

- `src/gameplay/shop/managers/ShopCoinOfferManager.js`
- `src/pages/shop/managers/ShopCrystalOfferManager.js`

