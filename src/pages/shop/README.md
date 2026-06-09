# Shop Page

The Shop is the room page immediately right of Research.

It shows a `shop shelf` block for trader auto-sales and a `player shop shelf` block for player-to-player listings.

The trader shelf displays up to five slots. Slot 1 starts unlocked, the next locked slot shows a buy action, and later slots show `locked` until they become next. The shelf does not repeat the top-panel gold total. Selected slots show the owned item quantity and current sell price from the gameplay snapshot. Selecting an unlocked slot opens a popup where the player chooses an exact item to auto-sell, grouped under `seeds`, `herbs`, and `potions` tabs, with live sell prices beside each item. The popup also has an `empty` option to clear the slot.

The player shelf uses the same slot pattern, but selected items are listed with a player-entered quantity and gold value instead of being auto-sold. Listed quantity is reserved from local inventory. The `other shops` button opens a popup of server listings from other players; each buy action purchases one item at the slot value.
