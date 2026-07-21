# Market Page

The Market is the room page immediately right of Research. Its internal page id is still `shop` for save and navigation compatibility.

It has `traders`, `players`, and `crystals` tabs. The `crystals` tab is third and shows a manual coin offer plus real-money crystal bundle prices with bundle and price columns only. Pressing a price shows the support-unavailable popup. Payment and crystal grant behavior should stay out of this page until that flow is explicitly requested.

The `traders` tab contains `your stalls` and the Market Ledger. Tap a stall to open the seed/herb/potion loader. Pressing an item loads one immediately; holding repeats with a quantity-sensitive step. Holding the loaded item on the stand returns stock. A stand accepts only one item type until emptied. Each row shows its own batch size, remaining cycle time, and current sale value.

The ledger groups seeds, herbs, and potions while showing trader prices, stock, buyer need, and recent price history; it also owns trader purchases. The `players` tab contains local player requests and player-to-player listings. `browse market` uses `selling` and `buying` popup tabs; `selling` shows backend public listings, while `buying` shows backend public request rows. Buying rows can prefill a matching player listing from an empty stand when the local player owns the requested item. Direct request fulfillment is not implemented until escrow/delivery behavior is explicit.

Keep `[i]` help limited to timed stalls and the ledger. Explanations stay to one short sentence or two compact clauses.
