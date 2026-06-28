# NPC Market Backend

Shares NPC bazar prices, item need, and buyable stock through SpacetimeDB.

The NPC market is separate from player shops. Players sell items into NPC demand; selling reduces `npcNeed`, increases `npcStock`, and updates backend-owned `npcBuyPriceCoin`. Players can also buy from shared `npcStock` at `npcSellPriceCoin`; buying reduces stock and raises need again. Prices follow `npcNeed / targetNeed` pressure around the configured base price. Demand resets at the anchored weekly boundary, then returns through capped UTC buyer waves, including the large wave at day start. Clients should only display backend quotes and should not fall back to local price balance.

Gameplay uses this backend market from player level 4 onward. Before level 4, NPC demand and prices are deliberately local fake values in the gameplay market layer, and sell/buy reducers are not called.
