# Player Market Backend

Shares player market listings through SpacetimeDB.

Player market exchange is locked down until inventory and spendable gold become server-authoritative. The server clears stale listing, trade, and proceeds rows on connect so old poisoned rows cannot be claimed.

Keep the facade boundary in place; re-enable publishing, purchases, proceeds, and `player_shop_trade` only when the backend can debit buyer gold and reserve seller inventory itself.
