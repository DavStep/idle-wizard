# Market Gameplay

The market owns a `trader market`, shared `trader stock`, and a `player market`.

Sale timing comes from SpacetimeDB `game_config.shop` and defaults to five seconds. Every trader stand owns an independent progress clock and sells one loaded item per completed cycle. `advanced:stallStaffing:N` research raises stand N to two items per cycle without changing its clock. Before player level 4, trader price and demand are local fake values; from level 4 onward they come from the backend quote snapshot.

Loading a stand physically transfers items out of inventory. A stand holds one item type at a time; unloading returns items, and reaching zero clears the assignment and progress. UI hold pulses mutate local ECS state and publish immediately, then persist once on release. The transfer step is `ceil(loaded * 5%)`, clamped to 1–500 items. Legacy `all` and fixed-amount saves migrate once into loaded stock, and legacy `fastSellPayout:1..3` research migrates to the first three stall-staffing studies.

The old manual Sell to Trader / fast-sell path is removed. Timed stands always use the full NPC marginal quote. Sales sharing an item are aggregated per update before backend reporting, reducer calls are split at 10,000 units, and local demand is reserved across stands before submission.

The Market Ledger combines trader sell offers, buy prices, stock, buyer need, and recent hourly price history. Buying from it spends local coin, adds local items, and calls the backend stock reducer first so all players pull from the same trader stock. Batch buys sum marginal trader sell prices across the backend need curve instead of multiplying the current visible price.

Trader market prices use progression-aware base values, a soft demand curve, and a capped live demand value. Demand resets at the anchored weekly boundary, then buyer waves add demand lazily when a row is touched. The UTC wave cadence is a large wave at day start, then smaller waves every six hours; unused demand caps at 1.5x target. Base prices autotune on sell/buy reducers after enough real trade volume: sell-heavy windows nudge base price down, buy-heavy windows nudge it up, then the pressure counters reset.

Coin is whole-number currency. Positive prices and payouts round up to the next whole coin, so the minimum positive price is `1` coin. Player listing and request fields accept integers only.

The player market uses the same market-rank slot count and item-grade catalogue as NPC trading, so player listings cannot bypass a small market's restrictions. A listed player stand reserves the chosen item quantity from inventory and stores a per-item coin value. Player listings and requests cap at `1000` units and `1000000` coin per unit, matching the backend reducers. Clearing a stand returns the reserved quantity. Market purchases from other players spend local coin and add the bought item; claimed sale proceeds add local coin.

The crystals tab also has a manual coin offer. It grants current player level `* 20` coin when collected, then enters a two-hour cooldown. Cooldown time catches up offline, but the reward is never granted until the player collects it.

Security boundary: shared NPC demand, stock, market scope, item keys, and per-call quantity limits are server-validated. Player inventory and coin remain client-owned in the current architecture, so this is shared-market coordination rather than server-authoritative economy settlement.
