# Market Page

The Market is the room page immediately right of Research. Its internal page id is still `shop` for save and navigation compatibility.

It shows a `market shelf` block for trader auto-sales and a `player market` block for player-to-player listings.

The trader shelf displays up to five slots. Slot 1 starts unlocked, the next locked slot shows a buy action, and later slots show `locked` until they become next. The shelf does not repeat the top-panel gold total. Selected slots show the owned item quantity and current sell price from the gameplay snapshot. Selecting an unlocked slot opens a popup where the player chooses an exact item to auto-sell, grouped under `seeds`, `herbs`, and `potions` tabs, with live sell prices beside each item. The popup also has an `empty` option to clear the slot.

The player market uses the same slot pattern, but selected items are listed with a player-entered quantity and gold value instead of being auto-sold. The list popup stages the item choice first, then `place` publishes the listing and reserves the quantity from local inventory. The `browse market` button opens a popup of server listings from other players grouped by seller; each listing has a buy quantity input and a buy action using the selected quantity.
