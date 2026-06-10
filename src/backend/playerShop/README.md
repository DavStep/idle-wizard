# Player Market Backend

Shares player market listings through SpacetimeDB.

The client publishes one listing per player market stand. The server owns listed quantity, decrements it when another player buys, and stores seller sale proceeds until the seller claims them.

Completed purchases are recorded in `player_shop_trade` so the client can show own and global trade history.
