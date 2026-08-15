# Market Gameplay

The market owns a `trader market`, shared `trader stock`, and a `player market`.

Sale timing comes from SpacetimeDB `game_config.shop` and defaults to five seconds. Every trader stand owns an independent progress clock and sells one loaded item per completed cycle. `advanced:stallStaffing:N` research raises stand N to two items per cycle without changing its clock. Before player level 4, trader price and demand are local fake values; from level 4 onward they come from the backend quote snapshot.

Loading a stand physically transfers items out of inventory. A stand holds one item type at a time; unloading returns items, and reaching zero clears the assignment and progress. UI hold pulses mutate local ECS state and publish immediately, then persist once on release. The transfer step is `ceil(loaded * 2)`, clamped to 1–500 items, so large stacks load or return in about one second without increasing the UI update cadence. Legacy `all` and fixed-amount saves migrate once into loaded stock, and legacy `fastSellPayout:1..3` research migrates to the first three stall-staffing studies.

The old manual Sell to Trader / fast-sell path is removed. Timed stands always use the full NPC marginal quote. Sales sharing an item are aggregated per update before backend reporting, reducer calls are split at 10,000 units, and local demand is reserved across stands before submission.

The Market Ledger combines trader sell offers, buy prices, stock, buyer need, and recent hourly price history. Buying from it spends local coin, adds local items, and calls the backend stock reducer first so all players pull from the same trader stock. Batch buys sum marginal trader sell prices across the backend need curve instead of multiplying the current visible price.

Small Town uses fixed configured prices: demand still limits how many items traders can sell and shared stock still supports NPC purchases, but neither demand pressure nor trade volume changes its quotes. Crossroads and every higher Prestige market use progression-aware base values, a soft demand curve, and a capped live demand value. In those dynamic markets, demand resets at the anchored weekly boundary, buyer waves add demand lazily when a row is touched, and base prices autotune after enough real trade volume. The UTC wave cadence is a large wave at day start, then smaller waves every six hours; unused demand caps at 1.5x target.

Loaded trader stalls pause their sale progress when buyer demand reaches zero, keep the live market price subscription active, and resume from the same progress when the next buyer wave restores demand.

Coin is whole-number currency. Positive prices and payouts round up to the next whole coin, so the minimum positive price is `1` coin. Player listing and request fields accept integers only.

The player market uses the same market-rank slot count and item-grade catalogue as NPC trading, so player listings cannot bypass a small market's restrictions. A listed player stand reserves the chosen item quantity from inventory and stores a per-item coin value. Player listings and requests cap at `1000` units and `1000000` coin per unit, matching the backend reducers. Clearing a stand returns the reserved quantity. Market purchases from other players spend local coin and add the bought item; claimed sale proceeds add local coin.

Player requests store the maximum quantity the player wants to buy and the coin offered per item. Player sale listings choose their reserved quantity with the shared integer slider and store a separate coin price per item.

The crystals tab also has a manual coin offer. It grants current player level `* 20` coin when collected, then enters a two-hour cooldown. Cooldown time catches up offline, but the reward is never granted until the player collects it.

Security boundary: shared NPC demand, stock, market scope, item keys, and per-call quantity limits are server-validated. Player inventory and coin remain client-owned in the current architecture, so this is shared-market coordination rather than server-authoritative economy settlement.
