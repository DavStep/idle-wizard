# NPC Market Backend

Shares NPC bazar prices, item need, and buyable stock through SpacetimeDB.

The NPC market is separate from player shops. Players sell items into NPC demand; selling reduces `npcNeed`, increases `npcStock`, and updates backend-owned `npcBuyPriceGold`. Players can also buy from shared `npcStock` at `npcSellPriceGold`; buying reduces stock and raises need again. Prices follow uncapped `npcNeed / targetNeed` pressure around the configured base price. Clients should only display backend quotes and should not fall back to local price balance.
