# Market Gameplay

The market owns an `npc market` and a `player market`.

Stand costs and sale timing come from SpacetimeDB `game_config.shop`; NPC sale gold and need come from the backend quote snapshot. The NPC market can hold up to five stands. Stand 1 starts unlocked for free. Later stands spend gold to unlock. Each unlocked stand can sell one selected item type over time by consuming owned inventory and adding gold when the backend has a valid quote and nonzero need. The item picker groups exact items under `seeds`, `herbs`, and `potions` tabs, and can clear a stand back to empty.

The player market uses the same stand costs and item groups. A listed player stand reserves the chosen item quantity from inventory and stores a per-item gold value. Clearing a stand returns the reserved quantity. Market purchases from other players spend local gold and add the bought item; claimed sale proceeds add local gold.
