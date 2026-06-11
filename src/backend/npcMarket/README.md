# NPC Market Backend

Shares NPC bazar prices and item need through SpacetimeDB.

The NPC market is separate from player shops. It is a one-way buyer: players sell items to NPC demand. Selling reduces `npcNeed`; market ticks replenish need; backend-owned `npcBuyPriceGold` changes from that need. Clients should only display backend quotes and should not fall back to local price balance.
