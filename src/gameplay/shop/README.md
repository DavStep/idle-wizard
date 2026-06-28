# Market Gameplay

The market owns a `trader market`, shared `trader stock`, and a `player market`.

Stand costs and sale timing come from SpacetimeDB `game_config.shop`. Before player level 4, trader sale coin and demand are local fake values from item `baseSellPrice`, and sale reducers are not sent to the backend. From level 4 onward, trader sale coin and need come from the backend quote snapshot. The trader market can hold up to five stands. Stand 1 still needs to be bought, but its cost is free once player level unlocks the first trader stand. Later stands spend coin to unlock. The trader market uses one shared wall-clock shop timer aligned to `:00` and `:30`; when that timer completes, every eligible selected stand sells its available item stack by consuming owned inventory and adding coin when the backend has a valid quote and nonzero need. A stand can be marked as `all`, which keeps selling newly generated matching items, or marked with a fixed remaining amount, which decrements only after successful timer sales and stops at zero. Changing any selected stand item or mark amount does not reset the timer. The item picker groups exact items under `seeds`, `herbs`, and `potions` tabs, and can clear a stand back to empty.

Fast sell is the manual trader sale path. It uses the same marginal trader quote and demand as shelf auto-sell, then pays only the fast-sell percentage: 80% by default, raised to 85%, 90%, and 95% by ruby research.

Shared `trader stock` also comes from the backend quote snapshot. Buying spends local coin, adds local items, and calls the backend stock reducer first so all players pull from the same trader stock. Batch buys sum marginal trader sell prices across the backend need curve instead of multiplying the current visible price.

Trader market prices use progression-aware base values, a soft demand curve, and a capped live demand value. Demand resets at the anchored weekly boundary, then buyer waves add demand lazily when a row is touched. The UTC wave cadence is a large wave at day start, then smaller waves every six hours; unused demand caps at 1.5x target. Base prices autotune on sell/buy reducers after enough real trade volume: sell-heavy windows nudge base price down, buy-heavy windows nudge it up, then the pressure counters reset.

The player market uses the same stand costs and item groups. A listed player stand reserves the chosen item quantity from inventory and stores a per-item coin value. Player listings and requests cap at `1000` units and `1000000` coin per unit, matching the backend reducers. Clearing a stand returns the reserved quantity. Market purchases from other players spend local coin and add the bought item; claimed sale proceeds add local coin.

The crystals tab also has a manual coin offer. It grants current player level `* 20` coin when collected, then enters a two-hour cooldown. Cooldown time catches up offline, but the reward is never granted until the player collects it.
