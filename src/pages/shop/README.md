# Market Page

The Market is the room page immediately right of Research. Its internal page id is still `shop` for save and navigation compatibility.

It has `traders`, `players`, and `crystals` tabs. The `crystals` tab is third and shows a manual coin offer plus real-money crystal bundle prices with bundle and price columns only. Pressing a price shows the support-unavailable popup. Payment and crystal grant behavior should stay out of this page until that flow is explicitly requested.

The `traders` tab contains `your stalls` and the Market Ledger. Tap a stall to open the seed/herb/potion loader. Tapping an inventory row selects the current item without moving stock. A five-step `0%` / `25%` / `50%` / `75%` / `100%` rail chooses how much matching stock belongs on the stand, counting matching stock already loaded plus matching stock still in inventory; `mark xN` reconciles that allocation once, and `0%` returns it. `mark future` separately keeps the selected item assigned and routes every newly produced copy into the stand until stopped, including copies that finish after the dialog closes. It does not consume already-owned stock when enabled. A stand accepts only one loaded or future-marked item type at a time. Each stall reserves the same two-line row height. Loaded rows keep the item, batch size, and current sale value on the first line, with the sale progress rail and remaining timer together on the second line; empty future-marked rows show what they are waiting for.

The ledger groups seeds, herbs, and potions while showing trader prices, stock, buyer need, and recent price history; it also owns trader purchases. Recent-history blocks keep visible separation, and an unchanged price reads `0 / Nh` without a direction or sign. The `players` tab contains local player requests and player-to-player listings. `browse market` uses `selling` and `buying` popup tabs; `selling` shows backend public listings, while `buying` shows backend public request rows. Buying rows can prefill a matching player listing from an empty stand when the local player owns the requested item. Direct request fulfillment is not implemented until escrow/delivery behavior is explicit.

Keep `[i]` help limited to timed stalls and the ledger. Explanations stay to one short sentence or two compact clauses.

For deterministic stall-layout QA without a backend account, open `/src/dev/uiRecipes/market-stalls.html` on the shared Vite server.
