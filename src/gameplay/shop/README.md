# Shop Gameplay

The shop owns a trader `shop shelf` and a `player shop shelf`.

Slot costs, sale timing, and sale gold come from `shop-balance.json`. The shelf can hold up to five slots. Slot 1 starts unlocked for free. Later slots spend gold to unlock. Each unlocked slot can sell one selected item type over time by consuming owned inventory and adding gold. The item picker groups exact items under `seeds`, `herbs`, and `potions` tabs, and can clear a slot back to empty.

The player shelf uses the same slot costs and item groups. A listed player shelf slot reserves the chosen item quantity from inventory and stores a per-item gold value. Clearing a slot returns the reserved quantity. Market purchases from other players spend local gold and add the bought item; claimed sale proceeds add local gold.
