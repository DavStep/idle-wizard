---
title: "Sellable Quantity"
tags:
  - mechanics
  - system/market
  - system/garden
  - system/potions
status: active
world: mechanics
note_type: trading-component
system: market
implementation: shipped
backend_role: none
source_scope: client
verified_on: 2026-07-19
---

# Sellable Quantity

Markets sell **available inventory**, not the raw stack count.

Subtract from owned quantity:

- Herbs staged in Brewing cauldrons.
- The selected seed quantity committed by empty Garden plots.
- Quantities already reserved in player listings.

Do **not** subtract unfinished task requirements.

This rule is shared by [[mechanics/market/NPC Market|NPC sales]] and [[mechanics/market/Player Market|Player Market]] listings.

## Related

- [[mechanics/garden/Garden And Herbs|Garden and Herbs]]
- [[mechanics/potions/Potion Recipes|Potion Recipes]]
- [[mechanics/market/Player Listings|Player Listings]]

## Source of truth

- `src/gameplay/shop/managers/ShopSellAvailabilityManager.js`
- `src/gameplay/GameplayFacade.js`

