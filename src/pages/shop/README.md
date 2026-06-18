# Market Page

The Market is the room page immediately right of Research. Its internal page id is still `shop` for save and navigation compatibility.

It has `npc market`, `player market`, and `crystals` tabs. The `crystals` tab is third and shows a manual gold offer plus real-money crystal bundle prices with bundle and price columns only. Pressing a price shows the support-unavailable popup. Payment and crystal grant behavior should stay out of this page until that flow is explicitly requested.

The `npc market` tab contains a separate `fast sell` box for instant NPC sales, the automatic NPC demand stand box, and shared NPC stock. The `player market` tab contains local player requests and player-to-player listings. `browse market` uses `selling` and `buying` popup tabs; `selling` shows backend public listings, while `buying` shows backend public request rows. Request fulfillment is not implemented until escrow/delivery behavior is explicit.
