# Market Gameplay

The market owns an `npc market`, shared `market stock`, and a `player market`.

Stand costs and sale timing come from SpacetimeDB `game_config.shop`. Before player level 4, NPC sale gold and demand are local fake values from item `baseSellPrice`, and sale reducers are not sent to the backend. From level 4 onward, NPC sale gold and need come from the backend quote snapshot. The NPC market can hold up to five stands. Stand 1 still needs to be bought, but its cost is free once player level unlocks the first NPC stand. Later stands spend gold to unlock. The NPC market uses one shared wall-clock shop timer aligned to `:00` and `:30`; when that timer completes, every eligible selected stand sells its available item stack by consuming owned inventory and adding gold when the backend has a valid quote and nonzero need. A stand can be marked as `all`, which keeps selling newly generated matching items, or marked with a fixed remaining amount, which decrements only after successful timer sales and stops at zero. Changing any selected stand item or mark amount does not reset the timer. The item picker groups exact items under `seeds`, `herbs`, and `potions` tabs, and can clear a stand back to empty.

Fast sell is the manual NPC sale path. It uses the same marginal NPC quote and demand as shelf auto-sell, then pays only the fast-sell percentage: 80% by default, raised to 85%, 90%, and 95% by ruby research.

Shared `market stock` also comes from the backend quote snapshot. Buying spends local gold, adds local items, and calls the backend stock reducer first so all players pull from the same NPC stock. Batch buys sum marginal NPC sell prices across the backend need curve instead of multiplying the current visible price.

NPC market prices use progression-aware base values, a soft demand curve, and no hard live price floor/cap. Demand moves back toward its target lazily when a row is touched instead of through a scheduled reducer. Base prices autotune on sell/buy reducers after enough real trade volume: sell-heavy windows nudge base price down, buy-heavy windows nudge it up, then the pressure counters reset.

The player market uses the same stand costs and item groups. A listed player stand reserves the chosen item quantity from inventory and stores a per-item gold value. Clearing a stand returns the reserved quantity. Market purchases from other players spend local gold and add the bought item; claimed sale proceeds add local gold.

The crystals tab also has a manual gold offer. It grants current player level `* 20` gold when collected, then enters a two-hour cooldown. Cooldown time catches up offline, but the reward is never granted until the player collects it.
