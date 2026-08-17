---
title: "Potion Discovery"
tags:
  - mechanics
  - progression/discovery
  - system/potions
status: active
world: mechanics
note_type: progression-component
system: potions
implementation: shipped
discoverable_recipes: 10
verified_on: 2026-07-19
---

# Potion Discovery

Ten recipes are hidden from players until someone brews their exact ordered ingredient sequence.

- Hidden matches preview as a wasted mix before discovery.
- A successful first discovery writes to the global SpacetimeDB discovery table.
- Discovery names the recipe globally. Other players can immediately complete
  its independent free study; it is not automatically learned for them.
- The first discoverer keeps the recipe learned across Prestige without
  researching it again.
- Discovery must succeed even if the accompanying world-chat announcement is rate-limited.
- Discoverers earn a **5% royalty** from other players' qualifying potion sales.
- The internal vault shows the recipes because it documents game logic, even when the player UI hides them.

![[mechanics/potions/Potion Catalog.base#Discoverable Recipes]]

## Related

- [[mechanics/market/Proceeds Royalties And History|Potion royalties]]
- [[mechanics/potions/Potion Recipes|Potion Recipes]]
