# Market Gameplay

The market owns an `npc market`, shared `market stock`, and a `player market`.

Stand costs and sale timing come from SpacetimeDB `game_config.shop`; NPC sale gold and need come from the backend quote snapshot. The NPC market can hold up to five stands. Stand 1 still needs to be bought, but its cost is free once player level unlocks the first NPC stand. Later stands spend gold to unlock. The NPC market uses one shared shop timer; when that timer completes, every eligible selected stand sells its available item stack by consuming owned inventory and adding gold when the backend has a valid quote and nonzero need. Changing any selected stand item resets the shared timer. The item picker groups exact items under `seeds`, `herbs`, and `potions` tabs, and can clear a stand back to empty.

Fast sell is the manual NPC sale path. It uses the same marginal NPC quote and demand as shelf auto-sell, then pays only the fast-sell percentage: 80% by default, raised to 85%, 90%, and 95% by ruby research.

Shared `market stock` also comes from the backend quote snapshot. Buying spends local gold, adds local items, and calls the backend stock reducer first so all players pull from the same NPC stock. Batch buys sum marginal NPC sell prices across the backend need curve instead of multiplying the current visible price.

The player market uses the same stand costs and item groups. A listed player stand reserves the chosen item quantity from inventory and stores a per-item gold value. Clearing a stand returns the reserved quantity. Market purchases from other players spend local gold and add the bought item; claimed sale proceeds add local gold.

The crystals tab also has a manual gold offer. It grants current player level `* 20` gold when collected, then enters a two-hour cooldown. Cooldown time catches up offline, but the reward is never granted until the player collects it.
