# Player Market Backend

Shares player market listings through SpacetimeDB.

Player market exchange is enabled. The server stores listings, listing quantity, proceeds, and trade history; local gameplay still owns item reservation, buyer gold spending, and claimed proceeds application after reducer success.

Keep the facade boundary in place. Do not expose raw generated database APIs to gameplay features.
