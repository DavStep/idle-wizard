# Market Page

The Market is the room page immediately right of Research. Its internal page id is still `shop` for save and navigation compatibility.

It has `npc market` and `player market` tabs. `npc market` contains automatic NPC demand sales and shared NPC stock. `player market` contains local player requests and player-to-player listings.

The `npc demand market` block displays up to five automatic NPC sale stands. Stand 1 starts unlocked, the next locked stand shows a buy action, and later stands show `locked` until they become next. The NPC market does not repeat the top-panel gold total. Selected stands show the item and current sell price from the gameplay snapshot, while backend NPC need stays hidden there and only drives the underlying sale process. Selecting an unlocked stand opens a popup where the player chooses an exact item to auto-sell, grouped under `seeds`, `herbs`, and `potions` tabs, with the sell price beside each item. The popup also has an `empty` option to clear the stand.

The `demand` label on the NPC market top border opens a demand popup. It has `seed`, `herb`, and `potion` tabs below the bordered dialog. Each tab lists item names with demand values; non-locked rows are dark, and locked rows are gray.

The `npc stock market` block sits under `npc demand market`. It has `seed`, `herb`, and `potion` text tabs embedded on the bottom border, lists unlocked or owned item rows, and opens a quantity dialog before buying from shared NPC stock. Batch buy totals use marginal NPC sell prices across the backend need curve.

The player market request block stores local numbered request slots with item text, quantity, and gold each. It does not publish server requests yet. The player market listing block uses the same stand pattern, but selected items are listed with a player-entered quantity and gold value instead of being auto-sold. The list popup stages the item choice first, then `place` publishes the listing and reserves the quantity from local inventory. The `browse market` button opens a popup of server listings from other players grouped by seller; each listing has a buy quantity input and a buy action using the selected quantity.
