# Market Page

The Market is the room page immediately right of Research. Its internal page id is still `shop` for save and navigation compatibility.

It shows an `npc market` block for automatic NPC sales and a `player market` block for player-to-player listings.

The NPC market displays up to five stands. Stand 1 starts unlocked, the next locked stand shows a buy action, and later stands show `locked` until they become next. The NPC market does not repeat the top-panel gold total. Selected stands show the item and current sell price from the gameplay snapshot, while backend NPC need stays hidden there and only drives the underlying sale process. Selecting an unlocked stand opens a popup where the player chooses an exact item to auto-sell, grouped under `seeds`, `herbs`, and `potions` tabs, with the sell price beside each item. The popup also has an `empty` option to clear the stand.

The `demand` label on the NPC market top border opens a demand popup. It has `seed`, `herb`, and `potion` tabs below the bordered dialog. Each tab lists item names with demand values; non-locked rows are dark, locked rows are gray, and a plain divider separates the locked group.

The player market uses the same stand pattern, but selected items are listed with a player-entered quantity and gold value instead of being auto-sold. The list popup stages the item choice first, then `place` publishes the listing and reserves the quantity from local inventory. The `browse market` button opens a popup of server listings from other players grouped by seller; each listing has a buy quantity input and a buy action using the selected quantity.
