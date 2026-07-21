# Market Page

The Market is the room page immediately right of Research. Its internal page id is still `shop` for save and navigation compatibility.

It has `traders`, `players`, and `crystals` tabs. The `crystals` tab is third and shows a manual coin offer plus real-money crystal bundle prices with bundle and price columns only. Pressing a price shows the support-unavailable popup. Payment and crystal grant behavior should stay out of this page until that flow is explicitly requested.

The `traders` tab contains `your stalls` and the Market Ledger. Tap a stall to open the seed/herb/potion loader. Pressing or holding an inventory row changes a local draft without publishing gameplay snapshots; pressing or holding the `current` row removes from that draft. A quick tap changes one item. Hold repeats start from an inventory-aware amount and accelerate with hold duration, using the quantity captured at pointerdown so the curve stays stable. `mark xN` and `mark all` transfer the draft in one gameplay update. Holding the loaded item on the stand returns stock. A stand accepts only one item type until emptied. Each loaded row shows a shared-style sale progress rail beneath the item name, with its batch size, remaining timer, and current sale value in the right status slot.

The ledger groups seeds, herbs, and potions while showing trader prices, stock, buyer need, and recent price history; it also owns trader purchases. Recent-history blocks keep visible separation, and an unchanged price reads `0 / Nh` without a direction or sign. The `players` tab contains local player requests and player-to-player listings. `browse market` uses `selling` and `buying` popup tabs; `selling` shows backend public listings, while `buying` shows backend public request rows. Buying rows can prefill a matching player listing from an empty stand when the local player owns the requested item. Direct request fulfillment is not implemented until escrow/delivery behavior is explicit.

Keep `[i]` help limited to timed stalls and the ledger. Explanations stay to one short sentence or two compact clauses.
